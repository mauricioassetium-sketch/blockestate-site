/**
 * The buyer's desk: the one screen that answers "where do I stand?".
 *
 * It repeats what the server says and adds no claims of its own: a purchase is not a property, a
 * reservation is not a purchase, and the desk never advances a step that the record has not walked.
 *
 * The desk is a rail of six sections instead of one long page. A buyer who has money on the table
 * asks six different questions — what do I do next, where are my purchases, what is expiring, what
 * do I still owe, what did I like, what did I miss — and each of them deserves a place with a name,
 * reachable from the top and from a link that can be sent. The order of the rail is the order of the
 * questions, not the order of the tables.
 */
import { api } from '../api.js';
import { go } from '../router.js';
import { store } from '../store.js';
import { date, empty, error, esc, loading, money, tipoLabel } from '../ui.js';

const view = () => document.getElementById('view');

const KYC = {
  approved: { texto: 'Identity verified', clase: 'green' },
  pending: { texto: 'Identity check in progress', clase: '' },
  rejected: { texto: 'Identity check refused', clase: 'rojo' },
  not_started: { texto: 'Identity not started', clase: '' },
};

/**
 * The six sections, in the order a buyer needs them. Each one has an icon drawn here as a path so
 * the rail carries no icon font and no second request: a desk that needs a download to show its own
 * menu is a desk that loses its menu on a bad connection in a lift.
 */
const SECCIONES = [
  { id: 'overview', label: 'Overview',
    icon: 'M4 4h6v6H4zM14 4h6v4h-6zM14 12h6v8h-6zM4 14h6v6H4z' },
  { id: 'purchases', label: 'Purchases',
    icon: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6' },
  { id: 'reservations', label: 'Reservations',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2' },
  { id: 'payments', label: 'Payments',
    icon: 'M3 7h18v11H3zM3 10h18M7 15h3' },
  { id: 'shortlist', label: 'Shortlist',
    icon: 'M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z' },
  { id: 'alerts', label: 'Alerts',
    icon: 'M6 9a6 6 0 0 1 12 0c0 4 2 5 2 5H4s2-1 2-5zM10 19a2 2 0 0 0 4 0' },
];

/** The buyer's own page: without a session there is nothing to show, so the door comes first. */
function exigirSesion() {
  if (!store.logged()) {
    go('/login');
    return true;
  }
  return false;
}

/**
 * The counters are read at a glance, so a big number is said in millions: six cifras in a tile the
 * width of a thumb wrap onto a second line and stop being a counter. The exact figure is one click
 * away, on the purchase itself.
 */
function corto(fils) {
  const aed = (Number(fils) || 0) / 100;
  if (aed >= 1e6) return `AED ${(aed / 1e6).toFixed(2).replace(/\.00$/, '')}M`;
  if (aed >= 1e5) return `AED ${Math.round(aed / 1e3)}k`;
  return money(fils);
}

/** A price as a price: no cents on a two million dirham apartment. */
function precio(fils) {
  return money(fils).replace(/\.00$/, '');
}

/** Hours left on a hold, said the way a person says it. */
function queda(r) {
  const horas = Math.max(0, Math.ceil((new Date(r.expira_en) - Date.now()) / 3600000));
  // A reservation is read in hours on the day it is made and in days once it has a while to run:
  // "336 hours left" is a clock nobody reads.
  const dias = Math.floor(horas / 24);
  if (horas < 1) return 'less than an hour left';
  if (horas === 1) return 'one hour left';
  if (dias >= 2) return `${dias} days left`;
  return `${horas} hours left`;
}

/**
 * A purchase sits on a payment step when the record says so: the balance is asked for, or a payment
 * is being waited on. Nothing else counts as money owed — a purchase at the identity step owes
 * nothing, and saying it did would send a buyer to a bank for no reason.
 */
function esperaPago(c) {
  return !c.cerrada && (/balance|deposit/i.test(c.humano ?? '') || /^(payment|deposit)/i.test(c.siguiente ?? ''));
}

/**
 * A saved property, as a line and not as a poster: the desk already carries the same card the
 * catalogue shows, and three of those push the alerts off the page. Here it is a thumb, a name and a
 * price — the same three things a buyer says out loud when choosing.
 */
function filaFav(u) {
  const donde = [u.comunidad, u.emirato].filter(Boolean).join(', ');
  return `
    <a class="desk-fav" href="#/unit/${esc(u.unidad_id)}">
      ${u.foto_principal
        ? `<img src="${esc(u.foto_principal)}" alt="" loading="lazy">`
        : '<span class="desk-fav-sin" aria-hidden="true"></span>'}
      <span class="desk-fav-txt">
        <b>${esc(u.titulo)}</b>
        <span class="muted">${esc([tipoLabel(u.tipo), u.habitaciones ? `${u.habitaciones} beds` : '', donde]
          .filter(Boolean).join(' · '))}</span>
      </span>
      <b class="desk-fav-precio">${esc(precio(u.precio_fils))}</b>
    </a>`;
}

/**
 * A reservation still on its clock. It is the only thing on the desk that can be lost by waiting, so
 * it says how long is left before it says anything else.
 */
function filaReserva(r) {
  return `
    <div class="item desk-reserva">
      <div class="row-between">
        <b>${esc(tipoLabel(r.tipo))} · ${esc(r.proyecto)}</b>
        <span class="tag reservada">Reserved</span>
      </div>
      <span class="muted" style="font-size:.9rem">${esc(precio(r.precio_fils))} · ${esc(
        [r.comunidad, r.emirato].filter(Boolean).join(', '))}</span>
      <div class="desk-reserva-pie">
        <span class="desk-reloj"><i aria-hidden="true"></i>${esc(queda(r))} to continue</span>
        <a class="btn-ghost" href="#/unit/${esc(r.unidad_id)}">Continue the purchase</a>
      </div>
    </div>`;
}

/**
 * The desk of someone who has bought nothing yet. Four empty boxes would say "you have nothing"
 * four times; this says what the first purchase costs in steps, which is the only useful thing an
 * empty desk can say.
 */
function bloqueInicio() {
  return `
    <div class="desk-inicio">
      <h3>Your first purchase starts here</h3>
      <ol>
        <li><b>Reserve the unit.</b> A hold on your name for a few hours, at no cost. The unit leaves
          the market while it lasts.</li>
        <li><b>Send your documents.</b> NDC checks them by hand — identity is what turns a reservation
          into a purchase.</li>
        <li><b>Pay the deposit.</b> In USDT, BTC or ETH, settled in dirhams the same day. The balance
          follows the same road, and the title arrives about 30 days after settlement.</li>
      </ol>
      <a class="btn green" href="#/search">Browse properties</a>
    </div>`;
}

/** A purchase line, told as a place on the funnel rather than as a database state. */
function filaCompra(c) {
  const avance = c.total ? `${c.paso} of ${c.total}` : '';
  return `
    <a class="item" href="#/portfolio/${esc(c.intencion_id)}">
      <div class="row-between">
        <b>${esc(c.unidad)} · ${esc(c.proyecto ?? '')}</b>
        <span class="tag${c.afirmacion_legal ? ' green' : ''}">${esc(c.etiqueta)}</span>
      </div>
      <span class="muted" style="font-size:.9rem">${esc(precio(c.precio_fils))} · ${esc(c.emirato ?? '')}</span>
      <div class="desk-avance">
        <div class="desk-avance-linea"><i style="width:${c.total ? Math.round((c.paso / c.total) * 100) : 0}%"></i></div>
        <span class="desk-avance-pie">
          ${avance ? `Step ${esc(avance)} · ` : ''}<b>${esc(c.humano)}</b>
          ${c.siguiente ? ` · next: ${esc(c.siguiente)}` : ''}
        </span>
      </div>
    </a>`;
}

/** A closed purchase: the same line without the funnel, because its funnel is done. */
function filaCerrada(c) {
  return `
    <a class="item" href="#/portfolio/${esc(c.intencion_id)}">
      <div class="row-between">
        <b>${esc(c.unidad)} · ${esc(c.proyecto ?? '')}</b>
        <span class="tag${c.afirmacion_legal ? ' green' : ''}">${esc(c.etiqueta)}</span>
      </div>
      <span class="muted" style="font-size:.9rem">${esc(precio(c.precio_fils))} · ${esc(c.emirato ?? '')}${
        c.paso ? ` · step ${esc(c.paso)} of ${esc(c.total)}` : ''} · ${esc(c.humano)}</span>
    </a>`;
}

/* ------------------------------------------------------------------ the rail */

function navHTML(activa, cuenta) {
  return `
    ${SECCIONES.map((s) => `
      <a href="#/buyer${s.id === 'overview' ? '' : `/${s.id}`}"
         ${s.id === activa ? 'aria-current="page"' : ''}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${s.icon}"/></svg>
        <span>${s.label}</span>
        ${cuenta[s.id] ? `<span class="cuenta${s.id === 'alerts' ? ' alerta' : ''}">${esc(cuenta[s.id])}</span>` : ''}
      </a>`).join('')}`;
}

function conRail(activa, cuenta, cuerpo) {
  return `
    <div class="buyer-shell">
      <nav class="buyer-nav" aria-label="Buyer desk sections">${navHTML(activa, cuenta)}</nav>
      <div class="buyer-main">${cuerpo}</div>
    </div>`;
}

/* --------------------------------------------------------------- the sections */

/** Where do I stand, and what do I do next. Nothing else: the rest has a section of its own. */
function secOverview(d) {
  const { r, avisos, favs, reservas, abiertas } = d;

  // The next thing to do is the soonest thing that can be lost, and a hold beats a queue: a
  // reservation has a clock, an open purchase does not.
  const enRiesgo = [...reservas].sort((a, b) => new Date(a.expira_en) - new Date(b.expira_en))[0];
  const enMarcha = [...abiertas].sort((a, b) => (b.paso ?? 0) - (a.paso ?? 0))[0];

  const siguiente = enRiesgo
    ? `<div class="buyer-next">
        <span class="et">Expiring hold</span>
        <h3>${esc(tipoLabel(enRiesgo.tipo))} in ${esc(enRiesgo.proyecto)} is held for you</h3>
        <p>${esc(precio(enRiesgo.precio_fils))} · ${esc([enRiesgo.comunidad, enRiesgo.emirato].filter(Boolean).join(', '))}</p>
        <div class="fila">
          <span class="buyer-next-reloj"><i aria-hidden="true"></i>${esc(queda(enRiesgo))} to continue</span>
          <a class="btn green" href="#/unit/${esc(enRiesgo.unidad_id)}">Continue the purchase</a>
        </div>
      </div>`
    : enMarcha
      ? `<div class="buyer-next">
          <span class="et">Next step</span>
          <h3>${esc(enMarcha.unidad)} in ${esc(enMarcha.proyecto ?? '')}</h3>
          <p>Step ${esc(enMarcha.paso)} of ${esc(enMarcha.total)} · ${esc(enMarcha.humano)}${
            enMarcha.siguiente ? ` · next: ${esc(enMarcha.siguiente)}` : ''}</p>
          <div class="fila">
            <a class="btn green" href="#/portfolio/${esc(enMarcha.intencion_id)}">Open the purchase</a>
            <a class="btn-ghost buyer-next-ghost" href="#/buyer/purchases">All purchases</a>
          </div>
        </div>`
      : `<div class="buyer-next">
          <span class="et">Start</span>
          <h3>Nothing on your name yet</h3>
          <p>Reserve a unit and it stays here, on its clock, until you send the documents.</p>
          <div class="fila"><a class="btn green" href="#/search">Browse properties</a></div>
        </div>`;

  const ultimos = avisos.ultimos.slice(0, 3);

  const identidad = d.id.kyc_estado !== 'approved' ? `
    <div class="desk-aviso buyer-aviso">
      <p><b>Your identity is not approved yet.</b> NDC checks the documents by hand; the deposit is not
      asked for until the check is approved. Nothing is lost — the purchase waits.</p>
      <a class="btn-ghost" href="#/contact">Send the documents</a>
    </div>` : '';

  return `
    ${siguiente}
    ${identidad}

    <div class="desk-datos desk-seis">
      <a class="dato" href="#/buyer/purchases"><span>In progress</span><b>${esc(r.en_curso)}</b></a>
      <a class="dato" href="#/buyer/purchases?ver=closed"><span>Closed</span><b>${esc(r.cerradas)}</b></a>
      <a class="dato" href="#/buyer/payments" title="${esc(money(r.comprometido_fils))}"><span>Committed</span><b>${esc(corto(r.comprometido_fils))}</b></a>
      <a class="dato" href="#/buyer/payments" title="${esc(money(r.depositado_fils))}"><span>Deposits paid</span><b>${esc(corto(r.depositado_fils))}</b></a>
      <a class="dato" href="#/buyer/shortlist"><span>Shortlist</span><b>${esc(favs.total)}</b></a>
      <a class="dato" href="#/buyer/alerts"><span>Searches</span><b>${esc(r.busquedas)}</b></a>
    </div>

    <div class="buyer-sec-titulo">
      <h2>Alerts</h2>
      <a class="enlace-verde" href="#/buyer/alerts"><b>All alerts${avisos.sin_leer ? ` · ${esc(avisos.sin_leer)} new` : ''}</b></a>
    </div>
    ${ultimos.length
      ? `<div class="list list-tight">${ultimos.map(filaAviso).join('')}</div>`
      : `<p class="muted desk-nada">No alerts yet. They arrive here when a purchase takes a step or a
          saved search finds something new.</p>`}

    <div class="buyer-sec-titulo" style="margin-top:26px">
      <h2>Shortlist</h2>
      <a class="enlace-verde" href="#/buyer/shortlist"><b>See all saved</b></a>
    </div>
    ${favs.total
      ? `<div class="desk-favs">${favs.unidades.slice(0, 3).map(filaFav).join('')}</div>`
      : empty('Nothing saved yet', 'Saving a property does not reserve it, but it keeps it one tap away.',
          '<p style="margin-top:12px"><a class="btn green" href="#/search">Browse properties</a></p>')}`;
}

/** Every purchase, open first, and the closed ones behind a filter instead of behind a scroll. */
function secCompras(d, ver) {
  const { abiertas, cerradas, recien } = d;
  const filtro = ver === 'closed' ? 'closed' : ver === 'all' ? 'all' : 'open';
  const lista = filtro === 'closed' ? cerradas : filtro === 'all' ? [...abiertas, ...cerradas] : abiertas;
  const mostradas = lista.slice(0, 60);

  const chips = [
    ['open', `Open${abiertas.length ? ` · ${abiertas.length}` : ''}`],
    ['closed', `Closed${cerradas.length ? ` · ${cerradas.length}` : ''}`],
    ['all', 'All'],
  ].map(([id, label]) => `
      <a class="buyer-chip${filtro === id ? ' on' : ''}" href="#/buyer/purchases${id === 'open' ? '' : `?ver=${id}`}">${esc(label)}</a>`).join('');

  return `
    <div class="buyer-sec-titulo">
      <h2>Purchases</h2>
      <a class="enlace-verde" href="#/portfolio"><b>Open the purchase book</b></a>
    </div>
    <div class="buyer-chips">${chips}</div>
    ${mostradas.length
      ? `<div class="list">${mostradas.map(filtro === 'open' ? filaCompra : filaCerrada).join('')}</div>
         ${lista.length > mostradas.length ? `<p class="muted" style="font-size:.84rem; margin:12px 0 0">
           Showing the ${esc(mostradas.length)} most recent of ${esc(lista.length)}. The whole book is in
           <a class="enlace-verde" href="#/portfolio"><b>My purchases</b></a>.</p>` : ''}`
      : filtro === 'open' && recien
        ? bloqueInicio()
        : empty(filtro === 'closed' ? 'No closed purchases yet' : 'Nothing here',
            filtro === 'closed'
              ? 'A purchase lands here once the Dubai Land Department registers it.'
              : 'A reservation starts here and stays on this page until the title is registered.')}`;
}

/** The holds, with the clock first, because a hold is the only thing on the desk that expires. */
function secReservas(d) {
  const reservas = [...d.reservas].sort((a, b) => new Date(a.expira_en) - new Date(b.expira_en));
  return `
    <div class="buyer-sec-titulo">
      <h2>Reservations</h2>
      <span class="muted" style="font-size:.82rem">Held on your name, not bought yet</span>
    </div>
    ${reservas.length
      ? `<div class="list">${reservas.map(filaReserva).join('')}</div>
         <p class="muted" style="font-size:.84rem; margin:14px 0 0">When a hold runs out the unit goes
         back to the market. Reserving it again starts the clock from zero.</p>`
      : empty('No unit on hold', 'A reservation costs nothing and takes the unit off the market while it lasts.',
          '<p style="margin-top:12px"><a class="btn green" href="#/search">Browse properties</a></p>')}`;
}

/** What is in, what is still owed, and who is waiting on a transfer. */
function secPagos(d) {
  const { r, abiertas } = d;
  const pendientes = abiertas.filter(esperaPago);
  // What is left to settle is the price of what is still walking minus the deposits already paid on
  // those same purchases: the deposits of closed purchases are not on the table any more.
  const abierto = Number(r.depositado_abierto_fils ?? r.depositado_fils) || 0;
  const porPagar = Math.max(0, (Number(r.comprometido_fils) || 0) - abierto);

  return `
    <div class="buyer-sec-titulo">
      <h2>Payments</h2>
      <span class="muted" style="font-size:.82rem">USDT, BTC or ETH · settled in dirhams</span>
    </div>
    <div class="desk-datos desk-pagos">
      <div class="dato"><span>Deposits paid</span><b title="${esc(money(abierto))}">${esc(corto(abierto))}</b></div>
      <div class="dato"><span>Still to settle</span><b title="${esc(money(porPagar))}">${esc(corto(porPagar))}</b></div>
      <div class="dato"><span>Committed</span><b title="${esc(money(r.comprometido_fils))}">${esc(corto(r.comprometido_fils))}</b></div>
    </div>
    <div class="buyer-sec-titulo" style="margin-top:22px">
      <h3 style="margin:0; font-size:1.02rem">Waiting on you</h3>
      ${pendientes.length ? `<span class="tag coin">${esc(pendientes.length)} to pay</span>` : ''}
    </div>
    ${pendientes.length
      ? `<div class="list">${pendientes.map((c) => `
          <a class="item" href="#/portfolio/${esc(c.intencion_id)}">
            <div class="row-between">
              <b>${esc(c.unidad)} · ${esc(c.proyecto ?? '')}</b>
              <span class="tag coin">${esc(c.humano)}</span>
            </div>
            <span class="muted" style="font-size:.9rem">${esc(precio(c.precio_fils))} · ${esc(c.emirato ?? '')}</span>
            <div class="desk-avance">
              <div class="desk-avance-linea"><i style="width:${c.total ? Math.round((c.paso / c.total) * 100) : 0}%"></i></div>
              <span class="desk-avance-pie">Step ${esc(c.paso)} of ${esc(c.total)} · next: <b>${esc(c.siguiente ?? c.humano)}</b></span>
            </div>
          </a>`).join('')}</div>`
      : `<p class="muted desk-nada">Nothing is waiting on a transfer. When a purchase reaches its
          deposit or its balance, the amount appears here with the step it belongs to.</p>`}
    <div class="buyer-nota">
      <b>How the money moves.</b> You pay in USDT, BTC or ETH; the payment is read on chain, settled
      in dirhams the same day and held by the escrow of the purchase. Nothing is asked for before your
      identity is approved.
    </div>`;
}

function secShortlist(d) {
  const { favs } = d;
  return `
    <div class="buyer-sec-titulo">
      <h2>Shortlist</h2>
      ${favs.total ? `<span class="muted" style="font-size:.82rem">${esc(favs.total)} saved</span>` : ''}
    </div>
    ${favs.total
      ? `<div class="desk-favs">${favs.unidades.map(filaFav).join('')}</div>
         <div class="buyer-chips" style="margin-top:16px">
           <a class="buyer-chip" href="#/favorites">Open the saved page</a>
         </div>`
      : empty('Nothing saved yet', 'Saving a property does not reserve it, but it keeps it one tap away.',
          '<p style="margin-top:12px"><a class="btn green" href="#/search">Browse properties</a></p>')}`;
}

function filaAviso(a) {
  return `
    <div class="item">
      <div class="row-between">
        <b>${esc(a.titulo)}</b>
        <span class="tag${a.leida_en ? '' : ' green'}">${a.leida_en ? 'Read' : 'New'}</span>
      </div>
      <span class="muted" style="font-size:.9rem">${esc(a.cuerpo)}</span>
      <span class="muted" style="font-size:.78rem">${esc(date(a.creada_en))}</span>
    </div>`;
}

/** The inbox and the searches that feed it, in one place: a search alert is an alert with a rule. */
function secAvisos(d) {
  const { avisos, busquedas } = d;
  return `
    <div class="buyer-sec-titulo">
      <h2>Alerts</h2>
      <a class="enlace-verde" href="#/notifications"><b>Open the inbox${avisos.sin_leer ? ` · ${esc(avisos.sin_leer)} new` : ''}</b></a>
    </div>
    ${avisos.ultimos.length
      ? `<div class="list list-tight">${avisos.ultimos.map(filaAviso).join('')}</div>`
      : `<p class="muted desk-nada">No alerts yet. They arrive here when a purchase takes a step or a
          saved search finds something new.</p>`}

    <div class="buyer-sec-titulo" style="margin-top:26px">
      <h3 style="margin:0; font-size:1.02rem">Saved searches</h3>
      <a class="enlace-verde" href="#/search"><b>New search</b></a>
    </div>
    ${busquedas.length
      ? `<div class="list">
          ${busquedas.map((b) => `
            <div class="item">
              <div class="row-between">
                <b>${esc(b.nombre)}</b>
                <span class="tag${b.alerta_activa ? ' green' : ''}">${b.alerta_activa ? 'Alerts on' : 'Alerts off'}</span>
              </div>
              <span class="muted" style="font-size:.85rem">Saved ${esc(date(b.creada_en))}</span>
            </div>`).join('')}
        </div>`
      : `<p class="muted desk-nada">No saved searches. Save one from
          <a class="enlace-verde" href="#/search"><b>Search</b></a> and it will wait here, with the alerts on or off.</p>`}`;
}

/* --------------------------------------------------------------------- entry */

export async function viewComprador(seccion = 'overview') {
  if (exigirSesion()) return;
  // The desk is the buyer's own book, and the server only answers it for a buyer. Saying so here
  // saves a seat that signed in from reading a refusal as a broken page.
  if (store.rol() && store.rol() !== 'comprador') {
    view().innerHTML = `
      <div class="lab"><span>Buyer desk</span><span class="dash"></span></div>
      <div class="desk-aviso" style="margin-top:18px">
        <p><b>This desk belongs to a buyer.</b> The session open here is not a buyer account, so there
        are no purchases to show. Your own desk is in the menu.</p>
        <a class="btn-ghost" href="#/">Back to the catalogue</a>
      </div>`;
    return;
  }

  // An unknown section is not an error page: the desk has a front door, so it sends the reader there.
  const activa = SECCIONES.some((s) => s.id === seccion) ? seccion : 'overview';

  view().innerHTML = `
    <div class="lab"><span>Buyer desk</span><span class="dash"></span></div>
    <div id="panel">${loading(3)}</div>`;

  let panel;
  let favs = { unidades: [], total: 0 };
  try {
    [panel, favs] = await Promise.all([api.buyerMe(), api.favorites().catch(() => ({ unidades: [], total: 0 }))]);
  } catch (err) {
    error('#panel', err);
    return;
  }
  store.setFavs(favs.unidades);

  const id = panel.identidad;
  const r = panel.resumen;
  const kyc = KYC[id.kyc_estado] ?? { texto: id.kyc_estado, clase: '' };
  const abiertas = panel.compras.filter((c) => !c.cerrada);
  const cerradas = panel.compras.filter((c) => c.cerrada);
  const reservas = panel.reservas ?? [];
  const avisos = panel.avisos ?? { ultimos: [], sin_leer: 0 };
  const busquedas = panel.busquedas ?? [];
  const recien = !panel.compras.length && !reservas.length;
  const porPagar = abiertas.filter(esperaPago).length;

  const d = { id, r, abiertas, cerradas, reservas, avisos, busquedas, favs, recien };

  const cuenta = {
    purchases: abiertas.length,
    reservations: reservas.length,
    payments: porPagar,
    shortlist: favs.total,
    alerts: avisos.sin_leer,
  };

  const cuerpo = activa === 'purchases' ? secCompras(d, actualVer())
    : activa === 'reservations' ? secReservas(d)
      : activa === 'payments' ? secPagos(d)
        : activa === 'shortlist' ? secShortlist(d)
          : activa === 'alerts' ? secAvisos(d)
            : secOverview(d);

  view().querySelector('#panel').innerHTML = `
    <div class="desk-head">
      <div class="desk-quien">
        <div class="desk-iniciales" aria-hidden="true">${esc(
          (id.nombre || 'B').split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase(),
        )}</div>
        <div>
          <span class="desk-rol">Buyer · ${esc(id.firmante)}</span>
          <h1>${esc(id.nombre)}</h1>
          <p class="muted">${esc(id.email)} · client since ${esc(date(id.cliente_desde))}</p>
        </div>
      </div>
      <div class="desk-sellos">
        <span class="kyc-chip${kyc.clase ? ` ${kyc.clase}` : ''}"><i aria-hidden="true"></i>${esc(kyc.texto)}</span>
        <a class="btn-ghost" href="#/search">Browse properties</a>
      </div>
    </div>

    ${conRail(activa, cuenta, cuerpo)}`;
}

/** The filter on the purchases section lives in the address, so a filtered list can be sent. */
function actualVer() {
  const raw = location.hash.replace(/^#/, '');
  const i = raw.indexOf('?');
  return i === -1 ? '' : new URLSearchParams(raw.slice(i + 1)).get('ver') ?? '';
}

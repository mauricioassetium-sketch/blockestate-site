/**
 * The buyer's desk: the one screen that answers "where do I stand?".
 *
 * It repeats what the server says and adds no claims of its own: a purchase is not a property, a
 * reservation is not a purchase, and the desk never advances a step that the record has not walked.
 * The desk is the home of the buyer, so it carries the next thing to do, the purchases in progress,
 * the closed ones, the shortlist and the alerts — in that order, because that is the order in which a
 * buyer needs them.
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
  const horas = Math.max(0, Math.ceil((new Date(r.expira_en) - Date.now()) / 3600000));
  // A reservation is read in hours on the day it is made and in days once it has a while to run:
  // «336 hours left» is a clock nobody reads.
  const dias = Math.floor(horas / 24);
  const queda = horas < 1 ? 'less than an hour left'
    : horas === 1 ? 'one hour left'
      : dias >= 2 ? `${dias} days left`
        : `${horas} hours left`;
  return `
    <div class="item desk-reserva">
      <div class="row-between">
        <b>${esc(tipoLabel(r.tipo))} · ${esc(r.proyecto)}</b>
        <span class="tag reservada">Reserved</span>
      </div>
      <span class="muted" style="font-size:.9rem">${esc(precio(r.precio_fils))} · ${esc(
        [r.comunidad, r.emirato].filter(Boolean).join(', '))}</span>
      <div class="desk-reserva-pie">
        <span class="desk-reloj"><i aria-hidden="true"></i>${esc(queda)} to continue</span>
        <a class="btn-ghost" href="#/unit/${esc(r.unidad_id)}">Continue the purchase</a>
      </div>
    </div>`;
}

/**
 * The desk of someone who has bought nothing yet. Four empty boxes would say «you have nothing»
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

export async function viewComprador() {
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
  const avisos = panel.avisos?.ultimos ?? [];
  const recien = !panel.compras.length && !(panel.reservas?.length);

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

    ${id.kyc_estado !== 'approved' ? `
      <div class="desk-aviso">
        <p><b>Your identity is not approved yet.</b> NDC checks the documents by hand, and a purchase
        does not move past the identity step until it is done. Nothing is lost: the purchase waits,
        and the deposit is not asked for until the check is approved.</p>
        <a class="btn-ghost" href="#/contact">Send the documents</a>
      </div>` : ''}

    <div class="desk-datos desk-seis">
      <div class="dato"><span>In progress</span><b>${esc(r.en_curso)}</b></div>
      <div class="dato"><span>Closed</span><b>${esc(r.cerradas)}</b></div>
      <div class="dato" title="${esc(money(r.comprometido_fils))}"><span>Committed</span><b>${esc(corto(r.comprometido_fils))}</b></div>
      <div class="dato" title="${esc(money(r.depositado_fils))}"><span>Deposits paid</span><b>${esc(corto(r.depositado_fils))}</b></div>
      <div class="dato"><span>Shortlist</span><b>${esc(favs.total)}</b></div>
      <div class="dato"><span>Saved searches</span><b>${esc(r.busquedas)}</b></div>
    </div>

    ${panel.reservas?.length ? `
      <div class="row-between" style="margin:26px 0 10px">
        <h2 style="font-size:1.25rem; margin:0">Reserved for you</h2>
        <span class="muted" style="font-size:.82rem">Held on your name, not bought yet</span>
      </div>
      <div class="list">${panel.reservas.map(filaReserva).join('')}</div>` : ''}

    <div class="row-between" style="margin:26px 0 10px">
      <h2 style="font-size:1.25rem; margin:0">${recien ? 'Start here' : 'In progress'}</h2>
      ${abiertas.length ? `<span class="muted" style="font-size:.82rem">${esc(abiertas.length)} purchase${abiertas.length === 1 ? '' : 's'} open</span>` : ''}
    </div>
    ${abiertas.length
      ? `<div class="list">${abiertas.map(filaCompra).join('')}</div>`
      : recien ? bloqueInicio()
        : empty('Nothing in progress', 'A reservation starts here and stays on this page until the Dubai Land Department registers it.')}

    ${cerradas.length ? `
      <div class="row-between" style="margin:26px 0 10px">
        <h2 style="font-size:1.25rem; margin:0">Closed</h2>
        <a class="enlace-verde" href="#/portfolio"><b>Open my purchases</b></a>
      </div>
      <div class="list">
        ${cerradas.slice(0, 5).map((c) => `
          <a class="item" href="#/portfolio/${esc(c.intencion_id)}">
            <div class="row-between">
              <b>${esc(c.unidad)} · ${esc(c.proyecto ?? '')}</b>
              <span class="tag${c.afirmacion_legal ? ' green' : ''}">${esc(c.etiqueta)}</span>
            </div>
            <span class="muted" style="font-size:.9rem">${esc(precio(c.precio_fils))} · ${esc(c.emirato ?? '')}${
              c.paso ? ` · step ${esc(c.paso)} of ${esc(c.total)}` : ''} · ${esc(c.humano)}</span>
          </a>`).join('')}
      </div>
      ${cerradas.length > 5 ? `<p class="muted" style="font-size:.82rem; margin:8px 0 0">
        ${esc(cerradas.length - 5)} older closed purchases are in
        <a class="enlace-verde" href="#/portfolio"><b>My purchases</b></a>.</p>` : ''}` : ''}

    <div class="row-between" style="margin:26px 0 10px">
      <h2 style="font-size:1.25rem; margin:0">Your shortlist</h2>
      <a class="enlace-verde" href="#/favorites"><b>See all saved</b></a>
    </div>
    ${favs.total
      ? `<div class="desk-favs">${favs.unidades.slice(0, 4).map(filaFav).join('')}</div>`
      : empty('Nothing saved yet', 'Saving a property does not reserve it, but it keeps it one tap away.',
          '<p style="margin-top:12px"><a class="btn green" href="#/search">Browse properties</a></p>')}

    ${avisos.length ? `
      <div class="row-between" style="margin:26px 0 10px">
        <h2 style="font-size:1.25rem; margin:0">Alerts</h2>
        <a class="enlace-verde" href="#/notifications"><b>All alerts${panel.avisos.sin_leer ? ` · ${esc(panel.avisos.sin_leer)} new` : ''}</b></a>
      </div>
      <div class="list">
        ${avisos.map((a) => `
          <div class="item">
            <div class="row-between">
              <b>${esc(a.titulo)}</b>
              <span class="tag${a.leida_en ? '' : ' green'}">${a.leida_en ? 'Read' : 'New'}</span>
            </div>
            <span class="muted" style="font-size:.9rem">${esc(a.cuerpo)}</span>
            <span class="muted" style="font-size:.78rem">${esc(date(a.creada_en))}</span>
          </div>`).join('')}
      </div>`
      : `<p class="muted desk-nada">No alerts yet. They arrive here when a purchase takes a step or a
          saved search finds something new.</p>`}

    ${panel.busquedas?.length ? `
      <div class="row-between" style="margin:26px 0 10px">
        <h2 style="font-size:1.25rem; margin:0">Saved searches</h2>
        <a class="enlace-verde" href="#/search"><b>New search</b></a>
      </div>
      <div class="list">
        ${panel.busquedas.slice(0, 5).map((b) => `
          <div class="item">
            <div class="row-between">
              <b>${esc(b.nombre)}</b>
              <span class="tag${b.alerta_activa ? ' green' : ''}">${b.alerta_activa ? 'Alerts on' : 'Alerts off'}</span>
            </div>
            <span class="muted" style="font-size:.85rem">Saved ${esc(date(b.creada_en))}</span>
          </div>`).join('')}
      </div>`
      : `<p class="muted desk-nada">No saved searches. Save one from
          <a class="enlace-verde" href="#/search"><b>Search</b></a> and it will wait here, with the alerts on or off.</p>`}

    <div class="desk-volver">
      <a class="btn-ghost" href="#/portfolio">My purchases</a>
      <a class="btn-ghost" href="#/favorites">Saved properties</a>
      <a class="btn-ghost" href="#/notifications">Alerts</a>
      <a class="btn-ghost" href="#/contact">Talk to a person</a>
    </div>`;
}

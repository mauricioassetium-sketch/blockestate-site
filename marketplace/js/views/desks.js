/**
 * The desks of the construction side, inside the marketplace.
 *
 * Four actors sell a developer's inventory and each one is paid differently, so each one reads a
 * different book: the developer pays for the sale and watches what each channel costs; the agency
 * lives on the margin of its commission and cannot see another agency's clients; the broker only sees
 * the deals his own codes brought; NDC, as principal agency, reads the whole network in aggregate.
 *
 * The screens are drawn with the marketplace's own kit — the same rail, the same grouped menu, the
 * same cards, tables and canvases as the developer portal — because they are the same product.
 */
import { api } from '../api.js';
import { store } from '../store.js';
import { go } from '../router.js';
import { esc, date, ico, money, toast } from '../ui.js';
import { COLORES, barrasDeCategorias, donaDeEstados, lineaDeMeses } from './graficas.js';
import { cargar, cascaron } from './dev.js';

const view = () => document.getElementById('view');
const filas = (arr) => (Array.isArray(arr) ? arr : []);

const aed = (fils) => money(fils ?? 0);
/** Basis points to a percentage. A real cost that would print as 0.00 % says so instead. */
const pct = (pb) => {
  const v = Number(pb ?? 0) / 100;
  if (v > 0 && v < 0.01) return '< 0.01 %';
  return `${v.toFixed(2)} %`;
};
const sello = (texto, tono = '') => `<span class="tag${tono ? ` ${tono}` : ''}">${esc(texto)}</span>`;
/** The API stores the kind of unit as the catalogue does, lower case; a desk shows it as a name. */
const tipo = (t) => {
  const s = String(t ?? '').replace(/_/g, ' ');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unit';
};
const formAed = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(Math.round(n)));

/** A 403/401 is not a failure of the screen: it is the door, and it says so. */
function puerta(e, quien) {
  const sinSesion = e?.status === 401;
  view().innerHTML = `
    <div class="lab"><span>${esc(quien)}</span><span class="dash"></span></div>
    <div class="wrap">
      <section class="mod">
        <header>${ico('permiso', 15)}<h4>${sinSesion ? 'Sign in to open this desk' : 'This desk is not yours'}</h4></header>
        <p>${sinSesion
    ? 'A desk belongs to an account, and the screen below only reads what that account may see.'
    : esc(e?.message ?? 'This account has no access to this desk.')}</p>
        <div class="dev-form-pie">
          ${sinSesion
    ? '<a class="btn green" href="#/login">Sign in</a>'
    : '<a class="btn green" href="#/">Back to the marketplace</a>'}
        </div>
      </section>
    </div>`;
}

/**
 * The rail of a desk that is not the developer's: the same mark and the same grouped menu, with the
 * desk's own sections. The developer's two new screens use the portal's own shell.
 */
function armazon({ kicker, nombre, sub, grupos, activo, titulo, acciones = '', cuerpo }) {
  return `
    <div class="lab"><span>${esc(kicker)}</span><span class="dash"></span></div>
    <div class="dev-bar">
      <div class="dev-bar-org">
        <span class="dev-marca">${ico('sello', 16)}</span>
        <span class="dev-bar-txt"><b>${esc(nombre)}</b><small>${sub}</small></span>
      </div>
      <div class="dev-bar-acciones">${acciones}</div>
    </div>
    <div class="dev-shell">
      <nav class="dev-nav" aria-label="${esc(kicker)}">
        ${grupos.map(([titulo2, lineas]) => `
          <div class="dev-nav-grupo">
            <span class="dev-nav-lab">${esc(titulo2)}</span>
            ${lineas.map(([href, texto, icono, cuenta]) => `
              <a href="${href}" class="${href === activo ? 'on' : ''}"${href === activo ? ' aria-current="page"' : ''}>
                ${ico(icono, 15)}<span>${esc(texto)}</span>${cuenta ? `<i class="n">${cuenta}</i>` : ''}
              </a>`).join('')}
          </div>`).join('')}
        <div class="dev-nav-grupo"><a href="#/search">${ico('mapa', 15)}<span>Marketplace</span></a></div>
      </nav>
      <div class="dev-main">
        <h1 class="dev-titulo">${esc(titulo)}</h1>
        ${cuerpo}
      </div>
    </div>`;
}

const kpis = (lista) => `
  <section class="mod destacados">
    ${lista.map(([lab, valor, nota, chico]) => `
      <div class="dest">
        <span class="dest-lab">${esc(lab)}</span>
        <b class="${chico ? 'chico' : ''}">${esc(valor)}</b>
        ${nota ? `<small class="muted">${nota}</small>` : ''}
      </div>`).join('')}
  </section>`;

function tarjeta({ titulo, icono, id, alto = 190, nota = '', cuerpo = '' }) {
  return `
    <section class="mod">
      <header>${ico(icono, 15)}<h4>${esc(titulo)}</h4></header>
      ${cuerpo || `<div class="dev-grafica">
        <canvas id="${id}" height="${alto}" aria-label="${esc(titulo)}"></canvas>
        ${nota ? `<p class="dev-grafica-nota">${nota}</p>` : ''}
      </div>`}
    </section>`;
}

/** Twelve months, oldest first: a month with nothing is drawn at zero, never skipped. */
function doceMeses(serie) {
  const hoy = new Date();
  const salida = [];
  for (let i = 11; i >= 0; i -= 1) {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
    const fila = filas(serie).find((s) => String(s.mes).slice(0, 7) === clave) ?? {};
    salida.push({
      etiqueta: f.toLocaleDateString('en-GB', { month: 'short' }),
      deals: Number(fila.deals ?? 0),
      gdv: Number(fila.gdv_fils ?? 0) / 100,
      comision: Number(fila.comision_fils ?? fila.fee_fils ?? 0) / 100,
      mia: Number(fila.mia_fils ?? 0) / 100,
    });
  }
  return salida;
}

const lienzo = (id) => view().querySelector(`#${id}`);

/** A donut of nothing is not a donut: it says the book is empty instead of drawing a full ring. */
function donaSegura(canvas, partes, opciones) {
  if (!canvas) return;
  const vivas = filas(partes).filter(([, v]) => Number(v) > 0);
  donaDeEstados(canvas, vivas.length ? vivas : [['Nothing in the book yet', 1, COLORES.sinAnuncio]], opciones);
}

/* ---------------------------------------------------------------- the developer */

/**
 * What each channel costs. The 4 % envelope is a flat line and a traditional agency is its negotiated
 * commission plus the toll: this is the screen where the developer decides who sells for him. It is
 * his own cost, so it stays in his portal — the brokers behind those channels are the agency's.
 */
export async function viewDevCanales() {
  let d;
  let c;
  try {
    [d, c] = await Promise.all([cargar(), api.devChannels()]);
  } catch (e) { puerta(e, 'Developer · channels'); return; }

  const r = c.resumen ?? {};
  const canales = filas(c.canales);
  const meses = doceMeses(c.serie);

  const cuerpo = `
    ${kpis([
    ['Deals written', String(r.deals ?? 0), 'all channels'],
    ['GDV', aed(r.gdv_fils), `${canales.length} channel${canales.length === 1 ? '' : 's'}`, true],
    ['Fee paid', aed(r.fee_fils), `${pct(r.coste_pb)} of the price, as the developer pays it`, true],
    ['You keep', aed(r.neto_fils), 'price less fee', true],
  ])}
    <div class="dev-dos">
      ${tarjeta({
    titulo: 'GDV by month', icono: 'pulso', id: 'd-canales-gdv',
    nota: 'The last twelve months of written value, all channels together.',
  })}
      ${tarjeta({
    titulo: 'What each channel costs', icono: 'moneda', id: 'd-canales-coste',
    nota: 'In percentage of the price. The envelope is flat; an agency’s commission is negotiated.',
  })}
    </div>
    <section class="mod">
      <header>${ico('etiqueta', 15)}<h4>The channels, one line each</h4></header>
      <div class="dev-tabla-caja">
        <table class="dev-tabla">
          <thead><tr><th>Channel</th><th class="num">Deals</th><th class="num">GDV</th>
            <th class="num">Fee</th><th class="num">Cost of the sale</th><th class="num">You keep</th></tr></thead>
          <tbody>
            ${canales.length ? canales.map((x) => `
              <tr>
                <td><b>${esc(x.label)}</b><small>${esc(x.canal)}</small></td>
                <td class="num">${x.deals}</td>
                <td class="num">${aed(x.gdv_fils)}</td>
                <td class="num">${aed(x.fee_fils)}${Number(x.con_snapshot ?? x.deals) < x.deals
    ? `<small>${x.deals - Number(x.con_snapshot ?? 0)} without a fee snapshot</small>` : ''}</td>
                <td class="num">${pct(x.coste_pb)}</td>
                <td class="num">${aed(x.neto_fils)}</td>
              </tr>`).join('')
    : '<tr><td colspan="6" class="muted">No sale written yet.</td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="note">The direct channel is the envelope: a flat <b>4.00 %</b> of the price, set by the
        platform and not negotiated per sale. An agency’s commission is yours to agree panel by panel,
        and the toll is taken out of it — never added on top.</p>
    </section>
    ${tarjeta({
    titulo: 'Where the fee goes', icono: 'grupo', id: 'd-canales-reparto',
    nota: 'The fee of every channel, split between the agency, NDC, BlockEstate, Verysset, the network and the creator.',
  })}`;

  view().innerHTML = cascaron(d, '#/dev/channels', cuerpo, '', 'Channels');

  const l = lienzo('d-canales-gdv');
  if (l) lineaDeMeses(l, meses.map((m) => [m.etiqueta, m.gdv]), { formato: formAed });
  const b = lienzo('d-canales-coste');
  if (b) {
    barrasDeCategorias(b, canales.map((x, i) => [x.label, Number(x.coste_pb ?? 0) / 100, COLORES.serie[i % COLORES.serie.length]]),
      { formato: (n) => `${Number(n).toFixed(2)} %` });
  }
  const QUIEN = {
    agencia_fils: 'Agency', ndc_fils: 'NDC', blockestate_fils: 'BlockEstate',
    ustar_fils: 'USTAR', verysset_fils: 'Verysset', influencer_fils: 'Creator',
  };
  const rep = canales.reduce((acc, x) => {
    for (const [k, v] of Object.entries(x.reparto ?? {})) acc[k] = (acc[k] ?? 0) + Number(v ?? 0);
    return acc;
  }, {});
  const dn = lienzo('d-canales-reparto');
  if (dn) {
    const partes = Object.entries(rep)
      .filter(([, v]) => v > 0)
      .sort((a, b2) => b2[1] - a[1])
      .map(([k, v], i) => [QUIEN[k] ?? k, v / 100, COLORES.serie[i % COLORES.serie.length]]);
    donaSegura(dn, partes, { etiqueta: 'FEE', formato: formAed });
  }
}

/**
 * The panel: who sells for the developer, on what terms, and which links are still open. The developer
 * appoints and watches its agencies here; the brokers inside each one are the agency's to designate.
 */
export async function viewDevAgencias() {
  let d;
  let p;
  let inv;
  try {
    [d, p, inv] = await Promise.all([
      cargar(),
      api.devAgencies(),
      api.invites().catch(() => ({ invitaciones: [] })),
    ]);
  } catch (e) { puerta(e, 'Developer · agencies'); return; }

  const agencias = filas(p.agencias);
  const libres = filas(p.disponibles);
  const tope = p.tope ?? { max: 12, activas: 0, libres: 12, recomendado: 8 };
  const abiertas = filas(inv.invitaciones).filter((i) => i.tipo === 'agency' && i.estado === 'pending');

  const cuerpo = `
    ${kpis([
    ['Active agencies', `${tope.activas} / ${tope.max}`, `${tope.libres} seats free`],
    ['Recommended', String(tope.recomendado), 'before the inventory dilutes', true],
    ['Brokers on the panel', String(agencias.reduce((s, a) => s + Number(a.brokers ?? 0), 0)), 'across all agencies'],
    ['Sold through agencies', aed(agencias.reduce((s, a2) => s + Number(a2.gdv_fils ?? 0), 0)), 'on their codes', true],
  ])}
    <section class="mod">
      <header>${ico('grupo', 15)}<h4>The panel</h4><span>${agencias.length} agenc${agencias.length === 1 ? 'y' : 'ies'}</span></header>
      <div class="dev-tabla-caja">
        <table class="dev-tabla">
          <thead><tr><th>Agency</th><th>Terms</th><th class="num">Brokers</th>
            <th class="num">Deals</th><th class="num">GDV</th><th class="num">Its commission</th></tr></thead>
          <tbody>
            ${agencias.length ? agencias.map((a) => `
              <tr>
                <td><b>${esc(a.nombre)} ${a.principal ? sello('principal', 'green') : ''}</b>
                  <small>${esc(a.rera_numero ?? 'RERA not stated')}${a.proyecto ? ` · ${esc(a.proyecto)}` : ''}</small></td>
                <td>${sello(pct(a.monto_pb))}<small>toll ${pct(a.peaje_pb)}${a.exclusivo_hasta
    ? ` · exclusive to ${esc(date(a.exclusivo_hasta))}` : ''}</small></td>
                <td class="num">${a.brokers}</td>
                <td class="num">${a.deals}</td>
                <td class="num">${a.gdv_fils ? aed(a.gdv_fils) : '—'}</td>
                <td class="num">${a.comision_fils ? aed(a.comision_fils) : '—'}</td>
              </tr>`).join('')
    : '<tr><td colspan="6" class="muted">No agency on the panel yet.</td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="note">The <b>principal agency</b> is NDC, and it cannot be taken off the panel. Every other
        seat is yours to open and to close; a seat that closes is archived, never deleted, because its
        deals keep belonging to it.</p>
    </section>

    <div class="dev-dos">
      ${tarjeta({
    titulo: 'Seats used', icono: 'permiso', id: 'd-agencias-tope',
    nota: `Past ${tope.max} the panel stops being a panel: the inventory dilutes and two agencies answer the same Form A.`,
  })}
      <section class="mod">
        <header>${ico('llave', 15)}<h4>How many seats</h4></header>
        <dl class="kv">
          <dt>Hard ceiling</dt><dd>${tope.max} active</dd>
          <dt>Recommended</dt><dd>${tope.recomendado}</dd>
          <dt>Per project</dt><dd>4</dd>
          <dt>Probation</dt><dd>90 days</dd>
        </dl>
        <p class="note">The ceiling is a rule, not a taste: past it two agencies answer the same Form A and
          the buyer is told two prices. The recommendation follows the inventory — a seat needs roughly 35
          units behind it to be worth opening — and exclusivity on a project never runs past 90 days.</p>
      </section>
    </div>

    <section class="mod">
      <header>${ico('sello', 15)}<h4>Bring an agency in</h4></header>
      <form class="dev-form" id="alta-agencia">
        <div class="dev-form-sec">
          <label for="agencia-registro">From the registry of verified agencies</label>
          <select id="agencia-registro" name="agencia_registro_id">
            <option value="">— invite one that is not on the registry yet —</option>
            ${libres.map((x) => `<option value="${esc(x.agencia_registro_id)}">${esc(x.nombre)} · ${esc(x.rera_numero ?? 'no RERA')}</option>`).join('')}
          </select>
          <p class="note">Every one of them has a licence on file. Picking one puts it straight on the panel;
            inviting one sends a single-use link and it lands on probation until its papers are checked.</p>
        </div>
        <div class="dev-form-2">
          <div><label for="agencia-nombre">Agency name, if you invite it</label>
            <input id="agencia-nombre" name="nombre" placeholder="e.g. Marina Real Estate" maxlength="120"></div>
          <div><label for="agencia-email">Its email</label>
            <input id="agencia-email" name="email" type="email" placeholder="desk@agency.ae"></div>
        </div>
        <div class="dev-form-2">
          <div><label for="agencia-pb">Commission (basis points)</label>
            <input id="agencia-pb" name="monto_pb" type="number" value="200" min="0" max="2000" step="25">
            <small class="muted">200 = 2.00 % of the price. The NDC envelope runs at 400.</small></div>
          <div><label for="agencia-peaje">Toll to BlockEstate (basis points)</label>
            <input id="agencia-peaje" name="peaje_pb" type="number" value="50" min="0" max="500" step="10">
            <small class="muted">50 = 0.50 %, taken out of the commission.</small></div>
        </div>
        <div class="dev-form-pie">
          <button class="btn green" type="submit">${ico('pluma', 15)} Invite with a link</button>
          <button class="btn ghost" type="button" id="meter-registro">${ico('grupo', 15)} Put it on the panel</button>
        </div>
      </form>
      <div id="respuesta-agencia" class="msg" hidden></div>
    </section>

    <section class="mod">
      <header>${ico('almohadilla', 15)}<h4>Open links</h4><span>${abiertas.length} waiting</span></header>
      <div class="dev-tabla-caja">
        <table class="dev-tabla">
          <thead><tr><th>Who</th><th>Kind</th><th class="num">Uses</th><th>Expires</th><th>Link</th><th></th></tr></thead>
          <tbody>
            ${filas(inv.invitaciones).length ? filas(inv.invitaciones).map((i) => `
              <tr>
                <td><b>${esc(i.nombre ?? i.email ?? '—')}</b><small>${esc(i.email ?? '')}</small></td>
                <td>${sello(i.tipo)}</td>
                <td class="num">${i.usos}/${i.usos_max}</td>
                <td>${esc(date(i.expira_en))}</td>
                <td><code class="dev-mono">#/invite/${esc(String(i.token ?? '').slice(0, 10))}…</code></td>
                <td class="abrir">${i.estado === 'pending'
    ? `<button class="btn ghost sm" data-revocar="${esc(i.id)}" type="button">Revoke</button>` : sello(i.estado)}</td>
              </tr>`).join('')
    : '<tr><td colspan="6" class="muted">No link open: every seat is filled or was never invited.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;

  view().innerHTML = cascaron(d, '#/dev/agencies', cuerpo, '', 'Agencies');

  const t = lienzo('d-agencias-tope');
  if (t) {
    donaDeEstados(t, [
      ['On the panel', Number(tope.activas ?? 0), COLORES.publicado],
      ['Free seats', Math.max(0, Number(tope.max ?? 12) - Number(tope.activas ?? 0)), COLORES.sinAnuncio],
    ], { etiqueta: 'SEATS', formato: (n) => String(Math.round(n)) });
  }

  const form = view().querySelector('#alta-agencia');
  const resp = view().querySelector('#respuesta-agencia');
  const decir = (texto, ok) => {
    resp.hidden = false;
    resp.className = `msg ${ok ? 'ok' : 'err'}`;
    resp.textContent = texto;
  };
  const enlaceDe = (token) => `${location.origin}${location.pathname}#/invite/${token}`;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const nombre = form.nombre.value.trim();
    const email = form.email.value.trim();
    if (!nombre) { decir('An agency needs a name before it can be invited.', false); return; }
    try {
      const r = await api.inviteCreate({ tipo: 'agency', nombre, ...(email ? { email } : {}) });
      const enlace = enlaceDe(r.token);
      decir(`Link open until ${date(r.expira_en)}, one use, only for this agency: ${enlace}`, true);
      try { await navigator.clipboard.writeText(enlace); toast('Link copied'); } catch { /* no clipboard */ }
    } catch (e) { decir(e.message, false); }
  });

  view().querySelector('#meter-registro').addEventListener('click', async () => {
    const id = form.agencia_registro_id.value;
    if (!id) { decir('Pick an agency from the registry, or invite one with a name.', false); return; }
    try {
      await api.devAgencyAdd({
        agencia_registro_id: id,
        monto_pb: Number(form.monto_pb.value) || 200,
        peaje_pb: Number(form.peaje_pb.value) || 50,
      });
      toast('Agency added to the panel');
      go('#/dev/agencies');
    } catch (e) { decir(e.message, false); }
  });

  view().querySelectorAll('[data-revocar]').forEach((b) => b.addEventListener('click', async () => {
    try { await api.inviteRevoke(b.dataset.revocar); toast('Link revoked'); go('#/dev/agencies'); } catch (e) { toast(e.message); }
  }));
}

/* -------------------------------------------------------------------- the agency */

export async function viewAgencia({ query } = {}) {
  let d;
  let inv;
  try {
    [d, inv] = await Promise.all([api.agencyMe(), api.invites().catch(() => ({ invitaciones: [] }))]);
  } catch (e) { puerta(e, 'Agency desk'); return; }

  const p = d.perfil ?? {};
  const r = d.resumen ?? {};
  const c = d.comisiones ?? {};
  const paneles = filas(d.paneles);
  const brokers = filas(d.brokers);
  const deals = filas(d.deals);
  const abiertas = filas(inv.invitaciones).filter((i) => i.tipo === 'broker' && i.estado === 'pending');
  const tab = query?.get?.('t') ?? 'book';

  const grupos = [
    ['Your book', [
      ['#/agency', 'Book', 'pulso'],
      ['#/agency?t=deals', 'Deals', 'trato'],
    ]],
    ['Who sells for you', [
      ['#/agency?t=brokers', 'Brokers', 'grupo', brokers.length],
    ]],
    ['Where you sell', [
      ['#/agency?t=panels', 'Panels', 'edificio', paneles.length],
    ]],
  ];

  let cuerpo;
  if (tab === 'brokers') {
    cuerpo = `
      <section class="mod">
        <header>${ico('grupo', 15)}<h4>Your brokers</h4><span>${brokers.length}</span></header>
        <form class="dev-form" id="alta-broker">
          <div class="dev-form-2">
            <div><label for="broker-nombre">Name on the RERA card</label>
              <input id="broker-nombre" name="nombre" maxlength="120" placeholder="e.g. Aisha Rahman"></div>
            <div><label for="broker-email">Email</label>
              <input id="broker-email" name="email" type="email" placeholder="broker@agency.ae"></div>
          </div>
          <div class="dev-form-pie"><button class="btn green" type="submit">${ico('pluma', 15)} Send the link</button></div>
        </form>
        <div id="respuesta-broker" class="msg" hidden></div>
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>Broker</th><th>RERA card</th><th>Panel</th>
              <th class="num">Codes</th><th>With you since</th><th>State</th></tr></thead>
            <tbody>
              ${brokers.length ? brokers.map((b) => `
                <tr>
                  <td><b>${esc(b.nombre)}</b><small>${esc(b.correo ?? '')}</small></td>
                  <td><code class="dev-mono">${esc(b.rera_numero ?? '—')}</code></td>
                  <td>${esc(b.panel ?? '—')}</td>
                  <td class="num">${b.codigos}</td>
                  <td>${esc(date(b.desde))}</td>
                  <td>${b.activo ? sello('active', 'green') : sello('archived')}</td>
                </tr>`).join('')
    : '<tr><td colspan="6" class="muted">No broker yet: the seat is the agency, and a broker is how it multiplies.</td></tr>'}
            </tbody>
          </table>
        </div>
        <p class="note">A broker joins under <b>your</b> licence with a link you send, and the platform issues his
          code the moment he signs. He sees his own deals and nothing else: not your whole book, not the
          buyer’s papers.</p>
      </section>
      ${abiertas.length ? `<section class="mod">
        <header>${ico('almohadilla', 15)}<h4>Broker links open</h4><span>${abiertas.length}</span></header>
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>Who</th><th class="num">Uses</th><th>Expires</th><th></th></tr></thead>
            <tbody>
              ${abiertas.map((i) => `<tr><td><b>${esc(i.nombre ?? i.email ?? '—')}</b><small>${esc(i.email ?? '')}</small></td>
                <td class="num">${i.usos}/${i.usos_max}</td><td>${esc(date(i.expira_en))}</td>
                <td class="abrir"><button class="btn ghost sm" type="button" data-revocar="${esc(i.id)}">Revoke</button></td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>` : ''}
      ${tarjeta({
    titulo: 'What each broker brought', icono: 'trato', id: 'a-brokers',
    nota: 'Their commission, deal by deal. The split with each one is yours to agree; it is paid out of your net.',
  })}`;
  } else if (tab === 'deals') {
    cuerpo = `
      <section class="mod">
        <header>${ico('trato', 15)}<h4>Your deals</h4><span>${deals.length} in the book</span></header>
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>When</th><th>Unit</th><th>Developer</th><th>Code</th>
              <th class="num">Price</th><th class="num">Your commission</th><th>State</th></tr></thead>
            <tbody>
              ${deals.length ? deals.map((x) => `
                <tr>
                  <td>${esc(date(x.fecha))}</td>
                  <td><b>${esc(tipo(x.unidad))}</b><small>${esc(x.proyecto ?? '')}</small></td>
                  <td>${esc(x.desarrollador ?? '')}</td>
                  <td><code class="dev-mono">${esc(x.codigo ?? '—')}</code><small>${esc(x.broker ?? 'agency code')}</small></td>
                  <td class="num">${aed(x.precio_fils)}</td>
                  <td class="num">${aed(x.comision_fils)}</td>
                  <td>${sello(x.estado)}</td>
                </tr>`).join('')
    : '<tr><td colspan="7" class="muted">No deal attributed to your codes yet.</td></tr>'}
            </tbody>
          </table>
        </div>
        <p class="note">A deal is yours when the code that brought it belongs to you or to one of your brokers.
          When a developer works with several agencies, only attributed codes count: nobody is guessed into
          somebody else’s commission.</p>
      </section>`;
  } else if (tab === 'panels') {
    cuerpo = `
      <section class="mod">
        <header>${ico('edificio', 15)}<h4>The panels you sell on</h4><span>${paneles.length}</span></header>
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>Developer</th><th>Project</th><th class="num">Commission</th>
              <th class="num">Toll</th><th class="num">You keep</th><th>State</th></tr></thead>
            <tbody>
              ${paneles.length ? paneles.map((x) => `
                <tr>
                  <td><b>${esc(x.desarrollador)}</b><small>KYB ${esc(x.kyc_estado ?? 'not started')}</small></td>
                  <td>${esc(x.proyecto ?? 'all inventory')}</td>
                  <td class="num">${pct(x.monto_pb)}</td>
                  <td class="num">${pct(x.peaje_pb)}</td>
                  <td class="num">${pct(x.neto_pb)}</td>
                  <td>${sello(x.estado === 'active' ? 'active' : x.estado, x.estado === 'active' ? 'green' : '')}</td>
                </tr>`).join('')
    : '<tr><td colspan="6" class="muted">You are not on any panel yet.</td></tr>'}
            </tbody>
          </table>
        </div>
        <p class="note">The commission is the developer’s to set, negotiated per panel and per project. The toll is
          what BlockEstate keeps and it comes out of that commission, not on top of it: on a 2.00 % seat with a
          0.50 % toll you keep 1.50 %.</p>
      </section>`;
  } else {
    cuerpo = `
      <div class="dev-dos">
        ${tarjeta({
    titulo: 'Your commission by month', icono: 'pulso', id: 'a-mes',
    nota: 'Gross commission of the deals your codes brought, month by month.',
  })}
        ${tarjeta({
    titulo: 'Gross, toll, net', icono: 'moneda', id: 'a-split',
    nota: `The toll is ${pct(c.peaje_pb)} of the price and it comes out of the gross.`,
  })}
      </div>
      <section class="mod">
        <header>${ico('trato', 15)}<h4>The latest deals</h4></header>
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>When</th><th>Unit</th><th>Developer</th><th>Code</th>
              <th class="num">Price</th><th class="num">Your commission</th></tr></thead>
            <tbody>
              ${deals.slice(0, 8).map((x) => `
                <tr><td>${esc(date(x.fecha))}</td>
                  <td><b>${esc(tipo(x.unidad))}</b><small>${esc(x.proyecto ?? '')}</small></td>
                  <td>${esc(x.desarrollador ?? '')}</td>
                  <td><code class="dev-mono">${esc(x.codigo ?? '—')}</code></td>
                  <td class="num">${aed(x.precio_fils)}</td>
                  <td class="num">${aed(x.comision_fils)}</td></tr>`).join('')
    || '<tr><td colspan="6" class="muted">No deal yet on your codes.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  view().innerHTML = armazon({
    kicker: 'Agency desk',
    nombre: p.nombre ?? 'Agency',
    sub: `${p.rera_numero ? `RERA ${esc(p.rera_numero)}` : 'RERA not stated'} · ${p.verificada ? sello('verified', 'green') : sello('being checked')}`,
    grupos,
    activo: tab === 'book' ? '#/agency' : `#/agency?t=${tab}`,
    titulo: tab === 'book' ? 'Your book' : tab === 'brokers' ? 'Brokers' : tab === 'deals' ? 'Deals' : 'Panels',
    cuerpo: `
      ${kpis([
    ['Deals', String(r.deals ?? 0), `${brokers.length} broker${brokers.length === 1 ? '' : 's'}`],
    ['GDV sold', aed(r.gdv_fils), 'on your codes', true],
    ['Gross commission', aed(c.bruto_fils), pct(c.coste_pb), true],
    ['Net to you', aed(c.neto_fils), 'after the toll', true],
  ])}
      ${cuerpo}
    `,
  });

  if (tab === 'book') {
    const m = lienzo('a-mes');
    if (m) lineaDeMeses(m, doceMeses(c.por_mes).map((x) => [x.etiqueta, x.comision]), { formato: formAed });
    const s = lienzo('a-split');
    if (s) {
      donaSegura(s, [
        ['Net to you', Number(c.neto_fils ?? 0) / 100, COLORES.publicado],
        ['Toll to BlockEstate', Number(c.peaje_fils ?? 0) / 100, COLORES.revision],
      ], { etiqueta: 'COMMISSION', formato: formAed });
    }
  }
  if (tab === 'brokers') {
    const b = lienzo('a-brokers');
    if (b) {
      barrasDeCategorias(b, filas(c.por_broker).map((x, i) => [x.nombre, Number(x.comision_fils ?? 0) / 100, COLORES.serie[i % COLORES.serie.length]]),
        { formato: formAed });
    }
    const form = view().querySelector('#alta-broker');
    const resp = view().querySelector('#respuesta-broker');
    form?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const nombre = form.nombre.value.trim();
      const email = form.email.value.trim();
      if (!nombre) {
        resp.hidden = false;
        resp.className = 'msg err';
        resp.textContent = 'The name on the RERA card is what makes the licence.';
        return;
      }
      try {
        const x = await api.inviteCreate({ tipo: 'broker', nombre, ...(email ? { email } : {}) });
        const enlace = `${location.origin}${location.pathname}#/invite/${x.token}`;
        resp.hidden = false;
        resp.className = 'msg ok';
        resp.textContent = `Link open until ${date(x.expira_en)}, one use. The platform issues his code the moment he signs: ${enlace}`;
        try { await navigator.clipboard.writeText(enlace); toast('Link copied'); } catch { /* no clipboard */ }
        form.reset();
      } catch (e) {
        resp.hidden = false;
        resp.className = 'msg err';
        resp.textContent = e.message;
      }
    });
    view().querySelectorAll('[data-revocar]').forEach((b2) => b2.addEventListener('click', async () => {
      try { await api.inviteRevoke(b2.dataset.revocar); toast('Link revoked'); go('#/agency?t=brokers'); } catch (e) { toast(e.message); }
    }));
  }
}

/* -------------------------------------------------------------------- the broker */

export async function viewBrokerDesk({ query } = {}) {
  let d;
  try {
    d = await api.brokerMe();
  } catch (e) { puerta(e, 'Broker desk'); return; }

  const l = d.licencia ?? {};
  const r = d.resumen ?? {};
  const c = d.comisiones ?? {};
  const deals = filas(d.deals);
  const codigos = filas(d.codigos);
  const holds = filas(d.holds);
  const tab = query?.get?.('t') ?? 'book';

  const grupos = [
    ['Your book', [
      ['#/broker', 'Book', 'pulso'],
      ['#/broker?t=deals', 'Deals', 'trato', deals.length],
    ]],
    ['Your codes', [
      ['#/broker?t=codes', 'Codes', 'etiqueta', codigos.length],
      ['#/broker?t=holds', 'Holds', 'fecha', holds.length],
    ]],
  ];

  let cuerpo;
  if (tab === 'deals') {
    cuerpo = `<section class="mod">
      <header>${ico('trato', 15)}<h4>Deals on your codes</h4><span>${deals.length}</span></header>
      <div class="dev-tabla-caja">
        <table class="dev-tabla">
          <thead><tr><th>When</th><th>Unit</th><th>Developer</th><th>Code</th>
            <th class="num">Price</th><th class="num">Your share</th></tr></thead>
          <tbody>
            ${deals.length ? deals.map((x) => `
              <tr><td>${esc(date(x.fecha))}</td>
                <td><b>${esc(tipo(x.unidad))}</b><small>${esc(x.proyecto ?? '')}</small></td>
                <td>${esc(x.desarrollador ?? '')}</td>
                <td><code class="dev-mono">${esc(x.codigo ?? '')}</code></td>
                <td class="num">${aed(x.precio_fils)}</td>
                <td class="num">${aed(x.mi_parte_fils)}</td></tr>`).join('')
    : '<tr><td colspan="6" class="muted">No deal yet. A hold is the first step.</td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="note">Your share is paid out of the agency’s net commission on the deals your codes brought.
        The buyer’s papers are never yours to see: the platform keeps them, and that is what lets a broker
        work without holding somebody else’s identity.</p>
    </section>`;
  } else if (tab === 'codes') {
    cuerpo = `<section class="mod">
      <header>${ico('etiqueta', 15)}<h4>Your codes</h4><span>issued by the platform</span></header>
      <div class="dev-tabla-caja">
        <table class="dev-tabla">
          <thead><tr><th>Code</th><th>Channel</th><th>Developer</th><th>Agency</th><th>Since</th><th>State</th></tr></thead>
          <tbody>
            ${codigos.length ? codigos.map((x) => `
              <tr><td><code class="dev-mono">${esc(x.codigo)}</code></td>
                <td>${sello(x.canal)}</td><td>${esc(x.desarrollador ?? '—')}</td>
                <td>${esc(x.agencia ?? '—')}</td><td>${esc(date(x.desde))}</td>
                <td>${x.activo ? sello('active', 'green') : sello('off')}</td></tr>`).join('')
    : '<tr><td colspan="6" class="muted">No code yet: the agency opens the first one for you.</td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="note">A code is the only thing that makes a sale yours, and it comes out of the platform on the
        developer’s inventory — never typed by hand — so two brokers can never claim the same deal.</p>
    </section>`;
  } else if (tab === 'holds') {
    cuerpo = `<section class="mod">
      <header>${ico('fecha', 15)}<h4>Live holds</h4><span>${holds.length}</span></header>
      <div class="dev-tabla-caja">
        <table class="dev-tabla">
          <thead><tr><th>Unit</th><th>Project</th><th>Code</th><th class="num">Price</th><th>Expires</th></tr></thead>
          <tbody>
            ${holds.length ? holds.map((x) => `
              <tr><td><b>${esc(tipo(x.unidad))}</b></td><td>${esc(x.proyecto ?? '')}</td>
                <td><code class="dev-mono">${esc(x.codigo ?? '')}</code></td>
                <td class="num">${aed(x.precio_fils)}</td><td>${esc(date(x.expira_en))}</td></tr>`).join('')
    : '<tr><td colspan="5" class="muted">No live hold.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;
  } else {
    cuerpo = `
      <div class="dev-dos">
        ${tarjeta({
    titulo: 'Your share by month', icono: 'pulso', id: 'b-mes',
    nota: 'What your own codes brought you, month by month.',
  })}
        ${tarjeta({
    titulo: 'Where your commission comes from', icono: 'moneda', id: 'b-split',
    nota: `Your share is ${pct(c.parte_pb)} of the agency’s net commission on your deals.`,
  })}
      </div>
      <section class="mod">
        <header>${ico('trato', 15)}<h4>Latest deals on your codes</h4></header>
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>When</th><th>Unit</th><th>Project</th><th class="num">Price</th><th class="num">Your share</th></tr></thead>
            <tbody>
              ${deals.slice(0, 8).map((x) => `
                <tr><td>${esc(date(x.fecha))}</td>
                  <td><b>${esc(tipo(x.unidad))}</b></td><td>${esc(x.proyecto ?? '')}</td>
                  <td class="num">${aed(x.precio_fils)}</td><td class="num">${aed(x.mi_parte_fils)}</td></tr>`).join('')
    || '<tr><td colspan="5" class="muted">Nothing on your codes yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  view().innerHTML = armazon({
    kicker: 'Broker desk',
    nombre: l.nombre ?? 'Broker',
    sub: `${l.agencia ? esc(l.agencia) : 'no agency'} · RERA ${esc(l.rera_numero ?? '—')}`,
    grupos,
    activo: tab === 'book' ? '#/broker' : `#/broker?t=${tab}`,
    titulo: tab === 'book' ? 'My book' : tab === 'deals' ? 'Deals' : tab === 'codes' ? 'Codes' : 'Holds',
    cuerpo: `
      ${kpis([
    ['Deals', String(r.deals ?? 0), `${codigos.length} code${codigos.length === 1 ? '' : 's'}`],
    ['Sold', aed(r.gdv_fils), 'on your codes', true],
    ['Your share', aed(r.mia_fils), pct(c.parte_pb), true],
    ['Live holds', String(holds.length), 'before the sale', true],
  ])}
      ${cuerpo}
    `,
  });

  if (tab === 'book') {
    const m = lienzo('b-mes');
    if (m) lineaDeMeses(m, doceMeses(c.por_mes).map((x) => [x.etiqueta, x.mia]), { formato: formAed });
    const s = lienzo('b-split');
    if (s) {
      const agencia = Number(c.agencia_fils ?? 0) / 100;
      const mia = Number(c.mia_fils ?? 0) / 100;
      donaSegura(s, [
        ['Yours', mia, COLORES.publicado],
        ['To the agency', Math.max(0, agencia - mia), COLORES.sinAnuncio],
      ], { etiqueta: 'COMMISSION', formato: formAed });
    }
  }
}

/* ------------------------------------------------------------------------ NDC */

export async function viewNdc({ query } = {}) {
  let d;
  try {
    d = await api.ndcMe();
  } catch (e) { puerta(e, 'NDC · network console'); return; }

  const r = d.resumen ?? {};
  const caja = d.caja ?? {};
  const propia = d.propia ?? {};
  const kyc = d.kyc ?? {};
  const red = filas(d.red);
  const agencias = filas(d.agencias);
  const reparto = filas(d.reparto);
  const canales = filas(d.canales);
  const alertas = filas(d.alertas);
  const tab = query?.get?.('t') ?? 'network';
  const miles = (x) => Number(x ?? 0).toLocaleString('en-US');

  const grupos = [
    ['The network', [
      ['#/ndc', 'Overview', 'pulso'],
      ['#/ndc?t=developers', 'Developers', 'edificio', red.length],
    ]],
    ['Who sells', [
      ['#/ndc?t=agencies', 'Agencies', 'grupo', agencias.length],
      ['#/ndc?t=creators', 'Creators', 'pluma'],
    ]],
    ['Demand', [
      ['#/ndc?t=leads', 'Leads', 'lupa'],
    ]],
    ['Money', [
      ['#/ndc?t=wallet', 'Wallet', 'moneda'],
    ]],
    ['Inventory', [
      ['#/ndc?t=projects', 'Projects', 'casa'],
    ]],
    ['Obligation', [
      ['#/ndc?t=kyc', 'Compliance', 'sello', kyc.pendientes || undefined],
    ]],
  ];

  // One book at a time: each page reads a different part of the network, and pulling all four to show
  // one would make every visit pay for the three nobody asked for.
  const intentar = async (f) => {
    try { return await f(); } catch (e) { return { error: e.message }; }
  };

  let cuerpo;
  const extra = {
    creators: tab === 'creators' ? await intentar(api.ndcCreators) : null,
    leads: tab === 'leads' ? await intentar(api.ndcLeads) : null,
    wallet: tab === 'wallet' ? await intentar(api.ndcWallet) : null,
    projects: tab === 'projects' ? await intentar(api.ndcProjects) : null,
    kyc: tab === 'kyc' ? await intentar(api.ndcKyc) : null,
  };
  if (tab === 'developers') {
    cuerpo = `<section class="mod">
      <header>${ico('edificio', 15)}<h4>The developers of the network</h4><span>${red.length}</span></header>
      <div class="dev-tabla-caja">
        <table class="dev-tabla">
          <thead><tr><th>Developer</th><th>KYB</th><th class="num">Projects</th><th class="num">Units</th>
            <th class="num">Deals</th><th class="num">GDV</th><th class="num">Agencies</th><th class="num">Brokers</th></tr></thead>
          <tbody>
            ${red.length ? red.map((x) => `
              <tr><td><b>${esc(x.nombre)}</b><small>${x.activo ? 'active' : 'not active'}</small></td>
                <td>${x.kyc_estado === 'approved' ? sello('approved', 'green') : sello(x.kyc_estado ?? 'pending')}</td>
                <td class="num">${x.proyectos}</td><td class="num">${x.unidades}</td>
                <td class="num">${x.deals}</td><td class="num">${aed(x.gdv_fils)}</td>
                <td class="num">${x.agencias}</td><td class="num">${x.brokers}</td></tr>`).join('')
    : '<tr><td colspan="8" class="muted">No developer in the network yet.</td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="note">A developer joins by a link BlockEstate sends, never by signing up on the site. Its own
        review is the gate: while the KYB is not approved nothing can be published, and no agency seat can be
        opened.</p>
    </section>`;
  } else if (tab === 'agencies') {
    cuerpo = `<section class="mod">
      <header>${ico('grupo', 15)}<h4>Every seat in the network</h4><span>${agencias.length}</span></header>
      <div class="dev-tabla-caja">
        <table class="dev-tabla">
          <thead><tr><th>Agency</th><th>Developer</th><th class="num">Terms</th><th class="num">Brokers</th>
            <th class="num">Deals</th><th class="num">GDV</th><th class="num">Commission</th><th>State</th></tr></thead>
          <tbody>
            ${agencias.length ? agencias.map((x) => `
              <tr><td><b>${esc(x.nombre)}</b></td><td>${esc(x.desarrollador)}</td>
                <td class="num">${pct(x.monto_pb)}<small>toll ${pct(x.peaje_pb)}</small></td>
                <td class="num">${x.brokers}</td><td class="num">${x.deals}</td>
                <td class="num">${aed(x.gdv_fils)}</td><td class="num">${aed(x.comision_fils)}</td>
                <td>${sello(x.estado === 'active' ? 'active' : x.estado, x.estado === 'active' ? 'green' : '')}</td></tr>`).join('')
    : '<tr><td colspan="8" class="muted">No seat open.</td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="note">A seat is one agency on one developer’s panel, with its own terms. The same agency can hold
        several seats with different developers, and its RERA number is one for all of them.</p>
    </section>`;
  } else if (tab === 'kyc') {
    // The queue is read apart from the counts above: the counts come from the whole book — developers
    // and agencies too — and the queue is only the buyers a person has to decide on today.
    const kycq = extra.kyc ?? {};
    cuerpo = `
      ${kpis([
    ['Buyers checked', String(kyc.compradores_aprobados ?? 0), `of ${kyc.compradores ?? 0} in the book`],
    ['Waiting', String(kyc.pendientes ?? 0), kyc.tarde ? `${kyc.tarde} past the deadline` : 'inside the deadline'],
    ['Oldest case', `${kyc.horas_el_mas_viejo ?? 0} h`, `the promise is ${kyc.sla_horas ?? 72} h`],
    ['Developers pending', String(kyc.desarrolladores_pendientes ?? 0), `${kyc.desarrolladores_aprobados ?? 0} approved`, true],
  ])}
      <section class="mod">
        <header>${ico('sello', 15)}<h4>Buyers waiting on a decision</h4><span>${Number(kycq.resumen?.abiertos ?? 0)}</span></header>
        ${kycq.error ? `<p>${esc(kycq.error)}</p>` : `
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>Buyer</th><th>Declared</th><th>Purchase</th><th class="num">Waiting</th><th>Reason</th><th></th></tr></thead>
            <tbody>
              ${filas(kycq.casos).length ? filas(kycq.casos).map((k) => `
                <tr>
                  <td><b>${esc(k.comprador)}</b><small>${esc(k.nombre_legal ?? '')}</small></td>
                  <td>${esc(k.documento ?? '—')}<small>${esc(k.pais ?? '')} · ${esc(k.red ?? '')} ${esc(String(k.wallet ?? '').slice(0, 12))}</small></td>
                  <td>${esc(k.proyecto ?? '—')}<small>${esc(k.unidad ?? '')} · ${k.precio_aed}</small></td>
                  <td class="num">${k.horas} h${k.horas > 72 ? '<small class="late">past the promise</small>' : ''}</td>
                  <td>${k.segunda_aprobacion
    ? `<input class="ndc-motivo" placeholder="reason" maxlength="200"><small>rejection waiting for a second person</small>`
    : `<input class="ndc-motivo" placeholder="reason" maxlength="200">`}</td>
                  <td class="abrir">${k.segunda_aprobacion
    ? `<button class="btn ghost sm" type="button" data-kyc-confirmar="${esc(k.intencion_id)}">Confirm</button>`
    : `<button class="btn green sm" type="button" data-kyc="approved" data-id="${esc(k.intencion_id)}">Approve</button>
                     <button class="btn ghost sm" type="button" data-kyc="rejected" data-id="${esc(k.intencion_id)}">Reject</button>`}</td>
                </tr>`).join('')
    : '<tr><td colspan="6" class="muted">No buyer is waiting on a decision. A declaration sent before the purchase reaches the KYC step appears here when it does.</td></tr>'}
            </tbody>
          </table>
        </div>
        <p class="note">A buyer declares who they are and which wallet the money comes from; the decision is
          NDC's, taken by a person and with a reason. An approval applies at once. A rejection needs a second
          person, so the case stays here until somebody else confirms it.</p>
        <div id="respuesta-kyc" class="msg" hidden></div>`}
      </section>
      <section class="mod">
        <header>${ico('campana', 15)}<h4>What needs a person</h4><span>${alertas.length}</span></header>
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>Kind</th><th>Who</th><th>State</th><th>Since</th></tr></thead>
            <tbody>
              ${alertas.length ? alertas.map((a) => `
                <tr><td>${sello(a.tipo)}</td><td><b>${esc(a.nombre)}</b></td>
                  <td>${esc(a.estado ?? '')}</td><td>${esc(date(a.cuando))}</td></tr>`).join('')
    : '<tr><td colspan="4" class="muted">Nothing waiting.</td></tr>'}
            </tbody>
          </table>
        </div>
        <p class="note">A developer whose KYB is not approved cannot publish, and an agency without a checked
          licence cannot be activated. Both are the principal agency’s obligation, and both are decided by a
          person: no job approves a case.</p>
      </section>`;
  } else if (tab === 'creators') {
    const c = extra.creators ?? {};
    if (c.error) {
      cuerpo = `<section class="mod"><header>${ico('campana', 15)}<h4>The creators</h4></header>
        <p>${esc(c.error)}</p></section>`;
    } else {
      const rs = c.resumen ?? {};
      const lista = filas(c.creadores);
      cuerpo = `
        ${kpis([
    ['Signed with NDC', String(rs.firmados_ndc ?? 0), `of ${rs.creadores ?? 0} creators`, true],
    ['Fully signed', String(rs.completos ?? 0), 'the three contracts in place'],
    ['Waiting on NDC', String(rs.sin_firma_ndc ?? 0), 'the brokerage has not signed'],
    ['Audience', miles(rs.audiencia ?? 0), `${miles(rs.visitas_30d ?? 0)} visits in 30 days`],
    ['Creators earned', aed(rs.devengado_fils), 'their share of the fee', true],
  ])}
        <section class="mod">
          <header>${ico('pluma', 15)}<h4>The creators who sign with NDC</h4><span>${lista.length}</span></header>
          <div class="dev-tabla-caja">
            <table class="dev-tabla">
              <thead><tr><th>Creator</th><th>Where</th><th>KYC</th><th class="num">Codes</th>
                <th>NDC</th><th>BlockEstate</th><th>USTAR</th><th class="num">Visits</th>
                <th class="num">Deals</th><th class="num">Earned</th><th></th></tr></thead>
              <tbody>
                ${lista.length ? lista.map((x) => {
    const firma = (k) => {
      const t = filas(x.contratos).find((y) => y.actor === k) ?? {};
      return t.estado === 'firmado'
        ? `<span class="tag green">signed</span><small>${esc(date(t.firmado_en))}</small>`
        : `<span class="tag">${esc(t.estado ?? 'pending')}</span>`;
    };
    const propia = filas(x.contratos).find((y) => y.actor === 'ndc') ?? {};
    const accion = propia.estado === 'firmado'
      ? `<button class="btn ghost sm" type="button" data-firma="revocado" data-id="${esc(x.beneficiario_id)}">Withdraw</button>`
      : `<button class="btn green sm" type="button" data-firma="firmado" data-id="${esc(x.beneficiario_id)}">${ico('pluma', 13)} Sign</button>`;
    return `
                  <tr>
                    <td><b>${esc(x.nombre)}</b><small>${esc(x.handle ?? x.correo ?? '')}</small></td>
                    <td>${esc(x.plataforma ?? '—')}<small>${miles(x.seguidores)} followers</small></td>
                    <td>${x.kyc_estado === 'approved' ? sello('approved', 'green') : sello(x.kyc_estado ?? 'pending')}</td>
                    <td class="num">${filas(x.codigos).length}</td>
                    <td>${firma('ndc')}</td><td>${firma('blockestate')}</td><td>${firma('ustar')}</td>
                    <td class="num">${miles(x.visitas_30d)}</td>
                    <td class="num">${x.deals}</td>
                    <td class="num">${aed(x.devengado_fils)}</td>
                    <td class="abrir">${accion}</td>
                  </tr>`;
  }).join('')
    : '<tr><td colspan="11" class="muted">No creator has signed with the network yet.</td></tr>'}
              </tbody>
            </table>
          </div>
          <p class="note">A creator is paid on a deal only when the three contracts exist: the brokerage’s,
            which NDC signs here; BlockEstate’s, which the platform signs; and USTAR’s, which the agency signs.
            Withdrawing NDC’s signature stops every code of that creator from paying from that moment; the two
            already signed are left as they were, because this console does not speak for them.</p>
          <div id="respuesta-creador" class="msg" hidden></div>
        </section>`;
    }
  } else if (tab === 'leads') {
    const l = extra.leads ?? {};
    if (l.error) {
      cuerpo = `<section class="mod"><header>${ico('campana', 15)}<h4>The leads</h4></header>
        <p>${esc(l.error)}</p></section>`;
    } else {
      const rs = l.resumen ?? {};
      const lista = filas(l.leads);
      const tope = lista.slice(0, 80);
      cuerpo = `
        ${kpis([
    ['Leads', miles(rs.leads ?? 0), 'buyers who committed to a price'],
    ['Pipeline', rs.valor_aed ?? aed(0), 'what they are worth together', true],
    ['Without a source', miles(rs.sin_fuente ?? 0), 'no code on the record', true],
    ['KYC to start', miles(rs.kyc_pendientes ?? 0), 'before any money moves'],
  ])}
        <section class="mod">
          <header>${ico('moneda', 15)}<h4>Where they come from</h4><span>${filas(rs.canales).length}</span></header>
          <div class="dev-tabla-caja">
            <table class="dev-tabla">
              <thead><tr><th>Channel</th><th class="num">Leads</th><th class="num">Value</th></tr></thead>
              <tbody>
                ${filas(rs.canales).map((x) => `<tr><td>${esc(x.label)}</td><td class="num">${miles(x.deals)}</td>
                  <td class="num">${x.valor_aed}</td></tr>`).join('')
    || '<tr><td colspan="3" class="muted">No lead yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>
        <section class="mod">
          <header>${ico('lupa', 15)}<h4>${tope.length === lista.length ? 'Every lead' : `The last ${tope.length}`}</h4>
            <span>${miles(lista.length)}</span></header>
          <div class="dev-tabla-caja">
            <table class="dev-tabla">
              <thead><tr><th>Buyer</th><th>Purchase</th><th>Channel</th><th>Code</th>
                <th class="num">Price</th><th>KYC</th><th>State</th><th>When</th></tr></thead>
              <tbody>
                ${tope.length ? tope.map((x) => `
                  <tr>
                    <td><b>${esc(x.comprador ?? '—')}</b><small>${esc(x.email ?? '')}</small></td>
                    <td>${esc(x.proyecto ?? '—')}<small>${esc(x.unidad ?? '')} · ${esc(x.desarrollador ?? '')}</small></td>
                    <td>${sello(x.canal ?? '—')}</td>
                    <td>${x.codigo ? `<code class="dev-mono">${esc(x.codigo)}</code><small>${esc(x.fuente ?? '')}</small>`
    : '<span class="muted">not recorded</span>'}</td>
                    <td class="num">${x.precio_aed}</td>
                    <td>${x.kyc_estado === 'approved' ? sello('approved', 'green') : sello(x.kyc_estado ?? 'pending')}</td>
                    <td>${sello(x.estado ?? '—')}</td>
                    <td>${esc(date(x.creada_en))}</td>
                  </tr>`).join('')
    : '<tr><td colspan="8" class="muted">No buyer has committed to a price yet.</td></tr>'}
              </tbody>
            </table>
          </div>
          <p class="note">A lead is a buyer who committed to a price on a unit — not a name that filled a form.
            The code is read from the sale’s own snapshot, so a lead that closed says which creator or broker
            was paid on it; the ones still open only know their channel, and say so rather than name a party
            the books never recorded.</p>
        </section>`;
    }
  } else if (tab === 'wallet') {
    const w = extra.wallet ?? {};
    if (w.error) {
      cuerpo = `<section class="mod"><header>${ico('campana', 15)}<h4>The money</h4></header>
        <p>${esc(w.error)}</p></section>`;
    } else {
      const li = w.linea ?? {};
      const te = w.tesoreria ?? {};
      cuerpo = `
        ${kpis([
    ['Earned', li.devengado_aed ?? aed(0), 'commission plus the network’s share', true],
    ['Paid out', li.pagado_aed ?? aed(0), `${li.extractos ?? 0} statements`],
    ['Available', li.disponible_aed ?? aed(0), 'owed and not yet paid'],
    ['Crypto received', te.cripto_aed ?? aed(0), `${te.monedas ?? 0} assets`, true],
    ['Settled to AED', te.liquidado_aed ?? aed(0), 'through the OTC desk'],
  ])}
        <div class="dev-dos">
          <section class="mod">
            <header>${ico('moneda', 15)}<h4>NDC’s line</h4></header>
            <dl class="kv">
              <dt>NDC deals</dt><dd>${miles(li.deals ?? 0)}<small>attributed to its own seats</small></dd>
              <dt>Deals with a fee</dt><dd>${miles(li.con_snapshot ?? 0)}<small>the whole network, where the line is read</small></dd>
              <dt>GDV behind them</dt><dd>${li.gdv_aed ?? aed(0)}</dd>
              <dt>Commission</dt><dd>${li.comision_aed ?? aed(0)}</dd>
              <dt>Share of the distribution</dt><dd>${li.reparto_aed ?? aed(0)}</dd>
              <dt>Owed</dt><dd><b>${li.devengado_aed ?? aed(0)}</b></dd>
              <dt>Already paid</dt><dd>${li.pagado_aed ?? aed(0)}</dd>
            </dl>
            <p class="note">Commission is read from each sale’s own snapshot, never recomputed here: what the
              engine wrote on the day of the deal is what the line says today.</p>
          </section>
          ${tarjeta({
    titulo: 'Treasury by asset', icono: 'moneda', id: 'n-activos',
    nota: 'What arrived on-chain, by asset, at the conversion of the day.',
  })}
        </div>
        <section class="mod">
          <header>${ico('moneda', 15)}<h4>By asset</h4><span>${filas(w.por_activo).length}</span></header>
          <div class="dev-tabla-caja">
            <table class="dev-tabla">
              <thead><tr><th>Asset</th><th>Network</th><th class="num">Payments</th><th class="num">Received</th><th>Last</th></tr></thead>
              <tbody>
                ${filas(w.por_activo).map((a) => `<tr><td><b>${esc(String(a.activo ?? '').toUpperCase())}</b></td>
                  <td>${esc(a.red ?? '—')}</td><td class="num">${miles(a.n)}</td>
                  <td class="num">${a.recibido_aed}</td><td>${esc(date(a.ultimo))}</td></tr>`).join('')
    || '<tr><td colspan="5" class="muted">Nothing has arrived on-chain yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>
        <section class="mod">
          <header>${ico('pulso', 15)}<h4>The last movements</h4><span>${filas(w.movimientos).length}</span></header>
          <div class="dev-tabla-caja">
            <table class="dev-tabla">
              <thead><tr><th>Serial</th><th>Concept</th><th>Asset</th><th class="num">Amount</th><th>State</th><th>When</th></tr></thead>
              <tbody>
                ${filas(w.movimientos).map((m) => `
                  <tr>
                    <td><code class="dev-mono">${esc(m.serial_no ?? '')}</code>
                      <small>${esc(String(m.tx_hash ?? '').slice(0, 14))}${m.tx_hash ? '…' : ''}</small></td>
                    <td>${esc(m.concepto ?? '—')}</td>
                    <td>${esc(String(m.activo ?? '').toUpperCase())}<small>${esc(m.red ?? '')}</small></td>
                    <td class="num">${m.monto_aed}</td>
                    <td>${sello(m.estado ?? '—', m.estado === 'settled' ? 'green' : '')}</td>
                    <td>${esc(date(m.creado_en))}</td>
                  </tr>`).join('')
    || '<tr><td colspan="6" class="muted">No payment recorded yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>
        <section class="mod">
          <header>${ico('banco', 15)}<h4>Settlements to the bank</h4><span>${filas(w.settlements).length}</span></header>
          <div class="dev-tabla-caja">
            <table class="dev-tabla">
              <thead><tr><th>Provider</th><th>Bank</th><th class="num">Amount</th><th>State</th><th>When</th></tr></thead>
              <tbody>
                ${filas(w.settlements).map((s) => `<tr><td>${esc(s.proveedor ?? '—')}</td>
                  <td>${esc(s.banco ?? '—')}</td><td class="num">${s.aed}</td>
                  <td>${sello(s.estado ?? '—', String(s.estado) === 'settled' ? 'green' : '')}</td>
                  <td>${esc(date(s.creado_en))}</td></tr>`).join('')
    || '<tr><td colspan="5" class="muted">Nothing settled yet.</td></tr>'}
              </tbody>
            </table>
          </div>
          <p class="note">Two ledgers, never one: what the network is owed is read from the commission snapshots,
            and what it has been paid is read from the statements. The difference is the available line, and it is
            only ever as good as the statements behind it.</p>
        </section>`;
    }
  } else if (tab === 'projects') {
    const pj = extra.projects ?? {};
    if (pj.error) {
      cuerpo = `<section class="mod"><header>${ico('campana', 15)}<h4>The inventory</h4></header>
        <p>${esc(pj.error)}</p></section>`;
    } else {
      const rs = pj.resumen ?? {};
      const proyectos = filas(pj.proyectos);
      const devs = filas(pj.desarrolladores);
      cuerpo = `
        ${kpis([
    ['Projects', String(rs.proyectos ?? 0), `${rs.desarrolladores ?? 0} developers`, true],
    ['Units', miles(rs.unidades ?? 0), `${miles(rs.vendidas ?? 0)} sold`],
    ['Inventory value', rs.valor_aed ?? aed(0), 'at the list price', true],
    ['Listed', miles(rs.listings ?? 0), 'units the market can see'],
  ])}
        <section class="mod">
          <header>${ico('edificio', 15)}<h4>What the network carries</h4><span>${proyectos.length}</span></header>
          <div class="dev-tabla-caja">
            <table class="dev-tabla">
              <thead><tr><th>Project</th><th>Developer</th><th>Where</th><th>State</th>
                <th class="num">Units</th><th class="num">Sold</th><th class="num">Value</th>
                <th class="num">Listed</th><th></th></tr></thead>
              <tbody>
                ${proyectos.length ? proyectos.map((x) => `
                  <tr>
                    <td><b>${esc(x.nombre)}</b><small>${esc(date(x.creado_en))}</small></td>
                    <td>${esc(x.desarrollador)}</td>
                    <td>${esc(x.ciudad ?? '—')}<small>${esc(x.emirato ?? '')}</small></td>
                    <td>${sello(x.estado ?? '—', x.estado === 'published' ? 'green' : '')}</td>
                    <td class="num">${miles(x.unidades)}</td>
                    <td class="num">${miles(x.vendidas)}</td>
                    <td class="num">${x.valor_aed}</td>
                    <td class="num">${miles(x.listings)}</td>
                    <td class="abrir"><button class="btn ghost sm" type="button" data-unidad="${esc(x.proyecto_id)}">Add a unit</button></td>
                  </tr>`).join('')
    : '<tr><td colspan="9" class="muted">No project in the network yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>
        <div class="dev-dos">
          <section class="mod">
            <header>${ico('edificio', 15)}<h4>Open a project</h4></header>
            <form class="dev-form" id="ndc-proyecto">
              <div class="dev-form-sec">
                <label for="ndc-dev">For which developer</label>
                <select id="ndc-dev" name="desarrollador_id" required>
                  <option value="">— pick one —</option>
                  ${devs.map((d) => `<option value="${esc(d.desarrollador_id)}"${d.kyb === 'approved' && d.estado === 'true' ? '' : ' disabled'}>${esc(d.nombre)} · ${esc(d.kyb ?? 'pending')}${d.estado === 'true' ? '' : ' · inactive'}</option>`).join('')}
                </select>
                <p class="note">Only an organisation whose KYB is approved and that is active can carry
                  inventory. The ones that cannot are listed and greyed out: the console shows why a project
                  will be refused before the form is filled.</p>
              </div>
              <div class="dev-form-2">
                <div><label for="ndc-nombre">Project name</label>
                  <input id="ndc-nombre" name="nombre" required maxlength="120" placeholder="e.g. Palm Residences II"></div>
                <div><label for="ndc-ciudad">City</label>
                  <input id="ndc-ciudad" name="ciudad" required maxlength="80" placeholder="Dubai"></div>
              </div>
              <div class="dev-form-2">
                <div><label for="ndc-emirato">Emirate</label>
                  <select id="ndc-emirato" name="emirato" required>
                    ${['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain']
    .map((e) => `<option value="${e}">${e}</option>`).join('')}
                  </select></div>
                <div><label for="ndc-comunidad">Community (optional)</label>
                  <input id="ndc-comunidad" name="comunidad" maxlength="80" placeholder="Dubai Marina"></div>
              </div>
              <div class="dev-form-pie">
                <button class="btn green" type="submit">${ico('edificio', 15)} Open the project</button>
              </div>
            </form>
            <div id="respuesta-proyecto" class="msg" hidden></div>
          </section>
          <section class="mod">
            <header>${ico('casa', 15)}<h4>Add a unit</h4></header>
            <form class="dev-form" id="ndc-unidad">
              <div class="dev-form-sec">
                <label for="ndc-proyecto-sel">To which project</label>
                <select id="ndc-proyecto-sel" name="proyecto_id" required>
                  ${proyectos.map((x) => `<option value="${esc(x.proyecto_id)}">${esc(x.nombre)} · ${esc(x.desarrollador)}</option>`).join('')}
                </select>
              </div>
              <div class="dev-form-2">
                <div><label for="ndc-tipo">Type</label>
                  <select id="ndc-tipo" name="tipo" required>
                    <option value="apartment">Apartment</option>
                    <option value="villa">Villa</option>
                    <option value="office">Office</option>
                    <option value="retail">Retail</option>
                    <option value="hotel">Hotel unit</option>
                  </select></div>
                <div><label for="ndc-obra">State</label>
                  <select id="ndc-obra" name="estado_obra" required>
                    <option value="ready">Ready</option>
                    <option value="off_plan">Off plan</option>
                  </select></div>
              </div>
              <div class="dev-form-2">
                <div><label for="ndc-dorm">Bedrooms</label>
                  <input id="ndc-dorm" name="dormitorios" type="number" min="0" max="12" step="1" value="2"></div>
                <div><label for="ndc-sqft">Interior (sqft)</label>
                  <input id="ndc-sqft" name="sqft" type="number" min="0" step="1" value="900"></div>
              </div>
              <div class="dev-form-sec">
                <label for="ndc-precio">Price (AED)</label>
                <input id="ndc-precio" name="precio_aed" type="number" min="1" step="1000" required placeholder="1500000">
                <p class="note">The price the buyer sees, in dirhams. It is stored in fils, so nothing is lost
                  to rounding when the fee is written on the sale.</p>
              </div>
              <div class="dev-form-pie">
                <button class="btn green" type="submit">${ico('casa', 15)} Add the unit</button>
              </div>
            </form>
            <div id="respuesta-unidad" class="msg" hidden></div>
          </section>
        </div>`;
    }
  } else {
    cuerpo = `
      <div class="dev-dos">

        ${tarjeta({
    titulo: 'Network GDV by month', icono: 'pulso', id: 'n-gdv',
    nota: 'Everything written in the network, every developer together.',
  })}
        ${tarjeta({
    titulo: 'Fee by channel', icono: 'moneda', id: 'n-canal',
    nota: 'What each channel generated in fees, in dirhams.',
  })}
      </div>
      <div class="dev-dos">
        ${tarjeta({
    titulo: 'Where the fee goes', icono: 'grupo', id: 'n-reparto',
    nota: 'The distribution ledger: what every party was paid, across the whole network.',
  })}
        <section class="mod">
          <header>${ico('moneda', 15)}<h4>NDC’s own line</h4></header>
          <dl class="kv">
            <dt>Deals attributed</dt><dd>${propia.deals ?? 0}</dd>
            <dt>GDV</dt><dd>${aed(propia.gdv_fils)}</dd>
            <dt>NDC commission</dt><dd>${aed(propia.comision_fils)}</dd>
            <dt>Share of the fee</dt><dd>${pct(propia.parte_del_fee_pb)}</dd>
          </dl>
          <p class="note">${Number(propia.deals ?? 0) === 0
    ? 'No deal is attributed to NDC’s own seats yet: the envelope is in place and every agency code still has to bring its first sale.'
    : 'The envelope is NDC’s line: 4.00 % of the price on the deals its own seats brought.'}</p>
        </section>
      </div>
      <section class="mod">
        <header>${ico('edificio', 15)}<h4>The network at a glance</h4></header>
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>Developer</th><th class="num">Units</th><th class="num">Deals</th>
              <th class="num">GDV</th><th class="num">Agencies</th><th class="num">Brokers</th></tr></thead>
            <tbody>
              ${red.slice(0, 8).map((x) => `
                <tr><td><b>${esc(x.nombre)}</b><small>${x.kyc_estado === 'approved' ? 'KYB approved' : 'KYB pending'}</small></td>
                  <td class="num">${x.unidades}</td><td class="num">${x.deals}</td>
                  <td class="num">${aed(x.gdv_fils)}</td><td class="num">${x.agencias}</td>
                  <td class="num">${x.brokers}</td></tr>`).join('')
    || '<tr><td colspan="6" class="muted">No developer yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  view().innerHTML = armazon({
    kicker: 'NDC · network console',
    nombre: 'NDC, principal agency',
    sub: 'the 4 % envelope · the KYC obligation · the whole network',
    grupos,
    activo: tab === 'network' ? '#/ndc' : `#/ndc?t=${tab}`,
    titulo: {
      network: 'The network',
      developers: 'Developers',
      agencies: 'Agencies',
      creators: 'Creators',
      leads: 'Leads',
      wallet: 'Wallet',
      projects: 'Projects',
      kyc: 'Compliance',
    }[tab] ?? 'The network',
    cuerpo: `
      ${kpis([
    ['Network GDV', aed(r.gdv_fils), `${r.desarrolladores ?? 0} developers`, true],
    // Most of this book predates the per-deal fee snapshot, so the rate is stated over the deals that
    // carry one instead of being diluted by the ones that never had a fee written down.
    ['Fee generated', aed(caja.fee_fils),
      (() => {
        // The API rounds the rate to whole basis points; with a book this size that rounds to zero,
        // so the rate is worked out from the money itself before it is printed.
        const pb = caja.coste_pb || (r.gdv_fils ? (caja.fee_fils / r.gdv_fils) * 10000 : 0);
        return caja.comisiones && caja.con_snapshot < caja.comisiones
          ? `${pct(pb)} of the price, on ${caja.con_snapshot} of ${caja.comisiones} deals with a fee`
          : `${pct(pb)} of the price`;
      })(), true],
    ['NDC line', aed(r.ndc_fils), `${propia.deals ?? 0} attributed deals`, true],
    ['Waiting on KYC', String(kyc.pendientes ?? 0), `${kyc.tarde ?? 0} late`],
  ])}
      ${cuerpo}
    `,
  });

  if (tab === 'network') {
    const m = lienzo('n-gdv');
    if (m) lineaDeMeses(m, doceMeses(d.serie).map((x) => [x.etiqueta, x.gdv]), { formato: formAed });
    const b = lienzo('n-canal');
    if (b) {
      barrasDeCategorias(b, canales.map((x, i) => [x.label, Number(x.fee_fils ?? 0) / 100, COLORES.serie[i % COLORES.serie.length]]),
        { formato: formAed });
    }
    const dn = lienzo('n-reparto');
    if (dn) {
      const partes = reparto.filter((x) => Number(x.fils) > 0)
        .map((x, i) => [String(x.clave).charAt(0).toUpperCase() + String(x.clave).slice(1), Number(x.fils) / 100,
          COLORES.serie[i % COLORES.serie.length]]);
      donaSegura(dn, partes, { etiqueta: 'PAID OUT', formato: formAed });
    }
  }

  if (tab === 'wallet') {
    const dc = lienzo('n-activos');
    const activos = filas(extra.wallet?.por_activo);
    if (dc && activos.length) {
      donaSegura(dc, activos.map((a, i) => [String(a.activo ?? '').toUpperCase(), Number(a.recibido_fils ?? 0) / 100,
        COLORES.serie[i % COLORES.serie.length]]), { etiqueta: 'RECEIVED', formato: formAed });
    }
  }

  // A signature is NDC's alone. The button says what it will do before it is pressed, and the desk is
  // re-read afterwards: the count of signed creators and the money behind them both move with it.
  if (tab === 'creators') {
    const decir = (texto, ok) => {
      const r = view().querySelector('#respuesta-creador');
      if (!r) return;
      r.hidden = false;
      r.className = `msg ${ok ? 'ok' : 'err'}`;
      r.textContent = texto;
    };
    view().querySelectorAll('[data-firma]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      const estado = b.dataset.firma;
      try {
        await api.ndcSignContract(b.dataset.id, { estado });
        toast(estado === 'firmado' ? 'Contract signed' : 'Signature withdrawn');
        await viewNdc({ query });
      } catch (e) { b.disabled = false; decir(e.message, false); }
    }));
  }

  if (tab === 'kyc') {
    const decir = (texto, ok) => {
      const r = view().querySelector('#respuesta-kyc');
      if (!r) return;
      r.hidden = false;
      r.className = `msg ${ok ? 'ok' : 'err'}`;
      r.textContent = texto;
    };
    view().querySelectorAll('[data-kyc]').forEach((b) => b.addEventListener('click', async () => {
      const fila = b.closest('tr');
      const motivo = (fila?.querySelector('.ndc-motivo')?.value ?? '').trim();
      if (motivo.length < 4) { decir('A decision needs a reason of at least four characters.', false); return; }
      b.disabled = true;
      try {
        const r = await api.kycDecide(b.dataset.id, { decision: b.dataset.kyc, motivo });
        toast(r && r.aplicada === false
          ? 'Rejection recorded: a second person has to confirm it'
          : 'Decision applied');
        await viewNdc({ query });
      } catch (e) { b.disabled = false; decir(e.message, false); }
    }));
    view().querySelectorAll('[data-kyc-confirmar]').forEach((b) => b.addEventListener('click', async () => {
      const fila = b.closest('tr');
      const motivo = (fila?.querySelector('.ndc-motivo')?.value ?? '').trim();
      b.disabled = true;
      try {
        await api.kycConfirm(b.dataset.kycConfirmar, motivo ? { motivo } : {});
        toast('Rejection confirmed');
        await viewNdc({ query });
      } catch (e) { b.disabled = false; decir(e.message, false); }
    }));
  }

  if (tab === 'projects') {
    const decir = (sel, texto, ok) => {
      const r = view().querySelector(sel);
      if (!r) return;
      r.hidden = false;
      r.className = `msg ${ok ? 'ok' : 'err'}`;
      r.textContent = texto;
    };
    const fp = view().querySelector('#ndc-proyecto');
    fp?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const dev = fp.desarrollador_id.value;
      if (!dev) { decir('#respuesta-proyecto', 'Pick the developer the project is for.', false); return; }
      const cuerpo = {
        desarrollador_id: dev,
        nombre: fp.nombre.value.trim(),
        ciudad: fp.ciudad.value.trim(),
        emirato: fp.emirato.value,
      };
      const comunidad = fp.comunidad.value.trim();
      if (comunidad) cuerpo.comunidad = comunidad;
      try {
        await api.ndcProjectAdd(cuerpo);
        toast('Project opened');
        await viewNdc({ query });
      } catch (e) { decir('#respuesta-proyecto', e.message, false); }
    });

    // The row's button only points the form at that project: nothing is created until the form is sent.
    view().querySelectorAll('[data-unidad]').forEach((b) => b.addEventListener('click', () => {
      const f = view().querySelector('#ndc-unidad');
      if (!f) return;
      f.proyecto_id.value = b.dataset.unidad;
      f.scrollIntoView({ behavior: 'smooth', block: 'center' });
      f.precio_aed.focus({ preventScroll: true });
    }));

    const fu = view().querySelector('#ndc-unidad');
    fu?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const proyecto = filas(extra.projects?.proyectos).find((x) => x.proyecto_id === fu.proyecto_id.value) ?? {};
      if (!fu.proyecto_id.value) { decir('#respuesta-unidad', 'There is no project to add the unit to.', false); return; }
      const precio = Number(fu.precio_aed.value);
      if (!Number.isFinite(precio) || precio <= 0) { decir('#respuesta-unidad', 'A unit needs a price in dirhams.', false); return; }
      try {
        await api.ndcUnitAdd(fu.proyecto_id.value, {
          tipo: fu.tipo.value,
          estado_obra: fu.estado_obra.value,
          // The unit sits in the project's own emirate: the form never invents a location.
          emirato: proyecto.emirato ?? 'Dubai',
          precio_fils: Math.round(precio * 100),
          // The API names the shape of a unit in its own words: rooms and interior in sqft.
          habitaciones: Number(fu.dormitorios.value) || 0,
          superficie_sqft: Number(fu.sqft.value) || 0,
        });
        toast('Unit added');
        await viewNdc({ query });
      } catch (e) { decir('#respuesta-unidad', e.message, false); }
    });
  }
}

/* ------------------------------------------------------------------- the link */

/**
 * The landing of an invitation. Public on purpose: whoever receives the link has no account yet, and the
 * link itself is the permission. It says what it is, for whom, and until when, before asking for anything.
 */
export async function viewInvitacion({ params }) {
  const token = params?.token;
  let v;
  try {
    v = await api.inviteView(token);
  } catch (e) {
    view().innerHTML = `<div class="lab"><span>BlockEstate · invitation</span><span class="dash"></span></div>
      <div class="wrap"><section class="mod">
        <header>${ico('permiso', 15)}<h4>That link does not open anything</h4></header>
        <p>${esc(e.message)}</p>
        <div class="dev-form-pie"><a class="btn green" href="#/">Back to the marketplace</a></div>
      </section></div>`;
    return;
  }

  const tipo = v.tipo === 'developer' ? 'developer' : v.tipo === 'agency' ? 'agency' : 'broker';
  const quien = v.emisor ?? 'BlockEstate';
  const cerrado = v.estado === 'expired' ? `It expired on ${date(v.expira_en)}.`
    : v.estado === 'revoked' ? 'It was revoked by whoever sent it.'
      : v.estado === 'used' || v.usos >= v.usos_max ? 'It has already been used.' : '';

  const form = !v.valido ? `
    <section class="mod">
      <header>${ico('permiso', 15)}<h4>This link is closed</h4></header>
      <p>${esc(cerrado)} Ask ${esc(quien)} for another one.</p>
    </section>` : `
    <section class="mod">
      <header>${ico('pluma', 15)}<h4>Open the ${esc(tipo)} desk</h4></header>
      <form class="dev-form" id="aceptar">
        <div class="dev-form-2">
          <div><label for="i-nombre">Your name</label><input id="i-nombre" name="nombre" required maxlength="120"></div>
          <div><label for="i-email">Email</label><input id="i-email" name="email" type="email" required
            value="${esc(v.email ?? '')}"></div>
        </div>
        <div class="dev-form-2">
          <div><label for="i-clave">A password</label><input id="i-clave" name="contrasena" type="password"
            required minlength="8" autocomplete="new-password"><small class="muted">Eight characters or more.</small></div>
          <div><label for="i-tel">Telephone</label><input id="i-tel" name="telefono" maxlength="40" placeholder="+971 …"></div>
        </div>
        ${tipo === 'broker' ? `
          <div class="dev-form-2">
            <div><label for="i-rera">Your RERA card</label><input id="i-rera" name="rera_numero" maxlength="60"
              placeholder="the number on your card"></div>
          </div>` : ''}
        ${tipo === 'agency' ? `
          <div class="dev-form-2">
            <div><label for="i-empresa">Agency name</label><input id="i-empresa" name="empresa" maxlength="160"
              value="${esc(v.nombre ?? '')}"></div>
            <div><label for="i-rera">RERA number</label><input id="i-rera" name="rera_numero" maxlength="60"></div>
          </div>` : ''}
        ${tipo === 'developer' ? `
          <div class="dev-form-2">
            <div><label for="i-empresa">Company</label><input id="i-empresa" name="empresa" maxlength="160"></div>
            <div><label for="i-lic">Commercial licence</label><input id="i-lic" name="licencia_comercial" maxlength="80"></div>
          </div>
          <div class="dev-form-2">
            <div><label for="i-reg">Registration number</label><input id="i-reg" name="n_registro" maxlength="80"></div>
            <div><label for="i-rep">Legal representative</label><input id="i-rep" name="representante" maxlength="120"></div>
          </div>` : ''}
        <p class="note">${tipo === 'agency'
    ? 'Your RERA number is checked before the seat is activated. Until then you sell on probation.'
    : tipo === 'broker'
      ? 'You join under the licence of the agency that sent the link, and the platform issues your code.'
      : 'The KYB case opens when you sign and NDC decides it by hand. Nothing goes live before that.'}</p>
        <div class="dev-form-pie"><button class="btn green" type="submit">Open the desk</button></div>
      </form>
      <div id="respuesta-alta" class="msg" hidden></div>
    </section>`;

  view().innerHTML = `
    <div class="lab"><span>BlockEstate · invitation</span><span class="dash"></span></div>
    <div class="wrap">
      <div class="desk-head">
        <div class="desk-quien">
          <span class="dev-nav-lab">${esc(tipo)} desk</span>
          <h1>${esc(v.nombre ?? 'An invitation')}</h1>
          <p class="muted">Sent by ${esc(quien)} · ${v.valido ? `valid until ${esc(date(v.expira_en))}` : 'not open'}</p>
        </div>
        <div class="desk-nota">A link is the permission: it opens one desk, for the party that issued it, and it
          stops working once it has been used.</div>
      </div>
      ${form}
    </div>`;

  const alta = view().querySelector('#aceptar');
  if (!alta) return;
  const resp = view().querySelector('#respuesta-alta');
  alta.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const datos = Object.fromEntries(new FormData(alta).entries());
    for (const k of Object.keys(datos)) if (!datos[k]) delete datos[k];
    try {
      const x = await api.inviteAccept(token, datos);
      store.save({ sesion: x.sesion, usuario: { nombre: x.nombre, email: x.email }, rol: x.rol, permisos: [] });
      await store.refresh();
      toast('Your desk is open');
      go(x.rol === 'agencia' ? '#/agency' : x.rol === 'broker' ? '#/broker' : '#/dev');
    } catch (e) {
      resp.hidden = false;
      resp.className = 'msg err';
      resp.textContent = e.message;
    }
  });
}

/**
 * The developer's portal.
 *
 * The organisation's own place of work: what it has, what it publishes, what has been verified, what
 * it has sold, what it collects and who sells for it. It is the same product as the buyer's side, so
 * it is the same interface, the same marks, the same figures in tabular type, the same doors.
 *
 * The menu carries the work and not only the reading: putting a property up (unit → listing → media
 * → review), the verification of each asset, the agency, the brokers it designates, and the money.
 * Every desk shows what the platform can do today, and says so plainly when something is not built:
 * no screen here pretends to be a feature.
 *
 * Three boundaries are visible in what this portal shows, and they are deliberate:
 *  · **the organisation sees its own book**, never another's (the API scopes it and answers 404);
 *  · **it sees its share of the money**, never the buyer's or anybody else's split;
 *  · **nothing of the buyer's identity check** appears here: that belongs to the buyer and to NDC.
 *
 * The figures come from the API; this file only decides where each one goes.
 */
import { api } from '../api.js';
import { store } from '../store.js';
import { ACTIVOS_CAMBIO, equivalencia, filsDe, fijarTasa, tasa, tasaTexto } from '../cambio.js';
import { AMENIDADES } from '../config.js';
import { date, empty, esc, ico, loading, money, selloVerysset, tipoLabel } from '../ui.js';
import { COLORES, barrasDeCategorias, donaDeEstados, lineaDeMeses } from './graficas.js';

const view = () => document.getElementById('view');

/** The states of a listing, in the words the developer uses. */
const ANUNCIO = {
  draft: 'Draft', submitted: 'Submitted', in_review: 'Under review', approved: 'Published',
  suspended: 'Suspended', returned: 'Returned', rejected: 'Rejected', archived: 'Archived',
};
const DISPONIBILIDAD = { available: 'Available', held: 'On hold', sold: 'Sold' };
const VENTA = {
  draft: 'Draft', held: 'Reserved', kyc_pending: 'Identity check', kyc_approved: 'Identity checked',
  quote_issued: 'Quote issued', deposit_pending: 'Signal pending', deposit_detected: 'Signal detected',
  deposit_confirmed: 'Signal confirmed', payment_pending: 'Balance pending', detected: 'Balance detected',
  confirmed: 'Balance confirmed', compliance_hold: 'Compliance hold', manual_review: 'Manual review',
  aed_settlement_pending: 'Settlement in dirhams', settled: 'Settled',
  business_completion_approved: 'Completion signed', expired: 'Expired', cancelled: 'Cancelled',
  failed: 'Failed', refund_pending: 'Refund pending', refunded: 'Refunded',
};
/** The channels a referral code can open, in the words of the model. */
const CANAL = { broker: 'Broker', influencer: 'Creator', desarrollador: 'Own sales', directo: 'Direct' };
/** The state of the build of a unit, as the catalogue names it. */
const OBRA = { ready: 'Ready', off_plan: 'Off plan' };

/**
 * How the collection of a sale is named on screen. The value that comes from the API is translated
 * here and is never printed raw: a word in another language in the middle of an English screen is a
 * slip, and an untranslated value has to be seen, not quietly hidden behind a guess.
 */
const COBRO = {
  pending: 'Pending the bank', pendiente: 'Pending the bank', en_curso: 'In progress',
  settled: 'Settled', failed: 'Failed', refunded: 'Returned', on_hold: 'On hold',
};

/** Traduce un valor por su tabla; lo que no esté en la tabla, se enseña en palabras. */
function enIngles(valor, tabla, siNada) {
  if (valor === null || valor === undefined || valor === '') return siNada;
  const puesto = tabla[valor];
  if (puesto) return puesto;
  return String(valor).replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

/**
 * The sections of putting a property up. Each one is a panel of the same form, and the menu above
 * them is the door: a big form read from top to bottom is a wall, and a wall is what makes a seller
 * leave half the information out.
 */
const SECCIONES_ALTA = [
  ['unidad', 'The unit', 'casa'],
  ['listing', 'The listing', 'etiqueta'],
  ['fotos', 'Photographs', 'foto'],
  ['video', 'Video', 'video'],
  ['tour', '3D tour', 'pano'],
  ['planos', 'Plans', 'plano'],
  ['extras', 'Amenities', 'sofa'],
  ['mapa', 'Location', 'pin'],
  ['papeles', 'The papers · Verysset', 'permiso'],
  ['revision', 'Review', 'avance'],
];

/** The steps a sale walks, for the trail of the detail screen. */
const PASOS = ['held', 'kyc_pending', 'kyc_approved', 'quote_issued', 'deposit_confirmed',
  'payment_pending', 'confirmed', 'aed_settlement_pending', 'settled', 'business_completion_approved'];

/**
 * The menu, grouped as the work is grouped: what the organisation has, what it publishes, the money,
 * the people who sell for it, and itself. Each line says what it holds.
 */
const GRUPOS = [
  ['Portfolio', [
    ['#/dev', 'Overview', 'pulso'],
    ['#/dev/properties', 'Properties', 'casa'],
    ['#/dev/projects', 'Projects', 'edificio'],
  ]],
  ['Publishing', [
    ['#/dev/listings', 'Listings', 'etiqueta'],
    ['#/dev/verification', 'Verification', 'permiso'],
  ]],
  ['Money', [
    ['#/dev/sales', 'Sales', 'trato'],
    ['#/dev/collections', 'Collections', 'banco'],
  ]],
  ['Who sells for you', [
    ['#/dev/brokers', 'Brokers', 'grupo'],
    ['#/dev/agency', 'The agency', 'llave'],
  ]],
  ['The organisation', [
    ['#/dev/org', 'Profile and approval', 'sello'],
  ]],
];

/** A figure of a first look: the number in bold, the word underneath. Same shape as the unit sheet. */
const destacado = (valor, etiqueta, chico = false) => `
  <div class="dest"><b${chico ? ' class="chico"' : ''}>${esc(valor)}</b>
    <span class="dest-lab">${esc(etiqueta)}</span></div>`;

const dato = (k, v, mono = false) => (v === null || v === undefined || v === '')
  ? '' : `<dt>${esc(k)}</dt><dd${mono ? ' class="dev-mono"' : ''}>${esc(v)}</dd>`;

const etiqueta = (texto, tono = '') => `<span class="tag${tono ? ` ${tono}` : ''}">${esc(texto)}</span>`;

/** The tag of a state: green when it is finished or published, coin when a person must look at it. */
const tagEstado = (estado, tabla, verde = [], moneda = []) => etiqueta(
  tabla[estado] ?? estado,
  verde.includes(estado) ? 'green' : (moneda.includes(estado) ? 'coin' : ''),
);

/** AED with two decimals, out of the fils the platform stores. */

/* ---------------------------------------------------------------- los datos, una vez */

let DATOS = null;

/**
 * Everything the portal shows, fetched once per visit. Walking between the desks of the menu does not
 * ask the API again: the book is the same in all of them, and re-asking would only make the desks
 * feel slow.
 */
async function cargar() {
  if (DATOS) return DATOS;
  const [yo, unidades, ventas, proyectos, avisos, codigos] = await Promise.all([
    api.devMe(), api.devUnits(), api.devSales(), api.devProjects(),
    // The `dev` flag only tells the offline capture of the preview apart from the buyer's inbox:
    // the live API ignores a parameter it does not know.
    api.notifications({ limite: 20, dev: 1 }).catch(() => ({ notificaciones: [] })),
    // The codes of the brokers and creators. Reading them is not on the developer's role in this
    // release: the answer is kept apart from an empty list, because «you may not» and «there are
    // none» are two different things and a desk that confuses them lies.
    api.devReferrals()
      .then((r) => ({ ...r, permitido: true }))
      .catch((e) => ({ codigos: [], permitido: false, motivo: e?.message ?? '' })),
  ]);
  DATOS = { yo, unidades, ventas, proyectos, avisos, codigos };
  return DATOS;
}

/** The count of each desk, for the menu. */
function cuentas(d) {
  const u = d.unidades.unidades ?? [];
  const v = d.ventas.ventas ?? [];
  return {
    '#/dev/properties': u.length,
    '#/dev/projects': (d.proyectos.proyectos ?? []).length,
    '#/dev/listings': u.filter((x) => x.anuncio).length,
    '#/dev/verification': u.filter((x) => x.anuncio?.badge_alcance).length,
    '#/dev/sales': v.length,
    // Only when the desk could read them: a zero for «you may not see them» would read as «none».
    '#/dev/brokers': d.codigos.permitido === false ? undefined : (d.codigos.codigos ?? []).length,
  };
}

/** El título de una pantalla sale del mismo listado que arma el menú, para que no haya dos verdades. */
function tituloDe(activo) {
  for (const [, lineas] of GRUPOS) {
    const hallada = lineas.find(([href]) => href === activo);
    if (hallada) return hallada[1];
  }
  if (activo === '#/dev/properties/nueva') return 'Put a property up';
  return 'Developer portal';
}

/**
 * The shell: a bar with the organisation and the action that matters, the menu on the left with its
 * groups, and the desk of the day on the right. Every screen has a title, and the title comes from
 * the same list as the menu.
 */
function cascaron(d, activo, cuerpo, acciones = '', titulo = '') {
  const { yo } = d;
  const cuenta = cuentas(d);
  const aprobada = yo.estado === 'approved' && yo.activo;
  return `
    <div class="lab"><span>Developer portal</span><span class="dash"></span></div>
    <div class="dev-bar">
      <div class="dev-bar-org">
        <span class="dev-marca">${ico('edificio', 16)}</span>
        <span class="dev-bar-txt">
          <b>${esc(yo.nombre)}</b>
          <small>${etiqueta(yo.estado === 'approved' ? 'Approved' : yo.estado, aprobada ? 'green' : '')}
            ${yo.licencia_comercial ? `<i>${esc(yo.licencia_comercial)}</i>` : ''}</small>
        </span>
      </div>
      <div class="dev-bar-acciones">${acciones}</div>
    </div>

    <div class="dev-shell">
      <nav class="dev-nav" aria-label="Portal">
        ${GRUPOS.map(([titulo, lineas]) => `
          <div class="dev-nav-grupo">
            <span class="dev-nav-lab">${esc(titulo)}</span>
            ${lineas.map(([href, texto, icono]) => `
              <a href="${href}" class="${href === activo ? 'on' : ''}"${href === activo
                ? ' aria-current="page"' : ''}>${ico(icono, 15)}<span>${esc(texto)}</span>${
                cuenta[href] !== undefined ? `<i class="n">${cuenta[href]}</i>` : ''}</a>`).join('')}
          </div>`).join('')}
        <div class="dev-nav-grupo">
          <a href="#/search">${ico('mapa', 15)}<span>Marketplace</span></a>
        </div>
      </nav>
      <div class="dev-main">
        <h1 class="dev-titulo">${esc(titulo || tituloDe(activo))}</h1>
        ${cuerpo}
      </div>
    </div>`;
}

/** The two notes that must never be missing: the gate, and whose book this is in a preview. */
function avisosDeCabecera(yo) {
  const puerta = (yo.estado !== 'approved' || !yo.activo) ? `
    <div class="msg err">This organisation is <b>${esc(yo.estado)}</b>${
      yo.activo ? '' : ' and switched off'}. Nothing can be published until NDC's review approves
      it: the decision is made by hand, and it is not taken here.${
      yo.motivo_revision ? ` Reason given: ${esc(yo.motivo_revision)}.` : ''}</div>` : '';
  const notaDemo = (store.rol() ?? '').startsWith('developer') ? '' : `
    <div class="note">Preview: this is the book of a sandbox organisation,
      captured from the platform. The desks that write, putting a property up, submitting a listing,
      designating a broker, need the live platform and say so when you try them.</div>`;
  return puerta + notaDemo;
}

/** Every desk opens the same way: the data once, the gate if there is no account, the shell. */
async function conDatos(activo, cuerpo, acciones = '', titulo = '') {
  view().innerHTML = `
    <div class="lab"><span>Developer portal</span><span class="dash"></span></div>
    <div class="dev-carga">${loading(3)}</div>`;
  let d;
  try {
    d = await cargar();
  } catch (err) {
    view().innerHTML = `
      <div class="lab"><span>Developer portal</span><span class="dash"></span></div>
      ${empty('A developer account is needed',
        'This portal belongs to an organisation that has been through NDC\'s review. Sign in with a '
        + 'developer account to see its book.',
        '<p><a class="btn green" href="#/login">Sign in</a></p>')}`;
    void err;
    return null;
  }
  view().innerHTML = cascaron(d, activo, cuerpo(d), acciones, titulo);
  pintarGraficas(d);
  return d;
}

/* ---------------------------------------------------------------- herramientas y tablas */

/**
 * The toolbar of a desk: a search box, a row of chips for the state, a sort, an export and the action
 * of the desk. The same tool everywhere, so it is learnt once.
 */
function barraHerramientas({ sitio, estados = [], orden = [['nombre', 'A–Z']], accion = '', exportar = true }) {
  return `
    <div class="dev-tools">
      <label class="dev-find">${ico('lupa', 15)}
        <input type="search" data-dev="buscar" placeholder="${esc(sitio)}" aria-label="${esc(sitio)}">
      </label>
      ${estados.length ? `<div class="dev-chips" role="group" aria-label="State">
        <button class="chip-f" type="button" data-dev="estado" data-val="" aria-pressed="true">All</button>
        ${estados.map(([valor, texto]) => `<button class="chip-f" type="button" data-dev="estado"
          data-val="${esc(valor)}" aria-pressed="false">${esc(texto)}</button>`).join('')}
      </div>` : ''}
      ${orden.length ? `<label class="dev-orden">
        <select data-dev="orden" aria-label="Sort">
          ${orden.map(([valor, texto], i) => `<option value="${esc(valor)}"${i === 0 ? ' selected' : ''}>${esc(texto)}</option>`).join('')}
        </select>
      </label>` : ''}
      ${exportar ? `<button class="btn ghost" type="button" data-dev="exportar">${ico('descarga', 15)} Export CSV</button>` : ''}
      ${accion}
      <span class="dev-cuenta" data-dev="cuenta"></span>
    </div>`;
}

/**
 * Wires one desk's toolbar over a list. The filter, the sort and the export always describe exactly
 * what is on the screen.
 */
function herramientas(raiz, { datos, texto, orden = [['nombre', 'A–Z']], estado = () => '', pintar, csv }) {
  let q = '';
  let filtro = '';
  let criterio = orden[0][0];
  const visibles = () => {
    const busca = q.trim().toLowerCase();
    const filas = datos.filter((d) => {
      if (filtro && estado(d) !== filtro) return false;
      return !busca || texto(d).toLowerCase().includes(busca);
    });
    return filas.sort((a, b) => {
      const n = (x) => Number(x.precio_num ?? 0);
      if (criterio === 'precio_asc') return n(a) - n(b);
      if (criterio === 'precio_desc') return n(b) - n(a);
      if (criterio === 'estado') return String(estado(a)).localeCompare(String(estado(b)));
      return texto(a).localeCompare(texto(b));
    });
  };
  const pinta = () => {
    const filas = visibles();
    pintar(filas);
    const cuenta = raiz.querySelector('[data-dev="cuenta"]');
    if (cuenta) cuenta.textContent = `${filas.length} of ${datos.length}`;
  };
  raiz.addEventListener('input', (e) => {
    if (e.target.dataset?.dev === 'buscar') { q = e.target.value; pinta(); }
  });
  raiz.addEventListener('change', (e) => {
    if (e.target.dataset?.dev === 'orden') { criterio = e.target.value; pinta(); }
  });
  raiz.addEventListener('click', (e) => {
    const chip = e.target.closest?.('[data-dev="estado"]');
    if (chip) {
      filtro = chip.dataset.val;
      raiz.querySelectorAll('[data-dev="estado"]').forEach((o) => {
        const on = o === chip;
        o.classList.toggle('on', on);
        o.setAttribute('aria-pressed', String(on));
      });
      pinta();
      return;
    }
    if (e.target.closest?.('[data-dev="exportar"]') && csv) descargar(csv(visibles()));
  });
  pinta();
}

/** The export writes what is on the screen, in the browser: no request, no server, no surprise. */
function descargar(filas) {
  if (!filas.length) return;
  const csv = filas.map((f) => f.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `blockestate-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** A table that says what each column is, and what it holds. */
function tabla(columnas, filas) {
  return `
    <div class="dev-tabla-caja">
      <table class="dev-tabla">
        <thead><tr>${columnas.map(([texto, clase]) => `<th${clase ? ` class="${clase}"` : ''}>${esc(texto)}</th>`).join('')}<th></th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

/** The answer of a form that writes: the same two lines in every desk. */
function respuestaForm(id, ok) {
  return `
    <p class="msg err" id="${id}-error" hidden></p>
    <p class="msg ok" id="${id}-ok" hidden>${ok ?? ''}</p>`;
}

/** Puts the answer of a write into the two lines above. */
function diRespuesta(id, exito, texto) {
  const err = view().querySelector(`#${id}-error`);
  const ok = view().querySelector(`#${id}-ok`);
  if (err) err.hidden = true;
  if (ok) ok.hidden = true;
  if (exito && ok) { ok.hidden = false; ok.innerHTML = texto; }
  if (!exito && err) {
    err.hidden = false;
    err.textContent = texto?.codigo === 'solo_plataforma_viva'
      ? 'This needs the live platform: in this preview nothing is written.'
      : `It did not go through: ${texto?.message ?? texto}`;
  }
}

/* ---------------------------------------------------------------- Overview */

export async function viewDeveloper() {
  await conDatos('#/dev', (x) => `
    ${avisosDeCabecera(x.yo)}
    ${cuerpoResumen(x)}`,
  `<a class="btn green" href="#/dev/properties/nueva">${ico('casa', 15)} Put a property up</a>`);
}

/** El libro repartido por estado: publicado, en revisión, devuelto, retenido, vendido y sin anuncio. */
function estadosDelLibro(r) {
  return [
    ['Published', r.publicadas ?? 0, COLORES.publicado],
    ['In review', (r.en_revision ?? 0) + (r.enviadas ?? 0), COLORES.revision],
    ['Returned', r.devueltas ?? 0, '#b3261e'],
    ['On hold', r.reservadas ?? 0, COLORES.reservado],
    ['Sold', r.vendidas ?? 0, COLORES.vendido],
    ['Without listing', r.sin_anuncio ?? 0, COLORES.sinAnuncio],
  ];
}

/** Cuántas unidades tiene cada proyecto, que es la primera pregunta de cualquier libro. */
function porProyecto(unidades) {
  const cuenta = new Map();
  for (const u of unidades) {
    const nombre = u.proyecto?.nombre ?? u.proyecto ?? 'No project';
    cuenta.set(nombre, (cuenta.get(nombre) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, n], i) => [nombre, n, COLORES.serie[i % COLORES.serie.length]]);
}

/** El color de cada estado de anuncio. La etiqueta no se repite: sale del ANUNCIO de arriba. */
const COLOR_ANUNCIO = {
  draft: COLORES.sinAnuncio, submitted: COLORES.revision, in_review: COLORES.revision,
  approved: COLORES.publicado, returned: '#b3261e', rejected: '#b3261e',
  suspended: COLORES.vendido, archived: COLORES.vendido, sin_anuncio: COLORES.sinAnuncio,
};

function porAnuncio(unidades) {
  const cuenta = new Map();
  for (const u of unidades) {
    const k = u.anuncio?.estado ?? 'sin_anuncio';
    cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => [k === 'sin_anuncio' ? 'Without listing' : (ANUNCIO[k] ?? k), n,
      COLOR_ANUNCIO[k] ?? COLORES.sinAnuncio]);
}

/** Cuánto entró por cada canal: lo que se le debe a un bróker, a un creador o a nadie. */
function porCanal(ventas, conDinero = false) {
  const cuenta = new Map();
  for (const v of ventas) {
    const canal = v.cobro?.canal ?? 'directo';
    const cuanto = conDinero ? filsDe(v) : 1;
    cuenta.set(canal, (cuenta.get(canal) ?? 0) + cuanto);
  }
  return [...cuenta.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([canal, n], i) => [CANAL[canal] ?? canal, n, COLORES.serie[i % COLORES.serie.length]]);
}

/** La leyenda de una gráfica, sacada de los MISMOS datos que la pintan. */
function leyendaDe(partes) {
  return `<ul class="dev-leyenda">
    ${partes.filter(([, n]) => n > 0).map(([nombre, , color]) =>
      `<li><i style="background:${color}"></i>${esc(nombre)}</li>`).join('')}
  </ul>`;
}

/** Una tarjeta con su gráfica dentro. Todas las pantallas usan la misma. */
function tarjetaGrafica({ titulo, icono, id, alto = 190, nota = '', leyenda = '' }) {
  return `
    <section class="mod">
      <header>${ico(icono, 15)}<h4>${esc(titulo)}</h4></header>
      <div class="dev-grafica">
        <canvas id="${id}" height="${alto}" aria-label="${esc(titulo)}"></canvas>
        ${nota ? `<p class="dev-grafica-nota">${nota}</p>` : ''}
        ${leyenda}
      </div>
    </section>`;
}

/** Las ventas de los últimos doce meses. Un mes sin nada se dibuja en cero, no se salta. */
function serieDeMeses(ventas) {
  const hoy = new Date();
  const meses = [];
  for (let i = 11; i >= 0; i -= 1) {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({ clave: `${f.getFullYear()}-${f.getMonth()}`,
      etiqueta: f.toLocaleDateString('en-GB', { month: 'short' }), total: 0 });
  }
  const sitio = new Map(meses.map((m, i) => [m.clave, i]));
  for (const v of ventas ?? []) {
    if (!v.creada_en) continue;
    const f = new Date(v.creada_en);
    const k = `${f.getFullYear()}-${f.getMonth()}`;
    if (sitio.has(k)) meses[sitio.get(k)].total += Number(String(v.precio_aed ?? '').replace(/[^0-9.]/g, '')) || 0;
  }
  return meses;
}

/**
 * Pinta TODAS las gráficas de la pantalla que se acaba de armar, cada una con los datos que ya están
 * cargados. Un solo sitio, para que añadir una gráfica a una pantalla sea pedirla en el marcado y
 * declararla aquí, y no enganchar un manejador distinto en cada vista.
 */
function pintarGraficas(d) {
  const corto = (n) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M`
    : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  const num = (v) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0;
  const unidades = d.unidades?.unidades ?? [];
  const r = d.unidades?.resumen ?? {};
  const ventas = d.ventas?.ventas ?? [];
  const res = d.ventas?.resumen ?? {};

  const recetas = {
    'dev-grafica-ventas': (c) => lineaDeMeses(c, serieDeMeses(ventas).map((m) => [m.etiqueta, m.total]),
      { formato: corto }),
    'dev-grafica-libro': (c) => donaDeEstados(c, estadosDelLibro(r)),
    'dev-grafica-unidades': (c) => donaDeEstados(c, estadosDelLibro(r)),
    'dev-grafica-proyectos': (c) => barrasDeCategorias(c, porProyecto(unidades), { formato: (n) => String(n) }),
    'dev-grafica-anuncios': (c) => donaDeEstados(c, porAnuncio(unidades)),
    'dev-grafica-verificacion': (c) => donaDeEstados(c, [
      ['With evidence', unidades.filter((u) => u.anuncio?.badge_alcance).length, COLORES.publicado],
      ['Without evidence', unidades.filter((u) => !u.anuncio?.badge_alcance).length, COLORES.sinAnuncio],
    ]),
    // La dona del dinero no lleva unidades: lleva dirhams, y lo dice en el centro.
    'dev-grafica-cobros': (c) => donaDeEstados(c, [
      ['In your account', num(res.cobrado_aed), COLORES.publicado],
      ['Awaiting the bank', Math.max(0, num(res.importe_aed) - num(res.cobrado_aed)), COLORES.revision],
    ], { etiqueta: 'DIRHAMS', formato: (n) => `AED ${corto(n)}` }),
    'dev-grafica-bancos': (c) => barrasDeCategorias(c, porBanco(ventas), { formato: (n) => money(n) }),
    'dev-grafica-canales': (c) => barrasDeCategorias(c, porCanal(ventas, true), { formato: (n) => money(n) }),
  };

  Object.entries(recetas).forEach(([id, pinta]) => {
    const lienzo = view().querySelector(`#${id}`);
    if (lienzo) pinta(lienzo);
  });
}

/** Lo que ha entrado por cada banco, que es la pregunta de la pantalla de cobros. */
function porBanco(ventas) {
  const cuenta = new Map();
  for (const v of ventas) {
    if (!v.cobro?.aed_liquidado) continue;
    const banco = v.cobro?.banco ?? 'Bank not stated';
    cuenta.set(banco, (cuenta.get(banco) ?? 0) + Number(v.cobro.aed_liquidado_fils ?? 0));
  }
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1])
    .map(([banco, n], i) => [banco, n, COLORES.serie[i % COLORES.serie.length]]);
}

function cuerpoResumen({ unidades, ventas, proyectos, avisos }) {
  const r = unidades.resumen ?? {};
  const resumen = ventas.resumen ?? {};
  const suyas = unidades.unidades ?? [];
  const max = Math.max(1, ...(proyectos.proyectos ?? []).map(
    (p) => suyas.filter((u) => u.proyecto.id === p.id).length));

  const barras = (proyectos.proyectos ?? []).map((p) => {
    const dentro = suyas.filter((u) => u.proyecto.id === p.id);
    const publicadas = dentro.filter((u) => u.anuncio?.estado === 'approved').length;
    const valor = dentro.reduce((s, u) => s + filsDe(u), 0);
    return `
      <a class="dev-barra" href="#/dev/projects">
        <b>${esc(p.nombre)}</b><i class="n">${dentro.length}</i>
        <span class="pista"><span class="relleno" style="width:${Math.round((dentro.length / max) * 100)}%"></span></span>
        <small>${esc(p.ciudad ?? '')} · ${publicadas} published · ${esc(money(valor))}</small>
      </a>`;
  }).join('');

  const ultimas = (ventas.ventas ?? []).slice(0, 5);
  const filas = ultimas.length ? ultimas.map((v) => `
    <tr data-ir="#/dev/sale/${esc(v.intencion_id)}">
      <td><b>${esc(tipoLabel(v.unidad?.tipo))}</b>
        <small>${esc(v.proyecto ?? '')}${v.creada_en ? ` · reserved ${esc(date(v.creada_en))}` : ''}</small></td>
      <td>${tagEstado(v.estado, VENTA, ['business_completion_approved'], ['manual_review', 'compliance_hold'])}</td>
      <td class="num">${esc(v.precio_aed)}</td>
      <td class="abrir">${ico('derecha', 15)}</td>
    </tr>`).join('') : '<tr><td colspan="4" class="note">No sale yet. A reserved unit appears here the moment it is held.</td></tr>';

  return `
    <section class="mod destacados">
      ${destacado(r.unidades ?? 0, 'Units')}
      ${destacado(r.publicadas ?? 0, 'Published')}
      ${destacado((r.en_revision ?? 0) + (r.enviadas ?? 0), 'In review')}
      ${destacado(r.sin_anuncio ?? 0, 'Without listing')}
      ${destacado(r.reservadas ?? 0, 'On hold')}
      ${destacado(r.vendidas ?? 0, 'Sold')}
      ${destacado(r.inventario_aed ?? money(0), 'Book value', true)}
      ${destacado(r.publicado_aed ?? money(0), 'Published value', true)}
    </section>

    <div class="dev-dos">
      ${tarjetaGrafica({ titulo: 'Sales, last twelve months', icono: 'avance', id: 'dev-grafica-ventas',
        nota: 'Contract prices of what was reserved each month, in dirhams. A month with nothing stays'
          + ' on the line at zero, it is not skipped.' })}
      ${tarjetaGrafica({ titulo: 'The book, by state', icono: 'casa', id: 'dev-grafica-libro',
        leyenda: leyendaDe(estadosDelLibro(r)) })}
    </div>

    <div class="dev-dos dev-dos-c">
      <section class="mod">
        <header>${ico('trato', 15)}<h4>Sales</h4>
          <a href="#/dev/sales">See all →</a></header>
        <p class="note">Your share appears once the dirhams have reached your account:
          <b>${esc(resumen.cobrado_aed ?? money(0))}</b> collected of
          <b>${esc(resumen.importe_aed ?? money(0))}</b> sold.</p>
        ${tabla([['Unit', ''], ['State', ''], ['Contract price', 'num']], filas)}
      </section>
    </div>

    <div class="dev-dos">
      <section class="mod">
        <header>${ico('edificio', 15)}<h4>Where the book is</h4></header>
        <p class="dev-barras-nota">Units per project, measured against the biggest one.</p>
        <div class="dev-barras">${barras || '<p class="note">No project yet.</p>'}</div>
      </section>

      ${(avisos.notificaciones ?? []).length ? `
        <section class="mod">
          <header>${ico('campana', 15)}<h4>Notices</h4></header>
          <div class="list">
            ${(avisos.notificaciones ?? []).slice(0, 4).map((n) => `
              <div class="item">
                <b>${esc(n.titulo)}</b>
                <span class="muted">${esc(n.cuerpo)}</span>
                ${n.creada_en ? `<span class="when">${esc(date(n.creada_en))}</span>` : ''}
              </div>`).join('')}
          </div>
        </section>` : ''}
    </div>`;
}

/* ---------------------------------------------------------------- Properties */

/**
 * Dónde está la unidad: ponerla o corregirla.
 *
 * La regla es que sin ubicación el anuncio no llega a revisión, así que tiene que haber una puerta
 * para ponerla desde el portal — y para arreglar un número mal tecleado. La unidad es la del
 * desarrollador; la API lo comprueba igual.
 */
async function ubicarUnidad(unidadId, boton) {
  const previo = (DATOS?.unidades?.unidades ?? []).find((u) => u.unidad_id === unidadId) ?? {};
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `
    <h3>Where is this unit?</h3>
    <p class="note">Two numbers put it on the buyer's map. Without them the listing cannot be sent to
      review: an offer that is on the list and missing from the map is a hole nobody sees.</p>
    <div class="dev-form-2">
      <label>Latitude <input id="ubi-la" inputmode="decimal" placeholder="25.197197" value="${esc(previo.latitud ?? '')}"></label>
      <label>Longitude <input id="ubi-lo" inputmode="decimal" placeholder="55.274376" value="${esc(previo.longitud ?? '')}"></label>
    </div>
    <p class="note" id="ubi-enlace"></p>
    <div class="row">
      <button class="btn green" type="button" id="ubi-guardar">Save the location</button>
      <button class="btn ghost" type="button" id="ubi-cancelar">Cancel</button>
    </div>
    <p class="note" id="ubi-msg"></p>`;
  document.body.append(dlg);
  dlg.showModal();

  const enlace = dlg.querySelector('#ubi-enlace');
  const pinta = () => {
    const la = dlg.querySelector('#ubi-la').value.trim();
    const lo = dlg.querySelector('#ubi-lo').value.trim();
    enlace.innerHTML = la && lo
      ? `<a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(la)}&mlon=${encodeURIComponent(lo)}#map=17/${encodeURIComponent(la)}/${encodeURIComponent(lo)}">Check the pin on OpenStreetMap</a>`
      : '';
  };
  dlg.querySelector('#ubi-la').addEventListener('input', pinta);
  dlg.querySelector('#ubi-lo').addEventListener('input', pinta);
  pinta();

  dlg.querySelector('#ubi-cancelar').onclick = () => { dlg.remove(); };
  dlg.querySelector('#ubi-guardar').onclick = async () => {
    const msg = dlg.querySelector('#ubi-msg');
    const latitud = Number(dlg.querySelector('#ubi-la').value);
    const longitud = Number(dlg.querySelector('#ubi-lo').value);
    msg.textContent = 'Saving…';
    try {
      await api.devSetLocation(unidadId, { latitud, longitud });
      dlg.remove();
      DATOS = null;
      await viewDevProperties();
    } catch (e) {
      msg.textContent = e.message ?? 'It did not go through';
    }
  };
}

export async function viewDevProperties() {
  await conDatos('#/dev/properties', (x) => `
    ${avisosDeCabecera(x.yo)}
    <div class="dev-dos">
      ${tarjetaGrafica({ titulo: 'The book, by state', icono: 'pulso', id: 'dev-grafica-unidades',
        leyenda: leyendaDe(estadosDelLibro(x.unidades.resumen ?? {})) })}
      ${tarjetaGrafica({ titulo: 'Units per project', icono: 'edificio', id: 'dev-grafica-proyectos',
        nota: 'How many units each project has, against the biggest one.' })}
    </div>
    <section class="mod">
      <header>${ico('casa', 15)}<h4>Properties</h4>
        <span class="muted">${esc(x.unidades.resumen?.inventario_aed ?? '')}</span></header>
      <p class="note">Every unit of the organisation: what it is, where it is, and where its listing
        stands. Open one to see it exactly as the buyer sees it.</p>
      ${barraHerramientas({ sitio: 'Unit or project',
        orden: [['nombre', 'Unit A–Z'], ['precio_desc', 'Price ↓'], ['precio_asc', 'Price ↑']] })}
      <div id="dev-filas-caja"></div>
    </section>`,
  `<a class="btn green" href="#/dev/properties/nueva">${ico('casa', 15)} Put a property up</a>`);

  const suyas = (DATOS.unidades.unidades ?? []).map((u) => ({
    ...u, precio_num: Number(String(u.precio_aed ?? '').replace(/[^0-9.]/g, '')) || 0,
  }));
  const caja = view().querySelector('#dev-filas-caja');
  herramientas(view().querySelector('.dev-main'), {
    datos: suyas,
    texto: (u) => `${tipoLabel(u.tipo)} ${u.proyecto?.nombre ?? ''} ${u.comunidad ?? ''} ${u.anuncio?.referencia ?? ''}`,
    pintar: (filas) => {
      caja.innerHTML = tabla(
        [['Unit', ''], ['Project', ''], ['Map', ''], ['Availability', ''], ['Listing', ''], ['Price', 'num']],
        filas.length ? filas.map((u) => `
          <tr data-ir="#/unit/${esc(u.unidad_id)}">
            <td><b>${esc(tipoLabel(u.tipo))}${u.habitaciones ? ` · ${u.habitaciones} bed` : ''}</b>
              <small>${[
                u.superficie_sqft ? `${u.superficie_sqft.toLocaleString('en-GB')} sqft` : null,
                u.comunidad,
                u.estado_obra ? (OBRA[u.estado_obra] ?? u.estado_obra) : null,
                u.entrega_prevista ? `handover ${u.entrega_prevista}` : null,
              ].filter(Boolean).map(esc).join(' · ')}</small></td>
            <td>${esc(u.proyecto?.nombre ?? '')}</td>
            <td>${u.latitud && u.longitud
              ? etiqueta('On the map', 'green')
              : `<button class="btn ghost sm" type="button" data-ubicar="${esc(u.unidad_id)}">Set the location</button>`}</td>
            <td>${etiqueta(DISPONIBILIDAD[u.disponibilidad] ?? u.disponibilidad, u.disponibilidad === 'available' ? 'green' : '')}</td>
            <td>${u.anuncio ? tagEstado(u.anuncio.estado, ANUNCIO, ['approved'], ['returned', 'rejected', 'suspended']) : etiqueta('No listing')}</td>
            <td class="num">${esc(u.precio_aed)}</td>
            <td class="abrir">${ico('derecha', 15)}</td>
          </tr>`).join('') : '<tr><td colspan="7" class="note">Nothing matches those tools.</td></tr>');
    },
    csv: (filas) => [
      ['unit', 'project', 'community', 'price', 'availability', 'listing', 'reference'],
      ...filas.map((u) => [tipoLabel(u.tipo), u.proyecto?.nombre ?? '', u.comunidad ?? '', u.precio_aed ?? '',
        DISPONIBILIDAD[u.disponibilidad] ?? u.disponibilidad ?? '',
        u.anuncio ? (ANUNCIO[u.anuncio.estado] ?? u.anuncio.estado) : 'No listing', u.anuncio?.referencia ?? '']),
    ],
  });

  // Después de pintar, no antes: el constructor devuelve texto y en ese momento el DOM todavía no
  // existe. Enganchar dentro del constructor dejaba un botón que no hacía nada al pulsarlo.
  for (const b of document.querySelectorAll('[data-ubicar]')) {
    b.addEventListener('click', (ev) => { ev.stopPropagation(); ubicarUnidad(b.dataset.ubicar, b); });
  }
}

/**
 * Putting a property up. The platform walks it in four steps, and each one is a call of its own: the
 * unit, then the listing over it, then the media, then the submission to NDC's review. Nothing is
 * published by this screen: the review is a human decision.
 */
export async function viewDevNuevaPropiedad() {
  await conDatos('#/dev/properties', (x) => `
    ${avisosDeCabecera(x.yo)}
    <section class="mod">
      <header>${ico('casa', 15)}<h4>Put a property up</h4>
        <a href="#/dev/properties">← Properties</a></header>
      <nav class="dev-sec" id="dev-sec" aria-label="Sections of the property">
        ${SECCIONES_ALTA.map(([clave, texto, icono], i) => `
          <button type="button" class="${i === 0 ? 'on' : ''}" data-sec="${clave}"
            aria-pressed="${i === 0}">${ico(icono, 14)}<span>${esc(texto)}</span></button>`).join('')}
      </nav>

      <form class="dev-form dev-form-sec" id="dev-nueva">
        <fieldset data-sec="unidad">
          <legend>Where does it live?</legend>
          <div class="dev-form-2">
            <label>Project
              <select name="proyecto_id" required>
                <option value="">, </option>
                ${(x.proyectos.proyectos ?? []).map((p) => `<option value="${esc(p.id)}">${esc(p.nombre)} · ${esc(p.ciudad ?? '')}</option>`).join('')}
              </select></label>
          </div>
          <p class="note">A unit always belongs to a project. No project yet? Create one in
            <a href="#/dev/projects">Projects</a> first.</p>
        </fieldset>

        <fieldset data-sec="unidad">
          <legend>The unit</legend>
          <div class="dev-form-2">
            <label>Type
              <select name="tipo" required>
                ${['apartment', 'villa', 'townhouse', 'penthouse', 'hotel', 'retail', 'office', 'land']
                  .map((t) => `<option value="${t}">${esc(tipoLabel(t))}</option>`).join('')}
              </select></label>
            <label>Emirate <input name="emirato" required placeholder="Dubai"></label>
            <label>Community <input name="comunidad" placeholder="Downtown Dubai"></label>
            <label>Bedrooms <input name="habitaciones" type="number" min="0" step="1" placeholder="2"></label>
            <label>Bathrooms <input name="banos" type="number" min="0" step="1" placeholder="2"></label>
            <label>Size (sqft) <input name="superficie_sqft" type="number" min="0" step="1" placeholder="1200"></label>
            <label>Price (AED) <input name="precio_aed" required inputmode="decimal" placeholder="1850000"></label>
            <label>Build state
              <select name="estado_obra" required>
                <option value="ready">Ready</option>
                <option value="off_plan">Off plan</option>
              </select></label>
            <label>Handover <input name="entrega_prevista" placeholder="Q4 2027"></label>
          </div>
          <p class="note">The price is kept in fils, AED 1,850,000.00 is 185,000,000 fils, so the
            contract never carries a rounded decimal.</p>

          <div class="dev-calc" id="dev-calc">
            <span class="dev-etiqueta">The price in crypto · a calculator, not a quote</span>
            <div class="dev-calc-tasas">
              <label>1 USDT =
                <input name="tasa_usdt" inputmode="decimal" placeholder="3.6725"> <span>AED</span></label>
              <label>1 BNB =
                <input name="tasa_bnb" inputmode="decimal" placeholder="2400"> <span>AED</span></label>
            </div>
            <p class="note">The platform has no rate feed yet, so the rate is the one you write, the
              one you are quoting with. It is stamped with its moment and it is never a promise: the
              contract price is the one in dirhams, and BR-002 says the crypto figure is a time-bounded
              quote.</p>
            <div class="dev-calc-salida" id="dev-calc-salida">Type the rate and the price: the
              equivalent appears here.</div>
            <div class="dev-calc-vuelta">
              <label>I want to receive
                <input name="objetivo" inputmode="decimal" placeholder="500000"></label>
              <label class="dev-calc-activo">
                <select name="objetivo_activo">${ACTIVOS_CAMBIO.map(([a, t]) => `<option value="${esc(a)}">${esc(t)}</option>`).join('')}</select></label>
              <button class="btn ghost" type="button" id="dev-calc-pon">Set the price in AED</button>
            </div>
          </div>
        </fieldset>

        <fieldset data-sec="listing">
          <legend>The listing</legend>
          <div class="dev-form-2">
            <label>Title <input name="titulo" required placeholder="Unit 12 · apartment in Downtown Dubai"></label>
            <label>Advertising permit <input name="permiso_numero" maxlength="40" placeholder="12345678"></label>
            <label>Authority <input name="permiso_autoridad" maxlength="40" placeholder="DLD"></label>
          </div>
          <label class="dev-ancho">Description
            <textarea name="descripcion" rows="3" placeholder="What is worth saying about it."></textarea></label>
          <p class="note">The advertising permit is <b>declared, not checked</b>: NDC looks at it when
            it reviews the listing.</p>
        </fieldset>

        <fieldset data-sec="fotos">
          <legend>Photographs</legend>
          <label class="dev-ancho">Photographs of the property
            <span class="dev-archivo"><input type="file" name="fotos" accept="image/jpeg,image/png" multiple class="solo-lector" data-archivo="fotos"><span class="btn-archivo" role="button" tabindex="0" data-abre="fotos">Choose files</span><span class="archivo-dicho" data-dice="fotos">No file chosen</span></span>
            <span class="note">JPEG or PNG, up to 4 MiB each. The first one is the cover of the
              listing. They are stored by their content and served by URL: the buyer sees them, and so
              does Verysset.</span></label>
        </fieldset>

        <fieldset data-sec="papeles">
          <legend>The papers · what Verysset reads</legend>
          <div class="dev-form-2">
            <label>What are these papers?
              <select name="tipo_papel">
                <option value="titulo">Title deed</option>
                <option value="permiso">Advertising permit</option>
                <option value="plano">Plan</option>
                <option value="propiedad">Ownership evidence</option>
                <option value="otro">Something else</option>
              </select></label>
          </div>
          <label class="dev-ancho">Files
            <span class="dev-archivo"><input type="file" name="papeles" accept="application/pdf,image/jpeg,image/png" multiple class="solo-lector" data-archivo="papeles"><span class="btn-archivo" role="button" tabindex="0" data-abre="papeles">Choose files</span><span class="archivo-dicho" data-dice="papeles">No file chosen</span></span>
            <span class="note">PDF, JPEG or PNG. <b>This is where Verysset takes what it verifies</b>,
              together with the data of the unit: without the papers there is no verification and no
              badge. They are private, the buyer never sees them, Verysset and NDC do.</span></label>
        </fieldset>

        <fieldset data-sec="video">
          <legend>Video</legend>
          <label class="dev-ancho">URL of the video
            <input name="video_url" type="url" placeholder="https://…">
            <span class="note">A link to the video of the property (YouTube, Vimeo, the developer's
              own server). The platform stores the link, it does not host the file.</span></label>
        </fieldset>

        <fieldset data-sec="tour">
          <legend>3D tour</legend>
          <label class="dev-ancho">URL of the tour
            <input name="tour_url" type="url" placeholder="https://…">
            <span class="note">Matterport or whatever the developer uses. It is what the buyer opens
              from the sheet, next to the photographs.</span></label>
        </fieldset>

        <fieldset data-sec="planos">
          <legend>Plans</legend>
          <label class="dev-ancho">Files or links
            <span class="dev-archivo"><input type="file" name="planos" accept="image/jpeg,image/png" multiple class="solo-lector" data-archivo="planos"><span class="btn-archivo" role="button" tabindex="0" data-abre="planos">Choose files</span><span class="archivo-dicho" data-dice="planos">No file chosen</span></span>
            <span class="note">JPEG or PNG, up to 4 MiB each. A plan is what a buyer reads before
              deciding, and it is also part of what Verysset checks.</span></label>
          <label class="dev-ancho">Or a link to the plan
            <input name="plano_url" type="url" placeholder="https://…"></label>
        </fieldset>

        <fieldset data-sec="extras">
          <legend>Amenities and the rest of the unit</legend>
          <div class="dev-form-2">
            <label>Furnished
              <select name="amueblado">
                <option value="">Not stated</option>
                <option value="true">Furnished</option>
                <option value="false">Unfurnished</option>
              </select></label>
            <label>Tenure
              <select name="tenencia">
                <option value="">Not stated</option>
                <option value="freehold">Freehold</option>
                <option value="leasehold">Leasehold</option>
              </select></label>
            <label>Use
              <select name="uso">
                <option value="">Not stated</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="mixed">Mixed</option>
              </select></label>
            <label>Balcony (sqft) <input name="balcon_sqft" type="number" min="0" step="1" placeholder="120"></label>
            <label>Parking spaces <input name="plazas_parking" type="number" min="0" step="1" placeholder="1"></label>
            <label>Payment plan <input name="plan_pagos" maxlength="40" placeholder="40/60 · handover 2027"></label>
          </div>
          <div class="dev-ancho">
            <span class="dev-etiqueta">What it has</span>
            <div class="dev-marcas" id="dev-amenidades">
              ${Object.entries(AMENIDADES).map(([k, v]) => `
                <label class="dev-marca-caja">
                  <input type="checkbox" name="amenidad" value="${esc(k)}"><span>${esc(v)}</span></label>`).join('')}
            </div>
            <span class="note">Only what is checked is published. An amenity declared and not there is
              a lie the buyer finds on the first visit.</span>
          </div>
        </fieldset>

        <fieldset data-sec="mapa">
          <legend>Location on the map</legend>
          <div class="dev-form-2">
            <label>Latitude <input name="latitud" inputmode="decimal" placeholder="25.197197"></label>
            <label>Longitude <input name="longitud" inputmode="decimal" placeholder="55.274376"></label>
          </div>
          <p class="note">The unit appears on the buyer's map with these two numbers, and
            <b>without them the listing cannot be sent to review</b>: an offer that is on the list and
            missing from the map is a hole nobody sees. Nothing is invented for it — and if you get a
            number wrong, it can be corrected later from Properties.</p>
          <p class="note" id="dev-mapa-enlace" hidden></p>
        </fieldset>

        <fieldset data-sec="revision">
          <legend>Before sending it</legend>
          <p class="note" id="dev-repaso">The property is created as a draft and sent to NDC's review.
            Checklist loading…</p>
          <div class="dev-repaso" id="dev-repaso-lista"></div>
        </fieldset>

        <div class="dev-form-pie">
          <button class="btn green" type="submit">${ico('casa', 15)} Put it up</button>
          <span class="note">The unit and the listing are created as drafts, the files are stored, and
            the listing is sent to NDC's review. Publishing is a human decision and is not taken
            here.</span>
        </div>
        <ol class="dev-progreso" id="dev-progreso" hidden></ol>
        ${respuestaForm('dev-nueva')}
      </form>
    </section>`, '', 'Put a property up');

  const form = view().querySelector('#dev-nueva');
  const progreso = view().querySelector('#dev-progreso');
  const nav = view().querySelector('#dev-sec');
  const paneles = [...form.querySelectorAll('[data-sec]')];

  /** The menu is the door: one section at a time, and the one you are in says so. */
  const mostrar = (clave) => {
    for (const panel of paneles) panel.hidden = panel.dataset.sec !== clave;
    nav.querySelectorAll('[data-sec]').forEach((b) => {
      const on = b.dataset.sec === clave;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (clave === 'revision') repasar();
  };
  nav.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-sec]');
    if (b) mostrar(b.dataset.sec);
  });
  mostrar('unidad');

  // The map link, as soon as the two numbers are there: the seller checks the pin before sending it.
  const enlace = view().querySelector('#dev-mapa-enlace');
  const pintaEnlace = () => {
    const la = form.querySelector('[name="latitud"]').value.trim();
    const lo = form.querySelector('[name="longitud"]').value.trim();
    if (!la || !lo) { enlace.hidden = true; return; }
    enlace.hidden = false;
    enlace.innerHTML = `${ico('pin', 13)} <a target="_blank" rel="noopener"
      href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(la)}&mlon=${encodeURIComponent(lo)}#map=17/${encodeURIComponent(la)}/${encodeURIComponent(lo)}"
      >Check the pin on OpenStreetMap</a>`;
  };
  form.querySelector('[name="latitud"]').addEventListener('input', pintaEnlace);
  form.querySelector('[name="longitud"]').addEventListener('input', pintaEnlace);

  // ---------------------------------------------------------------- la calculadora del precio
  const calc = view().querySelector('#dev-calc');
  const enTasa = (a) => form.querySelector(`[name="tasa_${a.toLowerCase()}"]`);
  const enPrecio = form.querySelector('[name="precio_aed"]');
  const salida = view().querySelector('#dev-calc-salida');

  // The rates it finds are the ones already in force, if any: the calculator and the cards of the
  // marketplace read the same number.
  for (const [activo] of ACTIVOS_CAMBIO) {
    const t = tasa(activo);
    if (t) enTasa(activo).value = String(t);
  }

  const calcula = () => {
    for (const [activo] of ACTIVOS_CAMBIO) fijarTasa(activo, Number(enTasa(activo).value) || null);
    const fils = Math.round((Number(enPrecio.value) || 0) * 100);
    if (!fils || !ACTIVOS_CAMBIO.some(([a]) => tasa(a))) {
      salida.innerHTML = 'Type the rate and the price: the equivalent appears here.';
      return;
    }
    salida.innerHTML = ACTIVOS_CAMBIO.map(([activo]) => {
      const v = equivalencia(fils, activo);
      if (v === null) return '';
      const decimales = activo === 'USDT' ? 2 : 4;
      return `<span><b>${esc(money(fils))}</b> ≈ <b>${v.toLocaleString('en-GB',
        { maximumFractionDigits: decimales })} ${esc(activo)}</b>
        <i>1 ${esc(activo)} = AED ${esc(tasaTexto(activo))}</i></span>`;
    }).join('');
    salida.insertAdjacentHTML('beforeend',
      '<span class="dev-calc-aviso">Indicative, at the rate you wrote, and only for as long as it holds: '
      + 'the contract price is the one in dirhams.</span>');
  };
  calc.addEventListener('input', calcula);
  // The other way round: a seller who knows what they want to receive gets the price in dirhams.
  view().querySelector('#dev-calc-pon').addEventListener('click', () => {
    const activo = form.querySelector('[name="objetivo_activo"]').value;
    const quiere = Number(form.querySelector('[name="objetivo"]').value) || 0;
    const t = Number(enTasa(activo).value) || 0;
    if (!quiere || !t) {
      salida.innerHTML = 'Write how much you want to receive, and the rate.';
      return;
    }
    const aed = quiere * t;
    enPrecio.value = aed.toFixed(2);
    calcula();
  });
  calcula();

  /** The docket of what the property carries, so nothing is forgotten before it goes to NDC. */
  const repasar = () => {
    const f = Object.fromEntries(new FormData(form));
    const n = (k) => (form.querySelector(`[name="${k}"]`)?.files?.length ?? 0);
    const marcas = form.querySelectorAll('input[name="amenidad"]:checked').length;
    const lineas = [
      [f.proyecto_id, 'A project to hang the unit on'],
      [f.tipo && f.emirato && f.precio_aed, 'The unit: type, emirate and price'],
      [f.estado_obra, 'Ready or off plan'],
      [f.titulo, 'The title of the listing'],
      [n('fotos'), 'At least one photograph (the first one is the cover)'],
      [f.video_url, 'A video, if there is one'],
      [f.tour_url, 'A 3D tour, if there is one'],
      [n('planos') || f.plano_url, 'A plan'],
      [marcas, 'Amenities declared'],
      [f.latitud && f.longitud, 'The pin on the map'],
      [n('papeles'), 'The papers Verysset reads'],
    ];
    const caja = view().querySelector('#dev-repaso-lista');
    caja.innerHTML = lineas.map(([ok, texto]) => `<span class="${ok ? 'si' : 'no'}">${ok ? '✓' : ', '} ${esc(texto)}</span>`).join('');
    const faltan = lineas.filter(([ok]) => !ok).length;
    view().querySelector('#dev-repaso').innerHTML = faltan
      ? `<b>${faltan}</b> thing(s) still missing. Nothing stops the submission, but what is missing is
         what the buyer (and Verysset) will not see.`
      : 'Everything is there. Sending it puts it in NDC\'s review queue.';
  };
  const apunta = (texto, estado = 'on') => {
    progreso.hidden = false;
    const li = document.createElement('li');
    li.className = estado;
    li.textContent = texto;
    progreso.appendChild(li);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const num = (v) => (v === '' || v === undefined ? undefined : Number(v));
    const fotos = [...(form.querySelector('input[name="fotos"]')?.files ?? [])];
    const papeles = [...(form.querySelector('input[name="papeles"]')?.files ?? [])];
    progreso.innerHTML = '';
    // The two answers of the form are cleared at the start of a run, not shown empty.
    const err0 = view().querySelector('#dev-nueva-error');
    const ok0 = view().querySelector('#dev-nueva-ok');
    if (err0) err0.hidden = true;
    if (ok0) ok0.hidden = true;

    try {
      // 1 · the unit
      apunta('Storing the unit…');
      const amenidades = [...form.querySelectorAll('input[name="amenidad"]:checked')].map((i) => i.value);
      const unidad = await api.devUnitCreate(f.proyecto_id, {
        tipo: f.tipo, emirato: f.emirato, comunidad: f.comunidad || undefined,
        habitaciones: num(f.habitaciones), banos: num(f.banos),
        superficie_sqft: num(f.superficie_sqft),
        // The money rule: the platform takes integer fils, never a rounded decimal.
        precio_fils: Math.round(Number(f.precio_aed) * 100),
        estado_obra: f.estado_obra,
        entrega_prevista: f.entrega_prevista || undefined,
        // The rest of what a sheet shows: the structure, the legal side and what it has.
        balcon_sqft: num(f.balcon_sqft), plazas_parking: num(f.plazas_parking),
        amueblado: f.amueblado === '' ? undefined : f.amueblado === 'true',
        tenencia: f.tenencia || undefined, uso: f.uso || undefined,
        plan_pagos: f.plan_pagos || undefined,
        amenidades: amenidades.length ? amenidades : undefined,
        latitud: num(f.latitud), longitud: num(f.longitud),
      });

      // 2 · the listing over it
      apunta('Storing the listing…');
      const lista = await api.devListingCreate({
        unidad_id: unidad.unidad_id,
        titulo: f.titulo,
        descripcion: f.descripcion || undefined,
        permiso_numero: f.permiso_numero || undefined,
        permiso_autoridad: f.permiso_autoridad || undefined,
      });
      const listingId = lista?.listing_id ?? lista?.id;
      if (!listingId) throw new Error('the platform did not answer the listing it stored');

      // 3 · the photographs: each one is stored and hung on the listing, the first as the cover
      for (const [i, foto] of fotos.entries()) {
        apunta(`Storing photograph ${i + 1} of ${fotos.length}…`);
        const subida = await api.subirImagen(foto);
        await api.devListingMedia(listingId, {
          tipo: 'foto', url: subida.url, orden: i, es_principal: i === 0,
        });
      }
      if (!fotos.length) apunta('No photographs: the listing will go up without them.', 'ojo');

      // 3b · the rest of the media: a video and a 3D tour are links, a plan is a file
      let orden = fotos.length;
      const planos = [...(form.querySelector('input[name="planos"]')?.files ?? [])];
      for (const [i, plano] of planos.entries()) {
        apunta(`Storing plan ${i + 1} of ${planos.length}…`);
        const subida = await api.subirImagen(plano);
        await api.devListingMedia(listingId, { tipo: 'plano', url: subida.url, orden: orden + i });
      }
      orden += planos.length;
      if (f.plano_url) {
        apunta('Storing the link to the plan…');
        await api.devListingMedia(listingId, { tipo: 'plano', url: f.plano_url, orden });
        orden += 1;
      }
      if (f.video_url) {
        apunta('Storing the video…');
        await api.devListingMedia(listingId, { tipo: 'video', url: f.video_url, orden });
        orden += 1;
      }
      if (f.tour_url) {
        apunta('Storing the 3D tour…');
        await api.devListingMedia(listingId, { tipo: 'tour3d', url: f.tour_url, orden });
      }

      // 4 · the papers: what Verysset reads to verify the asset
      for (const [i, papel] of papeles.entries()) {
        apunta(`Storing paper ${i + 1} of ${papeles.length}…`);
        await api.subirDocumento(papel, {
          sujeto_tipo: 'unidad', sujeto_id: unidad.unidad_id,
          tipo: f.tipo_papel, nombre: papel.name,
        });
      }
      if (!papeles.length) {
        apunta('No papers: Verysset has nothing to verify with, so there will be no badge.', 'ojo');
      }

      // 5 · and to the review: publishing is NDC's decision, not this screen's
      apunta('Sending it to NDC\'s review…');
      await api.devListingSubmit(listingId);
      apunta('Done: submitted to review.', 'hecho');

      DATOS = null;
      diRespuesta('dev-nueva', true,
        `Unit, listing, ${fotos.length} photograph(s) and ${papeles.length} paper(s) stored. `
        + `The listing is <b>under NDC's review</b>, publishing is their decision.`);
    } catch (err) {
      apunta('Stopped here.', 'error');
      diRespuesta('dev-nueva', false, err);
    }
  });
}

/* ---------------------------------------------------------------- Projects */

export async function viewDevProjects() {
  await conDatos('#/dev/projects', (x) => {
    const suyas = x.unidades.unidades ?? [];
    const tarjetas = (x.proyectos.proyectos ?? []).map((p) => {
      const dentro = suyas.filter((u) => u.proyecto.id === p.id);
      const publicadas = dentro.filter((u) => u.anuncio?.estado === 'approved').length;
      const retenidas = dentro.filter((u) => u.disponibilidad === 'held').length;
      const valor = dentro.reduce((s, u) => s + filsDe(u), 0);
      return `
        <section class="mod">
          <header>${ico('edificio', 15)}<h4>${esc(p.nombre)}</h4>
            <span class="muted">${dentro.length} unit${dentro.length === 1 ? '' : 's'}</span></header>
          <div class="dev-mini">
            <span><b>${publicadas}</b> published</span>
            <span><b>${retenidas}</b> on hold</span>
            <span><b>${esc(money(valor))}</b> book value</span>
            ${p.ciudad ? `<span>${ico('pin', 13)} ${esc(p.ciudad)}</span>` : ''}
            <a href="#/project/${esc(p.id)}">Open in the marketplace →</a>
          </div>
          <!-- El avance del mes: lo declara el promotor, y así lo lee el comprador. Un mes, un
               porcentaje y una nota; la corrección de un mes se guarda como otra versión. -->
          <form class="dev-form dev-avance" data-proyecto="${esc(p.id)}">
            <div class="dev-form-2">
              <label>Month <input name="periodo" required placeholder="2026-10"></label>
              <label>Completion % <input name="avance" type="number" min="0" max="100" step="0.1" required placeholder="45"></label>
            </div>
            <label class="dev-ancho">What happened this month <input name="nota" placeholder="Facade finished"></label>
            <div class="dev-form-pie">
              <button class="btn sm verde" type="submit">Declare the month</button>
              <span class="note" data-avance-msg></span>
            </div>
          </form>
          <div class="list">
            ${dentro.slice(0, 4).map((u) => `
              <a class="item" href="#/unit/${esc(u.unidad_id)}">
                <div class="row-between">
                  <b>${esc(tipoLabel(u.tipo))}${u.habitaciones ? ` · ${u.habitaciones} bed` : ''}</b>
                  <span class="muted">${esc(u.precio_aed)}</span>
                </div>
                <span class="when">${[
                  u.anuncio ? (ANUNCIO[u.anuncio.estado] ?? u.anuncio.estado) : 'No listing',
                  DISPONIBILIDAD[u.disponibilidad] ?? u.disponibilidad, u.anuncio?.referencia,
                ].filter(Boolean).map(esc).join(' · ')}</span>
              </a>`).join('')}
            ${dentro.length > 4 ? `<p class="note">…and ${dentro.length - 4} more in Properties.</p>` : ''}
            ${dentro.length === 0 ? '<p class="note">No unit declared in this project yet.</p>' : ''}
          </div>
        </section>`;
    }).join('');

    return `
      ${avisosDeCabecera(x.yo)}
      <div class="dev-dos dev-dos-arriba">
        <div>${tarjetas || empty('No project yet', 'A project is where units live.')}</div>
        <div>
        ${tarjetaGrafica({ titulo: 'Units per project', icono: 'edificio', id: 'dev-grafica-proyectos',
          alto: 150, nota: 'How many units each project has, against the biggest one.' })}
        <section class="mod">
          <header>${ico('pluma', 15)}<h4>New project</h4></header>
          <form class="dev-form" id="dev-nuevo-proyecto">
            <div class="dev-form-2">
              <label>Name <input name="nombre" required placeholder="NDC Hills II"></label>
              <label>City <input name="ciudad" required placeholder="Dubai"></label>
              <label>Emirate <input name="emirato" required placeholder="Dubai"></label>
              <label>Community <input name="comunidad" placeholder="Business Bay"></label>
            </div>
            <label class="dev-ancho">Description <textarea name="descripcion" rows="2"></textarea></label>
            <div class="dev-form-pie">
              <label class="dev-ancho">Image of the project
                <span class="dev-archivo">
                  <input type="file" name="imagen" accept="image/jpeg,image/png" class="solo-lector" data-archivo="imagen">
                  <span class="btn-archivo" role="button" tabindex="0" data-abre="imagen">Choose an image</span>
                  <span class="archivo-dicho" data-dice="imagen">No file chosen</span>
                </span>
                <span class="note">JPEG or PNG. It is uploaded when you create the project, and the
                  project keeps the address the platform gives it.</span>
              </label>
              <label class="dev-ancho">Video of the project
                <span class="dev-archivo">
                  <input type="file" name="video" accept="video/mp4,video/webm" class="solo-lector" data-archivo="video">
                  <span class="btn-archivo" role="button" tabindex="0" data-abre="video">Choose a video</span>
                  <span class="archivo-dicho" data-dice="video">No file chosen</span>
                </span>
                <span class="note">MP4 or WebM. Many projects have one, and it is uploaded the same way
                  as the image, when the project is created.</span>
              </label>
              <button class="btn green" type="submit">${ico('edificio', 15)} Create the project</button>
            </div>
            <p class="note">Created as a draft, and only this organisation can see it.</p>
            ${respuestaForm('dev-proy')}
          </form>
        </section>
        </div>
      </div>`;
  });

  const f = view().querySelector('#dev-nuevo-proyecto');
  f?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const datos = Object.fromEntries(new FormData(f));
      const archivo = f.querySelector('[name="imagen"]')?.files?.[0] ?? null;
      delete datos.imagen;
      const archivoVideo = f.querySelector('[name="video"]')?.files?.[0] ?? null;
      delete datos.video;
      if (archivoVideo) {
        // Igual que la imagen: si el vídeo no se puede subir, el proyecto se crea sin él y se dice.
        try {
          const rv = await api.subirVideo(archivoVideo);
          datos.video_url = rv?.url ?? null;
        } catch {
          datos.video_url = null;
        }
      }
      if (archivo) {
        const subida = new FormData();
        subida.append('archivo', archivo);
        const r = await api.subirImagen(subida);
        // La dirección que devuelve la plataforma, no una ruta inventada: si la subida falla, el
        // proyecto no se crea con una imagen rota, se crea sin imagen y el aviso lo dice.
        datos.imagen_url = r?.url ?? null;
      }
      await api.devProjectCreate(datos);
      DATOS = null;
      diRespuesta('dev-proy', true, 'Project created as a draft.');
      setTimeout(() => viewDevProjects(), 900);
    } catch (err) {
      diRespuesta('dev-proy', false, err);
    }
  });

  // El avance mensual: cada tarjeta de proyecto lleva su formulario, y todos se enganchan igual.
  for (const form of view().querySelectorAll('.dev-avance')) {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const msg = form.querySelector('[data-avance-msg]');
      const datos = Object.fromEntries(new FormData(form));
      msg.className = 'note';
      msg.textContent = 'Sending…';
      try {
        const r = await api.devDeclararAvance(form.dataset.proyecto, {
          periodo: String(datos.periodo ?? '').trim(),
          avance_pb: Math.round(Number(datos.avance) * 100),
          nota: String(datos.nota ?? '').trim() || null,
        });
        msg.className = 'note ok';
        msg.textContent = `Declared: ${r.porcentaje} · ${r.periodo_etiqueta}`;
        form.reset();
      } catch (e) {
        msg.className = 'note err';
        msg.textContent = e.message || 'It did not go through';
      }
    });
  }

}

/* ---------------------------------------------------------------- Listings */

export async function viewDevListings() {
  await conDatos('#/dev/listings', (x) => `
    ${avisosDeCabecera(x.yo)}
    <div class="dev-dos">
      ${tarjetaGrafica({ titulo: 'Where the listings stand', icono: 'etiqueta', id: 'dev-grafica-anuncios',
        leyenda: leyendaDe(porAnuncio(x.unidades.unidades ?? [])) })}
      ${tarjetaGrafica({ titulo: 'Units per project', icono: 'edificio', id: 'dev-grafica-proyectos',
        nota: 'How many units each project has, against the biggest one.' })}
    </div>
    <section class="mod">
      <header>${ico('etiqueta', 15)}<h4>Listings</h4>
        <a href="#/dev/properties/nueva">Put a property up →</a></header>
      <p class="note">A listing is the advertisement over a unit, and it walks in one direction:
        draft → submitted → under review → published. Material changes, the unit, the evidence, the
        price, the payment plan, send it back to review.</p>
      ${barraHerramientas({ sitio: 'Unit, reference or project',
        estados: [['draft', 'Draft'], ['submitted', 'Submitted'], ['in_review', 'Under review'],
          ['approved', 'Published'], ['returned', 'Returned'], ['rejected', 'Rejected'],
          ['suspended', 'Suspended'], ['sin_anuncio', 'Without listing']],
        orden: [['nombre', 'Unit A–Z'], ['estado', 'State'], ['precio_desc', 'Price ↓']] })}
      <div id="dev-filas-caja"></div>
    </section>`);

  const suyas = (DATOS.unidades.unidades ?? []).map((u) => ({
    ...u, precio_num: Number(String(u.precio_aed ?? '').replace(/[^0-9.]/g, '')) || 0,
    estado_anuncio: u.anuncio?.estado ?? 'sin_anuncio',
  }));
  const caja = view().querySelector('#dev-filas-caja');
  herramientas(view().querySelector('.dev-main'), {
    datos: suyas,
    estado: (u) => u.estado_anuncio,
    texto: (u) => `${tipoLabel(u.tipo)} ${u.proyecto?.nombre ?? ''} ${u.anuncio?.referencia ?? ''} ${ANUNCIO[u.estado_anuncio] ?? ''}`,
    pintar: (filas) => {
      caja.innerHTML = tabla(
        [['Unit', ''], ['Reference', ''], ['State', ''], ['Permit', ''], ['Price', 'num']],
        filas.length ? filas.map((u) => `
          <tr data-ir="#/unit/${esc(u.unidad_id)}">
            <td><b>${esc(tipoLabel(u.tipo))}${u.habitaciones ? ` · ${u.habitaciones} bed` : ''}</b>
              <small>${esc(u.proyecto?.nombre ?? '')}${u.anuncio?.promocionado ? ' · promoted' : ''}</small></td>
            <td>${u.anuncio?.referencia ? `<code>${esc(u.anuncio.referencia)}</code>` : '<span class="muted">, </span>'}</td>
            <td>${u.anuncio ? tagEstado(u.anuncio.estado, ANUNCIO, ['approved'], ['returned', 'rejected', 'suspended']) : etiqueta('No listing')}</td>
            <td>${u.anuncio?.permiso_numero
              ? `${esc(u.anuncio.permiso_autoridad ?? '')} ${esc(u.anuncio.permiso_numero)}`
              : '<span class="muted">, </span>'}</td>
            <td class="num">${esc(u.precio_aed)}</td>
            <td class="abrir">${ico('derecha', 15)}</td>
          </tr>`).join('') : '<tr><td colspan="6" class="note">Nothing matches those tools.</td></tr>');
    },
    csv: (filas) => [
      ['unit', 'project', 'reference', 'state', 'permit_authority', 'permit_number', 'price'],
      ...filas.map((u) => [tipoLabel(u.tipo), u.proyecto?.nombre ?? '', u.anuncio?.referencia ?? '',
        ANUNCIO[u.estado_anuncio] ?? 'No listing', u.anuncio?.permiso_autoridad ?? '',
        u.anuncio?.permiso_numero ?? '', u.precio_aed ?? '']),
    ],
  });
}

/* ---------------------------------------------------------------- Verification (Verysset) */

export async function viewDevVerification() {
  await conDatos('#/dev/verification', (x) => {
    const suyas = x.unidades.unidades ?? [];
    const conBadge = suyas.filter((u) => u.anuncio?.badge_alcance);
    return `
      ${avisosDeCabecera(x.yo)}
      <section class="mod">
        <header>${ico('sello', 15)}<h4>Verysset, the hand that verifies</h4>
          ${selloVerysset(conBadge.length ? 'Verysset verifies' : 'Waiting for Verysset')}</header>
        <p class="note"><b>Verysset is not the platform and it is not the seller.</b> It is the hand
          that checks the asset and signs what it saw. Everything this screen shows about evidence
          comes from what Verysset signed; the portal only reads it, and nothing here approves,
          publishes or pays anything.</p>
        <div class="dev-tres">
          <div>
            <b>What it checks</b>
            <span>The thing built against the papers, and the place against the plans: what it is,
              where it is, and that the file and the building say the same thing.</span>
          </div>
          <div>
            <b>What it issues</b>
            <span>Signed evidence: the date, the scope of what was checked, the hash anchored on
              chain, and the digital twin of the building.</span>
          </div>
          <div>
            <b>What it never does</b>
            <span>It does not set a price, it does not publish and it does not sign a closing. Those
              are other hands, and none of them is a machine's.</span>
          </div>
        </div>
        <p class="note">The badge states its scope and the date it was issued: it is evidence of what
          was checked, <b>not an unconditional guarantee</b>, and it is valid for the window it
          declares, not forever. Open any unit and its seal opens the full report: what was checked,
          the hash, and where the building stands.</p>
      </section>
      <div class="dev-dos">
        ${tarjetaGrafica({ titulo: 'Evidence, unit by unit', icono: 'permiso', id: 'dev-grafica-verificacion',
          nota: 'A unit either carries Verysset\'s evidence or it does not. There is no halfway badge.',
          leyenda: leyendaDe([['With evidence', conBadge.length, COLORES.publicado],
            ['Without evidence', suyas.length - conBadge.length, COLORES.sinAnuncio]]) })}
        ${tarjetaGrafica({ titulo: 'The book, by state', icono: 'pulso', id: 'dev-grafica-unidades',
          leyenda: leyendaDe(estadosDelLibro(x.unidades.resumen ?? {})) })}
      </div>
      <section class="mod">
        <header>${ico('permiso', 15)}<h4>Verification</h4>
          <span class="muted">${conBadge.length} of ${suyas.length} verified</span></header>
        <p class="note"><b>Verysset is the one who verifies.</b> It checks the asset, the physical
          thing, the papers and the place, and issues signed evidence: the date, the scope of what
          was checked, the hash that anchors it, and the digital twin of the building. The badge is
          valid for the window it states, not forever, and this portal only reads it.</p>
        ${barraHerramientas({ sitio: 'Unit or project',
          estados: [['verificado', 'Verified'], ['sin', 'Without evidence']],
          orden: [['nombre', 'Unit A–Z'], ['precio_desc', 'Price ↓']] })}
        <div id="dev-filas-caja"></div>
      </section>`;
  });

  const suyas = (DATOS.unidades.unidades ?? []).map((u) => ({
    ...u, precio_num: Number(String(u.precio_aed ?? '').replace(/[^0-9.]/g, '')) || 0,
    verificado: u.anuncio?.badge_alcance ? 'verificado' : 'sin',
  }));
  const caja = view().querySelector('#dev-filas-caja');
  herramientas(view().querySelector('.dev-main'), {
    datos: suyas,
    estado: (u) => u.verificado,
    texto: (u) => `${tipoLabel(u.tipo)} ${u.proyecto?.nombre ?? ''} ${u.comunidad ?? ''}`,
    pintar: (filas) => {
      caja.innerHTML = tabla(
        [['Unit', ''], ['Scope', ''], ['Valid', ''], ['Anchor', ''], ['Price', 'num']],
        filas.length ? filas.map((u) => `
          <tr data-ir="#/unit/${esc(u.unidad_id)}">
            <td><b>${esc(tipoLabel(u.tipo))}${u.habitaciones ? ` · ${u.habitaciones} bed` : ''}</b>
              <small>${esc(u.proyecto?.nombre ?? '')} · ${esc(u.comunidad ?? '')}</small></td>
            <td>${u.anuncio?.badge_alcance
              ? `${selloVerysset()}<small class="alcance">${esc(u.anuncio.badge_alcance)}</small>`
              : etiqueta('Without evidence')}</td>
            <td>${u.anuncio?.badge_valido_hasta ? `<small>until ${esc(u.anuncio.badge_valido_hasta)}</small>` : '<span class="muted">, </span>'}</td>
            <td>${u.anuncio?.badge_evidencia_hash
              ? `<code title="${esc(u.anuncio.badge_evidencia_hash)}">${esc(String(u.anuncio.badge_evidencia_hash).slice(0, 14))}…</code>`
              : '<span class="muted">, </span>'}</td>
            <td class="num">${esc(u.precio_aed)}</td>
            <td class="abrir">${ico('derecha', 15)}</td>
          </tr>`).join('') : '<tr><td colspan="6" class="note">Nothing matches those tools.</td></tr>');
    },
    csv: (filas) => [
      ['unit', 'project', 'scope', 'valid_until', 'evidence_hash', 'network', 'tx'],
      ...filas.map((u) => [tipoLabel(u.tipo), u.proyecto?.nombre ?? '', u.anuncio?.badge_alcance ?? '',
        u.anuncio?.badge_valido_hasta ?? '', u.anuncio?.badge_evidencia_hash ?? '',
        u.anuncio?.badge_evidencia_red ?? '', u.anuncio?.badge_evidencia_tx ?? '']),
    ],
  });
}

/* ---------------------------------------------------------------- Sales */

export async function viewDevSales() {
  await conDatos('#/dev/sales', (x) => {
    const resumen = x.ventas.resumen ?? {};
    const todas = (x.ventas.ventas ?? []).map((v) => ({
      ...v, precio_num: Number(String(v.precio_aed ?? '').replace(/[^0-9.]/g, '')) || 0,
    }));
    return `
      ${avisosDeCabecera(x.yo)}
      <section class="mod destacados">
        ${destacado(resumen.importe_aed ?? money(0), 'Sold', true)}
        ${destacado(resumen.cobrado_aed ?? money(0), 'Collected', true)}
        ${destacado(Number(resumen.pendiente_cobro ?? 0), 'Awaiting the bank')}
        ${destacado(todas.length, 'Sales on the book')}
      </section>
      <div class="dev-dos dev-dos-c">
        ${tarjetaGrafica({ titulo: 'Sales, last twelve months', icono: 'avance', id: 'dev-grafica-ventas',
          alto: 200, nota: 'Contract prices of what was reserved each month, in dirhams.' })}
      </div>
      <section class="mod">
        <header>${ico('trato', 15)}<h4>Sales</h4></header>
        <p class="note">The money is stated as pending until the dirhams have reached your account.
          What the buyer paid in fees, and their identity check, are not part of this screen.</p>
        ${barraHerramientas({ sitio: 'Unit, project or state',
          orden: [['nombre', 'Unit A–Z'], ['precio_desc', 'Price ↓'], ['estado', 'State']] })}
        <div id="dev-filas-caja"></div>
      </section>`;
  });

  const todas = (DATOS.ventas.ventas ?? []).map((v) => ({
    ...v, precio_num: Number(String(v.precio_aed ?? '').replace(/[^0-9.]/g, '')) || 0,
  }));
  const caja = view().querySelector('#dev-filas-caja');
  herramientas(view().querySelector('.dev-main'), {
    datos: todas,
    estado: (v) => v.estado,
    texto: (v) => `${tipoLabel(v.unidad?.tipo)} ${v.proyecto ?? ''} ${VENTA[v.estado] ?? v.estado} ${v.cobro?.canal ?? ''}`,
    pintar: (filas) => {
      caja.innerHTML = tabla(
        [['Unit', ''], ['State', ''], ['Channel', ''], ['Contract price', 'num'], ['Collected', 'num']],
        filas.length ? filas.map((v) => `
          <tr data-ir="#/dev/sale/${esc(v.intencion_id)}">
            <td><b>${esc(tipoLabel(v.unidad?.tipo))}${v.unidad?.habitaciones ? ` · ${v.unidad.habitaciones} bed` : ''}</b>
              <small>${esc(v.proyecto ?? '')}${v.estado_registro === 'registered' ? ' · registered with the DLD' : ''}</small></td>
            <td>${tagEstado(v.estado, VENTA, ['business_completion_approved', 'settled'], ['manual_review', 'compliance_hold'])}</td>
            <td>${esc(CANAL[v.cobro?.canal] ?? v.cobro?.canal ?? ', ')}</td>
            <td class="num">${esc(v.precio_aed)}</td>
            <td class="num">${esc(v.cobro?.aed_liquidado ?? ', ')}</td>
            <td class="abrir">${ico('derecha', 15)}</td>
          </tr>`).join('') : '<tr><td colspan="6" class="note">Nothing matches those tools.</td></tr>');
    },
    csv: (filas) => [
      ['unit', 'project', 'state', 'channel', 'contract_price', 'aed_settled', 'your_share', 'registered'],
      ...filas.map((v) => [tipoLabel(v.unidad?.tipo), v.proyecto ?? '', VENTA[v.estado] ?? v.estado,
        v.cobro?.canal ?? '', v.precio_aed ?? '', v.cobro?.aed_liquidado ?? '', v.cobro?.neto_aed ?? '',
        v.estado_registro ?? '']),
    ],
  });
}

/* ---------------------------------------------------------------- Collections */

export async function viewDevCollections() {
  await conDatos('#/dev/collections', (x) => {
    const ventas = x.ventas.ventas ?? [];
    const resumen = x.ventas.resumen ?? {};
    const cobradas = ventas.filter((v) => v.cobro?.aed_liquidado);
    const porBanco = {};
    for (const v of cobradas) {
      const k = v.cobro?.banco ?? ', ';
      porBanco[k] = (porBanco[k] ?? 0) + (Number(String(v.cobro?.aed_liquidado ?? '').replace(/[^0-9.]/g, '')) || 0);
    }
    return `
      ${avisosDeCabecera(x.yo)}
      <section class="mod destacados">
        ${destacado(resumen.cobrado_aed ?? money(0), 'In your account', true)}
        ${destacado(Number(resumen.pendiente_cobro ?? 0), 'Awaiting the bank')}
        ${destacado(cobradas.length, 'Collections recorded')}
        ${destacado(Object.keys(porBanco).join(' · ') || ', ', 'Banks')}
      </section>
      <div class="dev-dos">
        ${tarjetaGrafica({ titulo: 'Where the money is', icono: 'banco', id: 'dev-grafica-cobros',
          leyenda: leyendaDe([
            ['In your account', Number(String(resumen.cobrado_aed ?? '').replace(/[^0-9.]/g, '')) || 0, COLORES.publicado],
            ['Awaiting the bank', Number(String(resumen.importe_aed ?? '').replace(/[^0-9.]/g, '')) -
              Number(String(resumen.cobrado_aed ?? '').replace(/[^0-9.]/g, '')) || 0, COLORES.revision]]) })}
        ${tarjetaGrafica({ titulo: 'What each bank brought', icono: 'obra', id: 'dev-grafica-bancos',
          nota: 'The dirhams that have already reached an account, by bank.' })}
      </div>
      <section class="mod">
        <header>${ico('banco', 15)}<h4>Collections</h4></header>
        <p class="note">The dirhams arrive through the licensed off-ramp: the OTC converts the crypto
          and the bank credits your account. Your share is frozen only when it has arrived, before
          that there is nothing to promise, and nothing here is a receipt.</p>
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>Sale</th><th>Bank</th><th>Conversion</th><th class="num">AED settled</th><th class="num">Your share</th></tr></thead>
            <tbody>
              ${cobradas.length ? cobradas.map((v) => `
                <tr data-ir="#/dev/sale/${esc(v.intencion_id)}">
                  <td><b>${esc(tipoLabel(v.unidad?.tipo))}</b><small>${esc(v.proyecto ?? '')}</small></td>
                  <td>${esc(v.cobro?.banco ?? ', ')}</td>
                  <td>${v.cobro?.referencia ? `<code>${esc(String(v.cobro.referencia).slice(0, 16))}…</code>` : '<span class="muted">, </span>'}</td>
                  <td class="num">${esc(v.cobro?.aed_liquidado ?? ', ')}</td>
                  <td class="num">${esc(v.cobro?.neto_aed ?? ', ')}</td>
                  <td class="abrir">${ico('derecha', 15)}</td>
                </tr>`).join('') : '<tr><td colspan="6" class="note">Nothing collected yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>`;
  });
}

/* ---------------------------------------------------------------- Brokers */

export async function viewDevBrokers() {
  await conDatos('#/dev/brokers', (x) => {
    const codigos = x.codigos.codigos ?? [];
    // The developer designates brokers; the channel that NDC approves, the content creator, is not
    // the developer's to hand out.
    const canales = [['broker', 'Broker'], ['desarrollador', 'Own sales']];
    if (x.codigos.permitido === false) {
      return `
        ${avisosDeCabecera(x.yo)}
        <section class="mod">
          <header>${ico('grupo', 15)}<h4>Brokers</h4></header>
          <p class="note">Designating brokers is yours. This session cannot read them, ${esc(x.codigos.motivo || 'the API answers 403')}, so the desk will not pretend.</p>
        </section>`;
    }
    return `
      ${avisosDeCabecera(x.yo)}
      <section class="mod">
        <header>${ico('grupo', 15)}<h4>Brokers</h4>
          <span class="muted">${codigos.length} code${codigos.length === 1 ? '' : 's'}</span></header>
        <p class="note"><b>You designate the brokers, and the code comes out of the platform</b>, no
          one types it. The code is what says who brought the buyer, and it is how the sale is
          attributed; it does not decide the commission (the fee table does), and no payment is
          released before that person's identity is checked. A buyer who arrives <b>without</b> a
          code still closes: what the broker would have kept stays with the platform and NDC.</p>
        <p class="note">A <b>content creator</b> is a different door: NDC is the one who approves
          them. You can turn one down for your own properties, but you do not issue that code.</p>
        ${barraHerramientas({ sitio: 'Code, name or channel' })}
        <div id="dev-filas-caja"></div>
      </section>

      <section class="mod">
        <header>${ico('pluma', 15)}<h4>Designate a broker</h4></header>
        <form class="dev-form" id="dev-nuevo-codigo">
          <div class="dev-form-2">
            <label>Broker or desk <input name="nombre" required placeholder="Alpha Realty"></label>
            <label>Channel
              <select name="canal" required>
                ${canales.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}
              </select></label>
            <label>WhatsApp <input name="whatsapp" placeholder="+971 50 000 0000"></label>
            <label>Telegram <input name="telegram" placeholder="alias"></label>
            <label>Email <input name="correo" type="email" placeholder="desk@example.ae"></label>
          </div>
          <label class="dev-ancho">Who answers
            <input name="titulo" maxlength="60" placeholder="Sales desk · Downtown Dubai"></label>
          <label class="dev-ancho">Face
            <span class="dev-archivo"><input type="file" name="foto" accept="image/jpeg,image/png" class="solo-lector" data-archivo="foto"><span class="btn-archivo" role="button" tabindex="0" data-abre="foto">Choose files</span><span class="archivo-dicho" data-dice="foto">No file chosen</span></span>
            <span class="note">JPEG or PNG, up to 4 MiB. It is the face the buyer sees when the code
              puts them in touch, without it they see the monogram of the name instead.</span></label>
          <div class="dev-vista" id="dev-vista-foto" hidden></div>
          <div class="dev-form-pie">
            <button class="btn green" type="submit">${ico('llave', 15)} Designate the broker</button>
            <span class="note">The code is made from the name, and if that one is taken the platform
              takes the next number. One door per channel: whatever is left empty stays closed.</span>
          </div>
          ${respuestaForm('dev-broker')}
        </form>
      </section>`;
  });

  const caja = view().querySelector('#dev-filas-caja');
  // A desk that answered with the note about the permission has no table to paint: it stops here.
  if (!caja) return;
  const codigos = (DATOS.codigos.codigos ?? []).map((c) => ({ ...c, precio_num: 0 }));
  herramientas(view().querySelector('.dev-main'), {
    datos: codigos,
    texto: (c) => `${c.codigo} ${c.nombre} ${CANAL[c.canal] ?? c.canal} ${c.correo ?? ''}`,
    pintar: (filas) => {
      caja.innerHTML = tabla(
        [['Code', ''], ['Name', ''], ['Channel', ''], ['Contact', ''], ['Who answers', '']],
        filas.length ? filas.map((c) => `
          <tr>
            <td><code>${esc(c.codigo)}</code></td>
            <td><b>${esc(c.nombre)}</b></td>
            <td>${etiqueta(CANAL[c.canal] ?? c.canal)}</td>
            <td><small>${[c.whatsapp, c.telegram, c.correo].filter(Boolean).map(esc).join(' · ') || ', '}</small></td>
            <td><small>${esc(c.titulo ?? ', ')}</small></td>
            <td class="abrir"></td>
          </tr>`).join('') : '<tr><td colspan="6" class="note">No code issued yet.</td></tr>');
    },
    csv: (filas) => [
      ['code', 'name', 'channel', 'whatsapp', 'telegram', 'email', 'who_answers'],
      ...filas.map((c) => [c.codigo, c.nombre, CANAL[c.canal] ?? c.canal, c.whatsapp ?? '',
        c.telegram ?? '', c.correo ?? '', c.titulo ?? '']),
    ],
  });

  const f = view().querySelector('#dev-nuevo-codigo');
  // The chosen face, shown before it is sent: an upload that cannot be seen is a guess.
  const entradaFoto = f.querySelector('input[name="foto"]');
  const vista = view().querySelector('#dev-vista-foto');
  entradaFoto.addEventListener('change', () => {
    const archivo = entradaFoto.files?.[0];
    if (!archivo) { vista.hidden = true; return; }
    vista.hidden = false;
    vista.innerHTML = `<img alt="" src="${URL.createObjectURL(archivo)}">
      <span>${esc(archivo.name)} · ${Math.round(archivo.size / 1024)} KB</span>`;
  });

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cuerpo = Object.fromEntries(new FormData(f));
    for (const k of ['whatsapp', 'telegram', 'correo', 'titulo']) if (!cuerpo[k]) delete cuerpo[k];
    delete cuerpo.foto;
    try {
      const archivo = entradaFoto.files?.[0];
      if (archivo) {
        const subida = await api.subirImagen(archivo);
        cuerpo.foto = subida.url;
      }
      const alta = await api.devReferralCreate(cuerpo);
      DATOS = null;
      diRespuesta('dev-broker', true,
        `${esc(cuerpo.nombre)} designated. Their code is <b>${esc(alta?.codigo ?? '')}</b>, give it to them as it is.`);
      setTimeout(() => viewDevBrokers(), 900);
    } catch (err) {
      diRespuesta('dev-broker', false, err);
    }
  });
}

/* ---------------------------------------------------------------- La agencia */

export async function viewDevAgency() {
  await conDatos('#/dev/agency', (x) => {
    const ventas = x.ventas.ventas ?? [];
    const conCanal = ventas.filter((v) => v.cobro?.canal && v.cobro.canal !== 'directo');
    const porCanal = {};
    for (const v of conCanal) {
      const k = v.cobro.canal;
      porCanal[k] = (porCanal[k] ?? 0) + filsDe(v);
    }
    const filas = Object.entries(porCanal).map(([canal, valor]) => `
      <tr>
        <td><b>${esc(CANAL[canal] ?? canal)}</b></td>
        <td class="num">${conCanal.filter((v) => v.cobro?.canal === canal).length}</td>
        <td class="num">${esc(money(valor))}</td>
        <td class="abrir"></td>
      </tr>`).join('');

    return `
      ${avisosDeCabecera(x.yo)}
      <div class="dev-dos dev-dos-c">
        ${tarjetaGrafica({ titulo: 'What came through a channel, in dirhams', icono: 'llave',
          id: 'dev-grafica-canales', alto: 170,
          nota: 'Contract prices of the sales each channel opened. Direct is money that came without a code.' })}
      </div>
      <section class="mod">
        <header>${ico('llave', 15)}<h4>The agency</h4></header>
        <p class="note">The agency is the organisation that sells for you: <b>you bring it and you set
          the fee it keeps</b>. For a sale it runs, it takes NDC's place as the agency of that sale
          and appoints its own brokers. It never sees the buyer's identity check, and everything it
          does travels through the platform.</p>
        <div class="dev-mini">
          <span><b>2.50%</b> contractual fee · set by the developer</span>
          <span><b>0.50%</b> toll it pays: <b>0.30%</b> to NDC · <b>0.20%</b> to BlockEstate</span>
        </div>
        <p class="note">Those figures come from the fee table of the platform, the same engine that
          splits every sale, and not from this screen.</p>
      </section>

      <section class="mod">
        <header>${ico('trato', 15)}<h4>What came through a channel</h4></header>
        <p class="note">Sales attributed to a broker or a creator: that is what the agency works with.</p>
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>Channel</th><th class="num">Sales</th><th class="num">Value</th><th></th></tr></thead>
            <tbody>${filas || '<tr><td colspan="4" class="note">No sale through a channel yet.</td></tr>'}</tbody>
          </table>
        </div>
      </section>

      <section class="mod">
        <header>${ico('permiso', 15)}<h4>What the platform does not have yet</h4></header>
        <p class="note">The agency exists in the data model, with its fee and its toll, and it is the
          developer who appoints it. What is <b>not built</b> is the desk that registers an agency and
          its brokers by name: today the attribution travels through the referral codes (see
          <a href="#/dev/brokers">Brokers</a>). This screen says so rather than showing a form that
          would do nothing.</p>
      </section>`;
  });
}

/* ---------------------------------------------------------------- La organización */

export async function viewDevOrg() {
  await conDatos('#/dev/org', (x) => {
    const suyas = x.unidades.unidades ?? [];
    return `
      ${avisosDeCabecera(x.yo)}
      <div class="dev-dos dev-dos-arriba">
        <section class="mod">
          <header>${ico('sello', 15)}<h4>${esc(x.yo.nombre)}</h4>
            ${etiqueta(x.yo.estado === 'approved' ? 'Approved' : x.yo.estado,
              x.yo.estado === 'approved' && x.yo.activo ? 'green' : '')}</header>
          <dl class="kv">
            ${dato('State', x.yo.estado === 'approved' ? 'Approved' : x.yo.estado)}
            ${dato('Account', x.yo.activo ? 'Active' : 'Switched off')}
            ${dato('Trade licence', x.yo.licencia_comercial)}
            ${dato('Registration', x.yo.n_registro)}
            ${dato('Representative', x.yo.representante)}
            ${dato('Reviewed', x.yo.revisado_en ? date(x.yo.revisado_en) : 'Pending review')}
            ${dato('Units on the book', String(suyas.length))}
            ${dato('Projects', String((x.proyectos.proyectos ?? []).length))}
          </dl>
          <p class="note">Onboarding is reviewed by hand by NDC: an organisation that is not approved
            and active cannot publish, and that check is not automated. Nothing on this screen
            changes it.</p>
        </section>

        <section class="mod">
          <header>${ico('almohadilla', 15)}<h4>What this portal never shows</h4></header>
          <p class="note">The buyer's identity check, and any figure that is
            not your own. Your portal carries your part of the money and nothing else: the split is
            frozen only when the dirhams have reached your account, and ownership is asserted only
            when the closing is signed and the registration is recorded.</p>
          <p class="note">The team desk, inviting administrators, contributors and brokers by name,
            with their permissions, is <b>not built</b> either. Today a code is what designates who
            sells, and NDC is who creates the accounts.</p>
        </section>
      </div>`;
  });
}

/* ------------------------------------------------------------------ una venta */

export async function viewDevSale(id) {
  view().innerHTML = `
    <div class="lab"><span>Developer portal</span><span class="dash"></span></div>
    <div class="dev-carga">${loading(3)}</div>`;
  let v;
  try {
    v = await api.devSale(id);
  } catch (err) {
    view().innerHTML = `<div class="lab"><span>Developer portal</span><span class="dash"></span></div>
      ${empty('This sale is not yours to see', 'The sale you asked for is not in this book.', '')}`;
    void err;
    return;
  }
  const nombre = `${tipoLabel(v.unidad?.tipo)} in ${v.proyecto ?? ''}`;
  await conDatos('#/dev/sales', (x) => cuerpoVenta(v, x), '', nombre);
}

/** El cuerpo de una venta: qué se vendió, por dónde va, y qué parte del dinero es suya. */
function cuerpoVenta(v, x) {
  const c = v.cobro ?? {};
  const aqui = PASOS.indexOf(v.estado);
  const linea = PASOS.map((p, i) => `
    <div class="dev-paso${i === aqui ? ' aqui' : ''}${i < aqui ? ' hecho' : ''}">
      <span class="punto"></span><span>${esc(VENTA[p] ?? p)}</span>
    </div>`).join('');
  const enCalle = !PASOS.includes(v.estado);

  return `
    ${avisosDeCabecera(x.yo)}
    <p class="muted">${etiqueta(VENTA[v.estado] ?? v.estado,
      v.estado === 'business_completion_approved' ? 'green' : '')}${
      v.creada_en ? ` · reserved ${esc(date(v.creada_en))}` : ''} ·
      <a href="#/dev/sales">back to the sales</a></p>
    <div class="lay">
      <div>
        <section class="mod">
          <header>${ico('trato', 15)}<h4>The sale</h4></header>
          <dl class="kv">
            ${dato('Contract price', v.precio_aed)}
            ${dato('Unit', [tipoLabel(v.unidad?.tipo),
              v.unidad?.habitaciones ? `${v.unidad.habitaciones} bed` : null,
              v.unidad?.superficie_sqft ? `${v.unidad.superficie_sqft.toLocaleString('en-GB')} sqft` : null].filter(Boolean).join(' · '))}
            ${dato('Where', [v.unidad?.comunidad ?? v.proyecto, v.unidad?.emirato].filter(Boolean).join(' · '))}
            ${dato('Channel', CANAL[c.canal] ?? c.canal)}
            ${dato('Registration', v.estado_registro === 'registered'
              ? 'Registered with the Land Department' : 'Not registered yet')}
          </dl>
          <p class="note">A sale is a sale. Ownership is only asserted when the closing is signed and
            the registration is recorded.</p>
        </section>

        <section class="mod">
          <header>${ico('avance', 15)}<h4>Where it stands</h4></header>
          ${linea}
          ${enCalle ? `<p class="note">This sale is outside the main path: <b>${esc(VENTA[v.estado] ?? v.estado)}</b>.
            A person is looking at it; nothing moves on its own.</p>` : ''}
        </section>

        <section class="mod">
          <header>${ico('banco', 15)}<h4>Your collection</h4></header>
          <dl class="kv">
            ${dato('Settlement', enIngles(c.estado, COBRO, 'Pending the bank'))}
            ${dato('Bank', c.banco)}
            ${dato('Provider', c.proveedor)}
            ${dato('Conversion', c.referencia, true)}
            ${dato('AED in your account', c.aed_liquidado)}
            ${dato('Your share', c.neto_aed)}
          </dl>
          <p class="note">${esc(c.afirmacion ?? '')}. The split is frozen only when the dirhams have
            reached your account; before that there is nothing to promise.</p>
        </section>
      </div>

      <aside class="rail">
        <div class="rail-box">
          <h3>${ico('almohadilla', 15)} Nothing else</h3>
          <p class="note">This screen carries your part of the money. What the buyer paid in fees, and
            anything about their identity check, is not shown here and is not yours to see.</p>
        </div>
        <div class="rail-box">
          <h3>${ico('obra', 15)} The unit</h3>
          <p class="note">Open the property sheet to see it as the buyer sees it, badge and all.</p>
          ${v.unidad_id ? `<a class="btn ghost" href="#/unit/${esc(v.unidad_id)}">Open the unit</a>` : ''}
        </div>
      </aside>
    </div>`;
}

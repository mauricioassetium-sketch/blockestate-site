/**
 * Compare prices by area: the map of zones, not of listings.
 *
 * The reference (Property Finder) paints each community as a polygon. We do not have community
 * boundaries yet, so this draws a bubble at the community's centre, sized by how many units it has and
 * coloured by its median price. It says so on the screen: the centre is approximate and comes from
 * OpenStreetMap, and the numbers are sale prices in dirhams, not rent.
 *
 * Everything the panel shows is a fact of the catalogue: the median (not the mean), the lowest, the
 * highest, the price per square foot and how many units back it.
 */
import { api } from '../api.js';
import { esc, money } from '../ui.js';

const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/';
const TESELAS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUCION = '&copy; OpenStreetMap';

const TIPOS = [['', 'Any type'], ['apartment', 'Apartments'], ['villa', 'Villas'], ['retail', 'Retail'], ['office', 'Offices']];
const DORM = [['', 'Any'], ['0', 'Studio'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5+']];

let mapa = null;
let capa = null;
let zonas = [];
let elegida = null;
let filtros = { emirato: '', tipo: '', habitaciones: '' };

const view = () => document.getElementById('view');

/** Four bands from the medians themselves: the cut points are the data's, not invented. */
function bandas(valores) {
  const v = [...valores].filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!v.length) return [];
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))];
  const cortes = [q(0), q(0.25), q(0.5), q(0.75), q(1)];
  const unicos = [...new Set(cortes)];
  const colores = ['#DCFCE7', '#86EFAC', '#22C55E', '#15803D', '#0F5132'];
  return unicos.slice(0, -1).map((desde, i) => ({
    desde,
    hasta: unicos[i + 1],
    color: colores[Math.min(i, colores.length - 1)],
  }));
}

const corto = (fils) => {
  const aed = fils / 100;
  if (aed >= 1_000_000) return `AED ${(aed / 1_000_000).toFixed(aed >= 10_000_000 ? 1 : 2)}M`;
  if (aed >= 1_000) return `AED ${Math.round(aed / 1_000)}K`;
  return `AED ${aed.toFixed(0)}`;
};

function colorDe(valor, tramos) {
  if (!tramos.length) return '#94A3B8';
  for (const t of tramos) if (valor <= t.hasta) return t.color;
  return tramos[tramos.length - 1].color;
}

function cargarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = `${LEAFLET}leaflet.css`;
      css.dataset.leaflet = '1';
      document.head.appendChild(css);
    }
    const js = document.createElement('script');
    js.src = `${LEAFLET}leaflet.js`;
    js.onload = () => resolve(window.L);
    js.onerror = () => reject(new Error('Leaflet could not be loaded'));
    document.head.appendChild(js);
  });
}

function filaZona(z) {
  const activa = elegida === z.comunidad ? ' on' : '';
  return `<button type="button" class="zona-fila${activa}" data-zona="${esc(z.comunidad)}">
    <span class="zona-nom">${esc(z.comunidad)}</span>
    <span class="zona-cifra">${esc(money(z.mediana_fils))}</span>
    <span class="zona-n">${z.unidades} ${z.unidades === 1 ? 'property' : 'properties'}</span>
  </button>`;
}

function panelDetalle() {
  const z = zonas.find((x) => x.comunidad === elegida);
  if (!z) {
    return `<div class="zona-detalle vacio">
      <p class="muted">Pick an area on the map or in the list to see what it costs.</p>
    </div>`;
  }
  const sqft = z.mediana_sqft_fils ? `AED ${(z.mediana_sqft_fils / 100).toFixed(0)} / sqft` : 'not enough data';
  return `<div class="zona-detalle">
    <div class="zona-det-tit"><h3>${esc(z.comunidad)}</h3><span class="zona-em">${esc(z.emirato)}</span></div>
    <div class="zona-cifras">
      <div><span>Median</span><b>${esc(money(z.mediana_fils))}</b></div>
      <div><span>Lowest</span><b>${esc(money(z.minimo_fils))}</b></div>
      <div><span>Highest</span><b>${esc(money(z.maximo_fils))}</b></div>
      <div><span>Per sqft</span><b>${esc(sqft)}</b></div>
    </div>
    <a class="btn green zona-cta" href="#/search?comunidad=${encodeURIComponent(z.comunidad)}">
      View ${z.unidades} ${z.unidades === 1 ? 'property' : 'properties'}</a>
    <p class="zona-nota">${z.centro_aproximado
      ? 'The point is the community centre from OpenStreetMap, not a plot: the price is the median of its published units.'
      : 'The point is the average position of the community\'s projects.'}</p>
  </div>`;
}

function pintarPanel() {
  const caja = view().querySelector('#areas-panel');
  if (!caja) return;
  caja.innerHTML = panelDetalle() + `
    <div class="zonas-lista">
      <div class="zonas-lista-cab"><span>Area</span><span>Median</span></div>
      ${zonas.map(filaZona).join('')}
    </div>`;
  for (const b of caja.querySelectorAll('[data-zona]')) {
    b.addEventListener('click', () => elegir(b.dataset.zona));
  }
}

function elegir(nombre) {
  elegida = nombre;
  pintarPanel();
  pintarBurbujas();
  const z = zonas.find((x) => x.comunidad === nombre);
  if (z && mapa && Number.isFinite(z.latitud) && Number.isFinite(z.longitud)) {
    mapa.panTo([z.latitud, z.longitud], { animate: true });
  }
}

function pintarLeyenda(tramos) {
  const caja = view().querySelector('#areas-mapa');
  if (!caja) return;
  let ley = caja.querySelector('.areas-leyenda');
  if (!ley) {
    ley = document.createElement('div');
    ley.className = 'areas-leyenda';
    caja.appendChild(ley);
  }
  if (!tramos.length) { ley.innerHTML = ''; return; }
  ley.innerHTML = `
    <div class="ley-tit">Median price</div>
    ${tramos.map((t) => `<div class="ley-fila"><i style="background:${t.color}"></i>
      <span>${esc(corto(t.desde))} – ${esc(corto(t.hasta))}</span></div>`).join('')}
    <div class="ley-nota">Bubble size = number of units</div>`;
}

function pintarBurbujas() {
  if (!window.L || !mapa || !capa) return;
  capa.clearLayers();
  const tramos = bandas(zonas.map((z) => z.mediana_fils));
  pintarLeyenda(tramos);
  const maxN = Math.max(1, ...zonas.map((z) => z.unidades));
  for (const z of zonas) {
    if (!Number.isFinite(z.latitud) || !Number.isFinite(z.longitud)) continue;
    const r = 16 + 22 * Math.sqrt(z.unidades / maxN);
    const on = z.comunidad === elegida;
    const c = L.circleMarker([z.latitud, z.longitud], {
      radius: on ? r + 4 : r,
      color: on ? '#0B1220' : '#ffffff',
      weight: on ? 3 : 2,
      fillColor: colorDe(z.mediana_fils, tramos),
      fillOpacity: 0.85,
    }).addTo(capa);
    c.bindTooltip(`${esc(z.comunidad)} · ${esc(money(z.mediana_fils))}`, { direction: 'top', offset: [0, -6] });
    c.on('click', () => elegir(z.comunidad));
  }
}

async function cargar() {
  const caja = view().querySelector('#areas-panel');
  caja.innerHTML = '<p class="muted">Loading the areas…</p>';
  try {
    const datos = await api.priceMap(filtros);
    zonas = datos.zonas ?? [];
  } catch (e) {
    caja.innerHTML = `<p class="msg err">The areas could not be loaded. ${esc(e?.message ?? '')}</p>`;
    return;
  }
  if (!elegida || !zonas.some((z) => z.comunidad === elegida)) elegida = zonas[0]?.comunidad ?? null;
  pintarPanel();
  pintarBurbujas();
  const nota = view().querySelector('#areas-nota');
  if (nota) {
    nota.textContent = zonas.length
      ? `${zonas.length} areas with published units. Sale prices in dirhams; the crypto equivalent lives on each listing.`
      : 'No area has published units with these filters.';
  }
}

function chips(nombre, valores, actual) {
  return valores.map(([v, etiqueta]) =>
    `<button type="button" class="chip${actual === v ? ' on' : ''}" data-filtro="${nombre}" data-valor="${v}">${esc(etiqueta)}</button>`).join('');
}

export async function viewAreas() {
  view().innerHTML = `
    <div class="areas">
      <div class="areas-cab">
        <div class="lab"><span>Prices</span><span class="dash"></span></div>
        <h1>Compare prices by area</h1>
        <p class="muted" id="areas-nota">Sale prices in dirhams, grouped by community.</p>
      </div>
      <div class="areas-filtros">
        <div class="filtro-chips"><span class="filtro-lab">Type</span>${chips('tipo', TIPOS, filtros.tipo)}</div>
        <div class="filtro-chips"><span class="filtro-lab">Beds</span>${chips('habitaciones', DORM, filtros.habitaciones)}</div>
      </div>
      <div class="areas-lay">
        <div class="areas-panel" id="areas-panel"></div>
        <div class="areas-mapa" id="areas-mapa"></div>
      </div>
    </div>`;

  for (const b of view().querySelectorAll('[data-filtro]')) {
    b.addEventListener('click', () => {
      const campo = b.dataset.filtro;
      filtros = { ...filtros, [campo]: b.dataset.valor };
      for (const otro of view().querySelectorAll(`[data-filtro="${campo}"]`)) {
        otro.classList.toggle('on', otro === b);
      }
      elegida = null;
      cargar();
    });
  }

  await cargar();

  try {
    const L = await cargarLeaflet();
    const caja = view().querySelector('#areas-mapa');
    if (mapa) { mapa.remove(); mapa = null; }
    mapa = L.map(caja, { scrollWheelZoom: true }).setView([25.15, 55.22], 10);
    L.tileLayer(TESELAS, { maxZoom: 19, attribution: ATRIBUCION }).addTo(mapa);
    capa = L.layerGroup().addTo(mapa);
    pintarBurbujas();
    if (zonas.length) {
      const pts = zonas.filter((z) => Number.isFinite(z.latitud)).map((z) => [z.latitud, z.longitud]);
      if (pts.length) mapa.fitBounds(pts, { padding: [48, 48], maxZoom: 11 });
    }
    setTimeout(() => mapa?.invalidateSize(), 80);
  } catch {
    const caja = view().querySelector('#areas-mapa');
    if (caja) caja.innerHTML = '<p class="muted" style="padding:18px">The map could not be loaded. The figures on the left are still the real ones.</p>';
  }
}

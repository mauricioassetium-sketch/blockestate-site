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
// OpenStreetMap, aclarado por CSS: CARTO y Mapbox piden clave para producción y sin ella las
// teselas salen con la marca de agua «API KEY REQUIRED».
const TESELAS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUCION = '&copy; OpenStreetMap';

// Nuestro nombre de comunidad → el nombre oficial del polígono del municipio. Dubai Municipality no
// llama «Dubai Marina» a Dubai Marina: es MARSA DUBAI. Sin esta tabla, cuatro de nuestras seis zonas
// se quedarían en gris aunque tengan datos.
const POLIGONO = {
  'Dubai Marina': 'MARSA DUBAI',
  'Palm Jumeirah': 'NAKHLAT JUMEIRA',
  'Downtown Dubai': 'BURJ KHALIFA',
  'Business Bay': 'BUSINESS BAY',
};

const TIPOS = [['', 'Any type'], ['apartment', 'Apartments'], ['villa', 'Villas'], ['retail', 'Retail'], ['office', 'Offices']];
const DORM = [['', 'Any'], ['0', 'Studio'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5+']];

let mapa = null;
let capa = null;
let zonas = [];
let elegida = null;
let filtros = { emirato: '', tipo: '', habitaciones: '' };
let geo = null;          // los 224 polígonos del municipio, cargados una vez
let geoPromesa = null;

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
      <p class="muted">Pick an area on the map to see what it costs.</p>
    </div>`;
  }
  const sqft = z.mediana_sqft_fils ? `AED ${(z.mediana_sqft_fils / 100).toFixed(0)}/sqft` : '—';
  return `<div class="zona-detalle">
    <div class="zona-det-tit">
      <h2>${esc(z.comunidad)}</h2>
      <span class="zona-em">${esc(z.emirato)}</span>
    </div>
    <div class="zona-tipo">Sale · ${z.unidades} ${z.unidades === 1 ? 'property' : 'properties'} published</div>

    <div class="zona-precio">
      <span class="zona-precio-lab">Median</span>
      <b>${esc(money(z.mediana_fils))}</b>
      <span class="zona-sqft">${esc(sqft)}</span>
    </div>

    <div class="zona-cifras">
      <div><span>Highest</span><b>${esc(money(z.maximo_fils))}</b></div>
      <div><span>Average</span><b>${esc(money(z.media_fils ?? z.mediana_fils))}</b></div>
      <div><span>Lowest</span><b>${esc(money(z.minimo_fils))}</b></div>
    </div>

    <a class="btn green zona-cta" href="#/search?comunidad=${encodeURIComponent(z.comunidad)}">
      View ${z.unidades} ${z.unidades === 1 ? 'property' : 'properties'}</a>
    <p class="zona-nota">${POLIGONO[z.comunidad]
      ? 'Boundary: Dubai Municipality community divisions (Dubai Pulse). Median of the units published in it, not a valuation of the area.'
      : 'No municipal boundary for this community yet: shown as a point at its approximate centre.'}</p>
  </div>`;
}

function pintarPanel() {
  const caja = view().querySelector('#areas-panel');
  if (!caja) return;
  caja.innerHTML = `
    <div class="areas-filtros">
      <div class="filtro-chips"><span class="filtro-lab">Type</span>${chips('tipo', TIPOS, filtros.tipo)}</div>
      <div class="filtro-chips"><span class="filtro-lab">Beds</span>${chips('habitaciones', DORM, filtros.habitaciones)}</div>
    </div>
    ${panelDetalle()}
    <p class="zona-hint">Click any area on the map to compare it.</p>`;
  for (const b of caja.querySelectorAll('[data-filtro]')) {
    b.addEventListener('click', () => {
      const campo = b.dataset.filtro;
      filtros = { ...filtros, [campo]: b.dataset.valor };
      for (const otro of caja.querySelectorAll(`[data-filtro="${campo}"]`)) otro.classList.toggle('on', otro === b);
      elegida = null;
      cargar();
    });
  }
}

function elegir(nombre) {
  elegida = nombre;
  pintarPanel();
  pintarBurbujas();
  const z = zonas.find((x) => x.comunidad === nombre);
  if (!z || !mapa) return;
  // Encuadrar la zona: la referencia lleva el mapa al barrio elegido, no deja al usuario buscándolo.
  const oficial = POLIGONO[z.comunidad];
  if (window.L && geo && oficial) {
    const capaZona = L.geoJSON(geo, { filter: (f) => f.properties?.name === oficial, style: { opacity: 0, fillOpacity: 0 } }).addTo(mapa);
    const b = capaZona.getBounds();
    capaZona.remove();
    if (b.isValid()) { mapa.fitBounds(b, { padding: [40, 40], maxZoom: 14 }); return; }
  }
  if (Number.isFinite(z.latitud) && Number.isFinite(z.longitud)) {
    mapa.flyTo([z.latitud, z.longitud], 13, { duration: .6 });
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
    <div class="ley-nota"><i style="background:#DDE7F0"></i>No published units<br><i style="background:#BBD7F2"></i>Selected area<br>Bubble = no boundary yet</div>`;
}

function pintarBurbujas() {
  if (!window.L || !mapa || !capa) return;
  capa.clearLayers();
  const tramos = bandas(zonas.map((z) => z.mediana_fils));
  pintarLeyenda(tramos);
  const porPoligono = {};
  for (const z of zonas) {
    const nombre = POLIGONO[z.comunidad];
    if (nombre) porPoligono[nombre] = z;
  }

  // Los polígonos del municipio: los que tienen datos, por banda; el resto, gris tenue para que se
  // vea que la zona existe pero no hay unidades publicadas.
  if (geo) {
    L.geoJSON(geo, {
      style: (f) => {
        const z = porPoligono[f.properties?.name];
        const on = z && z.comunidad === elegida;
        return {
          // La zonificación se lee por el borde: blanco en las zonas con datos, gris tenue en las que
          // no los tienen, y negro en la elegida. Sin borde, dos verdes contiguos se funden.
          // Todas las zonas se marcan: azul muy claro las que no tienen unidades, blanco el borde.
          // Si solo se pintan las que tienen datos, el mapa parece vacío y no se lee la zonificación.
          color: on ? '#0B1220' : '#FFFFFF',
          weight: on ? 2.6 : 1.1,
          // La zona elegida va en azul claro con borde negro, como en la referencia: el color de la
          // banda dice cuánto cuesta, y el azul dice cuál estás mirando. Mezclar las dos cosas en
          // verde hacía que la selección se confundiera con una banda de precio.
          fillColor: on ? '#BBD7F2' : (z ? colorDe(z.mediana_fils, tramos) : '#DDE7F0'),
          fillOpacity: on ? 0.95 : (z ? 0.88 : 0.72),
        };
      },
      onEachFeature: (f, capaPol) => {
        const z = porPoligono[f.properties?.name];
        // Etiqueta en todas las zonas: de cerca se leen los barrios vecinos, que es lo que da contexto
        // en la referencia. Las que no tienen datos van más tenues y solo aparecen al acercarse.
        if (window.L && f.properties?.name) {
          const centro = capaPol.getBounds().getCenter();
          const clase = z ? 'etiqueta-zona' : 'etiqueta-zona etiqueta-tenue';
          L.marker(centro, {
            interactive: false,
            icon: L.divIcon({
              className: 'etiqueta-wrap',
              html: `<span class="${clase}">${esc(z ? z.comunidad : f.properties.name)}</span>`,
              iconSize: [0, 0],
            }),
          }).addTo(capa);
        }
        if (!z) return;
        capaPol.bindTooltip(`${esc(z.comunidad)} · ${esc(money(z.mediana_fils))}`, { direction: 'top', sticky: true });
        capaPol.on('click', () => elegir(z.comunidad));
        capaPol.on('mouseover', () => capaPol.setStyle({ weight: 2.2 }));
        capaPol.on('mouseout', () => capaPol.setStyle({ weight: z.comunidad === elegida ? 2.6 : 1.6 }));
      },
    }).addTo(capa);
  }

  // Lo que no tiene polígono (hoy Deira y Yas Island) sigue como burbuja, y se dice.
  const maxN = Math.max(1, ...zonas.map((z) => z.unidades));
  for (const z of zonas) {
    if (POLIGONO[z.comunidad]) continue;
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
    c.bindTooltip(`${esc(z.comunidad)} · ${esc(money(z.mediana_fils))}`, { direction: 'top' });
    c.on('click', () => elegir(z.comunidad));
  }
}

function cargarGeo() {
  if (geo) return Promise.resolve(geo);
  if (!geoPromesa) {
    geoPromesa = fetch('geo/comunidades.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { geo = d; return d; })
      .catch(() => null);
  }
  return geoPromesa;
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
      <div class="areas-mapa" id="areas-mapa"></div>
      <aside class="areas-panel" id="areas-panel"></aside>
    </div>`;

  await cargarGeo();
  await cargar();

  try {
    const L = await cargarLeaflet();
    const caja = view().querySelector('#areas-mapa');
    if (mapa) { mapa.remove(); mapa = null; }
    mapa = L.map(caja, { scrollWheelZoom: true }).setView([25.15, 55.22], 10);
    L.tileLayer(TESELAS, { maxZoom: 19, attribution: ATRIBUCION }).addTo(mapa);
    mapa.attributionControl.addAttribution('Community divisions: Dubai Municipality · Dubai Pulse');
    capa = L.layerGroup().addTo(mapa);
    pintarBurbujas();
    if (geo) {
      const capaGeo = L.geoJSON(geo).addTo(mapa);
      const b = capaGeo.getBounds();
      capaGeo.remove();
      if (b.isValid()) mapa.fitBounds(b, { padding: [30, 30] });
    } else if (zonas.length) {
      const pts = zonas.filter((z) => Number.isFinite(z.latitud)).map((z) => [z.latitud, z.longitud]);
      if (pts.length) mapa.fitBounds(pts, { padding: [48, 48], maxZoom: 11 });
    }
    const marcarZoom = () => mapa.getContainer().classList.toggle('zoom-cerca', mapa.getZoom() >= 12);
    mapa.on('zoomend', marcarZoom);
    marcarZoom();
    setTimeout(() => mapa?.invalidateSize(), 80);
  } catch {
    const caja = view().querySelector('#areas-mapa');
    if (caja) caja.innerHTML = '<p class="muted" style="padding:18px">The map could not be loaded. The figures on the left are still the real ones.</p>';
  }
}

/**
 * The map of the results.
 *
 * Each card with coordinates gets a **price marker**; hovering a card raises its marker, and clicking
 * a marker highlights its card and opens a small card with the figures — the shape the market uses
 * (Bayut): a light basemap, the price on every pin, and the figures when you press one.
 *
 * Two things this file learned the hard way, and both are why it looked broken:
 *
 *  · `pintarMapa` is called twice in a row — the search repaints once with the first answer and once
 *    with the complete one. Being `async`, the second call passed the `if (!mapa)` test while the
 *    first was still waiting for the library, took the reuse branch, and **wiped the container with
 *    `innerHTML = ''`**: Leaflet's panes, its zoom control and its attribution lived in there. The
 *    map object survived with no DOM under it, so the screen showed no tiles at all. The calls are
 *    serialised now, and Leaflet's DOM is never touched: it lives in a child of its own.
 *  · The map is created inside that child, so repainting the view can empty the outer box as much as
 *    it likes.
 *
 * Leaflet and the tiles come from the network, so they are loaded the first time the map is opened,
 * and if there is no connection the map says so instead of pretending to be a map.
 */
import { areaTxt, esc, ico, money } from '../ui.js';

const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/';

/**
 * Mauricio pidió el mapa de Google. **Google no sirve mapas sin clave**: su API se cobra y se autoriza
 * con una clave de Google Cloud (Map Tiles API, con facturación activada). Sin clave no hay teselas de
 * Google: lo único que existe sin clave son direcciones no oficiales que van contra sus términos y que
 * un día devuelven el mapa en blanco.
 *
 * Así que la clave va aquí, en una sola línea. Puesta, el mapa usa Google. Vacía, usa OpenStreetMap
 * con el color quitado por CSS (el mismo aspecto claro de los portales, sin clave). No hay tercer
 * camino que sea legítimo.
 *
 * Ojo al restringir la clave en Google Cloud: por referrer HTTP a blockestate.ae (una clave de
 * navegador es pública por definición) y sólo con «Map Tiles API» habilitada.
 */
const CLAVE_GOOGLE = '';
const ESTILO_GOOGLE = 'roadmap';   // roadmap (el de siempre) · satellite · terrain

const TESELAS_OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUCION_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Las teselas de Google, por su API oficial de teselas 2D.
 *
 * Pide primero una sesión (POST a createSession) y luego pide las teselas con ese `session` y la
 * clave. La sesión dura unas dos semanas: cuando el backend exista, la crea y la cachea él, y la clave
 * deja de viajar al navegador. Aquí se hace en el navegador porque el mapa vive en un paquete que no
 * tiene servidor propio.
 */
async function capaGoogle(L, clave) {
  const r = await fetch(`https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(clave)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mapType: ESTILO_GOOGLE, language: 'en', region: 'AE' }),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok || !datos.session) {
    throw new Error(datos?.error?.message ?? 'Google did not hand out a map session.');
  }
  return L.tileLayer(
    `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${datos.session}&key=${encodeURIComponent(clave)}`,
    { maxZoom: 22, attribution: '&copy; Google' },
  );
}
let libreria = null;

function cargarLeaflet() {
  if (libreria) return libreria;
  // Si la librería ya está en la página (otra visita, una precarga, otro módulo), se usa tal cual.
  // Sin esta comprobación se inyecta un segundo <script> del mismo fichero, el navegador lo sirve de
  // caché y su `onload` no se dispara: la promesa se queda colgada y el mapa nunca se pinta.
  if (window.L) { libreria = Promise.resolve(window.L); return libreria; }
  libreria = new Promise((ok, fallo) => {
    let zanjado = false;
    const terminar = (fn, v) => { if (!zanjado) { zanjado = true; fn(v); } };
    // Tope de tiempo: si el script no contesta ni bien ni mal, se falla y se avisa en pantalla en
    // vez de dejar el mapa en blanco sin decir nada.
    const reloj = setTimeout(
      () => terminar(fallo, new Error('The map library did not answer in time.')), 8000,
    );
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${LEAFLET}leaflet.css`;
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = `${LEAFLET}leaflet.js`;
    js.onload = () => {
      clearTimeout(reloj);
      if (window.L) terminar(ok, window.L);
      else terminar(fallo, new Error('The map library did not load.'));
    };
    js.onerror = () => {
      clearTimeout(reloj);
      terminar(fallo, new Error('The map could not be loaded: no connection with the map service.'));
    };
    document.head.appendChild(js);
  });
  // Un fallo no se cachea: el siguiente intento vuelve a probar, en vez de arrastrar el error.
  libreria = libreria.catch((e) => { libreria = null; throw e; });
  return libreria;
}

/** A price as short as it can be read: AED 1.5M, AED 950K. */
export function precioCorto(fils) {
  const n = Number(fils ?? 0) / 100;
  const corto = n >= 1e6 ? `AED ${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : `AED ${Math.round(n / 1e3)}K`;
  return corto.replace(/\.0M$/, 'M');
}

let mapa = null;
let capa = null;
/** El div propio donde vive Leaflet: el contenedor de la vista puede vaciarse sin tocarlo. */
let lienzoMapa = null;
/** El contenedor de esta pasada, para saber si la vista lo ha sustituido por otro. */
let mapaEn = null;
/** El ajuste de altura a la ventana se engancha una sola vez, aunque el mapa se vuelva a montar. */
let ajustePuesto = false;
const marcadores = new Map();

/** Las cifras, en el orden en que las lee el mercado: camas, baños, superficie. */
function cifrasDe(r) {
  return [
    r.habitaciones ? `${ico('cama', 14)} ${r.habitaciones} ${r.habitaciones === 1 ? 'bed' : 'beds'}` : '',
    r.banos ? `${ico('bano', 14)} ${r.banos} ${r.banos === 1 ? 'bath' : 'baths'}` : '',
    r.superficie_sqft ? `${ico('area', 14)} ${areaTxt(r.superficie_sqft)}` : '',
  ].filter(Boolean).join('');
}

/** La tarjeta que se abre al pulsar una chincheta: precio, cifras y el enlace a la ficha. */
function fichaDeMapa(r) {
  return `<div class="mapa-ficha">
    <b>${esc(r.precio_aed ?? money(r.precio_fils))}</b>
    <span class="mapa-ficha-datos">${cifrasDe(r)}</span>
    ${r.titulo ? `<span class="mapa-ficha-dir">${esc(r.titulo)}</span>` : ''}
    ${r.aviso_ubicacion ? `<span class="mapa-ficha-aviso">${esc(r.aviso_ubicacion)}</span>` : ''}
    <a class="mapa-ficha-ir" href="#/unit/${esc(r.unidad_id)}">View the property</a>
  </div>`;
}

/**
 * La cola que deja una sola pintada a la vez. Dos pintadas a la vez es lo que mató el mapa: la
 * segunda no veía mapa todavía, tomaba el camino de reutilizar y vaciaba el contenedor donde Leaflet
 * estaba dibujando.
 */
let colaMapa = Promise.resolve();

export function pintarMapa(contenedor, resultados, opciones = {}) {
  colaMapa = colaMapa.then(() => dibujarMapa(contenedor, resultados, opciones)).catch(() => {});
  return colaMapa;
}

async function dibujarMapa(contenedor, resultados, { alElegir } = {}) {
  const el = typeof contenedor === 'string' ? document.querySelector(contenedor) : contenedor;
  if (!el) return;
  const todos = resultados ?? [];
  const conPunto = todos.filter((r) => r.latitud !== null && r.longitud !== null);

  if (!conPunto.length) {
    el.innerHTML = `<div class="mapa-aviso">No property in this result carries a location yet, so there
      is nothing to place on the map.</div>`;
    return;
  }

  let L;
  try {
    L = await cargarLeaflet();
  } catch (err) {
    el.innerHTML = `<div class="mapa-aviso">${esc(err.message)}</div>`;
    return;
  }

  /**
   * El mapa, tan alto como quepa en la pantalla: de la barra para abajo. Antes se le daba lo que
   * quedaba POR DEBAJO de él (ventana menos su propia posición), y como el buscador y los filtros
   * ocupan 373px, el mapa se quedaba en 450 de alto sobre una ventana de 900. Ahora se lleva la
   * ventana entera bajo la barra —823— y, al ser pegajoso, al bajar un poco queda a pantalla completa.
   */
  function ajustarAlto() {
    const barra = document.querySelector('header.top')?.getBoundingClientRect().height ?? 61;
    // El mapa no arranca pegado a la barra: debajo van el buscador y los filtros. Se mide su posición
    // real, o el alto calculado (ventana menos barra) lo deja saliéndose por abajo de la pantalla.
    const arriba = Math.max(0, Math.round(el.getBoundingClientRect().top));
    const alto = Math.max(420, Math.round(window.innerHeight - arriba - 16));
    el.style.height = `${alto}px`;
    if (mapa) mapa.invalidateSize();
  }

  // El mapa se crea una vez, dentro de un div propio. Si la vista ha sustituido el contenedor (otra
  // pantalla, otro repintado), el mapa viejo se descarta y se hace uno nuevo: reutilizarlo sería
  // dibujar en un nodo que ya no está en la página.
  if (!mapa || mapaEn !== el || !mapa.getContainer() || !el.contains(mapa.getContainer())) {
    el.innerHTML = '';
    lienzoMapa = document.createElement('div');
    lienzoMapa.className = 'mapa-lienzo';
    el.appendChild(lienzoMapa);
    mapa = L.map(lienzoMapa, { zoomControl: true, attributionControl: true })
      .setView([conPunto[0].latitud, conPunto[0].longitud], 11);
    // Google si hay clave; si no hay, o si Google no contesta, el fondo claro de OpenStreetMap. La
    // clase del contenedor decide si se le aplica el filtro de color (sólo a las teselas de OSM).
    if (CLAVE_GOOGLE) {
      try {
        (await capaGoogle(L, CLAVE_GOOGLE)).addTo(mapa);
        el.classList.add('mapa-google');
      } catch (err) {
        el.classList.remove('mapa-google');
        L.tileLayer(TESELAS_OSM, { maxZoom: 19, attribution: ATRIBUCION_OSM }).addTo(mapa);
        avisoMapa(el, `Google did not answer (${err.message}); showing OpenStreetMap instead.`);
      }
    } else {
      el.classList.remove('mapa-google');
      L.tileLayer(TESELAS_OSM, { maxZoom: 19, attribution: ATRIBUCION_OSM }).addTo(mapa);
    }
    capa = L.layerGroup().addTo(mapa);
    mapaEn = el;
  } else {
    mapa.invalidateSize();
  }

  // El mapa se ajusta a la ventana: su borde inferior no puede caer por debajo de la pantalla. Se
  // recalcula al montarlo y cada vez que cambia el tamaño de la ventana. Al montarlo, la cabecera y
  // la barra de filtros pueden no haber terminado de colocarse: se recalcula en el siguiente cuadro y
  // otra vez un instante después, o el mapa se queda con el alto que le cabía cuando la página estaba
  // más arriba.
  ajustarAlto();
  requestAnimationFrame(ajustarAlto);
  // La lista llega después y empuja el mapa hacia abajo: se vuelve a medir cuando el layout ya está.
  [300, 900, 1600].forEach((t) => setTimeout(ajustarAlto, t));
  if (!ajustePuesto) {
    window.addEventListener('resize', ajustarAlto);
    window.addEventListener('orientationchange', ajustarAlto);
    ajustePuesto = true;
  }

  capa.clearLayers();
  marcadores.clear();
  const puntos = [];

  for (const r of conPunto) {
    const icono = L.divIcon({
      className: 'marca',
      html: `<span>${esc(precioCorto(r.precio_fils))}</span>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    const m = L.marker([r.latitud, r.longitud], { icon: icono, title: r.titulo }).addTo(capa);
    m.bindPopup(fichaDeMapa(r), { className: 'mapa-pop', closeButton: true, offset: [0, -34], minWidth: 236,
      autoPan: true, autoPanPadding: [28, 84] });
    // Pulsar la chincheta abre su tarjeta y marca su ficha en la lista; pasar por encima la resalta.
    m.on('click', () => { alElegir?.(r.unidad_id); resaltar(r.unidad_id, true); });
    m.on('mouseover', () => resaltar(r.unidad_id, true));
    m.on('mouseout', () => resaltar(r.unidad_id, false));
    marcadores.set(r.unidad_id, m);
    puntos.push([r.latitud, r.longitud]);
  }

  // The whole result, in view.
  mapa.fitBounds(puntos, { padding: [48, 48], maxZoom: 14 });
  // Leaflet measures the container when it is created; inside a grid it may need a nudge.
  setTimeout(() => mapa?.invalidateSize(), 60);
  // La columna cambia de alto cuando llega la lista y al cambiar de vista. Sin esto Leaflet conserva
  // el tamaño con el que nació y las teselas no llegan al borde superior: queda una franja gris.
  if (typeof ResizeObserver === 'function' && mapa && !mapa._observando) {
    mapa._observando = true;
    new ResizeObserver(() => mapa.invalidateSize()).observe(mapa.getContainer());
  }

  // Y se dice cuántas se han podido poner: la mayoría de las unidades todavía no trae coordenadas, y
  // callarlo haría creer que el mapa está completo.
  const nota = el.querySelector('.mapa-nota') ?? document.createElement('div');
  nota.className = 'mapa-nota';
  nota.textContent = conPunto.length < todos.length
    ? `${conPunto.length} of ${todos.length} properties carry a location`
    : `${conPunto.length} properties on the map`;
  el.appendChild(nota);
}

/** Un aviso pasajero dentro del mapa: dice lo que ha pasado sin sacar al visitante de la pantalla. */
function avisoMapa(el, texto) {
  const previo = el.querySelector('.mapa-nota-fallo');
  if (previo) previo.remove();
  const n = document.createElement('div');
  n.className = 'mapa-nota mapa-nota-fallo';
  n.textContent = texto;
  el.appendChild(n);
  setTimeout(() => n.remove(), 9000);
}

/** Raises the marker of a card, or marks the chosen one. */
export function resaltar(unidadId, on) {
  const m = marcadores.get(unidadId);
  const nodo = m?.getElement();
  if (!nodo) return;
  nodo.classList.toggle('on', Boolean(on));
}

export function centrarEn(unidadId) {
  const m = marcadores.get(unidadId);
  if (m && mapa) {
    mapa.panTo(m.getLatLng(), { animate: true });
    m.openPopup();
  }
  resaltar(unidadId, true);
}

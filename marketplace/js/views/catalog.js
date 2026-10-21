/** The catalogue: the front page and the search. */
import { api } from '../api.js';
import { AMENIDADES, EMIRATOS, ESTADOS_OBRA, PAGE, TIPOS } from '../config.js';
import { card, empty, error, esc, ico, initPickers, loading, money, picker, toast } from '../ui.js';
import { go } from '../router.js';
import { store } from '../store.js';
import { datosRail, pintarRail } from './rail.js';
import { centrarEn, pintarMapa, resaltar } from './map.js';

const view = () => document.getElementById('view');

const opciones = (mapa, seleccion) => Object.entries(mapa)
  .map(([k, v]) => `<option value="${esc(k)}"${seleccion === k ? ' selected' : ''}>${esc(v)}</option>`)
  .join('');
const lista = (resultados) => `<div class="list">${resultados.map(card).join('')}</div>`;

/**
 * The bar of the catalogue. Following the reference, the axis in the bar is the **state of the
 * build** (All · Ready · Off plan) and the type lives in the controls row, so both can be combined.
 * It belongs to BOTH screens and never drops the rest of the filters, picking an emirate and then
 * Ready keeps the emirate. That was the bug: it only lived on the front page.
 */
const TABS = [
  ['All', {}],
  ['Ready', { estado_obra: 'ready' }],
  ['Off plan', { estado_obra: 'off_plan' }],
];

function tabsHtml(query) {
  const tipo = query.get('tipo') ?? '';
  const obra = query.get('estado_obra') ?? '';
  const enlaces = TABS.map(([texto, extra]) => {
    const activo = extra.estado_obra ? obra === extra.estado_obra : !obra;
    const p = new URLSearchParams(query);
    p.delete('estado_obra');
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    void tipo;
    return `<a class="${activo ? 'on' : ''}" href="#/search${p.toString() ? `?${p}` : ''}">${esc(texto)}</a>`;
  });
  return `<nav class="tabs" aria-label="What we sell">${enlaces.join('')}</nav>`;
}

/** The price ranges, as short bands instead of two boxes: one decision, one click. */
const BANDAS = [
  ['', 'Any'], ['0-1000000', 'Up to 1M'], ['1000000-2000000', '1M to 2M'],
  ['2000000-5000000', '2M to 5M'], ['5000000-10000000', '5M to 10M'], ['10000000-', '10M and up'],
];
const bandaElegida = (min, max) => {
  const v = `${min}-${max}`;
  return BANDAS.some(([k]) => k === v) ? v : '';
};

/* ------------------------------------------------------------------ front page */

export async function viewCatalog() {
  // The front page follows the reference: a photograph, one short line, and the search as the only
  // loud element on the page. The long explanation of the model is not up here, it is what the form
  // and the catalogue say on their own.
  view().innerHTML = `
    <section class="hero">
      <div class="wrap inner">
        <div class="hero-foot">
        <h1>Real homes,<br><span class="verde">paid in digital assets</span></h1>
        <p class="sub">Verified property in the United Arab Emirates</p>

        <div class="buscador">
          <nav class="hero-tabs" aria-label="What we sell">
            ${TABS.map(([texto, extra], i) => `<button type="button" class="${i === 0 ? 'on' : ''}"
              data-obra="${extra.estado_obra ?? ''}" aria-pressed="${i === 0}">${esc(texto)}</button>`).join('')}
          </nav>

          <form class="hero-campos" id="buscador" role="search">
            <label class="hero-q">
              ${ico('pin', 17)}
              <input type="search" name="q" placeholder="Area, project or type"
                aria-label="Search the catalogue">
            </label>
            <button class="btn green" type="submit">Search</button>
          </form>

          <div class="hero-filtros">
            ${picker('hero_emirato', {
              label: 'Location', vacio: 'All emirates',
              grupos: [{ opciones: EMIRATOS.map((e) => ({ valor: e, texto: e })) }],
            })}
            ${picker('hero_tipo', {
              label: 'Type', vacio: 'Any type',
              grupos: [
                { titulo: 'Residential', opciones: [{ valor: 'apartment', texto: 'Apartment' }, { valor: 'villa', texto: 'Villa' }] },
                { titulo: 'Commercial', opciones: [{ valor: 'office', texto: 'Office' }, { valor: 'retail', texto: 'Retail' }] },
                { titulo: 'Other', opciones: [{ valor: 'hotel', texto: 'Hotel' }] },
              ],
            })}
            ${picker('hero_precio', {
              label: 'Price', vacio: 'Any price',
              grupos: [{ opciones: BANDAS.map(([v, t]) => ({ valor: v, texto: t })) }],
            })}
            ${picker('hero_camas', {
              label: 'Beds', vacio: 'Any',
              grupos: [{ opciones: [
                { valor: '0', texto: 'Studio' },
                ...[1, 2, 3, 4, 5].map((n) => ({ valor: String(n), texto: `${n}+` })),
              ] }],
            })}
          </div>

          <p class="hero-pie">Verified before listing · Reserve for 14 days · Identity checked by hand</p>
        </div>
        </div>
      </div>
    </section>

    <div class="wrap">
      <div class="emi">
        <div class="emi-grid">
          <a class="todo" href="#/search">
            <span>All emirates</span><small>every listing</small>
            <i class="go" aria-hidden="true">→</i></a>
          ${EMIRATOS.map((e) => `<a href="#/search?emirato=${encodeURIComponent(e)}">
            <span>${esc(e)}</span><small>properties</small>
            <i class="go" aria-hidden="true">→</i></a>`).join('')}
        </div>
      <section class="promos" aria-label="With BlockEstate">
        <article class="promo promo-dev">
          <div class="promo-txt">
            <span class="promo-lab">For developers</span>
            <h2>Sell for digital assets. Get paid in dirhams.</h2>
            <p>Your units, verified before they are listed, in front of buyers who pay on-chain. The
              settlement reaches your account and the title is registered in the buyer's name at the
              Dubai Land Department.</p>
            <a class="promo-btn" href="#/dev">Open the developer portal
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
            <span class="promo-nota">Onboarding is reviewed and approved by hand.</span>
          </div>
          <div class="promo-art" aria-hidden="true">
            <svg viewBox="0 0 260 180" role="presentation">
              <rect class="torre" x="16" y="54" width="46" height="110" rx="5"/>
              <rect class="torre" x="72" y="26" width="52" height="138" rx="5"/>
              <rect class="torre" x="134" y="72" width="40" height="92" rx="5"/>
              <rect class="torre" x="184" y="42" width="58" height="122" rx="5"/>
              <g class="luces">
                <rect x="26" y="66" width="12" height="12" rx="3"/><rect x="44" y="66" width="12" height="12" rx="3"/>
                <rect x="26" y="88" width="12" height="12" rx="3"/><rect x="44" y="88" width="12" height="12" rx="3"/>
                <rect x="82" y="40" width="14" height="14" rx="3"/><rect x="102" y="40" width="14" height="14" rx="3"/>
                <rect x="82" y="64" width="14" height="14" rx="3"/><rect x="102" y="64" width="14" height="14" rx="3"/>
                <rect x="82" y="88" width="14" height="14" rx="3"/><rect x="102" y="88" width="14" height="14" rx="3"/>
                <rect x="144" y="84" width="10" height="10" rx="3"/><rect x="160" y="84" width="10" height="10" rx="3"/>
                <rect x="144" y="104" width="10" height="10" rx="3"/><rect x="160" y="104" width="10" height="10" rx="3"/>
                <rect x="194" y="54" width="14" height="14" rx="3"/><rect x="216" y="54" width="14" height="14" rx="3"/>
                <rect x="194" y="78" width="14" height="14" rx="3"/><rect x="216" y="78" width="14" height="14" rx="3"/>
                <rect x="194" y="102" width="14" height="14" rx="3"/><rect x="216" y="102" width="14" height="14" rx="3"/>
              </g>
              <circle class="luna" cx="224" cy="26" r="12"/>
            </svg>
          </div>
        </article>
        <article class="promo promo-cre">
          <div class="promo-txt">
            <span class="promo-lab">For content creators</span>
            <h2>Your audience, and a code that pays.</h2>
            <p>Take a code, share it with your people, and earn <b>1 %</b> of every sale it brings. Only
              property that is already published, with its verification badge and its date.</p>
            <a class="promo-btn" href="#/register">Ask for your code
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
            <span class="promo-nota">Accounts are approved by NDC, and no commission is released before that.</span>
          </div>
          <div class="promo-art" aria-hidden="true">
            <svg viewBox="0 0 260 180" role="presentation">
              <rect class="movil" x="98" y="18" width="64" height="130" rx="13"/>
              <rect class="pantalla" x="106" y="32" width="48" height="88" rx="7"/>
              <text class="codigo" x="130" y="84" text-anchor="middle">CODE</text>
              <circle class="boca" cx="130" cy="136" r="4"/>
              <path class="onda" d="M40 62c13-10 27-10 40 0M38 86c17-13 34-13 51 0M40 110c13-10 27-10 40 0"/>
              <path class="onda" d="M180 62c13-10 27-10 40 0M182 86c17-13 34-13 51 0M180 110c13-10 27-10 40 0"/>
            </svg>
          </div>
        </article>
      </section>

      </div>

      ${tabsHtml(new URLSearchParams())}

      <div class="lay">
        <div>
          <div id="destacados"></div>
          <div id="recientes"></div>
        </div>
        <aside class="rail" id="rail"></aside>
      </div>
    </div>
  `;

  // The four controls of the panel keep their choice in memory and the button walks to the catalogue
  // with everything at once: the tabs above already carry the state of the build.
  const elegido = {};
  const rotular = (id, valor) => {
    const texto = view().querySelector(`[data-pick="${id}"][data-val="${valor}"] span`)?.textContent;
    const boton = view().querySelector(`[data-open="${id}"] span`);
    if (boton && texto) boton.textContent = texto;
    if (boton && !valor) boton.textContent = boton.dataset.vacio ?? boton.textContent;
  };
  // El buscador del hero lleva al catálogo con lo que se haya elegido. Se construye la dirección en
  // un solo sitio, y se navega tanto al pulsar Search como al elegir cualquier control: pulsar
  // «Off plan» o «Dubai» y que no pase nada hasta acordarse del botón se lee como que no funciona.
  const irAlCatalogo = () => {
    const p = new URLSearchParams();
    const q = (view().querySelector('#buscador input[name="q"]')?.value ?? '').trim();
    if (q) p.set('q', q);
    if (elegido.estado_obra) p.set('estado_obra', elegido.estado_obra);
    if (elegido.hero_emirato) p.set('emirato', elegido.hero_emirato);
    if (elegido.hero_tipo) p.set('tipo', elegido.hero_tipo);
    if (elegido.hero_camas) p.set('habitaciones', elegido.hero_camas);
    if (elegido.hero_precio) {
      const [min, max] = String(elegido.hero_precio).split('-');
      if (min) p.set('precio_min', min);
      if (max) p.set('precio_max', max);
    }
    go(`/search${p.toString() ? `?${p}` : ''}`);
  };

  initPickers(view(), {
    onPick: (id, valor) => {
      elegido[id] = valor;
      rotular(id, valor);
      irAlCatalogo();
    },
  });

  // Las tres pestañas son una elección más del buscador: se marca la elegida y se va al catálogo.
  const pestanas = view().querySelectorAll('.hero-tabs [data-obra]');
  pestanas.forEach((b) => b.addEventListener('click', () => {
    pestanas.forEach((o) => {
      o.classList.toggle('on', o === b);
      o.setAttribute('aria-pressed', String(o === b));
    });
    elegido.estado_obra = b.dataset.obra;
    irAlCatalogo();
  }));

  view().querySelector('#buscador').addEventListener('submit', (e) => {
    e.preventDefault();
    irAlCatalogo();
  });

  try {
    const [prom, rec] = await Promise.all([
      api.search({ solo_promocionados: true, limit: 2 }),
      api.search({ limit: 6, orden: 'destacados' }),
    ]);

    view().querySelector('#destacados').innerHTML = prom.resultados.length
      ? `<div class="sec-head"><h2>Promoted</h2>
           <span class="muted" style="font-size:.85rem">Paid position, always marked</span></div>
         ${lista(prom.resultados)}`
      : '';

    view().querySelector('#recientes').innerHTML = rec.resultados.length
      ? `<div class="sec-head"><h2>Available now</h2>
           <a class="link-btn" href="#/search">See all ${rec.total}</a></div>${lista(rec.resultados)}`
      : empty('Nothing published yet', 'As soon as a developer publishes verified property, it shows here.');
  } catch (err) {
    error('#recientes', err);
  }

  // The rail carries the rest: who is behind the catalogue and what they are building.
  await pintarRail('#rail');
}

/* ------------------------------------------------------------------ search */

const filtrosDe = (query) => ({
  q: query.get('q') ?? '',
  emirato: query.get('emirato') ?? '',
  comunidad: query.get('comunidad') ?? '',
  tipo: query.get('tipo') ?? '',
  dev: query.get('desarrollador_id') ?? '',
  banda: bandaElegida(query.get('precio_min') ?? '', query.get('precio_max') ?? ''),
  habs: (query.get('habitaciones') ?? '').split(',').filter(Boolean),
  banosSet: (query.get('banos') ?? '').split(',').filter(Boolean),
  superficie_min: query.get('superficie_min') ?? '',
  superficie_max: query.get('superficie_max') ?? '',
  estado_obra: query.get('estado_obra') ?? '',
  amueblado: query.get('amueblado') ?? '',
  amenidades: (query.get('amenidades') ?? '').split(',').filter(Boolean),
  orden: query.get('orden') ?? '',
  // list or map: the same results, two ways of looking at them
  vista: query.get('vista') === 'mapa' ? 'mapa' : 'lista',
});

let offset = 0;
let total = 0;
let ultimos = [];
let filtrosActuales = {};
// The state of the controls that are pickers (the panel's fields are read from the DOM).
let estado = { emirato: '', tipo: '', banda: '', orden: '', vista: 'lista', mob: '' };
// (el cerrojo por vista se retiró: initPickers ya sustituye su propio manejador)
let contadorTimer;

const leerPanel = (sel) => view().querySelector(sel)?.value.trim() ?? '';
/** The values ticked inside a multi-select panel; with a group, only that group's. */
const leerSeleccion = (id, grupo) => [...view().querySelectorAll(`#pop-${id} .pop-chip.on`)]
  .filter((b) => !grupo || b.dataset.g === grupo)
  .map((b) => b.dataset.val).filter(Boolean);

/** The filters the buyer has chosen, as the query the API understands. */
function construir() {
  const p = new URLSearchParams();
  const q = leerPanel('#s-q');
  if (q) p.set('q', q);
  if (estado.emirato) p.set('emirato', estado.emirato);
  if (estado.tipo) p.set('tipo', estado.tipo);
  if (estado.banda) {
    const [min, max] = estado.banda.split('-');
    if (min) p.set('precio_min', min);
    if (max) p.set('precio_max', max);
  }
  const habs = leerSeleccion('dormitorios', 'camas');
  if (habs.length) p.set('habitaciones', habs.join(','));
  const banos = leerSeleccion('dormitorios', 'banos');
  if (banos.length) p.set('banos', banos.join(','));
  const sMin = leerPanel('#s-smin');
  const sMax = leerPanel('#s-smax');
  const obra = leerPanel('#s-obra');
  const dev = leerPanel('#s-dev');
  // The furnishing lives in the segmented control of the results bar, not in this panel.
  const mob = estado.mob;
  if (sMin) p.set('superficie_min', sMin);
  if (sMax) p.set('superficie_max', sMax);
  if (obra) p.set('estado_obra', obra);
  if (dev) p.set('desarrollador_id', dev);
  if (mob) p.set('amueblado', mob);
  if (estado.orden) p.set('orden', estado.orden);
  const amens = [...view().querySelectorAll('#chips .chip.on')].map((c) => c.dataset.amen);
  if (amens.length) p.set('amenidades', amens.join(','));
  return p;
}

export async function viewSearch(query) {
  offset = 0;
  const f = filtrosDe(query);
  estado = { emirato: f.emirato, tipo: f.tipo, banda: f.banda, orden: f.orden, vista: f.vista, mob: f.amueblado };

  view().innerHTML = `
    <div class="wrap">
      ${tabsHtml(query)}

      <div class="controls">
        ${picker('emirato', {
          label: 'Location', vacio: 'All emirates', valor: f.emirato,
          grupos: [{ opciones: EMIRATOS.map((e) => ({ valor: e, texto: e })) }],
        })}
        ${picker('tipo', {
          label: 'Type', vacio: 'Any type', valor: f.tipo,
          grupos: [
            { titulo: 'Residential', opciones: [{ valor: 'apartment', texto: 'Apartment' }, { valor: 'villa', texto: 'Villa' }] },
            { titulo: 'Commercial', opciones: [{ valor: 'office', texto: 'Office' }, { valor: 'retail', texto: 'Retail' }] },
            { titulo: 'Other', opciones: [{ valor: 'hotel', texto: 'Hotel' }] },
          ],
        })}
        ${picker('banda', {
          label: 'Price', vacio: 'Any price', valor: f.banda,
          grupos: [{ opciones: BANDAS.map(([v, t]) => ({ valor: v, texto: t })) }],
        })}
        ${picker('dormitorios', {
          label: 'Beds & Baths', vacio: 'Any', valor: [...f.habs, ...f.banosSet],
          multiple: true, acciones: true,
          grupos: [
            { clave: 'camas', titulo: 'Beds', opciones: [
              { valor: '0', texto: 'Studio' },
              ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ valor: String(n), texto: String(n) })),
            ] },
            { clave: 'banos', titulo: 'Baths', opciones: [1, 2, 3, 4, 5, 6].map((n) => ({ valor: String(n), texto: String(n) })) },
          ],
        })}
        <div class="control ancho" style="align-self:flex-start">
          <label>&nbsp;</label>
          <button class="btn ghost" id="mas-filtros" type="button" style="width:100%"
            data-open="filtros" aria-expanded="false" aria-controls="pop-filtros">Filters</button>
          <span class="sub">Baths · size · furnishing · amenities</span>

          <div class="popover" id="pop-filtros" hidden role="dialog" aria-label="More filters">
            <div class="pop-head">
              <b>More filters</b>
              <button class="close" type="button" data-cerrar aria-label="Close">×</button>
            </div>
            <div class="fields">
              <h4 class="pop-group">Property</h4>
              <div><label for="s-obra">Build status</label>
                <select id="s-obra" name="estado_obra"><option value="">Any</option>${opciones(ESTADOS_OBRA, f.estado_obra)}</select></div>

              <h4 class="pop-group">Size</h4>
              <div><label for="s-smin">Size from (sqft)</label>
                <input id="s-smin" name="superficie_min" type="number" min="0" value="${esc(f.superficie_min)}"></div>
              <div><label for="s-smax">Size to (sqft)</label>
                <input id="s-smax" name="superficie_max" type="number" min="0" value="${esc(f.superficie_max)}"></div>

              <h4 class="pop-group">More</h4>
              <div><label for="s-q">Keyword</label>
                <input id="s-q" name="q" type="search" value="${esc(f.q)}" placeholder="Project or area"></div>
              <div><label for="s-dev">Developer</label>
                <select id="s-dev" name="desarrollador_id"><option value="">Any developer</option></select></div>

              <h4 class="pop-group">Amenities</h4>
              <div class="full">
                <div class="chips" id="chips">
                  ${Object.entries(AMENIDADES).map(([k, v]) => `<button type="button" class="chip${f.amenidades.includes(k) ? ' on' : ''}" data-amen="${esc(k)}">${esc(v)}</button>`).join('')}
                </div></div>
            </div>
            <div style="display:flex;gap:10px;margin-top:16px">
              <button class="btn green" id="aplicar" type="button" style="flex:1" data-cerrar>Show results</button>
              <button class="btn ghost" id="limpiar-hoja" type="button" data-cerrar>Clear</button>
            </div>
          </div>
        </div>
      </div>

      <div id="chips-activos" class="chips"></div>

      <div class="result-bar">
        <span class="count" id="cuenta-busqueda">Searching…</span>
        <span class="tools">
        <button class="link-btn" id="limpiar" type="button">Clear filters</button>
        ${picker('orden', {
          compacto: true, vacio: 'Popular', valor: f.orden,
          grupos: [{ opciones: [
            { valor: 'verificados', texto: 'Verified first' },
            { valor: 'recientes', texto: 'Newest to oldest' },
            { valor: 'antiguos', texto: 'Oldest to newest' },
            { valor: 'precio_desc', texto: 'Price highest to lowest' },
            { valor: 'precio_asc', texto: 'Price lowest to highest' },
          ] }],
        })}
        <button class="link-btn" id="guardar" type="button">Save search</button>
        <span class="seg" role="group" aria-label="Furnishing">
          <button type="button" data-mob="" class="${f.amueblado === '' ? 'on' : ''}">All</button>
          <button type="button" data-mob="true" class="${f.amueblado === 'true' ? 'on' : ''}">Furnished</button>
          <button type="button" data-mob="false" class="${f.amueblado === 'false' ? 'on' : ''}">Unfurnished</button>
        </span>
        <label class="switch" title="Verified by Verysset">
          <input type="checkbox" id="verif" ${f.orden === 'verificados' ? 'checked' : ''}>
          <span class="track" aria-hidden="true"></span>Show verified first
        </label>
        <span class="vista" role="group" aria-label="How to see the results">
          <button type="button" data-vista="lista" class="${f.vista === 'lista' ? 'on' : ''}">List</button>
          <button type="button" data-vista="mapa" class="${f.vista === 'mapa' ? 'on' : ''}">Map</button>
        </span>
        </span>
        </div>

        <div class="lay${f.vista === 'mapa' ? ' mapa' : ''}" id="lay">
        <div>
        <div id="resultados">${loading(4)}</div>
        </div>
        <!-- El mapa es una COLUMNA del grid (el CSS lo pone en .lay.mapa), no parte de la columna
             lateral. Estaba dentro de .rail, que en vista de mapa se oculta: se quedaba dentro de una
             caja escondida y Leaflet no llegaba a pintarlo nunca. -->
        <div id="mapa" class="mapa" ${f.vista === 'mapa' ? '' : 'hidden'}></div>
        <div class="rail" id="columna">
        <div id="rail" ${f.vista === 'mapa' ? 'hidden' : ''}></div>
        </div>
        </div>
        </div>
        `;

  // The panels of the controls (including the one of Filters) are opened, closed and veiled by
  // `initPickers`: here only the chips of the panel need a listener of their own.
  view().querySelector('#chips').addEventListener('click', (e) => {
    const c = e.target.closest?.('[data-amen]');
    if (c) c.classList.toggle('on');
  });

  const aplicar = (p) => go(`/search${p.toString() ? `?${p}` : ''}`);
  // The pickers apply on click through the state this view keeps, and close themselves.
  // Se engancha en CADA pintado: initPickers sustituye su manejador, así que no se acumula y los
  // botones siguen vivos después de cualquier repintado.
  {
    initPickers(view(), {
      onPick: (id, val) => {
        estado[id] = val;
        aplicar(construir());
      },
      // The multi-select applies with its own button, which says how many results it will show.
      onAplicar: () => aplicar(construir()),
      onContar: (id) => {
        if (id !== 'dormitorios') return;
        clearTimeout(contadorTimer);
        contadorTimer = setTimeout(async () => {
          const boton = view().querySelector('#pop-dormitorios [data-aplicar]');
          if (!boton) return;
          try {
            const r = await api.search({ ...Object.fromEntries(construir().entries()), limit: 1 });
            boton.textContent = `Show ${r.total} result${r.total === 1 ? '' : 's'}`;
          } catch { /* the figure is a nicety: the button still says what it does */ }
        }, 260);
      },
    });
    }
  view().querySelector('#aplicar').addEventListener('click', () => aplicar(construir()));
  view().querySelector('#limpiar').addEventListener('click', () => go('/search'));
  view().querySelector('#limpiar-hoja').addEventListener('click', () => go('/search'));
  // List or map, the same result: the choice travels in the address, so it survives a refresh.
  for (const b of view().querySelectorAll('[data-vista]')) {
    b.addEventListener('click', () => {
      const p = construir();
      if (b.dataset.vista === 'mapa') p.set('vista', 'mapa');
      else p.delete('vista');
      aplicar(p);
    });
  }
  // Furnishing, as a segmented control, and the switch that puts the verified first.
  for (const b of view().querySelectorAll('[data-mob]')) {
    b.addEventListener('click', () => {
      const p = construir();
      if (b.dataset.mob) p.set('amueblado', b.dataset.mob);
      else p.delete('amueblado');
      aplicar(p);
    });
  }
  view().querySelector('#verif').addEventListener('change', (e) => {
    const p = construir();
    if (e.target.checked) p.set('orden', 'verificados');
    else p.delete('orden');
    aplicar(p);
  });
  view().querySelector('#guardar').addEventListener('click', async () => {
    if (!store.logged()) { toast('Sign in to save a search.'); go('/login'); return; }
    const p = construir();
    const nombre = [p.get('tipo') ?? 'Properties', p.get('emirato') ?? 'UAE'].join(' · ');
    try {
      await api.savedSearch(nombre, Object.fromEntries(p.entries()));
      toast('Search saved. Alerts arrive in a later release.', 'ok');
    } catch (err) { toast(err.message, 'err'); }
  });

  // the active filters, as pills the buyer can close: the × appears on hover, and on a phone it is
  // always there (a finger has no hover).
  const pintarChips = (devs) => {
    const nombreDev = devs.find((d) => d.id === f.dev)?.nombre ?? 'Developer';
    const activos = [
      f.emirato && { clave: 'emirato', texto: f.emirato },
      f.comunidad && { clave: 'comunidad', texto: f.comunidad },
      f.tipo && { clave: 'tipo', texto: TIPOS[f.tipo] ?? f.tipo },
      f.dev && { clave: 'desarrollador_id', texto: nombreDev },
      f.habs.length && { clave: 'habitaciones', texto: `${f.habs.join(', ')} bed${f.habs.length > 1 || f.habs[0] !== '1' ? 's' : ''}` },
      f.banosSet.length && { clave: 'banos', texto: `${f.banosSet.join(', ')} bath${f.banosSet.length > 1 || f.banosSet[0] !== '1' ? 's' : ''}` },
      f.estado_obra && { clave: 'estado_obra', texto: f.estado_obra === 'ready' ? 'Ready' : 'Off plan' },
      f.amueblado && { clave: 'amueblado', texto: f.amueblado === 'true' ? 'Furnished' : 'Unfurnished' },
      ...f.amenidades.map((a) => ({ clave: 'amenidades', valor: a, texto: AMENIDADES[a] ?? a })),
    ].filter(Boolean);
    view().querySelector('#chips-activos').innerHTML = activos.length
      ? activos.map((c) => `<button class="chip on" type="button" data-quitar="${esc(c.clave)}"${c.valor ? ` data-val="${esc(c.valor)}"` : ''}
          ><span>${esc(c.texto)}</span><i class="x" aria-hidden="true">×</i></button>`).join('')
      : '';
  };
  pintarChips([]);

  // Closing a pill: the same search without that filter, and everything else kept.
  view().querySelector('#chips-activos').addEventListener('click', (e) => {
    const pill = e.target.closest?.('[data-quitar]');
    if (!pill) return;
    const p = construir();
    if (pill.dataset.quitar === 'amenidades') {
      const quedan = (p.get('amenidades') ?? '').split(',').filter((a) => a && a !== pill.dataset.val);
      if (quedan.length) p.set('amenidades', quedan.join(','));
      else p.delete('amenidades');
    } else {
      p.delete(pill.dataset.quitar);
    }
    aplicar(p);
  });

  const { banda, hab, dev, ...resto } = f;
  // The band is a control of the screen; the API wants the two figures it means.
  const [bandaMin, bandaMax] = (f.banda || '').split('-');
  filtrosActuales = {
    ...resto,
    precio_min: bandaMin || undefined,
    precio_max: bandaMax || undefined,
    q: f.q || undefined,
    emirato: f.emirato || undefined,
    comunidad: f.comunidad || undefined,
    tipo: f.tipo || undefined,
    estado_obra: f.estado_obra || undefined,
    habitaciones: f.habs.length ? f.habs : undefined,
    banos: f.banosSet.length ? f.banosSet : undefined,
    superficie_min: f.superficie_min || undefined,
    superficie_max: f.superficie_max || undefined,
    amueblado: f.amueblado || undefined,
    amenidades: f.amenidades.length ? f.amenidades : undefined,
    orden: f.orden || undefined,
    desarrollador_id: f.dev || undefined,
    limit: PAGE,
    offset: 0,
  };

  try {
    const r = await api.search(filtrosActuales);
    total = r.total;
    ultimos = r.resultados;
    pintar();
  } catch (err) {
    error('#resultados', err);
  }

  // The rail on the right, or the map, and the names the developer filter carries.
  const rail = estado.vista === 'mapa' ? null : await pintarRail('#rail');
  const select = view().querySelector('#s-dev');
  if (select && rail?.desarrolladores) {
    select.innerHTML = '<option value="">Any developer</option>' + rail.desarrolladores
      .map((d) => `<option value="${esc(d.id)}"${d.id === f.dev ? ' selected' : ''}>${esc(d.nombre)}</option>`)
      .join('');
  }
  pintarChips(rail?.desarrolladores ?? []);
}

function pintar() {
  const cuenta = view().querySelector('#cuenta-busqueda');
  const caja = view().querySelector('#resultados');
  if (!cuenta || !caja) return;
  if (total === 0) {
    cuenta.textContent = 'No properties';
    caja.innerHTML = empty('Nothing matches', 'Try a wider price band or another emirate.');
    return;
  }
  cuenta.textContent = `1 – ${ultimos.length} of ${total} ${total === 1 ? 'property' : 'properties'}`;
  caja.innerHTML = `${lista(ultimos)}
    ${ultimos.length < total ? '<div style="text-align:center;margin-top:20px"><button class="btn ghost" id="mas">Show more</button></div>' : ''}`;
  caja.querySelector('#mas')?.addEventListener('click', cargarMas);

  if (estado.vista === 'mapa') {
    // Every card and its marker answer to each other.
    for (const carta of caja.querySelectorAll('.card')) {
      const id = carta.dataset.unidad;
      carta.addEventListener('mouseenter', () => resaltar(id, true));
      carta.addEventListener('mouseleave', () => resaltar(id, false));
      carta.addEventListener('click', () => resaltar(id, true));
    }
    // Sin arrastrar la página al mapa: en el teléfono el buscador y los filtros ocupan 804px, así que
    // el mapa empieza por debajo del pliegue y hay que bajar. Se probó a llevarlo a la vista solo y no
    // se ha podido comprobar en este navegador (no desplaza), así que no se envía sin prueba: la
    // decisión de colapsar los filtros en la vista de mapa, como hace el mercado, es de Mauricio.
    pintarMapa('#mapa', ultimos, { alElegir: elegirEnLista });
  }
}

/** A marker was pressed: its card comes into view, marked. */
function elegirEnLista(unidadId) {
  const carta = view().querySelector(`.card[data-unidad="${unidadId}"]`);
  if (!carta) return;
  for (const c of view().querySelectorAll('.card.elegida')) c.classList.remove('elegida');
  carta.classList.add('elegida');
  // Desplazar SOLO la columna de tarjetas. `scrollIntoView` arrastraba la página entera y sacaba el
  // mapa de la pantalla justo al pulsar un pin, que es cuando hay que verlo.
  const caja = carta.closest('.lay.mapa > div:first-child');
  if (caja) {
    const llevar = () => {
      const rc = carta.getBoundingClientRect();
      const rj = caja.getBoundingClientRect();
      // En el móvil la misma caja es una tira horizontal: se centra en horizontal, no en vertical.
      if (caja.scrollWidth > caja.clientWidth + 4) {
        caja.scrollLeft = Math.max(0, caja.scrollLeft + (rc.left - rj.left) - (rj.width - rc.width) / 2);
      } else {
        caja.scrollTop = Math.max(0, caja.scrollTop + (rc.top - rj.top) - (rj.height - rc.height) / 2);
      }
    };
    // La lista se repinta al elegir: se lleva en el siguiente fotograma y otra vez al poco, para que
    // el desplazamiento no lo pise un repintado que llegue tarde.
    requestAnimationFrame(llevar);
    setTimeout(llevar, 180);
  }
  centrarEn(unidadId);
}

async function cargarMas(e) {
  const boton = e.currentTarget;
  boton.disabled = true;
  try {
    offset += PAGE;
    const r = await api.search({ ...filtrosActuales, offset });
    ultimos = ultimos.concat(r.resultados);
    pintar();
  } catch (err) {
    boton.disabled = false;
    error('#resultados', err);
  }
}

export { money };

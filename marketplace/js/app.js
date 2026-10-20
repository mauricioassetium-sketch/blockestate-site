/**
 * BlockEstate · the buyer marketplace (PWA).
 *
 * Wires the bar, the routes and the few global behaviours. Everything the buyer sees comes from the
 * API: this file only decides where each thing goes. The bar carries the mark, a search and the
 * account, nothing else, because everything else is reachable from the account menu.
 */
import { api } from './api.js';
import { engancharSellos } from './views/verysset.js';
import { go, notFound, render, route, start } from './router.js';
import { refrescarTasas, activoElegido, elegirActivo, unidadElegida, elegirUnidad } from './cambio.js';
import { store } from './store.js';
import { esc, empty, hidratarTarjetas, ICO, initSelectorActivo, marcarActivo, pintarPreciosCripto, selectorActivo, toast } from './ui.js';
import { viewAreas } from './views/areas.js';
import { viewCatalog, viewSearch } from './views/catalog.js';
import { viewBroker, viewCreador } from './views/escritorios.js';
import { viewAbout, viewCareers, viewContact, viewTerms } from './views/informativas.js';
import { viewNews, viewNoticia } from './views/news.js';
import { viewAuth, viewFavorites, viewNotifications, viewPortfolio, viewPurchase, viewRegister } from './views/me.js';
import { viewProject, viewUnit } from './views/unit.js';
import {
  viewDeveloper, viewDevAgency, viewDevBrokers, viewDevCollections, viewDevListings,
  viewDevNuevaPropiedad, viewDevOrg, viewDevProjects, viewDevProperties, viewDevSale, viewDevSales,
  viewDevVerification,
} from './views/dev.js';

const view = () => document.getElementById('view');

/**
 * The groups of the menu, in the shape the market uses (Bayut's panel): a heading that opens and
 * closes, with its links underneath. Same destinations as the footer's three columns, so the menu
 * and the page cannot disagree.
 */
const GRUPOS_MENU = [
  ['Buy', [
    ['All properties', '#/search'],
    ['Villas', '#/search?tipo=villa'],
    ['Apartments', '#/search?tipo=apartment'],
    ['Off plan', '#/search?estado_obra=off_plan'],
    ['Compare prices by area', '#/areas'],
  ]],
  ['Sell and develop', [
    ['Developer portal', '#/dev'],
    ['List a property', '#/register'],
    ['Broker desk', '#/broker'],
    ['Creator desk', '#/creator'],
  ]],
  ['Company', [
    ['Newsroom', '#/news'],
    ['About us', '#/about'],
    ['Careers', '#/careers'],
    ['Contact us', '#/contact'],
    ['Terms & privacy', '#/terms'],
  ]],
];
const barra = () => document.getElementById('barra');

/** The bar: the mark, a search, and one button that opens everything of the buyer's. */
function renderBarra() {
  const el = barra();
  if (!el) return;
  const logged = store.logged();
  const favs = store.favs.size;
  const alertas = store.sin_leer ?? 0;

  // El menú: en pantalla ancha el primer grupo viene abierto; en el teléfono vienen todos cerrados,
  // porque con uno abierto el panel mide 720 y el hueco que queda bajo el botón es de 678: el pie de
  // ajustes se quedaba fuera de la vista. Cerrado, el panel mide 528 y se lee entero.
  const abierto = window.matchMedia('(max-width:620px)').matches ? -1 : 0;

  el.innerHTML = `
    <a class="brand" href="#/" aria-label="BlockEstate, home">
      <svg class="mark" viewBox="0 0 256 256" role="img" aria-hidden="true"><use href="#logo"/></svg>
      <span class="brand-txt">
        <span class="brand-nombre">BlockEstate</span>
        <i class="brand-por">Powered by NDC</i>
      </span>
    </a>
    <form class="bar-search" id="barra-buscar" role="search">
      <input type="search" name="q" placeholder="Search area, project or type" aria-label="Search the catalogue">
    </form>
    <div class="bar-actions">
      <div class="bar-activo">${selectorActivo()}</div>
      ${logged ? `
        <a class="icon-btn${favs ? ' on' : ''}" href="#/favorites" title="Saved" aria-label="Saved">
          ♥${favs ? `<span class="badge-count">${favs}</span>` : ''}</a>
        <a class="icon-btn${alertas ? ' on' : ''}" href="#/notifications" title="Alerts" aria-label="Alerts">
          ◔${alertas ? `<span class="badge-count">${alertas}</span>` : ''}</a>` : ''}
      <div class="cuenta">
        <button class="icon-btn" id="cuenta" type="button" aria-haspopup="true" aria-expanded="false"
          title="Account" aria-label="Account">☰</button>
        <div class="menu" id="menu-cuenta" hidden>
          <div class="menu-grupos">
            ${GRUPOS_MENU.map(([titulo, hijos], i) => `
              <section class="menu-grupo">
                <button class="menu-cabeza" type="button" aria-expanded="${i === abierto}" aria-controls="mg-${i}">
                  <span>${esc(titulo)}</span><i class="menu-flecha" aria-hidden="true"></i>
                </button>
                <div class="menu-hijos" id="mg-${i}"${i === abierto ? '' : ' hidden'}>
                  ${hijos.map(([t, h]) => `<a href="${h}">${esc(t)}</a>`).join('')}
                </div>
              </section>`).join('')}
          </div>
          <div class="menu-bloque">
            ${logged ? `
              <span class="menu-quien">${esc(store.usuario()?.nombre ?? 'Signed in')}</span>
              <a href="#/portfolio">My purchases</a>
              <a href="#/favorites">Saved properties</a>
              <a href="#/notifications">Alerts</a>
              <button id="salir" type="button">Sign out</button>`
      : `<a href="#/login">Sign in</a>
              <a href="#/register">Create account</a>`}
          </div>
          <div class="menu-set">
            <span class="menu-set-titulo">Site settings</span>
            <div class="menu-set-fila" title="The marketplace ships in English">
              <i class="menu-set-ico">${ICO.globo}</i><span>Language</span><b>English</b>
            </div>
            <button class="menu-set-fila" id="set-moneda" type="button"
              title="Which asset every price is shown in first">
              <i class="menu-set-ico">${ICO.moneda}</i><span>Currency</span><b>${activoElegido()}</b>
            </button>
            <button class="menu-set-fila" id="set-unidad" type="button"
              title="The unit surfaces are read in first">
              <i class="menu-set-ico">${ICO.area}</i><span>Area unit</span>
              <b>${unidadElegida() === 'm2' ? 'Square metres' : 'Square feet'}</b>
            </button>
          </div>
    </div>
      </div>
  `;

  const menu = el.querySelector('#menu-cuenta');
  const boton = el.querySelector('#cuenta');
  const cerrarMenu = () => {
    if (menu.hidden) return;
    menu.hidden = true;
    boton.setAttribute('aria-expanded', 'false');
  };
  boton.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    boton.setAttribute('aria-expanded', String(!menu.hidden));
  });
  // Elegir un destino cierra; abrir un grupo o cambiar un ajuste, no. Antes cualquier `click` en un
  // `a` o un `button` cerraba el menú, y eso incluía las cabeceras de grupo y los dos ajustes: el
  // panel se cerraba encima de la pantalla que el visitante acababa de pedir.
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) { cerrarMenu(); return; }
    const cabeza = e.target.closest('.menu-cabeza');
    if (cabeza) {
      const hijos = document.getElementById(cabeza.getAttribute('aria-controls'));
      const abierto = cabeza.getAttribute('aria-expanded') === 'true';
      cabeza.setAttribute('aria-expanded', String(!abierto));
      if (hijos) hijos.hidden = abierto;
      return;
    }
    const filaMoneda = e.target.closest('#set-moneda');
    if (filaMoneda) {
      const otro = activoElegido() === 'USDT' ? 'BNB' : 'USDT';
      elegirActivo(otro);
      marcarActivo(otro);
      pintarPreciosCripto();
      filaMoneda.querySelector('b').textContent = otro;
      return;
    }
    const filaUnidad = e.target.closest('#set-unidad');
    if (filaUnidad) {
      const otra = unidadElegida() === 'm2' ? 'sqft' : 'm2';
      elegirUnidad(otra);
      // Las superficies están por toda la pantalla, así que aquí sí se repinta: es un dato que se lee
      // en las tarjetas, en la ficha y en el buscador.
      render();
      filaUnidad.querySelector('b').textContent = otra === 'm2' ? 'Square metres' : 'Square feet';
      return;
    }
  });
  window.addEventListener('hashchange', cerrarMenu);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });
  // Y en cualquier otro sitio de la página, también: no se queda abierto a espaldas del comprador.
  // El botón cuenta entero (icono incluido): el clic de verdad cae en el svg de dentro, no en el
  // botón, y con la comparación a secas el menú se cerraba solo un instante después de abrirse.
  const enElBoton = (t) => t === boton || boton.contains(t);
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !enElBoton(e.target)) cerrarMenu();
  });

  el.querySelector('#salir')?.addEventListener('click', () => {
    store.clear();
    menu.hidden = true;
    toast('Signed out.');
    go('/');
  });

  el.querySelector('#barra-buscar')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    go(`/search${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  });
}

/** Favourites are toggled from any card, wherever it is, so the listener lives on the document. */
document.addEventListener('click', async (e) => {
  const boton = e.target.closest?.('[data-fav]');
  if (!boton) return;
  e.preventDefault();
  const unidadId = boton.dataset.fav;
  if (!store.logged()) {
    toast('Sign in to keep a shortlist.');
    go('/login');
    return;
  }
  const estaba = store.isFav(unidadId);
  boton.disabled = true;
  try {
    if (estaba) {
      await api.removeFavorite(unidadId);
      store.markFav(unidadId, false);
      boton.classList.remove('on');
      boton.textContent = '☆';
      toast('Removed from favourites.');
    } else {
      await api.addFavorite(unidadId);
      store.markFav(unidadId, true);
      boton.classList.add('on');
      boton.textContent = '★';
      toast('Saved to favourites.');
    }
    renderBarra();
  } catch (err) {
    // A unit that leaves the catalogue cannot be saved: the API says so and we repeat it as is.
    toast(err.message, 'err');
  } finally {
    boton.disabled = false;
  }
});

route('/', () => viewCatalog());
route('/search', ({ query }) => viewSearch(query));
route('/areas', () => viewAreas());
route('/unit/:id', ({ params }) => viewUnit(params.id));
route('/project/:id', ({ params }) => viewProject(params.id));
// La sala de prensa. Debajo de todo lo demás porque no vende nada: se lee.
route('/news', ({ query }) => viewNews({ etiqueta: query.get('etiqueta') || '' }));
route('/news/:slug', ({ params }) => viewNoticia(params.slug));
route('/favorites', () => viewFavorites());
route('/portfolio', () => viewPortfolio());
route('/portfolio/:id', ({ params }) => viewPurchase(params.id));
route('/notifications', () => viewNotifications());
// The developer's side of the same product. It lives in the same app because it is the same
// marketplace: whichever account signs in, the portal it opens is the one its organisation owns.
route('/dev', () => viewDeveloper());
route('/dev/properties', () => viewDevProperties());
route('/dev/properties/nueva', () => viewDevNuevaPropiedad());
// The two desks. The broker works inside a developer's organisation; the creator rides alone on a code.
route('/broker', () => viewBroker());
route('/creator', () => viewCreador());
route('/dev/projects', () => viewDevProjects());
route('/dev/listings', () => viewDevListings());
route('/dev/verification', () => viewDevVerification());
route('/dev/sales', () => viewDevSales());
route('/dev/collections', () => viewDevCollections());
route('/dev/brokers', () => viewDevBrokers());
route('/dev/agency', () => viewDevAgency());
route('/dev/org', () => viewDevOrg());
route('/dev/sale/:id', ({ params }) => viewDevSale(params.id));
// The desk went from «Inventory» to «Properties» when the menu grew: the old address still works.
route('/dev/inventory', () => go('/dev/properties'));

// A row of a table is a door too. The whole row answers the click, and the keyboard gets the same
// door from the link inside it, a table that only works with a mouse is half a table.
document.addEventListener('click', (e) => {
  const fila = e.target.closest?.('[data-ir]');
  if (fila && !e.target.closest('a, button, input, select')) go(fila.dataset.ir);
});
route('/login', () => viewAuth());
route('/register', () => viewRegister());
// Las páginas del pie. Antes decían «esto no es parte de Release 1»: una puerta que no da a ningún
// sitio se lee como un fallo, así que ahora son páginas de verdad, escritas con lo que el producto ya
// afirma en pantalla —las reglas BR-001 a BR-010— y con los canales que existen. Ver
// js/views/informativas.js.
route('/about', () => viewAbout());
route('/careers', () => viewCareers());
route('/contact', () => viewContact());
route('/terms', () => viewTerms());
notFound(() => {
  view().innerHTML = empty('Page not found', 'The link does not exist. Start from the catalogue.');
});

store.onChange(() => renderBarra());
renderBarra();

// The session is validated against the API before anything of the buyer's is shown.
if (store.logged()) {
  store.refresh().then(async () => {
    try {
      const n = await api.notifications({ solo_no_leidas: true, limite: 1 });
      store.save({ sin_leer: n.sin_leer ?? n.total ?? 0 });
    } catch { /* the counter is a nicety, not the page */ }
    renderBarra();
    if (!location.hash) go('/');
  });
}

initSelectorActivo();
// El sello de Verysset es la puerta a su informe, en todas las pantallas: se engancha una vez aquí.
engancharSellos();
// Every page starts at the top. The browser likes to keep the scroll where it was, and with a
// single-page site that means landing halfway down the next screen, or halfway down the one you
// came back to. Its own restoration is switched off and done here, once per navigation.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('hashchange', () => {
  window.scrollTo(0, 0);
  requestAnimationFrame(() => window.scrollTo(0, 0));
});
// The rates come on their own, and they come again every ten minutes: a figure that has to be typed
// by hand stops being a figure and becomes a chore the reader forgets.
refrescarTasas().then((r) => { if (r) renderBarra(); render(); });
setInterval(() => refrescarTasas().then((r) => { if (r) { renderBarra(); render(); } }), 10 * 60 * 1000);
// El navegador rotula sus controles de fichero en SU idioma («Elegir archivos», «Sin archivos
// seleccionados»): eso es texto suyo, no nuestro, y en un sitio en inglés no puede quedar así. Se
// esconde el control nativo y se pone el nuestro, que dice lo mismo en el idioma del proyecto.
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('[data-abre]');
  if (b) document.querySelector(`input[data-archivo="${b.dataset.abre}"]`)?.click();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const b = e.target.closest?.('[data-abre]');
  if (b) { e.preventDefault(); document.querySelector(`input[data-archivo="${b.dataset.abre}"]`)?.click(); }
});
document.addEventListener('change', (e) => {
  const i = e.target;
  if (!i.dataset?.archivo) return;
  const dicho = document.querySelector(`[data-dice="${i.dataset.archivo}"]`);
  if (dicho) dicho.textContent = i.files.length ? `${i.files.length} file${i.files.length === 1 ? '' : 's'} chosen` : 'No file chosen';
});
start();

// Las tarjetas de inmueble llevan su selector de fotos: se engancha una vez y
// mirá las tarjetas que vayan apareciendo.
hidratarTarjetas();

// The service worker makes the shell work offline; the API is never cached.
// `?nosw=1` skips it: a preview must never show a cached build, and the shell only changes when
// `CACHE` in sw.js is bumped.
if ('serviceWorker' in navigator && !new URLSearchParams(location.search).has('nosw')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* a PWA without offline is still a PWA */ });
  });
}

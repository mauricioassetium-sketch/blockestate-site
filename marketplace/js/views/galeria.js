/**
 * The gallery: every photograph, the reel, the 360° tour and the plan of a unit, in one overlay.
 *
 * The reference listings open the media full screen and keep the data within reach, so this does the
 * same: the stage in the middle, the thumbnails and the property's figures underneath. It is built
 * with the DOM and no library, it works with the keyboard (Esc, ←, →), with the wheel, with drag for
 * the panorama and with a swipe on a phone.
 *
 * A type that the unit does not have is not shown as an empty tab: it simply is not there.
 */
import { ICO, esc, ico } from '../ui.js';

const TIPOS_GALERIA = [
  { clave: 'foto', etiqueta: 'Photos', icono: 'foto' },
  { clave: 'video', etiqueta: 'Video', icono: 'video' },
  { clave: 'tour3d', etiqueta: '3D tour', icono: 'pano' },
  { clave: 'plano', etiqueta: 'Floor plan', icono: 'plano' },
];

/** A panorama is panned by dragging; anything else with a 3D tour URL is embedded. */
const esPanorama = (url) => /^data:image\//.test(url) || /\.(jpe?g|png|webp)($|\?)/i.test(url);

export function abrirGaleria({
  fotos = [], video = null, tour3d = null, planos = [],
  titulo = '', subtitulo = '', datos = [], grupos = [], inicio = 0, precio = '', estado = '',
  nombres = [], aviso = '',
} = {}) {
  const items = [];
  // A named room reads better than «Photo 3», and the last part is the honest bit: these pictures
  // show what a home like this looks like, they are not photographs of this unit.
  const rotulos = nombres ?? [];
  const sufijo = aviso ? ` · ${aviso}` : '';
  fotos.forEach((url, i) => items.push({
    tipo: 'foto', url,
    etiqueta: `${rotulos[i] ?? (fotos.length > 1 ? `Photo ${i + 1}` : 'Photo')}${sufijo}`,
  }));
  if (video) items.push({ tipo: 'video', url: video, etiqueta: 'Video' });
  if (tour3d) items.push({ tipo: 'tour3d', url: tour3d, etiqueta: '360° tour' });
  planos.forEach((url, i) => items.push({ tipo: 'plano', url, etiqueta: planos.length > 1 ? `Plan ${i + 1}` : 'Floor plan' }));
  if (items.length === 0) return;
  // Un visor, y solo uno. Si dos atajos de la ficha llaman aquí (el marco y el medio pedido), el
  // segundo se monta ENCIMA del primero: el botón de cerrar cierra uno y el visitante sigue viendo el
  // otro, o sea que parece que el botón no funciona. Aquí se corta.
  if (document.querySelector('.gal')) return;

  const antes = document.activeElement;
  const caja = document.createElement('div');
  caja.className = 'gal';
  caja.setAttribute('role', 'dialog');
  caja.setAttribute('aria-modal', 'true');
  caja.setAttribute('aria-label', `Gallery · ${titulo}`);

  const cuantos = (clave) => items.filter((x) => x.tipo === clave).length;
  const tabs = TIPOS_GALERIA.filter((t) => cuantos(t.clave) > 0)
    .map((t) => `<button type="button" class="gtab" data-grupo="${t.clave}" aria-label="${t.etiqueta}">
        ${ico(t.icono, 15)}<span>${t.etiqueta}</span><i>${cuantos(t.clave)}</i></button>`).join('');

  caja.innerHTML = `
    <div class="gal-caja">
      <header class="gal-bar">
        <div class="gal-id">
          <b>${esc(titulo)}</b>
          <span>${esc(subtitulo)}</span>
        </div>
        <nav class="gal-tabs" aria-label="Media type">${tabs}</nav>
        <button type="button" class="gal-info" aria-label="Property information" aria-expanded="false"
                aria-controls="gal-lado">${ico('etiqueta', 18)}<span>Info</span></button>
        <button type="button" class="gal-x" aria-label="Close the gallery">${ico('cerrar', 20)}</button>
      </header>

      <div class="gal-cuerpo">
        <div class="gal-escena" id="gal-escena">
          <button type="button" class="gal-flecha izq" aria-label="Previous">${ico('izquierda', 22)}</button>
          <button type="button" class="gal-flecha der" aria-label="Next">${ico('derecha', 22)}</button>
          <div class="gal-medio" id="gal-medio"></div>
          <div class="gal-pie-escena">
            <span class="gal-cuenta" id="gal-cuenta"></span>
            <span class="gal-etiqueta" id="gal-etiqueta"></span>
          </div>
        </div>

        <aside class="gal-lado" id="gal-lado" aria-label="Property information">
          ${precio ? `<div class="gal-precio">
            <b>${esc(precio)}</b>${estado ? `<span class="gal-estado">${esc(estado)}</span>` : ''}
          </div>` : ''}
          <h4>Property information</h4>
          ${grupos.length ? grupos.map((g) => `
            <section class="gal-grupo">
              <h5>${esc(g.titulo)}</h5>
              ${g.cifras?.length ? `<div class="gal-cifras">${g.cifras.map(([icono, valor, etiqueta]) => `
                <div class="gal-celda">${ico(icono, 17)}<b>${esc(valor)}</b><span>${esc(etiqueta)}</span></div>`).join('')}</div>` : ''}
              ${g.lista?.length ? `<dl class="gal-filas">${g.lista.map(([k, v]) => `
                <dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
            </section>`).join('') : ''}
          ${!grupos.length && datos.length ? `<dl class="gal-datos">
            ${datos.map(([icono, etiqueta, valor]) => `
              <dt>${ico(icono, 15)}<span>${esc(etiqueta)}</span></dt>
              <dd>${esc(valor)}</dd>`).join('')}
          </dl>` : ''}
          <p class="note">Figures declared by the developer. Anything not declared is left out rather
            than filled in.</p>
        </aside>
      </div>

      <footer class="gal-tiras" id="gal-tiras">
        ${items.map((x, n) => `
          <button type="button" class="gtira${x.tipo === 'foto' ? '' : ' con-marca'}" data-i="${n}"
                  aria-label="${esc(x.etiqueta)}">
            ${x.tipo === 'foto' || x.tipo === 'plano'
              ? `<img src="${esc(x.url)}" alt="">`
              : `<span class="gtira-ico">${ico(x.tipo === 'video' ? 'video' : 'pano', 20)}</span>`}
            ${x.tipo === 'foto' ? '' : `<em>${esc(x.etiqueta)}</em>`}
          </button>`).join('')}
      </footer>
    </div>`;

  document.body.appendChild(caja);
  document.body.classList.add('sin-scroll');

  const medio = caja.querySelector('#gal-medio');
  const cuenta = caja.querySelector('#gal-cuenta');
  const etiqueta = caja.querySelector('#gal-etiqueta');
  const tiras = Array.from(caja.querySelectorAll('.gtira'));
  const tabsBoton = Array.from(caja.querySelectorAll('.gtab'));
  let actual = Math.min(Math.max(0, inicio), items.length - 1);

  function pintar() {
    const it = items[actual];
    medio.innerHTML = '';

    if (it.tipo === 'video') {
      medio.innerHTML = `<video src="${esc(it.url)}" controls autoplay muted loop playsinline></video>`;
    } else if (it.tipo === 'tour3d' && !esPanorama(it.url)) {
      // A real tour arrives as a page: it is embedded instead of being shown as a picture.
      medio.innerHTML = `<iframe src="${esc(it.url)}" title="360° tour" loading="lazy"
        allow="fullscreen; xr-spatial-tracking" referrerpolicy="no-referrer"></iframe>`;
    } else if (it.tipo === 'tour3d') {
      // A panorama: the whole band at the height of the frame, moved by dragging.
      medio.innerHTML = `<div class="gal-pano" id="gal-pano" title="Drag to look around">
          <img src="${esc(it.url)}" alt="360° panorama" draggable="false"></div>
        <span class="gal-pista">${ico('arrastrar', 15)} drag to look around</span>`;
      const pano = medio.querySelector('#gal-pano');
      const img = pano.querySelector('img');
      let arrastrando = false;
      let inicioX = 0;
      let inicioScroll = 0;
      pano.addEventListener('pointerdown', (e) => {
        arrastrando = true;
        inicioX = e.clientX;
        inicioScroll = pano.scrollLeft;
        pano.classList.add('agarrando');
        pano.setPointerCapture?.(e.pointerId);
      });
      pano.addEventListener('pointermove', (e) => {
        if (!arrastrando) return;
        pano.scrollLeft = inicioScroll - (e.clientX - inicioX);
      });
      const soltar = () => { arrastrando = false; pano.classList.remove('agarrando'); };
      pano.addEventListener('pointerup', soltar);
      pano.addEventListener('pointercancel', soltar);
      pano.addEventListener('pointerleave', soltar);
      img.addEventListener('load', () => { pano.scrollLeft = (pano.scrollWidth - pano.clientWidth) / 2; });
    } else {
      medio.innerHTML = `<img src="${esc(it.url)}" alt="${esc(it.etiqueta)}">`;
    }

    cuenta.textContent = `${actual + 1} / ${items.length}`;
    etiqueta.textContent = it.etiqueta;
    tiras.forEach((t, n) => t.classList.toggle('on', n === actual));
    const grupo = it.tipo === 'plano' ? 'plano' : it.tipo;
    tabsBoton.forEach((t) => t.classList.toggle('on', t.dataset.grupo === grupo));
    tiras[actual]?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  const mover = (paso) => {
    actual = (actual + paso + items.length) % items.length;
    pintar();
  };

  const cerrar = () => {
    document.removeEventListener('keydown', tecla);
    document.body.classList.remove('sin-scroll');
    caja.remove();
    if (antes?.focus) antes.focus();
  };

  const tecla = (e) => {
    if (e.key === 'Escape') cerrar();
    else if (e.key === 'ArrowRight') mover(1);
    else if (e.key === 'ArrowLeft') mover(-1);
  };

  caja.querySelector('.gal-x').addEventListener('click', cerrar);
  // El panel de información se pide. Es un visor: lo que se viene a ver es el medio, y el panel
  // abierto a un lado le robaba un tercio del ancho para dejarlo lleno de aire.
  const lado = caja.querySelector('#gal-lado');
  const botonInfo = caja.querySelector('.gal-info');
  botonInfo.addEventListener('click', () => {
    const abierto = lado.toggleAttribute('data-abierto');
    botonInfo.setAttribute('aria-expanded', String(abierto));
    botonInfo.classList.toggle('on', abierto);
  });
  caja.querySelector('.gal-flecha.izq').addEventListener('click', () => mover(-1));
  caja.querySelector('.gal-flecha.der').addEventListener('click', () => mover(1));
  tabsBoton.forEach((t) => t.addEventListener('click', () => {
    const n = items.findIndex((x) => x.tipo === t.dataset.grupo);
    if (n >= 0) { actual = n; pintar(); }
  }));
  tiras.forEach((t) => t.addEventListener('click', () => { actual = Number(t.dataset.i); pintar(); }));

  // Closing has to be forgiving: the X, the Escape key, the button under the phone's back gesture,
  // and anywhere that is not the picture itself. What it must never do is move the gallery along
  // when somebody is trying to get out.
  const dentro = (t) => !!(t.closest?.('.gal-bar, .gal-marco, .gal-mandos, .gal-tiras, .gal-datos, .gal-x, .gal-info, .gal-lado, .gal-tabs'));
  caja.addEventListener('click', (e) => { if (!dentro(e.target)) cerrar(); });
  window.addEventListener('popstate', cerrar, { once: true });
  let x0 = null;
  caja.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  caja.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 45) mover(dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });
  document.addEventListener('keydown', tecla);

  pintar();
  caja.querySelector('.gal-x').focus();
}

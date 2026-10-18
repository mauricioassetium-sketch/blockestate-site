/**
 * The Verysset report of an asset: what the badge means, where the evidence is anchored and what the
 * digital twin of the asset reads.
 *
 * It answers the only question a mark like this raises, *why should I believe it?*, with what the
 * verifier actually reported: the scope and the date of the check, its validity, the evidence, the
 * anchor on chain, and the twin. It also says the two things that must be said: the badge is not an
 * unconditional guarantee, and in this environment the twin's sensors are not connected, so the
 * readings are the sandbox double and are labelled as such.
 *
 * Se lee como un dossier y no como un panel de datos: la posición abre el informe con su vista
 * satelital —compuesta en el build y viajando dentro del fichero—, y el resto va en dos columnas: el
 * activo y lo verificado a la izquierda, la cadena y el gemelo a la derecha. Así se lee de arriba
 * abajo, en vez de rastrear una lista larga donde todo pesa igual.
 */
import { date, dateTime, esc, ico, selloVerysset } from '../ui.js';
import { api } from '../api.js';

/**
 * Todos los sellos de Verysset abren el informe de su activo, sin excepción: el de la tarjeta, el de
 * la ficha, el del proyecto y el del buscador. Va delegado en el documento y enganchado una sola vez,
 * así que vale para cualquier pantalla y sobrevive a que la vista se repinte —atar el manejador a
 * cada sello obligaba a repetirlo en cada vista, y en la ficha acabó apuntando a una clase que no
 * existía (`.badge.verysset`), con lo que el informe no se podía abrir desde ningún sitio.
 */
export function engancharSellos() {
  if (document.__sellosVss) return;
  document.__sellosVss = true;

  const abrir = async (sello) => {
    const unidad = sello.dataset.unidad;
    if (!unidad || sello.classList.contains('cargando')) return;
    sello.classList.add('cargando');
    const titulo = sello.dataset.titulo ?? '';
    const referencia = sello.dataset.ref ?? '';
    try {
      const informe = await api.twin(unidad);
      abrirInformeVerysset({ informe, titulo, referencia });
    } catch {
      // Si el informe no llega se dice, y el sello vuelve a su sitio: nunca se abre un informe a medias.
      sello.setAttribute('title', 'The verification report could not be loaded. Try again.');
      setTimeout(() => sello.setAttribute('title', 'Verified by Verysset'), 4000);
    } finally {
      sello.classList.remove('cargando');
    }
  };

  document.addEventListener('click', (e) => {
    const sello = e.target.closest?.('.sello-vss[data-unidad]');
    if (!sello) return;
    e.preventDefault();
    abrir(sello);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const sello = e.target.closest?.('.sello-vss[data-unidad]');
    if (!sello) return;
    e.preventDefault();
    abrir(sello);
  });
}

/** The explorer link is the verifier's, not ours: we only know how to point at it. */
const fila = (icono, etiqueta, valor, clase = '') => (valor === null || valor === undefined || valor === '')
  ? '' : `<dt>${ico(icono, 15)}<span>${esc(etiqueta)}</span></dt><dd class="${clase}">${esc(valor)}</dd>`;

/** Una cifra con su etiqueta, en cuadro: se lee de un vistazo, no se rastrea. */
const cuadro = (etiqueta, valor, unidad = '') => (valor === null || valor === undefined || valor === '')
  ? '' : `<div><span>${esc(etiqueta)}</span><b>${esc(String(valor))}${unidad ? ` ${esc(unidad)}` : ''}</b></div>`;

const enlaceDeMapa = (lat, lng) => (lat === null || lng === null || lat === undefined || lng === undefined)
  ? null
  : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

/* ---- el mapa del informe -------------------------------------------------
   Se mira como se mira cualquier mapa: se arrastra y se acerca. Las teselas son
   imagen satelital de Esri World Imagery (la misma fuente que la vista incrustada,
   con su atribución a la vista) y se piden al mirarlas, así que el edificio se ve
   de verdad y no un cuadrado de terreno. Si no hay red, se queda la imagen
   incrustada que trae el fichero, centrada en el punto: el informe nunca se queda
   sin la foto del sitio. */
const grados = (r) => (r * Math.PI) / 180;

const mundoPx = (lat, lng, z) => {
  const n = 2 ** z;
  const la = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const x = ((lng + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan(grados(la)) + 1 / Math.cos(grados(la))) / Math.PI) / 2) * n;
  return { x: x * 256, y: y * 256 };
};

const urlTesela = (z, x, y) => 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/'
  + `MapServer/tile/${z}/${y}/${x}`;

function montarMapa(raiz, { lat, lng, zoomInicial = 18, min = 16, max = 19, alSatelite } = {}) {
  const capa = raiz.querySelector('.vs-mapa-teselas');
  const pin = raiz.querySelector('.vs-mapa-pin');
  const teselas = new Map();
  let z = zoomInicial;
  let centro = mundoPx(lat, lng, z);
  let cargadas = 0;
  let falladas = 0;

  const pintar = () => {
    const w = raiz.clientWidth;
    const h = raiz.clientHeight;
    if (!w || !h) return;
    const izq = centro.x - w / 2;
    const arr = centro.y - h / 2;
    const n = 2 ** z;
    const vistas = new Set();
    for (let x = Math.floor(izq / 256); x <= Math.floor((izq + w) / 256); x += 1) {
      for (let y = Math.floor(arr / 256); y <= Math.floor((arr + h) / 256); y += 1) {
        if (y < 0 || y >= n) continue;
        const xc = ((x % n) + n) % n; // el mundo da la vuelta en horizontal
        const clave = `${z}/${xc}/${y}`;
        vistas.add(clave);
        let img = teselas.get(clave);
        if (!img) {
          img = document.createElement('img');
          img.className = 'vs-tesela';
          img.alt = '';
          img.decoding = 'async';
          img.addEventListener('error', () => {
            falladas += 1;
            // Solo se cae a la imagen del fichero si NINGUNA tesela llegó: una tesela suelta que
            // falle (una esquina fuera de cobertura) no puede apagar el mapa entero.
            if (!cargadas && falladas > 1) raiz.classList.add('sin-teselas');
          });
          img.addEventListener('load', () => {
            cargadas += 1;
            raiz.classList.add('con-teselas');
          });
          img.src = urlTesela(z, xc, y);
          teselas.set(clave, img);
          capa.appendChild(img);
        }
        img.style.transform = `translate3d(${Math.round(x * 256 - izq)}px,${Math.round(y * 256 - arr)}px,0)`;
      }
    }
    for (const [clave, img] of teselas) {
      if (!vistas.has(clave)) img.style.transform = 'translate3d(-9999px,0,0)'; // se reciclan sin recargar
    }
    const p = mundoPx(lat, lng, z);
    pin.style.transform = `translate3d(${Math.round(p.x - izq)}px,${Math.round(p.y - arr)}px,0)`;
  };

  const acercar = (paso) => {
    const nz = Math.max(min, Math.min(max, z + paso));
    if (nz === z) return;
    centro = { x: centro.x * 2 ** (nz - z), y: centro.y * 2 ** (nz - z) };
    z = nz;
    pintar();
  };

  let ultimo = null;
  const soltar = () => { ultimo = null; raiz.classList.remove('agarrando'); };
  raiz.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.vs-mapa-btn')) return;
    ultimo = { x: e.clientX, y: e.clientY };
    raiz.classList.add('agarrando');
    raiz.setPointerCapture?.(e.pointerId);
  });
  raiz.addEventListener('pointermove', (e) => {
    if (!ultimo) return;
    centro = { x: centro.x - (e.clientX - ultimo.x), y: centro.y - (e.clientY - ultimo.y) };
    ultimo = { x: e.clientX, y: e.clientY };
    pintar();
  });
  raiz.addEventListener('pointerup', soltar);
  raiz.addEventListener('pointercancel', soltar);
  raiz.addEventListener('wheel', (e) => { e.preventDefault(); acercar(e.deltaY < 0 ? 1 : -1); }, { passive: false });
  raiz.querySelectorAll('.vs-mapa-btn').forEach((b) => b.addEventListener('click', () => {
    const q = b.dataset.mapa;
    if (q === 'mas') acercar(1);
    else if (q === 'menos') acercar(-1);
    else if (q === 'satelite') { alSatelite?.(); }
    else { centro = mundoPx(lat, lng, z); pintar(); }
  }));
  window.addEventListener('resize', pintar);
  pintar();
}

/* ---- la imagen satelital entera, en su ventana ---------------------------
   El mapa del informe es el que es: cabe lo que cabe. El botón del satélite abre la imagen completa
   en una ventana donde se puede acercar, alejar y arrastrar para mirar la manzana, el edificio o el
   detalle del techo. Se cierra con la X, con Escape o pulsando fuera, y devuelve el foco a quien la
   abrió. El crédito de las imágenes viaja con la imagen: sin él no se enseña. */
function abrirSatelite({ imagen, credito = 'Imagery: Esri', titulo = '', donde = '', coord = '' } = {}) {
  if (!imagen) return;
  document.getElementById('sat-ventana')?.remove();
  const quien = document.activeElement;
  const capa = document.createElement('div');
  capa.id = 'sat-ventana';
  capa.className = 'sat';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-label', 'The whole satellite image of the asset');
  capa.innerHTML = `
    <div class="sat-caja">
      <header class="sat-bar">
        <span class="sat-lab">${ico('satelite', 15)} Satellite image</span>
        <b class="sat-tit">${esc([titulo, donde].filter(Boolean).join(' · '))}</b>
        ${coord ? `<span class="sat-coord">${ico('pin', 13)} ${esc(coord)}</span>` : ''}
        <div class="sat-mandos">
          <button type="button" class="sat-btn" data-sat="menos" aria-label="Zoom out">-</button>
          <button type="button" class="sat-btn" data-sat="mas" aria-label="Zoom in">+</button>
          <button type="button" class="sat-btn" data-sat="entera" aria-label="Fit the whole image">${ico('ampliar', 15)}</button>
          <button type="button" class="sat-x" aria-label="Close the satellite image">${ico('cerrar', 20)}</button>
        </div>
      </header>
      <div class="sat-lienzo">
        <div class="sat-capa">
          <img class="sat-img" src="${esc(imagen)}" alt="The whole satellite image of the position of the asset" draggable="false">
          ${coord ? `<span class="sat-pin" role="img" aria-label="Position of the asset: ${esc(coord)}">${ico('pin', 26)}</span>` : ''}
        </div>
      </div>
      <footer class="sat-pie">
        <span class="sat-credito">${esc(credito)}</span>
        <span class="sat-pista">Drag to move. The buttons or the wheel to zoom.</span>
        <span class="sat-nivel" id="sat-nivel">100%</span>
      </footer>
    </div>`;
  document.body.appendChild(capa);
  document.body.style.overflow = 'hidden';

  const capa2 = capa.querySelector('.sat-capa');
  const img = capa.querySelector('.sat-img');
  const pin = capa.querySelector('.sat-pin');
  const lienzo = capa.querySelector('.sat-lienzo');
  const nivel = capa.querySelector('#sat-nivel');
  let z = 1;
  let x = 0;
  let y = 0;

  const pintar = () => {
    capa2.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
    // El marcador va clavado en el punto del activo: se mueve con la imagen pero NO crece con el
    // zoom, porque un pin gigante tapa justo lo que se ha venido a mirar.
    if (pin) pin.style.transform = `translate(-50%, -100%) scale(${1 / z})`;
    nivel.textContent = `${Math.round(z * 100)}%`;
  };
  // La imagen se para en los bordes: no se puede arrastrar fuera de la vista y perderla.
  const topes = () => {
    const c = lienzo.getBoundingClientRect();
    const sobraX = Math.max(0, (c.width * z - c.width) / 2);
    const sobraY = Math.max(0, (c.height * z - c.height) / 2);
    x = Math.max(-sobraX, Math.min(sobraX, x));
    y = Math.max(-sobraY, Math.min(sobraY, y));
  };
  const cerrar = () => {
    document.removeEventListener('keydown', alTeclear);
    document.body.style.overflow = '';
    capa.remove();
    if (quien && typeof quien.focus === 'function') quien.focus();
  };
  function alTeclear(e) {
    if (e.key === 'Escape') { e.stopPropagation(); cerrar(); }
  }

  capa.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sat]');
    if (b) {
      const q = b.dataset.sat;
      if (q === 'mas') z = Math.min(6, z * 1.35);
      else if (q === 'menos') z = Math.max(1, z / 1.35);
      else { z = 1; x = 0; y = 0; }
      topes();
      pintar();
      return;
    }
    if (e.target.closest('.sat-x') || e.target === capa) cerrar();
  });

  let arrastre = null;
  lienzo.addEventListener('pointerdown', (e) => {
    arrastre = { x: e.clientX - x, y: e.clientY - y };
    lienzo.classList.add('arrastrando');
    lienzo.setPointerCapture?.(e.pointerId);
  });
  lienzo.addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    x = e.clientX - arrastre.x;
    y = e.clientY - arrastre.y;
    topes();
    pintar();
  });
  const soltar = () => { arrastre = null; lienzo.classList.remove('arrastrando'); };
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);
  lienzo.addEventListener('wheel', (e) => {
    e.preventDefault();
    z = Math.min(6, Math.max(1, z * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    topes();
    pintar();
  }, { passive: false });

  document.addEventListener('keydown', alTeclear);
  capa.querySelector('.sat-x').focus();
  pintar();
}

export function abrirInformeVerysset({ informe, titulo = '', referencia = '' } = {}) {
  if (!informe?.verificacion) return;
  const { verificacion: v, anclaje: a, gemelo, lectura, activo, aviso_lectura } = informe;

  const antes = document.activeElement;
  const capa = document.createElement('div');
  capa.className = 'vs';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-label', 'Verysset verification report');

  const coord = activo.latitud !== null && activo.latitud !== undefined && activo.longitud !== null
    ? `${Number(activo.latitud).toFixed(5)}, ${Number(activo.longitud).toFixed(5)}` : null;
  const enlaceMapa = enlaceDeMapa(activo.latitud, activo.longitud);
  const donde = [activo.comunidad, activo.emirato].filter(Boolean).join(' · ');
  const tituloActivo = titulo || [activo.tipo, activo.proyecto].filter(Boolean).join(' · ');

  capa.innerHTML = `
    <div class="vs-caja">
      <header class="vs-bar">
        ${selloVerysset('Verysset verification report')}
        <div class="vs-id">
          <b>Verification report</b>
          <span>${esc([tituloActivo, referencia].filter(Boolean).join(' · '))}</span>
        </div>
        <button type="button" class="vs-x" aria-label="Close the report">${ico('cerrar', 20)}</button>
      </header>

      <div class="vs-hero">
        <div class="vs-mapa" id="vs-mapa" role="application"
             aria-label="Satellite map of the position. Drag to move, scroll to zoom.">
          ${informe.satelite
            ? `<img class="vs-mapa-fija" src="${esc(informe.satelite)}" alt="Satellite view of the position of the asset">`
            : ''}
          <div class="vs-mapa-teselas" aria-hidden="true"></div>
          <span class="vs-mapa-pin" aria-hidden="true">${ico('pin', 20)}</span>
          <div class="vs-mapa-mandos">
            <button type="button" class="vs-mapa-btn" data-mapa="mas" aria-label="Zoom in">+</button>
            <button type="button" class="vs-mapa-btn" data-mapa="menos" aria-label="Zoom out">-</button>
            <button type="button" class="vs-mapa-btn" data-mapa="centro" aria-label="Back to the position">${ico('pin', 15)}</button>
            ${informe.satelite
              ? `<button type="button" class="vs-mapa-btn" data-mapa="satelite" aria-label="Open the whole satellite image">${ico('satelite', 15)}</button>`
              : ''}
          </div>
          <span class="vs-mapa-credito">${esc(informe.satelite_credito ?? 'Imagery: Esri')}</span>
          <div class="vs-hero-velo"></div>
          <div class="vs-hero-txt">
            <span class="vs-hero-lab">${ico('pin', 13)} ${esc([donde, coord].filter(Boolean).join(' · ') || 'Position not declared')}</span>
            <h3>${esc(tituloActivo)}</h3>
            <div class="vs-chips">
              <span class="vs-chip ok">${ico('sello', 13)} Verified${v.proveedor ? ` by ${esc(v.proveedor)}` : ''}</span>
              ${v.validado_en ? `<span class="vs-chip">Checked ${esc(date(v.validado_en))}</span>` : ''}
              ${v.vigencia ? `<span class="vs-chip">Valid until ${esc(date(v.vigencia))}</span>` : ''}
              ${v.score === null || v.score === undefined ? '' : `<span class="vs-chip">${esc(String(v.score))} / 100</span>`}
            </div>
          </div>
        </div>
      </div>

      ${(a.evidencia_id || a.hash) ? `<div class="vs-codigo">
        <span class="vs-codigo-lab">${ico('almohadilla', 13)} Image record</span>
        ${a.evidencia_id ? `<span class="vs-codigo-id">${esc(a.evidencia_id)}</span>` : ''}
        ${a.hash ? `<code class="vs-codigo-hash" title="${esc(a.hash)}">${esc(a.hash)}</code>` : ''}
        ${a.hash ? `<button type="button" class="vs-btn mini" id="vs-copiar-hash">${ico('almohadilla', 14)} Copy the code</button>` : ''}
      </div>` : ''}

      <div class="vs-cuerpo">
        <div class="vs-col">
          <section class="vs-mod">
            <h5>The asset</h5>
            <dl class="vs-filas">
              ${fila('obra', 'Asset', [activo.tipo, activo.proyecto].filter(Boolean).join(' · '))}
              ${fila('edificio', 'Developer', activo.desarrollador)}
              ${fila('pin', 'Where', donde)}
              ${fila('pin', 'Coordinates', coord)}
            </dl>
            <div class="vs-cuadros">
              ${cuadro('Bedrooms', activo.habitaciones)}
              ${cuadro('Bathrooms', activo.banos)}
              ${cuadro('Built-up', activo.superficie_sqft ? Number(activo.superficie_sqft).toLocaleString('en-US') : null, 'sqft')}
            </div>
            ${enlaceMapa ? `<div class="vs-acciones">
              <a class="vs-btn" href="${esc(enlaceMapa)}" target="_blank" rel="noopener noreferrer">${ico('mapa', 15)} Open the position on the map</a>
            </div>` : ''}
          </section>

          <section class="vs-mod">
            <h5>What was verified</h5>
            <dl class="vs-filas">
              ${fila('sello', 'Verified by', v.proveedor)}
              ${fila('inspeccion', 'Scope of the evidence', v.alcance)}
              ${fila('fecha', 'Checked on', v.validado_en ? date(v.validado_en) : null)}
              ${fila('entrega', 'Valid until', v.vigencia ? date(v.vigencia) : null)}
              ${fila('avance', 'Verification score', v.score === null || v.score === undefined ? null : `${v.score} / 100`)}
            </dl>
            ${v.aviso ? `<p class="vs-nota">${esc(v.aviso)}</p>` : ''}
          </section>
        </div>

        <div class="vs-col">
          <section class="vs-mod">
            <h5>Evidence anchored on chain ${a.demo ? '<span class="vs-tag">sandbox · demo anchor</span>' : ''}</h5>
            <dl class="vs-filas">
              ${fila('pano', 'Network', a.red)}
              ${fila('permiso', 'Evidence id', a.evidencia_id)}
            </dl>
            ${a.tx ? `<div class="vs-cadena">
              <span class="vs-mono-lab">Transaction</span>
              <code class="vs-mono">${esc(a.tx)}</code>
            </div>` : ''}
            ${a.hash ? `<div class="vs-cadena">
              <span class="vs-mono-lab">Digest of the evidence (sha256)</span>
              <code class="vs-mono">${esc(a.hash)}</code>
            </div>` : ''}
            <div class="vs-acciones">
              ${a.tx ? `<button type="button" class="vs-btn" id="vs-copiar">${ico('almohadilla', 15)} Copy the transaction</button>` : ''}
              ${a.explorador ? `<a class="vs-btn" href="${esc(a.explorador)}" target="_blank" rel="noopener noreferrer">${ico('ampliar', 15)} See it on the explorer</a>` : ''}
            </div>
            ${a.tx && !a.explorador ? '<p class="vs-nota">The platform does not know that network, so it offers no link rather than a wrong one.</p>' : ''}
            ${a.demo ? `<p class="vs-nota">The digest is real: it is the sha256 of the evidence as it was received,
              and this anchor is written by the sandbox, not by a chain.</p>` : ''}
          </section>

          <section class="vs-mod">
            <h5>Digital twin of the asset <span class="vs-live"><i></i>live</span></h5>
            <dl class="vs-filas">
              ${fila('obra', 'Twin', gemelo.id)}
              ${fila('permiso', 'Kept by', gemelo.creado_por)}
            </dl>
            <div class="vs-cuadros">
              ${cuadro('Temperature', lectura.temperatura_c, '°C')}
              ${cuadro('Humidity', lectura.humedad_pct, '%')}
              ${cuadro('Air (IQAI)', lectura.calidad_aire_iqai)}
              ${cuadro('Consumption', lectura.consumo_kwh, 'kWh')}
            </div>
            <p class="vs-nota">Read at ${esc(dateTime(lectura.leido_en))}. ${esc(aviso_lectura)}</p>
          </section>
        </div>
      </div>

      <footer class="vs-pie">
        <span>Verification by Verysset. The marketplace only relays its report: it is not legal advice
          and it does not transfer ownership of anything.</span>
        ${informe.satelite_credito ? `<span class="vs-credito">${esc(informe.satelite_credito)}</span>` : ''}
      </footer>
    </div>`;

  document.body.appendChild(capa);
  document.body.classList.add('sin-scroll');

  // El mapa se enciende al montarlo: arrastrar, rueda y botones. Se le da el punto exacto del activo.
  const mapa = capa.querySelector('#vs-mapa');
  if (mapa && coord) {
    montarMapa(mapa, {
      lat: Number(activo.latitud),
      lng: Number(activo.longitud),
      alSatelite: () => abrirSatelite({
        imagen: informe.satelite,
        credito: informe.satelite_credito ?? 'Imagery: Esri',
        titulo: tituloActivo,
        donde,
        coord,
      }),
    });
  }

  const cerrar = () => {
    document.removeEventListener('keydown', tecla);
    document.body.classList.remove('sin-scroll');
    capa.remove();
    if (antes?.focus) antes.focus();
  };
  const tecla = (e) => { if (e.key === 'Escape') cerrar(); };
  capa.querySelector('.vs-x').addEventListener('click', cerrar);
  capa.addEventListener('click', (e) => { if (e.target === capa) cerrar(); });
  document.addEventListener('keydown', tecla);
  capa.querySelector('#vs-copiar')?.addEventListener('click', (e) => {
    const boton = e.currentTarget;
    navigator.clipboard?.writeText(a.tx ?? '').then(() => {
      boton.innerHTML = `${ico('permiso', 15)} Copied`;
    }).catch(() => { boton.textContent = 'Copy it by hand'; });
  });
  capa.querySelector('#vs-copiar-hash')?.addEventListener('click', (e) => {
    const boton = e.currentTarget;
    navigator.clipboard?.writeText(a.hash ?? '').then(() => {
      boton.innerHTML = `${ico('permiso', 14)} Code copied`;
    }).catch(() => { boton.textContent = 'Copy it by hand'; });
  });

  capa.querySelector('.vs-x').focus();
}

/**
 * A hash router: no build step, no server rewrites, and the back button works.
 * A route is `#/unit/:id?algo=1`; the handler receives the path parameters and the query.
 */
const rutas = [];
let noEncontrada = null;

function compilar(patron) {
  const nombres = [];
  const re = new RegExp(
    '^' + patron.replace(/:([A-Za-z_]+)/g, (_, n) => { nombres.push(n); return '([^/]+)'; }) + '/?$',
  );
  return { re, nombres };
}

export function route(patron, handler) {
  const { re, nombres } = compilar(patron);
  rutas.push({ re, nombres, handler });
}

export function notFound(handler) { noEncontrada = handler; }

export function actual() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const i = raw.indexOf('?');
  const path = i === -1 ? raw : raw.slice(0, i);
  const query = new URLSearchParams(i === -1 ? '' : raw.slice(i + 1));
  return { path: path || '/', query };
}

export function go(destino) {
  if (location.hash === `#${destino}`) render();
  else location.hash = destino;
}

export function start() {
  window.addEventListener('hashchange', render);
  render();
}

/**
 * A view that throws must say so. Without this the page keeps half a screen drawn by the previous
 * view and looks like it worked: the failure is silent, and a silent failure in a portal that shows
 * money is the worst kind.
 */
function fallar(e) {
  // eslint-disable-next-line no-console
  console.error(e);
  const v = document.getElementById('view');
  if (!v) return;
  const caja = document.createElement('div');
  caja.className = 'msg err';
  caja.style.marginTop = '16px';
  const b = document.createElement('b');
  b.textContent = 'This screen could not be drawn.';
  const p = document.createElement('p');
  p.style.margin = '.4rem 0 0';
  p.textContent = String(e?.message ?? e);
  caja.append(b, p);
  v.innerHTML = '';
  v.appendChild(caja);
}

export function render() {
  // Going to the top belongs to NAVIGATION, not to painting: the asset selector repaints the view
  // and must not throw the reader back to the top of the page when they only changed a currency.
  const { path, query } = actual();
  // La pantalla en la que estamos, escrita en el armazón. El diseño la usa para tratar la portada
  // de una manera y las pantallas de trabajo de otra sin tener que tocar la portada.
  document.body.dataset.ruta = path === '/' ? 'inicio' : path.replace(/^\//, '').split('/')[0];
  for (const r of rutas) {
    const m = r.re.exec(path);
    if (!m) continue;
    const params = {};
    r.nombres.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
    // Every view starts from the top; the scroll of the previous one is not inherited.
    document.getElementById('view')?.scrollIntoView?.({ block: 'start' });
    try {
      const p = r.handler({ params, query });
      if (p && typeof p.catch === 'function') p.catch(fallar);
      return p;
    } catch (e) {
      fallar(e);
      return undefined;
    }
  }
  if (noEncontrada) return noEncontrada({ params: {}, query });
  return undefined;
}

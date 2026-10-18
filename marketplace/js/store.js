/**
 * Session and small caches, in localStorage.
 *
 * The token is the only thing that identifies the buyer. Nothing else is trusted from here: the role
 * and the permissions always come from `/auth/session`, never from what was saved, the browser is
 * the buyer's machine, so anything in it can be edited by the buyer.
 */
import { api } from './api.js'; // eslint-disable-line import/no-cycle -- api reads the token, the store asks for the list

const KEY = 'blockestate.session';

let sesion = null;
try {
  const raw = localStorage.getItem(KEY);
  if (raw) sesion = JSON.parse(raw);
} catch { sesion = null; }

const oyentes = new Set();
function avisar() {
  for (const f of oyentes) {
    try { f(); } catch { /* one listener breaking must not stop the others */ }
  }
}

export const store = {
  token: () => sesion?.sesion ?? null,
  usuario: () => sesion?.usuario ?? null,
  rol: () => sesion?.rol ?? null,
  permisos: () => sesion?.permisos ?? [],
  logged: () => Boolean(sesion?.sesion),

  save(data) {
    sesion = { ...(sesion ?? {}), ...data };
    localStorage.setItem(KEY, JSON.stringify(sesion));
    avisar();
  },

  clear() {
    sesion = null;
    store.favs = new Set();
    localStorage.removeItem(KEY);
    avisar();
  },

  onChange(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  },

  /** The buyer's shortlist, cached by unit id so a card knows its own state. */
  favs: new Set(),
  isFav: (unidadId) => store.favs.has(unidadId),
  setFavs: (unidades) => {
    store.favs = new Set((unidades ?? []).map((u) => u.unidad_id ?? u.id));
    avisar();
  },
  markFav: (unidadId, on) => {
    if (on) store.favs.add(unidadId);
    else store.favs.delete(unidadId);
    avisar();
  },

  /** Asks the API who the buyer is and keeps the shortlist in sync. Never throws. */
  async refresh() {
    if (!sesion?.sesion) return;
    try {
      const s = await api.session();
      store.save({ usuario: s.usuario, rol: s.rol, permisos: s.permisos });
      const f = await api.favorites();
      store.setFavs(f.unidades);
    } catch {
      /* an expired or revoked session: the next request will drop it */
    }
  },
};

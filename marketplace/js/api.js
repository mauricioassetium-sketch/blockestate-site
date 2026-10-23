/** The API client: one place that knows the routes, the token and the errors. */
import { API_BASE } from './config.js';
import { store } from './store.js';

export class ApiError extends Error {
  constructor(status, codigo, mensaje) {
    super(mensaje || codigo || `HTTP ${status}`);
    this.status = status;
    this.codigo = codigo;
  }
}

async function req(method, path, { body, auth = true } = {}) {
  const headers = {};
  // A form with files carries no content-type by hand: the browser writes it with the boundary, and
  // writing it here would leave the file unnamed on the other side.
  const esForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !esForm) headers['content-type'] = 'application/json';
  const token = store.token();
  if (auth && token) headers.authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : (esForm ? body : JSON.stringify(body)),
    });
  } catch {
    throw new ApiError(0, 'sin_red', 'No connection with the marketplace. Check the network and try again.');
  }

  if (res.status === 204) return null;
  const texto = await res.text();
  let data = null;
  try { data = texto ? JSON.parse(texto) : null; } catch { data = { mensaje: texto.slice(0, 200) }; }

  if (!res.ok) {
    const err = new ApiError(res.status, data?.codigo, data?.mensaje);
    // A session that expired is dropped here, once, instead of in every view.
    if (res.status === 401 && auth) store.clear();
    throw err;
  }
  return data;
}

const qs = (obj) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    p.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
};

/**
 * La dirección de un medio que sirve la propia plataforma.
 *
 * Las subidas vuelven como ruta (`/uploads/…`). Una ruta relativa dentro del
 * portal apuntaría al sitio que sirve la página —otro origen, y en producción
 * otro host— así que se le pone delante la base de la API. Una dirección absoluta
 * se respeta tal cual.
 */
export function urlDeMedio(u) {
  if (!u) return '';
  // Solo se le pone delante la base de la API cuando es una RUTA de la plataforma (`/uploads/…`).
  // Un `data:` —la vista previa lleva los medios dentro del propio fichero— y una dirección
  // absoluta se dejan tal cual: anteponerle el dominio a un `data:` lo rompe, y sin decirlo.
  return u.startsWith('/') ? API_BASE + u : u;
}

export const api = {
  // public catalogue
  search: (filtros) => req('GET', `/catalog/search${qs(filtros)}`, { auth: false }),
  project: (id) => req('GET', `/catalog/projects/${id}`, { auth: false }),
  projects: (filtros) => req('GET', `/catalog/projects${qs(filtros)}`, { auth: false }),
  unit: (id) => req('GET', `/catalog/units/${id}`, { auth: false }),
  media: (id) => req('GET', `/catalog/units/${id}/media`, { auth: false }),
  priceMap: (filtros = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filtros)) if (v !== '' && v !== undefined && v !== null) q.set(k, v);
    const s = q.toString();
    return req('GET', `/catalog/price-map${s ? `?${s}` : ''}`, { auth: false });
  },
  // The report behind the Verysset badge, and what the asset's twin reads.
  twin: (id) => req('GET', `/catalog/units/${id}/twin`, { auth: false }),
  // El avance de las obras: lo que el promotor declara cada mes y lo que alguien fue a inspeccionar.
  // Son dos cosas distintas y viajan separadas (BR-008).
  proyectoAvance: (id) => req('GET', `/projects/${id}/progress`, { auth: false }),
  devDeclararAvance: (id, body) => req('POST', `/projects/${id}/progress`, { body }),
  // La sala de prensa: lo que la mesa ha publicado, y una noticia por su dirección. Público y sin
  // sesión: lo que no está publicado no lo devuelve la API, así que aquí no hay nada que esconder.
  noticias: (qs = '') => req('GET', `/news${qs}`, { auth: false }),
  noticia: (slug) => req('GET', `/news/${encodeURIComponent(slug)}`, { auth: false }),
  // The developer's portal: the organisation, its inventory and its book. Every one of these is
  // scoped to the organisation of the session by the API, never by this layer.
  devMe: () => req('GET', '/me/developer'),
  creadorMe: () => req('GET', '/me/creator'),
  devUnits: (filtros) => req('GET', `/me/units${qs(filtros)}`),
  devProjects: () => req('GET', '/me/projects'),
  devSales: (filtros) => req('GET', `/me/sales${qs(filtros)}`),
  devSale: (id) => req('GET', `/me/sales/${id}`),
  // The developer's own work: what they put up for sale, what is verified, and who sells for them.
  // The API scopes every one of these to the session's organisation; the permissions decide which
  // of them a contributor may use.
  devReferrals: () => req('GET', '/referrals'),
  devReferralCreate: (body) => req('POST', '/referrals', { body }),
  devProjectCreate: (body) => req('POST', '/projects', { body }),
  devUnitCreate: (proyectoId, body) => req('POST', `/projects/${proyectoId}/units`, { body }),
  // Dónde está la vivienda: ponerla o corregirla. Sin ella el anuncio no se puede enviar a revisión,
  // así que tiene que haber una puerta para ponerla — y para arreglar un número mal tecleado.
  devSetLocation: (unidadId, body) => req('PUT', `/units/${unidadId}/location`, { body }),
  devListing: (id) => req('GET', `/listings/${id}`),
  devListingCreate: (body) => req('POST', '/listings', { body }),
  devListingMedia: (id, body) => req('POST', `/listings/${id}/media`, { body }),
  devListingSubmit: (id) => req('POST', `/listings/${id}/submit`),
  // A photo goes to the public store, the buyer sees it, and so does Verysset. A paper goes to the
  // documents, which are private and reached only through the API.
  subirImagen: (archivo) => {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return req('POST', '/uploads/image', { body: fd });
  },
  // El vídeo entra por la misma puerta que la imagen, un escalón más arriba: mismo control, misma
  // validación por los bytes. La ruta existirá cuando exista en el backend, y hasta entonces esta
  // llamada falla y el proyecto se crea sin vídeo, que es lo que se le dice al usuario.
  subirVideo: (archivo) => {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return req('POST', '/uploads/video', { body: fd });
  },
  subirDocumento: (archivo, meta) => {
    const fd = new FormData();
    fd.append('archivo', archivo);
    for (const [k, v] of Object.entries(meta ?? {})) if (v) fd.append(k, String(v));
    return req('POST', '/documents/upload', { body: fd });
  },
  // The rail: the developers with published stock and the significant projects.
  developers: () => req('GET', '/catalog/developers', { auth: false }),
  // The referral code: public, and it says who brought the buyer.
  referral: (codigo) => req('GET', `/referrals/${encodeURIComponent(codigo)}`, { auth: false }),

  // session
  login: (email, contrasena) => req('POST', '/auth/login', { body: { email, contrasena }, auth: false }),
  register: (body) => req('POST', '/auth/register', { body, auth: false }),
  mfaVerify: (sesion, codigo) => req('POST', '/auth/mfa/verify', { body: { sesion, codigo }, auth: false }),
  session: () => req('GET', '/auth/session'),

  // the buyer's own
  favorites: () => req('GET', '/me/favorites'),
  addFavorite: (unidad_id) => req('POST', '/me/favorites', { body: { unidad_id } }),
  removeFavorite: (unidad_id) => req('DELETE', `/me/favorites/${unidad_id}`),
  portfolio: () => req('GET', '/me/portfolio'),
  purchase: (id) => req('GET', `/me/portfolio/${id}`),
  notifications: (filtros) => req('GET', `/me/notifications${qs(filtros)}`),
  readNotification: (id) => req('POST', `/me/notifications/${id}/read`),
  readAllNotifications: () => req('POST', '/me/notifications/read-all'),
  savedSearch: (nombre, filtros) => req('POST', '/catalog/saved-searches', { body: { nombre, filtros } }),

  // purchase flow
  hold: (unidad_id, body) => req('POST', `/units/${unidad_id}/holds`, { body }),
  purchase2: (hold_id, descuento) => req('POST', '/purchases', { body: { hold_id, descuento } }),
  purchaseGet: (id) => req('GET', `/purchases/${id}`),
  kycRequest: (id) => req('POST', `/purchases/${id}/kyc`),
  kycState: (id) => req('GET', `/purchases/${id}/kyc`),
  // The buyer declares for this purchase: who they are and where the money will
  // come from. It can be corrected while the case is still open.
  kycDeclare: (id, body) => req('PUT', `/purchases/${id}/kyc/declaration`, { body }),
  kycDeclaration: (id) => req('GET', `/purchases/${id}/kyc/declaration`),
  quote: (id, body) => req('POST', `/purchases/${id}/quote`, { body }),
  paymentOrder: (id, concepto) => req('POST', `/purchases/${id}/payment-order`, { body: { concepto } }),
  payment: (serialNo) => req('GET', `/payments/${serialNo}`),
  cancel: (id, motivo) => req('POST', `/purchases/${id}/cancel`, { body: { motivo } }),
  receipt: (id) => req('POST', `/purchases/${id}/receipt`),
  receiptGet: (id) => req('GET', `/purchases/${id}/receipt`),
};

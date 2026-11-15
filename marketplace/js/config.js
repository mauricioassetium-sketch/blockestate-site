/**
 * Configuration of the buyer marketplace.
 *
 * The API base is resolved in this order: `?api=` in the address (handy to point the same build at
 * another environment), then the same origin if this build is served by the API itself, and finally
 * the local development API. Nothing here holds a secret: the session token lives in the browser and
 * is sent as a bearer header.
 */
const params = new URLSearchParams(location.search);

// En producción el marketplace es estático (blockestate.ae) y la API vive en su propio subdominio, así
// que `location.origin` no sirve: apuntaría al sitio, no al backend. `?api=` sigue mandando.
const PRODUCCION_API = 'https://api.blockestate.ae/api';
const PRODUCCION_HOSTS = ['blockestate.ae', 'www.blockestate.ae'];

/**
 * The production pair is the only one that splits site and API: there the page is static on the
 * apex and the data lives in the api subdomain. Everywhere else this build is mounted on the API
 * itself (a droplet, an IP, a demo subdomain), so the page talks to its own origin and a wrong or
 * missing certificate on a subdomain can never take the catalogue down again.
 */
const aparte = PRODUCCION_HOSTS.includes(location.hostname);

export const API_BASE =
  params.get('api') ??
  (aparte && location.port !== '3000'
    ? PRODUCCION_API
    : location.origin);

/** What the buyer reads for the values the API returns as codes. */
export const TIPOS = {
  apartment: 'Apartment',
  villa: 'Villa',
  office: 'Office',
  retail: 'Retail',
  hotel: 'Hotel',
};

export const ESTADOS_OBRA = { ready: 'Ready', off_plan: 'Off plan' };

export const EMIRATOS = ['Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain'];

export const AMENIDADES = {
  pool: 'Pool',
  gym: 'Gym',
  parking: 'Parking',
  sea_view: 'Sea view',
  garden: 'Garden',
  security_24h: '24h security',
  balcony: 'Balcony',
  concierge: 'Concierge',
  pets: 'Pets allowed',
  kids_area: "Children's area",
};

/** Turns a code into something readable, whatever code it is. */
export function label(map, code) {
  if (code === null || code === undefined || code === '') return 'Not specified';
  return map[code] ?? String(code).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export const PAGE = 12;

/**
 * What a quote can be asked for. The truth lives in the domain (`src/domain/business-rules.ts`:
 * `ACTIVOS_SOPORTADOS` and `REDES_SOPORTADAS`), and the API rejects anything else with
 * `activo_no_soportado` / `red_no_soportada`. This is the only place in the front that repeats it.
 */
export const ACTIVOS = ['USDT', 'BNB'];
export const RED = 'BNB Chain (BSC)';

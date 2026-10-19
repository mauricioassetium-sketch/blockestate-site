/**
 * The bridge between dirhams and the two currencies the buyer pays with.
 *
 * The rule of the model is BR-002, and it is the whole reason this file exists: **a digital asset equivalent
 * is a time-bounded quote**, never a promise. So nothing here invents a rate. The platform has no rate
 * feed yet, and until it has one the rate is the one the user types, the seller quoting, or the
 * buyer reading, and every figure that comes out of it says the rate and says that it is an
 * indication.
 *
 * The contract price is always in dirhams (BR-001). What this converts is the *view* of it.
 */
import { money } from './ui.js';

const CLAVE = 'blockestate.cambio';

/** The assets the model documents: USDT and BNB, on BNB Chain. Nothing else is quoted. */
export const ACTIVOS_CAMBIO = [
  ['USDT', 'USDT · BNB Chain'],
  ['BNB', 'BNB · BNB Chain'],
];

let estadoCambio = leer();

/**
 * A rate is a positive number or it is nothing. It is a `function` on purpose: `leer()` runs while the
 * module is being read, and an arrow held in a `const` further down would not exist yet, the `try`
 * would swallow the reference error and the store would look empty for ever.
 */
function numero(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
}

function leer() {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) ?? '{}');
    return {
      usdt: numero(crudo.usdt),
      bnb: numero(crudo.bnb),
      ver: crudo.ver ?? null,
      // La unidad en la que el visitante lee las superficies. El mercado cotiza en pies cuadrados;
      // quien viene de fuera lee metros. Es una preferencia, no un dato: el dato son los pies.
      unidad: crudo.unidad === 'm2' ? 'm2' : 'sqft',
      visto: crudo.visto ?? null,
      fuente: typeof crudo.fuente === 'string' ? crudo.fuente : null,
    };
  } catch {
    return { usdt: null, bnb: null, ver: null, unidad: 'sqft' };
  }
}

/** The assets a price can be read in, and the choice the reader made. */
export const ACTIVOS_VER = ['USDT', 'BNB'];

/**
 * Which asset the reader wants to see. Stored with the rates, because it is the same decision: how
 * this platform talks about money in digital assets.
 */
export function activoElegido() {
  return estadoCambio.ver && ACTIVOS_VER.includes(estadoCambio.ver) ? estadoCambio.ver : 'USDT';
}

export function elegirActivo(activo) {
  estadoCambio = { ...estadoCambio, ver: ACTIVOS_VER.includes(activo) ? activo : 'USDT' };
  try { localStorage.setItem(CLAVE, JSON.stringify(estadoCambio)); } catch { /* sigue calculando */ }
  return estadoCambio;
}

/** The units a surface can be read in, and the one the reader chose. */
export const UNIDADES = ['sqft', 'm2'];

export function unidadElegida() {
  return estadoCambio.unidad === 'm2' ? 'm2' : 'sqft';
}

export function elegirUnidad(unidad) {
  estadoCambio = { ...estadoCambio, unidad: unidad === 'm2' ? 'm2' : 'sqft' };
  try { localStorage.setItem(CLAVE, JSON.stringify(estadoCambio)); } catch { /* sigue calculando */ }
  return estadoCambio;
}

/**
 * A rate outside this band is not a rate, it is a typo, and a typo must never become a price. With
 * the rate at 0.0001 AED per USDT, a flat of one and a half million dirhams read as fifteen thousand
 * million USDT: a number so absurd that the sensible reading is not «the rate is wrong» but «the
 * marketplace is broken». The band is wide on purpose (BNB sits around 2,400 and USDT around 3.67);
 * it only catches what cannot possibly be a rate.
 */
export const BANDA_TASA = [0.5, 100000];
export function tasaPlausible(activo) {
  const t = tasa(activo);
  return t === null ? false : t >= BANDA_TASA[0] && t <= BANDA_TASA[1];
}

/** AED per unit of the asset. `null` means «not known», and an unknown rate shows nothing at all. */
export function tasa(activo) {
  return estadoCambio[String(activo).toLowerCase()] ?? null;
}

export function hayTasa() {
  return tasa('USDT') !== null || tasa('BNB') !== null;
}

/**
 * The rate, set by hand. It is stamped with the moment it was written, because a rate without its
 * moment is a number that lies about its age.
 */
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(estadoCambio)); } catch { /* a browser that blocks storage still calculates */ }
}

export function fijarTasa(activo, valor) {
  estadoCambio = { ...estadoCambio, [String(activo).toLowerCase()]: numero(valor), visto: new Date().toISOString(), fuente: 'typed by hand' };
  guardar();
  return estadoCambio;
}

/**
 * The live rate. CoinGecko quotes both assets straight against the dirham and asks for no key, which
 * is why it can be read from the browser today. Two things about it, said plainly: if the call fails
 * nothing is invented, the last known rate stays, with the moment it was read, and when the
 * platform grows its own backend feed, this is the piece that moves there, because a price that only
 * ever comes from the visitor's browser is a price nobody can audit.
 */
const FUENTE = 'https://api.coingecko.com/api/v3/simple/price?ids=tether,binancecoin&vs_currencies=aed';

export async function refrescarTasas() {
  try {
    const r = await fetch(FUENTE, { headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    const d = await r.json();
    const usdt = numero(d?.tether?.aed);
    const bnb = numero(d?.binancecoin?.aed);
    if (!usdt || !bnb) return null;
    estadoCambio = { ...estadoCambio, usdt, bnb, fuente: 'CoinGecko', visto: new Date().toISOString() };
    guardar();
    return estadoCambio;
  } catch {
    return null;
  }
}

export function fuenteTasa() {
  return estadoCambio.fuente;
}

export function cuando() {
  return estadoCambio.visto;
}

/**
 * The fils of a row, whichever way they arrived. The search answers with the price already formatted
 * and the sheet answers with fils: one of the two is always there, and a card that cannot read the
 * price of a row is a card that shows nothing.
 */
export function filsDe(fila) {
  if (Number.isInteger(fila?.precio_fils)) return fila.precio_fils;
  const n = Number(String(fila?.precio_aed ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** What a price in fils is worth in the asset, at the rate in force. `null` if there is no rate. */
export function equivalencia(fils, activo = activoElegido()) {
  if (!tasaPlausible(activo)) return null;
  const t = tasa(activo);
  if (!t || fils === null || fils === undefined) return null;
  return Number(fils) / 100 / t;
}

/** The asset amounts are not money: 6 decimals for USDT is noise on a card, so they are trimmed. */
function cifra(v, decimales) {
  return Number(v).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: decimales });
}

/**
 * The line a card adds under the price. It carries the asset, the amount, the rate and the fact that
 * it is an indication, the four things BR-002 asks for, in one line, without shouting.
 */
export function equivalenteTexto(fils, { aCorto = false } = {}) {
  if (!hayTasa()) return '';
  const trozos = [];
  for (const [activo] of ACTIVOS_CAMBIO) {
    const v = equivalencia(fils, activo);
    if (v === null) continue;
    trozos.push(`${cifra(v, activo === 'USDT' ? 0 : 2)} ${activo}`);
  }
  if (!trozos.length) return '';
  return aCorto ? trozos.join(' · ') : `≈ ${trozos.join(' · ')} · indicative, at your rate`;
}

/**
 * The two lines of a price, in the order the buyer reads them: first what it costs in the currency
 * they pay with, then the contract price in dirhams. The asset in front is the one the reader chose,
 * and the selector travels with the first line.
 */
/**
 * The two equivalents of a price, both of them, in the order the reader chose. Showing only the
 * chosen asset was the mistake: a buyer wants to see what the price is in USDT and in BNB at once,
 * and the selector decides which one they read first, not which one exists.
 */
export function cifrasCripto(fila) {
  const primero = activoElegido();
  const orden = [primero, ...ACTIVOS_VER.filter((a) => a !== primero)];
  // Two decimals for USDT and four for BNB: with the figure rounded away, anyone checking it with a
  // calculator gets a different number back (408,441 × 3.6725 is 1,500,003.70, not 1,500,000), and a
  // figure that does not survive being multiplied back reads as a wrong figure, not as a rounded one.
  const partes = orden.map((a) => {
    const v = equivalencia(filsDe(fila), a);
    return v === null ? null : `${cifra(v, a === 'USDT' ? 2 : 4)} ${a}`;
  }).filter(Boolean);
  return partes.length ? `≈ ${partes.join(' · ')}` : '';
}

/** The rate as it was written, not rounded into another number: 3.6725 is not 3.67. */
export function tasaTexto(activo) {
  const t = tasa(activo);
  if (t === null) return null;
  return t.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

export function cifraCripto(fila) {
  const activo = activoElegido();
  const v = equivalencia(filsDe(fila), activo);
  if (v === null) return '';
  return `${cifra(v, activo === 'USDT' ? 0 : 2)} ${activo}`;
}

/** The same figure, spelled out for a sheet: what was converted, at what rate, and when. */
export function detalleConversion(fils, activo) {
  const t = tasa(activo);
  if (!t) return '';
  const v = equivalencia(fils, activo);
  return `1 ${activo} = ${money(t * 100)} · ${activo} ${cifra(v, activo === 'USDT' ? 2 : 4)} · indicative`;
}

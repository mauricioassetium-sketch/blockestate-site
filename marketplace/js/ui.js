/** Small view helpers: escaping, money, cards, toasts. No framework, no build step. */
import { ACTIVOS_VER, activoElegido, cifraCripto, cifrasCripto, elegirActivo, equivalenteTexto, filsDe, fijarTasa, tasa, tasaPlausible, tasaTexto, fuenteTasa, cuando, unidadElegida } from './cambio.js';
import { render } from './router.js';
import { AMENIDADES, ESTADOS_OBRA, TIPOS, label } from './config.js';
import { store } from './store.js';
import { api } from './api.js';
// Las marcas de los canales, una sola vez para todo el portal: son las mismas que usa la ficha,
// y no se redibujan ni se piden a un CDN.
export const MARCA_WA = 'data:image/png;base64,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';
export const MARCA_TG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYwIiBoZWlnaHQ9IjM2MiIgdmlld0JveD0iMCAwIDM2MCAzNjIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMzA3LjU0NiA1Mi41NjU1QzI3My43MDkgMTguNjg1IDIyOC43MDYgMC4wMTcxODk1IDE4MC43NTYgMEM4MS45NTEgMCAxLjUzODQ2IDgwLjQwNCAxLjUwNDA4IDE3OS4yMzVDMS40ODY4OSAyMTAuODI5IDkuNzQ2NDYgMjQxLjY2NyAyNS40MzE5IDI2OC44NDRMMCAzNjEuNzM2TDk1LjAyMzYgMzM2LjgxMUMxMjEuMjAzIDM1MS4wOTYgMTUwLjY4MyAzNTguNjE2IDE4MC42NzkgMzU4LjYyNUgxODAuNzU2QzI3OS41NDQgMzU4LjYyNSAzNTkuOTY2IDI3OC4yMTIgMzYwIDE3OS4zODFDMzYwLjAxNyAxMzEuNDgzIDM0MS4zOTIgODYuNDU0NyAzMDcuNTQ2IDUyLjU3NDFWNTIuNTY1NVpNMTgwLjc1NiAzMjguMzU0SDE4MC42OTZDMTUzLjk2NiAzMjguMzQ2IDEyNy43NDQgMzIxLjE2IDEwNC44NjUgMzA3LjU4OUw5OS40MjQyIDMwNC4zNThMNDMuMDM0IDMxOS4xNDlMNTguMDgzNCAyNjQuMTY4TDU0LjU0MjMgMjU4LjUzQzM5LjYzMDQgMjM0LjgwOSAzMS43NDkgMjA3LjM5MSAzMS43NjYyIDE3OS4yNDRDMzEuODAwNiA5Ny4xMDM2IDk4LjYzMzQgMzAuMjcwNyAxODAuODE3IDMwLjI3MDdDMjIwLjYxIDMwLjI4NzkgMjU4LjAxNSA0NS44MDE1IDI4Ni4xNDUgNzMuOTY2NUMzMTQuMjc2IDEwMi4xMjMgMzI5Ljc1NSAxMzkuNTYyIDMyOS43MzggMTc5LjM2NEMzMjkuNzAzIDI2MS41MTMgMjYyLjg3MSAzMjguMzQ2IDE4MC43NTYgMzI4LjM0NlYzMjguMzU0Wk0yNjIuNDc1IDIxNi43NzdDMjU3Ljk5NyAyMTQuNTM0IDIzNS45NzggMjAzLjcwNCAyMzEuODY5IDIwMi4yMDlDMjI3Ljc2MSAyMDAuNzEzIDIyNC43NzkgMTk5Ljk2NiAyMjEuNzk2IDIwNC40NTJDMjE4LjgxNCAyMDguOTM5IDIxMC4yMjggMjE5LjAyOSAyMDcuNjE1IDIyMi4wMTFDMjA1LjAwMiAyMjUuMDAyIDIwMi4zODkgMjI1LjM3MiAxOTcuOTExIDIyMy4xMjhDMTkzLjQzNCAyMjAuODg1IDE3OS4wMDMgMjE2LjE1OCAxNjEuODkxIDIwMC45MDJDMTQ4LjU3OCAxODkuMDI0IDEzOS41ODcgMTc0LjM2MiAxMzYuOTc1IDE2OS44NzVDMTM0LjM2MiAxNjUuMzg5IDEzNi43IDE2Mi45NjUgMTM4LjkzNCAxNjAuNzM5QzE0MC45NDUgMTU4LjcyOCAxNDMuNDEyIDE1NS41MDUgMTQ1LjY1NSAxNTIuODkyQzE0Ny44OTkgMTUwLjI3OSAxNDguNjM4IDE0OC40MDYgMTUwLjEzMyAxNDUuNDIzQzE1MS42MjkgMTQyLjQzMiAxNTAuODgxIDEzOS44MiAxNDkuNzY0IDEzNy41NzZDMTQ4LjY0NiAxMzUuMzMzIDEzOS42OTEgMTEzLjI4NyAxMzUuOTUyIDEwNC4zMjNDMTMyLjMxNiA5NS41OTA5IDEyOC42MjEgOTYuNzc3IDEyNS44NzkgOTYuNjMwOUMxMjMuMjY2IDk2LjUwMTkgMTIwLjI4NCA5Ni40NzYyIDExNy4yOTMgOTYuNDc2MkMxMTQuMzAyIDk2LjQ3NjIgMTA5LjQ1NCA5Ny41OTM1IDEwNS4zNDYgMTAyLjA4QzEwMS4yMzggMTA2LjU2NiA4OS42NjkxIDExNy40MDQgODkuNjY5MSAxMzkuNDQxQzg5LjY2OTEgMTYxLjQ3OCAxMDUuNzE2IDE4Mi43ODUgMTA3Ljk1OSAxODUuNzc2QzExMC4yMDIgMTg4Ljc2NyAxMzkuNTQ0IDIzNC4wMDEgMTg0LjQ2OSAyNTMuNDA4QzE5NS4xNTMgMjU4LjAyMyAyMDMuNDk4IDI2MC43ODIgMjEwLjAwNCAyNjIuODQ1QzIyMC43MzEgMjY2LjI1NyAyMzAuNDk0IDI2NS43NzYgMjM4LjIxMiAyNjQuNjI0QzI0Ni44MTYgMjYzLjMzNSAyNjQuNzEgMjUzLjc4NiAyNjguNDQgMjQzLjMyNkMyNzIuMTcgMjMyLjg2NiAyNzIuMTcgMjIzLjg5MyAyNzEuMDUzIDIyMi4wMjhDMjY5LjkzNiAyMjAuMTYzIDI2Ni45NDUgMjE5LjAzNyAyNjIuNDY3IDIxNi43OTRMMjYyLjQ3NSAyMTYuNzc3WiIgZmlsbD0iIzI1RDM2NiIvPgo8L3N2Zz4K';
export const MARCA_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 6.5A2.5 2.5 0 014.5 4h15A2.5 2.5 0 0122 6.5v11a2.5 2.5 0 01-2.5 2.5h-15A2.5 2.5 0 012 17.5v-11zm2.2-.5L12 12.3 19.8 6H4.2zM20 7.6l-7.4 6a1 1 0 01-1.2 0L4 7.6v9.9c0 .3.2.5.5.5h15c.3 0 .5-.2.5-.5V7.6z"/></svg>';


/** Everything that comes from the API is escaped before it reaches the DOM. Titles are written by
 *  developers, so this is the difference between a listing and a script running in the buyer. */
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** AED with two decimals and thousands separators, the same format the API uses. */
export function money(fils) {
  const n = Number(fils ?? 0) / 100;
  return 'AED ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A date the API may send as an ISO string, as seconds or as milliseconds since the epoch. */
function aFecha(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' || /^\d+$/.test(String(v))) {
    const n = Number(v);
    // Anything that looks like seconds (10 digits) is seconds: a millisecond stamp of this century
    // has 13, and a seconds stamp read as milliseconds lands in 1970, which is how a deadline came
    // out as "21 Jan 1970" instead of the real one.
    const d = new Date(n < 1e12 ? n * 1000 : n);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function date(iso) {
  const d = aFecha(iso);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTime(iso) {
  const d = aFecha(iso);
  if (!d) return '';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const tipoLabel = (v) => label(TIPOS, v);
export const obraLabel = (v) => label(ESTADOS_OBRA, v);
export const amenLabel = (v) => label(AMENIDADES, v);

/** Sizes are quoted in square feet here, but the market reads both. Show both, the chosen one first:
 *  a reader who thinks in metres should not have to convert in their head. */
export const SQFT_A_M2 = 0.092903;
export function areaTxt(sqft, { metro = true } = {}) {
  const n = Number(sqft);
  if (!n) return '';
  const pies = `${n.toLocaleString('en-US')} sqft`;
  if (!metro) return pies;
  const metros = `${Math.round(n * SQFT_A_M2).toLocaleString('en-US')} m²`;
  return unidadElegida() === 'm2' ? `${metros} · ${pies}` : `${pies} · ${metros}`;
}

/** Las frases cortas de un anuncio, como las lee el mercado de un vistazo. Sólo lo que el dato dice
    de verdad: nada inventado. Bayut rellena esto con extras del anuncio ("Chiller free"); nosotros
    todavía no tenemos ese campo, así que se arma con lo estructural, que sí tenemos. */
export function destacados(r) {
  const out = [];
  if (r.amueblado === true) out.push('Furnished');
  if (r.balcon_sqft) out.push('Balcony');
  if (r.plazas_parking > 0) out.push(r.plazas_parking === 1 ? 'Parking' : `${r.plazas_parking} parking spaces`);
  if (r.tenencia === 'freehold') out.push('Freehold');
  if (r.estado_obra === 'ready') out.push('Ready to move');
  if (r.uso && r.uso !== 'residential') out.push(r.uso === 'commercial' ? 'Commercial' : String(r.uso));
  return out.slice(0, 4);
}

/** The data row of a card: three figures, each with its icon. */
export function specs(r) {
  const out = [];
  if (r.habitaciones) out.push([ICO.cama, `${r.habitaciones} bed${r.habitaciones > 1 ? 's' : ''}`]);
  else if (r.tipo === 'apartment' || r.tipo === 'office') out.push([ICO.cama, 'Studio']);
  if (r.banos) out.push([ICO.bano, `${r.banos} bath${r.banos > 1 ? 's' : ''}`]);
  if (r.superficie_sqft) out.push([ICO.area, areaTxt(r.superficie_sqft)]);
  return out.map(([ico, t]) => `<span>${ico}${esc(t)}</span>`).join('');
}

/** A listing card: price first, then what it is, then the figures and where it is. */
/**
 * The asset selector. It lives in the bar of the site and not in every card: a price that changes
 * currency per card would be a price nobody could compare. One choice, everywhere.
 */
export function selectorActivo() {
  const activo = activoElegido();
  // Without a rate there is nothing to show, so the bar asks for it instead of printing an empty
  // line: the platform has no feed yet, and a made-up number is worse than an empty space.
  const falta = ACTIVOS_VER.filter((a) => tasa(a) === null);
  // A saved rate that cannot be a rate is worse than no rate: it paints nonsense prices. It is named
  // here so whoever saved it can see what is wrong instead of watching the figures go mad.
  const raras = ACTIVOS_VER.filter((a) => tasa(a) !== null && !tasaPlausible(a));
  return `<div class="sel-activo" role="group" aria-label="Show prices in">
    <span>Prices in</span>
    ${ACTIVOS_VER.map((a) => `<button type="button" class="${a === activo ? 'on' : ''}"
      data-activo="${a}" aria-pressed="${a === activo}">${a}</button>`).join('')}
    ${raras.map((a) => `<label class="sel-tasa mal" title="This rate cannot be right">1 ${esc(a)} =
      <input type="number" step="0.0001" min="0" data-tasa="${esc(a)}" placeholder="0.00"> AED
      <span>· the ${esc(String(tasa(a)))} you saved cannot be right, write it again</span></label>`).join('')}
    ${falta.map((a) => `<label class="sel-tasa" title="The rate you are reading with">1 ${esc(a)} =
      <input type="number" step="0.0001" min="0" data-tasa="${esc(a)}" placeholder="0.00"> AED</label>`).join('')}
  </div>`;
}

/**
 * Rewrites the digital asset figure of every card IN PLACE, without repainting the view.
 *
 * This is the whole reason the page used to jump: changing the asset re-rendered the screen, and
 * re-rendering the screen throws the reader back to the top. Nothing about changing a currency means
 * moving: only the number changes, in the card where it already sits.
 */
export function pintarPreciosCripto() {
  // También el panel de la ficha, que no es una tarjeta: su precio tiene que
  // llevar el equivalente igual que el de una tarjeta, y cambiar al cambiar de
  // moneda.
  document.querySelectorAll('.card, #precio-panel').forEach((c) => {
    const enPrecio = c.querySelector('.price');
    if (!enPrecio) return;
    const n = Number(String(enPrecio.textContent).replace(/[^0-9.]/g, ''));
    const fils = Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
    const texto = fils ? cifraCripto({ precio_fils: fils }) : '';
    let linea = c.querySelector('.price-cripto');
    if (!texto) {
      if (linea) linea.hidden = true;
      return;
    }
    if (!linea) {
      linea = document.createElement('div');
      linea.className = 'price-cripto';
      linea.innerHTML = `<b></b><i>indicative</i>`;
      enPrecio.parentNode.insertBefore(linea, enPrecio);
    }
    linea.hidden = false;
    linea.querySelector('b').textContent = texto;
  });
}

/**
 * Marks the chosen asset on every control that offers one — the bar's pills, and the menu's row.
 * One function for both, because a choice and the figures it changes must never disagree on screen.
 */
export function marcarActivo(activo) {
  document.querySelectorAll('[data-activo]').forEach((o) => {
    const on = o.dataset.activo === activo;
    o.classList.toggle('on', on);
    o.setAttribute('aria-pressed', String(on));
  });
}

/** Wires it wherever it was painted: one listener per page, by delegation. */
export function initSelectorActivo() {
  document.addEventListener('input', (e) => {
    if (!e.target.dataset?.tasa) return;
    const activo = e.target.dataset.tasa;
    const valor = Number(e.target.value);
    // Only when the field has a number worth keeping: typing «3» does not repaint the whole catalogue.
    if (Number.isFinite(valor) && valor > 0) fijarTasa(activo, valor);
  });
  document.addEventListener('change', (e) => {
    if (e.target.dataset?.tasa) pintarPreciosCripto();
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-activo]');
    if (!b) return;
    elegirActivo(b.dataset.activo);
    // The bar lives outside the view, so it is marked here, and only the prices are rewritten: the
    // choice and the figures it changes must never disagree on screen, and nothing else may move.
    marcarActivo(b.dataset.activo);
    pintarPreciosCripto();
  });
}

export function card(r) {
  const fav = store.logged() && store.isFav(r.unidad_id);
  const enlace = `#/unit/${esc(r.unidad_id)}`;
  return `
  <article class="card" data-unidad="${esc(r.unidad_id)}">
    <div class="photo">
      <a href="${enlace}" aria-label="${esc(r.titulo)}">${photoInner(r.foto_principal, r.tipo)}</a>
      <span class="tags">
        ${r.distintivo?.badge_alcance ? selloVerysset('Verified by Verysset',
          { unidad: r.unidad_id, titulo: r.titulo, ref: r.referencia }) : ''}
        ${r.distintivo?.promocionado ? `<span class="tag coin">${ICO.promocion}${esc(r.distintivo.etiqueta ?? 'Promoted')}</span>` : ''}
      </span>
      <button class="heart${fav ? ' on' : ''}" data-fav="${esc(r.unidad_id)}" type="button"
        title="${fav ? 'Remove from favourites' : 'Save to favourites'}"
        aria-label="${fav ? 'Remove from favourites' : 'Save to favourites'}">${fav ? '★' : '☆'}</button>
      <div class="micro-fotos" data-fotos="${esc(r.unidad_id)}" hidden></div>
    </div>
    <div class="body">
      ${cifraCripto(r)
        ? `<div class="price-cripto"><b>${esc(cifraCripto(r))}</b>
           <i>indicative</i></div>` : ''}
      <div class="price">${esc(r.precio_aed ?? money(r.precio_fils))}</div>
      <div class="tipo">${esc(tipoLabel(r.tipo))}${r.estado_obra ? ` · ${esc(obraLabel(r.estado_obra))}` : ''}</div>
      <h3><a href="${enlace}">${esc(r.titulo)}</a></h3>
      <div class="specs">${specs(r)}</div>
      ${destacados(r).length ? `<div class="highlights">${destacados(r).map((t) => esc(t)).join(' · ')}</div>` : ''}
      <div class="zona">${ICO.pin}${esc(r.zona ?? r.emirato)}${r.zona && r.emirato ? `, ${esc(r.emirato)}` : ''}</div>
      ${r.distintivo?.badge_alcance ? `<div class="verif">${iconoAprobado()} Verified by Verysset${r.distintivo.badge_validado_en ? ` on ${esc(date(r.distintivo.badge_validado_en))}` : ''}${r.distintivo.badge_vigencia ? ` · until ${esc(date(r.distintivo.badge_vigencia))}` : ''}</div>` : ''}
      ${r.estado_obra === 'off_plan' && (r.entrega_prevista || r.plan_pagos) ? `
        <div class="obra">
          ${r.entrega_prevista ? `<div>${ICO.obra}<span>Handover</span><b>${esc(r.entrega_prevista)}</b></div>` : ''}
          ${r.plan_pagos ? `<div>${ICO.plan}<span>Payment plan</span><b>${esc(r.plan_pagos)}</b></div>` : ''}
        </div>` : ''}
      <div class="foot">
        <span class="dev">${logoHtml(r.desarrollador?.nombre, r.desarrollador?.logo_url, true)}${esc(r.desarrollador?.nombre ?? '')}</span>
        <span class="canales-card">
          <button type="button" class="canal-mini tg" data-canal="telegram" data-dev="${esc(r.desarrollador?.nombre ?? '')}" title="Telegram"><img src="${MARCA_TG}" alt="Telegram" loading="lazy"></button>
          <button type="button" class="canal-mini wa" data-canal="whatsapp" data-dev="${esc(r.desarrollador?.nombre ?? '')}" title="WhatsApp"><img src="${MARCA_WA}" alt="WhatsApp" loading="lazy"></button>
          <button type="button" class="canal-mini mail" data-canal="correo" data-dev="${esc(r.desarrollador?.nombre ?? '')}" title="Email"><span class="mail-ico">${MARCA_MAIL}</span></button>
          <button type="button" class="canal-nota" data-dev="${esc(r.desarrollador?.nombre ?? '')}" aria-label="How the contact works" title="The seller's contact is never published: your code is the door.">i</button>
        </span>
      </div>
      <a class="btn green comprar" href="${enlace}" data-comprar="${esc(r.unidad_id)}">Pay with digital assets</a>
    </div>
  </article>`;
}

/** The photo, with the gradient of the card showing if there is none or it does not load. */
export function photoInner(url, alt) {
  const fallback = `<span class="fallback">${esc(tipoLabel(alt))}</span>`;
  if (!url) return fallback;
  return `${fallback}<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy"
    onerror="this.remove()">`;
}

export function loading(n = 6) {
  return `<div class="load">${'<div class="sk"></div>'.repeat(n)}</div>`;
}

export function empty(titulo, texto, accion = '') {
  return `<div class="empty"><h3>${esc(titulo)}</h3><p>${esc(texto)}</p>${accion}</div>`;
}

let toastTimer;
export function toast(mensaje, tipo = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = mensaje;
  el.className = `toast ${tipo}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4200);
}

export function error(container, err) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;
  el.innerHTML = `<div class="msg err">${esc(err?.message ?? 'Something went wrong.')}</div>`;
}

/* ------------------------------------------------------------------ the developer's mark
   The logo they uploaded during onboarding, a mark drawn here for the organisations of the sandbox,
   or two initials on a colour derived from the name. Nothing from somebody else's brand: a logo of a
   company that is not on the platform, on a public page, claims a relationship that does not exist. */

/**
 * Las marcas de las inmobiliarias del sandbox, dibujadas aquí. Son nuestras: no son el logotipo de
 * ninguna empresa real. La primera, NDC, es la organización de prueba con la que se trabaja.
 */
/**
 * Los logotipos REALES de las inmobiliarias que están en la lista, tal y como se pidieron, con
 * su licencia declarada uno a uno en `img/promotores/CREDITOS.md` (son marcas de sus dueños).
 * Van incrustados aquí para que el artefacto de un solo fichero enseñe la lista sin depender
 * de la red; el fichero original vive en `img/promotores/`.
 */
const LOGOS = {
  'Emaar Properties': 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgd2lkdGg9IjE2MTdweCIgaGVpZ2h0PSIzMjFweCIgdmlld0JveD0iMCAwIDE2MTcgMzIxIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPg0KICAgIDwhLS0gR2VuZXJhdG9yOiBTa2V0Y2ggNTMuMiAoNzI2NDMpIC0gaHR0cHM6Ly9za2V0Y2hhcHAuY29tIC0tPg0KICAgIDx0aXRsZT5TaGFwZTwvdGl0bGU+DQogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+DQogICAgPGcgaWQ9IlBhZ2UtMSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+DQogICAgICAgIDxwYXRoIGQ9Ik0yMzQuOSwyODguNCBMMjMwLjEsMzIwLjIgTDAuNSwzMjAuMiBDMTAsMjk4LjIgOS40LDI4NS44IDkuNCwyNjkuOSBMOS40LDUxLjMgQzkuNCwzNS45IDEwLDIyLjQgMC41LDEgTDY5LjMsMSBMMjI0LjUsMSBMMjI0LjksMzMuNCBDMjIwLjcsMzEuNyAyMTcuMywzMC4yIDIxNC4yLDI4LjggQzIwNS45LDI1LjcgMTk1LjQsMjIuOCAxODQuNSwyMi45IEMxNjcuMSwyMi45IDk0LjEsMjIuOSA2MS43LDIyLjkgTDYxLjcsMTQ3LjkgTDIwNS44LDE0Ny45IEwxOTguNywxNzIuNSBMNjEuNywxNzIuNSBMNjEuNywyOTcuNiBDODguMiwyOTcuNiAxNzIuOSwyOTcuNiAxOTEuNiwyOTcuNiBDMjEzLjUsMjk4IDIzNS4zLDI4NS42IDIzNS4zLDI4NS42IEwyMzQuNywyODguMyBDMjM0LjcsMjg4LjQgMjM0LjgsMjg4LjQgMjM0LjksMjg4LjQgWiBNNTgwLjUsMzIwLjIgQzU4My42LDMwNC41IDU4My42LDI4Mi4zIDU4MS4xLDI2NC4yIEw1NjAuNywxMTMuOCBMNDQ5LjMsMzIwLjEgTDQyOC4xLDMyMC4xIEwzMTQuOSwxMDQuNSBMMjkyLjksMjY3LjUgQzI5MC41LDI4Ni4zIDI4OS44LDMxMC4xIDI5MS44LDMyMC4yIEwyNTIsMzIwLjIgQzI1OS43LDMwMy45IDI2MS42LDI5Ni44IDI2NS4yLDI3MCBMMzAxLjIsMSBMMzE5LjUsMSBMNDUxLjYsMjUyIEw1ODMuNiwxIEw1OTcuNCwxIEw2MzQuNiwyNjkuNCBDNjM4LjMsMjk2LjEgNjQxLjEsMzAzLjggNjQ4LjUsMzIwLjIgTDU4MC41LDMyMC4yIFogTTkxNS44LDMyMC4yIEw4NjIuOCwyMDMuMyBMNzU2LjIsMjAzLjMgTDcwMy45LDMyMC4yIEw2OTkuNCwzMjAuMiBMNjYyLjUsMzIwLjIgTDY2Mi4zLDMyMC4yIEM2NzUuNSwzMDMuOCA2ODAsMjk2LjIgNjg5LjMsMjc1LjggTDgxMi45LDEgTDgyNi44LDEgTDk0OC40LDI2OC4xIEM5NjEuNCwyOTQuMiA5NjcuNSwzMDIuMyA5ODYuMSwzMjAuMiBMOTE1LjgsMzIwLjIgWiBNMTI0OS4zLDMyMC4yIEwxMTk2LjMsMjAzLjMgTDEwODkuNywyMDMuMyBMMTAzNy40LDMyMC4yIEwxMDMzLDMyMC4yIEw5OTYsMzIwLjIgTDk5NS44LDMyMC4yIEMxMDA5LDMwMy44IDEwMTMuNSwyOTYuMiAxMDIyLjgsMjc1LjggTDExNDYuNCwxIEwxMTYwLjMsMSBMMTI4MiwyNjguMSBDMTI5NSwyOTQuMiAxMzAxLjEsMzAyLjMgMTMxOS43LDMyMC4yIEwxMjQ5LjMsMzIwLjIgWiBNMTU1MS41LDMyMC40IEMxNTE5LjYsMjkxLjMgMTQ3OC4zLDI1Mi43IDE0MjYuNiwxOTEuNSBDMTQxMS44LDE3NC4yIDE0MDEuNCwxNzIgMTM5NC43LDE3MS42IEwxMzk0LjcsMjY5LjkgQzEzOTQuNywyODUuNyAxMzk0LjcsMjk4LjIgMTQwMy43LDMyMC4yIEwxMzMzLjUsMzIwLjIgQzEzNDMsMjk4LjIgMTM0Mi40LDI4NS44IDEzNDIuNCwyNjkuOSBMMTM0Mi40LDUxLjEgQzEzNDIuNCwzNS43IDEzNDMsMjIuMiAxMzMzLjUsMC44IEwxNDAyLjMsMC44IEMxNDQ5LjMsMC44IDE1NjAuNCwtMy40IDE1NjAuNCw4OC40IEMxNTYwLjQsMTM2LjkgMTUyMS45LDE2MyAxNDc2LjcsMTY5LjYgTDE0NjMuMywxNzAuOSBDMTQ2My4zLDE3MC45IDE2MDkuOSwzMTQuMiAxNjE2LjIsMzIwLjQgTDE1NTEuNSwzMjAuNCBaIE0xNDY4LjQsMTUxLjMgTDE0NjguMywxNTEuNCBDMTQ5Ny45LDE0MC4yIDE1MDcuOSwxMTIuMSAxNTA2LjksODguMyBDMTUwNS44LDY1LjQgMTQ5NS41LDE1LjYgMTM5NC44LDE5LjYgTDEzOTQuOCwxNTUuNyBDMTM5NC44LDE1NS43IDE0NTEuMiwxNTguOCAxNDY3LDE1MS45IEMxNDY3LjksMTUxLjUgMTQ2OC40LDE1MS4zIDE0NjguNCwxNTEuMyBaIE0xMDk5LjksMTgxIEwxMTg2LDE4MSBMMTE0Mi42LDg1LjcgTDEwOTkuOSwxODEgWiBNNzY2LjUsMTgxIEw4NTIuNiwxODEgTDgwOS4yLDg1LjcgTDc2Ni41LDE4MSBaIiBpZD0iU2hhcGUiIGZpbGw9IiMzQzNEM0YiIGZpbGwtcnVsZT0ibm9uemVybyI+PC9wYXRoPg0KICAgIDwvZz4NCjwvc3ZnPg==',
  'DAMAC Properties': 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiCiAgIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICBpZD0ic3ZnNDI2OSIKICAgdmVyc2lvbj0iMS4xIgogICBpbmtzY2FwZTp2ZXJzaW9uPSIwLjQ4LjQgcjk5MzkiCiAgIHdpZHRoPSI3NSIKICAgaGVpZ2h0PSIxMCIKICAgc29kaXBvZGk6ZG9jbmFtZT0iVW50aXRsZWQuanBnIj4KICA8bWV0YWRhdGEKICAgICBpZD0ibWV0YWRhdGE0Mjc1Ij4KICAgIDxyZGY6UkRGPgogICAgICA8Y2M6V29yawogICAgICAgICByZGY6YWJvdXQ9IiI+CiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+CiAgICAgICAgPGRjOnR5cGUKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIiAvPgogICAgICAgIDxkYzp0aXRsZT48L2RjOnRpdGxlPgogICAgICA8L2NjOldvcms+CiAgICA8L3JkZjpSREY+CiAgPC9tZXRhZGF0YT4KICA8ZGVmcwogICAgIGlkPSJkZWZzNDI3MyIgLz4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEiCiAgICAgb2JqZWN0dG9sZXJhbmNlPSIxMCIKICAgICBncmlkdG9sZXJhbmNlPSIxMCIKICAgICBndWlkZXRvbGVyYW5jZT0iMTAiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAiCiAgICAgaW5rc2NhcGU6cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9IjEzNjYiCiAgICAgaW5rc2NhcGU6d2luZG93LWhlaWdodD0iNzA1IgogICAgIGlkPSJuYW1lZHZpZXc0MjcxIgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTp6b29tPSIxNS4yNTMzMzMiCiAgICAgaW5rc2NhcGU6Y3g9IjM3LjUiCiAgICAgaW5rc2NhcGU6Y3k9IjUiCiAgICAgaW5rc2NhcGU6d2luZG93LXg9Ii04IgogICAgIGlua3NjYXBlOndpbmRvdy15PSItOCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzQyNjkiIC8+CiAgPGcKICAgICBpZD0iZzQyOTYiCiAgICAgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMy4xNDY4NTMyLDAuNTkwMDM0OTcpIj4KICAgIDxnCiAgICAgICB0cmFuc2Zvcm09Im1hdHJpeCgwLDEuMjUsMS4yNSwwLDExLjY2Njg3Miw0LjQ0Njc0NykiCiAgICAgICBpZD0iZzMzMDkiPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDMzMTEiCiAgICAgICAgIHN0eWxlPSJmaWxsOiMxZDFkMWI7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gMCwwIGMgLTEuMTM3LDAuNDczIC0yLjAyMSwwLjQzMiAtMi42NTMsLTAuMTIgLTAuNjI5LC0wLjU1MyAtMC45NDUsLTEuNTk1IC0wLjk0NSwtMy4xMjggbCAwLC01LjE4NiAxLjEzOSwtMC40NjggMCwzLjU3IGMgMCwxLjgyMyAwLjkxNSwyLjM1IDIuNDMsMS43MjEgMC44NzYsLTAuMzYyIDEuNjgxLC0wLjY4MyAyLjAzOSwtMS40NDEgMC4zMjksLTAuNjk0IDAuNDI1LC0xLjQxMSAwLjQyNSwtMi42ODYgbCAtMC4wMDQsLTEuNjUzIC0yLjk0OCwxLjIzNSAwLC0xLjU1NiA0LjE5OCwtMS43NTIgMCw0LjcgYyAwLDEuMzE4IC0wLjEyMSwyLjM1OSAtMC4zNjgsMy4xMjQgLTAuMjcxLDAuODQxIC0wLjcxNiwxLjU5NSAtMS4zNCwyLjI2IEMgMS4zODIsLTAuNzYgMC43MjMsLTAuMyAwLDAiCiAgICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiIC8+CiAgICA8L2c+CiAgICA8ZwogICAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMCwxLjI1LDEuMjUsMCw0OC41ODA2NzIsNS40MDQyNTcpIgogICAgICAgaWQ9ImczMzEzIj4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgzMzE1IgogICAgICAgICBzdHlsZT0iZmlsbDojMWQxZDFiO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lIgogICAgICAgICBkPSJNIDAsMCAtMy4wOTYsMy4xNTkgMCwzLjgxNSAwLDAgeiBtIDAuMDEyLC0yNi44NTQgLTIuOTYyLDMuMDc2IDIuOTYyLDAuNTU1IDAsLTMuNjMxIHogbSAtNC4zODUsMjkuNzQyIDAuMDA3LDAuMDAyIDAsLTEuOTI2IDYuOTc0LC03LjQgLTYuOTcyLDIuODkzIDAsLTMuMTcyIDMuMDIzLC0zLjgzMiAxLjYzMiwtMS45NzMgMCwtMC4wOSAtMi4zNzcsMC45MjkgLTIuMjc4LC0xLjEzMiAwLC0zLjE4OCA2Ljk4NiwtMi44OTYgLTYuOTg2LC0xLjY2OCAwLC0zLjQ5MiA3LjI3OSwtNy43MTIgMCwxLjkyNiAtMS45MDMsMS45NzIgMCw0Ljg1OSAxLjkwMywwLjM4NyAwLDUuMTYzIC00LjQ5OSwxLjg2OCBjIC0wLjIyNiwwLjA5MyAtMC40ODYsMC4xODMgLTAuNzc4LDAuMjcgMC4yMzcsMC4wMSAwLjQ4NywwLjA3MyAwLjc0OCwwLjE4OCBsIDMuNzU0LDEuNjQgMCwwLjI3OSAtMy43NCw0LjY5NyBjIC0wLjE0LDAuMTc1IC0wLjM5MywwLjQ0MSAtMC43NjIsMC43OTggMC4zNDIsLTAuMTgxIDAuNTk5LC0wLjMwOCAwLjc3OCwtMC4zODQgbCA0LjQ5OSwtMS44NjYgMCwzLjQxIC0wLjAwMywwIDAsMy41OTQgTCAxLC0xLjAyIGwgMCw1LjA0NyAxLjkxMiwwLjQwNiAwLDEuNzc0IC03LjI4NSwtMS43MjkgMCwtMS41OSIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgIDwvZz4KICAgIDxnCiAgICAgICB0cmFuc2Zvcm09Im1hdHJpeCgwLDEuMjUsMS4yNSwwLDcxLjM0MzE3MiwtMC4wNTA3NjMwMSkiCiAgICAgICBpZD0iZzMzMTciPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDMzMTkiCiAgICAgICAgIHN0eWxlPSJmaWxsOiMxZDFkMWI7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmUiCiAgICAgICAgIGQ9Im0gMCwwIDAsLTUuMTg3IGMgMCwtMS41MzIgMC4zMTYsLTIuODM1IDAuOTQ1LC0zLjkxMSAwLjYzMiwtMS4wNzYgMS41MTYsLTEuODQ4IDIuNjUzLC0yLjMyMSAwLjcyMywtMC4zIDEuMzgyLC0wLjM4NiAxLjk3MywtMC4yNTcgMC42MjQsMC4xNTEgMS4wNywwLjUzMyAxLjM0LDEuMTQ3IDAuMjQ3LDAuNTYzIDAuMzY4LDEuNTA1IDAuMzY4LDIuODIyIGwgMCw0LjY4OSAtMS4xNTUsMC40NjYgMCwtMi42NCBjIDAsLTEuMjc1IC0wLjE2NywtMi4xMjIgLTAuNDk2LC0yLjU0MyAtMC4zNTUsLTAuNDYzIC0xLjE4MiwtMC40MTEgLTIuMDU5LC0wLjA1IC0xLjUxNSwwLjYyOSAtMi40NTgsMS45NDYgLTIuNDU4LDMuNzY4IGwgMCwyLjA0NSAxLjEzNywtMC40NjkgMCwxLjU1NiAtMi4xODQsMC45MDYgMCwtMC4wNDYgTCAwLDAiCiAgICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiIC8+CiAgICA8L2c+CiAgPC9nPgo8L3N2Zz4K',
  'Nakheel': 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB3aWR0aD0iMTMyLjI5MTY3bW0iCiAgIGhlaWdodD0iMjIuOTU2MTM5bW0iCiAgIHZpZXdCb3g9IjAgMCAxMzIuMjkxNjcgMjIuOTU2MTM4IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmcxIgogICBpbmtzY2FwZTp2ZXJzaW9uPSIxLjQgKDg2YThhZDcsIDIwMjQtMTAtMTEpIgogICBzb2RpcG9kaTpkb2NuYW1lPSJOYWtoZWVsIGxvZ28uc3ZnIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3MSIKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiMwMDAwMDAiCiAgICAgYm9yZGVyb3BhY2l0eT0iMC4yNSIKICAgICBpbmtzY2FwZTpzaG93cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIgogICAgIGlua3NjYXBlOnBhZ2VjaGVja2VyYm9hcmQ9IjAiCiAgICAgaW5rc2NhcGU6ZGVza2NvbG9yPSIjZDFkMWQxIgogICAgIGlua3NjYXBlOmRvY3VtZW50LXVuaXRzPSJtbSIKICAgICBpbmtzY2FwZTp6b29tPSIxLjM5NTA3NTgiCiAgICAgaW5rc2NhcGU6Y3g9IjI1OC4wNTA0OSIKICAgICBpbmtzY2FwZTpjeT0iODQuOTQxNjIxIgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTkyMCIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMDAxIgogICAgIGlua3NjYXBlOndpbmRvdy14PSItOSIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iLTkiCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMSIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJsYXllcjEiIC8+CiAgPGRlZnMKICAgICBpZD0iZGVmczEiPgogICAgPGNsaXBQYXRoCiAgICAgICBjbGlwUGF0aFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIKICAgICAgIGlkPSJjbGlwUGF0aDk2MzciPgogICAgICA8cGF0aAogICAgICAgICBkPSJNIDAsMCBIIDExOTAuNTUxIFYgODQxLjg5IEggMCBaIgogICAgICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNTA3LjkxNzcxLC0xMjcuMzEwNykiCiAgICAgICAgIGlkPSJwYXRoOTYzNyIgLz4KICAgIDwvY2xpcFBhdGg+CiAgPC9kZWZzPgogIDxnCiAgICAgaW5rc2NhcGU6bGFiZWw9IkxheWVyIDEiCiAgICAgaW5rc2NhcGU6Z3JvdXBtb2RlPSJsYXllciIKICAgICBpZD0ibGF5ZXIxIgogICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0zOC45NDE3MjEsLTEzMS40NTg4MykiPgogICAgPHBhdGgKICAgICAgIGlkPSJwYXRoOTYzNiIKICAgICAgIGQ9Ik0gMCwwIEggOS4wNTEgViAtMzkuMzUxIEggLTguNTQ1IGwgLTguNDMyLDM5LjAxNCB2IC0zOS4wMTQgaCAtOS4wNTEgViAwIEggLTguMzc2IEwgMCwtMzkuMDE0IFogTSAzOC4wMDIsMCBIIDIwLjIzNyBsIC04LjI2MywtMzkuMzUxIGggOC45MzggbCAxLjYzLDcuODE0IGggMTMuMTU1IGwgMS42MywtNy44MTQgaCA4LjkzOCB6IE0gMjQuMDYsLTI0LjUxIDI5LjExOSwtMC4zMzcgMzQuMTc5LC0yNC41MSBaIE0gNjcuMTIxLC0yMy41NTUgODAuNjY5LDAgSCA3MC42MDYgTCA1OS4xOTQsLTE5LjkgViAwIEggNDkuMTg4IHYgLTM5LjM1MSBoIDEwLjAwNiB2IDE1LjEyMiBoIDYuMTg0IGwgNS4yMjgsLTE1LjEyMiBoIDEwLjExOSBsIC01LjQ1MywxNS43OTYgeiBtIDM4LjA1Nyw4LjIwOCBIIDk4LjMyIGwgLTQuNDk3LC03LjI1MiBWIDAgSCA4My44MTcgdiAtMzkuMzUxIGggMTAuMDA2IHYgMTYuMzAzIGggMTEuMzU1IHYgLTE2LjMwMyBoIDEwLjAwNyBWIDAgaCAtMTAuMDA3IHogbSAxNC44NDEsLTI0LjAwNCBoIDI0LjkwNCB2IDcuMzA4IGggLTE0Ljg5NyB2IDkuMTYzIGggMTEuOTE4IHYgNy4zMDggaCAtNy43MDIgbCAtNC4yMTYsLTYuNzQ2IHYgMTUuMDEgaCAxNC44OTcgViAwIGggLTI0LjkwNCB6IG0gMjguODM4LDAgaCAyNC45MDQgdiA3LjMwOCBoIC0xNC44OTcgdiA5LjE2MyBoIDExLjkxOCB2IDcuMzA4IGggLTcuNzAyIGwgLTQuMjE2LC02Ljc0NiB2IDE1LjAxIGggMTQuODk3IFYgMCBoIC0yNC45MDQgeiBtIDM4Ljg0NSw3LjMwOCBWIDAgaCAtMTAuMDA3IHYgLTM5LjM1MSBoIDIzLjA0OSB2IDcuMzA4IHoiCiAgICAgICBzdHlsZT0iZmlsbDojMDA1Nzc1O2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lIgogICAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMC41ODMzNjg2MSwwLDAsLTAuNTgzMzY4NjEsNTQuMTI1NjM5LDEzMS40NTg4MykiCiAgICAgICBjbGlwLXBhdGg9InVybCgjY2xpcFBhdGg5NjM3KSIKICAgICAgIHNvZGlwb2RpOm5vZGV0eXBlcz0iY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjIiAvPgogIDwvZz4KPC9zdmc+Cg==',
  'Meraas': 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIyLjAuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHdpZHRoPSIyMDI0LjkycHgiIGhlaWdodD0iNTc5cHgiIHZpZXdCb3g9IjAgMCAyMDI0LjkyIDU3OSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMjAyNC45MiA1Nzk7IiB4bWw6c3BhY2U9InByZXNlcnZlIgoJPgo8Zz4KCTxwYXRoIGQ9Ik0xNzcuNTMsNTguMWMxMDIuOTMtMC4zMywyMDUuODksMC4wMywzMDguODUtMC4xOGMtMC4wOSwxNC40LDAuMDYsMjguOC0wLjA2LDQzLjIzYy0xMDIuOTYtMC4wOS0yMDUuODksMC4yMS0zMDguODItMC4xNQoJCUMxNzcuNjUsODYuNjksMTc3LjY1LDcyLjQxLDE3Ny41Myw1OC4xeiIvPgoJPHBhdGggZD0iTTEwMi4yMSwxMzMuNzhjMTQuMTksMC4wOSwyOC4zOCwwLjE1LDQyLjYtMC4wOWMwLjMsMTAzLjI5LDAuMTgsMjA2LjU3LDAuMDYsMzA5Ljg2Yy0xNC4yNS0wLjE1LTI4LjUtMC4xOC00Mi43NSwwCgkJQzEwMi4yMSwzNDAuMjksMTAyLjAzLDIzNy4wNCwxMDIuMjEsMTMzLjc4eiIvPgoJPHBhdGggZD0iTTUxOS4wMSwxMzQuNTVjMTQuMzQtMC4yMSwyOC42NS0wLjk4LDQyLjk2LTAuNzdjMC4yNywxMDMuMjMsMC4xOCwyMDYuNDgsMC4wNiwzMDkuNzFjLTE0LjM3LTAuMDMtMjguNzEtMC4wOS00My4wOC0wLjA2CgkJQzUxOS4yNywzNDAuNDcsNTE5LjE5LDIzNy41MSw1MTkuMDEsMTM0LjU1eiIvPgoJPHBhdGggZD0iTTE4MTguNzksMTgwLjM2YzI3LjI4LTIuOTcsNTYuNy0xLjI1LDgwLjU0LDEzLjc1YzEyLjcxLDcuODcsMjEuMTQsMjAuODcsMjYuMDcsMzQuNzcKCQljLTEyLjQ3LDUuMjUtMjQuODgsMTAuNzItMzcuMTQsMTYuNDJjLTYuMjMtMTQuMzQtMTguMzgtMjcuMTktMzQuNTMtMjkuMjdjLTE1LjU5LTEuODEtMzIuNzgtMi41NS00Ni45MSw1LjI4CgkJYy0xNC4xLDcuMTUtMTIuMjMsMzAuODIsMi4wNSwzNi42NGMzNC4xNywxMy4zNiw3Ni42OCw3LjUxLDEwNC44OSwzNC42NWMxOC41OCwxNy42OSwxOS4xMiw0OC4xOCw2LjgsNjkuNTMKCQljLTEwLjkzLDE5LjM5LTMyLjQ4LDI5Ljk5LTUzLjYyLDM0LjA1Yy0xNi42MywyLjU1LTMzLjYxLDIuNDYtNTAuMjYsMC42MmMtMjYuOTYtMy4zMy01Mi44OC0xNy4yMi02OC43LTM5LjU0CgkJYzEwLjQyLTkuMiwyMC43Mi0xOC41NiwzMC4zNy0yOC41NmMxMy4yMSwxOS41MywzNS41MSwzMi40Miw1OS4yMywzMi44NmMxNC42MSwwLjM5LDMyLjkyLDAuMTUsNDEuOTItMTMuNTEKCQljNy4wNC05LjM1LDQuNTctMjMuMzEtNC4yMi0zMC41OGMtOC42MS02LjE1LTE5LjI3LTguMDItMjkuNDUtOS44M2MtMjMuNzUtNC4zMy00OC44MS03LjAxLTY5LjgtMTkuOTgKCQljLTI1LjM1LTE0Ljg0LTI5LjM5LTUxLjYzLTE0LjU1LTc1LjIzQzE3NzMuNjcsMTkyLjgzLDE3OTYuNzMsMTgzLjIxLDE4MTguNzksMTgwLjM2eiIvPgoJPHBhdGggZD0iTTIwNS43MSwxODQuMDdjMTQuMjUtMC4yMSwyOC41LDAuMDMsNDIuNzItMC4xOGMtMC4xNSw2OS44LTAuMTgsMTM5LjU5LDAsMjA5LjM5Yy0xNC4yNS0wLjI3LTI4LjUtMC4wOS00Mi43NS0wLjI0CgkJQzIwNi4xOCwzMjMuNCwyMDYuMDksMjUzLjcyLDIwNS43MSwxODQuMDd6Ii8+Cgk8cGF0aCBkPSJNMzEwLjYyLDE4My45MmMxNC40MywwLjE1LDI4LjgzLDAuMDksNDMuMjYsMGMtMC4xOCw2OS43NC0wLjI0LDEzOS40OCwwLjAzLDIwOS4yMWMtMTQuNDMtMC4wMy0yOC44Ni0wLjA5LTQzLjI5LDAuMDkKCQlDMzEwLjc0LDMyMy40NiwzMTAuNzQsMjUzLjY5LDMxMC42MiwxODMuOTJ6Ii8+Cgk8cGF0aCBkPSJNNDE2LjExLDE4My44OWMxNC4yMiwwLjE4LDI4LjQxLDAuMTIsNDIuNjMsMC4wM2MtMC4wMyw2OS44LTAuMDYsMTM5LjU2LDAuMDMsMjA5LjM2Yy0xNC4yOC0wLjIxLTI4LjUzLTAuMjctNDIuNzgtMC4wOQoJCUM0MTYuMjksMzIzLjQzLDQxNi4wNSwyNTMuNjYsNDE2LjExLDE4My44OXoiLz4KCTxwYXRoIGQ9Ik02NTYuNzMsMTg0LjA0YzE3LjIyLTAuMjEsMzQuNDQsMC4zNiw1MS42Ni0wLjI0YzE5LjkyLDUyLjUyLDM5LjcyLDEwNS4xMyw1OC4xMywxNTguMTgKCQljMjAuOTMtNTIuMzcsMzkuMjgtMTA1Ljc4LDYwLjE1LTE1OC4xOGMxNi44LDAuNDUsMzMuNjcsMC4zLDUwLjUsMC4xNWMtMC4xNSw2OS43NC0wLjI3LDEzOS41MSwwLjA2LDIwOS4yNwoJCWMtMTMuNDgtMC4xNS0yNi45My0wLjIxLTQwLjM4LDAuMDZjMS4zNy00Ny41NiwwLjM2LTk1LjE1LDAuNjgtMTQyLjcxYy0xOC4zNSw0Ny4zOC0zNS42LDk1LjIxLTUzLjYyLDE0Mi43MQoJCWMtMTEuNDMtMC4yMS0yMi44My0wLjI3LTM0LjI2LTAuMDZjLTE3LjY2LTQ3LjQ0LTM2Ljc1LTk0LjM4LTUyLjktMTQyLjMzYy0xLjQyLDQ3LjM1LTAuMzYsOTQuODgtMC40NywxNDIuMwoJCWMtMTMuMjQtMC4xOC0yNi40NS0wLjA2LTM5LjY2LTAuMTVDNjU3LjA2LDMyMy40LDY1Ni44MiwyNTMuNzIsNjU2LjczLDE4NC4wNHoiLz4KCTxwYXRoIGQ9Ik05MTguMTQsMTg0LjFjNTAuNS0wLjEyLDEwMS4wMywwLjA2LDE1MS41My0wLjA2Yy0wLjI0LDEyLjQ3LTAuMjQsMjQuOTctMC4wNiwzNy40N2MtMzYuMSwwLjEyLTcyLjItMC4wNi0xMDguMywwLjA5CgkJYzAuMDksMTUuMDgsMC4xOCwzMC4xOS0wLjAzLDQ1LjNjMzMuNTgsMC4yNyw2Ny4xOCwwLjE1LDEwMC43NiwwLjAzYzAuMjcsMTIuNTMsMC4xNSwyNS4wOSwwLjE4LDM3LjY0CgkJYy0zMy42Ny0wLjA5LTY3LjMzLTAuMjQtMTAwLjk3LDAuMDNjMC4zLDE3LjA3LDAuMTIsMzQuMTEsMC4wMyw1MS4xOGMzNi43MiwwLjMzLDczLjQ4LDAuMywxMTAuMjMsMAoJCWMtMC4xNSwxMi40Ny0wLjEyLDI0Ljk3LTAuMDksMzcuNDdjLTUxLjEyLTAuNDItMTAyLjI1LDAuMDktMTUzLjM3LTAuMjdDOTE4LjQzLDMyMy4zNyw5MTguMjYsMjUzLjcyLDkxOC4xNCwxODQuMXoiLz4KCTxnPgoJCTxwYXRoIGQ9Ik0xMTEwLjkzLDE4My45NWMyOC41OSwwLjMzLDU3LjE4LTAuMDksODUuOCwwLjIxYzIwLjY5LDEuMSw0Mi44MSw0LjY5LDU5LjE0LDE4LjVjMTkuNDUsMTYuNiwyMi4zOSw0NS42NiwxNS40NCw2OC45NwoJCQljLTQuMDcsMTUuMzUtMTYuNzQsMjYuNDUtMzAuMzQsMzMuNTVjMTUuMDUsMjkuMywzMC4wMSw1OC42Myw0NC44Niw4OC4wM2MtMTUuOTctMC4xNS0zMS45NC0wLjE4LTQ3Ljg5LDAuMDMKCQkJYy0xMy41NC0yNi4xNi0yNS4zOC01My4yNi0zOS45Ni03OC44MmMtMTQuNzMsMC42NS0yOS40NSwwLjI0LTQ0LjE4LDAuM2MtMC4wMywyNi4xMy0wLjMsNTIuMjUsMC4xOCw3OC4zOAoJCQljLTE0LjQsMC4xOC0yOC44LTAuMDktNDMuMTcsMC4yMUMxMTExLjA4LDMyMy41MiwxMTEwLjg3LDI1My43MiwxMTEwLjkzLDE4My45NXogTTExNTMuODMsMjE5LjkxCgkJCWMtMC4yNywxOS41MywwLjA2LDM5LjA0LTAuMjEsNTguNThjMTkuNzQtMS4xLDQwLjIsMi42MSw1OS40Ny0yLjc2YzIzLjE5LTYsMjMuODctNDUuNjMsMC42OC01Mi4wNAoJCQlDMTE5NC40MiwyMTguMDEsMTE3My43NSwyMjAuNjUsMTE1My44MywyMTkuOTF6Ii8+Cgk8L2c+Cgk8Zz4KCQk8cGF0aCBkPSJNMTMwMS41LDM5My4wOGMyOC4wNi02OS41OSw1NS4xNi0xMzkuNTksODMuMjItMjA5LjE4YzE0LjQ5LDAuMjcsMjkuMDEsMC4zLDQzLjQ5LTAuMDMKCQkJYzI3Ljk3LDY5LjY4LDU0Ljk4LDEzOS43MSw4My4xOSwyMDkuM2MtMTUuNjUtMC4wNi0zMS4yNi0wLjAzLTQ2Ljg4LTAuMTJjLTUuNzYtMTUuOTEtMTEuNzktMzEuNzctMTcuNTgtNDcuNjgKCQkJYy0yNy41OC0wLjA2LTU1LjE2LDAuMDMtODIuNzQtMC4wNmMtNS44NSwxNS45Ny0xMS41OCwzMi0xNy42Myw0Ny44OUMxMzMxLjU1LDM5Mi45MywxMzE2LjUsMzkzLjMyLDEzMDEuNSwzOTMuMDh6CgkJCSBNMTM3Ny4xNSwzMDkuNjJjMTguOTctMC41OSwzNy45Ny0wLjU5LDU2Ljk0LTAuMDNjLTkuMi0yNi4xNi0xOC45MS01Mi4xOS0yOS4xNS03Ny45OQoJCQlDMTM5Ni42NSwyNTcuOTcsMTM4NS43NiwyODMuMzgsMTM3Ny4xNSwzMDkuNjJ6Ii8+Cgk8L2c+Cgk8Zz4KCQk8cGF0aCBkPSJNMTYwOS4xOSwxODQuMDFjMTQuNjQsMC4wMywyOS4zMywwLjA5LDQ0LDBjMjcuNzMsNjkuNzEsNTUuMDEsMTM5LjU5LDgzLjAxLDIwOS4yMWMtMTUuNjItMC4xOC0zMS4yMy0wLjE1LTQ2LjgyLTAuMDkKCQkJYy01LjU1LTE2LTExLjg1LTMxLjc0LTE3LjQzLTQ3Ljc0Yy0yNy42MS0wLjEyLTU1LjIyLTAuMDMtODIuODMsMC4wM2MtNi4yMywxNS43OS0xMS42MSwzMS45MS0xNy43Miw0Ny43NwoJCQljLTE1LjAyLTAuMTgtMzAuMDQtMC4xNS00NS4wNywwLjA5QzE1NTQuMTgsMzIzLjYxLDE1ODEuNjcsMjUzLjgxLDE2MDkuMTksMTg0LjAxeiBNMTYwMS43NCwzMDkKCQkJYzE5LjEyLDAuNzcsMzguMjctMC45NSw1Ny4zNiwwLjY4Yy05LjMyLTI2LjQyLTE5LjU5LTUyLjUyLTI5LjE4LTc4LjgyQzE2MjEuNTEsMjU3LjI1LDE2MTEuMzYsMjgzLjA1LDE2MDEuNzQsMzA5eiIvPgoJPC9nPgoJPHBhdGggZD0iTTE3Ny41LDQ3Ni4zOGMxMDIuOTMtMC4zNiwyMDUuODktMC4wMywzMDguODUtMC4xOGMwLjE1LDE0LjMxLTAuMTUsMjguNTksMC4wOSw0Mi44NwoJCWMtMTAyLjk5LTAuMDktMjA1Ljk1LDAuMTUtMzA4Ljk0LTAuMTJDMTc3LjY4LDUwNC43NywxNzcuNjUsNDkwLjU3LDE3Ny41LDQ3Ni4zOHoiLz4KPC9nPgo8L3N2Zz4K',
  'Aldar Properties': 'data:image/png;base64,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',
};

const MARCAS = {
  'NDC Development LLC': '<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" fill="#10222B"/><path d="M9 38V23h6v15zM19 38V11h9v27zM31 38V27h7v11z" fill="#22C55E"/><path d="M21.5 15h4v3h-4zM21.5 21h4v3h-4zM21.5 27h4v3h-4z" fill="#10222B"/></svg>',
  'Marina Estates': '<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" fill="#0E7490"/><path d="M8 29c4-4.2 8-4.2 12 0s8 4.2 12 0 8-4.2 12 0" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><path d="M8 37c4-4.2 8-4.2 12 0s8 4.2 12 0 8-4.2 12 0" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".55"/><path d="M24 10v13M24 23l-6-4M24 23l6-4" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
  'Aurora Homes': '<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" fill="#6D28D9"/><path d="M11 39V25l13-9.5L37 25v14z" fill="#fff"/><path d="M7 24 24 10.5 41 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/><path d="M20 39v-8h8v8z" fill="#6D28D9"/></svg>',
  'Northbay Developments': '<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" fill="#1D4ED8"/><path d="M24 7l4.6 12.4L41 24l-12.4 4.6L24 41l-4.6-12.4L7 24l12.4-4.6z" fill="#fff"/><circle cx="24" cy="24" r="3.2" fill="#1D4ED8"/></svg>',
  'Cedar & Palm Realty': '<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" fill="#15803D"/><path d="M24 41V20" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/><path d="M24 21c-6.5 0-11-3-13.5-7.5C17 11 22.5 13.5 24 21zM24 21c6.5 0 11-3 13.5-7.5C31 11 25.5 13.5 24 21z" fill="#fff"/><path d="M17 41h14" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".6"/></svg>',
  'Vantage Estates': '<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" fill="#B45309"/><path d="M6 39l11.5-18 6 9.5L30 14l12 25z" fill="#fff"/><path d="M23.5 21 30 14l3.4 7z" fill="#B45309" opacity=".35"/></svg>',
  'Al Manara Group': '<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" fill="#334155"/><path d="M13 39V25a11 11 0 0 1 22 0v14h-6V25a5 5 0 0 0-10 0v14z" fill="#fff"/><path d="M24 6v7" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
};

function monograma(nombre) {
  const limpio = String(nombre ?? '').trim();
  const iniciales = limpio.split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase() || '·';
  const colores = ['#10222B', '#16A34A', '#166534', '#0F172A', '#134E4A', '#1F2937'];
  let h = 0;
  for (const c of limpio) h = (h * 31 + c.charCodeAt(0)) % 997;
  return { iniciales, fondo: colores[h % colores.length] };
}

/**
 * La marca de una casa. `caja` mete el dibujo en la CAJA IGUAL que usan todas las listas (el rail del
 * catálogo, la tarjeta, la cabecera de un escritorio): así un logotipo ancho, un escudo cuadrado y una
 * marca dibujada aquí miden lo mismo y los nombres empiezan en la misma línea. Las iniciales de una
 * persona no llevan caja: son su propio cuadro.
 */
export function logoHtml(nombre, logoUrl, chico = false, caja = false) {
  const talla = chico ? ' sm' : '';
  const marco = caja ? ' caja' : '';
  // La clave de la casa (su primera palabra, sin tildes), para que el CSS pueda dar a cada logotipo el
  // relleno que necesita: una caja igual para todos deja al cuadrado pesando el doble que la palabra.
  const clave = String(nombre ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ')[0] || 'x';
  /* La altura del logotipo en una lista, casa por casa: no es la altura lo que se ve, es el peso, y un
     bloque negro pesa mucho más que un trazo fino. Estas salen de medir el área de tinta y su oscuridad
     en cada fichero y pedirles la misma masa. Va en el propio elemento porque la hoja de estilos tiene
     tres capas peleándose por el mismo logo y aquí el style gana siempre. */
  const ALTO_LOGO = { ndc: 21, aldar: 40, damac: 35, emaar: 32, meraas: 26, nakheel: 33, marina: 28 };
  // Y el ancho, para los alargados: en ellos el tope está ahí y no en la altura.
  const ANCHO_LOGO = { ndc: 55, meraas: 60 };
  const ancho = ANCHO_LOGO[clave] ? ` max-width:${ANCHO_LOGO[clave]}px` : '';
  const alto = ALTO_LOGO[clave] ? ` height:${ALTO_LOGO[clave]}px` : '';
  if (logoUrl) {
    return `<span class="logo${talla}${marco}" data-dev="${esc(clave)}"><img src="${esc(logoUrl)}" alt="" loading="lazy" style="${(alto + ancho).trim()}" onerror="this.remove()"></span>`;
  }
  const limpio = String(nombre ?? '').trim();
  // Primero el logotipo real de la casa, después la marca dibujada para el sandbox.
  const real = LOGOS[limpio];
  if (real) {
    return `<span class="logo${talla}${marco}" data-dev="${esc(clave)}"><img src="${real}" alt="" loading="lazy" style="${(alto + ancho).trim()}"></span>`;
  }
  const marca = MARCAS[limpio];
  if (marca) {
    return `<span class="logo marca${talla}${marco}" data-dev="${esc(clave)}" style="${(alto + ancho).trim()}${alto ? '; font-size:1.6rem; line-height:1' : ''}" aria-hidden="true">${marca}</span>`;
  }
  const { iniciales, fondo } = monograma(nombre);
  // Dentro de una caja, las iniciales son el cuadro de dentro: así una persona y una casa miden igual.
  if (caja) {
    return `<span class="logo${talla} caja" aria-hidden="true"><span class="logo-in" style="background:${fondo}">${esc(iniciales)}</span></span>`;
  }
  return `<span class="logo${talla}" style="background:${fondo}" aria-hidden="true">${esc(iniciales)}</span>`;
}

/* ------------------------------------------------------------------ pickers
   A control that opens a panel next to it with the options in labelled groups, the chosen one
   marked, one panel open at a time and everything closed with Escape or a click outside. That is
   the pattern of the references: a control is not a native list of twenty, it is a door. */

/**
 * One control and its panel. `grupos` is [{titulo, opciones: [{valor, texto, nota?}]}].
 *
 * `multiple` turns it into a picker of several values (the panel stays open and the choice is
 * applied with the button of the footer, which says how many results it will show). `ocultas` keeps
 * the panel short and reveals the rest with a "View more" row.
 */
export function picker(id, {
  label, vacio = 'Any', grupos = [], valor = '', compacto = false,
  multiple = false, ocultas = 0, acciones = false,
} = {}) {
  const elegidas = Array.isArray(valor) ? valor : [valor];
  const marca = '<b aria-hidden="true">✓</b>';
  const fila = (o) => `
    <button class="pop-opt${elegidas.includes(o.valor) ? ' on' : ''}" type="button"
      data-pick="${esc(id)}" data-val="${esc(o.valor)}" role="radio"
      aria-checked="${elegidas.includes(o.valor)}">
      <span>${esc(o.texto)}${o.nota ? `<small>${esc(o.nota)}</small>` : ''}</span>
      ${elegidas.includes(o.valor) ? marca : ''}
    </button>`;
  // Several values are chips, round for a figure, a pill for a word, which is the model of the
  // reference and reads much faster than a column of tick boxes.
  const chip = (o, clave) => `
    <button class="pop-chip${elegidas.includes(o.valor) ? ' on' : ''}" type="button"
      data-pick="${esc(id)}" data-val="${esc(o.valor)}" data-g="${esc(clave ?? '')}"
      role="checkbox" aria-checked="${elegidas.includes(o.valor)}">${esc(o.texto)}</button>`;

  const opciones = (lista) => lista.map(fila).join('');
  // With groups, the summary says what each figure is: "2 beds, 1 bath".
  const conUnidad = (g, o) => {
    const base = (g.titulo ?? '').toLowerCase().replace(/s$/, '');
    if (!base || o.texto === 'Studio') return o.texto;
    return `${o.texto} ${base}${o.valor === '0' || o.valor === '1' ? '' : 's'}`;
  };
  const resumen = multiple
    ? (elegidas.filter(Boolean).length
      ? grupos.flatMap((g) => g.opciones.filter((o) => elegidas.includes(o.valor)).map((o) => conUnidad(g, o))).join(', ')
      : vacio)
    : (grupos.flatMap((g) => g.opciones).find((o) => o.valor === valor)?.texto ?? vacio);

  return `
    <div class="control${compacto ? ' compacto' : ''}">
      ${label ? `<label>${esc(label)}</label>` : ''}
      <button class="ctrl" type="button" data-open="${esc(id)}" aria-expanded="false"
        aria-controls="pop-${esc(id)}">
        <span>${esc(resumen)}</span><i aria-hidden="true">▾</i>
      </button>
      <div class="popover" id="pop-${esc(id)}" hidden role="dialog" aria-label="${esc(label ?? id)}"
        data-multi="${multiple ? '1' : '0'}">
        ${label ? `
          <div class="pop-head">
            <b>${esc(label)}</b>
            <button class="close" type="button" data-cerrar aria-label="Close">✕</button>
          </div>` : ''}
        ${multiple ? '' : `
          <button class="pop-opt${valor === '' ? ' on' : ''}" type="button"
            data-pick="${esc(id)}" data-val="" role="radio" aria-checked="${valor === ''}">
            <span>${esc(vacio)}</span>${valor === '' ? marca : ''}</button>`}
        ${grupos.map((g) => `
          ${g.titulo ? `<h4 class="pop-group">${esc(g.titulo)}</h4>` : '<hr class="pop-sep">'}
          ${multiple
            ? `<div class="pop-chips">${g.opciones.map((o) => chip(o, g.clave)).join('')}</div>`
            : `${opciones(ocultas > 0 ? g.opciones.slice(0, -ocultas) : g.opciones)}
               ${ocultas > 0 ? `<div class="pop-extra" hidden>${opciones(g.opciones.slice(-ocultas))}</div>
                 <button class="pop-more" type="button" data-mas>View more ↓</button>` : ''}`}`).join('')}
        ${acciones ? `
          <div class="pop-foot">
            <button class="btn ghost" type="button" data-limpiar="${esc(id)}">Reset</button>
            <button class="btn green" type="button" data-aplicar="${esc(id)}">Show results</button>
          </div>` : ''}
      </div>
    </div>`;
}

/** Wires every picker inside `raiz`. `onPick(id, valor)` decides what to do with the choice. */
export function initPickers(raiz, { onPick, onAplicar, onContar } = {}) {
  // The veil is only used when a panel behaves as a bottom sheet (a phone).
  let velo = document.querySelector('.veil');
  if (!velo) {
    velo = document.createElement('div');
    velo.className = 'veil';
    velo.hidden = true;
    document.body.appendChild(velo);
  }

  const cerrarTodos = (menos) => {
    for (const p of raiz.querySelectorAll('.popover')) {
      if (p === menos) continue;
      p.hidden = true;
      p.closest('.control')?.querySelector('[data-open]')?.setAttribute('aria-expanded', 'false');
    }
    if (!menos) velo.hidden = true;
  };

  // El manejador se GUARDA y se SUSTITUYE en cada enganche. Añadirlo sin más acumulaba varios y el
  // panel se abría y se cerraba en el mismo clic; no volver a engancharlo dejaba los botones
  // muertos en cuanto la vista se repintaba. Sustituir resuelve las dos cosas a la vez.
  if (raiz.__pickers) raiz.removeEventListener('click', raiz.__pickers);
  raiz.__pickers = (e) => {
    // A close button inside a panel, or the apply button that also closes it.
    if (e.target.closest?.('[data-cerrar]')) {
      cerrarTodos();
      return;
    }
    // "View more": the rest of the options of that group.
    const mas = e.target.closest?.('[data-mas]');
    if (mas) {
      const extra = mas.parentElement.querySelector('.pop-extra');
      if (extra) {
        extra.hidden = false;
        mas.remove();
      }
      return;
    }
    const abridor = e.target.closest?.('[data-open]');
    if (abridor) {
      const panel = raiz.querySelector(`#pop-${abridor.dataset.open}`);
      if (!panel) return;
      const estabaAbierto = !panel.hidden;
      cerrarTodos(panel);
      panel.hidden = estabaAbierto;
      abridor.setAttribute('aria-expanded', String(!estabaAbierto));
      velo.hidden = !(estabaAbierto === false && getComputedStyle(panel).position === 'fixed');
      if (!panel.hidden) onContar?.(abridor.dataset.open);
      return;
    }
    const opcion = e.target.closest?.('[data-pick]');
    if (opcion) {
      const { pick, val } = opcion.dataset;
      const panel = raiz.querySelector(`#pop-${pick}`);
      if (panel?.dataset.multi === '1') {
        // Several values: the row toggles, the panel stays open and the footer counts.
        opcion.classList.toggle('on');
        opcion.setAttribute('aria-checked', String(opcion.classList.contains('on')));
        onContar?.(pick);
        return;
      }
      cerrarTodos();
      onPick?.(pick, val);
      return;
    }
    if (e.target.closest?.('[data-limpiar]')) {
      const panel = raiz.querySelector(`#pop-${e.target.closest('[data-limpiar]').dataset.limpiar}`);
      panel?.querySelectorAll('.pop-opt.on').forEach((b) => {
        b.classList.remove('on');
        b.setAttribute('aria-checked', 'false');
      });
      onAplicar?.(e.target.closest('[data-limpiar]').dataset.limpiar);
      return;
    }
    if (e.target.closest?.('[data-aplicar]')) {
      const id = e.target.closest('[data-aplicar]').dataset.aplicar;
      cerrarTodos();
      onAplicar?.(id);
      return;
    }
    if (!e.target.closest?.('.popover')) cerrarTodos();
  };
  raiz.addEventListener('click', raiz.__pickers);

  velo.addEventListener('click', () => cerrarTodos());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarTodos(); });
}

/* ------------------------------------------------------------------ the icons of a card
   One set of line icons so the card depends on no font and no network. The drawings are **Lucide**
   (lucide.dev, ISC licence: permissive, no attribution required), self-hosted here as paths so the
   published preview stays a single file. Only the geometry comes from the set: the sizes and the
   stroke widths are ours, because these are read at 12 to 22 px and not at 24. One key per icon, the
   same keys the screens already use. */
export const ICO = {
  cama: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" /> <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" /> <path d="M12 4v6" /> <path d="M2 18h20" /></svg>',
  bano: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4 8 6" /> <path d="M17 19v2" /> <path d="M2 12h20" /> <path d="M7 19v2" /> <path d="M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></svg>',
  area: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /> <path d="M14 15H9v-5" /> <path d="M16 3h5v5" /> <path d="M21 3 9 15" /></svg>',
  globo: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 3 2.6 15 0 18"/><path d="M12 3c-2.6 3-2.6 15 0 18"/></svg>',
  moneda: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.6-.9-1.7-1.5-3-1.5-1.7 0-2.8.8-2.8 2s1 1.8 2.8 2.2c1.9.4 2.9 1 2.9 2.3s-1.2 2.1-2.9 2.1c-1.4 0-2.5-.6-3.1-1.6"/><path d="M12 6.5v11"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /> <circle cx="12" cy="10" r="3" /></svg>',
  obra: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" /> <path d="M14 6a6 6 0 0 1 6 6v3" /> <path d="M4 15v-3a6 6 0 0 1 6-6" /> <rect x="2" y="15" width="20" height="4" rx="1" /></svg>',
  plan: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" /> <path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" /> <path d="m2 16 6 6" /> <circle cx="16" cy="9" r="2.9" /> <circle cx="6" cy="5" r="3" /></svg>',
  promocion: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path fill="currentColor" stroke="none" d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>',
  balcon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3 2 5v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z" /> <path d="M6 8h4" /> <path d="M6 18h4" /> <path d="m12 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z" /> <path d="M14 8h4" /> <path d="M14 18h4" /> <path d="m20 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z" /></svg>',
  parking: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /> <path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></svg>',
  llave: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" /> <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" /></svg>',
  uso: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /> <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></svg>',
  lupa: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>',
  descarga: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></svg>',
  etiqueta: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></svg>',
  banco: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18" /><path d="M5 21V10l7-5 7 5v11" /><path d="M9 21v-6h6v6" /></svg>',
  grupo: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>',
  pluma: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></svg>',
  sello: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /><path d="m9 12 2 2 4-4" /></svg>',
  almohadilla: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9" /> <line x1="4" x2="20" y1="15" y2="15" /> <line x1="10" x2="8" y1="3" y2="21" /> <line x1="16" x2="14" y1="3" y2="21" /></svg>',
  fecha: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4" /> <path d="M16 2v4" /> <rect width="18" height="18" x="3" y="4" rx="2" /> <path d="M3 10h18" /></svg>',
  permiso: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /> <path d="m9 12 2 2 4-4" /></svg>',
  edificio: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /> <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /> <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /> <path d="M10 6h4" /> <path d="M10 10h4" /> <path d="M10 14h4" /> <path d="M10 18h4" /></svg>',
  ascensor: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="1.6"/><path d="m9.5 9.5 2.5-2.5 2.5 2.5"/><path d="m9.5 14.5 2.5 2.5 2.5-2.5"/></svg>',
  piscina: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" /> <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" /> <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" /></svg>',
  avance: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4" /> <path d="M3.34 19a10 10 0 1 1 17.32 0" /></svg>',
  inspeccion: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /> <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /> <path d="m9 14 2 2 4-4" /></svg>',
  entrega: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" /></svg>',
  foto: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /> <circle cx="9" cy="9" r="2" /> <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>',
  video: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /> <rect x="2" y="6" width="14" height="12" rx="2" /></svg>',
  pano: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /> <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /> <path d="M2 12h20" /></svg>',
  plano: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /> <rect width="7" height="5" x="14" y="3" rx="1" /> <rect width="7" height="9" x="14" y="12" rx="1" /> <rect width="7" height="5" x="3" y="16" rx="1" /></svg>',
  cerrar: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /> <path d="m6 6 12 12" /></svg>',
  izquierda: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>',
  derecha: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>',
  ampliar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /> <path d="M21 8V5a2 2 0 0 0-2-2h-3" /> <path d="M3 16v3a2 2 0 0 0 2 2h3" /> <path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>',
  satelite: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 7 9 3 5 7l4 4" /> <path d="m17 11 4 4-4 4-4-4" /> <path d="m8 12 4 4 6-6-4-4Z" /> <path d="m16 8 3-3" /> <path d="M9 21a6 6 0 0 0-6-6" /></svg>',
  sofa: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" /> <path d="M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z" /> <path d="M4 18v2" /> <path d="M20 18v2" /> <path d="M12 4v9" /></svg>',
  casa: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /> <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>',
  trato: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3" /> <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /> <path d="m21 3 1 11h-2" /> <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /> <path d="M3 4h8" /></svg>',
  pulso: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" /></svg>',
  mapa: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" /> <path d="M15 5.764v15" /> <path d="M9 3.236v15" /></svg>',
  arrastrar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 8 4 4-4 4" /> <path d="M2 12h20" /> <path d="m6 8-4 4 4 4" /></svg>',
  campana: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.268 21a2 2 0 0 0 3.464 0" /> <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" /></svg>',
};

/** The same icon at another size, for the places where 14 px disappears. */
export const ico = (clave, tam = 16) =>
  String(ICO[clave] ?? '').replace(/width="\d+" height="\d+"/, `width="${tam}" height="${tam}"`);

/** The approved mark of Verysset: a round stamp with the tick, like the placa of the reference. */
export function iconoAprobado() {
  return `<span class="sello-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="11" height="11"
    fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"
    ><polyline points="20 6 9 17 4 12"/></svg></span>`;
}

/**
 * El sello de Verysset: la píldora del ejemplo que mandó Mauricio —degradado,
 * letras en blanco en negrita y la marca en un círculo a la izquierda— pero con
 * nuestro verde y nuestro escudo.
 *
 * Dos cosas estaban mal antes y por eso no se leía: el texto iba oscuro sobre la
 * fotografía oscura, y el degradado acababa en un verde demasiado claro para
 * llevar blanco encima. Aquí el degradado arranca casi negro y acaba en el verde
 * oscuro de la casa (5:1 con el blanco), así que la letra se lee en todo el ancho.
 */
export function selloVerysset(titulo = 'Verified by Verysset', dato = {}) {
  // El sello lleva dentro de sí lo que necesita para abrir su informe: de qué unidad es, su título y
  // su referencia. Así vale en cualquier pantalla —tarjeta, ficha, proyecto, buscador— sin que cada
  // vista tenga que cablearlo, y un solo manejador delegado los atiende todos.
  const attrs = [
    dato.unidad ? `data-unidad="${esc(dato.unidad)}"` : '',
    dato.titulo ? `data-titulo="${esc(dato.titulo)}"` : '',
    dato.ref ? `data-ref="${esc(dato.ref)}"` : '',
  ].filter(Boolean).join(' ');
  const accion = dato.unidad
    ? ' role="button" tabindex="0" aria-label="Open the Verysset verification report"' : '';
  return `<span class="sello-vss"${titulo ? ` title="${esc(titulo)}"` : ''}${attrs ? ` ${attrs}` : ''}${accion}>
    <span class="vss-marca" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13"
      fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"
      ><polyline points="20 6 9 17 4 12"/></svg></span>
    <b>Verysset</b></span>`;
}

/** The badge of a listing: what it covers and until when, never a blank guarantee. */
export function badgeHtml(badge, procedencia, dato = {}) {
  if (!badge?.alcance) return '';
  const hasta = badge.vigencia ? ` until ${esc(date(badge.vigencia))}` : '';
  const validado = badge.validado_en ? `Checked on ${esc(date(badge.validado_en))}. ` : '';
  return `<div class="sello-linea">
    ${selloVerysset(procedencia ? `Evidence: ${procedencia}` : 'Verified by Verysset', dato)}
    <p class="note">${validado}Scope: ${esc(badge.alcance)}${hasta}.
    ${badge.garantia_incondicional === false ? 'A badge states the scope and the date of the evidence. It is not an unconditional guarantee.' : ''}</p></div>`;
}

/* ----------------------------------------------------------------------------
   El selector de fotos de una tarjeta.

   Se mira solo cuando la tarjeta entra en pantalla —pedir las fotos de doce
   fichas de golpe es castigar al teléfono—, se pintan como mucho ocho
   miniaturas, y cuando hay más la novena pieza no es una foto: es la puerta a la
   galería de la ficha. La tarjeta elige la foto; el visor no se muda a la lista.
   -------------------------------------------------------------------------- */
const MAX_MINI = 8;

export function hidratarTarjetas() {
  if (typeof IntersectionObserver !== 'function') return;
  // Se observa la TARJETA, no el hueco de las miniaturas: un elemento oculto no
  // interseca nunca, así que observando el hueco el selector no se llenaba jamás.
  const observador = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      observador.unobserve(e.target);
      const caja = e.target.querySelector('.micro-fotos');
      if (caja) llenarMiniaturas(caja);
    }
  }, { rootMargin: '240px' });
  const revisar = () => {
    document.querySelectorAll('.card:not([data-fotos-pedidas])').forEach((c) => {
      c.dataset.fotosPedidas = '1';
      observador.observe(c);
    });
  };
  revisar();
  const raiz = document.getElementById('view') ?? document.body;
  new MutationObserver(revisar).observe(raiz, { childList: true, subtree: true });
}

async function llenarMiniaturas(caja) {
  const id = caja.dataset.fotos;
  let fotos = [];
  try {
    const m = await api.media(id);
    fotos = (m?.fotos ?? []).filter(Boolean);
  } catch { caja.hidden = true; return; }
  if (fotos.length < 2) { caja.hidden = true; return; }
  const visibles = fotos.slice(0, MAX_MINI);
  const resto = fotos.length - visibles.length;
  const tarjeta = caja.closest('.card');
  const foto = caja.parentElement;
  // La foto principal se busca EN EL MOMENTO DE USARLA, no al pintar: la lista se vuelve a pintar
  // (filtros, favoritos) y una referencia guardada apunta a una tarjeta que ya no está en pantalla.
  const fotoPrincipal = () => tarjeta?.querySelector('.photo > a img, .photo > img') ?? null;
  // El recuento NO va dentro de la tira: la tira se desplaza sola al avanzar y la etiqueta o se
  // corría con el contenido, o al fijarla se montaba encima de las miniaturas. Va anclada a la
  // propia foto (que ya es position:relative), así que puede correr sobre la imagen sin tapar nada.
  caja.innerHTML = visibles.map((f, i) => `<button type="button" class="mini${i === 0 ? ' on' : ''}"
      data-foto="${esc(f)}" data-i="${i}" title="Photo ${i + 1} of ${fotos.length}"><img src="${esc(f)}" alt="" loading="lazy"
      onerror="this.closest('.mini').remove()"></button>`).join('')
    + (resto > 0 ? `<a class="mini mas" href="#/unit/${esc(id)}"
        title="${resto} more photo${resto === 1 ? '' : 's'}, open the gallery">+${resto}</a>` : '');
  if (foto) {
    for (const viejo of foto.querySelectorAll('.foto-cuenta')) viejo.remove();
    const cuenta = document.createElement('span');
    cuenta.className = 'foto-cuenta';
    cuenta.textContent = `${fotos.length} photos`;
    cuenta.title = `${fotos.length} photos in this listing`;
    cuenta.setAttribute('style', 'position:absolute;left:10px;bottom:74px;z-index:3;'
      + 'background:rgba(17,17,17,.62);color:#fff;border-radius:999px;padding:.22rem .6rem;'
      + 'font-size:12px;font-weight:700;letter-spacing:.04em;white-space:nowrap;pointer-events:none');
    foto.appendChild(cuenta);
  }
  caja.hidden = false;

  /* Cuál se está viendo, y qué pasa al moverse: en círculo. De la última se pasa a la primera y de la
     primera a la última, hacia la derecha y hacia la izquierda. La tira acompaña, llevando a la vista
     la miniatura que toca. */
  let actual = 0;
  const pintar = (i, moverLaTira = true) => {
    actual = ((i % fotos.length) + fotos.length) % fotos.length;
    const im = fotoPrincipal();
    if (im) im.src = fotos[actual];
    const piezas = [...caja.querySelectorAll('.mini')];
    const mas = caja.querySelector('.mini.mas');
    piezas.forEach((m) => {
      if (m === mas) { m.classList.toggle('on', actual >= MAX_MINI); return; }
      m.classList.toggle('on', m.dataset.foto === fotos[actual]);
    });
    const activa = (actual < MAX_MINI ? piezas[actual] : mas) ?? piezas[0];
    if (moverLaTira && activa) activa.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  // Elegir foto con el dedo. Esto se hacía con un stopPropagation en fase de captura sobre la tira,
  // que mataba el clic antes de llegar a la miniatura: la foto principal no cambiaba nunca.
  caja.addEventListener('click', (ev) => {
    const b = ev.target.closest('.mini');
    if (!b || b.classList.contains('mas')) return;   // el +N es la puerta a la galería
    ev.preventDefault();
    ev.stopPropagation();                            // elegir la foto no puede abrir la ficha
    pintar(Number(b.dataset.i ?? 0));
  });

  /* Las flechas laterales, solo cuando la tarjeta tiene más de una fotografía: sacan la siguiente o la
     anterior, y dan la vuelta por los dos lados. */
  if (foto && fotos.length > 1 && !foto.querySelector('.foto-flecha')) {
    for (const [lado, salto, etiqueta] of [['prev', -1, 'Previous photo'], ['next', 1, 'Next photo']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `foto-flecha ${lado}`;
      b.setAttribute('aria-label', etiqueta);
      b.title = etiqueta;
      b.textContent = lado === 'prev' ? '‹' : '›';
      b.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();                        // la flecha tampoco abre la ficha
        pintar(actual + salto);
      });
      foto.appendChild(b);
    }
  }
}

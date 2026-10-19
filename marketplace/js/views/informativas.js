/**
 * Las páginas que el pie prometía y no existían.
 *
 * El pie del marketplace enlazaba a `#/about`, `#/careers`, `#/contact` y `#/terms` y las cuatro
 * decían «This page is not part of Release 1 yet»: cuatro puertas que no daban a ningún sitio. Estas
 * son las cuatro páginas, y todo lo que dicen sale de lo que el producto YA afirma en pantalla —las
 * reglas BR-001 a BR-010 del modelo— o de los canales que existen de verdad. **Nada inventado**: no
 * hay teléfono, ni oficina, ni horario, ni condiciones legales que no tengamos escritas.
 *
 * De diseño: una banda oscura con la marca al agua y una luz verde, y debajo el texto en tarjetas
 * sobre el blanco. Los términos van numerados porque son once reglas que conviene poder citar por su
 * número, y la de «lo que no somos» va en la tarjeta oscura, que es la que tiene que parar el ojo.
 */
import { esc } from '../ui.js';

const view = () => document.getElementById('view');

/** La banda de cabecera, con la marca al agua: la misma en las cuatro páginas. */
function banda(titulo, entradilla) {
  return `
  <header class="prosa-hero">
    <svg class="prosa-marca" viewBox="0 0 256 256" aria-hidden="true"><use href="#logo"></use></svg>
    <div class="prosa-inner">
      <p class="prosa-eyebrow">BlockEstate · Powered by NDC</p>
      <h1>${titulo}</h1>
      ${entradilla ? `<p class="prosa-lede">${esc(entradilla)}</p>` : ''}
    </div>
  </header>`;
}

/**
 * El cuerpo: una tarjeta por regla. `numerar` pone el índice en un círculo (los términos se citan por
 * número), `oscuras` marca las que van sobre el verde oscuro para cortar el ritmo.
 */
function cuerpo(secciones, { numerar = false, oscuras = [], tarjetas = '' } = {}) {
  return `
  <div class="prosa-cuerpo${tarjetas ? ' ancho' : ''}">
    ${tarjetas}
    ${secciones.map(([h, texto], i) => `
      <section class="prosa-sec${oscuras.includes(i) ? ' prosa-oscura' : ''}">
        ${h ? `<h2>${numerar ? `<span class="prosa-num">${String(i + 1).padStart(2, '0')}</span>` : ''}${esc(h)}</h2>` : ''}
        ${texto}
      </section>`).join('')}
  </div>`;
}

/** El único canal que la plataforma tiene de verdad. */
const CORREO = 'info@blockestate.ae';
const CORREO_PLATAFORMA = `<a href="mailto:${CORREO}">${CORREO}</a>`;

const ICO_SOBRE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2"></rect><path d="m3 6.5 9 6.5 9-6.5"></path></svg>';
const ICO_PISO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 21v-5h6v5"></path></svg>';
const ICO_CARNET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2"></rect><circle cx="8.5" cy="11" r="2.2"></circle><path d="M14 10h5M14 14h5M5 16.5c1-1.6 2.2-2 3.5-2s2.5.4 3.5 2"></path></svg>';
const ICO_LLAVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="16.5" cy="7.5" r=".8" fill="currentColor"></circle><path d="M2.6 17.4A2 2 0 0 0 2 18.8V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.2a2 2 0 0 0 1.4-.6l.8-.8a6.5 6.5 0 1 0-4-4z"></path></svg>';

/** Una tarjeta de canal: icono, a dónde lleva y para qué. */
function canal(ico, titulo, texto) {
  return `<article class="prosa-tarjeta">
    <i class="prosa-ico">${ico}</i>
    <b>${esc(titulo)}</b>
    <p>${texto}</p>
  </article>`;
}

export function viewAbout() {
  view().innerHTML = `
  ${banda('About BlockEstate', 'A marketplace of verified property in the United Arab Emirates. The '
    + 'buyer pays in digital assets, the developer is paid in dirhams, and the title is registered with the '
    + 'Dubai Land Department in the buyer\u2019s name.')}
  <div class="prosa">
    ${cuerpo([
      ['What we are', `<p>BlockEstate is a property marketplace. It publishes assets that have been `
        + `verified by Verysset, orchestrates the payment, and follows the purchase through to the `
        + `registration of the title. The contract price is always in dirhams; the digital asset figure is an `
        + `equivalent with an expiry, never a fixed price.</p>`],
      ['Who is behind it', `<p>NDC operates the marketplace: it brings the developers in, reviews `
        + `listings, checks the buyer\u2019s identity by hand and handles the exceptions. The platform `
        + `is built and owned by Aradina Technologies LLC. Each step of a purchase runs on a licensed `
        + `or contracted provider: the on-chain collection, the licensed exchange from digital assets to `
        + `dirhams, the bank that receives the money and the Land Department that registers the `
        + `deed.</p>`],
      ['What we are not', `<p>BlockEstate is not a bank, a custodian, a broker or an auditor. It does `
        + `not hold your digital assets or your dirhams, and it does not give investment, tax or legal advice. `
        + `It is the gateway that connects licensed and technology providers into one purchase.</p>`],
      ['Where this is going', `<p>What you are reading is the first release: the buyer marketplace `
        + `with a captured catalogue, the developer portal and the operations console. The assets on `
        + `this preview are a demonstration of the product, not a live offer.</p>`],
    ], { oscuras: [2] })}
    <p class="prosa-pie">Questions about any of this: ${CORREO_PLATAFORMA}.</p>
  </div>`;
}

export function viewContact() {
  const tarjetas = `<div class="prosa-tarjetas">
    ${canal(ICO_SOBRE, 'Write to us', `${CORREO_PLATAFORMA}<br><span>Anything about the `
      + `marketplace, a listing, a purchase in progress or your identity check. Put the reference of a `
      + `purchase in the subject line and it goes straight to the file.</span>`)}
    ${canal(ICO_PISO, 'About one property', `Every listing carries the channels the developer or the `
      + `agency opened: Telegram, WhatsApp or email. Those go to them, not to us — for anything about `
      + `the unit itself: viewings, handover, the building.`)}
    ${canal(ICO_CARNET, 'The identity check', `Reviewed by hand by NDC. We write to you from the `
      + `address above if a document is missing or unclear, and nothing is paid before that check is `
      + `approved.`)}
    ${canal(ICO_LLAVE, 'If you are a developer', `Pre-register your projects from the main site and `
      + `we come back to you. If you would rather write first, the address above reaches the team that `
      + `onboards developers.`)}
  </div>`;
  view().innerHTML = `
  ${banda('Contact us', 'One address, answered by a person. We have no published telephone line and '
    + 'no walk-in office, so that nothing goes unanswered: write, and it is read.')}
  <div class="prosa">${cuerpo([], { tarjetas })}</div>`;
}

export function viewTerms() {
  view().innerHTML = `
  ${banda('Terms & privacy', 'How the marketplace works, and what it commits to. Written plainly, '
    + 'from the rules the product applies to every purchase.')}
  <div class="prosa">
    <p class="prosa-nota">This page describes the marketplace as it works today. The binding wording `
      + `is being reviewed by NDC\u2019s counsel: where this page and a signed contract disagree, the `
      + `contract wins. None of this is legal, tax or investment advice.</p>
    ${cuerpo([
      ['The price is in dirhams', `<p>Every listing carries its price in AED, and that is the `
        + `contract price. A figure in digital assets is an <b>equivalent</b> read from a rate that carries an `
        + `expiry: it is an indication, and it is not a fixed price. When a rate is not known, the `
        + `marketplace shows nothing rather than a made-up number.</p>`],
      ['What \u201Cverified\u201D means, and what it does not', `<p>A verified badge declares the `
        + `<b>scope and the date</b> of the evidence behind it: who looked at the asset, what they saw `
        + `and when. It is not an unconditional guarantee of title, of completion, of the condition of `
        + `the building or of a rate.</p>`],
      ['One buyer at a time', `<p>A unit can hold one active reservation at a time. While it is `
        + `held, another buyer cannot hold it too.</p>`],
      ['Identity first, then payment', `<p>The identity and the documents are reviewed <b>by hand by `
        + `NDC</b>. Until that review is approved, no payment instruction is issued.</p>`],
      ['A payment is not a sale until it is reconciled', `<p>A message from a payment provider does `
        + `not complete a purchase on its own: the provider\u2019s state and the conditions of the `
        + `purchase are checked against each other first. An underpayment, an overpayment, a transfer `
        + `on the wrong network, an expired quote or a duplicate is held as an explicit exception and `
        + `looked at by a person. Nothing is resolved automatically.</p>`],
      ['Ownership is claimed only when it exists', `<p>Your portfolio shows a purchase as complete `
        + `only after the authorised completion or registration event. Until then it is a reservation `
        + `or a purchase in progress, and it says so.</p>`],
      ['The title', `<p>Ownership transfers by registration with the Dubai Land Department in the `
        + `buyer\u2019s name. The deed is the legal instrument; nothing on this site transfers a title `
        + `or promises one.</p>`],
      ['What BlockEstate is not', `<p>Not a bank, a custodian, a broker or an auditor. The `
        + `marketplace does not hold your digital assets or your dirhams, and the digital asset leg is collected `
        + `on-chain by a payment layer that never takes custody of it.</p>`],
      ['The price you accept does not move', `<p>The price and any discount you accept are fixed for `
        + `that purchase. If the listing changes afterwards, your purchase is not changed by it.</p>`],
      ['Your data', `<p>We collect what the identity check and the purchase need: your name, your `
        + `contact details and the documents you send. They are reviewed by hand by NDC and kept with `
        + `the record of the purchase. We do not sell them, and we do not use them for anything else. `
        + `You can ask what we hold about you, and ask for it to be corrected or removed, by writing `
        + `to the address on the contact page.</p>`],
      ['Anything with a real effect needs a person', `<p>No automated system on this platform `
        + `approves a developer, a listing, a price, an identity, a payment or the completion of a `
        + `sale. Every consequential step has an authorised human behind it, and the reason is `
        + `recorded with it.</p>`],
    ], { numerar: true, oscuras: [7] })}
    <p class="prosa-pie">Questions, or a correction: ${CORREO_PLATAFORMA}. It is read, and it is `
      + `answered.</p>
  </div>`;
}

export function viewCareers() {
  view().innerHTML = `
  ${banda('Careers', 'There are no open positions right now.')}
  <div class="prosa">
    ${cuerpo([
      ['What we do keep', `<p>We keep every message we get, and we read them. If you work in property `
        + `in the Emirates, in payments, in compliance or in building products like this one, write `
        + `and tell us what you would do here.</p>`],
      ['How to write', `<p class="prosa-canal">${CORREO_PLATAFORMA}</p>`],
    ])}
    <p class="prosa-pie">This page is honest rather than decorative: when there is a position, it will `
      + `be listed here.</p>
  </div>`;
}

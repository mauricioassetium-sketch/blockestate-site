/**
 * Buying in crypto, on the platform and nowhere else.
 *
 * One purchase is one file. The developer opens it, chooses the property and the buyer, states the
 * price and the asset, and points it at the wallet it will be paid into — a wallet the developer
 * owns. The house of exchange writes the payment link; the platform stores the address of that link
 * and emails it to the client. The client opens their own page and pays there. The house accepts and
 * says what the dirhams were. The developer closes.
 *
 * What this file never does, in any of its four screens:
 *  · it never asks for, stores or shows a key, a seed phrase or a password of a wallet;
 *  · it never moves money: the client pays on the house's page, with their own wallet, by hand;
 *  · it never converts: the dirhams are stated by the house, and the platform only records them.
 *
 * The four screens are four doors of one story: the developer's desk (`#/dev/purchases`), the file of
 * one purchase (`#/dev/purchase/:id`), the client's page (`#/pay/:token`, no session) and the house's
 * queue (`#/changer`). The words in them are the same words, because they are the same purchase.
 */
import { api } from '../api.js';
import { store } from '../store.js';
import { go } from '../router.js';
import { date, esc, ico, loading, money, toast } from '../ui.js';
import { cargar, cascaron } from './dev.js';

const view = () => document.getElementById('view');

/** The eight states of the walk, in the developer's words. */
const ESTADO = {
  draft: 'Draft',
  link_ready: 'Link attached',
  sent: 'With the client',
  paid: 'Paid in crypto',
  conversion_requested: 'At the exchange house',
  converted: 'Converted to dirhams',
  settled: 'Settled',
  rejected: 'Declined',
};
const PASOS = ['draft', 'link_ready', 'sent', 'paid', 'conversion_requested', 'converted', 'settled'];
const PASO_CORTO = {
  draft: 'Draft', link_ready: 'Link', sent: 'Sent to the buyer', paid: 'Paid',
  conversion_requested: 'At the house', converted: 'In dirhams', settled: 'Settled',
};
const ACTIVOS = [['USDT', 'USDT · Tether'], ['ETH', 'ETH · Ether'], ['BTC', 'BTC · Bitcoin']];
const RED_DE = { USDT: 'ERC20', ETH: 'ERC20', BTC: 'Bitcoin' };

const tag = (estado) => `<span class="tag${estado === 'settled' || estado === 'converted'
  ? ' green' : estado === 'rejected' ? ' err' : estado === 'paid' ? ' coin' : ''}">${esc(ESTADO[estado] ?? estado)}</span>`;

const dato = (k, v, mono = false) => (v === null || v === undefined || v === ''
  ? '' : `<dt>${esc(k)}</dt><dd${mono ? ' class="dev-mono"' : ''}>${esc(v)}</dd>`);

const datoHtml = (k, html) => (html ? `<dt>${esc(k)}</dt><dd>${html}</dd>` : '');

/** Six decimals for a crypto amount and none of them invented: what the developer stated, as is. */
function cripto(n, activo) {
  if (n === null || n === undefined) return '';
  const cifra = Number(n);
  const decimales = cifra >= 1 ? 4 : 6;
  return `${cifra.toLocaleString('en-US', { maximumFractionDigits: decimales })} ${activo}`;
}

/** One delegated copier for every screen here: the clipboard when the browser allows it, the value
 * itself when it does not. Attached once, because the view element outlives every render. */
let copiadorListo = false;
function engancharCopiar() {
  if (copiadorListo) return;
  copiadorListo = true;
  document.addEventListener('click', async (e) => {
    const boton = e.target.closest?.('[data-copiar]');
    if (!boton) return;
    try {
      await navigator.clipboard.writeText(boton.dataset.copiar);
      toast('Copied.');
    } catch {
      // Without the clipboard the value has to be readable: it is put in front of the reader instead.
      toast(boton.dataset.copiar);
    }
  });
}

function respuesta(id, ok) {
  return `<p class="msg err" id="${id}-error" hidden></p><p class="msg ok" id="${id}-ok" hidden>${ok ?? ''}</p>`;
}

function di(id, exito, texto) {
  const err = view().querySelector(`#${id}-error`);
  const bien = view().querySelector(`#${id}-ok`);
  if (err) err.hidden = true;
  if (bien) bien.hidden = true;
  if (exito && bien) { bien.hidden = false; bien.innerHTML = texto; }
  if (!exito && err) { err.hidden = false; err.textContent = `It did not go through: ${texto?.message ?? texto}`; }
}

/* ------------------------------------------------------------------ the developer's desk */

/**
 * The shell of the portal, with the purchases of this visit fetched beside the book it already knows.
 * A desk that cannot read the purchases says why instead of drawing an empty table.
 */
async function conCaja(activo, pinta, titulo = '') {
  view().innerHTML = `<div class="lab"><span>Developer portal</span><span class="dash"></span></div>
    <div class="dev-carga">${loading(3)}</div>`;
  let d;
  let compras = null;
  let opciones = null;
  try {
    d = await cargar();
  } catch {
    view().innerHTML = `<div class="lab"><span>Developer portal</span><span class="dash"></span></div>
      <section class="mod"><header>${ico('llave', 15)}<h4>A developer account is needed</h4></header>
      <p class="note">This door belongs to an organisation that has been through NDC's review.
      <a href="#/login">Sign in</a> with a developer account to see its book.</p></section>`;
    return;
  }
  try {
    [compras, opciones] = await Promise.all([api.devPurchases(), api.devPurchaseOptions()]);
  } catch (e) {
    // The reason is kept, because it is what the desk prints instead of an empty table.
    compras = { error: e?.message ?? 'the API did not answer' };
  }
  view().innerHTML = cascaron(d, activo, pinta(d, compras, opciones), '', titulo);
  return { d, compras, opciones };
}

export async function viewDevPurchases() {
  const r = await conCaja('#/dev/purchases', (d, compras, opciones) => {
    if (compras && compras.error) {
      return `<section class="mod">
        <header>${ico('moneda', 15)}<h4>Purchases in crypto</h4></header>
        <p class="msg err">They could not be read: ${esc(compras.error)}</p></section>`;
    }
    const lista = compras?.compras ?? [];
    const resumen = compras?.resumen ?? {};
    const unidades = opciones?.unidades ?? [];
    const casas = opciones?.changers ?? [];
    const abiertas = lista.filter((c) => !['settled', 'rejected'].includes(c.estado));

    return `
      <section class="mod destacados">
        <div class="dest"><b>${abiertas.length}</b><span class="dest-lab">Open files</span></div>
        <div class="dest"><b>${lista.filter((c) => c.estado === 'sent').length}</b>
          <span class="dest-lab">Waiting on the client</span></div>
        <div class="dest"><b class="chico">${money(resumen.en_cripto ?? 0)}</b>
          <span class="dest-lab">Held in crypto</span></div>
        <div class="dest"><b>${lista.filter((c) => ['converted', 'settled'].includes(c.estado)).length}</b>
          <span class="dest-lab">In dirhams</span></div>
      </section>

      <div class="note cmp-doctrina">
        <b>How the money moves.</b> The buyer pays in crypto into <b>your</b> wallet, on the payment
        link of the exchange house — never on this screen. You send it on to the house, the house
        converts it to dirhams by hand and says how many, and you close the file. BlockEstate holds
        no wallet, no key and no money: it keeps the file and the step it is in, and shows the same
        step to everybody involved.
      </div>

      <section class="mod">
        <header>${ico('moneda', 15)}<h4>Purchases</h4>
          <span class="muted">${lista.length} file${lista.length === 1 ? '' : 's'}</span></header>
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>Property</th><th>Buyer</th><th class="num">Price</th>
              <th>Exchange house</th><th>State</th><th></th></tr></thead>
            <tbody>
              ${lista.length ? lista.map((c) => `
                <tr data-ir="#/dev/purchase/${esc(c.id)}">
                  <td><b>${esc(c.proyecto ?? '')}${c.unidad?.tipo ? ` · ${esc(c.unidad.tipo)}` : ''}</b>
                    <small>${esc(c.unidad?.habitaciones ? `${c.unidad.habitaciones} bed · ` : '')}${esc(String(c.id).slice(0, 8).toUpperCase())}</small></td>
                  <td>${esc(c.comprador)}<small>${esc(c.email)}</small></td>
                  <td class="num"><b>${esc(c.precio_aed)}</b>
                    <small>${esc(cripto(c.monto_cripto, c.activo))}</small></td>
                  <td>${esc(c.changer ?? '—')}</td>
                  <td>${tag(c.estado)}</td>
                  <td class="abrir">${ico('derecha', 15)}</td>
                </tr>`).join('')
                : '<tr><td colspan="6" class="note">No purchase opened yet. The first one is opened below.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <section class="mod">
        <header>${ico('pluma', 15)}<h4>Open a purchase</h4>
          <span class="muted">${unidades.length} propert${unidades.length === 1 ? 'y' : 'ies'} available</span></header>
        <form class="dev-form" id="cmp-alta">
          <div class="dev-form-2">
            <label class="cmp-ancho">Property to sell
              <select name="unidad_id" required>
                ${unidades.length ? unidades.map((u) => `<option value="${esc(u.id)}"
                  data-precio="${esc(String(u.precio_fils))}">${esc(u.proyecto)} · ${esc(u.tipo)}
                  ${u.habitaciones ? `· ${u.habitaciones} bed` : ''} · ${esc(u.precio_aed)}</option>`).join('')
                  : '<option value="">No available property on the book</option>'}
              </select></label>
            <label>Price for this buyer <span class="cmp-suf">AED</span>
              <input name="precio_aed" type="number" min="1" step="1000" required></label>
            <label>Buyer <input name="comprador_nombre" required maxlength="160" placeholder="Hamdan Al Suwaidi"></label>
            <label>Buyer's email <input name="comprador_email" type="email" required maxlength="180"
              placeholder="buyer@example.com"></label>
            <label>Asset
              <select name="activo" required>
                ${ACTIVOS.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}
              </select></label>
            <label>Rate <span class="cmp-suf">AED per 1 unit</span>
              <input name="aed_por_unidad" type="number" min="0.0001" step="0.0001" value="3.6725" required></label>
            <label class="cmp-ancho">Wallet to receive the crypto
              <input name="wallet_direccion" maxlength="120" placeholder="0x… (your own wallet)">
              <span class="note">This is where the buyer's crypto lands. It has to be a wallet
                <b>you</b> control: the platform never receives it and cannot recover it.</span></label>
            <label>Exchange house
              <select name="changer_id">
                <option value="">— to choose later —</option>
                ${casas.map((c) => `<option value="${esc(c.id)}">${esc(c.nombre)}
                  ${c.licencia ? `· ${esc(c.licencia)}` : ''}</option>`).join('')}
              </select></label>
          </div>

          <div class="cmp-cartera">
            <div class="cmp-cartera-txt">
              <b>${ico('llave', 13)} Set the wallet up in MetaMask</b>
              <span>MetaMask is the wallet; BlockEstate only keeps its address. Install it, create the
                wallet there (the twelve words are yours and stay with you), pick the network of the
                asset, and connect it here so the address is filled in without a typo.</span>
            </div>
            <div class="cmp-cartera-btns">
              <button class="btn ghost" type="button" data-cmp="metamask">Connect MetaMask</button>
              <a class="btn ghost" href="https://metamask.io/download/" target="_blank" rel="noopener">Install MetaMask</a>
            </div>
          </div>

          <label class="dev-ancho">Notes for the file
            <input name="notas" maxlength="600" placeholder="Payment split in two, second half on handover…"></label>

          <div class="cmp-previa" id="cmp-previa"></div>

          <div class="dev-form-pie">
            <button class="btn green" type="submit">${ico('trato', 15)} Open the purchase</button>
            <span class="note">Opening it writes nothing to the buyer's side yet: the payment link and
              the email come next, and each one is a button of its own.</span>
          </div>
          ${respuesta('cmp-alta', '')}
        </form>
      </section>`;
  }, 'Purchases in crypto');

  const f = view().querySelector('#cmp-alta');

  if (!f) return;

  /* The price follows the property chosen, and it is still the developer's to change. */
  const sel = f.querySelector('select[name="unidad_id"]');
  const precio = f.querySelector('input[name="precio_aed"]');
  const tasa = f.querySelector('input[name="aed_por_unidad"]');
  const activo = f.querySelector('select[name="activo"]');
  const previa = view().querySelector('#cmp-previa');
  const pintarPrevia = () => {
    const aed = Number(precio.value || 0);
    const t = Number(tasa.value || 0);
    if (!(aed > 0) || !(t > 0)) { previa.innerHTML = ''; return; }
    const unidades = aed / t;
    previa.innerHTML = `<b>${esc(cripto(unidades, activo.value))}</b>
      <span>for ${esc(money(Math.round(aed * 100)))} at ${esc(String(t))} AED per ${esc(activo.value)}</span>`;
  };
  const precioDe = () => {
    const o = sel.selectedOptions?.[0];
    const fils = Number(o?.dataset.precio || 0);
    if (fils > 0) precio.value = String(Math.round(fils / 100));
    pintarPrevia();
  };
  sel?.addEventListener('change', precioDe);
  precioDe();
  precio.addEventListener('input', pintarPrevia);
  tasa.addEventListener('input', pintarPrevia);
  activo.addEventListener('change', pintarPrevia);

  /* MetaMask: the address is read from the wallet the developer already has; the keys never travel. */
  f.querySelector('[data-cmp="metamask"]')?.addEventListener('click', async (e) => {
    const boton = e.currentTarget;
    const proveedor = window.ethereum;
    if (!proveedor?.request) {
      toast('MetaMask is not installed in this browser. Install it from metamask.io, or paste the address.');
      return;
    }
    boton.disabled = true;
    try {
      const cuentas = await proveedor.request({ method: 'eth_requestAccounts' });
      const direccion = cuentas?.[0];
      if (!direccion) throw new Error('The wallet returned no address');
      f.querySelector('input[name="wallet_direccion"]').value = direccion;
      toast('Wallet connected. Only its public address was read.');
    } catch (err) {
      toast(err?.message ?? 'The wallet did not answer.');
    } finally {
      boton.disabled = false;
    }
  });

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cuerpo = Object.fromEntries(new FormData(f));
    if (!cuerpo.unidad_id) { di('cmp-alta', false, 'There is no available property to sell.'); return; }
    cuerpo.precio_aed = Number(cuerpo.precio_aed);
    cuerpo.aed_por_unidad = Number(cuerpo.aed_por_unidad);
    cuerpo.red = RED_DE[cuerpo.activo] ?? 'ERC20';
    for (const k of ['notas', 'wallet_direccion', 'changer_id']) if (!cuerpo[k]) delete cuerpo[k];
    const boton = f.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      const alta = await api.devPurchaseCreate(cuerpo);
      di('cmp-alta', true, `Purchase opened for <b>${esc(alta.comprador)}</b>. Now attach the payment link of the house.`);
      setTimeout(() => go(`/dev/purchase/${alta.id}`), 700);
    } catch (err) {
      di('cmp-alta', false, err);
      boton.disabled = false;
    }
  });
}

/* ------------------------------------------------------------------ one purchase, its steps */

/** The rail: every step of the walk, the one we are in, and the ones already behind. */
function pasos(compra) {
  const actual = PASOS.indexOf(compra.estado === 'rejected' ? 'conversion_requested' : compra.estado);
  const cerrada = compra.estado === 'settled' || compra.estado === 'cancelled';
  return `<ol class="cmp-pasos">
    ${PASOS.map((p, i) => `<li class="${i < actual || cerrada ? 'hecho' : i === actual ? 'aqui' : ''}">
      <span class="cmp-paso-n">${i < actual || cerrada ? '✓' : i + 1}</span>
      <span class="cmp-paso-t">${esc(PASO_CORTO[p] ?? ESTADO[p])}</span></li>`).join('')}
  </ol>`;
}

/**
 * The actions of the step the purchase is in. One bar, one button that matters: what the developer
 * has to do next is the green one, and nothing that belongs to the client or to the house appears.
 */
function acciones(compra, casas) {
  const id = compra.id;
  if (compra.estado === 'draft') {
    return `<form class="cmp-accion" data-cmp-form="link">
      <label>Payment link of the exchange house
        <input name="enlace" required maxlength="600" placeholder="https://pay.house.example/inv/…"
          value="${esc(compra.enlace ?? '')}">
        <span class="note">The house writes this link. Paste it as it is: the buyer pays there, not here.</span></label>
      ${casas.length ? `<label>House
        <select name="changer_id">${casas.map((c) => `<option value="${esc(c.id)}"
          ${compra.changer === c.nombre ? ' selected' : ''}>${esc(c.nombre)}${c.licencia ? ` · ${esc(c.licencia)}` : ''}</option>`).join('')}
        </select></label>` : ''}
      <button class="btn green" type="submit">${ico('permiso', 15)} Attach the link</button>
      ${respuesta('cmp-link', '')}
    </form>`;
  }
  if (compra.estado === 'link_ready' || compra.estado === 'sent') {
    return `<div class="cmp-accion">
      <p class="note">The link is attached. ${compra.estado === 'sent'
        ? `It went to <b>${esc(compra.email)}</b> on ${esc(date(compra.enviado_en))}; sending it again is harmless.`
        : 'The buyer has not been told yet: send it and their page opens from the email.'}</p>
      <div class="cmp-botones">
        <button class="btn green" type="button" data-cmp-accion="send">
          ${ico('entrega', 15)} Send the link to the buyer</button>
        <a class="btn ghost" href="${esc(compra.enlace)}" target="_blank" rel="noopener">Open the payment link</a>
        <a class="btn ghost" href="#/pay/${esc(compra.token)}" target="_blank" rel="noopener">The buyer's page</a>
      </div>
      <p class="msg ok" id="cmp-send-ok" hidden></p>
      <p class="msg err" id="cmp-send-error" hidden></p>
      <hr class="cmp-hilo">
      <form class="cmp-accion" data-cmp-form="paid">
        <label>The crypto has arrived · transaction hash
          <input name="tx_hash" maxlength="80" placeholder="0x… (read it from your wallet)">
          <span class="note">Optional, but the file reads better with it. The platform stores the hash;
            it never signs the transfer and never holds the coins.</span></label>
        <button class="btn green" type="submit">${ico('sello', 15)} Record the payment</button>
        ${respuesta('cmp-paid', '')}
      </form>
    </div>`;
  }
  if (compra.estado === 'paid') {
    return `<div class="cmp-accion">
      <p class="note">The crypto is in your wallet. Send it on to <b>${esc(compra.changer ?? 'the exchange house')}</b>
        from that same wallet, by hand, and then hand the file over here: the platform records the
        hand-over, it does not make it.</p>
      <div class="cmp-botones">
        <button class="btn green" type="button" data-cmp-accion="forward">
          ${ico('entrega', 15)} Send to the exchange house</button>
      </div>
      <p class="msg ok" id="cmp-forward-ok" hidden></p>
      <p class="msg err" id="cmp-forward-error" hidden></p>
      <form class="cmp-accion" data-cmp-form="paid">
        <label>Correct the transaction
          <input name="tx_hash" maxlength="80" placeholder="0x…" value="${esc(compra.tx_hash ?? '')}"></label>
        <button class="btn ghost" type="submit">Record it</button>
      </form>
    </div>`;
  }
  if (compra.estado === 'conversion_requested') {
    return `<div class="cmp-accion">
      <p class="note">Waiting on <b>${esc(compra.changer ?? 'the house')}</b>. They accept the file in
        their own desk and state the dirhams; there is nothing for you to press until they do.</p>
    </div>`;
  }
  if (compra.estado === 'converted') {
    return `<div class="cmp-accion">
      <p class="note">The house converted ${esc(cripto(compra.monto_cripto, compra.activo))} into
        <b>${esc(compra.aed_convertido ?? '')}</b>${compra.referencia ? ` (reference ${esc(compra.referencia)})` : ''}.
        When the dirhams are in your account, close the file: it stays on the book, closed.</p>
      <div class="cmp-botones">
        <button class="btn green" type="button" data-cmp-accion="settle">
          ${ico('banco', 15)} The dirhams are in</button>
      </div>
      <p class="msg ok" id="cmp-settle-ok" hidden></p>
      <p class="msg err" id="cmp-settle-error" hidden></p>
    </div>`;
  }
  if (compra.estado === 'rejected') {
    return `<div class="cmp-accion">
      <p class="msg err">The house declined it: ${esc(compra.motivo_rechazo ?? 'no reason given')}.
        Send the crypto back or arrange it with them directly; this file is closed and stays as it is.</p>
    </div>`;
  }
  return `<div class="cmp-accion"><p class="note">This purchase is closed: the dirhams are in and the
    trail below is the whole story of it.</p></div>`;
}

const TRAIL = { desarrollador: 'You', changer: 'The house', cliente: 'The buyer', plataforma: 'BlockEstate' };
/** The wallet as its own maker spells it: a product's name is not a value to be title-cased. */
const CARTERA = { metamask: 'MetaMask', walletconnect: 'WalletConnect' };

export async function viewDevPurchase(id) {
  const r = await conCaja('#/dev/purchases', (d, compras, opciones) => {
    const c = (compras?.compras ?? []).find((x) => x.id === id);
    if (!c) {
      return `<section class="mod"><header>${ico('moneda', 15)}<h4>Not on your book</h4></header>
        <p class="note">This file does not exist in your organisation.
        <a href="#/dev/purchases">Back to the purchases</a>.</p></section>`;
    }
    const casas = opciones?.changers ?? [];
    return `
      <p class="cmp-volver"><a href="#/dev/purchases">← All purchases</a>
        <span>${esc(String(c.id).slice(0, 8).toUpperCase())} · opened ${esc(date(c.creado_en))}</span></p>

      <section class="mod cmp-cabeza">
        <div>
          <h3>${esc(c.proyecto ?? '')}${c.unidad?.tipo ? ` · ${esc(c.unidad.tipo)}` : ''}
            ${c.unidad?.habitaciones ? `<small>${c.unidad.habitaciones} bed</small>` : ''}</h3>
          <p class="note">${esc(c.comprador)} · ${esc(c.email)}</p>
        </div>
        <div class="cmp-cabeza-cifra">
          <b>${esc(c.precio_aed)}</b>
          <span>${esc(cripto(c.monto_cripto, c.activo))}${c.aed_por_unidad ? ` at ${esc(String(c.aed_por_unidad))} AED/${esc(c.activo)}` : ''}</span>
          ${tag(c.estado)}
        </div>
      </section>

      ${pasos(c)}
      ${acciones(c, casas)}

      <div class="dev-dos">
        <section class="mod">
          <header>${ico('llave', 15)}<h4>Where the money goes</h4></header>
          <dl class="dev-dl">
            ${datoHtml('Wallet', c.wallet
              ? `<code class="dev-mono">${esc(c.wallet)}</code>
                 <button class="btn ghost cmp-copiar" type="button" data-copiar="${esc(c.wallet)}">Copy</button>`
              : '<span class="note">Not set yet</span>')}
            ${dato('Wallet type', CARTERA[c.wallet_tipo] ?? String(c.wallet_tipo ?? '').replace(/^./, (x) => x.toUpperCase()))}
            ${dato('Asset', `${c.activo} · ${c.red}`)}
            ${dato('Amount', cripto(c.monto_cripto, c.activo))}
            ${dato('Exchange house', c.changer ? `${c.changer}${c.changer_licencia ? ` · ${c.changer_licencia}` : ''}` : '')}
            ${datoHtml('Payment link', c.enlace
              ? `<a href="${esc(c.enlace)}" target="_blank" rel="noopener">${esc(String(c.enlace).replace(/^https?:\/\//, ''))}</a>`
              : '')}
            ${datoHtml('The buyer\'s page', `<a href="#/pay/${esc(c.token)}" target="_blank" rel="noopener">Open it</a>
              <button class="btn ghost cmp-copiar" type="button" data-copiar="${esc(`${location.origin}${location.pathname}#/pay/${c.token}`)}">Copy</button>`)}
          </dl>
          <p class="note">BlockEstate does not hold this wallet, its keys or its money. It keeps the
            address so every side of the purchase reads the same one.</p>
        </section>

        <section class="mod">
          <header>${ico('fecha', 15)}<h4>The trail</h4></header>
          <ol class="cmp-trail">
            ${(c.eventos ?? []).map((e, i, todos) => {
              // Two things happen at the exchange house — it takes the file and it states the dirhams —
              // and both carry the same state. The second one is titled by what was done, not by where.
              const mismo = i > 0 && todos[i - 1].paso === e.paso;
              const titulo = mismo && e.nota ? e.nota : (ESTADO[e.paso] ?? e.paso);
              return `<li><b>${esc(titulo)}</b>
              <span>${esc(TRAIL[e.actor_tipo] ?? e.actor_tipo)}${e.actor_nombre ? ` · ${esc(e.actor_nombre)}` : ''}
              · ${esc(date(e.ts))}</span>${e.nota && !mismo ? `<small>${esc(e.nota)}</small>` : ''}</li>`;
            }).join('')
              || '<li><span class="note">Nothing written yet.</span></li>'}
          </ol>
        </section>
      </div>`;
  }, 'One purchase');

  if (!r) return;
  const main = view().querySelector('.dev-main');

  engancharCopiar();
  const compra = (r.compras?.compras ?? []).find((x) => x.id === id);
  if (!compra) return;

  /* The payment link, with the house chosen in the same pass. */
  main.querySelector('[data-cmp-form="link"]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const cuerpo = Object.fromEntries(new FormData(form));
    if (!cuerpo.changer_id) delete cuerpo.changer_id;
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      await api.devPurchaseLink(id, cuerpo);
      toast('Link attached.');
      viewDevPurchase(id);
    } catch (err) {
      di('cmp-link', false, err);
      boton.disabled = false;
    }
  });

  const paso = async (fn, idRespuesta) => {
    try {
      await fn();
      if (idRespuesta) di(idRespuesta, true, 'Done.');
      viewDevPurchase(id);
    } catch (err) {
      di(idRespuesta, false, err);
    }
  };

  main.querySelector('[data-cmp-accion="send"]')?.addEventListener('click', (e) => {
    e.currentTarget.disabled = true;
    paso(() => api.devPurchaseSend(id), 'cmp-send');
  });

  main.querySelector('[data-cmp-accion="forward"]')?.addEventListener('click', (e) => {
    e.currentTarget.disabled = true;
    paso(() => api.devPurchaseForward(id), 'cmp-forward');
  });

  main.querySelector('[data-cmp-accion="settle"]')?.addEventListener('click', (e) => {
    e.currentTarget.disabled = true;
    paso(() => api.devPurchaseSettle(id), 'cmp-settle');
  });

  /* The transaction hash, typed in after the payment: the platform keeps the proof, it does not make it. */
  main.querySelector('[data-cmp-form="paid"]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = e.currentTarget.querySelector('button[type="submit"]');
    boton.disabled = true;
    const tx = String(new FormData(e.currentTarget).get('tx_hash') ?? '').trim();
    try {
      await api.devPurchasePaid(id, tx ? { tx_hash: tx } : {});
      toast('Payment recorded.');
      viewDevPurchase(id);
    } catch (err) {
      di('cmp-paid', false, err);
      boton.disabled = false;
    }
  });
}

/* ------------------------------------------------------------------ the client's page */

/** No session, no menu: the buyer's door is the token in the email, and one page behind it. */
export async function viewPay(token) {
  view().innerHTML = `<div class="pay-caja">${loading(3)}</div>`;
  let p;
  try {
    p = await api.payView(token);
  } catch (e) {
    view().innerHTML = `
      <div class="pay-caja"><div class="pay-tarjeta">
        <h1>This page does not open</h1>
        <p class="note">${esc(e?.status === 404 ? 'The link is not a purchase of this platform, or it has been withdrawn.' : (e?.message ?? 'It could not be read.'))}</p>
        <p class="note">Ask the developer who sent it for a new link.</p>
        <a class="btn green" href="#/">Go to the marketplace</a>
      </div></div>`;
    return;
  }
  const pagado = ['paid', 'conversion_requested', 'converted', 'settled'].includes(p.estado);
  const pasosPago = ['sent', 'paid', 'conversion_requested', 'converted', 'settled'];
  const ahora = Math.max(0, pasosPago.indexOf(p.estado));
  const textos = {
    sent: ['Pay', 'Send the crypto to the wallet and open the payment link of the house.'],
    paid: ['Received', 'The crypto reached the developer\'s wallet.'],
    conversion_requested: ['In conversion', 'The exchange house is turning it into dirhams.'],
    converted: ['Converted', 'The dirhams are ready on the developer\'s side.'],
    settled: ['Closed', 'The purchase is complete. Your deed follows with the registration.'],
  };

  view().innerHTML = `
    <div class="pay-caja">
      <div class="pay-marca">
        <span><b>BlockEstate</b><i>Powered by NDC</i></span>
      </div>

      <div class="pay-tarjeta">
        <p class="pay-ref">Reference ${esc(p.referencia)} · ${esc(date(p.creado_en))}</p>
        <h1>${esc(p.proyecto ?? 'Your property')}${p.unidad?.tipo ? ` · ${esc(p.unidad.tipo)}` : ''}</h1>
        <p class="note">${p.unidad?.habitaciones ? `${p.unidad.habitaciones} bed · ` : ''}Sold by ${esc(p.desarrollador)}</p>
        <p class="pay-estado">${tag(p.estado)}<span>${esc(pagado
          ? (p.estado === 'settled' ? 'The purchase is complete.' : 'The crypto has been received — nothing more is due from you.')
          : 'Nothing has been paid yet.')}</span></p>

        <div class="pay-cifra">
          <div><span>Price</span><b>${esc(p.precio_aed)}</b></div>
          <div><span>To pay in ${esc(p.activo)}</span><b>${esc(cripto(p.monto_cripto, p.activo))}</b></div>
        </div>

        <div class="pay-wallet">
          <span>${pagado ? 'The wallet that received it' : 'Send it to this wallet'} · ${esc(p.red)}</span>
          <code>${esc(p.wallet ?? 'The developer has not set the wallet yet')}</code>
          ${p.wallet ? `<button class="btn ghost" type="button" data-copiar="${esc(p.wallet)}">Copy the address</button>` : ''}
          <small>This wallet belongs to ${esc(p.desarrollador)}. BlockEstate does not hold it and cannot
            move anything out of it.</small>
        </div>

        <div class="pay-cta">
          ${p.enlace
            ? `<a class="btn ${pagado ? 'ghost' : 'green'} pay-boton" href="${esc(p.enlace)}" target="_blank" rel="noopener">
                 ${pagado ? `The page of ${esc(p.changer?.nombre ?? 'the exchange house')}` : `Pay through ${esc(p.changer?.nombre ?? 'the exchange house')}`}</a>
               <small>${p.changer?.licencia ? `Licence ${esc(p.changer.licencia)} · ` : ''}The payment
                 and the conversion to dirhams happen on the house's page, with them.</small>`
            : `<p class="msg err">The payment link is not ready yet. Nothing is due until it is.</p>`}
        </div>

        <ol class="pay-pasos">
          ${pasosPago.map((s, i) => `<li class="${i < ahora || p.estado === 'settled' ? 'hecho' : i === ahora ? 'aqui' : ''}">
            <b>${esc(textos[s][0])}</b><span>${esc(textos[s][1])}</span></li>`).join('')}
        </ol>

        <p class="pay-nota">BlockEstate keeps the file of this purchase and nothing else: no wallet of
          yours, no key, no money in between. You pay in crypto from your own wallet; ${esc(p.changer?.nombre ?? 'the exchange house')}
          turns it into dirhams with the developer. The title follows the registration with the DLD,
          as on any other purchase.</p>
        ${pagado ? '<p class="msg ok">The payment has been received. Keep this page: it shows the step the purchase is in.</p>' : ''}
      </div>

      <p class="pay-pie">Questions? Reply to the email that brought you here ·
        <a href="#/">blockestate.ae</a></p>
    </div>`;

  engancharCopiar();
}

/* ------------------------------------------------------------------ the exchange house */

/**
 * The house's desk. It sees the files handed to it and nothing else: no other developer's book, no
 * buyer's identity check. Accepting one is its own act, and stating the dirhams is the conversion.
 */
export async function viewChanger() {
  view().innerHTML = `<div class="lab"><span>Exchange house</span><span class="dash"></span></div>
    <div class="dev-carga">${loading(3)}</div>`;

  let cola;
  try {
    cola = await api.changerQueue();
  } catch (e) {
    const sinSesion = e?.status === 401 || e?.status === 403;
    view().innerHTML = `
      <div class="lab"><span>Exchange house</span><span class="dash"></span></div>
      <section class="mod">
        <header>${ico('banco', 15)}<h4>A house's desk</h4></header>
        <p class="note">${sinSesion
          ? 'This door belongs to an exchange house registered on the platform, and it opens with its own account. Sign in with it to see the requests handed to it.'
          : `The desk could not be read: ${esc(e?.message ?? 'the API did not answer')}.`}</p>
        <p class="note"><a class="btn green" href="#/login">Sign in</a></p>
      </section>`;
    return;
  }

  const lista = cola.solicitudes ?? [];
  const resumen = cola.resumen ?? {};

  view().innerHTML = `
    <div class="lab"><span>Exchange house</span><span class="dash"></span></div>
    <div class="dev-bar">
      <div class="dev-bar-org">
        <span class="dev-marca">${ico('banco', 16)}</span>
        <span class="dev-bar-txt"><b>${esc(cola.casa?.nombre ?? '')}</b>
          <small>${esc(cola.casa?.licencia ?? '')} <i>Exchange house · Changer</i></small></span>
      </div>
    </div>
    <div class="dev-main">
      <section class="mod destacados">
        <div class="dest"><b>${resumen.por_aceptar ?? 0}</b><span class="dest-lab">To accept</span></div>
        <div class="dest"><b>${resumen.aceptadas ?? 0}</b><span class="dest-lab">Converted</span></div>
        <div class="dest"><b>${resumen.cerradas ?? 0}</b><span class="dest-lab">Closed</span></div>
        <div class="dest"><b>${lista.length}</b><span class="dest-lab">On the book</span></div>
      </section>

      <div class="note cmp-doctrina"><b>You are the hand, not the platform.</b> A request arrives here
        when a developer has the crypto in his wallet and sends it on to you. Accept it, receive the
        crypto, change it into dirhams and state how many: the conversion is yours, made with your own
        licence, and BlockEstate only records what you say. It never touches the coins or the money.</div>

      <section class="mod">
        <header>${ico('trato', 15)}<h4>Requests</h4>
          <span class="muted">${lista.length} file${lista.length === 1 ? '' : 's'}</span></header>
        <div class="dev-tabla-caja">
          <table class="dev-tabla">
            <thead><tr><th>File</th><th>Property</th><th class="num">To change into dirhams</th>
              <th>Transaction</th><th>State</th><th></th></tr></thead>
            <tbody>
              ${lista.length ? lista.map((s) => `
                <tr data-cmp-fila="${esc(s.id)}">
                  <td><b>${esc(s.desarrollador ?? '')}</b>
                    <small>${esc(s.comprador)} · ${esc(String(s.id).slice(0, 8).toUpperCase())}</small></td>
                  <td>${esc(s.proyecto ?? '')}${s.unidad?.tipo ? ` · ${esc(s.unidad.tipo)}` : ''}</td>
                  <td class="num"><b>${esc(s.precio_aed)}</b>
                    <small>${esc(cripto(s.monto_cripto, s.activo))}</small></td>
                  <td><small class="dev-mono">${esc(s.tx_hash ? `${String(s.tx_hash).slice(0, 8)}…${String(s.tx_hash).slice(-6)}` : '—')}</small></td>
                  <td>${tag(s.estado)}</td>
                  <td class="abrir">${ico('derecha', 15)}</td>
                </tr>`).join('')
                : '<tr><td colspan="6" class="note">No request has been handed to this house yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>

      <div id="cmp-casa-detalle"></div>`;

  const detalle = view().querySelector('#cmp-casa-detalle');
  view().addEventListener('click', (e) => {
    const fila = e.target.closest?.('[data-cmp-fila]');
    if (!fila) return;
    const s = lista.find((x) => x.id === fila.dataset.cmpFila);
    if (s) pintarDetalle(detalle, s, () => viewChanger());
  });
}

/** The file of one request, with the three things a house can do: take it, convert it, or say no. */
function pintarDetalle(caja, s, recargar) {
  const suyo = ['conversion_requested', 'converted', 'settled'].includes(s.estado);
  caja.innerHTML = `
    <section class="mod cmp-cabeza">
      <div>
        <h3>${esc(s.desarrollador ?? '')} · ${esc(s.proyecto ?? '')}</h3>
        <p class="note">${esc(s.comprador)} · ${esc(s.email)} · ${esc(String(s.id).slice(0, 8).toUpperCase())}</p>
      </div>
      <div class="cmp-cabeza-cifra">
        <b>${esc(s.precio_aed)}</b><span>${esc(cripto(s.monto_cripto, s.activo))}</span>${tag(s.estado)}
      </div>
    </section>
    <section class="mod">
      <header>${ico('llave', 15)}<h4>The crypto</h4></header>
      <dl class="dev-dl">
        ${dato('Asset', `${s.activo} · ${s.red}`)}
        ${dato('Wallet of the developer', s.wallet ?? '')}
        ${dato('Transaction', s.tx_hash ?? '')}
        ${dato('Handed over', s.enviado_changer_en ? String(date(s.enviado_changer_en)) : '')}
        ${datoHtml('Accepted by the house', s.aceptado_en
          ? `<span class="tag green">${esc(date(s.aceptado_en))}</span>`
          : '<span class="note">Not yet</span>')}
        ${datoHtml('Converted', s.aed_convertido ? `<b>${esc(s.aed_convertido)}</b> · ${esc(s.referencia ?? '')}` : '')}
      </dl>
      ${s.estado === 'rejected' ? `<p class="msg err">Declined: ${esc(s.motivo_rechazo ?? '')}</p>` : ''}
      ${suyo ? '' : '<p class="note">This file is not at your desk yet: it arrives when the developer has the crypto in his wallet and hands it over.</p>'}
    </section>

    ${s.estado === 'conversion_requested' ? `
      <section class="mod">
        <header>${ico('pluma', 15)}<h4>Accept and convert</h4></header>
        ${s.aceptado_en ? '' : `<div class="cmp-botones">
          <button class="btn green" type="button" data-casa-accion="accept">${ico('sello', 15)} Accept the request</button>
          <span class="note">Accepting says the file is yours to work; it moves nothing.</span></div>`}
        <form class="dev-form" id="cmp-convertir" ${s.aceptado_en ? '' : 'hidden'}>
          <div class="dev-form-2">
            <label>Dirhams converted <span class="cmp-suf">AED</span>
              <input name="aed" type="number" min="1" step="0.01" required placeholder="2394000"></label>
            <label>Your reference <input name="referencia" required maxlength="120" placeholder="OTC-2026-1116-0042"></label>
          </div>
          <div class="dev-form-pie">
            <button class="btn green" type="submit">${ico('moneda', 15)} Record the conversion</button>
            <span class="note">What you type is what the developer sees. The platform does not compute
              a rate and does not check the coins.</span>
          </div>
          ${respuesta('cmp-conv', '')}
        </form>
        <form class="dev-form" id="cmp-rechazar">
          <label>Or decline it <input name="motivo" required minlength="4" maxlength="400"
            placeholder="The wallet is not one of ours / AML check did not pass"></label>
          <div class="dev-form-pie">
            <button class="btn ghost" type="submit">${ico('cerrar', 15)} Decline the file</button>
            <span class="note">It goes back to the developer with your reason on it.</span>
          </div>
          ${respuesta('cmp-rech', '')}
        </form>
      </section>` : ''}`;

  caja.querySelector('[data-casa-accion="accept"]')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await api.changerAccept(s.id);
      recargar();
    } catch (err) {
      toast(err?.message ?? 'It did not go through.');
      e.currentTarget.disabled = false;
    }
  });

  caja.querySelector('#cmp-convertir')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cuerpo = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api.changerConvert(s.id, { aed: Number(cuerpo.aed), referencia: cuerpo.referencia });
      toast('Conversion recorded.');
      recargar();
    } catch (err) {
      di('cmp-conv', false, err);
    }
  });

  caja.querySelector('#cmp-rechazar')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cuerpo = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api.changerDecline(s.id, cuerpo.motivo);
      toast('Declined.');
      recargar();
    } catch (err) {
      di('cmp-rech', false, err);
    }
  });
}

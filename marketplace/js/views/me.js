/** Sign in, create an account, and the buyer's own pages. */

import { api } from '../api.js';
import { go } from '../router.js';
import { store } from '../store.js';
import { card, dateTime, empty, error, esc, loading, money, toast } from '../ui.js';

const view = () => document.getElementById('view');

/* ------------------------------------------------------------------ sign in */

async function viewAuth() {
  view().innerHTML = `
    <div class="narrow">
      <div class="lab"><span>Your account</span><span class="dash"></span></div>
      <h2>Sign in</h2>
      <div class="form-card" style="margin-top:14px">
        <form id="forma">
          <div class="field"><label for="email">Email</label>
            <input id="email" name="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="pass">Password</label>
            <input id="pass" name="contrasena" type="password" autocomplete="current-password" required></div>
          <button class="btn green" type="submit" style="width:100%">Sign in</button>
        </form>
        <div id="mfa" hidden style="margin-top:12px">
          <p class="muted" style="font-size:.9rem">This account has a second factor. Enter the six digits
            from your authenticator app.</p>
          <div class="field"><label for="codigo">Code</label>
            <input id="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div>
          <button class="btn" id="verificar" style="width:100%">Verify</button>
        </div>
        <div id="aviso"></div>
      </div>
      <p class="muted" style="margin-top:14px">No account yet?
        <a href="#/register"><b>Create one</b></a> to keep a shortlist and buy.</p>
    </div>`;

  let pendiente = null;

  view().querySelector('#forma').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const boton = e.target.querySelector('button');
    boton.disabled = true;
    try {
      const r = await api.login(String(f.get('email')).trim(), String(f.get('contrasena')));
      if (r.mfa_requerido) {
        pendiente = r.sesion;
        view().querySelector('#mfa').hidden = false;
        boton.textContent = 'Waiting for the code…';
        return;
      }
      await entrar(r.sesion);
    } catch (err) {
      error('#aviso', err);
      boton.disabled = false;
    }
  });

  view().querySelector('#verificar').addEventListener('click', async () => {
    const codigo = view().querySelector('#codigo').value.trim();
    try {
      const r = await api.mfaVerify(pendiente, codigo);
      await entrar(r.sesion);
    } catch (err) {
      error('#aviso', err);
    }
  });
}

/* ------------------------------------------------------------------ register */

async function viewRegister() {
  view().innerHTML = `
    <div class="narrow">
      <div class="lab"><span>Your account</span><span class="dash"></span></div>
      <h2>Create account</h2>
      <div class="form-card" style="margin-top:14px">
        <form id="forma">
          <div class="field"><label for="nombre">Full name</label>
            <input id="nombre" name="nombre" autocomplete="name" required></div>
          <div class="field"><label for="email">Email</label>
            <input id="email" name="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="pass">Password</label>
            <input id="pass" name="contrasena" type="password" autocomplete="new-password" minlength="8" required></div>
          <p class="note">Identity is checked by hand before any payment, and the developer never sees
            your documents.</p>
          <button class="btn green" type="submit" style="width:100%">Create account</button>
        </form>
        <div id="aviso"></div>
      </div>
      <p class="muted" style="margin-top:14px">Already registered? <a href="#/login"><b>Sign in</b></a>.</p>
    </div>`;

  view().querySelector('#forma').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const boton = e.target.querySelector('button');
    boton.disabled = true;
    try {
      const r = await api.register({
        nombre: String(f.get('nombre')).trim(),
        email: String(f.get('email')).trim(),
        contrasena: String(f.get('contrasena')),
      });
      await entrar(r.sesion);
    } catch (err) {
      error('#aviso', err);
      boton.disabled = false;
    }
  });
}

async function entrar(sesion) {
  store.save({ sesion });
  await store.refresh();
  toast(`Welcome, ${store.usuario()?.nombre ?? ''}.`.trim(), 'ok');
  go(store.favs.size ? '/favorites' : '/');
}

/* ------------------------------------------------------------------ favourites */

async function viewFavorites() {
  if (exigirSesion()) return;
  view().innerHTML = `
    <div class="lab"><span>Your shortlist</span><span class="dash"></span></div>
    <h1 style="font-size:clamp(1.5rem,3.4vw,2.2rem)">Favourites</h1>
    <p class="muted" style="font-size:.9rem">Saving a property does not reserve it. The only thing that
      holds a unit is a reservation.</p>
    <div id="lista">${loading(3)}</div>`;
  try {
    const r = await api.favorites();
    store.setFavs(r.unidades);
    view().querySelector('#lista').innerHTML = r.total === 0
      ? empty('No favourites yet', 'Save what interests you and come back to it later.',
          '<p style="margin-top:12px"><a class="btn green" href="#/search">Browse properties</a></p>')
      : `<div class="list">${r.unidades.map(card).join('')}</div>`;
  } catch (err) {
    error('#lista', err);
  }
}

/* ------------------------------------------------------------------ purchases */

async function viewPortfolio() {
  if (exigirSesion()) return;
  view().innerHTML = `
    <div class="lab"><span>Your record</span><span class="dash"></span></div>
    <h1 style="font-size:clamp(1.5rem,3.4vw,2.2rem)">My purchases</h1>
    <p class="muted" style="font-size:.9rem">A purchase in progress is not a property. Ownership is
      only asserted when the closing is signed and the registration with the Dubai Land Department is
      recorded.</p>
    <div id="lista">${loading(2)}</div>`;
  try {
    const r = await api.portfolio();
    if (!r.compras?.length) {
      view().querySelector('#lista').innerHTML = empty('Nothing here yet',
        'When you reserve a property, it appears here with its state.',
        '<p style="margin-top:12px"><a class="btn green" href="#/search">See properties</a></p>');
      return;
    }
    view().querySelector('#lista').innerHTML = `<div class="list">${r.compras.map((c) => `
      <a class="item" href="#/portfolio/${esc(c.intencion_id)}">
        <div class="row-between">
          <b>${esc(c.unidad)} · ${esc(c.proyecto ?? '')}</b>
          <span class="tag${c.afirmacion_legal ? ' green' : ''}">${esc(c.etiqueta)}</span>
        </div>
        <span class="muted" style="font-size:.9rem">${esc(money(c.precio_fils))} ·
          ${esc(c.comunidad ?? '')}${c.comunidad ? ' · ' : ''}${esc(c.emirato ?? '')}</span>
        ${c.referencia_dld ? `<span class="when">DLD reference ${esc(c.referencia_dld)}</span>` : ''}
      </a>`).join('')}</div>`;
  } catch (err) {
    error('#lista', err);
  }
}

/* ------------------------------------------------------------------ one purchase: the funnel */

// The quote and the order live in memory, keyed by leg: `GET /purchases/:id` returns neither, and
// the two legs are quoted separately. Opening another purchase starts clean.
let cot = null;          // { leg, data }
let ord = null;          // { leg, data }
let compraActual = null;

async function viewPurchase(id) {
  if (exigirSesion()) return;
  if (compraActual !== id) { cot = null; ord = null; compraActual = id; }
  view().innerHTML = `<div class="lab"><span>Purchase</span><span class="dash"></span></div><div id="compra">${loading(1)}</div>`;
  const caja = view().querySelector('#compra');

  const pintar = async () => {
    try {
      const [p, cartera] = await Promise.all([api.purchaseGet(id), api.purchase(id)]);
      const i = p.intencion;
      const estado = p.estado;
      /* El paso de PayTheFly es de las compras vivas: en una terminada o cancelada no pinta nada. */
      const finalizada = ['settled', 'completed', 'cancelled', 'expired', 'failed', 'refunded',
        'refund_pending', 'business_completion_approved'].includes(estado);
      const panelPtf = document.querySelector('#ptf-panel');
      if (panelPtf) panelPtf.hidden = finalizada;
      const saldo = Number(i.precio_fils) - Number(i.deposito_fils);

      caja.innerHTML = `
        <h1 style="font-size:clamp(1.4rem,3vw,2rem)">${esc(cartera.unidad)} · ${esc(cartera.proyecto ?? '')}</h1>
        <div class="row-between" style="margin:.4rem 0 1rem">
          <span class="tag${cartera.afirmacion_legal ? ' green' : ''}">${esc(cartera.etiqueta)}</span>
          <span class="muted" style="font-size:.85rem">${esc(pasos.find((s) => s.clave === estado)?.humano ?? estado)}</span>
        </div>

        <div class="form-card">
          <dl class="kv">
            <dt>Contract price</dt><dd>${esc(money(i.precio_fils))}</dd>
            <dt>Reservation deposit (10%)</dt><dd>${esc(money(i.deposito_fils))}</dd>
            <dt>Balance</dt><dd>${esc(money(saldo))}</dd>
            <dt>Registration</dt><dd>${esc(cartera.estado_registro)}</dd>
            ${cartera.referencia_dld ? `<dt>DLD reference</dt><dd>${esc(cartera.referencia_dld)}</dd>` : ''}
          </dl>
          <p class="note">The deposit is 10% of the price, the practice off plan. Each leg is paid with its
            own quote: a digital asset amount is an equivalent with an expiry, not a fixed price.</p>
        </div>

        <div class="section">
          <h3>Where this purchase is</h3>
          <ol class="steps-list">${pasos.map((s) => {
            const hecho = pasos.findIndex((x) => x.clave === estado) > pasos.findIndex((x) => x.clave === s.clave);
            const aqui = s.clave === estado;
            return `<li class="${hecho ? 'hecho' : aqui ? 'aqui' : ''}">${esc(s.humano)}${aqui ? ' · you are here' : ''}</li>`;
          }).join('')}</ol>
        </div>

        <div class="section">
          <div class="ptf" id="ptf-panel">
            <div class="ptf-head">
              <span class="ptf-marca">PayTheFly</span>
              <span class="ptf-que">on-chain collection · not custody</span>
            </div>
            <p class="note">The digital asset leg of this purchase is collected on chain by PayTheFly, which keeps
              nothing: no fiat, no bank, no exchange, no off-ramp. The dirhams reach the developer through the
              licensed OTC and the bank, and the Land Department registers the title.</p>
          </div>
          <div id="siguiente"></div>
        </div>
        <div class="section">
          <h3>Trail</h3>
          <div class="list">${(p.historial ?? []).slice().reverse().map((h) => `
            <div class="item"><div class="row-between">
              <span>${esc(h.accion ?? '')}</span><span class="when">${esc(dateTime(h.creado_en ?? h.ts))}</span>
            </div><span class="muted" style="font-size:.85rem">${esc(h.a_estado ?? '')}${h.motivo ? ` · ${esc(h.motivo)}` : ''}</span></div>`).join('')}</div>
        </div>`;

      const accion = caja.querySelector('#siguiente');
      await pintarSiguiente(accion, i, estado, pintar);
    } catch (err) {
      error(caja, err);
    }
  };

  await pintar();
}

/** The step the buyer sees, and what only a person inside the platform can do. */
const pasos = [
  { clave: 'held', humano: 'Reserved' },
  { clave: 'kyc_pending', humano: 'Identity check' },
  { clave: 'kyc_approved', humano: 'Identity approved' },
  { clave: 'quote_issued', humano: 'Quote issued' },
  { clave: 'deposit_pending', humano: 'Deposit pending' },
  { clave: 'deposit_detected', humano: 'Deposit detected' },
  { clave: 'deposit_confirmed', humano: 'Deposit confirmed' },
  { clave: 'payment_pending', humano: 'Balance pending' },
  { clave: 'detected', humano: 'Payment detected' },
  { clave: 'confirmed', humano: 'Payment confirmed' },
  { clave: 'aed_settlement_pending', humano: 'Settlement in dirhams' },
  { clave: 'settled', humano: 'Settled' },
  { clave: 'business_completion_approved', humano: 'Business completion signed' },
];

/**
 * What the buyer declares for a purchase: who they are and **which wallet the
 * money will come from**. The wallet is required because the payment is prepared
 * against it, and because the platform later compares it with the address that
 * actually paid: a difference is a case for a human, not a silent pass.
 */
function formDeclaracion(previa, texto) {
  return `
      <form id="kycdatos" class="filters" style="grid-template-columns:1fr 1fr">
        <div><label for="k_nombre">Full legal name</label>
          <input id="k_nombre" required value="${esc(previa?.nombre_legal ?? '')}"
            placeholder="As it appears on your document"></div>
        <div><label for="k_tipo">You are</label>
          <select id="k_tipo">
            <option value="persona"${previa?.tipo_persona === 'empresa' ? '' : ' selected'}>A person</option>
            <option value="empresa"${previa?.tipo_persona === 'empresa' ? ' selected' : ''}>A company</option>
          </select></div>
        <div><label for="k_pais">Country of residence</label>
          <input id="k_pais" required maxlength="2" pattern="[A-Za-z]{2}" value="${esc(previa?.pais_residencia ?? '')}"
            placeholder="AE" aria-describedby="k_pais_ayuda">
          <p class="note" id="k_pais_ayuda">Two letters, ISO code: AE, GB, IN, RU…</p></div>
        <div><label for="k_doc">Document</label>
          <select id="k_doc">
            <option value="passport">Passport</option>
            <option value="emirates_id">Emirates ID</option>
            <option value="national_id">National ID</option>
            <option value="commercial_licence">Commercial licence</option>
          </select></div>
        <div><label for="k_num">Document number</label>
          <input id="k_num" value="${esc(previa?.documento_numero ?? '')}"></div>
        <div><label for="k_tel">Phone</label>
          <input id="k_tel" value="${esc(previa?.telefono ?? '')}" placeholder="+971…"></div>
        <div style="grid-column:1/-1"><label for="k_wallet">Wallet you will pay from</label>
          <input id="k_wallet" required value="${esc(previa?.wallet_origen ?? '')}"
            placeholder="0x…" aria-describedby="k_wallet_ayuda">
          <p class="note" id="k_wallet_ayuda">On ${esc(RED)} only. The funds must come from this address:
            send it in any other format or from another network and the money is lost.</p></div>
        <div class="filters-actions"><button class="btn green" type="submit" id="kyc">${esc(texto)}</button></div>
      </form>`;
}

/** Wires the form above: it saves the declaration and, if asked, opens the case. */
function montarDeclaracion(caja, id, repintar, { abrirCaso }) {
  caja.querySelector('#kycdatos').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = caja.querySelector('#kyc');
    b.disabled = true;
    try {
      await api.kycDeclare(id, {
        nombre_legal: caja.querySelector('#k_nombre').value.trim(),
        tipo_persona: caja.querySelector('#k_tipo').value,
        pais_residencia: caja.querySelector('#k_pais').value.trim().toUpperCase(),
        documento_tipo: caja.querySelector('#k_doc').value,
        documento_numero: caja.querySelector('#k_num').value.trim(),
        telefono: caja.querySelector('#k_tel').value.trim(),
        wallet_origen: caja.querySelector('#k_wallet').value.trim(),
        red_origen: RED,
      });
      if (abrirCaso) await api.kycRequest(id);
      toast(abrirCaso ? 'Identity check started.' : 'Your data was corrected.', 'ok');
      await repintar();
    } catch (err) { error('#siguiente', err); b.disabled = false; }
  });
}

/** Correcting a detail while the case is still open: the buyer's data, not rewritten by anyone else. */
async function abrirCorreccion(i, caja, repintar) {
  const previa = await api.kycDeclaration(i.id).then((r) => r?.declaracion).catch(() => null);
  caja.innerHTML = `<h3>Correct your data</h3>
    <p class="muted">The case is still open, so you can fix a typo. Once it is decided it cannot change.</p>`
    + formDeclaracion(previa, 'Save the correction');
  montarDeclaracion(caja, i.id, repintar, { abrirCaso: false });
}

async function pintarSiguiente(caja, i, estado, repintar) {
  const conKyc = await api.kycState(i.id).catch(() => null);
  // The deposit first, the rest of the price after: a leg is quoted on its own amount.
  const leg = ['held', 'kyc_pending', 'kyc_approved', 'quote_issued', 'deposit_pending', 'deposit_detected'].includes(estado)
    ? 'deposit' : 'balance';
  const cotizacion = cot && cot.leg === leg ? cot.data : null;
  const pedido = ord && ord.leg === leg ? ord.data : null;

  if (estado === 'held') {
    // The identity check starts with what the buyer declares, and what they
    // declare has to include where the money comes from: without that address
    // nobody can prepare the payment, and a wallet on the wrong network is a
    // transfer nobody can recover.
    const previa = await api.kycDeclaration(i.id).then((r) => r?.declaracion).catch(() => null);
    caja.innerHTML = `
      <h3>Next: your identity check</h3>
      <p class="muted">It is reviewed by hand, one person at a time, and the developer never sees your
        documents. The payment step opens only when it is approved.</p>` + formDeclaracion(previa, 'Save and start the check');
    montarDeclaracion(caja, i.id, repintar, { abrirCaso: true });
    return;
  }

  if (estado === 'kyc_pending') {
    caja.innerHTML = `
      <h3>Waiting for the review</h3>
      <p class="muted">State: <b>${esc(conKyc?.estado ?? 'pending')}</b>. Someone on the team reviews it by
        hand; this page updates when it is decided.</p>
      <p class="note">If you got a detail wrong, you can still correct it until it is decided.</p>
      <button class="btn ghost" id="corregir">Correct my data</button>
      <button class="btn ghost" id="refrescar">Refresh</button>`;
    caja.querySelector('#refrescar').addEventListener('click', repintar);
    caja.querySelector('#corregir').addEventListener('click', () => abrirCorreccion(i, caja, repintar));
    return;
  }

  if (conKyc && ['rejected', 'expired'].includes(conKyc.estado)) {
    caja.innerHTML = `<h3>Identity check</h3>
      <p class="msg err">The check came back <b>${esc(conKyc.estado)}</b>. The payment cannot go ahead.</p>
      <p class="note">If you think this is wrong, the platform's operations team handles the exception.</p>`;
    return;
  }

  // From here the purchase is quotable, so the form shows whenever this leg has no quote in memory.
  if (!cotizacion) {
    caja.innerHTML = `
      <h3>Next: quote the ${esc(leg)}</h3>
      <p class="muted">The quote shows the amount, the asset, the network and an expiry, and the rate is
        not guaranteed after it.</p>
      <div class="filters" style="grid-template-columns:1fr 1fr auto">
        <div><label for="activo">Asset</label>
          <select id="activo">${ACTIVOS.map((a) => `<option>${esc(a)}</option>`).join('')}</select></div>
        <div><label>Network</label>
          <input value="${esc(RED)}" readonly aria-label="Payment network"></div>
        <div class="filters-actions"><button class="btn green" id="cotizar">Get the quote</button></div>
      </div>
      <p class="note">One network for the payment: ${esc(RED)}. The platform charges no rate of its own, the rate comes with the quote and it expires.</p>`;
    caja.querySelector('#cotizar').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        cot = { leg, data: await api.quote(i.id, {
          activo: caja.querySelector('#activo').value,
          red: RED,
          concepto: leg,
        }) };
        await repintar();
      } catch (err) { error('#siguiente', err); }
    });
    return;
  }

  if (['kyc_approved', 'quote_issued', 'deposit_confirmed'].includes(estado)) {
    if (cotizacion) {
      const vence = new Date(cotizacion.expira_en);
      const viva = vence.getTime() > Date.now();
      caja.innerHTML = `
        <h3>Quote · ${esc(cotizacion.concepto)}</h3>
        <dl class="kv">
          <dt>Amount</dt><dd>${esc(cotizacion.monto)} ${esc(cotizacion.activo ?? '')}</dd>
          <dt>In dirhams</dt><dd>${esc(money(cotizacion.monto_aed_fils))}</dd>
          <dt>Expires</dt><dd>${esc(dateTime(cotizacion.expira_en))} ${viva ? '' : '(expired)'}</dd>
        </dl>
        <button class="btn green" id="orden"${viva ? '' : ' disabled'}>Create the payment order</button>
        <p class="note">The order is a signed link with a deadline. Paying is the next step and the unit
          stays reserved meanwhile.</p>`;
      caja.querySelector('#orden')?.addEventListener('click', async (e) => {
        e.currentTarget.disabled = true;
        try {
          ord = { leg, data: await api.paymentOrder(i.id, cotizacion.concepto) };
          await repintar();
        } catch (err) { error('#siguiente', err); }
      });
      return;
    }
  }

  if (pedido || ['deposit_pending', 'deposit_detected', 'payment_pending', 'detected', 'confirmed'].includes(estado)) {
    caja.innerHTML = `
      <h3>Payment</h3>
      ${pedido ? `<dl class="kv">
        <dt>Reference</dt><dd>${esc(pedido.serialNo ?? '')}</dd>
        <dt>Amount</dt><dd>${esc(pedido.monto_aed_fils ? money(pedido.monto_aed_fils) : '')}</dd>
        <dt>Pay before</dt><dd>${esc(dateTime(pedido.deadline))}</dd>
      </dl>
      <p><a class="btn green" href="${esc(pedido.payment_url ?? '#')}" target="_blank" rel="noopener">Open the payment link</a></p>`
        : `<p class="muted">The order for this leg was issued in an earlier session. The state below is the
            one the platform records.</p>`}
      <p class="muted" style="font-size:.9rem">Once the digital assets are on chain the platform confirms it and the
        settlement in dirhams to the developer follows. From that moment there is no way back: the
        network does not reverse a payment, and the marketplace does not hide that.</p>
      <button class="btn ghost" id="refrescar">Refresh the state</button>`;
    caja.querySelector('#refrescar').addEventListener('click', repintar);
    return;
  }

  if (['aed_settlement_pending', 'settled', 'business_completion_approved'].includes(estado)) {
    caja.innerHTML = `
      <h3>Your receipt</h3>
      <p class="muted">It states the payment, the reference of the transaction and that it is not a title
        deed.</p>
      <button class="btn green" id="recibo">Issue the receipt</button>
      <div id="recibo-salida"></div>`;
    caja.querySelector('#recibo').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        const r = await api.receipt(i.id);
        caja.querySelector('#recibo-salida').innerHTML = `
          <p class="msg ok">Receipt <b>${esc(r.numero)}</b> · ${esc(r.sha256?.slice(0, 16) ?? '')}…</p>
          <p><a class="btn ghost" href="${esc(r.descarga_url)}" target="_blank" rel="noopener">Open the PDF</a></p>`;
      } catch (err) { error('#recibo-salida', err); }
    });
    return;
  }

  caja.innerHTML = `<h3>Nothing to do from here</h3>
    <p class="muted">State: <b>${esc(estado)}</b>. The platform will move this forward; the notices land in
      your alerts.</p>
    <button class="btn ghost" id="refrescar">Refresh</button>`;
  caja.querySelector('#refrescar').addEventListener('click', repintar);
}


/* ------------------------------------------------------------------ notifications */

async function viewNotifications() {
  if (exigirSesion()) return;
  view().innerHTML = `
    <div class="lab"><span>What changed</span><span class="dash"></span></div>
    <div class="row-between">
      <h1 style="font-size:clamp(1.5rem,3.4vw,2.2rem)">Notifications</h1>
      <button class="btn ghost sm" id="todas">Mark all as read</button>
    </div>
    <div id="lista">${loading(2)}</div>`;

  const cargar = async () => {
    try {
      const r = await api.notifications({ limite: 50 });
      store.save({ sin_leer: r.sin_leer ?? 0 });
      view().querySelector('#lista').innerHTML = r.notificaciones?.length
        ? `<div class="list">${r.notificaciones.map((n) => `
            <div class="item${n.leida ? '' : ' unread'}">
              <div class="row-between"><b>${esc(n.titulo)}</b><span class="when">${esc(dateTime(n.creada_en))}</span></div>
              <p style="margin:.2rem 0 0">${esc(n.cuerpo)}</p>
              ${n.leida ? '' : `<div><button class="btn ghost sm" data-leer="${esc(n.id)}">Mark as read</button></div>`}
            </div>`).join('')}</div>`
        : empty('No notifications', 'Everything the platform tells you about your purchases lands here.');
    } catch (err) {
      error('#lista', err);
    }
  };

  view().querySelector('#lista').addEventListener('click', async (e) => {
    const b = e.target.closest?.('[data-leer]');
    if (!b) return;
    try {
      await api.readNotification(b.dataset.leer);
      store.save({ sin_leer: Math.max(0, (store.sin_leer ?? 1) - 1) });
      await cargar();
    } catch (err) { toast(err.message, 'err'); }
  });
  view().querySelector('#todas').addEventListener('click', async () => {
    try {
      const r = await api.readAllNotifications();
      store.save({ sin_leer: 0 });
      toast(`${r.marcadas} marked as read.`, 'ok');
      await cargar();
    } catch (err) { toast(err.message, 'err'); }
  });

  await cargar();
}

function exigirSesion() {
  if (store.logged()) return false;
  view().innerHTML = `<div class="narrow">${empty('Sign in first',
    'This part of the marketplace belongs to your account.',
    '<p style="margin-top:12px"><a class="btn green" href="#/login">Sign in</a> or <a href="#/register">create an account</a></p>')}</div>`;
  return true;
}

// Las vistas de la cuenta se exportan: app.js las importa por nombre. Sin esto el módulo carga y el
// navegador aborta con «does not provide an export named viewAuth»: la página queda vacía.
export {
  viewAuth,
  viewFavorites,
  viewNotifications,
  viewPortfolio,
  viewPurchase,
  viewRegister,
};

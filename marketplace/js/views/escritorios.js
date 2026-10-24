/**
 * The two desks: the broker's and the content creator's.
 *
 * What this is, said plainly: the SCREENS, built and working, over the book of the demonstration.
 * The data below is the demo's own book and is labelled as such on screen. The backend routes that
 * would feed a real broker and a real creator are the next piece of work, they are written down in
 * DOC-0005, block by block, with the permission each one needs and where its data comes from. Until
 * they exist, this is a desk you can look at and walk through, not a desk that settles anything.
 */
import { date, esc, ico, logoHtml, money } from '../ui.js';
import { api } from '../api.js';
import { COLORES, donaDeEstados, lineaDeMeses } from './graficas.js';
import { go } from '../router.js';

const view = () => document.getElementById('view');

/** The demo's book for the broker: his clients, his holds, his codes and what he has earned. */
const LIBRO_BROKER = {
  yo: {
    nombre: 'Omar Haddad', organizacion: 'NDC Development LLC', codigo: 'BROKER-ALPHA',
    canal: 'Broker', desde: '2026-03-14', licencia: 'DED-100001',
    correo: 'omar@alpha-realty.ae', telefono: '+971 50 000 0000',
    // Lo que NDC comprobó de él, que es lo que le deja vender. La identificación la decide una
    // persona de NDC y aquí solo se lee: el escritorio no verifica nada.
    kyc: {
      estado: 'approved', verificado_por: 'NDC',
      revisado_en: '2026-03-12', vigencia: '2027-03-12',
      metodo: 'Identity document and selfie, checked by hand',
      documento: 'Emirates ID 784-****-****-1',
      notas: 'Name, document and phone matched. Licence checked against the trade register.',
    },
  },
  // El devengo de los últimos meses, para ver cómo se mueve (las cifras son las del libro de abajo).
  mensual: [
    ['May', 0], ['Jun', 0], ['Jul', 735000], ['Aug', 0], ['Sep', 4900000], ['Oct', 0],
  ],
  clientes: [
    { nombre: 'Client A', interes: 'Unit 1 · Downtown Dubai', estado: 'Looking', desde: '2026-09-28' },
    { nombre: 'Client B', interes: 'Unit 7 · Dubai Marina', estado: 'Reserved', desde: '2026-10-02' },
    { nombre: 'Client C', interes: 'Unit 4 · Palm Jumeirah', estado: 'Reservation expired', desde: '2026-09-11' },
  ],
  reservas: [
    { unidad: 'Unit 7 · Dubai Marina', comprador: 'Client B', estado: 'Held', caduca: '2026-10-16', importe: 220000000 },
  ],
  ventas: [
    { unidad: 'Unit 2 · Downtown Dubai', importe: 245000000, estado: 'Completion signed', cerrada: '2026-09-30' },
  ],
  devengo: [
    { concepto: 'Buyer side · 1 %', importe: 2450000, estado: 'Accrued' },
    { concepto: 'Agency side · 0.5 %', importe: 1225000, estado: 'Awaiting identification' },
    { concepto: 'Platform · 0.3 %', importe: 735000, estado: 'Accrued' },
  ],
};

/** The demo's book for the creator: his code, what it brought, and what is owed. */
const LIBRO_CREADOR = {
  yo: {
    nombre: 'Sara N.', codigo: 'CREATOR-SKY', canal: 'Content creator',
    desde: '2026-09-02', correo: 'sara@example.ae', telefono: '+971 55 000 0000',
    // Lo que le falta para poder cobrar: la cuenta la aprueba NDC y a la persona la identifica
    // NDC, a mano. Mientras eso no pase, no hay nada que soltar.
    kyc: {
      estado: 'pending', aprobado: false, identificado: false,
      revisado_en: null, vigencia: null,
      metodo: 'Identity document and selfie, checked by hand',
      documento: 'Not filed yet',
      notas: 'The account is waiting for NDC. Nothing is released before the account is approved and '
        + 'the person is identified.',
    },
    canales: ['Instagram', 'X'],
  },
  // Los leads que trajo su código, mes a mes.
  mensual: [['May', 0], ['Jun', 0], ['Jul', 1], ['Aug', 2], ['Sep', 4], ['Oct', 0]],
  traido: [
    { unidad: 'Unit 1 · Downtown Dubai', cuando: '2026-10-04', estado: 'Enquiry' },
    { unidad: 'Unit 2 · Downtown Dubai', cuando: '2026-09-28', estado: 'Enquiry' },
    { unidad: 'Unit 9 · Dubai Marina', cuando: '2026-09-21', estado: 'Viewing arranged' },
  ],
  ventas: [],
  devengo: [
    { concepto: 'Creator side · 1 %', importe: 0, estado: 'Nothing to release yet' },
  ],
};

/* ------------------------------------------------------------------ the broker's desk */

export async function viewBroker() {
  const b = LIBRO_BROKER;
  const aed = (fils) => money(fils);
  const kyc = b.yo.kyc;
  const devengado = b.devengo.reduce((t2, d) => t2 + d.importe, 0);
  const fila = (a, b2, c = '') => `<tr><td>${esc(a)}</td><td>${esc(b2)}</td>${c ? `<td class="num">${esc(c)}</td>` : ''}</tr>`;

  view().innerHTML = `
    <div class="wrap">
      <div class="desk-head">
        <div class="desk-quien">
          ${logoHtml(b.yo.organizacion, null, false, true)}
          <div>
          <span class="dev-nav-lab">Broker</span>
          <h1>${esc(b.yo.nombre)}</h1>
          <p class="muted">${esc(b.yo.organizacion)} · code <b>${esc(b.yo.codigo)}</b> · since ${esc(date(b.yo.desde))}</p>
          </div>
        </div>
        <div class="desk-nota">
          This is the demonstration book: the screen is real, the figures are the demo's.
          The routes that feed a live desk are the next piece of work (DOC-0005).
        </div>
      </div>

      <div class="desk-ficha">
        ${logoHtml(b.yo.organizacion, null, false, true)}
        <div class="desk-ficha-txt">
          <b>${esc(b.yo.nombre)}</b>
          <span>${esc(b.yo.canal)} · ${esc(b.yo.organizacion)} · licence ${esc(b.yo.licencia)}</span>
          <span>${esc(b.yo.correo)} · ${esc(b.yo.telefono)}</span>
        </div>
        <button type="button" class="sello-kyc${kyc.estado === 'approved' ? ' ok' : ''}" id="abrir-kyc"
          aria-haspopup="dialog">
          ${ico('sello', 15)}
          <span>${kyc.estado === 'approved' ? `Verified by ${esc(kyc.verificado_por)}` : 'Identity check pending'}</span>
          ${kyc.vigencia ? `<i>until ${esc(date(kyc.vigencia))}</i>` : ''}
        </button>
      </div>

      <div class="desk-kpis">
        <div class="desk-cuadro"><span>Clients</span><b>${b.clientes.length}</b></div>
        <div class="desk-cuadro"><span>Active holds</span><b>${b.reservas.length}</b></div>
        <div class="desk-cuadro"><span>Sales closed</span><b>${b.ventas.length}</b></div>
        <div class="desk-cuadro"><span>Accrued</span><b class="chico">${esc(aed(devengado))}</b></div>
      </div>

      <div class="desk-dos">
        <section class="desk-panel">
          <header>${ico('campana', 15)}<h2>What needs you</h2></header>
          <ul class="desk-aviso-lista">
            ${b.reservas.map((r) => `<li><b>${esc(r.unidad)}</b>
              <span>Held for ${esc(r.comprador)} until ${esc(date(r.caduca))}. One hold per unit, and it
              runs out on its own: after that the unit goes back to the market.</span></li>`).join('')}
            ${b.devengo.filter((d) => d.estado !== 'Accrued').map((d) => `<li><b>${esc(d.concepto)}</b>
              <span>${esc(d.estado)}: nothing is released before that person's identity is checked.</span></li>`).join('')}
            <li><b>Your code is ${esc(b.yo.codigo)}</b>
              <span>It is what says who brought the buyer. It is not a link, it cannot be changed, and it
              does not decide the fee: the fee table does.</span></li>
          </ul>
        </section>

        <section class="desk-panel">
          <header>${ico('trato', 15)}<h2>What you have earned</h2></header>
          <div class="desk-grafica">
            <canvas id="desk-grafica-devengo" height="150" aria-label="Accrued by month"></canvas>
            <p class="desk-grafica-nota">What has accrued each month, in dirhams. Fees are frozen only
              when the money has reached the developer.</p>
          </div>
        </section>
      </div>

      <div class="desk-dos">
        <section class="desk-panel">
          <header>${ico('grupo', 15)}<h2>Your clients, by stage</h2></header>
          <div class="desk-grafica">
            <canvas id="desk-grafica-clientes" height="150" aria-label="Clients by stage"></canvas>
            <ul class="desk-leyenda">
              <li><i style="background:#16A34A"></i>Reserved</li>
              <li><i style="background:#0969da"></i>Looking</li>
              <li><i style="background:#cbd0dd"></i>Reservation expired</li>
            </ul>
          </div>
        </section>

        <section class="desk-panel">
          <header>${ico('banco', 15)}<h2>The fee, and what is yours</h2></header>
          <table class="tabla"><thead><tr><th>Concept</th><th>State</th><th class="num">Amount</th></tr></thead><tbody>
            ${b.devengo.map((d) => `<tr><td>${esc(d.concepto)}</td><td>${esc(d.estado)}</td><td class="num">${esc(aed(d.importe))}</td></tr>`).join('')}
            <tr><td><b>Total accrued</b></td><td></td><td class="num"><b>${esc(aed(devengado))}</b></td></tr>
          </tbody></table>
          <p class="desk-pie-nota">1 % on the buyer side, 0.5 % on the agency side and 0.3 % for crossing
            the river. The platform pays; the fee table decides, not this screen.</p>
        </section>
      </div>

      <section class="desk-panel desk-tablas">
        <header>${ico('grupo', 15)}<h2>My clients</h2></header>
        <p class="desk-panel-nota">Only mine. A broker never sees another broker's book.</p>
        <table class="tabla t3"><thead><tr><th>Client</th><th>Looking at</th><th>State</th></tr></thead><tbody>
          ${b.clientes.map((c) => fila(c.nombre, c.interes, c.estado)).join('')}
        </tbody></table>
      </section>

      <section class="desk-panel desk-tablas">
        <header>${ico('fecha', 15)}<h2>Holds</h2></header>
        <p class="desk-panel-nota">One active reservation per unit, and it runs out on its own (BR-003).</p>
        <table class="tabla t4"><thead><tr><th>Unit</th><th>Buyer</th><th>State</th><th class="num">Expires</th></tr></thead><tbody>
          ${b.reservas.map((r) => `<tr><td>${esc(r.unidad)}</td><td>${esc(r.comprador)}</td><td>${esc(r.estado)}</td><td class="num">${esc(date(r.caduca))}</td></tr>`).join('')}
        </tbody></table>
      </section>

      <section class="desk-panel desk-tablas">
        <header>${ico('trato', 15)}<h2>Sales</h2></header>
        <table class="tabla t4"><thead><tr><th>Unit</th><th>State</th><th class="num">Amount</th><th class="num">Closed</th></tr></thead><tbody>
          ${b.ventas.map((v) => `<tr><td>${esc(v.unidad)}</td><td>${esc(v.estado)}</td><td class="num">${esc(aed(v.importe))}</td><td class="num">${esc(date(v.cerrada))}</td></tr>`).join('')}
        </tbody></table>
      </section>

      <section class="desk-panel">
        <header>${ico('permiso', 15)}<h2>What a broker cannot do</h2></header>
        <ul class="desk-limites">
          <li>Publish a listing, or change the contract price.</li>
          <li>See the buyer's identity papers.</li>
          <li>See another broker's clients, codes or sales.</li>
          <li>Show a draft, a suspended listing, or a price that is not the published one.</li>
          <li>Decide an identity check: that is NDC's, in person, and this desk only reads the outcome.</li>
        </ul>
      </section>

      <div class="desk-volver"><button class="btn ghost" type="button" id="desk-atras">Back to the catalogue</button></div>
    </div>`;

  view().querySelector('#desk-atras').addEventListener('click', () => go('/search'));
  view().querySelector('#abrir-kyc').addEventListener('click', () => abrirFichaVerificacion(b.yo, 'broker'));

  // Los dos gráficos del escritorio, con la misma pieza que el resto de la casa.
  const linea = view().querySelector('#desk-grafica-devengo');
  // La serie viaja en FILS como el resto de la casa: se pinta en dirhams, o el eje dice millones
  // cuando son miles (el mismo error de unidades que ya apareció en el libro por proyecto).
  if (linea) {
    lineaDeMeses(linea, b.mensual.map(([mes, v]) => [mes, v / 100]),
      { formato: (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n))) });
  }
  const dona = view().querySelector('#desk-grafica-clientes');
  if (dona) {
    donaDeEstados(dona, [
      ['Reserved', b.clientes.filter((c) => c.estado === 'Reserved').length, COLORES.publicado],
      ['Looking', b.clientes.filter((c) => c.estado === 'Looking').length, COLORES.reservado],
      ['Reservation expired', b.clientes.filter((c) => /expired/i.test(c.estado)).length, COLORES.sinAnuncio],
    ], { etiqueta: 'CLIENTS' });
  }
}

/* ------------------------------------------------------------------ the creator's desk */

export async function viewCreador() {
  // Con sesión, el escritorio lee el dinero real del creador. Sin sesión, queda el libro de
  // demostración, marcado como tal: la pantalla se puede mirar sin inventar cifras propias.
  try {
    const vivo = await api.creadorMe();
    if (vivo && vivo.su_parte) return viewCreadorVivo(vivo);
  } catch { /* sin sesión o sin cuenta de creador: se cae al libro de demostración */ }
  const c = LIBRO_CREADOR;
  const aed = (fils) => money(fils);
  const k = c.yo.kyc;
  const leads = c.traido.length;
  const devengado = c.devengo.reduce((t2, d) => t2 + d.importe, 0);
  const puedeCobrar = !!(k.aprobado && k.identificado);
  const porEstado = (re) => c.traido.filter((l) => re.test(l.estado)).length;

  view().innerHTML = `
    <div class="wrap">
      <div class="desk-head">
        <div class="desk-quien">
          ${logoHtml(c.yo.nombre, null, false, true)}
          <div>
          <span class="dev-nav-lab">Content creator</span>
          <h1>${esc(c.yo.nombre)}</h1>
          <p class="muted">code <b>${esc(c.yo.codigo)}</b> · since ${esc(date(c.yo.desde))}</p>
          </div>
        </div>
        <div class="desk-nota">This is the demonstration book: the screen is real, the figures are the demo's.</div>
      </div>

      <div class="desk-ficha">
        ${logoHtml(c.yo.nombre, null, false, true)}
        <div class="desk-ficha-txt">
          <b>${esc(c.yo.nombre)}</b>
          <span>${esc(c.yo.canal)} · ${c.yo.canales ? esc(c.yo.canales.join(' · ')) : ''}</span>
          <span>${esc(c.yo.correo)} · ${esc(c.yo.telefono)}</span>
        </div>
        <button type="button" class="sello-kyc${puedeCobrar ? ' ok' : ''}" id="abrir-kyc" aria-haspopup="dialog">
          ${ico('sello', 15)}
          <span>${k.aprobado ? `Approved by ${esc(k.verificado_por ?? 'NDC')}` : 'Waiting for NDC'}</span>
          <i>${k.identificado ? 'identified' : 'not identified'}</i>
        </button>
      </div>

      <div class="desk-aviso">
        <b>Before anything is paid:</b> the account has to be approved by NDC, and the person identified.
        ${puedeCobrar ? '' : 'Today this account is <b>not approved</b>, so nothing can be released.'}
      </div>

      <div class="desk-kpis">
        <div class="desk-cuadro"><span>Brought by my code</span><b>${leads}</b></div>
        <div class="desk-cuadro"><span>Viewings arranged</span><b>${porEstado(/Viewing/i)}</b></div>
        <div class="desk-cuadro"><span>Sales</span><b>${c.ventas.length}</b></div>
        <div class="desk-cuadro"><span>Accrued</span><b class="chico">${esc(aed(devengado))}</b></div>
      </div>

      <div class="desk-dos">
        <section class="desk-panel">
          <header>${ico('campana', 15)}<h2>What needs you</h2></header>
          <ul class="desk-aviso-lista">
            ${k.aprobado ? '' : `<li><b>The account is not approved</b>
              <span>NDC approves the account by hand. Until then no sale can be attributed to this code,
              and nothing is released.</span></li>`}
            ${k.identificado ? '' : `<li><b>The person is not identified</b>
              <span>Before any money moves, the person behind the code is identified. It is done by hand,
              and this desk only reads the outcome.</span></li>`}
            <li><b>You are not a broker</b>
              <span>What you do is promote and refer leads. You do not carry out the regulated act, you do
              not take the buyer's papers, and you do not close anything.</span></li>
            <li><b>Your fee is charged when the sale closes</b>
              <span>Referral fee at closing. A lead that never closes pays nothing, and no figure is shown
              here: the split comes from the ecosystem contract, not from this screen.</span></li>
          </ul>
        </section>

        <section class="desk-panel">
          <header>${ico('trato', 15)}<h2>What your code has brought</h2></header>
          <div class="desk-grafica">
            <canvas id="desk-grafica-leads" height="150" aria-label="Leads by month"></canvas>
            <p class="desk-grafica-nota">Leads a month, by month. A lead is not a sale: it is only the door
              where the buyer came in.</p>
          </div>
        </section>
      </div>

      <div class="desk-dos">
        <section class="desk-panel">
          <header>${ico('grupo', 15)}<h2>Where each lead stands</h2></header>
          <div class="desk-grafica">
            <canvas id="desk-grafica-leads-estado" height="150" aria-label="Leads by state"></canvas>
            <ul class="desk-leyenda">
              <li><i style="background:#16A34A"></i>Viewing arranged</li>
              <li><i style="background:#0969da"></i>Enquiry</li>
            </ul>
          </div>
        </section>

        <section class="desk-panel">
          <header>${ico('banco', 15)}<h2>The fee, and when it is charged</h2></header>
          <table class="tabla"><thead><tr><th>Concept</th><th>State</th><th class="num">Amount</th></tr></thead><tbody>
            ${c.devengo.map((d) => `<tr><td>${esc(d.concepto)}</td><td>${esc(d.estado)}</td><td class="num">${esc(aed(d.importe))}</td></tr>`).join('')}
            <tr><td><b>Total accrued</b></td><td></td><td class="num"><b>${esc(aed(devengado))}</b></td></tr>
          </tbody></table>
          <p class="desk-pie-nota">The referral fee is charged at closing and its share comes from the
            ecosystem contract. The platform pays; this screen does not decide a number.</p>
        </section>
      </div>

      <section class="desk-panel desk-tablas">
        <header>${ico('grupo', 15)}<h2>What came in with my code</h2></header>
        <p class="desk-panel-nota">Only mine. A creator never sees another creator's leads.</p>
        <table class="tabla t3"><thead><tr><th>Unit</th><th>When</th><th>State</th></tr></thead><tbody>
          ${c.traido.map((l) => `<tr><td>${esc(l.unidad)}</td><td>${esc(date(l.cuando))}</td><td>${esc(l.estado)}</td></tr>`).join('')}
        </tbody></table>
      </section>

      <section class="desk-panel desk-tablas">
        <header>${ico('trato', 15)}<h2>Sales</h2></header>
        ${c.ventas.length ? `<table class="tabla t3"><thead><tr><th>Unit</th><th>State</th><th class="num">Amount</th></tr></thead><tbody>
          ${c.ventas.map((v) => `<tr><td>${esc(v.unidad)}</td><td>${esc(v.estado)}</td><td class="num">${esc(aed(v.importe))}</td></tr>`).join('')}
        </tbody></table>` : '<p class="desk-panel-nota">No sale from this code yet. A lead that never closes pays nothing.</p>'}
      </section>

      <section class="desk-panel">
        <header>${ico('permiso', 15)}<h2>What a creator cannot do</h2></header>
        <ul class="desk-limites">
          <li>Act as a broker: the regulated act is NDC's, and it is done under its licence.</li>
          <li>Take the buyer's identity papers, or ask for them.</li>
          <li>Promise a price, a discount or a closing date.</li>
          <li>Publish a listing, or use a draft or a suspended one.</li>
          <li>Choose the fee, or change what the ecosystem contract says.</li>
          <li>See another creator's leads, codes or sales.</li>
        </ul>
      </section>

      <div class="desk-volver"><button class="btn ghost" type="button" id="desk-atras">Back to the catalogue</button></div>
    </div>`;

  view().querySelector('#desk-atras').addEventListener('click', () => go('/search'));
  view().querySelector('#abrir-kyc').addEventListener('click', () => abrirFichaVerificacion(c.yo, 'creator'));

  const linea = view().querySelector('#desk-grafica-leads');
  if (linea) {
    lineaDeMeses(linea, c.mensual.map(([mes, v]) => [mes, v]),
      { formato: (n) => String(Math.round(n)) });
  }
  const dona = view().querySelector('#desk-grafica-leads-estado');
  if (dona) {
    donaDeEstados(dona, [
      ['Viewing arranged', porEstado(/Viewing/i), COLORES.publicado],
      ['Enquiry', porEstado(/Enquiry/i), COLORES.reservado],
    ], { etiqueta: 'LEADS' });
  }
}

/* ------------------------------------------------------------------ la ficha de verificación
 * La misma ventana para el bróker y para el creador: quién es, quién lo comprobó, cuándo, hasta
 * cuándo vale y qué documento hay, con el aviso de que aquí no se decide nada. La decisión es de NDC,
 * hecha por una persona (CD-008), y el número del documento va enmascarado.
 */
function abrirFichaVerificacion(yo, tipo = 'broker') {
  const k = yo.kyc ?? {};
  const iniciales = String(yo.nombre ?? '').split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();
  const filas = tipo === 'creator'
    ? [
      ['Account', k.aprobado ? 'Approved' : 'Waiting for NDC', k.aprobado],
      ['Person', k.identificado ? 'Identified' : 'Not identified yet', k.identificado],
      ['Decided by', 'NDC, by hand', false],
      ['Checked on', k.revisado_en ? date(k.revisado_en) : 'Not yet', false],
      ['Valid until', k.vigencia ? date(k.vigencia) : 'Not yet', false],
      ['Method', k.metodo ?? 'Identity document and selfie, checked by hand', false],
      ['Document', k.documento ?? 'Not filed yet', false],
      ['Channels', (yo.canales ?? []).join(' · ') || 'Not declared', false],
      ['Contact', `${yo.correo ?? ''} · ${yo.telefono ?? ''}`, false],
    ]
    : [
      ['State', k.estado === 'approved' ? 'Approved' : 'Pending', k.estado === 'approved'],
      ['Decided by', `${k.verificado_por ?? 'NDC'}, by hand`, false],
      ['Checked on', k.revisado_en ? date(k.revisado_en) : 'Not yet', false],
      ['Valid until', k.vigencia ? date(k.vigencia) : 'Not yet', false],
      ['Method', k.metodo ?? '', false],
      ['Document', k.documento ?? '', false],
      ['Contact', `${yo.correo ?? ''} · ${yo.telefono ?? ''}`, false],
    ];

  document.querySelector('.kyc-modal')?.remove();
  const caja = document.createElement('div');
  caja.className = 'kyc-modal';
  caja.innerHTML = `
    <div class="kyc-panel" role="dialog" aria-modal="true" aria-label="Identity and account check">
      <div class="kyc-head">
        <b>${tipo === 'creator' ? 'Account and identity' : 'Identity check'}</b>
        <button type="button" class="kyc-x" aria-label="Close">✕</button>
      </div>
      <div class="kyc-cuerpo">
        <div class="kyc-foto" aria-hidden="true">
          <span class="kyc-iniciales">${esc(iniciales)}</span>
          <span class="kyc-foto-pie">Photo on file, from the check</span>
        </div>
        <div class="kyc-datos">
          <b class="kyc-nombre">${esc(yo.nombre)}</b>
          <span class="kyc-sub">${esc(yo.canal ?? '')} · ${esc(yo.organizacion ?? '')} ${esc(yo.codigo ?? '')}</span>
          <dl class="kyc-lista">
            ${filas.map(([etiqueta, valor, bueno]) => `<dt>${esc(etiqueta)}</dt><dd${bueno ? ' class="ok"' : ''}>${esc(valor)}</dd>`).join('')}
          </dl>
          <p class="kyc-nota">${esc(k.notas ?? '')}</p>
          <p class="kyc-aviso">This desk only reads it. The decision is NDC's, made by a person, and
            nothing here approves or releases anything.</p>
        </div>
      </div>
    </div>`;
  document.body.appendChild(caja);
  document.body.classList.add('sin-scroll');
  const cerrar = () => { caja.remove(); document.body.classList.remove('sin-scroll'); document.removeEventListener('keydown', tecla); };
  function tecla(e) { if (e.key === 'Escape') cerrar(); }
  document.addEventListener('keydown', tecla);
  caja.querySelector('.kyc-x').addEventListener('click', cerrar);
  caja.addEventListener('click', (e) => { if (e.target === caja) cerrar(); });
  caja.querySelector('.kyc-x').focus();
}


/**
 * El escritorio del creador con datos vivos: su código, su reparto, lo vendido y lo que le falta para
 * cobrar. Nada de esto lo decide la pantalla: lee lo que el motor congeló en cada venta.
 */
function viewCreadorVivo(d) {
  const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '');
  const ESTADO = { devengada: 'Accrued', pagadera: 'Pending payment', pagada: 'Paid', revertida: 'Reversed' };
  const TONO = { devengada: 'neu', pagadera: 'amb', pagada: 'ok', revertida: 'bad' };
  const KYC = { aprobado: 'approved', pendiente: 'pending', rechazado: 'rejected', not_started: 'not started' };

  const nombre = d.beneficiario?.nombre ?? 'Content creator';
  const kyc = d.beneficiario?.kyc_estado ?? null;
  const aprobado = kyc === 'aprobado';
  const esPartner = d.tipo === 'team_partner';
  const esLider = d.tipo === 'lider';
  const conEquipo = esPartner || esLider;
  const codigos = d.codigos ?? [];
  const ventas = d.ventas ?? [];
  const p = d.su_parte ?? {};
  const red = d.red;
  const tramos = (d.reparto ?? []).flatMap((r) => r.tramos.map((x) => ({ ...x, codigo: r.codigo })));
  const propio = tramos.find((x) => x.rol === 'creador');
  const ajeno = tramos.find((x) => x.rol === 'introductor');
  const total = Number(p.devengado_fils ?? 0) + Number(p.pendiente_fils ?? 0) + Number(p.liberado_fils ?? 0);
  const codigo = codigos[0]?.codigo ?? '';
  const link = codigo ? `https://blockestate.ae/marketplace/?ref=${encodeURIComponent(codigo)}` : '';
  const pct = (pb) => (pb / 100).toFixed(2) + ' %';
  const rol = esLider ? 'Team leader' : esPartner ? 'Team partner' : 'Content creator';

  const estado = { tab: 'overview', filtro: 'todos' };

  const copiar = async (texto, boton) => {
    const etiqueta = boton.dataset.lbl || boton.textContent;
    let ok = false;
    try {
      await navigator.clipboard.writeText(texto);
      ok = true;
    } catch {
      // Sin permiso de portapapeles (navegador viejo o contexto no seguro): el método de siempre.
      const area = document.createElement('textarea');
      area.value = texto;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      area.remove();
    }
    boton.textContent = ok ? 'Copied' : 'Copy it by hand';
    setTimeout(() => { boton.textContent = etiqueta; }, 1600);
  };

  const ventasFiltradas = () => (estado.filtro === 'todos'
    ? ventas
    : ventas.filter((v) => v.estado === estado.filtro));

  const csv = () => {
    const filas = [['unit', 'reference', 'sale_aed', 'your_part_aed', 'pb', 'state', 'closed']];
    for (const v of ventas) {
      filas.push([v.unidad ?? '', v.referencia ?? '', v.base_aed ?? '', v.su_parte_aed ?? '', String(v.pb ?? ''), v.estado ?? '', String(v.fecha ?? '')]);
    }
    return filas.map((f) => f.map((c) => String(c).replace(/"/g, '""')).map((c) => `"${c}"`).join(',')).join('\n');
  };

  const descargar = () => {
    const blob = new Blob([csv()], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `blockestate-${codigo || 'creator'}-sales.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const balance = () => `
    <div class="desk-saldo">
      <div class="desk-saldo-fila">
        <div class="desk-bloque">
          <span>Available to withdraw</span>
          <b>${esc(p.pendiente_aed ?? 'AED 0.00')}</b>
          <i>statement issued, waiting for NDC to pay</i>
        </div>
        <div class="desk-bloque">
          <span>Pending</span>
          <b>${esc(p.devengado_aed ?? 'AED 0.00')}</b>
          <i>sale closed, not yet in a statement</i>
        </div>
        <div class="desk-bloque">
          <span>Paid to date</span>
          <b>${esc(p.liberado_aed ?? 'AED 0.00')}</b>
          <i>with a payment reference</i>
        </div>
        <div class="desk-bloque total">
          <span>Lifetime</span>
          <b>${esc(money(total))}</b>
          <i>${ventas.length} sale${ventas.length === 1 ? '' : 's'} ${conEquipo ? 'where you earned' : 'through ' + esc(codigo || 'your code')}</i>
        </div>
      </div>
      <p class="desk-pie">NDC issues the statement by hand and pays it. Nothing is released before the account is approved and the person identified.${aprobado ? '' : ' <b>This account is not approved yet.</b>'}</p>
    </div>`;

  const barras = () => (!(d.historico ?? []).some((x) => x.fils > 0) ? '' : `
    <section class="desk-panel">
      <header>${ico('pulso', 15)}<h2>Last six months</h2><span class="muted">what each month has produced</span></header>
      <div class="desk-barras">
        ${(() => {
          const max = Math.max(...d.historico.map((x) => x.fils), 1);
          return d.historico.map((x) => `<div class="desk-barra">
            <span class="val">${x.fils ? esc(money(x.fils)) : ''}</span>
            <i style="height:${Math.max(3, Math.round((x.fils / max) * 90))}%" class="${x.fils ? 'on' : ''}"></i>
            <span class="mes">${new Date(x.mes + '-01T00:00:00Z').toLocaleString('en', { month: 'short' })}</span>
          </div>`).join('');
        })()}
      </div>
    </section>`);

  const resumen = () => `
    ${balance()}
    ${d.bono ? `
    <div class="desk-saldo" style="margin-bottom:14px">
      <div class="desk-saldo-fila" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        <div class="desk-bloque">
          <span>Leader bonus · 0.10 %</span>
          <b>${esc(money(d.bono.fils))}</b>
          <i>paid by BlockEstate on top of the channel, not taken from your team</i>
        </div>
        <div class="desk-bloque total">
          <span>Until</span>
          <b>${esc(d.bono.hasta ?? '—')}</b>
          <i>${d.traido_por ? 'brought by ' + esc(d.traido_por) + ': they took a one-off bounty, never a cut of your team' : 'you came alone'}</i>
        </div>
      </div>
    </div>` : ''}
    ${barras()}
    <div class="desk-dos">
      <section class="desk-panel">
        <header>${ico('permiso', 15)}<h2>How you are paid</h2></header>
        <ul class="desk-aviso-lista">
          ${conEquipo
            ? `<li><b>1.00 % on your own code</b><span>every sale that quotes ${esc(codigo)}.</span></li>
               <li><b>0.20 % on each creator you brought</b><span>taken from their 1.00 %, not added on top.</span></li>
               ${esLider ? '<li><b>Plus 0.10 % for twelve months</b><span>paid by BlockEstate on your own code, never from your team.</span></li>' : ''}`
            : `<li><b>You keep ${propio ? pct(propio.pb) : '1.00 %'}</b><span>of every sale through ${esc(codigo)}. The channel pays 1.00 % in total.</span></li>
               ${ajeno ? `<li><b>${pct(ajeno.pb)} goes to ${d.traido_por ? esc(d.traido_por) : 'who brought you'}</b><span>it is theirs, not deducted from you.</span></li>` : '<li><b>You came alone</b><span>the whole 1.00 % is yours.</span></li>'}`}
          <li><b>Paid by BlockEstate</b><span>out of the influencer channel, once NDC approves the statement.</span></li>
        </ul>
      </section>

      <section class="desk-panel">
        <header>${ico('campana', 15)}<h2>What needs you</h2></header>
        <ul class="desk-aviso-lista">
          ${(d.falta_para_cobrar ?? []).map((f) => `<li><b>Missing</b><span>${esc(f)}</span></li>`).join('')
            || '<li><b>Nothing</b><span>Your account is ready and your sales are counted.</span></li>'}
          <li><b>Statement</b><span>Issued by NDC by hand. You can ask about it at any time.</span></li>
        </ul>
        <div class="desk-acciones">
          <a class="btn-ghost" href="mailto:info@blockestate.ae?subject=${encodeURIComponent('Statement · ' + (codigo || nombre))}">Ask NDC about a statement</a>
        </div>
      </section>
    </div>`;

  const ventasHTML = () => `
    <section class="desk-panel">
      <header>${ico('sello', 15)}<h2>${conEquipo ? 'Where your money comes from' : 'Your sales'}</h2>
        <span class="muted">${ventas.length} sale${ventas.length === 1 ? '' : 's'}</span></header>
      <div class="desk-filtros">
        ${[['todos', 'All'], ['devengada', 'Accrued'], ['pagadera', 'Pending payment'], ['pagada', 'Paid']]
          .map(([k, etiqueta]) => `<button type="button" class="chip${estado.filtro === k ? ' on' : ''}" data-filtro="${k}">${etiqueta}</button>`).join('')}
        <button type="button" class="chip" id="bajar-csv" style="margin-left:auto">Download CSV</button>
      </div>
      ${ventasFiltradas().length ? `<div class="tabla-wrap"><table class="tabla">
        <thead><tr><th>Unit</th><th>${conEquipo ? 'Source' : 'Sale'}</th><th>Your part</th><th>State</th><th>Closed</th></tr></thead>
        <tbody>${ventasFiltradas().map((v) => `<tr>
          <td>${esc(cap(v.unidad))}${v.referencia ? ' · <span class="muted">' + esc(v.referencia) + '</span>' : ''}</td>
          <td>${conEquipo
            ? (v.codigo_venta && v.codigo_venta !== codigo
              ? '<span class="pastilla neu">' + (esLider ? 'Team' : 'Override') + '</span> <span class="mono">' + esc(v.codigo_venta) + '</span>'
              : '<span class="pastilla ok">Your code</span>')
            : esc(v.base_aed)}</td>
          <td><b>${esc(v.su_parte_aed)}</b> <span class="muted">${pct(v.pb)}</span></td>
          <td><span class="pastilla ${TONO[v.estado] ?? 'neu'}">${esc(ESTADO[v.estado] ?? v.estado)}</span></td>
          <td>${esc(date(v.fecha))}</td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<p class="muted" style="padding:14px 16px">No sale in this state.</p>'}
    </section>`;

  const equipoHTML = () => (!conEquipo ? '' : `
    <section class="desk-panel">
      <header>${ico('permiso', 15)}<h2>Your team</h2><span class="muted">the creators you brought, and what they earn you</span></header>
      <div class="desk-red">
        <div><span>Creators</span><b>${red?.creadores ?? 0}</b></div>
        <div><span>Sales in your team</span><b>${red?.ventas ?? 0}</b></div>
        <div><span>${esLider ? 'Your team share' : 'Your override'}</span><b>${esc(red?.tu_override_aed ?? 'AED 0.00')}</b><i>0.20 % of each of their sales</i></div>
      </div>
      ${(red?.equipo ?? []).length ? `<div class="tabla-wrap"><table class="tabla">
        <thead><tr><th>Creator</th><th>Code</th><th>KYC</th><th>Sales</th><th>Their commission</th><th>You earned</th></tr></thead>
        <tbody>${red.equipo.map((c) => `<tr>
          <td><b>${esc(c.nombre)}</b></td>
          <td><span class="mono">${esc(c.codigo)}</span></td>
          <td><span class="pastilla ${c.kyc_estado === 'aprobado' ? 'ok' : 'amb'}">${esc(KYC[c.kyc_estado] ?? 'pending')}</span></td>
          <td>${c.ventas}</td>
          <td>${esc(c.vendido_aed)}</td>
          <td><b>${esc(c.tu_override_aed)}</b></td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<p class="muted" style="padding:14px 16px">You have not brought any creator yet. Give them your code when they sign up.</p>'}
      <p class="desk-pie">This 0.20 % sits inside the 1.00 % the channel pays: it is never charged on top of the creator.</p>
    </section>`);

  const pagosHTML = () => `
    <div class="desk-dos">
      <section class="desk-panel">
        <header>${ico('sello', 15)}<h2>How the money reaches you</h2></header>
        <ul class="desk-aviso-lista">
          <li><b>1 · Sale closes</b><span>the split is frozen, and your part shows as Pending.</span></li>
          <li><b>2 · NDC issues the statement</b><span>by hand, at the close of the month. It becomes Available.</span></li>
          <li><b>3 · Payment</b><span>a bank transfer with a reference. It shows as Paid here.</span></li>
          <li><b>Identification</b><span>nothing moves before your KYC is approved. ${aprobado ? 'Yours is.' : 'Yours is not yet.'}</span></li>
        </ul>
        <div class="desk-acciones">
          <a class="btn-ghost" href="mailto:info@blockestate.ae?subject=${encodeURIComponent('Payment details · ' + (codigo || nombre))}">Send payment details to NDC</a>
          <button type="button" class="btn-ghost" id="bajar-csv-2">Download sales CSV</button>
        </div>
      </section>
      <section class="desk-panel">
        <header>${ico('campana', 15)}<h2>Statements</h2></header>
        <p class="muted" style="padding:14px 16px">No statement yet. When NDC issues one it will appear here, with its amount and its reference.</p>
      </section>
    </div>`;

  const contenido = () => (estado.tab === 'ventas' ? ventasHTML()
    : estado.tab === 'equipo' ? equipoHTML()
      : estado.tab === 'pagos' ? pagosHTML()
        : resumen());

  const render = () => {
    view().innerHTML = `
      <div class="wrap">
        <div class="desk-head">
          <div class="desk-quien">
            ${logoHtml(nombre, null, false, true)}
            <div>
              <span class="dev-nav-lab">${rol}</span>
              <h1>${esc(nombre)}</h1>
              <p class="muted">${codigo ? 'your code <b>' + esc(codigo) + '</b>' : 'no code yet'}</p>
            </div>
          </div>
          <div class="desk-sellos">
            <span class="pastilla ${aprobado ? 'ok' : 'amb'}">${aprobado ? 'KYC approved' : 'KYC ' + esc(kyc ?? 'pending')}</span>
            ${esLider ? '<span class="pastilla neu">Same rank</span>' : esPartner ? '<span class="pastilla neu">Bringing creators</span>' : ''}
            ${codigo ? '<button type="button" class="btn-ghost" id="copiar-code" data-lbl="Copy code">Copy code</button>' : ''}
            ${link ? '<button type="button" class="btn-primario" id="copiar-link" data-lbl="Copy referral link">Copy referral link</button>' : ''}
          </div>
        </div>

        <nav class="desk-tabs" role="tablist">
          ${[['overview', 'Overview'], ['ventas', 'Sales'], ['equipo', 'Team'], ['pagos', 'Payouts']]
            .filter(([k]) => k !== 'equipo' || conEquipo)
            .map(([k, etiqueta]) => `<button type="button" class="desk-tab${estado.tab === k ? ' on' : ''}" data-tab="${k}" role="tab">${etiqueta}</button>`).join('')}
        </nav>

        ${contenido()}

        <p class="desk-reglas">Cannot: ${(d.lo_que_no_puede ?? []).map((x) => esc(x)).join(' · ')}.</p>
      </div>`;

    // pestañas
    view().querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      estado.tab = b.dataset.tab;
      render();
    }));
    // copiar
    const cl = view().querySelector('#copiar-link');
    if (cl) cl.addEventListener('click', () => copiar(link, cl));
    const cc = view().querySelector('#copiar-code');
    if (cc) cc.addEventListener('click', () => copiar(codigo, cc));
    // filtros y descarga
    view().querySelectorAll('[data-filtro]').forEach((b) => b.addEventListener('click', () => {
      estado.filtro = b.dataset.filtro;
      render();
    }));
    ['#bajar-csv', '#bajar-csv-2'].forEach((sel) => {
      const b = view().querySelector(sel);
      if (b) b.addEventListener('click', descargar);
    });
  };

  render();
}

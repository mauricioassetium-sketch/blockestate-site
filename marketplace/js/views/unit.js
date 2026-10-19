/** The property page and the project page. */
import { api, urlDeMedio } from '../api.js';
import { cifraCripto } from '../cambio.js';
import { go } from '../router.js';
import { store } from '../store.js';
import { amenLabel, areaTxt, date, empty, error, esc, ico, money, obraLabel, photoInner, selloVerysset, specs, tipoLabel } from '../ui.js';
import { abrirGaleria } from './galeria.js';

const view = () => document.getElementById('view');

/* --------------------------------------------------------------- the connect block */

/** The channels a referral code can open. A code carries one door per channel, or none of them. */
const ETIQUETA_CANAL = { telegram: 'Telegram', whatsapp: 'WhatsApp', correo: 'email' };

const AVISO_CODIGO = 'If a broker, a content creator or the developer gave you a code, type it: it '
  + 'says who brought you, and it is who we put you in touch with.';

/** The two legal values of a unit, in the words the listing uses. */
const TENENCIA_LABEL = { freehold: 'Freehold', leasehold: 'Leasehold' };
const USO_LABEL = { residential: 'Residential', commercial: 'Commercial', mixed: 'Mixed' };

/** The catalogue state of a project, in the word a listing uses. It is the platform's own state. */
const ESTADO_LABEL = { published: 'Active', draft: 'Not published', archived: 'Archived' };

// The three glyphs, in the shape of the reference: a rounded button, the mark and its name.
const ICONO = {
  telegram: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M21.6 3.4 2.9 10.6c-.9.35-.87 1.3.06 1.55l4.6 1.3 1.75 5.5c.2.6.9.75 1.35.3l2.4-2.35 4.55 3.35c.5.37 1.2.1 1.35-.5l3-15.2c.15-.8-.65-1.42-1.36-1.15M9.1 13.35l7.4-4.9c.2-.13.4.13.24.27l-6.1 5.6-.24 2.5z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12.04 2C6.6 2 2.2 6.4 2.2 11.85c0 1.9.53 3.65 1.46 5.15L2 22.4l5.6-1.6a9.9 9.9 0 0 0 4.44 1.05c5.44 0 9.85-4.4 9.85-9.85C21.9 6.4 17.5 2 12.04 2m0 17.9c-1.6 0-3.1-.47-4.35-1.28l-.31-.2-3.2.92.9-3.1-.21-.33a8 8 0 0 1-1.25-4.28c0-4.42 3.6-8.02 8.03-8.02 4.42 0 8.02 3.6 8.02 8.02 0 4.43-3.6 8.03-8.03 8.03m4.5-6.1c-.24-.12-1.44-.7-1.66-.79-.22-.08-.39-.12-.55.13-.16.24-.63.79-.77.95-.14.16-.28.18-.53.06-.24-.12-1.02-.38-1.95-1.2-.72-.64-1.2-1.44-1.34-1.68-.14-.25-.01-.38.11-.5.11-.1.24-.29.36-.43.12-.14.16-.24.24-.4.08-.17.04-.3-.02-.43-.06-.12-.5-1.2-.68-1.63-.18-.44-.36-.38-.5-.39h-.42c-.14 0-.37.06-.57.27-.2.2-.74.72-.74 1.76s.76 2.05.87 2.19c.11.14 1.48 2.26 3.6 3.17.5.22.9.35 1.2.44.5.16.96.14 1.33.08.4-.06 1.23-.5 1.4-.98.18-.5.18-.92.13-.99-.05-.08-.18-.13-.42-.25"/></svg>',
  correo: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1m1.4 2L12 12.1 19.6 7zM4 17h16V8.9l-7.4 5a1 1 0 0 1-1.2 0L4 8.9z"/></svg>',
};

/* ------------------------------------------------------------------ unit */

export async function viewUnit(id) {
  view().innerHTML = `<div class="lab"><span>Property</span><span class="dash"></span></div><div id="detalle"></div>`;
  const caja = view().querySelector('#detalle');

  try {
    const u = await api.unit(id);
    const d = u.unidad;
    // The photographs of the unit, and the project's own figures: the building and how far the
    // works are. Both are optional, a unit whose project is not readable still shows its gallery.
    const [media, proy] = await Promise.all([
      api.media(id).catch(() => ({ fotos: [] })),
      api.project(d.proyecto_id).catch(() => null),
    ]);
    const fotos = media.fotos ?? [];
    const principal = fotos[0] ?? null;
    const reservada = d.disponibilidad === 'held';
    const vendida = d.disponibilidad === 'sold';

    // The figures of the unit, each with its icon. One list feeds the sheet and the gallery, so the
    // two can never tell different stories. What the developer has not declared is left out.
    const filas = [
      ['casa', 'Type', tipoLabel(d.tipo)],
      ['cama', 'Bedrooms', d.habitaciones ? String(d.habitaciones) : 'Not specified'],
      ['bano', 'Bathrooms', d.banos ? String(d.banos) : 'Not specified'],
      ['area', 'Size', d.superficie_sqft ? areaTxt(d.superficie_sqft) : 'Not specified'],
      ...(d.balcon_sqft ? [['balcon', 'Balcony', areaTxt(d.balcon_sqft)]] : []),
      ...(d.plazas_parking !== null && d.plazas_parking !== undefined
        ? [['parking', 'Parking', d.plazas_parking === 0 ? 'None' : `${d.plazas_parking} space${d.plazas_parking === 1 ? '' : 's'}`]] : []),
      ...(d.tenencia ? [['llave', 'Tenure', TENENCIA_LABEL[d.tenencia] ?? d.tenencia]] : []),
      ...(d.uso ? [['uso', 'Use', USO_LABEL[d.uso] ?? d.uso]] : []),
      ['edificio', 'Build status', obraLabel(d.estado_obra)],
      ['sofa', 'Furnishing', d.amueblado ? 'Furnished' : 'Unfurnished'],
      ['trato', 'Operation', 'Sale'],
      ...(u.listing?.referencia ? [['almohadilla', 'Reference', u.listing.referencia]] : []),
      ...(u.listing?.publicado_en ? [['fecha', 'Added on', date(u.listing.publicado_en)]] : []),
      ...(u.listing?.permiso_numero
        ? [['permiso', 'Permit', [u.listing.permiso_autoridad, u.listing.permiso_numero].filter(Boolean).join(' · ')]] : []),
    ];
    const ed = proy?.proyecto?.edificio ?? null;
    const pr = proy?.proyecto?.progreso ?? null;
    if (ed) {
      if (ed.plantas) filas.push(['edificio', 'Floors', String(ed.plantas)]);
      if (ed.ascensores !== null && ed.ascensores !== undefined) filas.push(['ascensor', 'Elevators', String(ed.ascensores)]);
      if (ed.piscinas !== null && ed.piscinas !== undefined) filas.push(['piscina', 'Swimming pools', String(ed.piscinas)]);
      if (ed.plazas_parking !== null && ed.plazas_parking !== undefined) filas.push(['parking', 'Parking spaces', String(ed.plazas_parking)]);
      if (ed.superficie_sqft) filas.push(['area', 'Building area', `${Number(ed.superficie_sqft).toLocaleString('en-US')} sqft`]);
    }
    if (pr) {
      const comoVa = comoVaElAvance(pr);
      if (comoVa) filas.push(['avance', 'Completion', comoVa]);
      if (pr.inspeccion_en) filas.push(['inspeccion', 'Last inspected', date(pr.inspeccion_en)]);
      if (pr.entrega_prevista) filas.push(['entrega', 'Handover', pr.entrega_prevista]);
    }
    const filasHtml = filas.map(([icono, k, v]) => `<dt>${ico(icono, 15)}<span>${esc(k)}</span></dt><dd>${esc(v)}</dd>`).join('');

    // El panel de información del visor, agrupado: primero las cifras de la vivienda en fichas
    // (se leen de un vistazo), después el papel —tenencia, uso, estado, referencia, permiso— y al
    // final el edificio y el avance, si el proyecto los declaró. Antes era una lista plana de
    // veintitantas líneas donde lo que importa y lo accesorio pesaban exactamente igual.
    const edificioFilas = [];
    if (ed) {
      if (ed.plantas) edificioFilas.push(['Floors', String(ed.plantas)]);
      if (ed.ascensores !== null && ed.ascensores !== undefined) edificioFilas.push(['Elevators', String(ed.ascensores)]);
      if (ed.piscinas !== null && ed.piscinas !== undefined) edificioFilas.push(['Swimming pools', String(ed.piscinas)]);
      if (ed.plazas_parking !== null && ed.plazas_parking !== undefined) edificioFilas.push(['Parking spaces', String(ed.plazas_parking)]);
      if (ed.superficie_sqft) edificioFilas.push(['Building area', `${Number(ed.superficie_sqft).toLocaleString('en-US')} sqft`]);
    }
    if (pr) {
      const comoVa = comoVaElAvance(pr);
      if (comoVa) edificioFilas.push(['Completion', comoVa]);
      if (pr.inspeccion_en) edificioFilas.push(['Last inspected', date(pr.inspeccion_en)]);
      if (pr.entrega_prevista) edificioFilas.push(['Handover', pr.entrega_prevista]);
    }
    const gruposGaleria = [
      {
        titulo: 'The home',
        cifras: [
          ['cama', d.habitaciones ? String(d.habitaciones) : 'Not declared', d.habitaciones === 1 ? 'bedroom' : 'bedrooms'],
          ['bano', d.banos ? String(d.banos) : 'Not declared', d.banos === 1 ? 'bathroom' : 'bathrooms'],
          ['area', d.superficie_sqft ? `${Number(d.superficie_sqft).toLocaleString('en-US')} sqft` : 'Not declared', 'built-up'],
          ...(d.balcon_sqft ? [['balcon', `${Number(d.balcon_sqft).toLocaleString('en-US')} sqft`, 'balcony']] : []),
          ...(d.plazas_parking !== null && d.plazas_parking !== undefined
            ? [['parking', d.plazas_parking === 0 ? 'None' : String(d.plazas_parking),
              d.plazas_parking === 1 ? 'parking space' : 'parking spaces']] : []),
        ],
        lista: [['Type', tipoLabel(d.tipo)], ['Furnishing', d.amueblado ? 'Furnished' : 'Unfurnished']],
      },
      {
        titulo: 'Tenure & records',
        lista: [
          ...(d.tenencia ? [['Tenure', TENENCIA_LABEL[d.tenencia] ?? d.tenencia]] : []),
          ...(d.uso ? [['Use', USO_LABEL[d.uso] ?? d.uso]] : []),
          ['Build status', obraLabel(d.estado_obra)],
          ['Operation', 'Sale'],
          ...(u.listing?.referencia ? [['Reference', u.listing.referencia]] : []),
          ...(u.listing?.publicado_en ? [['Added on', date(u.listing.publicado_en)]] : []),
          ...(u.listing?.permiso_numero
            ? [['Permit', [u.listing.permiso_autoridad, u.listing.permiso_numero].filter(Boolean).join(' · ')]] : []),
        ],
      },
      ...(edificioFilas.length ? [{ titulo: 'The building', lista: edificioFilas }] : []),
    ];

    // The four or five figures that decide the first look, in large type: the rooms, the baths, the
    // area and what comes with them. A figure nobody declared is left out, never drawn as a zero.
    const destacados = [
      ['cama', d.habitaciones ? String(d.habitaciones) : 'Not specified', d.habitaciones === 1 ? 'bedroom' : 'bedrooms'],
      ['bano', d.banos ? String(d.banos) : 'Not specified', d.banos === 1 ? 'bathroom' : 'bathrooms'],
      ['area', d.superficie_sqft ? Number(d.superficie_sqft).toLocaleString('en-US') : 'Not specified', 'sqft built-up'],
      ...(d.balcon_sqft ? [['balcon', Number(d.balcon_sqft).toLocaleString('en-US'), 'sqft balcony']] : []),
      ...(d.plazas_parking !== null && d.plazas_parking !== undefined
        ? [['parking', String(d.plazas_parking), d.plazas_parking === 1 ? 'parking space' : 'parking spaces']] : []),
    ];

    // The sheet reads in modules, each one a block with its own heading and icon, instead of one
    // long list where a permit and a bedroom weigh the same.
    const modulo = (icono, titulo, filasModulo, extra = '') => {
      if (!filasModulo.length && !extra) return '';
      const cuerpo = filasModulo.length
        ? `<dl class="filas">${filasModulo.map(([i, k, v]) =>
            `<dt>${ico(i, 15)}<span>${esc(k)}</span></dt><dd>${esc(v)}</dd>`).join('')}</dl>`
        : '';
      return `<section class="mod">
        <header>${ico(icono, 16)}<h4>${esc(titulo)}</h4></header>
        ${cuerpo}${extra}</section>`;
    };

    const avancePb = pr && pr.avance_pb !== null && pr.avance_pb !== undefined ? pr.avance_pb : null;
    // El avance llega en puntos básicos (10000 = 100%). Los estilos van EN LÍNEA porque una regla
    // global de los iconos de la app (que también son <i>) se imponía y dejaba el relleno a altura
    // cero: la barra se veía vacía aunque el número fuese correcto. Medido y reportado por Mauricio.
    const pct = avancePb === null ? 0 : Math.min(100, Math.max(0, avancePb / 100));
    const progreso = avancePb === null ? '' : `
      <div class="progreso" style="margin:.55rem 0 .2rem">
        <div class="barra" role="img" aria-label="${esc(String(pct))}% complete"
          style="height:8px;background:var(--line-2,#e6e8e7);border-radius:999px;overflow:hidden;margin:.45rem 0 .4rem">
          <i style="display:block;height:100%;width:${pct}%;min-width:2px;background:var(--green,#22C55E);border-radius:999px"></i>
        </div>
        <span class="note" style="font-size:12px;color:var(--ink-60,rgba(17,17,17,.55))">${esc(String(pct))}% of the works, ${
          pr.declarado ? `declared ${esc(pr.declarado.periodo_etiqueta)}${pr.declarado.por ? ` by ${esc(pr.declarado.por)}` : ''}` : 'as the developer reports it'}</span>
      </div>`;

    const moduloEdificio = ed ? modulo('edificio', 'The building', [
      ...(ed.plantas ? [['edificio', 'Floors', String(ed.plantas)]] : []),
      ...(ed.ascensores !== null && ed.ascensores !== undefined ? [['ascensor', 'Elevators', String(ed.ascensores)]] : []),
      ...(ed.piscinas !== null && ed.piscinas !== undefined ? [['piscina', 'Swimming pools', String(ed.piscinas)]] : []),
      ...(ed.plazas_parking !== null && ed.plazas_parking !== undefined ? [['parking', 'Parking spaces', String(ed.plazas_parking)]] : []),
      ...(ed.superficie_sqft ? [['area', 'Building area', `${Number(ed.superficie_sqft).toLocaleString('en-US')} sqft`]] : []),
    ]) : '';

    const moduloProyecto = modulo('mapa', 'The development', [
      ...(proy?.proyecto?.nombre ? [['mapa', 'Project', proy.proyecto.nombre]] : []),
      ...(proy?.desarrollador?.nombre ? [['edificio', 'Developer', proy.desarrollador.nombre]] : []),
      ['pulso', 'Status', ESTADO_LABEL[proy?.proyecto?.estado] ?? proy?.proyecto?.estado ?? ''],
      ...(pr?.inspeccion_en ? [['inspeccion', 'Last inspected', date(pr.inspeccion_en)]] : []),
      ...(pr?.entrega_prevista ? [['entrega', 'Handover', pr.entrega_prevista]] : []),
    ], progreso);

    const modulosHtml = `
      <div class="modulos">
        <section class="mod destacados">
          ${destacados.map(([i, v, k]) =>
            `<div class="dest"><span class="dest-ico">${ico(i, 26)}</span><b>${esc(v)}</b><span class="dest-lab">${esc(k)}</span></div>`).join('')}
        </section>

        ${modulo('casa', 'Property information', [
          ['casa', 'Type', tipoLabel(d.tipo)],
          ['edificio', 'Build status', obraLabel(d.estado_obra)],
          ['sofa', 'Furnishing', d.amueblado ? 'Furnished' : 'Unfurnished'],
          ['trato', 'Operation', 'Sale'],
          ...(d.plan_pagos ? [['fecha', 'Payment plan', d.plan_pagos]] : []),
          ...(d.entrega_prevista ? [['entrega', 'Handover of the unit', d.entrega_prevista]] : []),
        ])}

        ${modulo('llave', 'Ownership and listing', [
          ...(d.tenencia ? [['llave', 'Tenure', TENENCIA_LABEL[d.tenencia] ?? d.tenencia]] : []),
          ...(d.uso ? [['uso', 'Use', USO_LABEL[d.uso] ?? d.uso]] : []),
          ...(u.listing?.referencia ? [['almohadilla', 'Reference', u.listing.referencia]] : []),
          ...(u.listing?.publicado_en ? [['fecha', 'Added on', date(u.listing.publicado_en)]] : []),
          ...(u.listing?.permiso_numero
            ? [['permiso', 'Advertising permit', [u.listing.permiso_autoridad, u.listing.permiso_numero].filter(Boolean).join(' · ')]] : []),
        ])}

        ${modulo('promocion', 'Amenities', [], d.amenidades?.length
          ? `<ul class="amen">${d.amenidades.map((a) => `<li>${esc(amenLabel(a))}</li>`).join('')}</ul>` : '')}

        ${(moduloEdificio || moduloProyecto) ? `<div class="modulos-dos">${moduloEdificio}${moduloProyecto}</div>` : ''}
      </div>`;


    // Lo que hay DENTRO del marco grande, en tres piezas que NO se pisan entre sí: la foto (su propio
    // hueco, `#gran-medio`, es lo único que se reescribe al cambiar de foto), el contador y la puerta
    // a la galería. El conmutador de medios vive aquí también y es **estable**: cuando el marco se
    // reescribía entero al elegir una miniatura, se lo llevaba por delante y sus botones dejaban de
    // responder sin que nada avisara.
    const selloGaleria = fotos.length ? `<span class="abrir-gal">${ico('ampliar', 14)}
      <b>View all ${fotos.length}</b>${media.video ? ' · video' : ''}${media.tour3d ? ' · 360°' : ''}${media.planos?.length ? ' · plans' : ''}</span>` : '';
    const cuantosMedios = fotos.length + (media.video ? 1 : 0) + (media.tour3d ? 1 : 0) + (media.planos?.length ?? 0);
    // Lo que necesita el sello de Verysset para abrir su informe desde cualquier punto de esta
    // pantalla: la unidad, su título y su referencia.
    const datoSello = {
      unidad: d.id,
      titulo: u.listing?.titulo ?? `${tipoLabel(d.tipo)} in ${d.comunidad ?? d.emirato}`,
      ref: u.listing?.referencia ?? '',
    };
    const conmutadorMedios = cuantosMedios ? `
              <div class="medios-sel" role="group" aria-label="What to see">
                ${fotos.length ? `<button type="button" class="ms on" data-medio="foto" aria-pressed="true">${ico('ampliar', 14)} Photos <b>${fotos.length}</b></button>` : ''}
                ${media.video ? `<button type="button" class="ms" data-medio="video" aria-pressed="false">${ico('video', 14)} Video</button>` : ''}
                ${media.tour3d ? `<button type="button" class="ms" data-medio="tour3d" aria-pressed="false">${ico('pano', 14)} 360° tour</button>` : ''}
                ${media.planos?.length ? `<button type="button" class="ms" data-medio="plano" aria-pressed="false">${ico('plano', 14)} Floor plan <b>${media.planos.length}</b></button>` : ''}
              </div>` : '';

    caja.innerHTML = `
      <div class="detail">
        <div>
          <div class="gallery">
            <div class="big" id="grande" role="button" tabindex="0" aria-label="Open the gallery of this property">
              <div class="big-medio" id="gran-medio">${photoInner(fotos[0] ?? principal, d.tipo)}</div>
              ${fotos.length > 1 ? `<span class="big-cuenta"><b>1</b> / ${fotos.length}</span>` : ''}
              ${selloGaleria}
              ${conmutadorMedios}
            </div>
            ${fotos.length > 1 ? `<div class="thumbs" role="group" aria-label="Photos">${fotos.map((f, i) => `<button type="button" class="tb" data-i="${i}" aria-label="Photo ${i + 1} of ${fotos.length}"><img src="${esc(f)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
          </div>
          <div class="section">
            <h2 style="font-size:1.3rem">${esc(u.listing?.titulo ?? `${tipoLabel(d.tipo)} in ${d.comunidad ?? d.emirato}`)}</h2>
            <p class="muted">${esc(d.comunidad ? `${d.comunidad} · ${d.emirato}` : d.emirato)} ·
              <a href="#/project/${esc(d.proyecto_id)}">${esc(d.proyecto ?? 'Project')}</a></p>
            ${d.aviso_ubicacion ? `<p class="nota-ubicacion">${esc(d.aviso_ubicacion)}</p>` : ''}
            ${modulosHtml}
          </div>
        </div>

        <aside class="panel">
          <div id="precio-panel">
            <div class="price">${esc(money(d.precio_fils))}</div>
            ${cifraCripto(d) ? `<div class="price-cripto"><b>${esc(cifraCripto(d))}</b>
              <i>indicative</i></div>` : ''}
          </div>
          ${d.estado_obra === 'off_plan' && (d.entrega_prevista || d.plan_pagos) ? `
            <div class="obra" style="margin:.6rem 0">
              ${d.entrega_prevista ? `<div><span>Handover</span><b>${esc(d.entrega_prevista)}</b></div>` : ''}
              ${d.plan_pagos ? `<div><span>Payment plan</span><b>${esc(d.plan_pagos)}</b></div>` : ''}
            </div>` : ''}
          <p class="muted" style="font-size:.85rem;margin:.2rem 0 .8rem">Contract price in dirhams.
            Paying in digital assets is quoted at the moment of payment, with an expiry.</p>
          <div class="flujo-pago">
            <div class="flujo-marcas">
              <a class="flujo-marca ptf" href="https://pro.paythefly.com" target="_blank" rel="noopener noreferrer" title="PayTheFly: on-chain collection, non-custodial">
                <img src="img/paythefly.svg" alt="PayTheFly" height="20">
              </a>
              <span class="flujo-paso" aria-hidden="true">›</span>
              <a class="flujo-marca chg" href="https://changer.ae" target="_blank" rel="noopener noreferrer" title="Changer.ae: licensed OTC custodian">
                <img src="img/changer.png" alt="Changer" height="18">
              </a>
              <span class="flujo-paso" aria-hidden="true">›</span>
              <a class="flujo-marca mbk" href="https://www.mbank.ae" target="_blank" rel="noopener noreferrer" title="mbank: the fiat leg">
                <img src="img/mbank.png" alt="mbank" height="18">
              </a>
            </div>

            <ol class="flujo-cadena">
              <li><b>Buyer</b></li>
              <li><b>Developer's wallet</b> · collected by PayTheFly, non-custodial</li>
              <li><b>Changer</b> · digital asset into dirhams</li>
              <li><b>mbank</b> · the fiat leg</li>
              <li><b>Developer's account</b> · AED</li>
            </ol>

            <p class="flujo-txt">
              <b>PayTheFly</b> collects the payment on-chain and non-custodial: the money never sits with us.
              <b>Changer</b>, a licensed OTC custodian, converts the digital asset into dirhams, <b>mbank</b>
              carries the fiat, and the money reaches the developer's dirham account. BlockEstate runs on this
              protocol: the buyer touches digital assets, the developer touches fiat.
              <span class="flujo-tiempo">One continuous flow: seconds on-chain, minutes to the account.</span>
            </p>
          </div>
          ${u.badge ? `<div class="verif-linea con-sello">${selloVerysset('Verified by Verysset', datoSello)}<span>${u.badge?.validado_en ? `on ${esc(date(u.badge.validado_en))}` : ''}${u.badge?.vigencia ? ` · until ${esc(date(u.badge.vigencia))}` : ''}</span></div>` : ''}
          <div id="accion" style="margin-top:1rem"></div>
          <p class="note">Seller: ${esc('the developer of the project')}. The marketplace does not publish
            the developer's contact details, and the money does not pass through the buyer's hands: the
            platform orchestrates the payment to the developer's account.</p>

          <div class="conectar" id="conectar">
            <h4>Get in touch</h4>
            <p class="note">The marketplace never publishes the seller's contact. The code that brought
              you says who we put you in touch with, press a channel and we will ask you for it.</p>
            <div class="field">
              <label for="ref">Referral code <span class="muted" style="text-transform:none;letter-spacing:0">(optional)</span></label>
              <input id="ref" placeholder="BROKER-ALPHA" autocomplete="off" spellcheck="false">
              <span class="note" id="ref-nota">${AVISO_CODIGO}</span>
            </div>
            <div class="quien" id="quien" hidden>
              <span class="quien-lab">The code is from</span>
              <span class="avatar" id="quien-foto"></span>
              <div class="quien-txt">
                <b id="quien-nombre"></b>
                <span class="muted" id="quien-titulo"></span>
              </div>
            </div>
            <div class="sello-verif">
              ${selloVerysset('Verified by Verysset', datoSello)}
              <span class="sello-txt">Property authenticity was validated by Verysset. The badge states
                its scope and its date, not a promise about the future.</span>
            </div>
            ${(u.desarrollador?.logo_url || u.proyecto?.desarrollador_logo) ? `<div class="quien-vende">
              <img src="${esc(u.desarrollador?.logo_url ?? u.proyecto?.desarrollador_logo)}" alt="${esc(u.desarrollador?.nombre ?? '')}" loading="lazy">
              <span>${esc(u.desarrollador?.nombre ?? u.proyecto?.desarrollador ?? '')}</span>
            </div>` : ''}
            <div class="canales" id="canales">
              <button type="button" class="canal" data-canal="telegram" title="Telegram">${ICONO.telegram}<span>Telegram</span></button>
              <button type="button" class="canal wa" data-canal="whatsapp" title="WhatsApp">${ICONO.whatsapp}<span>WhatsApp</span></button>
              <button type="button" class="canal" data-canal="correo" title="Mail">${ICONO.correo}<span>Mail</span></button>
            </div>
            <div class="note" id="conectar-nota"></div>
          </div>

          <!-- El recorrido del dinero. Ocupa el tramo que quedaba en blanco al pie de la columna del
               precio, y contesta la única pregunta que un comprador de cripto se hace aquí: dónde va
               mi dinero entre que lo mando y me ponen el título a mi nombre. Sin cifras inventadas:
               el orden de los actores y los tiempos están en el modelo, y nada más. -->
          <div class="ruta" aria-label="How the payment travels">
            <h4>How the payment travels</h4>
            <p class="ruta-intro">The buyer pays in digital assets; the developer is paid in dirhams. In between
              there are three licensed hands and no shortcuts.</p>
            <ol class="ruta-pasos">
              <li><b>Your wallet</b><span>USDT, BTC or ETH, from the wallet you declare. The network has to
                match: a wrong network is an exception that gets shown, never swallowed.</span></li>
              <li><b>On-chain collection</b><span>PayTheFly collects on-chain and does not custody: no fiat
                and no bank on its side.</span></li>
              <li><b>Digital assets into dirhams</b><span>Changer, the licensed OTC, makes the exchange. Seconds to
                minutes.</span></li>
              <li><b>The bank</b><span>mbank receives the cash and delivers it to the developer's account.
                Minutes to hours.</span></li>
              <li><b>The deed</b><span>The Dubai Land Department registers the title in the buyer's name.
                Working days.</span></li>
            </ol>
            <p class="ruta-nota">Where the exchange runs through DVA, three banks (HSBC, Zand and Mashreq)
              settle in parallel and, with the property's token through Ctrl+Alt, the registered transfer
              happens the same day.</p>
            <p class="ruta-nota">BlockEstate (NDC) orchestrates and charges for crossing the river. It never
              holds your money and no machine approves anything: the KYC is read by a person and a payment is
              released by an authorised human.</p>
          </div>
        </aside>
      </div>
    `;

    // The connect block. The seller's contact is never published: the code the buyer carries is the
    // only door, so it is asked for here, and it is the same value the reservation sends.
    let referido = null;
    const campoRef = caja.querySelector('#ref');
    const notaRef = caja.querySelector('#ref-nota');
    const notaConectar = caja.querySelector('#conectar-nota');
    const botonesCanal = Array.from(caja.querySelectorAll('[data-canal]'));

    const canalesAbiertos = (r) => Object.keys(ETIQUETA_CANAL).filter((c) => r[c]).map((c) => ETIQUETA_CANAL[c]);

    // The door is built from what the code carries. No code, no link: nothing is guessed.
    const enlaceDe = (canal, r) => {
      if (canal === 'whatsapp' && r.whatsapp) return `https://wa.me/${String(r.whatsapp).replace(/[^0-9]/g, '')}`;
      if (canal === 'telegram' && r.telegram) return `https://t.me/${String(r.telegram).replace(/^@/, '')}`;
      if (canal === 'correo' && r.correo) return `mailto:${r.correo}`;
      return null;
    };

    const pintarCanales = () => {
      for (const b of botonesCanal) {
        b.classList.toggle('abierto', Boolean(referido && referido[b.dataset.canal]));
      }
      pintarQuien();
    };

    // Who answers: the card shows the name, the line under it and the channel. With no photo it
    // shows the initials, a face is never invented and an empty circle is never drawn.
    const cajaQuien = caja.querySelector('#quien');
    const pintarQuien = () => {
      if (!referido) {
        cajaQuien.hidden = true;
        return;
      }
      const iniciales = String(referido.nombre).trim().split(/\s+/).slice(0, 2)
        .map((p) => p[0]).join('').toUpperCase();
      const foto = caja.querySelector('#quien-foto');
      // Las iniciales van SIEMPRE debajo del retrato. Si la foto no carga —cosa que pasa en la
      // vista previa, donde las rutas de /uploads no existen—, la imagen se quita sola y queda el
      // nombre en iniciales. Antes se veía un disco oscuro vacío: parecía un botón roto.
      foto.innerHTML = referido.foto
        ? `${esc(iniciales)}<img src="${esc(referido.foto)}" alt="" onerror="this.remove()">`
        : esc(iniciales);
      caja.querySelector('#quien-nombre').textContent = referido.nombre;
      // The line under the name: what the code's owner wrote, or the channel when they wrote nothing.
      caja.querySelector('#quien-titulo').textContent = referido.titulo ?? referido.canal ?? '';
      cajaQuien.hidden = false;
    };

    const resolverCodigo = async () => {
      const codigo = campoRef.value.trim();
      if (!codigo) {
        referido = null;
        notaRef.className = 'note';
        notaRef.textContent = AVISO_CODIGO;
        pintarCanales();
        return;
      }
      try {
        referido = await api.referral(codigo);
        notaRef.className = 'note ok';
        notaRef.textContent = `✓ ${referido.nombre} · ${referido.canal}`;
      } catch (err) {
        referido = null;
        notaRef.className = 'note err';
        notaRef.textContent = err.message;
      }
      pintarCanales();
    };

    // Pressing a channel asks for the code first: without it there is nobody to connect the buyer to.
    const conectar = (canal) => {
      const etiqueta = ETIQUETA_CANAL[canal];
      notaConectar.className = 'note';
      if (!referido) {
        campoRef.classList.add('pide');
        campoRef.focus();
        notaConectar.className = 'note err';
        notaConectar.textContent = `Type the code that brought you and we will connect you on ${etiqueta}.`;
        return;
      }
      const url = enlaceDe(canal, referido);
      if (!url) {
        notaConectar.className = 'note err';
        notaConectar.textContent = `${referido.nombre} has no ${etiqueta} on file: this code opens ${canalesAbiertos(referido).join(' and ')}.`;
        return;
      }
      notaConectar.className = 'note ok';
      notaConectar.textContent = `Opening ${etiqueta} to reach ${referido.nombre}.`;
      window.open(url, '_blank', 'noopener');
    };

    campoRef.addEventListener('blur', resolverCodigo);
    campoRef.addEventListener('input', () => {
      campoRef.classList.remove('pide');
      if (referido) {
        referido = null;
        pintarCanales();
      }
    });
    caja.querySelector('#canales').addEventListener('click', (e) => {
      const boton = e.target.closest?.('[data-canal]');
      if (boton) conectar(boton.dataset.canal);
    });

    // Llegar desde una tarjeta con un canal elegido (`#/unit/…?canal=whatsapp`): la
    // puerta es el código, así que se pide aquí mismo y se dice por dónde se abre.
    const canalPedido = new URLSearchParams(location.hash.split('?')[1] ?? '').get('canal');
    if (canalPedido && ETIQUETA_CANAL[canalPedido]) conectar(canalPedido);

    // The gallery: the same media the sheet shows, full screen, with the figures at hand.
    const abrir = (inicio = 0) => abrirGaleria({
      fotos,
      video: media.video ?? null,
      tour3d: media.tour3d ?? null,
      planos: media.planos ?? [],
      nombres: media.nombres ?? [],
      aviso: media.aviso ?? '',
      inicio,
      titulo: u.listing?.titulo ?? `${tipoLabel(d.tipo)} in ${d.comunidad ?? d.emirato}`,
      subtitulo: [u.listing?.referencia, money(d.precio_fils), d.comunidad ?? d.emirato]
        .filter(Boolean).join(' · '),
      datos: filas,
      grupos: gruposGaleria,
      // El precio y si está vendida, dentro del visor: quien mira las fotos a pantalla completa quiere
      // tener delante el número y si la unidad sigue libre, sin volver a la ficha.
      precio: money(d.precio_fils),
      estado: vendida ? 'Sold' : '',
    });
    // Choosing what to see. Each button opens the viewer at the first item of its kind, which is
    // what «selector de fotos, vídeo, planos y 360» means in practice: one tap and you are there.
    const ponerGrande = (i) => {
      const marco = caja.querySelector('#grande');
      const hueco = caja.querySelector('#gran-medio');
      if (!marco || !hueco || !fotos[i]) return;
      // Solo se reescribe el hueco de la foto: el contador, el sello y el conmutador se quedan donde
      // están (con sus manejadores vivos) y se actualizan en su sitio.
      hueco.innerHTML = photoInner(fotos[i], d.tipo);
      marco.dataset.i = String(i);
      const cuenta = marco.querySelector('.big-cuenta');
      if (cuenta) cuenta.innerHTML = `<b>${i + 1}</b> / ${fotos.length}`;
      caja.querySelectorAll('.thumbs .tb').forEach((b, n) => {
        const on = n === i;
        b.classList.toggle('on', on);
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      // Elegir una miniatura devuelve el conmutador a «fotos»: si el visitante venía de vídeo o de
      // planos, el marco ya enseña una foto y la barra no puede seguir diciendo otra cosa.
      caja.querySelectorAll('.medios-sel .ms').forEach((o) => o.classList.toggle('on', o.dataset.medio === 'foto'));
    };
    caja.querySelectorAll('.thumbs .tb').forEach((b, n) => {
      if (n === 0) { b.classList.add('on'); b.setAttribute('aria-current', 'true'); }
    });
    caja.querySelector('.medios-sel')?.addEventListener('click', (e) => {
      const b = e.target.closest?.('[data-medio]');
      if (!b) return;
      const fotosN = fotos.length;
      const trasVideo = fotosN + (media.video ? 1 : 0);
      caja.querySelectorAll('.medios-sel .ms').forEach((o) => o.classList.toggle('on', o === b));
      if (b.dataset.medio === 'foto') { ponerGrande(0); return; }
      const inicio = b.dataset.medio === 'video' ? fotosN
        : b.dataset.medio === 'tour3d' ? trasVideo
        : trasVideo + (media.tour3d ? 1 : 0);
      abrir(inicio);
    });
    const grande = caja.querySelector('#grande');
    // El conmutador de medios vive DENTRO del marco, así que su clic sube hasta aquí y este manejador
    // abría además la galería en la foto 1, encima del medio que el visitante acababa de pedir. El
    // conmutador manda sobre su propia zona; el resto del marco sigue abriendo el visor.
    const enElConmutador = (e) => Boolean(e.target.closest?.('.medios-sel'));
    // Y el visor se abre EN la foto que se está mirando, no siempre en la primera: el marco ya sabe
    // cuál es (`data-i`), que es justo lo que el contador enseña.
    const fotoActual = () => Number(grande?.dataset.i || 0) || 0;
    grande?.addEventListener('click', (e) => { if (!enElConmutador(e)) abrir(fotoActual()); });
    grande?.addEventListener('keydown', (e) => {
      if (enElConmutador(e)) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(fotoActual()); }
    });
    // Tapping a thumbnail swaps the big picture IN PLACE. It used to open the full-screen viewer,
    // which is not what a strip of thumbnails under a photo means anywhere: there you pick which
    // picture you are looking at, and the picture changes. The viewer is still behind the big
    // picture itself and behind the «view all» badge.
    caja.querySelector('.thumbs')?.addEventListener('click', (e) => {
      const t = e.target.closest?.('.tb');
      if (t) ponerGrande(Number(t.dataset.i));
    });

    // El sello de Verysset abre su informe, y lo hace por el manejador delegado de `verysset.js`
    // (enganchado una sola vez en el arranque): aquí solo hay que darle de qué unidad es. Antes este
    // bloque buscaba un `.badge.verysset` que no existe en el marcado —el sello es `.sello-vss`—,
    // así que el informe entero quedaba inalcanzable desde la ficha.

    const accion = caja.querySelector('#accion');
    if (vendida) {
      accion.innerHTML = '<p class="msg warn">This unit is sold.</p>';
    } else if (!store.logged()) {
      accion.innerHTML = `<a class="btn green" href="#/login" style="width:100%">Sign in to reserve</a>`;
    } else {
      // Si esta unidad ya tiene una compra en marcha, el botón que importa es el que entra al pago —el
      // paso de PayTheFly— y no el de reservar otra vez. Se mira la cartera del comprador, que es quien
      // sabe si hay compra: la ficha no lo trae.
      let compra = null;
      try {
        const cartera = await api.portfolio();
        const suyas = cartera?.compras ?? cartera?.unidades ?? [];
        compra = suyas.find((c) => (c.unidad_id ?? c.unidadId) === d.id) ?? null;
      } catch { /* sin cartera: se sigue con la reserva de siempre */ }
      const nota = `<p class="note">Reserving holds the unit for 14 days and commits you to nothing: until the
          payment is on-chain, cancelling costs nothing. There is one reservation per unit at a time.
          ${'\u2192'} The referral code, if you have one, is in <b>Get in touch</b>: it is the same field.</p>`;
      accion.innerHTML = compra
        ? `<a class="btn green" href="#/portfolio/${esc(compra.intencion_id ?? compra.id)}" style="width:100%">
             Pay with digital assets · continue to the payment</a>
           <p class="note">Your purchase for this unit is under way: the next step is the payment. PayTheFly
             collects the digital assets on chain and the dirhams reach the developer through the licensed OTC and
             the bank.</p>
           <button class="btn ghost" id="reservar" style="width:100%"${reservada ? ' disabled' : ''}>
             ${reservada ? 'Already reserved by someone' : 'Reserve again'}</button>`
        : `<button class="btn green" id="reservar" style="width:100%"${reservada ? ' disabled' : ''}>
             ${reservada ? 'Already reserved by someone' : 'Reserve for 14 days'}</button>${nota}`;
      accion.querySelector('#reservar')?.addEventListener('click', (e) => reservar(e, d.id));
    }
  } catch (err) {
    error(caja, err);
  }
}

async function reservar(e, unidadId) {
  const boton = e.currentTarget;
  const codigo = document.querySelector('#ref')?.value.trim() ?? '';
  boton.disabled = true;
  boton.textContent = 'Reserving…';
  try {
    const hold = await api.hold(unidadId, codigo ? { canal: 'direct', codigo } : { canal: 'direct' });
    const compra = await api.purchase2(hold.hold_id);
    store.save({ ultima_compra: compra.intencion_id });
    go(`/portfolio/${compra.intencion_id}`);
  } catch (err) {
    boton.disabled = false;
    boton.textContent = 'Reserve for 14 days';
    error('#accion', err);
  }
}

/* ------------------------------------------------------------------ project */

export async function viewProject(id) {
  view().innerHTML = `<div class="lab"><span>Project</span><span class="dash"></span></div><div id="proyecto">${'<div class="sk" style="height:180px"></div>'}</div>`;
  const caja = view().querySelector('#proyecto');
  try {
    const { proyecto, desarrollador, unidades } = await api.project(id);
    caja.innerHTML = `
      ${(() => {
        const pie = `${esc(proyecto.comunidad ? `${proyecto.comunidad} · ${proyecto.ciudad}` : proyecto.ciudad)}
          · by ${esc(desarrollador?.nombre ?? '')}`;
        // Sin imagen del desarrollador no se inventa ninguna: el título solo, como estaba. La
        // cabecera con foto o vídeo aparece cuando él la pone.
        if (!proyecto.imagen_url && !proyecto.video_url) {
          return `<h1 style="font-size:clamp(1.6rem,3.6vw,2.4rem)">${esc(proyecto.nombre)}</h1>
            <p class="muted">${pie}</p>`;
        }
        // El vídeo manda sobre la imagen: es lo que el desarrollador puso para presentar el
        // proyecto, y la imagen se queda de cartel mientras el vídeo carga.
        return `<header class="proy-cabecera">
          ${proyecto.video_url
            ? `<video class="proy-media" src="${esc(urlDeMedio(proyecto.video_url))}"${
              proyecto.imagen_url ? ` poster="${esc(urlDeMedio(proyecto.imagen_url))}"` : ''
            } autoplay muted loop playsinline preload="metadata"></video>`
            : `<img class="proy-media" src="${esc(urlDeMedio(proyecto.imagen_url))}" alt="${esc(proyecto.nombre)}"
                 onerror="this.remove()">`}
          <span class="proy-velo" aria-hidden="true"></span>
          <div class="proy-texto">
            <span class="lab"><span>Project</span><span class="dash"></span></span>
            <h1>${esc(proyecto.nombre)}</h1>
            <p>${pie}</p>
          </div>
        </header>`;
      })()}
      ${proyecto.descripcion ? `<p>${esc(proyecto.descripcion)}</p>` : ''}
      ${(() => {
        const e = proyecto.edificio ?? {};
        const filas = [
          ['Floors', e.plantas],
          ['Elevators', e.ascensores],
          ['Swimming pools', e.piscinas],
          ['Parking spaces', e.plazas_parking],
          ['Building area', e.superficie_sqft],
        ].filter(([, v]) => v !== null && v !== undefined);
        if (!filas.length) return '';
        return `<div class="edificio">
          <h4>Building information</h4>
          <dl class="kv">${filas.map(([k, v]) => `<dt>${k}</dt><dd>${
            k === 'Building area' ? esc(Number(v).toLocaleString('en-US')) + ' sqft'
              : esc(Number(v).toLocaleString('en-US'))}</dd>`).join('')}</dl>
          <p class="note">What the developer declares about the building. Anything they have not
            said is left out rather than filled in.</p>
        </div>`;
      })()}
      ${(() => {
        const p = proyecto.progreso ?? {};
        // El avance va en puntos base en la plataforma y aquí se lee en porcentaje — pero nunca solo:
        // con su mes y su autor si alguien lo declaró, y diciendo que es «as reported» si es solo el
        // número del proyecto. Un porcentaje sin fecha no se presenta como un hecho (BR-008).
        const avance = comoVaElAvance(p);
        const filas = [
          ['Developer', desarrollador?.nombre ?? null],
          ['Status', ESTADO_LABEL[proyecto.estado] ?? proyecto.estado],
          ['Completion', avance],
          ['Last inspected', p.inspeccion_en ? date(p.inspeccion_en) : null],
          ['Handover', p.entrega_prevista],
        ].filter(([, v]) => v);
        if (!filas.length) return '';
        return `<div class="edificio">
          <h4>Project information</h4>
          <dl class="kv">${filas.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        </div>`;
      })()}
      ${(() => {
        const p = proyecto.progreso ?? {};
        const d = p.declarado ?? null;
        const i = p.inspeccionado ?? null;
        if (!d && !i) {
          return `<div class="avance-obras">
            <h4>Progress of the works</h4>
            <p class="note">The developer has not declared a month yet, and no inspection has been
              recorded. An empty row is left empty instead of being filled in with a guess.</p>
          </div>`;
        }
        const fila = (x, tipo) => `<div class="avance-fila ${tipo}">
          <span class="avance-eti">${tipo === 'declarado' ? 'Declared' : 'Inspected'}</span>
          <b>${esc(x.porcentaje)}</b>
          <span class="avance-quien">${esc(x.periodo_etiqueta)}${
            tipo === 'inspeccionado' && x.inspeccion_en ? ` · ${esc(date(x.inspeccion_en))}` : ''}${
            (x.inspector || x.por) ? ` · by ${esc(x.inspector || x.por)}` : ''}</span>
          ${x.nota ? `<p>${esc(x.nota)}</p>` : ''}
        </div>`;
        return `<div class="avance-obras">
          <h4>Progress of the works</h4>
          <div class="avance-filas">${d ? fila(d, 'declarado') : ''}${i ? fila(i, 'inspeccionado') : ''}</div>
          <p class="note">A declaration is what the developer says, for a month. An inspection is a
            check, with the day it was made and who made it. They are never shown as one another.</p>
          <details class="avance-historial" data-proyecto="${esc(proyecto.id)}">
            <summary>Month by month</summary><div class="avance-lista">Loading…</div>
          </details>
        </div>`;
      })()}
      <p class="muted" style="font-size:.85rem">${unidades.length} propert${unidades.length === 1 ? 'y' : 'ies'} published.</p>
      ${unidades.length
        ? `<div class="list">${unidades.map((u) => `
            <article class="card">
              <div class="photo">
                <a href="#/unit/${esc(u.id)}" aria-label="${esc(tipoLabel(u.tipo))}">${photoInner(null, u.tipo)}</a>
                <span class="tags"><span class="tag">${esc(obraLabel(u.estado_obra))}</span></span>
              </div>
              <div class="body">
                <div class="price">${esc(money(u.precio_fils))}</div>
                <div class="tipo">${esc(tipoLabel(u.tipo))}</div>
                <h3><a href="#/unit/${esc(u.id)}">${esc(tipoLabel(u.tipo))} in ${esc(u.comunidad ?? u.emirato)}</a></h3>
                <div class="specs">${specs(u)}</div>
                <div class="zona">${esc(u.comunidad ?? u.emirato)}, ${esc(u.emirato)}</div>
                <div class="foot">
                  <span class="dev"></span>
                  <a class="btn ghost sm" href="#/unit/${esc(u.id)}">View</a>
                </div>
              </div>
            </article>`).join('')}</div>`
        : empty('Nothing published in this project', 'The developer has not listed a unit here yet.')}
    `;
    // El historial llega después y no bloquea la ficha: los dos números ya están pintados (vienen
    // con el proyecto), y esto añade el mes a mes. Si falla, la ficha se queda con lo que ya tiene.
    pintarHistorialDeAvance(proyecto.id);
  } catch (err) {
    error(caja, err);
  }
}

/**
 * El mes a mes de las obras, dentro del bloque que ya está en pantalla. Nunca mezcla lo declarado con
 * lo inspeccionado: cada fila dice cuál de las dos cosas es.
 */
async function pintarHistorialDeAvance(proyectoId) {
  const caja = view().querySelector('.avance-historial .avance-lista');
  if (!caja) return;
  let d;
  try {
    d = await api.proyectoAvance(proyectoId);
  } catch {
    caja.innerHTML = '<span class="note">The month-by-month history could not be loaded.</span>';
    return;
  }
  const filas = (d.historial ?? []).filter((x) => x.origen === 'declared');
  if (!filas.length) {
    caja.innerHTML = '<span class="note">No month has been declared yet.</span>';
    return;
  }
  caja.innerHTML = `<ul class="avance-meses">${filas.map((x) => `
    <li><span>${esc(x.periodo_etiqueta)}</span><b>${esc(x.porcentaje)}</b>${
      x.nota ? `<i>${esc(x.nota)}</i>` : ''}${x.por ? `<em>${esc(x.por)}</em>` : ''}</li>`).join('')}</ul>`;
}

/**
 * El avance, tal y como se puede decir en cada caso.
 *
 * Si hay declaración, lleva su mes y quién la firma —que es lo que la hace comprobable—. Si solo
 * está el número del proyecto, se dice que es «as reported»: un porcentaje sin fecha no se presenta
 * como un hecho, y ese es justo el punto de BR-008.
 */
function comoVaElAvance(pr) {
  if (!pr) return null;
  const d = pr.declarado ?? null;
  if (d) return `${d.porcentaje} · declared ${d.periodo_etiqueta}${d.por ? ` by ${d.por}` : ''}`;
  if (pr.avance_pb !== null && pr.avance_pb !== undefined) return `${pr.avance_pb / 100}% · as reported`;
  return null;
}

export { date };

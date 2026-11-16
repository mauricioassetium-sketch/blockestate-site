/**
 * The creator agency desk: the network a partner runs — its revenue line, the creators inside it,
 * the 72-hour KYC clock, the campaigns and the thread with its BlockEstate agent.
 *
 * This is the USTAR partner panel living inside the marketplace instead of beside it: same screens
 * and same `/ustar` routes, drawn in the market's own container so one address carries the market
 * and every desk. The API scopes each figure to the session's agency; nothing here is invented.
 */
import { API_BASE } from '../config.js';
import { store } from '../store.js';
import { toast as toastUI } from '../ui.js';

const CLAVE_RED = 'be_ca_red';
let red = localStorage.getItem(CLAVE_RED) || 'todas';
let tableroCache = null;
let creadoresCache = [];
let mensajesCache = null;
let seccion = 'overview';

/** A message on the market's own toast: the panel had one of its own, the shell already has one. */
function toast(mensaje, malo) { toastUI(String(mensaje ?? ''), malo ? 'bad' : ''); }

/** Media served by the API travels as a path: a relative one would be asked of this origin. */
const absOr = (u) => (u && String(u).startsWith('/') ? API_BASE + u : u);

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function aed(v) { return 'AED ' + Math.round(Number(v || 0) / 100).toLocaleString('en-AE'); }
  function aedk(v) {
    const n = Math.round(Number(v || 0) / 100);
    if (n >= 1000000000) return 'AED ' + (n / 1000000000).toFixed(2).replace(/\.0+$/, '') + 'B';
    if (n >= 1000000) return 'AED ' + (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return 'AED ' + (n / 1000).toFixed(0) + 'k';
    return 'AED ' + n;
  }
  function compact(n) {
    n = Number(n || 0);
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }
  function mesLabel(periodo) {
    const m = Number((periodo || '').split('-')[1]);
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] || '';
  }
  function horasTexto(h) {
    const n = Number(h || 0);
    if (n < 1) return 'just now';
    if (n < 24) return Math.round(n) + 'h';
    return Math.floor(n / 24) + 'd';
  }
  function query(obj) {
    const q = Object.keys(obj || {}).filter((k) => obj[k] !== '' && obj[k] != null).map((k) => k + '=' + encodeURIComponent(obj[k])).join('&');
    return q ? '?' + q : '';
  }
  let filtrosCreadores = { q: '', pais: '', region: '', industria: '', plataforma: '' };
  let todosInflCache = null;
  function selectFiltro(todos, campo, label, actual) {
    const vals = [...new Set((todos || []).map((f) => f[campo]).filter(Boolean))].sort();
    const opts = vals.map((v) => '<option value="' + esc(v) + '"' + (v === actual ? ' selected' : '') + '>' + esc(v) + '</option>').join('');
    return '<select id="f-' + campo + '" data-campo="' + campo + '"><option value=""' + (!actual ? ' selected' : '') + '>' + label + '</option>' + opts + '</select>';
  }
  function urlRed(plataforma, handle) {
    const h = (handle || '').replace(/^@/, '');
    const p = (plataforma || '').toLowerCase();
    switch (p) {
      case 'instagram': return 'https://instagram.com/' + h;
      case 'tiktok': return 'https://tiktok.com/@' + h;
      case 'youtube': return 'https://youtube.com/@' + h;
      case 'x': case 'twitter': return 'https://x.com/' + h;
      default: return 'https://' + p + '.com/' + h;
    }
  }
  const IC_EXT = '<svg viewBox="0 0 16 16" fill="none"><path d="M6 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2M9 3h4v4M13 3 7.5 8.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const IC_EYE = '<svg viewBox="0 0 24 24" fill="none"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.1" stroke="currentColor" stroke-width="1.7"/></svg>';
  const IC_IMG = '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4.5" width="18" height="15" rx="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="8.6" cy="10" r="1.7" stroke="currentColor" stroke-width="1.5"/><path d="M20.5 15.5 15.2 10 6 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const IC_DOC = '<svg viewBox="0 0 24 24" fill="none"><path d="M14 3.5H7.5A2.5 2.5 0 0 0 5 6v12a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 18V8.5L14 3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13.8 3.8V8.6H18.6" stroke="currentColor" stroke-width="1.6"/></svg>';
  const IC_MSG = '<svg viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1.4-5.2A8.5 8.5 0 1 1 21 11.5Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const IC_SIGN = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20c3.5-1 4.2-4 5.5-7.5C10.8 8.5 12 4 14.5 4c2 0 2.6 2 1.8 4.4-.7 2.2-2.4 4.6-1 6.2 1 1.1 2.6.6 4.7-1.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 20h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';


async function api(path, opts) {
  opts = opts || {};
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const token = store.token();
  if (token) headers.Authorization = 'Bearer ' + store.token();
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch (_) {
    throw new Error('No connection with the marketplace. Check the network and try again.');
  }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch (_) { /* empty */ }
  if (!res.ok) {
    // An expired session goes out through the front door, once, instead of failing every screen.
    if (res.status === 401) store.clear();
    const msg = (data && (data.mensaje || data.message || data.error)) || ('HTTP ' + res.status);
    const err = new Error(msg); err.status = res.status; throw err;
  }
  return data;
}

  /* ---------------- shell / helpers ---------------- */
  /**
   * The line each screen opens with. The big heading is the desk's own and the tab already says
   * which screen this is, so the panel's second title would only repeat it: the sentence stays.
   */
  function head(sub) {
    return '<p class="sub">' + sub + '</p>';
  }
  function contarTipo(lista, tipo) { return (lista || []).filter((x) => x.tipo === tipo && x.activo).length; }
  function deltaChip(c, sufijo) {
    if (!c) return '';
    const p = c.delta_pct;
    if (p === null || p === undefined) return '<span class="dlt flat">no prior period</span>';
    if (Number(p) === 0) return '<span class="dlt flat">0% vs prior 30d</span>';
    const up = Number(p) > 0;
    return '<span class="dlt ' + (up ? 'up' : 'down') + '">' + (up ? '▲' : '▼') + ' ' +
      Math.abs(Number(p)).toFixed(1).replace(/\.0$/, '') + '% ' + (sufijo || 'vs prior 30d') + '</span>';
  }
  function kpi(label, value, deltaHtml, extra) {
    return '<div class="card"><div class="k-label">' + esc(label) + '</div><div class="k-value">' + value + '</div>' +
      '<div class="k-delta">' + deltaHtml + (extra ? ' <span class="dim-txt">' + extra + '</span>' : '') + '</div></div>';
  }

  const VERTS = [
    { clave: 'off_plan', nombre: 'Off plan', color: '#16A34A' },
    { clave: 'ready', nombre: 'Ready', color: '#4ADE80' },
    { clave: 'resale', nombre: 'Resale', color: '#10222B' },
  ];

  /** Donut in plain SVG: one arc per slice, a hole in the middle. */
  function donut(slices, centroTitulo, centroValor, size) {
    const s = size || 168, r = s / 2 - 12, cx = s / 2, cy = s / 2;
    const total = slices.reduce((a, x) => a + Number(x.valor || 0), 0);
    const circ = 2 * Math.PI * r;
    let offset = 0;
    const arcos = slices.map((x) => {
      const frac = total > 0 ? Number(x.valor || 0) / total : 0;
      const len = frac * circ;
      const el = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + x.color + '" stroke-width="18" ' +
        'stroke-dasharray="' + len.toFixed(2) + ' ' + (circ - len).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" ' +
        'transform="rotate(-90 ' + cx + ' ' + cy + ')" stroke-linecap="butt"><title>' + esc(x.nombre) + ': ' + Math.round(frac * 100) + '%</title></circle>';
      offset += len;
      return el;
    }).join('');
    const vacio = total > 0 ? '' : '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="18"/>';
    return '<svg class="donut" viewBox="0 0 ' + s + ' ' + s + '" width="' + s + '" height="' + s + '">' + vacio + arcos +
      '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" class="d-cap">' + esc(centroTitulo || '') + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle" class="d-val">' + esc(centroValor || '') + '</text></svg>';
  }

  /** Tower chart: one column per month, stacked by vertical, with its axis. */
  function tituloTorres() {
    return window.innerWidth < 700 ? 'Revenue · 6 months by vertical' : 'Revenue · 12 months by vertical';
  }

  function torres(serie) {
    if (window.innerWidth < 700) serie = serie.slice(-6);
    const totales = serie.map((m) => Number(m.off_plan || 0) + Number(m.ready || 0) + Number(m.resale || 0));
    const max = Math.max(1, ...totales);
    return '<div class="towers">' + serie.map((m, i) => {
      const t = totales[i];
      const alto = t > 0 ? Math.max(4, Math.round((t / max) * 100)) : 2;
      const seg = (v, color, nombre) => {
        const h = t > 0 ? (Number(v || 0) / t) * 100 : 0;
        if (h <= 0) return '';
        return '<div class="seg" style="height:' + h.toFixed(2) + '%;background:' + color + '" title="' + esc(nombre) + ' · ' + aed(v) + '"></div>';
      };
      return '<div class="tow"><div class="cap">' + (t > 0 ? Math.round(t / 100 / 1000) + 'k' : '') + '</div>' +
        '<div class="stack" style="height:' + alto + '%">' +
        seg(m.ready, '#4ADE80', 'Ready') + seg(m.off_plan, '#16A34A', 'Off plan') + seg(m.resale, '#10222B', 'Resale') +
        '</div><div class="lbl">' + mesLabel(m.periodo) + '</div></div>';
    }).join('') + '</div>';
  }

  function tipoClase(tipo) { return tipo === 'lider' ? 'leader' : tipo === 'team_partner' ? 'partner' : 'creator'; }
  function tipoTag(tipo) { return '<span class="tag ' + tipoClase(tipo) + '">' + (tipo === 'lider' ? 'leader' : tipo === 'team_partner' ? 'partner' : 'creator') + '</span>'; }
  function kycPill(kyc) {
    if (!kyc) return '<span class="pill gray">none</span>';
    if (kyc === 'aprobado' || kyc === 'approved') return '<span class="pill green">approved</span>';
    if (kyc === 'rechazado' || kyc === 'rejected') return '<span class="pill red">rejected</span>';
    return '<span class="pill amber">pending</span>';
  }
  /** The registration clock: green inside 72 h, red once KYC is late. */
  function relojPill(c) {
    if (c.reloj === 'ok') return '<span class="pill green">approved</span>';
    if (c.reloj === 'pending') return '<span class="pill green">' + horasTexto(c.horas_restantes) + ' left</span>';
    return '<span class="pill red">' + horasTexto(c.horas_vencidas) + ' late</span>';
  }
  function tick(nombre) { const w = String(nombre || '??').split(/\s+/); return (w[0]?.[0] || '?') + (w[1]?.[0] || ''); }

  async function cargarTablero() {
    try {
      tableroCache = await api('/ustar/tablero' + query({ red }));
    } catch (e) {
      // A network saved by an older version may no longer exist: fall back to all
      // networks instead of leaving the whole dashboard stuck on an error card.
      if (e.status === 404 && red && red !== 'todas') {
        red = 'todas';
        localStorage.setItem(CLAVE_RED, red);
        tableroCache = await api('/ustar/tablero' + query({ red }));
      } else {
        throw e;
      }
    }
    return tableroCache;
  }


/* ---------------- the five screens ---------------- */
async function loadView(name) {
  seccion = name;
  document.querySelectorAll('#ca-tabs a').forEach((a) => a.classList.toggle('on', a.getAttribute('data-v') === name));
  const v = $('#ca-views');
  if (!v) return undefined;
  v.innerHTML = '<div class="ca-cargando">Loading…</div>';
  try {
    if (name === 'overview') v.innerHTML = await renderOverview();
    else if (name === 'revenue') v.innerHTML = await renderRevenue();
    else if (name === 'creators') { v.innerHTML = await renderCreators(); bindCreators(); }
    else if (name === 'action') { v.innerHTML = await renderAction(); }
    else if (name === 'messages') { v.innerHTML = await renderMessages(); bindMessages(); }
    bindCommon();
    await refreshBadge();
  } catch (e) {
    if (e.status === 401 || e.status === 403) { store.clear(); location.hash = '#/login'; return undefined; }
    v.innerHTML = '<div class="ca-error">' + esc(e.message) + '</div>';
  }
  return undefined;
}

  /* ---------------- network selector ---------------- */
  function barraRedes(d) {
    // USTAR works as one line: its own. Leaders are segments chosen in the Leaders selector,
    // never extra chips, so the bar can not show the same network twice.
    const totalRed = (d.redes || []).reduce((a, r) => a + r.creadores, 0);
    const chips = ['<button class="chipbtn' + (!d.seleccion ? ' on' : '') + '" data-red="todas">Direct line ' +
      '<span class="mono">DIRECT</span> <b>' + totalRed + '</b></button>'];
    const lideres = d.lideres || [];
    const activo = d.seleccion && lideres.some((l) => l.codigo === d.seleccion.codigo) ? d.seleccion.codigo : null;
    const cuerpo = lideres.length
      ? lideres.map((l) => {
          const marca = l.codigo === activo;
          return '<button class="ldrrow' + (marca ? ' on' : '') + '" data-red="' + esc(l.codigo) + '">' +
            '<span class="ldrwho"><i class="ldrav">' + esc((l.nombre || l.codigo).trim().charAt(0).toUpperCase()) + '</i>' +
            '<span class="ldrnm"><b>' + esc(l.nombre) + '</b><em>' + esc(l.codigo) + (l.activo ? '' : ' · paused') + '</em></span></span>' +
            '<span class="ldrv"><b>' + (l.seguidores ? compact(l.seguidores) : '—') + '</b><em>followers</em></span>' +
            '<span class="ldrv"><b>' + l.creadores + '</b><em>creators</em></span>' +
            '<span class="ldrv"><u class="ldrk">Own sales</u><b>' + aedk(l.fils_personales) + '</b><em>' + l.ventas_personales + ' sales</em></span>' +
            '<span class="ldrv"><u class="ldrk">Team sales</u><b>' + aedk(l.fils_equipo) + '</b><em>' + l.ventas_equipo + ' sales</em></span>' +
            '<span class="ldrgo">' + (marca ? '✓' : '→') + '</span>' +
            '</button>';
        }).join('')
      : '<div class="ldrempty">No leaders yet. A code of type leader appears here as soon as it exists.</div>';
    const rotulo = activo
      ? (lideres.find((l) => l.codigo === activo) || {}).nombre + ' · ' + ((lideres.find((l) => l.codigo === activo) || {}).creadores || 0) + ' creators'
      : 'Choose a leader';
    return '<div class="netbar"><span class="netbar-lab">Network</span>' + chips.join('') +
      (d.seleccion ? '<span class="netsel">Showing <b>' + esc(d.seleccion.nombre) + '</b> only</span>' : '<span class="netsel">Whole agency</span>') + '</div>' +
      '<div class="netbar ldrbar"><span class="netbar-lab">Leaders</span>' +
      '<div class="ldrwrap">' +
      '<button class="ldrbtn' + (activo ? ' on' : '') + '" id="ldr-btn" aria-haspopup="true" aria-expanded="false">' +
      '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M4 20a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>' +
      '<span class="ldrbtn-t">' + esc(rotulo) + '</span>' +
      '<b class="ldrbtn-n">' + lideres.length + '</b>' +
      '<svg class="ldrchev" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>' +
      '</button>' +
      '<div class="ldrmenu" id="ldr-menu" hidden>' +
      '<div class="ldrhead"><div class="ldrtitle">Leaders <span>' + lideres.length + ' in the agency</span></div>' +
      '<div class="ldrhint">Followers, creators under each leader, and sales of their own code against their team.</div></div>' +
      '<div class="ldrcols"><span>Leader</span><span>Followers</span><span>Creators</span><span>Own sales</span><span>Team sales</span></div>' +
      cuerpo +
      (activo ? '<button class="ldrall" data-red="todas">Show all networks</button>' : '') +
      '</div></div>' +
      '</div>';
  }

  /* ---------------- Overview ---------------- */
  const ESTADOS = {
    business_completion_approved: 'Completion approved',
    payment_pending: 'Payment pending',
    draft: 'Draft',
    reserved: 'Reserved',
    cancelled: 'Cancelled',
  };
  const CAM_ESTADO = { activa: 'green', planificada: 'gray', finalizada: 'gray', pausada: 'amber' };
  const CAM_TXT = { activa: 'Active', planificada: 'Scheduled', finalizada: 'Completed', pausada: 'Paused' };

  function pctTxt(n) { return (Math.round(Number(n || 0) * 10) / 10).toFixed(1).replace(/\.0$/, '') + '%'; }

  /** The three-step funnel: visits, buyer intentions, closed sales. */
  function embudoHtml(e) {
    const paso = (n, valor, delta, nota, color, ancho) =>
      '<div class="fstep"><div class="fl">' + n + '</div><div class="fv">' + valor + '</div>' +
      '<div class="fd">' + delta + '</div><div class="fbar"><i style="width:' + ancho + '%;background:' + color + '"></i></div>' +
      '<div class="fnote">' + nota + '</div></div>';
    const max = Math.max(1, e.visitas.valor || 0);
    return '<div class="funnel">' +
      paso('Visits', compact(e.visitas.valor), deltaChip(e.visitas), compact(e.visitas.total) + ' all time', '#94A3B8', 100) +
      '<div class="farrow">→<span class="fconv">' + pctTxt(e.conv_visita_lead) + '</span></div>' +
      paso('Buyer intentions', compact(e.leads.valor), deltaChip(e.leads), compact(e.leads.total) + ' all time', '#16A34A', (e.leads.valor / max) * 100) +
      '<div class="farrow">→<span class="fconv">' + pctTxt(e.conv_lead_venta) + '</span></div>' +
      paso('Closed sales', String(e.ventas.valor), deltaChip(e.ventas), aedk(e.fils_30d) + ' earned', '#10222B', (e.ventas.valor / max) * 100) +
      '</div>' +
      '<div class="fsum"><span>Visit→sale <b>' + pctTxt(e.conv_visita_venta) + '</b></span>' +
      '<span>Intent→sale <b>' + pctTxt(e.conv_lead_venta) + '</b></span>' +
      '<span>Revenue 30d <b>' + aed(e.fils_30d) + '</b> ' + deltaChip({ delta_pct: e.fils_previo > 0 ? Math.round(((e.fils_30d - e.fils_previo) / e.fils_previo) * 1000) / 10 : null }) + '</span></div>';
  }

  function campanasTabla(camp, compacta) {
    const rows = (camp.lista || []).filter((c) => !compacta || c.estado === 'activa' || c.fils > 0).map((c) =>
      '<tr><td><div class="cn">' + esc(c.nombre) + '</div><div class="cd2">' + (c.alcance === 'todos' ? 'All creators · every code' : esc(c.creador || '—') + ' · ' + esc(c.codigo)) + ' · ' + esc(c.plataforma || '—') + '</div></td>' +
      '<td class="dim">' + esc((c.inicia_en || '').slice(5)) + ' → ' + esc((c.termina_en || '').slice(5)) + '</td>' +
      '<td><span class="pill ' + (CAM_ESTADO[c.estado] || 'gray') + '">' + esc(c.estado) + '</span></td>' +
      '<td class="num">' + aedk(c.gastado) + '<div class="cd2">of ' + aedk(c.presupuesto) + '</div></td>' +
      '<td class="num">' + compact(c.visitas) + '</td>' +
      '<td class="num">' + c.ventas + '</td>' +
      '<td class="num">' + aedk(c.fils) + '</td>' +
      '<td class="num">' + (c.roas === null ? '<span class="dim-txt">—</span>' : '<b>' + c.roas.toFixed(1) + '×</b>') + '</td></tr>').join('');
    const res = camp.resumen || {};
    return '<div class="csum">' +
      '<div><div class="l">Live campaigns</div><div class="v">' + (res.activas || 0) + ' <span class="dim-txt">of ' + (res.total || 0) + '</span></div></div>' +
      '<div><div class="l">Media spend</div><div class="v">' + aed(res.gastado) + '</div></div>' +
      '<div><div class="l">Sales attributed</div><div class="v">' + (res.ventas || 0) + '</div></div>' +
      '<div><div class="l">Revenue / ROAS</div><div class="v">' + aedk(res.fils) + ' <span class="dim-txt">' + (res.roas || 0).toFixed(1) + '×</span></div></div>' +
      '</div>' +
      '<div class="tblwrap"><table><thead><tr><th>Campaign</th><th>Window</th><th>Status</th><th>Spend</th><th>Visits</th><th>Sales</th><th>Revenue</th><th>ROAS</th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td class="dim">No campaigns yet</td></tr>') + '</tbody></table></div>';
  }

  function topCreadoresHtml(lista, total) {
    const rows = (lista || []).map((c) => {
      const ancho = total > 0 ? Math.max(2, (c.fils / total) * 100) : 0;
      return '<div class="brow"><div><div class="bn">' + esc(c.nombre || c.codigo) + '</div>' +
        '<div class="bd">' + esc(c.codigo) + ' · ' + c.ventas + ' sales · ' + pctTxt(c.conv_pct) + ' visit→sale</div></div>' +
        '<div class="bv">' + aedk(c.fils) + '<div class="bd">' + pctTxt(c.share_pct) + ' of network</div></div>' +
        '<div class="bbar"><i style="width:' + ancho.toFixed(1) + '%"></i></div></div>';
    }).join('');
    return '<div class="blist">' + (rows || '<div class="empty">No sales in this scope yet.</div>') + '</div>';
  }

  async function renderOverview() {
    const d = await cargarTablero();
    creadoresCache = d.creadores || [];
    const ing = d.ingresos || {}, por = ing.por_vertical || {};
    const c = d.contadores || {};
    const a = d.analitica || {};
    const e = a.embudo || { visitas: {}, leads: {}, ventas: {} };
    const totalV = Math.max(1, Number(ing.total_fils || 0));
    const pctReady = Math.round((Number((por.ready || {}).fils || 0) / totalV) * 100);
    const pctOff = Math.round((Number((por.off_plan || {}).fils || 0) / totalV) * 100);

    const filasVert = VERTS.map((v) => {
      const x = por[v.clave] || { fils: 0, ventas: 0 };
      const pct = Math.round((Number(x.fils) / totalV) * 1000) / 10;
      return '<div class="vrow"><span class="vdot" style="background:' + v.color + '"></span>' +
        '<span class="vname">' + v.nombre + '</span>' +
        '<span class="vbar"><i style="width:' + Math.max(0, pct) + '%;background:' + v.color + '"></i></span>' +
        '<span class="vamt">' + aed(x.fils) + '</span><span class="vpct">' + pct.toFixed(1) + '%</span>' +
        '<span class="vcount">' + x.ventas + ' sales</span></div>';
    }).join('');

    const donutVert = donut(VERTS.map((v) => ({ nombre: v.nombre, color: v.color, valor: Number((por[v.clave] || {}).fils || 0) })), 'Total', aedk(ing.total_fils));
    const regions = (a.regiones || []).filter((r) => r.fils > 0 || r.creadores > 1).slice(0, 5);
    const colores = ['#16A34A', '#22C55E', '#10222B', '#4ADE80', '#94A3B8'];
    const donutGeo = donut(regions.map((r, i) => ({ nombre: r.region, color: colores[i % 5], valor: r.fils })), 'Markets', String(regions.length));

    const pipeline = (a.pipeline || []).map((p) =>
      '<div class="prow"><span>' + esc(ESTADOS[p.estado] || p.estado) + '</span><b>' + compact(p.n) + '</b>' +
      '<span class="dim-txt">' + aedk(p.fils) + '</span></div>').join('');

    const kycLate = (d.creadores || []).filter((x) => x.reloj === 'overdue').sort((a2, b2) => b2.horas_vencidas - a2.horas_vencidas);
    const kycSoon = (d.creadores || []).filter((x) => x.reloj === 'pending').sort((a2, b2) => a2.horas_restantes - b2.horas_restantes);
    const kycLista = kycLate.concat(kycSoon).slice(0, 5).map((x) =>
      '<div class="krow">' +
      '<div class="kinfo"><div class="kn">' + esc(x.nombre) + '</div><div class="kc">' + esc(x.codigo) + ' · registered ' + horasTexto(x.registro_horas) + ' ago</div></div>' +
      relojPill(x) +
      '<div class="kbtns">' +
      '<button class="mini' + (x.reloj === 'overdue' ? ' mini-red' : '') + '" data-msg="' + esc(x.codigo) + '" data-tpl="' + (x.reloj === 'overdue' ? 'recordar_kyc' : 'pedir_kyc') + '" title="Message BlockEstate">' + IC_MSG + '</button>' +
      '</div></div>').join('');

    const filas = (d.creadores || []).slice(0, 8).map((x) =>
      '<tr><td class="code">' + esc(x.codigo) + '</td><td>' + esc(x.nombre || '—') + ' ' + tipoTag(x.tipo) + '</td>' +
      '<td>' + kycPill(x.kyc_estado) + '</td><td>' + (x.reloj === 'ok' ? '<span class="dim-txt">—</span>' : relojPill(x)) + '</td>' +
      '<td class="num">' + compact(x.visitas_30d) + '</td><td class="num">' + (x.ventas || 0) + '</td>' +
      '<td class="num">' + aedk(x.devengado_fils) + '</td>' +
      '<td class="right"><button class="mini eye" data-eye="' + esc(x.codigo) + '" title="Open summary">' + IC_EYE + '</button></td></tr>'
    ).join('');

    const totalRed = (a.top_creadores || []).reduce((s2, x) => s2 + x.fils, 0) || Number(ing.total_fils || 0);

    return head(
      'Your revenue line, the funnel behind it and the campaigns that move it. Read-only — you never approve a KYC; that stays with BlockEstate.') +
      barraRedes(d) +
      '<div class="kpis">' +
      kpi('Accrued revenue', aed(ing.devengado_fils), '<span class="dlt flat">' + pctOff + '% off plan · ' + pctReady + '% ready</span>', 'all time') +
      kpi('Last 30 days', aed((c.devengado_30d || {}).valor), deltaChip(c.devengado_30d), 'vs ' + aedk((c.devengado_30d || {}).previo)) +
      kpi('Sales closed', String(ing.ventas || 0), deltaChip(c.ventas_30d), (c.ventas_30d || {}).valor + ' in the last 30d') +
      kpi('Active network', String((c.creadores || {}).valor || 0), '<span class="dlt up">+' + ((c.creadores || {}).nuevos_30d || 0) + ' joined · 30d</span>', 'CR ' + contarTipo(d.creadores, 'creador') + ' · TP ' + contarTipo(d.creadores, 'team_partner') + ' · LD ' + contarTipo(d.creadores, 'lider')) +
      '</div>' +
      '<div class="panel"><h2>Funnel · last 30 days<span class="count">' + (a.campanas && a.campanas.resumen ? a.campanas.resumen.activas : 0) + ' live campaigns</span></h2>' +
      embudoHtml(e) +
      '<div class="pipe"><h2 style="margin:1.4rem 0 .5rem">Lead pipeline · all time</h2>' + (pipeline || '<div class="empty">No buyer intentions yet.</div>') + '</div>' +
      '<div class="panel-note">Visits are creator-code traffic; a buyer intention is a purchase started on a unit with that code; a closed sale is a commission line. Intention→sale is high because the catalogue collects the intention at the reservation step.</div></div>' +
      '<div class="cols">' +
      '<div class="panel"><h2>Revenue by vertical</h2>' + filasVert +
      '<div class="panel-note">Resale pays on the secondary desk; this line only shows what has settled through your codes.</div>' +
      '<h2 style="margin-top:1.6rem">' + tituloTorres() + '</h2>' +
      '<div class="legend small">' + VERTS.map((v) => '<span><span class="dot" style="background:' + v.color + '"></span>' + v.nombre + '</span>').join('') + '</div>' +
      torres(d.serie_mensual || []) + '</div>' +
      '<div class="panel"><h2>Vertical mix</h2><div class="donut-wrap">' + donutVert +
      '<div class="d-legend">' + VERTS.map((v) => '<div><span class="dot" style="background:' + v.color + '"></span>' + v.nombre + ' <b>' + aedk((por[v.clave] || {}).fils) + '</b></div>').join('') + '</div></div>' +
      '<h2 style="margin-top:1.4rem">Markets</h2><div class="donut-wrap">' + donutGeo +
      '<div class="d-legend">' + (regions.map((r, i) => '<div><span class="dot" style="background:' + colores[i % 5] + '"></span>' + esc(r.region) + ' <b>' + aedk(r.fils) + '</b></div>').join('') || '<div class="empty">No markets yet</div>') + '</div></div>' +
      '</div></div>' +
      '<div class="panel"><div class="cam-head"><h2>Campaign performance<span class="count">' + ((a.campanas || {}).resumen || {}).total + '</span></h2>' +
      '<button class="btn sm" id="btn-nueva-campana">+ New campaign</button></div>' +
      campanasTabla(a.campanas || { lista: [], resumen: {} }) + '</div>' +
      '<div class="cols">' +
      '<div class="panel"><h2>Top creators by revenue</h2>' + topCreadoresHtml(a.top_creadores, totalRed) + '</div>' +
      '<div class="panel"><h2>KYC clock<span class="count red">' + kycLate.length + ' late</span></h2>' +
      '<p class="panel-note" style="margin-bottom:.9rem">Every creator has 72 h from registration to clear KYC. Green inside the window; red once it lapses — that is BlockEstate’s queue, and you can push it.</p>' +
      (kycLista || '<div class="empty">Every creator in this network is verified.</div>') + '</div>' +
      '</div>' +
      '<div class="panel"><h2>Creator network<span class="count">' + (d.creadores || []).length + '</span></h2>' +
      '<div class="tblwrap"><table><thead><tr><th>Code</th><th>Creator</th><th>KYC</th><th>Clock</th><th>30d traffic</th><th>Sales</th><th>Earned</th><th></th></tr></thead>' +
      '<tbody>' + (filas || '<tr><td class="dim">No creators in this network</td></tr>') + '</tbody></table></div></div>';
  }

  /* ---------------- My revenue ---------------- */
  async function renderRevenue() {
    const [d, rep, r] = await Promise.all([cargarTablero(), api('/ustar/reparto' + query({ red })), api('/ustar/ingresos?limite=25')]);
    const t = rep.totales || {};
    const lineas = r.lineas || [];
    const curMes = new Date().toISOString().slice(0, 7);
    const esteMes = lineas.filter((l) => (l.creada_en || '').slice(0, 7) === curMes).reduce((s2, l) => s2 + Number(l.monto_fils), 0);
    const por = (d.ingresos || {}).por_vertical || {};
    const a = d.analitica || {};

    const filasVert = VERTS.map((v) => {
      const x = por[v.clave] || { fils: 0, ventas: 0 };
      const pct = Number(t.devengado_fils || 0) > 0 ? (Number(x.fils) / Number(t.devengado_fils)) * 100 : 0;
      return '<div class="vrow"><span class="vdot" style="background:' + v.color + '"></span><span class="vname">' + v.nombre + '</span>' +
        '<span class="vbar"><i style="width:' + pct.toFixed(1) + '%;background:' + v.color + '"></i></span>' +
        '<span class="vamt">' + aed(x.fils) + '</span><span class="vpct">' + pct.toFixed(1) + '%</span><span class="vcount">' + x.ventas + ' sales</span></div>';
    }).join('');

    const conVentas = (rep.creadores || []).filter((f) => f.ventas > 0);
    const sinVentas = (rep.creadores || []).length - conVentas.length;
    const creadores = conVentas.map((f) =>
      '<tr><td class="code">' + esc(f.codigo) + '</td><td>' + esc(f.nombre || '—') + ' ' + tipoTag(f.tipo) + '<div class="cd2">' + esc(f.region || '—') + (f.seguidores > 0 ? ' · ' + compact(f.seguidores) + ' followers' : '') + '</div></td>' +
      '<td class="num">' + f.ventas + '</td><td class="num">' + aed(f.fils) + '</td>' +
      '<td class="num">' + pctTxt(f.share_pct) + '</td><td class="num">' + aed(f.ticket) + '</td>' +
      '<td class="num">' + aed(f.ganado_fils) + '</td>' +
      '<td class="num">' + (f.pendiente_fils > 0 ? '<span class="pill amber">' + aed(f.pendiente_fils) + ' due</span>' : '<span class="pill green">paid</span>') + '</td>' +
      '<td class="right"><button class="mini eye" data-eye="' + esc(f.codigo) + '" title="Open summary">' + IC_EYE + '</button></td></tr>').join('');

    const rows = lineas.slice(0, 12).map((l) =>
      '<tr><td class="dim">' + esc((l.creada_en || '').slice(0, 10)) + '</td>' +
      '<td>' + esc(l.unidad_titulo || l.referencia || '—') + '</td>' +
      '<td>' + esc(l.canal || '—') + '</td>' +
      '<td class="num">' + aed(l.base_fils) + '</td>' +
      '<td>' + (Number(l.valor_pb) / 100).toFixed(2) + '%</td>' +
      '<td class="num"><b>' + aed(l.monto_fils) + '</b></td></tr>').join('');

    const campanas = (a.campanas || {}).lista || [];
    const campFilas = campanas.filter((c) => c.ventas > 0).map((c) =>
      '<tr><td><div class="cn">' + esc(c.nombre) + '</div><div class="cd2">' + esc(c.creador || '—') + ' · ' + esc(c.codigo) + '</div></td>' +
      '<td class="num">' + aed(c.gastado) + '</td><td class="num">' + c.ventas + '</td>' +
      '<td class="num">' + aed(c.fils) + '</td><td class="num">' + (c.roas === null ? '—' : c.roas.toFixed(1) + '×') + '</td>' +
      '<td class="num">' + (c.cpa ? aed(c.cpa) : '—') + '</td></tr>').join('');

    return head(
      'Everything this network has earned you, what each creator earned with it, and what has already been paid out.') +
      barraRedes(rep) +
      '<div class="kpis">' +
      kpi('Total earned', aed(t.devengado_fils), '<span class="dlt flat">' + (t.ventas || 0) + ' sales · ' + (t.creadores_con_venta || 0) + ' creators</span>', t.creadores + ' in scope') +
      kpi('This month', aed(esteMes), deltaChip((d.contadores || {}).devengado_30d), 'last 30d ' + aed((d.contadores || {}).devengado_30d ? d.contadores.devengado_30d.valor : 0)) +
      kpi('Average per sale', aed(t.ticket_medio), '<span class="dlt flat">0.80% of the sale price</span>', t.mejor_mes ? 'best ' + mesLabel(t.mejor_mes.periodo) + ' · ' + aedk(t.mejor_mes.fils) : '') +
      kpi('Property sold', aedk(t.base_fils), '<span class="dlt flat">' + aed(t.ventas > 0 ? Math.round(t.base_fils / t.ventas) : 0) + ' average ticket</span>', 'on ' + (t.ventas || 0) + ' closed sales') +
      '</div>' +
      '<div class="panel"><h2>Earnings per creator<span class="count">' + (rep.creadores || []).length + '</span></h2>' +
      '<div class="tblwrap"><table class="wide"><thead><tr><th>Code</th><th>Creator</th><th>Sales</th><th>Your revenue</th><th>Share of line</th><th>Average / sale</th><th>Creator commission</th><th>Creator payout</th><th></th></tr></thead>' +
      '<tbody>' + (creadores || '<tr><td class="dim">No sales yet</td></tr>') + '</tbody></table></div>' +
      (sinVentas > 0 ? '<div class="panel-note">' + sinVentas + ' codes in this scope have not closed a sale yet — they are counted in the network, not in this ledger.</div>' : '') +
      '<div class="panel-note">“Your revenue” is the USTAR line frozen on each sale. The creator commission is the 3% the developer pays on their own code — it never leaves your line, so the two columns are separate ledgers, not a split.</div></div>' +
      '<div class="cols">' +
      '<div class="panel"><h2>Split by vertical</h2>' + filasVert +
      '<h2 style="margin-top:1.4rem">Monthly earnings</h2>' +
      '<div class="legend small">' + VERTS.map((v) => '<span><span class="dot" style="background:' + v.color + '"></span>' + v.nombre + '</span>').join('') + '</div>' +
      torres(d.serie_mensual || []) +
      '<div class="feet" style="margin-top:1rem"><div><span class="l">Best month</span><span class="v">' + (t.mejor_mes ? mesLabel(t.mejor_mes.periodo) + ' · ' + aedk(t.mejor_mes.fils) : '—') + '</span></div>' +
      '<div><span class="l">Sales</span><span class="v">' + (t.mejor_mes ? t.mejor_mes.ventas : 0) + '</span></div>' +
      '<div><span class="l">Creator commissions</span><span class="v">' + aedk(t.ganado_creadores_fils) + '</span></div></div>' +
      '</div></div>' +
      '<div class="panel"><h2>Campaigns that paid you<span class="count">' + campanas.filter((c) => c.ventas > 0).length + '</span></h2>' +
      '<div class="tblwrap"><table><thead><tr><th>Campaign</th><th>Spend</th><th>Sales</th><th>Revenue</th><th>ROAS</th><th>Cost / sale</th></tr></thead>' +
      '<tbody>' + (campFilas || '<tr><td class="dim">No campaign has closed a sale yet</td></tr>') + '</tbody></table></div></div>' +
      '<div class="panel"><h2>Latest sales that paid you<span class="count">latest ' + Math.min(12, lineas.length) + '</span></h2>' +
      '<div class="tblwrap"><table><thead><tr><th>Date</th><th>Unit</th><th>Channel</th><th>Sale value</th><th>Your line</th><th>Amount</th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td class="dim">No sales yet</td></tr>') + '</tbody></table></div></div>';
  }

  /* ---------------- Creators (network) ---------------- */
  async function renderCreators() {
    const url = '/ustar/influencers' + query(filtrosCreadores);
    const [infl, redArbol, todos, d, bandeja] = await Promise.all([
      api(url),
      api('/ustar/red'),
      todosInflCache ? Promise.resolve(todosInflCache) : api('/ustar/influencers').then((x) => { todosInflCache = x || []; return todosInflCache; }),
      cargarTablero(),
      cargarBandeja(),
    ]);
    const porCodigo = new Map((d.creadores || []).map((x) => [x.codigo, x]));
    const porMensaje = new Map((bandeja.creadores || []).map((x) => [x.codigo, x]));
    const list = (infl || []).map((f) => {
      const stat = porCodigo.get(f.codigo);
      const mensaje = porMensaje.get(f.codigo);
      return '<div class="row ' + tipoClase(f.tipo) + '" data-codigo="' + esc(f.codigo) + '">' +
        '<div class="tick">' + esc(tick(f.nombre || f.codigo)) + '</div>' +
        '<div class="info"><div class="nm">' + esc(f.nombre || f.codigo) + ' ' + tipoTag(f.tipo) + '</div>' +
        '<div class="cd">' + esc(f.handle || '—') + ' · ' + esc(f.plataforma || '—') + ' · ' + compact(f.seguidores) + ' followers · ' + esc(f.pais || '—') + '</div>' +
        (mensaje && mensaje.ultimo ? '<div class="rowmsg">' + esc(mensaje.ultimo.autor === 'creador' ? 'Reply' : 'You') + ': ' + esc(String(mensaje.ultimo.asunto || mensaje.ultimo.cuerpo).slice(0, 64)) + ' · ' + horaCorta(mensaje.ultimo.enviado_en) + '</div>' : '') +
        '</div>' +
        (stat && stat.reloj !== 'ok' ? '<div class="rowclock">' + relojPill(stat) + '</div>' : '') +
        '<div class="rowacts"><button class="mini chat' + (mensaje && mensaje.no_leidos ? ' mini-green' : '') + '" data-chat="' + esc(f.codigo) + '" title="Message this creator">' + IC_MSG + (mensaje && mensaje.no_leidos ? '<span class="dotn">' + mensaje.no_leidos + '</span>' : '') + '</button>' +
        '<button class="mini eye" data-eye="' + esc(f.codigo) + '" title="Open summary">' + IC_EYE + '</button></div>' +
        '</div>';
    }).join('');
    const roots = (redArbol && (redArbol.arbol || redArbol.raices)) || [];
    const tree = roots.length ? roots.map(renderNode).join('') : '<div class="empty">No influencers yet.</div>';
    const first = roots[0];
    const barra =
      '<div class="searchbar">' +
      '<input id="f-q" placeholder="Search by name, handle or code…" value="' + esc(filtrosCreadores.q) + '">' +
      selectFiltro(todos, 'pais', 'Country', filtrosCreadores.pais) +
      selectFiltro(todos, 'region', 'Region', filtrosCreadores.region) +
      selectFiltro(todos, 'industria', 'Industry', filtrosCreadores.industria) +
      selectFiltro(todos, 'plataforma', 'Platform', filtrosCreadores.plataforma) +
      '<button class="btn" id="f-buscar">Search</button>' +
      '<button class="btn ghost" id="f-limpiar">Reset</button>' +
      '<button class="btn" id="btn-msg-all">' + IC_MSG + ' Message all</button>' +
      '<button class="btn" id="btn-nuevo-lider" style="background:#10222B;color:#22C55E">+ New leader</button>' +
      '</div>';
    return head(
      'All influencers. Search by country, region, industry or platform. The eye opens the summary, the clock is the 72-hour KYC window.') +
      barraRedes(d) + barra +
      '<div class="legend">' +
      '<span><span class="dot leader"></span> Leader</span>' +
      '<span><span class="dot partner"></span> Team partner</span>' +
      '<span><span class="dot creator"></span> Creator</span></div>' +
      '<div class="wrap2">' +
      '<div class="panel listp"><div class="phead">All influencers <span class="n">' + (infl || []).length + '</span></div>' +
      '<div class="list">' + (list || '<div class="empty">No influencers.</div>') + '</div></div>' +
      '<div class="panel"><div class="phead">' + esc(first ? (first.nombre || first.codigo) : '—') + ' · tree <span class="n">' + roots.length + ' root(s)</span></div>' +
      '<div class="tree">' + tree + '</div></div>' +
      '</div>';
  }
  function renderNode(n) {
    const kids = (n.hijos && n.hijos.length) ? '<div class="children">' + n.hijos.map(renderNode).join('') + '</div>' : '';
    return '<div class="node ' + tipoClase(n.tipo) + '">' +
      '<div class="top"><div><div class="nm">' + esc(n.nombre || n.codigo) + ' ' + tipoTag(n.tipo) + '</div>' +
      '<div class="cd">' + esc(n.codigo) + '</div></div>' +
      '<div class="earn">' + aed(n.devengado_fils) + '</div></div>' +
      '<div class="meta"><span>' + (n.ventas || 0) + ' sales</span><span>KYC ' + kycPill(n.kyc) + '</span></div>' + kids + '</div>';
  }
  function bindCreators() {
    document.querySelectorAll('.row[data-codigo]').forEach((r) => r.addEventListener('click', (ev) => {
      if (ev.target.closest('button')) return;
      document.querySelectorAll('.row[data-codigo]').forEach((x) => x.classList.remove('sel'));
      r.classList.add('sel');
      api('/ustar/influencers/' + encodeURIComponent(r.getAttribute('data-codigo'))).then(renderProfile).catch(() => {});
    }));
    const aplicar = () => {
      filtrosCreadores = {
        q: $('#f-q') ? $('#f-q').value.trim() : '',
        pais: $('#f-pais') ? $('#f-pais').value : '',
        region: $('#f-region') ? $('#f-region').value : '',
        industria: $('#f-industria') ? $('#f-industria').value : '',
        plataforma: $('#f-plataforma') ? $('#f-plataforma').value : '',
      };
      loadView('creators');
    };
    const b = $('#f-buscar'); if (b) b.addEventListener('click', aplicar);
    const r = $('#f-limpiar'); if (r) r.addEventListener('click', () => { filtrosCreadores = { q: '', pais: '', region: '', industria: '', plataforma: '' }; loadView('creators'); });
    const i = $('#f-q'); if (i) i.addEventListener('keydown', (e) => { if (e.key === 'Enter') aplicar(); });
    const n = $('#btn-nuevo-lider'); if (n) n.addEventListener('click', abrirFormLider);
    const m = $('#btn-msg-all'); if (m) m.addEventListener('click', abrirMasivo);
  }
  function abrirFormLider() {
    const v = $('#ca-views');
    v.insertAdjacentHTML('beforeend',
      '<div class="modal ca-scope" id="modal-lider"><div class="modal-card">' +
      '<div class="modal-title">New leader</div>' +
      '<p>Leaders are onboarded and signed by USTAR first — they then build the creator network below them.</p>' +
      '<div class="leader-form">' +
      '<div class="field full"><label>Name</label><input id="l-nombre"></div>' +
      '<div class="field"><label>Code</label><input id="l-codigo" placeholder="LDR-0003"></div>' +
      '<div class="field"><label>Email</label><input id="l-correo" type="email"></div>' +
      '<div class="field"><label>Country</label><input id="l-pais" placeholder="UAE"></div>' +
      '<div class="field"><label>Region</label><input id="l-region" placeholder="MENA"></div>' +
      '<div class="field"><label>Industry</label><input id="l-industria" placeholder="Real Estate"></div>' +
      '<div class="field"><label>Handle</label><input id="l-handle" placeholder="@leader"></div>' +
      '<div class="field"><label>Platform</label><input id="l-plataforma" placeholder="Instagram"></div>' +
      '<div class="field"><label>Followers</label><input id="l-seguidores" type="number" value="0"></div>' +
      '<div class="actions"><button class="btn ghost" style="width:auto" id="l-cancelar">Cancel</button><button class="btn" style="width:auto" id="l-crear">Create &amp; sign</button></div>' +
      '</div></div></div>');
    $('#l-cancelar').addEventListener('click', () => $('#modal-lider').remove());
    $('#l-crear').addEventListener('click', crearLider);
  }
  async function crearLider() {
    const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const body = {
      nombre: g('l-nombre'), codigo: g('l-codigo'), correo: g('l-correo') || null,
      pais: g('l-pais') || null, region: g('l-region') || null, industria: g('l-industria') || null,
      handle: g('l-handle') || null, plataforma: g('l-plataforma') || null, seguidores: Number(g('l-seguidores') || 0),
    };
    if (!body.nombre || !body.codigo) return toast('Name and code are required.');
    try {
      await api('/ustar/lideres', { method: 'POST', body });
      $('#modal-lider').remove();
      await loadView('creators');
    } catch (e) { toast('Could not create leader: ' + e.message); }
  }

  /* ---------------- new campaign ---------------- */
  function abrirFormCampana() {
    if (document.getElementById('modal-campana')) return;
    const hoy = new Date().toISOString().slice(0, 10);
    const fin = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const creadores = (creadoresCache || [])
      .filter((c) => c.codigo)
      .sort((a, b) => String(a.nombre || a.codigo).localeCompare(String(b.nombre || b.codigo)))
      .map((c) => '<option value="' + esc(c.codigo) + '">' + esc(c.nombre || c.codigo) + ' · ' + esc(c.codigo) + '</option>').join('');
    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal ca-scope" id="modal-campana"><div class="modal-card wide">' +
      '<div class="modal-title">New campaign</div>' +
      '<p>Aim it at one creator or at the whole network. Budget and window are yours to set; visits, sales and revenue are read from what actually happens inside them.</p>' +
      '<div class="camp-form">' +
      '<div class="field full"><label>Campaign name</label><input id="cm-nombre" placeholder="Ramadan off-plan push" maxlength="120"></div>' +
      '<div class="field"><label>Audience</label><select id="cm-alcance"><option value="todos">All creators · every code</option><option value="creador">One creator</option></select></div>' +
      '<div class="field" id="cm-creador-wrap" style="display:none"><label>Creator</label><select id="cm-creador">' + (creadores || '<option value="">No creators in this network</option>') + '</select></div>' +
      '<div class="field"><label>Vertical</label><select id="cm-vertical"><option value="off_plan">Off plan</option><option value="ready">Ready</option><option value="resale">Resale</option></select></div>' +
      '<div class="field"><label>Platform</label><select id="cm-plataforma"><option value="Instagram">Instagram</option><option value="TikTok">TikTok</option><option value="YouTube">YouTube</option><option value="X">X</option><option value="LinkedIn">LinkedIn</option><option value="Meta Ads">Meta Ads</option><option value="Google">Google</option><option value="">Not set</option></select></div>' +
      '<div class="field"><label>Objective</label><select id="cm-objetivo"><option value="sales">Sales</option><option value="leads">Leads</option><option value="traffic">Traffic</option><option value="awareness">Awareness</option></select></div>' +
      '<div class="field"><label>Status</label><select id="cm-estado"><option value="activa">Active now</option><option value="planificada">Planned</option></select></div>' +
      '<div class="field"><label>Budget (AED)</label><input id="cm-presupuesto" type="number" min="0" step="1000" value="25000"></div>' +
      '<div class="field"><label>Spend so far (AED)</label><input id="cm-gastado" type="number" min="0" step="1000" value="0"></div>' +
      '<div class="field"><label>Starts</label><input id="cm-inicio" type="date" value="' + hoy + '"></div>' +
      '<div class="field"><label>Ends</label><input id="cm-fin" type="date" value="' + fin + '"></div>' +
      '<div class="actions"><button class="btn ghost" style="width:auto" id="cm-cancelar">Cancel</button><button class="btn" style="width:auto" id="cm-crear">Create campaign</button></div>' +
      '</div></div></div>');
    $('#cm-alcance').addEventListener('change', () => {
      const uno = $('#cm-alcance').value === 'creador';
      $('#cm-creador-wrap').style.display = uno ? '' : 'none';
      if (uno) $('#cm-creador').focus();
    });
    $('#cm-cancelar').addEventListener('click', () => $('#modal-campana').remove());
    $('#cm-crear').addEventListener('click', crearCampanaForm);
    $('#cm-nombre').focus();
  }

  async function crearCampanaForm() {
    const g = (id) => { const el = document.getElementById(id); return el ? String(el.value).trim() : ''; };
    const alcance = g('cm-alcance') === 'creador' ? 'creador' : 'todos';
    const body = {
      nombre: g('cm-nombre'),
      alcance,
      codigo: alcance === 'creador' ? g('cm-creador') : null,
      vertical: g('cm-vertical') || 'off_plan',
      plataforma: g('cm-plataforma') || null,
      objetivo: g('cm-objetivo') || 'sales',
      presupuesto_aed: Number(g('cm-presupuesto') || 0),
      gastado_aed: Number(g('cm-gastado') || 0),
      inicia_en: g('cm-inicio'),
      termina_en: g('cm-fin'),
      estado: g('cm-estado') || 'activa',
    };
    if (body.nombre.length < 3) return toast('Give the campaign a name (3 characters or more).');
    if (alcance === 'creador' && !body.codigo) return toast('Choose the creator this campaign targets.');
    if (!body.inicia_en || !body.termina_en) return toast('Set the start and end dates.');
    if (body.termina_en < body.inicia_en) return toast('The campaign ends before it starts.');
    const btn = $('#cm-crear');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
    try {
      await api('/ustar/campanas', { method: 'POST', body });
      $('#modal-campana').remove();
      tableroCache = null;
      toast('Campaign created.');
      await loadView('overview');
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = 'Create campaign'; }
      toast('Could not create campaign: ' + e.message);
    }
  }
  function renderProfile(p) {
    const right = document.querySelector('.wrap2 .panel:last-child');
    if (!right || !p) return;
    const pf = p.perfil || p;
    const redes = pf.redes || [];
    const primaria = pf.plataforma ? [{ plataforma: pf.plataforma, handle: pf.handle, seguidores: pf.seguidores, enlace: urlRed(pf.plataforma, pf.handle) }] : [];
    const redesLista = primaria.concat((redes || []).map((r) => ({ ...r, enlace: r.enlace || urlRed(r.plataforma, r.handle) })));
    const redesHtml = redesLista.map((r) =>
      '<div class="net">' +
      '<div><div class="pl">' + esc(r.plataforma) + '</div><div class="hn">' + esc(r.handle) + '</div></div>' +
      '<div class="sg">' + compact(r.seguidores) + ' followers</div>' +
      '<a class="ext" href="' + esc(r.enlace) + '" target="_blank" rel="noopener noreferrer">Open profile ' + IC_EXT + '</a>' +
      '</div>'
    ).join('');
    right.innerHTML =
      '<div class="profile"><div class="p-top">' +
      '<div class="p-ava">' + esc(tick(pf.nombre || pf.codigo)) + '</div>' +
      '<div class="p-id"><div class="nm">' + esc(pf.nombre || pf.codigo) + ' ' + tipoTag(pf.tipo) + '</div>' +
      '<div class="handle">' + esc(pf.handle || '') + ' · code ' + esc(pf.codigo) + '</div>' +
      '<div class="meta-chips">' + [pf.pais, pf.region, pf.industria].filter(Boolean).map((g) => '<span class="chip green">' + esc(g) + '</span>').join('') + '</div></div>' +
      '<div class="p-follow"><div class="n">' + compact(pf.seguidores) + '</div><div class="l">followers</div></div></div></div>' +
      '<div class="sec"><h2>Social networks</h2>' + (redesHtml || '<div class="empty">No networks recorded.</div>') + '</div>';
  }

  /* ---------------- Action items ---------------- */
  async function renderAction() {
    const [r, d] = await Promise.all([api('/ustar/pendientes'), cargarTablero()]);
    const porBen = new Map((d.creadores || []).filter((x) => x.beneficiario_id).map((x) => [x.beneficiario_id, x]));
    const porCodigo = new Map((d.creadores || []).map((x) => [x.codigo, x]));

    const kycRows = (r.sin_kyc || []).map((b) => {
      const stat = porBen.get(b.id);
      const codigo = (b.codigos || [])[0] || '';
      return '<div class="aitem"><div class="top"><div class="t">' + esc(b.nombre) + '</div>' + kycPill(b.kyc_estado) + '</div>' +
        '<div class="s">code ' + esc((b.codigos || []).join(', ') || '—') + (stat ? ' · registered ' + horasTexto(stat.registro_horas) + ' ago' : '') + '</div>' +
        (stat ? '<div class="miss">clock: ' + relojPill(stat) + '</div>' : '') +
        '<div class="acts">' +
        '<button class="btn sm" data-msg="' + esc(codigo) + '" data-tpl="' + (stat && stat.reloj === 'overdue' ? 'recordar_kyc' : 'pedir_kyc') + '">' + IC_MSG + ' Message BlockEstate</button>' +
        '</div></div>';
    }).join('');

    const contrRows = (r.sin_contratos || []).map((b) => {
      const mine = (b.faltan || []).includes('ustar');
      const stat = porBen.get(b.id);
      return '<div class="aitem"><div class="top"><div class="t">' + esc(b.nombre) + '</div>' +
        '<span class="pill ' + (mine ? 'green' : 'red') + '">' + (mine ? 'yours' : (b.faltan || []).length + ' missing') + '</span></div>' +
        '<div class="s">' + esc((b.codigos || []).join(', ')) + '</div>' +
        '<div class="miss">missing: <b>' + esc((b.faltan || []).join(' · ')) + '</b></div>' +
        '<div class="acts">' +
        (mine
          ? '<button class="btn sm" data-sign="' + esc(b.id) + '">' + IC_SIGN + ' Sign USTAR contract</button>'
          : '<button class="btn sm" data-msg="' + esc((b.codigos || [])[0] || '') + '" data-tpl="contrato">' + IC_MSG + ' Send to BlockEstate</button>') +
        (stat && !stat.kyc_aprobado ? '<button class="btn sm ghost" data-msg="' + esc((b.codigos || [])[0] || '') + '" data-tpl="pedir_kyc">Ask about KYC</button>' : '') +
        '</div></div>';
    }).join('');

    const bonoRows = (r.bonos_por_vencer || []).map((b) => '<div class="aitem"><div class="top"><div class="t">' + esc(b.nombre || b.codigo) + '</div><span class="pill amber">' + (b.dias_restantes || '') + ' days</span></div>' +
      '<div class="s">0.10% bonus ends ' + esc(b.bono_hasta) + '</div>' +
      '<div class="acts"><button class="btn sm ghost" data-msg="' + esc(b.codigo) + '" data-tpl="preguntar">Ask BlockEstate</button></div></div>').join('');

    return head(
      'You read the state and push the follow-ups — but you never approve a KYC. Every item goes straight to the signature or to your BlockEstate agent.') +
      barraRedes(d) +
      '<div class="cols3">' +
      '<div class="panel"><h2>KYC pending<span class="count">' + (r.sin_kyc || []).length + '</span></h2>' + (kycRows || '<div class="empty">Everyone has KYC.</div>') + '</div>' +
      '<div class="panel"><h2>Contracts unsigned<span class="count">' + (r.sin_contratos || []).length + '</span></h2>' + (contrRows || '<div class="empty">All contracts signed.</div>') + '</div>' +
      '<div class="panel"><h2>Bonuses expiring<span class="count">' + (r.bonos_por_vencer || []).length + '</span></h2>' + (bonoRows || '<div class="empty">No bonuses expiring.</div>') + '</div>' +
      '</div>';
  }

  /* ---------------- Messages ---------------- */
  async function renderMessages() {
    const [m, d] = await Promise.all([api('/ustar/mensajes'), cargarTablero()]);
    const c = d.contadores || {};
    mensajesCache = m;
    api('/ustar/mensajes/leidos', { method: 'POST', body: {} }).then(refreshBadge).catch(() => {});
    const agente = m.agente || { nombre: 'BlockEstate', correo: '' };
    const burbujas = (m.mensajes || []).map((x) => {
      const mio = x.autor === 'ustar';
      return '<div class="bubble-row ' + (mio ? 'mine' : 'theirs') + '">' +
        '<div class="bubble"><div class="b-head"><b>' + esc(mio ? 'You · USTAR' : (x.autor_nombre || 'BlockEstate')) + '</b>' +
        '<span>' + new Date(x.enviado_en).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</span></div>' +
        '<div class="b-subj">' + esc(x.asunto) + '</div>' +
        '<div class="b-body">' + esc(x.cuerpo).replace(/\n/g, '<br>') + '</div></div></div>';
    }).join('');
    return head(
      'Everything you need from BlockEstate lands here, with the agent assigned to your agency.') +
      '<div class="cols msgcols">' +
      '<div class="panel"><div class="agentbar"><div class="p-ava sm">' + esc(tick(agente.nombre)) + '</div>' +
      '<div><div class="nm">' + esc(agente.nombre) + '</div><div class="cd">' + esc(agente.correo) + ' · designated BlockEstate agent</div></div>' +
      '<span class="pill green">online</span></div>' +
      '<div class="thread">' + (burbujas || '<div class="empty">No messages yet. Ask for a KYC push, a contract or anything else.</div>') + '</div>' +
      '<div class="composer">' +
      '<div class="tpls">' +
      ['pedir_kyc|Request KYC', 'recordar_kyc|Remind', 'preguntar|Ask', 'contrato|Contract'].map((t) => {
        const [k, l] = t.split('|');
        return '<button class="tpl" data-tpl="' + k + '">' + l + '</button>';
      }).join('') +
      '</div>' +
      '<input id="msg-asunto" placeholder="Subject" maxlength="160">' +
      '<textarea id="msg-cuerpo" rows="3" placeholder="Write to your BlockEstate agent…"></textarea>' +
      '<div class="sendrow"><button class="btn" id="msg-send" style="width:auto">Send message</button><span class="dim-txt" id="msg-hint"></span></div>' +
      '</div></div>' +
      '<div class="panel"><h2>Who answers</h2>' +
      '<div class="who"><div class="nm">' + esc(agente.nombre) + '</div><div class="cd">' + esc(agente.correo) + '</div>' +
      '<p class="panel-note">KYC approvals, contract countersignature and commission questions for your agency all go through this thread. Replies appear here.</p></div>' +
      '<h2 style="margin-top:1.4rem">Your line now</h2>' +
      '<div class="feet"><div><span class="l">Creators</span><span class="v">' + ((c.creadores || {}).valor ?? '—') + '</span></div>' +
      '<div><span class="l">KYC late</span><span class="v">' + (((c.kyc_pendientes || {}).vencidos) ?? '—') + '</span></div>' +
      '<div><span class="l">30d revenue</span><span class="v">' + (c.devengado_30d ? aedk(c.devengado_30d.valor) : '—') + '</span></div></div>' +
      '</div></div>';
  }
  function bindMessages() {
    document.querySelectorAll('.tpl').forEach((b) => b.addEventListener('click', () => prefillMensaje(null, b.getAttribute('data-tpl'))));
    const send = $('#msg-send');
    if (send) send.addEventListener('click', enviarMensajeForm);
  }
  async function enviarMensajeForm() {
    const asunto = ($('#msg-asunto') || {}).value || '';
    const cuerpo = ($('#msg-cuerpo') || {}).value || '';
    if (!asunto.trim() || !cuerpo.trim()) return toast('Subject and message are required.', true);
    const btn = $('#msg-send'); btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await api('/ustar/mensajes', { method: 'POST', body: { asunto, cuerpo, plantilla: 'otro' } });
      toast('Message sent to BlockEstate.');
      await loadView('messages');
    } catch (e) { toast(e.message, true); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Send message'; } }
  }

  /* ---------------- influencer drawer (eye) ---------------- */
  const PLANTILLAS = {
    pedir_kyc: { asunto: 'KYC documents', cuerpo: 'Hello, please start the KYC of {nombre} ({codigo}) — the file is with BlockEstate and we need it cleared to keep the launch date.' },
    recordar_kyc: { asunto: 'KYC reminder · 72h passed', cuerpo: 'Hello, the KYC of {nombre} ({codigo}) has been pending for more than 72 hours. Could you confirm what is missing so we can unblock it?' },
    preguntar: { asunto: 'Question', cuerpo: 'Hello, could you confirm the current status of {nombre} ({codigo})?' },
    contrato: { asunto: 'Contract signature', cuerpo: 'Hello, the USTAR contract for {nombre} ({codigo}) is still unsigned on your side. Shall we close it this week?' },
    otro: { asunto: '', cuerpo: '' },
  };
  function datosCreador(codigo) {
    const d = tableroCache;
    if (!d) return null;
    return (d.creadores || []).find((x) => x.codigo === codigo) || null;
  }
  function prefillMensaje(codigo, tpl) {
    const c = codigo ? datosCreador(codigo) : null;
    const nombre = c ? c.nombre : (codigo || 'the network');
    const cod = c ? c.codigo : (codigo || '');
    const base = PLANTILLAS[tpl] || PLANTILLAS.preguntar;
    const asunto = base.asunto + (cod ? ' · ' + cod : '');
    const cuerpo = base.cuerpo.replace(/\{nombre\}/g, nombre).replace(/\{codigo\}/g, cod);
    abrirCompositor({ asunto, cuerpo, plantilla: tpl, beneficiario_id: c ? c.beneficiario_id : null, nombre });
  }
  function abrirCompositor(init) {
    const agente = (mensajesCache && mensajesCache.agente) || { nombre: 'BlockEstate agent', correo: '' };
    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal ca-scope" id="modal-msg"><div class="modal-card wide">' +
      '<div class="modal-title">Message your BlockEstate agent</div>' +
      '<p class="panel-note" style="margin-bottom:1rem">To <b>' + esc(agente.nombre) + '</b> · ' + esc(agente.correo) + '. Replies land in the Messages tab.</p>' +
      '<div class="field"><label>Subject</label><input id="cm-asunto" maxlength="160" value="' + esc(init.asunto || '') + '"></div>' +
      '<div class="field"><label>Message</label><textarea id="cm-cuerpo" rows="5">' + esc(init.cuerpo || '') + '</textarea></div>' +
      '<div class="modal-actions"><button class="btn ghost" id="cm-cancel">Cancel</button><button class="btn" id="cm-send">Send</button></div>' +
      '</div></div>');
    const ov = $('#modal-msg');
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    $('#cm-cancel').addEventListener('click', () => ov.remove());
    $('#cm-send').addEventListener('click', async () => {
      const asunto = $('#cm-asunto').value.trim(), cuerpo = $('#cm-cuerpo').value.trim();
      if (!asunto || !cuerpo) return toast('Subject and message are required.', true);
      const b = $('#cm-send'); b.disabled = true; b.textContent = 'Sending…';
      try {
        await api('/ustar/mensajes', { method: 'POST', body: { asunto, cuerpo, plantilla: init.plantilla || 'otro', beneficiario_id: init.beneficiario_id || null } });
        ov.remove(); toast('Sent to ' + agente.nombre + '.');
        refreshBadge();
      } catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Send'; }
    });
  }
  async function abrirDrawer(codigo) {
    const c = datosCreador(codigo);
    let p = null;
    try { p = await api('/ustar/influencers/' + encodeURIComponent(codigo)); } catch (_) { /* the row still has the numbers */ }
    const pf = (p && p.perfil) || {};
    const est = (p && p.estadisticas) || {};
    const nombre = (c && c.nombre) || pf.nombre || codigo;
    const ventas = c ? c.ventas : (est.ventas || 0);
    const ganado = c ? c.devengado_fils : Number(est.ganado_fils || 0);
    const visitas = c ? c.visitas_30d : (est.visitas_30d || 0);
    const ticket = ventas > 0 ? aed(Math.round(ganado / ventas)) : '—';
    const contratos = (c && c.contratos) || (pf.contratos || []);
    const redes = (pf.redes || []).map((r) => '<a class="chip green" href="' + esc(r.enlace || urlRed(r.plataforma, r.handle)) + '" target="_blank" rel="noopener noreferrer">' + esc(r.plataforma) + ' · ' + esc(r.handle) + '</a>').join('');

    document.body.insertAdjacentHTML('beforeend',
      '<div class="modal ca-scope" id="modal-eye"><div class="modal-card drawer">' +
      '<div class="dw-top"><div class="p-ava">' + esc(tick(nombre)) + '</div>' +
      '<div class="dw-id"><div class="nm">' + esc(nombre) + ' ' + tipoTag((c && c.tipo) || pf.tipo || 'creador') + '</div>' +
      '<div class="cd">' + esc(codigo) + (pf.handle ? ' · ' + esc(pf.handle) : '') + (pf.plataforma ? ' · ' + esc(pf.plataforma) : '') + '</div>' +
      '<div class="meta-chips">' + (redes || '<span class="chip">no socials recorded</span>') + '</div></div>' +
      '<button class="xbtn" id="eye-x" aria-label="Close">×</button></div>' +
      '<div class="dw-kpis">' +
      '<div><span class="l">Earned</span><span class="v">' + aedk(ganado) + '</span></div>' +
      '<div><span class="l">Sales</span><span class="v">' + ventas + '</span></div>' +
      '<div><span class="l">30d traffic</span><span class="v">' + compact(visitas) + '</span></div>' +
      '<div><span class="l">Average / sale</span><span class="v">' + ticket + '</span></div>' +
      '<div><span class="l">KYC</span><span class="v">' + kycPill((c && c.kyc_estado) || pf.kyc_estado) + '</span></div>' +
      '<div><span class="l">Clock</span><span class="v">' + (c ? relojPill(c) : '—') + '</span></div>' +
      '</div>' +
      '<div class="dw-sec"><h2>Registration clock</h2>' +
      '<p class="panel-note">' + (c
        ? 'Registered ' + horasTexto(c.registro_horas) + ' ago · ' + (c.kyc_aprobado ? 'KYC cleared.' : c.reloj === 'pending' ? horasTexto(c.horas_restantes) + ' left of the 72-hour window.' : horasTexto(c.horas_vencidas) + ' past the 72-hour window — BlockEstate queue.')
        : 'No clock for this code.') + '</p></div>' +
      '<div class="dw-sec"><h2>Contracts</h2><div class="meta-chips">' +
      ['ndc', 'blockestate', 'ustar'].map((a) => '<span class="chip ' + (contratos.includes(a) ? 'green' : '') + '">' + a + (contratos.includes(a) ? ' ✓' : ' · missing') + '</span>').join('') +
      '</div></div>' +
      '<div class="dw-actions">' +
      (c && !c.contrato_ustar && c.beneficiario_id ? '<button class="btn" id="eye-sign">Sign USTAR contract</button>' : '') +
      '<button class="btn ghost" id="eye-msg">' + IC_MSG + ' Message BlockEstate</button>' +
      '</div></div></div>');
    const ov = $('#modal-eye');
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    $('#eye-x').addEventListener('click', () => ov.remove());
    const sign = $('#eye-sign');
    if (sign) sign.addEventListener('click', async () => {
      sign.disabled = true; sign.textContent = 'Signing…';
      try {
        await api('/ustar/beneficiarios/' + encodeURIComponent(c.beneficiario_id) + '/contrato', { method: 'POST', body: { estado: 'firmado' } });
        ov.remove(); toast('USTAR contract signed.'); tableroCache = null; await loadView('overview');
      } catch (e) { toast(e.message, true); sign.disabled = false; sign.textContent = 'Sign USTAR contract'; }
    });
    $('#eye-msg').addEventListener('click', () => { ov.remove(); prefillMensaje(codigo, c && c.reloj === 'overdue' ? 'recordar_kyc' : 'preguntar'); });
  }

  /* ---------------- creator messaging ---------------- */
  let bandejaCache = null;
  let chatAdjuntos = [];
  let masivoAdjuntos = [];

  async function cargarBandeja(forzar) {
    if (!bandejaCache || forzar) bandejaCache = await api('/ustar/creadores/bandeja');
    return bandejaCache;
  }

  function horaCorta(iso) {
    if (!iso) return '';
    const d = new Date(iso), ahora = Date.now(), dif = (ahora - d.getTime()) / 60000;
    if (dif < 1) return 'just now';
    if (dif < 60) return Math.round(dif) + 'm ago';
    if (dif < 1440) return Math.round(dif / 60) + 'h ago';
    if (dif < 10080) return Math.round(dif / 1440) + 'd ago';
    return d.toISOString().slice(0, 10);
  }

  function kb(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

  async function subirArchivo(file) {
    const fd = new FormData();
    fd.append('archivo', file);
    const res = await fetch(API_BASE + '/ustar/creadores/adjuntos', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + store.token() },
      body: fd,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.mensaje || d.message || 'HTTP ' + res.status);
    }
    return res.json();
  }

  function chipsAdjuntos(lista, quitar) {
    return lista.map((a, i) =>
      '<span class="achip">' + (a.es_imagen ? IC_IMG : IC_DOC) + '<span class="an">' + esc(a.nombre) + '</span>' +
      '<span class="as">' + kb(a.tamano_bytes) + '</span>' +
      (quitar ? '<button class="axon" data-quitar="' + i + '" aria-label="Remove">×</button>' : '') + '</span>').join('');
  }

  function burbuja(m) {
    const mio = m.autor !== 'creador';
    const adj = (m.adjuntos || []).length
      ? '<div class="badj">' + m.adjuntos.map((a) =>
          a.es_imagen
            ? '<a class="bimg" href="' + esc(absOr(a.url)) + '" target="_blank" rel="noopener"><img data-blob="' + esc(a.url) + '" alt="' + esc(a.nombre) + '"></a>'
            : '<a class="bfile" href="' + esc(absOr(a.url)) + '" target="_blank" rel="noopener">' + IC_DOC + esc(a.nombre) + ' <span>' + kb(a.tamano_bytes) + '</span></a>').join('') + '</div>'
      : '';
    return '<div class="bub ' + (mio ? 'me' : 'them') + '">' +
      (m.asunto ? '<div class="bsub">' + esc(m.asunto) + '</div>' : '') +
      '<div class="btxt">' + esc(m.cuerpo).replace(/\n/g, '<br>') + '</div>' + adj +
      '<div class="bmeta">' + (mio ? 'You' : 'Creator') + ' · ' + horaCorta(m.enviado_en) +
      (mio ? (m.leido ? ' · seen' : ' · not opened yet') : '') + '</div></div>';
  }

  /** Images need the Bearer token, and an <img> cannot carry one: fetched as a blob. */
  async function cargarBlobs(root) {
    for (const img of root.querySelectorAll('img[data-blob]')) {
      try {
        const r = await fetch(absOr(img.getAttribute('data-blob')), { headers: { Authorization: 'Bearer ' + store.token() } });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        img.src = URL.createObjectURL(await r.blob());
      } catch (_) { img.replaceWith(Object.assign(document.createElement('span'), { className: 'bbroken', textContent: 'image unavailable' })); }
    }
  }

  async function abrirChat(codigo) {
    const d = await api('/ustar/creadores/' + encodeURIComponent(codigo) + '/mensajes');
    chatAdjuntos = [];
    const cuerpo = (d.mensajes || []).length
      ? d.mensajes.map(burbuja).join('')
      : '<div class="empty">No messages yet. This is the first one.</div>';
    $('#ca-views').insertAdjacentHTML('beforeend',
      '<div class="modal ca-scope" id="modal-chat"><div class="modal-card drawer chat">' +
      '<div class="dw-top"><div class="p-ava">' + esc(tick(d.creador.nombre || codigo)) + '</div>' +
      '<div class="dw-id"><div class="nm">' + esc(d.creador.nombre) + ' ' + tipoTag(d.creador.tipo) + '</div>' +
      '<div class="cd">' + esc(d.creador.codigo) + ' · ' + esc(d.creador.correo || 'no email on file') + '</div></div>' +
      '<button class="xbtn" id="chat-x" aria-label="Close">×</button></div>' +
      '<div class="chat-link"><span class="l">Creator link</span><code>' + esc(d.creador.enlace) + '</code>' +
      '<button class="btn ghost sm" id="chat-copy">Copy link</button>' +
      '<span class="hint">Opens the thread without a login. Send it by WhatsApp or email; it expires in 30 days.</span></div>' +
      '<div class="chat-body" id="chat-body">' + cuerpo + '</div>' +
      '<div class="chat-compose">' +
      '<div class="chips" id="chat-chips"></div>' +
      '<textarea id="chat-text" rows="3" maxlength="8000" placeholder="Write to ' + esc((d.creador.nombre || '').split(' ')[0] || 'the creator') + '…"></textarea>' +
      '<div class="crow">' +
      '<label class="btn ghost sm filebtn">' + IC_IMG + ' Attach image or PDF<input id="chat-file" type="file" multiple accept="image/png,image/jpeg,application/pdf"></label>' +
      '<span class="hint" id="chat-hint">Images, PDFs and links (paste the URL in the text).</span>' +
      '<button class="btn" id="chat-send">Send</button></div></div></div></div>');

    const ov = $('#modal-chat');
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    $('#chat-x').addEventListener('click', () => ov.remove());
    $('#chat-body').scrollTop = $('#chat-body').scrollHeight;
    cargarBlobs($('#chat-body'));

    $('#chat-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(d.creador.enlace); toast('Link copied — paste it in WhatsApp or an email.'); }
      catch (_) { toast('Copy the link from the box above.', true); }
    });

    $('#chat-file').addEventListener('change', async (ev) => {
      const files = Array.from(ev.target.files || []).slice(0, 4);
      ev.target.value = '';
      for (const f of files) {
        try {
          $('#chat-hint').textContent = 'Uploading ' + f.name + '…';
          chatAdjuntos.push(await subirArchivo(f));
          $('#chat-chips').innerHTML = chipsAdjuntos(chatAdjuntos, true);
          enlazarQuitar($('#chat-chips'), chatAdjuntos);
        } catch (err) { toast(err.message, true); }
      }
      $('#chat-hint').textContent = 'Images, PDFs and links (paste the URL in the text).';
    });

    $('#chat-send').addEventListener('click', async () => {
      const texto = $('#chat-text').value.trim();
      if (!texto) { toast('Write something first.', true); return; }
      const b = $('#chat-send');
      b.disabled = true; b.textContent = 'Sending…';
      try {
        await api('/ustar/creadores/mensajes', {
          method: 'POST',
          body: { codigos: [codigo], asunto: 'Message from USTAR', cuerpo: texto, adjuntos: chatAdjuntos.map((a) => a.id) },
        });
        // Keep the thread open: the point of the drawer is to read the answer next.
        const h = await api('/ustar/creadores/' + encodeURIComponent(codigo) + '/mensajes');
        $('#chat-body').innerHTML = h.mensajes.map(burbuja).join('');
        cargarBlobs($('#chat-body'));
        $('#chat-body').scrollTop = $('#chat-body').scrollHeight;
        $('#chat-text').value = '';
        chatAdjuntos = [];
        $('#chat-chips').innerHTML = '';
        bandejaCache = null;
        toast('Sent to ' + (d.creador.nombre || codigo) + '.');
      } catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Send'; }
    });
  }

  function enlazarQuitar(root, lista) {
    root.querySelectorAll('[data-quitar]').forEach((b) => b.addEventListener('click', () => {
      lista.splice(Number(b.getAttribute('data-quitar')), 1);
      root.innerHTML = chipsAdjuntos(lista, true);
      enlazarQuitar(root, lista);
    }));
  }

  function opcionesMasivo(bandeja, total) {
    const conRed = red && red !== 'todas';
    const nombreRed = conRed ? ((document.querySelector('.chipbtn.on') || {}).textContent || 'this network').trim() : '';
    return '<option value="todos">Everyone in the network · ' + total + '</option>' +
      (conRed ? '<option value="red">Only ' + esc(nombreRed) + '</option>' : '') +
      '<option value="elegir">Pick creators…</option>';
  }

  async function abrirMasivo() {
    const d = await cargarBandeja(true);
    masivoAdjuntos = [];
    const gente = d.creadores || [];
    const lista = gente.map((c) =>
      '<label class="pickrow"><input type="checkbox" value="' + esc(c.codigo) + '">' +
      '<span class="pn">' + esc(c.nombre) + '</span><span class="pc">' + esc(c.codigo) + '</span>' +
      '<span class="pe">' + (c.correo ? esc(c.correo) : '<span class="dim-txt">no email</span>') + '</span></label>').join('');

    $('#ca-views').insertAdjacentHTML('beforeend',
      '<div class="modal ca-scope" id="modal-masivo"><div class="modal-card wide">' +
      '<div class="mh"><h2>Message your creators</h2><button class="xbtn" id="mas-x" aria-label="Close">×</button></div>' +
      '<p class="panel-note">One message, one thread per creator. Every creator sees it in their link; those with an address also get an email.</p>' +
      '<div class="mform">' +
      '<label class="fl2">Recipients<select id="mas-scope">' + opcionesMasivo(d, gente.length) + '</select></label>' +
      '<div class="picks hidden" id="mas-picks"><div class="picks-head"><span>' + gente.length + ' creators</span><button class="btn ghost sm" id="mas-todos">Select all</button></div><div class="picks-body">' + lista + '</div></div>' +
      '<label class="fl2">Subject<input id="mas-asunto" maxlength="160" placeholder="e.g. Palm Jumeirah launch"></label>' +
      '<label class="fl2">Message<textarea id="mas-cuerpo" rows="6" maxlength="8000" placeholder="What to post, when, and the link to the assets"></textarea></label>' +
      '<div class="chips" id="mas-chips"></div>' +
      '<div class="crow"><label class="btn ghost sm filebtn">' + IC_IMG + ' Attach images or PDFs<input id="mas-file" type="file" multiple accept="image/png,image/jpeg,application/pdf"></label>' +
      '<span class="hint" id="mas-hint">Links go in the message text — creators open them from their thread.</span>' +
      '<button class="btn" id="mas-send">Send message</button></div>' +
      '</div></div></div>');

    const ov = $('#modal-masivo');
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    $('#mas-x').addEventListener('click', () => ov.remove());
    $('#mas-scope').addEventListener('change', (e) => $('#mas-picks').classList.toggle('hidden', e.target.value !== 'elegir'));
    $('#mas-todos').addEventListener('click', () => {
      const boxes = Array.from(document.querySelectorAll('#mas-picks input[type=checkbox]'));
      const marcar = boxes.some((b) => !b.checked);
      boxes.forEach((b) => { b.checked = marcar; });
      $('#mas-todos').textContent = marcar ? 'Clear all' : 'Select all';
    });
    $('#mas-file').addEventListener('change', async (ev) => {
      const files = Array.from(ev.target.files || []).slice(0, 6 - masivoAdjuntos.length);
      ev.target.value = '';
      for (const f of files) {
        try {
          $('#mas-hint').textContent = 'Uploading ' + f.name + '…';
          masivoAdjuntos.push(await subirArchivo(f));
          $('#mas-chips').innerHTML = chipsAdjuntos(masivoAdjuntos, true);
          enlazarQuitar($('#mas-chips'), masivoAdjuntos);
        } catch (err) { toast(err.message, true); }
      }
      $('#mas-hint').textContent = 'Links go in the message text — creators open them from their thread.';
    });
    $('#mas-send').addEventListener('click', async () => {
      const asunto = $('#mas-asunto').value.trim();
      const cuerpo = $('#mas-cuerpo').value.trim();
      const scope = $('#mas-scope').value;
      const codigos = scope === 'elegir'
        ? Array.from(document.querySelectorAll('#mas-picks input:checked')).map((b) => b.value)
        : undefined;
      if (!asunto || !cuerpo) { toast('Subject and message are required.', true); return; }
      if (scope === 'elegir' && !codigos.length) { toast('Pick at least one creator.', true); return; }
      const b = $('#mas-send');
      b.disabled = true; b.textContent = 'Sending…';
      try {
        const r = await api('/ustar/creadores/mensajes', {
          method: 'POST',
          body: { asunto, cuerpo, adjuntos: masivoAdjuntos.map((a) => a.id), ...(codigos ? { codigos } : scope === 'red' ? { red } : {}) },
        });
        bandejaCache = null;
        const correo = r.correo_driver === 'log'
          ? 'mail driver is “log”: nothing left the server, share the creator links'
          : r.por_correo + ' by email';
        ov.querySelector('.mform').innerHTML =
          '<div class="sentbox"><div class="big">' + r.enviados + ' creators received it</div>' +
          '<div class="l2">' + correo + '</div>' +
          (r.sin_correo ? '<div class="l2">' + r.sin_correo + ' without an address — open their thread and copy the link.</div>' : '') +
          (r.correo_fallido ? '<div class="l2 bad">' + r.correo_fallido + ' emails failed and are logged on the thread.</div>' : '') +
          '<button class="btn" id="mas-done">Back to creators</button></div>';
        $('#mas-done').addEventListener('click', async () => { ov.remove(); await loadView('creators'); });
      } catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Send message'; }
    });
  }

  /* ---------------- shared bindings ---------------- */
  function bindCommon() {
    const nc = $('#btn-nueva-campana'); if (nc) nc.addEventListener('click', abrirFormCampana);
    document.querySelectorAll('[data-red]').forEach((b) => b.addEventListener('click', async () => {
      red = b.getAttribute('data-red');
      localStorage.setItem(CLAVE_RED, red);
      tableroCache = null;
      const activo = document.querySelector('#ca-tabs a.on');
      await loadView(activo ? activo.getAttribute('data-v') : 'overview');
    }));
    document.querySelectorAll('[data-eye]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); abrirDrawer(b.getAttribute('data-eye')); }));
    document.querySelectorAll('[data-chat]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirChat(b.getAttribute('data-chat')).catch((err) => toast(err.message, true));
    }));
    document.querySelectorAll('[data-msg]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      prefillMensaje(b.getAttribute('data-msg'), b.getAttribute('data-tpl') || 'preguntar');
    }));
    document.querySelectorAll('[data-sign]').forEach((b) => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      b.disabled = true;
      try {
        await api('/ustar/beneficiarios/' + encodeURIComponent(b.getAttribute('data-sign')) + '/contrato', { method: 'POST', body: { estado: 'firmado' } });
        toast('USTAR contract signed.');
        tableroCache = null;
        await loadView('action');
      } catch (err) { toast(err.message, true); b.disabled = false; }
    }));
  }
  /* ---------------- contract signing (legacy hook) ---------------- */
  window.__sign = async function (id) {
    try {
      await api('/ustar/beneficiarios/' + encodeURIComponent(id) + '/contrato', { method: 'POST', body: { estado: 'firmado' } });
      await loadView('action');
    } catch (e) { toast('Signing failed: ' + e.message); }
  };

  // Leader selector: open/close on the button, close on any click outside or Escape. Delegated
  // because the bar is re-rendered on every view change.
  function cerrarLideres() {
    const m = document.getElementById('ldr-menu');
    const b = document.getElementById('ldr-btn');
    if (m && !m.hidden) m.hidden = true;
    if (b) b.setAttribute('aria-expanded', 'false');
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('#ldr-btn');
    const menu = document.getElementById('ldr-menu');
    if (!menu) return;
    if (btn) {
      const abrir = menu.hidden;
      menu.hidden = !abrir;
      btn.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      return;
    }
    if (!menu.hidden && !menu.contains(e.target)) cerrarLideres();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarLideres(); });

/* ---------------- decoration: the counts on the tabs ---------------- */
function pintarCuenta(vista, n) {
  const el = document.querySelector('#ca-tabs [data-badge="' + vista + '"]');
  if (!el) return;
  el.textContent = n > 0 ? String(n) : '';
  el.classList.toggle('oculto', n === 0);
}

async function refreshBadge() {
  try {
    const b = await cargarBandeja(true);
    pintarCuenta('creators', (b.creadores || []).reduce((s2, c) => s2 + (c.no_leidos || 0), 0));
  } catch (_) { /* the count is decoration */ }
  try {
    const m = await api('/ustar/mensajes');
    mensajesCache = m;
    pintarCuenta('messages', m.no_leidos || 0);
  } catch (_) { /* the count is decoration */ }
}

/* ---------------- the desk ---------------- */
const SECCIONES = [
  ['overview', 'Overview', ''],
  ['revenue', 'My revenue', ''],
  ['creators', 'Creators', 'creators'],
  ['action', 'Action items', ''],
  ['messages', 'Messages', 'messages'],
];

export function viewCreadorAgencia({ query } = {}) {
  const v = document.getElementById('view');
  const pedida = (query && query.get('v')) || 'overview';
  const conocida = SECCIONES.some(([k]) => k === pedida) ? pedida : 'overview';
  v.innerHTML = `
    <div class="ca-scope" id="ca-desk">
      <div class="ca-head">
        <div>
          <span class="ca-lab">Partner desk</span>
          <h1>Creator <span class="ca-outline">agency</span></h1>
          <p>The network you run: what it earned, who is inside it, the KYC clock and the thread with
          your BlockEstate agent. Read-only on approvals — those stay with NDC and BlockEstate.</p>
        </div>
      </div>
      <nav class="ca-tabs" id="ca-tabs" aria-label="Creator agency">
        ${SECCIONES.map(([clave, texto, cuenta]) => `<a href="#/creator-agency?v=${clave}" data-v="${clave}">` +
          `<span>${texto}</span>${cuenta ? `<i class="ca-cuenta oculto" data-badge="${cuenta}"></i>` : ''}</a>`).join('')}
      </nav>
      <div id="ca-views"></div>
    </div>`;
  // The router scrolls the empty container under the sticky market header before this desk paints;
  // the reader starts at the top of the page instead, with the title in sight.
  window.scrollTo(0, 0);
  const tabs = document.getElementById('ca-tabs');
  if (tabs) {
    tabs.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-v]');
      if (!a) return;
      e.preventDefault();
      // Through the router, so the back button and a shared link both land on the same screen.
      location.hash = '#/creator-agency?v=' + a.getAttribute('data-v');
    });
  }
  return loadView(conocida);
}

/**
 * La sala de prensa, vista por el lector: la lista y la noticia.
 *
 * Se lee como una noticia y no como un panel: una cabecera oscura, la historia que abre con su foto,
 * y debajo la rejilla. Cada pieza dice **quién la firma y de dónde viene**; cuando viene de otro sitio,
 * la tarjeta lo dice y lleva al original —el lector lee allí, donde el autor cobra la visita— en vez de
 * copiar el texto aquí.
 *
 * Nada de esto se publica solo: lo que llega de la API es lo que un humano publicó (BRD 10.3 + CD-008).
 */
import { api } from '../api.js';
import { API_BASE } from '../config.js';
import { date, empty, error, esc, loading } from '../ui.js';

const view = () => document.getElementById('view');

/** La portada: la plataforma la sirve por su hash de contenido, y la demo viaja como `data:`. */
const imgDe = (ruta) => (!ruta ? null : /^(data:|https?:)/.test(ruta) ? ruta : API_BASE + ruta);

/** Los dos párrafos de un cuerpo, con las negritas del original y todo lo demás escapado. */
function cuerpoHtml(texto) {
  return String(texto || '')
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p.trim()).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>`)
    .join('');
}

/** Quién firma y cuándo. */
const firma = (n) => `${esc(n.reportero.nombre)}`
  + (n.reportero.cargo ? ` · ${esc(n.reportero.cargo)}` : '')
  + (n.publicada_en ? ` · ${date(n.publicada_en)}` : '');

/** La tarjeta que dice de dónde viene, cuando no es nuestro. */
function tarjetaFuente(n) {
  if (n.fuente.es_propia || !n.fuente.url) return '';
  return `
    <aside class="noti-fuente">
      <span class="noti-fuente-eti">Published on ${esc(n.fuente.nombre)}</span>
      <p>This story is not ours. It is read where it was published, and this is the way there.</p>
      <a href="${esc(n.fuente.url)}" target="_blank" rel="noopener noreferrer">Open the original on ${esc(n.fuente.nombre)}</a>
    </aside>`;
}

function etiquetasChips(etiquetas, activa) {
  if (!etiquetas || !etiquetas.length) return '';
  return `<div class="noti-chips">${etiquetas.map((e) => `
    <a class="noti-chip${activa === e.etiqueta ? ' on' : ''}" href="#/news?etiqueta=${encodeURIComponent(e.etiqueta)}">
      ${esc(e.etiqueta)} <span>${e.noticias}</span></a>`).join('')}</div>`;
}

/** La lista: la que abre, y el resto en rejilla. */
export async function viewNews(filtros = {}) {
  const v = view();
  v.innerHTML = loading(3);
  let d;
  const qs = filtros.etiqueta ? `?etiqueta=${encodeURIComponent(filtros.etiqueta)}` : '';
  try {
    d = await api.noticias(qs);
  } catch (e) {
    error(v, e);
    return;
  }

  if (!d.noticias.length) {
    v.innerHTML = `
      <header class="prosa-hero">
        <div class="prosa-inner">
          <p class="prosa-eyebrow">BlockEstate · Newsroom</p>
          <h1>Newsroom</h1>
          <p class="prosa-lede">What the marketplace publishes: how it works, what it checks and where
            it comes from — signed, and dated.</p>
        </div>
      </header>
      <div class="prosa">${empty('Nothing published yet', 'The desk writes the first story; when it is published it appears here.')}</div>`;
    return;
  }

  const abierta = d.noticias.find((n) => n.slug === d.destacada) || d.noticias[0];
  const resto = d.noticias.filter((n) => n.slug !== abierta.slug);
  const foto = imgDe(abierta.portada.ruta);

  v.innerHTML = `
  <header class="prosa-hero">
    <div class="prosa-inner">
      <p class="prosa-eyebrow">BlockEstate · Newsroom</p>
      <h1>Newsroom</h1>
      <p class="prosa-lede">What the marketplace publishes: how it works, what it checks and where it
        comes from. Every piece is signed, dated, and — when it came from somewhere else — points at
        the original.</p>
      ${etiquetasChips(d.etiquetas, filtros.etiqueta)}
    </div>
  </header>
  <div class="noti-cuerpo">
    <a class="noti-abre" href="#/news/${esc(abierta.slug)}">
      ${foto ? `<div class="noti-abre-foto" style="background-image:url('${foto}')"></div>` : '<div class="noti-abre-foto sin"></div>'}
      <div class="noti-abre-txt">
        <span class="noti-tag">${abierta.fuente.es_propia ? 'Our own reporting' : `From ${esc(abierta.fuente.nombre)}`}</span>
        <h2>${esc(abierta.titulo)}</h2>
        ${abierta.entradilla ? `<p>${esc(abierta.entradilla)}</p>` : ''}
        <span class="noti-firma">${firma(abierta)}</span>
      </div>
    </a>
    ${resto.length ? `<div class="noti-rejilla">${resto.map((n) => {
      const f = imgDe(n.portada.ruta);
      return `
      <a class="noti-card" href="#/news/${esc(n.slug)}">
        ${f ? `<div class="noti-card-foto" style="background-image:url('${f}')"></div>` : '<div class="noti-card-foto sin"></div>'}
        <span class="noti-tag">${n.fuente.es_propia ? 'Our own reporting' : `From ${esc(n.fuente.nombre)}`}</span>
        <h3>${esc(n.titulo)}</h3>
        ${n.entradilla ? `<p>${esc(n.entradilla)}</p>` : ''}
        <span class="noti-firma">${firma(n)}</span>
      </a>`;
    }).join('')}</div>` : ''}
  </div>`;
}

/** Una noticia. */
export async function viewNoticia(slug) {
  const v = view();
  v.innerHTML = loading(2);
  let d;
  try {
    d = await api.noticia(slug);
  } catch (e) {
    error(v, e);
    return;
  }
  const n = d.noticia;
  const foto = imgDe(n.portada.ruta);

  v.innerHTML = `
  <article class="noti">
    <a class="noti-volver" href="#/news">← Newsroom</a>
    <header class="noti-cabecera">
      <span class="noti-tag">${n.fuente.es_propia ? 'Our own reporting' : `From ${esc(n.fuente.nombre)}`}</span>
      <h1>${esc(n.titulo)}</h1>
      ${n.entradilla ? `<p class="noti-lede">${esc(n.entradilla)}</p>` : ''}
      <p class="noti-firma">${firma(n)}</p>
    </header>
    ${foto ? `<figure class="noti-foto"><div style="background-image:url('${foto}')"></div>
      ${n.portada.pie ? `<figcaption>${esc(n.portada.pie)}</figcaption>` : ''}</figure>` : ''}
    <div class="noti-texto">${cuerpoHtml(n.cuerpo)}</div>
    ${tarjetaFuente(n)}
    ${n.etiquetas.length ? `<div class="noti-chips pie">${n.etiquetas.map((e) =>
      `<a class="noti-chip" href="#/news?etiqueta=${encodeURIComponent(e)}">${esc(e)}</a>`).join('')}</div>` : ''}
    ${d.relacionadas.length ? `<section class="noti-relacionadas">
      <h2>More from the newsroom</h2>
      <div class="noti-rejilla">${d.relacionadas.map((r) => {
        const f = imgDe(r.portada.ruta);
        return `<a class="noti-card" href="#/news/${esc(r.slug)}">
          ${f ? `<div class="noti-card-foto" style="background-image:url('${f}')"></div>` : '<div class="noti-card-foto sin"></div>'}
          <h3>${esc(r.titulo)}</h3>
          <span class="noti-firma">${firma(r)}</span></a>`;
      }).join('')}</div>
    </section>` : ''}
  </article>`;
}

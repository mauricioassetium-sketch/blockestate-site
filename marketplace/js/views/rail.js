/**
 * The rail on the right: who is behind the catalogue.
 *
 * Two blocks, both fed by the API and both about what is published, a developer's name appears only
 * when they have stock in the catalogue, which is what makes the list worth reading. The logo is the
 * one the developer uploaded during onboarding; until there is one, the name carries its own mark
 * (initials) instead of an invented image.
 */
import { api } from '../api.js';
import { esc, logoHtml, money } from '../ui.js';

/** A mark from the name lives in `ui.js`: the card and the rail share it. */

let cache = null;
/** Fetched once per session: the rail is the same on every screen. */
export async function datosRail() {
  if (!cache) cache = await api.developers();
  return cache;
}

export async function pintarRail(contenedor) {
  const el = typeof contenedor === 'string' ? document.querySelector(contenedor) : contenedor;
  if (!el) return null;
  try {
    const { desarrolladores, proyectos } = await datosRail();
    const devs = desarrolladores ?? [];
    const proys = proyectos ?? [];
    // Where the stock is: the communities of the significant projects, without repeating any.
    const zonas = [...new Set(proys.map((p) => p.comunidad).filter(Boolean))].slice(0, 6);

    el.innerHTML = `
      <div class="rail-box">
        <h3>Developers</h3>
        ${devs.length
          ? devs.map((d) => `
            <div class="dev-fila">
              <a class="dev-row${d.logo_url ? ' con-logo' : ''}" href="#/search?desarrollador_id=${esc(d.id)}">
                ${logoHtml(d.nombre, d.logo_url)}
                <span class="meta">
                  <b>${esc(d.nombre)}</b>
                  <span>${d.propiedades ? `${d.propiedades} propert${d.propiedades === 1 ? 'y' : 'ies'}${d.desde_aed ? ` · from ${esc(d.desde_aed)}` : ''}` : 'No published properties yet'}</span>
                </span>
              </a>
            </div>`).join('')
          : '<p class="muted" style="font-size:.85rem">No developer has published yet.</p>'}
      </div>
      ${proys.length ? `
      <div class="rail-box">
        <h3>Significant projects</h3>
        ${proys.map((p) => `
          <a class="dev-row${p.foto ? ' con-foto' : ''}" href="#/project/${esc(p.id)}">
            ${p.foto ? `<img class="proy-foto" src="${esc(p.foto)}" alt="${esc(p.nombre)}" loading="lazy">` : logoHtml(p.desarrollador, p.desarrollador_logo)}
            <span class="meta">
              <b>${esc(p.nombre)}</b>
              <span>${esc(p.comunidad ?? p.ciudad)} · ${p.propiedades}${p.desde_aed ? ` · from ${esc(p.desde_aed)}` : ''}</span>
            </span>
          </a>`).join('')}
      </div>` : ''}

      ${zonas.length ? `
      <div class="rail-box">
        <h3>Where</h3>
        <div class="chips">
          ${zonas.map((z) => `<a class="chip" href="#/search?comunidad=${encodeURIComponent(z)}">${esc(z)}</a>`).join('')}
        </div>
      </div>` : ''}

      <div class="rail-box">
        <h3>Recommended searches</h3>
        <div class="chips">
          ${[['1 bed', 'habitaciones_min=1'], ['2 beds', 'habitaciones_min=2'], ['3 beds', 'habitaciones_min=3'],
             ['Villas', 'tipo=villa'], ['Off plan', 'estado_obra=off_plan'],
             ['Under AED 2M', 'precio_max=2000000']]
            .map(([t, q]) => `<a class="chip" href="#/search?${q}">${esc(t)}</a>`).join('')}
        </div>
      </div>
      <p class="note" style="font-size:.75rem">Only developers with property published in the
        marketplace appear here. Their mark is the one they upload when they are onboarded.</p>
    `;
    return { desarrolladores: devs, proyectos: proys };
  } catch (err) {
    el.innerHTML = `<div class="msg err">${esc(err?.message ?? 'The rail could not be loaded.')}</div>`;
    return null;
  }
}

export { money };


/* ------------------------------------------------------------------ the door of a channel */

const CANAL_ETIQUETA_DEV = { whatsapp: 'WhatsApp', telegram: 'Telegram', correo: 'email' };

/**
 * Pressing a channel opens this, and there are two ways in, never more.
 *
 * Either you carry a code, and it says who brought you; or you do not, and you leave your name and
 * your address so the code of the agent the developer has assigned comes to you. The second half is
 * written and visible but **it is not connected yet**: it needs the platform's own call, which is the
 * next piece of work. Until then the button says so, because a form that pretends to send something
 * is worse than a form that admits it does not.
 */
function abrirPuerta(desarrollador, canal) {
  document.querySelector('.puerta-modal')?.remove();
  const caja = document.createElement('div');
  caja.className = 'puerta-modal';
  caja.innerHTML = `
    <div class="pm-panel" role="dialog" aria-modal="true" aria-label="Contact">
      <div class="pm-head">
        <b>Talk to ${esc(desarrollador)}</b>
        <button type="button" class="pm-x" aria-label="Close">✕</button>
      </div>
      <p class="pm-sub">${canal
        ? `You are opening <b>${esc(CANAL_ETIQUETA_DEV[canal] ?? canal)}</b>.`
        : "The contact of whoever sells is never published: <b>your code is the door</b>."}</p>

      <fieldset class="pm-via">
        <legend>I have a code</legend>
        <div class="pm-linea">
          <input id="pm-codigo" placeholder="BROKER-ALPHA" autocomplete="off" spellcheck="false">
          <button type="button" class="btn" id="pm-usar">Use my code</button>
        </div>
        <span class="note" id="pm-nota">It says who brought you, and it is who we put you in touch with.</span>
      </fieldset>

      <fieldset class="pm-via">
        <legend>I do not have one</legend>
        <div class="pm-linea">
          <input id="pm-nombre" placeholder="Your name" autocomplete="name">
          <input id="pm-correo" type="email" placeholder="you@email.com" autocomplete="email">
        </div>
        <button type="button" class="btn ghost" id="pm-pedir">Send me the code</button>
        <span class="note">The code of the agent the developer has assigned for this property, sent to
          your email, never shown here, so nobody can lift somebody else's code.</span>
      </fieldset>
    </div>`;
  document.body.appendChild(caja);
  document.body.classList.add('sin-scroll');

  const cerrar = () => { caja.remove(); document.body.classList.remove('sin-scroll'); document.removeEventListener('keydown', tecla); };
  const tecla = (e) => { if (e.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', tecla);
  caja.querySelector('.pm-x').addEventListener('click', cerrar);
  caja.addEventListener('click', (e) => { if (e.target === caja) cerrar(); });

  const nota = caja.querySelector('#pm-nota');
  caja.querySelector('#pm-usar').addEventListener('click', async () => {
    const codigo = caja.querySelector('#pm-codigo').value.trim();
    if (!codigo) { nota.textContent = 'Write your code first.'; return; }
    nota.textContent = 'Looking it up…';
    try {
      const r = await api.referral(codigo);
      const quien = r?.nombre ?? r?.referido?.nombre ?? null;
      nota.textContent = quien
        ? `This code is ${quien}'s. Opening ${CANAL_ETIQUETA_DEV[canal] ?? canal} with them.`
        : 'The code is valid. Opening the channel.';
      nota.className = 'note ok';
    } catch {
      nota.textContent = 'That code does not exist. Check it, or leave your name and address below.';
      nota.className = 'note err';
    }
  });
  caja.querySelector('#pm-pedir').addEventListener('click', () => {
    const nombre = caja.querySelector('#pm-nombre').value.trim();
    const correo = caja.querySelector('#pm-correo').value.trim();
    const aviso = caja.querySelector('#pm-pedir').nextElementSibling;
    if (!nombre || !/.+@.+\..+/.test(correo)) {
      aviso.textContent = 'A name and a real email address, please: the code is sent there.';
      aviso.className = 'note err';
      return;
    }
    // Honest on purpose: this call does not exist on the platform yet (see DOC-0004).
    aviso.textContent = 'This is not connected yet: the platform still has to make the call that '
      + 'assigns an agent and mails the code. Your details have not been sent anywhere.';
    aviso.className = 'note err';
  });
  caja.querySelector('#pm-codigo').focus();
}

/**
 * One listener for every door on the page: the channels of a developer row (`.puerta`) and the little
 * channels of a card (`.canal-mini`, and the `i`). All of them open the same thing, because the door is
 * always the same one: a code says who brought you, and without a code your address is left so it can
 * be sent to you. The contact of whoever sells is never published.
 */
document.addEventListener('click', (e) => {
  const p = e.target.closest?.('.puerta, .canal-mini, .canal-nota');
  if (!p) return;
  e.preventDefault();
  abrirPuerta(p.dataset.dev || 'the developer', p.dataset.canal || '');
});

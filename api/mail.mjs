/**
 * Envio del correo de bienvenida.
 *
 * Proveedor por defecto: Resend (API HTTP, sin dependencias). Se activa con
 * RESEND_API_KEY. Si no hay clave, el servidor NO falla: registra el pre-registro
 * y marca el correo como 'skipped', para que se pueda reenviar despues.
 *
 * Tambien soporta un webhook generico (MAIL_WEBHOOK_URL) para quien prefiera su
 * propio relay SMTP.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = readFileSync(join(HERE, 'email-welcome.html'), 'utf8');

export const FROM = process.env.MAIL_FROM || 'BlockEstate <info@blockestate.ae>';
export const REPLY_TO = process.env.MAIL_REPLY_TO || 'info@blockestate.ae';
export const SUBJECT = process.env.MAIL_SUBJECT || "Welcome to BlockEstate — you're on the developer list";
const SITE = process.env.SITE_URL || 'https://blockestate.ae';
const SECRET = process.env.UNSUB_SECRET || 'change-me';

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Fila etiqueta/valor para la tabla de resumen. */
function row(label, value) {
  return `        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-family:Arial,Helvetica,sans-serif;
                     font-size:11px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;color:#9a9a9a;
                     width:38%;vertical-align:top;">${esc(label)}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-family:Arial,Helvetica,sans-serif;
                     font-size:14px;color:#111111;vertical-align:top;">${esc(value) || '&mdash;'}</td>
        </tr>`;
}

export function renderEmail(reg) {
  const firstName = String(reg.name || '').trim().split(/\s+/)[0] || 'there';
  const rows = [
    row('Name', reg.name),
    row('Company', reg.company),
    row('Email', reg.email),
    reg.phone ? row('Phone', reg.phone) : '',
    reg.emirate ? row('Emirate', reg.emirate) : '',
    reg.projects ? row('Units or projects', reg.projects) : '',
    row('Registered', reg.created_at + ' UTC'),
  ].filter(Boolean).join('\n');

  const unsub = `${SITE}/api/unsubscribe?e=${encodeURIComponent(reg.email_norm || reg.email)}`
              + `&s=${encodeURIComponent(SECRET)}`;

  return TEMPLATE
    .replace(/\{\{FIRST_NAME\}\}/g, esc(firstName))
    .replace(/\{\{NAME\}\}/g, esc(reg.name))
    .replace(/\{\{COMPANY\}\}/g, esc(reg.company))
    .replace(/\{\{EMAIL\}\}/g, esc(reg.email))
    .replace(/\{\{ROWS\}\}/g, rows)
    .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsub);
}

export function renderText(reg) {
  const firstName = String(reg.name || '').trim().split(/\s+/)[0] || 'there';
  return [
    `Hi ${firstName},`,
    '',
    `Thank you for pre-registering ${reg.company} as a developer on BlockEstate —`,
    "the UAE's crypto-native property marketplace. Your registration is confirmed",
    'and you are now among the first developers in line.',
    '',
    "WHAT YOU'LL HEAR FROM US",
    '  - Launch date and early access windows',
    '  - New partners joining the ecosystem',
    '  - Product updates and the developer portal',
    '  - Onboarding, pricing and fee details before anyone else',
    '',
    'YOUR REGISTRATION',
    `  Name:      ${reg.name}`,
    `  Company:   ${reg.company}`,
    `  Email:     ${reg.email}`,
    reg.phone ? `  Phone:     ${reg.phone}` : '',
    reg.emirate ? `  Emirate:   ${reg.emirate}` : '',
    reg.projects ? `  Projects:  ${reg.projects}` : '',
    '',
    `Visit ${SITE}`,
    '',
    'If any of your details change, reply to this email and we will update your registration.',
    '',
    'BLOCKESTATE · POWERED BY NDC',
    'You are receiving this because you pre-registered at blockestate.ae.',
    'BlockEstate is not a bank, custodian, broker or auditor.',
    `Unsubscribe: ${SITE}/api/unsubscribe?e=${encodeURIComponent(reg.email_norm || reg.email)}&s=${encodeURIComponent(SECRET)}`,
  ].filter(Boolean).join('\n');
}

/**
 * @returns {Promise<{status:'sent'|'skipped', provider?:string, id?:string, error?:string}>}
 */
export async function sendWelcome(reg) {
  const html = renderEmail(reg);
  const text = renderText(reg);

  if (process.env.MAIL_WEBHOOK_URL) {
    try {
      const r = await fetch(process.env.MAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(process.env.MAIL_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.MAIL_WEBHOOK_TOKEN}` } : {}),
        },
        body: JSON.stringify({ to: reg.email, from: FROM, replyTo: REPLY_TO, subject: SUBJECT, html, text }),
      });
      if (!r.ok) return { status: 'skipped', error: `webhook ${r.status}: ${(await r.text()).slice(0, 200)}` };
      return { status: 'sent', provider: 'webhook' };
    } catch (e) {
      return { status: 'skipped', error: `webhook: ${e.message}` };
    }
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: 'skipped', error: 'sin RESEND_API_KEY ni MAIL_WEBHOOK_URL configurados' };

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [reg.email], reply_to: REPLY_TO, subject: SUBJECT, html, text }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return { status: 'skipped', provider: 'resend', error: `${r.status} ${body.message || ''}`.slice(0, 300) };
    return { status: 'sent', provider: 'resend', id: body.id };
  } catch (e) {
    return { status: 'skipped', provider: 'resend', error: e.message };
  }
}

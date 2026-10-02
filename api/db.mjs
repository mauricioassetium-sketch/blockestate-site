/**
 * Almacen de pre-registros sobre el SQLite integrado de Node (node:sqlite).
 * Sin dependencias: no hay nada que instalar ni que compilar.
 *
 * La base vive en un archivo junto al servidor. En un host con disco persistente
 * (Railway con volumen, Fly con volumen, un VPS) sobrevive a los reinicios; en un
 * host efimero se pierde, y por eso DB_PATH es configurable por variable de entorno.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH || './data/registrations.db';

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS registrations (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    company      TEXT NOT NULL,
    email        TEXT NOT NULL,
    email_norm   TEXT NOT NULL UNIQUE,
    phone        TEXT,
    emirate      TEXT,
    projects     TEXT,
    lang         TEXT,
    ip           TEXT,
    user_agent   TEXT,
    referer      TEXT,
    email_status TEXT NOT NULL DEFAULT 'pending',
    email_error  TEXT,
    unsubscribed_at TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_reg_created ON registrations(created_at DESC);
`);

// migracion suave: si la tabla ya existia sin la columna, se anade
try { db.exec('ALTER TABLE registrations ADD COLUMN unsubscribed_at TEXT'); } catch { /* ya existe */ }

const insertStmt = db.prepare(`
  INSERT INTO registrations (name, company, email, email_norm, phone, emirate, projects, lang, ip, user_agent, referer)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const byEmailStmt = db.prepare('SELECT * FROM registrations WHERE email_norm = ?');
const countStmt = db.prepare('SELECT COUNT(*) AS n FROM registrations');
const allStmt = db.prepare('SELECT * FROM registrations ORDER BY created_at DESC LIMIT ? OFFSET ?');
const markStmt = db.prepare('UPDATE registrations SET email_status = ?, email_error = ? WHERE id = ?');

export function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/** Devuelve {ok:true, row} o {ok:false, duplicado:true, row} — nunca lanza por duplicado. */
export function addRegistration(data) {
  const emailNorm = normaliseEmail(data.email);
  const existing = byEmailStmt.get(emailNorm);
  if (existing) return { ok: false, duplicate: true, row: existing };

  const info = insertStmt.run(
    String(data.name || '').trim(),
    String(data.company || '').trim(),
    String(data.email || '').trim(),
    emailNorm,
    String(data.phone || '').trim() || null,
    String(data.emirate || '').trim() || null,
    String(data.projects || '').trim() || null,
    String(data.lang || '').trim() || null,
    data.ip || null,
    data.userAgent || null,
    data.referer || null
  );
  return { ok: true, row: db.prepare('SELECT * FROM registrations WHERE id = ?').get(info.lastInsertRowid) };
}

export function markEmail(id, status, error) {
  markStmt.run(status, error ? String(error).slice(0, 400) : null, id);
}

export function count() {
  return countStmt.get().n;
}

export function list(limit = 500, offset = 0) {
  return allStmt.all(Math.min(Number(limit) || 500, 5000), Number(offset) || 0);
}

export function close() {
  try { db.close(); } catch { /* nada que hacer */ }
}

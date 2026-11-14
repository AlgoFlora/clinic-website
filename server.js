/* Devaki Clinic — tiny live server (no dependencies).
   Run:  node server.js        → http://localhost:3000
   Optional env: PORT, DOCTOR_EMAIL, DOCTOR_PASSWORD
   All bookings, slots, patients and prescriptions are stored in data/db.json
   and every open page (patients + doctor dashboard) updates in real time. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Core = require('./js/core.js');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

/* ---------- database ---------- */
let db;
try { db = Core.migrate(JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { db = Core.emptyDb(); }

function hashPw(pw, salt) { return crypto.scryptSync(String(pw), salt, 32).toString('hex'); }
if (!db.auth) {
  const salt = crypto.randomBytes(8).toString('hex');
  db.auth = { email: (process.env.DOCTOR_EMAIL || 'doctor@devaki.in').toLowerCase(), salt, hash: hashPw(process.env.DOCTOR_PASSWORD || 'doctor123', salt) };
}
function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}
save();

/* ---------- live updates (Server-Sent Events) ---------- */
const clients = new Set();
function broadcast() { for (const res of clients) res.write('event: changed\ndata: 1\n\n'); }
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000);

/* ---------- sessions ---------- */
const tokens = new Map();
const attempts = new Map();
function newToken() { const t = crypto.randomBytes(24).toString('hex'); tokens.set(t, Date.now() + 11 * 3600e3); return t; }
function authed(req) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  const exp = tokens.get(t);
  if (!exp || exp < Date.now()) { tokens.delete(t); return false; }
  return true;
}

/* ---------- helpers ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp' };
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
function body(req, limit = 6e6) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > limit) { reject(new Error('Too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
  });
}
const PUBLIC_FILES = /^\/(index|appointment|doctor-login|dashboard)\.html$|^\/(css|js|assets)\//;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    /* ----- API ----- */
    if (p === '/api/ping') return json(res, 200, { app: 'devaki-clinic' });
    if (p === '/api/config') return json(res, 200, Core.publicConfig(db));
    if (p === '/api/slots') {
      const d = url.searchParams.get('date') || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return json(res, 400, []);
      return json(res, 200, Core.slotsFor(db, d));
    }
    if (p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write('retry: 3000\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (p === '/api/book' && req.method === 'POST') {
      const r = Core.book(db, await body(req, 20000));
      if (r.ok) { save(); broadcast(); return json(res, 200, { ok: true, appointment: { ref: r.appointment.ref, date: r.appointment.date, time: r.appointment.time, name: r.appointment.name } }); }
      return json(res, r.code === 'SLOT_TAKEN' ? 409 : 400, r);
    }
    if (p === '/api/login' && req.method === 'POST') {
      const ip = req.socket.remoteAddress;
      const a = attempts.get(ip) || { n: 0, t: Date.now() };
      if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
      if (a.n >= 8) return json(res, 429, { ok: false, message: 'Too many attempts. Try again in a few minutes.' });
      const b = await body(req, 2000);
      const ok = String(b.email || '').toLowerCase() === db.auth.email &&
        crypto.timingSafeEqual(Buffer.from(hashPw(b.password || '', db.auth.salt), 'hex'), Buffer.from(db.auth.hash, 'hex'));
      if (!ok) { a.n++; attempts.set(ip, a); return json(res, 401, { ok: false, message: 'Invalid email or password' }); }
      attempts.delete(ip);
      return json(res, 200, { ok: true, token: newToken() });
    }
    if (p === '/api/db') {
      if (!authed(req)) return json(res, 401, { ok: false });
      const { auth, ...safe } = db;
      return json(res, 200, safe);
    }
    if (p === '/api/op' && req.method === 'POST') {
      if (!authed(req)) return json(res, 401, { ok: false });
      const b = await body(req);
      try {
        if (b.op === 'changePassword') {
          const { current, next, email } = b.args || {};
          if (hashPw(current || '', db.auth.salt) !== db.auth.hash) throw new Error('Current password is wrong');
          if (!next || String(next).length < 6) throw new Error('New password must be at least 6 characters');
          const salt = crypto.randomBytes(8).toString('hex');
          db.auth = { email: String(email || db.auth.email).toLowerCase(), salt, hash: hashPw(next, salt) };
          save(); return json(res, 200, { ok: true, result: true });
        }
        const work = JSON.parse(JSON.stringify(db)); // operate on a copy so a failed op never half-saves
        const result = Core.runOp(work, b.op, b.args);
        work.auth = db.auth;
        db = work; save(); broadcast();
        return json(res, 200, { ok: true, result });
      } catch (e) { return json(res, 400, { ok: false, message: e.message }); }
    }
    if (p.startsWith('/api/')) return json(res, 404, { ok: false });

    /* ----- static files ----- */
    let file = p === '/' ? '/index.html' : decodeURIComponent(p);
    if (!PUBLIC_FILES.test(file)) { res.writeHead(404); return res.end('Not found'); }
    const full = path.normalize(path.join(ROOT, file));
    if (!full.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(full, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': file.startsWith('/assets/') ? 'public, max-age=86400' : 'no-cache' });
      res.end(data);
    });
  } catch (e) {
    json(res, 400, { ok: false, message: 'Bad request' });
  }
});

server.listen(PORT, () => console.log('Devaki Clinic running on http://localhost:' + PORT));

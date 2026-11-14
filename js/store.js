/* ========================================
   DEVAKI CLINIC — Browser data layer
   - LIVE mode:  when the site is served by server.js (node server.js).
                 Every visitor and the doctor share one database in real time.
   - LOCAL mode: when the files are simply opened/hosted statically.
                 Data lives in this browser only (demo / single computer).
   ======================================== */
(function () {
  'use strict';
  var LS_DB = 'clinic_db_v2', LS_TOKEN = 'clinic_token', LS_AUTH = 'clinic_auth';
  var DEMO_EMAIL = 'doctor@devaki.in', DEMO_PASS = 'doctor123';

  var Store = {
    mode: 'local',
    ready: null,
    listeners: [],
    _bc: null,

    init: function () {
      if (this.ready) return this.ready;
      var self = this;
      this.ready = (async function () {
        if (/^https?:$/.test(location.protocol)) {
          try {
            var r = await fetchT('/api/ping', 1500);
            if (r.ok) { var j = await r.json(); if (j && j.app === 'devaki-clinic') self.mode = 'server'; }
          } catch (e) { /* static hosting → local mode */ }
        }
        if (self.mode === 'server') {
          try {
            var es = new EventSource('/api/events');
            es.addEventListener('changed', function () { self._emit(); });
          } catch (e) {}
          setInterval(function () { self._emit(); }, 30000);
        } else {
          window.addEventListener('storage', function (e) { if (e.key === LS_DB) self._emit(); });
          if ('BroadcastChannel' in window) {
            self._bc = new BroadcastChannel('devaki-clinic');
            self._bc.onmessage = function () { self._emit(); };
          }
          setInterval(function () { self._emit(); }, 30000);
        }
        return self.mode;
      })();
      return this.ready;
    },

    onChange: function (fn) { this.listeners.push(fn); },
    _emit: function () { this.listeners.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); },

    /* ----- local db helpers ----- */
    _load: function () {
      var db;
      try { db = JSON.parse(localStorage.getItem(LS_DB)); } catch (e) { db = null; }
      db = Core.migrate(db);
      return db;
    },
    _save: function (db) {
      localStorage.setItem(LS_DB, JSON.stringify(db));
      if (this._bc) this._bc.postMessage('changed');
      this._emit();
    },

    /* ----- public (patients) ----- */
    config: async function () {
      await this.init();
      if (this.mode === 'server') return (await fetch('/api/config')).json();
      return Core.publicConfig(this._load());
    },
    slots: async function (date) {
      await this.init();
      if (this.mode === 'server') return (await fetch('/api/slots?date=' + encodeURIComponent(date))).json();
      return Core.slotsFor(this._load(), date);
    },
    book: async function (payload) {
      await this.init();
      if (this.mode === 'server') {
        var r = await fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        return r.json();
      }
      var db = this._load();
      var res = Core.book(db, payload);
      if (res.ok) this._save(db);
      return res;
    },

    /* ----- auth ----- */
    login: async function (email, password) {
      await this.init();
      if (this.mode === 'server') {
        var r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: password }) });
        var j = await r.json();
        if (!j.ok) return j;
        localStorage.setItem(LS_TOKEN, JSON.stringify({ token: j.token, exp: Date.now() + 11 * 3600e3 }));
        return { ok: true };
      }
      if (email === DEMO_EMAIL && password === DEMO_PASS) {
        localStorage.setItem(LS_AUTH, JSON.stringify({ name: 'Dr. Dnyaneshwar Giri', email: email, loginAt: new Date().toISOString() }));
        return { ok: true };
      }
      return { ok: false, message: 'Invalid email or password' };
    },
    token: function () {
      try { var t = JSON.parse(localStorage.getItem(LS_TOKEN)); if (t && t.exp > Date.now()) return t.token; } catch (e) {}
      return null;
    },
    isAuthed: function () {
      if (this.mode === 'server') return !!this.token();
      try { var a = JSON.parse(localStorage.getItem(LS_AUTH)); return !!a && (Date.now() - new Date(a.loginAt).getTime()) < 24 * 3600e3; } catch (e) { return false; }
    },
    logout: function () { localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_AUTH); },

    /* ----- admin (doctor) ----- */
    getDb: async function () {
      await this.init();
      if (this.mode === 'server') {
        var r = await fetch('/api/db', { headers: { Authorization: 'Bearer ' + (this.token() || '') } });
        if (r.status === 401) { this.logout(); throw new Error('AUTH'); }
        return r.json();
      }
      return this._load();
    },
    op: async function (name, args) {
      await this.init();
      if (this.mode === 'server') {
        var r = await fetch('/api/op', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (this.token() || '') }, body: JSON.stringify({ op: name, args: args || {} }) });
        if (r.status === 401) { this.logout(); throw new Error('AUTH'); }
        var j = await r.json();
        if (!j.ok) throw new Error(j.message || 'Failed');
        return j.result;
      }
      var db = this._load();
      var res = Core.runOp(db, name, args || {});
      this._save(db);
      return res;
    }
  };

  function fetchT(url, ms) {
    var c = new AbortController(); var t = setTimeout(function () { c.abort(); }, ms);
    return fetch(url, { signal: c.signal }).finally(function () { clearTimeout(t); });
  }

  window.Store = Store;
})();

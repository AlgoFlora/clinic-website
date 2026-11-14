/* ========================================
   DEVAKI CLINIC — Doctor dashboard (core, login, overview, appointments, patients, records)
   All data comes from Store (live server or local browser) — nothing is hard-coded.
   ======================================== */
(function () {
  'use strict';

  var DASH = window.DASH = { db: null, ui: { apptStatus: 'all', apptRange: 'upcoming', apptQ: '', trend: 7, patientId: null, patientQ: '', recordQ: '', fuTab: 'due' }, views: {}, actions: {}, changes: {} };
  var $ = function (id) { return document.getElementById(id); };
  var esc = DASH.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var lang = function () { return (window.getLang && getLang()) || 'en'; };
  var _ = DASH._ = function (s) { var m = window.DASH_MR; return (lang() === 'mr' && m && m[s]) || s; };
  var money = DASH.money = function (n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); };
  var today = DASH.today = function () { return Core.istNow().date; };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var fmtDate = DASH.fmtDate = function (ds) { if (!ds) return '—'; var p = ds.split('-'); return +p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0]; };
  var fmtShort = DASH.fmtShort = function (ds) { var p = ds.split('-'); return +p[2] + ' ' + MON[+p[1] - 1]; };
  var tlabel = DASH.tlabel = function (t) { return /^\d\d:\d\d$/.test(t) ? Core.label12(t) : t; };
  var STAT_TAG = { pending: 'orange', confirmed: '', completed: 'green', cancelled: 'red', 'no-show': 'gray' };
  var statusLabel = DASH.statusLabel = function (s) { return _({ pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', 'no-show': 'No-show' }[s] || s); };
  DASH.statusTag = function (s) { return '<span class="tag ' + (STAT_TAG[s] || '') + '">' + esc(statusLabel(s)) + '</span>'; };
  DASH.payTag = function (a) { return a.payment.status === 'paid' ? '<span class="tag green">' + _('Paid') + ' · ' + money(a.payment.amount) + (a.payment.method ? ' · ' + esc(a.payment.method.toUpperCase()) : '') + '</span>' : '<span class="tag red">' + _('Unpaid') + ' · ' + money(a.payment.amount) + '</span>'; };
  var initials = DASH.initials = function (n) { return esc((n || '?').trim().charAt(0).toUpperCase()); };
  var patientOf = DASH.patientOf = function (id) { return DASH.db.patients.filter(function (p) { return p.id === id; })[0]; };
  var condOf = DASH.condOf = function (id) { return DASH.db.conditions.filter(function (c) { return c.id === id; })[0]; };
  var condName = DASH.condName = function (c) { if (!c) return ''; return lang() === 'mr' && c.mr ? c.mr : c.name; };
  DASH.condLabel = function (a) { var c = condOf(a.conditionId); return c ? condName(c) : a.conditionName; };
  var tel = function (p) { return '<a class="icon-btn" title="Call" href="tel:+91' + esc(p) + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg></a>'; };
  var wa = function (p) { return '<a class="icon-btn" title="WhatsApp" target="_blank" rel="noopener" href="https://wa.me/91' + esc(p) + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.79a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89a9.83 9.83 0 0 1 6.99 2.9 9.83 9.83 0 0 1 2.89 7c0 5.45-4.44 9.88-9.89 9.88M20.46 3.49A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.9 11.9 0 0 0 5.68 1.45c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42"/></svg></a>'; };
  DASH.contactBtns = function (p) { return tel(p) + wa(p); };

  /* ---------- toast / modal ---------- */
  var toast = DASH.toast = function (m, type) { if (window.showToast) showToast(m, type || 'info', 3500); };
  DASH.modal = function (o) {
    var root = $('modalRoot');
    root.innerHTML = '<div class="modal-bg" data-act="modal-bg"><div class="modal-box' + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h3>' + esc(o.title) + '</h3><button class="modal-x" data-act="modal-close" aria-label="Close">×</button></div>' +
      '<div class="modal-body">' + o.body + '</div>' + (o.foot ? '<div class="modal-foot">' + o.foot + '</div>' : '') + '</div></div>';
    document.body.style.overflow = 'hidden';
    if (o.onMount) o.onMount(root);
    var first = root.querySelector('input:not([type=hidden]),select,textarea'); if (first && !o.noFocus) first.focus();
  };
  var closeModal = DASH.closeModal = function () { $('modalRoot').innerHTML = ''; document.body.style.overflow = ''; DASH.modalState = null; };
  DASH.modalOpen = function () { return !!$('modalRoot').firstChild; };
  DASH.val = function (id) { var e = $(id); return e ? e.value : ''; };

  /* ---------- data ---------- */
  var render;
  var refreshing = false, again = false, known = null;
  var refresh = DASH.refresh = async function () {
    if (refreshing) { again = true; return; }
    refreshing = true;
    try {
      var db = await Store.getDb();
      DASH.db = db;
      notifyNew(db);
      render();
    } catch (e) {
      if (e.message === 'AUTH') { location.href = 'doctor-login.html'; return; }
      console.error(e);
    } finally { refreshing = false; if (again) { again = false; refresh(); } }
  };
  DASH.op = async function (name, args, okMsg) {
    try { var r = await Store.op(name, args); if (okMsg) toast(okMsg, 'success'); await refresh(); return r; }
    catch (e) { if (e.message === 'AUTH') { location.href = 'doctor-login.html'; return; } toast(e.message || 'Failed', 'error'); throw e; }
  };

  function notifyNew(db) {
    var ids = {};
    db.appointments.forEach(function (a) { ids[a.id] = a; });
    if (known) {
      Object.keys(ids).forEach(function (id) {
        if (!known[id] && ids[id].source === 'web') {
          var a = ids[id];
          toast(_('New booking') + ': ' + a.name + ' — ' + fmtShort(a.date) + ', ' + tlabel(a.time), 'success');
          try { var ac = new (window.AudioContext || window.webkitAudioContext)(), o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 880; g.gain.value = .08; o.start(); setTimeout(function () { o.stop(); ac.close(); }, 180); } catch (e) {}
        }
      });
    }
    known = ids;
  }

  /* ---------- view switching ---------- */
  var TITLES = { overview: 'Dashboard', appointments: 'Appointments', patients: 'Patients', records: 'Clinical Records', prescriptions: 'Prescriptions', followups: 'Follow-ups', reports: 'Reports', settings: 'Settings' };
  var view = 'overview';
  DASH.go = function (v) {
    if (!TITLES[v]) v = 'overview';
    view = v; DASH.ui.patientId = v === 'patients' ? DASH.ui.patientId : null;
    document.querySelectorAll('.sidebar-link[data-view]').forEach(function (l) { l.classList.toggle('active', l.getAttribute('data-view') === v); });
    $('sidebar').classList.remove('open');
    if (history.replaceState) history.replaceState(null, '', '#' + v);
    DASH.fresh = true; render(); window.scrollTo(0, 0);
  };

  render = function () {
    if (!DASH.db) return;
    var root = $('viewRoot');
    $('viewTitle').textContent = _(TITLES[view]);
    // keep typing focus across live re-renders
    var ae = document.activeElement, fid = ae && ae.id && root.contains(ae) ? ae.id : null, ss = null, se = null;
    if (fid && ae.selectionStart != null) { ss = ae.selectionStart; se = ae.selectionEnd; }
    var sy = window.scrollY;
    // forms must not be wiped by live updates
    if (!DASH.fresh && DASH.views[view] && DASH.views[view].static) { updateBadges(); return; }
    var fn = DASH.views[view];
    root.innerHTML = fn ? fn.render() : '';
    DASH.fresh = false;
    if (fn && fn.mount) fn.mount(root);
    if (fid && $(fid)) { $(fid).focus(); try { if (ss != null) $(fid).setSelectionRange(ss, se); } catch (e) {} }
    window.scrollTo(0, sy);
    updateBadges();
  };

  DASH.render = function () { render(); };

  function updateBadges() {
    var d = DASH.db, td = today();
    var n = d.appointments.filter(function (a) { return a.date === td && (a.status === 'pending' || a.status === 'confirmed'); }).length;
    var b = $('navApptBadge'); b.textContent = n; b.hidden = !n;
    var f = d.followups.filter(function (x) { return x.status === 'pending' && x.date <= td; }).length;
    var fb = $('navFuBadge'); fb.textContent = f; fb.hidden = !f;
    var s = d.settings; $('docName').textContent = s.doctorName; $('docName2').textContent = s.doctorName;
  }

  /* ========== OVERVIEW ========== */
  var PAL = ['#1769C2', '#087F72', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#94A3B8'];
  DASH.views.overview = {
    render: function () {
      var d = DASH.db, td = today(), A = d.appointments;
      var tA = A.filter(function (a) { return a.date === td; });
      var live = tA.filter(function (a) { return a.status !== 'cancelled'; });
      var pending = A.filter(function (a) { return a.status === 'pending' && a.date >= td; }).length;
      var confirmed = tA.filter(function (a) { return a.status === 'confirmed'; }).length;
      var completed = tA.filter(function (a) { return a.status === 'completed'; }).length;
      var collected = A.filter(function (a) { return a.payment.status === 'paid' && a.payment.paidAt && Core.istNow(new Date(a.payment.paidAt)).date === td; }).reduce(function (s, a) { return s + (+a.payment.amount || 0); }, 0);
      var dues = A.filter(function (a) { return a.status === 'completed' && a.payment.status !== 'paid'; });
      var free = 0; // free slots left today
      var h = '<div class="stats-grid six">' +
        stat('blue', _('Appointments Today'), live.length, tA.length - live.length ? (tA.length - live.length) + ' ' + _('cancelled') : _('All active'), '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>') +
        stat('yellow', _('Pending Confirmation'), pending, _('Upcoming, not yet confirmed'), '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>') +
        stat('green', _('Confirmed Today'), confirmed, _('Waiting to be seen'), '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>') +
        stat('purple', _('Completed Today'), completed, _('Visits finished'), '<path d="M20 6 9 17l-5-5"/>') +
        stat('green', _('Collected Today'), money(collected), _('Payments received'), '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>') +
        stat('yellow', _('Payment Due'), dues.length, money(dues.reduce(function (s, a) { return s + (+a.payment.amount || 0); }, 0)) + ' ' + _('to collect'), '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>') +
        '</div>';

      h += '<div class="dash-panels"><div class="dash-panel"><div class="panel-header"><h3>' + _('Appointments Trend') + '</h3><div class="tabs" style="background:var(--neutral-50);">' +
        [[7, 'Last 7 days'], [30, 'Last 30 days'], [-7, 'Next 7 days']].map(function (t) { return '<span class="tab' + (DASH.ui.trend === t[0] ? ' active' : '') + '" data-act="trend" data-v="' + t[0] + '">' + _(t[1]) + '</span>'; }).join('') +
        '</div></div><div class="panel-body">' + trend() + '</div></div>';

      h += '<div class="dash-panel"><div class="panel-header"><h3>' + _('Bookings by Problem') + '</h3><span class="muted small">' + _('Last 30 days') + '</span></div><div class="panel-body">' + donut() + '</div></div></div>';

      var list = live.slice().sort(function (a, b) { return a.time < b.time ? -1 : 1; });
      h += '<div class="dash-panels"><div class="dash-panel"><div class="panel-header"><h3>' + _("Today's Appointments") + '</h3><span class="badge badge-primary">' + list.length + ' ' + _('scheduled') + '</span></div><div class="panel-body" style="padding:0;">' +
        (list.length ? '<div class="appointment-list">' + list.map(function (a) {
          return '<div class="appointment-item" style="cursor:pointer;flex-wrap:wrap;" data-act="appt" data-id="' + a.id + '"><span class="time">' + esc(tlabel(a.time)) + '</span><div class="avatar sm">' + initials(a.name) + '</div><span class="patient-name">' + esc(a.name) + '<br><small class="muted">' + esc(DASH.condLabel(a)) + '</small></span>' + DASH.statusTag(a.status) + (a.payment.status === 'paid' ? '<span class="tag green">₹</span>' : '') + '</div>';
        }).join('') + '</div>' : '<p class="empty">' + _('No appointments today yet. New bookings appear here instantly.') + '</p>') + '</div></div>';

      var recent = d.patients.slice().sort(function (a, b) { return lastVisit(b.id) < lastVisit(a.id) ? -1 : 1; }).slice(0, 6);
      h += '<div class="dash-panel"><div class="panel-header"><h3>' + _('Recent Patients') + '</h3><button class="btn btn-sm btn-ghost" data-act="go" data-v="patients">' + _('View All') + ' →</button></div><div class="panel-body" style="padding:8px;">' +
        (recent.length ? '<div class="patient-list">' + recent.map(function (p) {
          return '<div class="patient-item" data-act="patient" data-id="' + p.id + '"><div class="avatar sm">' + initials(p.name) + '</div><div class="patient-info"><h5>' + esc(p.name) + '</h5><p>' + esc(p.phone) + (p.age !== '' && p.age != null ? ' • ' + p.age + ' ' + _('yrs') : '') + '</p></div><div class="patient-meta"><p class="muted small">' + fmtShort(lastVisit(p.id) || td) + '</p></div></div>';
        }).join('') + '</div>' : '<p class="empty">' + _('Patients appear here after their first booking.') + '</p>') + '</div></div></div>';
      return h;
    }
  };
  function stat(color, label, value, sub, ic) {
    return '<div class="stat-card"><div class="stat-icon ' + color + '"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ic + '</svg></div><p class="stat-label">' + label + '</p><p class="stat-value">' + value + '</p><span class="stat-sub">' + sub + '</span></div>';
  }
  function lastVisit(pid) {
    var m = ''; DASH.db.appointments.forEach(function (a) { if (a.patientId === pid && a.status !== 'cancelled' && a.date > m) m = a.date; }); return m;
  }
  DASH.lastVisit = lastVisit;
  function trend() {
    var td = today(), n = DASH.ui.trend, dates = [], i;
    if (n > 0) for (i = n - 1; i >= 0; i--) dates.push(Core.addDays(td, -i)); else for (i = 0; i < -n; i++) dates.push(Core.addDays(td, i));
    var cnt = {}; dates.forEach(function (d) { cnt[d] = 0; });
    DASH.db.appointments.forEach(function (a) { if (a.status !== 'cancelled' && cnt[a.date] != null) cnt[a.date]++; });
    var max = Math.max.apply(null, dates.map(function (d) { return cnt[d]; }).concat([1])), total = 0;
    dates.forEach(function (d) { total += cnt[d]; });
    var step = dates.length > 14 ? 3 : 1;
    return '<div class="trend">' + dates.map(function (d) {
      var c = cnt[d], hgt = c ? Math.max(6, Math.round(c / max * 140)) : 3;
      return '<div class="col" title="' + fmtShort(d) + ': ' + c + '">' + (c ? '<span class="val">' + c + '</span>' : '') + '<div class="bar' + (d === td ? ' today' : '') + (c ? '' : ' zero') + '" style="height:' + hgt + 'px"></div></div>';
    }).join('') + '</div><div class="trend-labels">' + dates.map(function (d, i) { return '<span>' + (i % step === 0 ? fmtShort(d).replace(' ', '\u00a0') : '') + '</span>'; }).join('') + '</div><p class="muted small" style="margin-top:10px;">' + total + ' ' + _('appointments in this period') + '</p>';
  }
  function donut() {
    var from = Core.addDays(today(), -29), by = {}, total = 0;
    DASH.db.appointments.forEach(function (a) {
      if (a.status === 'cancelled' || a.date < from) return;
      var k = DASH.condLabel(a); by[k] = (by[k] || 0) + 1; total++;
    });
    var arr = Object.keys(by).map(function (k) { return [k, by[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    if (!total) return '<p class="empty">' + _('No bookings in the last 30 days.') + '</p>';
    var top = arr.slice(0, 6), rest = arr.slice(6).reduce(function (s, x) { return s + x[1]; }, 0);
    if (rest) top.push([_('Others'), rest]);
    var acc = 0, stops = top.map(function (x, i) { var a = acc / total * 100; acc += x[1]; return PAL[i % PAL.length] + ' ' + a + '% ' + (acc / total * 100) + '%'; });
    return '<div class="donut-wrap"><div class="donut" style="background:conic-gradient(' + stops.join(',') + ')"><div class="c"><div><b>' + total + '</b><span>' + _('Total') + '</span></div></div></div><div class="legend">' +
      top.map(function (x, i) { return '<div><i style="background:' + PAL[i % PAL.length] + '"></i>' + esc(x[0]) + '<b>' + x[1] + '</b></div>'; }).join('') + '</div></div>';
  }

  /* ========== APPOINTMENTS ========== */
  function filteredAppts() {
    var u = DASH.ui, td = today(), q = u.apptQ.trim().toLowerCase();
    var list = DASH.db.appointments.filter(function (a) {
      if (u.apptStatus !== 'all' && a.status !== u.apptStatus) return false;
      if (u.apptRange === 'today' && a.date !== td) return false;
      if (u.apptRange === 'upcoming' && a.date < td) return false;
      if (u.apptRange === 'past' && a.date >= td) return false;
      if (q && (a.name + ' ' + a.phone + ' ' + a.ref + ' ' + a.conditionName).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var asc = u.apptRange !== 'past' && u.apptRange !== 'all';
    list.sort(function (a, b) { var x = a.date + a.time, y = b.date + b.time; return asc ? (x < y ? -1 : 1) : (x < y ? 1 : -1); });
    return list;
  }
  function apptRow(a) {
    var past = a.date < today();
    return '<tr><td><span class="ref">' + esc(a.ref) + '</span><br><small class="muted">' + esc(a.source === 'walk-in' ? _('Walk-in') : a.source === 'demo' ? 'Demo' : _('Online')) + '</small></td>' +
      '<td><span class="name" style="cursor:pointer;color:var(--primary-800)" data-act="patient" data-id="' + a.patientId + '">' + esc(a.name) + '</span> ' + (a.visitType === 'returning' ? '<span class="tag teal">' + _('Returning') + '</span>' : '<span class="tag">' + _('New') + '</span>') +
      '<br><small class="muted">' + esc(a.phone) + (a.age !== '' ? ' • ' + a.age + ' ' + _('yrs') : '') + '</small></td>' +
      '<td><b>' + fmtShort(a.date) + '</b>' + (a.date === today() ? ' <span class="tag green">' + _('Today') + '</span>' : '') + '<br><small>' + esc(tlabel(a.time)) + '</small></td>' +
      '<td>' + esc(DASH.condLabel(a)) + (a.concern ? '<br><small class="muted">' + esc(a.concern.slice(0, 60)) + '</small>' : '') + '</td>' +
      '<td><select class="status-select" data-chg="status" data-id="' + a.id + '">' + Core.STATUSES.map(function (s) { return '<option value="' + s + '"' + (a.status === s ? ' selected' : '') + '>' + statusLabel(s) + '</option>'; }).join('') + '</select></td>' +
      '<td>' + DASH.payTag(a) + '<br><button class="btn btn-xs btn-ghost" data-act="pay" data-id="' + a.id + '">' + (a.payment.status === 'paid' ? _('Edit') : _('Mark paid')) + '</button></td>' +
      '<td><div class="row-actions">' + (a.status !== 'completed' && a.status !== 'cancelled' ? '<button class="btn btn-xs btn-primary" data-act="visit" data-id="' + a.id + '">' + _('Start visit') + '</button>' : '<button class="btn btn-xs btn-secondary" data-act="appt" data-id="' + a.id + '">' + _('Details') + '</button>') + DASH.contactBtns(a.phone) + '</div></td></tr>';
  }
  DASH.views.appointments = {
    render: function () {
      var u = DASH.ui, list = filteredAppts();
      var chips = [['all', 'All'], ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['no-show', 'No-show']].map(function (s) {
        var n = DASH.db.appointments.filter(function (a) { return s[0] === 'all' || a.status === s[0]; }).length;
        return '<button class="chip' + (u.apptStatus === s[0] ? ' active' : '') + '" data-act="astatus" data-v="' + s[0] + '">' + _(s[1]) + ' (' + n + ')</button>';
      }).join('');
      return '<div class="view-head"><div class="toolbar">' + chips + '</div><button class="btn btn-primary btn-sm" data-act="walkin">+ ' + _('Walk-in patient') + '</button></div>' +
        '<div class="toolbar" style="margin-bottom:16px;"><select class="form-input sm" style="max-width:190px" id="apptRange" data-chg="arange">' +
        [['upcoming', 'Today & upcoming'], ['today', 'Today only'], ['past', 'Past'], ['all', 'All dates']].map(function (r) { return '<option value="' + r[0] + '"' + (u.apptRange === r[0] ? ' selected' : '') + '>' + _(r[1]) + '</option>'; }).join('') + '</select>' +
        '<input id="apptQ" class="form-input sm search-input" type="search" placeholder="' + _('Search name, phone or reference…') + '" value="' + esc(u.apptQ) + '" data-inp="apptQ"></div>' +
        '<div class="dash-panel"><div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>' + _('Reference') + '</th><th>' + _('Patient') + '</th><th>' + _('When') + '</th><th>' + _('Problem') + '</th><th>' + _('Status') + '</th><th>' + _('Payment') + '</th><th>' + _('Actions') + '</th></tr></thead><tbody>' +
        (list.length ? list.map(apptRow).join('') : '<tr><td colspan="7" class="empty">' + _('No appointments found.') + '</td></tr>') + '</tbody></table></div></div>' +
        '<p class="muted small" style="margin-top:10px;">' + list.length + ' ' + _('shown') + '</p>';
    }
  };

  DASH.openAppt = function (id) {
    var a = DASH.db.appointments.filter(function (x) { return x.id === id; })[0]; if (!a) return;
    var p = patientOf(a.patientId);
    DASH.modal({
      title: _('Appointment') + ' ' + a.ref,
      body: '<dl class="kv"><dt>' + _('Patient') + '</dt><dd>' + esc(a.name) + (p && p.name !== a.name ? ' <small class="muted">(' + _('on file') + ': ' + esc(p.name) + ')</small>' : '') + '</dd>' +
        '<dt>' + _('Phone') + '</dt><dd>' + esc(a.phone) + ' ' + DASH.contactBtns(a.phone) + '</dd><dt>' + _('Age / Gender') + '</dt><dd>' + esc(a.age) + (a.gender ? ' / ' + esc(a.gender) : '') + '</dd>' +
        '<dt>' + _('When') + '</dt><dd>' + fmtDate(a.date) + ', ' + esc(tlabel(a.time)) + '</dd><dt>' + _('Problem') + '</dt><dd>' + esc(DASH.condLabel(a)) + '</dd>' +
        (a.concern ? '<dt>' + _('Details') + '</dt><dd>' + esc(a.concern) + '</dd>' : '') + '<dt>' + _('Status') + '</dt><dd>' + DASH.statusTag(a.status) + '</dd><dt>' + _('Payment') + '</dt><dd>' + DASH.payTag(a) + '</dd>' +
        '<dt>' + _('Booked') + '</dt><dd>' + new Date(a.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + '</dd></dl>',
      foot: '<button class="btn btn-secondary" data-act="patient" data-id="' + a.patientId + '">' + _('Patient history') + '</button><button class="btn btn-secondary" data-act="pay" data-id="' + a.id + '">' + _('Payment') + '</button>' +
        (a.status !== 'completed' && a.status !== 'cancelled' ? '<button class="btn btn-primary" data-act="visit" data-id="' + a.id + '">' + _('Start visit') + '</button>' : '')
    });
  };

  DASH.openPay = function (id) {
    var a = DASH.db.appointments.filter(function (x) { return x.id === id; })[0]; if (!a) return;
    DASH.modal({
      title: _('Payment') + ' — ' + a.ref,
      body: '<p style="margin-bottom:12px;"><b>' + esc(a.name) + '</b> · ' + DASH.payTag(a) + '</p><div class="fgrid"><div><label for="payAmt">' + _('Amount (₹)') + '</label><input class="form-input" id="payAmt" type="number" min="0" value="' + a.payment.amount + '"></div>' +
        '<div><label for="payMethod">' + _('Method') + '</label><select class="form-input" id="payMethod"><option value="cash">' + _('Cash') + '</option><option value="upi">UPI</option><option value="card">' + _('Card') + '</option></select></div></div>',
      foot: (a.payment.status === 'paid' ? '<button class="btn btn-secondary" data-act="pay-save" data-id="' + a.id + '" data-v="unpaid">' + _('Mark unpaid') + '</button>' : '') + '<button class="btn btn-success" data-act="pay-save" data-id="' + a.id + '" data-v="paid">✓ ' + _('Mark paid') + '</button>',
      onMount: function () { if (a.payment.method) $('payMethod').value = a.payment.method; }
    });
  };

  DASH.openWalkin = function () {
    var opts = DASH.db.conditions.map(function (c) { return '<option value="' + c.id + '">' + esc(condName(c)) + '</option>'; }).join('');
    DASH.modal({
      title: _('Walk-in patient'),
      body: '<div class="fgrid"><div><label for="wName">' + _('Full Name') + ' *</label><input class="form-input" id="wName" maxlength="80"></div><div><label for="wPhone">' + _('Mobile Number') + ' *</label><input class="form-input" id="wPhone" inputmode="numeric" maxlength="18"></div>' +
        '<div><label for="wAge">' + _('Age') + ' *</label><input class="form-input" id="wAge" type="number" min="0" max="120"></div><div><label for="wGender">' + _('Gender') + '</label><select class="form-input" id="wGender"><option value="">—</option><option>Female</option><option>Male</option><option>Other</option></select></div>' +
        '<div class="full"><label for="wCond">' + _('Problem') + '</label><select class="form-input" id="wCond">' + opts + '</select></div><div class="full"><label for="wConcern">' + _('Details') + '</label><input class="form-input" id="wConcern"></div></div>' +
        '<p class="muted small" style="margin-top:10px;">' + _('If this mobile number already exists, the visit is added to that patient’s history.') + '</p>',
      foot: '<button class="btn btn-primary" data-act="walkin-save">' + _('Add & start') + '</button>'
    });
  };

  /* ========== PATIENTS ========== */
  function patientStats(pid) {
    var A = DASH.db.appointments.filter(function (a) { return a.patientId === pid && a.status !== 'cancelled'; });
    var due = DASH.db.appointments.filter(function (a) { return a.patientId === pid && a.status === 'completed' && a.payment.status !== 'paid'; }).reduce(function (s, a) { return s + (+a.payment.amount || 0); }, 0);
    return { visits: A.filter(function (a) { return a.status === 'completed'; }).length, booked: A.length, due: due, last: lastVisit(pid) };
  }
  DASH.views.patients = {
    render: function () {
      if (DASH.ui.patientId && patientOf(DASH.ui.patientId)) return patientDetail(patientOf(DASH.ui.patientId));
      DASH.ui.patientId = null;
      var q = DASH.ui.patientQ.trim().toLowerCase();
      var list = DASH.db.patients.filter(function (p) { return !q || (p.name + ' ' + p.phone + ' ' + (p.nameVariants || []).join(' ')).toLowerCase().indexOf(q) !== -1; })
        .sort(function (a, b) { return (lastVisit(b.id) || '') < (lastVisit(a.id) || '') ? -1 : 1; });
      return '<div class="view-head"><input id="patientQ" class="form-input sm search-input" type="search" placeholder="' + _('Search by name or phone…') + '" value="' + esc(DASH.ui.patientQ) + '" data-inp="patientQ"><span class="muted small">' + list.length + ' ' + _('patients') + '</span></div>' +
        '<div class="dash-panel"><div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>' + _('Patient') + '</th><th>' + _('Phone') + '</th><th>' + _('Age') + '</th><th>' + _('Visits') + '</th><th>' + _('Last Visit') + '</th><th>' + _('Dues') + '</th><th></th></tr></thead><tbody>' +
        (list.length ? list.map(function (p) {
          var s = patientStats(p.id);
          return '<tr><td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar sm">' + initials(p.name) + '</div><div><span class="name">' + esc(p.name) + '</span>' + ((p.nameVariants || []).length ? '<br><small class="muted">' + _('also') + ': ' + esc(p.nameVariants.join(', ')) + '</small>' : '') + '</div></div></td><td>' + esc(p.phone) + '</td><td>' + esc(p.age) + (p.gender ? ' / ' + esc(p.gender.charAt(0)) : '') + '</td><td>' + s.visits + '</td><td>' + (s.last ? fmtDate(s.last) : '—') + '</td><td>' + (s.due ? '<span class="tag red">' + money(s.due) + '</span>' : '—') + '</td><td><button class="btn btn-sm btn-primary" data-act="patient" data-id="' + p.id + '">' + _('View History') + '</button></td></tr>';
        }).join('') : '<tr><td colspan="7" class="empty">' + _('No patients yet. They are added automatically when someone books.') + '</td></tr>') + '</tbody></table></div></div>';
    }
  };

  function patientTimeline(pid) {
    var d = DASH.db, appts = d.appointments.filter(function (a) { return a.patientId === pid; });
    var recs = d.records.filter(function (r) { return r.patientId === pid; }), rxs = d.prescriptions.filter(function (r) { return r.patientId === pid; });
    var used = {}, items = appts.map(function (a) {
      var r = recs.filter(function (x) { return x.appointmentId === a.id; }), x = rxs.filter(function (y) { return y.appointmentId === a.id; });
      r.forEach(function (z) { used[z.id] = 1; }); x.forEach(function (z) { used['rx' + z.id] = 1; });
      return { date: a.date, time: a.time, appt: a, recs: r, rxs: x };
    });
    recs.forEach(function (r) { if (!used[r.id]) items.push({ date: r.date, time: '99', appt: null, recs: [r], rxs: rxs.filter(function (y) { return y.id === r.prescriptionId; }) }); });
    items.sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; });
    return items;
  }
  DASH.rxHtml = function (rx) {
    return '<ul class="rx-list">' + rx.items.map(function (i) { return '<li><b>' + esc(i.name) + '</b>' + (i.strength ? ' ' + esc(i.strength) : '') + ' — ' + [i.dose, i.freq, i.days ? i.days + ' ' + _('days') : '', i.instructions].filter(Boolean).map(esc).join(' · ') + '</li>'; }).join('') + '</ul>' + (rx.advice ? '<p class="small" style="margin-top:6px;"><b>' + _('Advice') + ':</b> ' + esc(rx.advice) + '</p>' : '');
  };
  function patientDetail(p) {
    var s = patientStats(p.id), tl = patientTimeline(p.id), fu = DASH.db.followups.filter(function (f) { return f.patientId === p.id && f.status === 'pending'; });
    var h = '<button class="btn btn-ghost" data-act="patients-back" style="margin-bottom:14px;">← ' + _('Back to Patients') + '</button><div class="split"><div class="dash-panel"><div class="panel-body">' +
      '<div style="text-align:center;margin-bottom:14px;"><div class="avatar lg" style="margin:0 auto 8px;">' + initials(p.name) + '</div><h3>' + esc(p.name) + '</h3><span class="ref">' + esc(p.id) + '</span>' + ((p.nameVariants || []).length ? '<p class="muted small">' + _('Also recorded as') + ': ' + esc(p.nameVariants.join(', ')) + '</p>' : '') + '</div>' +
      (p.allergies ? '<div class="warn">⚠ ' + _('Allergies') + ': ' + esc(p.allergies) + '</div>' : '') +
      '<dl class="kv"><dt>' + _('Phone') + '</dt><dd>' + esc(p.phone) + ' ' + DASH.contactBtns(p.phone) + '</dd><dt>' + _('Age / Gender') + '</dt><dd>' + esc(p.age) + (p.gender ? ' / ' + esc(p.gender) : '') + '</dd><dt>' + _('Blood group') + '</dt><dd>' + esc(p.bloodGroup || '—') + '</dd><dt>' + _('Email') + '</dt><dd>' + esc(p.email || '—') + '</dd>' +
      '<dt>' + _('Visits') + '</dt><dd>' + s.visits + ' ' + _('completed') + ' / ' + s.booked + ' ' + _('booked') + '</dd><dt>' + _('Dues') + '</dt><dd>' + (s.due ? money(s.due) : '—') + '</dd><dt>' + _('Notes') + '</dt><dd>' + esc(p.notes || '—') + '</dd></dl>' +
      '<div class="row-actions" style="margin-top:14px;"><button class="btn btn-sm btn-secondary" data-act="edit-patient" data-id="' + p.id + '">' + _('Edit details') + '</button><button class="btn btn-sm btn-secondary" data-act="add-record" data-id="' + p.id + '">+ ' + _('Add note') + '</button><button class="btn btn-sm btn-secondary" data-act="add-fu" data-id="' + p.id + '">+ ' + _('Follow-up') + '</button></div>' +
      (DASH.db.patients.length > 1 ? '<div style="margin-top:12px;"><button class="btn btn-xs btn-ghost" data-act="merge" data-id="' + p.id + '">' + _('Merge duplicate…') + '</button></div>' : '') +
      '</div></div><div><div class="panel-header" style="padding:0 0 12px;"><h3>' + _('Visit History') + ' (' + tl.length + ')</h3></div>' +
      (fu.length ? '<div class="warn" style="background:var(--warning-light);color:var(--warning);">' + _('Follow-up due') + ': ' + fu.map(function (f) { return fmtShort(f.date) + ' — ' + esc(f.reason); }).join(' · ') + '</div>' : '') +
      '<div class="timeline">' + (tl.length ? tl.map(function (e) {
        var a = e.appt;
        return '<div class="visit"><div class="visit-head"><span class="date">' + fmtDate(e.date) + (a ? ', ' + esc(tlabel(a.time)) : '') + '</span>' + (a ? '<span class="ref">' + esc(a.ref) + '</span>' + DASH.statusTag(a.status) + DASH.payTag(a) + (a.name !== p.name ? '<span class="tag gray">' + _('as') + ' “' + esc(a.name) + '”</span>' : '') : '<span class="tag gray">' + _('Note') + '</span>') + '</div>' +
          (a ? '<p><b>' + _('Problem') + ':</b> ' + esc(DASH.condLabel(a)) + (a.concern ? ' — ' + esc(a.concern) : '') + '</p>' : '') +
          e.recs.map(function (r) { return '<p style="margin-top:6px;"><b>' + _('Diagnosis') + ':</b> ' + esc(r.diagnosis || '—') + '</p>' + (r.notes ? '<p class="small">' + esc(r.notes) + '</p>' : '') + vitalsHtml(r.vitals); }).join('') +
          e.rxs.map(function (x) { return DASH.rxHtml(x) + '<button class="btn btn-xs btn-ghost" data-act="print-rx" data-id="' + x.id + '" style="margin-top:6px;">🖨 ' + _('Print prescription') + '</button>'; }).join('') + '</div>';
      }).join('') : '<p class="empty">' + _('No visits recorded yet.') + '</p>') + '</div></div></div>';
    return h;
  }
  function vitalsHtml(v) {
    if (!v) return ''; var parts = [];
    if (v.bp) parts.push('BP ' + esc(v.bp)); if (v.temp) parts.push(esc(v.temp) + '°F'); if (v.pulse) parts.push(_('Pulse') + ' ' + esc(v.pulse)); if (v.weight) parts.push(esc(v.weight) + ' kg'); if (v.spo2) parts.push('SpO₂ ' + esc(v.spo2) + '%');
    return parts.length ? '<p class="small muted">' + parts.join(' · ') + '</p>' : '';
  }
  DASH.vitalsHtml = vitalsHtml;

  DASH.openEditPatient = function (id) {
    var p = patientOf(id);
    DASH.modal({
      title: _('Edit patient'),
      body: '<div class="fgrid"><div><label for="epName">' + _('Full Name') + '</label><input class="form-input" id="epName" value="' + esc(p.name) + '"></div><div><label for="epPhone">' + _('Mobile Number') + '</label><input class="form-input" id="epPhone" value="' + esc(p.phone) + '"></div>' +
        '<div><label for="epAge">' + _('Age') + '</label><input class="form-input" id="epAge" type="number" value="' + esc(p.age) + '"></div><div><label for="epGender">' + _('Gender') + '</label><select class="form-input" id="epGender">' + ['', 'Female', 'Male', 'Other'].map(function (g) { return '<option' + (p.gender === g ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select></div>' +
        '<div><label for="epBlood">' + _('Blood group') + '</label><input class="form-input" id="epBlood" value="' + esc(p.bloodGroup) + '" placeholder="B+"></div><div><label for="epEmail">' + _('Email') + '</label><input class="form-input" id="epEmail" value="' + esc(p.email) + '"></div>' +
        '<div class="full"><label for="epAllergy">' + _('Allergies') + '</label><input class="form-input" id="epAllergy" value="' + esc(p.allergies) + '" placeholder="e.g. Penicillin"></div><div class="full"><label for="epNotes">' + _('Notes') + '</label><textarea class="form-input" id="epNotes" rows="2">' + esc(p.notes) + '</textarea></div></div>',
      foot: '<button class="btn btn-primary" data-act="edit-patient-save" data-id="' + id + '">' + _('Save') + '</button>'
    });
  };
  DASH.openMerge = function (id) {
    var p = patientOf(id);
    DASH.modal({
      title: _('Merge duplicate patient'),
      body: '<p class="small" style="margin-bottom:10px;">' + _('Use this when the same person was registered with a different phone number. All visits, records and prescriptions of') + ' <b>' + esc(p.name) + '</b> ' + _('will be moved into the patient you select, and this entry will be removed.') + '</p><label class="l" for="mgInto">' + _('Merge into') + '</label><select class="form-input" id="mgInto">' + DASH.db.patients.filter(function (x) { return x.id !== id; }).map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + ' — ' + esc(x.phone) + '</option>'; }).join('') + '</select>',
      foot: '<button class="btn btn-danger" data-act="merge-save" data-id="' + id + '">' + _('Merge') + '</button>'
    });
  };

  /* ========== RECORDS ========== */
  DASH.views.records = {
    render: function () {
      var d = DASH.db, q = DASH.ui.recordQ.trim().toLowerCase();
      var list = d.records.filter(function (r) { var p = patientOf(r.patientId); return !q || ((p ? p.name + ' ' + p.phone : '') + ' ' + r.diagnosis + ' ' + r.notes).toLowerCase().indexOf(q) !== -1; })
        .sort(function (a, b) { return (a.date + a.createdAt) < (b.date + b.createdAt) ? 1 : -1; });
      return '<div class="view-head"><input id="recordQ" class="form-input sm search-input" type="search" placeholder="' + _('Search records…') + '" value="' + esc(DASH.ui.recordQ) + '" data-inp="recordQ"><button class="btn btn-primary btn-sm" data-act="add-record">+ ' + _('Add record') + '</button></div>' +
        '<div class="dash-panel"><div class="panel-body">' + (list.length ? '<div class="timeline">' + list.map(function (r) {
          var p = patientOf(r.patientId), rx = d.prescriptions.filter(function (x) { return x.id === r.prescriptionId; })[0], a = d.appointments.filter(function (x) { return x.id === r.appointmentId; })[0];
          return '<div class="visit"><div class="visit-head"><span class="date">' + fmtDate(r.date) + '</span><span class="name" style="cursor:pointer;color:var(--primary-800)" data-act="patient" data-id="' + r.patientId + '">' + esc(p ? p.name : '?') + '</span>' + (a ? '<span class="ref">' + esc(a.ref) + '</span>' : '') + '</div><p><b>' + _('Diagnosis') + ':</b> ' + esc(r.diagnosis || '—') + '</p>' + (r.notes ? '<p class="small">' + esc(r.notes) + '</p>' : '') + vitalsHtml(r.vitals) + (rx ? DASH.rxHtml(rx) : '') + '</div>';
        }).join('') + '</div>' : '<p class="empty">' + _('No clinical records yet. They are created when you complete a visit.') + '</p>') + '</div></div>';
    }
  };
  DASH.openAddRecord = function (pid) {
    DASH.modal({
      title: _('Add clinical record'),
      body: '<div class="fgrid"><div class="full"><label for="arPatient">' + _('Patient') + '</label><select class="form-input" id="arPatient">' + DASH.db.patients.map(function (p) { return '<option value="' + p.id + '"' + (p.id === pid ? ' selected' : '') + '>' + esc(p.name) + ' — ' + esc(p.phone) + '</option>'; }).join('') + '</select></div>' +
        '<div><label for="arDate">' + _('Date') + '</label><input class="form-input" id="arDate" type="date" value="' + today() + '"></div><div><label for="arDiag">' + _('Diagnosis') + '</label><input class="form-input" id="arDiag"></div><div class="full"><label for="arNotes">' + _('Notes') + '</label><textarea class="form-input" id="arNotes" rows="4"></textarea></div></div>',
      foot: '<button class="btn btn-primary" data-act="add-record-save">' + _('Save record') + '</button>'
    });
  };

  /* ========== ACTIONS ========== */
  var A = DASH.actions;
  A.go = function (el) { DASH.go(el.dataset.v); };
  A.trend = function (el) { DASH.ui.trend = +el.dataset.v; render(); };
  A.astatus = function (el) { DASH.ui.apptStatus = el.dataset.v; render(); };
  A.appt = function (el) { DASH.openAppt(el.dataset.id); };
  A.pay = function (el) { DASH.openPay(el.dataset.id); };
  A['pay-save'] = async function (el) {
    var id = el.dataset.id, st = el.dataset.v;
    await DASH.op('setPayment', { id: id, status: st, method: DASH.val('payMethod'), amount: DASH.val('payAmt') }, st === 'paid' ? _('Payment saved') : _('Marked unpaid')); closeModal();
  };
  A.walkin = function () { DASH.openWalkin(); };
  A['walkin-save'] = async function () {
    var c = { name: DASH.val('wName'), phone: DASH.val('wPhone'), age: DASH.val('wAge'), gender: DASH.val('wGender'), conditionId: DASH.val('wCond'), concern: DASH.val('wConcern') };
    var errs = Core.validatePatient(c); if (Object.keys(errs).length) { toast(errs[Object.keys(errs)[0]], 'warning'); return; }
    var ap = await DASH.op('addWalkIn', c, _('Walk-in added')); closeModal(); if (ap && DASH.openVisit) DASH.openVisit(ap.id);
  };
  A.visit = function (el) { if (DASH.openVisit) DASH.openVisit(el.dataset.id); };
  A.patient = function (el) { closeModal(); DASH.ui.patientId = el.dataset.id; if (view !== 'patients') { DASH.go('patients'); } else { DASH.fresh = true; render(); window.scrollTo(0, 0); } };
  A['patients-back'] = function () { DASH.ui.patientId = null; DASH.fresh = true; render(); };
  A['edit-patient'] = function (el) { DASH.openEditPatient(el.dataset.id); };
  A['edit-patient-save'] = async function (el) {
    var f = { name: DASH.val('epName').trim(), phone: DASH.val('epPhone'), age: DASH.val('epAge'), gender: DASH.val('epGender'), bloodGroup: DASH.val('epBlood'), email: DASH.val('epEmail'), allergies: DASH.val('epAllergy'), notes: DASH.val('epNotes') };
    if (!f.name) { toast(_('Name is required'), 'warning'); return; }
    if (!/^[6-9]\d{9}$/.test(Core.normPhone(f.phone))) { toast(_('Enter a valid 10-digit mobile number'), 'warning'); return; }
    await DASH.op('updatePatient', { id: el.dataset.id, fields: f }, _('Saved')); closeModal();
  };
  A.merge = function (el) { DASH.openMerge(el.dataset.id); };
  A['merge-save'] = async function (el) { var into = DASH.val('mgInto'); await DASH.op('mergePatients', { from: el.dataset.id, into: into }, _('Patients merged')); closeModal(); DASH.ui.patientId = into; DASH.fresh = true; render(); };
  A['add-record'] = function (el) { if (!DASH.db.patients.length) { toast(_('No patients yet'), 'warning'); return; } DASH.openAddRecord(el.dataset.id); };
  A['add-record-save'] = async function () {
    if (!DASH.val('arDiag').trim() && !DASH.val('arNotes').trim()) { toast(_('Enter a diagnosis or notes'), 'warning'); return; }
    await DASH.op('addRecord', { patientId: DASH.val('arPatient'), date: DASH.val('arDate'), diagnosis: DASH.val('arDiag'), notes: DASH.val('arNotes') }, _('Record saved')); closeModal();
  };
  A['modal-close'] = closeModal;
  A['modal-bg'] = function (el, ev) { if (ev.target === el) closeModal(); };

  DASH.changes.status = async function (el) { await DASH.op('setStatus', { id: el.dataset.id, status: el.value }, _('Status updated')); };
  DASH.changes.arange = function (el) { DASH.ui.apptRange = el.value; render(); };

  /* ---------- global listeners ---------- */
  function wire() {
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-act]'); if (!el) return;
      var fn = A[el.dataset.act]; if (!fn) return;
      if (el.tagName === 'A' && el.getAttribute('href') === '#') ev.preventDefault();
      fn(el, ev);
    });
    document.addEventListener('change', function (ev) { var el = ev.target.closest('[data-chg]'); if (el && DASH.changes[el.dataset.chg]) DASH.changes[el.dataset.chg](el); });
    document.addEventListener('input', function (ev) {
      var el = ev.target.closest('[data-inp]'); if (!el) return;
      var map = { apptQ: 'apptQ', patientQ: 'patientQ', recordQ: 'recordQ' };
      if (map[el.dataset.inp]) { DASH.ui[map[el.dataset.inp]] = el.value; render(); }
      else if (DASH.inputs && DASH.inputs[el.dataset.inp]) DASH.inputs[el.dataset.inp](el);
    });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && DASH.modalOpen()) closeModal(); });
    document.querySelectorAll('.sidebar-link[data-view]').forEach(function (l) { l.addEventListener('click', function (e) { e.preventDefault(); closeModal(); DASH.go(l.dataset.view); }); });
    $('sidebarToggle').addEventListener('click', function () { $('sidebar').classList.toggle('open'); });
    document.querySelector('.btn-logout').addEventListener('click', function (e) { e.preventDefault(); Store.logout(); location.href = 'doctor-login.html'; });
    document.querySelectorAll('.lang-btn').forEach(function (b) { b.addEventListener('click', function () { setTimeout(function () { DASH.fresh = true; render(); }, 0); }); });
  }

  /* ---------- login page ---------- */
  function initLogin() {
    var form = document.querySelector('.login-form');
    Store.init().then(function () { if (Store.isAuthed()) location.replace('dashboard.html'); });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = $('login-email').value.trim(), pw = $('login-password').value;
      if (!email || !pw) { showToast('Please enter email and password', 'warning'); return; }
      var btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      try {
        var r = await Store.login(email, pw);
        if (r.ok) { showToast('Login successful!', 'success'); setTimeout(function () { location.href = 'dashboard.html'; }, 500); }
        else showToast(r.message || 'Invalid email or password', 'error');
      } catch (er) { showToast('Could not reach the server', 'error'); }
      btn.disabled = false;
    });
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', async function () {
    if (document.querySelector('.login-form')) { initLogin(); return; }
    if (!document.querySelector('.dashboard-layout')) return;
    await Store.init();
    if (!Store.isAuthed()) { location.replace('doctor-login.html'); return; }
    $('dash-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    var pill = $('livePill'), lt = $('liveText');
    if (Store.mode === 'server') { lt.textContent = 'Live'; }
    else { pill.classList.add('local'); lt.textContent = 'Local mode'; pill.title = 'Data is stored in this browser only. Run “node server.js” for live multi-device sync.'; }
    wire();
    var t; Store.onChange(function () { clearTimeout(t); t = setTimeout(refresh, 120); });
    setInterval(function () { if (view === 'overview' || view === 'appointments') { DASH.fresh = false; render(); } }, 60000); // roll "today" / "now" forward
    await refresh();
    var h = (location.hash || '').slice(1); if (TITLES[h]) DASH.go(h);
  });
})();

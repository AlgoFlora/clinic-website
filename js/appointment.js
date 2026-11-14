/* ========================================
   DEVAKI CLINIC — Appointment booking (live slots)
   ======================================== */
(function () {
  'use strict';

  var ICONS = {
    thermo: '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
    wind: '<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>',
    throat: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1.5 2 6.5 2 8 0M9 9h.01M15 9h.01"/>',
    stomach: '<path d="M7 4c0 4 10 2 10 8a5 5 0 0 1-9 3c-2 2-5 0-4-3 .8-2.4 3-3 3-8z"/>',
    head: '<circle cx="12" cy="8" r="5"/><path d="M5 21a7 7 0 0 1 14 0M12 3v2"/>',
    bone: '<path d="M17 3a3 3 0 0 0-2.8 4L7 14.2A3 3 0 1 0 3 17a3 3 0 0 0 4 2.8L9.8 17 17 9.8A3 3 0 1 0 21 7a3 3 0 0 0-4-4z"/>',
    drop: '<path d="M12 2.7S5 10 5 14.5a7 7 0 0 0 14 0C19 10 12 2.7 12 2.7z"/>',
    pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    skin: '<circle cx="12" cy="12" r="9"/><path d="M8 9h.01M12 7h.01M16 10h.01M9 14h.01M14 15h.01"/>',
    child: '<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/>',
    battery: '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2M6 10v4"/>',
    uti: '<path d="M12 2.7S6 9 6 13.5a6 6 0 0 0 12 0C18 9 12 2.7 12 2.7z"/><path d="M12 12v4"/>',
    lungs: '<path d="M12 4v8M8 8c-3 1-5 5-5 9 0 2 2 3 4 2 2-1 3-3 3-6M16 8c3 1 5 5 5 9 0 2-2 3-4 2-2-1-3-3-3-6"/>',
    check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };

  var S = {
    step: 1, cfg: null, conditionId: '', date: '', time: '',
    slots: [], busy: false, auto: true
  };
  var $ = function (id) { return document.getElementById(id); };
  var lang = function () { return (window.getLang && getLang()) || 'en'; };
  var tt = function (k, f) { var v = window.t ? t(k) : k; return v === k ? f : v; };

  function fmtDate(ds, long) {
    var p = ds.split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return d.toLocaleDateString(lang() === 'mr' ? 'mr-IN' : 'en-IN', { timeZone: 'UTC', weekday: long ? 'long' : undefined, day: 'numeric', month: 'short', year: 'numeric' });
  }
  function condName(c) { return lang() === 'mr' && c.mr ? c.mr : c.name; }

  /* ---------- step 1 ---------- */
  function renderConditions() {
    var box = $('condGrid'); box.innerHTML = '';
    S.cfg.conditions.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'cond-tile' + (S.conditionId === c.id ? ' selected' : '');
      b.setAttribute('aria-pressed', S.conditionId === c.id);
      b.innerHTML = '<span class="cond-ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[c.icon] || ICONS.plus) + '</svg></span><span class="cond-name"></span>';
      b.querySelector('.cond-name').textContent = condName(c);
      b.addEventListener('click', function () { S.conditionId = c.id; renderConditions(); });
      box.appendChild(b);
    });
  }

  /* ---------- step 2 ---------- */
  function renderDates() {
    var box = $('datePicker'); box.innerHTML = '';
    var days = lang() === 'mr' ? ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    S.cfg.dates.forEach(function (d) {
      var o = document.createElement('button');
      o.type = 'button'; o.className = 'date-option' + (d.closed ? ' closed' : '') + (S.date === d.date ? ' selected' : '');
      o.disabled = d.closed;
      o.innerHTML = '<span class="day-name">' + days[d.dow] + '</span><span class="day-num">' + parseInt(d.date.slice(8), 10) + '</span>' + (d.closed ? '<span class="day-closed">' + tt('bk_closed', 'Closed') + '</span>' : '');
      o.addEventListener('click', function () { S.auto = false; S.date = d.date; S.time = ''; renderDates(); loadSlots(); });
      box.appendChild(o);
    });
  }

  async function loadSlots(quiet) {
    if (!S.date) return;
    var date = S.date;
    var slots;
    try { slots = await Store.slots(date); } catch (e) { return; }
    if (date !== S.date) return;
    S.slots = slots;
    // first visit to this step: if nothing is left today, jump to the next day that has free slots
    if (S.auto && !slots.some(function (x) { return x.state === 'free'; })) {
      var ds = S.cfg.dates.filter(function (x) { return !x.closed; }).map(function (x) { return x.date; });
      var nx = ds[ds.indexOf(date) + 1];
      if (nx) { S.date = nx; renderDates(); return loadSlots(quiet); }
    }
    S.auto = false;
    // if my chosen slot got taken meanwhile → tell the user
    if (S.time) {
      var mine = slots.filter(function (s) { return s.time === S.time; })[0];
      if (!mine || mine.state !== 'free') {
        S.time = '';
        showToast(tt('bk_slot_lost', 'That slot was just booked by someone else. Please pick another.'), 'warning', 5000);
        if (S.step === 3 || S.step === 4) { renderSlots(); show(2); return; }
      }
    }
    renderSlots();
  }

  function renderSlots() {
    var box = $('slotsBox'); box.innerHTML = '';
    if (!S.slots.length) {
      box.innerHTML = '<p class="no-slots">' + tt('bk_no_slots', 'No slots available on this day.') + '</p>'; return;
    }
    var names = [tt('bk_morning', 'Morning'), tt('bk_evening', 'Evening')];
    var groups = {};
    S.slots.forEach(function (s) { (groups[s.session] = groups[s.session] || []).push(s); });
    Object.keys(groups).forEach(function (k) {
      var list = groups[k], first = list[0], last = list[list.length - 1];
      var free = list.filter(function (s) { return s.state === 'free'; }).length;
      var h = document.createElement('div'); h.className = 'slot-head';
      h.innerHTML = '<span></span><small></small>';
      h.firstChild.textContent = (names[k] || tt('bk_session', 'Session')) + ' · ' + first.label + ' – ' + endLabel(last);
      h.lastChild.textContent = free + ' ' + tt('bk_left', 'left');
      box.appendChild(h);
      var g = document.createElement('div'); g.className = 'time-slots';
      list.forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'time-slot ' + s.state + (S.time === s.time ? ' selected' : '');
        b.disabled = s.state !== 'free';
        b.textContent = s.label;
        if (s.state === 'booked') b.title = tt('bk_booked', 'Booked');
        if (s.state === 'past') b.title = tt('bk_passed', 'Time passed');
        b.addEventListener('click', function () { S.time = s.time; renderSlots(); });
        g.appendChild(b);
      });
      box.appendChild(g);
    });
  }
  function endLabel(last) {
    var m = Core.toMins(last.time) + (S.cfg.slotMinutes || 30);
    return Core.label12(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2));
  }

  /* ---------- steps / validation ---------- */
  function show(step) {
    S.step = step;
    document.querySelectorAll('.step-content').forEach(function (c) { c.classList.remove('active'); });
    var el = step === 'done' ? $('step-done') : $('step-' + step);
    el.classList.add('active');
    var n = step === 'done' ? 5 : step;
    document.querySelectorAll('.progress-step').forEach(function (s, i) {
      s.classList.toggle('active', i + 1 === n); s.classList.toggle('completed', i + 1 < n);
    });
    document.querySelectorAll('.progress-line').forEach(function (l, i) { l.classList.toggle('completed', i + 1 < n); l.classList.toggle('active', i + 1 === n); });
    if (step === 2) { renderDates(); loadSlots(); }
    if (step === 4) fillReview();
    var card = document.querySelector('.appointment-card'); if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fieldErr(id, msg) {
    var g = $(id).closest('.form-group');
    g.classList.toggle('has-error', !!msg);
    var e = g.querySelector('.form-error'); if (e) e.textContent = msg || '';
  }
  function details() {
    return {
      name: $('patientName').value.trim(), phone: $('patientPhone').value.trim(), age: $('patientAge').value,
      gender: $('patientGender').value, email: $('patientEmail').value.trim()
    };
  }
  function validateDetails() {
    var d = details(), errs = Core.validatePatient(d);
    fieldErr('patientName', errs.name ? tt('err_name', errs.name) : '');
    fieldErr('patientPhone', errs.phone ? tt('err_phone', errs.phone) : '');
    fieldErr('patientAge', errs.age ? tt('err_age', errs.age) : '');
    var bad = Object.keys(errs)[0];
    if (bad) { $({ name: 'patientName', phone: 'patientPhone', age: 'patientAge' }[bad]).focus(); return false; }
    if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) { showToast(tt('err_email', 'Enter a valid email or leave it empty'), 'warning'); return false; }
    return true;
  }

  function next() {
    if (S.step === 1) {
      if (!S.conditionId) { showToast(tt('bk_pick_problem', 'Please select your problem'), 'warning'); return; }
      return show(2);
    }
    if (S.step === 2) {
      if (!S.date || !S.time) { showToast(tt('bk_pick_slot', 'Please select a date and a free time slot'), 'warning'); return; }
      return show(3);
    }
    if (S.step === 3) { if (validateDetails()) show(4); }
  }
  function prev() { if (typeof S.step === 'number' && S.step > 1) show(S.step - 1); }

  function fillReview() {
    var c = S.cfg.conditions.filter(function (x) { return x.id === S.conditionId; })[0];
    var d = details();
    var slot = S.slots.filter(function (s) { return s.time === S.time; })[0];
    $('rv-cond').textContent = c ? condName(c) : '—';
    $('rv-date').textContent = fmtDate(S.date, true);
    $('rv-time').textContent = slot ? slot.label : S.time;
    $('rv-name').textContent = d.name; $('rv-phone').textContent = d.phone; $('rv-age').textContent = d.age;
    $('rv-fee').textContent = '₹' + S.cfg.fee;
    $('bookError').hidden = true;
  }

  async function confirm() {
    if (S.busy) return;
    var btn = $('btnConfirm'), err = $('bookError');
    S.busy = true; btn.disabled = true; err.hidden = true;
    var d = details();
    try {
      var res = await Store.book({
        conditionId: S.conditionId, concern: $('concern').value, date: S.date, time: S.time,
        name: d.name, phone: d.phone, age: d.age, gender: d.gender, email: d.email
      });
      if (res.ok) {
        $('doneRef').textContent = res.appointment.ref;
        var slot = S.slots.filter(function (s) { return s.time === S.time; })[0];
        $('doneWhen').textContent = fmtDate(S.date, true) + ' · ' + (slot ? slot.label : S.time);
        document.querySelectorAll('.progress-step').forEach(function (s) { s.classList.add('completed'); });
        show('done');
        showToast(tt('confirm_success', 'Appointment Booked!'), 'success');
      } else if (res.code === 'SLOT_TAKEN' || res.code === 'PAST' || res.code === 'BAD_SLOT') {
        S.time = ''; await show(2); loadSlots();
        showToast(res.message || 'Slot not available', 'warning', 6000);
      } else if (res.errors) {
        show(3); validateDetails();
      } else {
        err.textContent = res.message || 'Could not book. Please try again.'; err.hidden = false;
      }
    } catch (e) {
      err.textContent = tt('bk_net_err', 'Could not reach the clinic server. Please check your connection and try again.'); err.hidden = false;
    } finally { S.busy = false; btn.disabled = false; }
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', async function () {
    try { S.cfg = await Store.config(); } catch (e) {
      $('condGrid').innerHTML = '<p class="no-slots">Could not load. Please refresh.</p>'; return;
    }
    S.date = S.cfg.dates.filter(function (d) { return !d.closed; }).map(function (d) { return d.date; })[0] || '';
    renderConditions();
    document.querySelectorAll('[data-next]').forEach(function (b) { b.addEventListener('click', next); });
    document.querySelectorAll('[data-prev]').forEach(function (b) { b.addEventListener('click', prev); });
    $('btnConfirm').addEventListener('click', confirm);
    ['patientName', 'patientPhone', 'patientAge'].forEach(function (id) { $(id).addEventListener('input', function () { fieldErr(id, ''); }); });
    $('patientPhone').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/[^\d+\s]/g, ''); });

    // live updates: someone else booked / doctor changed settings
    Store.onChange(function () { if (S.step === 2 || S.step === 4) loadSlots(true); });
    setInterval(function () { if (S.step === 2) loadSlots(true); }, 15000);
    document.querySelectorAll('.lang-btn').forEach(function (b) {
      b.addEventListener('click', function () { setTimeout(function () { renderConditions(); if (S.step === 2) { renderDates(); renderSlots(); } if (S.step === 4) fillReview(); }, 0); });
    });
  });
})();

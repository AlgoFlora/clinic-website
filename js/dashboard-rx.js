/* ========================================
   DEVAKI CLINIC — Dashboard part 2
   Visit/consultation, prescriptions + medicine database, follow-ups, reports, settings
   ======================================== */
(function () {
  'use strict';
  var D = window.DASH, esc = D.esc, _ = D._, money = D.money, $ = function (id) { return document.getElementById(id); };
  var lang = function () { return (window.getLang && getLang()) || 'en'; };
  D.ui.rxTab = 'db'; D.ui.medQ = ''; D.ui.medCat = ''; D.ui.condSel = ''; D.ui.repRange = 30;

  /* ---------- medicine search (name, category, shelf, condition) ---------- */
  function medBlob(m) {
    var cn = (m.conditions || []).map(function (id) { var c = D.condOf(id); return c ? c.name + ' ' + (c.mr || '') : ''; }).join(' ');
    return (m.name + ' ' + m.strength + ' ' + m.form + ' ' + m.category + ' ' + m.location + ' ' + cn + ' ' + (m.notes || '')).toLowerCase();
  }
  D.searchMeds = function (q, cat) {
    var all = D.db.medicines.filter(function (m) { return !cat || m.category === cat; });
    var terms = String(q || '').toLowerCase().split(/[\s,]+/).filter(Boolean);
    if (!terms.length) return all.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var and = all.filter(function (m) { var b = medBlob(m); return terms.every(function (t) { return b.indexOf(t) !== -1; }); });
    var res = and.length ? and : all.filter(function (m) { var b = medBlob(m); return terms.some(function (t) { return b.indexOf(t) !== -1; }); });
    return res.sort(function (a, b) {
      var sa = a.name.toLowerCase().indexOf(terms[0]) === 0 ? 0 : 1, sb = b.name.toLowerCase().indexOf(terms[0]) === 0 ? 0 : 1;
      return sa - sb || a.name.localeCompare(b.name);
    });
  };
  function condChips(m) { return (m.conditions || []).map(function (id) { var c = D.condOf(id); return c ? '<span class="tag">' + esc(D.condName(c)) + '</span>' : ''; }).join(' '); }
  function stockTag(s) { return s === 'out' ? '<span class="tag red">' + _('Out of stock') + '</span>' : s === 'low' ? '<span class="tag orange">' + _('Low') + '</span>' : '<span class="tag green">' + _('In stock') + '</span>'; }
  function medLabel(m) { return m.name + (m.strength ? ' ' + m.strength : '') + (m.form ? ' (' + m.form + ')' : ''); }

  /* ========== PRESCRIPTIONS VIEW ========== */
  D.views.prescriptions = {
    render: function () {
      var u = D.ui, tabs = [['db', 'Medicine Database'], ['cond', 'By Condition'], ['issued', 'Issued Prescriptions']];
      return '<div class="view-head"><div class="toolbar">' + tabs.map(function (t) { return '<button class="chip' + (u.rxTab === t[0] ? ' active' : '') + '" data-act="rxtab" data-v="' + t[0] + '">' + _(t[1]) + '</button>'; }).join('') + '</div>' +
        (u.rxTab !== 'issued' ? '<button class="btn btn-primary btn-sm" data-act="med-edit">+ ' + _('Add medicine') + '</button>' : '') + '</div>' + (u.rxTab === 'db' ? tabDb() : u.rxTab === 'cond' ? tabCond() : tabIssued());
    }
  };
  function medRow(m) {
    return '<tr><td><span class="name">' + esc(m.name) + '</span><br><small class="muted">' + esc([m.strength, m.form].filter(Boolean).join(' · ')) + '</small></td><td>' + esc(m.category) + '</td><td class="med-loc">📍 ' + esc(m.location || '—') + '</td><td>' + stockTag(m.stock) + '</td><td><div class="chips">' + condChips(m) + '</div></td><td><button class="btn btn-xs btn-secondary" data-act="med-edit" data-id="' + m.id + '">' + _('Edit') + '</button></td></tr>';
  }
  function tabDb() {
    var u = D.ui, list = D.searchMeds(u.medQ, u.medCat);
    var cats = {}; D.db.medicines.forEach(function (m) { cats[m.category] = (cats[m.category] || 0) + 1; });
    return '<input id="medQ" class="form-input search-input" style="max-width:520px;margin-bottom:12px;" type="search" placeholder="' + _('Search medicine, condition, shelf… (e.g. “fever”, “para”, “shelf C”)') + '" value="' + esc(u.medQ) + '" data-inp="medQ">' +
      '<div class="chips" style="margin-bottom:14px;"><button class="chip' + (!u.medCat ? ' active' : '') + '" data-act="medcat" data-v="">' + _('All') + ' (' + D.db.medicines.length + ')</button>' +
      Object.keys(cats).sort().map(function (c) { return '<button class="chip' + (u.medCat === c ? ' active' : '') + '" data-act="medcat" data-v="' + esc(c) + '">' + esc(c) + ' (' + cats[c] + ')</button>'; }).join('') + '</div>' +
      '<div class="dash-panel"><div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>' + _('Medicine') + '</th><th>' + _('Category') + '</th><th>' + _('Kept at') + '</th><th>' + _('Stock') + '</th><th>' + _('Used for') + '</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(medRow).join('') : '<tr><td colspan="6" class="empty">' + _('No medicine matches. Add it with “+ Add medicine”.') + '</td></tr>') + '</tbody></table></div></div><p class="muted small" style="margin-top:8px;">' + list.length + ' ' + _('shown') + '</p>';
  }
  function tabCond() {
    var u = D.ui, conds = D.db.conditions;
    var h = '<div class="cond-cards">' + conds.map(function (c) {
      var n = D.db.medicines.filter(function (m) { return (m.conditions || []).indexOf(c.id) !== -1; }).length;
      return '<button class="cond-card' + (u.condSel === c.id ? ' on' : '') + '" data-act="condsel" data-v="' + c.id + '"><b>' + esc(D.condName(c)) + '</b><span>' + n + ' ' + _('medicines') + '</span></button>';
    }).join('') + '</div>';
    if (!u.condSel) return h + '<p class="empty">' + _('Select a condition to see which medicines are used and where they are kept.') + '</p>';
    var list = D.db.medicines.filter(function (m) { return (m.conditions || []).indexOf(u.condSel) !== -1; }), by = {};
    list.forEach(function (m) { (by[m.category] = by[m.category] || []).push(m); });
    return h + (list.length ? Object.keys(by).sort().map(function (c) {
      return '<div class="dash-panel" style="margin-bottom:14px;"><div class="panel-header"><h3>' + esc(c) + '</h3></div><div style="overflow-x:auto;"><table class="data-table"><tbody>' + by[c].map(function (m) { return '<tr><td><span class="name">' + esc(m.name) + '</span> <small class="muted">' + esc([m.strength, m.form].filter(Boolean).join(' · ')) + '</small></td><td class="med-loc">📍 ' + esc(m.location || '—') + '</td><td>' + stockTag(m.stock) + '</td><td style="width:70px"><button class="btn btn-xs btn-secondary" data-act="med-edit" data-id="' + m.id + '">' + _('Edit') + '</button></td></tr>'; }).join('') + '</tbody></table></div></div>';
    }).join('') : '<p class="empty">' + _('No medicines linked to this condition yet. Open a medicine and tick this condition.') + '</p>');
  }
  function tabIssued() {
    var list = D.db.prescriptions.slice().sort(function (a, b) { return (a.date + a.createdAt) < (b.date + b.createdAt) ? 1 : -1; });
    return '<div class="dash-panel"><div class="panel-body">' + (list.length ? '<div class="timeline">' + list.map(function (x) {
      var p = D.patientOf(x.patientId);
      return '<div class="visit"><div class="visit-head"><span class="date">' + D.fmtDate(x.date) + '</span><span class="name" style="cursor:pointer;color:var(--primary-800)" data-act="patient" data-id="' + x.patientId + '">' + esc(p ? p.name : '?') + '</span><button class="btn btn-xs btn-ghost" data-act="print-rx" data-id="' + x.id + '">🖨 ' + _('Print') + '</button></div>' + D.rxHtml(x) + '</div>';
    }).join('') + '</div>' : '<p class="empty">' + _('No prescriptions issued yet.') + '</p>') + '</div></div>';
  }

  D.actions.rxtab = function (el) { D.ui.rxTab = el.dataset.v; D.fresh = true; D.render(); };
  D.actions.medcat = function (el) { D.ui.medCat = el.dataset.v; D.fresh = true; D.render(); };
  D.actions.condsel = function (el) { D.ui.condSel = el.dataset.v; D.fresh = true; D.render(); };

  D.actions['med-edit'] = function (el) {
    var m = el.dataset.id ? D.db.medicines.filter(function (x) { return x.id === el.dataset.id; })[0] : { name: '', strength: '', form: '', category: '', location: '', stock: 'in', notes: '', conditions: [] };
    var cats = {}; D.db.medicines.forEach(function (x) { cats[x.category] = 1; });
    D.modal({
      title: m.id ? _('Edit medicine') : _('Add medicine'), wide: true,
      body: '<div class="fgrid"><div><label for="mName">' + _('Medicine name') + ' *</label><input class="form-input" id="mName" value="' + esc(m.name) + '"></div><div><label for="mStrength">' + _('Strength') + '</label><input class="form-input" id="mStrength" value="' + esc(m.strength) + '" placeholder="500 mg"></div>' +
        '<div><label for="mForm">' + _('Form') + '</label><input class="form-input" id="mForm" value="' + esc(m.form) + '" placeholder="Tablet / Syrup / Injection"></div><div><label for="mCat">' + _('Category') + '</label><input class="form-input" id="mCat" list="catList" value="' + esc(m.category) + '"><datalist id="catList">' + Object.keys(cats).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>' +
        '<div><label for="mLoc">' + _('Kept at (shelf / cabinet)') + '</label><input class="form-input" id="mLoc" value="' + esc(m.location) + '" placeholder="Shelf A · Row 2"></div><div><label for="mStock">' + _('Stock') + '</label><select class="form-input" id="mStock"><option value="in"' + (m.stock === 'in' ? ' selected' : '') + '>' + _('In stock') + '</option><option value="low"' + (m.stock === 'low' ? ' selected' : '') + '>' + _('Low') + '</option><option value="out"' + (m.stock === 'out' ? ' selected' : '') + '>' + _('Out of stock') + '</option></select></div>' +
        '<div class="full"><label>' + _('Used for these conditions') + '</label><div class="day-checks">' + D.db.conditions.map(function (c) { return '<label><input type="checkbox" name="mCond" value="' + c.id + '"' + ((m.conditions || []).indexOf(c.id) !== -1 ? ' checked' : '') + '> ' + esc(D.condName(c)) + '</label>'; }).join('') + '</div></div>' +
        '<div class="full"><label for="mNotes">' + _('Notes') + '</label><input class="form-input" id="mNotes" value="' + esc(m.notes) + '"></div></div>',
      foot: (m.id ? '<button class="btn btn-danger" data-act="med-del" data-id="' + m.id + '">' + _('Delete') + '</button>' : '') + '<button class="btn btn-primary" data-act="med-save" data-id="' + (m.id || '') + '">' + _('Save') + '</button>'
    });
  };
  D.actions['med-save'] = async function (el) {
    var name = D.val('mName').trim(); if (!name) { D.toast(_('Medicine name is required'), 'warning'); return; }
    var conds = Array.prototype.map.call(document.querySelectorAll('input[name=mCond]:checked'), function (c) { return c.value; });
    await D.op('upsertMedicine', { id: el.dataset.id || undefined, name: name, strength: D.val('mStrength'), form: D.val('mForm'), category: D.val('mCat') || 'Other', location: D.val('mLoc'), stock: D.val('mStock'), notes: D.val('mNotes'), conditions: conds }, _('Medicine saved'));
    D.closeModal();
  };
  D.actions['med-del'] = async function (el) { if (!confirm(_('Delete this medicine from the database?'))) return; await D.op('deleteMedicine', { id: el.dataset.id }, _('Deleted')); D.closeModal(); };
  D.inputs = D.inputs || {};
  D.inputs.medQ = function (el) { D.ui.medQ = el.value; D.render(); };

  /* ========== VISIT (consultation) ========== */
  var V = null;
  D.openVisit = function (apptId) {
    var a = D.db.appointments.filter(function (x) { return x.id === apptId; })[0]; if (!a) return;
    var p = D.patientOf(a.patientId), prev = D.db.appointments.filter(function (x) { return x.patientId === a.patientId && x.status === 'completed'; }).length;
    V = { appt: a, items: [], medResults: [] };
    D.modal({
      title: _('Visit') + ' — ' + a.name, wide: true, noFocus: true,
      body: (p && p.allergies ? '<div class="warn">⚠ ' + _('Allergies') + ': ' + esc(p.allergies) + '</div>' : '') +
        '<p style="margin-bottom:12px;"><span class="ref">' + esc(a.ref) + '</span> · ' + D.fmtDate(a.date) + ', ' + esc(D.tlabel(a.time)) + ' · ' + esc(a.age) + ' ' + _('yrs') + ' · <b>' + esc(D.condLabel(a)) + '</b>' + (a.concern ? ' — ' + esc(a.concern) : '') + ' · <span class="tag ' + (prev ? 'teal' : '') + '">' + (prev ? prev + ' ' + _('previous visits') : _('First visit')) + '</span> <button class="btn btn-xs btn-ghost" data-act="patient" data-id="' + a.patientId + '">' + _('History') + '</button></p>' +
        '<div class="fgrid"><div class="full"><label for="vDiag">' + _('Diagnosis') + '</label><input class="form-input" id="vDiag" value="' + esc(D.condLabel(a)) + '"></div></div>' +
        '<div class="fgrid" style="grid-template-columns:repeat(5,1fr);margin-top:10px;"><div><label for="vBp">BP</label><input class="form-input sm" id="vBp" placeholder="120/80"></div><div><label for="vTemp">' + _('Temp °F') + '</label><input class="form-input sm" id="vTemp"></div><div><label for="vPulse">' + _('Pulse') + '</label><input class="form-input sm" id="vPulse"></div><div><label for="vWt">' + _('Weight kg') + '</label><input class="form-input sm" id="vWt"></div><div><label for="vSpo2">SpO₂ %</label><input class="form-input sm" id="vSpo2"></div></div>' +
        '<div class="fgrid" style="margin-top:10px;"><div class="full"><label for="vNotes">' + _('Clinical notes') + '</label><textarea class="form-input" id="vNotes" rows="3"></textarea></div></div>' +
        '<h4 style="margin:18px 0 6px;">' + _('Prescription') + '</h4><div id="vSugg"></div>' +
        '<input class="form-input" id="vMedQ" type="search" autocomplete="off" placeholder="' + _('Search medicine to add (name, condition or shelf)…') + '" data-inp="vMedQ"><div id="vMedRes"></div><div id="vRx" style="margin-top:12px;"></div>' +
        '<div class="fgrid" style="margin-top:6px;"><div class="full"><label for="vAdvice">' + _('Advice') + '</label><input class="form-input" id="vAdvice" placeholder="' + _('Rest, plenty of fluids…') + '"></div>' +
        '<div><label for="vFu">' + _('Follow-up date') + '</label><input class="form-input" id="vFu" type="date" min="' + D.today() + '"></div><div><label for="vFuR">' + _('Follow-up reason') + '</label><input class="form-input" id="vFuR"></div>' +
        '<div class="full"><label for="vAllergy">' + _('Allergies (update)') + '</label><input class="form-input" id="vAllergy" value="' + esc(p ? p.allergies : '') + '"></div></div>' +
        '<h4 style="margin:18px 0 6px;">' + _('Payment') + '</h4><div class="fgrid" style="grid-template-columns:1fr 1fr 1fr;"><div><label for="vAmt">' + _('Amount (₹)') + '</label><input class="form-input" id="vAmt" type="number" min="0" value="' + a.payment.amount + '"></div>' +
        '<div><label for="vMethod">' + _('Method') + '</label><select class="form-input" id="vMethod"><option value="cash">' + _('Cash') + '</option><option value="upi">UPI</option><option value="card">' + _('Card') + '</option></select></div><div style="display:flex;align-items:end;"><label style="display:flex;gap:8px;align-items:center;margin:0 0 10px;font-size:.9rem;color:var(--neutral-800);"><input type="checkbox" id="vPaid"' + (a.payment.status === 'paid' ? ' checked' : '') + '> ' + _('Payment received') + '</label></div></div>',
      foot: '<button class="btn btn-secondary" data-act="visit-save" data-print="1">🖨 ' + _('Save & print') + '</button><button class="btn btn-primary" data-act="visit-save">✓ ' + _('Complete visit') + '</button>',
      onMount: function () { renderSugg(); renderRx(); }
    });
  };
  function renderSugg() {
    var a = V.appt, list = D.db.medicines.filter(function (m) { return (m.conditions || []).indexOf(a.conditionId) !== -1 && m.stock !== 'out'; }).slice(0, 12), c = D.condOf(a.conditionId);
    $('vSugg').innerHTML = list.length ? '<p class="small muted">' + _('Suggested for') + ' <b>' + esc(c ? D.condName(c) : '') + '</b>:</p><div class="sugg">' + list.map(function (m) { return '<button type="button" data-act="rx-add" data-id="' + m.id + '" title="' + esc(m.location) + '">+ ' + esc(m.name + (m.strength ? ' ' + m.strength : '')) + '</button>'; }).join('') + '</div>' : '';
  }
  function renderRx() {
    $('vRx').innerHTML = V.items.length ? V.items.map(function (i, n) {
      return '<div class="rx-row"><div class="nm">' + esc(medLabel(i)) + (i.location ? '<br><small class="med-loc">📍 ' + esc(i.location) + '</small>' : '') + '</div>' +
        '<input class="form-input sm" placeholder="' + _('Dose (1 tab)') + '" value="' + esc(i.dose) + '" data-inp="rxf" data-i="' + n + '" data-f="dose">' +
        '<select class="form-input sm" data-chg="rxf" data-i="' + n + '" data-f="freq">' + ['1-0-1', '1-1-1', '1-0-0', '0-0-1', '0-1-0', 'SOS', 'Once weekly'].map(function (f) { return '<option' + (i.freq === f ? ' selected' : '') + '>' + f + '</option>'; }).join('') + '</select>' +
        '<input class="form-input sm" type="number" min="1" placeholder="' + _('Days') + '" value="' + esc(i.days) + '" data-inp="rxf" data-i="' + n + '" data-f="days">' +
        '<button type="button" class="icon-btn" data-act="rx-del" data-i="' + n + '" title="Remove">×</button></div>';
    }).join('') : '<p class="muted small">' + _('No medicines added yet.') + '</p>';
  }
  D.actions['rx-add'] = function (el) {
    var m = D.db.medicines.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!m || !V) return;
    if (V.items.some(function (i) { return i.medId === m.id; })) { D.toast(_('Already added'), 'info'); return; }
    V.items.push({ medId: m.id, name: m.name, strength: m.strength, form: m.form, location: m.location, dose: '1 ' + (/tablet|capsule/i.test(m.form) ? 'tab' : ''), freq: '1-0-1', days: '3', instructions: '' });
    $('vMedQ').value = ''; $('vMedRes').innerHTML = ''; renderRx();
  };
  D.actions['rx-del'] = function (el) { V.items.splice(+el.dataset.i, 1); renderRx(); };
  D.inputs.vMedQ = function (el) {
    var q = el.value.trim(); if (!q) { $('vMedRes').innerHTML = ''; return; }
    var res = D.searchMeds(q).slice(0, 12);
    $('vMedRes').innerHTML = res.length ? '<div class="med-results">' + res.map(function (m) { return '<button type="button" data-act="rx-add" data-id="' + m.id + '"><span><b>' + esc(m.name) + '</b> ' + esc([m.strength, m.form].filter(Boolean).join(' · ')) + ' <small class="muted">' + esc(m.category) + '</small></span><span class="med-loc">📍 ' + esc(m.location || '—') + (m.stock === 'out' ? ' · ' + _('Out of stock') : '') + '</span></button>'; }).join('') + '</div>' : '<p class="muted small" style="margin-top:6px;">' + _('Not in database — add it from Prescriptions → Add medicine.') + '</p>';
  };
  D.inputs.rxf = function (el) { if (V && V.items[+el.dataset.i]) V.items[+el.dataset.i][el.dataset.f] = el.value; };
  D.changes.rxf = function (el) { if (V && V.items[+el.dataset.i]) V.items[+el.dataset.i][el.dataset.f] = el.value; };

  D.actions['visit-save'] = async function (el) {
    if (!V) return;
    var diag = D.val('vDiag').trim();
    if (!diag && !V.items.length && !D.val('vNotes').trim()) { D.toast(_('Enter a diagnosis, notes or a prescription'), 'warning'); return; }
    var payload = {
      appointmentId: V.appt.id, diagnosis: diag, notes: D.val('vNotes'), advice: D.val('vAdvice'), allergies: D.val('vAllergy'),
      vitals: { bp: D.val('vBp'), temp: D.val('vTemp'), pulse: D.val('vPulse'), weight: D.val('vWt'), spo2: D.val('vSpo2') },
      items: V.items.map(function (i) { return { medId: i.medId, name: i.name, strength: i.strength, form: i.form, dose: i.dose, freq: i.freq, days: i.days }; }),
      followUpDate: D.val('vFu'), followUpReason: D.val('vFuR'),
      payment: { status: $('vPaid').checked ? 'paid' : 'unpaid', amount: D.val('vAmt'), method: D.val('vMethod') }
    };
    var print = el.dataset.print, apptId = V.appt.id;
    var rec = await D.op('saveVisit', payload, _('Visit saved'));
    D.closeModal();
    if (print && rec && rec.prescriptionId) printRx(rec.prescriptionId);
    V = null;
  };

  /* ---------- print prescription ---------- */
  function printRx(id) {
    var x = D.db.prescriptions.filter(function (r) { return r.id === id; })[0]; if (!x) return;
    var p = D.patientOf(x.patientId) || {}, s = D.db.settings;
    var rows = x.items.map(function (i, n) { return '<tr><td>' + (n + 1) + '</td><td><b>' + esc(i.name) + '</b> ' + esc(i.strength || '') + '<br><small>' + esc(i.form || '') + '</small></td><td>' + esc(i.dose || '') + '</td><td>' + esc(i.freq || '') + '</td><td>' + esc(i.days || '') + '</td></tr>'; }).join('');
    var w = window.open('', '_blank'); if (!w) { D.toast('Please allow pop-ups to print', 'warning'); return; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Prescription</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:24px auto;color:#111}h1{margin:0;color:#0A3D6B;font-size:22px}.hd{border-bottom:3px solid #1769C2;padding-bottom:10px;margin-bottom:14px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ccc;padding:7px;text-align:left;font-size:14px}th{background:#eef5fc}.sig{margin-top:60px;text-align:right}</style></head><body><div class="hd"><h1>' + esc(s.clinicName) + '</h1><div>' + esc(s.address) + '<br>Ph: ' + esc(s.phone) + '</div></div><p><b>Patient:</b> ' + esc(p.name) + ' &nbsp; <b>Age:</b> ' + esc(p.age) + ' &nbsp; <b>Phone:</b> ' + esc(p.phone) + ' &nbsp; <b>Date:</b> ' + D.fmtDate(x.date) + '</p><h3>℞</h3><table><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Frequency</th><th>Days</th></tr>' + rows + '</table>' + (x.advice ? '<p><b>Advice:</b> ' + esc(x.advice) + '</p>' : '') + '<div class="sig">' + esc(s.doctorName) + '</div><script>window.onload=function(){window.print()}<\/script></body></html>');
    w.document.close();
  }
  D.actions['print-rx'] = function (el) { printRx(el.dataset.id); };

  /* ========== FOLLOW-UPS ========== */
  D.views.followups = {
    render: function () {
      var td = D.today(), tab = D.ui.fuTab, F = D.db.followups;
      var list = F.filter(function (f) { return tab === 'due' ? f.status === 'pending' && f.date <= td : tab === 'upcoming' ? f.status === 'pending' && f.date > td : f.status === 'done'; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var cnt = function (fn) { return F.filter(fn).length; };
      var tabs = [['due', 'Due / Overdue', cnt(function (f) { return f.status === 'pending' && f.date <= td; })], ['upcoming', 'Upcoming', cnt(function (f) { return f.status === 'pending' && f.date > td; })], ['done', 'Done', cnt(function (f) { return f.status === 'done'; })]];
      return '<div class="view-head"><div class="toolbar">' + tabs.map(function (t) { return '<button class="chip' + (tab === t[0] ? ' active' : '') + '" data-act="futab" data-v="' + t[0] + '">' + _(t[1]) + ' (' + t[2] + ')</button>'; }).join('') + '</div><button class="btn btn-primary btn-sm" data-act="add-fu">+ ' + _('Add follow-up') + '</button></div>' +
        '<div class="dash-panel"><div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>' + _('Date') + '</th><th>' + _('Patient') + '</th><th>' + _('Reason') + '</th><th>' + _('Contact') + '</th><th></th></tr></thead><tbody>' +
        (list.length ? list.map(function (f) {
          var p = D.patientOf(f.patientId) || { name: '?', phone: '' };
          return '<tr><td><b>' + D.fmtDate(f.date) + '</b>' + (f.status === 'pending' && f.date < td ? ' <span class="tag red">' + _('Overdue') + '</span>' : f.date === td && f.status === 'pending' ? ' <span class="tag green">' + _('Today') + '</span>' : '') + '</td><td><span class="name" style="cursor:pointer;color:var(--primary-800)" data-act="patient" data-id="' + f.patientId + '">' + esc(p.name) + '</span><br><small class="muted">' + esc(p.phone) + '</small></td><td>' + esc(f.reason) + '</td><td><div class="row-actions">' + D.contactBtns(p.phone) + '</div></td><td>' + (f.status === 'pending' ? '<button class="btn btn-xs btn-success" data-act="fu-set" data-id="' + f.id + '" data-v="done">✓ ' + _('Done') + '</button>' : '<button class="btn btn-xs btn-secondary" data-act="fu-set" data-id="' + f.id + '" data-v="pending">' + _('Reopen') + '</button>') + '</td></tr>';
        }).join('') : '<tr><td colspan="5" class="empty">' + _('Nothing here.') + '</td></tr>') + '</tbody></table></div></div>';
    }
  };
  D.actions.futab = function (el) { D.ui.fuTab = el.dataset.v; D.fresh = true; D.render(); };
  D.actions['fu-set'] = function (el) { D.op('setFollowup', { id: el.dataset.id, status: el.dataset.v }); };
  D.actions['add-fu'] = function (el) {
    if (!D.db.patients.length) { D.toast(_('No patients yet'), 'warning'); return; }
    D.modal({
      title: _('Add follow-up'),
      body: '<div class="fgrid"><div class="full"><label for="fuP">' + _('Patient') + '</label><select class="form-input" id="fuP">' + D.db.patients.map(function (p) { return '<option value="' + p.id + '"' + (p.id === el.dataset.id ? ' selected' : '') + '>' + esc(p.name) + ' — ' + esc(p.phone) + '</option>'; }).join('') + '</select></div><div><label for="fuD">' + _('Date') + '</label><input class="form-input" id="fuD" type="date" min="' + D.today() + '" value="' + Core.addDays(D.today(), 7) + '"></div><div><label for="fuR">' + _('Reason') + '</label><input class="form-input" id="fuR"></div></div>',
      foot: '<button class="btn btn-primary" data-act="add-fu-save">' + _('Save') + '</button>'
    });
  };
  D.actions['add-fu-save'] = async function () { if (!D.val('fuD')) { D.toast(_('Choose a date'), 'warning'); return; } await D.op('addFollowup', { patientId: D.val('fuP'), date: D.val('fuD'), reason: D.val('fuR') }, _('Follow-up added')); D.closeModal(); };

  /* ========== REPORTS ========== */
  D.views.reports = {
    render: function () {
      var n = D.ui.repRange, td = D.today(), from = n ? Core.addDays(td, -(n - 1)) : '0000-00-00';
      var A = D.db.appointments.filter(function (a) { return a.date >= from && a.date <= td; });
      var live = A.filter(function (a) { return a.status !== 'cancelled'; });
      var done = A.filter(function (a) { return a.status === 'completed'; });
      var paid = A.filter(function (a) { return a.payment.status === 'paid'; });
      var rev = paid.reduce(function (s, a) { return s + (+a.payment.amount || 0); }, 0);
      var due = done.filter(function (a) { return a.payment.status !== 'paid'; }).reduce(function (s, a) { return s + (+a.payment.amount || 0); }, 0);
      var newP = live.filter(function (a) { return a.visitType === 'new'; }).length;
      var by = {}, slots = {}, byMethod = {};
      live.forEach(function (a) { var k = D.condLabel(a); by[k] = (by[k] || 0) + 1; slots[a.time] = (slots[a.time] || 0) + 1; });
      paid.forEach(function (a) { var m = (a.payment.method || 'cash').toUpperCase(); byMethod[m] = (byMethod[m] || 0) + (+a.payment.amount || 0); });
      var top = Object.keys(by).map(function (k) { return [k, by[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8), mx = top.length ? top[0][1] : 1;
      var busy = Object.keys(slots).map(function (k) { return [k, slots[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6), bm = busy.length ? busy[0][1] : 1;
      var ranges = [[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days'], [0, 'All time']];
      return '<div class="view-head"><select class="form-input sm" style="max-width:200px" data-chg="reprange">' + ranges.map(function (r) { return '<option value="' + r[0] + '"' + (n === r[0] ? ' selected' : '') + '>' + _(r[1]) + '</option>'; }).join('') + '</select><button class="btn btn-secondary btn-sm" data-act="csv">⬇ ' + _('Export CSV') + '</button></div>' +
        '<div class="stats-grid six">' + kpi('blue', _('Total bookings'), live.length, A.length - live.length + ' ' + _('cancelled')) + kpi('purple', _('Completed visits'), done.length, A.filter(function (a) { return a.status === 'no-show'; }).length + ' ' + _('no-show')) +
        kpi('green', _('New patients'), newP, (live.length - newP) + ' ' + _('returning')) + kpi('green', _('Revenue collected'), money(rev), paid.length + ' ' + _('paid visits')) + kpi('yellow', _('Payment due'), money(due), _('from completed visits')) + kpi('blue', _('Total patients'), D.db.patients.length, _('in clinic records')) + '</div>' +
        '<div class="dash-panels"><div class="dash-panel"><div class="panel-header"><h3>' + _('Top problems') + '</h3></div><div class="panel-body">' + (top.length ? top.map(function (t) { return '<div class="hbar"><span>' + esc(t[0]) + '</span><div class="track"><div class="fill" style="width:' + (t[1] / mx * 100) + '%"></div></div><b>' + t[1] + '</b></div>'; }).join('') : '<p class="empty">' + _('No data yet.') + '</p>') + '</div></div>' +
        '<div class="dash-panel"><div class="panel-header"><h3>' + _('Busiest time slots') + '</h3></div><div class="panel-body">' + (busy.length ? busy.map(function (t) { return '<div class="hbar"><span>' + esc(D.tlabel(t[0])) + '</span><div class="track"><div class="fill" style="width:' + (t[1] / bm * 100) + '%"></div></div><b>' + t[1] + '</b></div>'; }).join('') : '<p class="empty">' + _('No data yet.') + '</p>') +
        (Object.keys(byMethod).length ? '<h4 style="margin:16px 0 8px;">' + _('Collections by method') + '</h4>' + Object.keys(byMethod).map(function (k) { return '<div class="hbar" style="grid-template-columns:130px 1fr"><span>' + esc(k) + '</span><b>' + money(byMethod[k]) + '</b></div>'; }).join('') : '') + '</div></div></div>';
    }
  };
  function kpi(color, label, val, sub) { return '<div class="stat-card"><p class="stat-label">' + label + '</p><p class="stat-value">' + val + '</p><span class="stat-sub">' + sub + '</span></div>'; }
  D.changes.reprange = function (el) { D.ui.repRange = +el.value; D.fresh = true; D.render(); };
  D.actions.csv = function () {
    var rows = [['Reference', 'Date', 'Time', 'Patient', 'Phone', 'Age', 'Problem', 'Status', 'Payment', 'Amount', 'Method']];
    D.db.appointments.slice().sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }).forEach(function (a) { rows.push([a.ref, a.date, a.time, a.name, a.phone, a.age, a.conditionName, a.status, a.payment.status, a.payment.amount, a.payment.method]); });
    download('appointments-' + D.today() + '.csv', rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n'), 'text/csv');
  };
  function download(name, text, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ========== SETTINGS ========== */
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  D.views.settings = {
    static: true,
    render: function () {
      var s = D.db.settings, live = Store.mode === 'server';
      return '<div class="dash-panel settings-card"><div class="panel-header"><h3>' + _('Clinic information') + '</h3></div><div class="panel-body"><div class="fgrid">' +
        '<div><label for="sName">' + _('Clinic name') + '</label><input class="form-input" id="sName" value="' + esc(s.clinicName) + '"></div><div><label for="sDoc">' + _('Doctor name') + '</label><input class="form-input" id="sDoc" value="' + esc(s.doctorName) + '"></div>' +
        '<div><label for="sPhone">' + _('Phone') + '</label><input class="form-input" id="sPhone" value="' + esc(s.phone) + '"></div><div><label for="sFee">' + _('Consultation fee (₹)') + '</label><input class="form-input" id="sFee" type="number" min="0" value="' + s.fee + '"></div>' +
        '<div class="full"><label for="sAddr">' + _('Address') + '</label><input class="form-input" id="sAddr" value="' + esc(s.address) + '"></div></div></div></div>' +
        '<div class="dash-panel settings-card"><div class="panel-header"><h3>' + _('Timings & booking slots') + '</h3></div><div class="panel-body"><p class="muted small" style="margin-bottom:10px;">' + _('Patients can only book free slots inside these sessions. Changes apply to the booking page immediately.') + '</p><div id="sessRows">' +
        s.sessions.map(sessRow).join('') + '</div><button class="btn btn-xs btn-secondary" data-act="sess-add">+ ' + _('Add session') + '</button>' +
        '<div class="fgrid" style="margin-top:16px;"><div><label for="sSlot">' + _('Slot length') + '</label><select class="form-input" id="sSlot">' + [10, 15, 20, 30, 45, 60].map(function (m) { return '<option value="' + m + '"' + (s.slotMinutes === m ? ' selected' : '') + '>' + m + ' ' + _('minutes') + '</option>'; }).join('') + '</select></div><div><label for="sAdv">' + _('Days open for booking') + '</label><input class="form-input" id="sAdv" type="number" min="1" max="60" value="' + s.advanceDays + '"></div>' +
        '<div class="full"><label>' + _('Closed on') + '</label><div class="day-checks">' + DAYS.map(function (d, i) { return '<label><input type="checkbox" name="sClosed" value="' + i + '"' + (s.closedDays.indexOf(i) !== -1 ? ' checked' : '') + '> ' + _(d) + '</label>'; }).join('') + '</div></div></div></div></div>' +
        '<button class="btn btn-primary" data-act="settings-save" style="margin-bottom:22px;">' + _('Save settings') + '</button>' +
        '<div class="dash-panel settings-card"><div class="panel-header"><h3>' + _('Login & security') + '</h3></div><div class="panel-body">' + (live ? '<div class="fgrid"><div><label for="pwEmail">' + _('Login email') + '</label><input class="form-input" id="pwEmail" value="doctor@devaki.in"></div><div></div><div><label for="pwCur">' + _('Current password') + '</label><input class="form-input" id="pwCur" type="password"></div><div><label for="pwNew">' + _('New password (min 6)') + '</label><input class="form-input" id="pwNew" type="password"></div></div><button class="btn btn-secondary" style="margin-top:12px;" data-act="pw-save">' + _('Change login') + '</button>' : '<p class="muted small">' + _('Password change is available when the site runs with the live server (node server.js).') + '</p>') + '</div></div>' +
        '<div class="dash-panel settings-card"><div class="panel-header"><h3>' + _('Data') + '</h3><span class="live-pill ' + (live ? '' : 'local') + '"><i></i>' + (live ? _('Live server') : _('Local browser only')) + '</span></div><div class="panel-body"><div class="row-actions"><button class="btn btn-secondary btn-sm" data-act="backup">⬇ ' + _('Download backup') + '</button><label class="btn btn-secondary btn-sm" style="cursor:pointer;margin:0;">⬆ ' + _('Restore backup') + '<input type="file" accept="application/json" id="restoreFile" hidden></label><button class="btn btn-secondary btn-sm" data-act="demo">' + _('Load demo patients') + '</button><button class="btn btn-danger btn-sm" data-act="reset">' + _('Erase all data') + '</button></div></div></div>';
    }
  };
  function sessRow(x) { return '<div class="sess-row"><input class="form-input sm" type="time" value="' + x.start + '" data-s="start" style="max-width:130px"> <span>→</span> <input class="form-input sm" type="time" value="' + x.end + '" data-s="end" style="max-width:130px"> <button class="icon-btn" data-act="sess-del" title="Remove">×</button></div>'; }
  D.actions['sess-add'] = function () { $('sessRows').insertAdjacentHTML('beforeend', sessRow({ start: '09:00', end: '12:00' })); };
  D.actions['sess-del'] = function (el) { el.closest('.sess-row').remove(); };
  D.actions['settings-save'] = async function () {
    var sessions = Array.prototype.map.call(document.querySelectorAll('#sessRows .sess-row'), function (r) { return { start: r.querySelector('[data-s=start]').value, end: r.querySelector('[data-s=end]').value }; });
    var closed = Array.prototype.map.call(document.querySelectorAll('input[name=sClosed]:checked'), function (c) { return +c.value; });
    try {
      await Store.op('saveSettings', { settings: { clinicName: D.val('sName'), doctorName: D.val('sDoc'), phone: D.val('sPhone'), address: D.val('sAddr'), fee: D.val('sFee'), sessions: sessions, slotMinutes: +D.val('sSlot'), advanceDays: D.val('sAdv'), closedDays: closed } });
      D.toast(_('Settings saved — booking page updated'), 'success'); D.fresh = true; await D.refresh();
    } catch (e) { D.toast(e.message, 'error'); }
  };
  D.actions['pw-save'] = async function () {
    try { await Store.op('changePassword', { current: D.val('pwCur'), next: D.val('pwNew'), email: D.val('pwEmail') }); D.toast(_('Login updated. Please sign in again.'), 'success'); setTimeout(function () { Store.logout(); location.href = 'doctor-login.html'; }, 1200); }
    catch (e) { D.toast(e.message, 'error'); }
  };
  D.actions.backup = async function () { var db = await Store.getDb(); download('devaki-backup-' + D.today() + '.json', JSON.stringify(db, null, 1), 'application/json'); };
  D.actions.demo = async function () { if (!confirm(_('Add a few demo patients with past visits?'))) return; D.fresh = true; await D.op('loadDemo', {}, _('Demo data added')); };
  D.actions.reset = async function () {
    var t = prompt(_('This permanently erases ALL appointments, patients and records. Type ERASE to confirm.')); if (t !== 'ERASE') return;
    D.fresh = true; await D.op('resetDb', {}, _('All data erased'));
  };
  document.addEventListener('change', function (ev) {
    if (ev.target.id !== 'restoreFile' || !ev.target.files[0]) return;
    var fr = new FileReader();
    fr.onload = async function () {
      try { var j = JSON.parse(fr.result); if (!j.appointments || !j.patients) throw new Error('Not a valid backup'); if (!confirm(_('Replace ALL current data with this backup?'))) return; D.fresh = true; await D.op('importDb', { db: j }, _('Backup restored')); }
      catch (e) { D.toast(e.message, 'error'); }
    };
    fr.readAsText(ev.target.files[0]);
  });

})();

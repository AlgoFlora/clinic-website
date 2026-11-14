/* ========================================
   DEVAKI CLINIC — Core data logic
   Shared by the browser (offline/local mode) and server.js (live mode).
   All booking rules (slots, double-booking, patient matching) live here.
   ======================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TZ = 'Asia/Kolkata';

  /* ---------- time helpers (clinic time = IST) ---------- */
  function istNow(d) {
    d = d || new Date();
    var f = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d), o = {};
    f.forEach(function (p) { o[p.type] = p.value; });
    var date = o.year + '-' + o.month + '-' + o.day;
    return { date: date, mins: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10), dow: dowOf(date), ts: d.getTime() };
  }
  function dowOf(dateStr) { var p = dateStr.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }
  function addDays(dateStr, n) {
    var p = dateStr.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toMins(hhmm) { var p = hhmm.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function fromMins(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function label12(hhmm) {
    var m = toMins(hhmm), h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + pad(mm) + ' ' + ap;
  }
  function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function normPhone(p) { return String(p || '').replace(/\D/g, '').slice(-10); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- defaults ---------- */
  function defaultSettings() {
    return {
      clinicName: 'Devaki Clinic and Day Care Centre',
      doctorName: 'Dr. Dnyaneshwar Giri',
      phone: '+91 94678 33712',
      address: 'Gram Panchayat Road, opposite Gram Panchayat, Wageshwar Nagar, Wagholi, Pune, Maharashtra 412207',
      sessions: [{ start: '10:00', end: '14:00' }, { start: '17:00', end: '22:00' }],
      slotMinutes: 30,
      advanceDays: 7,
      closedDays: [],
      fee: 300
    };
  }

  var CONDITIONS = [
    { id: 'fever', name: 'Fever', mr: 'ताप', icon: 'thermo' },
    { id: 'coldcough', name: 'Cold & Cough', mr: 'सर्दी आणि खोकला', icon: 'wind' },
    { id: 'throat', name: 'Throat Infection', mr: 'घशाचा संसर्ग', icon: 'throat' },
    { id: 'stomach', name: 'Stomach Problems', mr: 'पोटाचे आजार', icon: 'stomach' },
    { id: 'headache', name: 'Headache / Migraine', mr: 'डोकेदुखी', icon: 'head' },
    { id: 'bodypain', name: 'Body & Joint Pain', mr: 'अंगदुखी / सांधेदुखी', icon: 'bone' },
    { id: 'diabetes', name: 'Diabetes (Sugar)', mr: 'मधुमेह (साखर)', icon: 'drop' },
    { id: 'bp', name: 'Blood Pressure', mr: 'रक्तदाब', icon: 'pulse' },
    { id: 'skin', name: 'Skin Allergy / Rash', mr: 'त्वचेची अ‍ॅलर्जी', icon: 'skin' },
    { id: 'child', name: 'Child Illness', mr: 'लहान मुलांचे आजार', icon: 'child' },
    { id: 'weakness', name: 'Weakness / Anaemia', mr: 'अशक्तपणा', icon: 'battery' },
    { id: 'uti', name: 'Urine Infection', mr: 'लघवीचा संसर्ग', icon: 'uti' },
    { id: 'asthma', name: 'Breathing / Asthma', mr: 'दमा / श्वास त्रास', icon: 'lungs' },
    { id: 'checkup', name: 'General Check-up', mr: 'सर्वसाधारण तपासणी', icon: 'check' },
    { id: 'other', name: 'Other', mr: 'इतर', icon: 'plus' }
  ];

  // [name, strength, form, category, shelf, conditionIds]
  var MED_SEED = [
    ['Paracetamol', '500 mg', 'Tablet', 'Fever & Pain', 'Shelf A · Row 1', ['fever', 'headache', 'bodypain', 'coldcough']],
    ['Paracetamol', '125 mg/5 ml', 'Syrup', 'Child Care', 'Shelf E · Row 1', ['child', 'fever']],
    ['Ibuprofen', '400 mg', 'Tablet', 'Fever & Pain', 'Shelf A · Row 1', ['bodypain', 'headache', 'fever']],
    ['Diclofenac', '50 mg', 'Tablet', 'Fever & Pain', 'Shelf A · Row 2', ['bodypain']],
    ['Aceclofenac + Paracetamol', '100/325 mg', 'Tablet', 'Fever & Pain', 'Shelf A · Row 2', ['bodypain', 'headache']],
    ['Cetirizine', '10 mg', 'Tablet', 'Cold & Allergy', 'Shelf B · Row 1', ['coldcough', 'skin']],
    ['Levocetirizine', '5 mg', 'Tablet', 'Cold & Allergy', 'Shelf B · Row 1', ['coldcough', 'skin']],
    ['Ambroxol', '30 mg/5 ml', 'Syrup', 'Cough', 'Shelf B · Row 2', ['coldcough']],
    ['Dextromethorphan', '10 mg/5 ml', 'Syrup', 'Cough', 'Shelf B · Row 2', ['coldcough']],
    ['Montelukast', '10 mg', 'Tablet', 'Respiratory', 'Shelf B · Row 3', ['asthma', 'coldcough']],
    ['Salbutamol', '100 mcg', 'Inhaler', 'Respiratory', 'Shelf B · Row 3', ['asthma']],
    ['Azithromycin', '500 mg', 'Tablet', 'Antibiotic', 'Shelf C · Row 1', ['throat', 'coldcough']],
    ['Amoxicillin + Clavulanate', '625 mg', 'Tablet', 'Antibiotic', 'Shelf C · Row 1', ['throat', 'skin', 'uti']],
    ['Cefixime', '200 mg', 'Tablet', 'Antibiotic', 'Shelf C · Row 2', ['throat', 'uti']],
    ['Ciprofloxacin', '500 mg', 'Tablet', 'Antibiotic', 'Shelf C · Row 2', ['uti', 'stomach']],
    ['Metronidazole', '400 mg', 'Tablet', 'Antibiotic', 'Shelf C · Row 3', ['stomach']],
    ['Nitrofurantoin', '100 mg', 'Capsule', 'Antibiotic', 'Shelf C · Row 3', ['uti']],
    ['Pantoprazole', '40 mg', 'Tablet', 'Stomach Care', 'Shelf D · Row 1', ['stomach']],
    ['Domperidone', '10 mg', 'Tablet', 'Stomach Care', 'Shelf D · Row 1', ['stomach']],
    ['Ondansetron', '4 mg', 'Tablet', 'Stomach Care', 'Shelf D · Row 2', ['stomach']],
    ['Dicyclomine', '20 mg', 'Tablet', 'Stomach Care', 'Shelf D · Row 2', ['stomach']],
    ['ORS', '21 g', 'Sachet', 'Stomach Care', 'Shelf D · Row 3', ['stomach', 'child']],
    ['Zinc', '20 mg', 'Dispersible tablet', 'Child Care', 'Shelf E · Row 2', ['child', 'stomach']],
    ['Metformin', '500 mg', 'Tablet', 'Diabetes', 'Shelf F · Row 1', ['diabetes']],
    ['Glimepiride', '1 mg', 'Tablet', 'Diabetes', 'Shelf F · Row 1', ['diabetes']],
    ['Amlodipine', '5 mg', 'Tablet', 'Blood Pressure', 'Shelf F · Row 2', ['bp']],
    ['Telmisartan', '40 mg', 'Tablet', 'Blood Pressure', 'Shelf F · Row 2', ['bp']],
    ['Losartan', '50 mg', 'Tablet', 'Blood Pressure', 'Shelf F · Row 2', ['bp']],
    ['Clotrimazole', '1% w/w', 'Cream', 'Skin Care', 'Shelf G · Row 1', ['skin']],
    ['Betamethasone', '0.05% w/w', 'Cream', 'Skin Care', 'Shelf G · Row 1', ['skin']],
    ['Calamine', 'Lotion', 'Lotion', 'Skin Care', 'Shelf G · Row 2', ['skin']],
    ['Povidone-iodine', '5% w/w', 'Ointment', 'Skin Care', 'Shelf G · Row 2', ['other']],
    ['Vitamin D3', '60000 IU', 'Sachet / Capsule', 'Vitamins', 'Shelf H · Row 1', ['weakness', 'bodypain']],
    ['Iron + Folic Acid', '100 mg/500 mcg', 'Tablet', 'Vitamins', 'Shelf H · Row 1', ['weakness']],
    ['Vitamin B12 (Methylcobalamin)', '1500 mcg', 'Tablet', 'Vitamins', 'Shelf H · Row 2', ['weakness']],
    ['Calcium + Vitamin D3', '500 mg/250 IU', 'Tablet', 'Vitamins', 'Shelf H · Row 2', ['weakness', 'bodypain']],
    ['Multivitamin', 'per 5 ml', 'Syrup', 'Child Care', 'Shelf E · Row 3', ['child', 'weakness']],
    ['Normal Saline (NS)', '500 ml', 'IV fluid', 'Day Care / IV', 'Day Care Cabinet 1', ['fever', 'stomach']],
    ['Ringer Lactate (RL)', '500 ml', 'IV fluid', 'Day Care / IV', 'Day Care Cabinet 1', ['stomach']],
    ['Diclofenac', '75 mg/3 ml', 'Injection', 'Day Care / IV', 'Day Care Cabinet 2', ['bodypain']],
    ['Ondansetron', '4 mg/2 ml', 'Injection', 'Day Care / IV', 'Day Care Cabinet 2', ['stomach']]
  ];

  function seedMedicines() {
    return MED_SEED.map(function (m, i) {
      return { id: 'M' + (1000 + i), name: m[0], strength: m[1], form: m[2], category: m[3], location: m[4], conditions: m[5], stock: 'in', notes: '' };
    });
  }

  function emptyDb() {
    return {
      v: 2,
      settings: defaultSettings(),
      conditions: clone(CONDITIONS),
      appointments: [], patients: [], records: [], prescriptions: [], followups: [],
      medicines: seedMedicines(),
      counters: { appt: 0, patient: 0 },
      updatedAt: Date.now()
    };
  }

  function migrate(db) {
    if (!db || db.v !== 2) return emptyDb();
    var d = emptyDb();
    Object.keys(d).forEach(function (k) { if (db[k] === undefined) db[k] = d[k]; });
    db.settings = Object.assign(defaultSettings(), db.settings);
    return db;
  }

  /* ---------- slots ---------- */
  function slotTimes(settings) {
    var out = [], step = Math.max(5, +settings.slotMinutes || 30);
    (settings.sessions || []).forEach(function (s, si) {
      var a = toMins(s.start), b = toMins(s.end);
      for (var t = a; t + step <= b; t += step) out.push({ time: fromMins(t), label: label12(fromMins(t)), session: si });
    });
    return out;
  }
  function bookableDates(db, now) {
    var out = [], s = db.settings, n = Math.max(1, +s.advanceDays || 7);
    for (var i = 0; i < n; i++) {
      var d = addDays(now.date, i);
      out.push({ date: d, dow: dowOf(d), closed: (s.closedDays || []).indexOf(dowOf(d)) !== -1 });
    }
    return out;
  }
  function slotsFor(db, dateStr, now) {
    now = now || istNow();
    var s = db.settings;
    if ((s.closedDays || []).indexOf(dowOf(dateStr)) !== -1) return [];
    var taken = {};
    db.appointments.forEach(function (a) { if (a.date === dateStr && a.status !== 'cancelled') taken[a.time] = true; });
    return slotTimes(s).map(function (sl) {
      var state = 'free';
      if (dateStr < now.date || (dateStr === now.date && toMins(sl.time) <= now.mins)) state = 'past';
      else if (taken[sl.time]) state = 'booked';
      return { time: sl.time, label: sl.label, session: sl.session, state: state };
    });
  }
  function publicConfig(db, now) {
    now = now || istNow();
    var s = db.settings;
    return {
      clinicName: s.clinicName, doctorName: s.doctorName, phone: s.phone, fee: s.fee,
      slotMinutes: s.slotMinutes, sessions: s.sessions, today: now.date,
      dates: bookableDates(db, now), conditions: db.conditions
    };
  }

  /* ---------- patients ---------- */
  function betterName(oldN, newN) {
    var o = oldN.trim(), n = newN.trim();
    if (n.length > o.length && n.toLowerCase().indexOf(o.toLowerCase()) === 0) return n;
    return o;
  }
  function findPatientByPhone(db, phone) {
    var p = normPhone(phone);
    for (var i = 0; i < db.patients.length; i++) if (db.patients[i].phone === p) return db.patients[i];
    return null;
  }
  function upsertPatient(db, info, now) {
    var pt = findPatientByPhone(db, info.phone), isNew = false;
    var name = String(info.name || '').trim().replace(/\s+/g, ' ');
    if (!pt) {
      db.counters.patient++;
      pt = { id: 'P' + String(db.counters.patient).padStart(4, '0'), name: name, phone: normPhone(info.phone), age: info.age, gender: info.gender || '', email: info.email || '', bloodGroup: '', allergies: '', notes: '', nameVariants: [], createdAt: now.ts };
      db.patients.push(pt); isNew = true;
    } else {
      var best = betterName(pt.name, name);
      if (best !== pt.name) { pt.nameVariants = (pt.nameVariants || []).concat(pt.name); pt.name = best; }
      if (name.toLowerCase() !== pt.name.toLowerCase() && (pt.nameVariants || []).map(function (x) { return x.toLowerCase(); }).indexOf(name.toLowerCase()) === -1) {
        pt.nameVariants = (pt.nameVariants || []).concat(name);
      }
      if (info.age !== '' && info.age != null) pt.age = info.age;
      if (info.gender) pt.gender = info.gender;
      if (info.email) pt.email = info.email;
    }
    return { patient: pt, isNew: isNew };
  }

  /* ---------- booking ---------- */
  function validatePatient(p) {
    var errors = {};
    if (!p.name || String(p.name).trim().length < 2) errors.name = 'Name is required';
    if (!/^[6-9]\d{9}$/.test(normPhone(p.phone))) errors.phone = 'Enter a valid 10-digit mobile number';
    var age = p.age === '' || p.age == null ? NaN : Number(p.age);
    if (isNaN(age) || age < 0 || age > 120) errors.age = 'Enter a valid age';
    return errors;
  }

  function book(db, p, now) {
    now = now || istNow();
    var errors = validatePatient(p);
    if (Object.keys(errors).length) return { ok: false, code: 'INVALID', errors: errors };
    if (!p.conditionId && !String(p.concern || '').trim()) return { ok: false, code: 'NO_CONCERN', message: 'Please select your problem' };
    var dates = bookableDates(db, now).filter(function (d) { return d.date === p.date; })[0];
    if (!dates || dates.closed) return { ok: false, code: 'BAD_DATE', message: 'The clinic cannot take bookings for this date' };
    var slot = slotsFor(db, p.date, now).filter(function (s) { return s.time === p.time; })[0];
    if (!slot) return { ok: false, code: 'BAD_SLOT', message: 'Invalid time slot' };
    if (slot.state === 'past') return { ok: false, code: 'PAST', message: 'This time has already passed' };
    if (slot.state === 'booked') return { ok: false, code: 'SLOT_TAKEN', message: 'Sorry, this slot was just booked by someone else. Please choose another.' };

    var up = upsertPatient(db, { name: p.name, phone: p.phone, age: Number(p.age), gender: p.gender, email: p.email }, now);
    var cond = db.conditions.filter(function (c) { return c.id === p.conditionId; })[0];
    db.counters.appt++;
    var ym = now.date.slice(2, 4) + now.date.slice(5, 7);
    var prior = db.appointments.some(function (a) { return a.patientId === up.patient.id && a.status !== 'cancelled'; });
    var appt = {
      id: uid('A'), ref: 'DVC-' + ym + '-' + String(db.counters.appt).padStart(4, '0'),
      patientId: up.patient.id, name: String(p.name).trim().replace(/\s+/g, ' '), phone: normPhone(p.phone),
      age: Number(p.age), gender: p.gender || '', email: p.email || '',
      conditionId: cond ? cond.id : 'other', conditionName: cond ? cond.name : 'Other',
      concern: String(p.concern || '').trim().slice(0, 500),
      date: p.date, time: p.time, status: 'pending',
      payment: { status: 'unpaid', amount: db.settings.fee, method: '', paidAt: null },
      visitType: prior ? 'returning' : 'new', source: p.source || 'web', createdAt: now.ts
    };
    db.appointments.push(appt);
    db.updatedAt = now.ts;
    return { ok: true, appointment: appt };
  }

  /* ---------- admin operations ---------- */
  var STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'];
  function find(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }

  var ops = {
    setStatus: function (db, a, now) {
      var ap = find(db.appointments, a.id); if (!ap) throw new Error('Appointment not found');
      if (STATUSES.indexOf(a.status) === -1) throw new Error('Bad status');
      ap.status = a.status; ap.statusAt = now.ts; return ap;
    },
    setPayment: function (db, a, now) {
      var ap = find(db.appointments, a.id); if (!ap) throw new Error('Appointment not found');
      var amt = a.amount != null && a.amount !== '' ? Number(a.amount) : ap.payment.amount;
      if (isNaN(amt) || amt < 0) throw new Error('Bad amount');
      ap.payment = { status: a.status === 'paid' ? 'paid' : 'unpaid', amount: amt, method: a.status === 'paid' ? (a.method || 'cash') : '', paidAt: a.status === 'paid' ? now.ts : null };
      return ap;
    },
    addWalkIn: function (db, a, now) {
      var errors = validatePatient(a);
      if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
      var up = upsertPatient(db, a, now);
      var cond = db.conditions.filter(function (c) { return c.id === a.conditionId; })[0];
      db.counters.appt++;
      var ym = now.date.slice(2, 4) + now.date.slice(5, 7);
      var ap = {
        id: uid('A'), ref: 'DVC-' + ym + '-' + String(db.counters.appt).padStart(4, '0'),
        patientId: up.patient.id, name: String(a.name).trim(), phone: normPhone(a.phone), age: Number(a.age), gender: a.gender || '', email: '',
        conditionId: cond ? cond.id : 'other', conditionName: cond ? cond.name : 'Other', concern: String(a.concern || '').trim(),
        date: now.date, time: fromMins(now.mins), status: 'confirmed',
        payment: { status: 'unpaid', amount: db.settings.fee, method: '', paidAt: null },
        visitType: up.isNew ? 'new' : 'returning', source: 'walk-in', createdAt: now.ts
      };
      db.appointments.push(ap); return ap;
    },
    saveVisit: function (db, a, now) {
      var ap = a.appointmentId ? find(db.appointments, a.appointmentId) : null;
      var pid = ap ? ap.patientId : a.patientId;
      var pt = find(db.patients, pid); if (!pt) throw new Error('Patient not found');
      var rec = {
        id: uid('R'), patientId: pid, appointmentId: ap ? ap.id : '', date: ap ? ap.date : now.date,
        diagnosis: String(a.diagnosis || '').trim(), notes: String(a.notes || '').trim(),
        vitals: a.vitals || {}, createdAt: now.ts
      };
      var items = (a.items || []).filter(function (i) { return i && i.name; });
      if (items.length) {
        var rx = { id: uid('RX'), patientId: pid, appointmentId: rec.appointmentId, date: rec.date, items: items, advice: String(a.advice || '').trim(), createdAt: now.ts };
        db.prescriptions.push(rx); rec.prescriptionId = rx.id;
      }
      db.records.push(rec);
      if (a.followUpDate) db.followups.push({ id: uid('F'), patientId: pid, date: a.followUpDate, reason: String(a.followUpReason || rec.diagnosis || 'Follow-up').trim(), status: 'pending', createdAt: now.ts });
      if (a.allergies != null) pt.allergies = String(a.allergies);
      if (ap) {
        ap.status = 'completed'; ap.statusAt = now.ts;
        if (a.payment && a.payment.status === 'paid') {
          ap.payment = { status: 'paid', amount: Number(a.payment.amount) || ap.payment.amount, method: a.payment.method || 'cash', paidAt: now.ts };
        }
      }
      return rec;
    },
    addRecord: function (db, a, now) {
      if (!find(db.patients, a.patientId)) throw new Error('Patient not found');
      var rec = { id: uid('R'), patientId: a.patientId, appointmentId: '', date: a.date || now.date, diagnosis: String(a.diagnosis || '').trim(), notes: String(a.notes || '').trim(), vitals: {}, createdAt: now.ts };
      db.records.push(rec); return rec;
    },
    updatePatient: function (db, a) {
      var pt = find(db.patients, a.id); if (!pt) throw new Error('Patient not found');
      ['name', 'age', 'gender', 'email', 'bloodGroup', 'allergies', 'notes'].forEach(function (k) { if (a.fields && a.fields[k] !== undefined) pt[k] = a.fields[k]; });
      if (a.fields && a.fields.phone) {
        var np = normPhone(a.fields.phone);
        var other = findPatientByPhone(db, np);
        if (other && other.id !== pt.id) throw new Error('Another patient already has this phone number');
        pt.phone = np;
      }
      return pt;
    },
    mergePatients: function (db, a) { // move history of "from" into "into"
      var from = find(db.patients, a.from), into = find(db.patients, a.into);
      if (!from || !into || from.id === into.id) throw new Error('Invalid merge');
      ['appointments', 'records', 'prescriptions', 'followups'].forEach(function (k) { db[k].forEach(function (x) { if (x.patientId === from.id) x.patientId = into.id; }); });
      into.nameVariants = (into.nameVariants || []).concat(from.name, from.nameVariants || []);
      db.patients = db.patients.filter(function (p) { return p.id !== from.id; });
      return into;
    },
    upsertMedicine: function (db, a) {
      var m = a.id ? find(db.medicines, a.id) : null;
      if (!String(a.name || '').trim()) throw new Error('Medicine name required');
      if (!m) { m = { id: 'M' + Date.now().toString(36), stock: 'in', notes: '' }; db.medicines.push(m); }
      ['name', 'strength', 'form', 'category', 'location', 'stock', 'notes'].forEach(function (k) { if (a[k] !== undefined) m[k] = String(a[k]).trim(); });
      if (a.conditions) m.conditions = a.conditions.slice();
      m.conditions = m.conditions || [];
      return m;
    },
    deleteMedicine: function (db, a) { db.medicines = db.medicines.filter(function (m) { return m.id !== a.id; }); return true; },
    addFollowup: function (db, a, now) {
      if (!find(db.patients, a.patientId)) throw new Error('Patient not found');
      var f = { id: uid('F'), patientId: a.patientId, date: a.date, reason: String(a.reason || 'Follow-up'), status: 'pending', createdAt: now.ts };
      db.followups.push(f); return f;
    },
    setFollowup: function (db, a) { var f = find(db.followups, a.id); if (!f) throw new Error('Not found'); f.status = a.status; return f; },
    saveSettings: function (db, a) {
      var s = a.settings || {}, cur = db.settings;
      if (s.clinicName !== undefined) cur.clinicName = String(s.clinicName).trim() || cur.clinicName;
      if (s.doctorName !== undefined) cur.doctorName = String(s.doctorName).trim() || cur.doctorName;
      if (s.phone !== undefined) cur.phone = String(s.phone).trim();
      if (s.address !== undefined) cur.address = String(s.address).trim();
      if (s.fee !== undefined) { var f = Number(s.fee); if (isNaN(f) || f < 0) throw new Error('Bad fee'); cur.fee = f; }
      if (s.slotMinutes !== undefined) { var sm = Number(s.slotMinutes); if ([10, 15, 20, 30, 45, 60].indexOf(sm) === -1) throw new Error('Bad slot length'); cur.slotMinutes = sm; }
      if (s.advanceDays !== undefined) { var ad = Number(s.advanceDays); if (!(ad >= 1 && ad <= 60)) throw new Error('Advance days must be 1–60'); cur.advanceDays = ad; }
      if (s.closedDays !== undefined) cur.closedDays = s.closedDays.map(Number).filter(function (n) { return n >= 0 && n <= 6; });
      if (s.sessions !== undefined) {
        var ss = s.sessions.filter(function (x) { return x.start && x.end; });
        if (!ss.length) throw new Error('At least one session is required');
        ss.forEach(function (x) { if (toMins(x.end) <= toMins(x.start)) throw new Error('Session end must be after start'); });
        cur.sessions = ss.map(function (x) { return { start: x.start, end: x.end }; });
      }
      return cur;
    },
    resetDb: function (db) { var e = emptyDb(); Object.keys(db).forEach(function (k) { delete db[k]; }); Object.assign(db, e); return true; },
    importDb: function (db, a) {
      var n = migrate(a.db); Object.keys(db).forEach(function (k) { delete db[k]; }); Object.assign(db, n); return true;
    },
    loadDemo: function (db, a, now) { return loadDemo(db, now); }
  };

  function runOp(db, name, args, now) {
    now = now || istNow();
    if (!ops[name]) throw new Error('Unknown operation');
    var r = ops[name](db, args || {}, now);
    db.updatedAt = now.ts;
    return r;
  }

  /* ---------- demo data (optional, from Settings) ---------- */
  function loadDemo(db, now) {
    var people = [
      ['Sakshi More', '9876543210', 28, 'Female', 'fever', 'Fever, headache, body ache'],
      ['Rahul Patil', '9876543211', 45, 'Male', 'bp', 'BP follow-up'],
      ['Rupa Shah', '9876543213', 55, 'Female', 'diabetes', 'Sugar check'],
      ['Priya Deshmukh', '9876543215', 38, 'Female', 'child', 'Child cough'],
      ['Ankesh Diwedi', '9876543214', 22, 'Male', 'coldcough', 'Cold and cough']
    ];
    var slots = slotTimes(db.settings);
    people.forEach(function (p, i) {
      for (var v = 0; v < (i === 0 ? 3 : 2); v++) {
        var day = addDays(now.date, -(v * 9 + i + 1));
        var sl = slots[(i * 3 + v * 2) % slots.length];
        db.counters.appt++;
        var up = upsertPatient(db, { name: p[0], phone: p[1], age: p[2], gender: p[3] }, now);
        var ap = {
          id: uid('A'), ref: 'DVC-' + day.slice(2, 4) + day.slice(5, 7) + '-' + String(db.counters.appt).padStart(4, '0'),
          patientId: up.patient.id, name: p[0], phone: p[1], age: p[2], gender: p[3], email: '',
          conditionId: p[4], conditionName: db.conditions.filter(function (c) { return c.id === p[4]; })[0].name, concern: p[5],
          date: day, time: sl.time, status: 'completed', payment: { status: 'paid', amount: db.settings.fee, method: v % 2 ? 'upi' : 'cash', paidAt: now.ts },
          visitType: v ? 'returning' : 'new', source: 'demo', createdAt: now.ts - (v * 9 + i + 1) * 86400000
        };
        db.appointments.push(ap);
        db.records.push({ id: uid('R'), patientId: up.patient.id, appointmentId: ap.id, date: day, diagnosis: p[5], notes: 'Demo record.', vitals: {}, createdAt: ap.createdAt });
      }
    });
    return true;
  }

  return {
    TZ: TZ, istNow: istNow, addDays: addDays, dowOf: dowOf, toMins: toMins, label12: label12, normPhone: normPhone,
    emptyDb: emptyDb, migrate: migrate, defaultSettings: defaultSettings, slotsFor: slotsFor, publicConfig: publicConfig,
    book: book, runOp: runOp, validatePatient: validatePatient, STATUSES: STATUSES
  };
});

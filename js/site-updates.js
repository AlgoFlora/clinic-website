/* Devaki Clinic — location journey, timings status, directions, reviews slideshow */
(function () {
  'use strict';

  var DEST = 'Devaki Clinic and Day Care Centre, Gram Panchayat Road, Wageshwar Nagar, Wagholi, Pune, Maharashtra 412207';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tr(key, fallback) {
    return (typeof window.t === 'function' && window.t(key) !== key) ? window.t(key) : fallback;
  }

  /* ---------- Earth → India → Pune → Wagholi → Map ---------- */
  function initGeo() {
    var stage = document.getElementById('geoStage');
    if (!stage) return;
    var caption = document.getElementById('geoCaption');
    var skip = document.getElementById('geoSkip');
    var replay = document.getElementById('geoReplay');

    if (reduceMotion) { stage.classList.add('no-anim'); return; }

    var steps = [
      { en: 'Planet Earth', mr: 'पृथ्वी', ms: 2200 },
      { en: 'India', mr: 'भारत', ms: 2600 },
      { en: 'Pune, Maharashtra', mr: 'पुणे, महाराष्ट्र', ms: 2600 },
      { en: 'Wagholi — Devaki Clinic', mr: 'वाघोली — देवकी क्लिनिक', ms: 1100 }
    ];
    var timers = [];
    var started = false;

    function clear() { timers.forEach(clearTimeout); timers = []; }
    function label(i) {
      var lang = (typeof window.getLang === 'function') ? window.getLang() : 'en';
      caption.textContent = steps[i][lang === 'mr' ? 'mr' : 'en'];
    }
    function finish() {
      clear();
      stage.setAttribute('data-step', '4');
      stage.classList.add('done');
    }
    function play() {
      clear();
      stage.classList.remove('done');
      stage.setAttribute('data-step', '1');
      label(0);
      var at = steps[0].ms;
      for (var i = 1; i < steps.length; i++) {
        (function (idx, when) {
          timers.push(setTimeout(function () {
            if (idx === 3) { label(3); finish(); return; }
            stage.setAttribute('data-step', String(idx + 1));
            label(idx);
          }, when));
        })(i, at);
        at += steps[i].ms;
      }
    }

    skip.addEventListener('click', finish);
    replay.addEventListener('click', function () {
      // force a clean restart of the transition
      stage.setAttribute('data-step', '0');
      void stage.offsetWidth;
      play();
    });

    // Start when the section scrolls into view
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !started) { started = true; play(); io.disconnect(); }
        });
      }, { threshold: 0.35 });
      io.observe(stage);
    } else { started = true; play(); }
  }

  /* ---------- Directions (user's address → Google Maps) ---------- */
  function mapsDir(origin) {
    var u = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(DEST) + '&travelmode=driving';
    if (origin) u += '&origin=' + encodeURIComponent(origin);
    window.open(u, '_blank', 'noopener');
  }
  function initDirections() {
    var form = document.getElementById('dirForm');
    if (!form) return;
    var input = document.getElementById('dirFrom');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) { input.focus(); return; }
      mapsDir(v);
    });
    document.getElementById('dirHere').addEventListener('click', function () {
      // Google Maps uses the device's current location when no origin is given
      mapsDir('');
    });
  }

  /* ---------- Open / closed status + highlight today (IST) ---------- */
  function istNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
      }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: days[o.weekday], mins: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), mins: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function initTimings() {
    var status = document.getElementById('openStatus');
    var text = document.getElementById('openStatusText');
    if (!status) return;
    function update() {
      var n = istNow();
      document.querySelectorAll('.timing-row').forEach(function (r) {
        r.classList.toggle('today', parseInt(r.getAttribute('data-day'), 10) === n.day);
      });
      var open = (n.mins >= 600 && n.mins < 840) || (n.mins >= 1020 && n.mins < 1320);
      status.classList.toggle('open', open);
      status.classList.toggle('closed', !open);
      if (open) {
        text.textContent = tr('status_open', 'Open now');
      } else {
        var next = n.mins < 600 ? '10:00 AM' : (n.mins < 1020 ? '5:00 PM' : '10:00 AM');
        text.textContent = tr('status_closed', 'Closed now') + ' · ' + tr('status_next', 'Opens at') + ' ' + next;
      }
    }
    update();
    setInterval(update, 60000);
    document.querySelectorAll('.lang-btn').forEach(function (b) { b.addEventListener('click', function () { setTimeout(update, 0); }); });
  }

  /* ---------- Reviews slideshow ---------- */
  function initReviews() {
    var track = document.getElementById('rvTrack');
    if (!track) return;
    var cards = Array.prototype.slice.call(track.children);
    var dotsBox = document.getElementById('rvDots');
    var prev = document.getElementById('rvPrev');
    var next = document.getElementById('rvNext');
    var idx = 0, paused = false, resumeT = null, autoT = null, scrollT = null, programmatic = false;

    cards.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rv-dot'; b.setAttribute('aria-label', 'Review ' + (i + 1));
      b.addEventListener('click', function () { go(i); pauseFor(5000); });
      dotsBox.appendChild(b);
    });
    var dots = Array.prototype.slice.call(dotsBox.children);

    function mark(i) { dots.forEach(function (d, k) { d.classList.toggle('active', k === i); }); }
    function go(i) {
      idx = (i + cards.length) % cards.length;
      var c = cards[idx];
      programmatic = true;
      track.scrollTo({ left: c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
      mark(idx);
      setTimeout(function () { programmatic = false; }, 700);
    }
    function nearest() {
      var center = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
      cards.forEach(function (c, i) {
        var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    function tick() {
      if (paused) return;
      // if every card is already visible there is nothing to slide
      if (track.scrollWidth <= track.clientWidth + 4) return;
      go(idx + 1);
    }
    function start() { stop(); if (!reduceMotion) autoT = setInterval(tick, 3200); }
    function stop() { if (autoT) clearInterval(autoT); autoT = null; }
    function pauseFor(ms) {
      paused = true; clearTimeout(resumeT);
      resumeT = setTimeout(function () { paused = false; }, ms);
    }
    function hold() { paused = true; clearTimeout(resumeT); }
    function release() { clearTimeout(resumeT); resumeT = setTimeout(function () { paused = false; }, 2500); }

    // pause while the user holds / hovers / focuses; resume shortly after they let go
    track.addEventListener('pointerdown', hold);
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('mouseenter', hold);
    track.addEventListener('mouseleave', release);
    track.addEventListener('focusin', hold);
    track.addEventListener('focusout', release);
    track.addEventListener('touchstart', hold, { passive: true });
    track.addEventListener('touchend', release, { passive: true });
    track.addEventListener('wheel', function () { hold(); release(); }, { passive: true });
    track.addEventListener('scroll', function () {
      clearTimeout(scrollT);
      scrollT = setTimeout(function () { if (!programmatic) { idx = nearest(); mark(idx); } }, 120);
    }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(idx + 1); pauseFor(5000); }
      if (e.key === 'ArrowLeft') { go(idx - 1); pauseFor(5000); }
    });
    if (prev) prev.addEventListener('click', function () { go(idx - 1); pauseFor(5000); });
    if (next) next.addEventListener('click', function () { go(idx + 1); pauseFor(5000); });

    // only run while the section is on screen
    mark(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.2 }).observe(track);
    } else { start(); }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initGeo();
    initDirections();
    initTimings();
    initReviews();
  });
})();

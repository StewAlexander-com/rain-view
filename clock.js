/* ═══ Rain View — clock.js ═══
   Elegant overlay clock with pinch-to-resize.
   Scales via font-size (not CSS transform) so flex centering stays intact.
*/
(function () {
  'use strict';

  var overlay   = document.getElementById('clock-overlay');
  var timeEl    = document.getElementById('clock-time');
  var ampmEl    = document.getElementById('clock-ampm');
  var hintEl    = document.getElementById('clock-hint');
  var toggleBtn = document.getElementById('clock-toggle');
  var clockFace = document.getElementById('clock-face');

  if (!overlay || !timeEl || !toggleBtn || !clockFace) return;

  var active = false;
  var tickInterval = null;

  // ── Scale state (controls font-size multiplier) ──
  var scale = 1;
  var MIN_SCALE = 0.4;
  var MAX_SCALE = 3.0;
  var BASE_SIZE = 8;     // base vw for the time font
  var BASE_AMPM = 2.5;   // base vw for AM/PM
  var pinchStartDist = 0;
  var pinchStartScale = 1;
  var hintTimeout = null;

  // ── Toggle clock ──
  function toggle() {
    active = !active;
    overlay.classList.toggle('hidden', !active);
    toggleBtn.classList.toggle('is-active', active);

    if (active) {
      tick();
      applyScale();
      tickInterval = setInterval(tick, 1000);
      showHint();
    } else {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  }

  // ── Update time ──
  function tick() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    var mStr = m < 10 ? '0' + m : '' + m;

    timeEl.textContent = h12 + ':' + mStr;
    ampmEl.textContent = ampm;
  }

  // ── Show resize hint briefly ──
  function showHint() {
    if (!hintEl) return;
    hintEl.classList.remove('fade-out');
    clearTimeout(hintTimeout);
    hintTimeout = setTimeout(function () {
      hintEl.classList.add('fade-out');
    }, 3000);
  }

  // ── Apply scale via font-size (keeps flexbox centering intact) ──
  function applyScale() {
    timeEl.style.fontSize = (BASE_SIZE * scale) + 'vw';
    ampmEl.style.fontSize = (BASE_AMPM * scale) + 'vw';
  }

  // ── Pinch-to-zoom (touch) ──
  function getTouchDist(e) {
    if (e.touches.length < 2) return 0;
    var dx = e.touches[0].clientX - e.touches[1].clientX;
    var dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  if (clockFace) {
    clockFace.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchStartDist = getTouchDist(e);
        pinchStartScale = scale;
      }
    }, { passive: false });

    clockFace.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        var dist = getTouchDist(e);
        if (pinchStartDist > 0) {
          var newScale = pinchStartScale * (dist / pinchStartDist);
          scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
          applyScale();
        }
      }
    }, { passive: false });

    clockFace.addEventListener('touchend', function () {
      pinchStartDist = 0;
    });

    // Mouse wheel zoom for desktop
    clockFace.addEventListener('wheel', function (e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.08 : 0.08;
      scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
      applyScale();
      showHint();
    }, { passive: false });
  }

  // ── Button handler ──
  toggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    toggle();
  });

  // ── Hide clock when leaving scene ──
  var backBtn = document.getElementById('back');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (active) {
        active = false;
        overlay.classList.add('hidden');
        toggleBtn.classList.remove('is-active');
        clearInterval(tickInterval);
        tickInterval = null;
      }
    });
  }
})();

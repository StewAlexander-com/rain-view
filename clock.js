/* Rain View: the original brass clock, refined for bedside use. */
(function () {
  'use strict';
  var overlay = document.getElementById('clock-overlay');
  var scene = document.getElementById('scene');
  var time = document.getElementById('clock-time');
  var ampm = document.getElementById('clock-ampm');
  var toggle = document.getElementById('clock-toggle');
  var tools = document.getElementById('clock-tools');
  var ctrl = document.getElementById('ctrl');
  var smaller = document.getElementById('clock-smaller');
  var larger = document.getElementById('clock-larger');
  var dimmer = document.getElementById('clock-dimmer');
  var active = false, scale = 1, tickTimer, idleTimer, pinchDistance = 0, pinchScale = 1;

  function fit() {
    // Reserve room for the widest 12-hour time, including after rotation.
    var width = scene.clientWidth, height = scene.clientHeight;
    var base = Math.min(width * .19, height * .24, 164);
    var max = Math.min(width * .27, height * .40, 300);
    var size = Math.min(base * scale, max);
    time.style.fontSize = size + 'px';
    ampm.style.fontSize = Math.max(13, size * .14) + 'px';
    smaller.disabled = scale <= .55;
    larger.disabled = base * scale >= max;
  }

  function resize(delta) {
    var base = Math.min(scene.clientWidth * .19, scene.clientHeight * .24, 164);
    var max = Math.min(scene.clientWidth * .27, scene.clientHeight * .40, 300);
    scale = Math.max(.55, Math.min(max / base, scale + delta));
    fit();
    reveal();
  }

  function tick() {
    var now = new Date(), h = now.getHours();
    time.textContent = (h % 12 || 12) + ':' + String(now.getMinutes()).padStart(2, '0');
    ampm.textContent = h >= 12 ? 'PM' : 'AM';
    document.getElementById('clock-face').setAttribute('aria-label', time.textContent + ' ' + ampm.textContent);
    clearTimeout(tickTimer);
    if (active) tickTimer = setTimeout(tick, 60000 - Date.now() % 60000 + 20);
  }

  function reveal() {
    if (!active) return;
    scene.classList.remove('clock-resting');
    tools.inert = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (tools.contains(document.activeElement) || toggle === document.activeElement) return;
      scene.classList.add('clock-resting');
      tools.inert = true;
    }, 4500);
  }

  function setActive(value) {
    active = value;
    overlay.classList.toggle('hidden', !active);
    overlay.inert = !active;
    scene.classList.toggle('clock-active', active);
    scene.classList.remove('clock-resting');
    toggle.classList.toggle('is-active', active);
    toggle.setAttribute('aria-pressed', String(active));
    toggle.setAttribute('aria-label', active ? 'Hide clock' : 'Show clock');
    ctrl.classList.toggle('hidden', active);
    ctrl.inert = active;
    clearTimeout(tickTimer);
    clearTimeout(idleTimer);
    if (active) { tick(); fit(); reveal(); }
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    // Mouse/touch focus should not keep bedtime chrome awake forever.
    if (e.detail) toggle.blur();
    setActive(!active);
  });
  smaller.addEventListener('click', function () { resize(-.12); });
  larger.addEventListener('click', function () { resize(.12); });
  dimmer.addEventListener('input', function () {
    overlay.style.setProperty('--clock-dim', dimmer.value / 100);
    reveal();
  });
  tools.addEventListener('click', function (e) { e.stopPropagation(); reveal(); });
  tools.addEventListener('pointerdown', function (e) { e.stopPropagation(); reveal(); });
  tools.addEventListener('focusout', reveal);
  scene.addEventListener('pointermove', reveal);
  overlay.addEventListener('click', reveal);
  overlay.addEventListener('wheel', function (e) {
    if (tools.contains(e.target)) return;
    e.preventDefault();
    resize(e.deltaY > 0 ? -.08 : .08);
  }, { passive: false });

  function distance(e) {
    return Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  }
  overlay.addEventListener('touchstart', function (e) {
    if (tools.contains(e.target)) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchDistance = distance(e);
      pinchScale = scale;
    }
    reveal();
  }, { passive: false });
  overlay.addEventListener('touchmove', function (e) {
    if (e.touches.length !== 2 || !pinchDistance) return;
    e.preventDefault();
    resize(pinchScale * distance(e) / pinchDistance - scale);
  }, { passive: false });
  ['touchend', 'touchcancel'].forEach(function (event) {
    overlay.addEventListener(event, function () { pinchDistance = 0; });
  });
  document.addEventListener('keydown', function (e) {
    if (!active) return;
    reveal();
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setActive(false); toggle.focus(); }
    if (e.target.matches('input,button')) return;
    if (e.key === '+' || e.key === '=') resize(.12);
    if (e.key === '-') resize(-.12);
  }, true);
  document.addEventListener('visibilitychange', function () {
    if (active && !document.hidden) { tick(); fit(); }
  });
  document.addEventListener('rainview:sceneexit', function () { setActive(false); });
  window.addEventListener('resize', fit);
  if (document.fonts) document.fonts.ready.then(fit);
  overlay.inert = true;
})();

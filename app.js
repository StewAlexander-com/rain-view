/* ═══ Rain View v5 — app.js ═══ */
(function () {
  'use strict';

  const SCENES = {
    tokyo:  { title: 'Tokyo Evening',   video: 'assets/scene-tokyo.mp4',  thumb: 'assets/thumb-tokyo.jpg',  defaultRain: 'window',  defaultPiano: 'contemplative' },
    nyc:    { title: 'New York Night',   video: 'assets/scene-nyc.mp4',    thumb: 'assets/thumb-nyc.jpg',    defaultRain: 'heavy',   defaultPiano: 'jazz' },
    autumn: { title: 'Autumn Forest',    video: 'assets/scene-autumn.mp4', thumb: 'assets/thumb-autumn.jpg', defaultRain: 'forest',  defaultPiano: 'melancholic' },
    garden: { title: 'Zen Garden',       video: 'assets/scene-garden.mp4', thumb: 'assets/thumb-garden.jpg', defaultRain: 'gentle',  defaultPiano: 'ethereal' }
  };

  // DOM refs
  const splash    = document.getElementById('splash');
  const sceneEl   = document.getElementById('scene');
  const vid       = document.getElementById('vid');
  const titleEl   = document.getElementById('title');
  const ctrl      = document.getElementById('ctrl');
  const backBtn   = document.getElementById('back');
  const rainVol   = document.getElementById('rain-vol');
  const pianoVol  = document.getElementById('piano-vol');
  const rainPills = document.getElementById('rain-pills');
  const pianoPills = document.getElementById('piano-pills');
  const rainPlayPause = document.getElementById('rain-playpause');
  const pianoPlayPause = document.getElementById('piano-playpause');

  let audio = null;
  let current = null;
  let idleTimer = null;

  function init() {
    audio = new AudioEngine();
    audio.preload();

    // Scene cards
    document.querySelectorAll('.card').forEach(c => {
      c.addEventListener('click', () => enterScene(c.dataset.scene));
    });

    // Back
    backBtn.addEventListener('click', exitScene);

    // Volume
    rainVol.addEventListener('input', e => audio.setRainVolume(+e.target.value));
    pianoVol.addEventListener('input', e => audio.setPianoVolume(+e.target.value));

    // Rain variant pills
    rainPills.addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill || !rainPills.contains(pill)) return;
      const variant = pill.getAttribute('data-variant');
      if (!variant) return;
      rainPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      audio.setRainVariant(variant);
    });

    // Piano variant pills
    pianoPills.addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill || !pianoPills.contains(pill)) return;
      const variant = pill.getAttribute('data-variant');
      if (!variant) return;
      pianoPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      audio.setPianoVariant(variant);
    });

    rainPlayPause.addEventListener('click', e => {
      e.stopPropagation();
      audio.toggleRainPause();
      syncPlayPauseUi();
    });
    pianoPlayPause.addEventListener('click', e => {
      e.stopPropagation();
      audio.togglePianoPause();
      syncPlayPauseUi();
    });

    // Auto-hide
    setupAutoHide();

    // Keyboard
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && current) exitScene(); });
  }

  function enterScene(id) {
    const s = SCENES[id];
    if (!s) return;
    current = s;

    // Video
    vid.src = s.video;
    vid.play().catch(() => {});
    titleEl.textContent = s.title;

    // Set default variants
    setActivePill(rainPills, s.defaultRain);
    setActivePill(pianoPills, s.defaultPiano);
    rainVol.value = 0.7;
    pianoVol.value = 0;

    // Transition
    splash.classList.add('hidden');
    sceneEl.classList.remove('hidden');

    // Audio
    audio.start();
    audio.setRainVolume(0.7);
    audio.setPianoVolume(0);
    audio.setRainVariant(s.defaultRain);
    audio.setPianoVariant(s.defaultPiano);

    syncPlayPauseUi();
    showCtrl();
  }

  function syncPlayPauseUi() {
    const rPaused = audio.isRainPaused();
    const pPaused = audio.isPianoPaused();
    rainPlayPause.classList.toggle('is-paused', rPaused);
    pianoPlayPause.classList.toggle('is-paused', pPaused);
    rainPlayPause.setAttribute('aria-label', rPaused ? 'Play rain' : 'Pause rain');
    rainPlayPause.setAttribute('title', rPaused ? 'Play' : 'Pause');
    pianoPlayPause.setAttribute('aria-label', pPaused ? 'Play piano' : 'Pause piano');
    pianoPlayPause.setAttribute('title', pPaused ? 'Play' : 'Pause');
  }

  function exitScene() {
    vid.pause();
    vid.src = '';
    audio.stopAll();
    sceneEl.classList.add('hidden');
    setTimeout(() => splash.classList.remove('hidden'), 100);
    current = null;
  }

  function setActivePill(container, value) {
    container.querySelectorAll('.pill').forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-variant') === value);
    });
  }

  // Auto-hide controls
  function setupAutoHide() {
    function reset() {
      if (!current) return;
      showCtrl();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(hideCtrl, 4000);
    }
    document.addEventListener('mousemove', reset);
    document.addEventListener('touchstart', reset, { passive: true });

    ctrl.addEventListener('mouseenter', () => clearTimeout(idleTimer));
    ctrl.addEventListener('mouseleave', () => { if (current) idleTimer = setTimeout(hideCtrl, 4000); });
    ctrl.addEventListener('touchstart', () => clearTimeout(idleTimer), { passive: true });
    ctrl.addEventListener('touchend', () => { if (current) idleTimer = setTimeout(hideCtrl, 4000); }, { passive: true });
  }

  function showCtrl() { ctrl.classList.remove('hidden'); }
  function hideCtrl() { ctrl.classList.add('hidden'); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

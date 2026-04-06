/* ═══ Rain View v5 — app.js ═══ */
(function () {
  'use strict';

  /** iOS WebKit ignores programmatic media.volume; sliders are hidden — fixed mix in enterScene. */
  const IOS_RAIN_VOL = 0.7;
  const IOS_PIANO_VS_RAIN = 0.33;

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
  const fsBtn = document.getElementById('fullscreen-toggle');

  let audio = null;
  let current = null;
  let idleTimer = null;

  function isIOSAudioUi() {
    return typeof RainViewMobile !== 'undefined' && typeof RainViewMobile.isIOSLike === 'function' && RainViewMobile.isIOSLike();
  }

  function fullscreenApiAvailable() {
    return !!(sceneEl && (sceneEl.requestFullscreen || sceneEl.webkitRequestFullscreen));
  }

  function shouldOfferFullscreenControl() {
    if (!fullscreenApiAvailable()) return false;
    if (typeof RainViewMobile !== 'undefined' && RainViewMobile.isMobileAudioDevice && RainViewMobile.isMobileAudioDevice()) {
      return false;
    }
    try {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return false;
    } catch (e) {}
    return true;
  }

  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function isSceneFullscreen() {
    return getFullscreenElement() === sceneEl;
  }

  function exitFullscreenIfActive() {
    if (!getFullscreenElement()) return Promise.resolve();
    const x = document.exitFullscreen || document.webkitExitFullscreen;
    if (!x) return Promise.resolve();
    try {
      const p = x.call(document);
      return p !== undefined && p && typeof p.then === 'function' ? p.catch(() => {}) : Promise.resolve();
    } catch (e) {
      return Promise.resolve();
    }
  }

  function requestSceneFullscreen() {
    const req = sceneEl.requestFullscreen || sceneEl.webkitRequestFullscreen;
    if (!req) return Promise.reject(new Error('fullscreen'));
    try {
      const p = req.call(sceneEl);
      return p !== undefined && p && typeof p.then === 'function' ? p : Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function syncFullscreenUi() {
    if (!fsBtn || fsBtn.hasAttribute('hidden')) return;
    const on = isSceneFullscreen();
    fsBtn.classList.toggle('is-fullscreen', on);
    fsBtn.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Enter fullscreen');
    fsBtn.setAttribute('title', on ? 'Exit fullscreen' : 'Fullscreen');
  }

  function initFullscreenControl() {
    if (!fsBtn || !sceneEl) return;
    if (!shouldOfferFullscreenControl()) {
      fsBtn.hidden = true;
      return;
    }
    fsBtn.removeAttribute('hidden');
    document.documentElement.classList.add('rv-desktop-fullscreen');
    syncFullscreenUi();
    function onFsChange() {
      syncFullscreenUi();
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    fsBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (isSceneFullscreen()) {
        exitFullscreenIfActive().then(() => syncFullscreenUi());
      } else {
        requestSceneFullscreen().then(() => syncFullscreenUi()).catch(() => syncFullscreenUi());
      }
    });
  }

  function init() {
    audio = new AudioEngine();
    audio.preload();
    if (typeof RainViewMobile !== 'undefined' && RainViewMobile.configureRainViewMobileAudio) {
      RainViewMobile.configureRainViewMobileAudio(audio);
    }

    if (isIOSAudioUi()) {
      document.documentElement.classList.add('rv-ios-volume');
    }

    // Scene cards
    document.querySelectorAll('.card').forEach(c => {
      c.addEventListener('click', () => enterScene(c.dataset.scene));
    });

    // Back
    backBtn.addEventListener('click', exitScene);

    // Volume sliders (desktop / non‑iOS). iOS WebKit: hidden + fixed mix — see enterScene.
    if (!isIOSAudioUi()) {
      function bindVolumeRange(el, setFn) {
        const apply = e => setFn(+e.target.value);
        el.addEventListener('input', apply);
        el.addEventListener('change', apply);
      }
      bindVolumeRange(rainVol, v => audio.setRainVolume(v));
      bindVolumeRange(pianoVol, v => audio.setPianoVolume(v));
    }

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

    initFullscreenControl();

    // Keyboard — let the browser exit element fullscreen on first Escape; second Escape leaves the scene.
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !current) return;
      if (getFullscreenElement()) return;
      exitScene();
    });
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

    const rainLevel = isIOSAudioUi() ? IOS_RAIN_VOL : 0.7;
    const pianoLevel = isIOSAudioUi() ? IOS_RAIN_VOL * IOS_PIANO_VS_RAIN : 0;
    rainVol.value = String(rainLevel);
    pianoVol.value = String(pianoLevel);

    // Transition
    splash.classList.add('hidden');
    sceneEl.classList.remove('hidden');

    // Audio — set levels before start() so ensureWebAudio() picks up correct _volume (not default 1).
    audio.setRainVolume(rainLevel);
    audio.setPianoVolume(pianoLevel);
    audio.start();
    audio.setRainVariant(s.defaultRain);
    audio.setPianoVariant(s.defaultPiano);

    syncPlayPauseUi();
    showCtrl();

    /* iOS / PWA: first play often lands outside strict activation; re-nudge after resume + decode settle. */
    if (isIOSAudioUi() && typeof audio.nudgePlayback === 'function') {
      audio.nudgePlayback();
      setTimeout(function () {
        audio.nudgePlayback();
      }, 100);
      setTimeout(function () {
        audio.nudgePlayback();
      }, 400);
    }
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
    exitFullscreenIfActive().then(() => syncFullscreenUi());
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
    // Desktop: clicks on the video do not fire mousemove — without this, the panel
    // (including play/pause) stays at opacity 0 after auto-hide.
    document.addEventListener('click', reset);
    document.addEventListener('pointerdown', reset, { passive: true });

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

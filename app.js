/* ═══ Rain View v5 — app.js ═══ */
(function () {
  'use strict';

  /** iOS WebKit ignores programmatic media.volume; sliders are hidden — fixed mix in enterScene. */
  const IOS_RAIN_VOL = 0.7;
  const IOS_PIANO_VS_RAIN = 0.33;

  const IS_MOBILE = window.innerWidth <= 640 || ('ontouchstart' in window && window.innerWidth <= 1024);

  const SCENES = {
    tokyo:  { title: 'Tokyo Evening',   video: IS_MOBILE ? 'assets/scene-tokyo-mobile.mp4' : 'assets/scene-tokyo.mp4',  thumb: 'assets/thumb-tokyo.jpg',  defaultRain: 'window',  defaultPiano: 'contemplative' },
    nyc:    { title: 'New York Night',   video: IS_MOBILE ? 'assets/scene-nyc-mobile.mp4' : 'assets/scene-nyc.mp4',    thumb: 'assets/thumb-nyc.jpg',    defaultRain: 'heavy',   defaultPiano: 'jazz' },
    autumn: { title: 'Autumn Forest',    video: IS_MOBILE ? 'assets/scene-autumn-mobile.mp4' : 'assets/scene-autumn.mp4', thumb: 'assets/thumb-autumn.jpg', defaultRain: 'forest',  defaultPiano: 'melancholic' },
    garden: { title: 'Zen Garden',       video: IS_MOBILE ? 'assets/scene-garden-mobile.mp4' : 'assets/scene-garden.mp4', thumb: 'assets/thumb-garden.jpg', defaultRain: 'gentle',  defaultPiano: 'ethereal' }
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
  const iosAudioNote = document.getElementById('ios-audio-note');
  const audioSilentNote = document.getElementById('audio-silent-note');
  const sceneIosNote = document.getElementById('scene-ios-note');

  let audio = null;
  let current = null;
  let idleTimer = null;
  let audioHintTimer = null;
  let lastPreparedSceneId = null;
  let silentAudioTimer = null;

  function safePlayVideo(maxAttempts) {
    maxAttempts = maxAttempts != null ? maxAttempts : 4;
    if (!vid) return Promise.resolve(false);
    let attempt = 0;
    const delay = isIOSAudioUi() ? 140 : 90;
    function step() {
      attempt++;
      try {
        const p = vid.play();
        if (p && typeof p.then === 'function') {
          return p.then(
            () => true,
            () =>
              new Promise(resolve => {
                if (attempt >= maxAttempts) return resolve(false);
                setTimeout(() => resolve(step()), delay);
              })
          );
        }
        return Promise.resolve(true);
      } catch (e) {
        if (attempt >= maxAttempts) return Promise.resolve(false);
        return new Promise(resolve => setTimeout(() => resolve(step()), delay));
      }
    }
    return step();
  }

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

    if (vid) {
      // Mobile Safari can stall/fail a video play after backgrounding; retry a few times.
      function retryIfActive() {
        if (!current) return;
        safePlayVideo(5).then(() => {});
      }
      vid.addEventListener('stalled', retryIfActive);
      vid.addEventListener('error', retryIfActive);
      vid.addEventListener('suspend', retryIfActive);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden || !current) return;
        retryIfActive();
      });
      window.addEventListener('pageshow', function () {
        if (!current) return;
        retryIfActive();
      });
    }

    // Scene cards
    document.querySelectorAll('.card').forEach(c => {
      const id = c.dataset.scene;
      // Warm up video + audio on earliest intent signal so the subsequent click
      // has a much better chance of immediate playback on iOS PWA.
      c.addEventListener(
        'pointerdown',
        () => prepareScene(id),
        { passive: true }
      );
      c.addEventListener(
        'touchstart',
        () => prepareScene(id),
        { passive: true }
      );
      c.addEventListener('click', () => enterScene(id));
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

    // ═══ STEP 1: Unlock audio synchronously in the gesture handler ═══
    // iOS requires play() calls to originate from a user gesture.
    // mobile.js unlocks all <audio> elements on first touch, but we
    // also ensure the AudioContext is resumed RIGHT HERE in the click.
    try {
      if (typeof RainViewMobile !== 'undefined' && RainViewMobile.unlockAllAudio) {
        RainViewMobile.unlockAllAudio();
      }
      if (audio) {
        audio.start(); // creates AudioContext if needed
        audio.resumeAudioContextIfNeeded();
      }
    } catch (e0) {}

    // ═══ STEP 2: Start video (muted — always works) ═══
    try {
      vid.poster = s.thumb || '';
      vid.preload = 'auto';
      vid.playsInline = true;
      vid.muted = true;
      vid.src = s.video;
      vid.load();
    } catch (e) {}
    // Synchronous play attempt in the gesture — best chance of working
    safePlayVideo(6).then(() => {});
    titleEl.textContent = s.title;

    // ═══ STEP 3: Set UI state ═══
    setActivePill(rainPills, s.defaultRain);
    setActivePill(pianoPills, s.defaultPiano);

    const rainLevel = isIOSAudioUi() ? IOS_RAIN_VOL : 0.7;
    const pianoLevel = isIOSAudioUi() ? IOS_RAIN_VOL * IOS_PIANO_VS_RAIN : 0;
    rainVol.value = String(rainLevel);
    pianoVol.value = String(pianoLevel);

    splash.classList.add('hidden');
    sceneEl.classList.remove('hidden');
    hideSilentAudioNote();

    // ═══ STEP 4: Start audio ═══
    // Set volumes BEFORE switching variants so the layer doesn't
    // play at default volume briefly before the gain is applied.
    try {
      audio.setRainVolume(rainLevel);
      audio.setPianoVolume(pianoLevel);
      audio.setRainVariant(s.defaultRain);
      audio.setPianoVariant(s.defaultPiano);
      if (typeof audio.nudgePlayback === 'function') {
        audio.nudgePlayback();
      }
    } catch (e3) {}

    syncPlayPauseUi();
    showCtrl();

    // ═══ STEP 5: Retry cascade for iOS ═══
    // iOS PWA often needs multiple nudges as the audio session
    // takes time to fully initialize. Space retries across the
    // first few seconds to catch various iOS timing windows.
    const nudgeDelays = [50, 150, 400, 800, 1500, 3000];
    nudgeDelays.forEach(delay => {
      setTimeout(function () {
        if (!current) return;
        try {
          audio.resumeAudioContextIfNeeded();
          if (typeof audio.nudgePlayback === 'function') {
            audio.nudgePlayback();
          }
        } catch (e) {}
        // Also retry video if it stalled
        if (vid.paused && current) {
          safePlayVideo(2).then(() => {});
        }
      }, delay);
    });

    scheduleSilentAudioNote();
  }

  function prepareScene(id) {
    if (!id) return;
    if (lastPreparedSceneId === id) return;
    const s = SCENES[id];
    if (!s) return;
    lastPreparedSceneId = id;

    // Only prebuffer the video on pointerdown/touchstart.
    // Do NOT start audio here — on iOS, creating/resuming an
    // AudioContext outside of a click/touchend handler wastes
    // the gesture activation window.
    try {
      if (vid) {
        vid.poster = s.thumb || '';
        vid.preload = 'auto';
        vid.playsInline = true;
        vid.muted = true;
        if (vid.src !== s.video) {
          vid.src = s.video;
          vid.load();
        }
      }
    } catch (e) {}
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
    hideSilentAudioNote();
  }

  function hideSilentAudioNote() {
    if (silentAudioTimer) {
      clearInterval(silentAudioTimer);
      silentAudioTimer = null;
    }
    if (audioSilentNote) audioSilentNote.hidden = true;
    if (sceneIosNote) sceneIosNote.hidden = true;
  }

  function scheduleSilentAudioNote() {
    if (!audioSilentNote) return;
    if (!isIOSAudioUi()) return;
    if (!current) return;
    hideSilentAudioNote();

    // Poll for a few seconds: iOS PWA can take time to create an audio session.
    const startedAt = performance.now();
    const graceMs = 1400;
    const maxMs = 9000;

    silentAudioTimer = setInterval(function () {
      if (!current) {
        hideSilentAudioNote();
        return;
      }
      const now = performance.now();
      if (now - startedAt > maxMs) {
        clearInterval(silentAudioTimer);
        silentAudioTimer = null;
        return;
      }
      if (now - startedAt < graceMs) return;

      try {
        const r = audio && audio.rainLayer && audio.rainLayer.currentEl;
        const p = audio && audio.pianoLayer && audio.pianoLayer.currentEl;
        const rainShouldPlay = audio && audio.rainLayer && !audio.rainLayer._paused && audio.rainLayer._volume > 0.05;
        const pianoShouldPlay = audio && audio.pianoLayer && !audio.pianoLayer._paused && audio.pianoLayer._volume > 0.05;
        const ctxSuspended = audio && audio._ctx && audio._ctx.state === 'suspended';

        const rainPlaying = !!(r && !r.paused);
        const pianoPlaying = !!(p && !p.paused);

        // If something is audibly running, hide any warning and stop polling early.
        if ((rainShouldPlay && rainPlaying) || (pianoShouldPlay && pianoPlaying)) {
          hideSilentAudioNote();
          return;
        }

        // Treat "no current element yet" as silent too — iOS can block first play() entirely.
        const rainSilent = rainShouldPlay && (!r || r.paused);
        const pianoSilent = pianoShouldPlay && (!p || p.paused);

        if (ctxSuspended || rainSilent || pianoSilent) {
          audioSilentNote.hidden = false;
          if (sceneIosNote) sceneIosNote.hidden = false;
        }
      } catch (e) {}
    }, 350);
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

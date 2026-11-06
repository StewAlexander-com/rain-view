/* ═══ Rain View v5 — app.js ═══ */
(function () {
  'use strict';

  /** iOS WebKit ignores programmatic media.volume; sliders are hidden — fixed mix in enterScene. */
  const IOS_RAIN_VOL = 0.7;
  const IOS_PIANO_VS_RAIN = 0;

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
  const vid2      = document.getElementById('vid2');
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
  let crossfadeTimer = null;
  let activeVideo = vid;
  let loopCleanup = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const videoStatus = document.getElementById('video-status');
  const videoStatusText = document.getElementById('video-status-text');
  const videoRetry = document.getElementById('video-retry');

  function safePlayVideo(maxAttempts) {
    maxAttempts = maxAttempts != null ? maxAttempts : 4;
    const target = activeVideo;
    if (!target || reducedMotion.matches || !current || document.hidden) return Promise.resolve(false);
    const source = target.src;
    let attempt = 0;
    const delay = isIOSAudioUi() ? 140 : 90;
    function step() {
      if (!current || target.src !== source || document.hidden) return Promise.resolve(false);
      attempt++;
      try {
        const p = target.play();
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
    const policy = document.permissionsPolicy || document.featurePolicy;
    if (policy && policy.allowsFeature && !policy.allowsFeature('fullscreen')) return false;
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
      [vid, vid2].forEach(video => {
        video.addEventListener('playing', () => { videoStatus.hidden = true; });
        video.addEventListener('error', () => {
          if (!current || video !== activeVideo) return;
          videoStatusText.textContent = 'Video unavailable. Rain and clock are still available.';
          videoRetry.hidden = false;
          videoStatus.hidden = false;
        });
      });
      videoRetry.addEventListener('click', () => {
        if (!current) return;
        videoStatusText.textContent = 'Loading scene…';
        videoRetry.hidden = true;
        activeVideo.load();
        retryIfActive();
      });
      document.addEventListener('visibilitychange', function () {
        if (!current) return;
        if (document.hidden) { vid.pause(); vid2.pause(); return; }
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
      const image = c.querySelector('img');
      function imageFallback() { c.classList.add('image-unavailable'); }
      image.addEventListener('error', imageFallback);
      image.addEventListener('load', () => c.classList.remove('image-unavailable'));
      if (image.complete && !image.naturalWidth) imageFallback();
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
      bindVolumeRange(rainVol, v => { audio.setRainVolume(v); syncPlayPauseUi(); });
      bindVolumeRange(pianoVol, v => { audio.setPianoVolume(v); syncPlayPauseUi(); });
    }

    // Rain variant pills
    rainPills.addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill || !rainPills.contains(pill)) return;
      const variant = pill.getAttribute('data-variant');
      if (!variant) return;
      setActivePill(rainPills, variant);
      audio.setRainVariant(variant);
    });

    // Piano variant pills
    pianoPills.addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill || !pianoPills.contains(pill)) return;
      const variant = pill.getAttribute('data-variant');
      if (!variant) return;
      setActivePill(pianoPills, variant);
      // Choosing a piano is an explicit request to hear it, even at the
      // rain-only startup default.
      if (+pianoVol.value === 0) {
        pianoVol.value = '0.23';
        audio.setPianoVolume(.23);
      }
      audio.setPianoVariant(variant);
      syncPlayPauseUi();
    });

    rainPlayPause.addEventListener('click', e => {
      e.stopPropagation();
      if (+rainVol.value === 0) {
        rainVol.value = '0.7';
        audio.setRainVolume(.7);
        audio.rainLayer.setPaused(false);
        syncPlayPauseUi();
        return;
      }
      audio.toggleRainPause();
      syncPlayPauseUi();
    });
    pianoPlayPause.addEventListener('click', e => {
      e.stopPropagation();
      if (+pianoVol.value === 0) {
        pianoVol.value = '0.23';
        audio.setPianoVolume(.23);
        audio.pianoLayer.setPaused(false);
        syncPlayPauseUi();
        return;
      }
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
    if (current) return; // Ignore a second activation during the entrance fade.
    const s = SCENES[id];
    if (!s) return;
    current = s;
    activeVideo = vid;
    // Retain economical phone assets, now encoded from the original 720p
    // footage rather than the old 406p derivatives.
    const videoSrc = s.video + '?v=60';

    // ═══ STEP 1: Activate iOS audio session in the gesture handler ═══
    // mobile.js plays a silent MP3 + creates/resumes AudioContext.
    // This must happen synchronously in the click handler.
    try {
      if (typeof RainViewMobile !== 'undefined' && RainViewMobile.activateAudioSession) {
        RainViewMobile.activateAudioSession();
      }
      if (audio) {
        audio.start(); // creates AudioContext if not already
        audio.resumeAudioContextIfNeeded();
      }
    } catch (e0) {}

    // ═══ STEP 2: Start video (muted — always works) ═══
    try {
      vid.poster = s.thumb || '';
      vid.preload = 'auto';
      vid.playsInline = true;
      vid.muted = true;
      if (!reducedMotion.matches && vid.getAttribute('src') !== videoSrc) {
        vid.src = videoSrc;
        vid.load();
      }
    } catch (e) {}
    // Synchronous play attempt in the gesture — best chance of working
    safePlayVideo(6).then(() => {});
    startCrossfadeLoop(videoSrc);
    titleEl.textContent = s.title;

    // ═══ STEP 3: Set UI state ═══
    setActivePill(rainPills, s.defaultRain);
    setActivePill(pianoPills, s.defaultPiano);

    const rainLevel = isIOSAudioUi() ? IOS_RAIN_VOL : 0.7;
    const pianoLevel = isIOSAudioUi() ? IOS_RAIN_VOL * IOS_PIANO_VS_RAIN : 0;
    rainVol.value = String(rainLevel);
    pianoVol.value = String(pianoLevel);

    splash.classList.add('hidden');
    splash.inert = true;
    sceneEl.classList.remove('hidden');
    sceneEl.inert = false;
    videoRetry.hidden = true;
    videoStatusText.textContent = 'Loading scene…';
    videoStatus.hidden = reducedMotion.matches || vid.readyState >= 3;
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
    clearTimeout(idleTimer);
    idleTimer = setTimeout(hideCtrl, 5500);
    backBtn.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (current === s) backBtn.focus({ preventScroll: true });
    });

    // ═══ STEP 5: Retry cascade ═══
    // iOS audio session can take time to fully initialize.
    // Retry at increasing intervals to catch various timing windows.
    // Also retry video if it stalled during initial buffering.
    const nudgeDelays = [50, 150, 350, 700, 1200, 2000, 3500];
    nudgeDelays.forEach(delay => {
      setTimeout(function () {
        if (!current) return;
        try {
          // Resume AudioContext if iOS suspended it
          audio.resumeAudioContextIfNeeded();
          // Recover any layers that should be playing but aren't
          if (typeof audio.nudgePlayback === 'function') {
            audio.nudgePlayback();
          }
          // Also call mobile nudge which does additional iOS checks
          if (typeof RainViewMobile !== 'undefined' && RainViewMobile.nudge) {
            RainViewMobile.nudge();
          }
        } catch (e) {}
        // Retry video if it stalled
        if (vid && vid.paused && current) {
          safePlayVideo(2).then(() => {});
        }
      }, delay);
    });

    scheduleSilentAudioNote();

    // Keep screen awake while scene is active
    if (typeof RainViewWakeLock !== 'undefined') {
      RainViewWakeLock.acquire();
    }
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
        if (!reducedMotion.matches && vid.getAttribute('src') !== s.video + '?v=60') {
          vid.src = s.video + '?v=60';
          vid.load();
        }
      }
    } catch (e) {}
  }

  function syncPlayPauseUi() {
    const rPaused = audio.isRainPaused() || +rainVol.value === 0;
    const pPaused = audio.isPianoPaused() || +pianoVol.value === 0;
    rainPlayPause.classList.toggle('is-paused', rPaused);
    pianoPlayPause.classList.toggle('is-paused', pPaused);
    rainPlayPause.setAttribute('aria-label', rPaused ? 'Play rain' : 'Pause rain');
    rainPlayPause.setAttribute('title', rPaused ? 'Play' : 'Pause');
    pianoPlayPause.setAttribute('aria-label', pPaused ? 'Play piano' : 'Pause piano');
    pianoPlayPause.setAttribute('title', pPaused ? 'Play' : 'Pause');
  }

  function exitScene() {
    document.dispatchEvent(new Event('rainview:sceneexit'));
    clearTimeout(idleTimer);
    stopDiagLoop();
    diagVisible = false;
    document.getElementById('audio-diag').hidden = true;
    exitFullscreenIfActive().then(() => syncFullscreenUi());
    stopCrossfadeLoop();
    vid.pause();
    vid.removeAttribute('src');
    vid.load();

    // Release screen wake lock
    if (typeof RainViewWakeLock !== 'undefined') {
      RainViewWakeLock.release();
    }
    audio.stopAll();
    sceneEl.classList.add('hidden');
    sceneEl.inert = true;
    splash.classList.remove('hidden');
    splash.inert = false;
    const returnCard = document.querySelector('[data-scene="' + (Object.keys(SCENES).find(id => SCENES[id] === current) || 'tokyo') + '"]');
    current = null;
    requestAnimationFrame(() => {
      if (!current) returnCard.focus({ preventScroll: true });
    });
    lastPreparedSceneId = null;
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
      const selected = p.getAttribute('data-variant') === value;
      p.classList.toggle('active', selected);
      p.setAttribute('aria-pressed', String(selected));
    });
  }

  // Auto-hide controls
  // When clock overlay is active, suppress control auto-show so
  // touch events go to pinch-to-zoom instead of popping up controls.
  function isClockActive() {
    var overlay = document.getElementById('clock-overlay');
    return overlay && !overlay.classList.contains('hidden');
  }

  function setupAutoHide() {
    function reset(e) {
      if (!current) return;
      if (isClockActive()) {
        hideCtrl();
        clearTimeout(idleTimer);
        return;
      }
      // Don't show controls when tapping the clock button
      var clockBtn = document.getElementById('clock-toggle');
      if (e && clockBtn && (e.target === clockBtn || clockBtn.contains(e.target))) {
        return;
      }
      showCtrl();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(hideCtrl, 5500);
    }
    document.addEventListener('mousemove', reset);
    document.addEventListener('touchstart', reset, { passive: true });
    document.addEventListener('click', reset);
    document.addEventListener('pointerdown', reset, { passive: true });

    ctrl.addEventListener('mouseenter', () => clearTimeout(idleTimer));
    ctrl.addEventListener('mouseleave', () => { if (current) idleTimer = setTimeout(hideCtrl, 5500); });
    ctrl.addEventListener('touchstart', () => clearTimeout(idleTimer), { passive: true });
    ctrl.addEventListener('touchend', () => { if (current) idleTimer = setTimeout(hideCtrl, 5500); }, { passive: true });
    document.addEventListener('keydown', e => {
      if (e.key === 'Tab' && current && !isClockActive()) {
        showCtrl();
        clearTimeout(idleTimer);
      }
    });
    ctrl.addEventListener('focusin', () => { showCtrl(); clearTimeout(idleTimer); });
    ctrl.addEventListener('focusout', () => {
      if (current) idleTimer = setTimeout(hideCtrl, 5500);
    });
    reducedMotion.addEventListener('change', () => {
      if (!current) return;
      if (reducedMotion.matches) {
        stopCrossfadeLoop();
        vid.pause();
        activeVideo = vid;
      } else {
        if (!vid.getAttribute('src')) vid.src = current.video + '?v=60';
        startCrossfadeLoop(current.video + '?v=60');
        safePlayVideo();
      }
    });
  }

  function showCtrl() {
    if (isClockActive()) return;
    ctrl.classList.remove('hidden');
    ctrl.inert = false;
  }
  function hideCtrl() {
    if (window.matchMedia('(hover: hover)').matches && ctrl.matches(':hover')) return;
    if (ctrl.contains(document.activeElement) && document.activeElement.matches(':focus-visible')) return;
    ctrl.classList.add('hidden');
    ctrl.inert = true;
  }

  // ═══ Seamless video crossfade loop ═══
  // Vid A loops natively (never stops/seeks).
  // Vid B is a brief overlay that fades in around the loop seam
  // to mask the jump, then fades back out. Vid A is never interrupted.
  function startCrossfadeLoop(videoSrc) {
    stopCrossfadeLoop();
    activeVideo = vid;
    if (!vid || !vid2 || reducedMotion.matches) return;
    vid2.src = videoSrc;
    vid2.muted = true;
    vid2.playsInline = true;
    vid2.load();
    vid2.classList.remove('visible');
    var cancelled = false, transitioning = false;
    function monitor() {
      if (cancelled || transitioning || !current || document.hidden) return;
      var outgoing = activeVideo;
      if (!isFinite(outgoing.duration) || outgoing.duration - outgoing.currentTime > .95) return;
      var incoming = outgoing === vid ? vid2 : vid;
      if (incoming.readyState < 3) return; // Native loop remains the fallback.
      transitioning = true;
      incoming.currentTime = 0;
      incoming.play().then(function () {
        if (cancelled) { incoming.pause(); return; }
        // The bottom video remains opaque: only the top layer dissolves,
        // avoiding brightness dips from two transparent surfaces.
        vid2.classList.toggle('visible', incoming === vid2);
        activeVideo = incoming;
        crossfadeTimer = setTimeout(function () {
          outgoing.pause();
          transitioning = false;
        }, 650);
      }).catch(function () { transitioning = false; });
    }
    vid.addEventListener('timeupdate', monitor);
    vid2.addEventListener('timeupdate', monitor);
    loopCleanup = function () {
      cancelled = true;
      vid.removeEventListener('timeupdate', monitor);
      vid2.removeEventListener('timeupdate', monitor);
    };
  }

  function stopCrossfadeLoop() {
    if (loopCleanup) loopCleanup();
    loopCleanup = null;
    clearTimeout(crossfadeTimer);
    crossfadeTimer = null;
    if (vid2) {
      vid2.pause();
      vid2.removeAttribute('src');
      vid2.load();
      vid2.classList.remove('visible');
    }
  }

  // ═══ Audio Diagnostic Panel ═══
  // Triple-tap the scene title to show/hide real-time audio state.
  // This is our "House diagnostic" — shows exactly what's happening.
  let diagVisible = false;
  let diagInterval = null;
  let titleTapCount = 0;
  let titleTapTimer = null;

  function setupDiagnostic() {
    const diagEl = document.getElementById('audio-diag');
    if (!diagEl || !titleEl) return;

    titleEl.style.pointerEvents = 'auto';
    titleEl.style.cursor = 'pointer';
    titleEl.addEventListener('click', function (e) {
      e.stopPropagation();
      titleTapCount++;
      clearTimeout(titleTapTimer);
      titleTapTimer = setTimeout(() => { titleTapCount = 0; }, 600);
      if (titleTapCount >= 3) {
        titleTapCount = 0;
        diagVisible = !diagVisible;
        diagEl.hidden = !diagVisible;
        if (diagVisible) startDiagLoop(diagEl);
        else stopDiagLoop();
      }
    });
  }

  function startDiagLoop(diagEl) {
    stopDiagLoop();
    diagInterval = setInterval(() => updateDiag(diagEl), 400);
    updateDiag(diagEl);
  }

  function stopDiagLoop() {
    if (diagInterval) { clearInterval(diagInterval); diagInterval = null; }
  }

  function updateDiag(el) {
    if (!el || !audio) return;
    const lines = [];
    const ts = new Date().toLocaleTimeString();
    lines.push('=== RAIN VIEW AUDIO DIAG v43 — ' + ts + ' ===');
    lines.push('');

    // AudioContext
    const ctx = audio._ctx;
    lines.push('AudioContext: ' + (ctx ? ctx.state : 'NOT CREATED'));
    if (ctx) lines.push('  sampleRate: ' + ctx.sampleRate + ' | currentTime: ' + ctx.currentTime.toFixed(2));

    // Mobile state
    const mob = typeof RainViewMobile !== 'undefined' ? RainViewMobile : null;
    if (mob) {
      lines.push('Mobile unlock: ' + (mob.isUnlocked ? mob.isUnlocked() : '?'));
      lines.push('Audio session: ' + (mob.isAudioSessionActive ? mob.isAudioSessionActive() : '?'));
      lines.push('iOS detected: ' + (mob.isIOSLike ? mob.isIOSLike() : '?'));
    }

    // Rain layer
    lines.push('');
    lines.push('--- RAIN LAYER ---');
    const rl = audio.rainLayer;
    if (rl) {
      lines.push('variant: ' + (rl.currentName || 'none'));
      lines.push('volume: ' + rl._volume.toFixed(2) + ' | paused: ' + rl._paused);
      const re = rl.currentEl;
      if (re) {
        lines.push('element: paused=' + re.paused + ' ended=' + re.ended);
        lines.push('  src: ' + (re.src ? re.src.substring(0, 50) + '...' : 'EMPTY'));
        lines.push('  readyState=' + re.readyState + ' networkState=' + re.networkState);
        lines.push('  currentTime=' + re.currentTime.toFixed(2) + ' duration=' + (re.duration || 0).toFixed(2));
        lines.push('  volume=' + re.volume.toFixed(2) + ' muted=' + re.muted);
        lines.push('  MES: ' + (re._rvMES ? 'connected' : 'none') + ' | MES failed: ' + (re._rvMESFailed || false));
        if (re._rvElementGain) lines.push('  elementGain: ' + re._rvElementGain.gain.value.toFixed(3));
        if (re.error) lines.push('  ERROR: code=' + re.error.code + ' msg=' + re.error.message);
      } else {
        lines.push('element: NONE');
      }
      if (rl._gainNode) lines.push('gainNode: ' + rl._gainNode.gain.value.toFixed(3));
    }

    // Piano layer
    lines.push('');
    lines.push('--- PIANO LAYER ---');
    const pl = audio.pianoLayer;
    if (pl) {
      lines.push('variant: ' + (pl.currentName || 'none'));
      lines.push('volume: ' + pl._volume.toFixed(2) + ' | paused: ' + pl._paused);
      const pe = pl.currentEl;
      if (pe) {
        lines.push('element: paused=' + pe.paused + ' ended=' + pe.ended);
        lines.push('  readyState=' + pe.readyState + ' networkState=' + pe.networkState);
        lines.push('  currentTime=' + pe.currentTime.toFixed(2));
        lines.push('  MES: ' + (pe._rvMES ? 'connected' : 'none') + ' | MES failed: ' + (pe._rvMESFailed || false));
      }
    }

    // Video
    lines.push('');
    lines.push('--- VIDEO ---');
    if (vid) {
      lines.push('paused=' + vid.paused + ' muted=' + vid.muted);
      lines.push('readyState=' + vid.readyState + ' currentTime=' + vid.currentTime.toFixed(2));
    }

    el.textContent = lines.join('\n');
  }

  function postInit() {
    setupDiagnostic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); postInit(); });
  } else {
    init(); postInit();
  }
})();

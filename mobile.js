/* ═══════════════════════════════════════════════════════════════════
   Rain View — iOS / mobile audio bootstrap
   
   DIAGNOSIS: iOS Safari & PWA have THREE gates that block audio:
   
   Gate 1 — AudioContext must be created inside a user gesture
   Gate 2 — AudioContext.resume() must be called inside a user gesture
   Gate 3 — HTMLAudioElement.play() must be called inside a user gesture
            (only the FIRST call per element needs this; after that it's
            "unlocked" and can be called programmatically)
   
   The audio-system.js uses fetch()→blob URLs + dual <audio> elements
   per variant + MediaElementSource routing. By the time blobs load,
   the gesture window is gone. So we need a different strategy:
   
   STRATEGY:
   - On page load, create a tiny silent audio element (data URI)
   - On first touchend/click, play that silent element (unlocks audio session)
   - In the same gesture, create + resume AudioContext
   - The audio-system's blob-loaded elements can then play() without
     needing their own gesture, because the iOS audio session is now active
   - Keep nudging on every subsequent touch (iOS PWA can re-suspend)
   ═══════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  // Tiny silent MP3 (173 bytes) — valid MP3 frame, completely silent
  var SILENT_MP3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwMHAAAAAAD/+1DEAAAGAANIAAAARAW0AAADSA';

  var _silentEl = null;
  var _unlocked = false;
  var _engine = null;
  var _audioSessionActive = false;

  function isIOSLike() {
    var ua = navigator.userAgent || '';
    return (
      /iPad|iPhone|iPod/.test(ua) ||
      (typeof navigator.platform === 'string' &&
        navigator.platform === 'MacIntel' &&
        navigator.maxTouchPoints > 1)
    );
  }

  function isMobileAudioDevice() {
    var ua = navigator.userAgent || '';
    if (isIOSLike()) return true;
    if (/Android/i.test(ua)) return true;
    if (global.matchMedia && global.matchMedia('(pointer: coarse)').matches) return true;
    if (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) return true;
    return false;
  }

  /**
   * Create silent audio element on page load (not in gesture — just create it).
   */
  function createSilentElement() {
    if (_silentEl) return _silentEl;
    _silentEl = document.createElement('audio');
    _silentEl.setAttribute('playsinline', '');
    _silentEl.playsInline = true;
    _silentEl.src = SILENT_MP3;
    _silentEl.preload = 'auto';
    _silentEl.loop = false;
    _silentEl.volume = 0.01; // near-silent but not zero (iOS ignores volume=0)
    // Add to DOM (some iOS versions need it in DOM)
    _silentEl.style.cssText = 'position:fixed;width:0;height:0;opacity:0;pointer-events:none';
    document.body.appendChild(_silentEl);
    return _silentEl;
  }

  /**
   * Called synchronously inside touchend/click.
   * Activates the iOS audio session by playing the silent element.
   */
  function activateAudioSession() {
    if (_audioSessionActive && _unlocked) return;

    // Step 1: Play the silent element to activate iOS audio session
    var el = _silentEl || createSilentElement();
    try {
      el.currentTime = 0;
      el.volume = 0.01;
      var p = el.play();
      if (p && typeof p.then === 'function') {
        p.then(function () {
          _audioSessionActive = true;
        }).catch(function () {});
      }
    } catch (e) {}

    // Step 2: Create + resume AudioContext
    if (_engine) {
      try {
        if (typeof _engine.ensureWebAudio === 'function') {
          _engine.ensureWebAudio();
        }
        if (_engine._ctx) {
          if (_engine._ctx.state === 'suspended') {
            var rp = _engine._ctx.resume();
            if (rp && typeof rp.then === 'function') rp.catch(function () {});
          }
        }
      } catch (e) {}
    }

    _unlocked = true;
  }

  /**
   * Nudge: resume AudioContext + retry any paused layers.
   * Safe to call frequently.
   */
  function nudge() {
    if (!_engine) return;
    try {
      if (_engine._ctx && _engine._ctx.state === 'suspended') {
        var p = _engine._ctx.resume();
        if (p && typeof p.then === 'function') p.catch(function () {});
      }
      if (typeof _engine.nudgePlayback === 'function') {
        _engine.nudgePlayback();
      }
    } catch (e) {}
  }

  /**
   * Install gesture listeners.
   */
  function installGestureHandlers(engine) {
    _engine = engine;

    // Create silent element immediately
    createSilentElement();

    function onGesture() {
      activateAudioSession();
      nudge();
    }

    // touchend and click — the ONLY events iOS counts as user activation
    // Use capture phase to fire before app.js click handlers
    document.addEventListener('touchend', onGesture, { capture: true, passive: true });
    document.addEventListener('click', onGesture, { capture: true, passive: true });

    // iOS PWA: audio session can die when app is backgrounded/foregrounded
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      // Don't call activateAudioSession here — no gesture.
      // Just nudge (resume context + retry paused layers).
      nudge();
    });

    global.addEventListener('pageshow', function (ev) {
      nudge();
    });

    global.addEventListener('focus', function () {
      if (!isMobileAudioDevice()) return;
      nudge();
    });
  }

  function configureRainViewMobileAudio(engine) {
    _engine = engine;
    if (!isMobileAudioDevice()) return;
    installGestureHandlers(engine);
  }

  global.RainViewMobile = {
    isIOSLike: isIOSLike,
    isMobileAudioDevice: isMobileAudioDevice,
    configureRainViewMobileAudio: configureRainViewMobileAudio,
    activateAudioSession: activateAudioSession,
    nudge: nudge,
    isUnlocked: function () { return _unlocked; },
    isAudioSessionActive: function () { return _audioSessionActive; }
  };
})(typeof window !== 'undefined' ? window : this);

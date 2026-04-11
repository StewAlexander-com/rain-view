/* Rain View — mobile / PWA audio bootstrap
   iOS Safari & PWA require play() to be called synchronously inside a
   user-gesture handler (touchend / click). Once an <audio> element has
   been "unlocked" this way it can be programmatically controlled later.

   Strategy:
   1. On the FIRST touch/click anywhere, call play() then immediately
      pause() on EVERY <audio> element in the page. This "unlocks" them.
   2. Resume the AudioContext in the same gesture.
   3. On subsequent scene enters, play() will work because the elements
      are already unlocked.
*/

(function (global) {
  'use strict';

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

  var _unlocked = false;
  var _engine = null;

  /**
   * Synchronous unlock: call play()+pause() on every <audio> in the DOM.
   * This must run inside a direct user gesture (touchend, click).
   * After this, iOS allows programmatic play() on these elements.
   */
  function unlockAllAudio() {
    if (_unlocked) return;

    // Unlock AudioContext
    if (_engine) {
      try {
        if (typeof _engine.ensureWebAudio === 'function') _engine.ensureWebAudio();
        if (_engine._ctx && _engine._ctx.state === 'suspended') {
          _engine._ctx.resume().catch(function () {});
        }
      } catch (e) {}
    }

    // Unlock every <audio> element by doing play() + immediate pause()
    var allAudio = document.querySelectorAll('audio');
    for (var i = 0; i < allAudio.length; i++) {
      var el = allAudio[i];
      try {
        // Set to a silent state first
        el.volume = 0;
        el.muted = true;
        var p = el.play();
        if (p && typeof p.then === 'function') {
          // Capture in closure to pause after play resolves
          (function (audioEl) {
            p.then(function () {
              audioEl.pause();
              audioEl.currentTime = 0;
              audioEl.muted = false;
            }).catch(function () {
              audioEl.muted = false;
            });
          })(el);
        } else {
          el.pause();
          el.currentTime = 0;
          el.muted = false;
        }
      } catch (e) {
        try { el.muted = false; } catch (e2) {}
      }
    }

    _unlocked = true;
  }

  /**
   * Install gesture listeners that unlock audio on first interaction.
   * Uses capture phase to fire before app.js handlers.
   */
  function installGestureUnlock(engine) {
    _engine = engine;

    function onGesture() {
      unlockAllAudio();

      // Also nudge playback on every gesture (iOS PWA can re-suspend)
      if (_engine) {
        try {
          if (_engine._ctx && _engine._ctx.state === 'suspended') {
            _engine._ctx.resume().catch(function () {});
          }
          if (typeof _engine.nudgePlayback === 'function') {
            _engine.nudgePlayback();
          }
        } catch (e) {}
      }

      // On non-iOS, remove listeners after first successful unlock
      if (!isIOSLike() && _unlocked) {
        document.removeEventListener('touchend', onGesture, true);
        document.removeEventListener('click', onGesture, true);
      }
    }

    // touchend and click are the ONLY events iOS counts as user activation
    document.addEventListener('touchend', onGesture, { capture: true, passive: true });
    document.addEventListener('click', onGesture, { capture: true, passive: true });

    // iOS PWA: coming back from app switch can suspend audio again
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      if (_engine) {
        try {
          if (_engine._ctx && _engine._ctx.state === 'suspended') {
            _engine._ctx.resume().catch(function () {});
          }
          if (typeof _engine.nudgePlayback === 'function') {
            _engine.nudgePlayback();
          }
        } catch (e) {}
      }
    });

    global.addEventListener('pageshow', function () {
      if (_engine && typeof _engine.nudgePlayback === 'function') {
        _engine.nudgePlayback();
      }
    });
  }

  function configureRainViewMobileAudio(engine) {
    _engine = engine;
    if (!isMobileAudioDevice()) return;
    installGestureUnlock(engine);
  }

  global.RainViewMobile = {
    isIOSLike: isIOSLike,
    isMobileAudioDevice: isMobileAudioDevice,
    configureRainViewMobileAudio: configureRainViewMobileAudio,
    unlockAllAudio: unlockAllAudio,
    isUnlocked: function () { return _unlocked; }
  };
})(typeof window !== 'undefined' ? window : this);

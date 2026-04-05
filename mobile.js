/* Rain View — mobile / PWA audio (pairs with audio-system.js)
   iOS often leaves AudioContext suspended until resume() runs inside a gesture;
   we re-try on touch until the context is running. */

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
    if (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) {
      return true;
    }
    return false;
  }

  /**
   * Re-bind resume() on every touch until AudioContext is running (iOS PWA / Safari).
   */
  function installTouchAudioUnlock(engine) {
    if (!engine || typeof engine.resumeAudioContextIfNeeded !== 'function') return;

    function unlock() {
      engine.resumeAudioContextIfNeeded();
      try {
        if (engine._ctx && engine._ctx.state === 'running') {
          document.removeEventListener('touchstart', unlock, true);
          document.removeEventListener('touchend', unlock, true);
          document.removeEventListener('click', unlock, true);
        }
      } catch (e) {}
    }

    document.addEventListener('touchstart', unlock, { capture: true, passive: true });
    document.addEventListener('touchend', unlock, { capture: true, passive: true });
    document.addEventListener('click', unlock, { capture: true, passive: true });
  }

  /**
   * Call once after `audio.preload()` (before or after `start()` is fine).
   */
  function configureRainViewMobileAudio(engine) {
    if (!isMobileAudioDevice()) return;
    installTouchAudioUnlock(engine);
  }

  global.RainViewMobile = {
    isIOSLike: isIOSLike,
    isMobileAudioDevice: isMobileAudioDevice,
    configureRainViewMobileAudio: configureRainViewMobileAudio
  };
})(typeof window !== 'undefined' ? window : this);

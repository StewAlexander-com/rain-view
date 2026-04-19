/* ═══ Rain View — wakelock.js ═══
   Prevents the phone from auto-locking while a scene is active.

   Strategy:
   1. Wake Lock API (Chrome 84+, Safari 16.4+) — the clean approach.
   2. Fallback for older iOS: play a tiny silent video on loop.
      iOS treats active video playback as a reason to stay awake.

   The lock is acquired when entering a scene and released when
   leaving. If the page becomes hidden (app switch), the lock is
   released. When it becomes visible again, it's reacquired.
*/
(function () {
  'use strict';

  var _wakeLock = null;
  var _active = false;
  var _fallbackVideo = null;

  // ── Wake Lock API ──
  function hasWakeLockAPI() {
    return 'wakeLock' in navigator;
  }

  function acquireWakeLock() {
    if (!hasWakeLockAPI()) {
      startFallback();
      return;
    }
    navigator.wakeLock.request('screen')
      .then(function (lock) {
        _wakeLock = lock;
        _wakeLock.addEventListener('release', function () {
          _wakeLock = null;
          // Reacquire if still active and page is visible
          if (_active && document.visibilityState === 'visible') {
            acquireWakeLock();
          }
        });
      })
      .catch(function () {
        // Wake Lock failed (e.g. low battery mode) — use fallback
        startFallback();
      });
  }

  function releaseWakeLock() {
    if (_wakeLock) {
      try { _wakeLock.release(); } catch (e) {}
      _wakeLock = null;
    }
    stopFallback();
  }

  // ── Fallback: silent video loop (keeps iOS awake) ──
  // A 1-second silent MP4 played on loop at near-zero size.
  // iOS treats this as active media, preventing auto-lock.
  function createFallbackVideo() {
    if (_fallbackVideo) return _fallbackVideo;
    var v = document.createElement('video');
    v.setAttribute('playsinline', '');
    v.playsInline = true;
    v.muted = true;
    v.loop = true;
    v.volume = 0;
    v.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1';
    // Tiny transparent MP4 — 1 frame, ~300 bytes
    v.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAABhtZGF0AAAA0GYA/wBkAAC4AWRkAALABf/hABhnZGMA5ICAgAIAAAAHQZmkAAAAAADABgAAAK1tb292AAAAbG12aGQAAAAA0AAAAAAAQAAAAEAAAQAAAQAAAAEAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAEAAAAAADAAAAZAAAAGR0cmFrAAAAXHRraGQAAAAP0AAAAAAAAAAAAAEAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAABAAAAAQAAAAAAZ2RtZGlhAAAAIG1kaGQAAAAA0AAAAAAAQAAAAEAAVEEAAQAAAAAAAAAAAAAAAAA=';
    document.body.appendChild(v);
    _fallbackVideo = v;
    return v;
  }

  function startFallback() {
    var v = createFallbackVideo();
    try {
      v.play().catch(function () {});
    } catch (e) {}
  }

  function stopFallback() {
    if (_fallbackVideo) {
      try {
        _fallbackVideo.pause();
      } catch (e) {}
    }
  }

  // ── Visibility change: reacquire on return ──
  document.addEventListener('visibilitychange', function () {
    if (!_active) return;
    if (document.visibilityState === 'visible') {
      acquireWakeLock();
    }
    // Release happens automatically when page is hidden (browser does this)
  });

  // ── Public API ──
  window.RainViewWakeLock = {
    acquire: function () {
      _active = true;
      acquireWakeLock();
    },
    release: function () {
      _active = false;
      releaseWakeLock();
    },
    isActive: function () { return _active; }
  };
})();

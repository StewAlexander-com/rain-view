/* Single-flight, best-effort screen wake lock. Never promise an OS override. */
(function () {
  'use strict';
  var active = false, lock = null, pending = false, generation = 0;
  function status(message) {
    var el = document.getElementById('wake-status');
    if (el) el.textContent = message;
  }
  function acquire() {
    if (!active || document.hidden || lock || pending) return;
    if (!navigator.wakeLock) {
      status('Keep this page open · Check your device’s auto-lock setting');
      return;
    }
    pending = true;
    var requestGeneration = generation;
    navigator.wakeLock.request('screen').then(function (result) {
      pending = false;
      if (!active || document.hidden || requestGeneration !== generation) {
        result.release().catch(function () {});
        if (active && !document.hidden) acquire();
        return;
      }
      lock = result;
      status('Screen stays awake while this page is visible');
      result.addEventListener('release', function () {
        if (lock === result) lock = null;
        status('Screen may sleep · Check your device’s auto-lock setting');
        // OS may deny for battery/policy reasons. Retry on return or gesture,
        // not recursively on release.
      });
    }).catch(function () {
      pending = false;
      status('Screen may sleep · Check your device’s auto-lock setting');
    });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) acquire(); });
  document.addEventListener('click', function () { if (active && !lock) acquire(); }, { passive: true });
  window.RainViewWakeLock = {
    acquire: function () { active = true; acquire(); },
    release: function () {
      active = false;
      generation++;
      var previous = lock;
      lock = null;
      if (previous) previous.release().catch(function () {});
    },
    isActive: function () { return !!lock && !lock.released; }
  };
})();

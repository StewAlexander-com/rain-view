/* ═══ Rain View — update-check.js ═══
   Checks version.json on each launch. If a newer version is available,
   shows a subtle toast prompting the user to reload. Non-intrusive.
   
   Runs once on page load after a short delay (don't block startup).
   Only checks when online. Caches the current version in a JS variable
   (not localStorage — sandbox blocks it on some platforms).
*/
(function () {
  'use strict';

  // Current version baked into the JS at deploy time.
  // Bump this when deploying a new version.
  var CURRENT_VERSION = '1.1.1';

  var CHECK_DELAY = 5000;  // wait 5s after load before checking
  var CHECK_URL = 'version.json?_=' + Date.now(); // cache-bust the check itself

  function init() {
    if (!navigator.onLine) return;
    setTimeout(checkForUpdate, CHECK_DELAY);
  }

  function checkForUpdate() {
    if (typeof fetch !== 'function') return;

    fetch(CHECK_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.version) return;
        if (data.version !== CURRENT_VERSION) {
          showUpdateToast(data.version);
        }
      })
      .catch(function () {
        // Silently fail — don't bother the user if offline or fetch fails
      });
  }

  function showUpdateToast(newVersion) {
    // Don't show if one is already visible
    if (document.getElementById('rv-update-toast')) return;

    var toast = document.createElement('div');
    toast.id = 'rv-update-toast';
    toast.setAttribute('role', 'alert');
    toast.style.cssText = [
      'position:fixed',
      'bottom:calc(1.5rem + env(safe-area-inset-bottom,0px))',
      'left:50%',
      'transform:translateX(-50%) translateY(20px)',
      'z-index:9999',
      'display:flex',
      'align-items:center',
      'gap:0.75rem',
      'padding:0.65rem 1.25rem',
      'border-radius:999px',
      'background:rgba(235,225,180,0.12)',
      'backdrop-filter:blur(16px)',
      '-webkit-backdrop-filter:blur(16px)',
      'border:1px solid rgba(235,225,180,0.2)',
      'color:rgba(235,225,180,0.85)',
      'font-family:Inter,system-ui,sans-serif',
      'font-size:0.78rem',
      'font-weight:400',
      'letter-spacing:0.02em',
      'cursor:pointer',
      'opacity:0',
      'transition:opacity 0.6s ease, transform 0.6s ease',
      'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
      'white-space:nowrap'
    ].join(';');

    toast.innerHTML = '<span>Update available</span><span style="opacity:.5;font-size:.65rem">TAP TO REFRESH</span>';

    toast.addEventListener('click', function () {
      // Force reload bypassing cache
      toast.style.opacity = '0';
      setTimeout(function () {
        window.location.reload(true);
      }, 300);
    });

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
    });

    // Auto-dismiss after 15 seconds if not tapped
    setTimeout(function () {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(function () {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 600);
      }
    }, 15000);
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

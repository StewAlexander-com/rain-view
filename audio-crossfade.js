/* ═══════════════════════════════════════════
   Looping HTML5 audio with cancelable crossfades
   Each <audio> may only have one active fade; new fades cancel the old.
   ═══════════════════════════════════════════ */

(function (global) {
  'use strict';

  const activeFadeTimers = new WeakMap();

  function cancelFadeFor(audioEl) {
    const id = activeFadeTimers.get(audioEl);
    if (id != null) {
      clearInterval(id);
      activeFadeTimers.delete(audioEl);
    }
  }

  /**
   * @param {HTMLAudioElement} audioEl
   * @param {number} targetVol 0..1
   * @param {number} durationMs
   * @param {function(): void} [onComplete]
   */
  function fadeVolumeTo(audioEl, targetVol, durationMs, onComplete) {
    cancelFadeFor(audioEl);
    targetVol = Math.max(0, Math.min(1, targetVol));

    if (durationMs <= 0 || !Number.isFinite(durationMs)) {
      audioEl.volume = targetVol;
      if (onComplete) onComplete();
      return;
    }

    const startVol = audioEl.volume;
    const diff = targetVol - startVol;
    const steps = 20;
    const stepTime = durationMs / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      audioEl.volume = Math.max(0, Math.min(1, startVol + diff * eased));
      if (step >= steps) {
        cancelFadeFor(audioEl);
        audioEl.volume = targetVol;
        if (onComplete) onComplete();
      }
    }, stepTime);

    activeFadeTimers.set(audioEl, interval);
  }

  /**
   * One logical layer: many named looping tracks, one active at a time.
   */
  class LoopCrossfadeLayer {
    /**
     * @param {Record<string, string>} nameToSrc
     * @param {{ fadeOutMs?: number, fadeInMs?: number }} [options]
     */
    constructor(nameToSrc, options) {
      const o = options || {};
      this.fadeOutMs = o.fadeOutMs != null ? o.fadeOutMs : 600;
      this.fadeInMs = o.fadeInMs != null ? o.fadeInMs : 800;

      /** @type {Record<string, HTMLAudioElement>} */
      this.audios = {};
      for (const [name, src] of Object.entries(nameToSrc)) {
        const a = document.createElement('audio');
        a.src = src;
        a.loop = true;
        a.preload = 'auto';
        a.volume = 0;
        a.setAttribute('playsinline', '');
        a.playsInline = true;
        this.audios[name] = a;
      }

      this.currentName = null;
      this.currentEl = null;
      this._volume = 1;
    }

    /** Append every track node to the document (required for reliable playback on iOS / Safari). */
    appendElementsTo(parentEl) {
      for (const el of Object.values(this.audios)) {
        parentEl.appendChild(el);
      }
    }

    /**
     * @param {string} name
     */
    switchTo(name) {
      if (this.currentName === name) return;

      const incoming = this.audios[name];
      if (!incoming) return;

      const outgoing = this.currentEl;

      if (outgoing && outgoing !== incoming) {
        fadeVolumeTo(outgoing, 0, this.fadeOutMs, () => {
          outgoing.pause();
        });
      }

      this.currentName = name;
      this.currentEl = incoming;

      cancelFadeFor(incoming);
      incoming.currentTime = 0;
      incoming.volume = 0;

      const targetVol = this._volume;
      const fadeInMs = this.fadeInMs;
      const fadeIn = () => {
        fadeVolumeTo(incoming, targetVol, fadeInMs);
      };

      const playPromise = incoming.play();
      if (playPromise !== undefined && typeof playPromise.then === 'function') {
        playPromise.then(fadeIn).catch(() => {
          incoming.volume = targetVol;
        });
      } else {
        fadeIn();
      }
    }

    /**
     * User volume; cancels any active fade on the current track and applies immediately.
     * @param {number} val 0..1
     */
    setVolume(val) {
      this._volume = Math.max(0, Math.min(1, val));
      if (this.currentEl) {
        cancelFadeFor(this.currentEl);
        this.currentEl.volume = this._volume;
      }
    }

    /** Pause all tracks, cancel all fades, clear selection. */
    stopAll() {
      for (const el of Object.values(this.audios)) {
        cancelFadeFor(el);
        el.pause();
        el.volume = 0;
      }
      this.currentName = null;
      this.currentEl = null;
    }
  }

  global.LoopCrossfadeLayer = LoopCrossfadeLayer;
})(typeof window !== 'undefined' ? window : this);

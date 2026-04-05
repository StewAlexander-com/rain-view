/* ═══════════════════════════════════════════
   Rain View — ambient audio (rain + piano)
   One module: small API, explicit invalidation, no overlapping fades.
   ═══════════════════════════════════════════ */

(function (global) {
  'use strict';

  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  /**
   * @param {HTMLAudioElement} el
   * @returns {Promise<boolean>}
   */
  async function safePlay(el) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await el.play();
        return true;
      } catch (_) {
        await new Promise(function (r) {
          setTimeout(r, 70);
        });
      }
    }
    return false;
  }

  /**
   * @param {HTMLAudioElement} el
   * @param {number} targetVol
   * @param {number} durationMs
   * @param {function(): boolean} stillValid
   */
  function fadeInVolume(el, targetVol, durationMs, stillValid) {
    targetVol = clamp01(targetVol);
    if (durationMs <= 0 || !Number.isFinite(durationMs)) {
      el.volume = targetVol;
      return;
    }
    var v0 = el.volume;
    var t0 = performance.now();

    function frame(now) {
      if (!stillValid()) return;
      var p = Math.min(1, (now - t0) / durationMs);
      var k = easeOutQuad(p);
      el.volume = v0 + (targetVol - v0) * k;
      if (p < 1 && stillValid()) {
        requestAnimationFrame(frame);
      } else if (stillValid()) {
        el.volume = targetVol;
      }
    }
    requestAnimationFrame(frame);
  }

  /**
   * One looping layer (rain or piano). Only one track “owns” playback at a time.
   * Outgoing track is stopped immediately; incoming fades in after play() succeeds.
   */
  function AmbientLoopLayer(nameToSrc, options) {
    var o = options || {};
    this.fadeInMs = o.fadeInMs != null ? o.fadeInMs : 650;
    this.audios = {};
    this._generation = 0;
    this.currentName = null;
    this.currentEl = null;
    this._volume = 1;

    for (var name in nameToSrc) {
      if (!Object.prototype.hasOwnProperty.call(nameToSrc, name)) continue;
      var a = document.createElement('audio');
      a.src = nameToSrc[name];
      a.loop = true;
      a.preload = 'auto';
      a.volume = 0;
      a.setAttribute('playsinline', '');
      a.playsInline = true;
      a.addEventListener('error', function () {
        try {
          a.setAttribute('data-rv-error', '1');
        } catch (e) {}
      });
      this.audios[name] = a;
    }
  }

  AmbientLoopLayer.prototype.appendTo = function (parentEl) {
    for (var k in this.audios) {
      if (!Object.prototype.hasOwnProperty.call(this.audios, k)) continue;
      parentEl.appendChild(this.audios[k]);
    }
  };

  AmbientLoopLayer.prototype.switchTo = function (name) {
    if (name === this.currentName) return;

    var incoming = this.audios[name];
    if (!incoming) return;

    this._generation++;
    var gen = this._generation;

    var outgoing = this.currentEl;
    if (outgoing && outgoing !== incoming) {
      outgoing.volume = 0;
      outgoing.pause();
    }

    this.currentName = name;
    this.currentEl = incoming;
    incoming.currentTime = 0;
    incoming.volume = 0;

    var self = this;
    var targetVol = this._volume;

    safePlay(incoming).then(function (ok) {
      if (gen !== self._generation) return;
      if (!ok) {
        incoming.volume = targetVol;
        return;
      }
      fadeInVolume(
        incoming,
        targetVol,
        self.fadeInMs,
        function () {
          return gen === self._generation;
        }
      );
    });
  };

  AmbientLoopLayer.prototype.setVolume = function (val) {
    this._volume = clamp01(val);
    this._generation++;
    if (this.currentEl) {
      this.currentEl.volume = this._volume;
    }
  };

  AmbientLoopLayer.prototype.stopAll = function () {
    this._generation++;
    for (var k in this.audios) {
      if (!Object.prototype.hasOwnProperty.call(this.audios, k)) continue;
      var el = this.audios[k];
      el.pause();
      el.volume = 0;
    }
    this.currentName = null;
    this.currentEl = null;
  };

  /** After tab sleep / mobile background, resume if user expects sound. */
  AmbientLoopLayer.prototype.recoverIfNeeded = function () {
    if (this._volume < 0.001) return;
    var el = this.currentEl;
    if (!el || el.error) return;
    if (!el.paused) return;
    var self = this;
    var gen = this._generation;
    safePlay(el).then(function (ok) {
      if (ok && gen === self._generation && el === self.currentEl) {
        el.volume = self._volume;
      }
    });
  };

  function ensureHost() {
    var host = document.getElementById('rain-view-audio-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'rain-view-audio-host';
      host.setAttribute('aria-hidden', 'true');
      host.style.cssText =
        'position:fixed;width:0;height:0;overflow:hidden;clip:rect(0,0,0,0);border:0;pointer-events:none';
      document.body.appendChild(host);
    }
    return host;
  }

  function AudioEngine() {
    this.rainLayer = null;
    this.pianoLayer = null;
    this._started = false;
  }

  AudioEngine.prototype.preload = function () {
    this.rainLayer = new AmbientLoopLayer(
      {
        gentle: 'assets/rain-gentle.mp3',
        heavy: 'assets/rain-heavy.mp3',
        window: 'assets/rain-window.mp3',
        forest: 'assets/rain-forest.mp3',
        thunder: 'assets/rain-thunder.mp3'
      },
      { fadeInMs: 650 }
    );

    this.pianoLayer = new AmbientLoopLayer(
      {
        contemplative: 'assets/piano-contemplative.mp3',
        jazz: 'assets/piano-jazz.mp3',
        melancholic: 'assets/piano-melancholic.mp3',
        ethereal: 'assets/piano-ethereal.mp3',
        pastoral: 'assets/piano-pastoral.mp3'
      },
      { fadeInMs: 650 }
    );

    var host = ensureHost();
    this.rainLayer.appendTo(host);
    this.pianoLayer.appendTo(host);

    global.__rainViewActiveEngine = this;
    if (!global.__rainViewVisListenerInstalled) {
      global.__rainViewVisListenerInstalled = true;
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        var eng = global.__rainViewActiveEngine;
        if (!eng || !eng.rainLayer) return;
        eng.rainLayer.recoverIfNeeded();
        eng.pianoLayer.recoverIfNeeded();
      });
    }
  };

  AudioEngine.prototype.start = function () {
    if (this._started) return;
    this._started = true;
  };

  AudioEngine.prototype.setRainVariant = function (name) {
    if (this.rainLayer) this.rainLayer.switchTo(name);
  };

  AudioEngine.prototype.setRainVolume = function (val) {
    if (this.rainLayer) this.rainLayer.setVolume(val);
  };

  AudioEngine.prototype.setPianoVariant = function (name) {
    if (this.pianoLayer) this.pianoLayer.switchTo(name);
  };

  AudioEngine.prototype.setPianoVolume = function (val) {
    if (this.pianoLayer) this.pianoLayer.setVolume(val);
  };

  AudioEngine.prototype.stopAll = function () {
    if (this.rainLayer) this.rainLayer.stopAll();
    if (this.pianoLayer) this.pianoLayer.stopAll();
  };

  global.AudioEngine = AudioEngine;
})(typeof window !== 'undefined' ? window : this);

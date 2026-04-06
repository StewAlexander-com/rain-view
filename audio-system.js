/* ═══════════════════════════════════════════
   Rain View — ambient audio (rain + piano)
   Fetch→blob; twin <audio> per track (pre-started + crossfade) to avoid loop
   gaps; Web Audio gain chain for volume (iOS ignores media.volume).
   ═══════════════════════════════════════════ */

(function (global) {
  'use strict';

  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  /**
   * Mobile / touch devices: slower play() startup and heavy rAF throttling when
   * the tab is hidden. Uses RainViewMobile when loaded (after mobile.js); otherwise
   * UA / pointer heuristics so audio-system stays safe if load order changes.
   */
  function rvIsMobileAudioProfile() {
    try {
      if (global.RainViewMobile && typeof global.RainViewMobile.isMobileAudioDevice === 'function') {
        return !!global.RainViewMobile.isMobileAudioDevice();
      }
    } catch (e) {}
    if (typeof navigator === 'undefined') return false;
    var ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod|Android/i.test(ua)) return true;
    if (
      typeof navigator.platform === 'string' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1
    ) {
      return true;
    }
    try {
      if (global.matchMedia && global.matchMedia('(pointer: coarse)').matches) return true;
    } catch (e2) {}
    return typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0;
  }

  function rvAudioContextUsable(ctx) {
    return !!ctx && ctx.state !== 'closed';
  }

  /**
   * Bump when any MP3 under assets/ is replaced. Browsers and CDNs cache
   * audio URLs by path; a query string forces a fresh fetch (same file name).
   */
  var RV_AUDIO_ASSET_VER = '13';

  function withAssetVer(path) {
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return path + sep + 'v=' + RV_AUDIO_ASSET_VER;
  }

  function mapSrcPaths(raw) {
    var out = {};
    for (var k in raw) {
      if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
      out[k] = withAssetVer(raw[k]);
    }
    return out;
  }

  function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  /**
   * Prefer AudioParam scheduling whenever an AudioContext exists — iOS Safari often
   * ignores ad-hoc .value writes on the graph while the context is running.
   */
  function applyGain(gainNode, value, audioCtx) {
    value = clamp01(value);
    if (!gainNode) return;
    if (audioCtx && rvAudioContextUsable(audioCtx)) {
      try {
        var t = audioCtx.currentTime;
        gainNode.gain.cancelScheduledValues(t);
        gainNode.gain.setValueAtTime(value, t);
        return;
      } catch (e) {}
    }
    gainNode.gain.value = value;
  }

  function resumeActiveEngineCtx() {
    var eng = global.__rainViewActiveEngine;
    if (eng && typeof eng.resumeAudioContextIfNeeded === 'function') {
      eng.resumeAudioContextIfNeeded();
    }
  }

  function tryConnectMES(layer, el) {
    resumeActiveEngineCtx();
    if (!layer._audioCtx || !layer._gainNode || !el) return false;
    if (!rvAudioContextUsable(layer._audioCtx)) return false;
    if (el._rvMES) return true;
    try {
      el.volume = 1;
      el._rvMES = layer._audioCtx.createMediaElementSource(el);
      el._rvElementGain = layer._audioCtx.createGain();
      el._rvElementGain.gain.value = 1;
      el._rvMES.connect(el._rvElementGain);
      el._rvElementGain.connect(layer._gainNode);
      return true;
    } catch (e) {
      el._rvMESFailed = true;
      return false;
    }
  }

  function applyElementOutputGain(el, value, audioCtx) {
    value = clamp01(value);
    if (!el) return;
    if (el._rvElementGain && audioCtx && rvAudioContextUsable(audioCtx)) {
      try {
        var t = audioCtx.currentTime;
        el._rvElementGain.gain.cancelScheduledValues(t);
        el._rvElementGain.gain.setValueAtTime(value, t);
        return;
      } catch (e) {}
    }
    el.volume = value;
  }

  function waitUntilPlayable(el) {
    return new Promise(function (resolve) {
      if (el.readyState >= 4) {
        resolve();
        return;
      }
      var finished = function () {
        el.removeEventListener('canplaythrough', finished);
        el.removeEventListener('loadeddata', fallback);
        resolve();
      };
      var fallback = function () {
        el.removeEventListener('canplaythrough', finished);
        el.removeEventListener('loadeddata', fallback);
        resolve();
      };
      el.addEventListener('canplaythrough', finished, { once: true });
      el.addEventListener('loadeddata', fallback, { once: true });
    });
  }

  function revokeSharedBlobUrl(elA, elB) {
    var u = elA && elA._rvBlobUrl;
    if (!u) return;
    if (elB && elB._rvBlobUrl === u) elB._rvBlobUrl = null;
    elA._rvBlobUrl = null;
    try {
      URL.revokeObjectURL(u);
    } catch (e) {}
  }

  function fetchWholeFileIntoAudio(audioEl, url) {
    if (typeof global.fetch !== 'function') {
      audioEl.src = url;
      audioEl.load();
      return waitUntilPlayable(audioEl);
    }
    return fetch(url, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.blob();
      })
      .then(function (blob) {
        if (audioEl._rvBlobUrl) {
          try {
            URL.revokeObjectURL(audioEl._rvBlobUrl);
          } catch (e) {}
        }
        var objUrl = URL.createObjectURL(blob);
        audioEl._rvBlobUrl = objUrl;
        audioEl.src = objUrl;
        audioEl.load();
        return waitUntilPlayable(audioEl);
      })
      .catch(function () {
        audioEl.src = url;
        audioEl.load();
        return waitUntilPlayable(audioEl);
      });
  }

  /**
   * One fetch/blob URL for two elements — both fully buffered before either plays,
   * so the idle twin can start instantly at loop boundaries.
   */
  function fetchWholeFileIntoDualAudio(elA, elB, url) {
    if (typeof global.fetch !== 'function') {
      elA.src = url;
      elB.src = url;
      elA.load();
      elB.load();
      return Promise.all([waitUntilPlayable(elA), waitUntilPlayable(elB)]);
    }
    return fetch(url, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.blob();
      })
      .then(function (blob) {
        revokeSharedBlobUrl(elA, elB);
        var objUrl = URL.createObjectURL(blob);
        elA._rvBlobUrl = objUrl;
        elB._rvBlobUrl = objUrl;
        elA.src = objUrl;
        elB.src = objUrl;
        elA.load();
        elB.load();
        return Promise.all([waitUntilPlayable(elA), waitUntilPlayable(elB)]);
      })
      .catch(function () {
        elA.src = url;
        elB.src = url;
        elA.load();
        elB.load();
        return Promise.all([waitUntilPlayable(elA), waitUntilPlayable(elB)]);
      });
  }

  async function safePlay(el) {
    var mobile = rvIsMobileAudioProfile();
    var attempts = mobile ? 4 : 2;
    var delayMs = mobile ? 120 : 70;
    for (var attempt = 0; attempt < attempts; attempt++) {
      try {
        if (!el) return false;
        var p = el.play();
        if (p !== undefined && p && typeof p.then === 'function') {
          await p;
        }
        return true;
      } catch (_) {
        await new Promise(function (r) {
          setTimeout(r, delayMs);
        });
      }
    }
    return false;
  }

  /**
   * Fade layer gain (Web Audio) or element volume (fallback).
   */
  function fadeLayerVolume(layer, targetVol, durationMs, stillValid) {
    targetVol = clamp01(targetVol);
    if (layer.currentEl && layer.currentEl._rvMESFailed) {
      var elOnly = layer.currentEl;
      if (durationMs <= 0 || !Number.isFinite(durationMs)) {
        elOnly.volume = targetVol;
        return;
      }
      var v0e = elOnly.volume;
      var t0e = performance.now();
      function frameE(now) {
        if (!stillValid()) return;
        var p = Math.min(1, (now - t0e) / durationMs);
        var k = easeOutQuad(p);
        elOnly.volume = v0e + (targetVol - v0e) * k;
        if (p < 1 && stillValid()) {
          requestAnimationFrame(frameE);
        } else if (stillValid()) {
          elOnly.volume = targetVol;
        }
      }
      requestAnimationFrame(frameE);
      return;
    }
    var gn = layer._gainNode;
    var ctx = layer._audioCtx;
    if (durationMs <= 0 || !Number.isFinite(durationMs)) {
      if (gn) {
        applyGain(gn, targetVol, ctx);
      } else if (layer.currentEl) {
        layer.currentEl.volume = targetVol;
      }
      return;
    }
    var v0 = gn ? gn.gain.value : layer.currentEl ? layer.currentEl.volume : 0;
    var t0 = performance.now();

    function frame(now) {
      if (!stillValid()) return;
      var p = Math.min(1, (now - t0) / durationMs);
      var k = easeOutQuad(p);
      var v = v0 + (targetVol - v0) * k;
      if (gn) {
        applyGain(gn, v, ctx);
      } else if (layer.currentEl) {
        layer.currentEl.volume = v;
      }
      if (p < 1 && stillValid()) {
        requestAnimationFrame(frame);
      } else if (stillValid()) {
        if (gn) applyGain(gn, targetVol, ctx);
        else if (layer.currentEl) layer.currentEl.volume = targetVol;
      }
    }
    requestAnimationFrame(frame);
  }

  function pauseAndResetTwin(el) {
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch (e) {}
    var tw = el._rvTwin;
    if (tw) {
      try {
        tw.pause();
        tw.currentTime = 0;
      } catch (e) {}
    }
  }

  /**
   * Twin handoff can miss when rAF is frozen (background tab). With loop=false,
   * the element then fires `ended` — restart from 0 instead of silence.
   */
  function attachEndedLoopRecovery(layer, el) {
    el.addEventListener(
      'ended',
      function () {
        if (layer.currentEl !== el) return;
        if (layer._paused || layer._volume < 0.001) return;
        layer._loopHandoffScheduled = false;
        try {
          el.currentTime = 0;
        } catch (e) {}
        safePlay(el).then(function (ok) {
          if (!ok || layer.currentEl !== el) return;
          layer.applyVolumeToOutputs();
          layer._startLoopMonitor();
        });
      },
      false
    );
  }

  /**
   * One looping layer (rain or piano).
   * Each variant uses twin <audio> elements on one blob URL: the idle twin is
   * fully buffered and started before the active clip ends, then crossfaded —
   * avoids native loop seek gaps.
   */
  function AmbientLoopLayer(nameToSrc, options) {
    var o = options || {};
    this.fadeInMs = o.fadeInMs != null ? o.fadeInMs : 650;
    this.audios = {};
    /** Invalidates in-flight switch / play callbacks only (not volume drags). */
    this._generation = 0;
    /** Cancels in-flight volume fades when user adjusts slider. */
    this._fadeStamp = 0;
    this._gainNode = null;
    this._audioCtx = null;
    this.currentName = null;
    this.currentEl = null;
    this._volume = 1;
    this._paused = false;
    this._loopMonitorRaf = null;
    this._loopIntervalId = null;
    this._loopHandoffScheduled = false;
    this._mobileProfile = !!rvIsMobileAudioProfile();

    var self = this;
    var keys = Object.keys(nameToSrc);
    for (var i = 0; i < keys.length; i++) {
      (function (name, url) {
        var a = document.createElement('audio');
        var b = document.createElement('audio');
        a.loop = false;
        b.loop = false;
        a.preload = 'auto';
        b.preload = 'auto';
        a.volume = 1;
        b.volume = 1;
        a.setAttribute('playsinline', '');
        b.setAttribute('playsinline', '');
        a.playsInline = true;
        b.playsInline = true;
        a.addEventListener('error', function () {
          try {
            a.setAttribute('data-rv-error', '1');
          } catch (e) {}
        });
        b.addEventListener('error', function () {
          try {
            b.setAttribute('data-rv-error', '1');
          } catch (e) {}
        });
        a._rvTwin = b;
        b._rvTwin = a;
        var loadP = fetchWholeFileIntoDualAudio(a, b, url);
        a._rvLoad = loadP;
        b._rvLoad = loadP;
        attachEndedLoopRecovery(self, a);
        attachEndedLoopRecovery(self, b);
        self.audios[name] = a;
      })(keys[i], nameToSrc[keys[i]]);
    }
  }

  AmbientLoopLayer.prototype._getLoopLeadSec = function (duration) {
    var lead = 0.3;
    if (duration > 0 && isFinite(duration)) {
      lead = Math.min(lead, Math.max(0.09, duration * 0.22));
    }
    if (this._mobileProfile) {
      lead += 0.1;
      lead = Math.min(0.48, lead);
    }
    return lead;
  };

  AmbientLoopLayer.prototype._stopLoopMonitor = function () {
    if (this._loopMonitorRaf != null) {
      cancelAnimationFrame(this._loopMonitorRaf);
      this._loopMonitorRaf = null;
    }
    if (this._loopIntervalId != null) {
      try {
        clearInterval(this._loopIntervalId);
      } catch (e) {}
      this._loopIntervalId = null;
    }
  };

  AmbientLoopLayer.prototype._loopMaybeHandoff = function () {
    var self = this;
    if (self._paused || self._volume < 0.001) return;
    var el = self.currentEl;
    if (!el || el.paused) return;
    var twin = el._rvTwin;
    if (!twin) return;
    var d = el.duration;
    if (!d || !isFinite(d)) return;
    if (self._loopHandoffScheduled) return;
    var remain;
    try {
      remain = d - el.currentTime;
    } catch (e) {
      return;
    }
    if (!isFinite(remain)) return;
    if (remain > self._getLoopLeadSec(d)) return;
    self._loopHandoffScheduled = true;
    self._executeLoopHandoff(el, twin);
  };

  AmbientLoopLayer.prototype._startLoopMonitor = function () {
    var self = this;
    self._stopLoopMonitor();
    var hidden = typeof document !== 'undefined' && document.hidden;
    /* Background tabs throttle rAF; interval keeps handoff alive on mobile Safari. */
    if (hidden) {
      var ms = self._mobileProfile ? 120 : 180;
      self._loopIntervalId = setInterval(function () {
        self._loopMaybeHandoff();
      }, ms);
      self._loopMaybeHandoff();
      return;
    }
    function rafTick() {
      self._loopMonitorRaf = requestAnimationFrame(rafTick);
      self._loopMaybeHandoff();
    }
    self._loopMonitorRaf = requestAnimationFrame(rafTick);
  };

  AmbientLoopLayer.prototype._executeLoopHandoff = function (fromEl, toEl) {
    var self = this;
    var gen = self._generation;
    var ctx = self._audioCtx;
    var crossfadeMs = self._mobileProfile ? 80 : 56;
    var u = self._volume;

    try {
      toEl.currentTime = 0;
    } catch (e) {
      self._loopHandoffScheduled = false;
      try {
        fromEl.loop = true;
      } catch (e2) {}
      return;
    }
    resumeActiveEngineCtx();
    tryConnectMES(self, toEl);

    function abortTwinPlay() {
      try {
        toEl.pause();
      } catch (e) {}
      self._loopHandoffScheduled = false;
    }

    function ampFrom(mult) {
      if (ctx && fromEl._rvElementGain && !fromEl._rvMESFailed) {
        fromEl.volume = 1;
        applyElementOutputGain(fromEl, mult, ctx);
      } else {
        fromEl.volume = u * mult;
      }
    }

    function ampTo(mult) {
      if (ctx && toEl._rvElementGain && !toEl._rvMESFailed) {
        toEl.volume = 1;
        applyElementOutputGain(toEl, mult, ctx);
      } else {
        toEl.volume = u * mult;
      }
    }

    ampFrom(1);
    ampTo(0);

    safePlay(toEl).then(function (ok) {
      if (gen !== self._generation || self.currentEl !== fromEl) {
        abortTwinPlay();
        return;
      }
      if (!ok) {
        self._loopHandoffScheduled = false;
        try {
          fromEl.loop = true;
        } catch (e) {}
        return;
      }
      var t0 = performance.now();
      function cf(now) {
        if (gen !== self._generation || self.currentEl !== fromEl) {
          abortTwinPlay();
          return;
        }
        var p = Math.min(1, (now - t0) / crossfadeMs);
        ampFrom(1 - p);
        ampTo(p);
        if (p < 1) {
          requestAnimationFrame(cf);
        } else {
          try {
            fromEl.pause();
          } catch (e) {}
          fromEl.currentTime = 0;
          ampFrom(1);
          ampTo(1);
          self.currentEl = toEl;
          self._loopHandoffScheduled = false;
        }
      }
      requestAnimationFrame(cf);
    });
  };

  AmbientLoopLayer.prototype.appendTo = function (parentEl) {
    for (var k in this.audios) {
      if (!Object.prototype.hasOwnProperty.call(this.audios, k)) continue;
      var primary = this.audios[k];
      parentEl.appendChild(primary);
      if (primary._rvTwin) parentEl.appendChild(primary._rvTwin);
    }
  };

  AmbientLoopLayer.prototype.switchTo = function (name) {
    if (name === this.currentName) return;

    var incoming = this.audios[name];
    if (!incoming) return;

    this._stopLoopMonitor();
    this._loopHandoffScheduled = false;

    this._generation++;
    var gen = this._generation;

    var outgoing = this.currentEl;
    if (outgoing && outgoing !== incoming) {
      pauseAndResetTwin(outgoing);
      if (!this._gainNode) outgoing.volume = 0;
    }

    this.currentName = name;
    this.currentEl = incoming;
    incoming.currentTime = 0;
    if (incoming._rvTwin) {
      try {
        incoming._rvTwin.pause();
        incoming._rvTwin.currentTime = 0;
      } catch (e) {}
    }
    if (this._audioCtx && incoming._rvTwin) {
      applyElementOutputGain(incoming, 1, this._audioCtx);
      applyElementOutputGain(incoming._rvTwin, 1, this._audioCtx);
    }

    if (this._gainNode) {
      incoming.volume = 1;
      if (incoming._rvTwin) incoming._rvTwin.volume = 1;
      applyGain(this._gainNode, 0, this._audioCtx);
    } else {
      incoming.volume = 0;
      if (incoming._rvTwin) incoming._rvTwin.volume = 0;
    }

    var self = this;
    var targetVol = this._volume;

    function playAfterReady() {
      if (gen !== self._generation) return;
      resumeActiveEngineCtx();
      if (self._paused) {
        if (self._gainNode && !incoming._rvMESFailed) {
          applyGain(self._gainNode, targetVol, self._audioCtx);
        } else {
          incoming.volume = targetVol;
        }
        incoming.pause();
        if (incoming._rvTwin) incoming._rvTwin.pause();
        return;
      }
      /* Volume ~0: never call play() — avoids full-level bleed when MES fails on iOS. */
      if (targetVol < 0.001) {
        pauseAndResetTwin(incoming);
        if (self._gainNode && !incoming._rvMESFailed) {
          applyGain(self._gainNode, 0, self._audioCtx);
        } else {
          incoming.volume = 0;
        }
        return;
      }
      tryConnectMES(self, incoming);
      if (incoming._rvMESFailed) {
        incoming.volume = 0;
      }
      safePlay(incoming).then(function (ok) {
        if (gen !== self._generation) return;
        if (!ok) {
          if (self._gainNode && !incoming._rvMESFailed) {
            applyGain(self._gainNode, targetVol, self._audioCtx);
          } else {
            incoming.volume = targetVol;
          }
          return;
        }
        self._startLoopMonitor();
        self._fadeStamp++;
        var fadeId = self._fadeStamp;
        fadeLayerVolume(
          self,
          targetVol,
          self.fadeInMs,
          function () {
            return fadeId === self._fadeStamp && gen === self._generation;
          }
        );
      });
    }

    var loadP = incoming._rvLoad;
    if (loadP && typeof loadP.then === 'function') {
      loadP.then(playAfterReady).catch(playAfterReady);
    } else {
      playAfterReady();
    }
  };

  AmbientLoopLayer.prototype.setVolume = function (val) {
    this._volume = clamp01(val);
    /* Do NOT bump _generation here — iOS fires many input events; that was
       aborting safePlay / fade mid-flight and sounded like rain stopping. */
    this._fadeStamp++;
    resumeActiveEngineCtx();
    /* iOS ignores media.volume when not routed through Web Audio — silence every
       track in this layer when muted so nothing leaks at full device level. */
    if (this._volume < 0.001) {
      this._stopLoopMonitor();
      this._loopHandoffScheduled = false;
      for (var mk in this.audios) {
        if (!Object.prototype.hasOwnProperty.call(this.audios, mk)) continue;
        var ael = this.audios[mk];
        if (ael) pauseAndResetTwin(ael);
      }
    }
    if (this.currentEl && this.currentEl._rvMESFailed) {
      this.currentEl.volume = this._volume;
      if (this._volume > 0.001 && this.currentEl.paused && !this._paused) {
        var self = this;
        safePlay(this.currentEl).then(function (ok) {
          if (ok && self.currentEl) {
            self.currentEl.volume = self._volume;
            self._startLoopMonitor();
          }
        });
      }
      return;
    }
    if (this._gainNode) {
      applyGain(this._gainNode, this._volume, this._audioCtx);
    }
    if (this.currentEl) {
      if (this._gainNode) {
        this.currentEl.volume = 1;
      } else {
        this.currentEl.volume = this._volume;
      }
    }
    if (
      this._volume > 0.001 &&
      this.currentEl &&
      this.currentEl.paused &&
      !this._paused
    ) {
      tryConnectMES(this, this.currentEl);
      var self2 = this;
      safePlay(this.currentEl).then(function (ok) {
        if (ok && self2.currentEl) {
          self2.applyVolumeToOutputs();
          self2._startLoopMonitor();
        }
      });
    }
  };

  AmbientLoopLayer.prototype.isPaused = function () {
    return !!this._paused;
  };

  AmbientLoopLayer.prototype.setPaused = function (paused) {
    paused = !!paused;
    if (!this.currentEl) return;
    if (paused === this._paused) return;
    this._paused = paused;
    this._generation++;
    var el = this.currentEl;
    if (paused) {
      this._stopLoopMonitor();
      el.pause();
      if (el._rvTwin) {
        try {
          el._rvTwin.pause();
        } catch (e) {}
      }
      this.applyVolumeToOutputs();
    } else {
      var self = this;
      var gen = this._generation;
      safePlay(el).then(function (ok) {
        if (gen !== self._generation || !self.currentEl || el !== self.currentEl) return;
        if (!ok) return;
        self.applyVolumeToOutputs();
        self._startLoopMonitor();
      });
    }
  };

  AmbientLoopLayer.prototype.applyVolumeToOutputs = function () {
    if (this.currentEl && this.currentEl._rvMESFailed) {
      this.currentEl.volume = this._volume;
      return;
    }
    if (this._gainNode) {
      applyGain(this._gainNode, this._volume, this._audioCtx);
      if (this.currentEl) this.currentEl.volume = 1;
    } else if (this.currentEl) {
      this.currentEl.volume = this._volume;
    }
  };

  AmbientLoopLayer.prototype.togglePause = function () {
    if (!this.currentEl) return null;
    this.setPaused(!this._paused);
    return this._paused;
  };

  AmbientLoopLayer.prototype.stopAll = function () {
    this._stopLoopMonitor();
    this._loopHandoffScheduled = false;
    this._generation++;
    this._fadeStamp++;
    this._paused = false;
    for (var k in this.audios) {
      if (!Object.prototype.hasOwnProperty.call(this.audios, k)) continue;
      var el = this.audios[k];
      el.pause();
      el.volume = 1;
      if (el._rvTwin) {
        el._rvTwin.pause();
        el._rvTwin.volume = 1;
      }
      if (this._audioCtx) {
        applyElementOutputGain(el, 1, this._audioCtx);
        if (el._rvTwin) applyElementOutputGain(el._rvTwin, 1, this._audioCtx);
      }
    }
    if (this._gainNode) {
      applyGain(this._gainNode, 0, this._audioCtx);
    }
    this.currentName = null;
    this.currentEl = null;
  };

  AmbientLoopLayer.prototype.recoverIfNeeded = function () {
    if (this._paused) return;
    if (this._volume < 0.001) return;
    var el = this.currentEl;
    if (!el || el.error) return;
    if (!el.paused) return;
    var self = this;
    var gen = this._generation;
    safePlay(el).then(function (ok) {
      if (ok && gen === self._generation && el === self.currentEl) {
        self.applyVolumeToOutputs();
        self._startLoopMonitor();
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
    this._ctx = null;
    this._rainGain = null;
    this._pianoGain = null;
  }

  AudioEngine.prototype.preload = function () {
    this.rainLayer = new AmbientLoopLayer(
      mapSrcPaths({
        gentle: 'assets/rain-gentle.mp3',
        heavy: 'assets/rain-heavy.mp3',
        window: 'assets/rain-window.mp3',
        forest: 'assets/rain-forest.mp3',
        thunder: 'assets/rain-thunder.mp3'
      }),
      { fadeInMs: 0 }
    );

    this.pianoLayer = new AmbientLoopLayer(
      mapSrcPaths({
        contemplative: 'assets/piano-contemplative.mp3',
        jazz: 'assets/piano-jazz.mp3',
        melancholic: 'assets/piano-melancholic.mp3',
        ethereal: 'assets/piano-ethereal.mp3',
        pastoral: 'assets/piano-pastoral.mp3'
      }),
      { fadeInMs: 650 }
    );

    var host = ensureHost();
    this.rainLayer.appendTo(host);
    this.pianoLayer.appendTo(host);

    global.__rainViewActiveEngine = this;
    if (!global.__rainViewVisListenerInstalled) {
      global.__rainViewVisListenerInstalled = true;
      document.addEventListener('visibilitychange', function () {
        var eng = global.__rainViewActiveEngine;
        if (!eng || !eng.rainLayer) return;
        function refreshLoopMonitor(layer) {
          if (!layer || !layer.currentEl) return;
          if (layer._paused || layer._volume < 0.001) return;
          try {
            if (!layer.currentEl.paused) {
              layer._stopLoopMonitor();
              layer._startLoopMonitor();
            }
          } catch (e) {}
        }
        refreshLoopMonitor(eng.rainLayer);
        refreshLoopMonitor(eng.pianoLayer);
        if (document.hidden) return;
        eng.rainLayer.recoverIfNeeded();
        eng.pianoLayer.recoverIfNeeded();
      });
    }
    if (!global.__rainViewPageShowInstalled) {
      global.__rainViewPageShowInstalled = true;
      global.addEventListener('pageshow', function (ev) {
        if (!ev.persisted) return;
        var eng = global.__rainViewActiveEngine;
        if (eng && typeof eng.resumeAudioContextIfNeeded === 'function') {
          eng.resumeAudioContextIfNeeded();
        }
        if (!eng || !eng.rainLayer) return;
        try {
          eng.rainLayer._stopLoopMonitor();
          eng.pianoLayer._stopLoopMonitor();
          eng.rainLayer.recoverIfNeeded();
          eng.pianoLayer.recoverIfNeeded();
          function remon(L) {
            if (!L || !L.currentEl || L._paused || L._volume < 0.001) return;
            try {
              if (!L.currentEl.paused) L._startLoopMonitor();
            } catch (e) {}
          }
          remon(eng.rainLayer);
          remon(eng.pianoLayer);
        } catch (e2) {}
      });
    }
  };

  AudioEngine.prototype.ensureWebAudio = function () {
    if (this._ctx) return;
    var Ctx = global.AudioContext || global.webkitAudioContext;
    if (!Ctx) return;
    try {
      this._ctx = new Ctx();
    } catch (e) {
      return;
    }
    this._rainGain = this._ctx.createGain();
    this._pianoGain = this._ctx.createGain();
    this._rainGain.connect(this._ctx.destination);
    this._pianoGain.connect(this._ctx.destination);
    this.rainLayer._audioCtx = this._ctx;
    this.rainLayer._gainNode = this._rainGain;
    this.pianoLayer._audioCtx = this._ctx;
    this.pianoLayer._gainNode = this._pianoGain;
    applyGain(this._rainGain, this.rainLayer._volume, this._ctx);
    applyGain(this._pianoGain, this.pianoLayer._volume, this._ctx);
    this.resumeAudioContextIfNeeded();
  };

  /** Call on every volume change and after user gesture — iOS keeps AudioContext suspended until resume(). */
  AudioEngine.prototype.resumeAudioContextIfNeeded = function () {
    if (!this._ctx || this._ctx.state === 'closed') return;
    if (this._ctx.state === 'suspended') {
      var p = this._ctx.resume();
      if (p && typeof p.then === 'function') {
        p.catch(function () {});
      }
    }
  };

  AudioEngine.prototype.start = function () {
    if (this._started) return;
    this._started = true;
    this.ensureWebAudio();
    this.resumeAudioContextIfNeeded();
  };

  AudioEngine.prototype.setRainVariant = function (name) {
    this.resumeAudioContextIfNeeded();
    if (this.rainLayer) this.rainLayer.switchTo(name);
  };

  AudioEngine.prototype.setRainVolume = function (val) {
    this.resumeAudioContextIfNeeded();
    if (this.rainLayer) this.rainLayer.setVolume(val);
  };

  AudioEngine.prototype.setPianoVariant = function (name) {
    this.resumeAudioContextIfNeeded();
    if (this.pianoLayer) this.pianoLayer.switchTo(name);
  };

  AudioEngine.prototype.setPianoVolume = function (val) {
    this.resumeAudioContextIfNeeded();
    if (this.pianoLayer) this.pianoLayer.setVolume(val);
  };

  AudioEngine.prototype.stopAll = function () {
    if (this.rainLayer) this.rainLayer.stopAll();
    if (this.pianoLayer) this.pianoLayer.stopAll();
  };

  AudioEngine.prototype.isRainPaused = function () {
    return this.rainLayer ? this.rainLayer.isPaused() : false;
  };

  AudioEngine.prototype.isPianoPaused = function () {
    return this.pianoLayer ? this.pianoLayer.isPaused() : false;
  };

  AudioEngine.prototype.toggleRainPause = function () {
    if (!this.rainLayer) return null;
    return this.rainLayer.togglePause();
  };

  AudioEngine.prototype.togglePianoPause = function () {
    if (!this.pianoLayer) return null;
    return this.pianoLayer.togglePause();
  };

  global.AudioEngine = AudioEngine;
})(typeof window !== 'undefined' ? window : this);

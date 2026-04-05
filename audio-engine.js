/* ═══════════════════════════════════════════
   AUDIO ENGINE — Real Rain + Real Piano (MP3)
   ═══════════════════════════════════════════ */

(function() {
  'use strict';

  class AudioEngine {
    constructor() {
      this.rainAudios = {};
      this.currentRainName = null;
      this.currentRainEl = null;
      this._rainVolume = 0.6;

      this.pianoAudios = {};
      this.currentPianoName = null;
      this.currentPianoEl = null;
      this._pianoVolume = 0.3;

      this._started = false;
    }

    preload() {
      const rainVariants = {
        'gentle':  'assets/rain-gentle.mp3',
        'heavy':   'assets/rain-heavy.mp3',
        'window':  'assets/rain-window.mp3',
        'forest':  'assets/rain-forest.mp3',
        'thunder': 'assets/rain-thunder.mp3'
      };

      for (const [name, src] of Object.entries(rainVariants)) {
        const audio = document.createElement('audio');
        audio.src = src;
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0;
        this.rainAudios[name] = audio;
      }

      const pianoVariants = {
        contemplative: 'assets/piano-contemplative.mp3',
        jazz:          'assets/piano-jazz.mp3',
        melancholic:   'assets/piano-melancholic.mp3',
        ethereal:      'assets/piano-ethereal.mp3',
        pastoral:      'assets/piano-pastoral.mp3'
      };

      for (const [name, src] of Object.entries(pianoVariants)) {
        const audio = document.createElement('audio');
        audio.src = src;
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0;
        this.pianoAudios[name] = audio;
      }
    }

    /** Must be called from user gesture (e.g. entering a scene). */
    start() {
      if (this._started) return;
      this._started = true;
    }

    setRainVariant(name) {
      if (this.currentRainName === name) return;

      if (this.currentRainEl) {
        this._fadeAudio(this.currentRainEl, 0, 600, () => {
          this.currentRainEl.pause();
        });
      }

      this.currentRainName = name;
      const audio = this.rainAudios[name];
      if (!audio) return;

      this.currentRainEl = audio;
      audio.currentTime = 0;
      audio.volume = 0;
      const playPromise = audio.play();
      if (playPromise) playPromise.catch(() => {});

      this._fadeAudio(audio, this._rainVolume, 800);
    }

    setRainVolume(val) {
      this._rainVolume = val;
      if (this.currentRainEl) {
        this.currentRainEl.volume = val;
      }
    }

    setPianoVariant(name) {
      if (this.currentPianoName === name) return;

      if (this.currentPianoEl) {
        this._fadeAudio(this.currentPianoEl, 0, 600, () => {
          this.currentPianoEl.pause();
        });
      }

      this.currentPianoName = name;
      const audio = this.pianoAudios[name];
      if (!audio) return;

      this.currentPianoEl = audio;
      audio.currentTime = 0;
      audio.volume = 0;
      const playPromise = audio.play();
      if (playPromise) playPromise.catch(() => {});

      this._fadeAudio(audio, this._pianoVolume, 800);
    }

    setPianoVolume(val) {
      this._pianoVolume = val;
      if (this.currentPianoEl) {
        this.currentPianoEl.volume = val;
      }
    }

    _fadeAudio(audioEl, targetVol, durationMs, onDone) {
      const startVol = audioEl.volume;
      const diff = targetVol - startVol;
      const steps = 20;
      const stepTime = durationMs / steps;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        const progress = step / steps;
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        audioEl.volume = Math.max(0, Math.min(1, startVol + diff * eased));

        if (step >= steps) {
          clearInterval(interval);
          audioEl.volume = Math.max(0, Math.min(1, targetVol));
          if (onDone) onDone();
        }
      }, stepTime);
    }

    stopAll() {
      if (this.currentRainEl) {
        this.currentRainEl.pause();
        this.currentRainEl.volume = 0;
        this.currentRainEl = null;
        this.currentRainName = null;
      }

      if (this.currentPianoEl) {
        this.currentPianoEl.pause();
        this.currentPianoEl.volume = 0;
        this.currentPianoEl = null;
        this.currentPianoName = null;
      }
    }
  }

  window.AudioEngine = AudioEngine;
})();

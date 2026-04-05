/* ═══════════════════════════════════════════
   AUDIO ENGINE — Rain + Piano via LoopCrossfadeLayer
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  class AudioEngine {
    constructor() {
      this.rainLayer = null;
      this.pianoLayer = null;
      this._started = false;
    }

    preload() {
      this.rainLayer = new LoopCrossfadeLayer(
        {
          gentle: 'assets/rain-gentle.mp3',
          heavy: 'assets/rain-heavy.mp3',
          window: 'assets/rain-window.mp3',
          forest: 'assets/rain-forest.mp3',
          thunder: 'assets/rain-thunder.mp3'
        },
        { fadeOutMs: 600, fadeInMs: 800 }
      );

      this.pianoLayer = new LoopCrossfadeLayer(
        {
          contemplative: 'assets/piano-contemplative.mp3',
          jazz: 'assets/piano-jazz.mp3',
          melancholic: 'assets/piano-melancholic.mp3',
          ethereal: 'assets/piano-ethereal.mp3',
          pastoral: 'assets/piano-pastoral.mp3'
        },
        { fadeOutMs: 600, fadeInMs: 800 }
      );
    }

    start() {
      if (this._started) return;
      this._started = true;
    }

    setRainVariant(name) {
      if (this.rainLayer) this.rainLayer.switchTo(name);
    }

    setRainVolume(val) {
      if (this.rainLayer) this.rainLayer.setVolume(val);
    }

    setPianoVariant(name) {
      if (this.pianoLayer) this.pianoLayer.switchTo(name);
    }

    setPianoVolume(val) {
      if (this.pianoLayer) this.pianoLayer.setVolume(val);
    }

    stopAll() {
      if (this.rainLayer) this.rainLayer.stopAll();
      if (this.pianoLayer) this.pianoLayer.stopAll();
    }
  }

  window.AudioEngine = AudioEngine;
})();

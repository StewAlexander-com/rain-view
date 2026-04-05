/* ═══════════════════════════════════════════
   AUDIO ENGINE — Real Rain Audio + Procedural Piano
   ═══════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Piano Scale Definitions ──
  const PIANO_CONFIGS = {
    contemplative: {
      notes: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25],
      tempo: 2200,
      velocityRange: [0.15, 0.35],
      sustainRange: [2.0, 4.0],
      restProbability: 0.35,
      chordProbability: 0.15,
      octaveShift: [0.5, 1, 1, 2],
      reverbDecay: 3.0
    },
    jazz: {
      notes: [261.63, 293.66, 311.13, 349.23, 392.00, 440.00, 466.16, 523.25],
      tempo: 1600,
      velocityRange: [0.12, 0.30],
      sustainRange: [1.2, 3.0],
      restProbability: 0.25,
      chordProbability: 0.3,
      octaveShift: [0.5, 1, 1, 2],
      reverbDecay: 2.5
    },
    melancholic: {
      notes: [220.00, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 523.25],
      tempo: 2800,
      velocityRange: [0.1, 0.25],
      sustainRange: [3.0, 5.5],
      restProbability: 0.4,
      chordProbability: 0.1,
      octaveShift: [0.5, 0.5, 1, 1],
      reverbDecay: 4.0
    },
    ethereal: {
      notes: [293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99],
      tempo: 3200,
      velocityRange: [0.08, 0.2],
      sustainRange: [4.0, 7.0],
      restProbability: 0.45,
      chordProbability: 0.2,
      octaveShift: [1, 1, 2, 2],
      reverbDecay: 5.0
    },
    pastoral: {
      notes: [261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 523.25],
      tempo: 2000,
      velocityRange: [0.12, 0.28],
      sustainRange: [1.8, 3.5],
      restProbability: 0.3,
      chordProbability: 0.2,
      octaveShift: [0.5, 1, 1, 2],
      reverbDecay: 3.0
    }
  };

  class AudioEngine {
    constructor() {
      // Rain audio (real mp3 files)
      this.rainAudios = {};
      this.currentRainName = null;
      this.currentRainEl = null;
      this._rainVolume = 0.6;

      // Piano (procedural via Web Audio)
      this.pianoCtx = null;
      this.pianoGain = null;
      this.pianoConvolver = null;
      this.pianoVariant = null;
      this._pianoVolume = 0.3;
      this._pianoPlaying = false;
      this._pianoTimer = null;

      this._started = false;
    }

    // ── Preload rain audio files ──
    preload() {
      const variants = {
        'gentle':  'assets/rain-gentle.mp3',
        'heavy':   'assets/rain-heavy.mp3',
        'window':  'assets/rain-window.mp3',
        'forest':  'assets/rain-forest.mp3',
        'thunder': 'assets/rain-thunder.mp3'
      };

      for (const [name, src] of Object.entries(variants)) {
        const audio = document.createElement('audio');
        audio.src = src;
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0;
        this.rainAudios[name] = audio;
      }
    }

    // ── Must be called from user gesture ──
    start() {
      if (this._started) return;
      this._started = true;

      // Initialize Web Audio for piano
      this.pianoCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Master gain for piano
      this.pianoGain = this.pianoCtx.createGain();
      this.pianoGain.gain.value = this._pianoVolume;

      // Create convolver reverb for piano
      this._createReverb();
    }

    _createReverb() {
      const ctx = this.pianoCtx;
      const convolver = ctx.createConvolver();
      
      // Generate impulse response for reverb
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 3; // 3 second reverb
      const impulse = ctx.createBuffer(2, length, sampleRate);
      
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2.0);
        }
      }
      
      convolver.buffer = impulse;
      
      // Wet/dry mix
      const dryGain = ctx.createGain();
      dryGain.gain.value = 0.6;
      const wetGain = ctx.createGain();
      wetGain.gain.value = 0.4;

      // dry path -> master
      dryGain.connect(this.pianoGain);
      // wet path -> convolver -> master
      convolver.connect(wetGain);
      wetGain.connect(this.pianoGain);
      
      // Master -> destination
      this.pianoGain.connect(ctx.destination);

      this._pianoDry = dryGain;
      this._pianoWet = convolver;
    }

    // ── Rain Control ──
    setRainVariant(name) {
      if (this.currentRainName === name) return;

      // Fade out current
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

    // ── Piano Control ──
    setPianoVariant(name) {
      if (this.pianoVariant === name) return;
      this.pianoVariant = name;

      // If already playing, the next note will use the new config
      if (!this._pianoPlaying) {
        this._startPianoLoop();
      }
    }

    setPianoVolume(val) {
      this._pianoVolume = val;
      if (this.pianoGain) {
        this.pianoGain.gain.setTargetAtTime(val, this.pianoCtx.currentTime, 0.1);
      }
    }

    _startPianoLoop() {
      if (this._pianoPlaying) return;
      this._pianoPlaying = true;
      this._scheduleNextNote();
    }

    _stopPianoLoop() {
      this._pianoPlaying = false;
      if (this._pianoTimer) {
        clearTimeout(this._pianoTimer);
        this._pianoTimer = null;
      }
    }

    _scheduleNextNote() {
      if (!this._pianoPlaying || !this.pianoVariant) return;

      const config = PIANO_CONFIGS[this.pianoVariant];
      if (!config) return;

      // Random tempo variation
      const delay = config.tempo * (0.6 + Math.random() * 0.8);

      this._pianoTimer = setTimeout(() => {
        if (!this._pianoPlaying) return;

        // Rest probability
        if (Math.random() > config.restProbability) {
          this._playPianoNote(config);
        }

        this._scheduleNextNote();
      }, delay);
    }

    _playPianoNote(config) {
      if (!this.pianoCtx || this.pianoCtx.state === 'closed') return;
      
      // Resume context if suspended
      if (this.pianoCtx.state === 'suspended') {
        this.pianoCtx.resume();
      }

      const ctx = this.pianoCtx;
      const now = ctx.currentTime;

      // Pick note
      const noteIdx = Math.floor(Math.random() * config.notes.length);
      const baseFreq = config.notes[noteIdx];
      const octave = config.octaveShift[Math.floor(Math.random() * config.octaveShift.length)];
      const freq = baseFreq * octave;

      // Velocity
      const vel = config.velocityRange[0] + Math.random() * (config.velocityRange[1] - config.velocityRange[0]);
      const sustain = config.sustainRange[0] + Math.random() * (config.sustainRange[1] - config.sustainRange[0]);

      this._synthPianoTone(freq, vel, sustain, now);

      // Chord probability
      if (Math.random() < config.chordProbability) {
        // Add a chord tone (third or fifth above)
        const intervals = [1.25, 1.335, 1.5]; // major third, minor third, fifth
        const interval = intervals[Math.floor(Math.random() * intervals.length)];
        const chordFreq = freq * interval;
        const chordVel = vel * 0.6;
        this._synthPianoTone(chordFreq, chordVel, sustain * 0.8, now + 0.02 + Math.random() * 0.08);
      }
    }

    _synthPianoTone(freq, velocity, sustain, startTime) {
      const ctx = this.pianoCtx;

      // Oscillator (detuned pair for richness)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.value = freq;
      osc2.frequency.value = freq * 1.002; // slight detune

      // Envelope gain
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, startTime);
      env.gain.linearRampToValueAtTime(velocity, startTime + 0.008); // fast attack
      env.gain.exponentialRampToValueAtTime(velocity * 0.6, startTime + 0.1); // hammer decay
      env.gain.exponentialRampToValueAtTime(velocity * 0.3, startTime + sustain * 0.5);
      env.gain.exponentialRampToValueAtTime(0.001, startTime + sustain);

      // Subtle harmonics filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 6, startTime);
      filter.frequency.exponentialRampToValueAtTime(freq * 2, startTime + sustain * 0.7);
      filter.Q.value = 0.7;

      // Connect: oscillators -> filter -> envelope -> dry + wet
      const mix = ctx.createGain();
      mix.gain.value = 0.5;

      osc1.connect(filter);
      osc2.connect(mix);
      mix.connect(filter);
      filter.connect(env);
      env.connect(this._pianoDry);
      env.connect(this._pianoWet);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + sustain + 0.1);
      osc2.stop(startTime + sustain + 0.1);
    }

    // ── Fade utility for HTML audio elements ──
    _fadeAudio(audioEl, targetVol, durationMs, onDone) {
      const startVol = audioEl.volume;
      const diff = targetVol - startVol;
      const steps = 20;
      const stepTime = durationMs / steps;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        const progress = step / steps;
        // Ease in-out
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

    // ── Stop everything ──
    stopAll() {
      // Stop rain
      if (this.currentRainEl) {
        this.currentRainEl.pause();
        this.currentRainEl.volume = 0;
        this.currentRainEl = null;
        this.currentRainName = null;
      }

      // Stop piano
      this._stopPianoLoop();
    }
  }

  // Expose globally
  window.AudioEngine = AudioEngine;
})();

/**
 * Audio Engine v2 — Procedural rain + piano with selectable variants
 * 5 rain variants + 5 piano variants, all Web Audio API
 */

// ---- Rain Variant Configurations ----
const RAIN_VARIANTS = {
  gentle: {
    label: 'Gentle Patter',
    layers: [
      { type: 'bandpass', freq: 3000, Q: 0.6, gain: 0.25 },
      { type: 'highpass', freq: 2000, Q: 0.4, gain: 0.15 }
    ],
    modSpeed: 0.3,
    modDepth: 0.15,
    baseGain: 0.5,
    thunder: false,
    plinks: false
  },
  heavy: {
    label: 'Heavy Downpour',
    layers: [
      { type: 'bandpass', freq: 800, Q: 0.3, gain: 0.35 },
      { type: 'bandpass', freq: 2500, Q: 0.5, gain: 0.3 },
      { type: 'lowpass', freq: 4000, Q: 0.2, gain: 0.25 }
    ],
    modSpeed: 0.8,
    modDepth: 0.2,
    baseGain: 0.8,
    thunder: false,
    plinks: false
  },
  glass: {
    label: 'Rain on Glass',
    layers: [
      { type: 'bandpass', freq: 4000, Q: 1.2, gain: 0.3 },
      { type: 'highpass', freq: 3000, Q: 0.8, gain: 0.2 }
    ],
    modSpeed: 1.5,
    modDepth: 0.25,
    baseGain: 0.55,
    thunder: false,
    plinks: true,
    plinkFreqRange: [3000, 6000],
    plinkInterval: [0.1, 0.5]
  },
  storm: {
    label: 'Distant Storm',
    layers: [
      { type: 'lowpass', freq: 600, Q: 0.3, gain: 0.4 },
      { type: 'bandpass', freq: 1200, Q: 0.4, gain: 0.2 }
    ],
    modSpeed: 0.15,
    modDepth: 0.3,
    baseGain: 0.6,
    thunder: true,
    thunderInterval: [8, 20],
    plinks: false
  },
  forest: {
    label: 'Forest Rain',
    layers: [
      { type: 'bandpass', freq: 1500, Q: 0.5, gain: 0.25 },
      { type: 'bandpass', freq: 3500, Q: 0.7, gain: 0.2 },
      { type: 'highpass', freq: 1000, Q: 0.3, gain: 0.15 }
    ],
    modSpeed: 0.5,
    modDepth: 0.18,
    baseGain: 0.55,
    thunder: false,
    plinks: true,
    plinkFreqRange: [1500, 4500],
    plinkInterval: [0.15, 0.6]
  }
};

// ---- Piano Variant Configurations ----
const PIANO_VARIANTS = {
  contemplative: {
    label: 'Contemplative',
    // D minor pentatonic: D, F, G, A, C
    notes: [
      146.83, 174.61, 196.00, 220.00, 261.63,
      293.66, 349.23, 392.00, 440.00, 523.25
    ],
    timingRange: [4, 8],
    chordProb: 0.15,
    adsr: { attack: 0.08, decay: 1.5, sustain: 0.15, release: 2.5 },
    reverbAmount: 0.7,
    volume: 0.35,
    velocityRange: [0.25, 0.5]
  },
  jazz: {
    label: 'Gentle Jazz',
    // Bb major 7 arpeggios: Bb, D, F, A, C, Eb
    notes: [
      233.08, 293.66, 349.23, 440.00, 523.25, 311.13,
      466.16, 587.33, 698.46, 880.00
    ],
    timingRange: [2, 5],
    chordProb: 0.35,
    adsr: { attack: 0.05, decay: 0.8, sustain: 0.2, release: 1.8 },
    reverbAmount: 0.5,
    volume: 0.3,
    velocityRange: [0.3, 0.6]
  },
  melancholic: {
    label: 'Melancholic',
    // A minor: A, B, C, D, E, F, G
    notes: [
      220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00,
      440.00, 493.88, 523.25
    ],
    timingRange: [3, 7],
    chordProb: 0.2,
    adsr: { attack: 0.1, decay: 2.0, sustain: 0.1, release: 3.0 },
    reverbAmount: 0.75,
    volume: 0.3,
    velocityRange: [0.2, 0.45]
  },
  ethereal: {
    label: 'Ethereal',
    // Miyako-bushi: C, Db, F, G, Ab
    notes: [
      261.63, 277.18, 349.23, 392.00, 415.30,
      523.25, 554.37, 698.46, 784.00, 830.61
    ],
    timingRange: [5, 10],
    chordProb: 0.1,
    adsr: { attack: 0.15, decay: 2.5, sustain: 0.12, release: 4.0 },
    reverbAmount: 0.85,
    volume: 0.28,
    velocityRange: [0.15, 0.4]
  },
  pastoral: {
    label: 'Pastoral',
    // C major: C, E, G, A, B, D
    notes: [
      261.63, 329.63, 392.00, 440.00, 493.88,
      523.25, 659.25, 784.00, 880.00, 987.77
    ],
    timingRange: [2, 4],
    chordProb: 0.3,
    adsr: { attack: 0.04, decay: 0.6, sustain: 0.25, release: 1.5 },
    reverbAmount: 0.45,
    volume: 0.32,
    velocityRange: [0.35, 0.6]
  }
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.initialized = false;

    // Rain state
    this.rainGain = null;
    this.rainMasterGain = null;
    this.rainNodes = [];
    this.rainVariant = 'gentle';
    this.rainVolume = 0.7;

    // Piano state
    this.pianoGain = null;
    this.pianoMasterGain = null;
    this.pianoConvolver = null;
    this.pianoVariant = 'contemplative';
    this.pianoVolume = 0;
    this.pianoTimerId = null;
    this.pianoRunning = false;

    // Rain extras
    this.plinkTimerId = null;
    this.thunderTimerId = null;
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gains
    this.rainMasterGain = this.ctx.createGain();
    this.rainMasterGain.gain.value = this.rainVolume;
    this.rainMasterGain.connect(this.ctx.destination);

    this.pianoMasterGain = this.ctx.createGain();
    this.pianoMasterGain.gain.value = this.pianoVolume;
    this.pianoMasterGain.connect(this.ctx.destination);

    // Create convolver for piano reverb
    this._createReverb();

    this.initialized = true;
  }

  _createReverb() {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 3; // 3 second reverb
    const impulse = this.ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        // Exponential decay with some early reflections
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2.5) * 0.5;
        // Early reflections
        if (t < 0.05) {
          data[i] += (Math.random() * 2 - 1) * 0.3;
        }
      }
    }

    this.pianoConvolver = this.ctx.createConvolver();
    this.pianoConvolver.buffer = impulse;
  }

  // ---- Rain ----
  setRainVariant(variant) {
    if (!RAIN_VARIANTS[variant]) return;
    this.rainVariant = variant;
    if (this.initialized) {
      this._rebuildRain();
    }
  }

  setRainVolume(vol) {
    this.rainVolume = vol;
    if (this.rainMasterGain) {
      this.rainMasterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }
  }

  startRain() {
    if (!this.initialized) this.init();
    this._rebuildRain();
  }

  _rebuildRain() {
    // Stop existing rain nodes
    this._stopRainNodes();

    const cfg = RAIN_VARIANTS[this.rainVariant];
    const now = this.ctx.currentTime;

    // Create intermediate gain for this variant
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = cfg.baseGain;
    this.rainGain.connect(this.rainMasterGain);

    // Create noise layers
    for (const layer of cfg.layers) {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = layer.type;
      filter.frequency.value = layer.freq;
      filter.Q.value = layer.Q;

      const layerGain = this.ctx.createGain();
      layerGain.gain.value = layer.gain;

      // Amplitude modulation via LFO
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = cfg.modSpeed + Math.random() * 0.2;

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = cfg.modDepth * layer.gain;

      lfo.connect(lfoGain);
      lfoGain.connect(layerGain.gain);

      source.connect(filter);
      filter.connect(layerGain);
      layerGain.connect(this.rainGain);

      source.start(now);
      lfo.start(now);

      this.rainNodes.push({ source, filter, layerGain, lfo, lfoGain });
    }

    // Plinks (glass and forest variants)
    if (cfg.plinks) {
      this._startPlinks(cfg);
    }

    // Thunder
    if (cfg.thunder) {
      this._startThunder(cfg);
    }
  }

  _stopRainNodes() {
    for (const n of this.rainNodes) {
      try { n.source.stop(); } catch (e) {}
      try { n.lfo.stop(); } catch (e) {}
      try { n.source.disconnect(); } catch (e) {}
      try { n.filter.disconnect(); } catch (e) {}
      try { n.layerGain.disconnect(); } catch (e) {}
      try { n.lfo.disconnect(); } catch (e) {}
      try { n.lfoGain.disconnect(); } catch (e) {}
    }
    this.rainNodes = [];

    if (this.plinkTimerId) {
      clearTimeout(this.plinkTimerId);
      this.plinkTimerId = null;
    }
    if (this.thunderTimerId) {
      clearTimeout(this.thunderTimerId);
      this.thunderTimerId = null;
    }

    if (this.rainGain) {
      try { this.rainGain.disconnect(); } catch (e) {}
      this.rainGain = null;
    }
  }

  _startPlinks(cfg) {
    const [minI, maxI] = cfg.plinkInterval;
    const [minF, maxF] = cfg.plinkFreqRange;

    const playPlink = () => {
      if (!this.rainGain) return;

      const now = this.ctx.currentTime;
      const freq = minF + Math.random() * (maxF - minF);
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const g = this.ctx.createGain();
      const vol = 0.02 + Math.random() * 0.04;
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(g);
      g.connect(this.rainGain);
      osc.start(now);
      osc.stop(now + 0.15);

      const next = (minI + Math.random() * (maxI - minI)) * 1000;
      this.plinkTimerId = setTimeout(playPlink, next);
    };

    this.plinkTimerId = setTimeout(playPlink, Math.random() * 500);
  }

  _startThunder(cfg) {
    const [minI, maxI] = cfg.thunderInterval;

    const playThunder = () => {
      if (!this.rainGain) return;

      const now = this.ctx.currentTime;
      const duration = 2 + Math.random() * 3;

      // Low rumble via filtered noise
      const bufSize = this.ctx.sampleRate * Math.ceil(duration + 1);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        d[i] = Math.random() * 2 - 1;
      }

      const src = this.ctx.createBufferSource();
      src.buffer = buf;

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 150 + Math.random() * 100;
      lp.Q.value = 0.5;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.15 + Math.random() * 0.1, now + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);

      src.connect(lp);
      lp.connect(g);
      g.connect(this.rainGain);
      src.start(now);
      src.stop(now + duration + 0.5);

      const next = (minI + Math.random() * (maxI - minI)) * 1000;
      this.thunderTimerId = setTimeout(playThunder, next);
    };

    const first = (minI + Math.random() * (maxI - minI)) * 1000;
    this.thunderTimerId = setTimeout(playThunder, first);
  }

  stopRain() {
    this._stopRainNodes();
  }

  // ---- Piano ----
  setPianoVariant(variant) {
    if (!PIANO_VARIANTS[variant]) return;
    this.pianoVariant = variant;
    // No rebuild needed — next note will use new config
  }

  setPianoVolume(vol) {
    this.pianoVolume = vol;
    if (this.pianoMasterGain) {
      this.pianoMasterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }
  }

  startPiano() {
    if (!this.initialized) this.init();
    if (this.pianoRunning) return;
    this.pianoRunning = true;
    this._scheduleNextNote();
  }

  _scheduleNextNote() {
    if (!this.pianoRunning) return;

    const cfg = PIANO_VARIANTS[this.pianoVariant];
    const [minT, maxT] = cfg.timingRange;
    const delay = (minT + Math.random() * (maxT - minT)) * 1000;

    this.pianoTimerId = setTimeout(() => {
      if (!this.pianoRunning) return;
      this._playPianoNote();
      this._scheduleNextNote();
    }, delay);
  }

  _playPianoNote() {
    const cfg = PIANO_VARIANTS[this.pianoVariant];
    const now = this.ctx.currentTime;
    const { attack, decay, sustain, release } = cfg.adsr;
    const [minVel, maxVel] = cfg.velocityRange;
    const velocity = minVel + Math.random() * (maxVel - minVel);

    const isChord = Math.random() < cfg.chordProb;
    const noteCount = isChord ? (2 + Math.floor(Math.random() * 2)) : 1;

    // Pick notes
    const indices = [];
    const baseIdx = Math.floor(Math.random() * cfg.notes.length);
    indices.push(baseIdx);

    if (isChord) {
      for (let n = 1; n < noteCount; n++) {
        let idx = baseIdx + (n * 2); // roughly thirds
        if (idx >= cfg.notes.length) idx = idx % cfg.notes.length;
        indices.push(idx);
      }
    }

    for (const idx of indices) {
      const freq = cfg.notes[idx];
      this._synthPianoTone(freq, velocity, attack, decay, sustain, release, cfg.reverbAmount, cfg.volume);
    }
  }

  _synthPianoTone(freq, velocity, attack, decay, sustain, release, reverbAmt, volume) {
    const now = this.ctx.currentTime;
    const totalDur = attack + decay + release + 0.5;

    // Main tone: combination of sine harmonics
    const harmonics = [
      { ratio: 1, amp: 1.0 },
      { ratio: 2, amp: 0.4 },
      { ratio: 3, amp: 0.15 },
      { ratio: 4, amp: 0.06 },
      { ratio: 5, amp: 0.03 }
    ];

    const noteGain = this.ctx.createGain();
    const peakGain = velocity * volume;

    // ADSR
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.linearRampToValueAtTime(peakGain, now + attack);
    noteGain.gain.exponentialRampToValueAtTime(
      Math.max(peakGain * sustain, 0.001),
      now + attack + decay
    );
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + attack + decay + release);

    // Dry path
    const dryGain = this.ctx.createGain();
    dryGain.gain.value = 1 - reverbAmt;
    noteGain.connect(dryGain);
    dryGain.connect(this.pianoMasterGain);

    // Wet path (reverb)
    const wetGain = this.ctx.createGain();
    wetGain.gain.value = reverbAmt;
    noteGain.connect(wetGain);
    wetGain.connect(this.pianoConvolver);
    this.pianoConvolver.connect(this.pianoMasterGain);

    for (const h of harmonics) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * h.ratio;

      const hGain = this.ctx.createGain();
      hGain.gain.value = h.amp;

      // Slight detuning for warmth
      osc.detune.value = (Math.random() - 0.5) * 6;

      osc.connect(hGain);
      hGain.connect(noteGain);
      osc.start(now);
      osc.stop(now + totalDur);
    }

    // Hammer attack transient
    const clickOsc = this.ctx.createOscillator();
    clickOsc.type = 'triangle';
    clickOsc.frequency.value = freq * 8;
    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(velocity * 0.08, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    clickOsc.connect(clickGain);
    clickGain.connect(noteGain);
    clickOsc.start(now);
    clickOsc.stop(now + 0.03);
  }

  stopPiano() {
    this.pianoRunning = false;
    if (this.pianoTimerId) {
      clearTimeout(this.pianoTimerId);
      this.pianoTimerId = null;
    }
  }

  // ---- Lifecycle ----
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  stopAll() {
    this.stopRain();
    this.stopPiano();
  }

  destroy() {
    this.stopAll();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}

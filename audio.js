/* ========================================
   Rain View — audio.js
   Procedural rain sounds & ambient piano
   via Web Audio API
   ======================================== */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.rainGain = null;
    this.pianoGain = null;
    this.isInitialized = false;
    this.currentScene = null;
    this.rainNodes = [];
    this.pianoTimeout = null;
    this.thunderTimeout = null;
    this._rainVolume = 0.7;
    this._pianoVolume = 0;
  }

  /* Scene-specific audio configs */
  static CONFIGS = {
    'asian-city': {
      rainFrequency: 3200,
      rainQ: 0.8,
      rainGainValue: 0.35,
      highpassFreq: 800,
      hasThunder: true,
      thunderInterval: [15000, 30000],
      pianoScale: [293.66, 329.63, 392.00, 440.00, 523.25], // D minor pentatonic
      pianoOctaveShift: 1,
      pianoTimbre: 'warm'
    },
    'ny-city': {
      rainFrequency: 2800,
      rainQ: 0.6,
      rainGainValue: 0.30,
      highpassFreq: 600,
      hasThunder: true,
      thunderInterval: [20000, 40000],
      pianoScale: [233.08, 293.66, 349.23, 415.30, 466.16, 523.25], // Bb maj7 arpeggios
      pianoOctaveShift: 1,
      pianoTimbre: 'jazz'
    },
    'autumn-cabin': {
      rainFrequency: 1800,
      rainQ: 0.4,
      rainGainValue: 0.25,
      highpassFreq: 200,
      hasThunder: false,
      pianoScale: [220.00, 261.63, 293.66, 329.63, 392.00, 440.00], // A minor / C major
      pianoOctaveShift: 0.5,
      pianoTimbre: 'soft'
    },
    'japanese-garden': {
      rainFrequency: 2200,
      rainQ: 0.5,
      rainGainValue: 0.18,
      highpassFreq: 400,
      hasThunder: false,
      pianoScale: [329.63, 349.23, 440.00, 493.88, 523.25], // Miyako-bushi: E F A B C
      pianoOctaveShift: 1,
      pianoTimbre: 'ethereal'
    }
  };

  /* Initialize AudioContext on user interaction */
  init() {
    if (this.isInitialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.ctx.destination);

    // Rain bus
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = this._rainVolume;
    this.rainGain.connect(this.masterGain);

    // Piano bus
    this.pianoGain = this.ctx.createGain();
    this.pianoGain.gain.value = this._pianoVolume;
    this.pianoGain.connect(this.masterGain);

    this.isInitialized = true;
  }

  /* Start a scene's audio */
  startScene(sceneId) {
    if (!this.isInitialized) this.init();
    this.stopScene();
    this.currentScene = sceneId;

    const config = AudioEngine.CONFIGS[sceneId];
    if (!config) return;

    // Resume context if suspended
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this._createRain(config);
    this._startPiano(config);
    if (config.hasThunder) {
      this._scheduleThunder(config);
    }
  }

  /* Stop all audio for current scene */
  stopScene() {
    // Stop rain
    this.rainNodes.forEach(node => {
      try { node.stop(); } catch(e) {}
      try { node.disconnect(); } catch(e) {}
    });
    this.rainNodes = [];

    // Stop piano
    if (this.pianoTimeout) {
      clearTimeout(this.pianoTimeout);
      this.pianoTimeout = null;
    }

    // Stop thunder
    if (this.thunderTimeout) {
      clearTimeout(this.thunderTimeout);
      this.thunderTimeout = null;
    }

    this.currentScene = null;
  }

  /* Volume controls */
  setRainVolume(v) {
    this._rainVolume = v;
    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
    }
  }

  setPianoVolume(v) {
    this._pianoVolume = v;
    if (this.pianoGain) {
      this.pianoGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
    }
  }

  /* --- RAIN GENERATION --- */
  _createRain(config) {
    const ctx = this.ctx;

    // Create white noise buffer (2 seconds, looped)
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Primary rain layer — bandpass filtered noise
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = config.rainFrequency;
    bandpass.Q.value = config.rainQ;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = config.highpassFreq;
    highpass.Q.value = 0.5;

    const rainLayerGain = ctx.createGain();
    rainLayerGain.gain.value = config.rainGainValue;

    rainSource.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(rainLayerGain);
    rainLayerGain.connect(this.rainGain);
    rainSource.start();
    this.rainNodes.push(rainSource);

    // Secondary rain layer — low frequency body
    const rainLow = ctx.createBufferSource();
    rainLow.buffer = noiseBuffer;
    rainLow.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 600;
    lowpass.Q.value = 0.3;

    const lowGain = ctx.createGain();
    lowGain.gain.value = config.rainGainValue * 0.4;

    rainLow.connect(lowpass);
    lowpass.connect(lowGain);
    lowGain.connect(this.rainGain);
    rainLow.start();
    this.rainNodes.push(rainLow);

    // Amplitude modulation for natural variation
    this._createAmplitudeModulation(rainLayerGain, 0.08, 0.3);
    this._createAmplitudeModulation(lowGain, 0.05, 0.2);

    // Third layer — high sparkle (rain hits on glass or leaves)
    const sparkle = ctx.createBufferSource();
    sparkle.buffer = noiseBuffer;
    sparkle.loop = true;

    const highBand = ctx.createBiquadFilter();
    highBand.type = 'highpass';
    highBand.frequency.value = 4000;
    highBand.Q.value = 0.3;

    const sparkleGain = ctx.createGain();
    sparkleGain.gain.value = config.rainGainValue * 0.15;

    sparkle.connect(highBand);
    highBand.connect(sparkleGain);
    sparkleGain.connect(this.rainGain);
    sparkle.start();
    this.rainNodes.push(sparkle);
  }

  _createAmplitudeModulation(targetGain, depth, rate) {
    const ctx = this.ctx;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = rate + Math.random() * 0.2;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = depth;

    lfo.connect(lfoGain);
    lfoGain.connect(targetGain.gain);
    lfo.start();
    this.rainNodes.push(lfo);
  }

  /* --- THUNDER --- */
  _scheduleThunder(config) {
    const [minMs, maxMs] = config.thunderInterval;
    const delay = minMs + Math.random() * (maxMs - minMs);

    this.thunderTimeout = setTimeout(() => {
      if (this.currentScene) {
        this._playThunder();
        this._scheduleThunder(config);
      }
    }, delay);
  }

  _playThunder() {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Low rumble noise
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 150 + Math.random() * 100;
    lowpass.Q.value = 0.5;

    const thunderGain = ctx.createGain();
    thunderGain.gain.setValueAtTime(0, now);
    thunderGain.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.06, now + 0.3);
    thunderGain.gain.linearRampToValueAtTime(0.03, now + 1.0);
    thunderGain.gain.linearRampToValueAtTime(0, now + 2.5 + Math.random());

    source.connect(lowpass);
    lowpass.connect(thunderGain);
    thunderGain.connect(this.rainGain);
    source.start(now);
    source.stop(now + 3.5);

    // Dispatch lightning event for visual flash
    window.dispatchEvent(new CustomEvent('lightning'));
  }

  /* --- PIANO GENERATION --- */
  _startPiano(config) {
    const playNote = () => {
      if (!this.currentScene) return;

      // Occasionally play a chord (2-3 notes)
      const noteCount = Math.random() > 0.65 ? (Math.random() > 0.5 ? 3 : 2) : 1;
      const usedIndices = new Set();

      for (let i = 0; i < noteCount; i++) {
        let idx;
        do {
          idx = Math.floor(Math.random() * config.pianoScale.length);
        } while (usedIndices.has(idx) && usedIndices.size < config.pianoScale.length);
        usedIndices.add(idx);

        const baseFreq = config.pianoScale[idx];
        // Occasional octave shift
        const octaveMultiplier = Math.random() > 0.7 ? config.pianoOctaveShift * 2 : config.pianoOctaveShift;
        const freq = baseFreq * octaveMultiplier;

        // Slight delay for chord notes
        const noteDelay = i * (0.05 + Math.random() * 0.1);
        this._playPianoNote(freq, noteDelay, config.pianoTimbre);
      }

      // Schedule next note cluster
      const nextDelay = 2000 + Math.random() * 5000;
      this.pianoTimeout = setTimeout(playNote, nextDelay);
    };

    // Start after a brief initial delay
    this.pianoTimeout = setTimeout(playNote, 1500 + Math.random() * 2000);
  }

  _playPianoNote(freq, delay, timbre) {
    const ctx = this.ctx;
    const now = ctx.currentTime + delay;

    // Fundamental
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;

    // 2nd harmonic (softened)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    // 3rd harmonic (very soft)
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 3;

    const osc1Gain = ctx.createGain();
    const osc2Gain = ctx.createGain();
    const osc3Gain = ctx.createGain();

    // Timbre shaping
    let fundamentalVol, harmonicVol, thirdVol, attackTime, decayTime, sustainLevel, releaseTime;
    switch (timbre) {
      case 'warm':
        fundamentalVol = 0.12; harmonicVol = 0.03; thirdVol = 0.008;
        attackTime = 0.01; decayTime = 0.4; sustainLevel = 0.04; releaseTime = 3.0;
        break;
      case 'jazz':
        fundamentalVol = 0.10; harmonicVol = 0.04; thirdVol = 0.015;
        attackTime = 0.008; decayTime = 0.3; sustainLevel = 0.03; releaseTime = 2.5;
        break;
      case 'soft':
        fundamentalVol = 0.09; harmonicVol = 0.02; thirdVol = 0.005;
        attackTime = 0.02; decayTime = 0.5; sustainLevel = 0.035; releaseTime = 4.0;
        break;
      case 'ethereal':
        fundamentalVol = 0.08; harmonicVol = 0.025; thirdVol = 0.01;
        attackTime = 0.03; decayTime = 0.6; sustainLevel = 0.03; releaseTime = 5.0;
        break;
      default:
        fundamentalVol = 0.10; harmonicVol = 0.03; thirdVol = 0.008;
        attackTime = 0.015; decayTime = 0.4; sustainLevel = 0.035; releaseTime = 3.0;
    }

    // ADSR envelope for fundamental
    osc1Gain.gain.setValueAtTime(0, now);
    osc1Gain.gain.linearRampToValueAtTime(fundamentalVol, now + attackTime);
    osc1Gain.gain.exponentialRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
    osc1Gain.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime + releaseTime);

    osc2Gain.gain.setValueAtTime(0, now);
    osc2Gain.gain.linearRampToValueAtTime(harmonicVol, now + attackTime);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime + releaseTime * 0.6);

    osc3Gain.gain.setValueAtTime(0, now);
    osc3Gain.gain.linearRampToValueAtTime(thirdVol, now + attackTime);
    osc3Gain.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime + releaseTime * 0.4);

    // Simple reverb via delay
    const delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.value = timbre === 'ethereal' ? 0.35 : 0.25;

    const feedbackGain = ctx.createGain();
    feedbackGain.gain.value = timbre === 'ethereal' ? 0.35 : 0.25;

    const reverbFilter = ctx.createBiquadFilter();
    reverbFilter.type = 'lowpass';
    reverbFilter.frequency.value = 2000;

    // Connect oscillators
    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc3.connect(osc3Gain);

    const noteMix = ctx.createGain();
    noteMix.gain.value = 1.0;
    osc1Gain.connect(noteMix);
    osc2Gain.connect(noteMix);
    osc3Gain.connect(noteMix);

    // Dry path
    noteMix.connect(this.pianoGain);

    // Wet path (reverb)
    noteMix.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(reverbFilter);
    reverbFilter.connect(delayNode);
    reverbFilter.connect(this.pianoGain);

    const totalDuration = attackTime + decayTime + releaseTime + 1;
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + totalDuration);
    osc2.stop(now + totalDuration);
    osc3.stop(now + totalDuration);
  }

  /* Cleanup */
  destroy() {
    this.stopScene();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}

// Export as global
window.AudioEngine = AudioEngine;

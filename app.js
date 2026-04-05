/**
 * Rain View v2 — Main App Controller
 * Scene management, UI wiring, transitions
 */
import { RainEngine } from './rain-engine.js';
import { AudioEngine } from './audio-engine.js';

// ---- Scene metadata ----
const SCENES = {
  'asian-city': {
    label: 'Tokyo Evening',
    image: 'assets/scene-asian-city.jpg'
  },
  'ny-city': {
    label: 'New York Night',
    image: 'assets/scene-ny-city.jpg'
  },
  'autumn-cabin': {
    label: 'Autumn Forest',
    image: 'assets/scene-autumn-cabin.jpg'
  },
  'japanese-garden': {
    label: 'Zen Garden',
    image: 'assets/scene-japanese-garden.jpg'
  }
};

class App {
  constructor() {
    this.rainEngine = new RainEngine();
    this.audioEngine = new AudioEngine();
    this.currentScene = null;
    this.controlsTimer = null;
    this.controlsVisible = true;

    // DOM refs
    this.splash = document.getElementById('splash');
    this.sceneView = document.getElementById('scene-view');
    this.sceneImage = document.getElementById('scene-image');
    this.sceneLabel = document.getElementById('scene-label');
    this.controls = document.getElementById('controls');
    this.rainContainer = document.getElementById('rain-container');
    this.glassCanvas = document.getElementById('glass-canvas');
    this.btnBack = document.getElementById('btn-back');
    this.rainVolumeSlider = document.getElementById('rain-volume');
    this.pianoVolumeSlider = document.getElementById('piano-volume');
    this.rainVariantBtns = document.querySelectorAll('#rain-variants .variant-btn');
    this.pianoVariantBtns = document.querySelectorAll('#piano-variants .variant-btn');

    this._init();
  }

  _init() {
    // Initialize Three.js rain engine
    this.rainEngine.init(this.rainContainer, this.glassCanvas);

    // Scene card clicks
    document.querySelectorAll('.scene-card').forEach(card => {
      card.addEventListener('click', () => {
        const sceneId = card.dataset.scene;
        this._enterScene(sceneId);
      });
    });

    // Back button
    this.btnBack.addEventListener('click', () => this._exitScene());

    // Volume sliders
    this.rainVolumeSlider.addEventListener('input', (e) => {
      this.audioEngine.setRainVolume(parseFloat(e.target.value));
    });
    this.pianoVolumeSlider.addEventListener('input', (e) => {
      this.audioEngine.setPianoVolume(parseFloat(e.target.value));
    });

    // Rain variant buttons
    this.rainVariantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.rainVariantBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.audioEngine.setRainVariant(btn.dataset.variant);
      });
    });

    // Piano variant buttons
    this.pianoVariantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.pianoVariantBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.audioEngine.setPianoVariant(btn.dataset.variant);
      });
    });

    // Controls auto-hide
    this._setupAutoHide();

    // Keyboard shortcut: Escape to go back
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentScene) {
        this._exitScene();
      }
    });
  }

  _enterScene(sceneId) {
    if (!SCENES[sceneId]) return;
    this.currentScene = sceneId;

    const scene = SCENES[sceneId];

    // Set background image
    this.sceneImage.src = scene.image;
    this.sceneLabel.textContent = scene.label;

    // Transition
    this.splash.classList.add('hidden');
    this.sceneView.classList.add('active');

    // Start rain engine
    this.rainEngine.setScene(sceneId);
    this.rainEngine.start();

    // Start audio (user gesture required — this comes from click)
    this.audioEngine.init();
    this.audioEngine.resume();
    this.audioEngine.setRainVolume(parseFloat(this.rainVolumeSlider.value));
    this.audioEngine.setPianoVolume(parseFloat(this.pianoVolumeSlider.value));
    this.audioEngine.startRain();
    this.audioEngine.startPiano();

    // Show controls, then auto-hide
    this._showControls();
    this._startAutoHide();
  }

  _exitScene() {
    if (!this.currentScene) return;
    this.currentScene = null;

    // Stop everything
    this.rainEngine.stop();
    this.audioEngine.stopAll();

    // Transition
    this.sceneView.classList.remove('active');
    this.splash.classList.remove('hidden');

    // Clear auto-hide
    if (this.controlsTimer) {
      clearTimeout(this.controlsTimer);
      this.controlsTimer = null;
    }
  }

  _setupAutoHide() {
    const show = () => {
      if (!this.currentScene) return;
      this._showControls();
      this._startAutoHide();
    };

    // Mouse movement shows controls
    this.sceneView.addEventListener('mousemove', show);
    this.sceneView.addEventListener('touchstart', show, { passive: true });

    // Prevent auto-hide while interacting with controls
    this.controls.addEventListener('mouseenter', () => {
      if (this.controlsTimer) {
        clearTimeout(this.controlsTimer);
        this.controlsTimer = null;
      }
    });
    this.controls.addEventListener('mouseleave', () => {
      if (this.currentScene) this._startAutoHide();
    });

    // Touch interactions on controls keep them visible
    this.controls.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      if (this.controlsTimer) {
        clearTimeout(this.controlsTimer);
        this.controlsTimer = null;
      }
    }, { passive: true });

    this.controls.addEventListener('touchend', () => {
      if (this.currentScene) this._startAutoHide();
    }, { passive: true });
  }

  _showControls() {
    this.controls.classList.remove('hidden');
    this.controlsVisible = true;
  }

  _hideControls() {
    this.controls.classList.add('hidden');
    this.controlsVisible = false;
  }

  _startAutoHide() {
    if (this.controlsTimer) clearTimeout(this.controlsTimer);
    this.controlsTimer = setTimeout(() => {
      this._hideControls();
    }, 4000);
  }
}

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => {
  new App();
});

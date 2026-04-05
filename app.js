/* ═══════════════════════════════════════════
   APP.JS — Main Controller for Rain View v4
   ═══════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Scene Metadata (v4: bg + frame layers) ──
  const SCENES = {
    'asian-city': {
      title: 'Tokyo Evening',
      bg: 'assets/bg-tokyo.jpg',
      frame: 'assets/frame-asian-city.webp',
      thumb: 'assets/scene-asian-city.jpg',
      defaultRain: 'window',
      defaultPiano: 'contemplative'
    },
    'ny-city': {
      title: 'New York Night',
      bg: 'assets/bg-nyc.jpg',
      frame: 'assets/frame-ny-city.webp',
      thumb: 'assets/scene-ny-city.jpg',
      defaultRain: 'heavy',
      defaultPiano: 'jazz'
    },
    'autumn-cabin': {
      title: 'Autumn Forest',
      bg: 'assets/bg-autumn.jpg',
      frame: 'assets/frame-autumn-cabin.webp',
      thumb: 'assets/scene-autumn-cabin.jpg',
      defaultRain: 'forest',
      defaultPiano: 'melancholic'
    },
    'japanese-garden': {
      title: 'Zen Garden',
      bg: 'assets/bg-garden.jpg',
      frame: 'assets/frame-japanese-garden.webp',
      thumb: 'assets/scene-japanese-garden.jpg',
      defaultRain: 'gentle',
      defaultPiano: 'ethereal'
    }
  };

  // ── App State ──
  let currentScene = null;
  let controlsTimer = null;
  let controlsVisible = true;
  const CONTROLS_TIMEOUT = 4000;

  // ── Instances ──
  const rainCanvas = new RainCanvas();
  const audioEngine = new AudioEngine();
  audioEngine.preload();

  // ── DOM References ──
  const splash = document.getElementById('splash');
  const sceneView = document.getElementById('scene-view');
  const sceneBg = document.getElementById('scene-bg');
  const sceneFrame = document.getElementById('scene-frame');
  const sceneTitle = document.getElementById('scene-title');
  const controls = document.getElementById('controls');
  const btnBack = document.getElementById('btn-back');
  const rainVolume = document.getElementById('rain-volume');
  const pianoVolume = document.getElementById('piano-volume');

  // ── Scene Card Click ──
  document.querySelectorAll('.scene-card').forEach(card => {
    card.addEventListener('click', () => {
      const sceneId = card.dataset.scene;
      enterScene(sceneId);
    });
  });

  // ── Enter Scene ──
  function enterScene(sceneId) {
    const scene = SCENES[sceneId];
    if (!scene) return;
    currentScene = sceneId;

    // Start audio system on first interaction
    audioEngine.start();

    // Set layer images (bg photograph + foreground frame)
    sceneBg.src = scene.bg;
    sceneBg.alt = scene.title;
    sceneFrame.src = scene.frame;
    sceneFrame.alt = '';
    sceneTitle.textContent = scene.title;

    // Transition: hide splash, show scene
    splash.classList.add('leaving');
    setTimeout(() => {
      splash.classList.add('hidden');
      sceneView.classList.remove('hidden');
      sceneView.classList.add('entering');

      // Start rain canvas
      rainCanvas.start(sceneId);

      // Set default audio variants
      setActiveRainPill(scene.defaultRain);
      setActivePianoPill(scene.defaultPiano);
      audioEngine.setRainVariant(scene.defaultRain);
      audioEngine.setPianoVariant(scene.defaultPiano);

      // Apply volume from sliders
      audioEngine.setRainVolume(rainVolume.value / 100);
      audioEngine.setPianoVolume(pianoVolume.value / 100);

      // Start control auto-hide
      showControls();
      startControlsTimer();
    }, 600);
  }

  // ── Back to Splash ──
  btnBack.addEventListener('click', () => {
    // Stop everything
    rainCanvas.stop();
    audioEngine.stopAll();
    currentScene = null;

    // Transition
    sceneView.classList.add('hidden');
    sceneView.classList.remove('entering');
    splash.classList.remove('hidden', 'leaving');

    clearControlsTimer();
  });

  // ── Rain Variant Pills ──
  document.querySelectorAll('[data-rain]').forEach(pill => {
    pill.addEventListener('click', () => {
      const variant = pill.dataset.rain;
      setActiveRainPill(variant);
      audioEngine.setRainVariant(variant);
    });
  });

  // ── Piano Variant Pills ──
  document.querySelectorAll('[data-piano]').forEach(pill => {
    pill.addEventListener('click', () => {
      const variant = pill.dataset.piano;
      setActivePianoPill(variant);
      audioEngine.setPianoVariant(variant);
    });
  });

  // ── Volume Sliders ──
  rainVolume.addEventListener('input', () => {
    audioEngine.setRainVolume(rainVolume.value / 100);
  });

  pianoVolume.addEventListener('input', () => {
    audioEngine.setPianoVolume(pianoVolume.value / 100);
  });

  // ── Pill Active State Helpers ──
  function setActiveRainPill(variant) {
    document.querySelectorAll('[data-rain]').forEach(p => p.classList.remove('active'));
    const pill = document.querySelector(`[data-rain="${variant}"]`);
    if (pill) pill.classList.add('active');
  }

  function setActivePianoPill(variant) {
    document.querySelectorAll('[data-piano]').forEach(p => p.classList.remove('active'));
    const pill = document.querySelector(`[data-piano="${variant}"]`);
    if (pill) pill.classList.add('active');
  }

  // ── Controls Auto-Hide ──
  function showControls() {
    controls.classList.remove('auto-hidden');
    controlsVisible = true;
  }

  function hideControls() {
    controls.classList.add('auto-hidden');
    controlsVisible = false;
  }

  function startControlsTimer() {
    clearControlsTimer();
    controlsTimer = setTimeout(hideControls, CONTROLS_TIMEOUT);
  }

  function clearControlsTimer() {
    if (controlsTimer) {
      clearTimeout(controlsTimer);
      controlsTimer = null;
    }
  }

  // Show controls on mouse move / touch
  function onActivity() {
    if (!currentScene) return;
    showControls();
    startControlsTimer();
  }

  sceneView.addEventListener('mousemove', onActivity);
  sceneView.addEventListener('touchstart', onActivity, { passive: true });
  sceneView.addEventListener('click', (e) => {
    // If clicking on the scene area (not controls), toggle controls
    if (e.target === sceneView || e.target.closest('.scene-bg-layer') || e.target.id === 'rain-canvas' || e.target.closest('.scene-frame-layer') || e.target.closest('.scene-vignette')) {
      if (controlsVisible) {
        hideControls();
        clearControlsTimer();
      } else {
        onActivity();
      }
    }
  });

  // Pause auto-hide when hovering over controls
  controls.addEventListener('mouseenter', clearControlsTimer);
  controls.addEventListener('mouseleave', () => {
    if (currentScene) startControlsTimer();
  });

})();

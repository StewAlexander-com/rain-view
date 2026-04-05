/* ========================================
   Rain View — app.js
   Main application logic, scene management, UI
   ======================================== */

(function() {
  'use strict';

  /* --- Scene Data --- */
  const SCENES = {
    'asian-city': {
      id: 'asian-city',
      title: 'Tokyo Evening',
      desc: 'Neon-lit streets through rain-kissed glass',
      image: 'assets/scene-asian-city.jpg',
      hasGlass: true
    },
    'ny-city': {
      id: 'ny-city',
      title: 'New York Night',
      desc: 'Manhattan skyline, steam, and amber light',
      image: 'assets/scene-ny-city.jpg',
      hasGlass: true
    },
    'autumn-cabin': {
      id: 'autumn-cabin',
      title: 'Autumn Cabin',
      desc: 'Fall foliage veiled in mountain mist',
      image: 'assets/scene-autumn-cabin.jpg',
      hasGlass: false
    },
    'japanese-garden': {
      id: 'japanese-garden',
      title: 'Zen Garden',
      desc: 'Cherry blossoms and rain on still water',
      image: 'assets/scene-japanese-garden.jpg',
      hasGlass: false
    }
  };

  /* --- State --- */
  let currentScene = null;
  let audioEngine = null;
  let rainRenderer = null;
  let controlsTimer = null;
  let controlsVisible = true;

  /* --- DOM References --- */
  const splash = document.getElementById('splash');
  const sceneView = document.getElementById('scene-view');
  const sceneImage = document.getElementById('scene-image');
  const sceneBackground = document.querySelector('.scene-background');
  const rainCanvas = document.getElementById('rain-canvas');
  const controls = document.querySelector('.controls');
  const sceneLabel = document.getElementById('scene-label');
  const rainSlider = document.getElementById('rain-volume');
  const pianoSlider = document.getElementById('piano-volume');
  const btnBack = document.getElementById('btn-back');

  /* --- Initialize --- */
  function init() {
    // Create engines
    audioEngine = new AudioEngine();
    rainRenderer = new RainRenderer(rainCanvas);

    // Set up scene cards
    const cards = document.querySelectorAll('.scene-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const sceneId = card.dataset.scene;
        enterScene(sceneId);
      });
    });

    // Back button
    btnBack.addEventListener('click', exitScene);

    // Volume sliders
    rainSlider.addEventListener('input', (e) => {
      audioEngine.setRainVolume(parseFloat(e.target.value));
    });

    pianoSlider.addEventListener('input', (e) => {
      audioEngine.setPianoVolume(parseFloat(e.target.value));
    });

    // Controls auto-hide
    setupControlsAutoHide();

    // Preload images
    preloadImages();
  }

  /* --- Preload scene images --- */
  function preloadImages() {
    Object.values(SCENES).forEach(scene => {
      const img = new Image();
      img.src = scene.image;
    });
  }

  /* --- Enter Scene --- */
  function enterScene(sceneId) {
    const scene = SCENES[sceneId];
    if (!scene) return;
    currentScene = scene;

    // Set background image
    sceneImage.src = scene.image;

    // Glass effect for city scenes
    if (scene.hasGlass) {
      sceneBackground.classList.add('glass-effect');
    } else {
      sceneBackground.classList.remove('glass-effect');
    }

    // Set scene label
    sceneLabel.textContent = scene.title;

    // Reset sliders
    rainSlider.value = 0.7;
    pianoSlider.value = 0;

    // Transition: hide splash, show scene
    splash.classList.add('hidden');
    sceneView.classList.add('active');

    // Start audio (must be on user click for Web Audio policy)
    audioEngine.init();
    audioEngine.setRainVolume(0.7);
    audioEngine.setPianoVolume(0);
    audioEngine.startScene(sceneId);

    // Start rain rendering
    rainRenderer.start(sceneId);

    // Show controls
    showControls();
  }

  /* --- Exit Scene --- */
  function exitScene() {
    // Stop everything
    audioEngine.stopScene();
    rainRenderer.stop();

    // Transition
    sceneView.classList.remove('active');

    // Small delay to let the fade-out happen, then show splash
    setTimeout(() => {
      splash.classList.remove('hidden');
    }, 100);

    currentScene = null;
  }

  /* --- Controls Auto-Hide --- */
  function setupControlsAutoHide() {
    let idleTimer = null;

    function resetIdle() {
      if (!currentScene) return;
      showControls();

      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        hideControls();
      }, 3000);
    }

    // Mouse movement
    document.addEventListener('mousemove', resetIdle);

    // Touch
    document.addEventListener('touchstart', (e) => {
      // If controls are hidden, show them; if visible, don't hide on this touch
      resetIdle();
    }, { passive: true });

    // Prevent hiding when interacting with controls
    if (controls) {
      controls.addEventListener('mouseenter', () => {
        clearTimeout(idleTimer);
      });
      controls.addEventListener('mouseleave', () => {
        if (currentScene) {
          idleTimer = setTimeout(() => {
            hideControls();
          }, 3000);
        }
      });

      // Also keep visible when touching controls
      controls.addEventListener('touchstart', (e) => {
        clearTimeout(idleTimer);
      }, { passive: true });
      controls.addEventListener('touchend', () => {
        if (currentScene) {
          idleTimer = setTimeout(() => {
            hideControls();
          }, 3000);
        }
      }, { passive: true });
    }
  }

  function showControls() {
    controlsVisible = true;
    controls.classList.remove('hidden');
  }

  function hideControls() {
    controlsVisible = false;
    controls.classList.add('hidden');
  }

  /* --- Keyboard Support --- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentScene) {
      exitScene();
    }
  });

  /* --- Start App --- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

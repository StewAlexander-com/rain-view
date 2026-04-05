/**
 * Rain Engine v2 — Three.js 3D rain with splash particles, glass overlay, cherry blossom petals
 */
import * as THREE from 'three';

// ---- Scene-specific rain configs ----
const RAIN_CONFIGS = {
  'asian-city': {
    count: 3000, speed: 15, windX: 0.5, windZ: 0, spread: 30,
    groundY: -8, splashIntensity: 1.0,
    hasGlassDrops: true, glassDropCount: 300,
    lightningEnabled: true, hasPetals: false
  },
  'ny-city': {
    count: 2500, speed: 13, windX: 1.0, windZ: 0, spread: 30,
    groundY: -8, splashIntensity: 0.8,
    hasGlassDrops: true, glassDropCount: 200,
    lightningEnabled: true, hasPetals: false
  },
  'autumn-cabin': {
    count: 2000, speed: 10, windX: 2.0, windZ: 0.5, spread: 40,
    groundY: -5, splashIntensity: 0.6,
    hasGlassDrops: false, glassDropCount: 0,
    lightningEnabled: false, hasPetals: false
  },
  'japanese-garden': {
    count: 1500, speed: 8, windX: 0.3, windZ: 0.2, spread: 35,
    groundY: -5, splashIntensity: 0.5,
    hasGlassDrops: false, glassDropCount: 0,
    lightningEnabled: false, hasPetals: true
  }
};

// ---- Shaders ----
const rainVertexShader = `
  attribute float size;
  attribute float opacity;
  varying float vOpacity;

  void main() {
    vOpacity = opacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 8.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const rainFragmentShader = `
  varying float vOpacity;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center * vec2(1.0, 0.3));
    float alpha = smoothstep(0.5, 0.0, dist) * vOpacity;
    gl_FragColor = vec4(0.7, 0.8, 0.95, alpha);
  }
`;

const splashVertexShader = `
  attribute float size;
  attribute float opacity;
  attribute float life;
  varying float vOpacity;
  varying float vLife;

  void main() {
    vOpacity = opacity;
    vLife = life;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (200.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 0.5, 6.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const splashFragmentShader = `
  varying float vOpacity;
  varying float vLife;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.0, dist) * vOpacity * vLife;
    gl_FragColor = vec4(0.85, 0.9, 1.0, alpha);
  }
`;

const petalVertexShader = `
  attribute float size;
  attribute float opacity;
  attribute float rotation;
  varying float vOpacity;
  varying float vRotation;

  void main() {
    vOpacity = opacity;
    vRotation = rotation;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 2.0, 20.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const petalFragmentShader = `
  varying float vOpacity;
  varying float vRotation;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float c = cos(vRotation);
    float s = sin(vRotation);
    vec2 ruv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    // Petal shape: ellipse
    float dist = length(ruv * vec2(1.0, 2.0));
    float alpha = smoothstep(0.45, 0.15, dist) * vOpacity;
    vec3 col = mix(vec3(1.0, 0.75, 0.8), vec3(1.0, 0.85, 0.88), ruv.y + 0.5);
    gl_FragColor = vec4(col, alpha);
  }
`;

// Detect mobile
const isMobile = window.innerWidth < 768;
const MOBILE_FACTOR = isMobile ? 0.5 : 1.0;

export class RainEngine {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.config = null;
    this.running = false;
    this.animId = null;
    this.clock = new THREE.Clock();

    // Particle systems
    this.rainGeo = null;
    this.rainMat = null;
    this.rainPoints = null;
    this.rainVelocities = [];

    this.splashGeo = null;
    this.splashMat = null;
    this.splashPoints = null;
    this.splashData = [];

    this.petalGeo = null;
    this.petalMat = null;
    this.petalPoints = null;
    this.petalData = [];

    // Glass droplets (2D)
    this.glassCanvas = null;
    this.glassCtx = null;
    this.glassDrops = [];
    this.glassFrame = 0;

    // Lightning
    this.lightningTimer = 0;
    this.lightningFlash = 0;

    // Container
    this.container = null;
  }

  init(container, glassCanvas) {
    this.container = container;
    this.glassCanvas = glassCanvas;
    if (glassCanvas) {
      this.glassCtx = glassCanvas.getContext('2d');
    }

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera — fixed perspective looking forward
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 15);
    this.camera.lookAt(0, 0, 0);

    // Resize handler
    this._onResize = () => this._handleResize();
    window.addEventListener('resize', this._onResize);
  }

  _handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.glassCanvas) {
      this.glassCanvas.width = w;
      this.glassCanvas.height = h;
    }
  }

  setScene(sceneId) {
    this.config = RAIN_CONFIGS[sceneId];
    if (!this.config) return;

    // Clear previous
    this._clearParticles();

    // Create rain
    this._createRain();

    // Create splashes
    this._createSplashes();

    // Create petals if needed
    if (this.config.hasPetals) {
      this._createPetals();
    }

    // Setup glass droplets if city scene
    if (this.config.hasGlassDrops && this.glassCanvas) {
      this.glassCanvas.classList.add('active');
      this.glassCanvas.width = window.innerWidth;
      this.glassCanvas.height = window.innerHeight;
      this._initGlassDrops();
    } else if (this.glassCanvas) {
      this.glassCanvas.classList.remove('active');
      this.glassDrops = [];
    }

    // Reset lightning
    this.lightningTimer = Math.random() * 15 + 8;
    this.lightningFlash = 0;
  }

  _clearParticles() {
    if (this.rainPoints) {
      this.scene.remove(this.rainPoints);
      this.rainGeo.dispose();
      this.rainMat.dispose();
      this.rainPoints = null;
    }
    if (this.splashPoints) {
      this.scene.remove(this.splashPoints);
      this.splashGeo.dispose();
      this.splashMat.dispose();
      this.splashPoints = null;
    }
    if (this.petalPoints) {
      this.scene.remove(this.petalPoints);
      this.petalGeo.dispose();
      this.petalMat.dispose();
      this.petalPoints = null;
    }
    this.rainVelocities = [];
    this.splashData = [];
    this.petalData = [];
  }

  _createRain() {
    const cfg = this.config;
    const count = Math.floor(cfg.count * MOBILE_FACTOR);

    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    this.rainVelocities = [];

    const spread = cfg.spread;
    const topY = 15;
    const range = topY - cfg.groundY;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * spread;
      positions[i3 + 1] = cfg.groundY + Math.random() * range;
      positions[i3 + 2] = (Math.random() - 0.5) * spread * 0.6;

      sizes[i] = 1.5 + Math.random() * 2.5;
      opacities[i] = 0.2 + Math.random() * 0.5;

      this.rainVelocities.push({
        y: -(cfg.speed * (0.7 + Math.random() * 0.6)),
        x: cfg.windX * (0.5 + Math.random() * 1.0),
        z: cfg.windZ * (0.5 + Math.random() * 1.0)
      });
    }

    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.rainGeo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    this.rainMat = new THREE.ShaderMaterial({
      vertexShader: rainVertexShader,
      fragmentShader: rainFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.rainPoints = new THREE.Points(this.rainGeo, this.rainMat);
    this.scene.add(this.rainPoints);
  }

  _createSplashes() {
    const cfg = this.config;
    const maxSplashes = Math.floor(300 * MOBILE_FACTOR);

    const positions = new Float32Array(maxSplashes * 3);
    const sizes = new Float32Array(maxSplashes);
    const opacities = new Float32Array(maxSplashes);
    const lives = new Float32Array(maxSplashes);
    this.splashData = [];

    for (let i = 0; i < maxSplashes; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = -100; // hidden below view
      positions[i3 + 2] = 0;
      sizes[i] = 0;
      opacities[i] = 0;
      lives[i] = 0;

      this.splashData.push({
        active: false,
        vx: 0, vy: 0, vz: 0,
        life: 0, maxLife: 0
      });
    }

    this.splashGeo = new THREE.BufferGeometry();
    this.splashGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.splashGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.splashGeo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    this.splashGeo.setAttribute('life', new THREE.BufferAttribute(lives, 1));

    this.splashMat = new THREE.ShaderMaterial({
      vertexShader: splashVertexShader,
      fragmentShader: splashFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.splashPoints = new THREE.Points(this.splashGeo, this.splashMat);
    this.scene.add(this.splashPoints);
  }

  _spawnSplash(x, z) {
    const cfg = this.config;
    const numParts = 3 + Math.floor(Math.random() * 3);
    let spawned = 0;

    for (let i = 0; i < this.splashData.length && spawned < numParts; i++) {
      if (!this.splashData[i].active) {
        const sd = this.splashData[i];
        sd.active = true;
        sd.life = 0;
        sd.maxLife = 0.2 + Math.random() * 0.3;
        sd.vx = (Math.random() - 0.5) * 3;
        sd.vy = 2 + Math.random() * 4;
        sd.vz = (Math.random() - 0.5) * 3;

        const pos = this.splashGeo.attributes.position;
        const i3 = i * 3;
        pos.array[i3] = x + (Math.random() - 0.5) * 0.3;
        pos.array[i3 + 1] = cfg.groundY;
        pos.array[i3 + 2] = z + (Math.random() - 0.5) * 0.3;

        this.splashGeo.attributes.size.array[i] = 1.0 + Math.random() * 1.5;
        this.splashGeo.attributes.opacity.array[i] = 0.6 + Math.random() * 0.4;
        this.splashGeo.attributes.life.array[i] = 1.0;

        spawned++;
      }
    }
  }

  _createPetals() {
    const count = Math.floor(25 * MOBILE_FACTOR);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    const rotations = new Float32Array(count);
    this.petalData = [];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 35;
      positions[i3 + 1] = -5 + Math.random() * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;
      sizes[i] = 4 + Math.random() * 6;
      opacities[i] = 0.4 + Math.random() * 0.4;
      rotations[i] = Math.random() * Math.PI * 2;

      this.petalData.push({
        baseX: positions[i3],
        baseY: positions[i3 + 1],
        phase: Math.random() * Math.PI * 2,
        wobbleAmp: 1 + Math.random() * 3,
        wobbleFreq: 0.3 + Math.random() * 0.5,
        fallSpeed: 0.3 + Math.random() * 0.5,
        rotSpeed: 0.3 + Math.random() * 0.8,
        driftX: (Math.random() - 0.5) * 0.5
      });
    }

    this.petalGeo = new THREE.BufferGeometry();
    this.petalGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.petalGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.petalGeo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    this.petalGeo.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1));

    this.petalMat = new THREE.ShaderMaterial({
      vertexShader: petalVertexShader,
      fragmentShader: petalFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.petalPoints = new THREE.Points(this.petalGeo, this.petalMat);
    this.scene.add(this.petalPoints);
  }

  // ---- Glass Droplets (2D Canvas Overlay) ----
  _initGlassDrops() {
    this.glassDrops = [];
    const count = Math.floor(this.config.glassDropCount * MOBILE_FACTOR);
    const w = this.glassCanvas.width;
    const h = this.glassCanvas.height;

    for (let i = 0; i < count; i++) {
      this.glassDrops.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: 1 + Math.random() * 3,
        opacity: 0.15 + Math.random() * 0.35,
        static: Math.random() > 0.1, // 90% static, 10% trickling
        vy: 0,
        life: Math.random() * 200
      });
    }
  }

  _updateGlassDrops() {
    if (!this.glassCtx || this.glassDrops.length === 0) return;
    this.glassFrame++;
    if (this.glassFrame % 2 !== 0) return; // 30fps

    const ctx = this.glassCtx;
    const w = this.glassCanvas.width;
    const h = this.glassCanvas.height;
    ctx.clearRect(0, 0, w, h);

    for (const drop of this.glassDrops) {
      if (!drop.static) {
        drop.life++;
        if (drop.life > 100) {
          // Start trickling
          drop.vy += 0.02 + Math.random() * 0.01;
          drop.y += drop.vy;
          drop.x += (Math.random() - 0.5) * 0.3;

          if (drop.y > h + 10) {
            drop.y = -5;
            drop.x = Math.random() * w;
            drop.vy = 0;
            drop.life = 0;
            drop.radius = 1 + Math.random() * 3;
          }
        }
      }

      // Draw droplet with subtle refraction effect
      const r = drop.radius;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, r, 0, Math.PI * 2);

      // Outer glow
      const gradient = ctx.createRadialGradient(
        drop.x - r * 0.3, drop.y - r * 0.3, 0,
        drop.x, drop.y, r
      );
      gradient.addColorStop(0, `rgba(200, 220, 255, ${drop.opacity * 0.6})`);
      gradient.addColorStop(0.5, `rgba(150, 180, 220, ${drop.opacity * 0.3})`);
      gradient.addColorStop(1, `rgba(100, 140, 200, ${drop.opacity * 0.1})`);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(drop.x - r * 0.25, drop.y - r * 0.25, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${drop.opacity * 0.5})`;
      ctx.fill();
    }

    // Occasional new trickle spawner
    if (Math.random() < 0.02) {
      const idx = Math.floor(Math.random() * this.glassDrops.length);
      if (this.glassDrops[idx].static) {
        this.glassDrops[idx].static = false;
        this.glassDrops[idx].life = 80; // about to start trickling
      }
    }
  }

  // ---- Animation Loop ----
  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this._animate();
  }

  stop() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  _animate() {
    if (!this.running) return;
    this.animId = requestAnimationFrame(() => this._animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    if (!this.config) return;

    this._updateRain(delta);
    this._updateSplashes(delta);
    if (this.config.hasPetals) this._updatePetals(delta);
    if (this.config.hasGlassDrops) this._updateGlassDrops();
    if (this.config.lightningEnabled) this._updateLightning(delta);

    this.renderer.render(this.scene, this.camera);
  }

  _updateRain(delta) {
    const cfg = this.config;
    const pos = this.rainGeo.attributes.position;
    const count = this.rainVelocities.length;
    const topY = 15;
    const spread = cfg.spread;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const vel = this.rainVelocities[i];

      pos.array[i3] += vel.x * delta;
      pos.array[i3 + 1] += vel.y * delta;
      pos.array[i3 + 2] += vel.z * delta;

      // Hit ground
      if (pos.array[i3 + 1] < cfg.groundY) {
        // Splash at impact
        if (Math.random() < cfg.splashIntensity * 0.3) {
          this._spawnSplash(pos.array[i3], pos.array[i3 + 2]);
        }
        // Respawn at top
        pos.array[i3] = (Math.random() - 0.5) * spread;
        pos.array[i3 + 1] = topY + Math.random() * 3;
        pos.array[i3 + 2] = (Math.random() - 0.5) * spread * 0.6;
      }

      // Wrap X if blown off screen
      if (pos.array[i3] > spread * 0.5) {
        pos.array[i3] = -spread * 0.5;
      }
    }

    pos.needsUpdate = true;
  }

  _updateSplashes(delta) {
    const pos = this.splashGeo.attributes.position;
    const lives = this.splashGeo.attributes.life;
    const opacities = this.splashGeo.attributes.opacity;
    const gravity = -15;

    for (let i = 0; i < this.splashData.length; i++) {
      const sd = this.splashData[i];
      if (!sd.active) continue;

      sd.life += delta;
      const t = sd.life / sd.maxLife;

      if (t >= 1.0) {
        sd.active = false;
        const i3 = i * 3;
        pos.array[i3 + 1] = -100;
        lives.array[i] = 0;
        continue;
      }

      const i3 = i * 3;
      pos.array[i3] += sd.vx * delta;
      pos.array[i3 + 1] += sd.vy * delta;
      pos.array[i3 + 2] += sd.vz * delta;
      sd.vy += gravity * delta;

      lives.array[i] = 1.0 - t;
    }

    pos.needsUpdate = true;
    lives.needsUpdate = true;
    opacities.needsUpdate = true;
  }

  _updatePetals(delta) {
    const pos = this.petalGeo.attributes.position;
    const rots = this.petalGeo.attributes.rotation;
    const time = this.clock.elapsedTime;

    for (let i = 0; i < this.petalData.length; i++) {
      const pd = this.petalData[i];
      const i3 = i * 3;

      // Float down slowly
      pos.array[i3 + 1] -= pd.fallSpeed * delta;

      // Wobble side to side
      pos.array[i3] = pd.baseX + Math.sin(time * pd.wobbleFreq + pd.phase) * pd.wobbleAmp;
      pd.baseX += pd.driftX * delta;

      // Slow rotation
      rots.array[i] += pd.rotSpeed * delta;

      // Reset at bottom
      if (pos.array[i3 + 1] < -6) {
        pos.array[i3 + 1] = 16;
        pd.baseX = (Math.random() - 0.5) * 35;
        pos.array[i3] = pd.baseX;
      }
    }

    pos.needsUpdate = true;
    rots.needsUpdate = true;
  }

  _updateLightning(delta) {
    this.lightningTimer -= delta;

    if (this.lightningFlash > 0) {
      this.lightningFlash -= delta * 3;
      if (this.lightningFlash < 0) this.lightningFlash = 0;
      // Flash the renderer clear color slightly
      const f = this.lightningFlash * 0.15;
      this.renderer.setClearColor(new THREE.Color(f, f, f * 1.1), this.lightningFlash * 0.1);
    } else {
      this.renderer.setClearColor(0x000000, 0);
    }

    if (this.lightningTimer <= 0) {
      this.lightningFlash = 1.0;
      this.lightningTimer = 10 + Math.random() * 25;
    }
  }

  // ---- Cleanup ----
  destroy() {
    this.stop();
    this._clearParticles();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    if (this.glassCanvas) {
      this.glassCanvas.classList.remove('active');
    }
    window.removeEventListener('resize', this._onResize);
  }
}

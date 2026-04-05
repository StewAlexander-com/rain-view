/* ========================================
   Rain View — rain.js
   2D Canvas rain-on-glass / open rain effects
   ======================================== */

class RainRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.drops = [];
    this.streaks = [];
    this.staticDrops = [];
    this.petals = [];
    this.fogParticles = [];
    this.config = null;
    this.animationId = null;
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / 30; // 30fps cap
    this.lightningAlpha = 0;
    this.isMobile = window.innerWidth < 768;
    this._resizeBound = this._resize.bind(this);
    this._lightningBound = this._onLightning.bind(this);

    window.addEventListener('resize', this._resizeBound);
    window.addEventListener('lightning', this._lightningBound);
    this._resize();
  }

  /* Scene rain configurations */
  static CONFIGS = {
    'asian-city': {
      hasGlass: true,
      staticDropCount: 350,
      streakCount: 60,
      maxDropSize: 3.5,
      minSpeed: 4,
      maxSpeed: 10,
      windAngle: 0.02,
      dropOpacityBase: 0.3,
      streakLength: 25,
      hasLightning: true,
      hasFog: false,
      hasPetals: false,
      accentColor: [255, 100, 200] // Neon pink tint
    },
    'ny-city': {
      hasGlass: true,
      staticDropCount: 250,
      streakCount: 80,
      maxDropSize: 3,
      minSpeed: 5,
      maxSpeed: 12,
      windAngle: 0.03,
      dropOpacityBase: 0.25,
      streakLength: 30,
      hasLightning: true,
      hasFog: false,
      hasPetals: false,
      accentColor: [255, 190, 80] // Amber tint
    },
    'autumn-cabin': {
      hasGlass: false,
      staticDropCount: 0,
      streakCount: 120,
      maxDropSize: 2,
      minSpeed: 6,
      maxSpeed: 14,
      windAngle: 0.12,
      dropOpacityBase: 0.15,
      streakLength: 35,
      hasLightning: false,
      hasFog: true,
      hasPetals: false,
      fogColor: [200, 180, 150],
      accentColor: [210, 140, 60] // Burnt orange
    },
    'japanese-garden': {
      hasGlass: false,
      staticDropCount: 0,
      streakCount: 70,
      maxDropSize: 1.5,
      minSpeed: 3,
      maxSpeed: 8,
      windAngle: 0.05,
      dropOpacityBase: 0.12,
      streakLength: 20,
      hasLightning: false,
      hasFog: true,
      hasPetals: true,
      petalCount: 15,
      fogColor: [200, 190, 200],
      accentColor: [255, 180, 200] // Soft pink
    }
  };

  /* Start rendering a scene */
  start(sceneId) {
    this.stop();
    this.config = RainRenderer.CONFIGS[sceneId];
    if (!this.config) return;

    const mobileMultiplier = this.isMobile ? 0.5 : 1;

    // Initialize static drops (glass scenes)
    if (this.config.hasGlass) {
      this._initStaticDrops(Math.floor(this.config.staticDropCount * mobileMultiplier));
    }

    // Initialize falling streaks
    this._initStreaks(Math.floor(this.config.streakCount * mobileMultiplier));

    // Initialize fog particles
    if (this.config.hasFog) {
      this._initFog();
    }

    // Initialize cherry petals
    if (this.config.hasPetals) {
      this._initPetals(Math.floor((this.config.petalCount || 12) * mobileMultiplier));
    }

    this.lastFrameTime = 0;
    this._animate(0);
  }

  /* Stop rendering */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.drops = [];
    this.streaks = [];
    this.staticDrops = [];
    this.petals = [];
    this.fogParticles = [];
    this.lightningAlpha = 0;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /* --- INITIALIZATION --- */
  _initStaticDrops(count) {
    this.staticDrops = [];
    for (let i = 0; i < count; i++) {
      this.staticDrops.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * this.config.maxDropSize + 0.8,
        opacity: Math.random() * 0.5 + 0.2,
        isMoving: false,
        moveSpeed: 0,
        trailLength: 0,
        mergeTimer: Math.random() * 600,
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  _initStreaks(count) {
    this.streaks = [];
    for (let i = 0; i < count; i++) {
      this.streaks.push(this._createStreak());
    }
  }

  _createStreak() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    return {
      x: Math.random() * (w + 100) - 50,
      y: Math.random() * -h,
      speed: this.config.minSpeed + Math.random() * this.config.maxSpeed,
      length: this.config.streakLength * (0.5 + Math.random()),
      opacity: this.config.dropOpacityBase + Math.random() * 0.15,
      thickness: Math.random() * 1.5 + 0.5
    };
  }

  _initFog() {
    this.fogParticles = [];
    const count = this.isMobile ? 3 : 5;
    for (let i = 0; i < count; i++) {
      this.fogParticles.push({
        x: Math.random() * this.canvas.width,
        y: this.canvas.height * (0.4 + Math.random() * 0.5),
        width: this.canvas.width * (0.4 + Math.random() * 0.5),
        height: this.canvas.height * (0.15 + Math.random() * 0.15),
        speed: 0.15 + Math.random() * 0.3,
        opacity: 0.03 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  _initPetals(count) {
    this.petals = [];
    for (let i = 0; i < count; i++) {
      this.petals.push(this._createPetal());
    }
  }

  _createPetal() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * -this.canvas.height * 0.5,
      size: 3 + Math.random() * 5,
      speedX: 0.2 + Math.random() * 0.5,
      speedY: 0.4 + Math.random() * 0.8,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.03,
      opacity: 0.3 + Math.random() * 0.4,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.01 + Math.random() * 0.02
    };
  }

  /* --- ANIMATION LOOP --- */
  _animate(timestamp) {
    this.animationId = requestAnimationFrame(this._animate.bind(this));

    // 30fps cap
    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed < this.frameInterval) return;
    this.lastFrameTime = timestamp - (elapsed % this.frameInterval);

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Lightning flash
    if (this.lightningAlpha > 0) {
      ctx.fillStyle = `rgba(220, 225, 255, ${this.lightningAlpha})`;
      ctx.fillRect(0, 0, w, h);
      this.lightningAlpha *= 0.92;
      if (this.lightningAlpha < 0.005) this.lightningAlpha = 0;
    }

    // Draw fog
    if (this.config.hasFog) {
      this._drawFog(ctx, w, h, timestamp);
    }

    // Draw static drops (glass scenes)
    if (this.config.hasGlass) {
      this._drawStaticDrops(ctx, w, h);
    }

    // Draw falling streaks
    this._drawStreaks(ctx, w, h);

    // Draw petals
    if (this.config.hasPetals) {
      this._drawPetals(ctx, w, h);
    }
  }

  /* --- DRAW FUNCTIONS --- */
  _drawStaticDrops(ctx, w, h) {
    for (const drop of this.staticDrops) {
      // Merge/trickle timer
      drop.mergeTimer--;
      if (drop.mergeTimer <= 0 && !drop.isMoving) {
        if (Math.random() > 0.97) {
          drop.isMoving = true;
          drop.moveSpeed = 0.5 + Math.random() * 1.5;
          drop.trailLength = 0;
        }
        drop.mergeTimer = 200 + Math.random() * 400;
      }

      // Move trickling drops
      if (drop.isMoving) {
        drop.y += drop.moveSpeed;
        drop.trailLength += drop.moveSpeed;
        drop.wobble += 0.1;

        // Draw wet trail
        ctx.beginPath();
        ctx.strokeStyle = `rgba(200, 210, 220, ${drop.opacity * 0.25})`;
        ctx.lineWidth = drop.size * 0.6;
        ctx.moveTo(drop.x, drop.y - drop.trailLength);
        ctx.lineTo(drop.x + Math.sin(drop.wobble) * 1.5, drop.y);
        ctx.stroke();

        // Reset if off screen or trail too long
        if (drop.y > h || drop.trailLength > 80 + Math.random() * 60) {
          drop.y = Math.random() * h * 0.3;
          drop.x = Math.random() * w;
          drop.isMoving = false;
          drop.trailLength = 0;
          drop.moveSpeed = 0;
        }
      }

      // Draw the drop itself
      ctx.save();

      // Refraction glow (brightening behind drop)
      const glowSize = drop.size * 2.5;
      const glow = ctx.createRadialGradient(
        drop.x, drop.y, 0,
        drop.x, drop.y, glowSize
      );
      glow.addColorStop(0, `rgba(220, 230, 245, ${drop.opacity * 0.35})`);
      glow.addColorStop(1, 'rgba(220, 230, 245, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Drop body
      ctx.fillStyle = `rgba(200, 215, 235, ${drop.opacity})`;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = `rgba(255, 255, 255, ${drop.opacity * 0.6})`;
      ctx.beginPath();
      ctx.arc(drop.x - drop.size * 0.25, drop.y - drop.size * 0.25, drop.size * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  _drawStreaks(ctx, w, h) {
    const windAngle = this.config.windAngle;

    for (const streak of this.streaks) {
      // Update position
      streak.y += streak.speed;
      streak.x += streak.speed * windAngle;

      // Draw streak
      ctx.beginPath();
      ctx.strokeStyle = `rgba(200, 210, 225, ${streak.opacity})`;
      ctx.lineWidth = streak.thickness;
      ctx.lineCap = 'round';

      const endX = streak.x - windAngle * streak.length;
      const endY = streak.y - streak.length;

      ctx.moveTo(endX, endY);
      ctx.lineTo(streak.x, streak.y);
      ctx.stroke();

      // Reset if off screen
      if (streak.y > h + 20 || streak.x > w + 50 || streak.x < -50) {
        streak.x = Math.random() * (w + 100) - 50;
        streak.y = Math.random() * -100;
        streak.speed = this.config.minSpeed + Math.random() * this.config.maxSpeed;
        streak.length = this.config.streakLength * (0.5 + Math.random());
        streak.opacity = this.config.dropOpacityBase + Math.random() * 0.15;
      }
    }
  }

  _drawFog(ctx, w, h, timestamp) {
    const fogColor = this.config.fogColor || [200, 200, 200];

    for (const fog of this.fogParticles) {
      fog.x += fog.speed;
      fog.phase += 0.003;

      // Gentle vertical oscillation
      const yOffset = Math.sin(fog.phase) * 10;

      if (fog.x > w + fog.width / 2) {
        fog.x = -fog.width / 2;
      }

      ctx.save();
      const gradient = ctx.createRadialGradient(
        fog.x, fog.y + yOffset, 0,
        fog.x, fog.y + yOffset, fog.width / 2
      );
      gradient.addColorStop(0, `rgba(${fogColor[0]}, ${fogColor[1]}, ${fogColor[2]}, ${fog.opacity})`);
      gradient.addColorStop(0.5, `rgba(${fogColor[0]}, ${fogColor[1]}, ${fogColor[2]}, ${fog.opacity * 0.5})`);
      gradient.addColorStop(1, `rgba(${fogColor[0]}, ${fogColor[1]}, ${fogColor[2]}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(fog.x, fog.y + yOffset, fog.width / 2, fog.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawPetals(ctx, w, h) {
    for (const petal of this.petals) {
      petal.x += petal.speedX + Math.sin(petal.wobblePhase) * 0.5;
      petal.y += petal.speedY;
      petal.rotation += petal.rotationSpeed;
      petal.wobblePhase += petal.wobbleSpeed;

      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rotation);
      ctx.globalAlpha = petal.opacity;

      // Draw petal shape
      ctx.fillStyle = `rgba(255, 180, 200, ${petal.opacity})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, petal.size, petal.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = `rgba(255, 220, 235, ${petal.opacity * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(-petal.size * 0.15, -petal.size * 0.1, petal.size * 0.5, petal.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Reset if off screen
      if (petal.y > h + 20 || petal.x > w + 20) {
        petal.x = Math.random() * w;
        petal.y = -10 - Math.random() * 50;
        petal.opacity = 0.3 + Math.random() * 0.4;
      }
    }
  }

  /* --- EVENTS --- */
  _onLightning() {
    if (this.config && this.config.hasLightning) {
      this.lightningAlpha = 0.06 + Math.random() * 0.04;
    }
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(dpr, dpr);
    this.isMobile = window.innerWidth < 768;
  }

  /* Cleanup */
  destroy() {
    this.stop();
    window.removeEventListener('resize', this._resizeBound);
    window.removeEventListener('lightning', this._lightningBound);
  }
}

// Export as global
window.RainRenderer = RainRenderer;

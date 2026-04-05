/* ═══════════════════════════════════════════
   RAIN CANVAS — Rain-on-Glass & Open Rain
   ═══════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Scene Configurations ──
  const SCENE_CONFIGS = {
    'asian-city': {
      mode: 'glass',
      staticDrops: 400,
      maxTricklers: 25,
      maxDropSize: 4,
      newDropRate: 0.3,
      // Glass area hint (percentage of canvas where drops appear densely)
      glassArea: { left: 0.12, right: 0.88, top: 0.0, bottom: 0.9 },
      edgeFade: 0.12  // fraction of width/height where density fades
    },
    'ny-city': {
      mode: 'glass',
      staticDrops: 300,
      maxTricklers: 20,
      maxDropSize: 3.5,
      newDropRate: 0.25,
      glassArea: { left: 0.08, right: 0.92, top: 0.0, bottom: 0.88 },
      edgeFade: 0.10
    },
    'autumn-cabin': {
      mode: 'open',
      streakCount: 150,
      streakSpeed: 12,
      windAngle: 0.15,
      streakLength: 25,
      streakOpacity: 0.1
    },
    'japanese-garden': {
      mode: 'open',
      streakCount: 100,
      streakSpeed: 8,
      windAngle: 0.08,
      streakLength: 18,
      streakOpacity: 0.08,
      hasPetals: true,
      petalCount: 20
    }
  };

  // ── GlassDrop Class ──
  class GlassDrop {
    constructor(x, y, size, canvasW, canvasH) {
      this.x = x;
      this.y = y;
      this.size = size;
      this.baseSize = size;
      this.opacity = 0.25 + Math.random() * 0.4;
      this.isMoving = false;
      this.velocity = 0;
      this.wobblePhase = Math.random() * Math.PI * 2;
      this.wobbleFreq = 0.02 + Math.random() * 0.03;
      this.wobbleAmp = 0.2 + Math.random() * 0.3;
      this.trail = [];
      this.mass = size;
      this.mergeTimer = 150 + Math.random() * 600;
      this.age = 0;
      this.canvasW = canvasW;
      this.canvasH = canvasH;
      this.absorbed = false;
    }

    update() {
      this.age++;
      this.mergeTimer--;

      if (!this.isMoving && this.mergeTimer <= 0) {
        if (Math.random() < 0.004 * this.mass) {
          this.isMoving = true;
          this.velocity = 0.2 + this.mass * 0.1;
        }
        this.mergeTimer = 80 + Math.random() * 400;
      }

      if (this.isMoving) {
        // Gravity acceleration (capped)
        this.velocity = Math.min(this.velocity + 0.015, 2.0 + this.mass * 0.25);

        // Surface tension wobble
        this.wobblePhase += this.wobbleFreq;
        this.x += Math.sin(this.wobblePhase) * this.wobbleAmp;

        // Fall
        this.y += this.velocity;

        // Add to trail (position + slight size variation for wet-trail width)
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 100) this.trail.shift();

        // Off-screen
        if (this.y > this.canvasH + 10) {
          this.absorbed = true;
        }
      }
    }

    absorb(other) {
      // Grow when merging with another drop
      this.mass += other.mass * 0.5;
      this.size = Math.min(this.baseSize + this.mass * 0.15, 6);
      other.absorbed = true;
    }
  }

  // ── RainStreak (for open scenes) ──
  class RainStreak {
    constructor(canvasW, canvasH, config) {
      this.canvasW = canvasW;
      this.canvasH = canvasH;
      this.config = config;
      this.reset(true);
    }

    reset(initial) {
      const cfg = this.config;
      this.x = Math.random() * (this.canvasW + 100) - 50;
      this.y = initial ? Math.random() * this.canvasH : -cfg.streakLength - Math.random() * 100;
      this.speed = cfg.streakSpeed * (0.7 + Math.random() * 0.6);
      this.length = cfg.streakLength * (0.6 + Math.random() * 0.8);
      this.opacity = cfg.streakOpacity * (0.5 + Math.random() * 1.0);
      this.wind = cfg.windAngle * (0.8 + Math.random() * 0.4);
    }

    update() {
      this.y += this.speed;
      this.x += Math.tan(this.wind) * this.speed;
      if (this.y > this.canvasH + 20) {
        this.reset(false);
      }
    }
  }

  // ── Cherry Blossom Petal ──
  class Petal {
    constructor(canvasW, canvasH) {
      this.canvasW = canvasW;
      this.canvasH = canvasH;
      this.reset(true);
    }

    reset(initial) {
      this.x = Math.random() * this.canvasW;
      this.y = initial ? Math.random() * this.canvasH : -20 - Math.random() * 60;
      this.size = 3 + Math.random() * 5;
      this.speedY = 0.3 + Math.random() * 0.6;
      this.speedX = -0.2 + Math.random() * 0.5;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.04;
      this.wobblePhase = Math.random() * Math.PI * 2;
      this.wobbleFreq = 0.01 + Math.random() * 0.02;
      this.wobbleAmp = 0.5 + Math.random() * 1.0;
      this.opacity = 0.3 + Math.random() * 0.4;
    }

    update() {
      this.wobblePhase += this.wobbleFreq;
      this.x += this.speedX + Math.sin(this.wobblePhase) * this.wobbleAmp;
      this.y += this.speedY;
      this.rotation += this.rotSpeed;

      if (this.y > this.canvasH + 20 || this.x < -30 || this.x > this.canvasW + 30) {
        this.reset(false);
      }
    }
  }

  // ── Main Rain Canvas Controller ──
  class RainCanvas {
    constructor() {
      this.canvas = document.getElementById('rain-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.running = false;
      this.scene = null;
      this.config = null;
      this.drops = [];
      this.streaks = [];
      this.petals = [];
      this.frameCount = 0;
      this.lastFrameTime = 0;
      this.targetInterval = 1000 / 30; // 30fps cap
      this.isMobile = window.innerWidth < 768;

      this._resizeHandler = this._onResize.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    }

    _onResize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.isMobile = window.innerWidth < 768;
      // Reinitialize if active
      if (this.scene) {
        this._initParticles();
      }
    }

    start(sceneId) {
      this.scene = sceneId;
      this.config = SCENE_CONFIGS[sceneId];
      if (!this.config) return;

      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.frameCount = 0;

      this._initParticles();

      if (!this.running) {
        this.running = true;
        this.lastFrameTime = performance.now();
        this._loop(this.lastFrameTime);
      }
    }

    stop() {
      this.running = false;
      this.scene = null;
      this.drops = [];
      this.streaks = [];
      this.petals = [];
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    _initParticles() {
      const cfg = this.config;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const mobileFactor = this.isMobile ? 0.5 : 1;

      this.drops = [];
      this.streaks = [];
      this.petals = [];

      if (cfg.mode === 'glass') {
        // Create static glass drops
        const count = Math.floor(cfg.staticDrops * mobileFactor);
        const area = cfg.glassArea;
        const fade = cfg.edgeFade;

        for (let i = 0; i < count; i++) {
          const x = this._glassX(w, area, fade);
          const y = area.top * h + Math.random() * ((area.bottom - area.top) * h);
          const size = 0.5 + Math.random() * cfg.maxDropSize;
          this.drops.push(new GlassDrop(x, y, size, w, h));
        }
      } else if (cfg.mode === 'open') {
        // Create rain streaks
        const count = Math.floor(cfg.streakCount * mobileFactor);
        for (let i = 0; i < count; i++) {
          this.streaks.push(new RainStreak(w, h, cfg));
        }

        // Create petals for garden scene
        if (cfg.hasPetals) {
          const petalCount = Math.floor(cfg.petalCount * mobileFactor);
          for (let i = 0; i < petalCount; i++) {
            this.petals.push(new Petal(w, h));
          }
        }
      }
    }

    // Generate X position weighted toward the glass area center
    _glassX(canvasW, area, fade) {
      const left = area.left * canvasW;
      const right = area.right * canvasW;
      const center = (left + right) / 2;
      const range = (right - left) / 2;
      
      // Gaussian-ish distribution: more drops in center, fewer at edges
      let x;
      const u1 = Math.random();
      const u2 = Math.random();
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      x = center + gaussian * range * 0.4;
      
      // Clamp with soft boundaries
      x = Math.max(left - canvasW * fade * 0.3, Math.min(right + canvasW * fade * 0.3, x));
      return x;
    }

    _loop(timestamp) {
      if (!this.running) return;

      const elapsed = timestamp - this.lastFrameTime;
      if (elapsed >= this.targetInterval) {
        this.lastFrameTime = timestamp - (elapsed % this.targetInterval);
        this.frameCount++;
        this._update();
        this._draw();
      }

      requestAnimationFrame(this._loop.bind(this));
    }

    _update() {
      const cfg = this.config;
      if (!cfg) return;

      if (cfg.mode === 'glass') {
        this._updateGlass();
      } else {
        this._updateOpen();
      }
    }

    _updateGlass() {
      const cfg = this.config;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const mobileFactor = this.isMobile ? 0.5 : 1;

      // Count active tricklers
      let tricklerCount = 0;
      for (let i = 0; i < this.drops.length; i++) {
        if (this.drops[i].isMoving) tricklerCount++;
      }

      // Update all drops
      for (let i = 0; i < this.drops.length; i++) {
        this.drops[i].update();
      }

      // Check merge collisions between moving drops and static drops
      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        if (!d.isMoving || d.absorbed) continue;
        for (let j = 0; j < this.drops.length; j++) {
          if (i === j || this.drops[j].absorbed || this.drops[j].isMoving) continue;
          const other = this.drops[j];
          const dx = d.x - other.x;
          const dy = d.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < d.size + other.size + 1) {
            d.absorb(other);
          }
        }
      }

      // Remove absorbed drops
      this.drops = this.drops.filter(d => !d.absorbed);

      // Spawn new drops (rain hitting glass)
      const maxCount = Math.floor(cfg.staticDrops * mobileFactor);
      if (Math.random() < cfg.newDropRate && this.drops.length < maxCount * 1.2) {
        const area = cfg.glassArea;
        const x = this._glassX(w, area, cfg.edgeFade);
        const y = area.top * h + Math.random() * ((area.bottom - area.top) * h);
        const size = 0.3 + Math.random() * 2;
        const drop = new GlassDrop(x, y, size, w, h);
        drop.opacity *= 0.7; // new drops start slightly more transparent
        this.drops.push(drop);
      }
    }

    _updateOpen() {
      for (let i = 0; i < this.streaks.length; i++) {
        this.streaks[i].update();
      }
      for (let i = 0; i < this.petals.length; i++) {
        this.petals[i].update();
      }
    }

    _draw() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (this.config.mode === 'glass') {
        this._drawGlass(ctx);
      } else {
        this._drawOpen(ctx);
      }
    }

    _drawGlass(ctx) {
      // Draw trails first (behind drops)
      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        if (d.trail.length > 1) {
          this._drawTrail(ctx, d);
        }
      }

      // Draw drops
      for (let i = 0; i < this.drops.length; i++) {
        this._drawDrop(ctx, this.drops[i]);
      }
    }

    _drawTrail(ctx, drop) {
      const trail = drop.trail;
      if (trail.length < 2) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);

      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }

      // Trail gets more transparent toward the start
      const trailOpacity = drop.opacity * 0.08;
      ctx.strokeStyle = `rgba(170, 195, 220, ${trailOpacity})`;
      ctx.lineWidth = Math.max(drop.size * 0.4, 0.5);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Draw a slightly brighter recent section
      if (trail.length > 5) {
        const recentStart = Math.max(0, trail.length - 15);
        ctx.beginPath();
        ctx.moveTo(trail[recentStart].x, trail[recentStart].y);
        for (let i = recentStart + 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.strokeStyle = `rgba(180, 205, 230, ${drop.opacity * 0.14})`;
        ctx.lineWidth = Math.max(drop.size * 0.55, 0.8);
        ctx.stroke();
      }

      ctx.restore();
    }

    _drawDrop(ctx, drop) {
      const { x, y, size, opacity, isMoving } = drop;
      if (size < 0.3) return;

      ctx.save();

      // Drop body — slight ellipse (gravity elongation when moving)
      const elongation = isMoving ? 1.25 + drop.velocity * 0.05 : 1.0;
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * elongation, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(170, 195, 225, ${opacity * 0.3})`;
      ctx.fill();

      // Inner refraction gradient (brighter center, lens-like)
      if (size > 0.8) {
        const grad = ctx.createRadialGradient(
          x - size * 0.25, y - size * 0.25, 0,
          x, y, size * 1.1
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.45})`);
        grad.addColorStop(0.35, `rgba(210, 225, 240, ${opacity * 0.18})`);
        grad.addColorStop(1, 'rgba(200, 215, 235, 0)');

        ctx.beginPath();
        ctx.ellipse(x, y, size, size * elongation, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Specular highlight (small bright dot, upper-left)
      if (size > 0.6) {
        const hlSize = size * 0.22;
        ctx.beginPath();
        ctx.arc(x - size * 0.3, y - size * 0.35, hlSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.65})`;
        ctx.fill();
      }

      // Subtle outer glow for larger drops
      if (size > 2) {
        ctx.beginPath();
        ctx.arc(x, y, size * 1.6, 0, Math.PI * 2);
        const glowGrad = ctx.createRadialGradient(x, y, size * 0.5, x, y, size * 1.6);
        glowGrad.addColorStop(0, `rgba(180, 200, 230, ${opacity * 0.06})`);
        glowGrad.addColorStop(1, 'rgba(180, 200, 230, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fill();
      }

      ctx.restore();
    }

    _drawOpen(ctx) {
      const cfg = this.config;

      // Draw rain streaks
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < this.streaks.length; i++) {
        const s = this.streaks[i];
        const dx = Math.tan(s.wind) * s.length;
        const x2 = s.x - dx;
        const y2 = s.y - s.length;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(200, 210, 225, ${s.opacity})`;
        ctx.lineWidth = 0.8 + Math.random() * 0.3;
        ctx.stroke();
      }
      ctx.restore();

      // Draw petals
      if (cfg.hasPetals) {
        ctx.save();
        for (let i = 0; i < this.petals.length; i++) {
          this._drawPetal(ctx, this.petals[i]);
        }
        ctx.restore();
      }
    }

    _drawPetal(ctx, petal) {
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rotation);
      ctx.globalAlpha = petal.opacity;

      // Draw a simple petal shape
      const s = petal.size;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.bezierCurveTo(s * 0.5, -s * 0.3, s * 0.5, s * 0.3, 0, s * 0.5);
      ctx.bezierCurveTo(-s * 0.5, s * 0.3, -s * 0.5, -s * 0.3, 0, -s * 0.5);
      ctx.fillStyle = `rgba(245, 195, 210, 0.7)`;
      ctx.fill();

      // Slight darker center line
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.35);
      ctx.lineTo(0, s * 0.35);
      ctx.strokeStyle = 'rgba(220, 160, 180, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.restore();
    }
  }

  // Expose globally
  window.RainCanvas = RainCanvas;
})();

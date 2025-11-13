// Seasonal Effects System
class SeasonalEffects {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.accumulation = [];
    this.maxParticles = 150;
    this.isRunning = false;
    this.currentEffect = null;

    this.setupCanvas();
    this.detectAndStartEffect();
  }

  setupCanvas() {
    this.canvas.id = 'seasonal-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    document.body.appendChild(this.canvas);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.currentEffect && this.currentEffect.onResize) {
      this.currentEffect.onResize(this.canvas.width, this.canvas.height);
    }
  }

  detectAndStartEffect() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();

    // Determine which effect to use based on date
    let effectName = null;

    // Winter (December 1 - February 28)
    if (month === 11 || month === 12) {
      effectName = 'winter';
    }
    // Valentine's Day (February 7-14)
    else if (month === 2 && day >= 7 && day <= 14) {
      effectName = 'valentines';
    }
    // St. Patrick's Day (March 10-17)
    else if (month === 3 && day >= 10 && day <= 17) {
      effectName = 'stpatricks';
    }
    // April Fools (April 1)
    else if (month === 4 && day === 1) {
      effectName = 'aprilfools';
    }
    // Halloween (October 20-31)
    else if (month === 10 && day >= 20) {
      effectName = 'halloween';
    }

    if (effectName) {
      this.setEffect(effectName);
    }
  }

  setEffect(effectName) {
    this.currentEffect = this.getEffect(effectName);
    if (this.currentEffect && this.currentEffect.init) {
      this.currentEffect.init(this);
    }
    this.start();
  }

  getEffect(name) {
    const effects = {
      winter: new WinterEffect(),
      valentines: new ValentinesEffect(),
      stpatricks: new StPatricksEffect(),
      aprilfools: new AprilFoolsEffect(),
      halloween: new HalloweenEffect()
    };
    return effects[name] || null;
  }

  update() {
    if (this.currentEffect && this.currentEffect.update) {
      this.currentEffect.update(this);
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.currentEffect && this.currentEffect.draw) {
      this.currentEffect.draw(this.ctx, this.canvas.width, this.canvas.height, this.particles, this.accumulation);
    }
  }

  animate() {
    if (!this.isRunning) return;
    this.update();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  start() {
    this.isRunning = true;
    this.animate();
  }

  stop() {
    this.isRunning = false;
  }

  destroy() {
    this.stop();
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// ============================================
// WINTER EFFECT - Snow with accumulation
// ============================================
class WinterEffect {
  init(system) {
    system.particles = [];
    system.accumulation = new Array(Math.ceil(system.canvas.width / 10)).fill(0);

    for (let i = 0; i < system.maxParticles; i++) {
      system.particles.push(this.createSnowflake(system.canvas.width, system.canvas.height));
    }
  }

  createSnowflake(width, height, y = null) {
    return {
      x: Math.random() * width,
      y: y !== null ? y : Math.random() * -height,
      radius: Math.random() * 3 + 1,
      speed: Math.random() * 1 + 0.5,
      drift: Math.random() * 0.5 - 0.25,
      opacity: Math.random() * 0.6 + 0.4
    };
  }

  update(system) {
    const { particles, accumulation, canvas } = system;

    particles.forEach((flake, index) => {
      flake.y += flake.speed;
      flake.x += flake.drift;
      flake.drift += (Math.random() - 0.5) * 0.1;
      flake.drift = Math.max(-1, Math.min(1, flake.drift));

      const segmentIndex = Math.floor(flake.x / 10);
      const accumulationHeight = accumulation[segmentIndex] || 0;
      const surfaceY = canvas.height - accumulationHeight;

      if (flake.y >= surfaceY - flake.radius) {
        if (segmentIndex >= 0 && segmentIndex < accumulation.length) {
          accumulation[segmentIndex] += flake.radius * 0.1;
          if (segmentIndex > 0) accumulation[segmentIndex - 1] += flake.radius * 0.05;
          if (segmentIndex < accumulation.length - 1) accumulation[segmentIndex + 1] += flake.radius * 0.05;
        }
        particles[index] = this.createSnowflake(canvas.width, canvas.height, -20);
      }

      if (flake.x < -10) flake.x = canvas.width + 10;
      if (flake.x > canvas.width + 10) flake.x = -10;
    });

    system.accumulation = accumulation.map(h => Math.max(0, h - 0.02));
  }

  draw(ctx, width, height, particles, accumulation) {
    // Draw accumulation
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    accumulation?.forEach((h, i) => {
      if (h > 0) ctx.fillRect(i * 10, height - h, 10, h);
    });

    // Draw snowflakes
    particles?.forEach(flake => {
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
      ctx.fill();
    });
  }

  onResize(width, height) {
    this.accumulation = new Array(Math.ceil(width / 10)).fill(0);
  }
}

// ============================================
// VALENTINES EFFECT - Falling hearts
// ============================================
class ValentinesEffect {
  init(system) {
    system.particles = [];
    for (let i = 0; i < 80; i++) {
      system.particles.push(this.createHeart(system.canvas.width, system.canvas.height));
    }
  }

  createHeart(width, height, y = null) {
    return {
      x: Math.random() * width,
      y: y !== null ? y : Math.random() * -height,
      size: Math.random() * 15 + 10,
      speed: Math.random() * 0.8 + 0.3,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      drift: Math.random() * 0.3 - 0.15,
      opacity: Math.random() * 0.5 + 0.5,
      color: Math.random() > 0.5 ? '#ff69b4' : '#ff1493'
    };
  }

  update(system) {
    system.particles.forEach((heart, index) => {
      heart.y += heart.speed;
      heart.x += heart.drift;
      heart.rotation += heart.rotationSpeed;

      if (heart.y > system.canvas.height + 50) {
        system.particles[index] = this.createHeart(system.canvas.width, system.canvas.height, -50);
      }
    });
  }

  draw(ctx, width, height, particles) {
    particles?.forEach(heart => {
      ctx.save();
      ctx.translate(heart.x, heart.y);
      ctx.rotate(heart.rotation);
      ctx.globalAlpha = heart.opacity;
      ctx.fillStyle = heart.color;

      // Draw heart shape
      ctx.beginPath();
      const size = heart.size;
      ctx.moveTo(0, size * 0.3);
      ctx.bezierCurveTo(-size * 0.5, -size * 0.3, -size, size * 0.1, 0, size * 0.9);
      ctx.bezierCurveTo(size, size * 0.1, size * 0.5, -size * 0.3, 0, size * 0.3);
      ctx.fill();

      ctx.restore();
    });
  }
}

// ============================================
// ST PATRICK'S DAY - Shamrocks and gold coins
// ============================================
class StPatricksEffect {
  init(system) {
    system.particles = [];
    for (let i = 0; i < 60; i++) {
      system.particles.push(this.createShamrock(system.canvas.width, system.canvas.height));
    }
  }

  createShamrock(width, height, y = null) {
    return {
      x: Math.random() * width,
      y: y !== null ? y : Math.random() * -height,
      size: Math.random() * 20 + 15,
      speed: Math.random() * 0.6 + 0.4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.03,
      drift: Math.random() * 0.4 - 0.2,
      opacity: Math.random() * 0.4 + 0.6,
      type: Math.random() > 0.3 ? 'shamrock' : 'coin'
    };
  }

  update(system) {
    system.particles.forEach((item, index) => {
      item.y += item.speed;
      item.x += item.drift;
      item.rotation += item.rotationSpeed;

      if (item.y > system.canvas.height + 50) {
        system.particles[index] = this.createShamrock(system.canvas.width, system.canvas.height, -50);
      }
    });
  }

  draw(ctx, width, height, particles) {
    particles?.forEach(item => {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rotation);
      ctx.globalAlpha = item.opacity;

      if (item.type === 'shamrock') {
        // Draw shamrock (four-leaf clover)
        ctx.fillStyle = '#00a651';
        const size = item.size / 3;
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate((Math.PI / 2) * i);
          ctx.beginPath();
          ctx.arc(0, -size, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // Stem
        ctx.fillStyle = '#007a3d';
        ctx.fillRect(-size * 0.15, 0, size * 0.3, size * 1.5);
      } else {
        // Draw gold coin
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#daa520';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, item.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });
  }
}

// ============================================
// APRIL FOOLS - Crazy bouncing objects
// ============================================
class AprilFoolsEffect {
  init(system) {
    system.particles = [];
    for (let i = 0; i < 50; i++) {
      system.particles.push(this.createObject(system.canvas.width, system.canvas.height));
    }
  }

  createObject(width, height) {
    const emojis = ['😂', '🤡', '🎭', '🃏', '🎪', '🤪', '😜', '🎉'];
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      size: Math.random() * 30 + 20,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1
    };
  }

  update(system) {
    system.particles.forEach(obj => {
      obj.x += obj.vx;
      obj.y += obj.vy;
      obj.rotation += obj.rotationSpeed;

      // Bounce off edges
      if (obj.x < 0 || obj.x > system.canvas.width) obj.vx *= -1;
      if (obj.y < 0 || obj.y > system.canvas.height) obj.vy *= -1;

      // Keep in bounds
      obj.x = Math.max(0, Math.min(system.canvas.width, obj.x));
      obj.y = Math.max(0, Math.min(system.canvas.height, obj.y));
    });
  }

  draw(ctx, width, height, particles) {
    particles?.forEach(obj => {
      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.rotation);
      ctx.font = `${obj.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.emoji, 0, 0);
      ctx.restore();
    });
  }
}

// ============================================
// HALLOWEEN - Bats, ghosts, and pumpkins
// ============================================
class HalloweenEffect {
  init(system) {
    system.particles = [];
    for (let i = 0; i < 70; i++) {
      system.particles.push(this.createSpooky(system.canvas.width, system.canvas.height));
    }
  }

  createSpooky(width, height, y = null) {
    const types = ['bat', 'ghost', 'pumpkin'];
    return {
      x: Math.random() * width,
      y: y !== null ? y : Math.random() * -height,
      size: Math.random() * 25 + 15,
      speed: Math.random() * 0.8 + 0.4,
      drift: Math.random() * 0.5 - 0.25,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.05 + 0.02,
      opacity: Math.random() * 0.5 + 0.5,
      type: types[Math.floor(Math.random() * types.length)]
    };
  }

  update(system) {
    system.particles.forEach((item, index) => {
      item.y += item.speed;
      item.wobble += item.wobbleSpeed;
      item.x += item.drift + Math.sin(item.wobble) * 0.5;

      if (item.y > system.canvas.height + 50) {
        system.particles[index] = this.createSpooky(system.canvas.width, system.canvas.height, -50);
      }
    });
  }

  draw(ctx, width, height, particles) {
    particles?.forEach(item => {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.globalAlpha = item.opacity;

      if (item.type === 'bat') {
        // Draw bat
        ctx.fillStyle = '#2d2d2d';
        ctx.beginPath();
        // Body
        ctx.arc(0, 0, item.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.beginPath();
        ctx.moveTo(-item.size * 0.3, 0);
        ctx.quadraticCurveTo(-item.size * 0.8, -item.size * 0.4, -item.size, 0);
        ctx.quadraticCurveTo(-item.size * 0.8, item.size * 0.3, -item.size * 0.3, 0);
        ctx.moveTo(item.size * 0.3, 0);
        ctx.quadraticCurveTo(item.size * 0.8, -item.size * 0.4, item.size, 0);
        ctx.quadraticCurveTo(item.size * 0.8, item.size * 0.3, item.size * 0.3, 0);
        ctx.fill();
      } else if (item.type === 'ghost') {
        // Draw ghost
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(0, -item.size * 0.2, item.size * 0.4, Math.PI, 0);
        ctx.lineTo(item.size * 0.4, item.size * 0.4);
        ctx.lineTo(item.size * 0.3, item.size * 0.3);
        ctx.lineTo(item.size * 0.2, item.size * 0.4);
        ctx.lineTo(item.size * 0.1, item.size * 0.3);
        ctx.lineTo(0, item.size * 0.4);
        ctx.lineTo(-item.size * 0.1, item.size * 0.3);
        ctx.lineTo(-item.size * 0.2, item.size * 0.4);
        ctx.lineTo(-item.size * 0.3, item.size * 0.3);
        ctx.lineTo(-item.size * 0.4, item.size * 0.4);
        ctx.closePath();
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-item.size * 0.15, -item.size * 0.15, item.size * 0.08, 0, Math.PI * 2);
        ctx.arc(item.size * 0.15, -item.size * 0.15, item.size * 0.08, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Draw pumpkin
        ctx.fillStyle = '#ff7518';
        ctx.beginPath();
        ctx.arc(0, 0, item.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        // Face
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(-item.size * 0.15, -item.size * 0.1);
        ctx.lineTo(-item.size * 0.08, -item.size * 0.2);
        ctx.lineTo(-item.size * 0.22, -item.size * 0.15);
        ctx.closePath();
        ctx.moveTo(item.size * 0.15, -item.size * 0.1);
        ctx.lineTo(item.size * 0.08, -item.size * 0.2);
        ctx.lineTo(item.size * 0.22, -item.size * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, item.size * 0.1, item.size * 0.15, 0, Math.PI);
        ctx.fill();
      }

      ctx.restore();
    });
  }
}

// ============================================
// Global control and initialization
// ============================================
let seasonalEffects = null;
let festiveEnabled = localStorage.getItem('festiveEnabled') !== 'false'; // Default true

function initSeasonalEffects() {
  if (festiveEnabled && !seasonalEffects) {
    seasonalEffects = new SeasonalEffects();
  }
}

function stopSeasonalEffects() {
  if (seasonalEffects) {
    seasonalEffects.destroy();
    seasonalEffects = null;
  }
}

function toggleFestive(enabled) {
  festiveEnabled = enabled;
  localStorage.setItem('festiveEnabled', enabled);

  if (enabled) {
    initSeasonalEffects();
  } else {
    stopSeasonalEffects();
  }
}

// Start effects when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSeasonalEffects);
} else {
  initSeasonalEffects();
}

// Export for UI controls
window.seasonalEffects = {
  toggle: toggleFestive,
  isEnabled: () => festiveEnabled
};

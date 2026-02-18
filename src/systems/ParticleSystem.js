import Phaser from 'phaser';
import { EFFECTS, GAME, PX, UI } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

/**
 * ParticleSystem — listens to EventBus events and emits visual effects.
 * All effects are managed here to keep entity/scene code clean.
 * Cleans up all resources on destroy().
 */
export class ParticleSystem {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    /** @type {Phaser.GameObjects.Graphics[]} */
    this._particleGraphics = [];
    /** @type {Phaser.Tweens.Tween[]} */
    this._tweens = [];
    /** @type {Phaser.GameObjects.Text[]} */
    this._texts = [];

    // Track acceleration milestones already shown
    this._shownMilestones = new Set();

    // Slowdown overlay
    this._slowdownOverlay = null;

    // Generate particle textures
    this._createParticleTextures();

    // Bind event handlers (store references for cleanup)
    this._onFragmentCollected = this._handleFragmentCollected.bind(this);
    this._onPlayerDied = this._handlePlayerDied.bind(this);
    this._onEnemySpawned = this._handleEnemySpawned.bind(this);
    this._onSlowdownStart = this._handleSlowdownStart.bind(this);
    this._onSlowdownEnd = this._handleSlowdownEnd.bind(this);
    this._onAccelerationTick = this._handleAccelerationTick.bind(this);

    // Wire up
    eventBus.on(Events.FRAGMENT_COLLECTED, this._onFragmentCollected);
    eventBus.on(Events.PLAYER_DIED, this._onPlayerDied);
    eventBus.on(Events.ENEMY_SPAWNED, this._onEnemySpawned);
    eventBus.on(Events.SLOWDOWN_START, this._onSlowdownStart);
    eventBus.on(Events.SLOWDOWN_END, this._onSlowdownEnd);
    eventBus.on(Events.ACCELERATION_TICK, this._onAccelerationTick);
  }

  // ─── Particle texture generation ─────────────────────────────────

  _createParticleTextures() {
    const scene = this.scene;

    // Small square particles at various sizes
    const sizes = [
      { key: 'particle-sm', size: Math.max(2, Math.round(2 * PX)) },
      { key: 'particle-md', size: Math.max(3, Math.round(3 * PX)) },
      { key: 'particle-lg', size: Math.max(4, Math.round(4 * PX)) },
    ];

    for (const { key, size } of sizes) {
      if (scene.textures.exists(key)) continue;
      const g = scene.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, size, size);
      g.generateTexture(key, size, size);
      g.destroy();
    }
  }

  // ─── Fragment collected ──────────────────────────────────────────

  _handleFragmentCollected(data) {
    if (!data) return;
    const { x, y, score } = data;
    const cfg = EFFECTS.FRAGMENT_COLLECT;

    this._burstParticles(x, y, cfg.COUNT, cfg.SPEED, cfg.LIFETIME, cfg.COLORS, cfg.SIZE_MIN, cfg.SIZE_MAX);

    // Score pop: "+1" floating text
    this._showScorePop(x, y, `+1`);
  }

  // ─── Player died ─────────────────────────────────────────────────

  _handlePlayerDied() {
    const scene = this.scene;
    const player = scene.player;
    if (!player || !player.sprite) return;

    const x = player.sprite.x;
    const y = player.sprite.y;
    const cfg = EFFECTS.PLAYER_DEATH;

    // Camera flash
    scene.cameras.main.flash(EFFECTS.FLASH_DURATION, 255, 255, 255);

    // Camera shake
    scene.cameras.main.shake(EFFECTS.SCREEN_SHAKE_DURATION, EFFECTS.SCREEN_SHAKE_INTENSITY);

    // Particle burst
    this._burstParticles(x, y, cfg.COUNT, cfg.SPEED, cfg.LIFETIME, cfg.COLORS, cfg.SIZE_MIN, cfg.SIZE_MAX);

    // Slow-mo effect: slow the game time, then restore
    scene.time.timeScale = EFFECTS.DEATH_SLOWMO_SCALE;
    scene.time.delayedCall(EFFECTS.DEATH_SLOWMO_DURATION * EFFECTS.DEATH_SLOWMO_SCALE, () => {
      scene.time.timeScale = 1;
    });
  }

  // ─── Enemy spawned ───────────────────────────────────────────────

  _handleEnemySpawned(data) {
    // data has { type }, but we need position.
    // Since enemies spawn off-screen at edges, we show a hint at the nearest edge.
    // We cannot get the exact position from the event data, so we skip if no coords.
    // The SpawnSystem will be updated to pass coordinates.
    if (!data || data.x == null || data.y == null) return;

    const cfg = EFFECTS.ENEMY_SPAWN;
    // Clamp to screen edges for the visual hint
    const hintX = Phaser.Math.Clamp(data.x, 0, GAME.WIDTH);
    const hintY = Phaser.Math.Clamp(data.y, 0, GAME.HEIGHT);

    this._burstParticles(hintX, hintY, cfg.COUNT, cfg.SPEED, cfg.LIFETIME, cfg.COLORS, cfg.SIZE, cfg.SIZE);
  }

  // ─── Slowdown start ──────────────────────────────────────────────

  _handleSlowdownStart() {
    const scene = this.scene;
    const player = scene.player;
    if (!player || !player.sprite) return;

    const x = player.sprite.x;
    const y = player.sprite.y;
    const cfg = EFFECTS.SLOWDOWN_RING;

    // Ring of particles expanding outward in a circle
    for (let i = 0; i < cfg.COUNT; i++) {
      const angle = (i / cfg.COUNT) * Math.PI * 2;
      const vx = Math.cos(angle) * cfg.SPEED;
      const vy = Math.sin(angle) * cfg.SPEED;
      const color = cfg.COLORS[i % cfg.COLORS.length];

      this._singleParticle(x, y, vx, vy, cfg.LIFETIME, color, cfg.SIZE);
    }

    // Slowdown tint overlay
    if (!this._slowdownOverlay) {
      this._slowdownOverlay = scene.add.rectangle(
        GAME.WIDTH / 2, GAME.HEIGHT / 2,
        GAME.WIDTH, GAME.HEIGHT,
        EFFECTS.SLOWDOWN_OVERLAY_COLOR,
        0
      );
      this._slowdownOverlay.setDepth(50);
    }

    // Fade in the overlay
    scene.tweens.add({
      targets: this._slowdownOverlay,
      alpha: EFFECTS.SLOWDOWN_OVERLAY_ALPHA,
      duration: 150,
      ease: 'Sine.easeOut',
    });
  }

  // ─── Slowdown end ────────────────────────────────────────────────

  _handleSlowdownEnd() {
    if (!this._slowdownOverlay) return;

    this.scene.tweens.add({
      targets: this._slowdownOverlay,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeIn',
    });
  }

  // ─── Acceleration milestones ─────────────────────────────────────

  _handleAccelerationTick(data) {
    if (!data) return;
    const { speedMultiplier } = data;
    const cfg = EFFECTS.ACCEL_WARNING;

    for (const milestone of cfg.MILESTONES) {
      if (speedMultiplier >= milestone && !this._shownMilestones.has(milestone)) {
        this._shownMilestones.add(milestone);
        this._showAccelWarning(cfg.LABELS[milestone] || `SPEED x${milestone}`);
        break; // Only show one per tick
      }
    }
  }

  // ─── Burst particles helper ──────────────────────────────────────

  /**
   * Emit a burst of square particles at a position.
   */
  _burstParticles(x, y, count, speed, lifetime, colors, sizeMin, sizeMax) {
    const scene = this.scene;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.5 + Math.random() * 0.5);
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);

      this._singleParticle(x, y, vx, vy, lifetime, color, size);
    }
  }

  /**
   * Create a single animated particle that moves, shrinks, and fades.
   */
  _singleParticle(x, y, vx, vy, lifetime, color, size) {
    const scene = this.scene;
    const sz = Math.max(1, Math.round(size));

    const particle = scene.add.rectangle(x, y, sz, sz, color, 1);
    particle.setDepth(100);

    const tween = scene.tweens.add({
      targets: particle,
      x: x + vx * (lifetime / 1000),
      y: y + vy * (lifetime / 1000),
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: lifetime,
      ease: 'Quad.easeOut',
      onComplete: () => {
        particle.destroy();
      },
    });

    this._tweens.push(tween);
  }

  // ─── Score pop floating text ─────────────────────────────────────

  _showScorePop(x, y, text) {
    const scene = this.scene;
    const cfg = EFFECTS.SCORE_POP;
    const fontSize = Math.round(GAME.HEIGHT * cfg.FONT_SIZE_RATIO);

    const scoreText = scene.add.text(x, y, text, {
      fontSize: fontSize + 'px',
      fontFamily: UI.FONT,
      color: cfg.COLOR,
      fontStyle: 'bold',
      shadow: { offsetX: 1, offsetY: 1, color: cfg.SHADOW_COLOR, blur: 2, fill: true },
    }).setOrigin(0.5).setDepth(110);

    this._texts.push(scoreText);

    scene.tweens.add({
      targets: scoreText,
      y: y - cfg.RISE_DISTANCE,
      alpha: 0,
      duration: cfg.DURATION,
      ease: 'Quad.easeOut',
      onComplete: () => {
        scoreText.destroy();
        const idx = this._texts.indexOf(scoreText);
        if (idx !== -1) this._texts.splice(idx, 1);
      },
    });
  }

  // ─── Acceleration warning text ───────────────────────────────────

  _showAccelWarning(label) {
    const scene = this.scene;
    const cfg = EFFECTS.ACCEL_WARNING;
    const fontSize = Math.round(GAME.HEIGHT * cfg.FONT_SIZE_RATIO);

    const warningText = scene.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2, label, {
      fontSize: fontSize + 'px',
      fontFamily: UI.FONT,
      color: cfg.COLOR,
      fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0,0,0,0.6)', blur: 6, fill: true },
    }).setOrigin(0.5).setDepth(120).setAlpha(0);

    this._texts.push(warningText);

    // Fade in, hold briefly, fade out
    scene.tweens.add({
      targets: warningText,
      alpha: 1,
      duration: 100,
      ease: 'Sine.easeIn',
      onComplete: () => {
        scene.tweens.add({
          targets: warningText,
          alpha: 0,
          duration: cfg.DURATION - 100,
          delay: 100,
          ease: 'Sine.easeOut',
          onComplete: () => {
            warningText.destroy();
            const idx = this._texts.indexOf(warningText);
            if (idx !== -1) this._texts.splice(idx, 1);
          },
        });
      },
    });
  }

  // ─── Cleanup ─────────────────────────────────────────────────────

  destroy() {
    // Remove EventBus listeners
    eventBus.off(Events.FRAGMENT_COLLECTED, this._onFragmentCollected);
    eventBus.off(Events.PLAYER_DIED, this._onPlayerDied);
    eventBus.off(Events.ENEMY_SPAWNED, this._onEnemySpawned);
    eventBus.off(Events.SLOWDOWN_START, this._onSlowdownStart);
    eventBus.off(Events.SLOWDOWN_END, this._onSlowdownEnd);
    eventBus.off(Events.ACCELERATION_TICK, this._onAccelerationTick);

    // Destroy any lingering text objects
    for (const t of this._texts) {
      if (t && t.scene) t.destroy();
    }
    this._texts = [];

    // Destroy slowdown overlay
    if (this._slowdownOverlay) {
      this._slowdownOverlay.destroy();
      this._slowdownOverlay = null;
    }

    this._tweens = [];
    this._shownMilestones.clear();
  }
}

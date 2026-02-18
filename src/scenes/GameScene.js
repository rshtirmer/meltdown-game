import Phaser from 'phaser';
import { GAME, PLAYER, COLORS, PX, TRANSITION, FRAGMENT, SPRITE_SCALE, EFFECTS } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { Player } from '../entities/Player.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { renderPixelArt } from '../core/PixelRenderer.js';
import { CYBER } from '../sprites/palette.js';
import { bgTiles, glitchFragment, circuitNode } from '../sprites/tiles.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    gameState.reset();
    this.cameras.main.setBackgroundColor(COLORS.BG);

    // Mobile detection
    this.isMobile = this.sys.game.device.os.android ||
      this.sys.game.device.os.iOS || this.sys.game.device.os.iPad;

    // --- Background tiles and decorations ---
    this._createBackground();

    // Player (centered)
    this.player = new Player(this);

    // Score system
    this.scoreSystem = new ScoreSystem();

    // Spawn system (enemies + fragments)
    this.spawnSystem = new SpawnSystem(
      this,
      () => this.player.sprite
    );

    // Keyboard input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Touch/pointer input state
    this.pointerActive = false;
    this.pointerX = 0;
    this.pointerY = 0;

    // Touch input: player moves toward pointer when held down
    this.input.on('pointerdown', (pointer) => {
      this.pointerActive = true;
      this.pointerX = pointer.x;
      this.pointerY = pointer.y;
    });

    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown) {
        this.pointerActive = true;
        this.pointerX = pointer.x;
        this.pointerY = pointer.y;
      }
    });

    this.input.on('pointerup', () => {
      this.pointerActive = false;
    });

    // Particle system (listens to EventBus for all visual effects)
    this.particleSystem = new ParticleSystem(this);

    // Ambient floating particles (data flowing through cyberspace)
    this._createAmbientParticles();

    // Player trail state
    this._trailPositions = [];
    this._trailSprites = [];
    this._trailTimer = 0;

    gameState.started = true;

    // Fade in
    this.cameras.main.fadeIn(TRANSITION.FADE_DURATION, 0, 0, 0);
  }

  /**
   * Create the tiled circuit-board background and scatter decorative elements
   */
  _createBackground() {
    // Render background tile textures
    const tileKeys = ['bg-tile-a', 'bg-tile-b', 'bg-tile-c'];
    for (let i = 0; i < bgTiles.length; i++) {
      renderPixelArt(this, bgTiles[i], CYBER, tileKeys[i], SPRITE_SCALE);
    }

    // Render decoration textures
    renderPixelArt(this, glitchFragment, CYBER, 'decor-glitch', SPRITE_SCALE);
    renderPixelArt(this, circuitNode, CYBER, 'decor-circuit-node', SPRITE_SCALE);

    // Tile size in canvas pixels
    const tileSizePx = 16 * SPRITE_SCALE;

    // Fill the game area with random tile variants
    const cols = Math.ceil(GAME.WIDTH / tileSizePx);
    const rows = Math.ceil(GAME.HEIGHT / tileSizePx);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tileIdx = Math.floor(Math.random() * tileKeys.length);
        const tile = this.add.image(
          c * tileSizePx + tileSizePx / 2,
          r * tileSizePx + tileSizePx / 2,
          tileKeys[tileIdx]
        );
        tile.setDepth(-10);
      }
    }

    // Scatter 15-25 decorative elements at low alpha
    const decorCount = 15 + Math.floor(Math.random() * 11);
    for (let i = 0; i < decorCount; i++) {
      const isGlitch = Math.random() < 0.6;
      const key = isGlitch ? 'decor-glitch' : 'decor-circuit-node';
      const dx = Math.random() * GAME.WIDTH;
      const dy = Math.random() * GAME.HEIGHT;
      const decor = this.add.image(dx, dy, key);
      decor.setAlpha(0.3 + Math.random() * 0.2);
      decor.setDepth(-5);
    }
  }

  _createAmbientParticles() {
    const cfg = EFFECTS.AMBIENT;
    for (let i = 0; i < cfg.COUNT; i++) {
      const x = Math.random() * GAME.WIDTH;
      const y = Math.random() * GAME.HEIGHT;
      const size = cfg.SIZE_MIN + Math.random() * (cfg.SIZE_MAX - cfg.SIZE_MIN);
      const color = cfg.COLORS[Math.floor(Math.random() * cfg.COLORS.length)];
      const alpha = cfg.ALPHA_MIN + Math.random() * (cfg.ALPHA_MAX - cfg.ALPHA_MIN);
      const speed = cfg.SPEED_MIN + Math.random() * (cfg.SPEED_MAX - cfg.SPEED_MIN);

      const p = this.add.rectangle(x, y, Math.max(1, Math.round(size)), Math.max(1, Math.round(size)), color, alpha);
      p.setDepth(-2);

      // Drift slowly across the screen, wrap around
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.tweens.add({
        targets: p,
        x: x + vx * 10,
        y: y + vy * 10,
        alpha: { from: alpha, to: alpha * 0.3 },
        duration: 8000 + Math.random() * 4000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  _updatePlayerTrail(delta) {
    if (!this.player || !this.player.sprite) return;
    const cfg = EFFECTS.PLAYER_TRAIL;
    this._trailTimer += delta;

    if (this._trailTimer >= cfg.UPDATE_INTERVAL) {
      this._trailTimer = 0;
      this._trailPositions.unshift({ x: this.player.sprite.x, y: this.player.sprite.y });
      if (this._trailPositions.length > cfg.LENGTH) {
        this._trailPositions.pop();
      }
    }

    // Ensure we have enough trail sprites
    while (this._trailSprites.length < this._trailPositions.length) {
      const ts = this.add.rectangle(0, 0, 16 * SPRITE_SCALE * 0.6, 16 * SPRITE_SCALE * 0.6, 0x00ffff, 0);
      ts.setDepth(4);
      this._trailSprites.push(ts);
    }

    // Update trail positions and alpha
    for (let i = 0; i < this._trailSprites.length; i++) {
      if (i < this._trailPositions.length) {
        const pos = this._trailPositions[i];
        this._trailSprites[i].setPosition(pos.x, pos.y);
        this._trailSprites[i].setAlpha(Math.max(0, cfg.ALPHA_START - i * cfg.ALPHA_STEP));
        this._trailSprites[i].setVisible(true);
      } else {
        this._trailSprites[i].setVisible(false);
      }
    }
  }

  update(time, delta) {
    if (gameState.gameOver) return;

    // --- Input ---
    let inputX = 0;
    let inputY = 0;

    // Keyboard: WASD / arrows
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;

    if (left) inputX -= 1;
    if (right) inputX += 1;
    if (up) inputY -= 1;
    if (down) inputY += 1;

    // Touch/pointer: override keyboard if pointer is active
    if (this.pointerActive) {
      const dx = this.pointerX - this.player.sprite.x;
      const dy = this.pointerY - this.player.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only move if pointer is far enough from player (dead zone)
      const deadZone = PLAYER.SIZE * 2;
      if (dist > deadZone) {
        inputX = dx / dist;
        inputY = dy / dist;
      } else {
        // Close enough, stop moving
        inputX = 0;
        inputY = 0;
      }
    }

    this.player.update(inputX, inputY);

    // --- Player trail ---
    this._updatePlayerTrail(delta || 16);

    // --- Spawn system update (clean up off-screen enemies, update homing) ---
    this.spawnSystem.update();

    // --- Collision: player vs enemies ---
    const enemySprites = this.spawnSystem.getEnemySprites();
    for (const enemySprite of enemySprites) {
      if (this.physics.overlap(this.player.sprite, enemySprite)) {
        this.triggerGameOver();
        return;
      }
    }

    // --- Overlap: player vs fragments ---
    const fragments = this.spawnSystem.fragments;
    for (let i = fragments.length - 1; i >= 0; i--) {
      const fragment = fragments[i];
      if (this.physics.overlap(this.player.sprite, fragment.sprite)) {
        this.collectFragment(fragment);
      }
    }
  }

  collectFragment(fragment) {
    // Add score
    this.scoreSystem.onAddScore(1);

    // Trigger slowdown
    this.spawnSystem.applySlowdown();

    // Emit collection event
    eventBus.emit(Events.FRAGMENT_COLLECTED, {
      x: fragment.sprite.x,
      y: fragment.sprite.y,
      score: gameState.score,
    });

    // Remove fragment
    this.spawnSystem.removeFragment(fragment);
  }

  triggerGameOver() {
    if (gameState.gameOver) return;
    gameState.gameOver = true;

    // Stop player
    this.player.sprite.body.setVelocity(0, 0);

    eventBus.emit(Events.PLAYER_DIED);
    eventBus.emit(Events.GAME_OVER, {
      score: gameState.score,
      survivalTime: gameState.survivalTime,
    });

    // Brief pause before transitioning
    this.time.delayedCall(400, () => {
      this.spawnSystem.destroy();
      this.scene.start('GameOverScene');
    });
  }

  shutdown() {
    // Clean up when scene is stopped
    if (this.spawnSystem) {
      this.spawnSystem.destroy();
    }
    if (this.particleSystem) {
      this.particleSystem.destroy();
    }
  }
}

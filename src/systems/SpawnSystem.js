import { ENEMY, FRAGMENT, GAME } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { Enemy, EnemyType } from '../entities/Enemy.js';
import { Fragment } from '../entities/Fragment.js';

export class SpawnSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {Function} getPlayerSprite - Returns the player sprite (for homing enemies)
   */
  constructor(scene, getPlayerSprite) {
    this.scene = scene;
    this.getPlayerSprite = getPlayerSprite;

    /** @type {Enemy[]} */
    this.enemies = [];
    /** @type {Fragment[]} */
    this.fragments = [];

    this.currentSpawnInterval = ENEMY.SPAWN_INTERVAL_START;
    this.elapsedTime = 0; // ms of gameplay

    // Enemy spawn timer
    this.enemyTimer = scene.time.addEvent({
      delay: this.currentSpawnInterval,
      callback: () => this.spawnEnemy(),
      loop: true,
    });

    // Fragment spawn timer
    this.fragmentTimer = scene.time.addEvent({
      delay: FRAGMENT.SPAWN_INTERVAL,
      callback: () => this.spawnFragment(),
      loop: true,
    });

    // Acceleration timer: every 1 second, increase speed and tighten spawn rate
    this.accelTimer = scene.time.addEvent({
      delay: 1000,
      callback: () => this.accelerate(),
      loop: true,
    });

    // Spawn initial fragment so the player has something to chase
    scene.time.delayedCall(500, () => this.spawnFragment());
  }

  /**
   * Called every second to increase difficulty
   */
  accelerate() {
    this.elapsedTime += 1000;
    gameState.survivalTime = this.elapsedTime / 1000;

    // Increase speed multiplier (capped)
    gameState.currentSpeedMultiplier = Math.min(
      1.0 + (this.elapsedTime / 1000) * ENEMY.ACCELERATION_RATE,
      ENEMY.MAX_SPEED_MULTIPLIER
    );

    // Tighten spawn interval
    this.currentSpawnInterval = Math.max(
      ENEMY.SPAWN_INTERVAL_START - (this.elapsedTime / 1000) * ENEMY.SPAWN_ACCELERATION,
      ENEMY.SPAWN_INTERVAL_MIN
    );

    // Update the timer delay
    this.enemyTimer.delay = this.currentSpawnInterval;

    eventBus.emit(Events.ACCELERATION_TICK, {
      speedMultiplier: gameState.currentSpeedMultiplier,
      spawnInterval: this.currentSpawnInterval,
      survivalTime: gameState.survivalTime,
    });
  }

  /**
   * Spawn an enemy from a random edge
   */
  spawnEnemy() {
    if (gameState.gameOver) return;

    // Pick enemy type (weighted by elapsed time)
    const type = this._pickEnemyType();
    const { x, y, vx, vy } = this._getSpawnPosition(type);

    const playerSprite = this.getPlayerSprite();
    const enemy = new Enemy(this.scene, type, x, y, vx, vy, playerSprite);
    this.enemies.push(enemy);

    eventBus.emit(Events.ENEMY_SPAWNED, { type, x, y });
  }

  /**
   * Pick enemy type based on game time
   */
  _pickEnemyType() {
    const t = this.elapsedTime;
    const rand = Math.random();

    // Singularity nodes only after minimum time
    if (t >= ENEMY.SINGULARITY_NODE.MIN_SPAWN_TIME && rand < 0.15) {
      return EnemyType.SINGULARITY_NODE;
    }

    // Data streams are more common (60%), code blocks less (40%)
    return rand < 0.6 ? EnemyType.DATA_STREAM : EnemyType.CODE_BLOCK;
  }

  /**
   * Calculate spawn position and velocity from a random edge
   */
  _getSpawnPosition(type) {
    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    const speed = ENEMY.BASE_SPEED * gameState.currentSpeedMultiplier;
    const slowFactor = gameState.isSlowed ? FRAGMENT.SLOW_FACTOR : 1;

    let x, y, vx, vy;
    let speedMult;

    switch (type) {
      case EnemyType.DATA_STREAM:
        speedMult = ENEMY.DATA_STREAM.SPEED_MULT;
        break;
      case EnemyType.CODE_BLOCK:
        speedMult = ENEMY.CODE_BLOCK.SPEED_MULT;
        break;
      case EnemyType.SINGULARITY_NODE:
        speedMult = ENEMY.SINGULARITY_NODE.SPEED_MULT;
        break;
      default:
        speedMult = 1;
    }

    const finalSpeed = speed * speedMult * slowFactor;
    const margin = 50;

    switch (edge) {
      case 0: // Top
        x = Math.random() * GAME.WIDTH;
        y = -margin;
        break;
      case 1: // Right
        x = GAME.WIDTH + margin;
        y = Math.random() * GAME.HEIGHT;
        break;
      case 2: // Bottom
        x = Math.random() * GAME.WIDTH;
        y = GAME.HEIGHT + margin;
        break;
      case 3: // Left
        x = -margin;
        y = Math.random() * GAME.HEIGHT;
        break;
    }

    // Velocity: aim toward center with some randomness, or toward player for code blocks
    const playerSprite = this.getPlayerSprite();
    let targetX, targetY;

    if (type === EnemyType.CODE_BLOCK && playerSprite) {
      // Code blocks drift toward the player
      targetX = playerSprite.x;
      targetY = playerSprite.y;
    } else {
      // Others aim toward center with some scatter
      targetX = GAME.WIDTH / 2 + (Math.random() - 0.5) * GAME.WIDTH * 0.4;
      targetY = GAME.HEIGHT / 2 + (Math.random() - 0.5) * GAME.HEIGHT * 0.4;
    }

    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      vx = (dx / dist) * finalSpeed;
      vy = (dy / dist) * finalSpeed;
    } else {
      vx = 0;
      vy = finalSpeed;
    }

    return { x, y, vx, vy };
  }

  /**
   * Spawn a humanity fragment at a random safe position
   */
  spawnFragment() {
    if (gameState.gameOver) return;
    if (this.fragments.length >= FRAGMENT.MAX_ON_SCREEN) return;

    const margin = FRAGMENT.EDGE_MARGIN;
    const x = margin + Math.random() * (GAME.WIDTH - margin * 2);
    const y = margin + Math.random() * (GAME.HEIGHT - margin * 2);

    const fragment = new Fragment(this.scene, x, y);
    this.fragments.push(fragment);
  }

  /**
   * Apply slowdown to all active enemies
   */
  applySlowdown() {
    gameState.isSlowed = true;
    eventBus.emit(Events.SLOWDOWN_START);

    for (const enemy of this.enemies) {
      enemy.applySlowdown(FRAGMENT.SLOW_FACTOR);
    }

    // Clear previous slowdown timer if any
    if (this._slowdownTimer) {
      this._slowdownTimer.remove();
    }

    this._slowdownTimer = this.scene.time.delayedCall(FRAGMENT.SLOW_DURATION, () => {
      gameState.isSlowed = false;
      eventBus.emit(Events.SLOWDOWN_END);
      for (const enemy of this.enemies) {
        enemy.restoreSpeed();
      }
    });
  }

  /**
   * Remove a collected fragment
   */
  removeFragment(fragment) {
    const idx = this.fragments.indexOf(fragment);
    if (idx !== -1) {
      this.fragments.splice(idx, 1);
      fragment.destroy();
    }
  }

  /**
   * Update all enemies, remove off-screen ones
   */
  update() {
    // Update homing enemies
    for (const enemy of this.enemies) {
      enemy.update();
    }

    // Remove off-screen enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].isOffScreen()) {
        this.enemies[i].destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  /**
   * Get all enemy sprites for collision detection
   */
  getEnemySprites() {
    return this.enemies.map(e => e.sprite);
  }

  /**
   * Get all fragment sprites for overlap detection
   */
  getFragmentSprites() {
    return this.fragments.map(f => f.sprite);
  }

  /**
   * Clean up everything
   */
  destroy() {
    if (this.enemyTimer) this.enemyTimer.remove();
    if (this.fragmentTimer) this.fragmentTimer.remove();
    if (this.accelTimer) this.accelTimer.remove();
    if (this._slowdownTimer) this._slowdownTimer.remove();

    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    for (const fragment of this.fragments) {
      fragment.destroy();
    }

    this.enemies = [];
    this.fragments = [];
  }
}

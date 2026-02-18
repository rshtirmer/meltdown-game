import Phaser from 'phaser';
import { ENEMY, GAME } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';

// Enemy types
export const EnemyType = {
  DATA_STREAM: 'dataStream',
  CODE_BLOCK: 'codeBlock',
  SINGULARITY_NODE: 'singularityNode',
};

export class Enemy {
  /**
   * @param {Phaser.Scene} scene
   * @param {string} type - One of EnemyType values
   * @param {number} x - Spawn x position
   * @param {number} y - Spawn y position
   * @param {number} vx - Initial velocity x
   * @param {number} vy - Initial velocity y
   * @param {object} [playerSprite] - Reference to player sprite (for homing enemies)
   */
  constructor(scene, type, x, y, vx, vy, playerSprite) {
    this.scene = scene;
    this.type = type;
    this.playerSprite = playerSprite || null;

    const cfg = this._getConfig();

    // Create visual based on type
    let visual;
    if (type === EnemyType.DATA_STREAM) {
      visual = scene.add.rectangle(0, 0, cfg.width, cfg.height, cfg.color);
    } else if (type === EnemyType.CODE_BLOCK) {
      visual = scene.add.rectangle(0, 0, cfg.size, cfg.size, cfg.color);
    } else {
      // Singularity node: small circle
      visual = scene.add.circle(0, 0, cfg.size, cfg.color);
    }

    const container = scene.add.container(x, y, [visual]);
    this.sprite = scene.physics.add.existing(container);

    // Set body size based on type
    if (type === EnemyType.DATA_STREAM) {
      this.sprite.body.setSize(cfg.width, cfg.height);
      this.sprite.body.setOffset(-cfg.width / 2, -cfg.height / 2);
    } else if (type === EnemyType.CODE_BLOCK) {
      this.sprite.body.setSize(cfg.size, cfg.size);
      this.sprite.body.setOffset(-cfg.size / 2, -cfg.size / 2);
    } else {
      // Circle body for singularity nodes
      this.sprite.body.setCircle(cfg.size, -cfg.size, -cfg.size);
    }

    // Set initial velocity
    this.sprite.body.setVelocity(vx, vy);

    // Store base velocity for slowdown adjustments
    this.baseVx = vx;
    this.baseVy = vy;
  }

  _getConfig() {
    switch (this.type) {
      case EnemyType.DATA_STREAM:
        return {
          width: ENEMY.DATA_STREAM.WIDTH,
          height: ENEMY.DATA_STREAM.HEIGHT,
          color: ENEMY.DATA_STREAM.COLOR,
        };
      case EnemyType.CODE_BLOCK:
        return {
          size: ENEMY.CODE_BLOCK.SIZE,
          color: ENEMY.CODE_BLOCK.COLOR,
        };
      case EnemyType.SINGULARITY_NODE:
        return {
          size: ENEMY.SINGULARITY_NODE.SIZE,
          color: ENEMY.SINGULARITY_NODE.COLOR,
        };
      default:
        return { size: 20, color: 0xff0000 };
    }
  }

  update() {
    if (this.type !== EnemyType.SINGULARITY_NODE || !this.playerSprite) return;

    // Homing behavior: lerp velocity toward player direction
    const dx = this.playerSprite.x - this.sprite.x;
    const dy = this.playerSprite.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const speed = ENEMY.BASE_SPEED * ENEMY.SINGULARITY_NODE.SPEED_MULT * gameState.currentSpeedMultiplier;
      const slowFactor = gameState.isSlowed ? ENEMY.SINGULARITY_NODE.SPEED_MULT : 1;
      const targetVx = (dx / dist) * speed * slowFactor;
      const targetVy = (dy / dist) * speed * slowFactor;

      const str = ENEMY.SINGULARITY_NODE.HOMING_STRENGTH;
      const curVx = this.sprite.body.velocity.x;
      const curVy = this.sprite.body.velocity.y;

      this.sprite.body.setVelocity(
        curVx + (targetVx - curVx) * str,
        curVy + (targetVy - curVy) * str
      );
    }
  }

  /**
   * Apply slowdown factor to velocity (for non-homing enemies)
   */
  applySlowdown(factor) {
    if (this.type === EnemyType.SINGULARITY_NODE) return; // homing handles its own speed
    this.sprite.body.setVelocity(
      this.baseVx * factor,
      this.baseVy * factor
    );
  }

  /**
   * Restore normal speed (after slowdown ends)
   */
  restoreSpeed() {
    if (this.type === EnemyType.SINGULARITY_NODE) return;
    this.sprite.body.setVelocity(this.baseVx, this.baseVy);
  }

  /**
   * Check if enemy is off screen (with margin)
   */
  isOffScreen() {
    const margin = 100;
    const x = this.sprite.x;
    const y = this.sprite.y;
    return x < -margin || x > GAME.WIDTH + margin ||
           y < -margin || y > GAME.HEIGHT + margin;
  }

  destroy() {
    this.sprite.destroy();
  }
}

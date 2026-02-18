import Phaser from 'phaser';
import { ENEMY, GAME, SPRITE_SCALE } from '../core/Constants.js';
import { gameState } from '../core/GameState.js';
import { renderSpriteSheet, renderPixelArt } from '../core/PixelRenderer.js';
import { CYBER } from '../sprites/palette.js';
import { dataStreamFrames, codeBlockFrames, singularityFrames } from '../sprites/enemies.js';

// Enemy types
export const EnemyType = {
  DATA_STREAM: 'dataStream',
  CODE_BLOCK: 'codeBlock',
  SINGULARITY_NODE: 'singularityNode',
};

// Texture keys per enemy type
const TEXTURE_KEYS = {
  [EnemyType.DATA_STREAM]: 'enemy-datastream',
  [EnemyType.CODE_BLOCK]: 'enemy-codeblock',
  [EnemyType.SINGULARITY_NODE]: 'enemy-singularity',
};

// Animation keys (only for multi-frame types)
const ANIM_KEYS = {
  [EnemyType.DATA_STREAM]: 'datastream-scroll',
  [EnemyType.SINGULARITY_NODE]: 'singularity-pulse',
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

    const textureKey = TEXTURE_KEYS[type];

    // Render textures if they do not already exist
    this._ensureTextures(scene);

    // Create physics sprite
    this.sprite = scene.physics.add.sprite(x, y, textureKey);

    // Set up animations for multi-frame types
    if (type === EnemyType.DATA_STREAM) {
      if (!scene.anims.exists(ANIM_KEYS[type])) {
        scene.anims.create({
          key: ANIM_KEYS[type],
          frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: 1 }),
          frameRate: 6,
          repeat: -1,
        });
      }
      this.sprite.play(ANIM_KEYS[type]);
    } else if (type === EnemyType.SINGULARITY_NODE) {
      if (!scene.anims.exists(ANIM_KEYS[type])) {
        scene.anims.create({
          key: ANIM_KEYS[type],
          frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: 1 }),
          frameRate: 4,
          repeat: -1,
        });
      }
      this.sprite.play(ANIM_KEYS[type]);
    }

    // Set physics body sizes to match sprite pixel dimensions
    if (type === EnemyType.DATA_STREAM) {
      // 16x8 sprite
      const w = 16 * SPRITE_SCALE;
      const h = 8 * SPRITE_SCALE;
      this.sprite.body.setSize(w, h);
      this.sprite.body.setOffset(0, 0);
    } else if (type === EnemyType.CODE_BLOCK) {
      // 16x16 sprite
      const s = 16 * SPRITE_SCALE;
      this.sprite.body.setSize(s, s);
      this.sprite.body.setOffset(0, 0);
    } else {
      // Singularity node: 12x12 sprite, circle body
      const s = 12 * SPRITE_SCALE;
      const radius = s / 2;
      this.sprite.body.setCircle(radius, 0, 0);
    }

    // Set initial velocity
    this.sprite.body.setVelocity(vx, vy);

    // Store base velocity for slowdown adjustments
    this.baseVx = vx;
    this.baseVy = vy;
  }

  _ensureTextures(scene) {
    // Data stream: 16x8, 2 frames -- use spritesheet
    renderSpriteSheet(scene, dataStreamFrames, CYBER, TEXTURE_KEYS[EnemyType.DATA_STREAM], SPRITE_SCALE);
    // Code block: 16x16, 1 frame -- use spritesheet for consistency
    renderSpriteSheet(scene, codeBlockFrames, CYBER, TEXTURE_KEYS[EnemyType.CODE_BLOCK], SPRITE_SCALE);
    // Singularity node: 12x12, 2 frames
    renderSpriteSheet(scene, singularityFrames, CYBER, TEXTURE_KEYS[EnemyType.SINGULARITY_NODE], SPRITE_SCALE);
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

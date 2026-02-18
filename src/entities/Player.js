import Phaser from 'phaser';
import { PLAYER, GAME, SPRITE_SCALE } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { renderSpriteSheet } from '../core/PixelRenderer.js';
import { CYBER } from '../sprites/palette.js';
import { playerFrames } from '../sprites/player.js';

const PLAYER_KEY = 'player-sprite';

export class Player {
  constructor(scene) {
    this.scene = scene;

    // Render the player spritesheet texture (16x16, 2 frames)
    renderSpriteSheet(scene, playerFrames, CYBER, PLAYER_KEY, SPRITE_SCALE);

    // Create physics sprite
    this.sprite = scene.physics.add.sprite(PLAYER.START_X, PLAYER.START_Y, PLAYER_KEY);

    // Create pulsing animation (2 frames at ~4fps)
    if (!scene.anims.exists('player-pulse')) {
      scene.anims.create({
        key: 'player-pulse',
        frames: scene.anims.generateFrameNumbers(PLAYER_KEY, { start: 0, end: 1 }),
        frameRate: 4,
        repeat: -1,
      });
    }
    this.sprite.play('player-pulse');

    // Set up physics body as a circle matching the sprite visual
    // The sprite pixel grid is 16x16 at SPRITE_SCALE, so actual texture size is 16*SPRITE_SCALE
    const spritePixelSize = 16 * SPRITE_SCALE;
    const bodyRadius = spritePixelSize / 2;
    this.sprite.body.setCircle(bodyRadius, 0, 0);
    this.sprite.body.setCollideWorldBounds(true);
  }

  update(inputX, inputY) {
    const body = this.sprite.body;

    // Normalize diagonal movement so it does not exceed PLAYER.SPEED
    const len = Math.sqrt(inputX * inputX + inputY * inputY);
    if (len > 0) {
      const nx = inputX / len;
      const ny = inputY / len;
      body.setVelocity(nx * PLAYER.SPEED, ny * PLAYER.SPEED);
    } else {
      body.setVelocity(0, 0);
    }
  }

  reset() {
    this.sprite.setPosition(PLAYER.START_X, PLAYER.START_Y);
    this.sprite.body.setVelocity(0, 0);
  }

  destroy() {
    this.sprite.destroy();
  }
}

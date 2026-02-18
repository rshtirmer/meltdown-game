import Phaser from 'phaser';
import { PLAYER, GAME } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';

export class Player {
  constructor(scene) {
    this.scene = scene;

    // Create a glowing orb: outer glow ring + inner bright circle
    const container = scene.add.container(PLAYER.START_X, PLAYER.START_Y);

    // Outer glow (larger, semi-transparent)
    const glow = scene.add.circle(0, 0, PLAYER.SIZE * 1.8, PLAYER.COLOR, 0.15);
    container.add(glow);

    // Inner bright core
    const core = scene.add.circle(0, 0, PLAYER.SIZE, PLAYER.COLOR);
    container.add(core);

    // Bright center dot
    const center = scene.add.circle(0, 0, PLAYER.SIZE * 0.4, 0xffffff);
    container.add(center);

    this.sprite = scene.physics.add.existing(container);
    this.sprite.body.setCircle(
      PLAYER.SIZE,
      -PLAYER.SIZE,
      -PLAYER.SIZE
    );
    this.sprite.body.setCollideWorldBounds(true);

    // Store references for glow animation
    this.glow = glow;
    this.core = core;

    // Subtle pulsing glow
    scene.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.3 },
      scaleX: { from: 1.0, to: 1.15 },
      scaleY: { from: 1.0, to: 1.15 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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

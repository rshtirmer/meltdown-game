import Phaser from 'phaser';
import { FRAGMENT, GAME } from '../core/Constants.js';

export class Fragment {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    this.scene = scene;

    // Create visual: outer glow + inner bright circle
    const container = scene.add.container(x, y);

    // Outer glow
    const glow = scene.add.circle(0, 0, FRAGMENT.SIZE * 2, FRAGMENT.COLOR, 0.2);
    container.add(glow);

    // Core
    const core = scene.add.circle(0, 0, FRAGMENT.SIZE, FRAGMENT.COLOR);
    container.add(core);

    // Bright center
    const center = scene.add.circle(0, 0, FRAGMENT.SIZE * 0.4, FRAGMENT.GLOW_COLOR);
    container.add(center);

    this.sprite = scene.physics.add.existing(container);
    this.sprite.body.setCircle(
      FRAGMENT.SIZE,
      -FRAGMENT.SIZE,
      -FRAGMENT.SIZE
    );

    // Gentle bobbing animation
    scene.tweens.add({
      targets: container,
      y: y - FRAGMENT.BOB_AMPLITUDE,
      duration: FRAGMENT.BOB_DURATION / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pulsing glow
    scene.tweens.add({
      targets: glow,
      alpha: { from: 0.2, to: 0.45 },
      scaleX: { from: 1.0, to: 1.2 },
      scaleY: { from: 1.0, to: 1.2 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  destroy() {
    this.sprite.destroy();
  }
}

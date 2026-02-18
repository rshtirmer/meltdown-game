import Phaser from 'phaser';
import { FRAGMENT, GAME, SPRITE_SCALE } from '../core/Constants.js';
import { renderSpriteSheet } from '../core/PixelRenderer.js';
import { CYBER } from '../sprites/palette.js';
import { fragmentFrames } from '../sprites/items.js';

const FRAGMENT_KEY = 'fragment-sprite';

export class Fragment {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    this.scene = scene;

    // Render the fragment texture (12x12, 1 frame)
    renderSpriteSheet(scene, fragmentFrames, CYBER, FRAGMENT_KEY, SPRITE_SCALE);

    // Create physics sprite
    this.sprite = scene.physics.add.sprite(x, y, FRAGMENT_KEY);

    // Circle body matching the 12x12 diamond sprite
    const spritePixelSize = 12 * SPRITE_SCALE;
    const bodyRadius = spritePixelSize / 2;
    this.sprite.body.setCircle(bodyRadius, 0, 0);

    // Gentle bobbing animation (same as original)
    scene.tweens.add({
      targets: this.sprite,
      y: y - FRAGMENT.BOB_AMPLITUDE,
      duration: FRAGMENT.BOB_DURATION / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pulsing alpha for a glow effect
    scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 1.0, to: 0.7 },
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

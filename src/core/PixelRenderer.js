import Phaser from 'phaser';

/**
 * Renders a 2D pixel art array to a Phaser texture.
 *
 * @param {Phaser.Scene} scene  - Active scene (for textures manager)
 * @param {number[][]}   pixels - 2D array of palette indices
 * @param {number[]}     palette - Palette array (index 0 = transparent)
 * @param {string}       key    - Texture key to register
 * @param {number}       scale  - Pixel scale multiplier (default 2)
 */
export function renderPixelArt(scene, pixels, palette, key, scale = 2) {
  if (scene.textures.exists(key)) return;
  const h = pixels.length;
  const w = pixels[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = pixels[y][x];
      if (idx === 0 || palette[idx] == null) continue;
      const color = palette[idx];
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  scene.textures.addCanvas(key, canvas);
}

/**
 * Renders a multi-frame spritesheet to a Phaser spritesheet texture.
 *
 * @param {Phaser.Scene}   scene   - Active scene
 * @param {number[][][]}   frames  - Array of 2D pixel arrays (one per frame)
 * @param {number[]}       palette - Palette array
 * @param {string}         key     - Texture key
 * @param {number}         scale   - Pixel scale multiplier (default 2)
 */
export function renderSpriteSheet(scene, frames, palette, key, scale = 2) {
  if (scene.textures.exists(key)) return;
  const h = frames[0].length;
  const w = frames[0][0].length;
  const frameW = w * scale;
  const frameH = h * scale;
  const canvas = document.createElement('canvas');
  canvas.width = frameW * frames.length;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d');
  frames.forEach((pixels, fi) => {
    const offsetX = fi * frameW;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = pixels[y][x];
        if (idx === 0 || palette[idx] == null) continue;
        const color = palette[idx];
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(offsetX + x * scale, y * scale, scale, scale);
      }
    }
  });
  // Register canvas as a plain texture, then add spritesheet frames to it
  const tex = scene.textures.addCanvas(key, canvas);
  Phaser.Textures.Parsers.SpriteSheet(tex, 0, 0, 0, canvas.width, canvas.height, {
    frameWidth: frameW,
    frameHeight: frameH,
  });
}

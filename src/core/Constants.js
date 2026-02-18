// --- Display ---

// Device pixel ratio (capped at 2 for mobile GPU performance)
export const DPR = Math.min(window.devicePixelRatio || 1, 2);

// Orientation: landscape on desktop, portrait on mobile
const _isPortrait = window.innerHeight > window.innerWidth;

// Design dimensions (logical game units at 1x scale)
const _designW = _isPortrait ? 540 : 960;
const _designH = _isPortrait ? 960 : 540;
const _designAspect = _designW / _designH;

// Canvas dimensions = device pixel area, maintaining design aspect ratio.
// This ensures the canvas has enough resolution for the user's actual display
// so FIT mode never CSS-upscales (which causes blurriness on retina).
const _deviceW = window.innerWidth * DPR;
const _deviceH = window.innerHeight * DPR;

let _canvasW, _canvasH;
if (_deviceW / _deviceH > _designAspect) {
  // Viewport wider than design -> width-limited by FIT -> match device width
  _canvasW = _deviceW;
  _canvasH = Math.round(_deviceW / _designAspect);
} else {
  // Viewport taller than design -> width-limited by FIT -> match device width
  _canvasW = Math.round(_deviceH * _designAspect);
  _canvasH = _deviceH;
}

// PX = canvas pixels per design pixel. Scales all absolute values (sizes, speeds, etc.)
// from design space to canvas space. Gameplay proportions stay identical across all displays.
export const PX = _canvasW / _designW;

export const GAME = {
  WIDTH: _canvasW,
  HEIGHT: _canvasH,
  IS_PORTRAIT: _isPortrait,
};

// --- Player ---

export const PLAYER = {
  START_X: _canvasW / 2,
  START_Y: _canvasH / 2,
  SIZE: 16 * PX,                    // radius of the player orb
  SPEED: 220 * PX,                  // movement speed in all directions
  COLOR: 0x00ffff,                  // neon cyan
};

// --- Enemies ---

export const ENEMY = {
  BASE_SPEED: 100 * PX,             // starting base speed for enemies
  SPAWN_INTERVAL_START: 1200,        // ms between spawns at game start
  SPAWN_INTERVAL_MIN: 250,           // minimum spawn interval (cap)
  ACCELERATION_RATE: 0.015,          // speed multiplier increase per second
  SPAWN_ACCELERATION: 15,            // ms to subtract from spawn interval per second
  MAX_SPEED_MULTIPLIER: 4.0,         // cap on speed multiplier

  DATA_STREAM: {
    WIDTH: 60 * PX,
    HEIGHT: 8 * PX,
    SPEED_MULT: 1.6,                // faster than base
    COLOR: 0xff3333,                // red
  },

  CODE_BLOCK: {
    SIZE: 28 * PX,
    SPEED_MULT: 0.7,                // slower, bulkier
    COLOR: 0xff6600,                // orange
  },

  SINGULARITY_NODE: {
    SIZE: 10 * PX,
    SPEED_MULT: 1.2,
    HOMING_STRENGTH: 0.03,          // lerp factor toward player per frame
    MIN_SPAWN_TIME: 15000,          // only spawn after 15s of gameplay
    COLOR: 0xff00ff,                // magenta
  },
};

// --- Humanity Fragments (collectibles) ---

export const FRAGMENT = {
  SIZE: 12 * PX,                    // radius
  SPAWN_INTERVAL: 3000,             // ms between fragment spawns
  SLOW_DURATION: 2000,              // ms duration of slowdown effect
  SLOW_FACTOR: 0.7,                 // multiply enemy speed by this during slowdown
  MAX_ON_SCREEN: 5,                 // max fragments at once
  COLOR: 0xffd700,                  // gold
  GLOW_COLOR: 0xffffff,            // white glow
  BOB_AMPLITUDE: 4 * PX,           // vertical bob distance
  BOB_DURATION: 1200,              // ms for one bob cycle
  EDGE_MARGIN: 60 * PX,            // minimum distance from edges when spawning
};

// --- Colors ---

export const COLORS = {
  // Background
  BG: 0x0a0a1a,                    // very dark blue-black

  // Gameplay
  PLAYER: 0x00ffff,                // neon cyan
  PLAYER_GLOW: 0x0088aa,           // dimmer cyan for glow ring

  // Enemies
  DATA_STREAM: 0xff3333,
  CODE_BLOCK: 0xff6600,
  SINGULARITY: 0xff00ff,

  // Fragments
  FRAGMENT: 0xffd700,              // gold
  FRAGMENT_GLOW: 0xffffff,

  // UI text
  UI_TEXT: '#ffffff',
  UI_SHADOW: '#000000',
  MUTED_TEXT: '#8888aa',
  SCORE_GOLD: '#ffd700',
  SURVIVAL_TEXT: '#00ffff',

  // Menu / GameOver gradient backgrounds
  BG_TOP: 0x0a0a1a,
  BG_BOTTOM: 0x1a0a2e,

  // Buttons
  BTN_PRIMARY: 0x6c63ff,
  BTN_PRIMARY_HOVER: 0x857dff,
  BTN_PRIMARY_PRESS: 0x5a52d5,
  BTN_TEXT: '#ffffff',
};

// --- UI sizing (proportional to game dimensions) ---

export const UI = {
  FONT: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  TITLE_RATIO: 0.08,          // title font size as % of GAME.HEIGHT
  HEADING_RATIO: 0.05,        // heading font size
  BODY_RATIO: 0.035,          // body/button font size
  SMALL_RATIO: 0.025,         // hint/caption font size
  BTN_W_RATIO: 0.45,          // button width as % of GAME.WIDTH
  BTN_H_RATIO: 0.075,         // button height as % of GAME.HEIGHT
  BTN_RADIUS: 12 * PX,        // button corner radius
  MIN_TOUCH: 44 * PX,         // minimum touch target
  // Score HUD omitted -- Play.fun widget displays score in a deadzone at the top
};

// --- Transitions ---

export const TRANSITION = {
  FADE_DURATION: 350,
};

import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { audioManager } from './AudioManager.js';
import { gameplayBGM, gameOverTheme } from './music.js';
import { scoreSfx, deathSfx, slowdownSfx, clickSfx, accelWarnSfx } from './sfx.js';

let audioInitiated = false;

function initOnInteraction() {
  if (audioInitiated) return;
  audioInitiated = true;

  // Restore mute preference from localStorage
  const savedMute = localStorage.getItem('meltdown-muted');
  if (savedMute === 'true') {
    gameState.isMuted = true;
  }

  audioManager.init();

  // Start gameplay BGM immediately (game boots into gameplay)
  if (!gameState.isMuted) {
    audioManager.playMusic(gameplayBGM);
  }

  // Remove init listeners
  window.removeEventListener('pointerdown', initOnInteraction);
  window.removeEventListener('keydown', initOnInteraction);
}

export function initAudioBridge() {
  // Init audio on first user interaction (browser autoplay policy)
  window.addEventListener('pointerdown', initOnInteraction, { once: false });
  window.addEventListener('keydown', initOnInteraction, { once: false });

  // BGM transitions
  eventBus.on(Events.MUSIC_GAMEPLAY, () => {
    if (!gameState.isMuted) audioManager.playMusic(gameplayBGM);
  });
  eventBus.on(Events.MUSIC_GAMEOVER, () => {
    if (!gameState.isMuted) audioManager.playMusic(gameOverTheme);
  });
  eventBus.on(Events.MUSIC_STOP, () => audioManager.stopMusic());

  // SFX
  eventBus.on(Events.FRAGMENT_COLLECTED, () => scoreSfx());
  eventBus.on(Events.PLAYER_DIED, () => deathSfx());
  eventBus.on(Events.SLOWDOWN_START, () => slowdownSfx());

  // Game lifecycle
  eventBus.on(Events.GAME_OVER, () => {
    eventBus.emit(Events.MUSIC_STOP);
    // Short delay then game over theme
    setTimeout(() => eventBus.emit(Events.MUSIC_GAMEOVER), 500);
  });

  eventBus.on(Events.GAME_RESTART, () => {
    eventBus.emit(Events.MUSIC_STOP);
    // Start gameplay BGM after transition
    setTimeout(() => eventBus.emit(Events.MUSIC_GAMEPLAY), 400);
  });

  // Acceleration milestones — play warning SFX
  const warnedMilestones = new Set();
  eventBus.on(Events.ACCELERATION_TICK, (data) => {
    if (!data) return;
    const { speedMultiplier } = data;
    for (const m of [1.5, 2.0, 2.5, 3.0]) {
      if (speedMultiplier >= m && !warnedMilestones.has(m)) {
        warnedMilestones.add(m);
        accelWarnSfx();
        break;
      }
    }
  });

  // Mute toggle — M key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      gameState.isMuted = !gameState.isMuted;
      localStorage.setItem('meltdown-muted', gameState.isMuted);
      if (gameState.isMuted) {
        audioManager.stopMusic();
      } else if (audioInitiated && !gameState.gameOver) {
        audioManager.playMusic(gameplayBGM);
      } else if (audioInitiated && gameState.gameOver) {
        audioManager.playMusic(gameOverTheme);
      }
    }
  });

  // Reset milestone warnings on restart
  eventBus.on(Events.GAME_RESTART, () => warnedMilestones.clear());
}

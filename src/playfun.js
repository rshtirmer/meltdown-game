import { eventBus, Events } from './core/EventBus.js';
import { gameState } from './core/GameState.js';

const GAME_ID = '80db7b07-f312-4755-9a3c-22905c805eb1';

let sdk = null;

export async function initPlayFun() {
  if (typeof OpenGameSDK === 'undefined') {
    console.warn('[PlayFun] SDK not loaded, skipping integration');
    return;
  }

  try {
    sdk = new OpenGameSDK({
      gameId: GAME_ID,
      ui: { usePointsWidget: true },
    });

    await sdk.init();
    console.log('[PlayFun] SDK initialized');

    // Wire score events — each fragment collected = 1 point
    eventBus.on(Events.SCORE_CHANGED, () => {
      if (sdk) {
        sdk.addPoints(1);
      }
    });

    // Save points on game over (ends the session)
    eventBus.on(Events.GAME_OVER, () => {
      if (sdk) {
        sdk.savePoints();
      }
    });
  } catch (err) {
    console.warn('[PlayFun] Init failed, game continues without rewards:', err);
  }
}

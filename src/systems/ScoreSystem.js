import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

export class ScoreSystem {
  constructor() {
    this.onAddScore = this.onAddScore.bind(this);
    // Score is triggered directly by GameScene.collectFragment()
    // No need to listen for events here; the scene calls onAddScore() directly.
  }

  onAddScore(points = 1) {
    gameState.addScore(points);
    eventBus.emit(Events.SCORE_CHANGED, { score: gameState.score });
  }

  destroy() {
    // Clean up listeners here if any were added
  }
}

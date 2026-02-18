class GameState {
  constructor() {
    this.bestScore = 0;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.bestScore = this.bestScore || 0;
    this.started = false;
    this.gameOver = false;
    this.survivalTime = 0;
    this.fragmentsCollected = 0;
    this.currentSpeedMultiplier = 1.0;
    this.isSlowed = false;
    this.isMuted = false;
  }

  addScore(points = 1) {
    this.score += points;
    this.fragmentsCollected += points;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
    }
  }
}

export const gameState = new GameState();

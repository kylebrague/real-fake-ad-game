import type { GameState } from "./GameState";

export class InputManager {
  private gameState: GameState;
  
  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    document.addEventListener("keyup", this.handleKeyUp.bind(this));
    
    // Could add touch events here for mobile support
  }
  
  private handleKeyDown(e: KeyboardEvent): void {
    // Movement controls
    if (e.key === "ArrowLeft") {
      this.gameState.player.isMovingLeft = true;
    } else if (e.key === "ArrowRight") {
      this.gameState.player.isMovingRight = true;
    }
    
    // Shooting
    if (e.key === " ") {
      this.gameState.playerShoot();
    }
    
    // Game controls
    if (e.key === "p") {
      this.gameState.togglePause();
    }
    
    // Reset game (when game over)
    if (e.key === "r" && this.gameState.isGameOver) {
      this.gameState.reset();
    }
  }
  
  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key === "ArrowLeft") {
      this.gameState.player.isMovingLeft = false;
    } else if (e.key === "ArrowRight") {
      this.gameState.player.isMovingRight = false;
    }
  }
  
  // Could add touch controls here:
  // handleTouchStart, handleTouchMove, handleTouchEnd
  
  public cleanup(): void {
    // Remove event listeners when no longer needed
    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
    document.removeEventListener("keyup", this.handleKeyUp.bind(this));
  }
}
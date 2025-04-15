import type { GameState } from "./GameState";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  
  constructor(ctx: CanvasRenderingContext2D, gameState: GameState) {
    this.ctx = ctx;
    this.gameState = gameState;
  }
  
  // Main render method
  render(): void {
    this.clear();
    
    // If game is over or paused, we still render the entities first
    // and then overlay the game state message
    this.renderEntities();
    
    if (this.gameState.isGameOver) {
      this.renderGameOver();
    } else if (this.gameState.isPaused) {
      this.renderPaused();
    }
    
    this.renderUI();
  }
  
  // Clear the canvas
  private clear(): void {
    this.ctx.clearRect(
      0, 
      0, 
      this.gameState.config.canvasWidth, 
      this.gameState.config.canvasHeight
    );
  }
  
  // Render all game entities
  private renderEntities(): void {
    // Render player
    this.gameState.player.render(this.ctx);
    
    // Render bullets
    for (const bullet of this.gameState.bullets) {
      bullet.render(this.ctx);
    }
    
    // Render enemies
    for (const enemy of this.gameState.enemies) {
      enemy.render(this.ctx);
    }
    
    // Render powerups
    for (const powerup of this.gameState.powerups) {
      powerup.render(this.ctx);
    }
  }
  
  // Render game over screen
  private renderGameOver(): void {
    // Semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(
      0, 
      0, 
      this.gameState.config.canvasWidth, 
      this.gameState.config.canvasHeight
    );
    
    // Game over text
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "40px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "GAME OVER", 
      this.gameState.config.canvasWidth / 2, 
      this.gameState.config.canvasHeight / 2
    );
    
    // Restart instructions
    this.ctx.font = "20px Arial";
    this.ctx.fillText(
      "Press 'R' to restart", 
      this.gameState.config.canvasWidth / 2, 
      this.gameState.config.canvasHeight / 2 + 40
    );
  }
  
  // Render pause screen
  private renderPaused(): void {
    // Semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(
      0, 
      0, 
      this.gameState.config.canvasWidth, 
      this.gameState.config.canvasHeight
    );
    
    // Pause text
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "40px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "PAUSED", 
      this.gameState.config.canvasWidth / 2, 
      this.gameState.config.canvasHeight / 2
    );
    
    // Resume instructions
    this.ctx.font = "20px Arial";
    this.ctx.fillText(
      "Press 'P' to resume", 
      this.gameState.config.canvasWidth / 2, 
      this.gameState.config.canvasHeight / 2 + 40
    );
  }
  
  // Render UI elements (score, instructions, etc.)
  private renderUI(): void {
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "20px Arial";
    this.ctx.textAlign = "left";
    
    // Game status
    this.ctx.fillText(
      `Score: ${this.gameState.score}`, 
      10, 
      30
    );
    
    // Optional: Display player lives
    if (this.gameState.player.lives !== undefined) {
      this.ctx.fillText(
        `Lives: ${this.gameState.player.lives}`, 
        10, 
        60
      );
    }
    
    // Optional: Display player health
    if (this.gameState.player.health !== undefined) {
      this.ctx.fillText(
        `Health: ${this.gameState.player.health}`, 
        10, 
        90
      );
    }
  }
}
import { GameState, type GameConfig } from "./GameState";
import { InputManager } from "./InputManager";
import { Renderer } from "./Renderer";

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private inputManager: InputManager;
  private renderer: Renderer;
  private lastTime = 0;
  private animationFrameId: number;

  constructor(canvasId: string) {
    // Get canvas and context
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    
    // Set up game configuration
    const config: GameConfig = {
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      fps: 60,
      enemySpawnInterval: 2000, // 2 seconds
      powerupSpawnInterval: 3000, // 3 seconds
      leftLaneX: this.canvas.width / 3,
      rightLaneX: (2 * this.canvas.width) / 3
    };
    
    // Initialize game components
    this.gameState = new GameState(config);
    this.inputManager = new InputManager(this.gameState);
    this.renderer = new Renderer(this.ctx, this.gameState);
  }

  // Start the game loop
  start(): void {
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  // Stop the game loop
  stop(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.inputManager.cleanup();
  }
  
  // Main game loop
  private gameLoop(timestamp: number): void {
    // Calculate delta time
    const deltaTime = this.lastTime ? (timestamp - this.lastTime) / 1000 : 0;
    this.lastTime = timestamp;
    
    // Update game state
    this.gameState.update(timestamp, deltaTime);
    
    // Render game
    this.renderer.render();
    
    // Request next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }
}
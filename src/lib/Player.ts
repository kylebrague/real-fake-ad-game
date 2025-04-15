import { Entity, type EntityProperties } from "./Entity";

export class Player extends Entity {
  // Player-specific properties
  score = 0;
  lives = 3;
  isMovingLeft = false;
  isMovingRight = false;

  constructor(x: number, y: number, width: number, height: number, props?: EntityProperties) {
    super(x, y, width, height, {
      health: 100,
      speed: 5,
      damage: 1,
      ...props
    });
  }

  // Player-specific methods
  moveLeft(canvasWidth: number): void {
    this.x -= this.speed || 0;
    if (this.x < 0) this.x = 0;
  }

  moveRight(canvasWidth: number): void {
    this.x += this.speed || 0;
    if (this.x + this.width > canvasWidth) {
      this.x = canvasWidth - this.width;
    }
  }

  shoot(): void {
    // This will be implemented in GameState
    // to create a bullet at player position
  }

  // Override the render method to provide player-specific rendering
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.getProperty<string>("color", "green");
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}
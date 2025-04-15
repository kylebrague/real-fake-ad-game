import { Entity, type EntityProperties } from "./Entity";

export class Enemy extends Entity {
  constructor(x: number, y: number, width: number, height: number, props?: EntityProperties) {
    super(x, y, width, height, {
      health: 3,
      speed: 1,
      damage: 1,
      lane: "left",
      ...props
    });
  }

  // Override updatePosition to move downward
  updatePosition(deltaTime: number): void {
    if (this.speed) {
      this.y += this.speed * deltaTime;
    }
  }

  // Override render method for enemy appearance
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#f00";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Display health if available
    if (this.health !== undefined) {
      ctx.fillStyle = "#fff";
      ctx.font = "12px Arial";
      ctx.fillText(this.health.toString(), this.x + this.width / 2 - 5, this.y + this.height / 2);
    }
  }
}
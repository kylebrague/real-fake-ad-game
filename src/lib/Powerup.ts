import { Entity, type EntityProperties } from "./Entity";

export class Powerup extends Entity {
  constructor(x: number, y: number, width: number, height: number, props?: EntityProperties) {
    super(x, y, width, height, {
      health: 5,
      speed: 1,
      lane: "right",
      ...props
    });
  }

  // Override updatePosition to move downward
  updatePosition(deltaTime: number): void {
    if (this.speed) {
      this.y += this.speed * deltaTime;
    }
  }

  // Override render method for powerup appearance
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#00f";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Display health if available
    if (this.health !== undefined) {
      ctx.fillStyle = "#fff";
      ctx.font = "12px Arial";
      ctx.fillText(this.health.toString(), this.x + this.width / 2 - 5, this.y + this.height / 2);
    }
  }

  // Method to apply powerup effect to player
  applyEffect(player: Entity): void {
    // Different powerups can override this method
    // For example, a health powerup might do:
    // if (player.health) player.health += 10;
  }
}
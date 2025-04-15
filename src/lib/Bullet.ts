import { Entity, type EntityProperties } from "./Entity";

export class Bullet extends Entity {
  constructor(x: number, y: number, lane?: string, props?: EntityProperties) {
    super(x, y, 5, 10, {
      speed: 5,
      damage: 1,
      lane,
      ...props
    });
  }

  // Override updatePosition to move upward (bullets travel up)
  updatePosition(deltaTime: number): void {
    if (this.speed) {
      this.y -= this.speed * deltaTime;
    }
  }

  // Override render method for bullet appearance
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#ff0";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}
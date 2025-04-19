import { System } from '../System';
import type { PositionComponent, SizeComponent, RenderComponent } from '../components/CoreComponents';

/**
 * RenderSystem handles drawing entities to the canvas
 */
export class RenderSystem extends System {
  private ctx: CanvasRenderingContext2D;
  
  constructor(ctx: CanvasRenderingContext2D) {
    // This system operates on entities with Position, Size, and Render components
    super(['Position', 'Size', 'Render']);
    this.ctx = ctx;
  }

  update(deltaTime: number): void {
    // Get all entities with Position, Size and Render components
    const entities = this.world.getEntitiesWith('Position', 'Size', 'Render');
    
    // Draw each entity based on its position, size, and render data
    for (const entity of entities) {
      const position = this.world.getComponent<PositionComponent>(entity, 'Position');
      const size = this.world.getComponent<SizeComponent>(entity, 'Size');
      const render = this.world.getComponent<RenderComponent>(entity, 'Render');
      
      if (position && size && render) {
        this.ctx.fillStyle = render.color;
        
        if (render.shape === 'rectangle') {
          this.ctx.fillRect(position.x, position.y, size.width, size.height);
        } else if (render.shape === 'circle') {
          this.ctx.beginPath();
          this.ctx.arc(
            position.x + size.width / 2,
            position.y + size.height / 2,
            Math.min(size.width, size.height) / 2,
            0,
            Math.PI * 2
          );
          this.ctx.fill();
        }
      }
    }
  }
}
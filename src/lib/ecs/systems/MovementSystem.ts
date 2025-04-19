import { System } from '../System';
import type { PositionComponent, VelocityComponent } from '../components/CoreComponents';

/**
 * MovementSystem updates entity positions based on their velocities
 */
export class MovementSystem extends System {
  constructor() {
    // This system operates on entities that have both Position and Velocity components
    super(['Position', 'Velocity']);
  }

  update(deltaTime: number): void {
    // Get all entities with Position and Velocity components
    const entities = this.world.getEntitiesWith('Position', 'Velocity');
    
    // Update the position of each entity based on its velocity
    for (const entity of entities) {
      const position = this.world.getComponent<PositionComponent>(entity, 'Position');
      const velocity = this.world.getComponent<VelocityComponent>(entity, 'Velocity');
      
      if (position && velocity) {
        // Update position based on velocity and delta time
        position.x += velocity.speedX * deltaTime;
        position.y += velocity.speedY * deltaTime;
      }
    }
  }
}
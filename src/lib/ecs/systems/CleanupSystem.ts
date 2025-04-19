import { System } from '../System';
import type { HealthComponent } from '../components/CoreComponents';
import type { BulletComponent } from '../components/GameComponents';

/**
 * CleanupSystem removes entities that are no longer needed
 * (dead enemies, hit bullets, etc)
 */
export class CleanupSystem extends System {
  constructor() {
    super(['Health', 'Position']);
  }

  update(deltaTime: number): void {
    // Find and remove entities with zero health
    const deadEntities = this.world.getEntitiesWith('Health').filter(entity => {
      const health = this.world.getComponent<HealthComponent>(entity, 'Health');
      return health && health.currentHealth <= 0;
    });
    
    // Remove dead entities
    for (const entity of deadEntities) {
      this.world.removeEntity(entity);
    }
    
    // Find and remove bullets that have hit something
    const hitBullets = this.world.getEntitiesWith('Bullet').filter(entity => {
      const bullet = this.world.getComponent<BulletComponent>(entity, 'Bullet');
      return bullet?.hit;
    });
    
    // Remove hit bullets
    for (const entity of hitBullets) {
      this.world.removeEntity(entity);
    }
  }
}
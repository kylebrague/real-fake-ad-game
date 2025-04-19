import type { Component } from './Component';
import { Entity } from './Entity';
import type { System } from './System';

/**
 * World class for the ECS architecture
 * 
 * The World manages all entities, components and systems.
 * It provides methods for creating entities, adding components,
 * querying entities with specific components, and updating systems.
 */
export class World {
  private entities: Entity[] = [];
  private components: Map<number, Map<string, Component>> = new Map();
  private systems: System[] = [];
  private entityComponentCache: Map<string, Entity[]> = new Map();
  private cacheValid = false;

  /**
   * Create a new entity
   */
  createEntity(): Entity {
    const entity = new Entity();
    this.entities.push(entity);
    this.components.set(entity.id, new Map());
    this.cacheValid = false;
    return entity;
  }

  /**
   * Remove an entity and all its components
   */
  removeEntity(entity: Entity): void {
    const index = this.entities.findIndex(e => e.equals(entity));
    if (index !== -1) {
      this.entities.splice(index, 1);
      this.components.delete(entity.id);
      this.cacheValid = false;
    }
  }

  /**
   * Add a component to an entity
   */
  addComponent(entity: Entity, component: Component): void {
    const entityComponents = this.components.get(entity.id);
    if (entityComponents) {
      entityComponents.set(component.type, component);
      this.cacheValid = false;
    }
  }

  /**
   * Get a component from an entity
   */
  getComponent<T extends Component>(entity: Entity, componentType: string): T | undefined {
    const entityComponents = this.components.get(entity.id);
    if (entityComponents) {
      return entityComponents.get(componentType) as T | undefined;
    }
    return undefined;
  }

  /**
   * Remove a component from an entity
   */
  removeComponent(entity: Entity, componentType: string): void {
    const entityComponents = this.components.get(entity.id);
    if (entityComponents) {
      entityComponents.delete(componentType);
      this.cacheValid = false;
    }
  }

  /**
   * Add a system to the world
   */
  addSystem(system: System): void {
    this.systems.push(system);
    system.setWorld(this);
    system.initialize();
  }

  /**
   * Get systems by their class name
   * This allows other systems to find specific system instances
   */
  getSystems(systemName: string): System[] {
    return this.systems.filter(system => {
      const className = system.constructor.name;
      return className === systemName;
    });
  }

  /**
   * Get all entities that have the specified component types
   */
  getEntitiesWith(...componentTypes: string[]): Entity[] {
    const cacheKey = componentTypes.sort().join(',');
    
    if (!this.cacheValid) {
      this.refreshCache();
    }
    
    if (!this.entityComponentCache.has(cacheKey)) {
      const matchingEntities = this.entities.filter(entity => {
        const entityComponents = this.components.get(entity.id);
        if (!entityComponents) return false;
        
        return componentTypes.every(type => 
          entityComponents.has(type)
        );
      });
      
      this.entityComponentCache.set(cacheKey, matchingEntities);
    }
    
    return this.entityComponentCache.get(cacheKey) || [];
  }

  /**
   * Refresh the entity component cache
   */
  private refreshCache(): void {
    this.entityComponentCache.clear();
    this.cacheValid = true;
  }

  /**
   * Update all systems
   */
  update(deltaTime: number): void {
    for (const system of this.systems) {
      system.update(deltaTime);
    }
  }
}
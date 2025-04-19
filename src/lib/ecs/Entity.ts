/**
 * Entity in the ECS architecture
 * 
 * In ECS, entities are just unique identifiers that components are attached to.
 * They have no behavior or data themselves - they're simply a way to group components.
 */
export class Entity {
  private static nextId = 0;
  readonly id: number;

  constructor() {
    this.id = Entity.nextId++;
  }

  /**
   * Check if this entity is the same as another
   */
  equals(other: Entity): boolean {
    return this.id === other.id;
  }
}
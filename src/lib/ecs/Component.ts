/**
 * Component interface for the ECS architecture
 * 
 * Components are pure data containers with no behavior.
 * They store the state that systems operate on.
 * Each component type represents a specific aspect of an entity.
 */
export interface Component {
  /**
   * The type name of the component
   * Used for component management and queries
   */
  readonly type: string;
}
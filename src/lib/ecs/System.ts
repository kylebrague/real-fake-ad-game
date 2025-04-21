import type { World } from './World';

/**
 * Abstract System class for the ECS architecture
 * 
 * Systems contain the game logic and operate on entities with specific components.
 * Each system focuses on a single aspect of game functionality.
 */
export abstract class System {
  /**
   * Reference to the world this system belongs to
   */
  protected world!: World;

  /**
   * Array of component types that this system operates on
   */
  readonly requiredComponents: string[];

  constructor(requiredComponents: string[]) {
    this.requiredComponents = requiredComponents;
  }

  /**
   * Set the world this system belongs to
   */
  setWorld(world: World): void {
    this.world = world;
  }

  /**
   * Initialize the system
   * Called when the system is added to the world
   */
  initialize(): void {}

  /**
   * Update the system
   * Called every frame with the elapsed time
   */
  abstract update(deltaTime: number): void;
}
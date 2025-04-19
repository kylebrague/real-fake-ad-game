# Entity Component System Architecture

## Introduction

This document explains the Entity Component System (ECS) architecture used in the Real Fake Ad Game. The codebase has been refactored from a traditional Object-Oriented Programming (OOP) approach to an ECS architecture to improve modularity, flexibility, and performance.

## What is ECS?

Entity Component System is an architectural pattern primarily used in game development that follows a composition over inheritance approach. It consists of three main parts:

1. **Entities**: Simple containers with unique IDs. They have no behavior or data themselves, they just identify unique objects in your game.
2. **Components**: Pure data containers attached to entities. Each component represents a single aspect of an entity like position, health, or rendering information.
3. **Systems**: Logic processors that operate on entities with specific combinations of components.

## Why ECS?

### Advantages of ECS over Traditional OOP

1. **Better Separation of Concerns**: Data (components) is completely separated from behavior (systems).
2. **Improved Flexibility**: Entities can gain new capabilities by simply adding components, rather than changing inheritance hierarchies.
3. **Enhanced Performance**: Systems can process data in a more cache-friendly way, optimizing for modern CPU architecture.
4. **Easier Debugging**: Since data and behavior are separate, it's easier to inspect game state.
5. **Better Composition**: Game objects can be composed of various combinations of components without deep inheritance hierarchies.

## Core Structure

### Entities

In our implementation, entities are simple objects with unique IDs. They serve as identifiers that components can be attached to.

```typescript
export class Entity {
  private static nextId = 0;
  readonly id: number;
  
  constructor() {
    this.id = Entity.nextId++;
  }
}
```

### Components

Components are pure data structures with no behavior. They store state but don't manipulate it. Each component type represents a single aspect of game functionality:

```typescript
export interface Component {
  readonly type: string;
}

// Example component
export class PositionComponent implements Component {
  readonly type = 'Position';
  
  constructor(
    public x: number,
    public y: number,
    public rotation: number = 0
  ) {}
}
```

### Systems

Systems contain the game logic and operate on entities with specific components. Each system focuses on a single aspect of game functionality:

```typescript
export abstract class System {
  protected world: World;
  readonly requiredComponents: string[];
  
  constructor(requiredComponents: string[]) {
    this.requiredComponents = requiredComponents;
  }
  
  abstract update(deltaTime: number): void;
}
```

### World

The World manages entities, components, and systems. It provides methods for creating entities, adding/removing components, and querying entities based on their components.

## Implementation Details

### Component Types

We've implemented several component types to handle different aspects of game functionality:

1. **Core Components**:
   - `PositionComponent`: Stores x/y coordinates
   - `SizeComponent`: Stores width/height
   - `VelocityComponent`: Stores movement speed and direction
   - `RenderComponent`: Stores visual representation data
   - `HealthComponent`: Stores health status
   - `CollisionComponent`: Marks an entity as collidable

2. **Game-Specific Components**:
   - `PlayerComponent`: Marks an entity as the player
   - `EnemyComponent`: Marks an entity as an enemy
   - `PowerupComponent`: Marks an entity as a powerup
   - `BulletComponent`: Marks an entity as a bullet
   - `LaneComponent`: Tracks which lane an entity belongs to
   - `TagComponent`: Generic tag for special entities

### System Types

We've implemented several systems to handle different aspects of game functionality:

1. **MovementSystem**: Updates entity positions based on velocities
2. **RenderSystem**: Draws entities to the canvas
3. **CollisionSystem**: Detects and resolves collisions
4. **PlayerSystem**: Handles player input and actions
5. **SpawnSystem**: Creates enemies and powerups
6. **CleanupSystem**: Removes dead or off-screen entities

## Performance Considerations

1. **Component Access**: The World class includes a caching mechanism for entity queries to minimize the performance cost of filtering entities.
2. **Memory Layout**: Components are stored in maps for efficient access by entity ID.

## Design Decisions

### Why Composition Over Inheritance?

In the previous OOP architecture, game entities like Player and Enemy inherited from a base Entity class. This created a rigid hierarchy that became harder to extend as new requirements emerged.

With the ECS architecture, we can:
- Add or remove capabilities without changing inheritance hierarchies
- Reuse components across different types of entities
- Process similar components together for better performance

### Component Storage

We chose to store components in a nested map structure (`Map<entityId, Map<componentType, Component>>`) for efficient component lookup by entity ID. This provides a good balance between access speed and flexibility.

### System Priority

Systems are updated in the order they were added to the World. This ensures that systems like MovementSystem run before RenderSystem, but can be easily adjusted if needed.

## Usage Example

Here's how to create a simple enemy entity using the ECS architecture:

```typescript
// Create entity
const enemy = world.createEntity();

// Add components
world.addComponent(enemy, new PositionComponent(100, 50));
world.addComponent(enemy, new SizeComponent(30, 30));
world.addComponent(enemy, new VelocityComponent(0, 50));
world.addComponent(enemy, new RenderComponent('red'));
world.addComponent(enemy, new HealthComponent(1));
world.addComponent(enemy, new EnemyComponent('basic', 10));
```

## Extending the Architecture

To add new features:

1. **New Game Object**: Create an entity and add appropriate components.
2. **New Component Type**: Create a new class implementing the Component interface.
3. **New System**: Create a new class extending the System abstract class.

## Comparison with Other ECS Frameworks

Unlike some ECS frameworks that use structured arrays for component storage or complex archetype systems, our implementation focuses on simplicity and ease of understanding. It provides the core benefits of ECS without requiring a steep learning curve.

## Future Improvements

1. **Event System**: Add a publish/subscribe event system for communication between systems.
2. **Component Pooling**: Implement object pooling for frequently created/destroyed components.
3. **Serialization**: Add support for saving/loading the game state.

## Conclusion

The ECS architecture provides a flexible, modular foundation for the Real Fake Ad Game. It separates data and behavior, making the codebase easier to maintain and extend while providing opportunities for performance optimization.
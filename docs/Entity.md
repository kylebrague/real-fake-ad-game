# Understanding Entities in ECS

## What is an Entity?

In an Entity Component System (ECS) architecture, an **Entity** is simply a unique identifier that groups related components together. Unlike in Object-Oriented Programming where entities might contain both data and behavior, ECS entities are intentionally minimalist.

## Key Concepts

### 1. Entities are Just IDs

In our implementation, an Entity is just a class with a unique ID:

```typescript
export class Entity {
  private static nextId = 0;
  readonly id: number;

  constructor() {
    this.id = Entity.nextId++;
  }
}
```

This is intentionally simple. An entity's purpose is to serve as a "container" that components can be attached to, creating a game object with specific behaviors.

### 2. Entities Have No Behavior

Entities don't have methods that perform actions. All behavior is handled by Systems, which operate on components attached to entities.

### 3. Entity Lifecycle

Entities are:
- **Created** when a new game object is needed
- **Modified** by adding/removing components
- **Destroyed** when no longer needed

## How to Work with Entities

### Creating an Entity

```typescript
// Through the world
const player = world.createEntity();

// Adding components to define what this entity represents
world.addComponent(player, new PositionComponent(100, 200));
world.addComponent(player, new PlayerComponent());
world.addComponent(player, new HealthComponent(100));
```

### Finding Entities

```typescript
// Find all entities with specific components
const movableEntities = world.getEntitiesWith('Position', 'Velocity');

// Find a specific entity (e.g., the player)
const players = world.getEntitiesWith('Player');
const player = players[0]; // Assuming there's only one player
```

### Removing an Entity

```typescript
// Remove entity and all its components
world.removeEntity(entity);
```

## Best Practices

### 1. Create Entity Factories

For entities you create frequently, make factory functions:

```typescript
function createEnemy(x: number, y: number, type: string): Entity {
  const enemy = world.createEntity();
  world.addComponent(enemy, new PositionComponent(x, y));
  world.addComponent(enemy, new SizeComponent(30, 30));
  world.addComponent(enemy, new VelocityComponent(0, 50));
  world.addComponent(enemy, new RenderComponent('red'));
  world.addComponent(enemy, new HealthComponent(1));
  world.addComponent(enemy, new EnemyComponent(type, 10));
  return enemy;
}

// Now easily create enemies
const enemy1 = createEnemy(100, 0, 'basic');
const enemy2 = createEnemy(200, 0, 'fast');
```

### 2. Use Tags for Unique Entities

If you need to identify a special entity (like the player or a boss), add a tag:

```typescript
// Adding a tag component to identify the main player
world.addComponent(player, new TagComponent('mainPlayer'));

// Later, to find that specific entity
function findMainPlayer(): Entity | undefined {
  const taggedEntities = world.getEntitiesWith('Tag');
  return taggedEntities.find(entity => {
    const tag = world.getComponent<TagComponent>(entity, 'Tag');
    return tag?.tag === 'mainPlayer';
  });
}
```

### 3. Avoid Entity Direct References

Instead of storing direct references to entities, prefer to query for them when needed:

```typescript
// AVOID: Storing entity reference directly
let playerEntity: Entity;

// BETTER: Query when needed
function getPlayerEntity(): Entity | undefined {
  const players = world.getEntitiesWith('Player');
  return players.length > 0 ? players[0] : undefined;
}
```

This prevents issues if the original entity is destroyed.

## Common Patterns

### Entity Archetypes

An archetype is a common set of components that define a type of game object:

- **Player Archetype**: Position + Size + Render + Health + Player + Input
- **Enemy Archetype**: Position + Size + Render + Health + Enemy + AI
- **Bullet Archetype**: Position + Size + Render + Velocity + Bullet

Thinking in archetypes helps organize your component combinations consistently.

### Entity Relationships

In ECS, relationships between entities are typically handled through components, not direct references:

```typescript
// Parent-child relationship using components
world.addComponent(childEntity, new ParentComponent(parentEntity.id));

// Finding all children of an entity
function getChildEntities(parentId: number): Entity[] {
  const allPotentialChildren = world.getEntitiesWith('Parent');
  return allPotentialChildren.filter(entity => {
    const parent = world.getComponent<ParentComponent>(entity, 'Parent');
    return parent && parent.parentId === parentId;
  });
}
```

## Entity vs Traditional Game Objects

| Traditional OOP | Entity in ECS |
|----------------|---------------|
| Contains data and behavior | Just an ID that groups components |
| Uses inheritance hierarchy | Uses composition of components |
| Methods define actions | No methods, systems handle behavior |
| Direct relationships | Relationships through component data |

## Performance Considerations

- Entities themselves are very lightweight
- The performance cost comes from component lookups and entity queries
- Caching entity queries where appropriate can improve performance

## Conclusion

Entities in ECS are intentionally minimal - they provide identity, not functionality. This design allows for incredible flexibility through composition, letting you create complex game objects without rigid inheritance hierarchies.

Remember:
1. Entities are just IDs
2. Components provide data
3. Systems provide behavior

By keeping these distinctions clear, you'll build a more maintainable and flexible game architecture.
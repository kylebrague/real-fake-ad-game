# Entity Component System: A Beginner's Guide

## Introduction

If you're new to game development or coming from a traditional Object-Oriented Programming (OOP) background, the Entity Component System (ECS) architecture might seem unfamiliar at first. This guide aims to explain ECS in simple terms, with practical examples from our game.

## ECS in Simple Terms

Think of ECS like building with LEGO blocks:

- **Entities** are like the base plates you build on. They have no functionality by themselves.
- **Components** are the LEGO pieces with different shapes and functions that you attach to your base plate.
- **Systems** are the instructions that tell you what to do with specific combinations of LEGO pieces.

## The Problem ECS Solves

Imagine you're creating a game with different characters:

- A player character that moves, jumps, and has health
- An enemy that moves, attacks, and has health
- A movable crate that can be pushed but has no health

In traditional OOP, you might create a class hierarchy:

```
GameObject
  ├── Character (has movement, health)
  │     ├── Player (adds jumping)
  │     └── Enemy (adds attacking)
  └── Crate (has movement only)
```

But what if you want:
- A new enemy type that can jump like the player?
- A destructible crate that has health?

You'd need to reorganize your entire inheritance hierarchy or duplicate code!

## How ECS Fixes This

With ECS, you **compose** your game objects from reusable components:

1. **Player** = Entity + PositionComponent + HealthComponent + MovementComponent + JumpComponent
2. **Enemy** = Entity + PositionComponent + HealthComponent + MovementComponent + AttackComponent
3. **Crate** = Entity + PositionComponent + MovementComponent

Need a jumping enemy? Just add a JumpComponent to an enemy entity.
Want a destructible crate? Add a HealthComponent to a crate entity.

## ECS Core Concepts with Examples

### 1. Entities

An entity is just a unique identifier - nothing more:

```typescript
// From our Entity.ts file
export class Entity {
  private static nextId = 0;
  readonly id: number;

  constructor() {
    this.id = Entity.nextId++;
  }
}

// Creating a new entity
const player = world.createEntity();
```

### 2. Components

Components are pure data containers with no behavior:

```typescript
// From our CoreComponents.ts file
export class PositionComponent implements Component {
  readonly type = 'Position';
  
  constructor(
    public x: number,
    public y: number,
    public rotation: number = 0
  ) {}
}

// Adding a component to an entity
world.addComponent(player, new PositionComponent(100, 200));
world.addComponent(player, new HealthComponent(100));
```

### 3. Systems

Systems contain the logic that operates on entities with specific components:

```typescript
// From our MovementSystem.ts file
export class MovementSystem extends System {
  constructor() {
    // This system operates on entities that have both Position and Velocity components
    super(['Position', 'Velocity']);
  }

  update(deltaTime: number): void {
    // Get all entities with Position and Velocity components
    const entities = this.world.getEntitiesWith('Position', 'Velocity');
    
    // Update each entity's position based on its velocity
    for (const entity of entities) {
      const position = this.world.getComponent<PositionComponent>(entity, 'Position');
      const velocity = this.world.getComponent<VelocityComponent>(entity, 'Velocity');
      
      if (position && velocity) {
        position.x += velocity.speedX * deltaTime;
        position.y += velocity.speedY * deltaTime;
      }
    }
  }
}
```

## Practical Example: Creating a New Enemy Type

Let's say you want to create a new "Fast Enemy" that moves quicker than regular enemies:

### OOP Way (Old Approach)

```typescript
// You'd need to create a new class
class FastEnemy extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.speed = 100; // Override speed
  }
}

// Then create instances
const fastEnemy = new FastEnemy(200, 0);
```

### ECS Way (New Approach)

```typescript
// Create a basic entity
const fastEnemy = world.createEntity();

// Add all components needed for an enemy
world.addComponent(fastEnemy, new PositionComponent(200, 0));
world.addComponent(fastEnemy, new SizeComponent(30, 30));
world.addComponent(fastEnemy, new RenderComponent('red'));
world.addComponent(fastEnemy, new HealthComponent(1));
world.addComponent(fastEnemy, new EnemyComponent('fast', 15));
world.addComponent(fastEnemy, new CollisionComponent(true, 0, 'enemy'));
world.addComponent(fastEnemy, new LaneComponent('left'));

// Just add a different velocity component than regular enemies
world.addComponent(fastEnemy, new VelocityComponent(0, 100)); // Faster speed!
```

No new classes needed! The existing systems will automatically work with this new entity because they operate on components, not specific entity types.

## Common ECS Patterns

### Adding/Removing Components at Runtime

You can change an entity's behavior by adding or removing components during gameplay:

```typescript
// Give the player invincibility
world.addComponent(player, new InvincibilityComponent(5000)); // 5 seconds

// Later, remove it when time expires
world.removeComponent(player, 'Invincibility');
```

### Tagging Entities

Sometimes you need to mark entities for special treatment:

```typescript
// Mark entity as "main player"
world.addComponent(player, new TagComponent('mainPlayer'));

// Later, find the main player
const mainPlayers = world.getEntitiesWith('Tag');
const mainPlayer = mainPlayers.find(entity => {
  const tag = world.getComponent<TagComponent>(entity, 'Tag');
  return tag && tag.tag === 'mainPlayer';
});
```

### Component Communication

How do systems communicate? Through the components they modify:

```typescript
// CollisionSystem detects a collision and updates HealthComponent
healthComponent.currentHealth -= collisionComponent.damage;

// Later, RenderSystem reads health and shows appropriate visual
if (healthComponent.currentHealth < 20) {
  renderComponent.color = 'red'; // Show low health warning
}
```

## Step-by-Step: Building a Feature with ECS

Let's walk through adding a powerup that makes bullets larger:

1. **Define a new component**:

```typescript
export class PowerupEffectComponent implements Component {
  readonly type = 'PowerupEffect';
  
  constructor(
    public effectType: string,
    public duration: number,
    public timeRemaining: number
  ) {}
}
```

2. **Create a system to handle the effect**:

```typescript
export class PowerupSystem extends System {
  constructor() {
    super(['PowerupEffect']);
  }

  update(deltaTime: number): void {
    const entities = this.world.getEntitiesWith('PowerupEffect');
    
    for (const entity of entities) {
      const effect = this.world.getComponent<PowerupEffectComponent>(entity, 'PowerupEffect');
      if (!effect) continue;
      
      // Decrease remaining time
      effect.timeRemaining -= deltaTime * 1000; // Convert to ms
      
      if (effect.timeRemaining <= 0) {
        // Effect expired, remove it
        this.world.removeComponent(entity, 'PowerupEffect');
        
        // Handle cleanup (e.g., reset bullet size)
        if (effect.effectType === 'enlargeBullets') {
          this.resetBulletSize(entity);
        }
      }
    }
  }
  
  private resetBulletSize(entity: Entity): void {
    // Logic to reset bullet size
  }
}
```

3. **Apply the powerup when collected**:

```typescript
// In collision system, when player collides with a powerup:
const powerupComp = world.getComponent<PowerupComponent>(powerupEntity, 'Powerup');
if (powerupComp && powerupComp.powerupType === 'bulletEnlarge') {
  world.addComponent(playerEntity, new PowerupEffectComponent('enlargeBullets', 10000, 10000));
}
```

4. **Modify bullet creation to check for the effect**:

```typescript
// In PlayerSystem when creating bullets:
const powerupEffect = world.getComponent<PowerupEffectComponent>(playerEntity, 'PowerupEffect');
let bulletSize = 5; // Default size

if (powerupEffect && powerupEffect.effectType === 'enlargeBullets') {
  bulletSize = 10; // Larger size when powerup is active
}

world.addComponent(bullet, new SizeComponent(bulletSize, bulletSize));
```

## Common Pitfalls and Solutions

### Pitfall 1: Grabbing the Wrong Components

```typescript
// BAD: Not checking if components exist
const position = world.getComponent<PositionComponent>(entity, 'Position');
position.x += 5; // Might cause null/undefined error!

// GOOD: Always check first
const position = world.getComponent<PositionComponent>(entity, 'Position');
if (position) {
  position.x += 5;
}
```

### Pitfall 2: Systems with Too Many Responsibilities

```typescript
// BAD: One system doing too much
class GameSystem extends System {
  update() {
    this.handlePlayerMovement();
    this.detectCollisions();
    this.renderGraphics();
    this.playAudio();
  }
}

// GOOD: Split into focused systems
class MovementSystem extends System { /* Just handles movement */ }
class CollisionSystem extends System { /* Just handles collisions */ }
class RenderSystem extends System { /* Just handles rendering */ }
class AudioSystem extends System { /* Just handles audio */ }
```

### Pitfall 3: Not Using Entity Queries Efficiently

```typescript
// BAD: Querying inside loops
for (const enemy of enemies) {
  const targets = world.getEntitiesWith('Player'); // Query inside loop!
  // ...
}

// GOOD: Query once, use multiple times
const targets = world.getEntitiesWith('Player');
for (const enemy of enemies) {
  // Use targets array
}
```

## Exercises to Try

Now that you understand the basics, here are some exercises to try:

1. **Add a Shield Component**:
   - Create a new ShieldComponent that absorbs damage
   - Modify the collision system to check for shields

2. **Create a Score Display System**:
   - Add a ScoreComponent to track player points
   - Create a ScoreDisplaySystem to render the score on screen

3. **Implement a PowerupSpawnerSystem**:
   - Create a system that randomly spawns different types of powerups

## Conclusion

The ECS architecture might seem complex at first, but it offers amazing flexibility once you get used to it. Remember these key points:

- Entities are just IDs
- Components are just data
- Systems contain all the behavior
- Composition over inheritance!

As you work with the codebase, try modifying existing systems or creating new ones. The beauty of ECS is that you can extend functionality without breaking existing code.

Happy coding!
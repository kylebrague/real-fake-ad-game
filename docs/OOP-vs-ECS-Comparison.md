# OOP vs ECS Architecture Comparison

This document compares the original Object-Oriented Programming (OOP) approach with the new Entity Component System (ECS) architecture implemented in the Real Fake Ad Game.

## Object-Oriented Programming Approach

### Structure

In the OOP approach, the game was structured around a class hierarchy:

```
Entity
  ├── Player
  ├── Enemy
  └── Bullet
      └── Powerup
```

Entities inherited behavior and properties from their parent classes, and specialized entities added their own functionality.

### Key Characteristics

1. **Inheritance-Based**: Features and behaviors were inherited from parent classes.
2. **Object-Centric**: Each game object was a self-contained unit with both data and behavior.
3. **Tight Coupling**: Changes to parent classes could affect child classes in unexpected ways.
4. **Method Overriding**: Child classes often needed to override parent methods to customize behavior.

### Challenges

1. **Inflexible Hierarchies**: When a new type of entity needed behavior from multiple parent classes, it became difficult to structure cleanly.
2. **Code Duplication**: Shared functionality between entities that didn't follow the inheritance hierarchy had to be duplicated.
3. **Difficult Composition**: Creating new entity types that shared behaviors from different entity types required complex inheritance chains.
4. **Performance Concerns**: Processing entities often required polymorphic method calls, which can be less efficient.

## Entity Component System Approach

### Structure

In the ECS approach, the game is structured around three core concepts:

- **Entities**: Simple ID containers with no behavior or data
- **Components**: Pure data containers attached to entities
- **Systems**: Logic processors that operate on entities with specific components

### Key Characteristics

1. **Composition-Based**: Entities are composed of various components rather than inheriting behavior.
2. **Data-Oriented**: Strict separation between data (components) and behavior (systems).
3. **Loose Coupling**: Systems operate on any entity with the required components, regardless of "type."
4. **Cache-Friendly**: Similar components can be processed together for better performance.

### Advantages

1. **Flexible Entity Creation**: New entity types can be created by simply combining different components.
2. **Code Reuse**: Systems work on any entity with the required components, eliminating duplication.
3. **Better Separation of Concerns**: Each system handles a single aspect of game functionality.
4. **Easier Debugging**: Data (components) can be inspected independently of behavior (systems).
5. **Performance Optimization**: Systems can process components in a cache-friendly way.

## Code Comparison

### OOP Example (Original)

```typescript
// Player class in OOP approach
export class Player extends Entity {
  // Player-specific properties
  score = 0;
  lives = 3;
  isMovingLeft = false;
  isMovingRight = false;
  shootCallback?: () => void;

  constructor(x: number, y: number, width: number, height: number, props?: EntityProperties) {
    super(x, y, width, height, {
      health: 100,
      speed: 10,
      damage: 1,
      ...props
    });
  }

  // Player-specific methods
  moveLeft(canvasWidth: number): void {
    this.x -= this.speed || 0;
    if (this.x < 0) this.x = 0;
  }

  moveRight(canvasWidth: number): void {
    this.x += this.speed || 0;
    if (this.x + this.width > canvasWidth) {
      this.x = canvasWidth - this.width;
    }
  }

  shoot(): void {
    // Call the registered shoot callback if available
    if (this.shootCallback) {
      this.shootCallback();
    }
  }
}
```

### ECS Example (New)

```typescript
// In the ECS approach, the player is composed of multiple components
const player = world.createEntity();

// Add position, size, render components
world.addComponent(player, new PositionComponent(400, 550));
world.addComponent(player, new SizeComponent(50, 30));
world.addComponent(player, new RenderComponent('green'));
world.addComponent(player, new PlayerComponent(3, 0, false, false));
world.addComponent(player, new HealthComponent(100));

// Player movement is handled by a system
class PlayerSystem extends System {
  constructor(gameWidth: number) {
    super(['Player', 'Position']);
    this.gameWidth = gameWidth;
  }

  update(deltaTime: number): void {
    const playerEntities = this.world.getEntitiesWith('Player', 'Position');
    
    for (const entity of playerEntities) {
      const player = this.world.getComponent<PlayerComponent>(entity, 'Player');
      const position = this.world.getComponent<PositionComponent>(entity, 'Position');
      
      if (player && position) {
        // Handle movement
        if (player.isMovingLeft) {
          position.x = Math.max(0, position.x - 10 * deltaTime);
        }
        if (player.isMovingRight) {
          position.x = Math.min(this.gameWidth, position.x + 10 * deltaTime);
        }
      }
    }
  }
}
```

## Game Loop Comparison

### OOP Game Loop

```typescript
update(deltaTime: number): void {
  // Update player
  this.player.updatePosition(deltaTime);
  
  // Update enemies
  for (let i = this.enemies.length - 1; i >= 0; i--) {
    const enemy = this.enemies[i];
    enemy.updatePosition(deltaTime);
    
    // Check collision with player
    if (enemy.checkCollision(this.player)) {
      this.player.applyDamage(enemy.damage || 0);
      this.enemies.splice(i, 1);
      continue;
    }
    
    // Check if enemy is off screen
    if (enemy.isOffScreen(this.canvas.height)) {
      this.enemies.splice(i, 1);
    }
  }
  
  // Update bullets
  for (let i = this.bullets.length - 1; i >= 0; i--) {
    const bullet = this.bullets[i];
    bullet.updatePosition(deltaTime);
    
    // Check for bullet collisions with enemies
    for (let j = this.enemies.length - 1; j >= 0; j--) {
      const enemy = this.enemies[j];
      if (bullet.checkCollision(enemy)) {
        enemy.applyDamage(bullet.damage || 1);
        bullet.hit = true;
        
        if (enemy.isHit()) {
          this.player.score += 10;
          this.enemies.splice(j, 1);
        }
        
        break;
      }
    }
    
    // Remove bullets that are off screen or have hit something
    if (bullet.isOffScreen(this.canvas.height) || bullet.hit) {
      this.bullets.splice(i, 1);
    }
  }
}
```

### ECS Game Loop

```typescript
// The main game loop just updates all systems
gameLoop(timestamp: number): void {
  // Calculate delta time
  const deltaTime = (timestamp - this.lastFrameTime) / 1000;
  this.lastFrameTime = timestamp;
  
  // Clear canvas
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
  // Update all systems - each handles its own specific logic
  this.world.update(deltaTime);
  
  // Request next frame
  requestAnimationFrame(this.gameLoop.bind(this));
}

// Example of how a system update looks
// MovementSystem.update handles just movement:
update(deltaTime: number): void {
  const entities = this.world.getEntitiesWith('Position', 'Velocity');
  
  for (const entity of entities) {
    const position = this.world.getComponent<PositionComponent>(entity, 'Position');
    const velocity = this.world.getComponent<VelocityComponent>(entity, 'Velocity');
    
    if (position && velocity) {
      position.x += velocity.speedX * deltaTime;
      position.y += velocity.speedY * deltaTime;
    }
  }
}

// CollisionSystem.update handles just collisions:
update(deltaTime: number): void {
  const bullets = this.world.getEntitiesWith('Bullet', 'Position', 'Size');
  const enemies = this.world.getEntitiesWith('Enemy', 'Position', 'Size', 'Health');
  
  for (const bullet of bullets) {
    const bulletPos = this.world.getComponent<PositionComponent>(bullet, 'Position');
    const bulletSize = this.world.getComponent<SizeComponent>(bullet, 'Size');
    
    for (const enemy of enemies) {
      const enemyPos = this.world.getComponent<PositionComponent>(enemy, 'Position');
      const enemySize = this.world.getComponent<SizeComponent>(enemy, 'Size');
      const health = this.world.getComponent<HealthComponent>(enemy, 'Health');
      
      if (this.isColliding(bulletPos, bulletSize, enemyPos, enemySize)) {
        // Handle collision logic
      }
    }
  }
}
```

## Conclusion

### OOP Strengths
- Intuitive mental model: real-world objects map to classes
- Encapsulation of related behavior
- Well-understood design patterns

### ECS Strengths
- Flexibility through composition
- Better separation of concerns
- More cache-friendly data organization
- Easier to add new entity types and behaviors

The ECS refactoring of the Real Fake Ad Game represents a shift toward a more data-oriented, composable architecture that is better suited for games where entities have complex, changing behaviors that don't fit neatly into inheritance hierarchies.

While OOP can be an effective paradigm for many applications, the ECS pattern better addresses the specific challenges of game development, particularly with regard to flexibility, performance, and maintainability.
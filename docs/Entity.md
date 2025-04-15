# Entity Documentation

## Overview

`Entity` is a generalized base class for all game entities within the real-fake-ad-game. It provides common functionality and properties that game entities typically need, while allowing for customization and extension.

## Key Features

- Flexible positioning and dimensioning
- Support for health, speed, and damage properties
- Custom properties system for extending entity data
- Collision detection
- Screen boundary checking
- Rendering capabilities

## Type Definitions

The class uses several TypeScript types for better organization:

### EntityPosition

```typescript
export type EntityPosition = {
  x: number;
  y: number;
};
```

### EntityDimension

```typescript
export type EntityDimension = {
  width: number;
  height: number;
};
```

### EntityProperties

```typescript
export type EntityProperties = {
  health?: number;
  speed?: number;
  damage?: number;
  lane?: string;
  [key: string]: unknown; // Allow for custom properties
};
```

## Constructor

The constructor is designed to be flexible, accepting multiple parameter formats:

```typescript
constructor(
  positionOrX: EntityPosition | number,
  dimensionOrY: EntityDimension | number, 
  widthOrProps?: number | EntityDimension | EntityProperties,
  heightOrProps?: number | EntityProperties,
  props?: EntityProperties
)
```

### Usage Examples

#### Object-based Positioning

```typescript
// Using position and dimension objects
const entity1 = new Entity(
  { x: 10, y: 20 },           // position
  { width: 30, height: 40 },  // dimension
  { health: 100, speed: 5 }   // properties
);
```

#### Individual Coordinates

```typescript
// Using individual coordinates
const entity2 = new Entity(
  10,   // x
  20,   // y
  30,   // width
  40,   // height
  { health: 100, speed: 5 }  // properties
);
```

#### Mixed Format

```typescript
// Using position object with individual dimension values
const entity3 = new Entity(
  { x: 10, y: 20 },  // position
  30,                // width
  40,                // height
  { health: 100 }    // properties
);
```

## Core Properties

- `x: number` - X coordinate of the entity
- `y: number` - Y coordinate of the entity
- `width: number` - Width of the entity
- `height: number` - Height of the entity
- `health?: number` - Optional health value
- `speed?: number` - Optional movement speed
- `damage?: number` - Optional damage value
- `lane?: string` - Optional lane identifier (game-specific)
- `hit: boolean` - Flag to track if entity has been hit
- `properties: Record<string, unknown>` - Storage for custom properties

## Custom Properties System

The class includes a system to attach and retrieve custom properties:

```typescript
// Setting a custom property
entity.setProperty('customKey', 'customValue');

// Getting a custom property with a default value
const value = entity.getProperty<string>('customKey', 'defaultValue');
```

## Methods

### Position and Movement

```typescript
// Update position based on speed and delta time
updatePosition(deltaTime: number): void

// Move entity to specific coordinates
moveTo(x: number, y: number): void
```

### Collision and Boundaries

```typescript
// Check collision with another entity
checkCollision(other: Entity): boolean

// Check if entity is off screen
isOffScreen(canvasHeight: number, canvasWidth?: number): boolean
```

### Status Management

```typescript
// Check if entity is hit (health <= 0)
isHit(): boolean

// Apply damage to entity
applyDamage(amount: number): void

// Reset hit status
resetHit(): void

// Reset entity to default state
reset(defaultHealth = 100): void
```

### Rendering

```typescript
// Render entity to canvas context
render(ctx: CanvasRenderingContext2D, color = "red"): void
```

## Extension

To create specialized game entities, extend this class:

```typescript
class Player extends Entity {
  constructor(x: number, y: number) {
    super(x, y, 30, 30, { health: 100, speed: 5 });
  }
  
  // Add specialized player methods
  shoot(): void {
    // Implementation
  }
}
```

## Migration Guide

When migrating from the previous, less generic version:

1. Update constructor calls to match the new format
2. Use type definitions for better type safety
3. Take advantage of the custom properties system for entity-specific data

## Version History

- **April 2025**: Generalized implementation with flexible constructor and custom properties system
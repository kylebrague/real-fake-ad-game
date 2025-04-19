import type { Component } from '../Component';

/**
 * Position component
 * Contains the x and y coordinates of an entity
 */
export class PositionComponent implements Component {
  readonly type = 'Position';
  
  constructor(
    public x: number,
    public y: number,
    public rotation = 0
  ) {}
}

/**
 * Size component
 * Contains the width and height of an entity
 */
export class SizeComponent implements Component {
  readonly type = 'Size';
  
  constructor(
    public width: number,
    public height: number
  ) {}
}

/**
 * Velocity component
 * Contains the speed and direction of an entity
 */
export class VelocityComponent implements Component {
  readonly type = 'Velocity';
  
  constructor(
    public speedX = 0,
    public speedY = 0
  ) {}
}

/**
 * Render component
 * Contains the visual representation data of an entity
 */
export class RenderComponent implements Component {
  readonly type = 'Render';
  
  constructor(
    public color = 'white',
    public shape: 'rectangle' | 'circle' = 'rectangle'
  ) {}
}

/**
 * Health component
 * Contains the health status of an entity
 */
export class HealthComponent implements Component {
  readonly type = 'Health';
  
  constructor(
    public currentHealth: number,
    public maxHealth: number = currentHealth
  ) {}

  isDead(): boolean {
    return this.currentHealth <= 0;
  }
}

/**
 * Collision component
 * Marks an entity as able to collide
 */
export class CollisionComponent implements Component {
  readonly type = 'Collision';
  
  constructor(
    public collidable = true,
    public damage = 0,
    public collisionGroup = 'default'
  ) {}
}
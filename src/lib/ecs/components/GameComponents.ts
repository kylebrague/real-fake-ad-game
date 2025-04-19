import type { Component } from '../Component';

/**
 * PlayerComponent
 * Marks an entity as the player and stores player-specific data
 */
export class PlayerComponent implements Component {
  readonly type = 'Player';
  
  constructor(
    public lives = 3,
    public score = 0,
    public isMovingLeft = false,
    public isMovingRight = false,
    public bulletCooldown = 0,       // Current cooldown time remaining
    public bulletCooldownMax = 0.25  // Time between shots in seconds (4 shots per second)
  ) {}
}

/**
 * EnemyComponent
 * Marks an entity as an enemy and stores enemy-specific data
 */
export class EnemyComponent implements Component {
  readonly type = 'Enemy';
  
  constructor(
    public enemyType = 'basic',
    public pointValue = 10,
  ) {}
}

/**
 * PowerupComponent
 * Marks an entity as a powerup and stores powerup-specific data
 */
export class PowerupComponent implements Component {
  readonly type = 'Powerup';
  
  constructor(
    public powerupType: 'basic' | 'rapidFire' | 'superRapidFire' | 'normalizedFire' = 'basic',
    public value = 1
  ) {}
}

/**
 * BulletComponent
 * Marks an entity as a bullet and stores bullet-specific data
 */
export class BulletComponent implements Component {
  readonly type = 'Bullet';
  
  constructor(
    public damage = 1,
    public hit = false
  ) {}
}

/**
 * TagComponent
 * Generic tag component that can be used to mark entities for specific systems
 */
export class TagComponent implements Component {
  readonly type = 'Tag';
  
  constructor(
    public tag: string
  ) {}
}

/**
 * GameState component
 */
export class GameStateComponent implements Component {
  readonly type = 'GameState';
  
  constructor(
    public isPaused = false,
    public isGameOver = false
  ) {}
}

/**
 * CooldownModifierComponent
 * Used to apply temporary or permanent modifiers to cooldown systems
 */
export class CooldownModifierComponent implements Component {
  readonly type = 'CooldownModifier';
  
  constructor(
    public bulletCooldownMultiplier = 1.0, // Multiplier for bullet cooldown (< 1 means faster shots)
    public duration = -1,                  // Duration in seconds (-1 means permanent)
    public timeRemaining = -1              // Time remaining for temporary effect (-1 means permanent)
  ) {}
}
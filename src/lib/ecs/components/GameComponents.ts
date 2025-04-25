import type { Component } from '../Component';
import type { Entity } from "../Entity"; // Ensure Entity is imported if not already

/**
 * PlayerComponent
 * Marks an entity as a player-controlled unit.
 */
export class PlayerComponent implements Component {
  readonly type = 'Player';

  constructor(
    public offsetX = 0,             // Horizontal offset relative to initial position
    public speed = 400,             // Player movement speed
    public canShoot = true,         // Flag to check if player can shoot
    public shootCooldown = 0.25,    // Time between shots in seconds
    public currentShootCooldown = 0, // Timer for cooldown
    // Add individual control flags for each player
    public isMovingLeft = false,    // Is this player moving left
    public isMovingRight = false,   // Is this player moving right
    public isShooting = false,      // Is this player shooting
    public playerIndex = 0          // Index to identify this player (0, 1, 2, etc.)
  ) {}
}

/**
 * MultiplierComponent
 * Marks an entity as a multiplier and stores multiplier-specific data
 */
export class MultiplierComponent implements Component {
  readonly type = 'Multiplier';
  
  constructor(
    public value = 5
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
    public isGameOver = false,
    // Remove individual control flags from GameState since they'll be in each PlayerComponent
    // public isMovingLeft = false,
    // public isMovingRight = false,
    // public isShooting = false,
    public score = 0,              // Keep global score tracking
    public activePlayerIndex = 0,  // Which player is currently being controlled (0-indexed)
    public playerCount = 3         // Total number of players
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

/**
 * InputComponent to track the global input state of the game
 * This centralizes all input state in one component, attached to a singleton entity
 */
export class InputComponent implements Component {
  readonly type = 'Input';
  
  constructor(
    public leftPressed = false,
    public rightPressed = false,
    public upPressed = false, 
    public downPressed = false,
    public spacePressed = false, // For shooting
    public pPressed = false,    // For pausing
    public rPressed = false,    // For restarting
    public singleShotTriggered = false, // For one-time actions like manual shots
    public justPaused = false,  // For toggle actions
    public justRestarted = false // For one-time actions
  ) {}
  
  /**
   * Resets one-time triggers after they've been processed
   */
  resetTriggers(): void {
    this.singleShotTriggered = false;
    this.justPaused = false;
    this.justRestarted = false;
  }
}
import { Player } from "./Player";
import { Enemy } from "./Enemy";
import { Powerup } from "./Powerup";
import { Bullet } from "./Bullet";
import { Entity } from "./Entity";

// class for managing the game state

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  fps: number;
  enemySpawnInterval: number;
  powerupSpawnInterval: number;
  leftLaneX: number;
  rightLaneX: number;
}

export class GameState {
  // Game configuration
  config: GameConfig;
  
  // Game status
  isPaused = false;
  isGameOver = false;
  score = 0;
  
  // Game objects
  player: Player;
  enemies: Enemy[] = [];
  powerups: Powerup[] = [];
  bullets: Bullet[] = [];
  
  // Timing variables
  private lastEnemySpawnTime = 0;
  private lastPowerupSpawnTime = 0;

  constructor(config: GameConfig) {
    this.config = config;
    
    // Initialize player at bottom center
    this.player = new Player(
      config.canvasWidth / 2 - 15,  // x
      config.canvasHeight - 30,     // y
      30,                           // width
      30,                           // height
      { color: "green" }            // properties
    );
  }

  // Game state update
  update(timestamp: number, deltaTime: number): void {
    if (this.isPaused || this.isGameOver) return;
    
    // Update player position based on input state (handled by InputManager)
    if (this.player.isMovingLeft) {
      this.player.moveLeft(this.config.canvasWidth);
    }
    if (this.player.isMovingRight) {
      this.player.moveRight(this.config.canvasWidth);
    }
    
    // Spawn enemies at intervals
    if (timestamp - this.lastEnemySpawnTime > this.config.enemySpawnInterval) {
      this.spawnEnemy();
      this.lastEnemySpawnTime = timestamp;
    }
    
    // Spawn powerups at intervals
    if (timestamp - this.lastPowerupSpawnTime > this.config.powerupSpawnInterval) {
      this.spawnPowerup();
      this.lastPowerupSpawnTime = timestamp;
    }
    
    // Update all entity positions
    this.updateEntities(deltaTime);
    
    // Check collisions
    this.checkCollisions();
    
    // Clean up entities that are off-screen or destroyed
    this.cleanupEntities();
  }
  
  // Create a new enemy
  spawnEnemy(): void {
    const enemy = new Enemy(
      this.config.leftLaneX - 15,  // x (centered on lane)
      -30,                         // y (above the screen)
      30,                          // width
      30                           // height
    );
    this.enemies.push(enemy);
  }
  
  // Create a new powerup
  spawnPowerup(): void {
    const powerup = new Powerup(
      this.config.rightLaneX - 15, // x (centered on lane)
      -30,                         // y (above the screen)
      30,                          // width
      30                           // height
    );
    this.powerups.push(powerup);
  }
  
  // Player shoots a bullet
  playerShoot(): void {
    const lane = this.player.x < this.config.canvasWidth / 2 ? "left" : "right";
    const bullet = new Bullet(
      this.player.x + this.player.width / 2 - 2.5, // x (centered on player)
      this.player.y,                               // y (at player position)
      lane                                         // lane based on player position
    );
    this.bullets.push(bullet);
  }
  
  // Update positions of all entities
  private updateEntities(deltaTime: number): void {
    // Update all entity positions
    this.bullets.forEach(bullet => bullet.updatePosition(deltaTime));
    this.enemies.forEach(enemy => enemy.updatePosition(deltaTime));
    this.powerups.forEach(powerup => powerup.updatePosition(deltaTime));
  }
  
  // Check collisions between entities
  private checkCollisions(): void {
    // Check bullet collisions with enemies and powerups
    for (const bullet of this.bullets) {
      // Only check enemies in the same lane as the bullet
      if (bullet.lane === "left") {
        for (const enemy of this.enemies) {
          if (bullet.checkCollision(enemy)) {
            enemy.applyDamage(bullet.damage || 1);
            bullet.hit = true;
            if (enemy.isHit()) {
              this.score += 10;
            }
          }
        }
      } else if (bullet.lane === "right") {
        for (const powerup of this.powerups) {
          if (bullet.checkCollision(powerup)) {
            powerup.applyDamage(bullet.damage || 1);
            bullet.hit = true;
          }
        }
      }
    }
    
    // Check if enemies reach the bottom
    for (const enemy of this.enemies) {
      if (enemy.y + enemy.height >= this.config.canvasHeight) {
        this.isGameOver = true;
      }
    }
  }
  
  // Remove entities that are off-screen or destroyed
  private cleanupEntities(): void {
    // Remove bullets that are off-screen or have hit something
    this.bullets = this.bullets.filter(bullet => 
      !bullet.hit && !bullet.isOffScreen(this.config.canvasHeight));
    
    // Remove enemies that are destroyed
    this.enemies = this.enemies.filter(enemy => 
      !enemy.isHit() && !enemy.isOffScreen(this.config.canvasHeight));
    
    // Remove powerups that are destroyed or off-screen
    this.powerups = this.powerups.filter(powerup => 
      !powerup.isHit() && !powerup.isOffScreen(this.config.canvasHeight));
  }
  
  // Toggle pause state
  togglePause(): void {
    this.isPaused = !this.isPaused;
    this.player.setProperty("color", this.isPaused ? "red" : "green");
  }
  
  // Reset the game
  reset(): void {
    this.isPaused = false;
    this.isGameOver = false;
    this.score = 0;
    this.enemies = [];
    this.powerups = [];
    this.bullets = [];
    this.player.reset();
    this.player.setProperty("color", "green");
    this.lastEnemySpawnTime = 0;
    this.lastPowerupSpawnTime = 0;
  }
}

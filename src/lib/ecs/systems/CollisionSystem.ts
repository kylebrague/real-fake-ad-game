import type { Entity } from "../Entity";
import { System } from "../System";
import {
  type PositionComponent,
  type SizeComponent,
  CollisionComponent,
  type HealthComponent,
} from "../components/CoreComponents";
import type {
  BulletComponent,
  EnemyComponent,
  PowerupComponent,
  PlayerComponent,
  GameStateComponent,
  TagComponent,
} from "../components/GameComponents";
import type { PowerupSystem } from "./PowerupSystem";

/**
 * CollisionSystem handles collision detection and resolution
 */
export class CollisionSystem extends System {
  private gameHeight: number;
  private gameWidth: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    // This system operates on entities with Position, Size, and Collision components
    super(["Position", "Size", "Collision"]);
    this.gameWidth = canvasWidth;
    this.gameHeight = canvasHeight;
  }

  update(deltaTime: number): void {
    this.checkBulletCollisions();
    this.checkPlayerPowerupCollisions();
    this.checkOffscreenEntities();
    this.checkEnemyReachedBottom();
  }

  /**
   * Check for collisions between bullets and other entities
   */
  private checkBulletCollisions(): void {
    const bullets = this.world.getEntitiesWith("Bullet", "Position", "Size", "Collision");
    const enemies = this.world.getEntitiesWith("Enemy", "Position", "Size", "Collision", "Health");
    const powerups = this.world.getEntitiesWith(
      "Powerup",
      "Position",
      "Size",
      "Collision",
      "Health"
    );

    // Check bullet collisions with all collidable entities
    for (const bulletEntity of bullets) {
      const bulletComponent = this.world.getComponent<BulletComponent>(bulletEntity, "Bullet");
      if (bulletComponent?.hit) continue;

      const bulletPos = this.world.getComponent<PositionComponent>(bulletEntity, "Position");
      const bulletSize = this.world.getComponent<SizeComponent>(bulletEntity, "Size");

      if (!bulletPos || !bulletSize) continue;

      // Check collision with enemies
      for (const enemyEntity of enemies) {
        const enemyPos = this.world.getComponent<PositionComponent>(enemyEntity, "Position");
        const enemySize = this.world.getComponent<SizeComponent>(enemyEntity, "Size");
        const enemyHealth = this.world.getComponent<HealthComponent>(enemyEntity, "Health");

        if (!enemyPos || !enemySize || !enemyHealth) continue;

        if (this.isColliding(bulletPos, bulletSize, enemyPos, enemySize)) {
          // Apply bullet damage to enemy
          enemyHealth.currentHealth -= bulletComponent.damage;
          bulletComponent.hit = true;

          // Check if enemy was destroyed for scoring
          if (enemyHealth.isDead()) {
            const enemy = this.world.getComponent<EnemyComponent>(enemyEntity, "Enemy");
            const players = this.world.getEntitiesWith("Player");

            // Add score to player
            if (enemy && players.length > 0) {
              const playerComp = this.world.getComponent<PlayerComponent>(players[0], "Player");
              if (playerComp) {
                playerComp.score += enemy.pointValue;
              }
            }
          }
          break;
        }
      }

      // If bullet didn't hit an enemy, check collision with powerups
      if (!bulletComponent.hit) {
        for (const powerupEntity of powerups) {
          const powerupPos = this.world.getComponent<PositionComponent>(powerupEntity, "Position");
          const powerupSize = this.world.getComponent<SizeComponent>(powerupEntity, "Size");
          const powerupHealth = this.world.getComponent<HealthComponent>(powerupEntity, "Health");

          if (!powerupPos || !powerupSize || !powerupHealth) continue;

          if (this.isColliding(bulletPos, bulletSize, powerupPos, powerupSize)) {
            // Apply bullet damage to powerup
            powerupHealth.currentHealth -= bulletComponent.damage;
            // If powerup is destroyed, process its effect
            if (powerupHealth.isDead()) {
              const powerupSystems = this.world.getSystems("PowerupSystem");
              if (powerupSystems.length > 0) {
                const powerupSystem = powerupSystems[0] as PowerupSystem;
                const players = this.world.getEntitiesWith(
                  "Player",
                  "Position",
                  "Size",
                  "Collision"
                );
                for (const playerEntity of players) {
                  powerupSystem.processPowerup(playerEntity, powerupEntity);
                }
              }
            }
            bulletComponent.hit = true;
            break;
          }
        }
      }
    }
  }

  /**
   * Check for collisions between player and powerups
   */
  private checkPlayerPowerupCollisions(): void {
    const players = this.world.getEntitiesWith("Player", "Position", "Size", "Collision");
    const powerups = this.world.getEntitiesWith("Powerup", "Position", "Size", "Collision");

    // No players or powerups? Nothing to do
    if (players.length === 0 || powerups.length === 0) return;

    // Get the player entity (typically just one)
    const playerEntity = players[0];
    const playerPos = this.world.getComponent<PositionComponent>(playerEntity, "Position");
    const playerSize = this.world.getComponent<SizeComponent>(playerEntity, "Size");
    const playerHealth = this.world.getComponent<HealthComponent>(playerEntity, "Health");
    if (!playerPos || !playerSize) return;

    // Check each powerup for collision with player
    for (const powerupEntity of powerups) {
      const powerupPos = this.world.getComponent<PositionComponent>(powerupEntity, "Position");
      const powerupSize = this.world.getComponent<SizeComponent>(powerupEntity, "Size");
      const powerup = this.world.getComponent<PowerupComponent>(powerupEntity, "Powerup");
      const health = this.world.getComponent<HealthComponent>(powerupEntity, "Health");

      if (!powerupPos || !powerupSize || !powerup || !health) continue;

      // Check for collision
      if (this.isColliding(playerPos, playerSize, powerupPos, powerupSize)) {
        playerHealth.currentHealth = 0; // powerup runs over player and kills it
      }
    }
  }

  /**
   * Check if any entities are off screen and mark them for removal
   */
  private checkOffscreenEntities(): void {
    const entities = this.world.getEntitiesWith("Position", "Size");

    for (const entity of entities) {
      const position = this.world.getComponent<PositionComponent>(entity, "Position");
      const size = this.world.getComponent<SizeComponent>(entity, "Size");

      if (!position || !size) continue;

      // Check if entity is completely off screen
      if (
        position.y > this.gameHeight ||
        position.y + size.height < 0 ||
        position.x > this.gameWidth ||
        position.x + size.width < 0
      ) {
        // Mark bullet as hit if it's a bullet
        const bullet = this.world.getComponent<BulletComponent>(entity, "Bullet");
        if (bullet) {
          bullet.hit = true;
        }

        // Remove enemies and powerups if they're off screen
        const enemy = this.world.getComponent<EnemyComponent>(entity, "Enemy");
        const powerup = this.world.getComponent<PowerupComponent>(entity, "Powerup");

        if (enemy || powerup) {
          const health = this.world.getComponent<HealthComponent>(entity, "Health");
          if (health) {
            health.currentHealth = 0;
          }
        }
      }
    }
  }

  /**
   * Check if enemies have reached the bottom of the screen (game over condition)
   */
  private checkEnemyReachedBottom(): void {
    const enemies = this.world.getEntitiesWith("Enemy", "Position", "Size");
    const gameState = this.world.getEntitiesWith("Tag");

    let gameStateEntity: Entity;
    for (const entity of gameState) {
      const tag = this.world.getComponent<TagComponent>(entity, "Tag");
      if (tag && tag.tag === "gameState") {
        gameStateEntity = entity;
        break;
      }
    }

    if (!gameStateEntity) return;
    const player = this.world.getEntitiesWith("Player", "Size")[0];
    const playerSize = this.world.getComponent<SizeComponent>(player, "Size");
    for (const enemy of enemies) {
      const position = this.world.getComponent<PositionComponent>(enemy, "Position");
      const size = this.world.getComponent<SizeComponent>(enemy, "Size");

      if (position && size) {
        if (position.y + size.height - playerSize.height >= this.gameHeight) {
          // Trigger game over
          const gameStateComponent = this.world.getComponent<GameStateComponent>(
            gameStateEntity,
            "GameState"
          );
          if (gameStateComponent) {
            gameStateComponent.isGameOver = true;
          }
          break;
        }
      }
    }
  }

  /**
   * Utility function to check if two entities are colliding
   */
  private isColliding(
    pos1: PositionComponent,
    size1: SizeComponent,
    pos2: PositionComponent,
    size2: SizeComponent
  ): boolean {
    return (
      pos1.x < pos2.x + size2.width &&
      pos1.x + size1.width > pos2.x &&
      pos1.y < pos2.y + size2.height &&
      pos1.y + size1.height > pos2.y
    );
  }
}

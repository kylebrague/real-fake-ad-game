import type { Entity } from "../Entity";
import { System } from "../System";
import type {
  PositionComponent,
  SizeComponent,
  HealthComponent,
} from "../components/CoreComponents";
import type {
  BulletComponent,
  EnemyComponent,
  GameStateComponent,
  MultiplierComponent,
  PowerupComponent,
} from "../components/GameComponents";
import type { PowerupSystem } from "./PowerupSystem";

/**
 * CollisionSystem handles collision detection and resolution between entities.
 */
export class CollisionSystem extends System {
  // Keep canvasHeight as it's used in checkEnemyReachedBottom
  private canvasHeight: number;
  private canvasWidth: number;


  constructor(canvasWidth: number, canvasHeight: number) {
    // Query for entities that have Position, Size, and Collision components
    super(["Position", "Size", "Collision"]);
    // Remove unused canvasWidth property
    this.canvasHeight = canvasHeight;
    this.canvasWidth = canvasWidth;

  }

  update(/* deltaTime: number */): void {
    // Get all entities with relevant components
    const entities = this.world.getEntitiesWith("Position", "Size", "Collision");
    
    // Filter entities by checking if they have specific components
    const players = entities.filter((e) => this.world.getComponent(e, "Player"));
    const enemies = entities.filter((e) => this.world.getComponent(e, "Enemy"));
    const bullets = entities.filter((e) => this.world.getComponent(e, "Bullet"));
    const powerups = entities.filter((e) => this.world.getComponent(e, "Powerup"));

    // Check collisions
    this.checkBulletEnemyCollisions(bullets, enemies);
    this.checkBulletPowerupCollisions(bullets, powerups);
    this.checkPlayerEnemyCollisions(players, enemies);
    this.checkEnemyReachedBottom(enemies);
    this.checkCollisionsWithMultiplier();
    this.checkPlayerPowerupCollisions(players, powerups);
    this.checkOffscreenEntities();
    // --- Check Game Over Condition ---
    if (players.length === 0) {
        const gameStateEntities = this.world.getEntitiesWith("GameState");
        if (gameStateEntities.length > 0) {
            const gameState = this.world.getComponent<GameStateComponent>(gameStateEntities[0], "GameState");
            if (gameState && !gameState.isGameOver) {
                gameState.isGameOver = true;
                console.log("Game Over - No players left!");
            }
        }
    }
  }

  /**
   * Check for collisions between bullets and enemies
   */
  private checkBulletEnemyCollisions(bullets: Entity[], enemies: Entity[]): void {
    for (const bulletEntity of bullets) {
      const bulletComponent = this.world.getComponent<BulletComponent>(bulletEntity, "Bullet");
      // Skip if bullet already hit something
      if (!bulletComponent || bulletComponent.hit) continue;

      const bulletPos = this.world.getComponent<PositionComponent>(bulletEntity, "Position");
      const bulletSize = this.world.getComponent<SizeComponent>(bulletEntity, "Size");
      if (!bulletPos || !bulletSize) continue;

      for (const enemyEntity of enemies) {
        const enemyPos = this.world.getComponent<PositionComponent>(enemyEntity, "Position");
        const enemySize = this.world.getComponent<SizeComponent>(enemyEntity, "Size");
        const enemyHealth = this.world.getComponent<HealthComponent>(enemyEntity, "Health");
        if (!enemyPos || !enemySize || !enemyHealth) continue;

        if (this.isColliding(bulletPos, bulletSize, enemyPos, enemySize)) {
          // Apply bullet damage to enemy
          enemyHealth.currentHealth -= bulletComponent.damage;
          bulletComponent.hit = true; // Mark bullet as hit

          // Check if enemy was destroyed for scoring
          if (enemyHealth.currentHealth <= 0) {
            const enemy = this.world.getComponent<EnemyComponent>(enemyEntity, "Enemy");
            // Add score to global GameState
            const gameStateEntities = this.world.getEntitiesWith("GameState");
            if (enemy && gameStateEntities.length > 0) {
              const gameState = this.world.getComponent<GameStateComponent>(gameStateEntities[0], "GameState");
              if (gameState) {
                gameState.score += enemy.pointValue;
              }
            }
            // Enemy is destroyed, no need to check further collisions for this bullet with this enemy
            // The CleanupSystem will remove the enemy entity
          }
          // Bullet hit an enemy, break inner loop to check next bullet
          break;
        }
      }
    }
  }

  /**
   * Check for collisions between bullets and powerups
   */
  private checkBulletPowerupCollisions(bullets: Entity[], powerups: Entity[]): void {
    for (const bulletEntity of bullets) {
      const bulletComponent = this.world.getComponent<BulletComponent>(bulletEntity, "Bullet");
      // Skip if bullet already hit something
      if (!bulletComponent || bulletComponent.hit) continue;

      const bulletPos = this.world.getComponent<PositionComponent>(bulletEntity, "Position");
      const bulletSize = this.world.getComponent<SizeComponent>(bulletEntity, "Size");
      if (!bulletPos || !bulletSize) continue;

      for (const powerupEntity of powerups) {
        const powerupPos = this.world.getComponent<PositionComponent>(powerupEntity, "Position");
        const powerupSize = this.world.getComponent<SizeComponent>(powerupEntity, "Size");
        const powerupHealth = this.world.getComponent<HealthComponent>(powerupEntity, "Health");
        if (!powerupPos || !powerupSize || !powerupHealth) continue;

        if (this.isColliding(bulletPos, bulletSize, powerupPos, powerupSize)) {
          // Apply bullet damage to powerup
          powerupHealth.currentHealth -= bulletComponent.damage;
          bulletComponent.hit = true; // Mark bullet as hit

          // If powerup is destroyed, process its effect
          if (powerupHealth.currentHealth <= 0) {
            const powerupSystems = this.world.getSystems("PowerupSystem");
            if (powerupSystems.length > 0) {
              const powerupSystem = powerupSystems[0] as PowerupSystem;
              // Apply powerup to all players
              const players = this.world.getEntitiesWith("Player");
              for (const playerEntity of players) {
                powerupSystem.processPowerup(playerEntity, powerupEntity);
              }
            }
            // Powerup is destroyed, CleanupSystem will remove it
          }
          // Bullet hit a powerup, break inner loop
          break;
        }
      }
    }
  }

  /**
   * Check for collisions between players and enemies
   */
  private checkPlayerEnemyCollisions(players: Entity[], enemies: Entity[]): void {
    for (const playerEntity of players) {
      const playerPos = this.world.getComponent<PositionComponent>(playerEntity, "Position");
      const playerSize = this.world.getComponent<SizeComponent>(playerEntity, "Size");
      const playerHealth = this.world.getComponent<HealthComponent>(playerEntity, "Health");
      if (!playerPos || !playerSize || !playerHealth) continue;

      for (const enemyEntity of enemies) {
        const enemyPos = this.world.getComponent<PositionComponent>(enemyEntity, "Position");
        const enemySize = this.world.getComponent<SizeComponent>(enemyEntity, "Size");
        const enemyHealth = this.world.getComponent<HealthComponent>(enemyEntity, "Health");
        if (!enemyPos || !enemySize || !enemyHealth) continue;

        if (this.isColliding(playerPos, playerSize, enemyPos, enemySize)) {
          // Destroy both player and enemy on collision
          playerHealth.currentHealth = 0;
          enemyHealth.currentHealth = 0;
          // No break here, continue checking this player against other enemies
          // And continue checking this enemy against other players
        }
      }
    }
  }

   /**
   * Check for collisions between other collidable entities and multiplier entities
   */
   private checkCollisionsWithMultiplier(): void {
    const multipliers = this.world.getEntitiesWith("Multiplier");
    const collidables = this.world.getEntitiesWith("Collision");

    for (const multiplier of multipliers) {
      const multiplierComponent = this.world.getComponent<MultiplierComponent>(
        multiplier,
        "Multiplier"
      );
      const multiplierPos = this.world.getComponent<PositionComponent>(multiplier, "Position");
      const multiplierSize = this.world.getComponent<SizeComponent>(multiplier, "Size");

      if (!multiplierComponent || !multiplierPos || !multiplierSize) continue;

      for (const collidable of collidables) {
        if (multiplier.equals(collidable)) continue; // Skip self-collision
        const collidablePos = this.world.getComponent<PositionComponent>(collidable, "Position");
        const collidableSize = this.world.getComponent<SizeComponent>(collidable, "Size");

        if (!collidablePos || !collidableSize) continue;

        // Check for collision
        if (this.isColliding(multiplierPos, multiplierSize, collidablePos, collidableSize)) {
          // Determine if the collision occurred from the bottom or top relative to the multiplier
          const isCollidedFromBottom =
            collidablePos.y + collidableSize.height <= multiplierPos.y + multiplierSize.height;

          // Create multiple clones of the original collidable entity based on the multiplier value
          for (let i = 0; i < multiplierComponent.value; i++) {
            // Calculate the Y position for clones to exit from (either above or below the multiplier)
            const exitY = isCollidedFromBottom
              ? multiplierPos.y + multiplierSize.height + 2 // Exit below multiplier
              : multiplierPos.y - multiplierSize.height - collidableSize.height - 2; // Exit above multiplier
            
            // Clone the original collidable entity in each iteration
            const clonedCollidable = this.world.cloneEntity(collidable);

            const clonedCollidablePos = this.world.getComponent<PositionComponent>(
              clonedCollidable,
              "Position"
            );
            const clonedCollidableSize = this.world.getComponent<SizeComponent>(
              clonedCollidable,
              "Size"
            );

            if (!clonedCollidablePos || !clonedCollidableSize) {
              // If cloning failed or components are missing, remove the failed clone
              this.world.removeEntity(clonedCollidable);
              continue;
            }
            // Distribute the cloned entities horizontally, centered relative to the original collidable's position
            // Calculate horizontal spacing between clones
            const spacing = collidableSize.width + 20 + Math.sqrt(collidableSize.width); // Add spacing based on width
            // Calculate the total width required for all clones plus spacing
            const totalClonedWidth = spacing * multiplierComponent.value - spacing;
            // Calculate the starting X position to center the distribution around the original collidable's X
            const startX = collidablePos.x - totalClonedWidth / 2; 
            // Set the horizontal position for the current clone
            clonedCollidablePos.x = startX + i * spacing;

            // Set the vertical position for the current clone based on the collision side
            clonedCollidablePos.y = exitY;
          }

          // Remove the original entity that collided with the multiplier
          this.world.removeEntity(collidable);

          // Break the inner loop: the current collidable has been processed (removed and cloned)
          break;
        }
      }
    }
  }
  /**
   * Check if enemies have reached the bottom of the screen
   */
  private checkEnemyReachedBottom(enemies: Entity[]): void {
    for (const enemyEntity of enemies) {
      const enemyPos = this.world.getComponent<PositionComponent>(enemyEntity, "Position");
      const enemySize = this.world.getComponent<SizeComponent>(enemyEntity, "Size");
      if (!enemyPos || !enemySize) continue;

      if (enemyPos.y + enemySize.height >= this.canvasHeight) {
        // Enemy reached bottom, destroy it
        const enemyHealth = this.world.getComponent<HealthComponent>(enemyEntity, "Health");
        if (enemyHealth) {
          enemyHealth.currentHealth = 0;
        }
        // Optionally: Penalize the player or trigger game over immediately
        // For now, just removing the enemy via health=0
      }
    }
  }
/**
   * Check for collisions between player and powerups
   */
private checkPlayerPowerupCollisions(players:Entity[], powerups:Entity[]): void {

  // No players or powerups? Nothing to do
  if (players.length === 0 || powerups.length === 0) return;

  // Get the player entity (typically just one)
  const playerEntity = players[0];
  const playerPos = this.world.getComponent<PositionComponent>(playerEntity, "Position");
  const playerSize = this.world.getComponent<SizeComponent>(playerEntity, "Size");
  const playerHealth = this.world.getComponent<HealthComponent>(playerEntity, "Health");
  // Add checks for player components
  if (!playerPos || !playerSize || !playerHealth) return;

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
      position.y > this.canvasHeight ||
      position.y + size.height < 0 ||
      position.x > this.canvasWidth ||
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
   * Simple AABB collision check
   */
  private isColliding(
    posA: PositionComponent,
    sizeA: SizeComponent,
    posB: PositionComponent,
    sizeB: SizeComponent
  ): boolean {
    return (
      posA.x < posB.x + sizeB.width &&
      posA.x + sizeA.width > posB.x &&
      posA.y < posB.y + sizeB.height &&
      posA.y + sizeA.height > posB.y
    );
  }
}

import type { Entity } from '../Entity';
import { System } from '../System';
import {
  PositionComponent,
  SizeComponent,
  VelocityComponent,
  RenderComponent,
  CollisionComponent
} from '../components/CoreComponents';
import {
  type PlayerComponent,
  BulletComponent,
  // HelperComponent, // Removed HelperComponent import
  type CooldownModifierComponent,
  type GameStateComponent, // Import GameStateComponent
} from '../components/GameComponents';

/**
 * PlayerSystem handles player group behavior including movement and shooting.
 */
export class PlayerSystem extends System {
  private canvasWidth: number;
  private groupCenterX: number; // Track the logical center of the player group

  constructor(canvasWidth: number) {
    // Query for Player entities that have Position and Size
    super(['Player', 'Position', 'Size']);
    this.canvasWidth = canvasWidth;
    // Initialize group center (can be refined, e.g., based on initial player positions)
    this.groupCenterX = canvasWidth / 2;
  }

  update(deltaTime: number): void {
    // Get GameState for input flags
    const gameStateEntities = this.world.getEntitiesWith("GameState");
    if (gameStateEntities.length === 0) return;
    const gameState = this.world.getComponent<GameStateComponent>(gameStateEntities[0], "GameState");
    if (!gameState) return;

    // --- Group Movement Calculation ---
    let groupDx = 0;
    // Use a representative speed (e.g., from the first player found, or a default)
    // Ideally, all players in the group should have the same speed.
    const players = this.world.getEntitiesWith('Player', 'Position', 'Size');
    if (players.length === 0) {
        // If no players left, potentially trigger game over elsewhere
        return; 
    }
    const representativePlayerComp = this.world.getComponent<PlayerComponent>(players[0], 'Player');
    const groupSpeed = representativePlayerComp ? representativePlayerComp.speed : 400; // Default speed

    if (gameState.isMovingLeft) {
      groupDx -= groupSpeed * deltaTime;
    }
    if (gameState.isMovingRight) {
      groupDx += groupSpeed * deltaTime;
    }

    // Update the logical group center, clamping it so the entire group stays on screen
    // This requires knowing the min/max offsetX of the group members
    let minOffsetX = 0;
    let maxOffsetX = 0;
    let minWidth = 0;
    let maxWidth = 0;

    for (const playerEntity of players) {
        const playerComp = this.world.getComponent<PlayerComponent>(playerEntity, 'Player');
        const playerSize = this.world.getComponent<SizeComponent>(playerEntity, 'Size');
        if (playerComp && playerSize) {
            if (playerComp.offsetX < minOffsetX) {
                minOffsetX = playerComp.offsetX;
                minWidth = playerSize.width;
            }
            if (playerComp.offsetX > maxOffsetX) {
                maxOffsetX = playerComp.offsetX;
                maxWidth = playerSize.width;
            }
        }
    }

    const groupLeftBound = this.groupCenterX + minOffsetX - minWidth / 2;
    const groupRightBound = this.groupCenterX + maxOffsetX + maxWidth / 2;
    const potentialNewCenterX = this.groupCenterX + groupDx;

    // Adjust groupDx if moving the center would push the group off-screen
    if (potentialNewCenterX + minOffsetX - minWidth / 2 < 0) { // Check left edge
        groupDx = -(minOffsetX - minWidth / 2); // Move exactly to the edge
    } else if (potentialNewCenterX + maxOffsetX + maxWidth / 2 > this.canvasWidth) { // Check right edge
        groupDx = this.canvasWidth - (this.groupCenterX + maxOffsetX + maxWidth / 2);
    }
    
    this.groupCenterX += groupDx; // Update the group's logical center X

    // --- Individual Player Position Update & Cooldown ---
    for (const playerEntity of players) {
      const playerComp = this.world.getComponent<PlayerComponent>(playerEntity, 'Player');
      const playerPos = this.world.getComponent<PositionComponent>(playerEntity, 'Position');
      const playerSize = this.world.getComponent<SizeComponent>(playerEntity, 'Size');

      if (playerComp && playerPos && playerSize) {
        // Calculate target X based on group center and individual offset
        const targetX = this.groupCenterX + playerComp.offsetX;
        // No need to clamp individual players now, as the group center is clamped
        playerPos.x = targetX - playerSize.width / 2; // Adjust for center alignment

        // --- Shooting Cooldown ---
        if (!playerComp.canShoot) {
          playerComp.currentShootCooldown += deltaTime;
          if (playerComp.currentShootCooldown >= playerComp.shootCooldown) {
            playerComp.canShoot = true;
            playerComp.currentShootCooldown = 0;
          }
        }
      }
      // --- Cooldown Modifier Update (if applicable) ---
      this.updateCooldownModifiers(playerEntity, deltaTime);
    }

    // --- Trigger Shooting based on GameState ---
    if (gameState.isShooting) {
        this.triggerShootingForAllPlayers();
    }
  }

  /**
   * Updates any active cooldown modifiers on a player entity
   */
  private updateCooldownModifiers(playerEntity: Entity, deltaTime: number): void {
    // ... (Keep existing implementation) ...
    const cooldownModifier = this.world.getComponent<CooldownModifierComponent>(
      playerEntity,
      'CooldownModifier'
    );

    if (cooldownModifier && cooldownModifier.timeRemaining > 0) {
      cooldownModifier.timeRemaining = Math.max(0, cooldownModifier.timeRemaining - deltaTime);

      if (cooldownModifier.timeRemaining === 0) {
        this.world.removeComponent(playerEntity, 'CooldownModifier');
      }
    }
  }

  /**
   * Iterates through all player entities and calls shoot() for those who can.
   */
  private triggerShootingForAllPlayers(): void {
      const players = this.world.getEntitiesWith('Player');
      for (const playerEntity of players) {
          this.shoot(playerEntity);
      }
  }

  /**
   * Creates a bullet entity for a single player entity if it can shoot.
   */
  shoot(playerEntity: Entity): void {
    const playerPos = this.world.getComponent<PositionComponent>(playerEntity, 'Position');
    const playerSize = this.world.getComponent<SizeComponent>(playerEntity, 'Size');
    const playerComp = this.world.getComponent<PlayerComponent>(playerEntity, 'Player');

    // Check if player exists, has components, and can shoot
    if (!playerPos || !playerSize || !playerComp || !playerComp.canShoot) return;

    // Apply cooldown
    playerComp.canShoot = false;
    playerComp.currentShootCooldown = 0; // Reset timer

    // --- Create bullet for this specific player ---
    const bulletSize = 10;
    const bulletX = playerPos.x + playerSize.width / 2 - bulletSize / 2;
    const bulletY = playerPos.y;

    const bullet = this.world.createEntity();
    this.world.addComponent(bullet, new PositionComponent(bulletX, bulletY));
    this.world.addComponent(bullet, new SizeComponent(bulletSize, bulletSize));
    this.world.addComponent(bullet, new VelocityComponent(0, -400));
    this.world.addComponent(bullet, new RenderComponent('yellow'));
    this.world.addComponent(bullet, new CollisionComponent(true, 1, 'bullet'));
    this.world.addComponent(bullet, new BulletComponent(1, false));
  }
}
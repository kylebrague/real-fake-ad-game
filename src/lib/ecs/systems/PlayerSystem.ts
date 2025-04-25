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
  type CooldownModifierComponent,
  type GameStateComponent,
  type InputComponent
} from '../components/GameComponents';

/**
 * PlayerSystem handles individual player movement and shooting.
 */
export class PlayerSystem extends System {
  private canvasWidth: number;

  constructor(canvasWidth: number) {
    // Query for Player entities that have Position and Size
    super(['Player', 'Position', 'Size']);
    this.canvasWidth = canvasWidth;
  }

  update(deltaTime: number): void {
    // Get game state to check for pause/game over
    const gameStateEntities = this.world.getEntitiesWith('GameState');
    if (gameStateEntities.length === 0) return;
    
    const gameState = this.world.getComponent<GameStateComponent>(
      gameStateEntities[0], 'GameState'
    );
    if (!gameState || gameState.isPaused || gameState.isGameOver) return;

    // Get input state
    const inputEntities = this.world.getEntitiesWith('Input');
    if (inputEntities.length === 0) return;
    
    const inputComponent = this.world.getComponent<InputComponent>(
      inputEntities[0], 'Input'
    );
    if (!inputComponent) return;

    // Get all player entities
    const players = this.world.getEntitiesWith('Player', 'Position', 'Size');
    
    // Process each player individually
    for (const playerEntity of players) {
      const playerComp = this.world.getComponent<PlayerComponent>(playerEntity, 'Player');
      const playerPos = this.world.getComponent<PositionComponent>(playerEntity, 'Position');
      const playerSize = this.world.getComponent<SizeComponent>(playerEntity, 'Size');

      if (!playerComp || !playerPos || !playerSize) continue;

      // --- Update movement flags based on input ---
      playerComp.isMovingLeft = inputComponent.leftPressed;
      playerComp.isMovingRight = inputComponent.rightPressed;
      playerComp.isShooting = inputComponent.spacePressed;

      // --- Individual Player Movement ---
      let dx = 0;
      // Apply movement based on player's flags
      if (playerComp.isMovingLeft) {
        dx -= playerComp.speed * deltaTime;
      }
      if (playerComp.isMovingRight) {
        dx += playerComp.speed * deltaTime;
      }

      // Update player position with individual bounds checking
      const newX = playerPos.x + dx;
      // Clamp position to keep player on screen
      playerPos.x = Math.max(0, Math.min(this.canvasWidth - playerSize.width, newX));

      // --- Shooting Cooldown Update ---
      if (!playerComp.canShoot) {
        playerComp.currentShootCooldown += deltaTime;
        if (playerComp.currentShootCooldown >= playerComp.shootCooldown) {
          playerComp.canShoot = true;
          playerComp.currentShootCooldown = 0;
        }
      }

      // --- Handle Shooting ---
      if (playerComp.isShooting && playerComp.canShoot) {
        this.shoot(playerEntity);
      }

      // --- Handle Single-Shot Trigger ---
      if (inputComponent.singleShotTriggered && playerComp.canShoot) {
        this.shoot(playerEntity);
      }

      // --- Cooldown Modifier Update ---
      this.updateCooldownModifiers(playerEntity, deltaTime);
    }
  }

  /**
   * Updates any active cooldown modifiers on a player entity
   */
  private updateCooldownModifiers(playerEntity: Entity, deltaTime: number): void {
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
   * Creates a bullet for a player entity if able to shoot
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

    // Create bullet for this player
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
  
  /**
   * Toggle selection of a specific player by index
   */
  selectPlayer(playerIndex: number): void {
    const gameStateEntities = this.world.getEntitiesWith('GameState');
    if (gameStateEntities.length === 0) return;
    
    const gameState = this.world.getComponent<GameStateComponent>(gameStateEntities[0], 'GameState');
    if (!gameState) return;
    
    // Update active player index
    gameState.activePlayerIndex = playerIndex;
    
    // Visual feedback could be added here (highlight selected player, etc.)
    console.log(`Switched to player ${playerIndex + 1}`);
  }
}
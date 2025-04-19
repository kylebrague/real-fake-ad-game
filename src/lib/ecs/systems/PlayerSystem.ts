import type { Entity } from '../Entity';
import { System } from '../System';
import { 
  PositionComponent, 
  SizeComponent, 
  VelocityComponent,
  RenderComponent,
  type HealthComponent,
  CollisionComponent
} from '../components/CoreComponents';
import { 
  type PlayerComponent, 
  BulletComponent, 
  type CooldownModifierComponent, 
  type GameStateComponent
} from '../components/GameComponents';

/**
 * PlayerSystem handles player-specific behavior including movement and bullet creation
 * 
 * This is a good example of a focused system that handles interactions specific
 * to entities with PlayerComponent
 */
export class PlayerSystem extends System {
  private canvasWidth: number;
  private canvasHeight: number;
  private playerSpeed = 400; // pixels per second

  constructor(canvasWidth: number, canvasHeight: number) {
    super(['Player', 'Position']);
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  update(deltaTime: number): void {
    // Get all entities with Player and Position components
    const playerEntities = this.world.getEntitiesWith('Player', 'Position');
    
    // Process each player entity (typically just one in most games)
    for (const playerEntity of playerEntities) {
      this.updatePlayerMovement(playerEntity, deltaTime);
      
      // Update bullet cooldown timer
      const player = this.world.getComponent<PlayerComponent>(playerEntity, 'Player');
      if (player && player.bulletCooldown > 0) {
        player.bulletCooldown = Math.max(0, player.bulletCooldown - deltaTime);
      }
      
      // Update any active cooldown modifiers
      this.updateCooldownModifiers(playerEntity, deltaTime);
    }
  }

  /**
   * Updates any active cooldown modifiers on the player
   */
  private updateCooldownModifiers(playerEntity: Entity, deltaTime: number): void {
    const cooldownModifier = this.world.getComponent<CooldownModifierComponent>(
      playerEntity,
      'CooldownModifier'
    );
    
    // If there's an active temporary cooldown modifier, update its timer
    if (cooldownModifier && cooldownModifier.timeRemaining > 0) {
      cooldownModifier.timeRemaining = Math.max(0, cooldownModifier.timeRemaining - deltaTime);
      
      // If the effect has expired, reset to default
      if (cooldownModifier.timeRemaining === 0) {
        this.world.removeComponent(playerEntity, 'CooldownModifier');
      }
    }
  }

  /**
   * Updates the player position based on input stored in the PlayerComponent
   */
  private updatePlayerMovement(playerEntity: Entity, deltaTime: number): void {
    const player = this.world.getComponent<PlayerComponent>(playerEntity, 'Player');
    const position = this.world.getComponent<PositionComponent>(playerEntity, 'Position');
    const size = this.world.getComponent<SizeComponent>(playerEntity, 'Size');
    
    if (!player || !position || !size) return;
    
    // Handle left/right movement based on player input flags
    if (player.isMovingLeft) {
      position.x = Math.max(0, position.x - this.playerSpeed * deltaTime);
    }
    
    if (player.isMovingRight) {
      const maxX = this.canvasWidth - size.width;
      position.x = Math.min(maxX, position.x + this.playerSpeed * deltaTime);
    }
  }

  /**
   * Creates a bullet entity when the player shoots
   * 
   * This is a great example of entity creation with components in the ECS system
   */
  shoot(playerEntity: Entity): void {
    const player = this.world.getComponent<PlayerComponent>(playerEntity, 'Player');
    const position = this.world.getComponent<PositionComponent>(playerEntity, 'Position');
    const size = this.world.getComponent<SizeComponent>(playerEntity, 'Size');
    
    if (!player || !position || !size) return; 
    
    // Check if we're still in cooldown period
    if (player.bulletCooldown > 0) return;
    
    // Create bullet
    this.createBullet(
      position.x + size.width * 0.5, 
      position.y, 
      10, 
      10
    );
    
    // Get any active cooldown modifier
    const cooldownModifier = this.world.getComponent<CooldownModifierComponent>(
      playerEntity, 
      'CooldownModifier'
    );
    
    // Apply cooldown modifier if one exists, otherwise use default cooldown
    if (cooldownModifier) {
      player.bulletCooldown = player.bulletCooldownMax * cooldownModifier.bulletCooldownMultiplier;
    } else {
      player.bulletCooldown = player.bulletCooldownMax;
    }
  }

  /**
   * Helper method to create a bullet entity with all necessary components
   */
  private createBullet(x: number, y: number, width: number, height: number): void {
    // Create a new entity for the bullet
    const bullet = this.world.createEntity();
    
    // Position component determines where the bullet appears
    this.world.addComponent(bullet, new PositionComponent(x - width / 2, y));
    
    // Size component determines the bullet dimensions
    this.world.addComponent(bullet, new SizeComponent(width, height));
    
    // Velocity component makes the bullet move upward
    this.world.addComponent(bullet, new VelocityComponent(0, -500)); // Negative Y = upward
    
    // Render component gives the bullet its appearance
    this.world.addComponent(bullet, new RenderComponent('yellow'));
    
    // Bullet component marks it as a bullet and stores bullet-specific data
    this.world.addComponent(bullet, new BulletComponent(1, false));
    
    // Collision component allows the bullet to collide with enemies
    this.world.addComponent(bullet, new CollisionComponent(true, 1, 'bullet'));
  }
}
import { System } from "../System";
import type { Entity } from "../Entity";
import { CooldownModifierComponent, type PowerupComponent } from "../components/GameComponents";

/**
 * PowerupSystem manages all powerup effects in the game
 * It tracks temporary powerups and removes them when they expire
 */
export class PowerupSystem extends System {
  constructor() {
    super(["CooldownModifier"]);
  }

  update(deltaTime: number): void {
    // Get all entities with CooldownModifier component
    const entitiesWithCooldown = this.world.getEntitiesWith("CooldownModifier");

    // Update each cooldown effect
    for (const entity of entitiesWithCooldown) {
      this.updateCooldownModifier(entity, deltaTime);
    }
  }

  /**
   * Updates a cooldown modifier and removes it if expired
   */
  private updateCooldownModifier(entity: Entity, deltaTime: number): void {
    const cooldownModifier = this.world.getComponent<CooldownModifierComponent>(
      entity,
      "CooldownModifier"
    );

    if (!cooldownModifier) return;

    // Only update temporary modifiers (ones with positive duration)
    if (cooldownModifier.timeRemaining > 0) {
      cooldownModifier.timeRemaining -= deltaTime;

      // If the effect has expired, remove it
      if (cooldownModifier.timeRemaining <= 0) {
        this.world.removeComponent(entity, "CooldownModifier");
      }
    }
  }

  /**
   * Apply a rapid fire powerup to an entity
   * This is typically called when a player picks up a rapid fire powerup
   */
  applyRapidFirePowerup(entity: Entity, duration: number, multiplier = 0.5): void {
    // Remove any existing cooldown modifier first
    const existingModifier = this.world.getComponent<CooldownModifierComponent>(
      entity,
      "CooldownModifier"
    );
    if (existingModifier) {
      if (multiplier < existingModifier.bulletCooldownMultiplier) {
        this.world.removeComponent(entity, "CooldownModifier");
      } else {
        return; // Don't apply if existing modifier is stronger
      }
    }
    // Add a new cooldown modifier component
    this.world.addComponent(entity, new CooldownModifierComponent(multiplier, duration, duration));
  }

  /**
   * Process a powerup collision and apply the appropriate effect
   * This method should be called when a player collides with a powerup
   */
  processPowerup(playerEntity: Entity, powerupEntity: Entity): void {
    const powerup = this.world.getComponent<PowerupComponent>(powerupEntity, "Powerup");

    if (!powerup) return;
    // Apply different effects based on powerup type
    switch (powerup.powerupType) {
      case "superRapidFire":
        // Apply super rapid fire effect (75% faster shooting for 5 seconds)
        this.applyRapidFirePowerup(playerEntity, 15, 0.25);
        break;
      case "rapidFire":
        // Apply rapid fire effect (50% faster shooting for 5 seconds)
        this.applyRapidFirePowerup(playerEntity, 15, 0.5);
        break;
      case "normalizedFire":
        // Remove any existing cooldown effects to restore normal firing rate
        if (this.world.getComponent(playerEntity, "CooldownModifier")) {
          this.world.removeComponent(playerEntity, "CooldownModifier");
        }
        break;
      default:
        // Handle other powerup types as needed
        console.warn(`Unhandled powerup type: ${powerup.powerupType}`);
        break;
    }
  }
}

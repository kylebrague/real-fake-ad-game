import { System } from "../System";
import {
  PositionComponent,
  SizeComponent,
  VelocityComponent,
  RenderComponent,
  HealthComponent,
  CollisionComponent,
} from "../components/CoreComponents";
import {
  EnemyComponent,
  MultiplierComponent,
  PowerupComponent,
  type GameStateComponent,
} from "../components/GameComponents";

/**
 * SpawnSystem handles creating enemies and powerups at regular intervals
 */
export class SpawnSystem extends System {
  private gameConfig: {
    canvasWidth: number;
    canvasHeight: number;
    leftSideX: number;
    rightSideX: number;
    leftSideSpawnInterval: number;
    rightSideSpawnInterval: number;
  };

  private lastEnemySpawnTime = 0;
  private lastPowerupSpawnTime = 0;

  private leftSideSpawnInterval: number;
  private rightSideSpawnInterval: number;

  constructor(gameConfig: {
    canvasWidth: number;
    canvasHeight: number;
    leftSideX: number;
    rightSideX: number;
    leftSideSpawnInterval: number;
    rightSideSpawnInterval: number;
  }) {
    super(["GameState"]); // Uses GameState component to check if game is active
    this.gameConfig = gameConfig;

    this.leftSideSpawnInterval = gameConfig.leftSideSpawnInterval;
    this.rightSideSpawnInterval = gameConfig.rightSideSpawnInterval;
  }

  update(deltaTime: number): void {
    // Find the game state entity
    const gameStateEntities = this.world.getEntitiesWith("GameState");
    if (gameStateEntities.length === 0) return;

    const gameStateEntity = gameStateEntities[0];
    const gameState = this.world.getComponent<GameStateComponent>(gameStateEntity, "GameState");

    if (!gameState || gameState.isPaused || gameState.isGameOver) return;

    // Spawn enemies at intervals (using seconds)
    this.lastEnemySpawnTime += deltaTime;
    if (this.lastEnemySpawnTime > this.leftSideSpawnInterval) {
      this.spawnEnemy();
      this.lastEnemySpawnTime = 0;
    }

    // Spawn powerups at intervals (using seconds)
    this.lastPowerupSpawnTime += deltaTime;
    if (this.lastPowerupSpawnTime > this.rightSideSpawnInterval) {
      // Randomly decide whether to spawn a powerup or a squisher
      this.spawnPowerup();
      this.lastPowerupSpawnTime = 0;
    }
    
  
  }

  /**
   * Create a new enemy entity
   */
  private spawnEnemy(): void {
    const enemy = this.world.createEntity();

    // Add components to the enemy
    this.world.addComponent(
      enemy,
      new PositionComponent(
        this.gameConfig.leftSideX - 15, // x (centered on left side)
        -30 // y (above the screen)
      )
    );
    this.world.addComponent(enemy, new SizeComponent(30, 30));
    this.world.addComponent(enemy, new VelocityComponent(0, 50)); // Move downward
    this.world.addComponent(enemy, new RenderComponent("red"));
    this.world.addComponent(enemy, new HealthComponent(1));
    this.world.addComponent(enemy, new CollisionComponent(true, 0, "enemy"));
    this.world.addComponent(enemy, new EnemyComponent("basic", 10));
  }

  /**
   * Create a new powerup entity
   */
  private spawnPowerup(): void {
    const powerup = this.world.createEntity();

    // Randomly determine the powerup type
    const powerupTypes = ["basic", "rapidFire", "superRapidFire", "normalizedFire"];
    const randomIndex = Math.floor(Math.random() * powerupTypes.length);
    const powerupType = powerupTypes[randomIndex] as
      | "basic"
      | "rapidFire"
      | "superRapidFire"
      | "normalizedFire";

    // Set color based on powerup type
    let color = "blue";
    switch (powerupType) {
      case "rapidFire":
        color = "pink";
        break;
      case "superRapidFire":
        color = "orange";
        break;
      case "normalizedFire":
        color = "yellow";
        break;
      default:
        color = "tan";
    }

    // Add components to the powerup
    this.world.addComponent(
      powerup,
      new PositionComponent(
        this.gameConfig.rightSideX - 15, // x (centered on right side)
        -30 // y (above the screen)
      )
    );
    this.world.addComponent(powerup, new SizeComponent(30, 30));
    this.world.addComponent(powerup, new VelocityComponent(0, 75)); // Move downward
    this.world.addComponent(powerup, new RenderComponent(color));
    this.world.addComponent(powerup, new HealthComponent(1));
    this.world.addComponent(powerup, new CollisionComponent(true, 0, "powerup"));
    this.world.addComponent(powerup, new PowerupComponent(powerupType, 1));
  }
}

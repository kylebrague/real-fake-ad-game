import { World } from "./World";
import { MovementSystem } from "./systems/MovementSystem";
import { RenderSystem } from "./systems/RenderSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { PlayerSystem } from "./systems/PlayerSystem";
import { SpawnSystem } from "./systems/SpawnSystem";
import { CleanupSystem } from "./systems/CleanupSystem";
import { PowerupSystem } from "./systems/PowerupSystem";

import {
  PositionComponent,
  SizeComponent,
  RenderComponent,
  HealthComponent,
  CollisionComponent,
} from "./components/CoreComponents";
import { PlayerComponent, TagComponent, GameStateComponent } from "./components/GameComponents";

/**
 * Main Game class using ECS architecture
 *
 * This class initializes the ECS world, sets up systems,
 * creates the initial entities, and handles the game loop.
 */
export class Game {
  // Core ECS world
  private world: World;

  // Game systems
  private renderSystem: RenderSystem;
  private playerSystem: PlayerSystem;
  private powerupSystem: PowerupSystem;

  // Game state
  private gameInitialized = false;
  private lastFrameTime = 0;
  private animationFrameId: number | null = null;

  // ========================= Configuration =========================
  private config: ConstructorParameters<typeof SpawnSystem>[0] = {
    canvasWidth: 800,
    canvasHeight: 600,
    leftSideX: 200,
    rightSideX: 600,
    leftSideSpawnInterval: 2,
    rightSideSpawnInterval: 3,
  };
  // ========================= xxxxxxxxxxxxx =========================

  /**
   * Create a new game instance
   */
  constructor(private canvas: HTMLCanvasElement) {
    // Get the canvas rendering context
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas rendering context");
    }

    // Set canvas dimensions
    canvas.width = this.config.canvasWidth;
    canvas.height = this.config.canvasHeight;

    // Create the ECS world
    this.world = new World();

    // Create and add systems to the world
    this.renderSystem = new RenderSystem(ctx);
    this.world.addSystem(this.renderSystem);

    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new CollisionSystem(this.config.canvasWidth, this.config.canvasHeight));

    this.playerSystem = new PlayerSystem(this.config.canvasWidth, this.config.canvasHeight);
    this.world.addSystem(this.playerSystem);

    this.powerupSystem = new PowerupSystem();
    this.world.addSystem(this.powerupSystem);

    this.world.addSystem(new SpawnSystem(this.config));
    this.world.addSystem(new CleanupSystem());
  }

  /**
   * Initialize the game
   */
  init(): void {
    if (this.gameInitialized) return;

    // Create game state entity
    const gameStateEntity = this.world.createEntity();
    this.world.addComponent(gameStateEntity, new GameStateComponent());
    this.world.addComponent(gameStateEntity, new TagComponent("gameState"));

    // Create player entity
    const player = this.world.createEntity();

    // Add components to the player
    this.world.addComponent(
      player,
      new PositionComponent(this.config.canvasWidth / 2 - 25, this.config.canvasHeight - 60)
    );
    this.world.addComponent(player, new SizeComponent(50, 50));
    this.world.addComponent(player, new RenderComponent("green"));
    this.world.addComponent(player, new PlayerComponent());
    this.world.addComponent(player, new HealthComponent(100));
    this.world.addComponent(player, new CollisionComponent(true, 0, "player"));

    // Set up input handlers
    this.setupInputHandlers();

    this.gameInitialized = true;
  }

  /**
   * Start the game
   */
  start(): void {
    if (!this.gameInitialized) {
      this.init();
    }

    // Reset the game state
    const gameStateEntities = this.world.getEntitiesWith("GameState");
    if (gameStateEntities.length > 0) {
      const gameState = this.world.getComponent<GameStateComponent>(
        gameStateEntities[0],
        "GameState"
      );
      if (gameState) {
        gameState.isPaused = false;
        gameState.isGameOver = false;
      }
    }

    // Start the game loop
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

  /**
   * Pause the game
   */
  pause(): void {
    const gameStateEntities = this.world.getEntitiesWith("GameState");
    if (gameStateEntities.length > 0) {
      const gameState = this.world.getComponent<GameStateComponent>(
        gameStateEntities[0],
        "GameState"
      );
      if (gameState) {
        gameState.isPaused = true;
      }
    }

    // Cancel animation frame if it exists
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Render one last frame to show the pause screen
    const ctx = this.canvas.getContext("2d");
    if (ctx) {
      // Clear the canvas
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Continue to render the world (game objects will still be visible)
      this.world.update(0); // Update with 0 delta to avoid movement
      
      // Draw the pause text
      ctx.fillStyle = "black";
      ctx.font = "48px Arial";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2);

      ctx.font = "24px Arial";
      ctx.fillText("Press P to resume", this.canvas.width / 2, this.canvas.height / 2 + 50);
    }
  }

  /**
   * Resume the game
   */
  resume(): void {
    const gameStateEntities = this.world.getEntitiesWith("GameState");
    if (gameStateEntities.length > 0) {
      const gameState = this.world.getComponent<GameStateComponent>(
        gameStateEntities[0],
        "GameState"
      );
      if (gameState) {
        gameState.isPaused = false;
      }
    }

    // Reset player movement states to prevent actions from pause carrying over
    const playerEntities = this.world.getEntitiesWith("Player");
    if (playerEntities.length > 0) {
      const playerEntity = playerEntities[0];
      const playerComponent = this.world.getComponent<PlayerComponent>(playerEntity, "Player");
      if (playerComponent) {
        // Reset movement flags
        playerComponent.isMovingLeft = false;
        playerComponent.isMovingRight = false;
      }
    }

    if (this.animationFrameId === null) {
      this.lastFrameTime = performance.now();
      this.gameLoop(this.lastFrameTime);
    }
  }

  /**
   * Main game loop
   */
  private gameLoop(timestamp: number): void {
    // Calculate delta time
    const deltaTime = (timestamp - this.lastFrameTime) / 1000; // convert to seconds
    this.lastFrameTime = timestamp;

    // Clear the canvas
    const ctx = this.canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Update the ECS world
    this.world.update(deltaTime);

    // Check for game over
    const gameStateEntities = this.world.getEntitiesWith("GameState");
    if (gameStateEntities.length > 0) {
      const gameState = this.world.getComponent<GameStateComponent>(
        gameStateEntities[0],
        "GameState"
      );
      if(gameState?.isPaused){
        // Handle paused state (render pause screen)
        if (ctx) {
          ctx.fillStyle = "black";
          ctx.font = "48px Arial";
          ctx.textAlign = "center";
          ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2);

          ctx.font = "24px Arial";
          ctx.fillText("Press P to resume", this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
        return;
      }
      if (gameState?.isGameOver) {
        // Handle game over (render game over screen)
        if (ctx) {
          ctx.fillStyle = "black";
          ctx.font = "48px Arial";
          ctx.textAlign = "center";
          ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);

          ctx.font = "24px Arial";
          ctx.fillText("Press R to restart", this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
      } else if (gameState && !gameState.isPaused) {
        // Continue the game loop if not paused or game over
        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
      }
    }
  }

  /**
   * Set up keyboard and mouse input handlers
   */
  private setupInputHandlers(): void {
    // Keyboard input for movement
    window.addEventListener("keydown", (event) => {
      // First check for pause toggle since this should work regardless of pause state
      if (event.key === "p") {
        const gsEntities = this.world.getEntitiesWith("GameState");
        if (gsEntities.length > 0) {
          const gameState = this.world.getComponent<GameStateComponent>(
            gsEntities[0],
            "GameState"
          );

          if (gameState) {
            if (gameState.isPaused) {
              this.resume();
            } else {
              this.pause();
            }
          }
        }
        return;
      }

      // Check for restart on game over
      if (event.key === "r") {
        const restartGameStateEntities = this.world.getEntitiesWith("GameState");
        if (restartGameStateEntities.length > 0) {
          const gameState = this.world.getComponent<GameStateComponent>(
            restartGameStateEntities[0],
            "GameState"
          );

          if (gameState?.isGameOver) {
            // Reset the game
            this.resetGame();
            this.start();
          }
        }
        return;
      }

      // Check if game is paused or over before processing other inputs
      const gameStateEntities = this.world.getEntitiesWith("GameState");
      if (gameStateEntities.length > 0) {
        const gameState = this.world.getComponent<GameStateComponent>(
          gameStateEntities[0],
          "GameState"
        );
        if (gameState?.isPaused || gameState?.isGameOver) {
          return; // Don't process inputs while paused or game over
        }
      }

      // Only process gameplay inputs if game is active
      const playerEntities = this.world.getEntitiesWith("Player");
      if (playerEntities.length === 0) return;

      const playerEntity = playerEntities[0];
      const playerComponent = this.world.getComponent<PlayerComponent>(playerEntity, "Player");

      if (playerComponent) {
        switch (event.key) {
          case "ArrowLeft":
          case "a":
            playerComponent.isMovingLeft = true;
            break;
          case "ArrowRight":
          case "d":
            playerComponent.isMovingRight = true;
            break;
          case " ":
          case "w":
          case "ArrowUp":
            // Shoot bullet
            this.playerSystem.shoot(playerEntity);
            break;
        }
      }
    });

    // Release key handlers
    window.addEventListener("keyup", (event) => {
      // Check if game is paused before processing inputs
      const gameStateEntities = this.world.getEntitiesWith("GameState");
      if (gameStateEntities.length > 0) {
        const gameState = this.world.getComponent<GameStateComponent>(
          gameStateEntities[0],
          "GameState"
        );
        if (gameState?.isPaused || gameState?.isGameOver) {
          return; // Don't process inputs while paused or game over
        }
      }

      const playerEntities = this.world.getEntitiesWith("Player");
      if (playerEntities.length === 0) return;

      const playerEntity = playerEntities[0];
      const playerComponent = this.world.getComponent<PlayerComponent>(playerEntity, "Player");

      if (playerComponent) {
        switch (event.key) {
          case "ArrowLeft":
          case "a":
            playerComponent.isMovingLeft = false;
            break;
          case "ArrowRight":
          case "d":
            playerComponent.isMovingRight = false;
            break;
        }
      }
    });
  }

  /**
   * Reset the game state for a new game
   */
  resetGame(): void {
    // Create a new world (this is simpler than trying to reset the existing one)
    this.world = new World();

    // Re-add systems to the world
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas rendering context");
    }

    this.renderSystem = new RenderSystem(ctx);
    this.world.addSystem(this.renderSystem);

    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new CollisionSystem(this.config.canvasWidth, this.config.canvasHeight));

    this.playerSystem = new PlayerSystem(this.config.canvasWidth, this.config.canvasHeight);
    this.world.addSystem(this.playerSystem);
    
    this.powerupSystem = new PowerupSystem();
    this.world.addSystem(this.powerupSystem);

    this.world.addSystem(new SpawnSystem(this.config));
    this.world.addSystem(new CleanupSystem());

    // Re-initialize the game
    this.gameInitialized = false;
    this.init();
  }
}

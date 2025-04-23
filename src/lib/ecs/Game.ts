import { World } from "./World";
import { MovementSystem } from "./systems/MovementSystem";
import { RenderSystem } from "./systems/RenderSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { PlayerSystem } from "./systems/PlayerSystem";
import { SpawnSystem } from "./systems/SpawnSystem";
import { CleanupSystem } from "./systems/CleanupSystem";
import { PowerupSystem } from "./systems/PowerupSystem";
import { BackgroundFactory } from "./utils/BackgroundFactory";

import {
  PositionComponent,
  SizeComponent,
  RenderComponent,
  HealthComponent,
  CollisionComponent,
  SpriteComponent,
} from "./components/CoreComponents";
import {
  PlayerComponent,
  TagComponent,
  GameStateComponent,
  MultiplierComponent,
} from "./components/GameComponents";

/**
 * Main Game class using ECS architecture
 *
 * This class initializes the ECS world, sets up systems,
 * creates the initial entities, and handles the game loop.
 */
export class Game {
  private world: World;
  private renderSystem: RenderSystem;
  private playerSystem: PlayerSystem;
  private powerupSystem: PowerupSystem;
  private gameInitialized = false;
  private lastFrameTime = 0; // Re-added, used in gameLoop
  private animationFrameId: number | null = null; // Re-added, used in gameLoop/pause/resume
  private canvas: HTMLCanvasElement; // Re-added, used in pause/resetGame

  private config: ConstructorParameters<typeof SpawnSystem>[0] = {
    canvasWidth: 800,
    canvasHeight: 900,
    leftSideX: 250,
    rightSideX: 550,
    leftSideSpawnInterval: 2,
    rightSideSpawnInterval: 3,
  };

  constructor(canvas: HTMLCanvasElement) { // Keep canvas reference
    this.canvas = canvas; // Store canvas reference
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas rendering context");
    }
    canvas.width = this.config.canvasWidth;
    canvas.height = this.config.canvasHeight;
    this.world = new World();
    this.renderSystem = new RenderSystem(ctx);
    this.world.addSystem(this.renderSystem);
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new CollisionSystem(this.config.canvasWidth, this.config.canvasHeight));
    this.playerSystem = new PlayerSystem(this.config.canvasWidth);
    this.world.addSystem(this.playerSystem);
    this.powerupSystem = new PowerupSystem();
    this.world.addSystem(this.powerupSystem);
    this.world.addSystem(new SpawnSystem(this.config));
    this.world.addSystem(new CleanupSystem());
  }

  init(): void {
    if (this.gameInitialized) return;
    const gameStateEntity = this.world.createEntity();
    this.world.addComponent(gameStateEntity, new GameStateComponent());
    this.world.addComponent(gameStateEntity, new TagComponent("gameState"));
    this.createBackgroundElements();

    // --- Create Player Group ---
    const playerInitialY = this.config.canvasHeight - 60;
    const playerSize = new SizeComponent(50, 50);
    const playerSprite = new SpriteComponent("assets/army-man-sprite.png", 32, 32, 9, 16, 0, false, 1, false, 4);
    const playerOffsets = [-60, 0, 60]; // Example offsets for 3 players

    for (const offsetX of playerOffsets) {
      const player = this.world.createEntity();
      
      // Initial X position is calculated relative to the center, adjusted by offset
      const playerInitialX = this.config.canvasWidth / 2 + offsetX - playerSize.width / 2;
      this.world.addComponent(player, new PositionComponent(playerInitialX, playerInitialY));
      this.world.addComponent(player, playerSize);
      // Pass the specific offsetX to the PlayerComponent
      this.world.addComponent(player, new PlayerComponent(offsetX));
      this.world.addComponent(player, new HealthComponent(100)); // Each player has health
      this.world.addComponent(player, new CollisionComponent(true, 0, "player"));
      // Use the same sprite for all players
      this.world.addComponent(player, playerSprite);
      this.world.addComponent(player, new TagComponent("Player"));
    }
    // --- End Player Group Creation ---

    // --- Remove Helper Creation ---
    // const helper = this.world.createEntity(); ... removed ...

    const multiplier = this.world.createEntity();
    this.world.addComponent(multiplier, new SizeComponent(400, 1));
    this.world.addComponent(
      multiplier,
      new PositionComponent(this.config.canvasWidth / 2 - 200, (this.config.canvasHeight * 2) / 3)
    );
    this.world.addComponent(multiplier, new TagComponent("multiplier"));
    this.world.addComponent(multiplier, new CollisionComponent(true, 0, "multiplier"));
    this.world.addComponent(multiplier, new MultiplierComponent(5));
    this.world.addComponent(multiplier, new RenderComponent("#57FFE9B4"));

    this.setupInputHandlers();
    this.gameInitialized = true;
  }

  // --- Methods moved back inside the class --- 

  private createBackgroundElements(): void {
    const mainLines = {
      leftBorder: 0,
      leftSpawnLane: this.config.leftSideX,
      midline: this.config.canvasWidth / 2,
      rightSpawnLane: this.config.rightSideX,
      rightBorder: this.config.canvasWidth,
    };
    const dividerRectWidth = 20;
    const leftDividerCenterLineX =
      mainLines.midline - (mainLines.midline - mainLines.leftSpawnLane) * 2;
    const rightDividerCenterLineX =
      mainLines.midline + (mainLines.rightSpawnLane - mainLines.midline) * 2;

    BackgroundFactory.addBackgroundToWorld(
      this.world,
      BackgroundFactory.createPolygon(
        [
          [leftDividerCenterLineX, 0],
          [leftDividerCenterLineX, this.config.canvasHeight],
          [rightDividerCenterLineX, this.config.canvasHeight],
          [rightDividerCenterLineX, 0],
        ],
        "#8b9699",
        0
      )
    );
    BackgroundFactory.addBackgroundToWorld(
      this.world,
      BackgroundFactory.createPolygon(
        [
          [leftDividerCenterLineX - dividerRectWidth / 2, 0],
          [leftDividerCenterLineX - dividerRectWidth / 2 - 10, this.config.canvasHeight],
          [leftDividerCenterLineX + dividerRectWidth / 2 - 10, this.config.canvasHeight],
          [leftDividerCenterLineX + dividerRectWidth / 2, 0],
        ],
        "#c5d5d9",
        1
      )
    );
    BackgroundFactory.addBackgroundToWorld(
      this.world,
      BackgroundFactory.createPolygon(
        [
          [leftDividerCenterLineX + dividerRectWidth / 2 + 10, 0],
          [leftDividerCenterLineX + dividerRectWidth / 2 + 0, this.config.canvasHeight],
          [leftDividerCenterLineX + dividerRectWidth / 2 - 10, this.config.canvasHeight],
          [leftDividerCenterLineX + dividerRectWidth / 2, 0],
        ],
        "#7E8C90FF",
        1
      )
    );
    const midX = this.config.canvasWidth / 2;
    const midY = this.config.canvasHeight - 250;
    BackgroundFactory.addBackgroundToWorld(
      this.world,
      BackgroundFactory.createCustomPath(
        [
          { type: "moveTo", x: midX - dividerRectWidth / 2, y: 0 },
          { type: "lineTo", x: midX - dividerRectWidth / 2, y: midY - 50 },
          {
            type: "quadraticCurveTo",
            cpx: midX - dividerRectWidth / 2,
            cpy: midY,
            x: midX,
            y: midY,
          },
          {
            type: "quadraticCurveTo",
            cpx: midX + dividerRectWidth / 2,
            cpy: midY,
            x: midX + dividerRectWidth / 2,
            y: midY - 50,
          },
          { type: "lineTo", x: midX + dividerRectWidth / 2, y: 0 },
          { type: "closePath" },
        ],
        "#c5d5d9",
        1
      )
    );
    BackgroundFactory.addBackgroundToWorld(
      this.world,
      BackgroundFactory.createPolygon(
        [
          [rightDividerCenterLineX - dividerRectWidth / 2, 0],
          [rightDividerCenterLineX - dividerRectWidth / 2 - 10, this.config.canvasHeight],
          [rightDividerCenterLineX + dividerRectWidth / 2 - 10, this.config.canvasHeight],
          [rightDividerCenterLineX + dividerRectWidth / 2, 0],
        ],
        "#c5d5d9",
        1
      )
    );
    BackgroundFactory.addBackgroundToWorld(
      this.world,
      BackgroundFactory.createPolygon(
        [
          [rightDividerCenterLineX - dividerRectWidth / 2, 0],
          [rightDividerCenterLineX - dividerRectWidth / 2 - 10, this.config.canvasHeight],
          [rightDividerCenterLineX - dividerRectWidth / 2 - 20, this.config.canvasHeight],
          [rightDividerCenterLineX - dividerRectWidth / 2 - 10, 0],
        ],
        "#7E8C90FF",
        1
      )
    );
  }

  start(): void {
    if (!this.gameInitialized) {
      this.init();
    }
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
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

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
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    const ctx = this.canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.world.update(0);
      ctx.fillStyle = "black";
      ctx.font = "48px Arial";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2);
      ctx.font = "24px Arial";
      ctx.fillText("Press P to resume", this.canvas.width / 2, this.canvas.height / 2 + 50);
    }
  }

  resume(): void {
    const gameStateEntities = this.world.getEntitiesWith("GameState");
    if (gameStateEntities.length > 0) {
      const gameState = this.world.getComponent<GameStateComponent>(
        gameStateEntities[0],
        "GameState"
      );
      if (gameState) {
        gameState.isPaused = false;
        // Reset movement state in GameStateComponent instead of PlayerComponent
        gameState.isMovingLeft = false;
        gameState.isMovingRight = false;
        gameState.isShooting = false;
      }
    }
    
    // Remove the old code that tried to reset player movement flags
    // const playerEntities = this.world.getEntitiesWith("Player");
    // if (playerEntities.length > 0) {
    //   const playerEntity = playerEntities[0];
    //   const playerComponent = this.world.getComponent<PlayerComponent>(playerEntity, "Player");
    //   if (playerComponent) {
    //     playerComponent.isMovingLeft = false;
    //     playerComponent.isMovingRight = false;
    //   }
    // }
    
    if (this.animationFrameId === null) {
      this.lastFrameTime = performance.now();
      this.gameLoop(this.lastFrameTime);
    }
  }

  private gameLoop(timestamp: number): void {
    const deltaTime = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    const ctx = this.canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // --- Remove direct player shooting call and game over check ---
    // const playerEntities = this.world.getEntitiesWith("Player");
    // if (playerEntities.length > 0) { ... } else { ... game over logic moved to CollisionSystem ... }
    // --- End Removal ---

    this.world.update(deltaTime);

    // --- Game State Rendering (Paused/Game Over) ---
    const gameStateEntities = this.world.getEntitiesWith("GameState");
    if (gameStateEntities.length > 0) {
      const gameState = this.world.getComponent<GameStateComponent>(
        gameStateEntities[0],
        "GameState"
      );

      // Render Score (Always render if context exists)
      if (ctx && gameState) {
          ctx.fillStyle = "white";
          ctx.font = "20px Arial";
          ctx.textAlign = "left";
          ctx.fillText(`Score: ${gameState.score}`, 10, 30);
      }

      if (gameState?.isPaused) {
        // ... existing pause rendering ...
        return; // Don't request next frame if paused
      }
      if (gameState?.isGameOver) {
        // ... existing game over rendering ...
        // No return here, allow potential restart input
      } else if (gameState && !gameState.isPaused) {
        // Only request next frame if not paused and not game over
        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
      }
    }
  }

  private setupInputHandlers(): void {
    window.addEventListener("keydown", (event) => {
      // --- Get GameState Component ---
      const gsEntities = this.world.getEntitiesWith("GameState");
      if (gsEntities.length === 0) return; // Should not happen if init is called
      const gameState = this.world.getComponent<GameStateComponent>(gsEntities[0], "GameState");
      if (!gameState) return;
      // --- End Get GameState ---

      // Pause/Resume handling (remains the same)
      if (event.key === "p") {
        // ... existing pause/resume logic ...
        return;
      }

      // Restart handling (remains the same)
      if (event.key === "r") {
        if (gameState.isGameOver) {
          this.resetGame();
          this.start();
        }
        return;
      }

      // Ignore movement/shooting input if paused or game over
      if (gameState.isPaused || gameState.isGameOver) {
        return;
      }

      // --- Update GameState flags for movement/shooting ---
      switch (event.key) {
        case "ArrowLeft":
        case "a":
          gameState.isMovingLeft = true;
          break;
        case "ArrowRight":
        case "d":
          gameState.isMovingRight = true;
          break;
        case " ": // Space bar for continuous shooting
          gameState.isShooting = true;
          break;
        case "w":
        case "ArrowUp":
          // Trigger single shot via PlayerSystem (if needed, or rely on continuous)
          // This might require a separate flag or method if distinct behavior is desired
          // For now, let's assume spacebar handles shooting.
          // If you want single shot on W/Up, we need PlayerSystem changes.
          break;
      }
      // --- End Update GameState flags ---
    });

    window.addEventListener("keyup", (event) => {
      // --- Get GameState Component ---
      const gsEntities = this.world.getEntitiesWith("GameState");
      if (gsEntities.length === 0) return;
      const gameState = this.world.getComponent<GameStateComponent>(gsEntities[0], "GameState");
      if (!gameState) return;
      // --- End Get GameState ---

      // Ignore input if paused or game over (redundant check but safe)
      if (gameState.isPaused || gameState.isGameOver) {
        return;
      }

      // --- Update GameState flags on key release ---
      switch (event.key) {
        case "ArrowLeft":
        case "a":
          gameState.isMovingLeft = false;
          break;
        case "ArrowRight":
        case "d":
          gameState.isMovingRight = false;
          break;
        case " ": // Space bar release stops continuous shooting
          gameState.isShooting = false;
          break;
      }
      // --- End Update GameState flags ---
    });
  }

  resetGame(): void {
    this.world = new World();
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas rendering context");
    }
    this.renderSystem = new RenderSystem(ctx);
    this.configurePerspective({ enabled: false });
    this.world.addSystem(this.renderSystem);
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new CollisionSystem(this.config.canvasWidth, this.config.canvasHeight));
    this.playerSystem = new PlayerSystem(this.config.canvasWidth);
    this.world.addSystem(this.playerSystem);
    this.powerupSystem = new PowerupSystem();
    this.world.addSystem(this.powerupSystem);
    this.world.addSystem(new SpawnSystem(this.config));
    this.world.addSystem(new CleanupSystem());
    this.gameInitialized = false;
    this.init();
  }

  async preloadAssets(imagePaths: string[]): Promise<void> {
    if (imagePaths.length > 0) {
      await this.renderSystem.preloadImages(imagePaths);
    }
  }

  configurePerspective(options: {
    enabled?: boolean;
    vanishingPointY?: number;
    depthFactor?: number;
    horizonY?: number;
    minScale?: number;
  }): void {
    this.renderSystem.configurePerspective(options);
  }
}

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
  type InputComponent,
  InputMovementComponent,
} from "./components/GameComponents";
import { InputSystem } from './systems/InputSystem';

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
  private inputSystem: InputSystem;
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
    this.inputSystem = new InputSystem();
    this.world.addSystem(this.inputSystem);
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

    // --- Create Individual Players ---
    const playerInitialY = this.config.canvasHeight - 60;
    const playerSize = new SizeComponent(50, 50);
    const playerSprite = new SpriteComponent("assets/army-man-sprite.png", 32, 32, 9, 16, 0, false, 1, false, 4);
    
    // Create three player units with different positions
    const playerPositions = [
      { x: this.config.canvasWidth / 4, offsetX: -this.config.canvasWidth / 4 },
      { x: this.config.canvasWidth / 2, offsetX: 0 },
      { x: 3 * this.config.canvasWidth / 4, offsetX: this.config.canvasWidth / 4 }
    ];

    // Create each player with a unique index
    for (let i = 0; i < playerPositions.length; i++) {
      const player = this.world.createEntity();
      this.world.addComponent(player, new PositionComponent(playerPositions[i].x, playerInitialY));
      this.world.addComponent(player, playerSize);
      // Pass index to PlayerComponent to identify each player
      this.world.addComponent(player, new PlayerComponent(playerPositions[i].offsetX, 400, true, 0.25, 0, false, false, false, i));
      this.world.addComponent(player, new HealthComponent(100));
      this.world.addComponent(player, new CollisionComponent(true, 0, "player"));
      this.world.addComponent(player, playerSprite);
      this.world.addComponent(player, new TagComponent("Player"));

    }
    // --- End Individual Players Creation ---

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
        gameStateEntities[0], "GameState"
      );
      if (gameState) {
        gameState.isPaused = false;
      }
    }
    
    // Reset all player movement flags when resuming
    const playerEntities = this.world.getEntitiesWith("Player");
    for (const playerEntity of playerEntities) {
      const playerComp = this.world.getComponent<PlayerComponent>(playerEntity, "Player");
      if (playerComp) {
        playerComp.isMovingLeft = false;
        playerComp.isMovingRight = false;
        playerComp.isShooting = false;
      }
    }
    
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

    // Process input state to handle pause/resume/restart
    this.processInputState();

    this.world.update(deltaTime);
    
    // Reset input triggers after each frame update
    if (this.inputSystem) {
      this.inputSystem.resetTriggers();
    }

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
        // Render pause overlay
        if (ctx) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          ctx.fillStyle = "white";
          ctx.font = "48px Arial";
          ctx.textAlign = "center";
          ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2);
          ctx.font = "24px Arial";
          ctx.fillText("Press P to resume", this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
        return; // Don't request next frame if paused
      }
      if (gameState?.isGameOver) {
        // Render game over overlay
        if (ctx) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          ctx.fillStyle = "white";
          ctx.font = "48px Arial";
          ctx.textAlign = "center";
          ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
          ctx.font = "24px Arial";
          ctx.fillText(`Final Score: ${gameState.score}`, this.canvas.width / 2, this.canvas.height / 2 + 50);
          ctx.fillText("Press R to restart", this.canvas.width / 2, this.canvas.height / 2 + 100);
        }
      }
      
      // Request next animation frame if game is still running
      if (!gameState?.isPaused) {
        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
      }
    }
  }

  private setupInputHandlers(): void {
    // Remove direct keyboard event handlers
    // InputSystem is now responsible for all keyboard input handling
    
    // These event listeners can be safely removed now that we're using the InputSystem
    // The InputSystem handles all input events and updates the InputComponent
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
    
    // Make sure to recreate and add the InputSystem when resetting the game
    this.inputSystem = new InputSystem();
    this.world.addSystem(this.inputSystem);
    
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

  private processInputState(): void {
    // Get input entity and component
    const inputEntities = this.world.getEntitiesWith('Input');
    if (inputEntities.length === 0) return;
    
    const inputComponent = this.world.getComponent<InputComponent>(
      inputEntities[0], 'Input'
    );
    if (!inputComponent) return;

    // Get game state
    const gameStateEntities = this.world.getEntitiesWith('GameState');
    if (gameStateEntities.length === 0) return;
    
    const gameState = this.world.getComponent<GameStateComponent>(
      gameStateEntities[0], 'GameState'
    );
    if (!gameState) return;

    // Handle pause toggle
    if (inputComponent.justPaused) {
      if (gameState.isPaused) {
        this.resume();
      } else {
        this.pause();
      }
    }

    // Handle restart
    if (inputComponent.justRestarted) {
      this.resetGame();
    }
  }
}

(() => {
  // src/lib/ecs/Entity.ts
  var Entity = class _Entity {
    static nextId = 0;
    id;
    constructor() {
      this.id = _Entity.nextId++;
    }
    /**
     * Check if this entity is the same as another
     */
    equals(other) {
      return this.id === other.id;
    }
  };

  // src/lib/ecs/World.ts
  var World = class {
    entities = [];
    components = /* @__PURE__ */ new Map();
    systems = [];
    entityComponentCache = /* @__PURE__ */ new Map();
    cacheValid = false;
    /**
     * Create a new entity
     */
    createEntity() {
      const entity = new Entity();
      this.entities.push(entity);
      this.components.set(entity.id, /* @__PURE__ */ new Map());
      this.cacheValid = false;
      return entity;
    }
    /**
     * Remove an entity and all its components
     */
    removeEntity(entity) {
      const index = this.entities.findIndex((e) => e.equals(entity));
      if (index !== -1) {
        this.entities.splice(index, 1);
        this.components.delete(entity.id);
        this.cacheValid = false;
      }
    }
    /**
     * Add a component to an entity
     */
    addComponent(entity, component) {
      const entityComponents = this.components.get(entity.id);
      if (entityComponents) {
        entityComponents.set(component.type, component);
        this.cacheValid = false;
      }
    }
    /**
     * Get a component from an entity
     */
    getComponent(entity, componentType) {
      const entityComponents = this.components.get(entity.id);
      if (entityComponents) {
        return entityComponents.get(componentType);
      }
      return void 0;
    }
    /**
     * Remove a component from an entity
     */
    removeComponent(entity, componentType) {
      const entityComponents = this.components.get(entity.id);
      if (entityComponents) {
        entityComponents.delete(componentType);
        this.cacheValid = false;
      }
    }
    /**
     * Add a system to the world
     */
    addSystem(system) {
      this.systems.push(system);
      system.setWorld(this);
      system.initialize();
    }
    /**
     * Get systems by their class name
     * This allows other systems to find specific system instances
     */
    getSystems(systemName) {
      return this.systems.filter((system) => {
        const className = system.constructor.name;
        return className === systemName;
      });
    }
    /**
     * Get all entities that have the specified component types
     */
    getEntitiesWith(...componentTypes) {
      const cacheKey = componentTypes.sort().join(",");
      if (!this.cacheValid) {
        this.refreshCache();
      }
      if (!this.entityComponentCache.has(cacheKey)) {
        const matchingEntities = this.entities.filter((entity) => {
          const entityComponents = this.components.get(entity.id);
          if (!entityComponents) return false;
          return componentTypes.every(
            (type) => entityComponents.has(type)
          );
        });
        this.entityComponentCache.set(cacheKey, matchingEntities);
      }
      return this.entityComponentCache.get(cacheKey) || [];
    }
    /**
     * Refresh the entity component cache
     */
    refreshCache() {
      this.entityComponentCache.clear();
      this.cacheValid = true;
    }
    /**
     * Update all systems
     */
    update(deltaTime) {
      for (const system of this.systems) {
        system.update(deltaTime);
      }
    }
  };

  // src/lib/ecs/System.ts
  var System = class {
    /**
     * Reference to the world this system belongs to
     */
    world;
    /**
     * Array of component types that this system operates on
     */
    requiredComponents;
    constructor(requiredComponents) {
      this.requiredComponents = requiredComponents;
    }
    /**
     * Set the world this system belongs to
     */
    setWorld(world) {
      this.world = world;
    }
    /**
     * Initialize the system
     * Called when the system is added to the world
     */
    initialize() {
    }
  };

  // src/lib/ecs/systems/MovementSystem.ts
  var MovementSystem = class extends System {
    constructor() {
      super(["Position", "Velocity"]);
    }
    update(deltaTime) {
      const entities = this.world.getEntitiesWith("Position", "Velocity");
      for (const entity of entities) {
        const position = this.world.getComponent(entity, "Position");
        const velocity = this.world.getComponent(entity, "Velocity");
        if (position && velocity) {
          position.x += velocity.speedX * deltaTime;
          position.y += velocity.speedY * deltaTime;
        }
      }
    }
  };

  // src/lib/ecs/systems/RenderSystem.ts
  var RenderSystem = class extends System {
    ctx;
    constructor(ctx) {
      super(["Position", "Size", "Render"]);
      this.ctx = ctx;
    }
    update(deltaTime) {
      const entities = this.world.getEntitiesWith("Position", "Size", "Render");
      for (const entity of entities) {
        const position = this.world.getComponent(entity, "Position");
        const size = this.world.getComponent(entity, "Size");
        const render = this.world.getComponent(entity, "Render");
        if (position && size && render) {
          this.ctx.fillStyle = render.color;
          if (render.shape === "rectangle") {
            this.ctx.fillRect(position.x, position.y, size.width, size.height);
          } else if (render.shape === "circle") {
            this.ctx.beginPath();
            this.ctx.arc(
              position.x + size.width / 2,
              position.y + size.height / 2,
              Math.min(size.width, size.height) / 2,
              0,
              Math.PI * 2
            );
            this.ctx.fill();
          }
        }
      }
    }
  };

  // src/lib/ecs/systems/CollisionSystem.ts
  var CollisionSystem = class extends System {
    gameHeight;
    gameWidth;
    constructor(canvasWidth, canvasHeight) {
      super(["Position", "Size", "Collision"]);
      this.gameWidth = canvasWidth;
      this.gameHeight = canvasHeight;
    }
    update(deltaTime) {
      this.checkBulletCollisions();
      this.checkPlayerPowerupCollisions();
      this.checkOffscreenEntities();
      this.checkEnemyReachedBottom();
    }
    /**
     * Check for collisions between bullets and other entities
     */
    checkBulletCollisions() {
      const bullets = this.world.getEntitiesWith("Bullet", "Position", "Size", "Collision");
      const enemies = this.world.getEntitiesWith("Enemy", "Position", "Size", "Collision", "Health");
      const powerups = this.world.getEntitiesWith(
        "Powerup",
        "Position",
        "Size",
        "Collision",
        "Health"
      );
      for (const bulletEntity of bullets) {
        const bulletComponent = this.world.getComponent(bulletEntity, "Bullet");
        if (bulletComponent?.hit) continue;
        const bulletPos = this.world.getComponent(bulletEntity, "Position");
        const bulletSize = this.world.getComponent(bulletEntity, "Size");
        if (!bulletPos || !bulletSize) continue;
        for (const enemyEntity of enemies) {
          const enemyPos = this.world.getComponent(enemyEntity, "Position");
          const enemySize = this.world.getComponent(enemyEntity, "Size");
          const enemyHealth = this.world.getComponent(enemyEntity, "Health");
          if (!enemyPos || !enemySize || !enemyHealth) continue;
          if (this.isColliding(bulletPos, bulletSize, enemyPos, enemySize)) {
            enemyHealth.currentHealth -= bulletComponent.damage;
            bulletComponent.hit = true;
            if (enemyHealth.isDead()) {
              const enemy = this.world.getComponent(enemyEntity, "Enemy");
              const players = this.world.getEntitiesWith("Player");
              if (enemy && players.length > 0) {
                const playerComp = this.world.getComponent(players[0], "Player");
                if (playerComp) {
                  playerComp.score += enemy.pointValue;
                }
              }
            }
            break;
          }
        }
        if (!bulletComponent.hit) {
          for (const powerupEntity of powerups) {
            const powerupPos = this.world.getComponent(powerupEntity, "Position");
            const powerupSize = this.world.getComponent(powerupEntity, "Size");
            const powerupHealth = this.world.getComponent(powerupEntity, "Health");
            if (!powerupPos || !powerupSize || !powerupHealth) continue;
            if (this.isColliding(bulletPos, bulletSize, powerupPos, powerupSize)) {
              powerupHealth.currentHealth -= bulletComponent.damage;
              if (powerupHealth.isDead()) {
                const powerupSystems = this.world.getSystems("PowerupSystem");
                if (powerupSystems.length > 0) {
                  const powerupSystem = powerupSystems[0];
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
    checkPlayerPowerupCollisions() {
      const players = this.world.getEntitiesWith("Player", "Position", "Size", "Collision");
      const powerups = this.world.getEntitiesWith("Powerup", "Position", "Size", "Collision");
      if (players.length === 0 || powerups.length === 0) return;
      const playerEntity = players[0];
      const playerPos = this.world.getComponent(playerEntity, "Position");
      const playerSize = this.world.getComponent(playerEntity, "Size");
      const playerHealth = this.world.getComponent(playerEntity, "Health");
      if (!playerPos || !playerSize) return;
      for (const powerupEntity of powerups) {
        const powerupPos = this.world.getComponent(powerupEntity, "Position");
        const powerupSize = this.world.getComponent(powerupEntity, "Size");
        const powerup = this.world.getComponent(powerupEntity, "Powerup");
        const health = this.world.getComponent(powerupEntity, "Health");
        if (!powerupPos || !powerupSize || !powerup || !health) continue;
        if (this.isColliding(playerPos, playerSize, powerupPos, powerupSize)) {
          playerHealth.currentHealth = 0;
        }
      }
    }
    /**
     * Check if any entities are off screen and mark them for removal
     */
    checkOffscreenEntities() {
      const entities = this.world.getEntitiesWith("Position", "Size");
      for (const entity of entities) {
        const position = this.world.getComponent(entity, "Position");
        const size = this.world.getComponent(entity, "Size");
        if (!position || !size) continue;
        if (position.y > this.gameHeight || position.y + size.height < 0 || position.x > this.gameWidth || position.x + size.width < 0) {
          const bullet = this.world.getComponent(entity, "Bullet");
          if (bullet) {
            bullet.hit = true;
          }
          const enemy = this.world.getComponent(entity, "Enemy");
          const powerup = this.world.getComponent(entity, "Powerup");
          if (enemy || powerup) {
            const health = this.world.getComponent(entity, "Health");
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
    checkEnemyReachedBottom() {
      const enemies = this.world.getEntitiesWith("Enemy", "Position", "Size");
      const gameState = this.world.getEntitiesWith("Tag");
      let gameStateEntity;
      for (const entity of gameState) {
        const tag = this.world.getComponent(entity, "Tag");
        if (tag && tag.tag === "gameState") {
          gameStateEntity = entity;
          break;
        }
      }
      if (!gameStateEntity) return;
      const player = this.world.getEntitiesWith("Player", "Size")[0];
      const playerSize = this.world.getComponent(player, "Size");
      for (const enemy of enemies) {
        const position = this.world.getComponent(enemy, "Position");
        const size = this.world.getComponent(enemy, "Size");
        if (position && size) {
          if (position.y + size.height - playerSize.height >= this.gameHeight) {
            const gameStateComponent = this.world.getComponent(
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
    isColliding(pos1, size1, pos2, size2) {
      return pos1.x < pos2.x + size2.width && pos1.x + size1.width > pos2.x && pos1.y < pos2.y + size2.height && pos1.y + size1.height > pos2.y;
    }
  };

  // src/lib/ecs/components/CoreComponents.ts
  var PositionComponent = class {
    constructor(x, y, rotation = 0) {
      this.x = x;
      this.y = y;
      this.rotation = rotation;
    }
    type = "Position";
  };
  var SizeComponent = class {
    constructor(width, height) {
      this.width = width;
      this.height = height;
    }
    type = "Size";
  };
  var VelocityComponent = class {
    constructor(speedX = 0, speedY = 0) {
      this.speedX = speedX;
      this.speedY = speedY;
    }
    type = "Velocity";
  };
  var RenderComponent = class {
    constructor(color = "white", shape = "rectangle") {
      this.color = color;
      this.shape = shape;
    }
    type = "Render";
  };
  var HealthComponent = class {
    constructor(currentHealth, maxHealth = currentHealth) {
      this.currentHealth = currentHealth;
      this.maxHealth = maxHealth;
    }
    type = "Health";
    isDead() {
      return this.currentHealth <= 0;
    }
  };
  var CollisionComponent = class {
    constructor(collidable = true, damage = 0, collisionGroup = "default") {
      this.collidable = collidable;
      this.damage = damage;
      this.collisionGroup = collisionGroup;
    }
    type = "Collision";
  };

  // src/lib/ecs/components/GameComponents.ts
  var PlayerComponent = class {
    constructor(lives = 3, score = 0, isMovingLeft = false, isMovingRight = false, bulletCooldown = 0, bulletCooldownMax = 0.25) {
      this.lives = lives;
      this.score = score;
      this.isMovingLeft = isMovingLeft;
      this.isMovingRight = isMovingRight;
      this.bulletCooldown = bulletCooldown;
      this.bulletCooldownMax = bulletCooldownMax;
    }
    type = "Player";
  };
  var EnemyComponent = class {
    constructor(enemyType = "basic", pointValue = 10) {
      this.enemyType = enemyType;
      this.pointValue = pointValue;
    }
    type = "Enemy";
  };
  var PowerupComponent = class {
    constructor(powerupType = "basic", value = 1) {
      this.powerupType = powerupType;
      this.value = value;
    }
    type = "Powerup";
  };
  var BulletComponent = class {
    constructor(damage = 1, hit = false) {
      this.damage = damage;
      this.hit = hit;
    }
    type = "Bullet";
  };
  var TagComponent = class {
    constructor(tag) {
      this.tag = tag;
    }
    type = "Tag";
  };
  var GameStateComponent = class {
    constructor(isPaused = false, isGameOver = false) {
      this.isPaused = isPaused;
      this.isGameOver = isGameOver;
    }
    type = "GameState";
  };
  var CooldownModifierComponent = class {
    constructor(bulletCooldownMultiplier = 1, duration = -1, timeRemaining = -1) {
      this.bulletCooldownMultiplier = bulletCooldownMultiplier;
      this.duration = duration;
      this.timeRemaining = timeRemaining;
    }
    type = "CooldownModifier";
  };

  // src/lib/ecs/systems/PlayerSystem.ts
  var PlayerSystem = class extends System {
    canvasWidth;
    canvasHeight;
    playerSpeed = 400;
    // pixels per second
    constructor(canvasWidth, canvasHeight) {
      super(["Player", "Position"]);
      this.canvasWidth = canvasWidth;
      this.canvasHeight = canvasHeight;
    }
    update(deltaTime) {
      const playerEntities = this.world.getEntitiesWith("Player", "Position");
      for (const playerEntity of playerEntities) {
        this.updatePlayerMovement(playerEntity, deltaTime);
        const player = this.world.getComponent(playerEntity, "Player");
        if (player && player.bulletCooldown > 0) {
          player.bulletCooldown = Math.max(0, player.bulletCooldown - deltaTime);
        }
        this.updateCooldownModifiers(playerEntity, deltaTime);
      }
    }
    /**
     * Updates any active cooldown modifiers on the player
     */
    updateCooldownModifiers(playerEntity, deltaTime) {
      const cooldownModifier = this.world.getComponent(
        playerEntity,
        "CooldownModifier"
      );
      if (cooldownModifier && cooldownModifier.timeRemaining > 0) {
        cooldownModifier.timeRemaining = Math.max(0, cooldownModifier.timeRemaining - deltaTime);
        if (cooldownModifier.timeRemaining === 0) {
          this.world.removeComponent(playerEntity, "CooldownModifier");
        }
      }
    }
    /**
     * Updates the player position based on input stored in the PlayerComponent
     */
    updatePlayerMovement(playerEntity, deltaTime) {
      const player = this.world.getComponent(playerEntity, "Player");
      const position = this.world.getComponent(playerEntity, "Position");
      const size = this.world.getComponent(playerEntity, "Size");
      if (!player || !position || !size) return;
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
    shoot(playerEntity) {
      const player = this.world.getComponent(playerEntity, "Player");
      const position = this.world.getComponent(playerEntity, "Position");
      const size = this.world.getComponent(playerEntity, "Size");
      if (!player || !position || !size) return;
      if (player.bulletCooldown > 0) return;
      this.createBullet(
        position.x + size.width * 0.5,
        position.y,
        10,
        10
      );
      const cooldownModifier = this.world.getComponent(
        playerEntity,
        "CooldownModifier"
      );
      if (cooldownModifier) {
        player.bulletCooldown = player.bulletCooldownMax * cooldownModifier.bulletCooldownMultiplier;
      } else {
        player.bulletCooldown = player.bulletCooldownMax;
      }
    }
    /**
     * Helper method to create a bullet entity with all necessary components
     */
    createBullet(x, y, width, height) {
      const bullet = this.world.createEntity();
      this.world.addComponent(bullet, new PositionComponent(x - width / 2, y));
      this.world.addComponent(bullet, new SizeComponent(width, height));
      this.world.addComponent(bullet, new VelocityComponent(0, -500));
      this.world.addComponent(bullet, new RenderComponent("yellow"));
      this.world.addComponent(bullet, new BulletComponent(1, false));
      this.world.addComponent(bullet, new CollisionComponent(true, 1, "bullet"));
    }
  };

  // src/lib/ecs/systems/SpawnSystem.ts
  var SpawnSystem = class extends System {
    gameConfig;
    lastEnemySpawnTime = 0;
    lastPowerupSpawnTime = 0;
    leftSideSpawnInterval;
    rightSideSpawnInterval;
    constructor(gameConfig) {
      super(["GameState"]);
      this.gameConfig = gameConfig;
      this.leftSideSpawnInterval = gameConfig.leftSideSpawnInterval;
      this.rightSideSpawnInterval = gameConfig.rightSideSpawnInterval;
    }
    update(deltaTime) {
      const gameStateEntities = this.world.getEntitiesWith("GameState");
      if (gameStateEntities.length === 0) return;
      const gameStateEntity = gameStateEntities[0];
      const gameState = this.world.getComponent(gameStateEntity, "GameState");
      if (!gameState || gameState.isPaused || gameState.isGameOver) return;
      this.lastEnemySpawnTime += deltaTime;
      if (this.lastEnemySpawnTime > this.leftSideSpawnInterval) {
        this.spawnEnemy();
        this.lastEnemySpawnTime = 0;
      }
      this.lastPowerupSpawnTime += deltaTime;
      if (this.lastPowerupSpawnTime > this.rightSideSpawnInterval) {
        this.spawnPowerup();
        this.lastPowerupSpawnTime = 0;
      }
    }
    /**
     * Create a new enemy entity
     */
    spawnEnemy() {
      const enemy = this.world.createEntity();
      this.world.addComponent(
        enemy,
        new PositionComponent(
          this.gameConfig.leftSideX - 15,
          // x (centered on left side)
          -30
          // y (above the screen)
        )
      );
      this.world.addComponent(enemy, new SizeComponent(30, 30));
      this.world.addComponent(enemy, new VelocityComponent(0, 50));
      this.world.addComponent(enemy, new RenderComponent("red"));
      this.world.addComponent(enemy, new HealthComponent(1));
      this.world.addComponent(enemy, new CollisionComponent(true, 0, "enemy"));
      this.world.addComponent(enemy, new EnemyComponent("basic", 10));
    }
    /**
     * Create a new powerup entity
     */
    spawnPowerup() {
      const powerup = this.world.createEntity();
      const powerupTypes = ["basic", "rapidFire", "superRapidFire", "normalizedFire"];
      const randomIndex = Math.floor(Math.random() * powerupTypes.length);
      const powerupType = powerupTypes[randomIndex];
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
      this.world.addComponent(
        powerup,
        new PositionComponent(
          this.gameConfig.rightSideX - 15,
          // x (centered on right side)
          -30
          // y (above the screen)
        )
      );
      this.world.addComponent(powerup, new SizeComponent(30, 30));
      this.world.addComponent(powerup, new VelocityComponent(0, 75));
      this.world.addComponent(powerup, new RenderComponent(color));
      this.world.addComponent(powerup, new HealthComponent(1));
      this.world.addComponent(powerup, new CollisionComponent(true, 0, "powerup"));
      this.world.addComponent(powerup, new PowerupComponent(powerupType, 1));
    }
  };

  // src/lib/ecs/systems/CleanupSystem.ts
  var CleanupSystem = class extends System {
    constructor() {
      super(["Health", "Position"]);
    }
    update(deltaTime) {
      const deadEntities = this.world.getEntitiesWith("Health").filter((entity) => {
        const health = this.world.getComponent(entity, "Health");
        return health && health.currentHealth <= 0;
      });
      for (const entity of deadEntities) {
        this.world.removeEntity(entity);
      }
      const hitBullets = this.world.getEntitiesWith("Bullet").filter((entity) => {
        const bullet = this.world.getComponent(entity, "Bullet");
        return bullet?.hit;
      });
      for (const entity of hitBullets) {
        this.world.removeEntity(entity);
      }
    }
  };

  // src/lib/ecs/systems/PowerupSystem.ts
  var PowerupSystem = class extends System {
    constructor() {
      super(["CooldownModifier"]);
    }
    update(deltaTime) {
      const entitiesWithCooldown = this.world.getEntitiesWith("CooldownModifier");
      for (const entity of entitiesWithCooldown) {
        this.updateCooldownModifier(entity, deltaTime);
      }
    }
    /**
     * Updates a cooldown modifier and removes it if expired
     */
    updateCooldownModifier(entity, deltaTime) {
      const cooldownModifier = this.world.getComponent(
        entity,
        "CooldownModifier"
      );
      if (!cooldownModifier) return;
      if (cooldownModifier.timeRemaining > 0) {
        cooldownModifier.timeRemaining -= deltaTime;
        if (cooldownModifier.timeRemaining <= 0) {
          this.world.removeComponent(entity, "CooldownModifier");
        }
      }
    }
    /**
     * Apply a rapid fire powerup to an entity
     * This is typically called when a player picks up a rapid fire powerup
     */
    applyRapidFirePowerup(entity, duration, multiplier = 0.5) {
      if (this.world.getComponent(entity, "CooldownModifier")) {
        this.world.removeComponent(entity, "CooldownModifier");
      }
      this.world.addComponent(entity, new CooldownModifierComponent(multiplier, duration, duration));
    }
    /**
     * Process a powerup collision and apply the appropriate effect
     * This method should be called when a player collides with a powerup
     */
    processPowerup(playerEntity, powerupEntity) {
      const powerup = this.world.getComponent(powerupEntity, "Powerup");
      if (!powerup) return;
      switch (powerup.powerupType) {
        case "rapidFire":
          this.applyRapidFirePowerup(playerEntity, 5, 0.5);
          break;
        case "superRapidFire":
          this.applyRapidFirePowerup(playerEntity, 3, 0.25);
          break;
        case "normalizedFire":
          if (this.world.getComponent(playerEntity, "CooldownModifier")) {
            this.world.removeComponent(playerEntity, "CooldownModifier");
          }
          break;
        default:
          break;
      }
    }
  };

  // src/lib/ecs/Game.ts
  var Game = class {
    // ========================= xxxxxxxxxxxxx =========================
    /**
     * Create a new game instance
     */
    constructor(canvas) {
      this.canvas = canvas;
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
      this.playerSystem = new PlayerSystem(this.config.canvasWidth, this.config.canvasHeight);
      this.world.addSystem(this.playerSystem);
      this.powerupSystem = new PowerupSystem();
      this.world.addSystem(this.powerupSystem);
      this.world.addSystem(new SpawnSystem(this.config));
      this.world.addSystem(new CleanupSystem());
    }
    // Core ECS world
    world;
    // Game systems
    renderSystem;
    playerSystem;
    powerupSystem;
    // Game state
    gameInitialized = false;
    lastFrameTime = 0;
    animationFrameId = null;
    // ========================= Configuration =========================
    config = {
      canvasWidth: 800,
      canvasHeight: 600,
      leftSideX: 200,
      rightSideX: 600,
      leftSideSpawnInterval: 2,
      rightSideSpawnInterval: 3
    };
    /**
     * Initialize the game
     */
    init() {
      if (this.gameInitialized) return;
      const gameStateEntity = this.world.createEntity();
      this.world.addComponent(gameStateEntity, new GameStateComponent());
      this.world.addComponent(gameStateEntity, new TagComponent("gameState"));
      const player = this.world.createEntity();
      this.world.addComponent(
        player,
        new PositionComponent(this.config.canvasWidth / 2 - 25, this.config.canvasHeight - 60)
      );
      this.world.addComponent(player, new SizeComponent(50, 50));
      this.world.addComponent(player, new RenderComponent("green"));
      this.world.addComponent(player, new PlayerComponent());
      this.world.addComponent(player, new HealthComponent(100));
      this.world.addComponent(player, new CollisionComponent(true, 0, "player"));
      this.setupInputHandlers();
      this.gameInitialized = true;
    }
    /**
     * Start the game
     */
    start() {
      if (!this.gameInitialized) {
        this.init();
      }
      const gameStateEntities = this.world.getEntitiesWith("GameState");
      if (gameStateEntities.length > 0) {
        const gameState = this.world.getComponent(
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
    /**
     * Pause the game
     */
    pause() {
      const gameStateEntities = this.world.getEntitiesWith("GameState");
      if (gameStateEntities.length > 0) {
        const gameState = this.world.getComponent(
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
    /**
     * Resume the game
     */
    resume() {
      const gameStateEntities = this.world.getEntitiesWith("GameState");
      if (gameStateEntities.length > 0) {
        const gameState = this.world.getComponent(
          gameStateEntities[0],
          "GameState"
        );
        if (gameState) {
          gameState.isPaused = false;
        }
      }
      const playerEntities = this.world.getEntitiesWith("Player");
      if (playerEntities.length > 0) {
        const playerEntity = playerEntities[0];
        const playerComponent = this.world.getComponent(playerEntity, "Player");
        if (playerComponent) {
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
    gameLoop(timestamp) {
      const deltaTime = (timestamp - this.lastFrameTime) / 1e3;
      this.lastFrameTime = timestamp;
      const ctx = this.canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      this.world.update(deltaTime);
      const gameStateEntities = this.world.getEntitiesWith("GameState");
      if (gameStateEntities.length > 0) {
        const gameState = this.world.getComponent(
          gameStateEntities[0],
          "GameState"
        );
        if (gameState?.isPaused) {
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
          if (ctx) {
            ctx.fillStyle = "black";
            ctx.font = "48px Arial";
            ctx.textAlign = "center";
            ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
            ctx.font = "24px Arial";
            ctx.fillText("Press R to restart", this.canvas.width / 2, this.canvas.height / 2 + 50);
          }
        } else if (gameState && !gameState.isPaused) {
          this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
        }
      }
    }
    /**
     * Set up keyboard and mouse input handlers
     */
    setupInputHandlers() {
      window.addEventListener("keydown", (event) => {
        if (event.key === "p") {
          const gsEntities = this.world.getEntitiesWith("GameState");
          if (gsEntities.length > 0) {
            const gameState = this.world.getComponent(
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
        if (event.key === "r") {
          const restartGameStateEntities = this.world.getEntitiesWith("GameState");
          if (restartGameStateEntities.length > 0) {
            const gameState = this.world.getComponent(
              restartGameStateEntities[0],
              "GameState"
            );
            if (gameState?.isGameOver) {
              this.resetGame();
              this.start();
            }
          }
          return;
        }
        const gameStateEntities = this.world.getEntitiesWith("GameState");
        if (gameStateEntities.length > 0) {
          const gameState = this.world.getComponent(
            gameStateEntities[0],
            "GameState"
          );
          if (gameState?.isPaused || gameState?.isGameOver) {
            return;
          }
        }
        const playerEntities = this.world.getEntitiesWith("Player");
        if (playerEntities.length === 0) return;
        const playerEntity = playerEntities[0];
        const playerComponent = this.world.getComponent(playerEntity, "Player");
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
              this.playerSystem.shoot(playerEntity);
              break;
          }
        }
      });
      window.addEventListener("keyup", (event) => {
        const gameStateEntities = this.world.getEntitiesWith("GameState");
        if (gameStateEntities.length > 0) {
          const gameState = this.world.getComponent(
            gameStateEntities[0],
            "GameState"
          );
          if (gameState?.isPaused || gameState?.isGameOver) {
            return;
          }
        }
        const playerEntities = this.world.getEntitiesWith("Player");
        if (playerEntities.length === 0) return;
        const playerEntity = playerEntities[0];
        const playerComponent = this.world.getComponent(playerEntity, "Player");
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
    resetGame() {
      this.world = new World();
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
      this.gameInitialized = false;
      this.init();
    }
  };

  // src/index.ts
  document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("game-canvas");
    if (!canvas) {
      console.error("Canvas element not found!");
      return;
    }
    const game = new Game(canvas);
    game.init();
    game.start();
    const pauseButton = document.getElementById("pause-button");
    if (pauseButton) {
      pauseButton.addEventListener("click", () => {
        game.pause();
      });
    }
    const resumeButton = document.getElementById("resume-button");
    if (resumeButton) {
      resumeButton.addEventListener("click", () => {
        game.resume();
      });
    }
    const restartButton = document.getElementById("restart-button");
    if (restartButton) {
      restartButton.addEventListener("click", () => {
        game.resetGame();
        game.start();
      });
    }
  });
})();
//# sourceMappingURL=index.js.map

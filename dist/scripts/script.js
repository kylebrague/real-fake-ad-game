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
    imageCache;
    constructor(ctx) {
      super(["Position", "Size"]);
      this.ctx = ctx;
      this.imageCache = /* @__PURE__ */ new Map();
    }
    update(deltaTime) {
      const backgroundEntities = this.world.getEntitiesWith("Background");
      backgroundEntities.sort((a, b) => {
        const bgA = this.world.getComponent(a, "Background");
        const bgB = this.world.getComponent(b, "Background");
        return (bgA?.zIndex || 0) - (bgB?.zIndex || 0);
      });
      for (const entity of backgroundEntities) {
        this.renderBackground(entity);
      }
      const basicShapeEntities = this.world.getEntitiesWith("Position", "Size", "Render");
      const spriteEntities = this.world.getEntitiesWith("Position", "Size", "Sprite");
      for (const entity of basicShapeEntities) {
        this.renderBasicShape(entity);
      }
      for (const entity of spriteEntities) {
        this.renderSprite(entity, deltaTime);
      }
    }
    /**
     * Renders a background element
     */
    renderBackground(entity) {
      const background = this.world.getComponent(entity, "Background");
      if (!background) return;
      this.ctx.fillStyle = background.color;
      const path = new Path2D();
      switch (background.shape) {
        case "rectangle":
          path.rect(background.x, background.y, background.width, background.height);
          break;
        case "polygon":
        case "custom":
          if (background.pathCommands && background.pathCommands.length > 0) {
            this.executePathCommands(path, background.pathCommands);
          }
          break;
      }
      this.ctx.fill(path, background.fillRule);
    }
    /**
     * Execute a series of path commands on a Path2D object
     */
    executePathCommands(path, commands) {
      for (const cmd of commands) {
        switch (cmd.type) {
          case "moveTo":
            path.moveTo(cmd.x, cmd.y);
            break;
          case "lineTo":
            path.lineTo(cmd.x, cmd.y);
            break;
          case "arc":
            path.arc(
              cmd.x,
              cmd.y,
              cmd.radius,
              cmd.startAngle,
              cmd.endAngle,
              cmd.counterclockwise
            );
            break;
          case "arcTo":
            path.arcTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.radius);
            break;
          case "bezierCurveTo":
            path.bezierCurveTo(
              cmd.cp1x,
              cmd.cp1y,
              cmd.cp2x,
              cmd.cp2y,
              cmd.x,
              cmd.y
            );
            break;
          case "quadraticCurveTo":
            path.quadraticCurveTo(cmd.cpx, cmd.cpy, cmd.x, cmd.y);
            break;
          case "ellipse":
            path.ellipse(
              cmd.x,
              cmd.y,
              cmd.radiusX,
              cmd.radiusY,
              cmd.rotation,
              cmd.startAngle,
              cmd.endAngle,
              cmd.counterclockwise
            );
            break;
          case "rect":
            path.rect(cmd.x, cmd.y, cmd.width, cmd.height);
            break;
          case "closePath":
            path.closePath();
            break;
        }
      }
    }
    /**
     * Renders an entity with Position, Size, and Render components
     */
    renderBasicShape(entity) {
      const position = this.world.getComponent(entity, "Position");
      const size = this.world.getComponent(entity, "Size");
      const render = this.world.getComponent(entity, "Render");
      if (!position || !size || !render) return;
      this.ctx.fillStyle = render.color;
      this.ctx.fillRect(position.x, position.y, size.width, size.height);
    }
    /**
     * Renders an entity with Position, Size, and Sprite components
     */
    renderSprite(entity, deltaTime) {
      const position = this.world.getComponent(entity, "Position");
      const size = this.world.getComponent(entity, "Size");
      const sprite = this.world.getComponent(entity, "Sprite");
      if (!position || !size || !sprite) return;
      if (!sprite.imageElement || !sprite.imageElement.complete || sprite.imageElement.naturalWidth === 0) {
        return;
      }
      if (sprite.animationSpeed > 0 && sprite.totalFrames > 1) {
        const frameAdvance = sprite.animationSpeed * deltaTime;
        if (sprite.loop) {
          sprite.currentFrame = (sprite.currentFrame + frameAdvance) % sprite.totalFrames;
        } else {
          sprite.currentFrame = Math.min(sprite.currentFrame + frameAdvance, sprite.totalFrames - 1e-3);
        }
      }
      this.ctx.save();
      if (sprite.opacity !== 1) {
        this.ctx.globalAlpha = Math.max(0, Math.min(1, sprite.opacity));
      }
      if (position.rotation !== 0) {
        const centerX = position.x + size.width / 2;
        const centerY = position.y + size.height / 2;
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(position.rotation);
        this.ctx.translate(-centerX, -centerY);
      }
      const frameWidth = sprite.frameWidth || sprite.imageElement.width;
      const frameHeight = sprite.frameHeight || sprite.imageElement.height;
      const currentFrame = Math.floor(sprite.currentFrame);
      const columns = sprite.columns || sprite.totalFrames;
      const sourceX = currentFrame % columns * frameWidth;
      const sourceY = Math.floor(currentFrame / columns) * frameHeight;
      if (sprite.flipped) {
        this.ctx.translate(position.x + size.width, position.y);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(
          sprite.imageElement,
          sourceX,
          sourceY,
          frameWidth,
          frameHeight,
          0,
          0,
          size.width,
          size.height
        );
      } else {
        this.ctx.drawImage(
          sprite.imageElement,
          sourceX,
          sourceY,
          frameWidth,
          frameHeight,
          position.x,
          position.y,
          size.width,
          size.height
        );
      }
      this.ctx.restore();
    }
    /**
     * Preloads an image and caches it for future use
     * Useful for loading assets at startup to avoid delays during gameplay
     */
    preloadImage(imageSrc) {
      return new Promise((resolve, reject) => {
        if (this.imageCache.has(imageSrc)) {
          resolve(this.imageCache.get(imageSrc));
          return;
        }
        const image = new Image();
        image.onload = () => {
          this.imageCache.set(imageSrc, image);
          resolve(image);
        };
        image.onerror = () => reject(new Error(`Failed to load image: ${imageSrc}`));
        image.src = imageSrc;
      });
    }
    /**
     * Bulk preload multiple images
     */
    preloadImages(imageSrcs) {
      return Promise.all(imageSrcs.map((src) => this.preloadImage(src)));
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
            if (enemyHealth.currentHealth <= 0) {
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
              if (powerupHealth.currentHealth <= 0) {
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
  var SpriteComponent = class {
    // Store the initial frame for animations that need to reset
    constructor(imageSrc, frameWidth = 0, frameHeight = 0, currentFrame = 0, totalFrames = 1, animationSpeed = 0, flipped = false, opacity = 1, loop = true, columns = 0) {
      this.imageSrc = imageSrc;
      this.frameWidth = frameWidth;
      this.frameHeight = frameHeight;
      this.currentFrame = currentFrame;
      this.totalFrames = totalFrames;
      this.animationSpeed = animationSpeed;
      this.flipped = flipped;
      this.opacity = opacity;
      this.loop = loop;
      this.columns = columns;
      if (imageSrc) {
        this.imageElement = new Image();
        this.imageElement.src = imageSrc;
      }
      this.initialFrame = currentFrame;
      if (currentFrame >= totalFrames) {
        this.currentFrame = totalFrames - 1;
      }
      if (this.columns === 0) {
        this.columns = totalFrames;
      }
    }
    type = "Sprite";
    // Image source - can be a path or a loaded HTMLImageElement
    imageElement = null;
    initialFrame;
    /**
     * Reset the animation to its initial frame
     */
    resetAnimation() {
      this.currentFrame = this.initialFrame;
    }
  };
  var HealthComponent = class {
    constructor(currentHealth, maxHealth = currentHealth) {
      this.currentHealth = currentHealth;
      this.maxHealth = maxHealth;
    }
    type = "Health";
  };
  var CollisionComponent = class {
    constructor(collidable = true, damage = 0, collisionGroup = "default") {
      this.collidable = collidable;
      this.damage = damage;
      this.collisionGroup = collisionGroup;
    }
    type = "Collision";
  };
  var BackgroundComponent = class {
    /**
     * Create a new background component
     * 
     * @param shape - The shape type ('rectangle', 'polygon', or 'custom')
     * @param x - X coordinate of background element (or starting point for paths)
     * @param y - Y coordinate of background element (or starting point for paths)
     * @param width - Width of background element (used for rectangle)
     * @param height - Height of background element (used for rectangle)
     * @param color - Color of background element (CSS color string)
     * @param zIndex - Z-index for layering (lower values are drawn first)
     * @param pathCommands - Array of path commands for polygon or custom paths
     * @param fillRule - The fill rule to use ('nonzero' or 'evenodd')
     */
    constructor(shape = "rectangle", x = 0, y = 0, width = 0, height = 0, color = "blue", zIndex = 0, pathCommands = [], fillRule = "nonzero") {
      this.shape = shape;
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.color = color;
      this.zIndex = zIndex;
      this.pathCommands = pathCommands;
      this.fillRule = fillRule;
    }
    type = "Background";
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
      const existingModifier = this.world.getComponent(
        entity,
        "CooldownModifier"
      );
      if (existingModifier) {
        if (multiplier < existingModifier.bulletCooldownMultiplier) {
          this.world.removeComponent(entity, "CooldownModifier");
        } else {
          return;
        }
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
        case "superRapidFire":
          this.applyRapidFirePowerup(playerEntity, 15, 0.25);
          break;
        case "rapidFire":
          this.applyRapidFirePowerup(playerEntity, 15, 0.5);
          break;
        case "normalizedFire":
          if (this.world.getComponent(playerEntity, "CooldownModifier")) {
            this.world.removeComponent(playerEntity, "CooldownModifier");
          }
          break;
        default:
          console.warn(`Unhandled powerup type: ${powerup.powerupType}`);
          break;
      }
    }
  };

  // src/lib/ecs/utils/BackgroundFactory.ts
  var BackgroundFactory = {
    /**
     * Create a rectangle background component
     */
    createRectangle(x, y, width, height, color = "blue", zIndex = 0) {
      return new BackgroundComponent("rectangle", x, y, width, height, color, zIndex);
    },
    /**
     * Create a polygon background component from a set of points
     */
    createPolygon(points, color = "blue", zIndex = 0) {
      const pathCommands = [];
      if (points.length > 0) {
        pathCommands.push({ type: "moveTo", x: points[0][0], y: points[0][1] });
        for (let i = 1; i < points.length; i++) {
          pathCommands.push({ type: "lineTo", x: points[i][0], y: points[i][1] });
        }
        pathCommands.push({ type: "closePath" });
      }
      return new BackgroundComponent(
        "polygon",
        points[0]?.[0] || 0,
        points[0]?.[1] || 0,
        0,
        0,
        color,
        zIndex,
        pathCommands
      );
    },
    /**
     * Create a custom path background component from a series of path commands
     */
    createCustomPath(pathCommands, color = "blue", zIndex = 0, fillRule = "nonzero") {
      return new BackgroundComponent("custom", 0, 0, 0, 0, color, zIndex, pathCommands, fillRule);
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
      this.createBackgroundElements();
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
      canvasHeight: 900,
      leftSideX: 250,
      rightSideX: 550,
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
      this.world.addComponent(player, new PlayerComponent());
      this.world.addComponent(player, new HealthComponent(100));
      this.world.addComponent(player, new CollisionComponent(true, 0, "player"));
      this.world.addComponent(
        player,
        new SpriteComponent("assets/army-man-sprite.png", 32, 32, 9, 16, 0, false, 1, false, 4)
      );
      this.setupInputHandlers();
      this.gameInitialized = true;
    }
    /**
     * Create background elements using the ECS system
     */
    createBackgroundElements() {
      const mainLines = {
        leftBorder: 0,
        // (w / 8) * 0
        leftSpawnLane: this.config.leftSideX,
        // (w / 8) * 2
        midline: this.config.canvasWidth / 2,
        // (w / 8) * 4
        rightSpawnLane: this.config.rightSideX,
        // (w / 8) * 6
        rightBorder: this.config.canvasWidth
        // (w / 8) * 8
      };
      const dividerRectWidth = 20;
      const vanishingPoint = [this.config.canvasWidth / 2, -9999];
      const leftDividerCenterLineX = mainLines.midline - (mainLines.midline - mainLines.leftSpawnLane) * 2;
      const rightDividerCenterLineX = mainLines.midline + (mainLines.rightSpawnLane - mainLines.midline) * 2;
      const backgroundWater = this.world.createEntity();
      this.world.addComponent(
        backgroundWater,
        BackgroundFactory.createRectangle(
          0,
          0,
          mainLines.rightBorder,
          this.config.canvasHeight,
          "#42c8f5",
          -1
        )
      );
      const leftLane = this.world.createEntity();
      this.world.addComponent(
        leftLane,
        BackgroundFactory.createPolygon(
          [
            vanishingPoint,
            [leftDividerCenterLineX, this.config.canvasHeight],
            [rightDividerCenterLineX, this.config.canvasHeight]
          ],
          "#8b9699",
          0
        )
      );
      const leftBarrier = this.world.createEntity();
      this.world.addComponent(
        leftBarrier,
        BackgroundFactory.createPolygon(
          [
            [mainLines.rightBorder / 8 * 1 - dividerRectWidth / 2, 0],
            [mainLines.rightBorder / 8 * 1 - dividerRectWidth / 2 - 10, this.config.canvasHeight],
            [mainLines.rightBorder / 8 * 1 + dividerRectWidth / 2 - 10, this.config.canvasHeight],
            [mainLines.rightBorder / 8 * 1 + dividerRectWidth / 2, 0]
          ],
          "#c5d5d9",
          1
        )
      );
      const middleDivider = this.world.createEntity();
      const midX = this.config.canvasWidth / 2;
      const midY = this.config.canvasHeight - 250;
      this.world.addComponent(
        middleDivider,
        BackgroundFactory.createCustomPath(
          [
            { type: "moveTo", x: midX - dividerRectWidth / 2, y: 0 },
            { type: "lineTo", x: midX - dividerRectWidth / 2, y: midY - 50 },
            {
              type: "quadraticCurveTo",
              cpx: midX - dividerRectWidth / 2,
              cpy: midY,
              x: midX,
              y: midY
            },
            {
              type: "quadraticCurveTo",
              cpx: midX + dividerRectWidth / 2,
              cpy: midY,
              x: midX + dividerRectWidth / 2,
              y: midY - 50
            },
            { type: "lineTo", x: midX + dividerRectWidth / 2, y: 0 },
            { type: "closePath" }
          ],
          "#c5d5d9",
          1
        )
      );
      const rightBarrierPrism0 = this.world.createEntity();
      this.world.addComponent(
        rightBarrierPrism0,
        BackgroundFactory.createPolygon(
          // top
          [
            vanishingPoint,
            [rightDividerCenterLineX - 10, this.config.canvasHeight],
            [rightDividerCenterLineX + 10, this.config.canvasHeight]
          ],
          "#FFF4C1FF",
          1
        )
      );
      const rightBarrierPrism1 = this.world.createEntity();
      this.world.addComponent(
        rightBarrierPrism1,
        BackgroundFactory.createPolygon(
          [
            vanishingPoint,
            // center point
            [rightDividerCenterLineX - 10, this.config.canvasHeight],
            [rightDividerCenterLineX - 20, this.config.canvasHeight]
          ],
          "#94CB99FF",
          1
        )
      );
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
            const gameState = this.world.getComponent(gsEntities[0], "GameState");
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
    /**
     * Preload game assets
     * This method can be called before starting the game to ensure all images are ready
     */
    async preloadAssets(imagePaths) {
      if (imagePaths.length > 0) {
        await this.renderSystem.preloadImages(imagePaths);
      }
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
//# sourceMappingURL=script.js.map

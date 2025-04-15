// Parent class for all game entities
export type EntityPosition = {
  x: number;
  y: number;
};

export type EntityDimension = {
  width: number;
  height: number;
};

export type EntityProperties = {
  health?: number;
  speed?: number;
  damage?: number;
  lane?: string;
  [key: string]: unknown; // Allow for custom properties
};

export class Entity {
  // Core position and dimension properties
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Optional game-specific properties
  health?: number;
  speed?: number;
  damage?: number;
  lane?: string;
  hit = false;
  
  // Custom properties storage
  properties: Record<string, unknown> = {};

  constructor(
    positionOrX: EntityPosition | number,
    dimensionOrY: EntityDimension | number, 
    widthOrProps?: number | EntityDimension | EntityProperties,
    heightOrProps?: number | EntityProperties,
    props?: EntityProperties
  ) {
    // Handle position parameter (could be an object or x coordinate)
    if (typeof positionOrX === 'object') {
      this.x = positionOrX.x;
      this.y = positionOrX.y;
      
      // Handle dimension parameter (could be an object or width value)
      if (typeof dimensionOrY === 'object') {
        this.width = dimensionOrY.width;
        this.height = dimensionOrY.height;
        // widthOrProps is actually EntityProperties here
        this.initProperties(widthOrProps as EntityProperties);
      } else {
        this.width = dimensionOrY;
        this.height = widthOrProps as number;
        // heightOrProps is actually EntityProperties here
        this.initProperties(heightOrProps as EntityProperties);
      }
    } else {
      // positionOrX is the x coordinate
      this.x = positionOrX;
      this.y = dimensionOrY as number;
      
      if (typeof widthOrProps === 'object' && 'width' in widthOrProps) {
        // widthOrProps is actually EntityDimension
        const dimObj = widthOrProps as EntityDimension;
        this.width = dimObj.width;
        this.height = dimObj.height;
        // heightOrProps is actually EntityProperties here
        this.initProperties(heightOrProps as EntityProperties);
      } else {
        // widthOrProps is the width value
        this.width = widthOrProps as number || 0;
        this.height = heightOrProps as number || 0;
        // props is the EntityProperties
        this.initProperties(props);
      }
    }
  }

  private initProperties(props?: EntityProperties): void {
    if (!props) return;
    
    // Set optional properties
    this.health = props.health;
    this.speed = props.speed;
    this.damage = props.damage;
    this.lane = props.lane;
    
    // Store any additional custom properties
    const excludedKeys = ['health', 'speed', 'damage', 'lane'];
    for (const key of Object.keys(props)) {
      if (!excludedKeys.includes(key)) {
        this.properties[key] = props[key];
      }
    }
  }

  // Get/set custom properties
  getProperty<T>(key: string, defaultValue?: T): T {
    return (key in this.properties) ? this.properties[key] as T : defaultValue;
  }

  setProperty(key: string, value: unknown): void {
    this.properties[key] = value;
  }

  // Movement methods
  updatePosition(deltaTime: number): void {
    if (this.speed) {
      this.y += this.speed * deltaTime;
    }
  }

  moveTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  // Collision detection
  checkCollision(other: Entity): boolean {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }

  // Boundary checking
  isOffScreen(canvasHeight: number, canvasWidth?: number): boolean {
    if (canvasWidth !== undefined) {
      return this.y > canvasHeight || this.y + this.height < 0 || 
             this.x > canvasWidth || this.x + this.width < 0;
    }
    return this.y > canvasHeight || this.y + this.height < 0;
  }

  // Status methods
  isHit(): boolean {
    return this.health !== undefined && this.health <= 0;
  }

  applyDamage(amount: number): void {
    if (this.health !== undefined) {
      this.health -= amount;
    }
  }

  resetHit(): void {
    this.hit = false;
  }

  reset(defaultHealth = 100): void {
    this.health = defaultHealth;
    this.hit = false;
  }

  // Rendering
  render(ctx: CanvasRenderingContext2D, color = "red"): void {
    ctx.fillStyle = color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}
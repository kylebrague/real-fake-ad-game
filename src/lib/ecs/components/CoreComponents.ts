import type { Component } from '../Component';

/**
 * Position component
 * Contains the x and y coordinates of an entity
 */
export class PositionComponent implements Component {
  readonly type = 'Position';
  
  constructor(
    public x: number,
    public y: number,
    public rotation = 0
  ) {}
}

/**
 * Size component
 * Contains the width and height of an entity
 */
export class SizeComponent implements Component {
  readonly type = 'Size';
  
  constructor(
    public width: number,
    public height: number
  ) {}
}

/**
 * Velocity component
 * Contains the speed and direction of an entity
 */
export class VelocityComponent implements Component {
  readonly type = 'Velocity';
  
  constructor(
    public speedX = 0,
    public speedY = 0
  ) {}
}

/**
 * Render component
 * Contains the visual representation data of an entity
 */
export class RenderComponent implements Component {
  readonly type = 'Render';
  
  constructor(
    public color = 'white',
    public shape: 'rectangle' | 'circle' = 'rectangle'
  ) {}
}

/**
 * Sprite component 
 * Contains information needed to render an image sprite
 */
export class SpriteComponent implements Component {
  readonly type = 'Sprite';
  
  // Image source - can be a path or a loaded HTMLImageElement
  public imageElement: HTMLImageElement | null = null;
  private initialFrame: number; // Store the initial frame for animations that need to reset

  constructor(
    public imageSrc: string,
    public frameWidth = 0, // If 0, use the entire image
    public frameHeight = 0, // If 0, use the entire image
    public currentFrame = 0, // Which frame to start on (0-indexed)
    public totalFrames = 1, // Total number of frames in the sprite sheet
    public animationSpeed = 0, // Frames per second, 0 means static image
    public flipped = false, // Whether to flip the sprite horizontally
    public opacity = 1, // Transparency (0-1)
    public loop = true, // Whether animation should loop
    public columns = 0 // Number of columns in the sprite sheet (0 = single row)
  ) {
    // Create and load the image if a source path is provided
    if (imageSrc) {
      this.imageElement = new Image();
      this.imageElement.src = imageSrc;
    }
    
    // Store the initial frame so we can reset the animation
    this.initialFrame = currentFrame;
    
    // Ensure currentFrame is within valid range
    if (currentFrame >= totalFrames) {
      this.currentFrame = totalFrames - 1;
    }

    // If columns is not specified, default to totalFrames (single row)
    if (this.columns === 0) {
      this.columns = totalFrames;
    }
  }
  
  /**
   * Reset the animation to its initial frame
   */
  resetAnimation(): void {
    this.currentFrame = this.initialFrame;
  }
}

/**
 * Health component
 * Contains the health status of an entity
 */
export class HealthComponent implements Component {
  readonly type = 'Health';
  
  constructor(
    public currentHealth: number,
    public maxHealth: number = currentHealth
  ) {}
}

/**
 * Collision component
 * Marks an entity as able to collide
 */
export class CollisionComponent implements Component {
  readonly type = 'Collision';
  
  constructor(
    public collidable = true,
    public damage = 0,
    public collisionGroup = 'default'
  ) {}
}

/**
 * Background drawing component for rendering static background elements
 * 
 * This component allows entities to be rendered as part of the game background
 * with support for rectangles, polygons, and custom paths.
 */
export class BackgroundComponent implements Component {
  readonly type = "Background" as const;
  
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
  constructor(
    public shape: 'rectangle' | 'polygon' | 'custom' = 'rectangle',
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 0,
    public color = "blue",
    public zIndex = 0,
    public pathCommands: PathCommand[] = [],
    public fillRule: 'nonzero' | 'evenodd' = 'nonzero'
  ) {}
}

/**
 * Types of path commands for Path2D operations
 */
export type PathCommand = 
  | { type: 'moveTo', x: number, y: number }
  | { type: 'lineTo', x: number, y: number }
  | { type: 'arc', x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean }
  | { type: 'arcTo', x1: number, y1: number, x2: number, y2: number, radius: number }
  | { type: 'bezierCurveTo', cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number }
  | { type: 'quadraticCurveTo', cpx: number, cpy: number, x: number, y: number }
  | { type: 'ellipse', x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean }
  | { type: 'rect', x: number, y: number, width: number, height: number }
  | { type: 'closePath' };
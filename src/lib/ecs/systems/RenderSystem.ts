import { System } from "../System";
import type {
  PositionComponent,
  SizeComponent,
  RenderComponent,
  SpriteComponent,
  BackgroundComponent,
  PathCommand
} from "../components/CoreComponents";
import type { Entity } from "../Entity";
import { BackgroundPerspectiveHelper } from "../utils/BackgroundPerspectiveHelper";

/**
 * Configuration for perspective settings
 */
export interface PerspectiveConfig {
  enabled: boolean;
  vanishingPointY: number;  // Y position of the vanishing point
  depthFactor: number;      // How strong the perspective effect is (0-1)
  horizonY: number;         // Y position of the horizon line
  minScale: number;         // Minimum scale for distant objects
}

/**
 * RenderSystem handles drawing entities to the canvas
 * Supports both basic shape rendering and sprite-based rendering
 */
export class RenderSystem extends System {
  private ctx: CanvasRenderingContext2D;
  private imageCache: Map<string, HTMLImageElement>;
  private perspective: PerspectiveConfig;

  constructor(ctx: CanvasRenderingContext2D) {
    // This system operates on entities with Position and Size components
    // plus either Render or Sprite components
    super(["Position", "Size"]);
    this.ctx = ctx;
    this.imageCache = new Map();
    
    // Default perspective settings
    this.perspective = {
      enabled: true,
      vanishingPointY: -999,           // Top of screen by default
      depthFactor: 0.5,             // Moderate perspective effect
      horizonY: ctx.canvas.height * -0.5, // Middle of screen
      minScale: 0.01                 // Objects will scale down to 50% at most
    };
  }

  /**
   * Configure the perspective settings
   */
  configurePerspective(config: Partial<PerspectiveConfig>): void {
    this.perspective = { ...this.perspective, ...config };
  }

  /**
   * Apply perspective transformation to position and size based on Y position
   */
  private applyPerspective(position: PositionComponent, size: SizeComponent): { 
    x: number, 
    y: number, 
    width: number, 
    height: number 
  } {
    // If perspective is disabled, return original values
    if (!this.perspective.enabled) {
      return {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height
      };
    }

    // Calculate how "deep" into the scene this entity is based on Y position
    // normalized between 0 (at horizon) and 1 (at bottom of screen)
    const distanceFromHorizon = Math.max(0, position.y - this.perspective.horizonY);
    const maxDistance = this.ctx.canvas.height - this.perspective.horizonY;
    const depthRatio = maxDistance > 0 ? distanceFromHorizon / maxDistance : 0;
    
    // Calculate scale based on depth (closer to horizon = smaller)
    // Objects at the horizon will be at minScale, objects at the bottom will be at 1.0
    const scale = this.perspective.minScale + 
      (1 - this.perspective.minScale) * depthRatio;
    
    // Calculate the width and height with perspective scaling
    const perspectiveWidth = size.width * scale;
    const perspectiveHeight = size.height * scale;
    
    // Calculate horizontal position shift towards vanishing point
    // The further an object is from the horizon, the less it's affected
    const canvasMidX = this.ctx.canvas.width / 2;
    const distanceFromCenter = position.x + (size.width / 2) - canvasMidX;
    const horizontalShift = distanceFromCenter * (1 - scale) * this.perspective.depthFactor;
    
    // Return the transformed position and size
    return {
      x: position.x - (size.width - perspectiveWidth) / 2 - horizontalShift,
      y: position.y,
      width: perspectiveWidth,
      height: perspectiveHeight
    };
  }

  update(deltaTime: number): void {
    // First process all background entities to ensure they have Position and Size components
    const backgroundEntities = this.world.getEntitiesWith("Background");
    for (const entity of backgroundEntities) {
      const background = this.world.getComponent<BackgroundComponent>(entity, "Background");
      if (background) {
        // Ensure all background entities have Position and Size components for perspective
        BackgroundPerspectiveHelper.ensurePositionAndSizeForBackground(this.world, entity, background);
      }
    }

    // Sort by z-index to control layering
    backgroundEntities.sort((a, b) => {
      const bgA = this.world.getComponent<BackgroundComponent>(a, "Background");
      const bgB = this.world.getComponent<BackgroundComponent>(b, "Background");
      return (bgA?.zIndex || 0) - (bgB?.zIndex || 0);
    });
    
    // Render all background elements
    for (const entity of backgroundEntities) {
      this.renderBackground(entity);
    }

    // Get all renderable entities (either basic shapes or sprites)
    const basicShapeEntities = this.world.getEntitiesWith("Position", "Size", "Render");
    const spriteEntities = this.world.getEntitiesWith("Position", "Size", "Sprite");

    // Then render all basic shapes
    for (const entity of basicShapeEntities) {
      this.renderBasicShape(entity);
    }

    // Finally render all sprites (typically sprites should appear on top of basic shapes)
    for (const entity of spriteEntities) {
      this.renderSprite(entity, deltaTime);
    }
  }

  /**
   * Renders a background element
   */
  private renderBackground(entity: Entity): void {
    const background = this.world.getComponent<BackgroundComponent>(entity, "Background");
    
    if (!background) return;
    
    this.ctx.fillStyle = background.color;
    
    const position = this.world.getComponent<PositionComponent>(entity, "Position");
    const size = this.world.getComponent<SizeComponent>(entity, "Size");
    
    // We handle the rendering differently based on the shape type
    switch (background.shape) {
      case 'rectangle':
        if (position && size && this.perspective.enabled) {
          // Apply perspective transformation
          const { x, y, width, height } = this.applyPerspective(position, size);
          
          // Draw with perspective applied
          this.ctx.fillRect(x, y, width, height);
        } else {
          // Fallback to original rendering without perspective
          this.ctx.fillRect(background.x, background.y, background.width, background.height);
        }
        break;
        
      case 'polygon':
      case 'custom':
        if (background.pathCommands && background.pathCommands.length > 0) {
          // Create a new path
          const path = new Path2D();
          
          if (this.perspective.enabled) {
            // Transform path commands with perspective
            const transformedCommands = BackgroundPerspectiveHelper.transformPathCommands(
              background.pathCommands,
              this.ctx.canvas.width,
              this.perspective
            );
            
            // Execute the transformed path commands
            this.executePathCommands(path, transformedCommands);
          } else {
            // Execute the original path commands
            this.executePathCommands(path, background.pathCommands);
          }
          
          // Fill the path
          this.ctx.fill(path, background.fillRule);
        }
        break;
    }
  }
  
  /**
   * Execute a series of path commands on a Path2D object
   */
  private executePathCommands(path: Path2D, commands: PathCommand[]): void {
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'moveTo':
          path.moveTo(cmd.x, cmd.y);
          break;
          
        case 'lineTo':
          path.lineTo(cmd.x, cmd.y);
          break;
          
        case 'arc':
          path.arc(
            cmd.x, 
            cmd.y, 
            cmd.radius, 
            cmd.startAngle, 
            cmd.endAngle, 
            cmd.counterclockwise
          );
          break;
          
        case 'arcTo':
          path.arcTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.radius);
          break;
          
        case 'bezierCurveTo':
          path.bezierCurveTo(
            cmd.cp1x, 
            cmd.cp1y, 
            cmd.cp2x, 
            cmd.cp2y, 
            cmd.x, 
            cmd.y
          );
          break;
          
        case 'quadraticCurveTo':
          path.quadraticCurveTo(cmd.cpx, cmd.cpy, cmd.x, cmd.y);
          break;
          
        case 'ellipse':
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
          
        case 'rect':
          path.rect(cmd.x, cmd.y, cmd.width, cmd.height);
          break;
          
        case 'closePath':
          path.closePath();
          break;
      }
    }
  }

  /**
   * Renders an entity with Position, Size, and Render components
   */
  private renderBasicShape(entity: Entity): void {
    const position = this.world.getComponent<PositionComponent>(entity, "Position");
    const size = this.world.getComponent<SizeComponent>(entity, "Size");
    const render = this.world.getComponent<RenderComponent>(entity, "Render");

    if (!position || !size || !render) return;

    // Apply perspective transformation
    const { x, y, width, height } = this.applyPerspective(position, size);

    this.ctx.fillStyle = render.color;
    
    if (render.shape === 'rectangle') {
      this.ctx.fillRect(x, y, width, height);
    } else if (render.shape === 'circle') {
      // For circles, draw an ellipse with the perspective applied
      const radiusX = width / 2;
      const radiusY = height / 2;
      const centerX = x + radiusX;
      const centerY = y + radiusY;
      
      this.ctx.beginPath();
      this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Renders an entity with Position, Size, and Sprite components
   */
  private renderSprite(entity: Entity, deltaTime: number): void {
    const position = this.world.getComponent<PositionComponent>(entity, 'Position');
    const size = this.world.getComponent<SizeComponent>(entity, 'Size');
    const sprite = this.world.getComponent<SpriteComponent>(entity, 'Sprite');
    
    if (!position || !size || !sprite) return;
    
    // Skip rendering if the image is not loaded or has an error
    if (!sprite.imageElement || !sprite.imageElement.complete || sprite.imageElement.naturalWidth === 0) {
      return;
    }
    
    // Update animation frame if needed
    if (sprite.animationSpeed > 0 && sprite.totalFrames > 1) {
      // Calculate how many frames to advance based on animationSpeed and deltaTime
      const frameAdvance = sprite.animationSpeed * deltaTime;
      
      // Update current frame, handling looping vs non-looping animations
      if (sprite.loop) {
        // For looping animations, wrap around to the beginning when reaching the end
        sprite.currentFrame = (sprite.currentFrame + frameAdvance) % sprite.totalFrames;
      } else {
        // For non-looping animations, stop at the last frame
        sprite.currentFrame = Math.min(sprite.currentFrame + frameAdvance, sprite.totalFrames - 0.001);
      }
    }
    
    // Apply perspective transformation
    const { x, y, width, height } = this.applyPerspective(position, size);
    
    // Save the current context state
    this.ctx.save();
    
    // Apply opacity
    if (sprite.opacity !== 1) {
      this.ctx.globalAlpha = Math.max(0, Math.min(1, sprite.opacity));
    }
    
    // Handle rotation by translating to the center of the entity, rotating, then drawing
    if (position.rotation !== 0) {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      
      // Move to center, rotate, move back
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(position.rotation);
      this.ctx.translate(-centerX, -centerY);
    }
    
    // Calculate source rectangle (for sprite sheet frames)
    const frameWidth = sprite.frameWidth || sprite.imageElement.width;
    const frameHeight = sprite.frameHeight || sprite.imageElement.height;
    const currentFrame = Math.floor(sprite.currentFrame); // Get integer frame number
    
    // Calculate frame position in the sprite sheet using columns for 2D positioning
    const columns = sprite.columns || sprite.totalFrames; // Fallback for backward compatibility
    const sourceX = (currentFrame % columns) * frameWidth;
    const sourceY = Math.floor(currentFrame / columns) * frameHeight;
    
    // Handle horizontal flipping
    if (sprite.flipped) {
      this.ctx.translate(x + width, y);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(
        sprite.imageElement,
        sourceX, sourceY, frameWidth, frameHeight,
        0, 0, width, height
      );
    } else {
      // Normal drawing (no flip)
      this.ctx.drawImage(
        sprite.imageElement,
        sourceX, sourceY, frameWidth, frameHeight,
        x, y, width, height
      );
    }
    
    // Restore the context to its original state
    this.ctx.restore();
  }

  /**
   * Preloads an image and caches it for future use
   * Useful for loading assets at startup to avoid delays during gameplay
   */
  preloadImage(imageSrc: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      // Check cache first
      if (this.imageCache.has(imageSrc)) {
        resolve(this.imageCache.get(imageSrc)!);
        return;
      }

      // Create and load new image
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
  preloadImages(imageSrcs: string[]): Promise<HTMLImageElement[]> {
    return Promise.all(imageSrcs.map((src) => this.preloadImage(src)));
  }
}

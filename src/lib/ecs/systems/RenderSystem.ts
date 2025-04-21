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

/**
 * RenderSystem handles drawing entities to the canvas
 * Supports both basic shape rendering and sprite-based rendering
 */
export class RenderSystem extends System {
  private ctx: CanvasRenderingContext2D;
  private imageCache: Map<string, HTMLImageElement>;

  constructor(ctx: CanvasRenderingContext2D) {
    // This system operates on entities with Position and Size components
    // plus either Render or Sprite components
    super(["Position", "Size"]);
    this.ctx = ctx;
    this.imageCache = new Map();
  }

  update(deltaTime: number): void {
    // First render all background elements
    const backgroundEntities = this.world.getEntitiesWith("Background");
    // Sort by z-index to control layering
    backgroundEntities.sort((a, b) => {
      const bgA = this.world.getComponent<BackgroundComponent>(a, "Background");
      const bgB = this.world.getComponent<BackgroundComponent>(b, "Background");
      return (bgA?.zIndex || 0) - (bgB?.zIndex || 0);
    });
    
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
    const path = new Path2D();
    
    switch (background.shape) {
      case 'rectangle':
        path.rect(background.x, background.y, background.width, background.height);
        break;
        
      case 'polygon':
      case 'custom':
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

    this.ctx.fillStyle = render.color;
    this.ctx.fillRect(position.x, position.y, size.width, size.height);
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
    
    // Save the current context state
    this.ctx.save();
    
    // Apply opacity
    if (sprite.opacity !== 1) {
      this.ctx.globalAlpha = Math.max(0, Math.min(1, sprite.opacity));
    }
    
    // Handle rotation by translating to the center of the entity, rotating, then drawing
    if (position.rotation !== 0) {
      const centerX = position.x + size.width / 2;
      const centerY = position.y + size.height / 2;
      
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
      this.ctx.translate(position.x + size.width, position.y);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(
        sprite.imageElement,
        sourceX, sourceY, frameWidth, frameHeight,
        0, 0, size.width, size.height
      );
    } else {
      // Normal drawing (no flip)
      this.ctx.drawImage(
        sprite.imageElement,
        sourceX, sourceY, frameWidth, frameHeight,
        position.x, position.y, size.width, size.height
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

import { type BackgroundComponent, type PathCommand, PositionComponent, SizeComponent } from "../components/CoreComponents";
import type { PerspectiveConfig } from "../systems/RenderSystem";
import type { World } from "../World";
import type { Entity } from "../Entity";

/**
 * Helper class for applying perspective transformations to background shapes
 */
export const BackgroundPerspectiveHelper  = {
  /**
   * Apply perspective transformation to a point based on Y position
   */
  transformPoint(
    x: number, 
    y: number, 
    canvasWidth: number, 
    perspective: PerspectiveConfig
  ): { x: number; y: number } {
    if (!perspective.enabled) {
      return { x, y };
    }

    // Calculate how "deep" into the scene this point is based on Y position
    const distanceFromHorizon = Math.max(0, y - perspective.horizonY);
    const maxDistance = canvasWidth - perspective.horizonY;
    const depthRatio = maxDistance > 0 ? distanceFromHorizon / maxDistance : 0;
    
    // Calculate scale based on depth
    const scale = perspective.minScale + 
      (1 - perspective.minScale) * depthRatio;
    
    // Calculate horizontal position shift towards vanishing point
    const canvasMidX = canvasWidth / 2;
    const distanceFromCenter = x - canvasMidX;
    const horizontalShift = distanceFromCenter * (1 - scale) * perspective.depthFactor;
    
    // Return the transformed position
    return {
      x: x - horizontalShift,
      y: y
    };
  },

  /**
   * Transform path commands based on perspective settings
   */
  transformPathCommands(
    commands: PathCommand[],
    canvasWidth: number,
    perspective: PerspectiveConfig
  ): PathCommand[] {
    if (!perspective.enabled) {
      return commands;
    }

    return commands.map(cmd => {
      switch (cmd.type) {
        case 'moveTo':
        case 'lineTo': {
          const transformed = this.transformPoint(cmd.x, cmd.y, canvasWidth, perspective);
          return { ...cmd, x: transformed.x, y: transformed.y };
        }
        
        case 'arc': {
          const transformed = this.transformPoint(cmd.x, cmd.y, canvasWidth, perspective);
          // Scale the radius based on y position
          const distanceFromHorizon = Math.max(0, cmd.y - perspective.horizonY);
          const maxDistance = canvasWidth - perspective.horizonY;
          const depthRatio = maxDistance > 0 ? distanceFromHorizon / maxDistance : 0;
          const scaleRadius = perspective.minScale + 
            (1 - perspective.minScale) * depthRatio;
          
          return { 
            ...cmd, 
            x: transformed.x, 
            y: transformed.y,
            radius: cmd.radius * scaleRadius
          };
        }
        
        case 'arcTo': {
          const transformed1 = this.transformPoint(cmd.x1, cmd.y1, canvasWidth, perspective);
          const transformed2 = this.transformPoint(cmd.x2, cmd.y2, canvasWidth, perspective);
          
          // Scale the radius based on average y position
          const avgY = (cmd.y1 + cmd.y2) / 2;
          const distanceFromHorizon = Math.max(0, avgY - perspective.horizonY);
          const maxDistance = canvasWidth - perspective.horizonY;
          const depthRatio = maxDistance > 0 ? distanceFromHorizon / maxDistance : 0;
          const scaleRadius = perspective.minScale + 
            (1 - perspective.minScale) * depthRatio;
          
          return { 
            ...cmd, 
            x1: transformed1.x, 
            y1: transformed1.y,
            x2: transformed2.x, 
            y2: transformed2.y,
            radius: cmd.radius * scaleRadius
          };
        }
        
        case 'bezierCurveTo': {
          const transformedCP1 = this.transformPoint(cmd.cp1x, cmd.cp1y, canvasWidth, perspective);
          const transformedCP2 = this.transformPoint(cmd.cp2x, cmd.cp2y, canvasWidth, perspective);
          const transformedEnd = this.transformPoint(cmd.x, cmd.y, canvasWidth, perspective);
          
          return { 
            ...cmd, 
            cp1x: transformedCP1.x, 
            cp1y: transformedCP1.y,
            cp2x: transformedCP2.x, 
            cp2y: transformedCP2.y,
            x: transformedEnd.x, 
            y: transformedEnd.y
          };
        }
        
        case 'quadraticCurveTo': {
          const transformedCP = this.transformPoint(cmd.cpx, cmd.cpy, canvasWidth, perspective);
          const transformedEnd = this.transformPoint(cmd.x, cmd.y, canvasWidth, perspective);
          
          return { 
            ...cmd, 
            cpx: transformedCP.x, 
            cpy: transformedCP.y,
            x: transformedEnd.x, 
            y: transformedEnd.y
          };
        }
        
        case 'ellipse': {
          const transformed = this.transformPoint(cmd.x, cmd.y, canvasWidth, perspective);
          
          // Scale the radii based on y position
          const distanceFromHorizon = Math.max(0, cmd.y - perspective.horizonY);
          const maxDistance = canvasWidth - perspective.horizonY;
          const depthRatio = maxDistance > 0 ? distanceFromHorizon / maxDistance : 0;
          const scaleRadius = perspective.minScale + 
            (1 - perspective.minScale) * depthRatio;
          
          return { 
            ...cmd, 
            x: transformed.x, 
            y: transformed.y,
            radiusX: cmd.radiusX * scaleRadius,
            radiusY: cmd.radiusY * scaleRadius
          };
        }
        
        case 'rect': {
          const transformed = this.transformPoint(cmd.x, cmd.y, canvasWidth, perspective);
          
          // Scale the dimensions based on y position
          const distanceFromHorizon = Math.max(0, cmd.y - perspective.horizonY);
          const maxDistance = canvasWidth - perspective.horizonY;
          const depthRatio = maxDistance > 0 ? distanceFromHorizon / maxDistance : 0;
          const scale = perspective.minScale + 
            (1 - perspective.minScale) * depthRatio;
          
          return { 
            ...cmd, 
            x: transformed.x, 
            y: transformed.y,
            width: cmd.width * scale,
            height: cmd.height * scale
          };
        }
        
        // closePath doesn't have coordinates to transform
        // case 'closePath':
        default:
          return cmd;
      }
    });
  },
  
  /**
   * Prepare background entities for perspective rendering by ensuring they have Position and Size components
   */
  ensurePositionAndSizeForBackground(world: World, entity: Entity, background: BackgroundComponent): void {
    // Check if entity already has Position and Size components
    const position = world.getComponent<PositionComponent>(entity, "Position");
    const size = world.getComponent<SizeComponent>(entity, "Size");
    
    // If the entity doesn't have the required components, add them
    if (!position || !size) {
      // For rectangles, we can directly use the values from the background
      if (background.shape === "rectangle") {
        if (!position) {
          world.addComponent(entity, new PositionComponent(background.x, background.y));
        }
        if (!size) {
          world.addComponent(entity, new SizeComponent(background.width, background.height));
        }
      } 
      // For polygons and custom paths, we need to calculate bounds from the path commands
      else if (background.pathCommands.length > 0) {
        const bounds = this.calculateBoundsFromCommands(background.pathCommands);
        
        if (!position) {
          world.addComponent(entity, new PositionComponent(bounds.minX, bounds.minY));
        }
        if (!size) {
          world.addComponent(entity, new SizeComponent(
            bounds.maxX - bounds.minX,
            bounds.maxY - bounds.minY
          ));
        }
      }
    }
  },
  
  /**
   * Calculate the bounding box of a set of path commands
   */
  calculateBoundsFromCommands(commands: PathCommand[]): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    if (commands.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    
    // Track current position for relative commands
    let currentX = 0;
    let currentY = 0;
    
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'moveTo':
        case 'lineTo':
          minX = Math.min(minX, cmd.x);
          minY = Math.min(minY, cmd.y);
          maxX = Math.max(maxX, cmd.x);
          maxY = Math.max(maxY, cmd.y);
          currentX = cmd.x;
          currentY = cmd.y;
          break;
          
        case 'arc':
          // For arcs, consider the entire circle bounds
          minX = Math.min(minX, cmd.x - cmd.radius);
          minY = Math.min(minY, cmd.y - cmd.radius);
          maxX = Math.max(maxX, cmd.x + cmd.radius);
          maxY = Math.max(maxY, cmd.y + cmd.radius);
          break;
          
        case 'arcTo':
          // For arcTo, we consider the control points
          minX = Math.min(minX, cmd.x1, cmd.x2);
          minY = Math.min(minY, cmd.y1, cmd.y2);
          maxX = Math.max(maxX, cmd.x1, cmd.x2);
          maxY = Math.max(maxY, cmd.y1, cmd.y2);
          currentX = cmd.x2;
          currentY = cmd.y2;
          break;
          
        case 'bezierCurveTo':
          minX = Math.min(minX, cmd.cp1x, cmd.cp2x, cmd.x);
          minY = Math.min(minY, cmd.cp1y, cmd.cp2y, cmd.y);
          maxX = Math.max(maxX, cmd.cp1x, cmd.cp2x, cmd.x);
          maxY = Math.max(maxY, cmd.cp1y, cmd.cp2y, cmd.y);
          currentX = cmd.x;
          currentY = cmd.y;
          break;
          
        case 'quadraticCurveTo':
          minX = Math.min(minX, cmd.cpx, cmd.x);
          minY = Math.min(minY, cmd.cpy, cmd.y);
          maxX = Math.max(maxX, cmd.cpx, cmd.x);
          maxY = Math.max(maxY, cmd.cpy, cmd.y);
          currentX = cmd.x;
          currentY = cmd.y;
          break;
          
        case 'ellipse':
          minX = Math.min(minX, cmd.x - cmd.radiusX);
          minY = Math.min(minY, cmd.y - cmd.radiusY);
          maxX = Math.max(maxX, cmd.x + cmd.radiusX);
          maxY = Math.max(maxY, cmd.y + cmd.radiusY);
          break;
          
        case 'rect':
          minX = Math.min(minX, cmd.x);
          minY = Math.min(minY, cmd.y);
          maxX = Math.max(maxX, cmd.x + cmd.width);
          maxY = Math.max(maxY, cmd.y + cmd.height);
          break;
          
        case 'closePath':
          // No change to bounds
          break;
      }
    }
    
    return {
      minX: Number.isFinite(minX) ? minX : 0,
      minY: Number.isFinite(minY) ? minY : 0,
      maxX: Number.isFinite(maxX) ? maxX : 0,
      maxY: Number.isFinite(maxY) ? maxY : 0
    };
  }
}
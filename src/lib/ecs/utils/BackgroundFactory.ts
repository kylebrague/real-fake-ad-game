import { BackgroundComponent, PositionComponent, SizeComponent, type PathCommand } from "../components/CoreComponents";
import type { Entity } from "../Entity";
import type { World } from "../World";

/**
 * BackgroundFactory utility for creating background components
 *
 * This factory handles the creation of various background components,
 * separating creation logic from the component data structure.
 *    
 * @example
 * // Add a decorative circular element
 * const circle = this.world.createEntity();
 * this.world.addComponent(
 *   circle, 
 *   BackgroundFactory.createCustomPath(
 *     [
 *       { 
 *         type: 'arc', 
 *         x: this.config.canvasWidth / 2, 
 *         y: this.config.canvasHeight - 150, 
 *         radius: 50, 
 *         startAngle: 0, 
 *         endAngle: Math.PI * 2 
 *       }
 *     ],
 *     "#ffe770", 
 *     2
 *   )
 * );
 * @example
 * // Right divider - using a wavy curved path
 * const rightBarrier = this.world.createEntity();
 * const rightX = (mainLines.rightBorder / 8) * 7;
 * const pathCommands = [{ type: 'moveTo', x: rightX - dividerRectWidth / 2, y: 0 }] as PathCommand[];
 *
 * // Create a wavy line using bezier curves
 * for (let y = 100; y < this.config.canvasHeight; y += 100) {
 *   const amplitude = dividerRectWidth / 2;
 *   pathCommands.push({
 *     type: 'bezierCurveTo',
 *     cp1x: rightX - dividerRectWidth / 2 - amplitude, 
 *     cp1y: y - 50,
 *     cp2x: rightX - dividerRectWidth / 2 + amplitude, 
 *     cp2y: y,
 *     x: rightX - dividerRectWidth / 2, 
 *     y: y
 *   });
 * }
 * 
 * // Complete the shape
 * pathCommands.push({ type: 'lineTo', x: rightX + dividerRectWidth / 2, y: this.config.canvasHeight });
 * pathCommands.push({ type: 'lineTo', x: rightX + dividerRectWidth / 2, y: 0 });
 * pathCommands.push({ type: 'closePath' });
 * this.world.addComponent(
 *  rightBarrier, 
 *  BackgroundFactory.createCustomPath(
 *      pathCommands,
 *      "#c5d5d9", 
 *      1
 *    )
 *  );
 */
export const BackgroundFactory = {
  /**
   * Create a rectangle background component
   */
  createRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color = "blue",
    zIndex = 0
  ): BackgroundComponent {
    return new BackgroundComponent("rectangle", x, y, width, height, color, zIndex);
  },

  /**
   * Create a polygon background component from a set of points
   */
  createPolygon(points: [number, number][], color = "blue", zIndex = 0): BackgroundComponent {
    const pathCommands: PathCommand[] = [];

    if (points.length > 0) {
      // Move to the first point
      pathCommands.push({ type: "moveTo", x: points[0][0], y: points[0][1] });

      // Line to each subsequent point
      for (let i = 1; i < points.length; i++) {
        pathCommands.push({ type: "lineTo", x: points[i][0], y: points[i][1] });
      }

      // Close the path
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
  createCustomPath(
    pathCommands: PathCommand[],
    color = "blue",
    zIndex = 0,
    fillRule: "nonzero" | "evenodd" = "nonzero"
  ): BackgroundComponent {
    return new BackgroundComponent("custom", 0, 0, 0, 0, color, zIndex, pathCommands, fillRule);
  },

  /**
   * Helper method to add background with appropriate Position and Size components for perspective support
   * @param world The ECS World instance
   * @param background The background component to add
   * @returns The created entity
   */
  addBackgroundToWorld(world: World, background: BackgroundComponent): Entity {
    const entity = world.createEntity();
    world.addComponent(entity, background);
    
    // Add Position and Size components for perspective support
    if (background.shape === "rectangle") {
      // For rectangles, we can directly use the values
      world.addComponent(entity, new PositionComponent(background.x, background.y));
      world.addComponent(entity, new SizeComponent(background.width, background.height));
    } 
    else if (background.pathCommands.length > 0) {
      // For polygons and custom paths, calculate bounds
      const bounds = this.calculateBoundsFromCommands(background.pathCommands);
      world.addComponent(entity, new PositionComponent(bounds.minX, bounds.minY));
      world.addComponent(entity, new SizeComponent(
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      ));
    }
    
    return entity;
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
    
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'moveTo':
        case 'lineTo':
          minX = Math.min(minX, cmd.x);
          minY = Math.min(minY, cmd.y);
          maxX = Math.max(maxX, cmd.x);
          maxY = Math.max(maxY, cmd.y);
          break;
          
        case 'arc':
          minX = Math.min(minX, cmd.x - cmd.radius);
          minY = Math.min(minY, cmd.y - cmd.radius);
          maxX = Math.max(maxX, cmd.x + cmd.radius);
          maxY = Math.max(maxY, cmd.y + cmd.radius);
          break;
          
        case 'arcTo':
          minX = Math.min(minX, cmd.x1, cmd.x2);
          minY = Math.min(minY, cmd.y1, cmd.y2);
          maxX = Math.max(maxX, cmd.x1, cmd.x2);
          maxY = Math.max(maxY, cmd.y1, cmd.y2);
          break;
          
        case 'bezierCurveTo':
          minX = Math.min(minX, cmd.cp1x, cmd.cp2x, cmd.x);
          minY = Math.min(minY, cmd.cp1y, cmd.cp2y, cmd.y);
          maxX = Math.max(maxX, cmd.cp1x, cmd.cp2x, cmd.x);
          maxY = Math.max(maxX, cmd.cp1y, cmd.cp2y, cmd.y);
          break;
          
        case 'quadraticCurveTo':
          minX = Math.min(minX, cmd.cpx, cmd.x);
          minY = Math.min(minY, cmd.cpy, cmd.y);
          maxX = Math.max(maxX, cmd.cpx, cmd.x);
          maxY = Math.max(maxY, cmd.cpy, cmd.y);
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
      }
    }
    
    return {
      minX: Number.isFinite(minX) ? minX : 0,
      minY: Number.isFinite(minY) ? minY : 0,
      maxX: Number.isFinite(maxX) ? maxX : 0,
      maxY: Number.isFinite(maxY) ? maxY : 0
    };
  }
};

import { BackgroundComponent, type PathCommand } from "../components/CoreComponents";

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
};

// Utility functions for drawing game elements

/**
 * Draw a health bar above an entity
 */
export function drawHealthBar(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  health: number, 
  maxHealth: number
): void {
  const healthPercentage = Math.max(0, health / maxHealth);
  
  // Draw background
  ctx.fillStyle = "#444";
  ctx.fillRect(x, y, width, height);
  
  // Draw health (green to red based on percentage)
  const hue = healthPercentage * 120; // 120 for green, 0 for red
  ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.fillRect(x, y, width * healthPercentage, height);
  
  // Draw border
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
}

/**
 * Draw text with outline for better visibility
 */
export function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillStyle = "#fff",
  outlineStyle = "#000",
  lineWidth = 2
): void {
  // Save current context state
  ctx.save();
  
  // Draw outline
  ctx.strokeStyle = outlineStyle;
  ctx.lineWidth = lineWidth;
  ctx.strokeText(text, x, y);
  
  // Draw text
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);
  
  // Restore context state
  ctx.restore();
}

/**
 * Draw a glowing effect around an entity
 */
export function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color = "#ff0",
  blurSize = 20
): void {
  // Save current context state
  ctx.save();
  
  // Set shadow properties for glow
  ctx.shadowColor = color;
  ctx.shadowBlur = blurSize;
  
  // Draw a rectangular shape with the glow
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)"; // Nearly transparent fill
  ctx.fillRect(x - blurSize/2, y - blurSize/2, width + blurSize, height + blurSize);
  
  // Restore context state
  ctx.restore();
}

/**
 * Draw a explosion effect
 */
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha = 1
): void {
  // Create a radial gradient
  const gradient = ctx.createRadialGradient(
    x, y, 0,
    x, y, radius
  );
  
  gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
  gradient.addColorStop(0.4, `rgba(255, 120, 50, ${alpha})`);
  gradient.addColorStop(1, `rgba(255, 20, 20, 0)`);
  
  // Draw the explosion
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
/**
 * Entry point for the Real Fake Ad Game
 * Refactored to use an Entity Component System (ECS) architecture
 */
import { Game } from './lib/ecs/Game';

// Wait for DOM content to load
document.addEventListener('DOMContentLoaded', () => {
  // Get canvas element
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  
  // Create game instance using the ECS architecture
  const game = new Game(canvas);
  
  // Configure the perspective effect
  game.configurePerspective({
    enabled: true,          // Enable the perspective effect
    vanishingPointY: 0,     // Vanishing point at the top of the screen
    horizonY: canvas.height * -0.5, // Horizon line at 50% from the top
    depthFactor: 0.9,       // How strong the perspective effect is (stronger than default)
    minScale: 0.001         // Objects at horizon scale to 0.1% of original size
  });
  
  // Initialize and start the game
  game.init();
  game.start();
  
  // Add event listener for the pause button
  const pauseButton = document.getElementById('pause-button');
  if (pauseButton) {
    pauseButton.addEventListener('click', () => {
      game.pause();
    });
  }
  
  // Add event listener for the resume button
  const resumeButton = document.getElementById('resume-button');
  if (resumeButton) {
    resumeButton.addEventListener('click', () => {
      game.resume();
    });
  }
  
  // Add event listener for the restart button
  const restartButton = document.getElementById('restart-button');
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      game.resetGame();
      game.start();
    });
  }
});

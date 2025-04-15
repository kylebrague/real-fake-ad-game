import { Game } from "./lib/Game";

// Get canvas and context
const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

// Game configuration
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const fps = 60;
const enemySpeed = 1; // pixels per frame for enemies/powerups
const bulletSpeed = 5; // pixels per frame for bullets
const enemyHealth = 3; // health for enemies
const powerupHealth = 5; // health for powerups
const playerSpeed = 5;
const spawnInterval = 2000; // spawn enemy every 2 seconds
let isPaused = false;

// Define lanes positions (left and right lanes)
const leftLaneX = canvasWidth / 3;
const rightLaneX = (2 * canvasWidth) / 3;

// Player object
const player = {
  width: 30,
  height: 30,
  x: canvasWidth / 2 - 20,
  y: canvasHeight - 30,
  // Movement flags
  movingLeft: false,
  movingRight: false,
  color: "green",
};

// Game objects arrays
let enemies = []; // will hold enemy objects (lane: "left")
let powerups = []; // will hold powerup objects (lane: "right")
let bullets = []; // will hold bullet objects
let lastSpawnTime = 0;
const gameOver = false;

// Utility: create enemy
function createEnemy() {
  return {
    lane: "left",
    x: leftLaneX,
    y: -20, // start above the canvas
    width: 30,
    height: 30,
    health: enemyHealth,
  };
}

// Utility: create powerup
function createPowerup() {
  return {
    lane: "right",
    x: rightLaneX,
    y: -20, // start above the canvas
    width: 30,
    height: 30,
    health: powerupHealth,
  };
}

// Utility: create bullet
// bulletType can be "left" or "right" corresponding to which lane it will travel in.
function createBullet(startX: number, startY: number) {
  return {
    x: startX,
    y: startY,
    width: 5,
    height: 10,
    damage: 1,
    lane: startX < canvasWidth / 2 ? "left" : "right", // determine lane based on x position
  };
}

// Handle keyboard input
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    player.movingLeft = true;
  }
  if (e.key === "ArrowRight") {
    player.movingRight = true;
  }
  // Shooting: use space
  if (e.key === " ") {
    bullets.push(createBullet(player.x, player.y));
  }
  if (e.key === "p") {
    console.log("p key pressed");
    isPaused = !isPaused;
    player.color = isPaused ? "red" : "green";
  }
  
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") {
    player.movingLeft = false;
  }
  if (e.key === "ArrowRight") {
    player.movingRight = false;
  }
});


// Update game state on each frame
function update(deltaTime) {
  // Move player
  if (player.movingLeft) {
    player.x -= playerSpeed;
    if (player.x < 0) player.x = 0;
  }
  if (player.movingRight) {
    player.x += playerSpeed;
    if (player.x + player.width > canvasWidth) player.x = canvasWidth - player.width;
  }

  // Move enemies
  for (const enemy of enemies) {
    enemy.y += enemySpeed;
    // Check if enemy reaches player's level => game over
    // if (enemy.y + enemy.height >= player.y) {
    //   gameOver = true;
    // }
  }
  // Move powerups
  for (const powerup of powerups) {
    powerup.y += enemySpeed;
    // Remove powerup if it goes off-screen at the bottom (does not affect player)
  }

  // Move bullets upward
  for (const bullet of bullets) {
    bullet.y -= bulletSpeed;
  }

  // Remove bullets that are off the screen
  bullets = bullets.filter((bullet) => bullet.y + bullet.height > 0);
  // bullet collisions are very rudiementary
  // Check bullet collisions with enemies (left lane)
  for (const bullet of bullets) {
    if (bullet.lane === "left") {
      for (const enemy of enemies) {
        if (bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
          // simple hit test: since lanes are fixed, we assume a hit when vertical overlap exists
          enemy.health -= bullet.damage;
          bullet.hit = true; // mark the bullet for removal
        }
      }
    } 
    // Check bullet collisions with powerups (right lane)
    if (bullet.lane === "right") {
      for (const powerup of powerups) {
        if (bullet.y < powerup.y + powerup.height && bullet.y + bullet.height > powerup.y) {
          powerup.health -= bullet.damage;
          bullet.hit = true;
        }
      }
    }
  }

  // Remove bullets that hit something
  bullets = bullets.filter((bullet) => !bullet.hit);

  // Remove dead enemies and powerups (or collect powerup)
  enemies = enemies.filter((enemy) => enemy.health > 0);
  powerups = powerups.filter((powerup) => powerup.health > 0 && powerup.y < canvasHeight);
}

// Draw everything on the canvas
function drawGame() {
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw player (a simple rectangle)
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Draw enemies (red squares) and display their health
  for (const enemy of enemies) {
    ctx.fillStyle = "#f00";
    ctx.fillRect(enemy.x - enemy.width / 2, enemy.y, enemy.width, enemy.height);
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.fillText(enemy.health, enemy.x - 5, enemy.y + enemy.height / 2);
  }

  // Draw powerups (blue squares) and display their health
  for (const powerup of powerups) {
    ctx.fillStyle = "#00f";
    ctx.fillRect(powerup.x - powerup.width / 2, powerup.y, powerup.width, powerup.height);
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.fillText(powerup.health, powerup.x - 5, powerup.y + powerup.height / 2);
  }

  // Draw bullets (yellow rectangles)
  ctx.fillStyle = "#ff0";
  for (const bullet of bullets) {
    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
  }

  // If game over, overlay text
  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "#fff";
    ctx.font = "40px Arial";
    ctx.fillText("GAME OVER", canvasWidth / 2 - 100, canvasHeight / 2);
  }
  if (isPaused) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "#fff";
    ctx.font = "40px Arial";
    ctx.fillText("PAUSED", canvasWidth / 2 - 100, canvasHeight / 2);
  }
}


function drawUI() {
  // Draw UI elements like score, health, etc.
  ctx.font = "20px Arial";
  ctx.fillText(isPaused ? "Paused" : "Running", canvasWidth / 2 - 30, 30);
}

// The main game loop
let lastTime = performance.now();
function gameLoop(timestamp: number) {
  if (gameOver) {
    drawGame();
    return;
  }
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // Spawn enemies and powerups at the given interval
  if (timestamp - lastSpawnTime > spawnInterval) {
    enemies.push(createEnemy());
    // Offset spawning for powerups by half the interval
    powerups.push(createPowerup());
    lastSpawnTime = timestamp;
  }
  update(deltaTime);
  drawGame();
}
function canvasLoop(timestamp: number) {
  drawUI()
  if (isPaused) {
    console.log("paused");
    return;
  }
  gameLoop(timestamp);
}

function loop(timestamp: number) {
  canvasLoop(timestamp);
  requestAnimationFrame(loop);
}

document.addEventListener("DOMContentLoaded", () => {
  // Create and start the game
  const game = new Game("gameCanvas");
  game.start();
  
  // Optional: Handle window events
  window.addEventListener("beforeunload", () => {
    game.stop();
  });
});

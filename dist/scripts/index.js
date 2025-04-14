(() => {
  // src/index.ts
  var canvas = document.getElementById("gameCanvas");
  var ctx = canvas.getContext("2d");
  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;
  var enemySpeed = 1;
  var bulletSpeed = 5;
  var enemyHealth = 3;
  var powerupHealth = 5;
  var playerSpeed = 5;
  var spawnInterval = 2e3;
  var isPaused = false;
  var leftLaneX = canvasWidth / 3;
  var rightLaneX = 2 * canvasWidth / 3;
  var player = {
    width: 30,
    height: 30,
    x: canvasWidth / 2 - 20,
    y: canvasHeight - 30,
    // Movement flags
    movingLeft: false,
    movingRight: false,
    color: "green"
  };
  var enemies = [];
  var powerups = [];
  var bullets = [];
  var lastSpawnTime = 0;
  var gameOver = false;
  function createEnemy() {
    return {
      lane: "left",
      x: leftLaneX,
      y: -20,
      // start above the canvas
      width: 30,
      height: 30,
      health: enemyHealth
    };
  }
  function createPowerup() {
    return {
      lane: "right",
      x: rightLaneX,
      y: -20,
      // start above the canvas
      width: 30,
      height: 30,
      health: powerupHealth
    };
  }
  function createBullet(startX, startY) {
    return {
      x: startX,
      y: startY,
      width: 5,
      height: 10,
      damage: 1
    };
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      player.movingLeft = true;
    }
    if (e.key === "ArrowRight") {
      player.movingRight = true;
    }
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
  function update(deltaTime) {
    if (player.movingLeft) {
      player.x -= playerSpeed;
      if (player.x < 0) player.x = 0;
    }
    if (player.movingRight) {
      player.x += playerSpeed;
      if (player.x + player.width > canvasWidth) player.x = canvasWidth - player.width;
    }
    for (const enemy of enemies) {
      enemy.y += enemySpeed;
    }
    for (const powerup of powerups) {
      powerup.y += enemySpeed;
    }
    for (const bullet of bullets) {
      bullet.y -= bulletSpeed;
    }
    bullets = bullets.filter((bullet) => bullet.y + bullet.height > 0);
    for (const bullet of bullets) {
      if (bullet.lane === "left") {
        for (const enemy of enemies) {
          if (bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
            enemy.health -= bullet.damage;
            bullet.hit = true;
          }
        }
      }
      if (bullet.lane === "right") {
        for (const powerup of powerups) {
          if (bullet.y < powerup.y + powerup.height && bullet.y + bullet.height > powerup.y) {
            powerup.health -= bullet.damage;
            bullet.hit = true;
          }
        }
      }
    }
    bullets = bullets.filter((bullet) => !bullet.hit);
    enemies = enemies.filter((enemy) => enemy.health > 0);
    powerups = powerups.filter((powerup) => powerup.health > 0 && powerup.y < canvasHeight);
  }
  function drawGame() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    for (const enemy of enemies) {
      ctx.fillStyle = "#f00";
      ctx.fillRect(enemy.x - enemy.width / 2, enemy.y, enemy.width, enemy.height);
      ctx.fillStyle = "#fff";
      ctx.font = "12px Arial";
      ctx.fillText(enemy.health, enemy.x - 5, enemy.y + enemy.height / 2);
    }
    for (const powerup of powerups) {
      ctx.fillStyle = "#00f";
      ctx.fillRect(powerup.x - powerup.width / 2, powerup.y, powerup.width, powerup.height);
      ctx.fillStyle = "#fff";
      ctx.font = "12px Arial";
      ctx.fillText(powerup.health, powerup.x - 5, powerup.y + powerup.height / 2);
    }
    ctx.fillStyle = "#ff0";
    for (const bullet of bullets) {
      ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
    }
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
    ctx.font = "20px Arial";
    ctx.fillText(isPaused ? "Paused" : "Running", canvasWidth / 2 - 30, 30);
  }
  var lastTime = performance.now();
  function gameLoop(timestamp) {
    if (gameOver) {
      drawGame();
      return;
    }
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    if (timestamp - lastSpawnTime > spawnInterval) {
      enemies.push(createEnemy());
      powerups.push(createPowerup());
      lastSpawnTime = timestamp;
    }
    update(deltaTime);
    drawGame();
  }
  function canvasLoop(timestamp) {
    drawUI();
    if (isPaused) {
      console.log("paused");
      return;
    }
    gameLoop(timestamp);
  }
  function loop(timestamp) {
    canvasLoop(timestamp);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

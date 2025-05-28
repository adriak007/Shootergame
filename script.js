const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Carregamento das imagens
const backgroundImg = new Image();
backgroundImg.src = "background.jpg";

const playerImg = new Image();
playerImg.src = "player.png";

const bulletImg = new Image();
bulletImg.src = "bullet.png";


const enemyImgs = [
  new Image(),
  new Image(),
  new Image()
];
enemyImgs[0].src = "enemy1.png";
enemyImgs[1].src = "enemy2.png";
enemyImgs[2].src = "enemy3.png";

// Carregamento dos sons
const sounds = {
  shoot: new Audio("shoot.mp3"),
  hit: new Audio("hit.mp3"),
  enemyHit: new Audio("enemy_hit.mp3"),
  playerHit: new Audio("player_hit.mp3"),
  backgroundMusic: new Audio("background_music.mp3"),
  menuMusic: new Audio("menu_music.mp3"),
  gameOver: new Audio("game_over.mp3")
};

// Configurar músicas
sounds.backgroundMusic.loop = true;
sounds.backgroundMusic.volume = 0.3;
sounds.menuMusic.loop = true;
sounds.menuMusic.volume = 0.2;

// Ajustar volume dos sons
sounds.shoot.volume = 0.3;
sounds.hit.volume = 0.4;
sounds.enemyHit.volume = 0.4;
sounds.playerHit.volume = 0.5;
sounds.gameOver.volume = 0.6;

// Iniciar música do menu
sounds.menuMusic.play();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

let bullets = [];
let enemies = [];
let angle = 0;
let score = 0;
let gameInterval;
let spawnTimer;
let difficultyRamp;
let spawnDelay = 1500;
let isGameRunning = false;
let isPaused = false;

const player = {
  x: centerX,
  y: centerY,
  radius: 30, // Tamanho do player (30 = 60x60 pixels)
  speed: 1,
  maxHealth: 3,
  health: 3
};

const keys = {};

document.getElementById("startBtn").onclick = () => {
  if (!isGameRunning) {
    startGame();
  }
};

document.getElementById("pauseBtn").onclick = () => {
  if (isGameRunning) {
    togglePause();
  }
};

document.getElementById("restartBtn").onclick = () => {
  if (isGameRunning) {
    // Parar todos os intervalos antes de reiniciar
    cancelAnimationFrame(gameInterval);
    clearInterval(spawnTimer);
    if (difficultyRamp) clearInterval(difficultyRamp);
    
    // Reiniciar o jogo
    startGame();
  }
};

document.getElementById("clearRankingBtn").onclick = () => {
  if (confirm("Tem certeza que deseja limpar o ranking?")) {
    localStorage.removeItem("ranking");
    loadRanking();
  }
};

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", (e) => {
  angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
});

canvas.addEventListener("click", () => {
  if (!isGameRunning) return;
  bullets.push({
    x: player.x,
    y: player.y,
    dx: Math.cos(angle) * 10,
    dy: Math.sin(angle) * 10,
    radius: 20, // Tamanho da bala (10 = 20x20 pixels)
    angle: angle
  });
  // Tocar som do tiro
  sounds.shoot.currentTime = 0;
  sounds.shoot.play();
});

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;

  if (edge === 0) x = 0, y = Math.random() * canvas.height;
  else if (edge === 1) x = canvas.width, y = Math.random() * canvas.height;
  else if (edge === 2) x = Math.random() * canvas.width, y = 0;
  else x = Math.random() * canvas.width, y = canvas.height;

  const enemyType = Math.floor(Math.random() * 3);
  const health = enemyType + 1;

  enemies.push({
    x,
    y,
    radius: 25 + (enemyType * 10), // Tamanho dos inimigos
    // Tipo 0: 25 = 50x50 pixels
    // Tipo 1: 35 = 70x70 pixels
    // Tipo 2: 45 = 90x90 pixels
    health: health,
    maxHealth: health,
    type: enemyType
  });
}

function drawHealthBar(enemy) {
  const barWidth = 30;
  const barHeight = 4;
  const barX = enemy.x - barWidth / 2;
  const barY = enemy.y - enemy.radius - 10;
  const ratio = enemy.health / enemy.maxHealth;

  ctx.fillStyle = "#444";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = "#0f0";
  ctx.fillRect(barX, barY, barWidth * ratio, barHeight);
}

function drawPlayerHealthBar() {
  const barWidth = 60;
  const barHeight = 8;
  const barX = player.x - barWidth / 2;
  const barY = player.y - player.radius - 20;
  const ratio = player.health / player.maxHealth;

  ctx.fillStyle = "#444";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = "#0f0";
  ctx.fillRect(barX, barY, barWidth * ratio, barHeight);
}

function togglePause() {
  isPaused = !isPaused;
  const pauseBtn = document.getElementById("pauseBtn");
  const restartBtn = document.getElementById("restartBtn");
  
  if (isPaused) {
    cancelAnimationFrame(gameInterval);
    clearInterval(spawnTimer);
    if (difficultyRamp) clearInterval(difficultyRamp);
    sounds.backgroundMusic.pause();
    pauseBtn.textContent = "Continuar";
    restartBtn.style.display = "inline-block";
  } else {
    gameInterval = requestAnimationFrame(update);
    spawnTimer = setInterval(spawnEnemy, spawnDelay);
    sounds.backgroundMusic.play();
    difficultyRamp = setInterval(() => {
      if (!isGameRunning || isPaused) {
        clearInterval(difficultyRamp);
        return;
      }
      spawnDelay *= 0.95;
      clearInterval(spawnTimer);
      spawnTimer = setInterval(spawnEnemy, spawnDelay);
    }, 3000);
    pauseBtn.textContent = "Pausar";
    restartBtn.style.display = "none";
  }
}

function update() {
  if (!isGameRunning || isPaused) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Desenhar o background
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);

  // Movimento do player com WASD / setas
  if (keys["w"] || keys["arrowup"]) player.y -= player.speed;
  if (keys["s"] || keys["arrowdown"]) player.y += player.speed;
  if (keys["a"] || keys["arrowleft"]) player.x -= player.speed;
  if (keys["d"] || keys["arrowright"]) player.x += player.speed;

  // Impedir sair da tela
  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

  // Desenhar o player com rotação
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(angle + Math.PI/2);
  ctx.drawImage(
    playerImg, 
    -player.radius, // Posição X = -radius
    -player.radius, // Posição Y = -radius
    player.radius * 2, // Largura = radius * 2
    player.radius * 2  // Altura = radius * 2
  );
  ctx.restore();

  // Barra de vida do player
  drawPlayerHealthBar();

  // Balas
  bullets.forEach((b, bi) => {
    b.x += b.dx;
    b.y += b.dy;

    // Desenhar bala com rotação
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle + Math.PI/2);
    ctx.drawImage(
      bulletImg,
      -b.radius, // Posição X = -radius
      -b.radius, // Posição Y = -radius
      b.radius * 2, // Largura = radius * 2
      b.radius * 2  // Altura = radius * 2
    );
    ctx.restore();

    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
      bullets.splice(bi, 1);
    }
  });

  // Inimigos
  enemies.forEach((e, ei) => {
    // Calcular ângulo para o player atual
    const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);

    // Atualizar posição inimigo seguindo o player
    const enemySpeed = 1.5;
    e.x += Math.cos(angleToPlayer) * enemySpeed;
    e.y += Math.sin(angleToPlayer) * enemySpeed;

    // Desenhar inimigo com rotação
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(angleToPlayer + Math.PI/2);
    ctx.drawImage(
      enemyImgs[e.type], 
      -e.radius, // Posição X = -radius
      -e.radius, // Posição Y = -radius
      e.radius * 2, // Largura = radius * 2
      e.radius * 2  // Altura = radius * 2
    );
    ctx.restore();

    drawHealthBar(e);

    // Colisão bala-inimigo
    bullets.forEach((b, bi) => {
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist < b.radius + e.radius) {
        e.health -= 1;
        bullets.splice(bi, 1);
        // Tocar som do inimigo sendo atingido
        sounds.enemyHit.currentTime = 0;
        sounds.enemyHit.play();
        if (e.health <= 0) {
          enemies.splice(ei, 1);
          score++;
          document.getElementById("score").textContent = `Pontos: ${score}`;
          // Tocar som do inimigo sendo destruído
          sounds.hit.currentTime = 0;
          sounds.hit.play();
        }
      }
    });

    // Colisão inimigo-player
    const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
    if (distToPlayer < e.radius + player.radius) {
      enemies.splice(ei, 1);
      player.health -= 1;
      // Tocar som do player sendo atingido
      sounds.playerHit.currentTime = 0;
      sounds.playerHit.play();
      if (player.health <= 0) {
        gameOver();
      }
    }
  });

  if (isGameRunning) requestAnimationFrame(update);
}

function startGame() {
  // Esconder texto de Game Over se estiver visível
  const gameOverText = document.querySelector('.game-over-text');
  gameOverText.style.opacity = '0';

  // Parar música do menu
  sounds.menuMusic.pause();
  sounds.menuMusic.currentTime = 0;

  // Parar todos os sons que possam estar tocando
  Object.values(sounds).forEach(sound => {
    if (sound !== sounds.menuMusic) {
      sound.pause();
      sound.currentTime = 0;
    }
  });

  // Limpar todos os intervalos existentes
  if (gameInterval) cancelAnimationFrame(gameInterval);
  if (spawnTimer) clearInterval(spawnTimer);
  if (difficultyRamp) clearInterval(difficultyRamp);

  // Reiniciar variáveis do jogo
  score = 0;
  bullets = [];
  enemies = [];
  spawnDelay = 1500;
  isGameRunning = true;
  isPaused = false;
  player.health = player.maxHealth;
  player.x = centerX;
  player.y = centerY;
  document.getElementById("score").textContent = "Pontos: 0";

  // Atualizar interface
  document.getElementById("startBtn").style.display = "none";
  document.getElementById("pauseBtn").style.display = "inline-block";
  document.getElementById("restartBtn").style.display = "none";
  document.getElementById("pauseBtn").textContent = "Pausar";

  // Iniciar música de fundo
  sounds.backgroundMusic.play();

  // Iniciar o jogo
  gameInterval = requestAnimationFrame(update);
  spawnTimer = setInterval(spawnEnemy, spawnDelay);

  difficultyRamp = setInterval(() => {
    if (!isGameRunning || isPaused) {
      clearInterval(difficultyRamp);
      return;
    }
    spawnDelay *= 0.95;
    clearInterval(spawnTimer);
    spawnTimer = setInterval(spawnEnemy, spawnDelay);
  }, 3000);
}

function gameOver() {
  isGameRunning = false;
  isPaused = false;
  cancelAnimationFrame(gameInterval);
  clearInterval(spawnTimer);
  if (difficultyRamp) clearInterval(difficultyRamp);
  
  // Parar todos os sons
  Object.values(sounds).forEach(sound => {
    sound.pause();
    sound.currentTime = 0;
  });

  // Mostrar texto de Game Over
  const gameOverText = document.querySelector('.game-over-text');
  gameOverText.style.opacity = '1';

  // Tocar som de game over
  sounds.gameOver.play();

  // Atualizar interface
  document.getElementById("startBtn").style.display = "inline-block";
  document.getElementById("pauseBtn").style.display = "none";
  document.getElementById("restartBtn").style.display = "none";

  // Esperar o som de game over terminar antes de mostrar o alerta
  setTimeout(() => {
    // Esconder texto de Game Over
    gameOverText.style.opacity = '0';
    
    alert("Fim de jogo! Pontuação final: " + score);
    saveScore(score);
    loadRanking();
    
    // Reiniciar música do menu após o alerta
    sounds.menuMusic.play();
  }, 2000); // Aumentado para 2 segundos para dar tempo de ver o texto
}

function saveScore(newScore) {
  const ranking = JSON.parse(localStorage.getItem("ranking")) || [];
  ranking.push(newScore);
  ranking.sort((a, b) => b - a);
  localStorage.setItem("ranking", JSON.stringify(ranking.slice(0, 10)));
}

function loadRanking() {
  const rankingList = document.getElementById("rankingList");
  rankingList.innerHTML = "";
  const ranking = JSON.parse(localStorage.getItem("ranking")) || [];
  ranking.forEach((score, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}º - ${score} pontos`;
    rankingList.appendChild(li);
  });
}

loadRanking();

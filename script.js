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

// Adicionar após o carregamento das imagens
const meteorImg = new Image();
meteorImg.src = "meteor.png"; // Você precisará adicionar uma imagem de meteoro

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
sounds.backgroundMusic.volume = 0.5;
sounds.menuMusic.loop = true;
sounds.menuMusic.volume = 0.4;

// Ajustar volume dos sons
sounds.shoot.volume = 0.3;
sounds.hit.volume = 0.4;
sounds.enemyHit.volume = 0.4;
sounds.playerHit.volume = 0.5;
sounds.gameOver.volume = 0.6;

// Variável para controlar o estado do mute
let isMuted = false;

// Função para alternar o mute
function toggleMute() {
  isMuted = !isMuted;
  const muteBtn = document.getElementById('muteBtn');
  const icon = muteBtn.querySelector('i');
  
  // Atualizar ícone
  if (isMuted) {
    icon.classList.remove('bi-volume-up-fill');
    icon.classList.add('bi-volume-mute-fill');
    muteBtn.classList.add('muted');
  } else {
    icon.classList.remove('bi-volume-mute-fill');
    icon.classList.add('bi-volume-up-fill');
    muteBtn.classList.remove('muted');
  }
  
  // Aplicar mute/unmute em todos os sons
  Object.values(sounds).forEach(sound => {
    sound.muted = isMuted;
  });
}

// Adicionar evento de clique ao botão de mute
document.getElementById('muteBtn').addEventListener('click', toggleMute);

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

// Adicionar após a declaração das variáveis globais
let meteors = [];
let meteorSpawnTimer;

const player = {
  x: centerX,
  y: centerY,
  radius: 30, // Tamanho do player (30 = 60x60 pixels)
  baseSpeed: 3, // Velocidade base do player
  speed: 3, // Velocidade atual (pode ser modificada por powerups)
  maxHealth: 3,
  health: 3
};

const keys = {};

// Função para limpar todas as teclas
function clearAllKeys() {
  Object.keys(keys).forEach(key => {
    keys[key] = false;
  });
}

// Limpar teclas quando a janela perde o foco
window.addEventListener("blur", () => {
  console.log("Janela perdeu foco - limpando teclas");
  clearAllKeys();
});

// Limpar teclas quando o jogador sai da página
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("Página oculta - limpando teclas");
    clearAllKeys();
  }
});

document.getElementById("startBtn").onclick = () => {
  console.log("Botão iniciar clicado");
  if (!isGameRunning) {
    console.log("Jogo não está rodando, iniciando...");
    startGame();
  } else {
    console.log("Jogo já está rodando");
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
  if (!isGameRunning || isPaused) {
    clearAllKeys();
    return;
  }
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (e) => {
  if (!isGameRunning || isPaused) {
    clearAllKeys();
    return;
  }
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", (e) => {
  if (!isGameRunning || isPaused) return;
  angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
});

canvas.addEventListener("click", () => {
  if (!isGameRunning || isPaused) return;
  
  // Calcular a posição da frente da nave
  const bulletRadius = powerupManager.isPowerupActive('big_bullet') ? 60 : 20;
  const bulletOffset = player.radius + (bulletRadius * 0.5); // Reduzindo a distância para metade do raio da bala
  
  // Verificar se o powerup de tiro triplo está ativo
  if (powerupManager.isPowerupActive('triple_shot')) {
    // Tiro central
    bullets.push({
      x: player.x + Math.cos(angle) * bulletOffset,
      y: player.y + Math.sin(angle) * bulletOffset,
      dx: Math.cos(angle) * 10,
      dy: Math.sin(angle) * 10,
      radius: bulletRadius,
      angle: angle,
      damage: powerupManager.isPowerupActive('big_bullet') ? 3 : 1
    });
    
    // Tiro esquerdo (15 graus)
    const leftAngle = angle - Math.PI/20;
    bullets.push({
      x: player.x + Math.cos(leftAngle) * bulletOffset,
      y: player.y + Math.sin(leftAngle) * bulletOffset,
      dx: Math.cos(leftAngle) * 10,
      dy: Math.sin(leftAngle) * 10,
      radius: bulletRadius,
      angle: leftAngle,
      damage: powerupManager.isPowerupActive('big_bullet') ? 3 : 1
    });
    
    // Tiro direito (15 graus)
    const rightAngle = angle + Math.PI/20;
    bullets.push({
      x: player.x + Math.cos(rightAngle) * bulletOffset,
      y: player.y + Math.sin(rightAngle) * bulletOffset,
      dx: Math.cos(rightAngle) * 10,
      dy: Math.sin(rightAngle) * 10,
      radius: bulletRadius,
      angle: rightAngle,
      damage: powerupManager.isPowerupActive('big_bullet') ? 3 : 1
    });
  } else {
    // Tiro normal
    bullets.push({
      x: player.x + Math.cos(angle) * bulletOffset,
      y: player.y + Math.sin(angle) * bulletOffset,
      dx: Math.cos(angle) * 10,
      dy: Math.sin(angle) * 10,
      radius: bulletRadius,
      angle: angle,
      damage: powerupManager.isPowerupActive('big_bullet') ? 3 : 1
    });
  }
  
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

// Adicionar após a função spawnEnemy()
function spawnMeteor() {
  const edge = Math.floor(Math.random() * 4);
  let x, y, dx, dy;
  const speed = 2; // Reduzindo a velocidade do meteoro de 4 para 2

  // Definir posição inicial e direção do meteoro
  if (edge === 0) { // Esquerda
    x = 0;
    y = Math.random() * canvas.height;
    dx = speed;
    dy = 0;
  } else if (edge === 1) { // Direita
    x = canvas.width;
    y = Math.random() * canvas.height;
    dx = -speed;
    dy = 0;
  } else if (edge === 2) { // Topo
    x = Math.random() * canvas.width;
    y = 0;
    dx = 0;
    dy = speed;
  } else { // Base
    x = Math.random() * canvas.width;
    y = canvas.height;
    dx = 0;
    dy = -speed;
  }

  meteors.push({
    x,
    y,
    dx,
    dy,
    radius: 40,
    trail: [] // Array para armazenar as posições anteriores
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
  console.log("Tentando pausar/despausar. Estado atual:", isPaused);
  isPaused = !isPaused;
  const pauseBtn = document.getElementById("pauseBtn");
  const restartBtn = document.getElementById("restartBtn");
  
  if (isPaused) {
    console.log("Pausando jogo...");
    // Limpar teclas ao pausar
    clearAllKeys();
    
    // Parar todos os intervalos
    if (gameInterval) {
      cancelAnimationFrame(gameInterval);
      gameInterval = null;
    }
    if (spawnTimer) {
      clearInterval(spawnTimer);
      spawnTimer = null;
    }
    if (difficultyRamp) {
      clearInterval(difficultyRamp);
      difficultyRamp = null;
    }
    if (meteorSpawnTimer) {
      clearInterval(meteorSpawnTimer);
      meteorSpawnTimer = null;
    }
    
    // Parar powerup manager
    window.powerupManager.stop();
    
    // Pausar música
    sounds.backgroundMusic.pause();
    
    // Atualizar interface
    pauseBtn.textContent = "Continuar";
    restartBtn.style.display = "inline-block";
  } else {
    console.log("Despausando jogo...");
    // Reiniciar o game loop
    gameInterval = requestAnimationFrame(update);
    
    // Reiniciar spawn de inimigos
    spawnTimer = setInterval(spawnEnemy, spawnDelay);
    
    // Reiniciar dificuldade
    difficultyRamp = setInterval(() => {
      if (!isGameRunning || isPaused) {
        clearInterval(difficultyRamp);
        return;
      }
      spawnDelay *= 0.95;
      clearInterval(spawnTimer);
      spawnTimer = setInterval(spawnEnemy, spawnDelay);
    }, 3000);
    
    // Reiniciar spawn de meteoros
    meteorSpawnTimer = setInterval(spawnMeteor, 1000);
    
    // Reiniciar powerup manager
    window.powerupManager.start();
    
    // Retomar música
    sounds.backgroundMusic.play();
    
    // Atualizar interface
    pauseBtn.textContent = "Pausar";
    restartBtn.style.display = "none";
  }
}

function update() {
  if (!isGameRunning || isPaused) {
    console.log("Update: jogo não está rodando ou está pausado");
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Desenhar o background
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
  
  // Adicionar camada escura semi-transparente
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Atualizar velocidade do player baseado no powerup
  player.speed = powerupManager.isPowerupActive('speed_boost') ? player.baseSpeed * 2 : player.baseSpeed;

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
    -player.radius,
    -player.radius,
    player.radius * 2,
    player.radius * 2
  );
  ctx.restore();

  // Barra de vida do player
  drawPlayerHealthBar();

  // Atualizar powerups
  console.log("Atualizando powerups no update");
  window.powerupManager.update();

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
        e.health -= b.damage; // Usar o dano da bala
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

  // Meteoros
  meteors.forEach((m, mi) => {
    // Adicionar posição atual ao rastro
    m.trail.push({ x: m.x, y: m.y });
    // Manter apenas as últimas 10 posições
    if (m.trail.length > 10) {
      m.trail.shift();
    }

    m.x += m.dx;
    m.y += m.dy;

    // Calcular o ângulo baseado na direção do movimento
    const meteorAngle = Math.atan2(m.dy, m.dx);

    // Desenhar o rastro
    m.trail.forEach((pos, index) => {
      const alpha = index / m.trail.length; // Opacidade diminui conforme a posição é mais antiga
      const size = m.radius * 0.6 * (1 - index/m.trail.length); // Tamanho reduzido para 60% do original
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      // Variação na intensidade usando uma função seno
      const intensity = Math.sin(Date.now() * 0.005 + index) * 0.1 + 0.2;
      ctx.fillStyle = `rgba(255, 165, 0, ${alpha * intensity})`; // Intensidade variável
      ctx.fill();
    });

    // Desenhar meteoro com rotação
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(meteorAngle + Math.PI/4 + Math.PI);
    ctx.drawImage(
      meteorImg,
      -m.radius,
      -m.radius,
      m.radius * 2,
      m.radius * 2
    );
    ctx.restore();

    // Remover meteoro quando sair da tela
    if (m.x < -m.radius * 2 || m.x > canvas.width + m.radius * 2 ||
        m.y < -m.radius * 2 || m.y > canvas.height + m.radius * 2) {
      meteors.splice(mi, 1);
    }

    // Colisão meteoro-player
    const distToPlayer = Math.hypot(m.x - player.x, m.y - player.y);
    if (distToPlayer < m.radius + player.radius) {
      meteors.splice(mi, 1);
      player.health -= 1;
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
  console.log("Iniciando jogo...");
  // Limpar teclas ao iniciar
  clearAllKeys();
  
  // Esconder o ranking durante o jogo
  document.getElementById("ranking").style.display = "none";
  
  // Limpar todos os intervalos existentes
  if (gameInterval) {
    cancelAnimationFrame(gameInterval);
    gameInterval = null;
  }
  if (spawnTimer) {
    clearInterval(spawnTimer);
    spawnTimer = null;
  }
  if (difficultyRamp) {
    clearInterval(difficultyRamp);
    difficultyRamp = null;
  }
  if (meteorSpawnTimer) {
    clearInterval(meteorSpawnTimer);
    meteorSpawnTimer = null;
  }

  // Parar powerup manager se estiver rodando
  window.powerupManager.stop();

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
  try {
    console.log("Tentando iniciar música de fundo");
    sounds.backgroundMusic.play();
  } catch (error) {
    console.log("Erro ao iniciar música:", error);
  }

  // Iniciar o jogo
  console.log("Iniciando game loop");
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

  // Adicionar após a inicialização dos outros timers
  meteors = [];
  meteorSpawnTimer = setInterval(spawnMeteor, 1000);

  // Iniciar o powerup manager
  console.log("Iniciando powerup manager no startGame");
  window.powerupManager.start();
}

function gameOver() {
  console.log("Game Over - Parando powerup manager");
  isGameRunning = false;
  isPaused = false;
  
  // Mostrar o ranking quando o jogo termina
  document.getElementById("ranking").style.display = "block";
  
  // Limpar teclas ao terminar o jogo
  clearAllKeys();
  
  // Limpar todos os intervalos
  if (gameInterval) {
    cancelAnimationFrame(gameInterval);
    gameInterval = null;
  }
  if (spawnTimer) {
    clearInterval(spawnTimer);
    spawnTimer = null;
  }
  if (difficultyRamp) {
    clearInterval(difficultyRamp);
    difficultyRamp = null;
  }
  if (meteorSpawnTimer) {
    clearInterval(meteorSpawnTimer);
    meteorSpawnTimer = null;
  }
  
  // Parar powerup manager
  window.powerupManager.stop();
  
  // Parar todos os sons
  Object.values(sounds).forEach(sound => {
    sound.pause();
    sound.currentTime = 0;
  });

  // Mostrar texto de Game Over e pontuação
  const gameOverText = document.querySelector('.game-over-text');
  gameOverText.innerHTML = `GAME OVER<br><span class="final-score">${score} pontos</span>`;
  gameOverText.style.opacity = '1';

  // Tocar som de game over
  sounds.gameOver.play();

  // Atualizar interface
  document.getElementById("startBtn").style.display = "inline-block";
  document.getElementById("pauseBtn").style.display = "none";
  document.getElementById("restartBtn").style.display = "none";

  // Salvar pontuação e atualizar ranking
  saveScore(score);
  loadRanking();
  
  // Reiniciar música do menu
  sounds.menuMusic.play();
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

// Adicionar no início do arquivo, após as declarações iniciais
window.onload = function() {
  // Mostrar o ranking no menu inicial
  document.getElementById("ranking").style.display = "block";
  // ... rest of onload function if any ...
};

// Adicionar após as declarações iniciais
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let joystickActive = false;
let joystickAngle = 0;

// Função para inicializar controles móveis
function initMobileControls() {
  if (!isMobile) return;

  // Mostrar controles móveis
  document.getElementById('mobileControls').style.display = 'flex';

  // Configurar joystick
  const joystickArea = document.getElementById('joystickArea');
  const joystick = document.getElementById('joystick');
  let joystickStartX = 0;
  let joystickStartY = 0;

  joystickArea.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joystickActive = true;
    const touch = e.touches[0];
    const rect = joystickArea.getBoundingClientRect();
    joystickStartX = rect.left + rect.width / 2;
    joystickStartY = rect.top + rect.height / 2;
    updateJoystick(touch.clientX, touch.clientY);
    joystick.classList.add('active');
  });

  joystickArea.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;
    e.preventDefault();
    const touch = e.touches[0];
    updateJoystick(touch.clientX, touch.clientY);
  });

  joystickArea.addEventListener('touchend', (e) => {
    e.preventDefault();
    joystickActive = false;
    joystick.style.transform = 'translate(-50%, -50%)';
    joystick.classList.remove('active');
    joystickAngle = 0;
  });

  function updateJoystick(touchX, touchY) {
    const dx = touchX - joystickStartX;
    const dy = touchY - joystickStartY;
    const distance = Math.min(60, Math.sqrt(dx * dx + dy * dy));
    joystickAngle = Math.atan2(dy, dx);
    
    const moveX = Math.cos(joystickAngle) * distance;
    const moveY = Math.sin(joystickAngle) * distance;
    
    joystick.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
  }

  // Configurar botões de movimento
  const movementButtons = {
    'upBtn': 'w',
    'leftBtn': 'a',
    'rightBtn': 'd',
    'downBtn': 's'
  };

  Object.entries(movementButtons).forEach(([btnId, key]) => {
    const btn = document.getElementById(btnId);
    
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      keys[key] = true;
    });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      keys[key] = false;
    });
  });

  // Adicionar evento de toque para atirar
  canvas.addEventListener('touchstart', (e) => {
    if (!isGameRunning || isPaused) return;
    e.preventDefault();
    
    // Usar o ângulo do joystick para atirar
    if (joystickActive) {
      angle = joystickAngle;
    }
    
    // Verificar se o powerup de tiro triplo está ativo
    if (powerupManager.isPowerupActive('triple_shot')) {
      // Tiro central
      bullets.push({
        x: player.x + Math.cos(angle) * bulletOffset,
        y: player.y + Math.sin(angle) * bulletOffset,
        dx: Math.cos(angle) * 10,
        dy: Math.sin(angle) * 10,
        radius: bulletRadius,
        angle: angle,
        damage: powerupManager.isPowerupActive('big_bullet') ? 3 : 1
      });
      
      // Tiro esquerdo (15 graus)
      const leftAngle = angle - Math.PI/20;
      bullets.push({
        x: player.x + Math.cos(leftAngle) * bulletOffset,
        y: player.y + Math.sin(leftAngle) * bulletOffset,
        dx: Math.cos(leftAngle) * 10,
        dy: Math.sin(leftAngle) * 10,
        radius: bulletRadius,
        angle: leftAngle,
        damage: powerupManager.isPowerupActive('big_bullet') ? 3 : 1
      });
      
      // Tiro direito (15 graus)
      const rightAngle = angle + Math.PI/20;
      bullets.push({
        x: player.x + Math.cos(rightAngle) * bulletOffset,
        y: player.y + Math.sin(rightAngle) * bulletOffset,
        dx: Math.cos(rightAngle) * 10,
        dy: Math.sin(rightAngle) * 10,
        radius: bulletRadius,
        angle: rightAngle,
        damage: powerupManager.isPowerupActive('big_bullet') ? 3 : 1
      });
    } else {
      // Tiro normal
      bullets.push({
        x: player.x + Math.cos(angle) * bulletOffset,
        y: player.y + Math.sin(angle) * bulletOffset,
        dx: Math.cos(angle) * 10,
        dy: Math.sin(angle) * 10,
        radius: bulletRadius,
        angle: angle,
        damage: powerupManager.isPowerupActive('big_bullet') ? 3 : 1
      });
    }
    
    // Tocar som do tiro
    sounds.shoot.currentTime = 0;
    sounds.shoot.play();
  });
}

// Chamar a função de inicialização quando o jogo começar
window.onload = function() {
  initMobileControls();
  // Mostrar o ranking no menu inicial
  document.getElementById("ranking").style.display = "block";
};

// Adicionar após as declarações iniciais
window.addEventListener("orientationchange", () => {
  if (window.orientation === 0 || window.orientation === 180) {
    console.log("Dispositivo em modo retrato");
  } else {
    console.log("Dispositivo em modo paisagem");
  }
});

// Verificar orientação inicial
if (window.orientation === 0 || window.orientation === 180) {
  console.log("Dispositivo iniciou em modo retrato");
}

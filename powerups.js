// Carregamento das imagens dos powerups
const powerupImgs = {
    triple_shot: new Image(),
    big_bullet: new Image(),
    speed_boost: new Image()
};

powerupImgs.triple_shot.src = "powerup_triple.png";
powerupImgs.big_bullet.src = "powerup_big.png";
powerupImgs.speed_boost.src = "powerup_speed.png"; // Você precisará adicionar esta imagem

// Aguardar o carregamento das imagens
Object.entries(powerupImgs).forEach(([type, img]) => {
    img.onload = () => {
        console.log(`Imagem do powerup ${type} carregada`);
    };
});

class PowerupManager {
    constructor() {
        console.log("PowerupManager sendo construído");
        this.powerups = [];
        this.activePowerups = new Map(); // Mapa para controlar powerups ativos
        this.spawnInterval = null;
        this.powerupTypes = ['triple_shot', 'big_bullet', 'speed_boost'];
    }

    start() {
        console.log("Iniciando powerup manager");
        // Iniciar spawn de powerups a cada 7 segundos
        this.spawnInterval = setInterval(() => this.spawnPowerup(), 7000);
    }

    stop() {
        console.log("Parando powerup manager");
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
        }
        this.powerups = [];
        this.activePowerups.clear();
    }

    spawnPowerup() {
        console.log("Spawnando powerup");
        // Escolher aleatoriamente entre os tipos de powerup
        const randomType = this.powerupTypes[Math.floor(Math.random() * this.powerupTypes.length)];
        console.log("Tipo de powerup escolhido:", randomType);

        // Criar powerup em posição aleatória
        const powerup = {
            x: Math.random() * (canvas.width - 120) + 60,
            y: Math.random() * (canvas.height - 120) + 60,
            radius: 30,
            type: randomType,
            createdAt: Date.now()
        };

        this.powerups.push(powerup);
        console.log("Powerup criado em:", powerup.x, powerup.y);
        console.log("Total de powerups:", this.powerups.length);

        // Remover powerup após 4 segundos
        setTimeout(() => {
            const index = this.powerups.indexOf(powerup);
            if (index > -1) {
                this.powerups.splice(index, 1);
                console.log("Powerup removido. Total restante:", this.powerups.length);
            }
        }, 4000);
    }

    update() {
        // Desenhar powerups
        this.powerups.forEach(powerup => {
            ctx.save();
            // Desenhar a imagem do powerup
            const img = powerupImgs[powerup.type];
            if (img) {
                ctx.drawImage(
                    img,
                    powerup.x - powerup.radius,
                    powerup.y - powerup.radius,
                    powerup.radius * 2,
                    powerup.radius * 2
                );
            }
            ctx.restore();
        });

        // Verificar colisões com o player
        this.powerups.forEach((powerup, index) => {
            const dist = Math.hypot(powerup.x - player.x, powerup.y - player.y);
            if (dist < powerup.radius + player.radius) {
                console.log("Powerup coletado:", powerup.type);
                this.activatePowerup(powerup.type);
                this.powerups.splice(index, 1);
            }
        });

        // Atualizar powerups ativos
        this.updateActivePowerups();
    }

    activatePowerup(type) {
        if (type === 'triple_shot') {
            console.log("Ativando tiro triplo");
            this.activePowerups.set('triple_shot', {
                expiresAt: Date.now() + 5000 // 5 segundos
            });
        } else if (type === 'big_bullet') {
            console.log("Ativando bala grande");
            this.activePowerups.set('big_bullet', {
                expiresAt: Date.now() + 5000 // 5 segundos
            });
        } else if (type === 'speed_boost') {
            console.log("Ativando velocidade aumentada");
            this.activePowerups.set('speed_boost', {
                expiresAt: Date.now() + 5000 // 5 segundos
            });
        }
    }

    updateActivePowerups() {
        const now = Date.now();
        for (const [type, powerup] of this.activePowerups.entries()) {
            if (now >= powerup.expiresAt) {
                console.log("Powerup expirado:", type);
                this.activePowerups.delete(type);
            }
        }
    }

    isPowerupActive(type) {
        return this.activePowerups.has(type);
    }
}

// Criar e exportar a instância do gerenciador de powerups
console.log("Criando instância do PowerupManager");
window.powerupManager = new PowerupManager();
console.log("PowerupManager criado e disponível globalmente"); 
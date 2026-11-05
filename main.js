// --- ИНИЦИАЛИЗАЦИЯ И НАСТРОЙКИ КАНВАСА ---
const container = document.getElementById('game-container');
const canvas = document.createElement('canvas');
canvas.id = 'gameCanvas';
canvas.width = 950;
canvas.height = 550;
container.insertBefore(canvas, container.firstChild);

const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

// Глобальное состояние игры
const game = {
    gold: 100,
    goldPerSecond: 10,
    lastGoldUpdate: 0,
    isPaused: false,
    zoom: 1.3,
    cameraX: 0,
    isDragging: false,
    startX: 0,
    playerBase: { x: 50, hp: 1000, maxHp: 1000, size: 90 },
    enemyBase: { x: 1950, hp: 1000, maxHp: 1000, size: 90 },
    playerUnits: [],
    enemyUnits: [],
    particles: [],
    gameOver: false,
    victory: false
};

// --- МЕНЕДЖЕР СПРАЙТОВ ---
const spriteAssets = {
    idle: { src: 'sprites/sniper/idle.png', img: new Image(), frames: 60 },
    walk: { src: 'sprites/sniper/walk.png', img: new Image(), frames: 43 },
    attack: { src: 'sprites/sniper/attack.png', img: new Image(), frames: 90 },
    death: { src: 'sprites/sniper/death.png', img: new Image(), frames: 73 }
};

const SNIPER_CONFIG = {
    frameWidth: 225,   // Точный размер кадра под ваши 35%-е файлы
    frameHeight: 246,  
    renderWidth: 120,  
    renderHeight: 130, 
    animFPS: 30,
    shotFrames: [49, 73, 85]
};

// Загрузка картинок в память браузера
for (let key in spriteAssets) {
    spriteAssets[key].img.src = spriteAssets[key].src;
}

// --- КЛАСС ЮНИТА СНАЙПЕРШИ ---
class Unit {
    constructor(isEnemy) {
        this.isEnemy = isEnemy;
        this.y = 480; 
        this.x = isEnemy ? game.enemyBase.x - 60 : game.playerBase.x + 60;
        
        this.hp = 120;
        this.maxHp = 120;
        this.speed = isEnemy ? -1.2 : 1.2;
        this.range = 500; 
        this.damage = 25;
        this.goldReward = 30;
        
        this.state = 'walk';
        this.currentFrame = 2; 
        this.frameTimer = 0;
        this.isReversing = false;
        this.attackPauseTimer = 0;
        this.isDead = false;
    }

    update(deltaTime) {
        if (this.state === 'death') {
            this.animate(deltaTime);
            if (this.currentFrame >= spriteAssets.death.frames - 1) this.isDead = true;
            return;
        }

        let target = this.findTarget();

        if (target) {
            if (this.state !== 'attack') {
                this.state = 'attack';
                this.currentFrame = 0;
                this.isReversing = false;
                this.attackPauseTimer = 0;
            }
            this.handleAttackLogic(target, deltaTime);
        } else {
            // Мгновенный выход из реверса атаки на 40-м кадре в ходьбу
            if (this.state === 'attack' && this.isReversing && this.currentFrame === 40) {
                this.state = 'walk';
                this.currentFrame = 2;
                return;
            }
            
            if (this.state === 'attack') {
                this.animate(deltaTime);
                return;
            }

            this.state = 'walk';
            this.applySoftCollisions();
            this.x += this.speed;
            this.animate(deltaTime);
        }
    }

    animate(deltaTime) {
        const frameDuration = 1000 / SNIPER_CONFIG.animFPS;
        this.frameTimer += deltaTime;

        if (this.frameTimer >= frameDuration) {
            this.frameTimer = 0;

            if (this.state === 'walk') {
                this.currentFrame++;
                if (this.currentFrame >= spriteAssets.walk.frames) this.currentFrame = 2; 
            } 
            else if (this.state === 'idle') {
                // Пинг-понг покоя от 40 кадра до конца
                if (!this.isReversing) {
                    this.currentFrame++;
                    if (this.currentFrame >= spriteAssets.idle.frames) {
                        this.currentFrame = spriteAssets.idle.frames - 1;
                        this.isReversing = true;
                    }
                } else {
                    this.currentFrame--;
                    if (this.currentFrame <= 40) this.isReversing = false;
                }
            } 
            else if (this.state === 'death') {
                if (this.currentFrame < spriteAssets.death.frames - 1) this.currentFrame++;
            }
        }
    }
    handleAttackLogic(target, deltaTime) {
        if (this.attackPauseTimer > 0) {
            this.attackPauseTimer -= deltaTime;
            this.state = 'idle'; 
            this.animate(deltaTime);
            return;
        }

        this.state = 'attack';
        const frameDuration = 1000 / SNIPER_CONFIG.animFPS;
        this.frameTimer += deltaTime;

        if (this.frameTimer >= frameDuration) {
            this.frameTimer = 0;

            if (!this.isReversing) {
                this.currentFrame++;
                if (SNIPER_CONFIG.shotFrames.includes(this.currentFrame)) {
                    this.fireHitscan(target);
                }
                if (this.currentFrame >= spriteAssets.attack.frames) {
                    this.isReversing = true;
                }
            } else {
                this.currentFrame--;
                if ((this.currentFrame === 73 || this.currentFrame === 49)) {
                    this.fireHitscan(target);
                }
                if (this.currentFrame <= 0) {
                    this.isReversing = false;
                    this.attackPauseTimer = 1500; 
                }
            }
        }
    }

    fireHitscan(target) {
        let flashX = this.isEnemy ? this.x - 55 : this.x + 55;
        let flashY = this.y - 42; 
        createMuzzleFlash(flashX, flashY, this.isEnemy);
        
        if (target.takeDamage) target.takeDamage(this.damage);
        else target.hp = Math.max(0, target.hp - this.damage);
    }

    applySoftCollisions() {
        let allies = this.isEnemy ? game.enemyUnits : game.playerUnits;
        allies.forEach(ally => {
            if (ally === this || ally.state === 'death') return;
            let dist = Math.abs(this.x - ally.x);
            if (dist < 28) {
                this.x += this.isEnemy ? 0.4 : -0.4; 
            }
        });
    }

    findTarget() {
        let targets = this.isEnemy ? game.playerUnits : game.enemyUnits;
        let baseTarget = this.isEnemy ? game.playerBase : game.enemyBase;
        let closestUnit = null;
        let minDistance = this.range;

        for (let unit of targets) {
            if (unit.state === 'death') continue;
            let dist = this.isEnemy ? (this.x - unit.x) : (unit.x - this.x);
            if (dist > 0 && dist < minDistance) {
                minDistance = dist;
                closestUnit = unit;
            }
        }
        if (closestUnit) return closestUnit;

        let distToBase = this.isEnemy ? (this.x - baseTarget.x) : (baseTarget.x - this.x);
        if (distToBase <= this.range + baseTarget.size / 2) return baseTarget;
        return null;
    }

    takeDamage(amount) {
        if (this.state === 'death') return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.state = 'death';
            this.currentFrame = 0;
            if (this.isEnemy) game.gold += this.goldReward;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y - SNIPER_CONFIG.renderHeight / 2));
        if (this.isEnemy) ctx.scale(-1, 1);

        const currentAsset = spriteAssets[this.state];
        if (currentAsset.img.complete && currentAsset.img.width > 0) {
            ctx.drawImage(
                currentAsset.img,
                this.currentFrame * SNIPER_CONFIG.frameWidth, 0,
                SNIPER_CONFIG.frameWidth, SNIPER_CONFIG.frameHeight,
                -SNIPER_CONFIG.renderWidth / 2, -SNIPER_CONFIG.renderHeight / 2,
                SNIPER_CONFIG.renderWidth, SNIPER_CONFIG.renderHeight
            );
        } else {
            ctx.fillStyle = this.isEnemy ? '#e74c3c' : '#ffffff';
            ctx.fillRect(-15, -40, 30, 80);
        }
        ctx.restore();
        if (this.state !== 'death') this.drawHealthBar();
    }

    drawHealthBar() {
        let barW = 25;
        let barH = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(this.x - barW/2, this.y - 75, barW, barH);
        ctx.fillStyle = this.isEnemy ? '#e74c3c' : '#ffffff'; 
        ctx.fillRect(this.x - barW/2, this.y - 75, barW * (this.hp / this.maxHp), barH);
    }
}

// --- ЭФФЕКТЫ ВСПЫШЕК ЧАСТИЦ ---
function createMuzzleFlash(x, y, isEnemy) {
    for(let i=0; i<6; i++) {
        game.particles.push({
            x: x, y: y,
            vx: isEnemy ? -Math.random()*4 - 2 : Math.random()*4 + 2,
            vy: (Math.random() - 0.5) * 3,
            alpha: 1, color: '#ffaa00', size: Math.random()*3 + 2
        });
    }
}

// --- ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ ---
let lastTime = 0;
let enemySpawnTimer = 0;

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (!game.gameOver && !game.isPaused) {
        if (timestamp - game.lastGoldUpdate >= 1000) {
            game.gold += game.goldPerSecond;
            game.lastGoldUpdate = timestamp;
        }

        enemySpawnTimer += deltaTime;
        if (enemySpawnTimer >= 8000) {
            enemySpawnTimer = 0;
            if (game.enemyUnits.length < 10) {
                game.enemyUnits.push(new Unit(true));
            }
        }

        game.playerUnits.forEach(u => u.update(deltaTime));
        game.enemyUnits.forEach(u => u.update(deltaTime));
        
        game.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.alpha -= 0.04; });
        game.particles = game.particles.filter(p => p.alpha > 0);

        game.playerUnits = game.playerUnits.filter(u => !u.isDead);
        game.enemyUnits = game.enemyUnits.filter(u => !u.isDead);

        if (game.playerBase.hp <= 0) { game.gameOver = true; game.victory = false; }
        if (game.enemyBase.hp <= 0) { game.gameOver = true; game.victory = true; }

        document.getElementById('gold-val').innerText = game.gold;
        document.getElementById('hp-p-val').innerText = game.playerBase.hp;
        document.getElementById('hp-e-val').innerText = game.enemyBase.hp;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(game.zoom, game.zoom);
    ctx.translate(game.cameraX, 0);

    ctx.fillStyle = '#34495e'; ctx.fillRect(game.playerBase.x - 45, 480 - 90, 90, 90);
    ctx.fillStyle = '#7f8c8d'; ctx.fillRect(game.enemyBase.x - 45, 480 - 90, 90, 90);
    ctx.fillStyle = '#27ae60'; ctx.fillRect(-500, 480, 3000, 70);

    game.playerUnits.forEach(u => u.draw());
    game.enemyUnits.forEach(u => u.draw());
    game.particles.forEach(p => {
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size); ctx.restore();
    });

    ctx.restore();

    if (game.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '40px Impact';
        ctx.textAlign = 'center';
        ctx.fillText(game.victory ? "ПОБЕДА!" : "ВЫ ПРОИГРАЛИ!", canvas.width/2, canvas.height/2);
    }

    requestAnimationFrame(gameLoop);
}

// --- УПРАВЛЕНИЕ МЫШЬЮ ---
window.addEventListener('wheel', (e) => {
    game.zoom = Math.max(1.0, Math.min(2.0, game.zoom - e.deltaY * 0.001));
});
canvas.addEventListener('mousedown', (e) => { game.isDragging = true; game.startX = e.clientX - game.cameraX; });
window.addEventListener('mousemove', (e) => { if (game.isDragging) game.cameraX = e.clientX - game.startX; });
window.addEventListener('mouseup', () => { game.isDragging = false; });

// --- UI КНОПКИ ---
document.getElementById('spawn-sniper-btn').addEventListener('click', () => {
    if (game.gold >= 50 && !game.gameOver) {
        game.gold -= 50;
        game.playerUnits.push(new Unit(false));
    }
});

document.getElementById('pause-btn').addEventListener('click', () => {
    game.isPaused = !game.isPaused;
    document.getElementById('pause-btn').innerText = game.isPaused ? "Старт" : "Пауза";
});

requestAnimationFrame(gameLoop);

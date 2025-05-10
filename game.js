// 获取画布和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// 资源加载管理
const resources = {
    playerImg: 'tu/0.jpg',
    monsterImg: 'tu/1.jpg',
    bossImg: 'tu/5.jpg',
    miniBoss1Img: 'tu/2.jpg',
    miniBoss2Img: 'tu/3.jpg',
    miniBoss3Img: 'tu/4.jpg'
};

let loadedImages = 0;
const totalImages = Object.keys(resources).length;
let retryCount = 0;
const maxRetries = 3;

// 加载状态显示
function updateLoadingStatus(status) {
    const loading = document.getElementById('loading');
    loading.textContent = status;
}

// 重试加载
function retryLoading() {
    retryCount++;
    loadedImages = 0;
    updateLoadingStatus(`加载失败，第${retryCount}次重试中...`);
    
    if (retryCount <= maxRetries) {
        loadAllResources();
    } else {
        updateLoadingStatus('资源加载失败，请刷新页面重试');
        // 添加刷新按钮
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = '点击刷新';
        refreshBtn.style.marginTop = '10px';
        refreshBtn.style.padding = '5px 10px';
        refreshBtn.onclick = () => window.location.reload();
        document.getElementById('loading').appendChild(refreshBtn);
    }
}

// 加载单个图片
function loadImage(key, src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            loadedImages++;
            updateLoadingStatus(`正在加载...${Math.floor(loadedImages/totalImages*100)}%`);
            resolve(img);
        };
        img.onerror = () => {
            console.error(`图片加载失败: ${src}`);
            reject(new Error(`Failed to load ${src}`));
        };
        img.src = src + '?t=' + new Date().getTime(); // 防止缓存
    });
}

// 加载所有资源
async function loadAllResources() {
    try {
        const loadPromises = Object.entries(resources).map(([key, src]) => 
            loadImage(key, src)
                .then(img => window[key] = img)
        );
        
        await Promise.all(loadPromises);
        updateLoadingStatus('加载完成！');
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            startGame();
        }, 500);
    } catch (error) {
        console.error('资源加载失败:', error);
        retryLoading();
    }
}

// 初始化游戏
window.addEventListener('load', () => {
    updateLoadingStatus('正在加载资源...');
    loadAllResources();
});

// 检测网络状态
window.addEventListener('online', () => {
    if (!gameStarted && retryCount > 0) {
        updateLoadingStatus('网络已连接，重新加载中...');
        retryCount = 0;
        loadAllResources();
    }
});

window.addEventListener('offline', () => {
    if (!gameStarted) {
        updateLoadingStatus('网络已断开，请检查网络连接');
    }
});

// 设置画布大小为屏幕大小
function resizeCanvas() {
    const screenWidth = window.innerWidth || document.documentElement.clientWidth;
    const screenHeight = window.innerHeight || document.documentElement.clientHeight;
    const scale = Math.min(screenWidth / 800, screenHeight / 600);
    
    canvas.width = Math.min(800, screenWidth);
    canvas.height = Math.min(600, screenHeight);
    
    // 更新玩家初始位置
    if (!player.initialized) {
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - player.height - 20;
        player.initialized = true;
    }
}

// 设备检测
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// 游戏配置
const gameConfig = {
    difficulty: 1,
    playerSpeed: 5,
    bulletSpeed: 7,
    monsterSpeed: 2,
    bossSpeed: 2,
    shootInterval: 250,
    monsterSpawnInterval: 1000,
    powerUpChance: 0.1, // 道具出现概率
    scoreMultiplier: 1
};

// 游戏状态
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameOver = false;
let lastShootTime = 0;
let gameStarted = false;
let isPaused = false;
let powerUps = [];

// 道具类型
const PowerUpTypes = {
    SPEED_UP: 'speed',      // 速度提升
    DOUBLE_SCORE: 'score',  // 双倍分数
    SHIELD: 'shield',       // 护盾
    RAPID_FIRE: 'rapid',    // 快速射击
    MULTI_SHOT: 'multi',    // 多重射击
    LASER: 'laser',         // 激光武器
    BOMB: 'bomb',          // 清屏炸弹
    HEALTH: 'health',      // 生命恢复
    MAGNET: 'magnet',      // 吸引道具
    MINI_DRONE: 'drone'    // 协助无人机
};

// 玩家状态效果
const playerEffects = {
    speedUp: 0,
    doubleScore: 0,
    shield: 0,
    rapidFire: 0,
    multiShot: 0,
    laser: 0,
    magnet: 0,
    drone: 0
};

// 玩家飞机
const player = {
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    speed: gameConfig.playerSpeed,
    lives: 3,
    score: 0,
    invincible: false,
    shieldActive: false,
    initialized: false,
    drones: [],
    magnetRange: 150,
    
    draw() {
        ctx.save();
        if (this.invincible) {
            ctx.globalAlpha = 0.5;
        }
        if (this.shieldActive) {
            ctx.beginPath();
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 
                   this.width/2 + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 绘制磁场范围
        if (playerEffects.magnet) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 
                   this.magnetRange, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 绘制无人机
        this.drones.forEach(drone => {
            ctx.drawImage(playerImg, drone.x, drone.y, 20, 20);
        });
        
        ctx.drawImage(playerImg, this.x, this.y, this.width, this.height);
        ctx.restore();
        
        // 绘制生命值
        for (let i = 0; i < this.lives; i++) {
            ctx.drawImage(playerImg, 10 + i * 30, 40, 20, 20);
        }
    },
    hit() {
        if (this.invincible) return false;
        this.lives--;
        if (this.lives <= 0) {
            gameOver = true;
            return true;
        }
        // 被击中后短暂无敌
        this.invincible = true;
        setTimeout(() => {
            this.invincible = false;
        }, 2000);
        return false;
    }
};

// 子弹数组
let bullets = [];

// 怪兽数组
let monsters = [];

// 特效系统
const effects = {
    particles: [],
    trails: [],
    shockwaves: []
};

// 粒子效果
class Particle {
    constructor(x, y, color, type = 'normal') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.size = Math.random() * 3 + 2;
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = (Math.random() - 0.5) * 8;
        this.life = 1.0; // 生命值从1递减到0
        this.decay = Math.random() * 0.02 + 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        
        if (this.type === 'boss') {
            this.speedY += 0.1; // 添加重力效果
            this.size *= 0.95; // 逐渐缩小
        }
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        
        if (this.type === 'boss') {
            // 发光效果
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 尾迹效果
class Trail {
    constructor(x, y, color) {
        this.points = [{x, y}];
        this.color = color;
        this.life = 1.0;
        this.decay = 0.05;
    }

    addPoint(x, y) {
        this.points.push({x, y});
        if (this.points.length > 10) {
            this.points.shift();
        }
    }

    update() {
        this.life -= this.decay;
    }

    draw() {
        if (this.points.length < 2) return;
        
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        
        for (let i = 1; i < this.points.length; i++) {
            const p0 = this.points[i - 1];
            const p1 = this.points[i];
            const xc = (p0.x + p1.x) / 2;
            const yc = (p0.y + p1.y) / 2;
            ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
        }
        
        ctx.stroke();
        ctx.restore();
    }
}

// 冲击波效果
class Shockwave {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 1;
        this.maxRadius = 50;
        this.life = 1.0;
        this.expandSpeed = 3;
    }

    update() {
        this.radius += this.expandSpeed;
        this.life = 1 - (this.radius / this.maxRadius);
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3 * this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// 小BOSS类
class MiniBoss {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 70;
        this.height = 70;
        this.health = 50;
        this.type = type; // 1, 2, 或 3
        this.speed = 3;
        this.shootInterval = 800;
        this.lastShoot = 0;
        this.movePattern = Math.random() * Math.PI * 2; // 随机初始移动角度
    }

    draw() {
        ctx.save();
        // 发光效果
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.getColor();
        
        const img = window[`miniBoss${this.type}Img`];
        ctx.drawImage(img, this.x, this.y, this.width, this.height);
        
        // 渐变血条
        const healthBarWidth = this.width * (this.health / 50);
        const gradient = ctx.createLinearGradient(this.x, this.y - 10, 
            this.x + healthBarWidth, this.y - 10);
        gradient.addColorStop(0, this.getColor());
        gradient.addColorStop(1, '#ffffff');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y - 10, healthBarWidth, 5);
        ctx.restore();
    }

    getColor() {
        switch(this.type) {
            case 1: return '#ff4444';
            case 2: return '#44ff44';
            case 3: return '#4444ff';
            default: return '#ffffff';
        }
    }

    update() {
        // 不同类型的小BOSS有不同的移动模式
        switch(this.type) {
            case 1: // 圆形移动
                this.movePattern += 0.02;
                this.x += Math.cos(this.movePattern) * this.speed;
                this.y += Math.sin(this.movePattern) * this.speed;
                break;
            case 2: // Z字形移动
                this.x += Math.cos(Date.now() / 1000) * this.speed;
                this.y += this.speed * 0.5;
                break;
            case 3: // 追踪玩家
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * this.speed * 0.5;
                this.y += Math.sin(angle) * this.speed * 0.5;
                break;
        }

        // 确保小BOSS不会移出屏幕
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));

        // 发射子弹
        const now = Date.now();
        if (now - this.lastShoot > this.shootInterval) {
            this.shoot();
            this.lastShoot = now;
        }
    }

    shoot() {
        switch(this.type) {
            case 1: // 散射
                for (let i = -1; i <= 1; i++) {
                    bossBullets.push({
                        x: this.x + this.width/2,
                        y: this.y + this.height,
                        width: 8,
                        height: 20,
                        speed: 6,
                        angle: i * Math.PI/6
                    });
                }
                break;
            case 2: // 快速单发
                bossBullets.push({
                    x: this.x + this.width/2,
                    y: this.y + this.height,
                    width: 8,
                    height: 20,
                    speed: 8,
                    angle: 0
                });
                break;
            case 3: // 追踪弹
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const angle = Math.atan2(dy, dx);
                bossBullets.push({
                    x: this.x + this.width/2,
                    y: this.y + this.height,
                    width: 8,
                    height: 20,
                    speed: 5,
                    angle: angle
                });
                break;
        }
    }
}

// 添加小BOSS数组
let miniBosses = [];

// 修改BOSS类
const boss = {
    x: 0,
    y: -100,
    width: 100,
    height: 100,
    health: 100,
    active: false,
    speed: 2,
    shootInterval: 1000,
    lastShoot: 0,
    defeated: false,
    draw() {
        if (!this.active) return;
        
        ctx.save();
        // 发光效果
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff0000';
        ctx.drawImage(bossImg, this.x, this.y, this.width, this.height);
        
        // 绘制血条
        const healthBarWidth = this.width * (this.health / 100);
        const gradient = ctx.createLinearGradient(this.x, this.y - 10, 
            this.x + healthBarWidth, this.y - 10);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(1, '#ff6666');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y - 10, healthBarWidth, 5);
        ctx.restore();
    },
    shoot() {
        if (!this.active) return;
        const now = Date.now();
        if (now - this.lastShoot > this.shootInterval) {
            this.lastShoot = now;
            bossBullets.push({
                x: this.x + this.width / 2,
                y: this.y + this.height,
                width: 8,
                height: 20,
                speed: 5
            });
        }
    },
    reset() {
        this.health = 100;
        this.active = false;
        this.defeated = false;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = -100;
        miniBosses = []; // 清空小BOSS数组
    }
};

// BOSS子弹数组
let bossBullets = [];

// 控制状态
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false
};

// 监听键盘事件
window.addEventListener('keydown', (e) => {
    if (e.code in keys) {
        keys[e.code] = true;
        e.preventDefault();
    }
    
    // 空格键开始游戏
    if (e.code === 'Space' && !gameStarted && !isMobile) {
        gameStarted = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code in keys) {
        keys[e.code] = false;
    }
});

// 开始游戏函数
function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    
    // 监听屏幕大小变化
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // 开始游戏循环
    gameLoop();
    
    // 创建怪兽定时器
    setInterval(createMonster, 1000);
}

// 创建怪兽
function createMonster() {
    if (gameOver) return;
    
    const monster = {
        x: Math.random() * (canvas.width - 40),
        y: -40,
        width: 40,
        height: 40,
        draw() {
            ctx.drawImage(monsterImg, this.x, this.y, this.width, this.height);
        }
    };
    monsters.push(monster);
}

// 发射子弹
function shoot() {
    const currentTime = Date.now();
    if (currentTime - lastShootTime < gameConfig.shootInterval) return;
    
    lastShootTime = currentTime;
    
    // 创建主武器子弹
    createBullet(player.x + player.width/2 - 2.5, player.y);
    
    // 多重射击
    if (playerEffects.multiShot) {
        createBullet(player.x + player.width/2 - 2.5, player.y, -0.3);
        createBullet(player.x + player.width/2 - 2.5, player.y, 0.3);
    }
    
    // 激光武器
    if (playerEffects.laser) {
        createLaser();
    }
    
    // 无人机射击
    player.drones.forEach(drone => {
        createBullet(drone.x + 10, drone.y);
    });
    
    playShootSound();
}

// 简单的音效系统
function playShootSound() {
    const oscillator = new (window.AudioContext || window.webkitAudioContext)().createOscillator();
    const gainNode = oscillator.context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(oscillator.context.destination);
    oscillator.type = 'square';
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.1;
    oscillator.start();
    setTimeout(() => oscillator.stop(), 50);
}

// 检测碰撞
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 创建爆炸效果
function createExplosion(x, y, type = 'normal') {
    const colors = type === 'boss' ? 
        ['#ff0000', '#ff6b6b', '#ff4444'] : 
        ['#ffff00', '#ff8800', '#ff4400'];
    
    // 创建粒子
    for (let i = 0; i < (type === 'boss' ? 30 : 15); i++) {
        effects.particles.push(new Particle(x, y, 
            colors[Math.floor(Math.random() * colors.length)], type));
    }
    
    // 创建冲击波
    effects.shockwaves.push(new Shockwave(x, y, colors[0]));
}

// 重新开始按钮
const restartButton = {
    x: 0,
    y: 0,
    width: 200,
    height: 50,
    draw() {
        if (!gameOver) return;
        
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height / 2 + 100;
        
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('重新开始', canvas.width / 2, this.y + 33);
    },
    isClicked(touchX, touchY) {
        return gameOver &&
               touchX >= this.x && touchX <= this.x + this.width &&
               touchY >= this.y && touchY <= this.y + this.height;
    }
};

// 重置游戏
function resetGame() {
    score = 0;
    gameOver = false;
    bullets = [];
    monsters = [];
    bossBullets = [];
    boss.reset();
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - player.height - 20;
    scoreElement.textContent = '0';
}

// 创建道具
function createPowerUp(x, y) {
    if (Math.random() > gameConfig.powerUpChance) return;
    
    const types = Object.values(PowerUpTypes);
    const type = types[Math.floor(Math.random() * types.length)];
    
    powerUps.push({
        x, y,
        type,
        width: 30,
        height: 30,
        speed: 2,
        draw() {
            ctx.fillStyle = this.getColor();
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 
                   this.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.getIcon(), this.x + this.width/2, 
                        this.y + this.height/2 + 7);
        },
        getColor() {
            switch(this.type) {
                case PowerUpTypes.SPEED_UP: return '#ffff00';
                case PowerUpTypes.DOUBLE_SCORE: return '#00ff00';
                case PowerUpTypes.SHIELD: return '#0000ff';
                case PowerUpTypes.RAPID_FIRE: return '#ff0000';
                case PowerUpTypes.MULTI_SHOT: return '#ff00ff';
                case PowerUpTypes.LASER: return '#00ffff';
                case PowerUpTypes.BOMB: return '#ff8800';
                case PowerUpTypes.HEALTH: return '#ff69b4';
                case PowerUpTypes.MAGNET: return '#ffff00';
                case PowerUpTypes.MINI_DRONE: return '#4169e1';
                default: return '#ffffff';
            }
        },
        getIcon() {
            switch(this.type) {
                case PowerUpTypes.SPEED_UP: return 'S';
                case PowerUpTypes.DOUBLE_SCORE: return '2×';
                case PowerUpTypes.SHIELD: return '🛡️';
                case PowerUpTypes.RAPID_FIRE: return '⚡';
                case PowerUpTypes.MULTI_SHOT: return '3';
                case PowerUpTypes.LASER: return '↟';
                case PowerUpTypes.BOMB: return '💣';
                case PowerUpTypes.HEALTH: return '❤️';
                case PowerUpTypes.MAGNET: return '🧲';
                case PowerUpTypes.MINI_DRONE: return '🤖';
                default: return '?';
            }
        }
    });
}

// 应用道具效果
function applyPowerUp(type) {
    const duration = 5000; // 基础持续时间
    const now = Date.now();
    
    switch(type) {
        case PowerUpTypes.SPEED_UP:
            player.speed = gameConfig.playerSpeed * 1.5;
            playerEffects.speedUp = now + duration;
            break;
        case PowerUpTypes.DOUBLE_SCORE:
            gameConfig.scoreMultiplier = 2;
            playerEffects.doubleScore = now + duration;
            break;
        case PowerUpTypes.SHIELD:
            player.shieldActive = true;
            playerEffects.shield = now + duration;
            break;
        case PowerUpTypes.RAPID_FIRE:
            gameConfig.shootInterval = 125;
            playerEffects.rapidFire = now + duration;
            break;
        case PowerUpTypes.MULTI_SHOT:
            playerEffects.multiShot = now + duration;
            break;
        case PowerUpTypes.LASER:
            playerEffects.laser = now + duration;
            break;
        case PowerUpTypes.BOMB:
            // 清除所有敌人
            monsters.forEach(monster => {
                createExplosion(monster.x + monster.width/2, monster.y + monster.height/2);
                score += 10 * gameConfig.scoreMultiplier;
            });
            monsters = [];
            if (boss.active && boss.health > 0) {
                boss.health -= 50;
                createExplosion(boss.x + boss.width/2, boss.y + boss.height/2);
            }
            scoreElement.textContent = score;
            break;
        case PowerUpTypes.HEALTH:
            if (player.lives < 5) { // 最大5条命
                player.lives++;
            }
            break;
        case PowerUpTypes.MAGNET:
            playerEffects.magnet = now + duration;
            break;
        case PowerUpTypes.MINI_DRONE:
            if (player.drones.length < 2) { // 最多2个无人机
                player.drones.push({
                    x: player.x - 30,
                    y: player.y
                });
                player.drones.push({
                    x: player.x + player.width + 10,
                    y: player.y
                });
            }
            playerEffects.drone = now + duration * 2; // 无人机持续时间更长
            break;
    }
}

// 创建子弹
function createBullet(x, y, angle = 0) {
    const bullet = {
        x: x,
        y: y,
        width: 5,
        height: 15,
        color: playerEffects.laser ? '#00ffff' : '#ffffff',
        angle: angle,
        trail: new Trail(x, y, playerEffects.laser ? '#00ffff' : '#ffffff'),
        draw() {
            ctx.save();
            // 发光效果
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
            
            // 绘制尾迹
            this.trail.draw();
        }
    };
    bullets.push(bullet);
    effects.trails.push(bullet.trail);
}

// 创建激光
function createLaser() {
    ctx.beginPath();
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.moveTo(player.x + player.width/2, player.y);
    ctx.lineTo(player.x + player.width/2, 0);
    ctx.stroke();
    
    // 检测激光碰撞
    monsters.forEach((monster, index) => {
        if (monster.x < player.x + player.width/2 && 
            monster.x + monster.width > player.x + player.width/2) {
            monsters.splice(index, 1);
            createExplosion(monster.x + monster.width/2, monster.y + monster.height/2);
            score += 10 * gameConfig.scoreMultiplier;
            scoreElement.textContent = score;
        }
    });
}

// 更新道具效果
function updatePowerUps() {
    const now = Date.now();
    
    // 更新效果状态
    if (playerEffects.speedUp && now > playerEffects.speedUp) {
        player.speed = gameConfig.playerSpeed;
        playerEffects.speedUp = 0;
    }
    if (playerEffects.doubleScore && now > playerEffects.doubleScore) {
        gameConfig.scoreMultiplier = 1;
        playerEffects.doubleScore = 0;
    }
    if (playerEffects.shield && now > playerEffects.shield) {
        player.shieldActive = false;
        playerEffects.shield = 0;
    }
    if (playerEffects.rapidFire && now > playerEffects.rapidFire) {
        gameConfig.shootInterval = 250;
        playerEffects.rapidFire = 0;
    }
    if (playerEffects.multiShot && now > playerEffects.multiShot) {
        playerEffects.multiShot = 0;
    }
    if (playerEffects.laser && now > playerEffects.laser) {
        playerEffects.laser = 0;
    }
    if (playerEffects.magnet && now > playerEffects.magnet) {
        playerEffects.magnet = 0;
    }
    if (playerEffects.drone && now > playerEffects.drone) {
        player.drones = [];
        playerEffects.drone = 0;
    }
    
    // 更新无人机位置
    player.drones.forEach((drone, index) => {
        const targetX = index === 0 ? player.x - 30 : player.x + player.width + 10;
        drone.x += (targetX - drone.x) * 0.1;
        drone.y = player.y;
    });
    
    // 磁铁效果：吸引道具
    if (playerEffects.magnet) {
        powerUps.forEach(powerUp => {
            const dx = (player.x + player.width/2) - (powerUp.x + powerUp.width/2);
            const dy = (player.y + player.height/2) - (powerUp.y + powerUp.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player.magnetRange) {
                powerUp.x += dx * 0.1;
                powerUp.y += dy * 0.1;
            }
        });
    }
    
    // 更新道具位置和碰撞检测
    powerUps = powerUps.filter(powerUp => {
        powerUp.y += powerUp.speed;
        
        if (checkCollision(powerUp, player)) {
            applyPowerUp(powerUp.type);
            return false;
        }
        
        return powerUp.y < canvas.height;
    });
}

// 在怪物被击败时创建道具
function onMonsterDefeat(x, y) {
    createPowerUp(x, y);
    score += 10 * gameConfig.scoreMultiplier;
    scoreElement.textContent = score;
    
    // 更新最高分
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
}

// 更新游戏状态
function update() {
    if (gameOver || !gameStarted || isPaused) return;
    
    // 更新特效
    effects.particles = effects.particles.filter(particle => {
        particle.update();
        return particle.life > 0;
    });
    
    effects.trails = effects.trails.filter(trail => {
        trail.update();
        return trail.life > 0;
    });
    
    effects.shockwaves = effects.shockwaves.filter(wave => {
        wave.update();
        return wave.life > 0;
    });
    
    // 更新子弹尾迹
    bullets.forEach(bullet => {
        bullet.trail.addPoint(bullet.x + bullet.width/2, 
            bullet.y + bullet.height/2);
    });
    
    bossBullets.forEach(bullet => {
        bullet.trail.addPoint(bullet.x + bullet.width/2, 
            bullet.y + bullet.height/2);
    });

    updatePowerUps();

    // 更新小BOSS
    miniBosses.forEach(miniBoss => miniBoss.update());

    // 检查是否需要激活BOSS
    if (score >= 100 && !boss.active && !boss.defeated) {
        boss.active = true;
        boss.x = canvas.width / 2 - boss.width / 2;
        boss.y = 50;
    }

    // 更新BOSS
    if (boss.active) {
        // BOSS左右移动
        boss.x += Math.sin(Date.now() / 1000) * boss.speed;
        // 确保BOSS不会移出屏幕
        boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
        boss.shoot();
        
        // 更新BOSS子弹
        bossBullets = bossBullets.filter(bullet => {
            bullet.y += bullet.speed;
            
            // 检查是否击中玩家
            if (checkCollision(bullet, player)) {
                if (player.hit()) {
                    createExplosion(player.x + player.width / 2, player.y + player.height / 2);
                }
                return false;
            }
            
            return bullet.y < canvas.height;
        });
    }

    // 更新子弹位置
    bullets = bullets.filter(bullet => {
        bullet.y -= gameConfig.bulletSpeed;
        
        // 检查是否击中BOSS
        if (boss.active && checkCollision(bullet, boss)) {
            boss.health -= 10;
            createExplosion(bullet.x, bullet.y);
            if (boss.health <= 0 && !boss.defeated) {
                boss.defeated = true;
                boss.active = false;
                score += 50;
                scoreElement.textContent = score;
                createExplosion(boss.x + boss.width/2, boss.y + boss.height/2);
                
                // 生成三个小BOSS
                for (let i = 1; i <= 3; i++) {
                    miniBosses.push(new MiniBoss(
                        boss.x + (i-2) * boss.width/2,
                        boss.y,
                        i
                    ));
                }
            }
            return false;
        }

        // 检查是否击中小BOSS
        for (let i = miniBosses.length - 1; i >= 0; i--) {
            const miniBoss = miniBosses[i];
            if (checkCollision(bullet, miniBoss)) {
                miniBoss.health -= 10;
                createExplosion(bullet.x, bullet.y);
                if (miniBoss.health <= 0) {
                    miniBosses.splice(i, 1);
                    score += 30;
                    scoreElement.textContent = score;
                    createExplosion(miniBoss.x + miniBoss.width/2, miniBoss.y + miniBoss.height/2);
                }
                return false;
            }
        }
        
        return bullet.y > 0;
    });

    // 更新怪兽位置
    monsters = monsters.filter(monster => {
        monster.y += gameConfig.monsterSpeed;
        
        // 检查与玩家的碰撞
        if (checkCollision(monster, player)) {
            if (player.hit()) {
                createExplosion(player.x + player.width / 2, player.y + player.height / 2);
            }
            return false;
        }

        // 检查与子弹的碰撞
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (checkCollision(monster, bullets[i])) {
                createExplosion(monster.x + monster.width / 2, monster.y + monster.height / 2);
                bullets.splice(i, 1);
                score += 10;
                scoreElement.textContent = score;
                return false;
            }
        }

        return monster.y < canvas.height && !gameOver;
    });

    // 手机端自动射击
    if (isMobile && !gameOver) {
        shoot();
    }
}

// 绘制游戏画面
function draw() {
    // 清空画布
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameStarted) {
        // 显示开始界面
        ctx.fillStyle = '#ffffff';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(isMobile ? '触摸屏幕开始' : '按空格键开始', canvas.width / 2, canvas.height / 2);
        return;
    }

    // 绘制星空背景
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
        const size = Math.random() * 2 + 1;
        const alpha = Math.random() * 0.5 + 0.5;
        ctx.globalAlpha = alpha;
        ctx.fillRect(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            size,
            size
        );
    }
    ctx.globalAlpha = 1;

    // 绘制所有特效
    effects.trails.forEach(trail => trail.draw());
    effects.particles.forEach(particle => particle.draw());
    effects.shockwaves.forEach(wave => wave.draw());

    // 绘制玩家
    player.draw();

    // 绘制子弹
    bullets.forEach(bullet => bullet.draw());
    
    // 绘制BOSS子弹
    bossBullets.forEach(bullet => {
        ctx.save();
        ctx.fillStyle = '#ff0000';
        if (bullet.angle !== undefined) {
            ctx.translate(bullet.x + bullet.width/2, bullet.y + bullet.height/2);
            ctx.rotate(bullet.angle + Math.PI/2);
            ctx.fillRect(-bullet.width/2, -bullet.height/2, bullet.width, bullet.height);
        } else {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
        ctx.restore();
    });

    // 绘制怪兽
    monsters.forEach(monster => monster.draw());
    
    // 绘制BOSS
    boss.draw();

    // 绘制小BOSS
    miniBosses.forEach(miniBoss => miniBoss.draw());

    // 绘制重新开始按钮
    restartButton.draw();

    // 绘制道具
    powerUps.forEach(powerUp => powerUp.draw());

    // 绘制最高分
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`最高分: ${highScore}`, canvas.width - 10, 30);
    
    // 绘制暂停按钮
    if (!gameOver) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(isPaused ? '▶' : '❚❚', canvas.width - 10, 60);
    }

    // 游戏结束显示
    if (gameOver) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束!', canvas.width / 2, canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText('最终得分: ' + score, canvas.width / 2, canvas.height / 2 + 40);
    }
}

// 游戏主循环
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 开始游戏
gameLoop();

// 添加微信特定的触摸事件处理
function getTouchPosition(e, rect) {
    const touch = e.touches[0] || e.changedTouches[0];
    return {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
}

canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!gameStarted) return;
    
    const rect = canvas.getBoundingClientRect();
    const pos = getTouchPosition(e, rect);
    touchX = pos.x;
    
    if (restartButton.isClicked(pos.x, pos.y)) {
        resetGame();
        return;
    }
    
    if (!isShooting) {
        isShooting = true;
        shoot();
        shootingInterval = setInterval(shoot, gameConfig.shootInterval);
    }
}, { passive: false });

canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!gameStarted) return;
    
    const rect = canvas.getBoundingClientRect();
    const pos = getTouchPosition(e, rect);
    
    if (touchX !== null) {
        const deltaX = pos.x - touchX;
        if (deltaX > 0 && player.x < canvas.width - player.width) {
            player.x = Math.min(player.x + player.speed, canvas.width - player.width);
        } else if (deltaX < 0 && player.x > 0) {
            player.x = Math.max(player.x - player.speed, 0);
        }
    }
    touchX = pos.x;
}, { passive: false });

canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    touchX = null;
    
    if (isShooting) {
        isShooting = false;
        clearInterval(shootingInterval);
    }
}, { passive: false });

// 添加暂停功能
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 检查是否点击暂停按钮
    if (x > canvas.width - 40 && y < 70) {
        isPaused = !isPaused;
        if (!isPaused) {
            requestAnimationFrame(gameLoop);
        }
    }
}); 

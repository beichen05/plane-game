// 获取画布和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// 图片加载计数
let loadedImages = 0;
const totalImages = 3; // 增加了BOSS图片

// 加载图片
const playerImg = new Image();
const monsterImg = new Image();
const bossImg = new Image();

// 图片加载处理
function handleImageLoad() {
    loadedImages++;
    if (loadedImages === totalImages) {
        // 所有图片加载完成，开始游戏
        startGame();
    }
}

playerImg.onload = handleImageLoad;
monsterImg.onload = handleImageLoad;
bossImg.onload = handleImageLoad;

// 设置图片源
playerImg.src = 'tu/0.jpg';
monsterImg.src = 'tu/1.jpg';
bossImg.src = 'tu/5.jpg';

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

// 游戏状态
let score = 0;
let gameOver = false;
let lastShootTime = 0;
const shootInterval = 250; // 射击间隔（毫秒）
let gameStarted = false;

// 触摸控制变量
let touchX = null;
let isShooting = false;
let shootingInterval = null;

// 玩家飞机
const player = {
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    speed: 5,
    initialized: false,
    draw() {
        ctx.drawImage(playerImg, this.x, this.y, this.width, this.height);
    }
};

// 子弹数组
let bullets = [];
const bulletSpeed = 7;

// 怪兽数组
let monsters = [];
const monsterSpeed = 2;

// BOSS类
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
    draw() {
        if (!this.active) return;
        ctx.drawImage(bossImg, this.x, this.y, this.width, this.height);
        // 绘制血条
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 10, this.width * (this.health / 100), 5);
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
        this.x = canvas.width / 2 - this.width / 2;
        this.y = -100;
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
        e.preventDefault(); // 防止页面滚动
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
    if (currentTime - lastShootTime < shootInterval) return;
    
    lastShootTime = currentTime;
    const bullet = {
        x: player.x + player.width / 2 - 2.5,
        y: player.y,
        width: 5,
        height: 15,
        color: '#ffffff',
        draw() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    };
    bullets.push(bullet);
    
    // 添加射击音效
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
function createExplosion(x, y) {
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
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

// 更新游戏状态
function update() {
    if (gameOver || !gameStarted) return;

    // 检查是否需要激活BOSS
    if (score >= 100 && !boss.active) {
        boss.active = true;
        boss.x = canvas.width / 2 - boss.width / 2;
        boss.y = 50;
    }

    // 更新BOSS
    if (boss.active) {
        // BOSS左右移动
        boss.x += Math.sin(Date.now() / 1000) * boss.speed;
        boss.shoot();
        
        // 更新BOSS子弹
        bossBullets = bossBullets.filter(bullet => {
            bullet.y += bullet.speed;
            
            // 检查是否击中玩家
            if (checkCollision(bullet, player)) {
                gameOver = true;
                createExplosion(player.x + player.width / 2, player.y + player.height / 2);
                return false;
            }
            
            return bullet.y < canvas.height;
        });
    }

    // 键盘控制（保留原有的键盘控制，以支持桌面端）
    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x < canvas.width - player.width) player.x += player.speed;
    if (keys.ArrowUp && player.y > 0) player.y -= player.speed;
    if (keys.ArrowDown && player.y < canvas.height - player.height) player.y += player.speed;
    if (keys.Space) shoot();

    // 更新子弹位置
    bullets = bullets.filter(bullet => {
        bullet.y -= bulletSpeed;
        
        // 检查是否击中BOSS
        if (boss.active && checkCollision(bullet, boss)) {
            boss.health -= 10;
            if (boss.health <= 0) {
                boss.active = false;
                score += 50;
                scoreElement.textContent = score;
            }
            return false;
        }
        
        return bullet.y > 0;
    });

    // 更新怪兽位置
    monsters = monsters.filter(monster => {
        monster.y += monsterSpeed;
        
        // 检查与玩家的碰撞
        if (checkCollision(monster, player)) {
            gameOver = true;
            createExplosion(player.x + player.width / 2, player.y + player.height / 2);
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
}

// 绘制游戏画面
function draw() {
    // 清空画布
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameStarted) {
        // 显示加载中
        return;
    }

    // 绘制星空背景
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
        ctx.fillRect(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            1,
            1
        );
    }

    // 绘制玩家
    player.draw();

    // 绘制子弹
    bullets.forEach(bullet => bullet.draw());
    
    // 绘制BOSS子弹
    bossBullets.forEach(bullet => {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    // 绘制怪兽
    monsters.forEach(monster => monster.draw());
    
    // 绘制BOSS
    boss.draw();

    // 绘制重新开始按钮
    restartButton.draw();

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
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if (!gameStarted) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    if (restartButton.isClicked(touchX, touchY)) {
        resetGame();
        return;
    }
    
    if (!isShooting) {
        isShooting = true;
        shoot();
        shootingInterval = setInterval(shoot, shootInterval);
    }
}, { passive: false });

canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (!gameStarted) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const newTouchX = touch.clientX - rect.left;
    
    const deltaX = newTouchX - touchX;
    if (deltaX > 0 && player.x < canvas.width - player.width) {
        player.x = Math.min(player.x + player.speed, canvas.width - player.width);
    } else if (deltaX < 0 && player.x > 0) {
        player.x = Math.max(player.x - player.speed, 0);
    }
    
    touchX = newTouchX;
}, { passive: false });

canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    touchX = null;
    
    if (isShooting) {
        isShooting = false;
        clearInterval(shootingInterval);
    }
}, { passive: false }); 

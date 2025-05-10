// 游戏配置
const gameConfig = {
    // 基础设置
    canvasWidth: 800,
    canvasHeight: 600,
    
    // 图片资源（使用base64格式内嵌）
    images: {
        player: 'data:image/jpeg;base64,...', // 这里需要替换为实际的base64编码
        monster: 'data:image/jpeg;base64,...',
        boss: 'data:image/jpeg;base64,...',
        miniBoss1: 'data:image/jpeg;base64,...',
        miniBoss2: 'data:image/jpeg;base64,...',
        miniBoss3: 'data:image/jpeg;base64,...'
    },
    
    // 游戏参数
    player: {
        width: 50,
        height: 50,
        speed: 5,
        lives: 3
    },
    
    bullet: {
        width: 5,
        height: 15,
        speed: 7,
        interval: 250
    },
    
    monster: {
        width: 40,
        height: 40,
        speed: 2,
        spawnInterval: 1000
    },
    
    boss: {
        width: 100,
        height: 100,
        speed: 2,
        health: 100,
        shootInterval: 1000
    },
    
    miniBoss: {
        width: 70,
        height: 70,
        health: 50,
        speed: 3
    }
}; 
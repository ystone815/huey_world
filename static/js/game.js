import { MainScene } from './main.scene.js?v=6';

const config = {
    type: Phaser.AUTO,
    width: '100%',
    height: '100%',
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER
    },
    backgroundColor: '#333333',
    backgroundColor: '#333333',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 } // Top-down game, no gravity
        }
    },
    scene: [MainScene]
};

console.log("Game Config Loaded, Starting Phaser...");
try {
    // 4. Create Game Instance
    const game = new Phaser.Game(config);
    window.phaserGame = game; // Expose for UI bridge
    console.log("Phaser Game Instance Created");
} catch (e) {
    console.error("Phaser Init Failed:", e);
    document.body.innerHTML += `<div style='color:red;font-size:20px'>Boot Error: ${e.message}</div>`;
}

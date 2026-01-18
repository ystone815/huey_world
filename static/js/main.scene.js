import { SocketManager } from './socket.manager.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // Load the plugin formally via Phaser Loader to ensure it's ready
        this.load.plugin('rexvirtualjoystickplugin', 'static/js/vendor/rexvirtualjoystickplugin.min.js', true);

        // Load Assets
        this.load.image('character', 'static/assets/character.png');
        this.load.image('tree', 'static/assets/tree.png');
    }

    create() {
        console.log("MainScene Created");



        // 0. Create Background (Grid)
        if (!this.textures.exists('grid_texture')) {
            const canvas = this.textures.createCanvas('grid_texture', 32, 32);
            const context = canvas.context;
            context.fillStyle = '#222222';
            context.fillRect(0, 0, 32, 32);
            context.strokeStyle = '#333333';
            context.strokeRect(0, 0, 32, 32);
            canvas.refresh();
        }
        this.add.tileSprite(0, 0, 2000, 2000, 'grid_texture');

        // 1. Generate Texture proceduraly
        if (!this.textures.exists('player_texture')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1); // White
            graphics.fillRect(0, 0, 32, 32);
            graphics.generateTexture('player_texture', 32, 32);
        }

        this.nickname = prompt("Please enter your nickname:", "Player") || "Player";
        this.otherPlayers = {};
        try {
            this.socketManager = new SocketManager(this);
        } catch (e) {
            console.error("SocketManager Init Failed:", e);
            this.add.text(10, 100, "Socket Init Failed!", { fill: '#ff0000' }).setScrollFactor(0).setDepth(200);
        }

        // 2. Create My Player (Container: Shadow + Sprite + Text)
        this.playerContainer = this.add.container(400, 300);

        // Shadow
        this.playerShadow = this.add.ellipse(0, 15, 24, 12, 0x000000, 0.3);

        // Body (New Character Asset)
        this.player = this.add.image(0, 0, 'character');
        this.player.setDisplaySize(48, 48); // Scale it nicely
        // this.player.setTint(0x00FF00); // Remove tint so we can see the cute art

        // Text
        this.playerText = this.add.text(0, -35, this.nickname, {
            font: '14px Arial',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.playerContainer.add([this.playerShadow, this.player, this.playerText]);
        this.playerContainer.setSize(32, 32);

        this.physics.add.existing(this.playerContainer);
        this.playerContainer.body.setCollideWorldBounds(true);

        // Set World Bounds (Matches the grid size)
        this.physics.world.setBounds(0, 0, 2000, 2000);

        // Text
        this.cameras.main.startFollow(this.playerContainer);
        this.cameras.main.setBounds(0, 0, 2000, 2000);

        // Notify server
        if (this.socketManager.socket.connected) {
            this.socketManager.socket.emit('set_nickname', this.nickname);
        } else {
            this.socketManager.socket.on('connect', () => {
                this.socketManager.socket.emit('set_nickname', this.nickname);
            });
        }

        // 2.5 Setup Environment (Trees for Depth Test)
        for (let i = 0; i < 20; i++) {
            const tx = Phaser.Math.Between(100, 1900);
            const ty = Phaser.Math.Between(100, 1900);
            const tree = this.add.image(tx, ty, 'tree');
            tree.setOrigin(0.5, 0.9); // Anchor at the bottom trunk for correct sorting
            tree.setDisplaySize(96, 96);
        }

        // 3. Setup Input
        this.cursors = this.input.keyboard.createCursorKeys();

        // 4. Virtual Joystick (Dynamic / Floating)
        console.log("Preparing Dynamic Joystick...");

        // Try getting it from ScenePlugin first
        let plugin = this.rexVirtualJoystick;

        // Manual Install Fallback (in case ScenePlugin didn't pick it up automatically from preload key)
        if (!plugin) {
            const key = 'rexvirtualjoystickplugin';
            if (this.plugins.plugins.some(p => p.key === key)) {
                plugin = this.plugins.get(key);
            }
        }

        // 3. Global Script Fallback (Most Robust)
        if (!plugin && window.rexvirtualjoystickplugin) {
            console.log("Using Global Window Plugin");
            this.plugins.installScenePlugin('rexVirtualJoystick', window.rexvirtualjoystickplugin, 'rexVirtualJoystick', this);
            plugin = this.rexVirtualJoystick;
        }

        if (plugin) {
            // Create the joystick but hide it initially
            // Note: UI elements must look like UI (High Depth, ScrollFactor 0)
            const baseObj = this.add.circle(0, 0, 60, 0x888888, 0.5)
                .setDepth(100)
                .setScrollFactor(0);

            const thumbObj = this.add.circle(0, 0, 30, 0xcccccc, 0.8)
                .setDepth(101)
                .setScrollFactor(0);

            this.joyStick = plugin.add(this, {
                x: 0,
                y: 0,
                radius: 60,
                base: baseObj,
                thumb: thumbObj,
                dir: '8dir',
                forceMin: 16,
                enable: false // Start disabled
            });

            this.joyStick.setVisible(false);
            this.joyCursors = this.joyStick.createCursorKeys();

            // Input handlers for "Floating" behavior
            this.input.on('pointerdown', (pointer) => {
                this.joyStick.setPosition(pointer.x, pointer.y);
                this.joyStick.setVisible(true);
                this.joyStick.setEnable(true);
            });

            this.input.on('pointerup', (pointer) => {
                this.joyStick.setVisible(false);
                this.joyStick.setEnable(false);
            });

            console.log("Dynamic Joystick Configured");
            this.add.text(10, 50, "DYNAMIC JOYSTICK", { fill: '#0f0', fontSize: '16px' })
                .setScrollFactor(0).setDepth(100);

        } else {
            console.error("Rex Joystick Plugin could not be loaded.");
            this.add.text(10, 50, "PLUGIN FAIL", { fill: '#f00' })
                .setScrollFactor(0).setDepth(100);
        }


    }

    addOtherPlayer(sid, playerInfo) {
        if (this.otherPlayers[sid]) {
            this.otherPlayers[sid].destroy();
        }
        const container = this.add.container(playerInfo.x, playerInfo.y);

        const shadow = this.add.ellipse(0, 15, 24, 12, 0x000000, 0.3);
        const otherPlayer = this.add.image(0, 0, 'character');
        otherPlayer.setDisplaySize(48, 48);

        let color = playerInfo.color;
        if (typeof color === 'string' && color.startsWith('#')) {
            color = parseInt(color.replace('#', '0x'));
        }
        otherPlayer.setTint(color); // Keep tint for others to distinguish them

        const otherText = this.add.text(0, -35, playerInfo.nickname || 'Unknown', {
            font: '14px Arial',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        container.add([shadow, otherPlayer, otherText]);
        this.otherPlayers[sid] = container;
    }

    update() {
        if (!this.playerContainer) return;

        const speed = 200;
        const body = this.playerContainer.body;

        // Reset velocity
        body.setVelocity(0);

        // Combined Input (Keyboard + Joystick)
        let left = this.cursors.left.isDown;
        let right = this.cursors.right.isDown;
        let up = this.cursors.up.isDown;
        let down = this.cursors.down.isDown;

        if (this.joyCursors) {
            left = left || this.joyCursors.left.isDown;
            right = right || this.joyCursors.right.isDown;
            up = up || this.joyCursors.up.isDown;
            down = down || this.joyCursors.down.isDown;
        }

        // Horizontal movement
        if (left) {
            body.setVelocityX(-speed);
        } else if (right) {
            body.setVelocityX(speed);
        }

        // Vertical movement
        if (up) {
            body.setVelocityY(-speed);
        } else if (down) {
            body.setVelocityY(speed);
        }

        // Emit movement if changed (Compare with LAST FRAME)
        if (this.lastX === undefined) {
            this.lastX = this.playerContainer.x;
            this.lastY = this.playerContainer.y;
        }

        if (Math.abs(this.playerContainer.x - this.lastX) > 0.1 || Math.abs(this.playerContainer.y - this.lastY) > 0.1) {
            // console.log(`Pos Changed`);
            this.socketManager.emitMove(this.playerContainer.x, this.playerContainer.y);

            // Update last known position
            this.lastX = this.playerContainer.x;
            this.lastY = this.playerContainer.y;
        }

        // Update Debug Text (HTML Overlay)
        const debugEl = document.getElementById('debug-log');
        if (debugEl) {
            const myId = this.socketManager.socket ? this.socketManager.socket.id : 'No Socket';
            const othersCount = Object.keys(this.otherPlayers).length;
            const inputStr = `L:${left ? 1 : 0} R:${right ? 1 : 0} U:${up ? 1 : 0} D:${down ? 1 : 0}`;
            const posStr = `X:${Math.round(this.playerContainer.x)} Y:${Math.round(this.playerContainer.y)}`;

            debugEl.innerText = `[v2.5D Loaded]\nID: ${myId}\nOthers: ${othersCount}\nLastMove: ${window.lastMoveDebug || 'None'}\nFPS: ${Math.round(this.game.loop.actualFps)}\nInput: ${inputStr}\nPos: ${posStr}`;
        }

        // Apply Depth Sorting
        this.updateDepth();
    }

    updateDepth() {
        // Y-Aorting: The lower the Y, the higher the depth value (closer to camera)
        // We set depth = y. Simple as that.

        this.children.each(child => {
            // Only sort Sprites and Containers that are actors or trees
            // We can check if they have a 'y' property and are not UI
            if (child.input && child.input.enabled) return; // Skip UI like joystick? No, joystick has explicit depth.
            if (child.scrollFactorX === 0) return; // Skip UI elements

            // Adjust depth
            child.setDepth(child.y);
        });
    }

    createShadow(x, y) {
        const shadow = this.add.ellipse(x, y, 20, 10, 0x000000, 0.3);
        return shadow;
    }
}


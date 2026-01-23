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
        this.load.image('ground', 'static/assets/ground.png');
    }

    create() {
        console.log("MainScene Created");

        // 0. Create Background (Forest Ground)
        // Background covers -1000 to 1000. 
        // Placing at -1000, -1000 with Origin 0 covers the area.
        this.add.tileSprite(-1000, -1000, 2000, 2000, 'ground').setOrigin(0);

        // 1. Generate Texture proceduraly
        if (!this.textures.exists('player_texture')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1); // White
            graphics.fillRect(0, 0, 32, 32);
            graphics.generateTexture('player_texture', 32, 32);
        }

        this.nickname = ""; // Set later by UI
        this.otherPlayers = {};
        this.isJoined = false;

        // 2. Create My Player (Container: Shadow + Sprite + Text)
        // Spawn at 0,0 (Center of Safe Zone)
        this.playerContainer = this.add.container(0, 0);

        // Shadow
        this.playerShadow = this.add.ellipse(0, 15, 24, 12, 0x000000, 0.3);

        // Body (New Character Asset)
        this.player = this.add.image(0, 0, 'character');
        this.player.setDisplaySize(48, 48); // Scale it nicely

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

        // Set World Bounds (-1000 to 1000)
        // This makes 0,0 the exact center of the map
        this.physics.world.setBounds(-1000, -1000, 2000, 2000);

        // Camera Follow
        this.cameras.main.startFollow(this.playerContainer);
        this.cameras.main.setBounds(-1000, -1000, 2000, 2000);

        // 2.2 Create Bulletin Board Object
        // Positioned about 10 steps away (approx 300px) to avoid spawn overlap
        this.board = this.add.container(300, -50);
        const boardBase = this.add.rectangle(0, 0, 40, 60, 0x5d4037);
        const boardTop = this.add.rectangle(0, -10, 50, 40, 0x8d6e63).setStrokeStyle(2, 0x5d4037);
        const boardText = this.add.text(0, -10, "📜", { fontSize: '20px' }).setOrigin(0.5);
        const boardLabel = this.add.text(0, 25, "GUESTBOOK", { font: '10px Arial', align: 'center' }).setOrigin(0.5);
        this.board.add([boardBase, boardTop, boardText, boardLabel]);
        this.board.setSize(50, 80);
        this.board.setInteractive(new Phaser.Geom.Rectangle(-25, -40, 50, 80), Phaser.Geom.Rectangle.Contains);

        this.board.on('pointerdown', () => {
            if (this.isJoined) {
                document.getElementById('guestbook-overlay').style.display = 'flex';
            }
        });

        // 2.3 Proximity Interaction setup
        this.proximityTimer = 0;
        this.isProximityOpen = false;
        this.proximityLabel = this.add.text(0, 0, "", {
            font: 'bold 14px Arial',
            fill: '#ffffff',
            backgroundColor: '#000000bb',
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setDepth(1000).setVisible(false);

        // Listen for external join event (from HTML UI)
        this.events.on('request-join', (name) => {
            this.joinGame(name);
        });

        // 2.5 Setup Environment (Trees - now handled by server data via renderMap)
        this.treesGroup = this.add.group();

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

        } else {
            console.error("Rex Joystick Plugin could not be loaded.");
            this.add.text(10, 50, "PLUGIN FAIL", { fill: '#f00' })
                .setScrollFactor(0).setDepth(100);
        }

        // 5. Create Minimap (Top-Right Corner)
        this.createMinimap();

    }

    createMinimap() {
        // Detect mobile
        const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS || window.innerWidth < 768;

        const minimapSize = isMobile ? 100 : 150;
        const minimapPadding = 10;
        const worldSize = 2000;
        const minimapScale = minimapSize / worldSize;

        // Get screen dimensions
        const screenWidth = this.cameras.main.width;

        // Create minimap container (Fixed to top-left)
        this.minimapContainer = this.add.container(
            minimapPadding,
            minimapPadding
        ).setScrollFactor(0).setDepth(9999);

        // Minimap background (dark with border)
        const minimapBg = this.add.rectangle(
            minimapSize / 2,
            minimapSize / 2,
            minimapSize,
            minimapSize,
            0x111111,
            0.8
        ).setScrollFactor(0);
        minimapBg.setStrokeStyle(2, 0x444444);

        // Minimap border glow
        const minimapBorder = this.add.rectangle(
            minimapSize / 2,
            minimapSize / 2,
            minimapSize + 4,
            minimapSize + 4,
            0x000000,
            0
        ).setScrollFactor(0);
        minimapBorder.setStrokeStyle(1, 0x666666);

        // Safe zone indicator (circle at center)
        const safeZoneRadius = 150 * minimapScale;
        const safeZone = this.add.circle(
            minimapSize / 2,
            minimapSize / 2,
            safeZoneRadius,
            0x00ff00,
            0.15
        ).setScrollFactor(0);
        safeZone.setStrokeStyle(1, 0x00ff00, 0.3);

        // Player dot on minimap
        this.minimapPlayerDot = this.add.circle(
            minimapSize / 2,
            minimapSize / 2,
            4,
            0x00ff00
        ).setScrollFactor(0);
        this.minimapPlayerDot.setStrokeStyle(1, 0xffffff);

        // Other players container (for minimap dots)
        this.minimapOtherDots = {};

        // Add all elements to container
        this.minimapContainer.add([minimapBorder, minimapBg, safeZone, this.minimapPlayerDot]);

        // Store minimap config for updates
        this.minimapConfig = {
            size: minimapSize,
            scale: minimapScale,
            offsetX: minimapSize / 2,
            offsetY: minimapSize / 2
        };

        // Label
        const minimapLabel = this.add.text(
            minimapSize / 2,
            minimapSize + 8,
            'MINIMAP',
            { font: '10px Arial', fill: '#888888' }
        ).setOrigin(0.5, 0).setScrollFactor(0);
        this.minimapContainer.add(minimapLabel);
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
        })
            .setOrigin(0.5)
            .setName('nicknameText');

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

        let isWalking = false;

        // Horizontal movement
        if (left) {
            body.setVelocityX(-speed);
            this.player.setFlipX(true); // Face left
            isWalking = true;
        } else if (right) {
            body.setVelocityX(speed);
            this.player.setFlipX(false); // Face right
            isWalking = true;
        }

        // Vertical movement
        if (up) {
            body.setVelocityY(-speed);
            isWalking = true;
        } else if (down) {
            body.setVelocityY(speed);
            isWalking = true;
        }

        // --- GUESTBOOK PROXIMITY INTERACTION ---
        if (this.board && this.isJoined) {
            const dist = Phaser.Math.Distance.Between(this.playerContainer.x, this.playerContainer.y, this.board.x, this.board.y);

            if (dist < 70) {
                if (!this.isProximityOpen && !document.getElementById('guestbook-overlay').style.display.includes('flex')) {
                    this.proximityTimer += this.game.loop.delta;
                    this.proximityLabel.setVisible(true);
                    this.proximityLabel.setPosition(this.board.x, this.board.y - 70);

                    const timeLeft = Math.max(0, (2000 - this.proximityTimer) / 1000).toFixed(1);
                    this.proximityLabel.setText(`Reading... ${timeLeft}s`);

                    if (this.proximityTimer >= 2000) {
                        document.getElementById('guestbook-overlay').style.display = 'flex';
                        this.isProximityOpen = true;
                        this.proximityLabel.setVisible(false);
                        this.proximityTimer = 0;
                    }
                }
            } else {
                this.proximityTimer = 0;
                this.proximityLabel.setVisible(false);
                // Reset "already opened" flag when moving far away
                if (dist > 120) {
                    this.isProximityOpen = false;
                }
            }
        }

        // --- PROCEDURAL ANIMATION (Bobbing) ---
        if (isWalking) {
            const t = this.time.now * 0.015; // Animation speed
            this.player.y = Math.abs(Math.sin(t)) * -8; // Bounce up
            this.player.rotation = Math.sin(t) * 0.1; // Tilt
        } else {
            this.player.y = 0;
            this.player.rotation = 0;
        }

        // Animate other players
        for (const [sid, container] of Object.entries(this.otherPlayers)) {
            const sprite = container.list[1];
            if (container.lastMoveTime && (this.time.now - container.lastMoveTime < 100)) {
                const t = this.time.now * 0.015;
                sprite.y = Math.abs(Math.sin(t)) * -8;
                sprite.rotation = Math.sin(t) * 0.1;
            } else {
                sprite.y = 0;
                sprite.rotation = 0;
            }
        }

        // Emit movement if changed (Compare with LAST FRAME)
        if (this.lastX === undefined) {
            this.lastX = this.playerContainer.x;
            this.lastY = this.playerContainer.y;
        }

        if (Math.abs(this.playerContainer.x - this.lastX) > 0.1 || Math.abs(this.playerContainer.y - this.lastY) > 0.1) {
            // console.log(`Pos Changed`);
            if (this.socketManager) {
                this.socketManager.emitMove(this.playerContainer.x, this.playerContainer.y);
            }

            // Update last known position
            this.lastX = this.playerContainer.x;
            this.lastY = this.playerContainer.y;
        }

        // Update Debug Text (HTML Overlay)
        const debugEl = document.getElementById('debug-log');
        if (debugEl) {
            const myId = (this.socketManager && this.socketManager.socket) ? this.socketManager.socket.id : 'No Socket';
            const othersCount = Object.keys(this.otherPlayers).length;
            const inputStr = `L:${left ? 1 : 0} R:${right ? 1 : 0} U:${up ? 1 : 0} D:${down ? 1 : 0}`;
            const posStr = `X:${Math.round(this.playerContainer.x)} Y:${Math.round(this.playerContainer.y)}`;

            debugEl.innerText = `[v2.5D Loaded]\nID: ${myId}\nOthers: ${othersCount}\nLastMove: ${window.lastMoveDebug || 'None'}\nFPS: ${Math.round(this.game.loop.actualFps)}\nInput: ${inputStr}\nPos: ${posStr}`;
        }

        // Update Minimap
        this.updateMinimap();

        // Apply Depth Sorting
        this.updateDepth();
    }

    updateMinimap() {
        if (!this.minimapConfig || !this.minimapPlayerDot) return;

        const { scale, offsetX, offsetY } = this.minimapConfig;

        // Update my player position on minimap
        // World coords: -1000 to 1000 -> Minimap coords: 0 to 150
        const minimapX = (this.playerContainer.x + 1000) * scale;
        const minimapY = (this.playerContainer.y + 1000) * scale;
        this.minimapPlayerDot.setPosition(minimapX, minimapY);

        // Update other players on minimap
        for (const [sid, container] of Object.entries(this.otherPlayers)) {
            if (!this.minimapOtherDots[sid]) {
                // Create dot for this player
                const dot = this.add.circle(0, 0, 3, 0xff6600);
                dot.setStrokeStyle(1, 0xffffff);
                this.minimapContainer.add(dot);
                this.minimapOtherDots[sid] = dot;
            }

            const otherX = (container.x + 1000) * scale;
            const otherY = (container.y + 1000) * scale;
            this.minimapOtherDots[sid].setPosition(otherX, otherY);
        }

        // Remove dots for disconnected players
        for (const sid of Object.keys(this.minimapOtherDots)) {
            if (!this.otherPlayers[sid]) {
                this.minimapOtherDots[sid].destroy();
                delete this.minimapOtherDots[sid];
            }
        }
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

    renderMap(trees) {
        // Clear existing trees if any (in case of reconnect)
        if (this.treesGroup) {
            this.treesGroup.clear(true, true);
        } else {
            this.treesGroup = this.add.group();
        }

        trees.forEach(t => {
            const tree = this.add.image(t.x, t.y, 'tree');
            tree.setOrigin(0.5, 0.9);
            tree.setDisplaySize(96, 96);
            tree.setDepth(t.y);
            this.treesGroup.add(tree);
        });
        console.log(`Rendered ${trees.length} trees from server.`);
    }

    joinGame(name) {
        if (this.isJoined) return;
        this.nickname = name || "Player";
        this.playerText.setText(this.nickname);
        this.isJoined = true;

        // Show Online List
        const listPanel = document.getElementById('online-list-panel');
        if (listPanel) listPanel.style.display = 'block';

        try {
            this.socketManager = new SocketManager(this);
            // SocketManager auto-connects and will emit 'set_nickname' on connect if we pass it
        } catch (e) {
            console.error("SocketManager Init Failed:", e);
        }
    }

    updateOnlineList() {
        const listContent = document.getElementById('player-list-content');
        if (!listContent) return;

        listContent.innerHTML = '';

        // Add Me
        const meItem = this.createPlayerListItem(this.nickname, true);
        listContent.appendChild(meItem);

        // Add Others
        for (const [sid, container] of Object.entries(this.otherPlayers)) {
            const nickname = container.getByName('nicknameText')?.text || 'Unknown';
            const item = this.createPlayerListItem(nickname, false);
            listContent.appendChild(item);
        }
    }

    createPlayerListItem(name, isMe) {
        const div = document.createElement('div');
        div.className = 'player-list-item';

        const dot = document.createElement('div');
        dot.className = `player-status-dot ${isMe ? 'status-me' : 'status-other'}`;

        const span = document.createElement('span');
        span.innerText = name + (isMe ? ' (Me)' : '');

        div.appendChild(dot);
        div.appendChild(span);
        return div;
    }
}


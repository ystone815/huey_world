import { SocketManager } from './socket.manager.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // Load the plugin formally via Phaser Loader to ensure it's ready
        this.load.plugin('rexvirtualjoystickplugin', 'static/js/vendor/rexvirtualjoystickplugin.min.js', true);

        this.load.image('character', 'static/assets/character.png?v=2');
        this.load.image('skin_fox', 'static/assets/skin_fox.png?v=2');
        this.load.image('skin_cat', 'static/assets/skin_cat.png?v=2');
        this.load.image('skin_dog', 'static/assets/skin_dog.png?v=2');
        this.load.image('skin_panda', 'static/assets/skin_panda.png?v=2');
        this.load.image('tree', 'static/assets/tree.png');

        this.load.image('bonfire', 'static/assets/bonfire.png');

        this.load.image('ground', 'static/assets/ground.png');
        this.load.image('snow_ground', 'static/assets/snow_ground.png');
        this.load.image('desert_ground', 'static/assets/desert_ground.png');

        // New Biome Assets
        this.load.image('snow_tree', 'static/assets/snow_tree.png?v=3');
        this.load.image('cactus', 'static/assets/cactus.png?v=6');

        // NPCs
        this.load.image('npc_roach', 'static/assets/npc_roach2.png?v=3');
        this.load.image('npc_sheep', 'static/assets/npc_sheep2.png');
    }


    create() {
        console.log("MainScene Created");

        // 0. Create Background (Forest Ground)
        // Main world ground (only middle section, not overlapping biomes)
        this.ground = this.add.tileSprite(-1000, -700, 2000, 1400, 'ground').setOrigin(0);
        this.ground.setPipeline('Light2D');
        this.ground.setDepth(-1000); // Behind everything

        // Snow Biome (Top)
        this.snowGround = this.add.tileSprite(-1000, -1000, 2000, 300, 'snow_ground').setOrigin(0);
        this.snowGround.setPipeline('Light2D');
        this.snowGround.setDepth(-999); // Slightly above ground to cover it

        // Desert Biome (Bottom)
        this.desertGround = this.add.tileSprite(-1000, 700, 2000, 300, 'desert_ground').setOrigin(0);
        this.desertGround.setPipeline('Light2D');
        this.desertGround.setDepth(-999); // Slightly above ground to cover it

        // Smooth Transition Zones
        // Snow to Forest transition (Y: -700 to -650)
        const snowTransition = this.add.graphics();
        snowTransition.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.3, 0.3, 0, 0);
        snowTransition.fillRect(-1000, -700, 2000, 50);
        snowTransition.setDepth(-999);
        snowTransition.setPipeline('Light2D');

        // Forest to Desert transition (Y: 700 to 750)
        const desertTransition = this.add.graphics();
        desertTransition.fillGradientStyle(0xd2691e, 0xd2691e, 0xd2691e, 0xd2691e, 0, 0, 0.3, 0.3);
        desertTransition.fillRect(-1000, 700, 2000, 50);
        desertTransition.setDepth(-999);
        desertTransition.setPipeline('Light2D');


        // 1. Generate Texture proceduraly
        if (!this.textures.exists('player_texture')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1); // White
            graphics.fillRect(0, 0, 32, 32);
            graphics.generateTexture('player_texture', 32, 32);
        }

        this.nickname = ""; // Set later by UI
        this.otherPlayers = {};
        this.npcs = {};
        this.isJoined = false;

        // Day/Night System
        this.worldTime = 0.5; // Default to Noon
        this.lights.enable().setAmbientColor(0xffffff);



        // 2. Create My Player (Container: Shadow + Sprite + Text)
        // Spawn at 0,0 (Center of Safe Zone)
        this.playerContainer = this.add.container(0, 0);

        // Shadow
        this.playerShadow = this.add.ellipse(0, 15, 24, 12, 0x000000, 0.3);

        // Body (New Character Asset)
        this.player = this.add.image(0, 0, 'character');
        this.player.setDisplaySize(48, 48); // Scale it nicely

        this.playerText = this.add.text(0, -35, this.nickname, {
            font: '14px Arial',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Health Bar (Moved higher for player visibility)
        this.createHealthBar(this.playerContainer, 40, 6, -40);

        this.playerContainer.add([this.playerShadow, this.player, this.playerText]);
        this.playerContainer.setSize(32, 32);

        // Character and Shadow should be affected by light
        this.player.setPipeline('Light2D');
        this.playerShadow.setPipeline('Light2D');

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

        // Interaction removed as per user request (Now only opens via proximity)

        // 2.2.5 Bonfire (Near Spawn)
        // Position: (80, 50) - A bit aside from 0,0
        this.bonfire = this.add.sprite(80, 50, 'bonfire');
        this.bonfire.setDisplaySize(48, 48); // Scale to match player roughly
        this.bonfire.setOrigin(0.5, 0.7); // Anchor at bottom center
        this.bonfire.setDepth(50); // Will be sorted by updateDepth later
        this.bonfire.setPipeline('Light2D');


        // Add simple light/flicker effect
        // 1. Scale Tween (Breathing) - Slowed down
        this.tweens.add({
            targets: this.bonfire,
            scaleX: 1.05 * (48 / this.bonfire.width),
            scaleY: 1.05 * (48 / this.bonfire.height),
            duration: 1200, // Increased from 500
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 2. Alpha Tween (Flickering) - Extremely slow
        this.tweens.add({
            targets: this.bonfire,
            alpha: 0.8,
            duration: 1000, // Increased from 400
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 3. Light Glow (Circle behind)
        this.bonfireLight = this.add.circle(80, 50, 60, 0xffaa00, 0.2);
        this.bonfireLight.setDisplaySize(80, 80);

        // Phaser 2D Point Light for Bonfire (Expanded range: 600)
        this.bonfirePointLight = this.lights.addLight(80, 50, 600).setColor(0xffaa00).setIntensity(1.2);

        this.tweens.add({
            targets: this.bonfireLight,
            alpha: 0.4,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 300,
            yoyo: true,
            repeat: -1
        });

        // Animate Point Light Flicker
        this.tweens.add({
            targets: this.bonfirePointLight,
            intensity: { from: 1.0, to: 1.5 },
            radius: { from: 570, to: 630 },
            duration: 100,
            yoyo: true,
            repeat: -1
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
        this.events.on('request-join', (data) => {
            this.joinGame(data);
        });

        // Nickname Validation Success
        this.events.on('nickname-success', (data) => {
            this.isJoined = true;
            this.nickname = data.nickname;
            this.selectedSkin = data.skin;

            if (this.player && this.selectedSkin) {
                this.player.setTexture(this.selectedSkin);
                this.player.displayWidth = 48;
                this.player.scaleY = this.player.scaleX;
                this.player.setOrigin(0.5, 0.5);
            }
            this.playerText.setText(this.nickname);

            // Update my health bar
            if (data.hp !== undefined && data.max_hp !== undefined) {
                this.updateHealthBar(this.playerContainer, data.hp, data.max_hp);
            }

            // Notify HTML UI
            window.dispatchEvent(new CustomEvent('lobby-hide'));

            // Show Online List
            const listPanel = document.getElementById('online-list-panel');
            if (listPanel) listPanel.style.display = 'block';

            this.updateOnlineList();
        });

        // Nickname Validation Error
        this.events.on('nickname-error', (data) => {
            // Forward to HTML UI
            window.dispatchEvent(new CustomEvent('nickname-error', { detail: data.message }));
        });

        // 2.5 Setup Environment (Trees - now handled by server data via renderMap)
        // We initialize it here as a static group for Physics
        this.treesGroup = this.physics.add.staticGroup();

        // 2.6 NPC Group
        this.npcGroup = this.add.group();



        // 3. Setup Input (WASD + Arrows)
        // Set enableCapture: false to allow keys to propagate to HTML inputs (Nickname, Guestbook)
        this.controls = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            up2: Phaser.Input.Keyboard.KeyCodes.UP,
            down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            key1: Phaser.Input.Keyboard.KeyCodes.ONE,
            key2: Phaser.Input.Keyboard.KeyCodes.TWO,
            key3: Phaser.Input.Keyboard.KeyCodes.THREE,
            key4: Phaser.Input.Keyboard.KeyCodes.FOUR,
            inventory: Phaser.Input.Keyboard.KeyCodes.E
        }, false, false);
        console.log("Controls Initialized: WASD + Arrows + Emojis(1-4) + Inventory(E) (Capture Disabled)");

        // Emoji mappings
        this.emojiMap = {
            key1: '❤️',
            key2: '😂',
            key3: '😮',
            key4: '🔥'
        };

        // Handle remote emoji event
        this.events.on('show-remote-emoji', (data) => {
            const sid = data.sid;
            const emoji = data.emoji;
            const container = this.otherPlayers[sid];
            if (container) {
                this.showEmojiPopup(container, emoji);
            }
        });

        // Add event listeners for emoji keys
        ['key1', 'key2', 'key3', 'key4'].forEach(key => {
            this.controls[key].on('down', () => {
                if (!this.isJoined || this.isTyping() || this.isAnyOverlayOpen()) return;
                const emoji = this.emojiMap[key];
                this.showEmojiPopup(this.playerContainer, emoji);
                if (this.socketManager) {
                    this.socketManager.emitEmoji(emoji);
                }
            });
        });

        // Add inventory listener
        this.controls.inventory.on('down', () => {
            if (this.isJoined && !this.isTyping()) {
                this.toggleInventory();
            }
        });

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
            // Create a DYNAMIC joystick but only active in a certain area
            const radius = 30; // Half of previous 60
            const baseObj = this.add.circle(0, 0, radius, 0x888888, 0.5)
                .setDepth(1100)
                .setScrollFactor(0);

            const thumbObj = this.add.circle(0, 0, radius / 2, 0xcccccc, 0.8)
                .setDepth(1101)
                .setScrollFactor(0);

            this.joyStick = plugin.add(this, {
                x: 0,
                y: 0,
                radius: radius,
                base: baseObj,
                thumb: thumbObj,
                dir: '8dir',
                forceMin: 6, // Adjusted for smaller scale
                enable: false // Disable until valid touch
            });



            this.joyStick.setVisible(false);
            this.joyCursors = this.joyStick.createCursorKeys();

            // Limited Dynamic Joystick Logic
            let joystickPointerId = null;
            this.input.on('pointerdown', (pointer) => {
                if (!this.isJoined) return;

                // Check for Bottom-Left Quadrant (3rd Quadrant)
                const isBottomLeft = pointer.x < this.scale.width / 2 && pointer.y > this.scale.height / 2;

                if (isBottomLeft) {
                    joystickPointerId = pointer.id;
                    this.joyStick.setPosition(pointer.x, pointer.y);
                    this.joyStick.setVisible(true);
                    this.joyStick.setEnable(true);
                }
            });

            this.input.on('pointerup', (pointer) => {
                if (pointer.id === joystickPointerId) {
                    this.joyStick.setVisible(false);
                    this.joyStick.setEnable(false);
                    joystickPointerId = null;
                }
            });

            console.log("Quadrant-Limited Dynamic Joystick Configured");
        } else {

            console.error("Rex Joystick Plugin could not be loaded.");
            this.add.text(10, 50, "PLUGIN FAIL", { fill: '#f00' })
                .setScrollFactor(0).setDepth(100);
        }

        // 5. Create Minimap
        this.createMinimap();

        // 6. Camera Setup & Zoom Defaults
        this.cameras.main.setZoom(1.0);

        // 6.1 Enable Multi-Touch (Increase active pointers)
        this.input.addPointer(4); // Supports up to 5 concurrent touches

        // 7. Mobile Emoji Radial Menu
        this.createMobileEmojiMenu();
    }

    createMobileEmojiMenu() {
        // Only show on mobile or small screens
        const isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS || window.innerWidth < 768;
        if (!isMobile) return;

        console.log("Creating Mobile Emoji Radial Menu");

        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        const btnRadius = 28;
        const margin = 20;

        // Position: Bottom-Right
        const x = screenWidth - btnRadius - margin;
        const y = screenHeight - btnRadius - margin;

        // 1. Main Button
        const btnBase = this.add.circle(x, y, btnRadius, 0x444444, 0.8).setScrollFactor(0).setDepth(2000).setInteractive();
        const btnIcon = this.add.text(x, y, '❤️', { fontSize: '24px' }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        btnBase.setStrokeStyle(2, 0xffffff);

        // 2. Radial Menu Container
        const menuContainer = this.add.container(x, y).setScrollFactor(0).setDepth(2010).setVisible(false);
        const menuBg = this.add.circle(0, 0, 80, 0x000000, 0.4).setStrokeStyle(1, 0x888888);

        const emojis = [
            { char: '😂', dx: 0, dy: -60, dir: 'north' },
            { char: '❤️', dx: 0, dy: 60, dir: 'south' },
            { char: '🔥', dx: 60, dy: 0, dir: 'east' },
            { char: '😮', dx: -60, dy: 0, dir: 'west' }
        ];

        const emojiObjs = {};
        emojis.forEach(e => {
            const txt = this.add.text(e.dx, e.dy, e.char, { fontSize: '32px' }).setOrigin(0.5);
            menuContainer.add(txt);
            emojiObjs[e.dir] = txt;
        });

        menuContainer.addAt(menuBg, 0);

        // Interaction state
        let emojiPointerId = null;
        let selectedDir = null;

        btnBase.on('pointerdown', (pointer) => {
            emojiPointerId = pointer.id;
            menuContainer.setVisible(true);
            btnBase.setFillStyle(0x666666);
        });

        this.input.on('pointermove', (pointer) => {
            if (emojiPointerId !== pointer.id) return;

            const dx = pointer.x - x;
            const dy = pointer.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Reset highlights
            Object.values(emojiObjs).forEach(o => o.setScale(1));

            if (dist > 30) {
                // Determine direction
                let dir = null;
                if (Math.abs(dx) > Math.abs(dy)) {
                    dir = dx > 0 ? 'east' : 'west';
                } else {
                    dir = dy > 0 ? 'south' : 'north';
                }

                selectedDir = dir;
                emojiObjs[dir].setScale(1.5);
            } else {
                selectedDir = null;
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (emojiPointerId !== pointer.id) return;

            if (selectedDir && this.isJoined) {
                const emoji = emojis.find(e => e.dir === selectedDir).char;
                this.showEmojiPopup(this.playerContainer, emoji);
                if (this.socketManager) {
                    this.socketManager.emitEmoji(emoji);
                }
            }

            emojiPointerId = null;
            selectedDir = null;
            menuContainer.setVisible(false);
            btnBase.setFillStyle(0x444444);
            Object.values(emojiObjs).forEach(o => o.setScale(1));
        });

        // 3. Mobile Inventory Button (Top-Right)
        const invBtnRadius = 28;
        const invBtnX = screenWidth - invBtnRadius - 10; // Offset from right
        const invBtnY = 180; // Below minimap and clock

        const mobInvBtn = this.add.circle(invBtnX, invBtnY, invBtnRadius, 0x444444, 0.8)
            .setScrollFactor(0)
            .setDepth(2000)
            .setInteractive()
            .setStrokeStyle(2, 0xffffff);

        const mobInvIcon = this.add.text(invBtnX, invBtnY, '🎒', { fontSize: '24px' })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2001);

        mobInvBtn.on('pointerdown', () => {
            this.toggleInventory();
        });
    }

    toggleInventory() {
        const overlay = document.getElementById('inventory-overlay');
        if (overlay) {
            const isVisible = overlay.style.display === 'flex';
            overlay.style.display = isVisible ? 'none' : 'flex';
        }
    }

    isTyping() {
        return document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
    }

    isAnyOverlayOpen() {
        const lobbyOverlay = document.getElementById('lobby-overlay');
        const invOverlay = document.getElementById('inventory-overlay');
        const gbOverlay = document.getElementById('guestbook-overlay');

        const isLobbyOpen = lobbyOverlay && (lobbyOverlay.style.display !== 'none' && lobbyOverlay.style.opacity !== '0');
        const isInventoryOpen = invOverlay && invOverlay.style.display === 'flex';
        const isGbOpen = gbOverlay && gbOverlay.style.display === 'flex';

        return isLobbyOpen || isInventoryOpen || isGbOpen;
    }

    showEmojiPopup(container, emoji) {
        // Create emoji text object
        const emojiText = this.add.text(0, -60, emoji, {
            fontSize: '32px'
        }).setOrigin(0.5);

        // Add to container so it follows the player
        container.add(emojiText);

        // Animate: Float up and fade out
        this.tweens.add({
            targets: emojiText,
            y: -120,
            alpha: 0,
            duration: 1500,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                emojiText.destroy();
            }
        });
    }

    createHealthBar(container, width, height, offsetY) {
        const bg = this.add.rectangle(0, offsetY, width, height, 0x000000, 0.5);
        const bar = this.add.rectangle(-(width / 2), offsetY, width, height, 0x00ff00, 1).setOrigin(0, 0.5);

        bg.setName('hpBarBg');
        bar.setName('hpBar');

        container.add([bg, bar]);
    }

    updateHealthBar(container, hp, maxHp) {
        const bar = container.getByName('hpBar');
        const bg = container.getByName('hpBarBg');
        if (bar && bg) {
            const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
            bar.width = bg.width * ratio;

            // Color feedback
            if (ratio < 0.3) bar.setFillStyle(0xff0000); // Red
            else if (ratio < 0.6) bar.setFillStyle(0xffff00); // Yellow
            else bar.setFillStyle(0x00ff00); // Green
        }
    }

    createDustEffect(x, y) {
        const dust = this.add.circle(x, y + 15, Phaser.Math.Between(2, 4), 0xcccccc, 0.6);
        dust.setDepth(y - 1); // Behind character

        this.tweens.add({
            targets: dust,
            y: y + Phaser.Math.Between(5, 10),
            x: dust.x + Phaser.Math.Between(-20, 20),
            alpha: 0,
            scale: 0.1,
            duration: Phaser.Math.Between(500, 800),
            ease: 'Cubic.easeOut',
            onComplete: () => dust.destroy()
        });
    }

    createFireSpark(x, y) {
        const spark = this.add.circle(x + Phaser.Math.Between(-15, 15), y, Phaser.Math.Between(1, 3), 0xffaa00, 0.8);
        spark.setDepth(y + 1);

        this.tweens.add({
            targets: spark,
            y: y - Phaser.Math.Between(40, 80),
            x: spark.x + Phaser.Math.Between(-20, 20),
            alpha: 0,
            duration: Phaser.Math.Between(800, 1200),
            ease: 'Quad.easeOut',
            onComplete: () => spark.destroy()
        });
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
        ).setScrollFactor(0).setInteractive();
        minimapBg.setStrokeStyle(2, 0x444444);

        this.isMinimapExpanded = false;
        minimapBg.on('pointerdown', () => {
            this.isMinimapExpanded = !this.isMinimapExpanded;
            // Limit to 2.5x on mobile, 3.0x on desktop
            const maxScale = isMobile ? 2.5 : 3.0;
            const targetScale = this.isMinimapExpanded ? maxScale : 1.0;

            this.tweens.add({
                targets: this.minimapContainer,
                scaleX: targetScale,
                scaleY: targetScale,
                duration: 200,
                ease: 'Power2'
            });
        });

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
        this.minimapTreeDots = [];
        this.minimapNpcDots = {};

        // Add all elements to container
        this.minimapContainer.add([minimapBorder, minimapBg, safeZone, this.minimapPlayerDot]);

        // Store minimap config for updates
        this.minimapConfig = {
            size: minimapSize,
            scale: minimapScale,
            offsetX: minimapSize / 2,
            offsetY: minimapSize / 2
        };

        // Time Clock Text (Below Minimap)
        this.minimapTimeText = this.add.text(
            minimapSize / 2,
            minimapSize + 5,
            '12:00',
            { font: 'bold 14px Consolas, monospace', fill: '#ffffff' }
        ).setOrigin(0.5, 0).setScrollFactor(0);
        this.minimapContainer.add(this.minimapTimeText);
    }


    addOtherPlayer(sid, playerInfo) {
        if (this.otherPlayers[sid]) {
            this.otherPlayers[sid].destroy();
        }
        const container = this.add.container(playerInfo.x, playerInfo.y);

        const shadow = this.add.ellipse(0, 15, 24, 12, 0x000000, 0.3);
        const skinKey = playerInfo.skin || 'skin_fox';
        const otherPlayer = this.add.image(0, 0, skinKey);
        otherPlayer.setPipeline('Light2D');
        shadow.setPipeline('Light2D');


        // Scale to 48px width, maintain aspect ratio
        otherPlayer.displayWidth = 48;
        otherPlayer.scaleY = otherPlayer.scaleX;

        otherPlayer.setOrigin(0.5, 0.5); // Ensure center origin for flipping




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

        // Health Bar for other player (Moved higher)
        this.createHealthBar(container, 40, 6, -40);
        if (playerInfo.hp !== undefined && playerInfo.max_hp !== undefined) {
            this.updateHealthBar(container, playerInfo.hp, playerInfo.max_hp);
        }

        this.otherPlayers[sid] = container;
    }

    update() {
        if (!this.playerContainer) return;

        const speed = 200;
        const body = this.playerContainer.body;

        // Reset velocity
        body.setVelocity(0);

        // --- INPUT BLOCK (Nickname, Guestbook, Inventory) ---
        if (this.isTyping()) {
            return;
        }

        if (this.isAnyOverlayOpen()) {
            // Still run depth and minimap updates, but skip movement input
            this.updateMinimap();
            this.updateDepth();
            this.updateEnvironmentColors();
            return;
        }

        // Combined Input (Keyboard + Joystick)
        let left = this.controls.left.isDown || this.controls.left2.isDown;
        let right = this.controls.right.isDown || this.controls.right2.isDown;
        let up = this.controls.up.isDown || this.controls.up2.isDown;
        let down = this.controls.down.isDown || this.controls.down2.isDown;

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

            // Dust Particles
            if (this.time.now % 10 < 2) {
                this.createDustEffect(this.playerContainer.x, this.playerContainer.y);
            }
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

                // Dust for other players
                if (this.time.now % 10 < 2) {
                    this.createDustEffect(container.x, container.y);
                }
            } else {
                sprite.y = 0;
                sprite.rotation = 0;
            }
        }

        // Animate NPCs
        for (const [nid, container] of Object.entries(this.npcs)) {
            const sprite = container.list[1];
            if (container.lastMoveTime && (this.time.now - container.lastMoveTime < 150)) {
                const t = this.time.now * 0.02; // Faster bobbing for smaller creatures
                sprite.y = Math.abs(Math.sin(t)) * -4;
                sprite.rotation = Math.sin(t) * 0.15;

                // Dust for NPCs
                if (this.time.now % 12 < 2) {
                    this.createDustEffect(container.x, container.y);
                }
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
            if (this.socketManager) {
                this.socketManager.emitMove(this.playerContainer.x, this.playerContainer.y);
            }
            this.lastX = this.playerContainer.x;
            this.lastY = this.playerContainer.y;
        }

        // Update Debug Text
        const debugEl = document.getElementById('debug-log');
        if (debugEl) {
            const myId = (this.socketManager && this.socketManager.socket) ? this.socketManager.socket.id : 'No Socket';
            const othersCount = Object.keys(this.otherPlayers).length;
            const inputStr = `L:${left ? 1 : 0} R:${right ? 1 : 0} U:${up ? 1 : 0} D:${down ? 1 : 0}`;
            const posStr = `X:${Math.round(this.playerContainer.x)} Y:${Math.round(this.playerContainer.y)}`;
            debugEl.innerText = `[v2.5D Loaded]\nID: ${myId}\nOthers: ${othersCount}\nLastMove: ${window.lastMoveDebug || 'None'}\nFPS: ${Math.round(this.game.loop.actualFps)}\nInput: ${inputStr}\nPos: ${posStr}`;
        }

        this.updateMinimap();
        this.updateDepth();
        this.updateEnvironmentColors();

        // Bonfire Sparks
        if (this.bonfire && this.time.now % 15 < 2) {
            this.createFireSpark(this.bonfire.x, this.bonfire.y);
        }
    }

    updateEnvironmentColors() {
        if (!this.lights) return;

        const time = this.worldTime;

        const colors = [
            { t: 0.0, r: 40, g: 40, b: 60 },      // Midnight (Brightened for better visibility)
            { t: 0.25, r: 170, g: 136, b: 255 },// Dawn
            { t: 0.5, r: 255, g: 255, b: 255 },  // Noon
            { t: 0.75, r: 255, g: 136, b: 68 }, // Dusk
            { t: 1.0, r: 40, g: 40, b: 60 }       // Midnight (Loop)
        ];




        let lower = colors[0];
        let upper = colors[1];

        for (let i = 0; i < colors.length - 1; i++) {
            if (time >= colors[i].t && time <= colors[i + 1].t) {
                lower = colors[i];
                upper = colors[i + 1];
                break;
            }
        }

        const frac = (time - lower.t) / (upper.t - lower.t);
        const r = Math.floor(lower.r + (upper.r - lower.r) * frac);
        const g = Math.floor(lower.g + (upper.g - lower.g) * frac);
        const b = Math.floor(lower.b + (upper.b - lower.b) * frac);

        this.lights.setAmbientColor(Phaser.Display.Color.GetColor(r, g, b));

        // Intensity of point light (Stronger at night)
        // Max at 0.5 (Night)
        let intensity = 0;
        if (time > 0.3 && time < 0.7) {
            intensity = 1.5;
        }

        if (this.playerLight) {
            this.playerLight.setPosition(this.playerContainer.x, this.playerContainer.y);
            this.playerLight.setIntensity(intensity);
        }

        // --- UPDATE CLOCK UI ---
        // worldTime 0.0 = 00:00 (Midnight)
        const totalMinutes = (time * 24 * 60) % (24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);

        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        if (this.minimapTimeText) {
            this.minimapTimeText.setText(timeString);

            // Color feedback: Blue at night, Orange at dawn/dusk, White at noon
            if (time > 0.8 || time < 0.2) this.minimapTimeText.setFill('#66aaff');
            else if (time > 0.2 && time < 0.4 || time > 0.6 && time < 0.8) this.minimapTimeText.setFill('#ffaa44');
            else this.minimapTimeText.setFill('#ffffff');
        }

    }

    initNPCs(npcData) {
        Object.values(this.npcs).forEach(n => n.destroy());
        this.npcs = {};

        // Minimap Sync
        if (this.minimapNpcDots) {
            Object.values(this.minimapNpcDots).forEach(d => d.destroy());
            this.minimapNpcDots = {};
        }

        npcData.forEach(data => {
            const container = this.add.container(data.x, data.y);
            const shadow = this.add.ellipse(0, 15, 24, 12, 0x000000, 0.3);
            const textureKey = data.type === 'roach' ? 'npc_roach' : 'npc_sheep';

            let sprite;
            if (this.textures.exists(textureKey)) {
                sprite = this.add.image(0, 0, textureKey);
            } else {
                const color = data.type === 'roach' ? 0x4e342e : 0xffffff;
                sprite = this.add.rectangle(0, 0, 32, 32, color);
            }

            sprite.setPipeline('Light2D');
            shadow.setPipeline('Light2D');

            sprite.setOrigin(0.5, 0.5);

            // Larger NPCs (Now matched to player size: 48px)
            sprite.displayWidth = 48;
            sprite.scaleY = sprite.scaleX;

            container.add([shadow, sprite]);

            // Health Bar for NPC (Moved slightly higher)
            this.createHealthBar(container, 40, 6, -30);
            if (data.hp !== undefined && data.max_hp !== undefined) {
                this.updateHealthBar(container, data.hp, data.max_hp);
            }

            this.npcs[data.id] = container;
            if (this.npcGroup) this.npcGroup.add(container);

            // Add to minimap
            if (this.minimapConfig) {
                const { scale } = this.minimapConfig;
                const dot = this.add.circle(
                    (data.x + 1000) * scale,
                    (data.y + 1000) * scale,
                    2,
                    0xffff00
                );
                this.minimapContainer.add(dot);
                this.minimapNpcDots[data.id] = dot;
            }
        });
        console.log(`Initialized ${npcData.length} NPCs.`);
    }

    updateNPCPositions(updates) {
        for (const [nid, pos] of Object.entries(updates)) {
            const container = this.npcs[nid];
            if (container) {
                const prevX = container.x;
                container.setPosition(pos.x, pos.y);
                container.lastMoveTime = this.time.now;

                const sprite = container.list[1];
                if (sprite && sprite.setFlipX) {
                    if (pos.x < prevX) sprite.setFlipX(true);
                    else if (pos.x > prevX) sprite.setFlipX(false);
                }
            }
        }
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

        // Update NPC positions on minimap
        for (const [nid, container] of Object.entries(this.npcs)) {
            const dot = this.minimapNpcDots[nid];
            if (dot) {
                const dotX = (container.x + 1000) * scale;
                const dotY = (container.y + 1000) * scale;
                dot.setPosition(dotX, dotY);
            }
        }

        // Remove dots for disconnected players
        for (const sid of Object.keys(this.minimapOtherDots)) {
            if (!this.otherPlayers[sid]) {
                this.minimapOtherDots[sid].destroy();
                delete this.minimapOtherDots[sid];
            }
        }

        // Cleanup NPC dots
        for (const nid of Object.keys(this.minimapNpcDots)) {
            if (!this.npcs[nid]) {
                this.minimapNpcDots[nid].destroy();
                delete this.minimapNpcDots[nid];
            }
        }
    }

    updateDepth() {
        // Y-Sorting: The lower the Y, the higher the depth value (closer to camera)
        // We set depth = y. Simple as that.

        this.children.each(child => {
            // Skip UI elements
            if (child.input && child.input.enabled) return;
            if (child.scrollFactorX === 0) return;

            // Skip background layers (they have fixed depths)
            if (child === this.ground || child === this.snowGround || child === this.desertGround) return;

            // Skip graphics objects (transitions, etc)
            if (child.type === 'Graphics') return;

            // Adjust depth
            child.setDepth(child.y);

            // Special fix for bonfire light (should be on ground)
            if (child === this.bonfireLight) {
                child.setDepth(this.bonfire.y - 1);
            }
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
            this.treesGroup = this.physics.add.staticGroup();
        }

        // Clear minimap trees
        if (this.minimapTreeDots) {
            this.minimapTreeDots.forEach(d => d.destroy());
            this.minimapTreeDots = [];
        }

        trees.forEach(t => {
            // Biome logic: determine texture based on Y coordinate
            let texture = 'tree';
            let tint = 0xffffff;
            let displaySize = 96;

            if (t.y < -700) {
                texture = 'snow_tree';
            } else if (t.y > 700) {
                texture = 'cactus';
                displaySize = 64; // Cacti are usually a bit smaller
            }

            // Create tree as part of the physics group
            const tree = this.treesGroup.create(t.x, t.y, texture);
            tree.setPipeline('Light2D');


            // Visuals
            tree.setOrigin(0.5, 0.9);
            tree.setDisplaySize(displaySize, displaySize);
            tree.setDepth(t.y); // Y-sort immediately

            // Physics Body (Trunk only)
            // Adjust body size and offset based on tree type
            tree.refreshBody(); // Sync physics with display size/origin

            if (texture === 'cactus') {
                // Cactus is 64x64, origin at (0.5, 0.9)
                // Smaller collision box for cactus trunk
                tree.body.setSize(16, 16);
                // Center x: 32, Anchor y: 0.9 * 64 = 57.6
                tree.body.setOffset(24, 46);
            } else if (texture === 'snow_tree') {
                // Snow tree is 96x96, origin at (0.5, 0.9)
                tree.body.setSize(20, 20);
                // Center x: 48, Anchor y: 0.9 * 96 = 86.4
                tree.body.setOffset(38, 70);
            } else {
                // Regular tree is 96x96, origin at (0.5, 0.9)
                tree.body.setSize(20, 20);
                tree.body.setOffset(38, 70);
            }

            // Add to minimap
            if (this.minimapConfig) {
                const { scale } = this.minimapConfig;
                const dot = this.add.circle(
                    (t.x + 1000) * scale,
                    (t.y + 1000) * scale,
                    1.5,
                    0x004400
                );
                this.minimapContainer.add(dot);
                this.minimapTreeDots.push(dot);
            }
        });

        // Add Collider between Player and Trees
        if (this.playerContainer) {
            this.physics.add.collider(this.playerContainer, this.treesGroup);
        }

        console.log(`Rendered ${trees.length} trees from server with collision.`);
    }


    joinGame(data) {
        // Handle both string (old) and object (new)
        if (typeof data === 'string') {
            this.nickname = data;
            this.selectedSkin = 'skin_fox';
        } else {
            this.nickname = data.nickname || "Player";
            this.selectedSkin = data.skin || 'skin_fox';
        }

        // Initialize socket if not already done
        if (!this.socketManager) {
            try {
                this.socketManager = new SocketManager(this);
            } catch (e) {
                console.error("SocketManager Init Failed:", e);
                window.dispatchEvent(new CustomEvent('nickname-error', { detail: "Server connection failed" }));
            }
        } else {
            // If already connected, just emit the new nickname
            this.socketManager.socket.emit('set_nickname', {
                nickname: this.nickname,
                skin: this.selectedSkin
            });
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


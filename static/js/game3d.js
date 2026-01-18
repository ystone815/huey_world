import { SocketManager3D } from './socket.manager.3d.js';

class Game3D {
    constructor(nickname) {
        this.myNickname = nickname;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

        // Camera (Isometric-ish)
        // FOV, Aspect, Near, Far
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.camera.position.set(0, 1000, 1000); // High up and back
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(500, 1000, 500);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Ground (2000x2000 to match 2D world)
        // 2D (0,0) is top-left. 2000x2000.
        // Three.js (0,0,0) is center.
        // We'll map 2D(x,y) directly to 3D(x, z). 
        // 2D world is 0~2000. 
        // Let's center the 3D ground at 1000, 1000? Or just render it at 1000, 0, 1000 with size 2000.

        const groundGeo = new THREE.PlaneGeometry(2000, 2000);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50 }); // Green
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2; // Flat on floor
        this.ground.position.set(1000, 0, 1000); // 2D (0,0) starts at corner if we assume 3D origin is 0,0,0
        // Wait, PlaneGeometry creates centered at local 0,0.
        // If we want 0,0 to be the top-left corner of the map...
        // Let's just keep direct mapping: 2D X -> 3D X, 2D Y -> 3D Z.
        // So ground range is X: 0~2000, Z: 0~2000.
        // Center of that is 1000, 1000.
        this.scene.add(this.ground);

        // Grid Helper
        const gridHelper = new THREE.GridHelper(2000, 20);
        gridHelper.position.set(1000, 1, 1000); // Slightly above ground
        this.scene.add(gridHelper);

        // Texture Loader
        this.textureLoader = new THREE.TextureLoader();
        this.charTexture = this.textureLoader.load('assets/character.png');
        this.treeTexture = this.textureLoader.load('assets/tree.png');

        // Sprites need to be configured
        this.charMaterial = new THREE.SpriteMaterial({ map: this.charTexture });
        this.treeMaterial = new THREE.SpriteMaterial({ map: this.treeTexture });

        // Players Map
        this.myId = null;
        this.myPlayer = null; // Container for mesh/sprite
        this.otherPlayers = {}; // { sid: Sprite }

        // Setup Socket
        this.socketManager = new SocketManager3D(this);

        // Input
        this.keys = { w: false, a: false, s: false, d: false };
        window.addEventListener('keydown', (e) => this.onKey(e, true));
        window.addEventListener('keyup', (e) => this.onKey(e, false));

        // Mobile Joystick Setup
        this.joystickData = { active: false, x: 0, y: 0 };
        this.initJoystick();

        // Create My Player Placeholder (will be synced with first move?)
        // Actually, let's create it at random pos or wait for server?
        // MOVED TO SOCKET CONNECT
        // this.spawnPlayer(Math.random() * 1800 + 100, Math.random() * 1800 + 100);

        // Trees (Fixed Map)
        this.setupTrees();

        // Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        // Handle Resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    spawnPlayer(x, y) {
        // this.myNickname is already set in constructor
        this.myPlayer = this.createCharacterSprite(x, y, true, this.myNickname);
    }

    createCharacterSprite(x, z, isMe, nickname) {
        // Use Sprite for Billboard effect (always faces camera)
        const material = this.charMaterial.clone(); // Clone to allow different colors if needed
        if (isMe) material.color.setHex(0xFFFFFF); // Normal
        // else material.color.setHex(0xAAAAAA); // Others darker?

        const sprite = new THREE.Sprite(material);
        // Scale: Image is pixel art. In 2D it was ~48px. 
        // In 3D world unit... let's say 48 units?
        sprite.scale.set(64, 64, 1);
        sprite.position.set(x, 32, z); // y is half height

        // Add Name Tag
        const name = nickname || 'Unknown';
        const label = this.createNameLabel(name);
        // Sprites can't have children in Three.js usually (they are simple objects).
        // Wait, THREE.Object3D can have children.
        // But THREE.Sprite is a mesh that faces camera.
        // If we add label as child of sprite, it will inherit scale/rotation.
        // It's better to create a Group if we want to bundle them.

        // Correct approach: Return a Group containing both?
        // OR just add label to scene and sync position. 
        // Grouping is cleaner.

        const group = new THREE.Group();
        group.position.set(x, 0, z); // Group handles position

        // Reset local sprite pos since group is at (x,0,z)
        sprite.position.set(0, 32, 0);
        group.add(sprite);

        // Add label above head
        label.position.set(0, 80, 0);
        group.add(label);

        this.scene.add(group);
        return group; // We now return the GROUP, not just sprite
    }

    setupTrees() {
        const treePositions = [
            { x: 400, y: 300 }, { x: 800, y: 400 }, { x: 200, y: 800 },
            { x: 1200, y: 200 }, { x: 1500, y: 600 }, { x: 1000, y: 1000 },
            { x: 300, y: 1500 }, { x: 1600, y: 1600 }, { x: 600, y: 1200 },
            { x: 1800, y: 300 }, { x: 500, y: 500 }, { x: 1300, y: 1300 },
        ];

        treePositions.forEach(pos => {
            const sprite = new THREE.Sprite(this.treeMaterial);
            sprite.scale.set(128, 128, 1);
            sprite.position.set(pos.x, 64, pos.y); // Y is Z in 2D
            this.scene.add(sprite);
        });
    }

    createNameLabel(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.font = 'Bold 32px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';

        // Shadow/Stroke for readability
        context.shadowColor = "black";
        context.shadowBlur = 4;
        context.lineWidth = 4;
        context.strokeText(text, 128, 48);
        context.fillText(text, 128, 48);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        // Aspect ratio fix
        sprite.scale.set(128, 32, 1);
        sprite.position.set(0, 40, 0); // Relative to parent

        return sprite;
    }

    addOtherPlayer(sid, info) {
        if (this.otherPlayers[sid]) return;
        console.log("Adding 3D other player", sid);
        const group = this.createCharacterSprite(info.x || 0, info.y || 0, false, info.nickname);
        this.otherPlayers[sid] = group;
    }

    updateOtherPlayer(sid, x, y) {
        const p = this.otherPlayers[sid];
        if (p) {
            // p is now a Group
            p.position.set(x, 0, y);
        } else {
            // Might need to add if missing
            // Cannot add here easily without nickname info, wait for next full sync or 'new_player'
        }
    }

    removeOtherPlayer(sid) {
        if (this.otherPlayers[sid]) {
            this.scene.remove(this.otherPlayers[sid]);
            delete this.otherPlayers[sid];
        }
    }

    onKey(e, down) {
        const k = e.key.toLowerCase();
        if (this.keys.hasOwnProperty(k)) this.keys[k] = down;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    initJoystick() {
        const zone = document.getElementById('joystick-zone');
        if (typeof nipplejs !== 'undefined' && zone) {
            this.manager = nipplejs.create({
                zone: zone,
                mode: 'dynamic',
                color: 'white'
            });

            this.manager.on('move', (evt, data) => {
                // Hide hint on first move
                const hint = document.getElementById('touch-hint');
                if (hint) hint.style.display = 'none';

                if (data.vector) {
                    this.joystickData.active = true;
                    this.joystickData.x = data.vector.x;
                    this.joystickData.y = -data.vector.y;
                }
            });

            // Show hint if mobile
            const hint = document.getElementById('touch-hint');
            if (hint) hint.style.display = 'block';

            this.updateDebug("Joystick Ready");
            this.joystickData.active = false;
            this.joystickData.x = 0;
            this.joystickData.y = 0;
        });

        this.updateDebug("Joystick Initialized");
    } else {
    // this.updateDebug("Nipple.js not found or zone missing");
}
    }

updateDebug(text) {
    const d = document.getElementById('debug');
    if (d) d.innerHTML += '<br>' + text;
}

animate() {
    requestAnimationFrame(this.animate);

    // Movement Logic
    if (this.myPlayer) {
        const speed = 5;
        let dx = 0;
        let dz = 0;

        if (this.keys.w) dz -= speed;
        if (this.keys.s) dz += speed;
        if (this.keys.a) dx -= speed;
        if (this.keys.d) dx += speed;

        // Joystick Override
        if (this.joystickData.active) {
            dx = this.joystickData.x * speed;
            dz = this.joystickData.y * speed;
        }

        if (dx !== 0 || dz !== 0) {
            this.myPlayer.position.x += dx;
            this.myPlayer.position.z += dz;

            // Clamp to world
            this.myPlayer.position.x = Math.max(0, Math.min(2000, this.myPlayer.position.x));
            this.myPlayer.position.z = Math.max(0, Math.min(2000, this.myPlayer.position.z));

            // Send to server
            // Throttle? For prototype, just send per frame or check delta
            this.socketManager.emitMove(this.myPlayer.position.x, this.myPlayer.position.z);
        }

        // Camera Follow
        // Smoothly follow player
        const targetPos = this.myPlayer.position.clone();
        targetPos.y += 800; // Height offset
        targetPos.z += 800; // Back offset

        this.camera.position.lerp(targetPos, 0.1);
        this.camera.lookAt(this.myPlayer.position);
    }

    this.renderer.render(this.scene, this.camera);
}
}

// UI Logic & Start
document.getElementById('join-btn').addEventListener('click', () => {
    const input = document.getElementById('nickname-input');
    const name = input.value.trim();
    if (name) {
        document.getElementById('login-overlay').style.display = 'none';
        startGame(name);
    } else {
        alert("Please enter a nickname!");
    }
});

function startGame(nickname) {
    try {
        const game = new Game3D(nickname);
        game.updateDebug(`Welcome, ${nickname}!`);
    } catch (e) {
        document.getElementById('debug').innerHTML += '<br>Init Error: ' + e.message;
    }
}

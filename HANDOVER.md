# Project Handover: Huey World

## 📝 Overview
A real-time multiplayer 2D top-down game built with **Phaser 3** (Frontend) and **FastAPI + Socket.IO** (Backend). Players control a fox character in a grid-based world with procedural trees and a minimap.


## Rules
1. Git commit과 push는 유저가 요청할때에만 수행할것.
2. *.js 파일은 수정한 이후에 문법 오류가 없는지 꼭 체크할 것.

---

## 🚀 Current Technical State
- **Core Stack**:
  - **Frontend**: Phaser 3, Socket.IO Client.
  - **Backend**: Python (FastAPI, python-socketio), Uvicorn, **SQLite (Guestbook)**, **JSON (Map Persistence)**.
  - **Plugins**: Rex Virtual Joystick (for mobile support).


---

## 🛠 Features Implemented
1.  **Multiplayer Sync**: 
    - Real-time position updates.
    - **Nickname Sync & Validation**: Join & Update events verify nicknames for uniqueness to prevent duplicates.
    - **Spawn Logic**: New players spawn in the safe zone (-100 to 100).
2.  **World Setup**: 
    - Coordinates: `-1000` to `1000` (Center is `0,0`).
    - **Background**: Seamless dirt ground tile (no borders).
    - **Safe Zone**: `150px` radius at the center (no trees spawn here).
3.  31: **Movement & Physics**: 
32:     - **Quadrant-Limited Dynamic Joystick**: Active only in the bottom-left quadrant (3rd quadrant).
33:     - **Joystick Scale**: Reduced radius to `30px` for a compact UI.
34:     - **Tree Collisions**: Trees are part of a `StaticPhysicsGroup`. Collision boxes are optimized to the **trunk only** (20x20px), allowing players to walk behind leaves for a 3D feel.
35:     - Physics: Arcade Physics with world bound collision.
36:     - **Bobbing Animation**: Procedural "bounce" and "tilt" effects when moving (Players and NPCs).
37:     - **Visual Directionality**: Character sprites flip horizontally based on movement direction (Left/Right).

4.  **Visuals**:
    - **Y-Sorting**: Custom `updateDepth()` ensures characters appear behind trees when "above" them.
    - **Asset Scaling**: Character scaled to `48x48`, Trees to `96x96`.
5.  **UI**:
    - **Minimap** (Top-Right, 150x150px):
      - Shows entire 2000x2000 world scaled down.
      - **Sync indicators**: Green dot (Me), Orange dots (Others), Green circle (Safe zone).
      - **Enhanced Dots**: Trees (Dark Green) and NPCs (Specific colors) are visible for better awareness.
      - Fixed issue with duplicate minimaps.
    - **Debug Overlay**: Shows FPS, Position, Input, and Socket ID.
6.  **Guestbook (Bulletin Board)**:
    - Located at `(300, -50)` (Use Proximity or Click to open).
    - **Persistence**: Messages saved to `guestbook.db`.
    - **Real-time**: New posts broadcast to all connected players.
    - **Proximity Interaction**: Automatically opens if staying near for 2 seconds (Mobile friendly).
7.  **Map Persistence**:
    - World trees are saved to `db/map/forest.json`.
    - Server loads existing map on startup or generates a new one if missing.
9.  **Interactive Objects**:
    - **Bonfire**: Animated object at `(80, 50)` with flickering fire. Light range expanded to `400px` for better night coverage.
10. **NPC System (Wandering Creatures)**:
    - **Entities**: Roach (Fast/Jittery) and Sheep (Slow/Peaceful).
    - **Logic**: Server-side target-seeking and wandering logic.
    - **Scaling**: Rendered at `~85%` (42px) of player size.
11. **Day/Night Cycle & 2D Lighting**:
    - **Cycle**: 5-minute real-time day (300s). `0.0` is Midnight (`00:00`).
    - **Lighting**: Phaser 2D Light pipeline enabled for all sprites.
    - **Ambient**: Transitions between Midnight (Dark), Dawn (Purple), Noon (Bright), and Dusk (Orange).
    - **Clock**: 24-hour digital clock display below the minimap.
13. **Biomes & Terrain Expansion**:
    - **Snow Biome (Top)**: Snowy ground and trees at `Y < -700`.
    - **Desert Biome (Bottom)**: Sandy ground and cacti at `Y > 700`.
    - **Density**: Tree count increased to `120` for a more lush/populated world.
14. **Visual Juice (FX)**:
    - **Dust**: Walking creates dust clouds at feet.
    - **Sparks**: Bonfire emits animated fire sparks.
    - **Health Bars**: Color-coded HP bars (Green/Yellow/Red) synced for all players and NPCs. Positioned higher for players (-40px) to avoid name overlap.
15. **Refined Interactions**:
    - **Input Collision Fix**: Phaser key capture disabled when typing in HTML inputs (Nickname, Guestbook).
    - **Guestbook**: Click-to-open removed; now strictly proximity-based (2s cooldown) to prevent accidental clicks. 




---

## ⚠️ Known Issues
1.  **Connection Handshake**:
    - Occasionally players might get stuck on "Connecting..." if the server restarts. A refresh usually fixes this.

---

## 🗺️ Next Steps (Brainstormed Ideas)
1.  **Visual Juice**:
    - [x] **Particle Effects**: Dust on walking, fire sparks (Completed).
    - [/] **Environmental Life**: NPCs (Roach/Sheep) wander the world (In-progress).
    - [ ] **Weather System**: Occasional rainy phases affecting lighting.
2.  **Social & Expression**:
    - [x] **Emoji Popups**: Numbers 1-4 triggers emoji bubbles above head (Completed).
    - [ ] **Global Chat**: Real-time communication bar.
    - [ ] **Titles**: Achievement-based labels (e.g., "Night Owl").

3.  **Gamification**:
    - [ ] **Collectibles**: Gathering acorns or flowers in the woods.
    - [ ] **Pets**: Small companions following the player.
4.  **Audio**:
    - [ ] **BGM/SFX**: Atmospheric forest music and walking sound effects.

## ✅ Completed in this Session (Latest)
- **Visual FX**: Added real-time health bars (synced) and movement dust/fire sparks.
- **World Expansion**: Implemented Snow and Desert biomes with unique textures and objects (Cactus, Snow Tree).
- **Terrain Density**: Doubled total tree/object count (120) and triggered map regeneration.
- **Interaction Polish**: Fixed WASD input collision in UI fields and made guestbook proximity-only.
- **Atmosphere**: Smoothed bonfire animation (slowed duration x5) and lightened nighttime ambient for better visibility.
- **Character Refinement**: Raised player health bar height to -40px; added bobbing/tilting animations.
- **Physics**: Implemented tree collisions with optimized "trunk-only" hitboxes.
- **Minimap**: Added tree and NPC indicators for better world overview.






---

## 📁 Key File Structure
- `server.py`: FastAPI server logic. Handles `connect`, `join_game`, `player_move`, `set_nickname`.
- `static/js/main.scene.js`: Main Phaser logic. Handles `createMinimap`, `updateDepth`, Input.
- `static/js/socket.manager.js`: Robust Socket.IO client listeners with retry logic for sync.
- `static/index.html`: Main entry point with UI layers.
- `static/assets/`: Contains `character.png`, `tree.png`, `ground.png`.

---

## 🚩 Running the Project
```powershell
# Start Server
python server.py
# (Alternative using bat)
./run_server.bat
```
Open `http://localhost:8000` in the browser. Use **Ctrl+Shift+R** liberally after code changes to clear cache.

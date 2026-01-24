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

## 🗺️ Next Steps (Feature Proposals)

### Priority 1: Social & Communication 💬
1. **Global Chat System** ⭐⭐ (2-3 hours)
   - Real-time chat bar at bottom of screen
   - Message broadcasting to all players
   - Chat history (last 10 messages)
   - Nickname + timestamp display
   - **Impact**: High - Enables player communication and community building

2. **Player Actions/Emotes** ⭐⭐ (2 hours)
   - Sit/lie down animations
   - Wave hand gesture
   - Dance animation
   - AFK status indicator
   - **Impact**: Medium - Non-verbal communication

### Priority 2: Gameplay & Progression 🎮
3. **Collection System** ⭐⭐ (3-4 hours)
   - Collectible items spawned on map (acorns, flowers, mushrooms)
   - Click/proximity to collect
   - Inventory storage and display
   - Collection counter
   - **Impact**: High - Adds gameplay objective

4. **Achievement/Title System** ⭐⭐ (3 hours)
   - Achievements: "Night Explorer", "Social Butterfly", "Collector"
   - Title display above nickname
   - Achievement notification popup
   - Persistent storage in database
   - **Impact**: Medium - Long-term engagement

5. **Pet Companion System** ⭐⭐⭐ (4-5 hours)
   - Pet selection UI (cat, dog, bird)
   - Follow AI (tracks player position)
   - Y-sorting integration
   - Pet customization
   - **Impact**: High - Personalization and cuteness factor

### Priority 3: Atmosphere & Immersion 🌍
6. **Weather System** ⭐⭐⭐ (4-6 hours)
   - Rain/snow particle effects
   - Weather-based lighting changes
   - Periodic weather cycles (10-15 min)
   - Puddle effects during rain
   - **Impact**: High - Dynamic world feeling

7. **Audio System** ⭐ (1-2 hours)
   - Day/night BGM tracks
   - Walking sound effects
   - Bonfire crackling sound
   - Volume controls in UI
   - **Impact**: Medium - Immersion boost

### Priority 4: Advanced Features 🚀
8. **Mini-game: Hide & Seek** ⭐⭐⭐⭐ (6-8 hours)
   - Seeker assignment system
   - Game timer and scoring
   - Player visibility toggle
   - Game lobby UI
   - **Impact**: High - Player interaction and fun

9. **Player Homes/Tents** ⭐⭐⭐⭐ (8-10 hours)
   - Placeable tent/home objects
   - Interior scenes
   - Furniture customization
   - Persistent storage
   - **Impact**: Very High - Personal space and creativity

---

### Completed Features ✅
- [x] **Particle Effects**: Dust on walking, fire sparks
- [x] **Emoji Popups**: Numbers 1-4 triggers emoji bubbles above head
- [x] **Environmental Life**: NPCs (Roach/Sheep) wander the world
- [x] **Day/Night Cycle**: 5-minute cycle with 2D lighting
- [x] **Biome System**: Snow, Forest, Desert with unique objects
- [x] **Collision System**: Tree/object collision with trunk-only hitboxes

## ✅ Completed in this Session (Latest)
- **User Authentication**: 
  - Implemented secure ID/Password system with bcrypt hashing
  - Added "Remember Me" auto-login using persistent session tokens
  - Created modern login/signup UI in `static/login.html`
  - Integrated authenticated data (nickname/skin) into the game join flow
  - Added logout functionality
- **Object Interaction**:
  - Implemented static physics collision for the bonfire and guestbook board
  - Character can no longer pass through these entities
- **Sprite Optimization**: 
  - Fixed cactus sprite: removed thick edges with clean transparent background
  - Fixed snow_tree sprite: removed background artifacts using magenta-bg generation method
  - Fixed npc_roach2 sprite: removed white background for clean transparency
- **Collision System**: 
  - Added type-specific collision boxes for cactus (16x16) and snow_tree (20x20)
  - All biome objects now have proper trunk-only collision detection
- **Rendering Fixes**:
  - Fixed character clipping at biome boundaries by excluding backgrounds from updateDepth()
  - Set proper depth hierarchy: backgrounds (-1001 to -999), transitions (-999), characters (Y-based)
  - Successfully eliminated all sharp biome edges using the "Seam Sandwich" technique (solid buffer strip + dual gradients), ensuring 100% gapless blending for snow and desert boundaries.
- **Atmosphere & Polish**:
  - Brightened midnight ambient lighting for better visibility
  - Cleared 350px "safe zone" radius around bonfire by removing nearby trees
  - Adjusted bonfire light intensity and expanded 1.5x radius for softer coverage
- **Project Structure**: Organized all utility scripts into the `scripts/` directory
- **Cache Management**: Updated all sprite versions for proper browser cache invalidation






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

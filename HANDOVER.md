# Project Handover: Huey World

## 📝 Overview
A real-time multiplayer 2D top-down game built with **Phaser 3** (Frontend) and **FastAPI + Socket.IO** (Backend). Players control a fox character in a grid-based world with procedural trees and a minimap.


## Rules
- Git commit과 push는 유저가 요청할때에만 수행할것.

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
    - **Nickname Sync**: Join & Update events verify nicknames to prevent "Unknown" players.
    - **Spawn Logic**: New players spawn in the safe zone (-100 to 100).
2.  **World Setup**: 
    - Coordinates: `-1000` to `1000` (Center is `0,0`).
    - **Background**: Seamless dirt ground tile (no borders).
    - **Safe Zone**: `150px` radius at the center (no trees spawn here).
3.  **Movement & Physics**: 
    - Combined Keyboard (Cursors) + Virtual Joystick input.
    - **Directional Flip**: Character sprite flips left/right based on movement direction.
    - Physics: Arcade Physics with world bound collision.
4.  **Visuals**:
    - **Y-Sorting**: Custom `updateDepth()` ensures characters appear behind trees when "above" them.
    - **Asset Scaling**: Character scaled to `48x48`, Trees to `96x96`.
5.  **UI**:
    - **Minimap** (Top-Right, 150x150px):
      - Shows entire 2000x2000 world scaled down.
      - **Sync indicators**: Green dot (Me), Orange dots (Others), Green circle (Safe zone).
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
12. **Character Refinements**:
    - **Panda Skin Fix**: Restored opacity (Alpha 255) to 30,000+ white fur pixels that were accidentally transparent.


---

## ⚠️ Known Issues
1.  **Connection Handshake**:
    - Occasionally players might get stuck on "Connecting..." if the server restarts. A refresh usually fixes this.

---

## 🗺️ Next Steps (Brainstormed Ideas)
1.  **Visual Juice**:
    - [ ] **Particle Effects**: Dust on walking, fire sparks, rain/snow.
    - [ ] **Environmental Life**: More reactive entities (e.g., squirrels, birds).
    - [ ] **Weather System**: Occasional rainy phases affecting lighting.
2.  **Social & Expression**:
    - [ ] **Emoji Popups**: Numbers 1-4 triggers emoji bubbles above head (High Priority).
    - [ ] **Global Chat**: Real-time communication bar.
    - [ ] **Titles**: Achievement-based labels (e.g., "Night Owl").

3.  **Gamification**:
    - [ ] **Collectibles**: Gathering acorns or flowers in the woods.
    - [ ] **Pets**: Small companions following the player.
4.  **Audio**:
    - [ ] **BGM/SFX**: Atmospheric forest music and walking sound effects.

## ✅ Completed in this Session (Latest)
- **Day/Night System**: Implemented 5-minute cycle with Phaser 2D lighting and ambient color shifts.
- **Game Clock**: Added 24-hour UI display below the minimap (00:00 synchronized with server).
- **NPC System**: Added wandering Roach and Sheep with server-side logic and multiplayer sync.
- **Panda Skin Fix**: Restored opacity to white fur areas via custom processing script.
- **Lighting Refinement**: Doubled bonfire range (400px), removed player self-light, and darkened night phase.
- **Bug Fixes**: Resolved `math` import errors and syntax issues in `main.scene.js`.




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

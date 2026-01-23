# Project Handover: Huey World

## 📝 Overview
A real-time multiplayer 2D top-down game built with **Phaser 3** (Frontend) and **FastAPI + Socket.IO** (Backend). Players control a fox character in a grid-based world with procedural trees and a minimap.

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
8.  **Interactive Objects**:
    - **Bonfire**: Animated object at `(80, 50)` with flickering fire and ground glow.
9.  **Character Selection System**:
    - 4 unique skins: Fox, Cyber-Cat, Shi-Dog, Panda-Mage.
    - Lobby UI for selection with real-time sync across players.
    - High-quality pixel art with refined transparency and proportional scaling.

---

## ⚠️ Known Issues
1.  **Connection Handshake**:
    - Occasionally players might get stuck on "Connecting..." if the server restarts. A refresh usually fixes this.

---

## 🗺️ Next Steps (Brainstormed Ideas)
1.  **Visual Juice**:
    - [ ] **Day/Night System**: Dynamic lighting that changes with time.
    - [ ] **Particle Effects**: Dust on walking, fire sparks, rain/snow.
    - [ ] **Environmental Life**: Butterflies or squirrels that react to players.
2.  **Social & Expression**:
    - [ ] **Emoji Popups**: Numbers 1-4 triggers emoji bubbles above head (High Priority).
    - [ ] **Global Chat**: Real-time communication bar.
    - [ ] **Titles**: Achievement-based labels (e.g., "Fire Keeper").
3.  **Gamification**:
    - [ ] **Collectibles**: Gathering acorns or flowers in the woods.
    - [ ] **Pets**: Small companions following the player.
4.  **Audio**:
    - [ ] **BGM/SFX**: Atmospheric forest music and walking sound effects.

## ✅ Completed in this Session (Latest)
- **Character Selection**: Grid-based skin choosing with 4 unique assets.
- **Sprite Refinement**: Specialized transparency and padding cleanup for all skins.
- **Collision & Navigation**: Physics-based tree collisions and improved joystick feel.
- **Map Persistence**: JSON-based world state handling.
- **Multiplayer Sync**: Fixed character flipping and scaling issues for all skins.



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

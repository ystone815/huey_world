# Project Handover: Huey World

## 📝 Overview
A real-time multiplayer 2D top-down game built with **Phaser 3** (Frontend) and **FastAPI + Socket.IO** (Backend). Players control a fox character in a grid-based world with procedural trees and a minimap.

---

## 🚀 Current Technical State
- **Branch/Commit**: Reverted to `3f90ab52adffcd92cecd31d608a51bb147282b82` (Stable version with 0,0 center origin and 150px safe zone).
- **Core Stack**:
  - **Frontend**: Phaser 3, Socket.IO Client.
  - **Backend**: Python (FastAPI, python-socketio), Uvicorn.
  - **Plugins**: Rex Virtual Joystick (for mobile support).

---

## 🛠 Features Implemented
1.  **Multiplayer Sync**: Real-time position updates via `player_move` (emit) and `player_moved` (listen).
2.  **World Setup**: 
    - Coordinates: `-1000` to `1000` (Center is `0,0`).
    - Safe Zone: `150px` radius at the center (no trees spawn here).
    - Grid Background: TileSprite based texture.
3.  **Movement**: 
    - Combined Keyboard (Cursors) + Virtual Joystick input.
    - Physics: Arcade Physics with world bound collision.
4.  **Visuals**:
    - **Y-Sorting**: Custom `updateDepth()` ensures characters appear behind trees when "above" them.
    - **Asset Scaling**: Character scaled to `48x48`, Trees to `96x96`.
5.  **UI**:
    - **Minimap** (Top-Right, 150x150px):
      - Shows entire 2000x2000 world scaled down.
      - Green dot = My player position (real-time sync).
      - Orange dots = Other players (multiplayer sync).
      - Green circle = Safe zone indicator (center).
      - Implemented in `createMinimap()` and `updateMinimap()` methods.
    - **Debug Overlay**: Shows FPS, Position, Input, and Socket ID.

---

## ⚠️ Known Issues & Context for Next Steps
1.  **Connection Handshake**:
    - There were recent crashes/hangs when switching from manual `join_game` events to Socket.IO `auth` payloads. 
    - **Current Hack**: The stable commit `3f90ab5` uses a manual join approach. If players get stuck on "Connecting...", ensure the `join_game` event is being fired *after* the connection is established.
2.  **Visibility Bug**:
    - Sometimes the Guest cannot see the Host (or vice versa). This is usually because the `current_players` event needs to be handled robustly to iterate through ALL existing players upon joining.
3.  **Nickname Sync**:
    - "Unknown" names appear if the nickname isn't passed immediately during the join handshake.
4.  **UI "Status: Offline"**:
    - A persistent text element sometimes covers the screen. Check `MainScene.js` for `this.connText` lifecycle.

---

## 📁 Key File Structure
- `server.py`: FastAPI server logic and Socket.IO event handlers (`connect`, `join_game`, `player_move`).
- `static/js/main.scene.js`: Main Phaser logic (Input, Rendering, Depth sorting).
- `static/js/socket.manager.js`: Handles all Socket.IO client-side listeners.
- `static/index.html`: Main entry point with UI layers and global error handling.

---

## 🚩 Running the Project
```powershell
# Start Server
python server.py
# (Alternative using bat)
./run_server.bat
```
Open `http://localhost:8000` in the browser. Use **Ctrl+Shift+R** liberally after code changes to clear cache.

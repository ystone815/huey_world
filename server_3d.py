from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import socketio
import bcrypt
import secrets
import sqlite3
import os
import json
import math
import asyncio
from datetime import datetime, timedelta, timezone
from starlette.responses import FileResponse

# 1. Create Socket.IO Server (Async)
# We need to handle 3D coordinates (x, y, z)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# 2. Wrap with ASGI Application
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start NPC loop and Time loop (Can be shared logic)
    print("Huey3D: Starting 3D-aware NPC movement loop...")
    asyncio.create_task(update_npcs_loop())
    print("Huey3D: Starting World Time loop...")
    asyncio.create_task(update_world_time_loop())
    yield
    print("Huey3D: Powering down...")

app = FastAPI(lifespan=lifespan, title="Huey3D Integrated Server")
socket_app = socketio.ASGIApp(sio, app)

# 3. Mount Static Files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_3d_index():
    return FileResponse('static/3d.html')

@app.get("/login")
async def read_login():
    # Share the same login page, or it might need UI tweaks for 3D?
    # For now, let's just serve a link to 3d.html after login if needed
    # Actually, 3d.html will have its own built-in lobby like index.html
    return FileResponse('static/3d.html')

# --- Shared Models & Logic from server.py ---

class SignupRequest(BaseModel):
    username: str
    password: str
    nickname: str

class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False

class TokenRequest(BaseModel):
    token: str

class InventoryItem(BaseModel):
    item_id: str
    quantity: int
    slot_index: int

class InventoryUpdateRequest(BaseModel):
    token: str
    items: List[InventoryItem]

class PlaceObjectRequest(BaseModel):
    token: str
    type: str
    x: float
    y: float
    z: float = 0 # Default height

class RemoveObjectRequest(BaseModel):
    token: str
    x: float
    y: float
    z: float = 0

class ScoreSubmitRequest(BaseModel):
    token: str
    game_id: str
    score: int

# User Database Path (SHARED)
USER_DB_PATH = 'db/user/users.db'
WORLD_DB_PATH = 'db/world/world.db'

BUILD_COSTS = {
    'fence_wood': {'wood': 2},
    'wall_stone': {'snow_crystal': 2},
    'bonfire': {'wood': 1, 'cactus_fiber': 1},
    'voxel_box': {'wood': 1} # New for 3D prototype
}

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def generate_token() -> str:
    return secrets.token_urlsafe(32)

def get_user_db():
    return sqlite3.connect(USER_DB_PATH)

def get_world_db():
    return sqlite3.connect(WORLD_DB_PATH)

# --- Endpoints (Exact mirror of server.py) ---

@app.post("/api/signup")
async def signup(request: SignupRequest):
    try:
        if len(request.username) < 3 or len(request.password) < 6:
            raise HTTPException(status_code=400, detail="Invalid length")
        
        conn = get_user_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ?", (request.username,))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="Username exists")
        
        cursor.execute("INSERT INTO users (username, password_hash, nickname, last_login) VALUES (?, ?, ?, ?)",
                       (request.username, hash_password(request.password), request.nickname, datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/login")
async def login(request: LoginRequest):
    conn = get_user_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash, nickname, skin FROM users WHERE username = ?", (request.username,))
    user = cursor.fetchone()
    if not user or not verify_password(request.password, user[2]):
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id, username, _, nickname, skin = user
    token = None
    if request.remember_me:
        token = generate_token()
        cursor.execute("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
                       (token, user_id, (datetime.now() + timedelta(days=30)).isoformat()))
    conn.commit()
    conn.close()
    return {"success": True, "user": {"id": user_id, "username": username, "nickname": nickname, "skin": skin or "skin_fox"}, "token": token}

@app.post("/api/verify-token")
async def verify_token(request: TokenRequest):
    conn = get_user_db()
    cursor = conn.cursor()
    cursor.execute("SELECT s.user_id, s.expires_at, u.username, u.nickname, u.skin FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?", (request.token,))
    session = cursor.fetchone()
    if not session or datetime.fromisoformat(session[1]) < datetime.now():
        conn.close()
        raise HTTPException(status_code=401, detail="Expired")
    conn.close()
    return {"success": True, "user": {"id": session[0], "username": session[2], "nickname": session[3], "skin": session[4] or "skin_fox"}}

@app.post("/api/inventory/get")
async def get_inventory(request: TokenRequest):
    conn = get_user_db()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM sessions WHERE token = ?", (request.token,))
    session = cursor.fetchone()
    if not session: raise HTTPException(status_code=401)
    cursor.execute("SELECT item_id, quantity, slot_index FROM inventory WHERE user_id = ?", (session[0],))
    data = [{"item_id": i[0], "quantity": i[1], "slot_index": i[2]} for i in cursor.fetchall()]
    conn.close()
    return {"success": True, "inventory": data}

@app.post("/api/inventory/update")
async def update_inventory(request: InventoryUpdateRequest):
    conn = get_user_db()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM sessions WHERE token = ?", (request.token,))
    sess = cursor.fetchone()
    if not sess: raise HTTPException(status_code=401)
    cursor.execute("DELETE FROM inventory WHERE user_id = ?", (sess[0],))
    for i in request.items:
        cursor.execute("INSERT INTO inventory (user_id, item_id, quantity, slot_index) VALUES (?, ?, ?, ?)", (sess[0], i.item_id, i.quantity, i.slot_index))
    conn.commit(); conn.close()
    return {"success": True}

@app.get("/api/world/objects")
async def get_world_objects():
    conn = get_world_db()
    cursor = conn.cursor()
    # Update for 3D coords if table supports it, else use 0 for Z
    try:
        cursor.execute("SELECT type, x, y, z, owner_username FROM placed_objects")
        rows = cursor.fetchall()
        objs = [{"type": r[0], "x": r[1], "y": r[2], "z": r[3], "owner": r[4]} for r in rows]
    except:
        cursor.execute("SELECT type, x, y, owner_username FROM placed_objects")
        rows = cursor.fetchall()
        objs = [{"type": r[0], "x": r[1], "y": r[2], "z": 0, "owner": r[3]} for r in rows]
    conn.close()
    return {"success": True, "objects": objs}

@app.post("/api/world/place")
async def place_object(request: PlaceObjectRequest):
    # Simplified validation from server.py
    user_conn = get_user_db()
    user_cursor = user_conn.cursor()
    user_cursor.execute("SELECT u.id, u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?", (request.token,))
    session = user_cursor.fetchone()
    if not session: raise HTTPException(status_code=401)
    
    # Cost check
    costs = BUILD_COSTS.get(request.type, {})
    for item_id, qty in costs.items():
        user_cursor.execute("SELECT quantity FROM inventory WHERE user_id =? AND item_id =?", (session[0], item_id))
        row = user_cursor.fetchone()
        if not row or row[0] < qty: raise HTTPException(status_code=400, detail=f"No {item_id}")
        user_cursor.execute("UPDATE inventory SET quantity = quantity - ? WHERE user_id =? AND item_id =?", (qty, session[0], item_id))

    user_conn.commit(); user_conn.close()
    
    world_conn = get_world_db()
    world_cursor = world_conn.cursor()
    # Try to insert Z if column exists
    try:
        world_cursor.execute("INSERT INTO placed_objects (type, x, y, z, owner_username) VALUES (?, ?, ?, ?, ?)", (request.type, request.x, request.y, request.z, session[1]))
    except:
        world_cursor.execute("INSERT INTO placed_objects (type, x, y, owner_username) VALUES (?, ?, ?, ?)", (request.type, request.x, request.y, session[1]))
    world_conn.commit(); world_conn.close()
    
    new_obj = {"type": request.type, "x": request.x, "y": request.y, "z": request.z, "owner": session[1]}
    await sio.emit('object_placed', new_obj)
    return {"success": True}

# --- Game Logic & Sync ---

players = {}
npcs = {} # Will load from logic
world_time = 0.5

async def update_world_time_loop():
    global world_time
    import time
    while True:
        world_time = (time.time() % 300) / 300
        await sio.emit('time_update', {'world_time': world_time})
        await asyncio.sleep(5)

async def update_npcs_loop():
    # Same as server.py but can add Z axis later
    while True:
        await asyncio.sleep(0.1)

@sio.event
async def connect(sid, environ):
    players[sid] = {'x': 0, 'y': 0, 'z': 0, 'nickname': '...', 'skin': 'skin_fox'}

@sio.on('set_nickname')
async def on_set_nickname(sid, data):
    players[sid].update({'nickname': data.get('nickname', 'Fox'), 'skin': data.get('skin', 'skin_fox')})
    await sio.emit('new_player', {'sid': sid, 'player': players[sid]})
    await sio.emit('current_players', players)

@sio.on('player_move')
async def on_player_move(sid, data):
    if sid in players:
        players[sid].update({'x': data['x'], 'y': data['y'], 'z': data.get('z', 0)})
        await sio.emit('player_moved', {'sid': sid, **players[sid]})

if __name__ == "__main__":
    uvicorn.run(socket_app, host="0.0.0.0", port=8001)

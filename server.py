from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import socketio
import bcrypt
import secrets

# 1. Create Socket.IO Server (Async)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# 2. Wrap with ASGI Application
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start NPC loop and Time loop
    print("Server: Starting NPC movement loop...")
    asyncio.create_task(update_npcs_loop())
    print("Server: Starting World Time loop...")
    asyncio.create_task(update_world_time_loop())
    yield

    # Shutdown logic (optional)
    print("Server: Shutting down...")

app = FastAPI(lifespan=lifespan)
socket_app = socketio.ASGIApp(sio, app)


# 3. Mount Static Files
app.mount("/static", StaticFiles(directory="static"), name="static")

# 4. Route for index.html
from starlette.responses import FileResponse

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')

@app.get("/login")
async def read_login():
    return FileResponse('static/login.html')

# Pydantic Models for Authentication
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

# User Database Path
USER_DB_PATH = 'db/user/users.db'

# Authentication Helper Functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def generate_token() -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)

def get_user_db():
    """Get database connection for users"""
    return sqlite3.connect(USER_DB_PATH)

# Authentication Endpoints
@app.post("/api/signup")
async def signup(request: SignupRequest):
    """Create a new user account"""
    try:
        # Validate input
        if len(request.username) < 3:
            raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
        if len(request.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        if len(request.nickname) < 1:
            raise HTTPException(status_code=400, detail="Nickname is required")
        
        conn = get_user_db()
        cursor = conn.cursor()
        
        # Check if username already exists
        cursor.execute("SELECT id FROM users WHERE username = ?", (request.username,))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Hash password and create user
        password_hash = hash_password(request.password)
        cursor.execute(
            "INSERT INTO users (username, password_hash, nickname, last_login) VALUES (?, ?, ?, ?)",
            (request.username, password_hash, request.nickname, datetime.now().isoformat())
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        
        return {"success": True, "message": "Account created successfully", "user_id": user_id}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/login")
async def login(request: LoginRequest):
    """Authenticate user and optionally create session token"""
    try:
        conn = get_user_db()
        cursor = conn.cursor()
        
        # Get user by username
        cursor.execute(
            "SELECT id, username, password_hash, nickname, skin FROM users WHERE username = ?",
            (request.username,)
        )
        user = cursor.fetchone()
        
        if not user or not verify_password(request.password, user[2]):
            conn.close()
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        user_id, username, _, nickname, skin = user
        
        # Update last login
        cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", 
                      (datetime.now().isoformat(), user_id))
        conn.commit()
        
        # Generate token if remember_me is true
        token = None
        if request.remember_me:
            token = generate_token()
            expires_at = (datetime.now() + timedelta(days=30)).isoformat()
            cursor.execute(
                "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
                (token, user_id, expires_at)
            )
            conn.commit()
        
        conn.close()
        
        return {
            "success": True,
            "user": {
                "id": user_id,
                "username": username,
                "nickname": nickname,
                "skin": skin or "skin_fox"
            },
            "token": token
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/verify-token")
async def verify_token(request: TokenRequest):
    """Verify auto-login token and return user data"""
    try:
        conn = get_user_db()
        cursor = conn.cursor()
        
        # Get session and check expiry
        cursor.execute(
            """SELECT s.user_id, s.expires_at, u.username, u.nickname, u.skin 
               FROM sessions s 
               JOIN users u ON s.user_id = u.id 
               WHERE s.token = ?""",
            (request.token,)
        )
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id, expires_at, username, nickname, skin = session
        
        # Check if token expired
        if datetime.fromisoformat(expires_at) < datetime.now():
            # Clean up expired token
            cursor.execute("DELETE FROM sessions WHERE token = ?", (request.token,))
            conn.commit()
            conn.close()
            raise HTTPException(status_code=401, detail="Token expired")
        
        # Update last login
        cursor.execute("UPDATE users SET last_login = ? WHERE id = ?",
                      (datetime.now().isoformat(), user_id))
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "user": {
                "id": user_id,
                "username": username,
                "nickname": nickname,
                "skin": skin or "skin_fox"
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Token verification error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Inventory Endpoints
@app.post("/api/inventory/get")
async def get_inventory(request: TokenRequest):
    """Fetch user's inventory by session token"""
    try:
        conn = get_user_db()
        cursor = conn.cursor()
        
        # Verify token
        cursor.execute(
            "SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?",
            (request.token, datetime.now().isoformat())
        )
        session = cursor.fetchone()
        if not session:
            conn.close()
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        user_id = session[0]
        
        # Get inventory items
        cursor.execute(
            "SELECT item_id, quantity, slot_index FROM inventory WHERE user_id = ?",
            (user_id,)
        )
        items = cursor.fetchall()
        conn.close()
        
        inventory_data = [
            {"item_id": i[0], "quantity": i[1], "slot_index": i[2]} 
            for i in items
        ]
        
        return {"success": True, "inventory": inventory_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get inventory error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/inventory/update")
async def update_inventory(request: InventoryUpdateRequest):
    """Batch update user's inventory"""
    try:
        conn = get_user_db()
        cursor = conn.cursor()
        
        # Verify token
        cursor.execute(
            "SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?",
            (request.token, datetime.now().isoformat())
        )
        session = cursor.fetchone()
        if not session:
            conn.close()
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        user_id = session[0]
        
        # Start transaction
        # Delete existing inventory for this user
        cursor.execute("DELETE FROM inventory WHERE user_id = ?", (user_id,))
        
        # Insert new items
        for item in request.items:
            cursor.execute(
                "INSERT INTO inventory (user_id, item_id, quantity, slot_index) VALUES (?, ?, ?, ?)",
                (user_id, item.item_id, item.quantity, item.slot_index)
            )
            
        conn.commit()
        conn.close()
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update inventory error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Minigame & Leaderboard Endpoints
class ScoreSubmitRequest(BaseModel):
    token: str
    game_id: str
    score: int

@app.post("/api/minigame/submit")
async def submit_score(request: ScoreSubmitRequest):
    """Securely submit a minigame score for a specific game"""
    try:
        conn = get_user_db()
        cursor = conn.cursor()
        
        # Verify token (matching naive string format used in login/verify-token)
        cursor.execute(
            "SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?",
            (request.token, datetime.now().isoformat())
        )
        session = cursor.fetchone()
        if not session:
            conn.close()
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        user_id = session[0]
        
        # Insert score with game_id
        cursor.execute(
            "INSERT INTO leaderboard (user_id, game_id, score) VALUES (?, ?, ?)",
            (user_id, request.game_id, request.score)
        )
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Score submitted"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Score submit error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/minigame/leaderboard")
async def get_leaderboard(game_id: str = 'cactus_dodge'):
    """Fetch global top 10 scores for a specific game"""
    try:
        conn = get_user_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.nickname, MAX(l.score) as high_score 
            FROM leaderboard l
            JOIN users u ON l.user_id = u.id
            WHERE l.game_id = ?
            GROUP BY l.user_id
            ORDER BY high_score DESC
            LIMIT 10
        """, (game_id,))
        rows = cursor.fetchall()
        conn.close()
        
        leaderboard = [
            {"nickname": r[0], "score": r[1]} for r in rows
        ]
        return {"success": True, "leaderboard": leaderboard}
    except Exception as e:
        print(f"Get leaderboard error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/logout")
async def logout(request: TokenRequest):
    """Invalidate session token"""
    try:
        conn = get_user_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = ?", (request.token,))
        conn.commit()
        conn.close()
        return {"success": True, "message": "Logged out successfully"}
    except Exception as e:
        print(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# In-memory player storage
players = {}

# Game World Data (Trees)
import random
import sqlite3
import os
import json
import math
from datetime import datetime, timedelta, timezone


MAP_DIR = 'db/map'
MAP_FILE = os.path.join(MAP_DIR, 'forest.json')


MAP_SIZE = 900
SAFE_RADIUS = 150
TREE_COUNT = 120
world_trees = []

# NPC Data
NPC_COUNT = 10
npcs = {}
NPC_TYPES = ['roach', 'sheep']

def init_npcs():
    global npcs
    for i in range(NPC_COUNT):
        npc_id = f"npc_{i}"
        npc_type = random.choice(NPC_TYPES)
        npcs[npc_id] = {
            'id': npc_id,
            'type': npc_type,
            'x': random.randint(-MAP_SIZE, MAP_SIZE),
            'y': random.randint(-MAP_SIZE, MAP_SIZE),
            'target_x': 0,
            'target_y': 0,
            'speed': 2.0 if npc_type == 'roach' else 1.0,
            'hp': 100,
            'max_hp': 100,
            'last_move': 0
        }
        # Set initial target
        npcs[npc_id]['target_x'] = npcs[npc_id]['x'] + random.randint(-100, 100)
        npcs[npc_id]['target_y'] = npcs[npc_id]['y'] + random.randint(-100, 100)

init_npcs()

# Database setup
DB_PATH = 'db/guestbook.db'

def init_db():
    # Ensure directory exists
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
        
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Note: timestamp column exists from previous schema (DATETIME DEFAULT CURRENT_TIMESTAMP)
    # We will explicit insert timestamp now, so schema change isn't strictly necessary for new rows.
    c.execute('''CREATE TABLE IF NOT EXISTS messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  nickname TEXT, 
                  message TEXT, 
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

def get_kst_now_str():
    # UTC+9
    now_kst = datetime.now(timezone.utc) + timedelta(hours=9)
    return now_kst.strftime('%Y-%m-%d %H:%M:%S')

def add_message_to_db(nickname, message, timestamp_str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO messages (nickname, message, timestamp) VALUES (?, ?, ?)", (nickname, message, timestamp_str))
    conn.commit()
    conn.close()

def get_messages_from_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT nickname, message, timestamp FROM messages ORDER BY id DESC LIMIT 50")
    rows = c.fetchall()
    conn.close()
    return [{'nickname': r[0], 'message': r[1], 'timestamp': r[2]} for r in rows]

# Day/Night Cycle State
CYCLE_DURATION = 300 # 5 minutes in seconds
world_time = 0.0 # 0.0 to 1.0

async def update_world_time_loop():
    global world_time
    import time
    start_time = time.time()
    while True:
        elapsed = time.time() - start_time
        world_time = (elapsed % CYCLE_DURATION) / CYCLE_DURATION
        # Broadcast roughly every 5 seconds to keep synced
        await sio.emit('time_update', {'world_time': world_time})
        await asyncio.sleep(5)

init_db()


def load_or_generate_map():
    global world_trees
    
    # Ensure directory exists
    if not os.path.exists(MAP_DIR):
        os.makedirs(MAP_DIR)
        
    # Implement persistence
    if os.path.exists(MAP_FILE):
        try:
            with open(MAP_FILE, 'r', encoding='utf-8') as f:
                world_trees = json.load(f)
            print(f"Loaded map with {len(world_trees)} trees from {MAP_FILE}.")
            return
        except Exception as e:
            print(f"Failed to load map: {e}. Regenerating...")

    # Generate if not found or failed
    world_trees = []
    for _ in range(TREE_COUNT):
        while True:
            x = random.randint(-MAP_SIZE, MAP_SIZE)
            y = random.randint(-MAP_SIZE, MAP_SIZE)
            dist = math.hypot(x, y)

            if dist > SAFE_RADIUS:
                world_trees.append({'x': x, 'y': y})
                break
    
    # Save to file
    try:
        with open(MAP_FILE, 'w', encoding='utf-8') as f:
            json.dump(world_trees, f, indent=2)
        print(f"Generated and saved map with {len(world_trees)} trees to {MAP_FILE}.")
    except Exception as e:
        print(f"Failed to save map: {e}")

load_or_generate_map()

import asyncio

async def update_npcs_loop():
    while True:
        updates = {}
        for nid, npc in npcs.items():
            # Move towards target
            dx = npc['target_x'] - npc['x']
            dy = npc['target_y'] - npc['y']
            dist = math.hypot(dx, dy)
            
            if dist < 5:
                # Pick new target
                npc['target_x'] = max(-MAP_SIZE, min(MAP_SIZE, npc['x'] + random.randint(-200, 200)))
                npc['target_y'] = max(-MAP_SIZE, min(MAP_SIZE, npc['y'] + random.randint(-200, 200)))
            else:
                # Move
                speed = npc['speed'] * (2.0 if npc['type'] == 'roach' else 1.2) # Faster movement
                npc['x'] += (dx / dist) * speed
                npc['y'] += (dy / dist) * speed
            
            updates[nid] = {'x': npc['x'], 'y': npc['y']}
        
        await sio.emit('npcs_moved', updates)
        await asyncio.sleep(0.1) # 10 FPS sync

# Removed old on_event startup logic



@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    import random
    # Random position in safe zone (center area) and color
    players[sid] = {
        'x': random.randint(-100, 100),
        'y': random.randint(-100, 100),
        'color': f'#{random.randint(0, 0xFFFFFF):06x}',
        'nickname': 'Unknown',
        'skin': 'skin_fox',
        'hp': 100,
        'max_hp': 100
    }

    print(f"Assigning {sid} -> {players[sid]}")

    # Send current players to the new guy
    await sio.emit('current_players', players, to=sid)
    
    # Send Map Data (Trees)
    await sio.emit('map_data', world_trees, to=sid)
    
    # Send Guestbook Data
    messages = get_messages_from_db()
    await sio.emit('guestbook_data', messages, to=sid)
    
    # Send NPC Data
    await sio.emit('npc_data', list(npcs.values()), to=sid)
    
    # Send Current Time
    await sio.emit('time_init', {'world_time': world_time}, to=sid)
    
    # Tell everyone else about the new guy

    await sio.emit('new_player', {'sid': sid, 'player': players[sid]})

    print(f"Broadcasted new_player and map_data for {sid}")

@sio.event
async def set_nickname(sid, data):
    if sid in players:
        # Check if internal data is a dict or just a string
        if isinstance(data, dict):
            name = data.get('nickname', 'Unknown').strip()
            skin = data.get('skin', 'skin_fox')
            token = data.get('token')
        else:
            name = data.strip()
            skin = 'skin_fox'
            token = None

        user_id = None
        
        # Verify token if present
        if token:
            try:
                conn = get_user_db()
                cursor = conn.cursor()
                cursor.execute(
                    """SELECT s.user_id, u.nickname FROM sessions s 
                       JOIN users u ON s.user_id = u.id 
                       WHERE s.token = ? AND s.expires_at > ?""",
                    (token, datetime.now().isoformat())
                )
                result = cursor.fetchone()
                if result:
                    user_id, db_nickname = result
                    # Force the authenticated nickname if user is logged in
                    name = db_nickname
                    print(f"Server: Authenticated join for {name} (User ID: {user_id})")
                conn.close()
            except Exception as e:
                print(f"Token verification error during join: {e}")

        # Nickname validation: Uniqueness check
        is_duplicate = False
        for other_sid, other_player in players.items():
            if other_sid != sid and other_player.get('nickname', '').lower() == name.lower():
                is_duplicate = True
                break
        
        if is_duplicate:
            print(f"Server: Rejected duplicate nickname '{name}' from {sid}")
            await sio.emit('nickname_error', {'message': 'Nickname already taken!'}, to=sid)
            return

        # If unique and not authenticated, we could optionally prevent join if nickname belongs to an account
        # But for now, let's just proceed.

        # Update player data
        players[sid]['nickname'] = name
        players[sid]['skin'] = skin
        players[sid]['user_id'] = user_id

        # Save skin preference to DB if authenticated
        if user_id:
            try:
                conn = get_user_db()
                cursor = conn.cursor()
                cursor.execute("UPDATE users SET skin = ? WHERE id = ?", (skin, user_id))
                conn.commit()
                conn.close()
            except Exception as e:
                print(f"Error saving skin for user {user_id}: {e}")
            
        print(f"Server: Player joined/updated: {sid} -> {name} ({skin})")
        
        # Notify success to the client that requested it
        await sio.emit('nickname_success', {'nickname': name, 'skin': skin}, to=sid)

        # Broadcast update to ALL players
        await sio.emit('update_player_info', {
            'sid': sid, 
            'nickname': name,
            'skin': skin
        })


@sio.event
async def add_guestbook_post(sid, data):
    if sid in players:
        nickname = players[sid]['nickname']
        message = data.get('message', '').strip()
        if message:
            print(f"Guestbook Post: {nickname}: {message}")
            timestamp = get_kst_now_str()
            add_message_to_db(nickname, message, timestamp)
            # Broadcast to everyone
            new_post = {'nickname': nickname, 'message': message, 'timestamp': timestamp}
            await sio.emit('new_guestbook_post', new_post)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    if sid in players:
        del players[sid]
        await sio.emit('player_disconnected', sid)

@sio.event
async def player_move(sid, data):
    # print(f"Move: {sid} {data}") # Debug logging
    if sid in players:
        players[sid]['x'] = data['x']
        players[sid]['y'] = data['y']
        # Broadcast move to others (Sending to all now, client filters self)
        await sio.emit('player_moved', {'sid': sid, 'x': data['x'], 'y': data['y']})
    else:
        print(f"Ignored move from unknown SID: {sid}")

@sio.on('show_emoji')
async def show_emoji(sid, data):
    # data expected: { 'emoji': '❤️' }
    if sid in players:
        # Broadcast emoji to all OTHER players
        await sio.emit('show_emoji', {
            'sid': sid,
            'emoji': data.get('emoji')
        }, skip_sid=sid)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:socket_app", host="0.0.0.0", port=8000, reload=True)

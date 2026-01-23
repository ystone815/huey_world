from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import socketio

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
TREE_COUNT = 60
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
        'skin': 'skin_fox'
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
            name = data.get('nickname', 'Unknown')
            skin = data.get('skin', 'skin_fox')
            players[sid]['nickname'] = name
            players[sid]['skin'] = skin
        else:
            name = data
            players[sid]['nickname'] = name
            
        print(f"Server: Player joined/updated: {sid} -> {players[sid]['nickname']} ({players[sid]['skin']})")
        # Broadcast update to ALL players
        await sio.emit('update_player_info', {
            'sid': sid, 
            'nickname': players[sid]['nickname'],
            'skin': players[sid]['skin']
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:socket_app", host="0.0.0.0", port=8000, reload=True)

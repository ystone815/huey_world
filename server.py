from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import socketio

# 1. Create Socket.IO Server (Async)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# 2. Wrap with ASGI Application
app = FastAPI()
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
MAP_SIZE = 900
SAFE_RADIUS = 150
TREE_COUNT = 60
world_trees = []

def generate_map():
    global world_trees
    world_trees = []
    for _ in range(TREE_COUNT):
        while True:
            x = random.randint(-MAP_SIZE, MAP_SIZE)
            y = random.randint(-MAP_SIZE, MAP_SIZE)
            import math
            dist = math.hypot(x, y)
            if dist > SAFE_RADIUS:
                world_trees.append({'x': x, 'y': y})
                break
    print(f"Generated map with {len(world_trees)} trees.")

generate_map()

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    import random
    # Random position in safe zone (center area) and color
    players[sid] = {
        'x': random.randint(-100, 100),
        'y': random.randint(-100, 100),
        'color': f'#{random.randint(0, 0xFFFFFF):06x}',
        'nickname': 'Unknown'
    }
    print(f"Assigning {sid} -> {players[sid]}")

    # Send current players to the new guy
    await sio.emit('current_players', players, to=sid)
    
    # Send Map Data (Trees)
    await sio.emit('map_data', world_trees, to=sid)
    
    # Tell everyone else about the new guy
    await sio.emit('new_player', {'sid': sid, 'player': players[sid]})
    print(f"Broadcasted new_player and map_data for {sid}")

@sio.event
async def set_nickname(sid, name):
    if sid in players:
        print(f"Server: set_nickname for {sid} -> {name}")
        players[sid]['nickname'] = name
        # Broadcast update (reuse new_player or create player_update event, reusing new_player for simplicity or just ignoring for now until reload)
        # Broadcast to ALL players (including self for confirmation)
        await sio.emit('update_player_info', {'sid': sid, 'nickname': name})

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

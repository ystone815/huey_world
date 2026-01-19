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

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    import random
    # Random position and color
    players[sid] = {
        'x': random.randint(50, 750),
        'y': random.randint(50, 550),
        'color': f'#{random.randint(0, 0xFFFFFF):06x}',
        'nickname': 'Unknown'
    }
    print(f"Assigning {sid} -> {players[sid]}")

    # Send current players to the new guy
    await sio.emit('current_players', players, to=sid)
    
    # Tell everyone else about the new guy (Including self, client filters it out) to ensure broadcast works
    await sio.emit('new_player', {'sid': sid, 'player': players[sid]})
    print(f"Broadcasted new_player for {sid}")

@sio.event
async def set_nickname(sid, name):
    if sid in players:
        print(f"Server: set_nickname for {sid} -> {name}")
        players[sid]['nickname'] = name
        # Broadcast update (reuse new_player or create player_update event, reusing new_player for simplicity or just ignoring for now until reload)
        # Better: emit a tailored event
        await sio.emit('update_player_info', {'sid': sid, 'nickname': name}, skip_sid=sid)

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

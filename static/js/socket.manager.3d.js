export class SocketManager3D {
    constructor(game) {
        this.game = game;
        this.socket = io({ autoConnect: false });
        this.setupEvents();
        this.socket.connect();
    }

    setupEvents() {
        this.socket.on('connect', () => {
            console.log('3D Client Connected:', this.socket.id);
            this.game.updateDebug(`Connected: ${this.socket.id}`);

            // Random Nickname
            this.nickname = 'Guest_' + Math.floor(Math.random() * 1000);
            this.game.spawnPlayer(Math.random() * 1800 + 100, Math.random() * 1800 + 100); // Spawn after connect to use nickname

            // Join the same world
            this.socket.emit('set_nickname', this.nickname);
        });

        this.socket.on('current_players', (players) => {
            Object.keys(players).forEach((sid) => {
                if (sid === this.socket.id) return;
                this.game.addOtherPlayer(sid, players[sid]);
            });
        });

        this.socket.on('new_player', (data) => {
            if (data.sid === this.socket.id) return;
            this.game.addOtherPlayer(data.sid, data.player);
        });

        this.socket.on('player_moved', (data) => {
            if (data.sid === this.socket.id) return;
            this.game.updateOtherPlayer(data.sid, data.x, data.y);
        });

        this.socket.on('player_disconnected', (sid) => {
            this.game.removeOtherPlayer(sid);
        });
    }

    emitMove(x, y) {
        if (this.socket.connected) {
            this.socket.emit('player_move', { x: x, y: y });
            // Note: Server expects 'player_move' event which sends {x, y}
            // Check server.py: @sio.event async def player_move(sid, data): ...
        }
    }
}

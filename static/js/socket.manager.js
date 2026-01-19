export class SocketManager {
    constructor(scene) {
        this.scene = scene;
        // prevent race conditions: setup events BEFORE connecting
        this.socket = io({ autoConnect: false });
        this.setupEvents();
        this.socket.connect();
    }

    addLog(message) {
        const logContainer = document.getElementById('log-container');
        if (logContainer) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'log-message';
            msgDiv.innerText = message;
            logContainer.appendChild(msgDiv);

            // Auto remove after 5 seconds
            setTimeout(() => {
                msgDiv.remove();
            }, 5000);
        }
    }

    setupEvents() {
        // Connected to server
        this.socket.on('connect', () => {
            console.log("Socket connected:", this.socket.id);
            this.addLog("Connected to server!");
        });

        // Initialize existing players
        this.socket.on('current_players', (players) => {
            console.log("Socket: Received current_players", players);
            Object.keys(players).forEach((id) => {
                if (id === this.socket.id) {
                    // It's me! Initialize my attributes if needed
                    if (this.scene.playerContainer) {
                        this.scene.playerContainer.socketId = id;
                    }
                } else {
                    this.scene.addOtherPlayer(id, players[id]);
                }
            });
            this.addLog(`Joined world with ${Object.keys(players).length - 1} other players.`);
        });

        // New player joined
        this.socket.on('new_player', (data) => {
            console.log("Socket: new_player", data);

            // Ignore if it's me (since server broadcasts to everyone now)
            if (data.sid === this.socket.id) return;

            this.scene.addOtherPlayer(data.sid, data.player);
            const name = data.player.nickname || 'Unknown';
            this.addLog(`${name} joined the game.`);
        });

        // Player Info Updated
        this.socket.on('update_player_info', (data) => {
            if (this.scene.otherPlayers[data.sid]) {
                const container = this.scene.otherPlayers[data.sid];
                // Access by Name is safest
                const textObj = container.getByName('nicknameText');
                if (textObj && textObj.setText) {
                    textObj.setText(data.nickname);
                    this.addLog(`${data.nickname} updated info.`);
                } else {
                    // Fallback to List[2] if name not found (for old objects)
                    const fallbackObj = container.list[2];
                    if (fallbackObj && fallbackObj.setText) {
                        fallbackObj.setText(data.nickname);
                    }
                }
            }
        });

        // Player disconnected
        this.socket.on('player_disconnected', (sid) => {
            console.log("Socket: player_disconnected", sid);
            if (this.scene.otherPlayers[sid]) {
                const name = this.scene.otherPlayers[sid].list[1].text;
                this.scene.otherPlayers[sid].destroy();
                delete this.scene.otherPlayers[sid];
                this.addLog(`${name || 'A player'} left the game.`);
            } else {
                console.warn(`Socket: Received disconnect for unknown sid ${sid}`);
            }
        });

        // Player moved
        this.socket.on('player_moved', (data) => {
            // Update Debug Info Global
            window.lastMoveDebug = `${data.sid.substr(0, 4)}.. -> ${Math.round(data.x)},${Math.round(data.y)}`;

            // Filter out my own movements (since server broadcasts to all)
            if (data.sid === this.socket.id) return;

            if (this.scene.otherPlayers[data.sid]) {
                this.scene.otherPlayers[data.sid].setPosition(data.x, data.y);
            }
        });
    }

    emitMove(x, y) {
        if (!this.socket.connected) {
            console.warn("Socket not connected, cannot emit move.");
            return;
        }
        // console.log("Emitting Move:", x, y); // Verbose
        this.socket.emit('player_move', { x, y });
    }
}

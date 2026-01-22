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
            // Send nickname once connected
            if (this.scene.nickname) {
                this.socket.emit('set_nickname', this.scene.nickname);
            }
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

        // Map data from server
        this.socket.on('map_data', (trees) => {
            console.log("Socket: Received map_data", trees);
            this.scene.renderMap(trees);
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

        // Player Info Updated (nickname sync)
        this.socket.on('update_player_info', (data) => {
            console.log(`Socket: update_player_info received for ${data.sid}, name: ${data.nickname}`);

            // Update my own nickname display if it's me
            if (data.sid === this.socket.id && this.scene.playerText) {
                this.scene.playerText.setText(data.nickname);
                return;
            }

            const attemptUpdate = (retryCount = 0) => {
                if (this.scene.otherPlayers[data.sid]) {
                    const container = this.scene.otherPlayers[data.sid];
                    // Access by Name is safest
                    const textObj = container.getByName('nicknameText');
                    if (textObj && textObj.setText) {
                        console.log(`Socket: Updating text for ${data.sid} to ${data.nickname}`);
                        textObj.setText(data.nickname);

                        this.addLog(`${data.nickname} updated info.`);
                    } else {
                        console.warn(`Socket: nicknameText object not found for ${data.sid}. List length: ${container.list.length}`);
                        // Fallback to List[2] if name not found (for old objects)
                        const fallbackObj = container.list[2];
                        if (fallbackObj && fallbackObj.setText) {
                            fallbackObj.setText(data.nickname);
                        }
                    }
                } else {
                    if (retryCount < 5) {
                        console.warn(`Socket: Player ${data.sid} not found. Retrying update (${retryCount + 1}/5)...`);
                        setTimeout(() => attemptUpdate(retryCount + 1), 500);
                    } else {
                        console.error(`Socket: Failed to update info for ${data.sid} after retries.`);
                    }
                }
            };

            attemptUpdate();
        });

        // Player disconnected
        this.socket.on('player_disconnected', (sid) => {
            console.log("Socket: player_disconnected", sid);
            if (this.scene.otherPlayers[sid]) {
                const name = this.scene.otherPlayers[sid].list[2].text; // Container structure: [0]=shadow, [1]=sprite, [2]=text
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
                const container = this.scene.otherPlayers[data.sid];
                const prevX = container.x;

                // Update position
                container.setPosition(data.x, data.y);
                container.lastMoveTime = this.scene.time.now; // Track for animation

                // Flip sprite based on movement direction
                // Container structure: [0]=shadow, [1]=sprite, [2]=text
                const sprite = container.list[1];
                if (sprite && sprite.setFlipX) {
                    if (data.x < prevX) {
                        sprite.setFlipX(true); // Moving left
                    } else if (data.x > prevX) {
                        sprite.setFlipX(false); // Moving right
                    }
                }
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

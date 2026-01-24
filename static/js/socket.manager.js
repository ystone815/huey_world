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
            // Send nickname and skin once connected
            if (this.scene.nickname) {
                this.socket.emit('set_nickname', {
                    nickname: this.scene.nickname,
                    skin: this.scene.selectedSkin || 'skin_fox',
                    token: this.scene.token // Send token for verification
                });
            }

        });

        // Nickname Validation Success
        this.socket.on('nickname_success', (data) => {
            console.log("Socket: Nickname accepted:", data.nickname);
            this.scene.events.emit('nickname-success', data);
        });

        // Nickname Validation Error (Duplicate)
        this.socket.on('nickname_error', (data) => {
            console.log("Socket: Nickname rejected:", data.message);
            this.scene.events.emit('nickname-error', data);
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

        // Guestbook data initial load
        this.socket.on('guestbook_data', (messages) => {
            console.log("Socket: Received guestbook_data", messages);
            this.updateGuestbookUI(messages);
        });

        // NPC data from server
        this.socket.on('npc_data', (npcs) => {
            console.log("Socket: Received npc_data", npcs);
            this.scene.initNPCs(npcs);
        });

        // NPCs moved
        this.socket.on('npcs_moved', (updates) => {
            this.scene.updateNPCPositions(updates);
        });

        // New Guestbook post
        this.socket.on('new_guestbook_post', (post) => {
            console.log("Socket: New guestbook post", post);
            this.addSinglePostToUI(post);
        });

        // Time synchronization
        this.socket.on('time_init', (data) => {
            this.scene.worldTime = data.world_time;
            console.log("Socket: Initial world time:", data.world_time);
        });

        this.socket.on('time_update', (data) => {
            this.scene.worldTime = data.world_time;
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

                        // Also update skin if provided
                        if (data.skin) {
                            const sprite = container.list[1];
                            if (sprite && sprite.setTexture) {
                                sprite.setTexture(data.skin);
                                // Scale to 48px width, maintain aspect ratio
                                sprite.displayWidth = 48;
                                sprite.scaleY = sprite.scaleX;
                            }
                        }

                        this.addLog(`${data.nickname} joined/updated.`);

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

        // Show Emoji Event
        this.socket.on('show_emoji', (data) => {
            console.log("Socket: Received show_emoji", data);
            this.scene.events.emit('show-remote-emoji', data);
        });

        // World Building Sync
        this.socket.on('object_placed', (data) => {
            console.log("Socket: Object placed", data);
            if (this.scene.handleObjectPlaced) {
                this.scene.handleObjectPlaced(data);
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

    emitEmoji(emoji) {
        if (!this.socket.connected) return;
        console.log("Emitting Emoji:", emoji);
        this.socket.emit('show_emoji', { emoji });
    }

    updateGuestbookUI(messages) {
        const list = document.getElementById('guestbook-list');
        if (!list) return;
        list.innerHTML = '';
        messages.forEach(m => this.addSinglePostToUI(m, true));
    }

    addSinglePostToUI(post, append = false) {
        const list = document.getElementById('guestbook-list');
        if (!list) return;

        const item = document.createElement('div');
        item.className = 'gb-item';
        item.innerHTML = `
            <span class="gb-nick">${post.nickname}:</span>
            <span class="gb-msg">${post.message}</span>
            <span class="gb-time">${post.timestamp}</span>
        `;

        if (append) {
            list.appendChild(item);
        } else {
            list.prepend(item);
        }
    }
}

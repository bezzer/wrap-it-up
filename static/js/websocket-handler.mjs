// WebSocket handling module
export class WebSocketHandler {
    constructor() {
        this.audioManager = null;
        this.roomInfo = this.parseRoomInfo();
        this.setupEventListeners();
        this.updatePageInfo();
        this.setJoinRoomValues();
    }

    setAudioManager(audioManager) {
        this.audioManager = audioManager;
        console.log('[WebSocket] Audio manager connected');
    }

    parseRoomInfo() {
        const path = window.location.pathname;
        const segments = path.split('/').filter(s => s);
        
        let roomId = 'default';
        let isHost = false;
        
        if (segments.length > 0) {
            roomId = segments[0];
            if (segments.length > 1 && segments[1] === 'host') {
                isHost = true;
            }
        }
        
        console.log('[WebSocket] Parsed room info:', { roomId, isHost, path });
        return { roomId, isHost };
    }

    setJoinRoomValues() {
        // Set the hx-vals for the join room sender
        const joinSender = document.getElementById('joinRoomSender');
        if (joinSender) {
            const joinMessage = {
                type: 'join_room',
                roomId: this.roomInfo.roomId,
                isHost: this.roomInfo.isHost
            };
            joinSender.setAttribute('hx-vals', JSON.stringify(joinMessage));
            console.log('[WebSocket] Set join room values:', joinMessage);
        }
    }

    setupEventListeners() {
        document.body.addEventListener('htmx:wsOpen', (e) => {
            console.log('[WebSocket] Connected', e);
            document.getElementById('status').textContent = 'Connected';
        });

        document.body.addEventListener('htmx:wsClose', (e) => {
            console.log('[WebSocket] Connection closed', e);
            document.getElementById('status').textContent = 'Disconnected - Reconnecting...';
        });

        document.body.addEventListener('htmx:wsError', (e) => {
            console.log('[WebSocket] Error occurred', e);
            document.getElementById('status').textContent = 'Connection error';
        });

        document.body.addEventListener('htmx:wsAfterMessage', (event) => {
            this.handleMessage(event);
        });

        document.body.addEventListener('htmx:wsBeforeSend', (event) => {
            console.log('[WebSocket] About to send:', event.detail);
        });
    }

    handleMessage(event) {
        console.log('[WebSocket] Raw message received:', event.detail.message);
        
        try {
            const data = JSON.parse(event.detail.message);
            console.log('[WebSocket] Parsed message:', data);
            
            switch (data.type) {
                case 'user_count':
                    console.log('[WebSocket] User count updated:', data.count);
                    document.getElementById('userCounter').textContent = `${data.count} people here`;
                    break;
                    
                case 'music_state':
                    console.log('[WebSocket] Music state changed:', {
                        isPlaying: data.isPlaying,
                        song: data.songUrl,
                        startTime: data.startTime,
                        hasHosts: data.hasHosts
                    });
                    if (this.audioManager) {
                        this.audioManager.updateMusicState(data.isPlaying, data.startTime, data.songUrl, data.hasHosts);
                    } else {
                        console.warn('[WebSocket] Audio manager not ready yet');
                    }
                    this.updatePlayButton(data.isPlaying);
                    break;
                    
                default:
                    console.log('[WebSocket] Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('[WebSocket] Failed to parse message as JSON:', error);
            console.log('[WebSocket] Raw message was:', event.detail.message);
        }
    }


    updatePlayButton(isPlaying) {
        const playButton = document.getElementById('playButton');
        if (isPlaying) {
            playButton.textContent = 'Stop Music';
            playButton.classList.add('playing');
        } else {
            playButton.textContent = 'Start Playing Music';
            playButton.classList.remove('playing');
        }
    }

    updatePageInfo() {
        // Update page title
        const roomDisplay = this.roomInfo.roomId === 'default' ? 'Lobby' : this.roomInfo.roomId;
        const hostDisplay = this.roomInfo.isHost ? ' (Host)' : '';
        document.title = `Wrap It Up - ${roomDisplay}${hostDisplay}`;
        
        // Update room info display
        const roomInfoElement = document.getElementById('roomInfo');
        if (roomInfoElement) {
            let roomText = '';
            if (this.roomInfo.roomId !== 'default') {
                roomText = `Room: ${this.roomInfo.roomId}`;
                if (this.roomInfo.isHost) {
                    roomText += ' • 👑 Host Mode';
                }
            } else if (this.roomInfo.isHost) {
                roomText = '👑 Host Mode';
            }
            roomInfoElement.textContent = roomText;
        }
    }
}
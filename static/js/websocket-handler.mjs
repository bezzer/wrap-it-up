// WebSocket handling module
export class WebSocketHandler {
    constructor() {
        this.audioManager = null;
        this.setupEventListeners();
    }

    setAudioManager(audioManager) {
        this.audioManager = audioManager;
        console.log('[WebSocket] Audio manager connected');
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
            console.log('[WebSocket] About to send message:', event.detail);
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
                        startTime: data.startTime
                    });
                    if (this.audioManager) {
                        this.audioManager.updateMusicState(data.isPlaying, data.startTime, data.songUrl);
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
}
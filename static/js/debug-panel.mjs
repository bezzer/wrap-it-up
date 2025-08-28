// Debug panel functionality
export class DebugPanel {
    constructor(audioManager) {
        this.audioManager = audioManager;
    }

    init() {
        // Check for debug mode
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true') {
            console.log('[Debug] Debug mode enabled');
            this.createDebugPanel();
        }
    }

    createDebugPanel() {
        console.log('[Debug] Creating debug panel');
        
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debugPanel';
        
        const title = document.createElement('h3');
        title.textContent = 'Debug Panel';
        debugPanel.appendChild(title);
        
        // Wait for songs to load before creating buttons
        const checkSongs = () => {
            if (this.audioManager.availableSongs.length > 0) {
                this.createDebugButtons(debugPanel);
            } else {
                setTimeout(checkSongs, 100);
            }
        };
        checkSongs();
        
        document.body.appendChild(debugPanel);
    }

    createDebugButtons(debugPanel) {
        console.log('[Debug] Creating test buttons for songs:', this.audioManager.availableSongs);
        
        this.audioManager.availableSongs.forEach((songUrl, index) => {
            const button = document.createElement('button');
            button.className = 'debug-button';
            button.textContent = `Play ${songUrl.split('/').pop()}`;
            
            button.addEventListener('click', () => {
                console.log('[Debug] Testing song:', songUrl);
                this.audioManager.testPlaySong(songUrl);
            });
            
            debugPanel.appendChild(button);
        });
        
        // Add stop all button
        const stopButton = document.createElement('button');
        stopButton.className = 'debug-stop-button';
        stopButton.textContent = 'Stop All';
        
        stopButton.addEventListener('click', () => {
            console.log('[Debug] Stopping all test audio');
            this.audioManager.stopAllTestAudio();
        });
        
        debugPanel.appendChild(stopButton);
    }
}
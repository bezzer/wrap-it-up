// Main application entry point
import { AudioManager } from './audio-manager.mjs';
import { WebSocketHandler } from './websocket-handler.mjs';
import { DebugPanel } from './debug-panel.mjs';

// Initialize WebSocket handler immediately to catch early events
console.log('[App] Initializing WebSocket handler');
const webSocketHandler = new WebSocketHandler();

// Initialize rest of application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[App] DOM loaded, initializing audio components');
    
    // Initialize audio manager with host status
    const audioManager = new AudioManager(webSocketHandler.roomInfo.isHost);
    await audioManager.initializeSongs();
    
    // Connect audio manager to WebSocket handler
    webSocketHandler.setAudioManager(audioManager);
    
    // Initialize debug panel
    const debugPanel = new DebugPanel(audioManager);
    debugPanel.init();
    
    console.log('[App] Application initialized successfully');
});
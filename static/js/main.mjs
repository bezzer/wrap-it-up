// Main application entry point
import { AudioManager } from './audio-manager.mjs';
import { WebSocketHandler } from './websocket-handler.mjs';
import { DebugPanel } from './debug-panel.mjs';
import { Interstitial } from './interstitial.mjs';

// Initialize WebSocket handler immediately to catch early events
console.log('[App] Initializing WebSocket handler');
const webSocketHandler = new WebSocketHandler();

// Initialize rest of application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[App] DOM loaded');
    
    // Show interstitial to ensure user interaction for audio playback
    const interstitial = new Interstitial(webSocketHandler.roomInfo);
    await interstitial.show();
    
    // Mark that user has interacted
    Interstitial.markInteraction();
    
    console.log('[App] User interaction confirmed, initializing audio components');
    
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
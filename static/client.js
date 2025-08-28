let isPlaying = false;
let currentPlayer = null;
let currentFadeInterval = null;
const playButton = document.getElementById('playButton');
let songMap = {};
let availableSongs = [];

// Fetch songs from server and create audio elements
async function initializeSongs() {
    try {
        const response = await fetch('/api/songs');
        const data = await response.json();
        availableSongs = data.songs;
        
        // Create audio elements for each song
        availableSongs.forEach((songUrl, index) => {
            const audio = document.createElement('audio');
            audio.id = `song${index}`;
            audio.preload = 'auto';
            audio.loop = true;
            
            const source = document.createElement('source');
            source.src = songUrl;
            source.type = 'audio/mpeg';
            
            audio.appendChild(source);
            document.body.appendChild(audio);
            
            songMap[songUrl] = audio;
        });
        
        console.log('Initialized songs:', availableSongs);
    } catch (error) {
        console.error('Failed to load songs:', error);
    }
}

// Initialize songs when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeSongs();
    
    // Check for debug mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
        console.log('[Debug] Debug mode enabled');
        createDebugPanel();
    }
});

document.body.addEventListener('htmx:wsOpen', function(e) {
    console.log('[Client WebSocket] Connected', e);
    document.getElementById('status').textContent = 'Connected';
});

document.body.addEventListener('htmx:wsClose', function(e) {
    console.log('[Client WebSocket] Connection closed', e);
    document.getElementById('status').textContent = 'Disconnected - Reconnecting...';
});

document.body.addEventListener('htmx:wsError', function(e) {
    console.log('[Client WebSocket] Error occurred', e);
    document.getElementById('status').textContent = 'Connection error';
});

document.body.addEventListener('htmx:wsAfterMessage', function(event) {
    console.log('[Client WebSocket] Raw message received:', event.detail.message);
    
    try {
        const data = JSON.parse(event.detail.message);
        console.log('[Client WebSocket] Parsed message:', data);
        
        switch (data.type) {
            case 'user_count':
                console.log('[Client WebSocket] User count updated:', data.count);
                document.getElementById('userCounter').textContent = `${data.count} people here`;
                break;
                
            case 'music_state':
                console.log('[Client WebSocket] Music state changed:', {
                    isPlaying: data.isPlaying,
                    song: data.songUrl,
                    startTime: data.startTime
                });
                updateMusicState(data.isPlaying, data.startTime, data.songUrl);
                break;
                
            default:
                console.log('[Client WebSocket] Unknown message type:', data.type);
        }
    } catch (error) {
        console.error('[Client WebSocket] Failed to parse message as JSON:', error);
        console.log('[Client WebSocket] Raw message was:', event.detail.message);
    }
});

document.body.addEventListener('htmx:wsBeforeSend', function(event) {
    console.log('[Client WebSocket] About to send message:', event.detail);
});

function updateMusicState(playing, startTime, songUrl) {
    console.log('[Client Music] State update:', { playing, songUrl, startTime });
    isPlaying = playing;
    
    if (playing) {
        playButton.textContent = 'Stop Music';
        playButton.classList.add('playing');
        startMusic(startTime, songUrl);
    } else {
        playButton.textContent = 'Start Playing Music';
        playButton.classList.remove('playing');
        stopMusic();
    }
}

function startMusic(startTime, songUrl) {
    console.log('[Client Music] Starting music:', songUrl);
    stopMusic();
    
    currentPlayer = songMap[songUrl];
    if (!currentPlayer) {
        console.error('[Client Music] Unknown song:', songUrl);
        console.log('[Client Music] Available songs:', Object.keys(songMap));
        return;
    }
    
    currentPlayer.currentTime = 0;
    currentPlayer.volume = 0; // Start at volume 0
    
    if (startTime) {
        const elapsed = (Date.now() - startTime) / 1000;
        const seekTime = elapsed % currentPlayer.duration || 0;
        console.log('[Client Music] Seeking to time:', seekTime, 'seconds');
        currentPlayer.currentTime = seekTime;
    }
    
    console.log('[Client Music] Attempting to play...');
    currentPlayer.play().then(() => {
        console.log('[Client Music] Playback started successfully');
        fadeInVolume(currentPlayer);
    }).catch(error => {
        console.error('[Client Music] Failed to play:', error);
        document.getElementById('status').textContent = 'Failed to play - User interaction required';
    });
}

function stopMusic() {
    if (currentPlayer) {
        console.log('[Client Music] Stopping music');
        
        // Clear any ongoing fade-in
        if (currentFadeInterval) {
            clearInterval(currentFadeInterval);
            currentFadeInterval = null;
            console.log('[Client Music] Cleared fade-in interval');
        }
        
        fadeOutVolume(currentPlayer).then(() => {
            currentPlayer.pause();
            currentPlayer.currentTime = 0;
            currentPlayer.volume = 1; // Reset volume for next play
            currentPlayer = null; // Reset player reference
            console.log('[Client Music] All state reset');
        });
    }
}

function fadeInVolume(audio) {
    console.log('[Client Music] Fading in volume');
    
    // Clear any existing fade interval
    if (currentFadeInterval) {
        clearInterval(currentFadeInterval);
    }
    
    const fadeInDuration = 20000; // 20 seconds
    const steps = 100;
    const stepTime = fadeInDuration / steps;
    const volumeStep = 1 / steps;
    
    let currentStep = 0;
    
    currentFadeInterval = setInterval(() => {
        if (currentStep >= steps || !isPlaying) {
            clearInterval(currentFadeInterval);
            currentFadeInterval = null;
            if (isPlaying) {
                audio.volume = 1;
                console.log('[Client Music] Fade in complete');
            }
            return;
        }
        
        currentStep++;
        audio.volume = Math.min(currentStep * volumeStep, 1);
    }, stepTime);
}

function fadeOutVolume(audio) {
    console.log('[Client Music] Fading out volume');
    return new Promise((resolve) => {
        const fadeOutDuration = 1000; // 1 second
        const steps = 50;
        const stepTime = fadeOutDuration / steps;
        const initialVolume = audio.volume;
        const volumeStep = initialVolume / steps;
        
        let currentStep = 0;
        
        const fadeInterval = setInterval(() => {
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                audio.volume = 0;
                console.log('[Client Music] Fade out complete');
                resolve();
                return;
            }
            
            currentStep++;
            audio.volume = Math.max(initialVolume - (currentStep * volumeStep), 0);
        }, stepTime);
    });
}

// Debug functionality
function createDebugPanel() {
    console.log('[Debug] Creating debug panel');
    
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debugPanel';
    
    const title = document.createElement('h3');
    title.textContent = 'Debug Panel';
    debugPanel.appendChild(title);
    
    // Wait for songs to load before creating buttons
    const checkSongs = () => {
        if (availableSongs.length > 0) {
            createDebugButtons(debugPanel);
        } else {
            setTimeout(checkSongs, 100);
        }
    };
    checkSongs();
    
    document.body.appendChild(debugPanel);
}

function createDebugButtons(debugPanel) {
    console.log('[Debug] Creating test buttons for songs:', availableSongs);
    
    availableSongs.forEach((songUrl, index) => {
        const button = document.createElement('button');
        button.className = 'debug-button';
        button.textContent = `Play ${songUrl.split('/').pop()}`;
        
        button.addEventListener('click', () => {
            console.log('[Debug] Testing song:', songUrl);
            testPlaySong(songUrl);
        });
        
        debugPanel.appendChild(button);
    });
    
    // Add stop all button
    const stopButton = document.createElement('button');
    stopButton.className = 'debug-stop-button';
    stopButton.textContent = 'Stop All';
    
    stopButton.addEventListener('click', () => {
        console.log('[Debug] Stopping all test audio');
        stopAllTestAudio();
    });
    
    debugPanel.appendChild(stopButton);
}

function testPlaySong(songUrl) {
    // Stop any currently playing test audio
    stopAllTestAudio();
    
    const audio = songMap[songUrl];
    if (!audio) {
        console.error('[Debug] Song not found:', songUrl);
        return;
    }
    
    console.log('[Debug] Playing test song:', songUrl);
    audio.currentTime = 0;
    audio.volume = 0; // Start at volume 0 for test too
    audio.play().then(() => {
        console.log('[Debug] Test playback started successfully');
        fadeInVolume(audio);
    }).catch(error => {
        console.error('[Debug] Test playback failed:', error);
    });
}

function stopAllTestAudio() {
    console.log('[Debug] Stopping all test audio with fade out');
    Object.values(songMap).forEach(audio => {
        if (!audio.paused) {
            fadeOutVolume(audio).then(() => {
                audio.pause();
                audio.currentTime = 0;
                audio.volume = 1; // Reset volume
            });
        }
    });
}
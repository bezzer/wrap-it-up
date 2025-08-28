const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

const app = express();

// Serve only the index.html file at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve static files (JS, songs, etc.)
app.use(express.static('static'));

// API endpoint to get available songs
app.get('/api/songs', (req, res) => {
    const songsDir = path.join(__dirname, 'static', 'songs');
    
    fs.readdir(songsDir, (err, files) => {
        if (err) {
            console.error('Error reading songs directory:', err);
            return res.status(500).json({ error: 'Failed to read songs directory' });
        }
        
        const songFiles = files
            .filter(file => file.endsWith('.mp3'))
            .map(file => `/songs/${file}`);
        
        res.json({ songs: songFiles });
    });
});

const server = http.createServer(app);

const wss = new WebSocket.Server({ 
    server,
    path: '/ws'
});

let connectedUsers = 0;
let isPlaying = false;
let playStartTime = null;
let currentSong = null;
let availableSongs = [];

// Load available songs on startup
function loadSongs() {
    const songsDir = path.join(__dirname, 'static', 'songs');
    try {
        const files = fs.readdirSync(songsDir);
        availableSongs = files
            .filter(file => file.endsWith('.mp3'))
            .map(file => `/songs/${file}`);
        console.log('Loaded songs:', availableSongs);
    } catch (err) {
        console.error('Error loading songs:', err);
        availableSongs = [];
    }
}

function getRandomSong() {
    if (availableSongs.length === 0) {
        loadSongs();
    }
    return availableSongs[Math.floor(Math.random() * availableSongs.length)];
}

// Load songs on startup
loadSongs();

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on('connection', (ws) => {
    connectedUsers++;
    console.log(`[WebSocket] User connected. Total users: ${connectedUsers}`);
    
    ws.send(JSON.stringify({
        type: 'user_count',
        count: connectedUsers
    }));
    
    ws.send(JSON.stringify({
        type: 'music_state',
        isPlaying: isPlaying,
        startTime: playStartTime,
        songUrl: currentSong
    }));
    
    broadcast({
        type: 'user_count',
        count: connectedUsers
    });
        
    ws.on('message', (message) => {
        const messageStr = message.toString();
        const messageJson = JSON.parse(messageStr);
        const messageType = messageJson.type;

        console.log(`[WebSocket] Message received: ${messageStr}`);

        try {
            // Handle HTMX ws-send messages - they come as plain text, not JSON
            if (messageType === 'toggle_music') {
                console.log(`[WebSocket] Toggle music trigger received`);
                
                if (isPlaying) {
                    isPlaying = false;
                    playStartTime = null;
                    currentSong = null;
                    console.log(`[WebSocket] Music stopped`);
                } else {
                    isPlaying = true;
                    playStartTime = Date.now();
                    currentSong = getRandomSong();
                    console.log(`[WebSocket] Music started - Song: ${currentSong}`);
                }
                
                const musicState = {
                    type: 'music_state',
                    isPlaying: isPlaying,
                    startTime: playStartTime,
                    songUrl: currentSong
                };
                console.log(`[WebSocket] Broadcasting music state:`, musicState);
                broadcast(musicState);
                return;
            }
            
            // Try to parse as JSON for other message types
            const data = JSON.parse(messageStr);
            console.log(`[WebSocket] JSON message received:`, data);
            
            switch (data.type) {
                default:
                    console.log(`[WebSocket] Unknown JSON message type: ${data.type}`);
            }
        } catch (error) {
            console.log(`[WebSocket] Failed to parse as JSON:`, messageStr);
            console.error(`[WebSocket] Parse error:`, error.message);
        }
    });
    
    ws.on('close', () => {
        connectedUsers--;
        console.log(`[WebSocket] User disconnected. Total users: ${connectedUsers}`);
        broadcast({
            type: 'user_count',
            count: connectedUsers
        });
    });
    
    ws.on('error', (error) => {
        console.error('[WebSocket] Connection error:', error);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
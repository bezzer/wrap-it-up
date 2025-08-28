const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

const app = express();

// Serve static files (JS, songs, etc.)
app.use(express.static('static'));

// Serve index.html for root and room paths
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/:roomId/host', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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

// Room-based state management
const rooms = new Map();
let availableSongs = [];

// Room state structure
function createRoom(roomId) {
    return {
        id: roomId,
        users: new Set(),
        hosts: new Set(),
        isPlaying: false,
        playStartTime: null,
        currentSong: null
    };
}

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

function broadcastToRoom(roomId, data) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
            client.send(JSON.stringify(data));
        }
    });
}

function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, createRoom(roomId));
        console.log(`[Room] Created new room: ${roomId}`);
    }
    return rooms.get(roomId);
}

wss.on('connection', (ws, req) => {
    // Parse room and host info from URL or initial message
    ws.roomId = null;
    ws.isHost = false;
    
    console.log(`[WebSocket] User connected from: ${req.url}`);
    
    // Wait for room info from client
    ws.on('message', (message) => {
        const messageStr = message.toString();
        console.log(`[WebSocket] Message received:`, messageStr);

        try {
            const data = JSON.parse(messageStr);
            
            // Handle room join message
            if (data.type === 'join_room') {
                const roomId = data.roomId || 'default';
                const isHost = data.isHost || false;
                
                ws.roomId = roomId;
                ws.isHost = isHost;
                
                const room = getOrCreateRoom(roomId);
                room.users.add(ws);
                if (isHost) {
                    room.hosts.add(ws);
                }
                
                console.log(`[WebSocket] User joined room: ${roomId} as ${isHost ? 'HOST' : 'PARTICIPANT'}`);
                
                // Send current state to new user
                ws.send(JSON.stringify({
                    type: 'user_count',
                    count: room.users.size
                }));
                
                ws.send(JSON.stringify({
                    type: 'music_state',
                    isPlaying: room.isPlaying,
                    startTime: room.playStartTime,
                    songUrl: room.currentSong,
                    hasHosts: room.hosts.size > 0
                }));
                
                // Broadcast user count update to room
                broadcastToRoom(roomId, {
                    type: 'user_count',
                    count: room.users.size
                });
                
                return;
            }
            
            // Handle music toggle
            if (data.type === 'toggle_music') {
                if (!ws.roomId) {
                    console.log(`[WebSocket] Music toggle ignored - user not in room`);
                    return;
                }
                
                const room = rooms.get(ws.roomId);
                if (!room) return;
                
                // Allow anyone to control music - playback restriction is handled client-side
                
                console.log(`[WebSocket] Toggle music trigger received in room: ${ws.roomId}`);
                
                if (room.isPlaying) {
                    room.isPlaying = false;
                    room.playStartTime = null;
                    room.currentSong = null;
                    console.log(`[WebSocket] Music stopped in room: ${ws.roomId}`);
                } else {
                    room.isPlaying = true;
                    room.playStartTime = Date.now();
                    room.currentSong = getRandomSong();
                    console.log(`[WebSocket] Music started in room: ${ws.roomId} - Song: ${room.currentSong}`);
                }
                
                const musicState = {
                    type: 'music_state',
                    isPlaying: room.isPlaying,
                    startTime: room.playStartTime,
                    songUrl: room.currentSong,
                    hasHosts: room.hosts.size > 0
                };
                console.log(`[WebSocket] Broadcasting music state to room ${ws.roomId}:`, musicState);
                broadcastToRoom(ws.roomId, musicState);
                return;
            }
            
            console.log(`[WebSocket] Unknown message type: ${data.type}`);
            
        } catch (error) {
            console.log(`[WebSocket] Failed to parse as JSON:`, messageStr);
            console.error(`[WebSocket] Parse error:`, error.message);
        }
    });
    
    ws.on('close', () => {
        if (ws.roomId) {
            const room = rooms.get(ws.roomId);
            if (room) {
                room.users.delete(ws);
                room.hosts.delete(ws);
                
                console.log(`[WebSocket] User disconnected from room: ${ws.roomId}. Users left: ${room.users.size}`);
                
                // Broadcast updated user count
                broadcastToRoom(ws.roomId, {
                    type: 'user_count',
                    count: room.users.size
                });
                
                // Clean up empty rooms
                if (room.users.size === 0) {
                    rooms.delete(ws.roomId);
                    console.log(`[Room] Deleted empty room: ${ws.roomId}`);
                }
            }
        }
    });
    
    ws.on('error', (error) => {
        console.error('[WebSocket] Connection error:', error);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
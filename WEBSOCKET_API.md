# WebSocket API Documentation

## Overview
The WebSocket connection handles real-time communication for synchronized music playback and user counting.

## Connection
- **URL**: `ws://localhost:3000/ws` (or `/ws` for same-origin)
- **Protocol**: WebSocket with HTMX extension

## Message Types

### Client → Server

#### 1. Toggle Music
**Purpose**: Start or stop synchronized music playback
**Format**: Plain text string
```
toggle_music
```
**Trigger**: Button click with `ws-send` attribute

### Server → Client

#### 1. User Count Update
**Purpose**: Notify all clients of current user count
**Format**: JSON
```json
{
  "type": "user_count",
  "count": 3
}
```
**When sent**: 
- When a user connects
- When a user disconnects

#### 2. Music State Update  
**Purpose**: Synchronize music playback state across all clients
**Format**: JSON
```json
{
  "type": "music_state",
  "isPlaying": true,
  "startTime": 1693123456789,
  "songUrl": "/songs/Wrap It Up, Folks.mp3"
}
```
**Fields**:
- `isPlaying` (boolean): Whether music is currently playing
- `startTime` (number|null): Timestamp when music started (for sync)
- `songUrl` (string|null): Path to the song file

**When sent**:
- When a user connects (current state)
- When music is toggled (start/stop)

## Connection Events

### Client Events
- `htmx:wsConnected` - WebSocket connection established
- `htmx:wsClose` - WebSocket connection closed  
- `htmx:wsError` - WebSocket error occurred
- `htmx:wsAfterMessage` - Message received from server
- `htmx:wsBeforeMessage` - Before sending message to server

### Server Events
- `connection` - New client connected
- `message` - Message received from client
- `close` - Client disconnected
- `error` - Connection error

## Flow Examples

### User Joins
1. Client connects to WebSocket
2. Server increments user count
3. Server sends current user count to all clients
4. Server sends current music state to new client

### Music Toggle
1. User clicks play button
2. Client sends `"toggle_music"` via WebSocket
3. Server toggles music state and selects random song
4. Server broadcasts new music state to all clients
5. All clients update UI and start/stop music synchronously

### User Leaves  
1. Client disconnects
2. Server decrements user count
3. Server sends updated user count to remaining clients

## Debugging
- Add `?debug=true` to URL for debug panel
- Check browser console for `[Client WebSocket]` and `[Client Music]` logs
- Check server console for `[WebSocket]` logs

## Common Issues
- **Songs not playing**: Check that songs are loaded via `/api/songs` endpoint
- **Not synchronized**: Verify `startTime` is being used for seeking
- **Connection fails**: Ensure WebSocket path `/ws` is correct
- **Wrong message format**: Client should send plain text, not JSON for button clicks
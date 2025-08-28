# Wrap It Up! 🎵

A synchronized music player for meetings when someone is talking too long.

## Features
- Synchronized music playback across all connected users
- Real-time user counter
- Simple one-button interface
- WebSocket-based real-time communication

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open http://localhost:3000 in your browser

## Free Hosting Options

### Deploy to Render (Recommended)
1. Connect your GitHub repo to Render
2. Create a new Web Service
3. Use these settings:
   - Build Command: `npm install`
   - Start Command: `npm start`

### Deploy to Railway
1. Connect your GitHub repo to Railway
2. Deploy with default Node.js settings

### Deploy to Vercel (Static + Serverless)
Note: Requires modification for serverless functions

## How It Works
- WebSocket server synchronizes music state across all clients
- Button toggles music for everyone simultaneously
- User counter updates in real-time as people join/leave
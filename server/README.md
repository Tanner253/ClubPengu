# Club Penguin Multiplayer Server

Simple WebSocket server for real-time player synchronization.

## Local Development

```bash
cd server
npm install
npm run dev
```

Server runs on `ws://localhost:3001`

## Deployment to Render.com (Free)

1. Push your code to GitHub
2. Go to [Render.com](https://render.com) and sign up
3. Click "New" → "Web Service"
4. Connect your GitHub repo
5. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
6. Deploy!

After deployment, you'll get a URL like `https://clubpenguin-server.onrender.com`

## Update Frontend

After deploying, update the server URL in your frontend:

**Option 1: Environment Variable**
Create `.env` in your frontend root:
```
VITE_WS_SERVER=wss://your-app-name.onrender.com
```

**Option 2: Direct Edit**
Edit `src/multiplayer/MultiplayerContext.jsx` and update the production URL:
```javascript
// Production URL
return 'wss://your-app-name.onrender.com';
```

## Message Types

### Client → Server
- `join` - Join room with appearance data
- `move` - Position update
- `chat` - Chat message
- `emote` - Emote trigger
- `stop_emote` - Stop emote
- `change_room` - Room transition
- `update_appearance` - Appearance change
- `update_puffle` - Puffle equip/unequip
- `ping` - Keep-alive

### Server → Client
- `connected` - Connection confirmed with player ID
- `room_state` - Current players in room
- `player_joined` - New player joined room
- `player_left` - Player left room
- `player_moved` - Player position update
- `player_emote` - Player emote
- `player_appearance` - Player appearance change
- `player_puffle` - Player puffle change
- `chat` - Chat message
- `pong` - Keep-alive response

## Notes

- Free tier on Render sleeps after 15 min of inactivity
- First connection after sleep takes ~30 seconds
- No database needed - all state is in-memory
- Players are cleaned up on disconnect







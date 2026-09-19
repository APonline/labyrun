# LABYRUN Multiplayer + Voice Deployment

## Architecture

DreamHost Shared hosts the normal static game files. It does **not** host the realtime Node process.

- Frontend: `https://labyrun.andrewphillips.online` (DreamHost Shared)
- Realtime server: Node + Socket.IO on Render/Railway/etc.
- Voice: browser-to-browser WebRTC. Socket.IO is signalling only; DreamHost does not carry the voice audio.

## Fastest setup: Render + GitHub

1. Put the server files in a GitHub repo. The minimum files are:
   - `server.js`
   - `package.json`
   - `package-lock.json`
   - `render.yaml`
2. In Render choose **New > Blueprint** (or Web Service) and connect the repo.
3. `render.yaml` already contains:
   - build: `npm ci`
   - start: `npm start`
   - health check: `/health`
   - allowed frontend origin: `https://labyrun.andrewphillips.online`
4. Deploy. Render gives you a URL similar to:
   `https://labyrun-multiplayer.onrender.com`
5. Open LABYRUN > Multiplayer Room > **Multiplayer server setup**.
6. Paste the Render HTTPS URL and hit **Save Server**. It is saved in localStorage for that browser.
7. Create a room and test from a second device/browser.

Free Render services may sleep after inactivity. The first connection after sleep can take roughly a minute to wake. The client has a long connection timeout for this reason.

## DreamHost upload

For the frontend, upload the game files as normal. DreamHost does not need Node or npm for the static game.

You can omit `node_modules/` entirely. Do not upload it.

The frontend uses the Socket.IO browser client from its CDN and connects to the external server URL you save in the Multiplayer screen.

## Voice chat

Voice uses `navigator.mediaDevices.getUserMedia()` + WebRTC.

Requirements:
- The game must be served over HTTPS (your DreamHost subdomain already should be).
- Each player must click **Join Voice** and grant microphone permission.
- Default mode is open mic.
- Players can mute their mic or mute incoming friends.

The default config uses public STUN servers. This is enough for many home/mobile networks.

For production reliability, add a TURN server in:

`src/config/network-config.js`

Example shape:

```js
iceServers: [
  { urls: ['stun:stun.l.google.com:19302'] },
  {
    urls: 'turn:YOUR_TURN_HOST:3478',
    username: 'YOUR_USERNAME',
    credential: 'YOUR_PASSWORD'
  }
]
```

TURN is only a fallback when direct peer-to-peer voice cannot connect through NAT/firewalls. The game itself still works without TURN.

## Local test

If Node dependencies are installed:

```bash
npm install
npm start
```

Then open `http://localhost:3000` only if you are serving the frontend from the Node process. For the split production architecture, serve the frontend separately and paste the Node server URL into Multiplayer settings.

## Room/game behaviour currently implemented

- room creation + join code
- max 4 humans
- host assignment / host promotion in lobby
- synced roster
- character locking (no duplicate human character picks)
- ready/not-ready state
- host-only race start
- AI fills empty slots up to four racers
- deterministic shared maze/exit/toilet from one seed
- host-authoritative movement + AI simulation
- remote input relay
- 15 Hz game snapshots + interpolation
- local client prediction for responsive guest movement
- synchronized bowel event
- synchronized toilet win / result
- room stays together for rematch
- WebRTC 4-person mesh voice
- mic mute / deafen
- speaking indicators

This is intended for small friend rooms, not public matchmaking or anti-cheat competitive play.

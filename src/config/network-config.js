// LABYRUN MULTIPLAYER / VOICE CONFIG
// DreamHost Shared can serve the frontend, but it cannot keep a Node/WebSocket
// process alive. Deploy /server.js to Render/Railway/etc, then paste its HTTPS
// URL below (for example: https://labyrun-socket.onrender.com). 
window.LABYRUN_NETWORK_CONFIG = {
  serverUrl: 'https://labyrun.onrender.com',
  roomSize: 4,
  reconnectGraceMs: 20000,
  snapshotHz: 15,
  inputHz: 24,
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
    // Optional TURN fallback for restrictive cellular/corporate networks:
    // { urls: 'turn:YOUR_TURN_HOST:3478', username: 'USER', credential: 'PASS' }
  ]
};

# LABYRUN v3.0 — Multiplayer Panic

A top-down/isometric browser labyrinth race where the objective can suddenly change from the exit to the only toilet in the maze.

## Solo

The frontend is static. Upload `index.html`, `src/`, and `assets/` to normal web hosting.

## Multiplayer

DreamHost Shared cannot keep the required Node/WebSocket process alive, so the frontend stays on DreamHost and `server.js` is deployed separately (Render/Railway/etc.).

See `docs/MULTIPLAYER-DEPLOYMENT.md` for the exact setup.

## Local Node test

```bash
npm install
npm start
```

## v3.0 additions

- real 4-player lobby and room roster
- host / ready state
- synchronized character locking
- AI fills empty player slots
- deterministic shared labyrinth generation
- host-authoritative race simulation with remote input relay
- snapshot interpolation and guest prediction
- synchronized bowel event, toilet and results
- WebRTC open-mic room voice
- mic/deafen controls and speaking indicators
- external Socket.IO server configuration for DreamHost Shared deployments

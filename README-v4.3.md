# LABYRUN v4.3 — Polish / Lobby Flow / Starting Food Court

## Fixed
- All game-owned scrollbars use the LABYRUN booger/acid green style.
- Favourite-food 1UP now loads `assets/audio/sfx/one-up.mp3`; the missing v4.2 DreamHost asset caused the previous 404/no-sound bug.
- A player who poops can now enter spectator mode and cycle through only racers who are still actively racing.
- Safe survivors use the same active-racer spectator filter.
- Local static previews no longer assume `localhost:<static-port>` is a Socket.IO server when network config is AUTO.
- Added a favicon reference to stop the localhost favicon 404.

## Multiplayer post-race flow
- The Render server no longer schedules or auto-starts a rematch after results.
- The same room/code/session remains alive.
- Server advances the room's default court and sets everybody unready.
- `Race Again` returns the player to the existing room lobby first.
- Host can change mode, world, difficulty, and players can switch character before readying.
- `Main Menu` keeps the same room alive using the existing short grace/resume flow rather than immediately leaving.

## Starting plaza food court
- The square start room is now dressed as the food court the four racers just ate in.
- Each racer has a `stallAsset` in `characters.js`.
- Four non-colliding stall images are placed around the edges of the start square for the four racers in that round.
- Supplied `curry-hut` is mapped to Spicy Yaspreet.

## Deployment
This version requires BOTH:
1. DreamHost frontend patch.
2. Render/GitHub `server.js` update because the post-race multiplayer lifecycle changed.

The DreamHost patch intentionally omits `src/config/network-config.js` so your production Render URL is preserved.

# Project structure

The project is split by responsibility so future iterations remain manageable.

- `assets/` contains replaceable media. No gameplay logic belongs here.
- `src/data/` contains content records such as characters.
- `src/config/` contains balance/tuning values.
- `src/audio/` owns loading and playback of music and SFX.
- `src/game/` owns the playable runtime, rendering, maze generation, AI and race state.
- `src/styles/` owns menu/HUD/game presentation.
- `docs/` explains systems intended to be edited frequently.
- `server.js` is the Socket.IO/Express entry point and remains at project root for straightforward deployment.

The next sensible code split, once gameplay grows further, is to break `src/game/game.js` into `maze.js`, `ai.js`, `renderer.js`, `race-state.js`, and `input.js`. For this prototype they remain together so we do not add module complexity before the systems stabilize.

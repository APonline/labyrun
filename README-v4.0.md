# LABYRUN v4.0 — Full Product Foundation

This build turns the browser MVP into the reference implementation for the commercial game design.

## Added in v4.0

- 7 functional game modes: Classic, Sudden Shit, One Throne, No Map, Super Specials, Constipation, Diarrhea.
- 6 themed worlds covering all 50 courts: Mall Food Court, Taco Festival, Airport Terminal, Sketchy Carnival, Wedding Buffet, Mega Convention Center.
- World-aware court naming, palettes, ambient props, HUD labels and results.
- Solo Play Setup screen with mode, starting world and difficulty selection.
- Multiplayer host settings synchronized through the Socket.IO room server.
- Persistent local career profile with XP, player levels, career score and stats.
- 12 achievements with result-screen unlock callouts.
- Difficulty presets that alter AI speed and bowel pressure.
- Mode-aware toilet count, crisis timing, map availability, special cooldowns/charges and bowel pressure.
- One Throne-specific toilet reveal/result copy.
- Final campaign court now ends with New Run instead of looping the last court forever.

## Still intentionally deferred

- True multi-floor/vertical maze topology (escalators/elevators/stairs). This should be a dedicated systems pass because it affects generation, pathfinding, AI, camera, maps and network synchronization together.
- Cloud accounts / cross-device saves. Career data currently persists locally in the browser.
- Final cosmetic economy and unlockable 3D-quality art. The current art remains the browser reference style until the visual direction is locked.
- Public matchmaking. LABYRUN remains intentionally room-based with a 4-player maximum.

## Deployment

DreamHost receives the frontend patch. The Render/GitHub server must also be updated because v4.0 adds synchronized room game settings.

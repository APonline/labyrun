# LABYRUN v3.7 — Specials + Safe Spectator

- Added active specials for Prunejuice Paul, Corndog Chris, and Spicy Yaspreet.
- `assets/audio/sfx/special.mp3` plays whenever any special successfully fires.
- Result-screen smaller faded portrait is now the winning racer's favourite food item.
- Toilet survivors enter spectator mode: top-down map by default, then cycle living racers with left/right buttons, keyboard arrows, or gamepad D-pad left/right.
- Spectator mode hides the normal movement HUD because the survivor is already safe.

No Render/server change is required for v3.7; the existing generic special/game-event protocol already carries these states.

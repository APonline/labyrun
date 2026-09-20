# LABYRUN v3.6 — TWO THRONES

- Two one-use toilets: first two racers survive.
- Invisible optimal gut routes reward staying on the shortest route to porcelain safety and punish wandering.
- Character favorite-food 1UPs grant temporary invincibility and score.
- Cumulative score table between Food Courts.
- Five active character specials implemented; three slots intentionally left open for the next design pass.
- Updated character roster and supplied portraits/food assets.
- Requires both the DreamHost frontend patch and Render `server.js` patch.

See `README-v3.6.md` for the full changelog.

## v3.5 visual / mobile-control pass

- World collision now visually anchors to the racer's feet rather than the middle of the puppet.
- Touch joystick has a radial dead-zone, near-cardinal axis snap, and extra release/visibility resets to reduce mobile drift.
- Every Food Court gets its own deterministic brick-wall colour palette.
- Winner art now uses a deliberately cheesy 1980s portrait treatment: centered hero image plus two enlarged faded Ken Burns duplicates.
- Frontend-only update; Render/server does not need a v3.5 change.

# LABYRUN v3.3

## What changed

- Multiplayer now uses an **authoritative host maze**. The host generates the labyrinth once and sends the exact wall grid, exit, toilet and level tuning to every guest.
- Every multiplayer race now has a unique **raceId**. Inputs, snapshots, map actions, bowel events, relief pickups and results from an old race are ignored by the next race.
- Frontend asset URLs are cache-busted with `?v=3.3` so phones are much less likely to keep an older multiplayer protocol in cache.
- The 50 Food Courts now scale roughly **twice as quickly per level** as v3.2:
  - Food Court 1: 71x71
  - Food Court 9: 123x123
  - Food Court 25: 225x225 (the old giant maze)
  - Food Court 50: 379x379
- Tums and Pepto begin at Food Court 25, when the maze reaches the old 225x225 giant size, and become more common afterward.
- Bowel pressure also escalates with Food Court level, while the bowel-event timing window gradually gets earlier.
- Winner artwork now sits **between the maze and the result card**, overlapping the card instead of living inside it.

## DreamHost update

Replace:

- `index.html`
- `src/config/game-config.js`
- `src/game/game.js`
- `src/network/multiplayer.js`
- `src/styles/game.css`

Do **not** replace your configured `src/config/network-config.js`.

## Render / GitHub update

Replace repo-root `server.js`, commit, and push `main` so Render auto-deploys.

## Important

Update both DreamHost and Render for v3.3. The authoritative maze/raceId protocol requires the new frontend and new server together.

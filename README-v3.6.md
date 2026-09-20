# LABYRUN v3.6 — TWO THRONES

## Gameplay

- Bowel mode now reveals **two single-use toilets**. The first two racers to claim one survive; the other racers lose.
- Every racer receives a hidden shortest-path gut route to the best currently available toilet when bowel mode begins.
  - Staying on or immediately beside that invisible route slows bowel-pressure gain.
  - Wandering away from the route accelerates bowel-pressure gain.
  - The route is never rendered to the player.
  - If a toilet is claimed or Chili Willy breaks a wall, routes are recalculated.
- Every character now has a matching **favorite-food 1UP** somewhere in the maze. Only that character can collect it.
  - 1UP grants 10 seconds of invincibility from bowel buildup and traps.
  - It adds 250 round points.
- Result screens now include a cumulative score table before the next Food Court.
- Multiplayer cumulative scoring is maintained by the Render room server; solo scoring persists for the current Food Court run.
- AI rosters are kept stable across a run so cumulative scores stay attached to the same opponents.

## Active specials

Controls: **E** on keyboard, **X / Square** on gamepad, or the purple **SPECIAL** touch button.

Currently implemented:

- **Taco Tony — Taco Teleport:** two forward blinks, then a 20-second recharge.
- **Chili Willy — Chili Charge:** break the wall directly ahead twice, then a 20-second recharge.
- **Milkshake Mallory — Shake Spill:** two sticky slowing traps, then a 20-second recharge.
- **Brenda Beans — Bean Bomb:** two gut-pressure / slow traps, then a 20-second recharge.
- **Yogurt Yoel — Probiotic Power:** clean speed burst with no stamina drain or sprint-poop penalty.

The active-special slots for **Prunejuice Paul, Corndog Chris and Spicy Yaspreet** intentionally remain open for the next design pass. Their passive character traits still work.

## Character roster

- Taco Tony
- Chili Willy
- Milkshake Mallory
- Yogurt Yoel
- Brenda Beans
- Prunejuice Paul
- Corndog Chris
- Spicy Yaspreet

The supplied asset archive did not include a `chili-willy.png` portrait, so Chili Willy temporarily reuses the previous Curry Barry portrait. His chili 1UP and all gameplay data are already renamed.

## Result screen

- Supports one or two surviving portraits.
- The deliberately awful 1980s photo-studio treatment remains.
- One giant faded background portrait is roughly double-size and horizontally flipped while slowly Ken-Burns drifting.

## Deployment

### DreamHost

Replace the files included in the v3.6 DreamHost patch. The patch intentionally does **not** include `src/config/network-config.js`, so your configured Render URL stays untouched.

### Render / GitHub

Replace repo-root `server.js`, commit and push `main`. Render should auto-deploy. The v3.6 server is required for the renamed character IDs and cumulative multiplayer scoring.

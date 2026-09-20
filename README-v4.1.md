# LABYRUN v4.1 — World Dressing + Character Usage Ranking

## World dressing
- Removed the visible diagonal/modulo prop pattern.
- Decorative world props are now deterministic but irregularly scattered.
- Props only appear on floor cells adjacent to walls.
- Corners/dead ends have a higher chance of clutter and some 5x5 areas become natural clusters.
- Props render smaller and dimmer and are pushed to the wall/floor seam, leaving the runnable center lane visually clean.
- Gameplay pickups remain bright, centered and interactive, making the visual language clearer.

## Career character preference
- Existing persistent `characterPicks` counters are now exposed as ranked character-usage data.
- Career shows all eight racers in preferred order by total selections, with rank, portrait, use count, and percentage share.
- Ties preserve canonical roster order.
- Data remains stored structurally by character ID so it can later be synced/aggregated for profiles and leaderboard analytics.

No Render/server update is required for v4.1.

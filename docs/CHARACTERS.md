# Editing LABYRUN Characters

All playable character definitions live in **`characters.js`**. You do not need to edit `game.js` to rename, rebalance, reskin, or add a character.

Each character is one object inside `window.LABYRUN_CHARACTERS`:

```js
{
  id: 'taco-tony',
  name: 'Taco Tony',
  emoji: '🌮',
  color: '#ffcb58',
  bio: 'Character-select description.',
  trait: 'Short description of the gameplay trait.',

  // Optional image files. Leave blank to use the emoji character.
  portrait: 'assets/characters/taco-tony-portrait.webp',
  sprite: 'assets/characters/taco-tony-sprite.webp',

  // 1.00 = normal/default.
  stats: {
    speed: 1.00,
    bowelRate: 1.00,
    sprint: 1.00,
    stamina: 1.00,
    mapChecks: 0,
    mapPenalty: 1.00,
    highBowelSpeed: 1.00
  },

  special: 'mapRush'
}
```

## Common edits

- Faster character: `speed: 1.10`
- Slower bowel gain: `bowelRate: 0.90`
- Stronger sprint: `sprint: 1.08`
- More stamina: `stamina: 1.15`
- Extra map use: `mapChecks: 1`
- Half map-check bowel penalty: `mapPenalty: 0.50`
- Less slowdown at high bowel pressure: `highBowelSpeed: 1.15`

## Adding art later

Create `assets/characters/` and point `portrait` and/or `sprite` at a PNG/WebP file. The character-select screen uses `portrait`; the game renderer uses `sprite`. If either path is blank, LABYRUN falls back to the emoji, so incomplete characters are safe while you are working on them.

## Adding a ninth character

Copy one existing object in `characters.js`, give it a unique `id`, change the fields, and save. Character Select builds itself from the array automatically.


## Puppet fallback
If `sprite` is blank, gameplay renders a simple animated canvas puppet. Its shirt defaults to the character's `color`. Optional per-character puppet colors live in `characters.js`:

```js
puppet: {
  skin: '#efc39e',
  pants: '#29242b',
  hair: '#34251f',
  // shirt: '#ffcb58' // optional; otherwise uses character color
}
```

When you have real art, set `sprite: 'assets/characters/sprites/my-character.webp'`. No game renderer rewrite is required.

# Audio architecture

LABYRUN uses regular MP3 files through the Web Audio API.

## Music

- `assets/audio/music/maze-groove.mp3` — normal maze race loop
- `assets/audio/music/bowel-panic.mp3` — bowel-mode panic loop

## Main sound effects

- `assets/audio/sfx/bowel-alarm.mp3` — bowel-mode transition
- `assets/audio/sfx/poop-fail.mp3` — catastrophic failure sting

## Random fart library

Put fart MP3s in:

```text
assets/audio/sfx/farts/
```

The active list is at the top of `src/audio/audio-manager.js`:

```js
farts: [
  'assets/audio/sfx/farts/fart-01.mp3',
  'assets/audio/sfx/farts/fart-02.mp3',
  'assets/audio/sfx/farts/fart-03.mp3'
]
```

Add, remove, or rename entries there. There is no fixed limit. During bowel mode the audio manager randomly chooses from the successfully loaded files, avoids immediately repeating the same fart when possible, and increases the frequency somewhat as gut panic rises.

Missing optional fart files are skipped rather than causing all game audio to fail.

## Game-facing API

`src/game/game.js` only needs the small audio API:

```js
LabyrunAudio.setMode('normal');
LabyrunAudio.setMode('panic');
LabyrunAudio.setPanicLevel(0.75);
LabyrunAudio.panicSting();
LabyrunAudio.poopSting();
```

You can replace every included MP3 with your own audio without changing gameplay code if you retain the filenames. If filenames change, edit only the `ASSETS` object in `audio-manager.js`.

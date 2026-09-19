# Fart SFX

Replace these placeholder MP3s with your own clips, or add more files.

If you keep the existing names (`fart-01.mp3`, etc.), no code change is needed.
If you add/remove/rename files, edit the `farts` array near the top of:

`src/audio/audio-manager.js`

Bowel mode randomly selects from this array and avoids immediate repeats when possible.

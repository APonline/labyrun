// ============================================================
// LABYRUN AUDIO MANAGER
// ============================================================
// MP3 file-based audio. To use your own tracks, replace the files or
// edit the paths below. The fart array can contain as many MP3s as you want.
// Missing optional fart files are skipped instead of breaking all audio.
// ============================================================
window.LabyrunAudio = (() => {
  const SETTINGS = window.LabyrunSettings;
    const ASSETS = {
      menu: [
      'assets/audio/music/main.mp3'
    ],

      normal: [
      'assets/audio/music/maze-groove-1.mp3',
      'assets/audio/music/maze-groove-2.mp3'
    ],

    panic: [
      'assets/audio/music/bowel-panic-1.mp3',
      'assets/audio/music/bowel-panic-2.mp3'
    ],
    alarm: 'assets/audio/sfx/bowel-alarm.mp3',
    poop: 'assets/audio/sfx/poop-fail.mp3',
    flush: 'assets/audio/sfx/toilet-flush.mp3',
    belches: {
      tony: 'assets/audio/sfx/belches/tony-belch.mp3',
      barry: 'assets/audio/sfx/belches/barry-belch.mp3',
      cassie: 'assets/audio/sfx/belches/cassie-belch.mp3',
      dale: 'assets/audio/sfx/belches/dale-belch.mp3',
      brenda: 'assets/audio/sfx/belches/brenda-belch.mp3',
      niko: 'assets/audio/sfx/belches/niko-belch.mp3',
      colin: 'assets/audio/sfx/belches/colin-belch.mp3',
      priya: 'assets/audio/sfx/belches/priya-belch.mp3'
    },
    farts: [
      'assets/audio/sfx/farts/fart-01.mp3',
      'assets/audio/sfx/farts/fart-02.mp3',
      'assets/audio/sfx/farts/fart-03.mp3',
      'assets/audio/sfx/farts/fart-04.mp3',
      'assets/audio/sfx/farts/fart-05.mp3',
      'assets/audio/sfx/farts/fart-06.mp3',
      'assets/audio/sfx/farts/fart-07.mp3',
      'assets/audio/sfx/farts/fart-08.mp3',
      'assets/audio/sfx/farts/fart-09.mp3',
      'assets/audio/sfx/farts/fart-10.mp3',
      'assets/audio/sfx/farts/fart-11.mp3',
      'assets/audio/sfx/farts/fart-12.mp3',
      'assets/audio/sfx/farts/fart-13.mp3',
      'assets/audio/sfx/farts/fart-14.mp3',
      'assets/audio/sfx/farts/fart-15.mp3',
      'assets/audio/sfx/farts/fart-16.mp3',
      'assets/audio/sfx/farts/fart-17.mp3',
      'assets/audio/sfx/farts/fart-18.mp3',
      'assets/audio/sfx/farts/fart-19.mp3',
      'assets/audio/sfx/farts/fart-20.mp3',
    ]
  };

  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  const buffers = new Map();
  let loading = null;
  let source = null;
  let mode = 'off';
  let muted = false;
  let panicLevel = 0;
  let fartTimer = 0;
  let lastFartKey = '';

  function createGraph() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.gain.value = musicBaseGain();
    sfxGain.gain.value = sfxBaseGain();
    musicGain.connect(master);
    sfxGain.connect(master);
    master.connect(ctx.destination);
    applyMute();
  }

  function musicBaseGain() { return ((SETTINGS?.get('musicVolume') ?? 65) / 100) * 0.80; }

  function sfxBaseGain() { return ((SETTINGS?.get('sfxVolume') ?? 70) / 100) * 0.90; }

  function applyVolumes() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const panicBoost = mode === 'panic' ? (1 + panicLevel * 0.28) : 1;
    musicGain?.gain.setTargetAtTime(musicBaseGain() * panicBoost, now, 0.04);
    sfxGain?.gain.setTargetAtTime(sfxBaseGain(), now, 0.04);
  }

  function applyMute() {
    if (!master || !ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  }

  async function loadBuffer(key, url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const bytes = await response.arrayBuffer();
      buffers.set(key, await ctx.decodeAudioData(bytes));

      // Do not make the player wait for every fart/SFX file before music begins.
      // As soon as a track for the active mode is decoded, music may start.
      const matchesActiveMode =
        (mode === 'menu' && key.startsWith('menu-')) ||
        (mode === 'normal' && key.startsWith('normal-')) ||
        (mode === 'panic' && key.startsWith('panic-'));
      if (matchesActiveMode && !source) startMusic(mode);

      return true;
    } catch (err) {
      console.warn(`[LABYRUN audio] skipped ${url}:`, err);
      return false;
    }
  }

  function loadAll() {
    if (loading) return loading;
    const jobs = [
      ...ASSETS.menu.map((url, i) =>
        loadBuffer(`menu-${i}`, url)
      ),

      ...ASSETS.normal.map((url, i) =>
        loadBuffer(`normal-${i}`, url)
      ),

      ...ASSETS.panic.map((url, i) =>
        loadBuffer(`panic-${i}`, url)
      ),

      loadBuffer('alarm', ASSETS.alarm),
      loadBuffer('poop', ASSETS.poop),
      loadBuffer('flush', ASSETS.flush),
      ...Object.entries(ASSETS.belches).map(([key,url]) => loadBuffer(`belch-${key}`, url)),

      ...ASSETS.farts.map((url, i) =>
        loadBuffer(`fart-${i}`, url)
      )
    ];
    loading = Promise.allSettled(jobs).then(() => {
      if ((mode === 'menu' || mode === 'normal' || mode === 'panic') && !source) startMusic(mode);
      if (mode === 'panic') scheduleNextFart(true);
    });
    return loading;
  }

  function ensure() {
    createGraph();
    if (ctx.state === 'suspended') ctx.resume();
    loadAll();
    return ctx;
  }

  function stopMusic() {
    if (!source) return;
    try { source.stop(); } catch (_) {}
    try { source.disconnect(); } catch (_) {}
    source = null;
  }

  function startMusic(which) {
    if (!ctx) return;

    const tracks = ASSETS[which];
    if (!Array.isArray(tracks)) return;

    const available = tracks
      .map((_, i) => `${which}-${i}`)
      .filter(key => buffers.has(key));

    if (!available.length) return;

    const selectedKey =
      available[Math.floor(Math.random() * available.length)];

    stopMusic();

    source = ctx.createBufferSource();
    source.buffer = buffers.get(selectedKey);
    source.loop = true;

    source.playbackRate.value =
      which === 'panic'
        ? 1 + panicLevel * 0.18
        : 1;

    source.connect(musicGain);
    source.start();

    console.log(
      `[LABYRUN audio] ${which} music: ${selectedKey}`
    );
  }

  function clearFartTimer() {
    if (fartTimer) clearTimeout(fartTimer);
    fartTimer = 0;
  }

  function availableFarts() {
    return ASSETS.farts.map((_, i) => `fart-${i}`).filter(key => buffers.has(key));
  }

  function playBuffer(key, volume = 1, playbackRate = 1) {
    ensure();
    if (!buffers.has(key)) return false;
    const s = ctx.createBufferSource();
    const g = ctx.createGain();
    s.buffer = buffers.get(key);
    s.playbackRate.value = playbackRate;
    g.gain.value = volume;
    s.connect(g).connect(sfxGain);
    s.start();
    return true;
  }

  function playRandomFart() {
    const choices = availableFarts();
    if (!choices.length) return false;
    const filtered = choices.length > 1 ? choices.filter(key => key !== lastFartKey) : choices;
    const key = filtered[(Math.random() * filtered.length) | 0];
    lastFartKey = key;
    return playBuffer(key, 0.42 + Math.random() * 0.28, 0.92 + Math.random() * 0.16);
  }

  function scheduleNextFart(soon = false) {
    clearFartTimer();
    if (mode !== 'panic') return;
    const intensity = Math.max(0, Math.min(1, panicLevel));
    const minMs = 6500 - intensity * 3900;
    const maxMs = 12000 - intensity * 6200;
    const wait = soon ? 1200 + Math.random() * 1800 : minMs + Math.random() * (maxMs - minMs);
    fartTimer = setTimeout(() => {
      if (mode !== 'panic') return;
      playRandomFart();
      scheduleNextFart(false);
    }, wait);
  }

  function setMode(next) {
    ensure();
    if (mode === next && source) return;
    mode = next;

    if (next === 'off') {
      stopMusic();
      clearFartTimer();
      return;
    }

    // Music buffers are keyed normal-0 / normal-1 and panic-0 / panic-1.
    // startMusic() selects one of the loaded variants. The old buffers.has(next)
    // check looked for a non-existent "normal" or "panic" key, so SFX worked
    // while music stayed silent once loading had already completed.
    if (next === 'menu' || next === 'normal' || next === 'panic') startMusic(next);
    if (next === 'panic') scheduleNextFart(true);
    else clearFartTimer();
  }

  function setPanicLevel(value) {
    panicLevel = Math.max(0, Math.min(1, Number(value) || 0));
    if (!ctx) return;
    if (mode === 'panic' && source) {
      source.playbackRate.setTargetAtTime(1 + panicLevel * 0.18, ctx.currentTime, 0.08);
      musicGain.gain.setTargetAtTime(musicBaseGain() * (1 + panicLevel * 0.28), ctx.currentTime, 0.08);
    }
  }

  function playSfx(key, volume = 1) {
    ensure();
    if (playBuffer(key, volume)) return;
    loading?.then(() => playBuffer(key, volume));
  }

  function panicSting() { playSfx('alarm', 1); }
  function poopSting() { playSfx('poop', 1); }
  function flushSting() { playSfx('flush', 1); }
  function playBelch(key) { playSfx(`belch-${key}`, 0.90); }

  function setMusicVolume(value) {
    SETTINGS?.set('musicVolume', value);
    applyVolumes();
  }

  function setSfxVolume(value) {
    SETTINGS?.set('sfxVolume', value);
    applyVolumes();
  }

  function toggleMute() {
    muted = !muted;
    ensure();
    applyMute();
    return muted;
  }

  function stop() {
    mode = 'off';
    stopMusic();
    clearFartTimer();
    if (musicGain && ctx) musicGain.gain.setTargetAtTime(musicBaseGain(), ctx.currentTime, 0.03);
  }

  return {
    ensure,
    setMode,
    setPanicLevel,
    panicSting,
    poopSting,
    flushSting,
    playBelch,
    playRandomFart,
    setMusicVolume,
    setSfxVolume,
    applyVolumes,
    toggleMute,
    stop,
    assets: ASSETS,
    get muted(){ return muted; }
  };
})();

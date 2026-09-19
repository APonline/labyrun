// ============================================================
// LABYRUN PLAYER SETTINGS
// ============================================================
// Runtime/player preferences live here instead of game.js.
// They persist in localStorage and are safe to expand later.
// ============================================================
window.LabyrunSettings = (() => {
  const STORAGE_KEY = 'labyrun.settings.v2';
  const defaults = Object.freeze({
    musicVolume: 65,
    sfxVolume: 70,
    rumbleStrength: 55,
    alarmFlash: 80,
    viewDistance: 100,
    showControlHints: true
  });

  const listeners = new Set();
  let values = {...defaults};

  const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v)));

  function normalize(raw = {}) {
    return {
      musicVolume: clamp(raw.musicVolume ?? defaults.musicVolume, 0, 100),
      sfxVolume: clamp(raw.sfxVolume ?? defaults.sfxVolume, 0, 100),
      rumbleStrength: clamp(raw.rumbleStrength ?? defaults.rumbleStrength, 0, 100),
      alarmFlash: clamp(raw.alarmFlash ?? defaults.alarmFlash, 0, 100),
      viewDistance: clamp(raw.viewDistance ?? defaults.viewDistance, 75, 135),
      showControlHints: raw.showControlHints ?? defaults.showControlHints
    };
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    values = normalize(saved);
  } catch (_) {
    values = {...defaults};
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch (_) {}
    listeners.forEach(fn => fn({...values}));
  }

  function get(key) { return values[key]; }
  function all() { return {...values}; }
  function set(key, value) {
    values = normalize({...values, [key]: value});
    save();
    return values[key];
  }
  function update(patch) {
    values = normalize({...values, ...patch});
    save();
    return all();
  }
  function reset() {
    values = {...defaults};
    save();
    return all();
  }
  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { defaults, get, all, set, update, reset, onChange };
})();

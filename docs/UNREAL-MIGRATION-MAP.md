# LABYRUN Browser → Unreal Reference Map

The browser edition is the gameplay specification for the future Unreal Steam release.

- `product-content.js` → Unreal Data Assets / Data Tables for modes, worlds, difficulties and achievements.
- `characters.js` → Character Data Assets and ability definitions.
- `game-config.js` → Game balance Data Assets / developer settings.
- Maze generation → procedural level / PCG system.
- Browser race state → authoritative GameMode + GameState.
- Browser player state → Character + PlayerState + replicated components.
- Specials/traps → gameplay components or Gameplay Ability System-style abilities.
- Career/profile → SaveGame plus Steam/cloud profile services.
- Canvas HUD → UMG/CommonUI.
- Socket.IO host authority → Unreal replicated dedicated/listen-server model.
- WebRTC room voice → platform/online subsystem or integrated voice provider.

Do not port the JavaScript renderer. Port the rules, data, state machines, timings and content definitions.

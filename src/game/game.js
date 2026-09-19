(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const screens = [...document.querySelectorAll('.screen')];
  let audioUnlocked = false;
  function show(id){
    screens.forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
    // Outside active gameplay, LABYRUN uses the main/menu theme continuously.
    // The first boot click unlocks browser audio; after that screen changes do not
    // restart the track unless gameplay has switched the music mode.
    if(audioUnlocked && id !== '#gameScreen' && id !== '#bootScreen') AUDIO.setMode('menu');
  }
  const CFG = window.LABYRUN_CONFIG;
  const CHARS = window.LABYRUN_CHARACTERS;
  const AUDIO = window.LabyrunAudio;
  const SETTINGS = window.LabyrunSettings;
  const MP = window.LabyrunMultiplayer;
  const VOICE = window.LabyrunVoice;
  const lerp = (a,b,t) => a + (b-a) * t;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  let gameplayRandom = Math.random;
  function mulberry32(seed){
    let a=seed>>>0;
    return function(){
      a|=0; a=(a+0x6D2B79F5)|0;
      let t=Math.imul(a^(a>>>15),1|a);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function setGameplaySeed(seed){ gameplayRandom=mulberry32(Number(seed)>>>0); }
  const random = () => gameplayRandom();
  const rand = (a,b) => a + random()*(b-a);
  const ease = t => 1 - Math.pow(1-clamp(t,0,1),3);
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const isTouchDevice = window.matchMedia?.('(pointer: coarse)')?.matches || ('ontouchstart' in window);
  const canvas = $('#gameCanvas');
  document.documentElement.classList.toggle('touch-device', !!isTouchDevice);

  // ============================================================
  // CHARACTER SELECT
  // ============================================================
  let selected = null;
  let lastBelchAt = 0;
  const grid = $('#characterGrid');
  const selectedProfile = $('#selectedProfile');

  function characterRating(c, key){
    const st = c.stats || {};
    if(key==='run'){
      const v=st.speed ?? 1;
      return v>=1.08?5:v>=1.02?4:v>=.99?3:v>=.97?2:1;
    }
    if(key==='sprint'){
      const v=st.sprint ?? 1;
      return v>=1.08?5:v>=1.02?4:v>=.99?3:v>=.96?2:1;
    }
    if(key==='gut'){
      // bowelRate is inverted: lower pressure gain = stronger gut.
      const v=st.bowelRate ?? 1;
      return v<=.92?5:v<=.98?4:v<=1.01?3:v<=1.06?2:1;
    }
    const v=st.stamina ?? 1;
    return v>=1.10?5:v>=1.03?4:v>=.99?3:v>=.96?2:1;
  }

  function statPips(label,level){
    const pips=Array.from({length:5},(_,i)=>`<i class="${i<level?'on':''}"></i>`).join('');
    return `<div class="profile-stat"><span>${label}</span><div class="stat-pips" aria-label="${label} ${level} out of 5">${pips}</div></div>`;
  }

  function mobileStat(label,level){
    return `<span class="mobile-stat ${level>=4?'hot':''}"><span>${label}</span><b>${level}/5</b></span>`;
  }

  function renderSelectedProfile(c){
    selectedProfile.innerHTML = `
      <div class="selected-profile-head">
        <div>
          <span class="profile-kicker">SELECTED RACER</span>
          <h3>${c.name}</h3>
          <p>${c.bio}</p>
        </div>
        <div class="profile-trait"><span>TRAIT</span><b>${c.trait}</b><small>${c.traitDetail||''}</small></div>
      </div>
      <div class="profile-stats">
        ${statPips('RUN',characterRating(c,'run'))}
        ${statPips('SPRINT',characterRating(c,'sprint'))}
        ${statPips('GUT',characterRating(c,'gut'))}
        ${statPips('STAMINA',characterRating(c,'stamina'))}
      </div>`;
  }

  CHARS.forEach((c,i) => {
    const el = document.createElement('div');
    el.className = 'character-card';
    el.tabIndex = 0;
    const visual = c.portrait
      ? `<div class="character-portrait"><img class="avatar-image" src="${c.portrait}" alt="${c.name}"></div>`
      : `<div class="character-portrait"><span class="avatar">${c.emoji}</span></div>`;
    el.innerHTML = `${visual}
      <div class="character-card-copy"><h3>${c.name}</h3><span class="trait-chip">${c.trait}</span></div>
      <div class="character-mobile-meta">
        ${mobileStat('RUN',characterRating(c,'run'))}
        ${mobileStat('SPR',characterRating(c,'sprint'))}
        ${mobileStat('GUT',characterRating(c,'gut'))}
        ${mobileStat('STA',characterRating(c,'stamina'))}
      </div>`;
    const belch = () => {
      const now = performance.now();
      if(now-lastBelchAt < 180) return;
      lastBelchAt = now;
      AUDIO.playBelch(c.belch);
    };
    el.addEventListener('mouseenter', belch);
    el.addEventListener('focus', belch);
    el.onclick = () => {
      selected = i;
      [...grid.children].forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      renderSelectedProfile(c);
      $('#startSoloBtn').disabled = false;
      $('#mobileStartSoloBtn').disabled = false;
      $('#mobileSelectedName').textContent = c.name;
      $('#mobileSelectedTrait').textContent = `${c.trait} • RUN ${characterRating(c,'run')}  SPRINT ${characterRating(c,'sprint')}  GUT ${characterRating(c,'gut')}  STAM ${characterRating(c,'stamina')}`;
      // Touch devices do not have hover, so tapping through the roster still
      // becomes the intended disgusting little belch symphony.
      belch();
    };
    grid.appendChild(el);
  });

  // Browsers will not permit reliable autoplay with sound before a gesture.
  // This intentionally silly gate gives us that gesture, then music can begin
  // immediately and continue through every non-gameplay screen.
  $('#enterBtn').onclick = () => {
    audioUnlocked = true;
    AUDIO.ensure();
    AUDIO.setMode('menu');
    show('#menuScreen');
  };

  $('#soloBtn').onclick = () => { AUDIO.ensure(); show('#characterScreen'); };
  $('#multiBtn').onclick = () => show('#roomScreen');
  $('#howBtn').onclick = () => show('#howScreen');
  $('#settingsBtn').onclick = () => { syncSettingsUi(); show('#settingsScreen'); };
  $('#controlsBtn').onclick = () => { refreshGamepadStatus(); setControlTab(isTouchDevice?'touch':'keyboard'); show('#controlsScreen'); };
  document.querySelectorAll('.backBtn').forEach(b => b.onclick = () => show('#menuScreen'));

  // ============================================================
  // PLAYER SETTINGS / CONTROLS MENU
  // ============================================================
  let lastInputMode = isTouchDevice ? 'touch' : 'keyboard';
  let gamepadMapWasDown = false;
  let gamepadState = {dx:0,dy:0,sprint:false};
  let touchState = {dx:0,dy:0,sprint:false,active:false,pointerId:null,originX:0,originY:0};

  const settingBindings = [
    ['musicVolumeSetting','musicVolumeValue','musicVolume','%'],
    ['sfxVolumeSetting','sfxVolumeValue','sfxVolume','%'],
    ['rumbleSetting','rumbleValue','rumbleStrength','%'],
    ['alarmFlashSetting','alarmFlashValue','alarmFlash','%'],
    ['viewDistanceSetting','viewDistanceValue','viewDistance','%']
  ];

  function controlHintText(mode=lastInputMode){
    if(mode==='touch') return '<b>MOVE</b> DRAG LEFT SIDE <span>•</span> <b>SPRINT</b> HOLD BUTTON <span>•</span> <b>MAP</b> TAP MAP';
    return mode==='gamepad'
      ? '<b>MOVE</b> LEFT STICK / D-PAD <span>•</span> <b>SPRINT</b> RT / R2 OR A / CROSS <span>•</span> <b>MAP</b> Y / TRIANGLE'
      : '<b>MOVE</b> WASD / ARROWS <span>•</span> <b>SPRINT</b> HOLD SHIFT <span>•</span> <b>MAP</b> M';
  }

  function applyPlayerSettings(){
    const rumble=(SETTINGS?.get('rumbleStrength') ?? 55)/100;
    const alarm=(SETTINGS?.get('alarmFlash') ?? 80)/100;
    document.documentElement.style.setProperty('--alarm-strength', alarm.toFixed(2));
    document.documentElement.style.setProperty('--rumble-strength', rumble.toFixed(2));
    const hints=SETTINGS?.get('showControlHints') ?? true;
    const strip=$('.controls-strip');
    if(strip){
      strip.classList.toggle('hidden',!hints);
      strip.innerHTML=controlHintText();
    }
    $('#touchHint')?.classList.toggle('settings-hidden',!hints);
    AUDIO.applyVolumes?.();
  }

  function syncSettingsUi(){
    settingBindings.forEach(([inputId,outId,key,suffix])=>{
      const input=$('#'+inputId),out=$('#'+outId);
      if(!input||!out)return;
      input.value=SETTINGS.get(key);
      out.value=`${SETTINGS.get(key)}${suffix}`;
      out.textContent=out.value;
    });
    $('#controlHintsSetting').checked=!!SETTINGS.get('showControlHints');
    applyPlayerSettings();
  }

  settingBindings.forEach(([inputId,outId,key,suffix])=>{
    const input=$('#'+inputId),out=$('#'+outId);
    input?.addEventListener('input',()=>{
      SETTINGS.set(key,Number(input.value));
      out.value=`${input.value}${suffix}`;
      out.textContent=out.value;
      applyPlayerSettings();
    });
  });
  $('#controlHintsSetting')?.addEventListener('change',e=>{
    SETTINGS.set('showControlHints',!!e.target.checked);
    applyPlayerSettings();
  });
  $('#resetSettingsBtn')?.addEventListener('click',()=>{
    SETTINGS.reset();
    syncSettingsUi();
  });

  function setInputMode(mode){
    if(lastInputMode===mode)return;
    lastInputMode=mode;
    const strip=$('.controls-strip');
    if(strip) strip.innerHTML=controlHintText(mode);
  }

  function setControlTab(mode){
    const keyboard=mode==='keyboard', gamepad=mode==='gamepad', touch=mode==='touch';
    $('#keyboardTabBtn').classList.toggle('active',keyboard);
    $('#gamepadTabBtn').classList.toggle('active',gamepad);
    $('#touchTabBtn').classList.toggle('active',touch);
    $('#keyboardControls').classList.toggle('hidden',!keyboard);
    $('#gamepadControls').classList.toggle('hidden',!gamepad);
    $('#touchControlsHelp').classList.toggle('hidden',!touch);
    if(gamepad) refreshGamepadStatus();
  }
  $('#keyboardTabBtn')?.addEventListener('click',()=>setControlTab('keyboard'));
  $('#gamepadTabBtn')?.addEventListener('click',()=>setControlTab('gamepad'));
  $('#touchTabBtn')?.addEventListener('click',()=>setControlTab('touch'));

  function connectedGamepad(){
    if(!navigator.getGamepads)return null;
    return [...navigator.getGamepads()].find(Boolean) || null;
  }

  function refreshGamepadStatus(){
    const status=$('#gamepadStatus');
    if(!status)return;
    const gp=connectedGamepad();
    status.textContent=gp ? `CONNECTED: ${gp.id}` : 'No gamepad detected yet. Connect one and press a button.';
    status.classList.toggle('connected',!!gp);
  }
  addEventListener('gamepadconnected',()=>{refreshGamepadStatus();});
  addEventListener('gamepaddisconnected',()=>{refreshGamepadStatus();});

  function pollGamepad(){
    const gp=connectedGamepad();
    if(!gp){
      gamepadState={dx:0,dy:0,sprint:false};
      gamepadMapWasDown=false;
      return;
    }
    const dead=.18;
    let dx=Math.abs(gp.axes?.[0]||0)>dead?(gp.axes[0]||0):0;
    let dy=Math.abs(gp.axes?.[1]||0)>dead?(gp.axes[1]||0):0;
    const pressed=i=>!!gp.buttons?.[i]?.pressed;
    if(pressed(14))dx=-1;
    if(pressed(15))dx=1;
    if(pressed(12))dy=-1;
    if(pressed(13))dy=1;
    const sprint=pressed(0)||((gp.buttons?.[7]?.value||0)>.25);
    const mapDown=pressed(3);
    const active=Math.abs(dx)>.01||Math.abs(dy)>.01||sprint||mapDown;
    if(active)setInputMode('gamepad');
    if(mapDown&&!gamepadMapWasDown)toggleMap();
    gamepadMapWasDown=mapDown;
    gamepadState={dx,dy,sprint};
  }

  // Floating touch joystick: the left side of the playfield is intentionally
  // empty until the player touches it. The origin is wherever their thumb lands.
  const touchJoystick=$('#touchJoystick');
  const touchKnob=$('#touchJoystickKnob');
  const touchSprintBtn=$('#touchSprintBtn');
  const touchMapBtn=$('#touchMapBtn');
  const TOUCH_RADIUS=56;

  function resetTouchStick(){
    touchState.dx=0; touchState.dy=0; touchState.active=false; touchState.pointerId=null;
    touchJoystick?.classList.add('hidden');
    if(touchKnob) touchKnob.style.transform='translate(0px,0px)';
  }

  function beginTouchStick(e){
    if(!isTouchDevice || e.pointerType!=='touch' || (phase!=='race' && phase!=='crisis') || mapOpen || toiletRevealActive) return;
    if(e.clientX > innerWidth*.72) return;
    e.preventDefault();
    setInputMode('touch');
    touchState.active=true; touchState.pointerId=e.pointerId; touchState.originX=e.clientX; touchState.originY=e.clientY;
    touchJoystick.style.left=e.clientX+'px'; touchJoystick.style.top=e.clientY+'px'; touchJoystick.classList.remove('hidden');
    try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
  }

  function moveTouchStick(e){
    if(!touchState.active || e.pointerId!==touchState.pointerId) return;
    e.preventDefault();
    let x=e.clientX-touchState.originX, y=e.clientY-touchState.originY;
    const len=Math.hypot(x,y);
    if(len>TOUCH_RADIUS){ x=x/len*TOUCH_RADIUS; y=y/len*TOUCH_RADIUS; }
    touchState.dx=x/TOUCH_RADIUS; touchState.dy=y/TOUCH_RADIUS;
    if(touchKnob) touchKnob.style.transform=`translate(${x}px,${y}px)`;
  }

  function endTouchStick(e){
    if(e && touchState.pointerId!==null && e.pointerId!==touchState.pointerId) return;
    resetTouchStick();
  }

  canvas.addEventListener('pointerdown',beginTouchStick,{passive:false});
  canvas.addEventListener('pointermove',moveTouchStick,{passive:false});
  canvas.addEventListener('pointerup',endTouchStick,{passive:false});
  canvas.addEventListener('pointercancel',endTouchStick,{passive:false});

  const setTouchSprint=(down,e)=>{
    if(e){e.preventDefault();e.stopPropagation();}
    if(!isTouchDevice) return;
    setInputMode('touch');
    touchState.sprint=down;
    touchSprintBtn?.classList.toggle('active',down);
  };
  touchSprintBtn?.addEventListener('pointerdown',e=>{try{touchSprintBtn.setPointerCapture(e.pointerId);}catch(_){} setTouchSprint(true,e);},{passive:false});
  touchSprintBtn?.addEventListener('pointerup',e=>setTouchSprint(false,e),{passive:false});
  touchSprintBtn?.addEventListener('pointercancel',e=>setTouchSprint(false,e),{passive:false});
  touchSprintBtn?.addEventListener('lostpointercapture',()=>setTouchSprint(false));
  touchMapBtn?.addEventListener('click',e=>{e.preventDefault();setInputMode('touch');toggleMap();});
  addEventListener('blur',()=>{resetTouchStick();touchState.sprint=false;touchSprintBtn?.classList.remove('active');});

  syncSettingsUi();

  // ============================================================
  // MULTIPLAYER LOBBY / ROOM / VOICE
  // ============================================================
  let roomState = null;
  let lobbyCharacterId = null;
  let voiceLevels = {};
  let multiplayer = {active:false,isHost:false,myId:null,meta:null,remoteInputs:new Map(),lastInputSend:0,lastSnapshotSend:0,ending:false};

  const savedPlayerName=localStorage.getItem('labyrun.playerName')||'';
  $('#playerName').value=savedPlayerName;
  $('#serverUrlInput').value=MP?.getServerUrl?.()||'';
  $('#serverUrlStatus').textContent=MP?.getServerUrl?.() ? `Using ${MP.getServerUrl()}` : 'Paste the HTTPS URL from Render/Railway once.';

  function safeName(){
    const v=($('#playerName').value||'').trim().slice(0,18)||'Player';
    localStorage.setItem('labyrun.playerName',v);
    return v;
  }
  function charById(id){ return CHARS.find(c=>c.id===id)||null; }

  CHARS.forEach(c=>{
    const el=document.createElement('button');
    el.className='lobby-character';
    el.dataset.characterId=c.id;
    el.innerHTML=`<img src="${c.portrait}" alt="${c.name}"><b>${c.shortName||c.name}</b>`;
    el.onmouseenter=()=>{ if(!isTouchDevice&&!el.classList.contains('taken')) AUDIO.playBelch(c.belch); };
    el.onclick=()=>{
      if(el.classList.contains('taken')) return;
      lobbyCharacterId=c.id;
      AUDIO.playBelch(c.belch);
      MP.updatePlayer({characterId:c.id});
    };
    $('#lobbyCharacters').appendChild(el);
  });

  function renderVoiceHud(){
    const hud=$('#voiceHud'),wrap=$('#voiceHudPlayers');
    if(!roomState || !VOICE?.getState().joined){ hud.classList.add('hidden'); return; }
    hud.classList.remove('hidden');
    wrap.innerHTML=roomState.players.map(p=>{
      const speaking=(voiceLevels[p.id]||0)>.045;
      return `<div class="voice-hud-player"><i class="${p.voiceEnabled?'on':''} ${speaking?'speaking':''}"></i><span>${p.id===MP.getMyId()?'YOU':p.name}</span></div>`;
    }).join('');
    $('#gameMuteMicBtn').textContent=VOICE.getState().muted?'UNMUTE':'MUTE';
  }

  function renderRoom(next){
    roomState=next;
    if(!next) return;
    $('#roomJoinView').classList.add('hidden');
    $('#roomLobbyView').classList.remove('hidden');
    $('#activeRoomCode').textContent=next.code;
    const me=next.players.find(p=>p.id===MP.getMyId());
    lobbyCharacterId=me?.characterId||null;
    if(multiplayer.active&&multiplayer.isHost&&players.length){
      const connected=new Set(next.players.map(p=>p.id));
      players.forEach((p,slot)=>{
        if(p.isRemoteHuman&&!connected.has(p.networkId)){
          p.isRemoteHuman=false;p.isAI=true;
          p.personality=CFG.ai.personalities[Math.max(0,(slot-1)%CFG.ai.personalities.length)];
          p.name=`${p.charName} (AI)`;
          p.path=[];p.pathTick=0;
        }
      });
    }
    const taken=new Set(next.players.filter(p=>p.id!==MP.getMyId()).map(p=>p.characterId).filter(Boolean));
    document.querySelectorAll('.lobby-character').forEach(el=>{
      el.classList.toggle('selected',el.dataset.characterId===lobbyCharacterId);
      el.classList.toggle('taken',taken.has(el.dataset.characterId));
    });
    $('#roomRoster').innerHTML=next.players.map(p=>{
      const c=charById(p.characterId);
      const speaking=(voiceLevels[p.id]||0)>.045;
      return `<div class="roster-row">
        <div class="roster-avatar">${c?`<img src="${c.portrait}" alt="">`:'❔'}</div>
        <div class="roster-copy"><b>${p.isHost?'👑 ':''}${p.name}${p.id===MP.getMyId()?' (YOU)':''}</b><small>${c?c.name:'Choosing racer…'}</small></div>
        <div class="roster-state ${p.ready?'ready':'waiting'}"><span class="voice-dot ${p.voiceEnabled?'on':''} ${speaking?'speaking':''}"></span>${p.ready?'READY':'WAITING'}</div>
      </div>`;
    }).join('');
    const allReady=next.players.length>0 && next.players.every(p=>p.ready&&p.characterId);
    const isHost=next.hostId===MP.getMyId();
    $('#readyBtn').disabled=!me?.characterId;
    $('#readyBtn').textContent=me?.ready?'NOT READY':'READY UP';
    $('#hostStartBtn').classList.toggle('hidden',!isHost);
    $('#hostStartBtn').disabled=!isHost||!allReady||next.gameActive;
    $('#lobbyNotice').textContent=next.gameActive?'Race is starting…':allReady?(isHost?'Everyone is ready. START THE DISASTER.':'Everyone is ready. Waiting for the host.'):'Pick racers and ready up. Empty slots become AI.';
    const vs=VOICE?.getState?.()||{};
    $('#voiceSummary').textContent=vs.joined?(vs.muted?'Joined • mic muted':`Joined • ${Math.max(0,next.players.filter(p=>p.voiceEnabled).length-1)} friend(s) connected`):'Not joined';
    $('#joinVoiceBtn').classList.toggle('hidden',!!vs.joined);
    $('#muteVoiceBtn').classList.toggle('hidden',!vs.joined);
    $('#deafenVoiceBtn').classList.toggle('hidden',!vs.joined);
    $('#muteVoiceBtn').textContent=vs.muted?'Unmute Mic':'Mute Mic';
    $('#deafenVoiceBtn').textContent=vs.deafened?'Hear Friends':'Mute Friends';
    renderVoiceHud();
  }

  async function connectAnd(action){
    $('#roomStatus').textContent='Connecting to the multiplayer server…';
    try{
      await MP.connect();
      await action();
      $('#roomStatus').textContent='Connected.';
    }catch(e){
      $('#roomStatus').textContent=e.message||String(e);
      if(String(e.message||'').includes('not configured')) $('details.server-config').open=true;
    }
  }

  $('#saveServerBtn').onclick=()=>{
    const url=MP.setServerUrl($('#serverUrlInput').value);
    $('#serverUrlStatus').textContent=url?`Saved: ${url}`:'Server URL cleared.';
    $('#roomStatus').textContent='Server saved. Create or join a room.';
  };
  $('#createRoomBtn').onclick=()=>connectAnd(async()=>{
    const r=await MP.createRoom(safeName());
    $('#roomCode').value=r.code||'';
  });
  $('#joinRoomBtn').onclick=()=>connectAnd(()=>MP.joinRoom($('#roomCode').value.trim().toUpperCase(),safeName()));
  $('#copyRoomCodeBtn').onclick=async()=>{
    try{await navigator.clipboard.writeText(roomState?.code||''); $('#lobbyNotice').textContent='Room code copied. Send it to somebody with bad judgment.';}catch(_){$('#lobbyNotice').textContent=`Room code: ${roomState?.code||''}`;}
  };
  $('#leaveRoomBtn').onclick=async()=>{
    try{VOICE?.leave();await MP.leaveRoom();}catch(_){}
    roomState=null;lobbyCharacterId=null;
    $('#roomLobbyView').classList.add('hidden');$('#roomJoinView').classList.remove('hidden');show('#menuScreen');
  };
  $('#readyBtn').onclick=()=>{const me=roomState?.players.find(p=>p.id===MP.getMyId());MP.updatePlayer({ready:!me?.ready});};
  $('#hostStartBtn').onclick=async()=>{try{await MP.startGame();}catch(e){$('#lobbyNotice').textContent=e.message;}};
  $('#joinVoiceBtn').onclick=async()=>{
    try{ await VOICE.join(); renderRoom(roomState); }catch(e){ $('#lobbyNotice').textContent=`Voice: ${e.message}`; }
  };
  $('#muteVoiceBtn').onclick=()=>{VOICE.toggleMute();renderRoom(roomState);};
  $('#deafenVoiceBtn').onclick=()=>{VOICE.toggleDeafen();renderRoom(roomState);};
  $('#gameMuteMicBtn').onclick=()=>{VOICE.toggleMute();renderVoiceHud();};

  MP?.on('room:state',renderRoom);
  MP?.on('room:error',m=>{$('#roomStatus').textContent=m;$('#lobbyNotice').textContent=m;});
  MP?.on('room:notice',m=>{$('#lobbyNotice').textContent=m;});
  MP?.on('connection:error',m=>{$('#roomStatus').textContent=m;});
  VOICE?.on('levels',levels=>{voiceLevels=levels||{};if(roomState){renderRoom(roomState);renderVoiceHud();}});
  VOICE?.on('state',()=>{if(roomState)renderRoom(roomState);});
  MP?.on('game:start',startMultiplayerGame);
  MP?.on('game:input',payload=>{
    if(multiplayer.active&&multiplayer.isHost&&payload?.from){
      multiplayer.remoteInputs.set(payload.from,{sx:Number(payload.sx||0),sy:Number(payload.sy||0),sprint:!!payload.sprint});
    }
  });
  MP?.on('game:action',payload=>{
    if(!multiplayer.active||!multiplayer.isHost||!payload?.from)return;
    if(payload.type==='mapPeek'){
      const p=players.find(x=>x.networkId===payload.from);
      if(p)consumeMapPeek(p);
    }
  });
  MP?.on('game:snapshot',applyNetworkSnapshot);
  MP?.on('game:event',applyNetworkEvent);
  MP?.on('game:end',applyNetworkEnd);

  // Backing out of the lobby intentionally leaves the room/voice rather than
  // keeping a ghost player connected in the background.
  $('#roomScreen .backBtn').onclick=async()=>{
    try{VOICE?.leave(); if(roomState)await MP.leaveRoom();}catch(_){}
    roomState=null; $('#roomLobbyView').classList.add('hidden');$('#roomJoinView').classList.remove('hidden');show('#menuScreen');
  };

  // ============================================================
  // GAME STATE
  // ============================================================
  const ctx = canvas.getContext('2d');
  const mapCanvas = $('#mapCanvas'), mctx = mapCanvas.getContext('2d');
  const resultCanvas = $('#resultCanvas'), rctx = resultCanvas.getContext('2d');
  const TILE = CFG.camera.tileSize;
  const imageCache = new Map();
  let W = CFG.maze.width, H = CFG.maze.height;
  let maze = [], openCellCache = [], players = [];
  let toilet = {x:0,y:0}, exit = {x:0,y:0}, start = {x:0,y:0};
  let phase = 'idle', crisisAt = 0, last = 0, raf = 0, keys = {}, mapOpen = false, resultData = null;
  let introStart = 0, raceStartedAt = 0, crisisWarned = false, lastCrisisSecond = null;
  let toiletRevealStart = 0, toiletRevealActive = false, toiletRevealFrom = {x:0,y:0};

  function resize(){
    const dpr = Math.min(devicePixelRatio || 1, 2);
    [canvas,resultCanvas].forEach(c => {
      c.width = Math.floor(innerWidth*dpr);
      c.height = Math.floor(innerHeight*dpr);
    });
  }
  addEventListener('resize',resize);
  resize();

  function getImage(src){
    if (!src) return null;
    if (!imageCache.has(src)) {
      const img = new Image();
      img.src = src;
      imageCache.set(src,img);
    }
    const img = imageCache.get(src);
    return img.complete && img.naturalWidth ? img : null;
  }

  // ============================================================
  // MAZE GENERATION
  // ============================================================
  function makeMaze(w,h){
    const g = Array.from({length:h},()=>Array(w).fill(1));
    const dirs = [[2,0],[-2,0],[0,2],[0,-2]];
    const stack = [[1,1]];
    g[1][1] = 0;

    while(stack.length){
      const [x,y] = stack[stack.length-1];
      const opts = dirs
        .map(([dx,dy]) => [x+dx,y+dy,dx,dy])
        .filter(([nx,ny]) => nx>0 && ny>0 && nx<w-1 && ny<h-1 && g[ny][nx]);
      if(!opts.length){ stack.pop(); continue; }
      const [nx,ny,dx,dy] = opts[(random()*opts.length)|0];
      g[y+dy/2][x+dx/2] = 0;
      g[ny][nx] = 0;
      stack.push([nx,ny]);
    }

    // Start in the middle, not a dead corner. The broad food-court plaza plus
    // four spokes gives all racers several early route choices.
    let cx = Math.floor(w/2), cy = Math.floor(h/2);
    if (cx % 2 === 0) cx--;
    if (cy % 2 === 0) cy--;
    const r = Math.max(3,CFG.maze.startRoomRadius|0);
    for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++) {
      if(x>0&&y>0&&x<w-1&&y<h-1) g[y][x]=0;
    }
    const spoke = Math.max(4,CFG.maze.startSpokeLength|0);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      for(let n=r+1;n<=r+spoke;n++){
        const x=cx+dx*n,y=cy+dy*n;
        if(x>0&&y>0&&x<w-1&&y<h-1) g[y][x]=0;
      }
    }

    // Loops turn the generated perfect maze into a racing maze with multiple
    // legitimate routes, overtakes, and AI path variety.
    const attempts = Math.floor(w*h*CFG.maze.loopDensity);
    for(let i=0;i<attempts;i++){
      const x = 1+((random()*(w-2))|0), y = 1+((random()*(h-2))|0);
      if(g[y][x]!==1) continue;
      const horizontal = g[y][x-1]===0 && g[y][x+1]===0;
      const vertical = g[y-1][x]===0 && g[y+1][x]===0;
      if(horizontal || vertical) g[y][x]=0;
    }

    start = {x:cx,y:cy};
    return g;
  }

  function carveBoundaryExit(sx,sy){
    // Find the most distant reachable corridor on the inner rim, then punch
    // a real hole through the outer wall. The finish is therefore physically
    // part of the maze instead of a marker sitting on an interior floor tile.
    const q=[[sx,sy,0]], seen=new Set([sx+','+sy]);
    let best=null;

    for(let qi=0;qi<q.length;qi++){
      const [x,y,d]=q[qi];
      const onInnerRim=x===1||y===1||x===W-2||y===H-2;
      if(onInnerRim && (!best || d>best.d)) best={x,y,d};

      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy,k=nx+','+ny;
        if(maze[ny]?.[nx]===0 && !seen.has(k)){
          seen.add(k);q.push([nx,ny,d+1]);
        }
      }
    }

    if(!best) return {x:sx,y:sy};

    let opening={x:best.x,y:best.y};
    if(best.x===1) opening={x:0,y:best.y};
    else if(best.x===W-2) opening={x:W-1,y:best.y};
    else if(best.y===1) opening={x:best.x,y:0};
    else if(best.y===H-2) opening={x:best.x,y:H-1};

    maze[opening.y][opening.x]=0;
    return opening;
  }

  function openCells(){
    const a=[];
    for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++) if(maze[y][x]===0) a.push({x,y});
    return a;
  }

  function chooseToilet(){
    // The toilet is random every labyrinth, but it should feel like the game
    // cruelly changed the destination rather than putting the new goal beside
    // the old one. Prefer cells on the opposite side of the start from EXIT.
    const ex=exit.x-start.x, ey=exit.y-start.y;
    const exitLen=Math.hypot(ex,ey)||1;
    const exitQ={x:Math.sign(ex),y:Math.sign(ey)};

    const broad = openCellCache.filter(c => {
      const dx=c.x-start.x, dy=c.y-start.y;
      const ds=Math.hypot(dx,dy);
      const de=Math.hypot(c.x-exit.x,c.y-exit.y);
      if(ds < W*.30 || ds > W*.60 || de < W*.30) return false;

      const cos=((dx*ex)+(dy*ey))/((ds||1)*exitLen);
      const sameQuarter=(Math.sign(dx)===exitQ.x && Math.sign(dy)===exitQ.y);
      return cos < -0.20 && !sameQuarter;
    });

    // Fallback still forbids the EXIT quarter wherever possible.
    const fallback = openCellCache.filter(c => {
      const dx=c.x-start.x,dy=c.y-start.y;
      const ds=Math.hypot(dx,dy),de=Math.hypot(c.x-exit.x,c.y-exit.y);
      const sameQuarter=(Math.sign(dx)===exitQ.x && Math.sign(dy)===exitQ.y);
      return ds>W*.25 && de>W*.22 && !sameQuarter;
    });

    const source=broad.length?broad:(fallback.length?fallback:openCellCache);
    return source[(random()*source.length)|0];
  }

  // ============================================================
  // PLAYERS / CHARACTER DATA
  // ============================================================
  function makePlayer(id,charIndex,isLocal,slot=0,opts={}){
    const c = CHARS[charIndex];
    const isAI = opts.isAI ?? !isLocal;
    const isRemoteHuman = !!opts.isRemoteHuman;
    const personality = isAI ? CFG.ai.personalities[Math.max(0,(slot-1) % CFG.ai.personalities.length)] : null;
    const offsets = [[0,0],[1.45,0],[-1.45,0],[0,1.45]];
    const o = offsets[slot] || [0,0];
    const maxStamina = 100 * (c.stats.stamina || 1);
    return {
      id,networkId:opts.networkId||id,charIndex,char:c,charName:c.name,
      name:opts.displayName||c.name,icon:c.emoji,color:c.color,
      isHuman:isLocal,isLocal,isRemoteHuman,isAI,personality,
      x:start.x+.5+o[0], y:start.y+.5+o[1], dir:0,
      bowel:rand(CFG.race.startingBowelMin,CFG.race.startingBowelMax),
      pooped:false, won:false, mapChecks:CFG.race.mapChecks+(c.stats.mapChecks||0), mapBoost:0,
      stamina:maxStamina, maxStamina, sprinting:false, lastSprintAt:-99999,
      path:[], pathTick:0, wiggle:random()*10,
      aiSprintFor:0, aiSprintCooldown:rand(.2,1.2), seed:random()*100000,
      launchTarget:null, launchComplete:false, crisisReaction:0,
      netX:null,netY:null,netDir:null
    };
  }

  function pickLaunchTarget(p,index){
    const desired = p.personality?.launchAngle ?? (index*Math.PI*2/3);
    let best = null, bestScore = Infinity;
    for(const c of openCellCache){
      const dx=c.x-start.x,dy=c.y-start.y;
      const d=Math.hypot(dx,dy);
      if(d<11||d>22) continue;
      const a=Math.atan2(dy,dx);
      let diff=Math.abs(Math.atan2(Math.sin(a-desired),Math.cos(a-desired)));
      const score=diff*7+Math.abs(d-16)+random()*.8;
      if(score<bestScore){bestScore=score;best={x:c.x,y:c.y};}
    }
    return best;
  }

  function setupPlayers(){
    const indices = [selected ?? 0];
    const pool = CHARS.map((_,i)=>i).filter(i=>i!==indices[0]);
    while(indices.length<4) indices.push(pool.splice((random()*pool.length)|0,1)[0]);
    players = indices.map((ci,i)=>makePlayer(i===0?'you':`ai${i}`,ci,i===0,i,{isAI:i!==0}));
    players.filter(p=>p.isAI).forEach((p,i)=>p.launchTarget=pickLaunchTarget(p,i));
  }

  function setupMultiplayerPlayers(meta){
    const humans=meta.humans||[];
    const used=new Set(humans.map(h=>h.characterId));
    const specs=humans.map(h=>({type:'human',id:h.id,name:h.name,characterId:h.characterId}));
    const pool=CHARS.filter(c=>!used.has(c.id)).map(c=>c.id);
    while(specs.length<4 && pool.length){
      const characterId=pool.splice((random()*pool.length)|0,1)[0];
      specs.push({type:'ai',id:`ai:${specs.length}`,name:charById(characterId)?.name||'AI',characterId});
    }
    players=specs.map((spec,slot)=>{
      const ci=Math.max(0,CHARS.findIndex(c=>c.id===spec.characterId));
      const isLocal=spec.type==='human'&&spec.id===MP.getMyId();
      return makePlayer(spec.id,ci,isLocal,slot,{
        isAI:spec.type==='ai',isRemoteHuman:spec.type==='human'&&!isLocal,
        networkId:spec.id,displayName:spec.name
      });
    });
    players.filter(p=>p.isAI).forEach((p,i)=>p.launchTarget=pickLaunchTarget(p,i));
  }

  function localPlayer(){ return players.find(p=>p.isLocal) || players[0] || null; }

  // ============================================================
  // START / INTRO
  // ============================================================
  function freshSeed(){
    try{return crypto.getRandomValues(new Uint32Array(1))[0];}catch(_){return (Date.now()^(performance.now()*1000))>>>0;}
  }

  function prepareGame(seed,playerSetup){
    cancelAnimationFrame(raf);
    clearTimeout($('#eventBanner')._t);
    AUDIO.ensure();
    applyPlayerSettings();
    AUDIO.setMode('off');
    show('#gameScreen');
    setGameplaySeed(seed);

    W=CFG.maze.width; H=CFG.maze.height;
    maze=makeMaze(W,H);
    exit=carveBoundaryExit(start.x,start.y);
    openCellCache=openCells();
    toilet=chooseToilet();
    playerSetup();

    phase='intro'; mapOpen=false; resultData=null;
    introStart=performance.now(); last=introStart;
    raceStartedAt=0; crisisAt=Infinity;
    keys={};
    crisisWarned=false; lastCrisisSecond=null;
    toiletRevealStart=0; toiletRevealActive=false;
    $('#gameScreen').classList.remove('bowel-rumble');
    $('#gameScreen').classList.add('intro-mode');
    resetTouchStick(); touchState.sprint=false; touchSprintBtn?.classList.remove('active','danger');
    $('#toiletRadar').classList.add('hidden');
    $('#toiletRadar').classList.remove('reveal');
    $('#preCrisis').classList.add('hidden');
    $('#mapOverlay').classList.add('hidden');
    $('#eventBanner').classList.add('hidden');
    $('#eventBanner').classList.remove('crisis');
    $('#countdown').classList.add('hidden');
    $('#objectiveText').textContent='EXIT';
    $('#introCaption').classList.remove('hidden');
    $('#panicFx').classList.remove('active','alarm');
    $('#crisisRisk').classList.add('hidden');
    updateHud();
    renderVoiceHud();
    AUDIO.setMode('normal');
    raf=requestAnimationFrame(loop);
  }

  function startGame(){
    multiplayer={active:false,isHost:false,myId:null,meta:null,remoteInputs:new Map(),lastInputSend:0,lastSnapshotSend:0,ending:false};
    $('#voiceHud').classList.add('hidden');
    prepareGame(freshSeed(),setupPlayers);
  }

  function startMultiplayerGame(meta){
    const delay=Number.isFinite(meta.startDelayMs)?meta.startDelayMs:Math.max(0,(meta.startAt||Date.now())-Date.now());
    multiplayer={active:true,isHost:meta.hostId===MP.getMyId(),myId:MP.getMyId(),meta,remoteInputs:new Map(),lastInputSend:0,lastSnapshotSend:0,ending:false};
    $('#lobbyNotice').textContent='Race starting…';
    setTimeout(()=>prepareGame(meta.seed,()=>setupMultiplayerPlayers(meta)),delay);
  }

  function beginRace(now){
    phase='race';
    $('#gameScreen').classList.remove('intro-mode');
    if(isTouchDevice && (SETTINGS?.get('showControlHints') ?? true)){
      const hint=$('#touchHint');
      hint?.classList.remove('hidden');
      if(hint){ hint.style.animation='none'; void hint.offsetWidth; hint.style.animation=''; }
    }
    raceStartedAt=now;
    crisisAt=now+rand(CFG.race.crisisMinMs,CFG.race.crisisMaxMs);
    $('#introCaption').classList.add('hidden');
    $('#countdown').classList.add('hidden');
    $('#preCrisis').classList.add('hidden');
    AUDIO.setMode('normal');
    banner('GO! FIND THE EXIT.',1500);
  }

  $('#startSoloBtn').onclick=startGame;
  $('#mobileStartSoloBtn').onclick=startGame;
  $('#againBtn').onclick=()=>{
    if(multiplayer.active && roomState){
      multiplayer.ending=false;
      show('#roomScreen');
      renderRoom(roomState);
    } else startGame();
  };
  $('#menuBtn').onclick=async()=>{
    cancelAnimationFrame(raf);resetTouchStick();touchState.sprint=false;
    if(multiplayer.active){
      try{VOICE?.leave();await MP.leaveRoom();}catch(_){}
      multiplayer.active=false;roomState=null;
    }
    show('#menuScreen');
  };
  $('#resultMenuBtn').onclick=async()=>{
    if(multiplayer.active){try{VOICE?.leave();await MP.leaveRoom();}catch(_){} multiplayer.active=false;roomState=null;}
    show('#menuScreen');
  };
  $('#soundBtn').onclick=()=>{
    const muted=AUDIO.toggleMute();
    $('#soundBtn').textContent=muted?'SOUND: OFF':'SOUND: ON';
  };

  addEventListener('keydown',e=>{
    keys[e.key.toLowerCase()]=true;
    setInputMode('keyboard');
    if(e.key.toLowerCase()==='m' && !e.repeat) toggleMap();
  });
  addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
  $('#mapBtn').onclick=toggleMap;
  $('#mapOverlay').onclick=()=>{mapOpen=false;$('#mapOverlay').classList.add('hidden');resetTouchStick();};

  // ============================================================
  // MAP PEEK
  // ============================================================
  function consumeMapPeek(p){
    if(!p || p.mapChecks<=0) return false;
    p.mapChecks--;
    p.bowel=Math.min(100,p.bowel+CFG.race.mapBowelPenalty*(p.char.stats.mapPenalty||1));
    if(p.char.special==='mapRush') p.mapBoost=1500;
    return true;
  }

  function toggleMap(){
    if(phase!=='race' && phase!=='crisis') return;
    const p=localPlayer();
    if(!p)return;
    if(mapOpen){
      mapOpen=false;
      $('#mapOverlay').classList.add('hidden');
      return;
    }
    if(p.mapChecks<=0){
      banner('NO MAP CHECKS LEFT. TRUST YOUR GUT. TERRIBLE ADVICE.',1600);
      return;
    }
    if(multiplayer.active && !multiplayer.isHost){
      // Optimistic local feedback; the host applies the authoritative penalty.
      consumeMapPeek(p);
      MP.sendAction({type:'mapPeek'});
    } else {
      consumeMapPeek(p);
    }
    mapOpen=true;
    $('#mapOverlay').classList.remove('hidden');
    requestAnimationFrame(drawMap);
    updateHud();
  }

  function banner(text,ms=2200,crisis=false){
    const b=$('#eventBanner');
    b.textContent=text;
    b.classList.toggle('crisis',crisis);
    b.classList.remove('hidden');
    clearTimeout(b._t);
    b._t=setTimeout(()=>{b.classList.add('hidden');b.classList.remove('crisis');},ms);
  }

  // ============================================================
  // MOVEMENT / SPRINT
  // ============================================================
  function walkable(x,y,r=.23){
    const pts=[[x-r,y-r],[x+r,y-r],[x-r,y+r],[x+r,y+r]];
    return pts.every(([px,py])=>maze[Math.floor(py)]?.[Math.floor(px)]===0);
  }

  function speedFor(p){
    let base=CFG.movement.baseSpeed*(p.char.stats.speed||1)*(p.personality?.speed||1);
    // Once the alarm hits everybody instinctively hunches over and clutches their gut.
    // Sprint can temporarily fight this penalty, but adds bowel risk.
    if(phase==='crisis') base*=CFG.movement.crisisMovementMultiplier||0.76;
    const b=p.bowel;
    if(b>CFG.movement.slowdownStartsAt){
      const t=(b-CFG.movement.slowdownStartsAt)/(100-CFG.movement.slowdownStartsAt);
      let slow=lerp(1,CFG.movement.minSpeed/CFG.movement.baseSpeed,clamp(t,0,1));
      if((p.char.stats.highBowelSpeed||1)>1) slow*=p.char.stats.highBowelSpeed;
      base*=slow;
    }
    if(p.mapBoost>0) base*=1.28;
    if(p.sprinting) base*=CFG.movement.sprintMultiplier*(p.char.stats.sprint||1);
    return Math.max(CFG.movement.minSpeed*.75,base);
  }

  function setSprinting(p,wantsSprint,dt,now){
    const can=wantsSprint && p.stamina>0.5 && !p.pooped;
    p.sprinting=can;
    if(can){
      p.stamina=Math.max(0,p.stamina-CFG.movement.staminaDrainPerSecond*dt);
      p.lastSprintAt=now;
      if(phase==='crisis'){
        p.bowel=Math.min(100,p.bowel+CFG.movement.crisisSprintBowelRiskPerSecond*dt*(p.char.stats.bowelRate||1));
      }
    } else if(now-p.lastSprintAt>CFG.movement.staminaRegenDelayMs){
      p.stamina=Math.min(p.maxStamina,p.stamina+CFG.movement.staminaRegenPerSecond*dt);
    }
  }

  function readLocalInput(){
    if(mapOpen)return {sx:0,sy:0,sprint:false};
    let sx=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0);
    let sy=(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0);
    if(touchState.active && (Math.abs(touchState.dx)>.06||Math.abs(touchState.dy)>.06)){
      sx=touchState.dx;sy=touchState.dy;
    } else if(Math.abs(gamepadState.dx)>.06||Math.abs(gamepadState.dy)>.06){
      sx=gamepadState.dx;sy=gamepadState.dy;
    }
    return {sx,sy,sprint:!!keys['shift']||gamepadState.sprint||touchState.sprint};
  }

  function moveFromScreenInput(p,input,dt,now){
    if(p.pooped){p.sprinting=false;return;}
    const sx=Number(input?.sx||0),sy=Number(input?.sy||0);
    const moving=Math.hypot(sx,sy)>.06;
    let dx=0,dy=0;
    if(moving){
      dx=sx+2*sy;
      dy=-sx+2*sy;
      const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l;
    }
    setSprinting(p,moving&&!!input?.sprint,dt,now);
    const s=speedFor(p);
    const nx=p.x+dx*s*dt, ny=p.y+dy*s*dt;
    if(walkable(nx,p.y))p.x=nx;
    if(walkable(p.x,ny))p.y=ny;
    if(moving)p.dir=Math.atan2(dy,dx);
  }

  function updateHuman(p,dt,now){ moveFromScreenInput(p,readLocalInput(),dt,now); }
  function updateRemoteHuman(p,dt,now){
    const input=multiplayer.remoteInputs.get(p.networkId)||{sx:0,sy:0,sprint:false};
    moveFromScreenInput(p,input,dt,now);
  }

  function sendLocalNetworkInput(now){
    if(!multiplayer.active || multiplayer.isHost || (phase!=='race'&&phase!=='crisis'))return;
    const interval=1000/(window.LABYRUN_NETWORK_CONFIG?.inputHz||24);
    if(now-multiplayer.lastInputSend<interval)return;
    multiplayer.lastInputSend=now;
    MP.sendInput(readLocalInput());
  }

  // ============================================================
  // AI NAVIGATION
  // ============================================================
  function seededNoise(x,y,seed){
    const n=Math.sin(x*12.9898+y*78.233+seed*.013)*43758.5453;
    return n-Math.floor(n);
  }

  function pathTo(sx,sy,tx,ty,p=null){
    sx=Math.floor(sx);sy=Math.floor(sy);tx=Math.floor(tx);ty=Math.floor(ty);
    const key=(x,y)=>x+','+y, startKey=key(sx,sy), targetKey=key(tx,ty);
    const q=[[sx,sy]], prev=new Map([[startKey,null]]);
    const baseDirs=[[1,0],[-1,0],[0,1],[0,-1]];

    for(let qi=0;qi<q.length;qi++){
      const [x,y]=q[qi];
      if(x===tx&&y===ty) break;
      let dirs=baseDirs.slice();
      if(p){
        dirs.sort((a,b)=>{
          const ax=x+a[0], ay=y+a[1], bx=x+b[0], by=y+b[1];
          return seededNoise(ax,ay,p.seed)-seededNoise(bx,by,p.seed);
        });
      }
      for(const [dx,dy] of dirs){
        const nx=x+dx,ny=y+dy,k=key(nx,ny);
        if(maze[ny]?.[nx]===0 && !prev.has(k)){
          prev.set(k,[x,y]);
          q.push([nx,ny]);
        }
      }
    }

    if(!prev.has(targetKey)) return [];
    const out=[]; let cur=[tx,ty];
    while(cur){
      out.push({x:cur[0]+.5,y:cur[1]+.5});
      cur=prev.get(key(cur[0],cur[1]));
    }
    return out.reverse().slice(1);
  }

  function chooseDetour(p,target,directPath){
    const pers=p.personality;
    if(!pers || random()>pers.detourChance || directPath.length<10) return directPath;
    let best=null;
    // Keep detour search cheap enough for the much larger maze.
    for(let tries=0;tries<3;tries++){
      const c=openCellCache[(random()*openCellCache.length)|0];
      const fromP=Math.hypot(c.x-p.x,c.y-p.y);
      if(fromP<7 || fromP>24) continue;
      const p1=pathTo(p.x,p.y,c.x,c.y,p);
      if(!p1.length) continue;
      const p2=pathTo(c.x+.5,c.y+.5,target.x,target.y,p);
      const route=p1.concat(p2);
      if(route.length<=directPath.length*pers.detourBudget){best=route;break;}
    }
    return best||directPath;
  }

  function rebuildAiPath(p){
    let target = phase==='crisis' ? toilet : exit;

    if(phase==='race' && p.launchTarget && !p.launchComplete){
      if(Math.hypot(p.x-(p.launchTarget.x+.5),p.y-(p.launchTarget.y+.5))<1.2){
        p.launchComplete=true;
      } else {
        target=p.launchTarget;
      }
    }

    const direct=pathTo(p.x,p.y,target.x,target.y,p);
    p.path=(target===p.launchTarget)?direct:chooseDetour(p,target,direct);
    p.pathTick=rand(p.personality.repathMin,p.personality.repathMax);
  }

  function updateAiSprint(p,dt,now){
    p.aiSprintFor=Math.max(0,p.aiSprintFor-dt);
    p.aiSprintCooldown=Math.max(0,p.aiSprintCooldown-dt);
    if(p.aiSprintFor<=0 && p.aiSprintCooldown<=0){
      const chance=phase==='crisis'?p.personality.sprintCrisis:p.personality.sprintNormal;
      const safeEnough=phase!=='crisis'||p.bowel<p.personality.riskTolerance*100;
      if(safeEnough && p.stamina>28 && random()<chance){
        p.aiSprintFor=rand(.55,1.85);
        p.aiSprintCooldown=rand(.8,2.7);
      } else {
        p.aiSprintCooldown=rand(.35,1.0);
      }
    }
    setSprinting(p,p.aiSprintFor>0,dt,now);
  }

  function updateAI(p,dt,now){
    if(p.pooped){p.sprinting=false;return;}
    if(phase==='crisis' && p.crisisReaction>0){
      p.crisisReaction=Math.max(0,p.crisisReaction-dt);
      setSprinting(p,false,dt,now);
      return;
    }

    p.pathTick-=dt;
    if(p.pathTick<=0 || !p.path.length) rebuildAiPath(p);
    updateAiSprint(p,dt,now);
    if(!p.path.length) return;

    const t=p.path[0];
    let dx=t.x-p.x,dy=t.y-p.y,l=Math.hypot(dx,dy);
    if(l<.18){p.path.shift();return;}
    dx/=l;dy/=l;

    // Personality error produces visibly different cornering without making bots useless.
    const error=Math.sin(now/620+p.wiggle)*(p.personality.routeNoise*.11);
    const cs=Math.cos(error),sn=Math.sin(error);
    const ex=dx*cs-dy*sn,ey=dx*sn+dy*cs;
    const s=speedFor(p);
    const nx=p.x+ex*s*dt,ny=p.y+ey*s*dt;
    const movedX=walkable(nx,p.y), movedY=walkable(p.x,ny);
    if(movedX)p.x=nx;
    if(movedY)p.y=ny;
    if(!movedX&&!movedY){p.path=[];p.pathTick=0;}
    p.dir=Math.atan2(ey,ex);
  }

  // ============================================================
  // MULTIPLAYER GAME SYNC
  // ============================================================
  function playerSnapshot(p){
    return {
      id:p.id,x:p.x,y:p.y,dir:p.dir,bowel:p.bowel,pooped:p.pooped,won:p.won,
      mapChecks:p.mapChecks,mapBoost:p.mapBoost,stamina:p.stamina,maxStamina:p.maxStamina,
      sprinting:p.sprinting
    };
  }

  function broadcastSnapshot(now){
    if(!multiplayer.active||!multiplayer.isHost)return;
    const interval=1000/(window.LABYRUN_NETWORK_CONFIG?.snapshotHz||15);
    if(now-multiplayer.lastSnapshotSend<interval)return;
    multiplayer.lastSnapshotSend=now;
    MP.sendSnapshot({
      phase,
      crisisRemainingMs:Number.isFinite(crisisAt)?Math.max(0,crisisAt-now):null,
      toiletRevealActive:!!toiletRevealActive,
      players:players.map(playerSnapshot)
    });
  }

  function applyNetworkSnapshot(snapshot){
    if(!multiplayer.active||multiplayer.isHost||!snapshot)return;
    if(snapshot.phase==='crisis'&&phase!=='crisis') triggerCrisis(true);
    if(snapshot.phase==='race'&&phase==='intro') return;
    if(Number.isFinite(snapshot.crisisRemainingMs)) crisisAt=performance.now()+snapshot.crisisRemainingMs;
    (snapshot.players||[]).forEach(sp=>{
      const p=players.find(x=>x.id===sp.id); if(!p)return;
      p.netX=Number(sp.x); p.netY=Number(sp.y); p.netDir=Number(sp.dir||0);
      p.bowel=Number(sp.bowel||0); p.pooped=!!sp.pooped; p.won=!!sp.won;
      p.mapChecks=Number(sp.mapChecks??p.mapChecks); p.mapBoost=Number(sp.mapBoost||0);
      p.stamina=Number(sp.stamina??p.stamina); p.maxStamina=Number(sp.maxStamina??p.maxStamina);
      p.sprinting=!!sp.sprinting;
    });
  }

  function applyNetworkEvent(evt){
    if(!multiplayer.active||multiplayer.isHost||!evt)return;
    if(evt.type==='crisis') triggerCrisis(true);
  }

  function applyNetworkEnd(payload){
    if(!multiplayer.active||!payload)return;
    if(payload.reason==='host-left'){
      cancelAnimationFrame(raf);
      phase='idle'; multiplayer.active=false; multiplayer.ending=false;
      AUDIO.setMode('menu');
      show('#roomScreen');
      $('#lobbyNotice').textContent=payload.message||'Host disconnected. Back in the lobby.';
      if(roomState)renderRoom(roomState);
      return;
    }
    if(phase==='ended')return;
    const winner=payload.winnerId?players.find(p=>p.id===payload.winnerId)||null:null;
    endGame(winner,!!payload.toiletWin,true);
  }

  function updateNetworkGuest(dt,now){
    sendLocalNetworkInput(now);
    const lp=localPlayer();
    if(lp)moveFromScreenInput(lp,readLocalInput(),dt,now); // light client prediction; host snapshots correct it
    if(phase==='race'){
      const remaining=crisisAt-now;
      if(remaining<=10000&&!crisisWarned){
        crisisWarned=true;
        banner('⚠️ EVERYONE’S STOMACH JUST MADE A TERRIBLE NOISE…',3600,true);
      }
      if(remaining<=5000&&remaining>0){
        const sec=Math.max(1,Math.ceil(remaining/1000));
        $('#preCrisisNumber').textContent=sec;
        $('#preCrisis').classList.remove('hidden');
      }else $('#preCrisis').classList.add('hidden');
    }
    players.forEach(p=>{
      if(Number.isFinite(p.netX)){
        const snap=Math.min(1,dt*(p.isLocal?3.5:13));
        p.x=lerp(p.x,p.netX,snap); p.y=lerp(p.y,p.netY,snap);
        p.dir=lerp(p.dir,p.netDir??p.dir,snap);
      }
    });
    updateHud();
  }

  // ============================================================
  // CRISIS / WIN / FAILURE
  // ============================================================
  function triggerCrisis(fromNetwork=false){
    if(phase!=='race' && !fromNetwork)return;
    phase='crisis';
    $('#preCrisis').classList.add('hidden');
    $('#objectiveText').textContent='🚽 TOILET';
    $('#crisisRisk').classList.remove('hidden');
    $('#panicFx').classList.add('active','alarm');
    $('#gameScreen').classList.add('bowel-rumble');
    $('#toiletRadar').classList.remove('hidden');
    $('#toiletRadar').classList.add('reveal');
    touchSprintBtn?.classList.add('danger');
    if(touchSprintBtn){ touchSprintBtn.querySelector('span').textContent='RISK'; touchSprintBtn.querySelector('b').textContent='SPRINT + 💩'; }

    // Freeze the race for a quick cinematic sweep: player -> toilet -> player.
    // Afterward the radar remains visible so a map check is helpful, not mandatory.
    toiletRevealStart=performance.now();
    toiletRevealActive=true;
    { const lp=localPlayer(); toiletRevealFrom={x:lp?.x||start.x+.5,y:lp?.y||start.y+.5}; }

    if(!fromNetwork){
      players.forEach(p=>{
        p.bowel=Math.max(p.bowel,rand(CFG.race.crisisBowelMin,CFG.race.crisisBowelMax));
        p.path=[];
        p.pathTick=0;
        p.sprinting=false;
        if(p.isAI&&p.personality){
          p.crisisReaction=rand(p.personality.crisisReactionMin,p.personality.crisisReactionMax);
        }
      });
      if(multiplayer.active&&multiplayer.isHost) MP.sendGameEvent({type:'crisis'});
    }

    AUDIO.panicSting();
    AUDIO.setMode('panic');
    banner('🚨 BOWEL EVENT! EXIT CANCELLED. LOCATING THE ONE TOILET… 🚨',4200,true);
    updateToiletRadar();
  }

  function checkWins(){
    for(const p of players){
      if(!p.pooped && phase==='race' && Math.hypot(p.x-(exit.x+.5),p.y-(exit.y+.5))<.52){
        endGame(p,false);return;
      }
      if(!p.pooped && phase==='crisis' && Math.hypot(p.x-(toilet.x+.5),p.y-(toilet.y+.5))<.58){
        endGame(p,true);return;
      }
    }
    if(phase==='crisis' && players.every(p=>p.pooped)) endGame(null,true);
  }

  function endGame(winner,toiletWin,fromNetwork=false){
    if(phase==='ended')return;
    phase='ended';
    toiletRevealActive=false;
    $('#panicFx').classList.remove('alarm');
    $('#gameScreen').classList.remove('bowel-rumble');
    $('#toiletRadar').classList.add('hidden');
    resetTouchStick(); touchState.sprint=false;
    touchSprintBtn?.classList.remove('active','danger');
    if(touchSprintBtn){ touchSprintBtn.querySelector('span').textContent='HOLD'; touchSprintBtn.querySelector('b').textContent='SPRINT'; }
    if(winner) winner.won=true;

    if(toiletWin && winner){
      players.forEach(p=>{
        if(p!==winner) p.pooped=true;
      });

      AUDIO.flushSting();
    }
    // The moment gameplay ends, return to the main/menu theme. Result screens
    // and every other non-gameplay screen share this track.
    AUDIO.setMode('menu');
    resultData={winner,toiletWin};
    if(multiplayer.active&&multiplayer.isHost&&!fromNetwork&&!multiplayer.ending){
      multiplayer.ending=true;
      MP.sendGameEnd({winnerId:winner?.id||null,toiletWin:!!toiletWin});
    }

    setTimeout(()=>{
      show('#resultScreen');
      drawResult();
      if(!winner){
        $('#resultTitle').textContent='TOTAL SYSTEM FAILURE';
        $('#resultText').textContent='Nobody reached the toilet. The labyrinth is now a biohazard and should probably be condemned.';
      } else {
        $('#resultTitle').textContent=winner.isLocal?'YOU SURVIVED!':`${winner.name.toUpperCase()} WINS`;
        $('#resultText').textContent=toiletWin
          ? `${winner.name} claimed the sacred porcelain throne. Everyone else experienced an immediate catastrophic loss of dignity.`
          : `${winner.name} escaped before the bowel emergency escalated. An unusually clean outcome.`;
      }
    },500);
  }

  function update(dt,now){
    if(multiplayer.active&&!multiplayer.isHost){
      updateNetworkGuest(dt,now);
      return;
    }
    if(phase==='race'){
      const remaining=crisisAt-now;
      if(remaining<=10000 && !crisisWarned){
        crisisWarned=true;
        banner('⚠️ EVERYONE’S STOMACH JUST MADE A TERRIBLE NOISE…',3600,true);
      }
      if(remaining<=5000 && remaining>0){
        const sec=Math.max(1,Math.ceil(remaining/1000));
        $('#preCrisisNumber').textContent=sec;
        $('#preCrisis').classList.remove('hidden');
        if(sec!==lastCrisisSecond){
          lastCrisisSecond=sec;
        }
      } else {
        $('#preCrisis').classList.add('hidden');
      }
      if(now>=crisisAt) triggerCrisis();
    }

    players.forEach(p=>{
      if(p.mapBoost>0)p.mapBoost-=dt*1000;
      const baseRise=phase==='crisis'?CFG.race.baseBowelRiseCrisis:CFG.race.baseBowelRiseNormal;
      p.bowel=Math.min(100,p.bowel+baseRise*(p.char.stats.bowelRate||1)*dt);

      if(p.bowel>=100&&!p.pooped){
        p.pooped=true;
        p.sprinting=false;
        AUDIO.poopSting();
        if(p.isLocal) banner('💩 CATASTROPHIC FAILURE. MOVEMENT PRIVILEGES REVOKED.',3200,true);
      }

      if(p.isLocal)updateHuman(p,dt,now);
      else if(p.isRemoteHuman)updateRemoteHuman(p,dt,now);
      else updateAI(p,dt,now);
    });

    checkWins();
    updateHud();
    broadcastSnapshot(now);
  }

  // ============================================================
  // HUD / PANIC METER
  // ============================================================
  function panicWords(v){
    if(v<20)return ['🙂','Suspiciously calm','GREEN ZONE'];
    if(v<40)return ['😐','Something is brewing','RUMBLING'];
    if(v<60)return ['😬','Clench protocol','CHEEKS ENGAGED'];
    if(v<74)return ['😰','Do not trust a fart','DANGER'];
    if(v<86)return ['🥵','Code Brown','PANIC'];
    if(v<95)return ['🤯','Bathroom. NOW.','MAYDAY'];
    if(v<99)return ['🫨','ONE BAD STEP AWAY','CRITICAL'];
    return ['💀','ABANDON DIGNITY','IMPACT'];
  }

  function toiletBearingLabel(dx,dy){
    const v=[];
    if(dy<-.22)v.push('NORTH'); else if(dy>.22)v.push('SOUTH');
    if(dx<-.22)v.push('WEST'); else if(dx>.22)v.push('EAST');
    return v.join('-')||'HERE';
  }

  function updateToiletRadar(){
    const p=localPlayer();
    const radar=$('#toiletRadar');
    if(!p || phase!=='crisis'){
      radar.classList.add('hidden');
      return;
    }
    radar.classList.remove('hidden');
    radar.classList.toggle('reveal',toiletRevealActive);
    const dx=(toilet.x+.5)-p.x,dy=(toilet.y+.5)-p.y;
    const screenDx=dx-dy;
    const screenDy=(dx+dy)*.50;
    const angle=Math.atan2(screenDy,screenDx)*180/Math.PI;
    $('#toiletArrow').style.transform=`rotate(${angle}deg)`;
    $('#toiletBearing').textContent=toiletRevealActive?'TOILET LOCATED!':toiletBearingLabel(dx,dy);
    $('#toiletDistance').textContent=`${Math.max(0,Math.round(Math.hypot(dx,dy)))} TILES AWAY`;
  }

  function updateHud(){
    const p=localPlayer();if(!p)return;
    const bowel=clamp(p.bowel,0,100),stam=clamp(p.stamina/p.maxStamina*100,0,100);
    $('#bowelFill').style.width=bowel+'%';
    $('#poopMarker').style.left=bowel+'%';
    $('#bowelText').textContent=Math.floor(bowel)+'%';
    const [face,words,stage]=panicWords(bowel);
    $('#panicFace').textContent=face;
    $('#panicWords').textContent=words;
    $('#panicStage').textContent=stage;
    $('#staminaFill').style.width=stam+'%';
    $('#staminaText').textContent=Math.floor(stam)+'%';
    $('#mapChecks').textContent=p.mapChecks;
    if($('#touchMapCount')) $('#touchMapCount').textContent=p.mapChecks;

    const card=$('#panicCard');
    card.classList.toggle('warning',bowel>=68&&bowel<88);
    card.classList.toggle('critical',bowel>=88);
    card.classList.toggle('crisis-mode',phase==='crisis');
    $('#crisisRisk').classList.toggle('hot',phase==='crisis'&&p.sprinting);

    const panicIntensity=phase==='crisis'?clamp((bowel-35)/65,0,1):0;
    $('#panicFx').style.setProperty('--panic',panicIntensity.toFixed(3));
    AUDIO.setPanicLevel(panicIntensity);
    updateToiletRadar();
  }

  // ============================================================
  // RENDERING
  // ============================================================
  function project(wx,wy,camx,camy,scale=1){
    const tw=TILE*scale,th=TILE*.50*scale;
    return {
      x:(wx-wy)*tw*.5 + innerWidth/2 - (camx-camy)*tw*.5,
      y:(wx+wy)*th*.5 + innerHeight/2 - (isTouchDevice?28:0) - (camx+camy)*th*.5,
      tw,th
    };
  }

  function diamond(c,x,y,w,h){
    c.beginPath();c.moveTo(x,y-h/2);c.lineTo(x+w/2,y);c.lineTo(x,y+h/2);c.lineTo(x-w/2,y);c.closePath();c.fill();
  }

  function wallSides(c,x,y,w,h){
    c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x,y+h/2);c.lineTo(x,y+h/2+h*.42);c.lineTo(x-w/2,y+h*.42);c.closePath();c.fill();
    c.globalAlpha*=.8;
    c.beginPath();c.moveTo(x+w/2,y);c.lineTo(x,y+h/2);c.lineTo(x,y+h/2+h*.42);c.lineTo(x+w/2,y+h*.42);c.closePath();c.fill();
    c.globalAlpha/=.8;
  }

  function drawTopDownOverview(alpha=1){
    ctx.save();
    ctx.globalAlpha=alpha;
    const pad=isTouchDevice?18:38;
    const cell=Math.min((innerWidth-pad*2)/W,(innerHeight-pad*2)/H);
    const ox=(innerWidth-cell*W)/2,oy=(innerHeight-cell*H)/2;
    ctx.fillStyle='#09090a';ctx.fillRect(0,0,innerWidth,innerHeight);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      ctx.fillStyle=maze[y][x]?'#342a32':'#181419';
      ctx.fillRect(ox+x*cell,oy+y*cell,cell+.5,cell+.5);
    }
    const sx=ox+(start.x+.5)*cell,sy=oy+(start.y+.5)*cell;
    const ex=ox+(exit.x+.5)*cell,ey=oy+(exit.y+.5)*cell;
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sx,sy,Math.max(5,cell*1.1),0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d8ff5f';ctx.beginPath();ctx.arc(ex,ey,Math.max(4,cell*.85),0,Math.PI*2);ctx.fill();
    ctx.font=`${Math.max(15,cell*1.9)}px system-ui`;ctx.textAlign='center';
    ctx.fillText('🌮🍛',sx,sy-13);
    ctx.font=`900 ${Math.max(9,cell*1.05)}px system-ui`;ctx.fillStyle='#fff';ctx.fillText('START',sx,sy+20);
    ctx.fillStyle='#d8ff5f';ctx.fillText('EXIT',ex,ey-10);
    ctx.restore();
    $('#introCaption').textContent='MEMORIZE IT. THE LABYRINTH IS BIGGER THAN YOUR CONFIDENCE.';
  }

  function drawIso(now,camx,camy,scale,intro=false,alpha=1){
    const p=localPlayer();
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.fillStyle='#09090a';ctx.fillRect(0,0,innerWidth,innerHeight);
    const fogRadius=CFG.camera.fogRadius*((SETTINGS?.get('viewDistance') ?? 100)/100);
    const fogX=toiletRevealActive?camx:p.x;
    const fogY=toiletRevealActive?camy:p.y;

    const x0=intro?0:Math.max(0,Math.floor(camx-fogRadius-4));
    const x1=intro?W:Math.min(W,Math.ceil(camx+fogRadius+4));
    const y0=intro?0:Math.max(0,Math.floor(camy-fogRadius-4));
    const y1=intro?H:Math.min(H,Math.ceil(camy+fogRadius+4));

    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const pr=project(x+.5,y+.5,camx,camy,scale);
      if(pr.x<-120||pr.x>innerWidth+120||pr.y<-150||pr.y>innerHeight+170)continue;
      const fog=!intro&&Math.hypot(x+.5-fogX,y+.5-fogY)>fogRadius;
      if(fog)continue;
      if(maze[y][x]===0){
        ctx.fillStyle=((x+y)&1)?'#1b171a':'#201b1f';diamond(ctx,pr.x,pr.y,pr.tw,pr.th);
      } else {
        // During bowel mode the structure itself looks unstable. This is
        // cosmetic only: collision walls do not actually move.
        const rumbleFactor=(SETTINGS?.get('rumbleStrength') ?? 85)/100;
        const wallRumble=(phase==='crisis'&&!intro)?(CFG.camera.crisisWallRumblePixels||1.7)*rumbleFactor:0;
        const jx=wallRumble?Math.sin(now*.023+x*1.71+y*.37)*wallRumble:0;
        const jy=wallRumble?Math.cos(now*.019+x*.44+y*1.39)*wallRumble:0;
        ctx.fillStyle='#382d35';diamond(ctx,pr.x+jx,pr.y-pr.th*.34+jy,pr.tw,pr.th);
        ctx.fillStyle='#221b21';wallSides(ctx,pr.x+jx,pr.y+jy,pr.tw,pr.th*.95);
        if(wallRumble && ((x*17+y*31)%29===0)){
          ctx.fillStyle='#7c606e';
          ctx.fillRect(pr.x+jx+Math.sin(now*.01+x)*8,pr.y+jy+pr.th*.55,2.3,2.3);
        }
      }
    }

    // Food stand marker makes the starting plaza visually memorable.
    if(intro || Math.hypot(start.x+.5-p.x,start.y+.5-p.y)<=fogRadius){
      drawMarker(start.x+.5,start.y+.5,'BAD LUNCH','🌮🍛',camx,camy,scale,true);
    }

    const exitVisible=intro||Math.hypot(exit.x+.5-p.x,exit.y+.5-p.y)<=fogRadius;
    const toiletVisible=phase==='crisis' && (toiletRevealActive || Math.hypot(toilet.x+.5-p.x,toilet.y+.5-p.y)<=fogRadius);
    drawMarker(exit.x+.5,exit.y+.5,'EXIT','🏁',camx,camy,scale,exitVisible);
    if(toiletVisible){
      const tp=project(toilet.x+.5,toilet.y+.5,camx,camy,scale);
      const pulse=1+Math.sin(now*.009)*.18;
      ctx.save();
      ctx.strokeStyle='rgba(92,225,255,.86)';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(tp.x,tp.y-12*scale,32*scale*pulse,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=.35;ctx.lineWidth=7;
      ctx.beginPath();ctx.arc(tp.x,tp.y-12*scale,47*scale*pulse,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
    drawMarker(toilet.x+.5,toilet.y+.5,toiletRevealActive?'THE ONE TOILET':'TOILET','🚽',camx,camy,scale,toiletVisible);

    [...players].sort((a,b)=>(a.x+a.y)-(b.x+b.y)).forEach(pl=>drawPlayer(pl,camx,camy,scale,now));

    if(!intro){
      const g=ctx.createRadialGradient(innerWidth/2,innerHeight/2,110,innerWidth/2,innerHeight/2,600);
      g.addColorStop(0,'#0000');g.addColorStop(.64,'#0001');g.addColorStop(1,'#000f');
      ctx.fillStyle=g;ctx.fillRect(0,0,innerWidth,innerHeight);
    }
    ctx.restore();
  }

  function drawMarker(x,y,label,icon,camx,camy,scale,showIt){
    if(!showIt)return;
    const pr=project(x,y,camx,camy,scale);
    if(pr.x<-100||pr.x>innerWidth+100||pr.y<-100||pr.y>innerHeight+100)return;
    ctx.font=`${28*scale}px system-ui`;ctx.textAlign='center';ctx.fillText(icon,pr.x,pr.y-10*scale);
    ctx.fillStyle='#f9f5ea';ctx.font=`900 ${8+5*scale}px system-ui`;ctx.fillText(label,pr.x,pr.y-35*scale);
  }

  function drawPuppet(p,scale,now,panic,pooped=false){
    const rig=p.char.puppet||{};
    const skin=rig.skin||'#efc39e';
    const shirt=rig.shirt||p.color||'#ffcb58';
    const pants=rig.pants||'#29242b';
    const hair=rig.hair||'#34251f';

    // Intentionally dumb little canvas puppet. This is the zero-asset fallback;
    // setting character.sprite later automatically bypasses it.
    const moving=phase==='race'||phase==='crisis';
    const gaitSpeed=p.sprinting?0.035:0.020;
    const gait=moving&&!pooped?Math.sin(now*gaitSpeed+p.wiggle):0;
    const armSwing=gait*(p.sprinting?8:5)*scale;
    const legSwing=gait*(p.sprinting?7:4)*scale;
    const clench=panic*3.2*scale;
    const lean=(p.sprinting?0.12:0.035)*Math.cos(p.dir-Math.PI/4);

    ctx.save();
    ctx.rotate(lean);
    ctx.lineCap='round';
    ctx.lineJoin='round';

    // Ground shadow.
    ctx.fillStyle='rgba(0,0,0,.32)';
    ctx.beginPath();
    ctx.ellipse(0,19*scale,15*scale,5*scale,0,0,Math.PI*2);
    ctx.fill();

    const hipY=7*scale+(pooped?7*scale:0);
    const shoulderY=-8*scale+(pooped?4*scale:0);

    // Legs: panic makes the knees pull inward into a stupid clenched waddle.
    ctx.strokeStyle=pants;
    ctx.lineWidth=5.5*scale;
    ctx.beginPath();
    ctx.moveTo(-5*scale,hipY);
    ctx.lineTo((-7*scale)-legSwing*.42+clench,18*scale);
    ctx.lineTo((-10*scale)-legSwing,26*scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5*scale,hipY);
    ctx.lineTo((7*scale)+legSwing*.42-clench,18*scale);
    ctx.lineTo((10*scale)+legSwing,26*scale);
    ctx.stroke();

    // Tiny clown shoes.
    ctx.strokeStyle='#151216';
    ctx.lineWidth=4*scale;
    ctx.beginPath();ctx.moveTo((-10*scale)-legSwing,26*scale);ctx.lineTo((-14*scale)-legSwing,27*scale);ctx.stroke();
    ctx.beginPath();ctx.moveTo((10*scale)+legSwing,26*scale);ctx.lineTo((14*scale)+legSwing,27*scale);ctx.stroke();

    // Normal race: stupid arm swing. Bowel mode: both hands clamp onto the gut.
    ctx.strokeStyle=skin;
    ctx.lineWidth=5*scale;
    if(phase==='crisis' && !pooped){
      ctx.beginPath();
      ctx.moveTo(-9*scale,shoulderY);
      ctx.lineTo(-12*scale,1*scale);
      ctx.lineTo(-4*scale,8*scale);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(9*scale,shoulderY);
      ctx.lineTo(12*scale,1*scale);
      ctx.lineTo(4*scale,8*scale);
      ctx.stroke();
      ctx.fillStyle=skin;
      ctx.beginPath();ctx.arc(-3.5*scale,8*scale,2.8*scale,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(3.5*scale,8*scale,2.8*scale,0,Math.PI*2);ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-9*scale,shoulderY);
      ctx.lineTo(-14*scale-armSwing*.35,2*scale);
      ctx.lineTo(-12*scale-armSwing,12*scale);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(9*scale,shoulderY);
      ctx.lineTo(14*scale+armSwing*.35,2*scale);
      ctx.lineTo(12*scale+armSwing,12*scale);
      ctx.stroke();
    }

    // Torso / shirt.
    ctx.fillStyle=shirt;
    ctx.beginPath();
    ctx.roundRect(-10*scale,shoulderY-3*scale,20*scale,22*scale,6*scale);
    ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.35)';
    ctx.lineWidth=1.5*scale;
    ctx.stroke();

    // Character identity lives as a tiny shirt badge instead of being the body.
    ctx.font=`${10*scale}px system-ui`;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(p.icon,0,(shoulderY+7*scale));

    // Head.
    const headY=shoulderY-12*scale+(pooped?2*scale:0);
    ctx.fillStyle=skin;
    ctx.beginPath();ctx.arc(0,headY,9*scale,0,Math.PI*2);ctx.fill();

    // Simple hair cap.
    ctx.fillStyle=hair;
    ctx.beginPath();
    ctx.arc(0,headY-2*scale,9*scale,Math.PI,Math.PI*2);
    ctx.fill();

    // Dumb face. Eyes get wider as disaster approaches.
    const eyeR=(1.2+panic*.8)*scale;
    ctx.fillStyle='#171318';
    ctx.beginPath();ctx.arc(-3*scale,headY,eyeR,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(3*scale,headY,eyeR,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#5a2930';
    ctx.lineWidth=1.5*scale;
    ctx.beginPath();
    if(pooped){
      ctx.arc(0,headY+5*scale,3*scale,0,Math.PI*2);
    }else if(panic>.55){
      ctx.arc(0,headY+7*scale,4*scale,Math.PI*1.08,Math.PI*1.92);
    }else{
      ctx.arc(0,headY+3*scale,3.5*scale,.15*Math.PI,.85*Math.PI);
    }
    ctx.stroke();

    if(pooped){
      ctx.font=`${17*scale}px system-ui`;
      ctx.fillText('💩',0,29*scale);
    }
    ctx.restore();
  }

  function drawPlayer(p,camx,camy,scale,now){
    const pr=project(p.x,p.y,camx,camy,scale);
    if(pr.x<-100||pr.x>innerWidth+100||pr.y<-100||pr.y>innerHeight+100)return;
    const panic=clamp((p.bowel-55)/45,0,1);
    const wob=Math.sin(now/75+p.wiggle)*panic*11;
    const bob=p.sprinting?Math.sin(now/52+p.wiggle)*4.5:Math.sin(now/130+p.wiggle)*1.6;
    const squat=p.pooped?17:panic*7;

    ctx.save();
    ctx.translate(pr.x,pr.y-16*scale+squat+bob);
    ctx.rotate(wob*Math.PI/180);

    const sprite=getImage(p.char.sprite);
    if(sprite && !p.pooped){
      const size=48*scale;
      ctx.drawImage(sprite,-size/2,-size*.82,size,size);
    } else {
      drawPuppet(p,scale,now,panic,p.pooped);
    }

    if(p.sprinting&&!p.pooped){ctx.font=`${11*scale}px system-ui`;ctx.fillText('💨',-17*scale,4*scale);}
    if(p.bowel>72&&!p.pooped){ctx.font=`${12*scale}px system-ui`;ctx.fillText('😰',14*scale,-23*scale);}
    if(p.bowel>90&&!p.pooped){ctx.font=`${10*scale}px system-ui`;ctx.fillText('💦',-13*scale,-25*scale);}
    ctx.restore();

    ctx.fillStyle='#fff';ctx.font=`800 ${10*scale}px system-ui`;ctx.textAlign='center';
    ctx.fillText(p.isLocal?'YOU':p.name,pr.x,pr.y+19*scale);
  }

  function draw(now){
    const dpr=Math.min(devicePixelRatio||1,2);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,innerWidth,innerHeight);

    if(phase==='intro'){
      const elapsed=now-introStart;
      const hold=CFG.camera.introHoldMs,zoom=CFG.camera.introZoomMs;
      if(elapsed<hold){
        drawTopDownOverview(1);
        return;
      }

      const t=ease((elapsed-hold)/zoom);
      const fitScale=Math.min(innerWidth/(W*TILE*.72),innerHeight/(H*TILE*.37),.48);
      const scale=lerp(fitScale,CFG.camera.playScale,t);

      if(t<.22){
        drawTopDownOverview(1);
        drawIso(now,start.x+.5,start.y+.5,fitScale,true,t/.22);
      } else {
        drawIso(now,start.x+.5,start.y+.5,scale,true,1);
      }

      $('#introCaption').textContent=t<.35?'LOCK IN THE ROUTE...':t<.70?'DIVING TO THE FOOD-COURT DISASTER...':'GET READY.';
      if(t>.56){
        $('#countdown').classList.remove('hidden');
        $('#countdown').textContent=t<.70?'3':t<.82?'2':t<.94?'1':'GO!';
      }
      if(elapsed>=hold+zoom) beginRace(now);
      return;
    }

    const p=localPlayer();

    // Bowel-event toilet reveal: sweep from the player to the randomly placed
    // toilet, hold long enough to register its area, then sweep back.
    let camx=p.x,camy=p.y;
    if(phase==='crisis' && toiletRevealActive){
      const fly=CFG.camera.toiletRevealFlyMs||1050;
      const hold=CFG.camera.toiletRevealHoldMs||1150;
      const back=CFG.camera.toiletRevealReturnMs||1050;
      const elapsed=now-toiletRevealStart;
      const total=fly+hold+back;
      if(elapsed<fly){
        const t=ease(elapsed/fly);
        camx=lerp(toiletRevealFrom.x,toilet.x+.5,t);
        camy=lerp(toiletRevealFrom.y,toilet.y+.5,t);
      }else if(elapsed<fly+hold){
        camx=toilet.x+.5;camy=toilet.y+.5;
      }else if(elapsed<total){
        const t=ease((elapsed-fly-hold)/back);
        camx=lerp(toilet.x+.5,p.x,t);
        camy=lerp(toilet.y+.5,p.y,t);
      }else{
        toiletRevealActive=false;
        $('#toiletRadar').classList.remove('reveal');
        banner('🚽 TOILET LOCATED. FOLLOW THE RADAR. RUN IF YOU DARE.',2800,true);
        updateToiletRadar();
      }
    }

    const panic=phase==='crisis'?clamp((p.bowel-55)/45,0,1):0;
    const rumbleFactor=(SETTINGS?.get('rumbleStrength') ?? 85)/100;
    const baseRumble=phase==='crisis'?(CFG.camera.crisisWorldRumblePixels||3.8)*rumbleFactor:0;
    const shake=baseRumble+panic*3.0*rumbleFactor;
    ctx.save();
    if(phase==='crisis'){
      ctx.translate(
        Math.sin(now*.052)*shake + Math.sin(now*.117)*shake*.38,
        Math.cos(now*.061)*shake*.72 + Math.sin(now*.143)*shake*.26
      );
    }
    drawIso(now,camx,camy,CFG.camera.playScale,false,1);
    ctx.restore();
  }

  function drawMap(){
    const rect=mapCanvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    const cssWidth=rect.width||Math.min(innerWidth*.84,900);
    const cssHeight=rect.height||Math.min(innerHeight*.76,700);
    mapCanvas.width=Math.max(1,Math.floor(cssWidth*dpr));
    mapCanvas.height=Math.max(1,Math.floor(cssHeight*dpr));
    mctx.setTransform(dpr,0,0,dpr,0,0);
    mctx.clearRect(0,0,cssWidth,cssHeight);
    const cell=Math.min((cssWidth-30)/W,(cssHeight-30)/H),ox=(cssWidth-cell*W)/2,oy=(cssHeight-cell*H)/2;

    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      mctx.fillStyle=maze[y][x]?'#322831':'#171318';
      mctx.fillRect(ox+x*cell,oy+y*cell,cell+.5,cell+.5);
    }

    const cellDot=(x,y,color,r=4)=>{
      mctx.fillStyle=color;mctx.beginPath();mctx.arc(ox+(x+.5)*cell,oy+(y+.5)*cell,r,0,Math.PI*2);mctx.fill();
    };
    const worldDot=(x,y,color,r=4)=>{
      mctx.fillStyle=color;mctx.beginPath();mctx.arc(ox+x*cell,oy+y*cell,r,0,Math.PI*2);mctx.fill();
    };

    cellDot(start.x,start.y,'#ffffff',4);
    cellDot(exit.x,exit.y,'#d8ff5f',5);
    if(phase==='crisis')cellDot(toilet.x,toilet.y,'#70d7ff',7);
    players.forEach(p=>worldDot(p.x,p.y,p.isLocal?'#fff':p.color,p.isLocal?5:3));
  }

  function drawResult(){
    const dpr=Math.min(devicePixelRatio||1,2);
    rctx.setTransform(dpr,0,0,dpr,0,0);
    rctx.clearRect(0,0,innerWidth,innerHeight);
    rctx.fillStyle='#100d10';rctx.fillRect(0,0,innerWidth,innerHeight);
    if(!resultData)return;

    const {toiletWin}=resultData;
    const sx=Math.min(innerWidth/(W+4),innerHeight/(H+10)),ox=(innerWidth-W*sx)/2,oy=20;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      rctx.fillStyle=maze[y][x]?'#2a2228':'#151216';
      rctx.fillRect(ox+x*sx,oy+y*sx,sx+.5,sx+.5);
    }
    players.forEach(p=>{
      rctx.font=`${Math.max(12,sx*1.8)}px system-ui`;rctx.textAlign='center';
      rctx.fillText(p.won?p.icon:(toiletWin?'💩':p.icon),ox+p.x*sx,oy+p.y*sx);
    });
    if(toiletWin){
      rctx.font=`${Math.max(16,sx*2.2)}px system-ui`;
      rctx.fillText('🚽',ox+(toilet.x+.5)*sx,oy+(toilet.y+.5)*sx);
    }
  }

  function loop(now){
    if(phase==='ended')return;
    const dt=Math.min(.035,(now-last)/1000||0);
    last=now;
    pollGamepad();
    if((phase==='race'||phase==='crisis') && !toiletRevealActive && (!mapOpen||multiplayer.active))update(dt,now);
    draw(now);
    raf=requestAnimationFrame(loop);
  }
})();

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
  function hashString(value){
    let h=2166136261>>>0;
    for(const ch of String(value||'')){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); }
    return h>>>0;
  }
  function stableShuffle(values,seed){
    const out=values.slice(),rng=mulberry32(Number(seed)>>>0);
    for(let i=out.length-1;i>0;i--){const j=(rng()*(i+1))|0;[out[i],out[j]]=[out[j],out[i]];}
    return out;
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
      <div class="profile-loadout">
        <div class="profile-food">${c.favouriteFood?.asset?`<img src="${c.favouriteFood.asset}" alt="">`:''}<span>1UP FAVOURITE</span><b>${c.favouriteFood?.name||'Mystery food'}</b></div>
        <div class="profile-special"><span>SPECIAL</span><b>${c.special?.name||'COMING SOON'}</b><small>${c.special?.description||'Passive trait only for now.'}</small></div>
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
      $('#mobileSelectedTrait').textContent = `${c.trait} • 1UP: ${c.favouriteFood?.name||'Food'} • ${c.special?.name||'PASSIVE'} • RUN ${characterRating(c,'run')}  SPRINT ${characterRating(c,'sprint')}  GUT ${characterRating(c,'gut')}  STAM ${characterRating(c,'stamina')}`;
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
  let gamepadSpecialWasDown = false;
  let gamepadSpectatorLeftWasDown = false, gamepadSpectatorRightWasDown = false;
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
    if(mode==='touch') return '<b>MOVE</b> DRAG LEFT SIDE <span>•</span> <b>SPRINT</b> HOLD BUTTON <span>•</span> <b>MAP</b> TAP MAP <span>•</span> <b>SPECIAL</b> TAP';
    return mode==='gamepad'
      ? '<b>MOVE</b> LEFT STICK / D-PAD <span>•</span> <b>SPRINT</b> RT / R2 OR A / CROSS <span>•</span> <b>MAP</b> Y / TRIANGLE <span>•</span> <b>SPECIAL</b> X / SQUARE'
      : '<b>MOVE</b> WASD / ARROWS <span>•</span> <b>SPRINT</b> HOLD SHIFT <span>•</span> <b>MAP</b> M <span>•</span> <b>SPECIAL</b> E';
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
      gamepadSpecialWasDown=false;
      gamepadSpectatorLeftWasDown=false;
      gamepadSpectatorRightWasDown=false;
      return;
    }
    const dead=.18;
    let dx=Math.abs(gp.axes?.[0]||0)>dead?(gp.axes[0]||0):0;
    let dy=Math.abs(gp.axes?.[1]||0)>dead?(gp.axes[1]||0):0;
    const pressed=i=>!!gp.buttons?.[i]?.pressed;
    const spectatorLeft=pressed(14),spectatorRight=pressed(15);
    if(spectatorActive){
      dx=0;dy=0;
      if(spectatorLeft&&!gamepadSpectatorLeftWasDown)cycleSpectator(-1);
      if(spectatorRight&&!gamepadSpectatorRightWasDown)cycleSpectator(1);
    }else{
      if(spectatorLeft)dx=-1;
      if(spectatorRight)dx=1;
      if(pressed(12))dy=-1;
      if(pressed(13))dy=1;
    }
    gamepadSpectatorLeftWasDown=spectatorLeft;
    gamepadSpectatorRightWasDown=spectatorRight;
    const sprint=pressed(0)||((gp.buttons?.[7]?.value||0)>.25);
    const mapDown=pressed(3);
    const specialDown=pressed(2);
    const active=Math.abs(dx)>.01||Math.abs(dy)>.01||sprint||mapDown||specialDown;
    if(active)setInputMode('gamepad');
    if(mapDown&&!gamepadMapWasDown)toggleMap();
    if(specialDown&&!gamepadSpecialWasDown)requestUseSpecial();
    gamepadMapWasDown=mapDown;
    gamepadSpecialWasDown=specialDown;
    gamepadState={dx,dy,sprint};
  }

  // Floating touch joystick: the left side of the playfield is intentionally
  // empty until the player touches it. The origin is wherever their thumb lands.
  const touchJoystick=$('#touchJoystick');
  const touchKnob=$('#touchJoystickKnob');
  const touchSprintBtn=$('#touchSprintBtn');
  const touchMapBtn=$('#touchMapBtn');
  const touchSpecialBtn=$('#touchSpecialBtn');
  const TOUCH_RADIUS=56;
  const TOUCH_DEAD_ZONE=CFG.movement.touchDeadZone ?? 0.18;
  const TOUCH_AXIS_SNAP=CFG.movement.touchAxisSnap ?? 0.12;

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

    // Radial dead-zone: a resting thumb can wobble a few pixels without the
    // character creeping away. Re-map the remaining range back to 0..1 so the
    // joystick still reaches full speed naturally.
    const normalized=Math.min(1,Math.hypot(x,y)/TOUCH_RADIUS);
    if(normalized<=TOUCH_DEAD_ZONE){
      touchState.dx=0;touchState.dy=0;
      if(touchKnob) touchKnob.style.transform='translate(0px,0px)';
      return;
    }
    const live=(normalized-TOUCH_DEAD_ZONE)/(1-TOUCH_DEAD_ZONE);
    const angle=Math.atan2(y,x);
    let dx=Math.cos(angle)*live,dy=Math.sin(angle)*live;

    // Near-cardinal swipes should stay cardinal rather than developing a tiny
    // diagonal component as the thumb drifts on glass.
    if(Math.abs(dx)<TOUCH_AXIS_SNAP) dx=0;
    if(Math.abs(dy)<TOUCH_AXIS_SNAP) dy=0;
    const dl=Math.hypot(dx,dy);
    if(dl>1){dx/=dl;dy/=dl;}
    touchState.dx=dx;touchState.dy=dy;
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
  touchSpecialBtn?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setInputMode('touch');requestUseSpecial();});
  const hardResetTouch=()=>{resetTouchStick();touchState.sprint=false;touchSprintBtn?.classList.remove('active');};
  addEventListener('blur',hardResetTouch);
  addEventListener('pointerup',e=>{if(touchState.active&&e.pointerId===touchState.pointerId)hardResetTouch();},{passive:true});
  addEventListener('pointercancel',e=>{if(touchState.active&&e.pointerId===touchState.pointerId)hardResetTouch();},{passive:true});
  addEventListener('pagehide',hardResetTouch);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hardResetTouch();});

  syncSettingsUi();

  // ============================================================
  // MULTIPLAYER LOBBY / ROOM / VOICE
  // ============================================================
  let roomState = null;
  let lobbyCharacterId = null;
  let voiceLevels = {};
  let multiplayer = {active:false,isHost:false,myId:null,meta:null,raceId:null,worldReady:false,remoteInputs:new Map(),lastInputSend:0,lastSnapshotSend:0,ending:false};

  const savedPlayerName=localStorage.getItem('labyrun.playerName')||'';
  $('#playerName').value=savedPlayerName;

  function safeName(){
    const v=($('#playerName').value||'').trim().slice(0,18)||'Player';
    localStorage.setItem('labyrun.playerName',v);
    return v;
  }

  function setRoomStatus(message){
    const el=$('#roomStatus');
    if(el) el.textContent=message;
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
    // Room state is a second source of truth for postgame/rematch info. If the
    // dedicated game:postgame packet arrives late or is missed during a wakeup,
    // the result screen still recovers instead of sitting on REMATCH LOADING.
    if(next.postgame){
      rematchInfo=next.postgame;
      if(phase==='ended') applyPostgame(next.postgame);
    }
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
        <div class="roster-copy"><b>${p.isHost?'👑 ':''}${p.name}${p.id===MP.getMyId()?' (YOU)':''}</b><small>${c?c.name:'Choosing racer…'}${Number(p.score||0)>0?` • ${p.score} PTS`:''}</small></div>
        <div class="roster-state ${p.ready?'ready':'waiting'}"><span class="voice-dot ${p.voiceEnabled?'on':''} ${speaking?'speaking':''}"></span>${p.ready?'READY':'WAITING'}</div>
      </div>`;
    }).join('');
    const allReady=next.players.length>0 && next.players.every(p=>p.ready&&p.characterId);
    const isHost=next.hostId===MP.getMyId();
    $('#readyBtn').disabled=!me?.characterId;
    $('#readyBtn').textContent=me?.ready?'NOT READY':'READY UP';
    $('#hostStartBtn').classList.toggle('hidden',!isHost);
    $('#hostStartBtn').disabled=!isHost||!allReady||next.gameActive;
    const lobbyLevel=levelFor(next.levelIndex||0);
    $('#lobbyNotice').textContent=next.gameActive
      ? `Food Court ${(next.levelIndex||0)+1} is starting…`
      : allReady
        ? (isHost?`Everyone is ready. START ${lobbyLevel.name}.`:`Everyone is ready. Waiting for the host to start ${lobbyLevel.name}.`)
        : `NEXT: FOOD COURT ${(next.levelIndex||0)+1} — ${lobbyLevel.name}. Pick racers and ready up. Empty slots become AI.`;
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
    setRoomStatus('Connecting to the multiplayer server…');
    try{
      await MP.connect();
      await action();
      setRoomStatus('Connected.');
    }catch(e){
      setRoomStatus(e.message||String(e));
      console.error('Multiplayer connection failed:', e);
    }
  }

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
  MP?.on('room:error',m=>{setRoomStatus(m);$('#lobbyNotice').textContent=m;});
  MP?.on('room:notice',m=>{$('#lobbyNotice').textContent=m;});
  MP?.on('connection:error',m=>setRoomStatus(m));
  VOICE?.on('levels',levels=>{
    voiceLevels=levels||{};
    const myId=MP?.getMyId?.();
    const voiceState=VOICE?.getState?.()||{};
    let remotePeak=0;
    if(!voiceState.deafened){
      for(const [id,level] of Object.entries(voiceLevels)){
        if(id===myId||id==='local')continue;
        remotePeak=Math.max(remotePeak,Number(level)||0);
      }
    }
    AUDIO?.setVoiceActivity?.(remotePeak);
    if(roomState){renderRoom(roomState);renderVoiceHud();}
  });
  VOICE?.on('state',()=>{
    const state=VOICE?.getState?.()||{};
    if(!state.joined||state.deafened)AUDIO?.setVoiceActivity?.(0,true);
    if(roomState)renderRoom(roomState);
  });
  MP?.on('game:start',startMultiplayerGame);
  MP?.on('game:world',applyNetworkWorld);
  MP?.on('game:input',payload=>{
    if(multiplayer.active&&multiplayer.isHost&&payload?.from&&payload.raceId===multiplayer.raceId){
      multiplayer.remoteInputs.set(payload.from,{sx:Number(payload.sx||0),sy:Number(payload.sy||0),sprint:!!payload.sprint});
    }
  });
  MP?.on('game:action',payload=>{
    if(!multiplayer.active||!multiplayer.isHost||!payload?.from||payload.raceId!==multiplayer.raceId)return;
    if(payload.type==='mapPeek'){
      const p=players.find(x=>x.networkId===payload.from);
      if(p)consumeMapPeek(p);
    }
    if(payload.type==='special'){
      const p=players.find(x=>x.networkId===payload.from);
      if(p)useSpecial(p,performance.now());
    }
  });
  MP?.on('game:snapshot',applyNetworkSnapshot);
  MP?.on('game:event',applyNetworkEvent);
  MP?.on('game:end',applyNetworkEnd);
  MP?.on('game:postgame',applyPostgame);

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
  let toilets = [], toilet = {x:0,y:0}, exit = {x:0,y:0}, start = {x:0,y:0};
  let reliefItems = [], foodItems = [], traps = [];
  let roundWinners = [], trapSeq = 0;
  const soloScoreTotals = new Map();
  let activeLevelIndex = 0;
  let activeLevel = (CFG.levels && CFG.levels[0]) || {name:'FOOD COURT',width:W,height:H};
  let soloLevelIndex = 0;
  let soloRosterCharacterIds = null;
  let soloRosterSeed = 0;
  let rematchInfo = null;
  let rematchTicker = null;
  let phase = 'idle', crisisAt = 0, last = 0, raf = 0, keys = {}, mapOpen = false, resultData = null;
  let introStart = 0, raceStartedAt = 0, crisisWarned = false, lastCrisisSecond = null;
  let toiletRevealStart = 0, toiletRevealActive = false, toiletRevealFrom = {x:0,y:0}, toiletRevealTargets = [];
  let spectatorActive = false, spectatorIndex = 0;

  function resize(){
    const dpr = Math.min(devicePixelRatio || 1, 2);
    [canvas,resultCanvas].forEach(c => {
      c.width = Math.floor(innerWidth*dpr);
      c.height = Math.floor(innerHeight*dpr);
    });
  }
  addEventListener('resize',resize);
  resize();

  function levelCount(){ return Math.max(1,(CFG.levels||[]).length||1); }
  function levelFor(index){
    const list=CFG.levels||[];
    if(!list.length) return {id:'default',name:'FOOD COURT',subtitle:'',width:CFG.maze.width,height:CFG.maze.height,relief:null};
    return list[clamp(Number(index)||0,0,list.length-1)|0];
  }
  function setActiveLevel(index){
    activeLevelIndex=clamp(Number(index)||0,0,levelCount()-1)|0;
    activeLevel=levelFor(activeLevelIndex);
    W=activeLevel.width||CFG.maze.width;
    H=activeLevel.height||CFG.maze.height;
  }

  function raceSeed(seed){ return (Number(seed)^0x9E3779B9)>>>0; }

  function worldHash(rows,startPos,exitPos,toiletList){
    let h=2166136261>>>0;
    const feed=v=>{
      const str=String(v);
      for(let i=0;i<str.length;i++){
        h^=str.charCodeAt(i);
        h=Math.imul(h,16777619)>>>0;
      }
    };
    rows.forEach(feed);
    const toiletKey=(Array.isArray(toiletList)?toiletList:[toiletList]).filter(Boolean).map(t=>`${t.x},${t.y}`).join(';');
    feed(`${startPos.x},${startPos.y}|${exitPos.x},${exitPos.y}|${toiletKey}`);
    return h.toString(16).padStart(8,'0');
  }

  function serializeWorld(){
    const mazeRows=maze.map(row=>row.join(''));
    return {
      raceId:multiplayer.raceId,
      levelIndex:activeLevelIndex,
      levelName:activeLevel.name,
      width:W,height:H,
      start:{x:start.x,y:start.y},
      exit:{x:exit.x,y:exit.y},
      toilet:{x:toilet.x,y:toilet.y},
      toilets:toilets.map(t=>({id:t.id,x:t.x,y:t.y,claimedBy:null})),
      relief:activeLevel.relief||null,
      bowelMultiplier:Number(activeLevel.bowelMultiplier||1),
      crisisTimeMultiplier:Number(activeLevel.crisisTimeMultiplier||1),
      crisisStartBonus:Number(activeLevel.crisisStartBonus||0),
      mazeRows,
      worldHash:worldHash(mazeRows,start,exit,toilets)
    };
  }

  function installWorld(world){
    if(!world || !Array.isArray(world.mazeRows) || !world.mazeRows.length) throw new Error('Missing synchronized maze data.');
    const rows=world.mazeRows;
    const width=Number(world.width)||rows[0]?.length||0;
    const height=Number(world.height)||rows.length;
    if(height!==rows.length || width<3 || height<3 || rows.some(r=>typeof r!=='string'||r.length!==width||/[^01]/.test(r))){
      throw new Error('Invalid synchronized maze data.');
    }
    W=width;H=height;
    maze=rows.map(r=>Array.from(r,ch=>ch==='1'?1:0));
    start={x:Number(world.start?.x),y:Number(world.start?.y)};
    exit={x:Number(world.exit?.x),y:Number(world.exit?.y)};
    toilets=(Array.isArray(world.toilets)&&world.toilets.length?world.toilets:[world.toilet]).filter(Boolean).map((t,i)=>({id:String(t.id||`toilet-${i+1}`),x:Number(t.x),y:Number(t.y),claimedBy:null}));
    toilet=toilets[0]||{x:Number(world.toilet?.x),y:Number(world.toilet?.y)};
    activeLevel={
      ...levelFor(world.levelIndex??activeLevelIndex),
      width:W,height:H,
      name:world.levelName||levelFor(world.levelIndex??activeLevelIndex).name,
      relief:world.relief??levelFor(world.levelIndex??activeLevelIndex).relief,
      bowelMultiplier:Number(world.bowelMultiplier||1),
      crisisTimeMultiplier:Number(world.crisisTimeMultiplier||1),
      crisisStartBonus:Number(world.crisisStartBonus||0)
    };
    activeLevelIndex=clamp(Number(world.levelIndex)||0,0,levelCount()-1)|0;
    openCellCache=openCells();
    const localHash=worldHash(rows,start,exit,toilets);
    console.log(`[LABYRUN sync] installed ${multiplayer.raceId} world ${localHash}${world.worldHash?` (host ${world.worldHash})`:''}`);
  }
  function clearRematchUi(){
    if(rematchTicker){clearInterval(rematchTicker);rematchTicker=null;}
    rematchInfo=null;
    $('#rematchCountdown')?.classList.add('hidden');
    $('#rematchCountdown')?.classList.remove('ready');
    if($('#againBtn')){ $('#againBtn').disabled=false; $('#againBtn').textContent='Race Again'; $('#againBtn').classList.remove('rematch-ready'); }
  }

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

  function chooseToilets(){
    // Two one-use toilets spawn each court. Both strongly prefer the side of
    // the labyrinth opposite EXIT, but they must also be well separated so
    // the second throne is a genuinely different rescue route.
    const ex=exit.x-start.x, ey=exit.y-start.y;
    const exitLen=Math.hypot(ex,ey)||1;
    const exitQ={x:Math.sign(ex),y:Math.sign(ey)};

    const preferred=openCellCache.filter(c=>{
      const dx=c.x-start.x,dy=c.y-start.y;
      const ds=Math.hypot(dx,dy),de=Math.hypot(c.x-exit.x,c.y-exit.y);
      if(ds<W*.27||ds>W*.64||de<W*.25)return false;
      const cos=((dx*ex)+(dy*ey))/((ds||1)*exitLen);
      const sameQuarter=(Math.sign(dx)===exitQ.x&&Math.sign(dy)===exitQ.y);
      return cos<-.12&&!sameQuarter;
    });
    const fallback=openCellCache.filter(c=>{
      const dx=c.x-start.x,dy=c.y-start.y;
      const ds=Math.hypot(dx,dy),de=Math.hypot(c.x-exit.x,c.y-exit.y);
      const sameQuarter=(Math.sign(dx)===exitQ.x&&Math.sign(dy)===exitQ.y);
      return ds>W*.22&&de>W*.20&&!sameQuarter;
    });
    const source=(preferred.length?preferred:(fallback.length?fallback:openCellCache)).slice();
    const first=source[(random()*source.length)|0]||start;
    const separated=source.filter(c=>Math.hypot(c.x-first.x,c.y-first.y)>Math.max(18,W*.18));
    const secondSource=separated.length?separated:source;
    let second=secondSource[(random()*secondSource.length)|0]||first;
    if(second.x===first.x&&second.y===first.y){
      second=source.reduce((best,c)=>Math.hypot(c.x-first.x,c.y-first.y)>Math.hypot(best.x-first.x,best.y-first.y)?c:best,source[0]||first);
    }
    return [
      {id:'toilet-1',x:first.x,y:first.y,claimedBy:null},
      {id:'toilet-2',x:second.x,y:second.y,claimedBy:null}
    ];
  }

  function openToilets(){ return toilets.filter(t=>!t.claimedBy); }
  function nearestOpenToilet(p){
    const open=openToilets();
    if(!open.length)return null;
    return open.reduce((best,t)=>Math.hypot(p.x-(t.x+.5),p.y-(t.y+.5))<Math.hypot(p.x-(best.x+.5),p.y-(best.y+.5))?t:best,open[0]);
  }

  function buildReliefItems(){
    reliefItems=[];
    const relief=activeLevel?.relief;
    if(!relief) return;

    const placed=[];
    const candidates=openCellCache.filter(c=>{
      const ds=Math.hypot(c.x-start.x,c.y-start.y);
      const de=Math.hypot(c.x-exit.x,c.y-exit.y);
      const dt=Math.min(...toilets.map(t=>Math.hypot(c.x-t.x,c.y-t.y)));
      return ds>14 && de>9 && dt>7;
    });

    function place(type,count,amount){
      for(let i=0;i<count && candidates.length;i++){
        let picked=null;
        for(let tries=0;tries<80;tries++){
          const c=candidates[(random()*candidates.length)|0];
          if(placed.every(p=>Math.hypot(p.x-c.x,p.y-c.y)>5)){ picked=c; break; }
        }
        if(!picked) picked=candidates[(random()*candidates.length)|0];
        const item={id:`${type}-${i}`,type,x:picked.x+.5,y:picked.y+.5,amount,active:true};
        reliefItems.push(item);placed.push(item);
      }
    }

    place('tums',Number(relief.tumsCount||0),Number(relief.tumsRelief||12));
    place('pepto',Number(relief.peptoCount||0),Number(relief.peptoRelief||22));
  }

  function reliefLabel(item){ return item.type==='pepto'?'PEPTO':'TUMS'; }

  function showReliefPop(text){
    const old=document.querySelector('.relief-pop'); old?.remove();
    const el=document.createElement('div');el.className='relief-pop';el.textContent=text;
    $('#gameScreen').appendChild(el);setTimeout(()=>el.remove(),950);
  }

  function collectReliefItem(item,p,fromNetwork=false){
    if(!item?.active || !p || p.pooped) return;
    item.active=false;
    p.bowel=Math.max(0,p.bowel-item.amount);
    if(p.isLocal){
      showReliefPop(`${reliefLabel(item)}! -${item.amount}% GUT PANIC`);
      banner(`💊 ${reliefLabel(item)} BOUGHT YOU A LITTLE MORE TIME.`,1500);
    }
    if(multiplayer.active&&multiplayer.isHost&&!fromNetwork){
      MP.sendGameEvent({raceId:multiplayer.raceId,type:'relief',id:item.id,playerId:p.id,bowel:p.bowel});
    }
  }

  function checkReliefPickups(){
    if(phase!=='crisis' || !reliefItems.length) return;
    for(const p of players){
      if(p.pooped||p.finished) continue;
      for(const item of reliefItems){
        if(item.active && Math.hypot(p.x-item.x,p.y-item.y)<.62){
          collectReliefItem(item,p);
          break;
        }
      }
    }
  }

  function buildFavoriteFoodItems(){
    foodItems=[];
    const placed=[];
    const candidates=openCellCache.filter(c=>{
      const ds=Math.hypot(c.x-start.x,c.y-start.y);
      const de=Math.hypot(c.x-exit.x,c.y-exit.y);
      const dt=Math.min(...toilets.map(t=>Math.hypot(c.x-t.x,c.y-t.y)));
      return ds>10&&de>7&&dt>6;
    });

    // Only racers actually present this round get a favourite-food 1UP.
    // The host still tracks all of those items for authoritative pickup logic,
    // but each client renders only its own racer's food.
    const roundCharacters=[...new Map(players.map(p=>[p.char.id,p.char])).values()];
    roundCharacters.forEach(c=>{
      let picked=null;
      for(let tries=0;tries<100&&candidates.length;tries++){
        const cand=candidates[(random()*candidates.length)|0];
        if(placed.every(p=>Math.hypot(p.x-cand.x,p.y-cand.y)>4)){picked=cand;break;}
      }
      if(!picked&&candidates.length)picked=candidates[(random()*candidates.length)|0];
      if(!picked)return;
      const item={id:`food-${c.id}`,characterId:c.id,x:picked.x+.5,y:picked.y+.5,active:true,asset:c.favouriteFood?.asset||'',name:c.favouriteFood?.name||'Favourite Food'};
      foodItems.push(item);placed.push(item);
    });
  }

  function isMyFavoriteFood(item){
    const me=localPlayer();
    return !!item && !!me && item.characterId===me.char.id;
  }

  function collectFavoriteFood(item,p,now,fromNetwork=false){
    if(!item?.active||!p||p.pooped||p.won||p.char.id!==item.characterId)return false;
    item.active=false;
    p.invincibleUntil=Math.max(p.invincibleUntil||0,now+Number(CFG.race.favoriteFoodInvincibleMs||10000));
    p.foodCollected=true;
    p.roundScore=(p.roundScore||0)+Number(CFG.score?.favoriteFood||250);
    if(p.isLocal){
      showReliefPop(`1UP! ${item.name.toUpperCase()} +${CFG.score?.favoriteFood||250}`);
      banner(`⭐ YOUR FAVOURITE FOOD! INVINCIBLE FOR ${Math.round((CFG.race.favoriteFoodInvincibleMs||10000)/1000)} SECONDS.`,2200);
    }
    if(multiplayer.active&&multiplayer.isHost&&!fromNetwork){
      MP.sendGameEvent({raceId:multiplayer.raceId,type:'foodCollect',id:item.id,playerId:p.id,invincibleMs:Number(CFG.race.favoriteFoodInvincibleMs||10000),roundScore:p.roundScore});
    }
    return true;
  }

  function checkFavoriteFoodPickups(now){
    for(const p of players){
      if(p.pooped||p.won)continue;
      for(const item of foodItems){
        if(item.active&&item.characterId===p.char.id&&Math.hypot(p.x-item.x,p.y-item.y)<.62){
          collectFavoriteFood(item,p,now);break;
        }
      }
    }
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
      pooped:false, won:false, finished:false, finishPlace:0, mapChecks:CFG.race.mapChecks+(c.stats.mapChecks||0), mapBoost:0,
      stamina:maxStamina, maxStamina, sprinting:false, lastSprintAt:-99999,
      path:[], pathTick:0, wiggle:random()*10,
      aiSprintFor:0, aiSprintCooldown:rand(.2,1.2), seed:random()*100000,
      launchTarget:null, launchComplete:false, crisisReaction:0,
      gutPath:[], gutPathSet:new Set(), gutTargetToiletId:null, gutRouteDiscipline:.45,
      invincibleUntil:0, trapSlowUntil:0, specialActiveUntil:0, specialAnimUntil:0,
      specialCharges:Number(c.special?.charges||0), specialRechargeAt:0,
      roundScore:0, foodCollected:false,lastSpecialTrailAt:0,
      isMoving:false,
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

  function makeSoloRoster(){
    const primary=CHARS[selected ?? 0]?.id||CHARS[0].id;
    soloRosterSeed=freshSeed();
    const pool=stableShuffle(CHARS.filter(c=>c.id!==primary).map(c=>c.id),soloRosterSeed);
    soloRosterCharacterIds=[primary,...pool.slice(0,3)];
  }

  function setupPlayers(){
    const primary=CHARS[selected ?? 0]?.id||CHARS[0].id;
    if(!soloRosterCharacterIds||soloRosterCharacterIds[0]!==primary)makeSoloRoster();
    const indices=soloRosterCharacterIds.map(id=>Math.max(0,CHARS.findIndex(c=>c.id===id)));
    players = indices.map((ci,i)=>makePlayer(i===0?'you':`ai${i}`,ci,i===0,i,{isAI:i!==0}));
    players.filter(p=>p.isAI).forEach((p,i)=>p.launchTarget=pickLaunchTarget(p,i));
  }

  function setupMultiplayerPlayers(meta){
    const humans=meta.humans||[];
    const used=new Set(humans.map(h=>h.characterId));
    const specs=humans.map(h=>({type:'human',id:h.id,name:h.name,characterId:h.characterId}));
    // Keep the AI cast stable across the 50-court room run so cumulative
    // scores actually belong to the same opponents instead of changing faces.
    const rosterKey=`${meta.code||roomState?.code||'ROOM'}:${[...used].sort().join('|')}`;
    const pool=stableShuffle(CHARS.filter(c=>!used.has(c.id)).map(c=>c.id),hashString(rosterKey));
    while(specs.length<4 && pool.length){
      const characterId=pool.shift();
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

  function prepareGame(seed,playerSetup,levelIndex=0,worldOverride=null,broadcastWorld=false){
    cancelAnimationFrame(raf);
    clearRematchUi();
    $('#scoreboard')?.classList.add('hidden');
    clearTimeout($('#eventBanner')._t);
    AUDIO.ensure();
    applyPlayerSettings();
    AUDIO.setMode('off');
    show('#gameScreen');
    setGameplaySeed(seed);
    setActiveLevel(levelIndex);

    if(worldOverride){
      installWorld(worldOverride);
    }else{
      maze=makeMaze(W,H);
      exit=carveBoundaryExit(start.x,start.y);
      openCellCache=openCells();
      toilets=chooseToilets();
      toilet=toilets[0];
      if(multiplayer.active&&multiplayer.isHost&&broadcastWorld){
        const world=serializeWorld();
        multiplayer.worldReady=true;
        MP.sendWorld(world);
        console.log(`[LABYRUN sync] host published ${multiplayer.raceId} world ${world.worldHash}`);
      }
    }

    // World generation consumes a lot of pseudo-random numbers. Reset to a
    // derived race seed here so every browser creates identical racers,
    // pickups and starting bowel values even though only the host built maze.
    setGameplaySeed(raceSeed(seed));
    buildReliefItems();
    buildFavoriteFoodItems();
    traps=[];trapSeq=0;roundWinners=[];
    toilets.forEach(t=>t.claimedBy=null);
    playerSetup();

    phase='intro'; mapOpen=false; resultData=null;
    leaveSpectatorMode();
    introStart=performance.now(); last=introStart;
    raceStartedAt=0; crisisAt=Infinity;
    keys={};
    crisisWarned=false; lastCrisisSecond=null;
    toiletRevealStart=0; toiletRevealActive=false; toiletRevealTargets=[];
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
    multiplayer={active:false,isHost:false,myId:null,meta:null,raceId:null,worldReady:false,remoteInputs:new Map(),lastInputSend:0,lastSnapshotSend:0,ending:false};
    $('#voiceHud').classList.add('hidden');
    prepareGame(freshSeed(),setupPlayers,soloLevelIndex);
  }

  function startMultiplayerGame(meta){
    clearRematchUi();
    const delay=Number.isFinite(meta.startDelayMs)?meta.startDelayMs:Math.max(0,(meta.startAt||Date.now())-Date.now());
    multiplayer={
      active:true,isHost:meta.hostId===MP.getMyId(),myId:MP.getMyId(),meta,
      raceId:String(meta.raceId||''),worldReady:false,remoteInputs:new Map(),
      lastInputSend:0,lastSnapshotSend:0,ending:false
    };
    const thisRace=multiplayer.raceId;
    $('#lobbyNotice').textContent=multiplayer.isHost?'Building the shared food court…':'Waiting for the host to publish the shared food court…';

    if(multiplayer.isHost){
      setTimeout(()=>{
        if(!multiplayer.active||multiplayer.raceId!==thisRace)return;
        prepareGame(meta.seed,()=>setupMultiplayerPlayers(meta),meta.levelIndex||0,null,true);
      },delay);
    }else{
      // Guests deliberately do NOT generate a local maze. They wait for the
      // authoritative host layout so everybody is physically in the same court.
      setTimeout(()=>{
        if(multiplayer.active&&multiplayer.raceId===thisRace&&!multiplayer.worldReady){
          $('#lobbyNotice').textContent='Still syncing the shared maze from the host…';
        }
      },delay+3000);
    }
  }

  function applyNetworkWorld(world){
    if(!multiplayer.active||multiplayer.isHost||!world)return;
    if(String(world.raceId||'')!==String(multiplayer.raceId||''))return;
    if(multiplayer.worldReady)return;
    multiplayer.worldReady=true;
    const meta=multiplayer.meta;
    try{
      prepareGame(meta.seed,()=>setupMultiplayerPlayers(meta),meta.levelIndex||0,world,false);
    }catch(e){
      multiplayer.worldReady=false;
      console.error('[LABYRUN sync] world install failed',e);
      $('#lobbyNotice').textContent=`Maze sync failed: ${e.message}`;
      show('#roomScreen');
    }
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
    const crisisTiming=Number(activeLevel.crisisTimeMultiplier||1);
    crisisAt=now+rand(CFG.race.crisisMinMs*crisisTiming,CFG.race.crisisMaxMs*crisisTiming);
    $('#introCaption').classList.add('hidden');
    $('#countdown').classList.add('hidden');
    $('#preCrisis').classList.add('hidden');
    AUDIO.setMode('normal');
    banner(`FOOD COURT ${activeLevelIndex+1}: ${activeLevel.name} — GO! FIND THE EXIT.`,1900);
  }

  $('#startSoloBtn').onclick=startGame;
  $('#mobileStartSoloBtn').onclick=startGame;
  $('#againBtn').onclick=async()=>{
    if(multiplayer.active && roomState){
      try{
        await MP.requestRematch();
        $('#againBtn').disabled=true;
        $('#againBtn').textContent='REMATCH READY ✓';
        $('#againBtn').classList.add('rematch-ready');
        $('#rematchCountdown').classList.add('ready');
        $('#rematchStatus').textContent='You voted to go again. If everyone votes, the next food court starts early.';
      }catch(e){
        $('#rematchStatus').textContent=e.message||String(e);
      }
    } else {
      soloLevelIndex=Math.min(soloLevelIndex+1,levelCount()-1);
      startGame();
    }
  };
  $('#menuBtn').onclick=async()=>{
    cancelAnimationFrame(raf);clearRematchUi();resetTouchStick();touchState.sprint=false;
    if(multiplayer.active){
      try{VOICE?.leave();await MP.leaveRoom();}catch(_){}
      multiplayer.active=false;roomState=null;
    }
    soloLevelIndex=0;
    soloScoreTotals.clear();
    soloRosterCharacterIds=null; soloRosterSeed=0;
    show('#menuScreen');
  };
  $('#resultMenuBtn').onclick=async()=>{
    clearRematchUi();
    if(multiplayer.active){try{VOICE?.leave();await MP.leaveRoom();}catch(_){} multiplayer.active=false;roomState=null;}
    else { soloLevelIndex=0; soloScoreTotals.clear(); soloRosterCharacterIds=null; soloRosterSeed=0; }
    show('#menuScreen');
  };
  $('#soundBtn').onclick=()=>{
    const muted=AUDIO.toggleMute();
    $('#soundBtn').textContent=muted?'SOUND: OFF':'SOUND: ON';
  };

  function spectatorOptions(){
    const options=[{type:'map',label:'TOP-DOWN MAP',player:null}];
    players.filter(p=>!p.isLocal&&!p.finished).forEach(p=>options.push({type:'player',label:p.name.toUpperCase(),player:p}));
    return options;
  }

  function currentSpectatorOption(){
    const options=spectatorOptions();
    if(spectatorIndex>=options.length)spectatorIndex=0;
    return options[spectatorIndex]||options[0];
  }

  function updateSpectatorHud(){
    const hud=$('#spectatorHud');
    if(!hud)return;
    if(!spectatorActive){hud.classList.add('hidden');return;}
    const option=currentSpectatorOption();
    $('#spectatorLabel').textContent=option.type==='map'?'TOP-DOWN MAP':`WATCHING ${option.label}`;
    hud.classList.remove('hidden');
  }

  function enterSpectatorMode(){
    if(spectatorActive)return;
    spectatorActive=true;spectatorIndex=0;
    $('#gameScreen').classList.add('spectating');
    $('#introCaption').classList.add('hidden');
    updateSpectatorHud();
  }

  function leaveSpectatorMode(){
    spectatorActive=false;spectatorIndex=0;
    $('#gameScreen').classList.remove('spectating');
    $('#spectatorHud')?.classList.add('hidden');
  }

  function cycleSpectator(dir){
    if(!spectatorActive)return;
    const options=spectatorOptions();
    if(!options.length)return;
    spectatorIndex=(spectatorIndex+(dir<0?-1:1)+options.length)%options.length;
    updateSpectatorHud();
  }

  $('#spectatorPrevBtn')?.addEventListener('click',()=>cycleSpectator(-1));
  $('#spectatorNextBtn')?.addEventListener('click',()=>cycleSpectator(1));

  addEventListener('keydown',e=>{
    if(spectatorActive && !e.repeat && (e.key==='ArrowLeft'||e.key==='ArrowRight')){
      e.preventDefault();
      cycleSpectator(e.key==='ArrowLeft'?-1:1);
      return;
    }
    keys[e.key.toLowerCase()]=true;
    setInputMode('keyboard');
    if(e.key.toLowerCase()==='m' && !e.repeat) toggleMap();
    if(e.key.toLowerCase()==='e' && !e.repeat) requestUseSpecial();
  });
  addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
  $('#mapBtn').onclick=toggleMap;
  $('#specialBtn').onclick=requestUseSpecial;
  $('#mapOverlay').onclick=()=>{mapOpen=false;$('#mapOverlay').classList.add('hidden');resetTouchStick();};

  // ============================================================
  // MAP PEEK
  // ============================================================
  function consumeMapPeek(p){
    if(!p || p.mapChecks<=0) return false;
    p.mapChecks--;
    p.bowel=Math.min(100,p.bowel+CFG.race.mapBowelPenalty*(p.char.stats.mapPenalty||1));
    if(p.char.passive==='mapRush') p.mapBoost=1500;
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
      MP.sendAction({raceId:multiplayer.raceId,type:'mapPeek'});
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
  // CHARACTER SPECIALS / TRAPS
  // ============================================================
  function refreshSpecial(p,now=performance.now()){
    const spec=p?.char?.special;
    if(!spec)return;
    if(p.specialCharges<=0 && p.specialRechargeAt>0 && now>=p.specialRechargeAt){
      p.specialCharges=Number(spec.charges||1);
      p.specialRechargeAt=0;
      if(p.isLocal) banner(`✨ ${spec.name} RECHARGED.`,1200);
    }
  }

  function consumeSpecialCharge(p,now){
    const spec=p.char.special;if(!spec)return;
    p.specialCharges=Math.max(0,(p.specialCharges||0)-1);
    if(p.specialCharges<=0)p.specialRechargeAt=now+Number(spec.cooldownMs||20000);
  }

  function requestUseSpecial(){
    if((phase!=='race'&&phase!=='crisis')||mapOpen||toiletRevealActive)return;
    const p=localPlayer();if(!p||p.pooped||p.finished)return;
    if(!p.char.special){banner('THIS RACER DOES NOT HAVE AN ACTIVE SPECIAL YET.',1200);return;}
    if(multiplayer.active&&!multiplayer.isHost){
      MP.sendAction({raceId:multiplayer.raceId,type:'special'});
      return;
    }
    useSpecial(p,performance.now());
  }

  function useSpecial(p,now=performance.now()){
    const spec=p?.char?.special;
    if(!spec||p.pooped||p.finished)return false;
    refreshSpecial(p,now);
    if(p.specialCharges<=0){
      if(p.isLocal){
        const left=Math.max(0,Math.ceil((p.specialRechargeAt-now)/1000));
        banner(`${spec.name} RECHARGING — ${left}s`,1000);
      }
      return false;
    }

    let success=false;
    if(spec.id==='blink'){
      // Blink roughly five tiles in the direction the racer is facing. The
      // destination must be open, but intermediate walls are intentionally ignored.
      let best=null;
      for(let d=5;d>=1;d-=.5){
        const tx=p.x+Math.cos(p.dir)*d,ty=p.y+Math.sin(p.dir)*d;
        if(tx<1||ty<1||tx>W-2||ty>H-2)continue;
        if(walkable(tx,ty,.15)){best={x:tx,y:ty};break;}
      }
      if(best){p.x=best.x;p.y=best.y;p.netX=null;p.netY=null;success=true;if(p.isLocal)banner('🌮 TACO TELEPORT!',900);}
    }else if(spec.id==='wallBreak'){
      const cx=Math.floor(p.x),cy=Math.floor(p.y);
      const vx=Math.cos(p.dir),vy=Math.sin(p.dir);
      const dx=Math.abs(vx)>=Math.abs(vy)?Math.sign(vx):0;
      const dy=dx===0?Math.sign(vy):0;
      const tx=cx+dx,ty=cy+dy;
      if(tx>0&&ty>0&&tx<W-1&&ty<H-1&&maze[ty]?.[tx]===1){
        maze[ty][tx]=0;openCellCache.push({x:tx,y:ty});if(phase==='crisis')assignAllGutPaths();success=true;
        if(p.isLocal)banner('🌶️ CHILI CHARGE! WALL DESTROYED.',1100);
        if(multiplayer.active&&multiplayer.isHost)MP.sendGameEvent({raceId:multiplayer.raceId,type:'wallBreak',x:tx,y:ty});
      }else if(p.isLocal)banner('GET CLOSER AND FACE A WALL.',1000);
    }else if(spec.id==='milkTrap'||spec.id==='beanTrap'){
      const type=spec.id==='milkTrap'?'milk':'bean';
      const trap={id:`trap-${++trapSeq}`,type,ownerId:p.id,x:p.x,y:p.y,active:true};
      traps.push(trap);success=true;
      if(p.isLocal)banner(type==='milk'?'🥤 SHAKE SPILL DROPPED.':'🫘 BEAN BOMB DROPPED.',1000);
    }else if(spec.id==='cleanBoost'){
      p.specialActiveUntil=now+Number(spec.durationMs||4200);success=true;
      if(p.isLocal)banner('🥣 PROBIOTIC POWER! CLEAN SPEED!',1200);
    }else if(spec.id==='prunePurge'){
      p.bowel=Math.max(0,p.bowel-Number(spec.relief||18));
      const radius=Number(spec.radius||6),pressure=Number(spec.rivalPressure||8);
      players.forEach(r=>{
        if(r===p||r.pooped||r.won||r.finished)return;
        if(Math.hypot(r.x-p.x,r.y-p.y)<=radius)r.bowel=Math.min(99,r.bowel+pressure);
      });
      success=true;
      if(p.isLocal)banner('🧃 PRUNE PURGE! PRESSURE VENTED. NEARBY GUTS OBJECT.',1400,true);
    }else if(spec.id==='tpShield'){
      p.specialActiveUntil=now+Number(spec.durationMs||5000);success=true;
      if(p.isLocal)banner('🧻 TP FORTRESS! FIVE SECONDS OF TWO-PLY IMMUNITY.',1400);
    }else if(spec.id==='fireTrail'){
      p.specialActiveUntil=now+Number(spec.durationMs||5000);p.lastSpecialTrailAt=0;success=true;
      if(p.isLocal)banner('🔥 BIRYANI BURN! LEAVE A BAD IDEA BEHIND YOU.',1400,true);
    }

    if(!success)return false;
    p.specialAnimUntil=now+760;
    AUDIO.specialSting?.();
    consumeSpecialCharge(p,now);
    if(multiplayer.active&&multiplayer.isHost){
      MP.sendGameEvent({raceId:multiplayer.raceId,type:'specialUsed',playerId:p.id,specialId:spec.id,charges:p.specialCharges,rechargeAt:p.specialRechargeAt,rechargeRemainingMs:Math.max(0,(p.specialRechargeAt||0)-now),activeRemainingMs:Math.max(0,(p.specialActiveUntil||0)-now),traps:traps.filter(t=>t.active)});
    }
    return true;
  }

  function updateActiveSpecial(p,now){
    if(p?.pooped||p?.finished)return;
    const spec=p?.char?.special;
    if(spec?.id!=='fireTrail'||now>=(p.specialActiveUntil||0))return;
    if(now-(p.lastSpecialTrailAt||0)<520)return;
    p.lastSpecialTrailAt=now;
    traps.push({id:`trap-${++trapSeq}`,type:'spice',ownerId:p.id,x:p.x,y:p.y,active:true});
  }

  function checkTraps(now){
    if(!traps.length)return;
    for(const trap of traps){
      if(!trap.active)continue;
      for(const p of players){
        if(p.id===trap.ownerId||p.pooped||p.won||p.finished||now<(p.invincibleUntil||0)||(p.char.special?.id==='tpShield'&&now<(p.specialActiveUntil||0)))continue;
        if(Math.hypot(p.x-trap.x,p.y-trap.y)>.58)continue;
        trap.active=false;
        if(trap.type==='milk'){
          p.trapSlowUntil=Math.max(p.trapSlowUntil||0,now+4000);
          if(p.isLocal)banner('🥤 MILKSHAKE SPILL! YOUR SHOES ARE DISGUSTING.',1700);
        }else if(trap.type==='spice'){
          p.bowel=Math.min(99,p.bowel+6);
          p.trapSlowUntil=Math.max(p.trapSlowUntil||0,now+1300);
          if(p.isLocal)banner('🔥 BIRYANI BURN! YOUR GUT JUST GOT ROASTED.',1500,true);
        }else{
          p.bowel=Math.min(99,p.bowel+10);
          p.trapSlowUntil=Math.max(p.trapSlowUntil||0,now+1800);
          if(p.isLocal)banner('🫘 BEAN BOMB! YOUR STOMACH OBJECTS.',1700,true);
        }
        if(multiplayer.active&&multiplayer.isHost){
          const slowMs=trap.type==='milk'?4000:(trap.type==='spice'?1300:1800);
          MP.sendGameEvent({raceId:multiplayer.raceId,type:'trapTriggered',id:trap.id,playerId:p.id,bowel:p.bowel,trapSlowMs:slowMs});
        }
        break;
      }
    }
  }

  // ============================================================
  // MOVEMENT / SPRINT
  // ============================================================
  // Circular collision is much friendlier than the old square hitbox around
  // maze corners, especially for touch/analog input. It lets the racer roll
  // past an edge instead of snagging on a single pixel of a wall tile.
  function walkable(x,y,r=CFG.movement.collisionRadius||.19){
    const minX=Math.floor(x-r),maxX=Math.floor(x+r);
    const minY=Math.floor(y-r),maxY=Math.floor(y+r);
    for(let ty=minY;ty<=maxY;ty++) for(let tx=minX;tx<=maxX;tx++){
      if(maze[ty]?.[tx]===0) continue;
      const closestX=clamp(x,tx,tx+1);
      const closestY=clamp(y,ty,ty+1);
      const dx=x-closestX,dy=y-closestY;
      if(dx*dx+dy*dy < r*r) return false;
    }
    return true;
  }

  function moveWithWallSlide(p,dx,dy,distance){
    if(!distance || (!dx&&!dy)) return;
    const maxStep=CFG.movement.movementSubstep||.10;
    const steps=Math.max(1,Math.ceil(distance/maxStep));
    const step=distance/steps;
    const vx=dx*step,vy=dy*step;
    const assist=CFG.movement.cornerAssist||.055;

    for(let i=0;i<steps;i++){
      if(walkable(p.x+vx,p.y+vy)){
        p.x+=vx;p.y+=vy;continue;
      }

      let moved=false;
      const xFirst=Math.abs(vx)>=Math.abs(vy);
      const tryX=()=>{if(Math.abs(vx)>1e-6&&walkable(p.x+vx,p.y)){p.x+=vx;moved=true;return true;}return false;};
      const tryY=()=>{if(Math.abs(vy)>1e-6&&walkable(p.x,p.y+vy)){p.y+=vy;moved=true;return true;}return false;};
      if(xFirst){tryX();tryY();}else{tryY();tryX();}
      if(moved) continue;

      // Soft corner assist: if both components are blocked, gently pull the
      // racer toward the centre of the current corridor cell. It is tiny on
      // purpose: enough to free a shoulder, not enough to steer for you.
      const cx=Math.floor(p.x)+.5,cy=Math.floor(p.y)+.5;
      let ax=cx-p.x,ay=cy-p.y;
      const al=Math.hypot(ax,ay);
      if(al>.001){
        const n=Math.min(assist,al);ax=ax/al*n;ay=ay/al*n;
        if(walkable(p.x+ax,p.y+ay)){p.x+=ax;p.y+=ay;}
        else if(walkable(p.x+ax,p.y))p.x+=ax;
        else if(walkable(p.x,p.y+ay))p.y+=ay;
      }
    }
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
    const now=performance.now();
    if(now<(p.trapSlowUntil||0)) base*=.52;
    const cleanBoost=now<(p.specialActiveUntil||0)&&p.char.special?.id==='cleanBoost';
    if(cleanBoost) base*=1.72;
    if(p.sprinting&&!cleanBoost) base*=CFG.movement.sprintMultiplier*(p.char.stats.sprint||1);
    return Math.max(CFG.movement.minSpeed*.75,base);
  }

  function setSprinting(p,wantsSprint,dt,now){
    const cleanBoost=now<(p.specialActiveUntil||0)&&p.char.special?.id==='cleanBoost';
    const can=wantsSprint && (cleanBoost||p.stamina>0.5) && !p.pooped && !p.finished;
    p.sprinting=can;
    if(can){
      if(!cleanBoost)p.stamina=Math.max(0,p.stamina-CFG.movement.staminaDrainPerSecond*dt);
      p.lastSprintAt=now;
      if(phase==='crisis'&&!cleanBoost&&now>=(p.invincibleUntil||0)){
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
    if(p.pooped||p.finished){p.sprinting=false;p.isMoving=false;return;}
    const sx=Number(input?.sx||0),sy=Number(input?.sy||0);
    const moving=Math.hypot(sx,sy)>.06;
    p.isMoving=moving;
    let dx=0,dy=0;
    if(moving){
      dx=sx+2*sy;
      dy=-sx+2*sy;
      const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l;
    }
    setSprinting(p,moving&&!!input?.sprint,dt,now);
    const s=speedFor(p);
    moveWithWallSlide(p,dx,dy,s*dt);
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
    MP.sendInput({raceId:multiplayer.raceId,...readLocalInput()});
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

  function assignGutPath(p){
    if(!p||p.pooped||p.won)return;
    const open=openToilets();
    if(!open.length){p.gutPath=[];p.gutPathSet=new Set();p.gutTargetToiletId=null;return;}
    let best=null;
    for(const t of open){
      const route=pathTo(p.x,p.y,t.x+.5,t.y+.5,null);
      if(!route.length)continue;
      if(!best||route.length<best.route.length)best={toilet:t,route};
    }
    if(!best)return;
    p.gutTargetToiletId=best.toilet.id;
    p.gutPath=best.route;
    const set=new Set([`${Math.floor(p.x)},${Math.floor(p.y)}`]);
    best.route.forEach(n=>set.add(`${Math.floor(n.x)},${Math.floor(n.y)}`));
    p.gutPathSet=set;
  }

  function assignAllGutPaths(){ players.forEach(assignGutPath); }

  function updateGutRouteDiscipline(p,dt){
    if(phase!=='crisis'||p.pooped||p.won)return 1;
    const target=toilets.find(t=>t.id===p.gutTargetToiletId);
    if(!target||target.claimedBy)assignGutPath(p);
    const set=p.gutPathSet||new Set();
    const cx=Math.floor(p.x),cy=Math.floor(p.y);
    let onRoute=set.has(`${cx},${cy}`);
    if(!onRoute){
      for(let oy=-1;oy<=1&&!onRoute;oy++)for(let ox=-1;ox<=1&&!onRoute;ox++){
        if(Math.abs(ox)+Math.abs(oy)!==1)continue;
        onRoute=set.has(`${cx+ox},${cy+oy}`);
      }
    }
    const build=Number(CFG.race.gutRouteBuildPerSecond||.72);
    const lose=Number(CFG.race.gutRouteLosePerSecond||1.05);
    p.gutRouteDiscipline=clamp((p.gutRouteDiscipline??.45)+(onRoute?build:-lose)*dt,0,1);
    const off=Number(CFG.race.gutRouteOffMultiplier||1.34),safe=Number(CFG.race.gutRouteSafeMultiplier||.68);
    return lerp(off,safe,p.gutRouteDiscipline);
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
    let target = phase==='crisis' ? (nearestOpenToilet(p)||toilet) : exit;

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
    if(p.pooped||p.finished){p.sprinting=false;return;}
    if(phase==='crisis' && p.crisisReaction>0){
      p.crisisReaction=Math.max(0,p.crisisReaction-dt);
      p.isMoving=false;
      setSprinting(p,false,dt,now);
      return;
    }

    p.pathTick-=dt;
    if(p.pathTick<=0 || !p.path.length) rebuildAiPath(p);
    updateAiSprint(p,dt,now);
    if(!p.path.length){p.isMoving=false;return;}

    p.isMoving=true;
    const t=p.path[0];
    let dx=t.x-p.x,dy=t.y-p.y,l=Math.hypot(dx,dy);
    if(l<.18){p.path.shift();return;}
    dx/=l;dy/=l;

    // Personality error produces visibly different cornering without making bots useless.
    const error=Math.sin(now/620+p.wiggle)*(p.personality.routeNoise*.11);
    const cs=Math.cos(error),sn=Math.sin(error);
    const ex=dx*cs-dy*sn,ey=dx*sn+dy*cs;
    const s=speedFor(p);
    const beforeX=p.x,beforeY=p.y;
    moveWithWallSlide(p,ex,ey,s*dt);
    if(Math.hypot(p.x-beforeX,p.y-beforeY)<.002){p.path=[];p.pathTick=0;}
    p.dir=Math.atan2(ey,ex);
  }

  // ============================================================
  // MULTIPLAYER GAME SYNC
  // ============================================================
  function playerSnapshot(p){
    return {
      id:p.id,x:p.x,y:p.y,dir:p.dir,bowel:p.bowel,pooped:p.pooped,won:p.won,finished:p.finished,finishPlace:p.finishPlace,
      mapChecks:p.mapChecks,mapBoost:p.mapBoost,stamina:p.stamina,maxStamina:p.maxStamina,
      sprinting:p.sprinting,isMoving:!!p.isMoving,
      invincibleRemainingMs:Math.max(0,(p.invincibleUntil||0)-performance.now()),
      specialAnimRemainingMs:Math.max(0,(p.specialAnimUntil||0)-performance.now()),
      trapSlowRemainingMs:Math.max(0,(p.trapSlowUntil||0)-performance.now()),
      specialCharges:p.specialCharges||0,
      specialRechargeRemainingMs:Math.max(0,(p.specialRechargeAt||0)-performance.now()),
      specialActiveRemainingMs:Math.max(0,(p.specialActiveUntil||0)-performance.now()),
      roundScore:p.roundScore||0
    };
  }

  function broadcastSnapshot(now){
    if(!multiplayer.active||!multiplayer.isHost)return;
    const interval=1000/(window.LABYRUN_NETWORK_CONFIG?.snapshotHz||15);
    if(now-multiplayer.lastSnapshotSend<interval)return;
    multiplayer.lastSnapshotSend=now;
    MP.sendSnapshot({
      raceId:multiplayer.raceId,
      phase,
      crisisRemainingMs:Number.isFinite(crisisAt)?Math.max(0,crisisAt-now):null,
      toiletRevealActive:!!toiletRevealActive,
      toilets:toilets.map(t=>({id:t.id,claimedBy:t.claimedBy||null})),
      reliefActive:reliefItems.filter(i=>i.active).map(i=>i.id),
      foodActive:foodItems.filter(i=>i.active).map(i=>i.id),
      traps:traps.filter(t=>t.active),
      players:players.map(playerSnapshot)
    });
  }

  function applyNetworkSnapshot(snapshot){
    if(!multiplayer.active||multiplayer.isHost||!snapshot)return;
    if(String(snapshot.raceId||'')!==String(multiplayer.raceId||''))return;
    if(snapshot.phase==='crisis'&&phase!=='crisis') triggerCrisis(true);
    if(snapshot.phase==='race'&&phase==='intro') return;
    if(Number.isFinite(snapshot.crisisRemainingMs)) crisisAt=performance.now()+snapshot.crisisRemainingMs;
    if(Array.isArray(snapshot.toilets)){
      snapshot.toilets.forEach(st=>{const t=toilets.find(x=>x.id===st.id);if(t)t.claimedBy=st.claimedBy||null;});
    }
    if(Array.isArray(snapshot.reliefActive)){
      const active=new Set(snapshot.reliefActive);
      reliefItems.forEach(i=>i.active=active.has(i.id));
    }
    if(Array.isArray(snapshot.foodActive)){
      const active=new Set(snapshot.foodActive);foodItems.forEach(i=>i.active=active.has(i.id));
    }
    if(Array.isArray(snapshot.traps))traps=snapshot.traps.map(t=>({...t}));
    (snapshot.players||[]).forEach(sp=>{
      const p=players.find(x=>x.id===sp.id); if(!p)return;
      p.netX=Number(sp.x); p.netY=Number(sp.y); p.netDir=Number(sp.dir||0);
      p.bowel=Number(sp.bowel||0); p.pooped=!!sp.pooped; p.won=!!sp.won;p.finished=!!sp.finished;p.finishPlace=Number(sp.finishPlace||0);
      p.mapChecks=Number(sp.mapChecks??p.mapChecks); p.mapBoost=Number(sp.mapBoost||0);
      p.stamina=Number(sp.stamina??p.stamina); p.maxStamina=Number(sp.maxStamina??p.maxStamina);
      p.sprinting=!!sp.sprinting;p.isMoving=!!sp.isMoving;
      const netNow=performance.now();
      p.invincibleUntil=netNow+Number(sp.invincibleRemainingMs||0);p.trapSlowUntil=netNow+Number(sp.trapSlowRemainingMs||0);p.specialAnimUntil=netNow+Number(sp.specialAnimRemainingMs||0);
      p.specialCharges=Number(sp.specialCharges??p.specialCharges);p.specialRechargeAt=Number(sp.specialRechargeRemainingMs)>0?netNow+Number(sp.specialRechargeRemainingMs):0;p.specialActiveUntil=Number(sp.specialActiveRemainingMs)>0?netNow+Number(sp.specialActiveRemainingMs):0;p.roundScore=Number(sp.roundScore||0);
    });
  }

  function applyNetworkEvent(evt){
    if(!multiplayer.active||multiplayer.isHost||!evt)return;
    if(String(evt.raceId||'')!==String(multiplayer.raceId||''))return;
    if(evt.type==='crisis') triggerCrisis(true);
    if(evt.type==='relief'){
      const item=reliefItems.find(x=>x.id===evt.id);
      const p=players.find(x=>x.id===evt.playerId);
      if(item) item.active=false;
      if(p && Number.isFinite(evt.bowel)) p.bowel=Number(evt.bowel);
      if(p?.isLocal && item){
        showReliefPop(`${reliefLabel(item)}! GUT PANIC REDUCED`);
        banner(`💊 ${reliefLabel(item)} BOUGHT YOU A LITTLE MORE TIME.`,1500);
      }
    }
    if(evt.type==='wallBreak'&&maze[evt.y]?.[evt.x]===1){maze[evt.y][evt.x]=0;openCellCache.push({x:Number(evt.x),y:Number(evt.y)});}
    if(evt.type==='specialUsed'){
      const p=players.find(x=>x.id===evt.playerId);if(p){const eventNow=performance.now();p.specialCharges=Number(evt.charges??p.specialCharges);p.specialRechargeAt=Number(evt.rechargeRemainingMs)>0?eventNow+Number(evt.rechargeRemainingMs):0;p.specialActiveUntil=Number(evt.activeRemainingMs)>0?eventNow+Number(evt.activeRemainingMs):0;p.specialAnimUntil=eventNow+760;}
      if(Array.isArray(evt.traps))traps=evt.traps.map(t=>({...t}));
      AUDIO.specialSting?.();
    }
    if(evt.type==='trapTriggered'){
      const t=traps.find(x=>x.id===evt.id);if(t)t.active=false;
      const p=players.find(x=>x.id===evt.playerId);if(p){p.bowel=Number(evt.bowel??p.bowel);p.trapSlowUntil=performance.now()+Number(evt.trapSlowMs||0);}
    }
    if(evt.type==='foodCollect'){
      const item=foodItems.find(x=>x.id===evt.id);if(item)item.active=false;
      const p=players.find(x=>x.id===evt.playerId);if(p){p.invincibleUntil=performance.now()+Number(evt.invincibleMs||0);p.roundScore=Number(evt.roundScore||p.roundScore);}
      if(p?.isLocal&&item){showReliefPop(`1UP! ${item.name.toUpperCase()}`);banner('⭐ FAVOURITE FOOD! INVINCIBLE!',1800);}
    }
  }

  function applyPostgame(info){
    if(!multiplayer.active||!info)return;
    rematchInfo=info;
    if(rematchTicker){clearInterval(rematchTicker);rematchTicker=null;}
    const box=$('#rematchCountdown');
    box?.classList.remove('hidden');
    if($('#againBtn') && /LOADING|SYNCING/.test($('#againBtn').textContent)){
      $('#againBtn').disabled=false;
      $('#againBtn').textContent='Race Again';
    }
    const next=levelFor(info.nextLevelIndex||0);
    if($('#resultLevel')) $('#resultLevel').textContent=`COMPLETED ${activeLevel.name} • NEXT: FOOD COURT ${(info.nextLevelIndex||0)+1} — ${next.name}`;
    if(Array.isArray(info.standings)&&info.standings.length)renderScoreboard(info.standings);
    const tick=()=>{
      if(!rematchInfo)return;
      const sec=Math.max(0,Math.ceil((Number(rematchInfo.rematchAt||Date.now())-Date.now())/1000));
      if($('#rematchSeconds')) $('#rematchSeconds').textContent=String(sec);
      const votes=Number(rematchInfo.votes||0), total=Number(rematchInfo.players||roomState?.players?.length||0);
      if($('#rematchStatus') && !$('#againBtn')?.disabled){
        $('#rematchStatus').textContent=votes
          ? `${votes}/${total} racer${votes===1?'':'s'} voted to go again. Otherwise the next race starts automatically.`
          : 'Nobody has to touch anything. Bad decisions resume automatically.';
      }
      if(sec<=0 && $('#rematchStatus')) $('#rematchStatus').textContent='LOADING THE NEXT FOOD COURT…';
    };
    tick();
    rematchTicker=setInterval(tick,250);
  }

  function applyNetworkEnd(payload){
    if(!multiplayer.active||!payload)return;
    if(payload.reason==='host-left'){
      cancelAnimationFrame(raf);clearRematchUi();
      phase='idle'; multiplayer.active=false; multiplayer.ending=false;
      AUDIO.setMode('menu');
      show('#roomScreen');
      $('#lobbyNotice').textContent=payload.message||'Host disconnected. Back in the lobby.';
      if(roomState)renderRoom(roomState);
      return;
    }
    if(String(payload.raceId||'')!==String(multiplayer.raceId||''))return;
    if(payload.postgame){
      rematchInfo=payload.postgame;
      if(phase==='ended') applyPostgame(payload.postgame);
    }
    if(phase==='ended')return;
    const ids=Array.isArray(payload.winnersIds)&&payload.winnersIds.length?payload.winnersIds:(payload.winnerId?[payload.winnerId]:[]);
    const winners=ids.map(id=>players.find(p=>p.id===id)).filter(Boolean);
    endGame(winners,!!payload.toiletWin,true);
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
    $('#objectiveText').textContent='🚽 2 TOILETS';
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
    {
      const lp=localPlayer();toiletRevealFrom={x:lp?.x||start.x+.5,y:lp?.y||start.y+.5};
      toiletRevealTargets=toilets.slice().sort((a,b)=>Math.hypot((lp?.x||0)-(a.x+.5),(lp?.y||0)-(a.y+.5))-Math.hypot((lp?.x||0)-(b.x+.5),(lp?.y||0)-(b.y+.5)));
    }

    if(!fromNetwork){
      players.forEach(p=>{
        const crisisBonus=Number(activeLevel.crisisStartBonus||0);
        p.bowel=Math.max(p.bowel,Math.min(92,rand(CFG.race.crisisBowelMin+crisisBonus,CFG.race.crisisBowelMax+crisisBonus)));
        p.path=[];
        p.pathTick=0;
        p.sprinting=false;
        if(p.isAI&&p.personality){
          p.crisisReaction=rand(p.personality.crisisReactionMin,p.personality.crisisReactionMax);
        }
      });
      assignAllGutPaths();
      if(multiplayer.active&&multiplayer.isHost) MP.sendGameEvent({raceId:multiplayer.raceId,type:'crisis'});
    }

    AUDIO.panicSting();
    AUDIO.setMode('panic');
    banner('🚨 BOWEL EVENT! EXIT CANCELLED. TWO TOILETS. FOUR DESPERATE PEOPLE. 🚨',4400,true);
    updateToiletRadar();
  }

  function claimToilet(p,t){
    if(!p||!t||p.pooped||p.won||t.claimedBy)return false;
    t.claimedBy=p.id;
    p.won=true;p.finished=true;p.sprinting=false;
    p.x=t.x+.5;p.y=t.y+.5;
    p.finishPlace=roundWinners.length+1;
    p.roundScore=(p.roundScore||0)+Number(p.finishPlace===1?(CFG.score?.firstToilet||1000):(CFG.score?.secondToilet||700));
    roundWinners.push(p);
    AUDIO.flushSting();
    if(p.isLocal){banner(`🚽 TOILET ${p.finishPlace} CLAIMED! YOU SURVIVE.`,2600,true);enterSpectatorMode();}
    else banner(`🚽 ${p.name.toUpperCase()} CLAIMED TOILET ${p.finishPlace}!`,1800,true);
    assignAllGutPaths();
    const left=openToilets().length;
    $('#objectiveText').textContent=left?`🚽 ${left} TOILET${left===1?'':'S'}`:'SAFE';
    return true;
  }

  function scoreRows(){
    return players.map(p=>({id:p.id,name:p.name,characterId:p.char.id,roundScore:Math.max(0,Math.round(p.roundScore||0))}));
  }

  function renderScoreboard(rows){
    const box=$('#scoreboard'),wrap=$('#scoreboardRows');
    if(!box||!wrap||!Array.isArray(rows)||!rows.length){box?.classList.add('hidden');return;}
    box.classList.remove('hidden');
    wrap.innerHTML=rows.slice().sort((a,b)=>Number(b.totalScore??b.roundScore??0)-Number(a.totalScore??a.roundScore??0)).map((row,i)=>{
      const c=charById(row.characterId);
      const total=Number(row.totalScore??row.roundScore??0);
      const round=Number(row.roundScore||0);
      return `<div class="score-row"><span class="score-rank">${i+1}</span><span class="score-face">${c?.portrait?`<img src="${c.portrait}" alt="">`:'💩'}</span><span class="score-name">${row.name||c?.name||'Racer'}</span><span class="score-round">+${round}</span><b>${total}</b></div>`;
    }).join('');
  }

  function checkWins(){
    if(phase==='race'){
      for(const p of players){
        if(!p.pooped&&!p.won&&Math.hypot(p.x-(exit.x+.5),p.y-(exit.y+.5))<.52){
          p.won=true;p.finished=true;p.finishPlace=1;
          p.roundScore=(p.roundScore||0)+Number(CFG.score?.exitWinner||900);
          endGame([p],false);return;
        }
      }
      return;
    }
    if(phase!=='crisis')return;

    for(const p of players){
      if(p.pooped||p.won)continue;
      const hit=openToilets().find(t=>Math.hypot(p.x-(t.x+.5),p.y-(t.y+.5))<.58);
      if(hit)claimToilet(p,hit);
    }

    if(roundWinners.length>=Math.min(2,toilets.length)){
      players.forEach(p=>{if(!p.won){p.pooped=true;p.finished=true;p.sprinting=false;}});
      AUDIO.poopSting();
      endGame(roundWinners,true);return;
    }
    const stillAlive=players.some(p=>!p.pooped&&!p.won);
    if(!stillAlive)endGame(roundWinners,true);
  }

  function endGame(winnerInput,toiletWin,fromNetwork=false){
    if(phase==='ended')return;
    const winners=Array.isArray(winnerInput)?winnerInput.filter(Boolean):(winnerInput?[winnerInput]:[]);
    roundWinners=winners.slice();
    phase='ended';
    leaveSpectatorMode();
    toiletRevealActive=false;
    $('#panicFx').classList.remove('alarm');
    $('#gameScreen').classList.remove('bowel-rumble');
    $('#toiletRadar').classList.add('hidden');
    resetTouchStick(); touchState.sprint=false;
    touchSprintBtn?.classList.remove('active','danger');
    if(touchSprintBtn){ touchSprintBtn.querySelector('span').textContent='HOLD'; touchSprintBtn.querySelector('b').textContent='SPRINT'; }

    if(toiletWin&&winners.length){
      winners.forEach(w=>{w.won=true;w.finished=true;});
      if(winners.length>=2)players.forEach(p=>{if(!p.won){p.pooped=true;p.finished=true;}});
    }

    AUDIO.setMode('menu');
    resultData={winners,toiletWin};
    const rows=scoreRows();
    if(multiplayer.active&&multiplayer.isHost&&!fromNetwork&&!multiplayer.ending){
      multiplayer.ending=true;
      MP.sendGameEnd({raceId:multiplayer.raceId,winnersIds:winners.map(w=>w.id),winnerId:winners[0]?.id||null,toiletWin:!!toiletWin,scoreRows:rows});
    }

    // Solo totals live for the current 50-court run. Multiplayer totals are
    // accumulated on the room server and arrive with postgame standings.
    if(!multiplayer.active){
      rows.forEach(row=>soloScoreTotals.set(row.id,(soloScoreTotals.get(row.id)||0)+row.roundScore));
    }

    setTimeout(()=>{
      show('#resultScreen');
      drawResult();
      $('#resultKicker').textContent=`FOOD COURT ${activeLevelIndex+1}/${levelCount()} • ${activeLevel.name}`;
      const winnerArt=$('#resultWinnerArt'),winnerImg=$('#resultWinnerImage'),winnerImg2=$('#resultWinnerImage2');
      const winnerGhostA=$('#resultWinnerGhostA'),winnerGhostB=$('#resultWinnerGhostB');
      const w1=winners[0]||null,w2=winners[1]||null;
      const allPooped=!winners.length;
      winnerArt.classList.toggle('all-pooped',allPooped);
      if(allPooped){
        winnerImg.src='assets/ui/all-pooped-turd.png';
        winnerImg.alt='Total system failure';
        winnerImg.classList.remove('hidden');
        winnerImg2.classList.add('hidden');winnerImg2.removeAttribute('src');
        winnerGhostA.classList.add('hidden');winnerGhostA.removeAttribute('src');winnerGhostA.alt='';
        winnerGhostB.classList.add('hidden');winnerGhostB.removeAttribute('src');winnerGhostB.alt='';
        winnerArt.classList.remove('duo');
        winnerArt.classList.remove('hidden');
      }else if(w1?.char?.portrait){
        winnerImg.src=w1.char.portrait;winnerImg.alt=`${w1.name} — survivor`;winnerImg.classList.remove('hidden');
        winnerGhostA.src=w1.char.portrait;winnerGhostA.classList.remove('hidden');
        winnerGhostB.src=(w1.char.favouriteFood?.asset||w1.char.portrait);winnerGhostB.alt=`${w1.name} favourite food`;winnerGhostB.classList.remove('hidden');
        if(w2?.char?.portrait){winnerImg2.src=w2.char.portrait;winnerImg2.alt=`${w2.name} — survivor`;winnerImg2.classList.remove('hidden');winnerArt.classList.add('duo');}
        else{winnerImg2.classList.add('hidden');winnerImg2.removeAttribute('src');winnerArt.classList.remove('duo');}
        winnerArt.classList.remove('hidden');
      }else{
        winnerArt.classList.add('hidden');winnerArt.classList.remove('duo');
        [winnerImg,winnerImg2,winnerGhostA,winnerGhostB].forEach(img=>{if(img){img.removeAttribute('src');img.alt='';img.classList.add('hidden');}});
      }

      if(!winners.length){
        $('#resultTitle').textContent='TOTAL SYSTEM FAILURE';
        $('#resultText').textContent='Nobody reached porcelain safety. The labyrinth is now a biohazard and should probably be condemned.';
      }else if(toiletWin){
        const localWon=winners.some(w=>w.isLocal);
        if(winners.length>=2){
          $('#resultTitle').textContent=localWon?'YOU SURVIVED!':`${w1.name.toUpperCase()} + ${w2.name.toUpperCase()} SURVIVE`;
          $('#resultText').textContent=`${w1.name} claimed one throne. ${w2.name} claimed the other. The remaining racers experienced an immediate catastrophic loss of dignity.`;
        }else{
          $('#resultTitle').textContent=w1.isLocal?'YOU SURVIVED ALONE!':`${w1.name.toUpperCase()} SURVIVES`;
          $('#resultText').textContent=`${w1.name} found porcelain safety. Everyone else failed before the second throne could be claimed.`;
        }
      }else{
        $('#resultTitle').textContent=w1.isLocal?'YOU ESCAPED!':`${w1.name.toUpperCase()} WINS`;
        $('#resultText').textContent=`${w1.name} escaped before the bowel emergency escalated. An unusually clean outcome.`;
      }

      if(multiplayer.active){
        $('#resultLevel').textContent=`COMPLETED FOOD COURT ${activeLevelIndex+1} • ${activeLevel.name}`;
        const provisional=rows.map(r=>({...r,totalScore:Number(roomState?.players?.find(p=>p.id===r.id)?.score||0)+r.roundScore}));
        renderScoreboard(provisional);
        if(rematchInfo) applyPostgame(rematchInfo);
        else {
          $('#againBtn').disabled=true;
          $('#againBtn').textContent='SYNCING REMATCH…';
          $('#rematchCountdown').classList.remove('hidden');
          $('#rematchStatus').textContent='Syncing the next food court with the room…';
        }
      }else{
        $('#rematchCountdown').classList.add('hidden');
        renderScoreboard(rows.map(r=>({...r,totalScore:soloScoreTotals.get(r.id)||r.roundScore})));
        const nextIndex=Math.min(activeLevelIndex+1,levelCount()-1),next=levelFor(nextIndex);
        $('#resultLevel').textContent=activeLevelIndex<levelCount()-1
          ? `NEXT: FOOD COURT ${nextIndex+1} • ${next.name}`
          : `FINAL FOOD COURT • ${activeLevel.name} • RELIEF PICKUPS ACTIVE`;
        $('#againBtn').textContent=activeLevelIndex<levelCount()-1?'Next Food Court':'Race Again';
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
      refreshSpecial(p,now);
      const invincible=now<(p.invincibleUntil||0);
      const tpShield=p.char.special?.id==='tpShield'&&now<(p.specialActiveUntil||0);
      if(!p.pooped&&!p.won&&!p.finished&&!invincible&&!tpShield){
        const baseRise=phase==='crisis'?CFG.race.baseBowelRiseCrisis:CFG.race.baseBowelRiseNormal;
        const levelBowel=Number(activeLevel.bowelMultiplier||1);
        const routeMultiplier=phase==='crisis'?updateGutRouteDiscipline(p,dt):1;
        p.bowel=Math.min(100,p.bowel+baseRise*levelBowel*routeMultiplier*(p.char.stats.bowelRate||1)*dt);
      }

      if(p.isLocal)updateHuman(p,dt,now);
      else if(p.isRemoteHuman)updateRemoteHuman(p,dt,now);
      else updateAI(p,dt,now);
      updateActiveSpecial(p,now);
    });

    // Matching favourite-food 1UPs work in every phase. Medicine only appears
    // in the larger courts and only matters once bowel mode is active.
    checkFavoriteFoodPickups(now);
    checkReliefPickups();
    checkTraps(now);
    players.forEach(p=>{
      if(p.bowel>=100&&!p.pooped&&!p.won&&now>=(p.invincibleUntil||0)){
        p.pooped=true;p.finished=true;
        p.sprinting=false;
        AUDIO.poopSting();
        if(p.isLocal) banner('💩 CATASTROPHIC FAILURE. MOVEMENT PRIVILEGES REVOKED.',3200,true);
      }
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
    if(!p || phase!=='crisis'||p.won){
      radar.classList.add('hidden');
      return;
    }
    radar.classList.remove('hidden');
    radar.classList.toggle('reveal',toiletRevealActive);
    const target=nearestOpenToilet(p);
    if(!target){radar.classList.add('hidden');return;}
    const dx=(target.x+.5)-p.x,dy=(target.y+.5)-p.y;
    const screenDx=dx-dy;
    const screenDy=(dx+dy)*.50;
    const angle=Math.atan2(screenDy,screenDx)*180/Math.PI;
    $('#toiletArrow').style.transform=`rotate(${angle}deg)`;
    $('#toiletBearing').textContent=toiletRevealActive?'TOILETS LOCATED!':toiletBearingLabel(dx,dy);
    $('#toiletDistance').textContent=`${Math.max(0,Math.round(Math.hypot(dx,dy)))} TILES • ${openToilets().length} OPEN`;
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
    if(phase==='crisis'){
      const left=openToilets().length;
      $('#objectiveText').textContent=p.won?'SAFE':(left?`🚽 ${left} TOILET${left===1?'':'S'}`:'SAFE');
    }

    const card=$('#panicCard');
    card.classList.toggle('warning',bowel>=68&&bowel<88);
    card.classList.toggle('critical',bowel>=88);
    card.classList.toggle('crisis-mode',phase==='crisis');
    $('#crisisRisk').classList.toggle('hot',phase==='crisis'&&p.sprinting);

    const special=p.char.special,now=performance.now();
    refreshSpecial(p,now);
    const desktopSpecial=$('#specialBtn'),mobileSpecial=$('#touchSpecialBtn');
    if(special){
      desktopSpecial?.classList.remove('hidden');mobileSpecial?.classList.remove('hidden');
      const recharging=p.specialCharges<=0&&p.specialRechargeAt>now;
      const secs=recharging?Math.max(1,Math.ceil((p.specialRechargeAt-now)/1000)):0;
      if(desktopSpecial){desktopSpecial.disabled=recharging||p.pooped||p.finished;desktopSpecial.textContent=recharging?`${special.name} ${secs}s`:`${special.name} [E] • ${p.specialCharges}`;}
      if(mobileSpecial){mobileSpecial.disabled=recharging||p.pooped||p.finished;mobileSpecial.querySelector('span').textContent=recharging?`${secs}s`:'USE';mobileSpecial.querySelector('b').textContent=special.name.replace(/ .*/, '');}
    }else{desktopSpecial?.classList.add('hidden');mobileSpecial?.classList.add('hidden');}
    const invincible=now<(p.invincibleUntil||0);
    const tpShield=p.char.special?.id==='tpShield'&&now<(p.specialActiveUntil||0);
    $('#panicCard').classList.toggle('invincible',invincible||tpShield);
    if(invincible){$('#panicStage').textContent='1UP INVINCIBLE';$('#panicFace').textContent='⭐';}
    else if(tpShield){$('#panicStage').textContent='TP FORTRESS';$('#panicFace').textContent='🧻';}

    const panicIntensity=phase==='crisis'?clamp((bowel-35)/65,0,1):0;
    $('#panicFx').style.setProperty('--panic',panicIntensity.toFixed(3));
    AUDIO.setPanicLevel(panicIntensity);
    updateToiletRadar();
  }

  // ============================================================
  // RENDERING
  // ============================================================
  // Every Food Court gets its own deterministic brick colour. The hue rotates
  // through a broad palette while the floors stay dark enough for racers/HUD
  // to remain readable. No server sync is required because level index is shared.
  function courtPalette(index=activeLevelIndex){
    const hue=(326 + (Number(index)||0)*47) % 360;
    const hue2=(hue+18)%360;
    return {
      wallTop:`hsl(${hue} 31% 28%)`,
      wallSide:`hsl(${hue2} 24% 17%)`,
      wallDebris:`hsl(${hue} 32% 43%)`,
      overviewWall:`hsl(${hue} 25% 24%)`,
      floorA:`hsl(${hue} 10% 10%)`,
      floorB:`hsl(${hue} 11% 12%)`,
      resultWall:`hsl(${hue} 24% 23%)`,
      resultFloor:`hsl(${hue} 9% 9%)`
    };
  }

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
    const palette=courtPalette();
    ctx.fillStyle='#09090a';ctx.fillRect(0,0,innerWidth,innerHeight);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      ctx.fillStyle=maze[y][x]?palette.overviewWall:palette.floorA;
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
    if(phase==='crisis'){
      toilets.forEach((t,i)=>{ctx.fillStyle=t.claimedBy?'#647078':'#70d7ff';ctx.beginPath();ctx.arc(ox+(t.x+.5)*cell,oy+(t.y+.5)*cell,Math.max(5,cell),0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font=`900 ${Math.max(8,cell)}px system-ui`;ctx.fillText(`🚽${i+1}`,ox+(t.x+.5)*cell,oy+(t.y+.5)*cell-8);});
      players.forEach(pl=>{ctx.fillStyle=pl.won?'#d7ff55':(pl.pooped?'#7a5a4d':pl.color);ctx.beginPath();ctx.arc(ox+pl.x*cell,oy+pl.y*cell,Math.max(3,cell*.7),0,Math.PI*2);ctx.fill();});
    }
    ctx.restore();
    $('#introCaption').textContent=`FOOD COURT ${activeLevelIndex+1}/${levelCount()} • ${activeLevel.name} • MEMORIZE IT.`;
  }

  function drawReliefItem(item,camx,camy,scale,now,fogRadius,p){
    if(!item.active || phase!=='crisis')return;
    if(Math.hypot(item.x-p.x,item.y-p.y)>fogRadius)return;
    const pr=project(item.x,item.y,camx,camy,scale);
    if(pr.x<-70||pr.x>innerWidth+70||pr.y<-90||pr.y>innerHeight+90)return;
    const pulse=1+Math.sin(now*.008+item.x)*.08;
    ctx.save();ctx.translate(pr.x,pr.y-pr.th*.50);ctx.scale(pulse,pulse);
    ctx.shadowColor=item.type==='pepto'?'#ff6fb8':'#f5e7ff';ctx.shadowBlur=18*scale;
    if(item.type==='pepto'){
      ctx.fillStyle='#ff73b5';ctx.strokeStyle='#ffd1e8';ctx.lineWidth=2;
      ctx.beginPath();ctx.roundRect(-11*scale,-20*scale,22*scale,30*scale,5*scale);ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';ctx.fillRect(-7*scale,-25*scale,14*scale,6*scale);
      ctx.fillStyle='#5e173d';ctx.font=`900 ${11*scale}px system-ui`;ctx.textAlign='center';ctx.fillText('P',0,1*scale);
    }else{
      ctx.fillStyle='#fff3f8';ctx.strokeStyle='#ff94bd';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(-5*scale,-4*scale,9*scale,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(7*scale,2*scale,8*scale,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='#d83f77';ctx.font=`900 ${9*scale}px system-ui`;ctx.textAlign='center';ctx.fillText('T',-5*scale,-1*scale);
    }
    ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font=`900 ${8*scale}px system-ui`;ctx.textAlign='center';ctx.fillText(reliefLabel(item),0,18*scale);
    ctx.restore();
  }

  function drawFoodItem(item,camx,camy,scale,now,fogRadius,p){
    if(!item.active||Math.hypot(item.x-p.x,item.y-p.y)>fogRadius)return;
    const pr=project(item.x,item.y,camx,camy,scale);
    if(pr.x<-80||pr.x>innerWidth+80||pr.y<-100||pr.y>innerHeight+100)return;
    const img=getImage(item.asset),pulse=1+Math.sin(now*.007+item.x)*.07;
    ctx.save();ctx.translate(pr.x,pr.y-pr.th*.52);ctx.scale(pulse,pulse);
    ctx.shadowColor='#d7ff55';ctx.shadowBlur=16*scale;
    if(img)ctx.drawImage(img,-18*scale,-18*scale,36*scale,36*scale);
    else{ctx.font=`${24*scale}px system-ui`;ctx.textAlign='center';ctx.fillText('⭐',0,4*scale);}
    ctx.shadowBlur=0;ctx.fillStyle='#d5ff4f';ctx.font=`1000 ${8*scale}px system-ui`;ctx.textAlign='center';ctx.fillText('1UP',0,24*scale);
    ctx.restore();
  }

  function drawTrap(trap,camx,camy,scale,now,fogRadius,p){
    if(!trap.active||Math.hypot(trap.x-p.x,trap.y-p.y)>fogRadius)return;
    const pr=project(trap.x,trap.y,camx,camy,scale);
    ctx.save();ctx.translate(pr.x,pr.y-pr.th*.40);
    ctx.globalAlpha=.9;ctx.font=`${22*scale}px system-ui`;ctx.textAlign='center';
    ctx.fillText(trap.type==='milk'?'🥤':(trap.type==='spice'?'🔥':'🫘'),0,0);
    ctx.restore();
  }

  function drawIso(now,camx,camy,scale,intro=false,alpha=1,viewPlayer=null){
    const p=viewPlayer||localPlayer();
    const palette=courtPalette();
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
        ctx.fillStyle=((x+y)&1)?palette.floorA:palette.floorB;diamond(ctx,pr.x,pr.y,pr.tw,pr.th);
      } else {
        // During bowel mode the structure itself looks unstable. This is
        // cosmetic only: collision walls do not actually move.
        const rumbleFactor=(SETTINGS?.get('rumbleStrength') ?? 85)/100;
        const wallRumble=(phase==='crisis'&&!intro)?(CFG.camera.crisisWallRumblePixels||1.7)*rumbleFactor:0;
        const jx=wallRumble?Math.sin(now*.023+x*1.71+y*.37)*wallRumble:0;
        const jy=wallRumble?Math.cos(now*.019+x*.44+y*1.39)*wallRumble:0;
        ctx.fillStyle=palette.wallTop;diamond(ctx,pr.x+jx,pr.y-pr.th*.34+jy,pr.tw,pr.th);
        ctx.fillStyle=palette.wallSide;wallSides(ctx,pr.x+jx,pr.y+jy,pr.tw,pr.th*.95);
        if(wallRumble && ((x*17+y*31)%29===0)){
          ctx.fillStyle=palette.wallDebris;
          ctx.fillRect(pr.x+jx+Math.sin(now*.01+x)*8,pr.y+jy+pr.th*.55,2.3,2.3);
        }
      }
    }

    // Food stand marker makes the starting plaza visually memorable.
    if(intro || Math.hypot(start.x+.5-p.x,start.y+.5-p.y)<=fogRadius){
      drawMarker(start.x+.5,start.y+.5,'BAD LUNCH','🌮🍛',camx,camy,scale,true);
    }

    const exitVisible=intro||Math.hypot(exit.x+.5-p.x,exit.y+.5-p.y)<=fogRadius;
    drawMarker(exit.x+.5,exit.y+.5,'EXIT','🏁',camx,camy,scale,exitVisible);
    if(phase==='crisis'){
      toilets.forEach((t,i)=>{
        const visible=toiletRevealActive||Math.hypot(t.x+.5-p.x,t.y+.5-p.y)<=fogRadius;
        if(visible&&!t.claimedBy){
          const tp=project(t.x+.5,t.y+.5,camx,camy,scale),pulse=1+Math.sin(now*.009+i)*.18;
          ctx.save();ctx.strokeStyle='rgba(92,225,255,.86)';ctx.lineWidth=3;
          ctx.beginPath();ctx.arc(tp.x,tp.y-12*scale,32*scale*pulse,0,Math.PI*2);ctx.stroke();
          ctx.globalAlpha=.35;ctx.lineWidth=7;ctx.beginPath();ctx.arc(tp.x,tp.y-12*scale,47*scale*pulse,0,Math.PI*2);ctx.stroke();ctx.restore();
        }
        drawMarker(t.x+.5,t.y+.5,t.claimedBy?'CLAIMED':(toiletRevealActive?`TOILET ${i+1}`:'TOILET'),'🚽',camx,camy,scale,visible);
      });
    }

    // Never bait the local player with somebody else's 1UP. Other racers'
    // favourite foods still exist on the authoritative host simulation, but
    // this client only sees the pickup it can actually collect.
    foodItems.filter(isMyFavoriteFood).forEach(item=>drawFoodItem(item,camx,camy,scale,now,fogRadius,p));
    traps.forEach(t=>drawTrap(t,camx,camy,scale,now,fogRadius,p));
    if(phase==='crisis' && reliefItems.length)reliefItems.forEach(item=>drawReliefItem(item,camx,camy,scale,now,fogRadius,p));

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

  function spriteSheetState(p,now){
    if(p.pooped) return 'pooped';
    if(p.won) return 'safe';
    if(now<(p.specialAnimUntil||0)) return 'special';
    if(now<(p.invincibleUntil||0)) return 'oneUp';
    if(now<(p.trapSlowUntil||0)) return 'stunned';
    if(phase==='crisis') return 'bowel';
    if(p.isMoving) return 'walk';
    return 'idle';
  }

  function drawSpriteSheetCharacter(p,scale,now){
    const sheet=p.char.spriteSheet;
    if(!sheet?.asset)return false;
    const img=getImage(sheet.asset);
    if(!img)return false;

    const state=spriteSheetState(p,now);
    const anim=sheet.animations?.[state]||sheet.animations?.idle;
    const frames=anim?.frames||[0];
    const fps=Math.max(.1,Number(anim?.fps||6));
    const frame=frames[Math.floor(now/(1000/fps))%frames.length]||0;
    const cell=Number(sheet.cellSize||256);
    const cols=Number(sheet.columns||4);
    const sx=(frame%cols)*cell,sy=Math.floor(frame/cols)*cell;
    const size=Number(sheet.renderSize||72)*scale;
    const anchorRatio=Number(sheet.footAnchorY||244)/cell;
    const localFootY=(CFG.movement.playerFootAnchorY ?? 27)*scale;
    const dy=localFootY-anchorRatio*size;

    // Reuse one 3/4 sprite and mirror it according to projected screen travel.
    const screenDx=Math.cos(p.dir)-Math.sin(p.dir);
    const flip=screenDx<-.08;
    ctx.save();
    if(flip)ctx.scale(-1,1);
    ctx.drawImage(img,sx,sy,cell,cell,-size/2,dy,size,size);
    ctx.restore();
    return true;
  }

  function drawPlayer(p,camx,camy,scale,now){
    const pr=project(p.x,p.y,camx,camy,scale);
    if(pr.x<-100||pr.x>innerWidth+100||pr.y<-100||pr.y>innerHeight+100)return;
    const panic=clamp((p.bowel-55)/45,0,1);
    const wob=Math.sin(now/75+p.wiggle)*panic*11;
    const bob=p.sprinting?Math.sin(now/52+p.wiggle)*4.5:Math.sin(now/130+p.wiggle)*1.6;
    const squat=p.pooped?17:panic*7;

    if(now<(p.invincibleUntil||0)||(p.char.special?.id==='tpShield'&&now<(p.specialActiveUntil||0))){
      const pulse=1+Math.sin(now*.012+p.wiggle)*.12;
      ctx.save();ctx.strokeStyle='#d7ff55';ctx.lineWidth=3*scale;ctx.globalAlpha=.8;
      ctx.shadowColor='#d7ff55';ctx.shadowBlur=20*scale;ctx.beginPath();ctx.ellipse(pr.x,pr.y,20*scale*pulse,9*scale*pulse,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }

    ctx.save();
    // p.x/p.y is the ground-contact point used by collision. Draw the feet on
    // that exact point so the player no longer appears to walk below the cell
    // they can actually occupy. Panic squat/bob move the body, not the hitbox.
    const footAnchor=(CFG.movement.playerFootAnchorY ?? 27)*scale;
    ctx.translate(pr.x,pr.y-footAnchor+squat+bob);
    ctx.rotate(wob*Math.PI/180);

    const usedSheet=drawSpriteSheetCharacter(p,scale,now);
    if(!usedSheet){
      const sprite=getImage(p.char.sprite);
      if(sprite && !p.pooped){
        const size=48*scale;
        // Sprite bottom is its foot/contact point, matching the puppet rig.
        ctx.drawImage(sprite,-size/2,-size,size,size);
      } else {
        drawPuppet(p,scale,now,panic,p.pooped);
      }
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
      const exitHold=CFG.camera.introExitHoldMs||1200;
      const exitZoom=CFG.camera.introExitZoomOutMs||1850;
      const depthHold=CFG.camera.introDepthHoldMs||1450;
      const startZoom=CFG.camera.introStartZoomInMs||2250;
      const exitZoomEnd=exitHold+exitZoom;
      const depthHoldEnd=exitZoomEnd+depthHold;
      const introEnd=depthHoldEnd+startZoom;
      const fitScale=Math.min(innerWidth/(W*TILE*.72),innerHeight/(H*TILE*.37),.48);
      const exitCloseScale=Math.max(CFG.camera.playScale*1.22,1.55);
      const mazeCenterX=W*.5,mazeCenterY=H*.5;

      $('#countdown').classList.add('hidden');

      // 1) Establish the destination at the exact same isometric/playable
      // camera angle used during the race.
      if(elapsed<exitHold){
        drawIso(now,exit.x+.5,exit.y+.5,exitCloseScale,true,1);
        $('#introCaption').textContent="THERE'S THE EXIT — REMEMBER WHERE IT IS.";
        return;
      }

      // 2) Keep the isometric camera and pull far back toward the court centre.
      // No flat bird's-eye cut: the walls retain their depth the whole time.
      if(elapsed<exitZoomEnd){
        const t=ease((elapsed-exitHold)/exitZoom);
        const camx=lerp(exit.x+.5,mazeCenterX,t);
        const camy=lerp(exit.y+.5,mazeCenterY,t);
        const scale=lerp(exitCloseScale,fitScale,t);
        drawIso(now,camx,camy,scale,true,1);
        $('#introCaption').textContent=t<.48?'PULLING BACK...':'LOOK AT THE DEPTH — LOCK IN THE EXIT.';
        return;
      }

      // 3) Hold the whole labyrinth in the same playable perspective so the
      // maze reads as a large physical space instead of a diagram.
      if(elapsed<depthHoldEnd){
        drawIso(now,mazeCenterX,mazeCenterY,fitScale,true,1);
        $('#introCaption').textContent='FULL COURT — SAME ANGLE. REMEMBER THE ROUTE.';
        return;
      }

      // 4) Fly from the distant isometric overview into the shared centre
      // start, then unlock controls on GO.
      const t=ease((elapsed-depthHoldEnd)/startZoom);
      const camx=lerp(mazeCenterX,start.x+.5,t);
      const camy=lerp(mazeCenterY,start.y+.5,t);
      const scale=lerp(fitScale,CFG.camera.playScale,t);
      drawIso(now,camx,camy,scale,true,1);
      $('#introCaption').textContent=t<.42?'DIVING TO THE START...':t<.64?'GET READY.':'GO ON THE BEEP.';
      if(t>.46){
        $('#countdown').classList.remove('hidden');
        $('#countdown').textContent=t<.62?'3':t<.77?'2':t<.92?'1':'GO!';
      }
      if(elapsed>=introEnd)beginRace(now);
      return;
    }

    const p=localPlayer();
    if(phase==='crisis'&&p?.won&&openToilets().length){
      if(!spectatorActive)enterSpectatorMode();
      const option=currentSpectatorOption();
      if(option.type==='map'||!option.player){
        drawTopDownOverview(1);
        $('#introCaption').classList.add('hidden');
      }else{
        const watched=option.player;
        const watchedPanic=clamp((watched.bowel-55)/45,0,1);
        const rumbleFactor=(SETTINGS?.get('rumbleStrength') ?? 55)/100;
        const shake=((CFG.camera.crisisWorldRumblePixels||3.8)*rumbleFactor)+(watchedPanic*2.0*rumbleFactor);
        ctx.save();
        ctx.translate(Math.sin(now*.052)*shake*.55,Math.cos(now*.061)*shake*.42);
        drawIso(now,watched.x,watched.y,CFG.camera.playScale,false,1,watched);
        ctx.restore();
      }
      updateSpectatorHud();
      return;
    }else if(spectatorActive){
      leaveSpectatorMode();
    }

    // Bowel-event reveal: show BOTH one-use toilets before returning to the
    // racer. Afterward the radar always points to the nearest unclaimed throne.
    let camx=p.x,camy=p.y;
    if(phase==='crisis' && toiletRevealActive){
      const fly=CFG.camera.toiletRevealFlyMs||1050;
      const hold=CFG.camera.toiletRevealHoldMs||1150;
      const back=CFG.camera.toiletRevealReturnMs||1050;
      const a=toiletRevealTargets[0]||toilets[0]||toilet;
      const b=toiletRevealTargets[1]||toilets[1]||a;
      const elapsed=now-toiletRevealStart;
      const total=fly+hold+fly+hold+back;
      if(elapsed<fly){
        const t=ease(elapsed/fly);camx=lerp(toiletRevealFrom.x,a.x+.5,t);camy=lerp(toiletRevealFrom.y,a.y+.5,t);
      }else if(elapsed<fly+hold){
        camx=a.x+.5;camy=a.y+.5;
      }else if(elapsed<fly+hold+fly){
        const t=ease((elapsed-fly-hold)/fly);camx=lerp(a.x+.5,b.x+.5,t);camy=lerp(a.y+.5,b.y+.5,t);
      }else if(elapsed<fly+hold+fly+hold){
        camx=b.x+.5;camy=b.y+.5;
      }else if(elapsed<total){
        const t=ease((elapsed-(fly+hold+fly+hold))/back);camx=lerp(b.x+.5,p.x,t);camy=lerp(b.y+.5,p.y,t);
      }else{
        toiletRevealActive=false;$('#toiletRadar').classList.remove('reveal');
        banner('🚽 TWO TOILETS LOCATED. RADAR TRACKS THE NEAREST OPEN ONE.',2800,true);updateToiletRadar();
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
    const palette=courtPalette();

    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      mctx.fillStyle=maze[y][x]?palette.overviewWall:palette.floorA;
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
    if(phase==='crisis'){
      toilets.forEach(t=>cellDot(t.x,t.y,t.claimedBy?'#52626a':'#70d7ff',7));
      reliefItems.filter(i=>i.active).forEach(i=>worldDot(i.x,i.y,i.type==='pepto'?'#ff67ad':'#ffd5e8',2.5));
    }
    foodItems.filter(i=>i.active&&isMyFavoriteFood(i)).forEach(i=>worldDot(i.x,i.y,'#d7ff55',2.4));
    players.forEach(p=>worldDot(p.x,p.y,p.isLocal?'#fff':p.color,p.isLocal?5:3));
  }

  function drawResult(){
    const dpr=Math.min(devicePixelRatio||1,2);
    rctx.setTransform(dpr,0,0,dpr,0,0);
    rctx.clearRect(0,0,innerWidth,innerHeight);
    rctx.fillStyle='#100d10';rctx.fillRect(0,0,innerWidth,innerHeight);
    if(!resultData)return;

    const {toiletWin}=resultData;
    const palette=courtPalette();
    const sx=Math.min(innerWidth/(W+4),innerHeight/(H+10)),ox=(innerWidth-W*sx)/2,oy=20;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      rctx.fillStyle=maze[y][x]?palette.resultWall:palette.resultFloor;
      rctx.fillRect(ox+x*sx,oy+y*sx,sx+.5,sx+.5);
    }
    players.forEach(p=>{
      rctx.font=`${Math.max(12,sx*1.8)}px system-ui`;rctx.textAlign='center';
      rctx.fillText(p.won?p.icon:(toiletWin?'💩':p.icon),ox+p.x*sx,oy+p.y*sx);
    });
    if(toiletWin){
      rctx.font=`${Math.max(16,sx*2.2)}px system-ui`;
      toilets.forEach(t=>rctx.fillText('🚽',ox+(t.x+.5)*sx,oy+(t.y+.5)*sx));
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

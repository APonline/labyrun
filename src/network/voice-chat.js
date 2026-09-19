(() => {
  'use strict';

  const MP = window.LabyrunMultiplayer;
  const NET = window.LABYRUN_NETWORK_CONFIG || {};
  const peers = new Map();
  const analysers = new Map();
  const audioEls = new Map();
  const listeners = new Map();
  let localStream = null;
  let muted = false;
  let deafened = false;
  let audioContext = null;
  let meterTimer = null;
  let roster = [];

  function emit(type,payload){ (listeners.get(type)||[]).forEach(fn=>{ try{fn(payload);}catch(e){console.error(e);} }); }
  function on(type,fn){ if(!listeners.has(type)) listeners.set(type,[]); listeners.get(type).push(fn); return()=>{const a=listeners.get(type)||[];const i=a.indexOf(fn);if(i>=0)a.splice(i,1);}; }

  function pcFor(peerId){
    if(peers.has(peerId)) return peers.get(peerId);
    const pc = new RTCPeerConnection({iceServers: NET.iceServers || []});
    peers.set(peerId, pc);

    if(localStream){ localStream.getTracks().forEach(track => pc.addTrack(track, localStream)); }

    pc.onicecandidate = e => { if(e.candidate) MP.voiceCandidate(peerId, e.candidate); };
    pc.ontrack = e => attachRemote(peerId, e.streams[0]);
    pc.onconnectionstatechange = () => {
      emit('peer:state',{peerId,state:pc.connectionState});
      if(['failed','closed'].includes(pc.connectionState)) closePeer(peerId);
    };
    return pc;
  }

  function audioCtx(){
    if(!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if(audioContext.state === 'suspended') audioContext.resume().catch(()=>{});
    return audioContext;
  }

  function addAnalyser(id,stream){
    try{
      const ctx=audioCtx();
      const src=ctx.createMediaStreamSource(stream);
      const analyser=ctx.createAnalyser();
      analyser.fftSize=256;
      src.connect(analyser);
      analysers.set(id,{analyser,data:new Uint8Array(analyser.fftSize)});
      startMeter();
    }catch(e){ console.warn('[LABYRUN voice meter]',e); }
  }

  function attachRemote(peerId, stream){
    let el = audioEls.get(peerId);
    if(!el){
      el=document.createElement('audio');
      el.autoplay=true; el.playsInline=true;
      el.dataset.peerId=peerId;
      el.style.display='none';
      document.body.appendChild(el);
      audioEls.set(peerId,el);
    }
    el.srcObject=stream;
    el.muted=deafened;
    el.play().catch(()=>{});
    addAnalyser(peerId,stream);
    emit('peer:state',{peerId,state:'connected'});
  }

  function levelFor(entry){
    entry.analyser.getByteTimeDomainData(entry.data);
    let sum=0;
    for(const v of entry.data){ const d=(v-128)/128; sum+=d*d; }
    return Math.sqrt(sum/entry.data.length);
  }

  function startMeter(){
    if(meterTimer) return;
    meterTimer=setInterval(()=>{
      const levels={};
      for(const [id,a] of analysers) levels[id]=levelFor(a);
      emit('levels',levels);
    },120);
  }

  async function makeOffer(peerId){
    if(!localStream) return;
    const pc=pcFor(peerId);
    if(pc.signalingState !== 'stable' || pc.connectionState==='connected' || pc.connectionState==='connecting' || pc._labyrunOfferStarted) return;
    pc._labyrunOfferStarted=true;
    try{
      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      MP.voiceOffer(peerId,pc.localDescription);
    }catch(err){
      pc._labyrunOfferStarted=false;
      throw err;
    }
  }

  async function handleOffer({from,description}){
    if(!localStream) return;
    const pc=pcFor(from);
    await pc.setRemoteDescription(description);
    const answer=await pc.createAnswer();
    await pc.setLocalDescription(answer);
    MP.voiceAnswer(from,pc.localDescription);
  }

  async function handleAnswer({from,description}){
    const pc=peers.get(from); if(!pc) return;
    if(pc.signalingState==='have-local-offer') await pc.setRemoteDescription(description);
  }

  async function handleCandidate({from,candidate}){
    const pc=pcFor(from);
    try{ await pc.addIceCandidate(candidate); }catch(e){ console.warn('[LABYRUN ICE]',e); }
  }

  function closePeer(peerId){
    try{peers.get(peerId)?.close();}catch(_){}
    peers.delete(peerId);
    analysers.delete(peerId);
    const el=audioEls.get(peerId);
    if(el){ try{el.remove();}catch(_){} audioEls.delete(peerId); }
    emit('peer:state',{peerId,state:'closed'});
  }

  function syncPeers(nextRoster){
    roster=Array.isArray(nextRoster)?nextRoster:[];
    if(!localStream) return;
    const me=MP.getMyId();
    const active=new Set(roster.filter(p=>p.id!==me&&p.voiceEnabled).map(p=>p.id));
    [...peers.keys()].forEach(id=>{if(!active.has(id))closePeer(id);});
    active.forEach(id=>{
      pcFor(id);
      // Exactly one side initiates to avoid offer glare.
      if(String(me)<String(id)) makeOffer(id).catch(console.warn);
    });
  }

  async function join(){
    if(localStream) return localStream;
    if(!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires HTTPS and a supported browser.');
    localStream=await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}, video:false
    });
    muted=false;
    addAnalyser(MP.getMyId()||'local',localStream);
    MP.updatePlayer({voiceEnabled:true});
    emit('state',getState());
    syncPeers(roster);
    return localStream;
  }

  function leave(){
    [...peers.keys()].forEach(closePeer);
    if(localStream){ localStream.getTracks().forEach(t=>t.stop()); localStream=null; }
    analysers.clear();
    MP.updatePlayer({voiceEnabled:false});
    emit('state',getState());
  }

  function toggleMute(){
    if(!localStream) return false;
    muted=!muted;
    localStream.getAudioTracks().forEach(t=>t.enabled=!muted);
    emit('state',getState());
    return muted;
  }

  function toggleDeafen(){
    deafened=!deafened;
    audioEls.forEach(el=>el.muted=deafened);
    emit('state',getState());
    return deafened;
  }

  function getState(){ return {joined:!!localStream,muted,deafened,peerCount:peers.size}; }

  MP.on('room:state', s => syncPeers(s?.players||[]));
  MP.on('voice:offer', p => handleOffer(p).catch(console.warn));
  MP.on('voice:answer', p => handleAnswer(p).catch(console.warn));
  MP.on('voice:candidate', p => handleCandidate(p).catch(console.warn));
  MP.on('voice:peer-left', p => closePeer(p?.id));

  window.LabyrunVoice={on,join,leave,toggleMute,toggleDeafen,getState,syncPeers};
})();

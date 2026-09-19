const express = require('express');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const allowedOrigins = String(process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || '')
  .split(',').map(v=>v.trim()).filter(Boolean);

const io = new Server(server, {
  cors: {
    origin(origin, cb){
      if(!origin || !allowedOrigins.length || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null,true);
      cb(new Error('Origin not allowed'));
    },
    methods:['GET','POST']
  },
  pingInterval: 20000,
  pingTimeout: 20000
});

const rooms = new Map();
const MAX_PLAYERS = 4;
const LEVEL_COUNT = Math.max(1, Number(process.env.LABYRUN_LEVEL_COUNT || 50));
const REMATCH_MS = Math.max(5000, Number(process.env.LABYRUN_REMATCH_MS || 20000));
const CHAR_IDS = new Set(['taco-tony','curry-barry','gassy-cassie','digestive-dale','brenda-beans','nervous-niko','colon-colin','spicy-priya']);

app.get('/', (_req,res)=>res.json({name:'LABYRUN multiplayer server',ok:true,rooms:rooms.size}));
app.get('/health', (_req,res)=>res.json({ok:true,rooms:rooms.size,connections:io.engine.clientsCount}));

function cleanCode(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8); }
function cleanName(v){ return String(v||'Player').replace(/[<>]/g,'').trim().slice(0,18) || 'Player'; }
function makeCode(){
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code='';
  do {
    code='';
    const bytes=crypto.randomBytes(6);
    for(let i=0;i<6;i++) code+=alphabet[bytes[i]%alphabet.length];
  } while(rooms.has(code));
  return code;
}
function makeSeed(){ return crypto.randomBytes(4).readUInt32LE(0); }
function makeRaceId(room){
  room.raceSeq=(room.raceSeq||0)+1;
  return `${room.code}-${room.raceSeq}-${makeSeed().toString(36)}`;
}
function roomOf(socket){ const code=socket.data.roomCode; return code ? rooms.get(code) : null; }
function sameRoom(a,b){ return !!a && !!b && a===b; }
function getPlayer(room,id){ return room?.players.get(id); }

function publicPostgame(room){
  if(!room.postgame) return null;
  return {
    rematchAt:room.postgame.rematchAt,
    nextLevelIndex:room.postgame.nextLevelIndex,
    votes:room.postgame.votes.size,
    players:room.players.size
  };
}

function publicRoom(room){
  return {
    code:room.code,
    hostId:room.hostId,
    gameActive:!!room.game,
    levelIndex:room.levelIndex||0,
    postgame:publicPostgame(room),
    players:[...room.players.values()].map(p=>({
      id:p.id,name:p.name,characterId:p.characterId||null,ready:!!p.ready,
      voiceEnabled:!!p.voiceEnabled,isHost:p.id===room.hostId
    }))
  };
}
function broadcastRoom(room){ io.to(room.code).emit('room:state',publicRoom(room)); }

function clearRematch(room){
  if(room.rematchTimer){ clearTimeout(room.rematchTimer); room.rematchTimer=null; }
  room.postgame=null;
}

function buildStartPayload(room){
  const humans=[...room.players.values()];
  const seed=makeSeed();
  const raceId=makeRaceId(room);
  const startDelayMs=2600;
  const startAt=Date.now()+startDelayMs;
  room.game={id:raceId,seed,startAt,startedBy:room.hostId,startedAt:null,levelIndex:room.levelIndex||0,world:null};
  return {
    code:room.code,raceId,seed,startAt,startDelayMs,hostId:room.hostId,
    levelIndex:room.levelIndex||0,
    humans:humans.map(p=>({id:p.id,name:p.name,characterId:p.characterId})),
    aiSlots:Math.max(0,MAX_PLAYERS-humans.length)
  };
}

function startRoomGame(room,{requireReady=true}={}){
  if(!room) throw new Error('Room not found.');
  if(room.game) throw new Error('Race already started.');
  const humans=[...room.players.values()];
  if(!humans.length) throw new Error('Nobody is in the room. Impressive.');
  if(humans.some(p=>!p.characterId)) throw new Error('Everyone must pick a racer first.');
  if(requireReady && humans.some(p=>!p.ready)) throw new Error('Everyone must pick a racer and ready up first.');

  clearRematch(room);
  const payload=buildStartPayload(room);
  io.to(room.code).emit('game:start',payload);
  broadcastRoom(room);
  return payload;
}

function emitPostgame(room){
  if(!room.postgame) return;
  io.to(room.code).emit('game:postgame',publicPostgame(room));
  broadcastRoom(room);
}

function scheduleRematch(room,{emit=true}={}){
  clearRematch(room);
  room.levelIndex=Math.min((room.levelIndex||0)+1,LEVEL_COUNT-1);
  room.postgame={
    rematchAt:Date.now()+REMATCH_MS,
    nextLevelIndex:room.levelIndex,
    votes:new Set()
  };
  const info=publicPostgame(room);
  if(emit) emitPostgame(room);
  room.rematchTimer=setTimeout(()=>{
    room.rematchTimer=null;
    if(!rooms.has(room.code) || room.game || !room.postgame || !room.players.size) return;
    try{
      // Nobody has to press anything. Everyone still in the room gets dragged
      // into the next progressively larger food court automatically.
      startRoomGame(room,{requireReady:false});
    }catch(e){
      clearRematch(room);
      io.to(room.code).emit('room:notice',`Automatic rematch stopped: ${e.message}`);
      room.players.forEach(p=>p.ready=false);
      broadcastRoom(room);
    }
  },REMATCH_MS);
  return info;
}

function maybeStartVotedRematch(room){
  if(!room?.postgame || room.game || !room.players.size) return;
  const all=[...room.players.keys()].every(id=>room.postgame.votes.has(id));
  if(!all) return;
  try{ startRoomGame(room,{requireReady:false}); }
  catch(e){ io.to(room.code).emit('room:notice',`Rematch stopped: ${e.message}`); }
}

function leaveRoom(socket,{disconnect=false}={}){
  const room=roomOf(socket);
  if(!room) return;
  const wasHost=room.hostId===socket.id;
  room.players.delete(socket.id);
  room.postgame?.votes.delete(socket.id);
  if(!disconnect) socket.leave(room.code);
  socket.data.roomCode=null;
  socket.to(room.code).emit('voice:peer-left',{id:socket.id});

  if(room.players.size===0){ clearRematch(room); rooms.delete(room.code); return; }

  if(wasHost){
    const hadActiveRound=!!room.game || !!room.postgame;
    room.hostId=[...room.players.keys()][0];
    room.game=null;
    clearRematch(room);
    room.players.forEach(p=>p.ready=false);
    if(hadActiveRound){
      io.to(room.code).emit('game:end',{
        reason:'host-left',
        message:'The host left. The round is over and everyone is back in the lobby.'
      });
    }
    io.to(room.code).emit('room:notice','Host left. A new host has been assigned.');
  } else if(room.postgame){
    emitPostgame(room);
    maybeStartVotedRematch(room);
  }
  broadcastRoom(room);
}

function joinRoom(socket,room,name){
  if(socket.data.roomCode && socket.data.roomCode!==room.code) leaveRoom(socket);
  if(room.game) throw new Error('That race is already in progress.');
  if(room.postgame) throw new Error('That room is between races. Try again when the next lobby opens.');
  if(!room.players.has(socket.id) && room.players.size>=MAX_PLAYERS) throw new Error('That room already has 4 players.');
  socket.join(room.code);
  socket.data.roomCode=room.code;
  if(!room.players.has(socket.id)){
    room.players.set(socket.id,{id:socket.id,name:cleanName(name),characterId:null,ready:false,voiceEnabled:false});
  } else {
    room.players.get(socket.id).name=cleanName(name);
  }
  broadcastRoom(room);
}

io.on('connection', socket => {
  socket.on('room:create',(payload={},ack=()=>{})=>{
    try{
      leaveRoom(socket);
      const code=makeCode();
      const room={code,hostId:socket.id,players:new Map(),game:null,postgame:null,rematchTimer:null,levelIndex:0,raceSeq:0,createdAt:Date.now()};
      rooms.set(code,room);
      joinRoom(socket,room,payload.name);
      ack({ok:true,code});
    }catch(e){ ack({ok:false,error:e.message}); }
  });

  socket.on('room:join',(payload={},ack=()=>{})=>{
    try{
      const code=cleanCode(payload.code);
      const room=rooms.get(code);
      if(!code) throw new Error('Enter a room code.');
      if(!room) throw new Error('Room not found. Check the code.');
      joinRoom(socket,room,payload.name);
      ack({ok:true,code});
    }catch(e){ ack({ok:false,error:e.message}); socket.emit('room:error',e.message); }
  });

  socket.on('room:leave',(_payload={},ack=()=>{})=>{ leaveRoom(socket); ack({ok:true}); });

  socket.on('player:update',(patch={})=>{
    const room=roomOf(socket),player=getPlayer(room,socket.id); if(!room||!player)return;
    if(patch.name!==undefined) player.name=cleanName(patch.name);
    if(patch.characterId!==undefined){
      const id=String(patch.characterId||'');
      if(id && !CHAR_IDS.has(id)) return;
      const taken=[...room.players.values()].some(p=>p.id!==socket.id&&p.characterId===id);
      if(taken){ socket.emit('room:error','That character was just taken.'); }
      else { player.characterId=id||null; player.ready=false; }
    }
    if(patch.ready!==undefined){
      if(patch.ready && !player.characterId){ socket.emit('room:error','Pick a character first.'); }
      else player.ready=!!patch.ready;
    }
    if(patch.voiceEnabled!==undefined) player.voiceEnabled=!!patch.voiceEnabled;
    broadcastRoom(room);
  });

  socket.on('game:start',(_payload={},ack=()=>{})=>{
    const room=roomOf(socket);
    try{
      if(!room) throw new Error('Join a room first.');
      if(room.hostId!==socket.id) throw new Error('Only the host can start the race.');
      const payload=startRoomGame(room,{requireReady:true});
      ack({ok:true,raceId:payload.raceId,seed:payload.seed,startAt:payload.startAt,levelIndex:payload.levelIndex});
    }catch(e){ ack({ok:false,error:e.message}); socket.emit('room:error',e.message); }
  });

  socket.on('game:rematch',(_payload={},ack=()=>{})=>{
    const room=roomOf(socket);
    try{
      if(!room?.postgame) throw new Error('There is no rematch waiting.');
      room.postgame.votes.add(socket.id);
      emitPostgame(room);
      ack({ok:true,votes:room.postgame?.votes.size||0,players:room.players.size});
      maybeStartVotedRematch(room);
    }catch(e){ ack({ok:false,error:e.message}); }
  });

  const validRacePayload=(room,payload)=>!!room?.game && String(payload?.raceId||'')===String(room.game.id);

  // The host generates the actual maze and sends it once. Guests use this exact
  // world instead of independently reconstructing the labyrinth from a seed.
  // That eliminates cross-browser/cache/version differences entirely.
  socket.on('game:world',payload=>{
    const room=roomOf(socket);
    if(!room?.game || socket.id!==room.hostId || !validRacePayload(room,payload)) return;
    const rows=payload?.mazeRows;
    if(!Array.isArray(rows) || !rows.length || rows.length>500) return;
    if(rows.some(r=>typeof r!=='string' || r.length>500 || /[^01]/.test(r))) return;
    room.game.world=payload;
    socket.to(room.code).emit('game:world',payload);
  });

  socket.on('game:input',payload=>{
    const room=roomOf(socket);
    if(!room?.game||socket.id===room.hostId||!validRacePayload(room,payload))return;
    io.to(room.hostId).emit('game:input',{from:socket.id,...payload});
  });
  socket.on('game:action',payload=>{
    const room=roomOf(socket);
    if(!room?.game||socket.id===room.hostId||!validRacePayload(room,payload))return;
    io.to(room.hostId).emit('game:action',{from:socket.id,...payload});
  });
  socket.on('game:snapshot',payload=>{
    const room=roomOf(socket);
    if(!room?.game||socket.id!==room.hostId||!validRacePayload(room,payload))return;
    socket.to(room.code).emit('game:snapshot',payload);
  });
  socket.on('game:event',payload=>{
    const room=roomOf(socket);
    if(!room?.game||socket.id!==room.hostId||!validRacePayload(room,payload))return;
    socket.to(room.code).emit('game:event',payload);
  });
  socket.on('game:end',payload=>{
    const room=roomOf(socket);
    if(!room?.game||socket.id!==room.hostId||!validRacePayload(room,payload))return;
    const endedRaceId=room.game.id;
    room.game=null;
    room.players.forEach(p=>p.ready=false);

    // Build the rematch state BEFORE the end packet. That makes the end event
    // self-contained, so clients cannot get stranded on REMATCH LOADING if the
    // separate postgame packet arrives late or is dropped during reconnect.
    const postgame=scheduleRematch(room,{emit:false});
    io.to(room.code).emit('game:end',{...(payload||{}),raceId:endedRaceId,postgame});
    emitPostgame(room);
  });

  for(const event of ['voice:offer','voice:answer','voice:candidate']){
    socket.on(event,payload=>{
      const target=io.sockets.sockets.get(payload?.to);
      if(!target || !sameRoom(socket.data.roomCode,target.data.roomCode)) return;
      target.emit(event,{from:socket.id,...payload,to:undefined});
    });
  }

  socket.on('disconnect',()=>leaveRoom(socket,{disconnect:true}));
});

const PORT=Number(process.env.PORT||3000);
server.listen(PORT,'0.0.0.0',()=>console.log(`LABYRUN multiplayer listening on ${PORT}`));

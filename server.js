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
function roomOf(socket){ const code=socket.data.roomCode; return code ? rooms.get(code) : null; }
function publicRoom(room){
  return {
    code:room.code,
    hostId:room.hostId,
    gameActive:!!room.game,
    players:[...room.players.values()].map(p=>({
      id:p.id,name:p.name,characterId:p.characterId||null,ready:!!p.ready,
      voiceEnabled:!!p.voiceEnabled,isHost:p.id===room.hostId
    }))
  };
}
function broadcastRoom(room){ io.to(room.code).emit('room:state',publicRoom(room)); }
function getPlayer(room,id){ return room?.players.get(id); }
function leaveRoom(socket,{disconnect=false}={}){
  const room=roomOf(socket);
  if(!room) return;
  const wasHost=room.hostId===socket.id;
  room.players.delete(socket.id);
  if(!disconnect) socket.leave(room.code);
  socket.data.roomCode=null;
  socket.to(room.code).emit('voice:peer-left',{id:socket.id});

  if(room.players.size===0){ rooms.delete(room.code); return; }
  if(wasHost){
    room.hostId=[...room.players.keys()][0];
    if(room.game){
      room.game=null;
      io.to(room.code).emit('game:end',{reason:'host-left',message:'The host disconnected. Race returned to the lobby.'});
    }
    io.to(room.code).emit('room:notice','Host changed.');
  }
  broadcastRoom(room);
}
function joinRoom(socket,room,name){
  if(socket.data.roomCode && socket.data.roomCode!==room.code) leaveRoom(socket);
  if(room.game) throw new Error('That race is already in progress.');
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
function sameRoom(a,b){ return !!a && !!b && a===b; }

io.on('connection', socket => {
  socket.on('room:create',(payload={},ack=()=>{})=>{
    try{
      leaveRoom(socket);
      const code=makeCode();
      const room={code,hostId:socket.id,players:new Map(),game:null,createdAt:Date.now()};
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

  socket.on('room:leave',(_payload={},ack=()=>{})=>{
    leaveRoom(socket); ack({ok:true});
  });

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
      if(room.game) throw new Error('Race already started.');
      const humans=[...room.players.values()];
      if(!humans.length) throw new Error('Nobody is in the room. Impressive.');
      if(humans.some(p=>!p.characterId||!p.ready)) throw new Error('Everyone must pick a racer and ready up first.');
      const seed=makeSeed();
      const startDelayMs=2600;
      const startAt=Date.now()+startDelayMs;
      room.game={seed,startAt,startedBy:socket.id,startedAt:null};
      const payload={
        code:room.code,seed,startAt,startDelayMs,hostId:room.hostId,
        humans:humans.map(p=>({id:p.id,name:p.name,characterId:p.characterId})),
        aiSlots:Math.max(0,MAX_PLAYERS-humans.length)
      };
      io.to(room.code).emit('game:start',payload);
      broadcastRoom(room);
      ack({ok:true,seed,startAt});
    }catch(e){ ack({ok:false,error:e.message}); socket.emit('room:error',e.message); }
  });

  socket.on('game:input',payload=>{
    const room=roomOf(socket); if(!room?.game||socket.id===room.hostId)return;
    io.to(room.hostId).emit('game:input',{from:socket.id,...payload});
  });
  socket.on('game:action',payload=>{
    const room=roomOf(socket); if(!room?.game||socket.id===room.hostId)return;
    io.to(room.hostId).emit('game:action',{from:socket.id,...payload});
  });
  socket.on('game:snapshot',payload=>{
    const room=roomOf(socket); if(!room?.game||socket.id!==room.hostId)return;
    socket.to(room.code).emit('game:snapshot',payload);
  });
  socket.on('game:event',payload=>{
    const room=roomOf(socket); if(!room?.game||socket.id!==room.hostId)return;
    socket.to(room.code).emit('game:event',payload);
  });
  socket.on('game:end',payload=>{
    const room=roomOf(socket); if(!room?.game||socket.id!==room.hostId)return;
    room.game=null;
    io.to(room.code).emit('game:end',payload||{});
    // Keep the room together for rematch, but reset ready flags.
    room.players.forEach(p=>p.ready=false);
    broadcastRoom(room);
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

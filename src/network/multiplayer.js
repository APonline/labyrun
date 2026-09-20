(() => {
  'use strict';

  const CFG = window.LABYRUN_NETWORK_CONFIG || {};
  const listeners = new Map();
  let socket = null;
  let state = null;
  let connecting = null;

  function emit(type, payload){
    (listeners.get(type) || []).forEach(fn => {
      try { fn(payload); } catch (err) { console.error('[LABYRUN multiplayer listener]', err); }
    });
  }

  function on(type, fn){
    if(!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(fn);
    return () => {
      const list = listeners.get(type) || [];
      const i = list.indexOf(fn);
      if(i >= 0) list.splice(i, 1);
    };
  }

  function resolveServerUrl(){
    const qs = new URLSearchParams(location.search);
    const fromQuery = qs.get('server');
    if(fromQuery){
      localStorage.setItem('labyrun.multiplayerServer', fromQuery.replace(/\/$/,''));
      return fromQuery.replace(/\/$/,'');
    }
    const saved = localStorage.getItem('labyrun.multiplayerServer');
    if(saved) return saved.replace(/\/$/,'');
    const configured = String(CFG.serverUrl || '').trim();
    if(configured && configured !== 'AUTO' && !configured.includes('YOUR_')) return configured.replace(/\/$/,'');
    if(['localhost','127.0.0.1'].includes(location.hostname)) return location.origin;
    return '';
  }

  function getServerUrl(){ return resolveServerUrl(); }
  function setServerUrl(url){
    const clean = String(url||'').trim().replace(/\/$/,'');
    if(clean) localStorage.setItem('labyrun.multiplayerServer', clean);
    else localStorage.removeItem('labyrun.multiplayerServer');
    if(socket){ socket.disconnect(); socket = null; connecting = null; state = null; }
    return clean;
  }

  function connect(){
    if(socket?.connected) return Promise.resolve(socket);
    if(connecting) return connecting;
    if(typeof window.io !== 'function') return Promise.reject(new Error('Socket.IO client is not loaded.'));
    const url = resolveServerUrl();
    if(!url) return Promise.reject(new Error('Multiplayer server URL is not configured.'));

    connecting = new Promise((resolve, reject) => {
      socket = window.io(url, {
        transports: ['websocket','polling'],
        reconnection: true,
        reconnectionAttempts: 12,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 4000,
        timeout: 20000
      });

      let settled = false;
      let lastError = null;
      const wakeTimer = setTimeout(() => {
        if(settled) return;
        settled=true; connecting=null;
        reject(lastError instanceof Error ? lastError : new Error('Could not reach the multiplayer server. If it is on a free host, make sure the service finished waking up.'));
      },75000);

      socket.on('connect', () => {
        emit('connection', { connected:true, id:socket.id, url });
        if(!settled){ settled = true; clearTimeout(wakeTimer); connecting = null; resolve(socket); }
      });
      socket.on('connect_error', err => {
        lastError=err;
        emit('connection:error', `Server waking/connecting… ${err?.message||''}`.trim());
      });
      socket.on('disconnect', reason => emit('connection', {connected:false, reason}));

      socket.on('room:state', next => {
        state = next;
        emit('room:state', next);
      });
      socket.on('room:error', message => emit('room:error', message));
      socket.on('room:notice', message => emit('room:notice', message));
      socket.on('game:start', meta => emit('game:start', meta));
      socket.on('game:world', payload => emit('game:world', payload));
      socket.on('game:input', payload => emit('game:input', payload));
      socket.on('game:action', payload => emit('game:action', payload));
      socket.on('game:snapshot', payload => emit('game:snapshot', payload));
      socket.on('game:event', payload => emit('game:event', payload));
      socket.on('game:end', payload => emit('game:end', payload));
      socket.on('game:postgame', payload => emit('game:postgame', payload));
      socket.on('voice:offer', payload => emit('voice:offer', payload));
      socket.on('voice:answer', payload => emit('voice:answer', payload));
      socket.on('voice:candidate', payload => emit('voice:candidate', payload));
      socket.on('voice:peer-left', payload => emit('voice:peer-left', payload));
    });
    return connecting;
  }

  async function send(event, payload){
    const s = await connect();
    s.emit(event, payload);
  }

  async function request(event, payload){
    const s = await connect();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server did not respond.')), 10000);
      s.emit(event, payload, response => {
        clearTimeout(timer);
        if(response?.ok === false) reject(new Error(response.error || 'Request failed.'));
        else resolve(response || {ok:true});
      });
    });
  }

  const api = {
    on, connect, getServerUrl, setServerUrl,
    getSocket: () => socket,
    getState: () => state,
    getMyId: () => socket?.id || null,
    isConnected: () => !!socket?.connected,
    createRoom: (name) => request('room:create',{name}),
    joinRoom: (code,name) => request('room:join',{code,name}),
    leaveRoom: () => request('room:leave',{}),
    updatePlayer: patch => send('player:update',patch),
    startGame: () => request('game:start',{}),
    requestRematch: () => request('game:rematch',{}),
    sendWorld: payload => { if(socket?.connected) socket.emit('game:world',payload); },
    sendInput: payload => { if(socket?.connected) socket.emit('game:input',payload); },
    sendAction: payload => { if(socket?.connected) socket.emit('game:action',payload); },
    sendSnapshot: payload => { if(socket?.connected) socket.emit('game:snapshot',payload); },
    sendGameEvent: payload => { if(socket?.connected) socket.emit('game:event',payload); },
    sendGameEnd: payload => { if(socket?.connected) socket.emit('game:end',payload); },
    voiceOffer: (to,description) => { if(socket?.connected) socket.emit('voice:offer',{to,description}); },
    voiceAnswer: (to,description) => { if(socket?.connected) socket.emit('voice:answer',{to,description}); },
    voiceCandidate: (to,candidate) => { if(socket?.connected) socket.emit('voice:candidate',{to,candidate}); }
  };

  window.LabyrunMultiplayer = api;
})();

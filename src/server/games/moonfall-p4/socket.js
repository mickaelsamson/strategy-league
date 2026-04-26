const MIN_PLAYERS = 2;
const MAX_PLAYERS = 2;

function randomId(){
  return Math.random().toString(36).slice(2, 11);
}

function createMoonfallP4Module({ io, socket, state, updatePresence, isGameAllowed }){
  function findLobbyByUsername(username){
    return Object.values(state.moonfallP4Lobbies).find(lobby =>
      lobby.players.some(player => player.username === username)
    ) || null;
  }

  function findGameByUsername(username){
    return Object.values(state.moonfallP4Games).find(game =>
      game.players.some(player => player.username === username)
    ) || null;
  }

  function emitToGame(game, event, payload){
    if(!game) return;
    game.players.forEach(player => {
      if(!player.id) return;
      io.sockets.sockets.get(player.id)?.emit(event, payload);
    });
  }

  function emitStart(game){
    if(!game) return;
    game.players.forEach(player => {
      if(!player.id) return;
      io.sockets.sockets.get(player.id)?.emit('moonfall_p4_start', {
        gameId: game.id,
        hostUsername: game.hostUsername,
        hasSnapshot: Boolean(game.snapshot),
        players: game.players.map(entry => ({ username: entry.username, connected: Boolean(entry.id) })),
        lobby: {
          name: game.name,
          maxPlayers: game.maxPlayers
        }
      });
    });
  }

  function emitState(game, targetSocketId = null){
    if(!game?.snapshot) return;
    const payload = {
      gameId: game.id,
      hostUsername: game.hostUsername,
      snapshot: game.snapshot
    };

    if(targetSocketId){
      io.sockets.sockets.get(targetSocketId)?.emit('moonfall_p4_state', payload);
      return;
    }

    emitToGame(game, 'moonfall_p4_state', payload);
  }

  function startLobbyGame(lobby){
    const gameId = randomId();
    const game = {
      id: gameId,
      name: lobby.name,
      maxPlayers: lobby.maxPlayers,
      hostUsername: lobby.players[0].username,
      hostSocketId: lobby.players[0].id,
      players: lobby.players.map(player => ({ id: player.id, username: player.username })),
      snapshot: null,
      ended: false
    };

    state.moonfallP4Games[gameId] = game;
    delete state.moonfallP4Lobbies[lobby.id];

    game.players.forEach(player => {
      if(player.id) state.moonfallP4PlayerGames[player.id] = gameId;
    });

    emitStart(game);
  }

  function handleLobbyDisconnect(socketId){
    for(const id in state.moonfallP4Lobbies){
      const lobby = state.moonfallP4Lobbies[id];
      lobby.players = lobby.players.filter(player => player.id !== socketId);
      if(!lobby.players.length){
        delete state.moonfallP4Lobbies[id];
        continue;
      }

      if(lobby.ownerUsername && !lobby.players.some(player => player.username === lobby.ownerUsername)){
        lobby.ownerUsername = lobby.players[0].username;
      }
    }
  }

  function rebindForUsername(username){
    if(!username) return;

    const lobby = findLobbyByUsername(username);
    if(lobby){
      const player = lobby.players.find(entry => entry.username === username);
      if(player) player.id = socket.id;
    }

    const game = findGameByUsername(username);
    if(!game) return;

    const player = game.players.find(entry => entry.username === username);
    if(player){
      if(player.id && player.id !== socket.id){
        delete state.moonfallP4PlayerGames[player.id];
      }
      player.id = socket.id;
      state.moonfallP4PlayerGames[socket.id] = game.id;
    }

    if(game.hostUsername === username){
      game.hostSocketId = socket.id;
    }

    emitStart(game);
    emitState(game, socket.id);
  }

  function handleDisconnect(){
    delete state.moonfallP4PlayerGames[socket.id];
    handleLobbyDisconnect(socket.id);

    for(const game of Object.values(state.moonfallP4Games)){
      const player = game.players.find(entry => entry.id === socket.id);
      if(player) player.id = null;

      if(game.hostSocketId === socket.id){
        game.hostSocketId = null;
        emitToGame(game, 'moonfall_p4_notice', {
          message: `${socket.username || 'The host'} disconnected. Waiting for reconnection.`
        });
      }
    }
  }

  function register(){
    socket.on('create_moonfall_p4_lobby', ({ name, maxPlayers } = {}) => {
      if(isGameAllowed && !isGameAllowed()) return;
      if(!socket.username) return;
      if(findLobbyByUsername(socket.username) || findGameByUsername(socket.username)) return;

      const parsedMaxPlayers = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Number(maxPlayers) || MAX_PLAYERS));
      const id = randomId();

      state.moonfallP4Lobbies[id] = {
        id,
        name: (name || 'Moonfall P4 Lobby').trim() || 'Moonfall P4 Lobby',
        ownerUsername: socket.username,
        maxPlayers: parsedMaxPlayers,
        players: [{ id: socket.id, username: socket.username, ready: false }]
      };
      updatePresence();
    });

    socket.on('join_moonfall_p4_lobby', id => {
      if(isGameAllowed && !isGameAllowed()) return;
      if(!socket.username) return;
      if(findLobbyByUsername(socket.username) || findGameByUsername(socket.username)) return;

      const lobby = state.moonfallP4Lobbies[id];
      if(!lobby || lobby.players.length >= lobby.maxPlayers) return;
      lobby.players.push({ id: socket.id, username: socket.username, ready: false });
      updatePresence();
    });

    socket.on('leave_moonfall_p4_lobby', id => {
      const lobby = state.moonfallP4Lobbies[id];
      if(!lobby) return;
      lobby.players = lobby.players.filter(player => player.username !== socket.username);
      if(!lobby.players.length){
        delete state.moonfallP4Lobbies[id];
      }else if(lobby.ownerUsername === socket.username){
        lobby.ownerUsername = lobby.players[0].username;
      }
      updatePresence();
    });

    socket.on('toggle_moonfall_p4_ready', id => {
      if(isGameAllowed && !isGameAllowed()) return;
      const lobby = state.moonfallP4Lobbies[id];
      if(!lobby) return;
      const player = lobby.players.find(entry => entry.username === socket.username);
      if(!player) return;

      player.ready = !player.ready;
      if(lobby.players.length >= MIN_PLAYERS && lobby.players.every(entry => entry.ready)){
        startLobbyGame(lobby);
      }
      updatePresence();
    });

    socket.on('moonfall_p4_action', ({ gameId, action } = {}) => {
      if(!gameId || !action || !socket.username) return;
      const game = state.moonfallP4Games[gameId];
      if(!game) return;
      const player = game.players.find(entry => entry.username === socket.username);
      if(!player) return;

      if(!game.hostSocketId){
        socket.emit('moonfall_p4_notice', { message: 'The host is reconnecting. Please wait a moment.' });
        return;
      }

      const hostSocket = io.sockets.sockets.get(game.hostSocketId);
      if(!hostSocket){
        socket.emit('moonfall_p4_notice', { message: 'The host is unavailable right now.' });
        return;
      }

      hostSocket.emit('moonfall_p4_action_request', {
        gameId,
        username: socket.username,
        action
      });
    });

    socket.on('moonfall_p4_sync_state', ({ gameId, snapshot } = {}) => {
      if(!gameId || !snapshot || !socket.username) return;
      const game = state.moonfallP4Games[gameId];
      if(!game || game.hostUsername !== socket.username) return;

      game.snapshot = snapshot;
      game.ended = Boolean(snapshot?.gameOver);
      emitState(game);
      updatePresence();
    });
  }

  return {
    register,
    rebindForUsername,
    handleDisconnect
  };
}

module.exports = {
  createMoonfallP4Module
};

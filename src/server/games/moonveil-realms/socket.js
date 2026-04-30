const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

function randomId(){
  return Math.random().toString(36).slice(2, 11);
}

function randomEntry(entries){
  return entries[Math.floor(Math.random() * entries.length)] || null;
}

function createMoonveilRealmsModule({ io, socket, state, updatePresence, isGameAllowed, applyStructuredGameResult }){
  function findLobbyByUsername(username){
    return Object.values(state.moonveilRealmsLobbies).find(lobby =>
      lobby.players.some(player => player.username === username)
    ) || null;
  }

  function findGameByUsername(username){
    return Object.values(state.moonveilRealmsGames).find(game =>
      game.players.some(player => player.username === username)
    ) || null;
  }

  function findGameIdForSocket(){
    let gameId = state.moonveilRealmsPlayerGames[socket.id];
    if(gameId) return gameId;
    if(!socket.username) return null;

    const game = findGameByUsername(socket.username);
    if(!game) return null;
    state.moonveilRealmsPlayerGames[socket.id] = game.id;
    return game.id;
  }

  function emitToGame(game, event, payload){
    if(!game) return;
    game.players.forEach(player => {
      const targetId = player.id;
      if(!targetId) return;
      const target = io.sockets.sockets.get(targetId);
      if(target) target.emit(event, payload);
    });
  }

  function emitStart(game){
    if(!game) return;
    game.players.forEach(player => {
      const target = player.id ? io.sockets.sockets.get(player.id) : null;
      if(!target) return;
      target.emit('moonveil_realms_start', {
        gameId: game.id,
        hostUsername: game.hostUsername,
        hasSnapshot: Boolean(game.snapshot),
        players: game.players.map(entry => ({
          username: entry.username,
          connected: Boolean(entry.id)
        })),
        lobby: {
          name: game.name,
          maxPlayers: game.maxPlayers,
          boardMode: game.boardMode,
          targetScore: game.targetScore,
          turnTimerSeconds: game.turnTimerSeconds || 0
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
      io.sockets.sockets.get(targetSocketId)?.emit('moonveil_realms_state', payload);
      return;
    }

    emitToGame(game, 'moonveil_realms_state', payload);
  }

  function getMoonveilRealmsPoints(player){
    const settlementPoints = Number(player?.pieces?.settlements || 0);
    const cityPoints = Number(player?.pieces?.cities || 0) * 2;
    const devPoints = Array.isArray(player?.devCards)
      ? player.devCards.filter(card => card?.type === 'vp' || card === 'vp').length
      : 0;
    const longestRoadPoints = player?.hasLongestRoad ? 2 : 0;
    const largestArmyPoints = player?.hasLargestArmy ? 2 : 0;
    return settlementPoints + cityPoints + devPoints + longestRoadPoints + largestArmyPoints;
  }

  function realmsScoreFinal(snapshot){
    if(!Array.isArray(snapshot?.players)) return '';
    return snapshot.players
      .map(player => `${player.username || player.name} ${getMoonveilRealmsPoints(player)}`)
      .join(' - ');
  }

  function winnerFromSnapshot(game, snapshot){
    if(snapshot?.winner === null || snapshot?.winner === undefined) return null;
    const winnerPlayer = Array.isArray(snapshot?.players) ? snapshot.players[snapshot.winner] : null;
    if(winnerPlayer?.username) return winnerPlayer.username;
    if(winnerPlayer?.name) return winnerPlayer.name;
    return game.players[snapshot.winner]?.username || null;
  }

  function startLobbyGame(lobby){
    const gameId = randomId();
    const players = lobby.matchmaking === 'public'
      ? lobby.players.slice().sort(() => Math.random() - 0.5)
      : lobby.players;
    const game = {
      id: gameId,
      name: lobby.name,
      maxPlayers: lobby.maxPlayers,
      boardMode: lobby.boardMode,
      targetScore: lobby.targetScore,
      turnTimerSeconds: lobby.turnTimerSeconds || 0,
      hostUsername: players[0].username,
      hostSocketId: players[0].id,
      players: players.map(player => ({
        id: player.id,
        username: player.username
      })),
      snapshot: null,
      ended: false
    };

    state.moonveilRealmsGames[gameId] = game;
    delete state.moonveilRealmsLobbies[lobby.id];
    game.players.forEach(player => {
      if(player.id) state.moonveilRealmsPlayerGames[player.id] = gameId;
    });
    emitStart(game);
  }

  function findPublicMatch({ maxPlayers, boardMode, targetScore, turnTimerSeconds }){
    return randomEntry(Object.values(state.moonveilRealmsLobbies).filter(lobby =>
      lobby.matchmaking === 'public' &&
      (lobby.maxPlayers || MAX_PLAYERS) === maxPlayers &&
      (lobby.boardMode || 'balanced') === boardMode &&
      Number(lobby.targetScore || 10) === targetScore &&
      Number(lobby.turnTimerSeconds || 0) === turnTimerSeconds &&
      lobby.players.length < maxPlayers &&
      !lobby.players.some(player => player.username === socket.username)
    ));
  }

  function handleLobbyDisconnect(socketId){
    for(const id in state.moonveilRealmsLobbies){
      const lobby = state.moonveilRealmsLobbies[id];
      lobby.players = lobby.players.filter(player => player.id !== socketId);
      if(!lobby.players.length){
        delete state.moonveilRealmsLobbies[id];
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
        delete state.moonveilRealmsPlayerGames[player.id];
      }
      player.id = socket.id;
      state.moonveilRealmsPlayerGames[socket.id] = game.id;
    }

    if(game.hostUsername === username){
      game.hostSocketId = socket.id;
    }

    emitStart(game);
    emitState(game, socket.id);
  }

  function handleDisconnect(){
    delete state.moonveilRealmsPlayerGames[socket.id];
    handleLobbyDisconnect(socket.id);

    for(const game of Object.values(state.moonveilRealmsGames)){
      const player = game.players.find(entry => entry.id === socket.id);
      if(player) player.id = null;
      if(game.hostSocketId === socket.id){
        game.hostSocketId = null;
        emitToGame(game, 'moonveil_realms_notice', {
          message: `${socket.username || 'The host'} disconnected. Waiting for reconnection.`
        });
      }
    }
  }

  function register(){
    socket.on('create_moonveil_realms_lobby', ({ name, maxPlayers, boardMode, targetScore, turnTimerSeconds } = {}) => {
      if(isGameAllowed && !isGameAllowed('moonveil_realms', socket)) return;
      if(!socket.username) return;
      if(findLobbyByUsername(socket.username) || findGameByUsername(socket.username)) return;

      const parsedMaxPlayers = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Number(maxPlayers) || MAX_PLAYERS));
      const id = randomId();
      state.moonveilRealmsLobbies[id] = {
        id,
        name: (name || 'Moonveil Lobby').trim() || 'Moonveil Lobby',
        ownerUsername: socket.username,
        maxPlayers: parsedMaxPlayers,
        boardMode: boardMode === 'wild' ? 'wild' : 'balanced',
        targetScore: Math.max(8, Math.min(12, Number(targetScore) || 10)),
        turnTimerSeconds: Math.max(0, Math.min(300, Number(turnTimerSeconds) || 0)),
        players: [{ id: socket.id, username: socket.username, ready: false }]
      };
      updatePresence();
    });

    socket.on('join_moonveil_realms_lobby', id => {
      if(isGameAllowed && !isGameAllowed('moonveil_realms', socket)) return;
      if(!socket.username) return;
      if(findLobbyByUsername(socket.username) || findGameByUsername(socket.username)) return;

      const lobby = state.moonveilRealmsLobbies[id];
      if(!lobby || lobby.players.length >= lobby.maxPlayers) return;
      lobby.players.push({ id: socket.id, username: socket.username, ready: false });
      updatePresence();
    });

    socket.on('leave_moonveil_realms_lobby', id => {
      const lobby = state.moonveilRealmsLobbies[id];
      if(!lobby) return;
      lobby.players = lobby.players.filter(player => player.username !== socket.username);
      if(!lobby.players.length){
        delete state.moonveilRealmsLobbies[id];
      }else if(lobby.ownerUsername === socket.username){
        lobby.ownerUsername = lobby.players[0].username;
      }
      updatePresence();
    });

    socket.on('toggle_moonveil_realms_ready', id => {
      if(isGameAllowed && !isGameAllowed('moonveil_realms', socket)) return;
      const lobby = state.moonveilRealmsLobbies[id];
      if(!lobby) return;
      const player = lobby.players.find(entry => entry.username === socket.username);
      if(!player) return;

      player.ready = !player.ready;
      const canStart = lobby.players.length >= MIN_PLAYERS && lobby.players.every(entry => entry.ready);
      if(canStart){
        startLobbyGame(lobby);
      }
      updatePresence();
    });

    socket.on('public_moonveil_realms_matchmaking', ({ maxPlayers, boardMode, targetScore, turnTimerSeconds } = {}) => {
      if(isGameAllowed && !isGameAllowed('moonveil_realms', socket)) return;
      if(!socket.username) return;
      if(findLobbyByUsername(socket.username) || findGameByUsername(socket.username)) return;

      const parsedMaxPlayers = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Number(maxPlayers) || MAX_PLAYERS));
      const selectedBoardMode = boardMode === 'wild' ? 'wild' : 'balanced';
      const selectedTargetScore = Math.max(8, Math.min(12, Number(targetScore) || 10));
      const selectedTurnTimerSeconds = Math.max(0, Math.min(300, Number(turnTimerSeconds) || 0));
      const match = findPublicMatch({
        maxPlayers: parsedMaxPlayers,
        boardMode: selectedBoardMode,
        targetScore: selectedTargetScore,
        turnTimerSeconds: selectedTurnTimerSeconds
      });

      if(match){
        match.players.push({ id: socket.id, username: socket.username, ready: true });
        if(match.players.length >= MIN_PLAYERS && match.players.every(entry => entry.ready)){
          startLobbyGame(match);
        }
        updatePresence();
        return;
      }

      const id = randomId();
      state.moonveilRealmsLobbies[id] = {
        id,
        name: 'Public matchmaking',
        matchmaking: 'public',
        ownerUsername: socket.username,
        maxPlayers: parsedMaxPlayers,
        boardMode: selectedBoardMode,
        targetScore: selectedTargetScore,
        turnTimerSeconds: selectedTurnTimerSeconds,
        players: [{ id: socket.id, username: socket.username, ready: true }]
      };
      updatePresence();
    });

    socket.on('moonveil_realms_action', ({ gameId, action } = {}) => {
      if(!gameId || !action || !socket.username) return;
      const game = state.moonveilRealmsGames[gameId];
      if(!game) return;
      const player = game.players.find(entry => entry.username === socket.username);
      if(!player) return;

      if(!game.hostSocketId){
        socket.emit('moonveil_realms_notice', { message: 'The host is reconnecting. Please wait a moment.' });
        return;
      }

      const hostSocket = io.sockets.sockets.get(game.hostSocketId);
      if(!hostSocket){
        socket.emit('moonveil_realms_notice', { message: 'The host is unavailable right now.' });
        return;
      }

      hostSocket.emit('moonveil_realms_action_request', {
        gameId,
        username: socket.username,
        action
      });
    });

    socket.on('moonveil_realms_sync_state', ({ gameId, snapshot } = {}) => {
      if(!gameId || !snapshot || !socket.username) return;
      const game = state.moonveilRealmsGames[gameId];
      if(!game || game.hostUsername !== socket.username) return;
      game.snapshot = snapshot;
      game.ended = Boolean(snapshot?.winner !== null && snapshot?.winner !== undefined) || snapshot?.phase === 'ended';
      emitState(game);
      if(!game.ended || game.rated || !applyStructuredGameResult){
        updatePresence();
        return;
      }

      const usernames = game.players.map(player => player.username);
      game.rated = true;
      applyStructuredGameResult({
        gameKey: 'moonveil_realms',
        usernames,
        winnerUsername: winnerFromSnapshot(game, snapshot),
        reason: snapshot?.resultReason || (snapshot?.winner !== null && snapshot?.winner !== undefined ? 'game_end' : 'draw'),
        scoreFinal: realmsScoreFinal(snapshot)
      })
        .then(result => {
          game.result = result?.result || null;
        })
        .catch(err => {
          console.error('Moonveil Realms result update error:', err);
        })
        .finally(()=>updatePresence());
    });
  }

  return {
    register,
    rebindForUsername,
    handleDisconnect,
    findGameIdForSocket,
    emitState
  };
}

module.exports = { createMoonveilRealmsModule };

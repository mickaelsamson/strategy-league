const { createChessModule } = require('../games/chess/socket');
const { createOthelloModule } = require('../games/othello/socket');
const { createAzulModule } = require('../games/azul/socket');
const { createMoonfallSettlersModule } = require('../games/moonfall-settlers/socket');
const { createMoonfallP4Module } = require('../games/moonfall-p4/socket');
const { createHexblitzModule } = require('../games/hexblitz/socket');
const { DISCONNECT_FORFEIT_MS } = require('../config/constants');
const { AUTH_COOKIE_NAME, parseCookieHeader, verifyAuthToken } = require('../services/auth-service');
const { buildRatingsPayload, getLevelInfo } = require('../services/user-service');

function registerSockets({ io, User, state, isGameAllowed, applyRankedResult, applyOthelloResult, applyAzulResult, applyStructuredGameResult }){
  const GAME_META = {
    chess: { label: 'Chess', lobbyUrl: '/chess/index.html', gameUrl: '/chess/chess-game.html' },
    othello: { label: 'Othello', lobbyUrl: '/othello/index.html', gameUrl: '/othello/game.html' },
    azul: { label: 'Azul Arena', lobbyUrl: '/azul/index.html', gameUrl: '/azul/game.html' },
    moonfall: { label: 'Moonfall Settlers', lobbyUrl: '/moonfall-settlers/index.html', gameUrl: '/moonfall-settlers/index.html' },
    moonfall_p4: { label: 'Moonfall Power 4', lobbyUrl: '/moonfall-p4/index.html', gameUrl: '/moonfall-p4/index.html' },
    hexblitz: { label: 'Hexblitz Moonfall', lobbyUrl: '/hexblitz_moonfall/index.html', gameUrl: '/hexblitz_moonfall/index.html' }
  };

  function socketsForUsername(username){
    return [...io.sockets.sockets.values()].filter(socket => socket.username === username);
  }

  function emitToUsername(username, event, payload){
    socketsForUsername(username).forEach(socket => socket.emit(event, payload));
  }

  function activeGameForUsername(username){
    const chessEntry = Object.entries(state.chessGames).find(([, game]) =>
      game && !game.ended && game.players?.some(player => player.username === username)
    );
    if(chessEntry) return { gameKey: 'chess', gameId: chessEntry[0], label: GAME_META.chess.label, url: GAME_META.chess.gameUrl };

    const othelloEntry = Object.entries(state.othelloGames).find(([, game]) =>
      game && !game.ended && game.players?.some(player => player.username === username)
    );
    if(othelloEntry) return { gameKey: 'othello', gameId: othelloEntry[0], label: GAME_META.othello.label, url: GAME_META.othello.gameUrl };

    const azulEntry = Object.entries(state.azulGames).find(([, game]) =>
      game && !game.ended && game.players?.some(player => player.username === username)
    );
    if(azulEntry) return { gameKey: 'azul', gameId: azulEntry[0], label: GAME_META.azul.label, url: GAME_META.azul.gameUrl };

    const moonfallEntry = Object.entries(state.moonfallSettlersGames).find(([, game]) =>
      game && !game.ended && game.players?.some(player => player.username === username)
    );
    if(moonfallEntry) return { gameKey: 'moonfall', gameId: moonfallEntry[0], label: GAME_META.moonfall.label, url: GAME_META.moonfall.gameUrl };

    const moonfallP4Entry = Object.entries(state.moonfallP4Games).find(([, game]) =>
      game && !game.ended && game.players?.some(player => player.username === username)
    );
    if(moonfallP4Entry) return { gameKey: 'moonfall_p4', gameId: moonfallP4Entry[0], label: GAME_META.moonfall_p4.label, url: GAME_META.moonfall_p4.gameUrl };

    const hexblitzEntry = Object.entries(state.hexblitzGames).find(([, game]) =>
      game && !game.ended && game.players?.some(player => player.username === username)
    );
    if(hexblitzEntry) return { gameKey: 'hexblitz', gameId: hexblitzEntry[0], label: GAME_META.hexblitz.label, url: GAME_META.hexblitz.gameUrl };

    return null;
  }

  function emitActiveGame(socket){
    if(!socket.username) return;
    socket.emit('active_game_status', activeGameForUsername(socket.username));
  }

  async function updatePresence(){
    const users = {};

    for(const id in state.onlineUsers){
      const username = state.onlineUsers[id];
      const user = await User.findOne({ username });
      const ratings = buildRatingsPayload(user || {});
      const levelInfo = getLevelInfo(user?.xp || 0);

      users[username] = {
        username,
        avatar: user?.avatar || '',
        xp: user?.xp || 0,
        level: levelInfo.level,
        levelInfo,
        wins: user?.wins || 0,
        losses: user?.losses || 0,
        draws: user?.draws || 0,
        elo: ratings.chess || 1000,
        chessElo: ratings.chess || 1000,
        othelloElo: ratings.othello || 1000,
        azulElo: ratings.azul || 1000,
        strategyElo: ratings.moonfall_world_conquest || 1000,
        moonfallP4Elo: ratings.moonfall_p4 || 1000,
        hexblitzElo: ratings.hexblitz || 1000,
        moonfallSettlersElo: ratings.moonfall_settlers || 1000,
        moonfallWorldConquestElo: ratings.moonfall_world_conquest || 1000,
        moonfallRtsElo: ratings.moonfall_rts || 1000
      };
    }

    io.emit('online_users', users);
    io.emit('lobbies_update', state.lobbies);
    io.emit('othello_lobbies_update', state.othelloLobbies);
    io.emit('azul_lobbies_update', state.azulLobbies);
    io.emit('moonfall_settlers_lobbies_update', state.moonfallSettlersLobbies);
    io.emit('moonfall_p4_lobbies_update', state.moonfallP4Lobbies);
    io.emit('hexblitz_lobbies_update', state.hexblitzLobbies);
    io.sockets.sockets.forEach(socket => emitActiveGame(socket));
  }

  function clearPendingDisconnectForUsername(username){
    if(!username || !state.pendingDisconnects[username]) return;
    clearTimeout(state.pendingDisconnects[username]);
    delete state.pendingDisconnects[username];
  }

  io.use((socket, next)=>{
    try{
      const cookies = parseCookieHeader(socket.handshake?.headers?.cookie || '');
      socket.authUser = verifyAuthToken(cookies[AUTH_COOKIE_NAME] || null);
      next();
    }catch(err){
      next(err);
    }
  });

  io.on('connection', socket => {
    const chess = createChessModule({
      io,
      socket,
      state,
      updatePresence,
      applyRankedResult: (game, winner, reason) => applyRankedResult(User, game, winner, reason),
      isGameAllowed
    });

    const othello = createOthelloModule({
      io,
      socket,
      state,
      updatePresence,
      applyOthelloResult: (game, winnerColor, reason) => applyOthelloResult(User, game, winnerColor, reason),
      isGameAllowed
    });

    const azul = createAzulModule({
      io,
      socket,
      state,
      updatePresence,
      applyAzulResult: (game, winner, reason) => applyAzulResult(User, game, winner, reason),
      isGameAllowed
    });

    const moonfall = createMoonfallSettlersModule({
      io,
      socket,
      state,
      updatePresence,
      isGameAllowed,
      applyStructuredGameResult: options => applyStructuredGameResult(User, options)
    });

    const moonfallP4 = createMoonfallP4Module({
      io,
      socket,
      state,
      updatePresence,
      isGameAllowed,
      applyStructuredGameResult: options => applyStructuredGameResult(User, options)
    });

    const hexblitz = createHexblitzModule({
      io,
      socket,
      state,
      updatePresence,
      isGameAllowed,
      applyStructuredGameResult: options => applyStructuredGameResult(User, options)
    });

    socket.on('register_online', payload => {
      const requestedUsername = typeof payload === 'string' ? payload : payload?.username;
      if(!socket.authUser?.username || socket.authUser.username !== requestedUsername){
        socket.emit('auth_required', { message: 'Authentication required.' });
        return;
      }

      socket.username = socket.authUser.username;
      socket.isAdmin = Boolean(socket.authUser.isAdmin);
      clearPendingDisconnectForUsername(socket.username);
      state.onlineUsers[socket.id] = socket.username;

      for(const gameId in state.chessGames){
        const game = state.chessGames[gameId];
        if(!game || game.ended) continue;

        const player = game.players.find(entry => entry.username === socket.username);
        if(!player) continue;

        const previousSocketId = player.id;
        player.id = socket.id;

        if(previousSocketId && previousSocketId !== socket.id){
          delete state.playerGames[previousSocketId];
        }

        state.playerGames[socket.id] = gameId;

        socket.emit('chess_start', {
          color: player.color,
          fen: game.fen,
          timeControl: game.timeControl,
          players: {
            white: game.players.find(entry => entry.color === 'w').username,
            black: game.players.find(entry => entry.color === 'b').username
          }
        });
      }

      for(const gameId in state.othelloGames){
        const game = state.othelloGames[gameId];
        if(!game || game.ended) continue;

        const player = game.players.find(entry => entry.username === socket.username);
        if(!player) continue;

        const previousSocketId = player.id;
        player.id = socket.id;

        if(previousSocketId && previousSocketId !== socket.id){
          delete state.othelloPlayerGames[previousSocketId];
        }

        state.othelloPlayerGames[socket.id] = gameId;
        othello.emitState(game);
      }

      for(const gameId in state.azulGames){
        const game = state.azulGames[gameId];
        if(!game || game.ended) continue;

        const player = game.players.find(entry => entry.username === socket.username);
        if(!player) continue;

        const previousSocketId = player.id;
        player.id = socket.id;

        if(previousSocketId && previousSocketId !== socket.id){
          delete state.azulPlayerGames[previousSocketId];
        }

        state.azulPlayerGames[socket.id] = gameId;
        azul.emitState(game);
      }

      moonfall.rebindForUsername(socket.username);
      moonfallP4.rebindForUsername(socket.username);
      hexblitz.rebindForUsername(socket.username);

      emitActiveGame(socket);
      updatePresence();
    });

    chess.register();
    othello.register();
    azul.register();
    moonfall.register();
    moonfallP4.register();
    hexblitz.register();

    socket.on('send_game_invite', ({ toUsername, gameKey } = {})=>{
      if(!socket.username || !toUsername || toUsername === socket.username) return;
      const meta = GAME_META[gameKey];
      if(!meta) return;

      const targets = socketsForUsername(toUsername);
      if(!targets.length){
        socket.emit('game_notice', { message: `${toUsername} is not online.` });
        return;
      }

      targets.forEach(target => target.emit('game_invite', {
        from: socket.username,
        gameKey,
        label: meta.label,
        url: meta.lobbyUrl,
        message: `${socket.username} invited you to ${meta.label}.`
      }));
      socket.emit('game_notice', { message: `Invite sent to ${toUsername}.` });
    });

    socket.on('decline_game_invite', ({ toUsername, gameKey } = {})=>{
      if(!socket.username || !toUsername) return;
      const meta = GAME_META[gameKey] || {};
      emitToUsername(toUsername, 'game_notice', {
        message: `${socket.username} declined your ${meta.label || 'game'} invite.`
      });
    });

    socket.on('decline_rematch', ({ toUsername, gameKey } = {})=>{
      if(!socket.username || !toUsername) return;
      const meta = GAME_META[gameKey] || {};
      emitToUsername(toUsername, 'game_notice', {
        message: `${socket.username} declined the ${meta.label || 'game'} rematch.`
      });
    });

    socket.on('disconnect', ()=>{
      if(socket.username){
        const gameId = chess.findGameIdForSocket();
        const game = gameId ? state.chessGames[gameId] : null;

        if(game && !game.ended){
          clearPendingDisconnectForUsername(socket.username);
          state.pendingDisconnects[socket.username] = setTimeout(()=>{
            delete state.pendingDisconnects[socket.username];
            const activeGame = state.chessGames[gameId];
            if(!activeGame || activeGame.ended) return;

            const disconnected = activeGame.players.find(player => player.username === socket.username);
            if(!disconnected) return;

            const winner = activeGame.players.find(player => player.username !== socket.username);
            applyRankedResult(User, activeGame, winner?.username || null, 'disconnect')
              .then(result => {
                chess.emitGameOver(gameId, {
                  reason: 'disconnect',
                  message: `${socket.username} disconnected for more than 1 minute.`,
                  winner: winner?.username || null,
                  rewards: result?.players || {}
                });
              })
              .catch(err => {
                console.error('ELO update error:', err);
                chess.emitGameOver(gameId, {
                  reason: 'disconnect',
                  message: `${socket.username} disconnected for more than 1 minute.`,
                  winner: winner?.username || null,
                  rewards: {}
                });
              })
              .finally(()=>updatePresence());
          }, DISCONNECT_FORFEIT_MS);
        }
      }

      delete state.onlineUsers[socket.id];

      for(const id in state.lobbies){
        state.lobbies[id].players = state.lobbies[id].players.filter(player => player.id !== socket.id);
        if(state.lobbies[id].players.length === 0) delete state.lobbies[id];
      }

      for(const id in state.othelloLobbies){
        state.othelloLobbies[id].players = state.othelloLobbies[id].players.filter(player => player.id !== socket.id);
        if(state.othelloLobbies[id].players.length === 0) delete state.othelloLobbies[id];
      }

      for(const id in state.azulLobbies){
        state.azulLobbies[id].players = state.azulLobbies[id].players.filter(player => player.id !== socket.id);
        if(state.azulLobbies[id].players.length === 0) delete state.azulLobbies[id];
      }

      moonfall.handleDisconnect();
      moonfallP4.handleDisconnect();
      hexblitz.handleDisconnect();

      io.emit('othello_lobbies_update', state.othelloLobbies);
      io.emit('azul_lobbies_update', state.azulLobbies);
      updatePresence();
    });
  });
}

module.exports = { registerSockets };

const { createChessModule } = require('../games/moonveil-chess/socket');
const { createMoonveilDominionModule } = require('../games/moonveil-dominion/socket');
const { createMoonveilGlyphModule } = require('../games/moonveil-glyph/socket');
const { createMoonveilRealmsModule } = require('../games/moonveil-realms/socket');
const { createMoonveilNexusModule } = require('../games/moonveil-nexus/socket');
const { createMoonveilHexfallModule } = require('../games/moonveil-hexfall/socket');
const { DISCONNECT_FORFEIT_MS } = require('../config/constants');
const { AUTH_COOKIE_NAME, parseCookieHeader, verifyAuthToken } = require('../services/auth-service');
const { buildRatingsPayload, getLevelInfo } = require('../services/user-service');

function registerSockets({ io, User, state, isGameAllowed, applyRankedResult, applyMoonveilDominionResult, applyMoonveilGlyphResult, applyStructuredGameResult }){
  const GAME_META = {
    chess: { label: 'Moonveil Chess', lobbyUrl: '/moonveil-chess/index.html', gameUrl: '/moonveil-chess/game.html' },
    moonveil_dominion: { label: 'Moonveil Dominion', lobbyUrl: '/moonveil-dominion/index.html', gameUrl: '/moonveil-dominion/game.html' },
    moonveil_glyph: { label: 'Moonveil Glyph', lobbyUrl: '/moonveil-glyph/index.html', gameUrl: '/moonveil-glyph/game.html' },
    moonveil_realms: { label: 'Moonveil Realms', lobbyUrl: '/moonveil-realms/index.html', gameUrl: '/moonveil-realms/index.html' },
    moonveil_nexus: { label: 'Moonveil Nexus', lobbyUrl: '/moonveil-nexus/index.html', gameUrl: '/moonveil-nexus/index.html' },
    moonveil_hexfall: { label: 'Moonveil Hexfall', lobbyUrl: '/moonveil-hexfall/index.html', gameUrl: '/moonveil-hexfall/index.html' },
    moonveil_conquest: { label: 'Moonveil Conquest', lobbyUrl: '/moonveil-conquest/index.html', gameUrl: '/moonveil-conquest/index.html' },
    moonveil_ascend: { label: 'Moonveil Ascend', lobbyUrl: '/moonveil-ascend/index.html', gameUrl: '/moonveil-ascend/index.html' }
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

    const moonveil_dominionEntry = Object.entries(state.moonveil_dominionGames).find(([, game]) =>
      game && !game.ended && game.players?.some(player => player.username === username)
    );
    if(moonveil_dominionEntry) return { gameKey: 'moonveil_dominion', gameId: moonveil_dominionEntry[0], label: GAME_META.moonveil_dominion.label, url: GAME_META.moonveil_dominion.gameUrl };

    const moonveil_glyphEntry = Object.entries(state.moonveil_glyphGames).find(([, game]) =>
      game && !game.ended && game.players?.some(player => player.username === username)
    );
    if(moonveil_glyphEntry) return { gameKey: 'moonveil_glyph', gameId: moonveil_glyphEntry[0], label: GAME_META.moonveil_glyph.label, url: GAME_META.moonveil_glyph.gameUrl };

    const moonveilEntry = Object.entries(state.moonveilRealmsGames).find(([, game]) =>
      game && !game.ended && game.players?.some(player => player.username === username)
    );
    if(moonveilEntry) return { gameKey: 'moonveil_realms', gameId: moonveilEntry[0], label: GAME_META.moonveil_realms.label, url: GAME_META.moonveil_realms.gameUrl };

    const moonveilNexusEntry = Object.entries(state.moonveilNexusGames).find(([, game]) =>
      game && !game.ended && game.players?.some(player => player.username === username)
    );
    if(moonveilNexusEntry) return { gameKey: 'moonveil_nexus', gameId: moonveilNexusEntry[0], label: GAME_META.moonveil_nexus.label, url: GAME_META.moonveil_nexus.gameUrl };

    const moonveil_hexfallEntry = Object.entries(state.moonveil_hexfallGames).find(([, game]) =>
      game && !game.ended && game.players?.some(player => player.username === username)
    );
    if(moonveil_hexfallEntry) return { gameKey: 'moonveil_hexfall', gameId: moonveil_hexfallEntry[0], label: GAME_META.moonveil_hexfall.label, url: GAME_META.moonveil_hexfall.gameUrl };

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
        moonveil_dominionElo: ratings.moonveil_dominion || 1000,
        moonveil_glyphElo: ratings.moonveil_glyph || 1000,
        strategyElo: ratings.moonveil_conquest || 1000,
        moonveilNexusElo: ratings.moonveil_nexus || 1000,
        moonveil_hexfallElo: ratings.moonveil_hexfall || 1000,
        moonveilRealmsElo: ratings.moonveil_realms || 1000,
        moonveilConquestElo: ratings.moonveil_conquest || 1000,
        moonveilAscendElo: ratings.moonveil_ascend || 1000
      };
    }

    io.emit('online_users', users);
    io.emit('lobbies_update', state.lobbies);
    io.emit('moonveil_dominion_lobbies_update', state.moonveil_dominionLobbies);
    io.emit('moonveil_glyph_lobbies_update', state.moonveil_glyphLobbies);
    io.emit('moonveil_realms_lobbies_update', state.moonveilRealmsLobbies);
    io.emit('moonveil_nexus_lobbies_update', state.moonveilNexusLobbies);
    io.emit('moonveil_hexfall_lobbies_update', state.moonveil_hexfallLobbies);
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

    const moonveil_dominion = createMoonveilDominionModule({
      io,
      socket,
      state,
      updatePresence,
      applyMoonveilDominionResult: (game, winnerColor, reason) => applyMoonveilDominionResult(User, game, winnerColor, reason),
      isGameAllowed
    });

    const moonveil_glyph = createMoonveilGlyphModule({
      io,
      socket,
      state,
      updatePresence,
      applyMoonveilGlyphResult: (game, winner, reason) => applyMoonveilGlyphResult(User, game, winner, reason),
      isGameAllowed
    });

    const moonveil = createMoonveilRealmsModule({
      io,
      socket,
      state,
      updatePresence,
      isGameAllowed,
      applyStructuredGameResult: options => applyStructuredGameResult(User, options)
    });

    const moonveilNexus = createMoonveilNexusModule({
      io,
      socket,
      state,
      updatePresence,
      isGameAllowed,
      applyStructuredGameResult: options => applyStructuredGameResult(User, options)
    });

    const moonveil_hexfall = createMoonveilHexfallModule({
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

      for(const gameId in state.moonveil_dominionGames){
        const game = state.moonveil_dominionGames[gameId];
        if(!game || game.ended) continue;

        const player = game.players.find(entry => entry.username === socket.username);
        if(!player) continue;

        const previousSocketId = player.id;
        player.id = socket.id;

        if(previousSocketId && previousSocketId !== socket.id){
          delete state.moonveil_dominionPlayerGames[previousSocketId];
        }

        state.moonveil_dominionPlayerGames[socket.id] = gameId;
        moonveil_dominion.emitState(game);
      }

      for(const gameId in state.moonveil_glyphGames){
        const game = state.moonveil_glyphGames[gameId];
        if(!game || game.ended) continue;

        const player = game.players.find(entry => entry.username === socket.username);
        if(!player) continue;

        const previousSocketId = player.id;
        player.id = socket.id;

        if(previousSocketId && previousSocketId !== socket.id){
          delete state.moonveil_glyphPlayerGames[previousSocketId];
        }

        state.moonveil_glyphPlayerGames[socket.id] = gameId;
        moonveil_glyph.emitState(game);
      }

      moonveil.rebindForUsername(socket.username);
      moonveilNexus.rebindForUsername(socket.username);
      moonveil_hexfall.rebindForUsername(socket.username);

      emitActiveGame(socket);
      updatePresence();
    });

    chess.register();
    moonveil_dominion.register();
    moonveil_glyph.register();
    moonveil.register();
    moonveilNexus.register();
    moonveil_hexfall.register();

    socket.on('send_game_invite', async ({ toUsername, gameKey, lobbyId } = {})=>{
      try{
        if(!socket.username || !toUsername || toUsername === socket.username) return;
        const meta = GAME_META[gameKey];
        if(!meta) return;

        const sender = await User.findOne({ username: socket.username }, { friends: 1 }).lean();
        if(!sender?.friends?.includes(toUsername)){
          socket.emit('game_notice', { message: `Add ${toUsername} as a friend before inviting them to a game.` });
          return;
        }

        const targets = socketsForUsername(toUsername);
        if(!targets.length){
          socket.emit('game_notice', { message: `${toUsername} is not online.` });
          return;
        }

        const lobbyUrl = lobbyId
          ? `${meta.lobbyUrl}?inviteLobbyId=${encodeURIComponent(String(lobbyId))}`
          : meta.lobbyUrl;

        targets.forEach(target => target.emit('game_invite', {
          from: socket.username,
          gameKey,
          lobbyId: lobbyId || null,
          label: meta.label,
          url: lobbyUrl,
          message: `${socket.username} invited you to ${meta.label}.`
        }));
        socket.emit('game_notice', { message: `Invite sent to ${toUsername}.` });
      }catch(err){
        console.error('Game invite error:', err);
        socket.emit('game_notice', { message: 'Invite unavailable right now.' });
      }
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

      for(const id in state.moonveil_dominionLobbies){
        state.moonveil_dominionLobbies[id].players = state.moonveil_dominionLobbies[id].players.filter(player => player.id !== socket.id);
        if(state.moonveil_dominionLobbies[id].players.length === 0) delete state.moonveil_dominionLobbies[id];
      }

      for(const id in state.moonveil_glyphLobbies){
        state.moonveil_glyphLobbies[id].players = state.moonveil_glyphLobbies[id].players.filter(player => player.id !== socket.id);
        if(state.moonveil_glyphLobbies[id].players.length === 0) delete state.moonveil_glyphLobbies[id];
      }

      moonveil.handleDisconnect();
      moonveilNexus.handleDisconnect();
      moonveil_hexfall.handleDisconnect();

      io.emit('moonveil_dominion_lobbies_update', state.moonveil_dominionLobbies);
      io.emit('moonveil_glyph_lobbies_update', state.moonveil_glyphLobbies);
      updatePresence();
    });
  });
}

module.exports = { registerSockets };

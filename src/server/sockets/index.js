const { createChessModule } = require('../games/chess/socket');
const { createOthelloModule } = require('../games/othello/socket');
const { createAzulModule } = require('../games/azul/socket');
const { DISCONNECT_FORFEIT_MS } = require('../config/constants');

function registerSockets({ io, User, state, applyRankedResult, applyOthelloResult, applyAzulResult }){
  async function updatePresence(){
    const users = {};

    for(const id in state.onlineUsers){
      const username = state.onlineUsers[id];
      const user = await User.findOne({ username });
      users[username] = {
        username,
        avatar: user?.avatar || '',
        xp: user?.xp || 0,
        wins: user?.wins || 0,
        losses: user?.losses || 0,
        draws: user?.draws || 0,
        elo: user?.chessElo || user?.elo || 1000,
        chessElo: user?.chessElo || user?.elo || 1000,
        othelloElo: user?.othelloElo || user?.othelloPoints || 1000,
        azulElo: user?.azulElo || user?.azulPoints || 1000,
        strategyElo: user?.strategyElo || user?.strategyPoints || 1000
      };
    }

    io.emit('online_users', users);
    io.emit('lobbies_update', state.lobbies);
    io.emit('othello_lobbies_update', state.othelloLobbies);
    io.emit('azul_lobbies_update', state.azulLobbies);
  }

  function clearPendingDisconnectForUsername(username){
    if(!username || !state.pendingDisconnects[username]) return;
    clearTimeout(state.pendingDisconnects[username]);
    delete state.pendingDisconnects[username];
  }

  io.on('connection', socket => {
    const chess = createChessModule({
      io,
      socket,
      state,
      updatePresence,
      applyRankedResult: (game, winner, reason) => applyRankedResult(User, game, winner, reason)
    });

    const othello = createOthelloModule({
      io,
      socket,
      state,
      updatePresence,
      applyOthelloResult: (game, winnerColor, reason) => applyOthelloResult(User, game, winnerColor, reason)
    });

    const azul = createAzulModule({
      io,
      socket,
      state,
      updatePresence,
      applyAzulResult: (game, winner, reason) => applyAzulResult(User, game, winner, reason)
    });

    socket.on('register_online', username => {
      socket.username = username;
      clearPendingDisconnectForUsername(username);
      state.onlineUsers[socket.id] = username;

      for(const gameId in state.chessGames){
        const game = state.chessGames[gameId];
        if(!game || game.ended) continue;

        const player = game.players.find(p => p.username === username);
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
            white: game.players.find(pl => pl.color === 'w').username,
            black: game.players.find(pl => pl.color === 'b').username
          }
        });
      }

      for(const gameId in state.othelloGames){
        const game = state.othelloGames[gameId];
        if(!game || game.ended) continue;

        const player = game.players.find(p => p.username === username);
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

        const player = game.players.find(p => p.username === username);
        if(!player) continue;

        const previousSocketId = player.id;
        player.id = socket.id;

        if(previousSocketId && previousSocketId !== socket.id){
          delete state.azulPlayerGames[previousSocketId];
        }

        state.azulPlayerGames[socket.id] = gameId;
        azul.emitState(game);
      }

      updatePresence();
    });

    chess.register();
    othello.register();
    azul.register();

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

            const disconnected = activeGame.players.find(p => p.username === socket.username);
            if(!disconnected) return;

            const winner = activeGame.players.find(p => p.username !== socket.username);

            applyRankedResult(User, activeGame, winner?.username || null, 'disconnect')
              .then(result=>{
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
        state.lobbies[id].players = state.lobbies[id].players.filter(p => p.id !== socket.id);
        if(state.lobbies[id].players.length === 0) delete state.lobbies[id];
      }

      for(const id in state.othelloLobbies){
        state.othelloLobbies[id].players = state.othelloLobbies[id].players.filter(p => p.id !== socket.id);
        if(state.othelloLobbies[id].players.length === 0) delete state.othelloLobbies[id];
      }

      for(const id in state.azulLobbies){
        state.azulLobbies[id].players = state.azulLobbies[id].players.filter(p => p.id !== socket.id);
        if(state.azulLobbies[id].players.length === 0) delete state.azulLobbies[id];
      }

      io.emit('othello_lobbies_update', state.othelloLobbies);
      io.emit('azul_lobbies_update', state.azulLobbies);
      updatePresence();
    });
  });
}

module.exports = { registerSockets };

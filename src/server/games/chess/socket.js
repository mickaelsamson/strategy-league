const { CHESS_TIME_CONTROLS } = require('../../config/constants');

function randomId(){
  return Math.random().toString(36).substr(2, 9);
}

function createChessModule({ io, socket, state, updatePresence, applyRankedResult }){
  function findGameIdForSocket(){
    let gameId = state.playerGames[socket.id];
    if(gameId) return gameId;
    if(!socket.username) return null;

    gameId = Object.keys(state.chessGames).find(id =>
      state.chessGames[id]?.players?.some(p => p.username === socket.username)
    );

    if(gameId) state.playerGames[socket.id] = gameId;
    return gameId || null;
  }

  function emitGameStart(game){
    game.players.forEach(player => {
      state.playerGames[player.id] = game.id;
      const s = io.sockets.sockets.get(player.id);
      if(!s) return;

      s.emit('chess_start', {
        color: player.color,
        fen: game.fen,
        timeControl: game.timeControl,
        players: {
          white: game.players.find(pl => pl.color === 'w').username,
          black: game.players.find(pl => pl.color === 'b').username
        }
      });
    });
  }

  function emitGameOver(gameId, payload){
    const game = state.chessGames[gameId];
    if(!game || game.ended) return;

    game.ended = true;
    state.rematchRequests[gameId] = {};

    game.players.forEach(player => {
      const s = io.sockets.sockets.get(player.id);
      if(s) s.emit('chess_game_over', payload);
    });
  }

  function register(){
    socket.on('create_lobby', ({ name, time })=>{
      const parsedTime = Number(time);
      if(!CHESS_TIME_CONTROLS.includes(parsedTime)) return;

      const existing = Object.values(state.lobbies).find(l =>
        l.players.some(p => p.username === socket.username)
      );
      if(existing) return;

      const id = randomId();
      state.lobbies[id] = {
        id,
        name,
        time: parsedTime,
        players: [{ id: socket.id, username: socket.username, ready: false }]
      };

      updatePresence();
    });

    socket.on('join_lobby', id => {
      const lobby = state.lobbies[id];
      if(!lobby) return;

      const existing = Object.values(state.lobbies).find(l =>
        l.players.some(p => p.username === socket.username)
      );
      if(existing) return;

      lobby.players.push({ id: socket.id, username: socket.username, ready: false });
      updatePresence();
    });

    socket.on('toggle_ready', id => {
      const lobby = state.lobbies[id];
      if(!lobby) return;

      const player = lobby.players.find(p => p.id === socket.id);
      if(!player) return;
      player.ready = !player.ready;

      if(lobby.players.length === 2 && lobby.players.every(p => p.ready)){
        const gameId = randomId();
        const p1 = lobby.players[0];
        const p2 = lobby.players[1];

        state.chessGames[gameId] = {
          id: gameId,
          players: [
            { id: p1.id, username: p1.username, color: 'w' },
            { id: p2.id, username: p2.username, color: 'b' }
          ],
          turn: 'w',
          fen: null,
          ended: false,
          rated: false,
          timeControl: lobby.time
        };

        emitGameStart(state.chessGames[gameId]);
        delete state.lobbies[id];
      }

      updatePresence();
    });

    socket.on('chess_move', ({ fen })=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.chessGames[gameId];
      if(!game || game.ended) return;

      game.fen = fen;
      game.players.forEach(p => {
        const s = io.sockets.sockets.get(p.id);
        if(s) s.emit('chess_update', { fen });
      });
    });

    socket.on('resign', ()=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.chessGames[gameId];
      if(!game || game.ended) return;

      const quitter = game.players.find(p => p.id === socket.id || p.username === socket.username);
      const winner = game.players.find(p => p.username !== quitter?.username);

      applyRankedResult(game, winner?.username, 'resign')
        .then(result=>{
          emitGameOver(gameId, {
            reason: 'resign',
            message: quitter ? `${quitter.username} resigned.` : 'A player resigned.',
            winner: winner?.username || null,
            rewards: result?.players || {}
          });
        })
        .catch(err => {
          console.error('ELO update error:', err);
          emitGameOver(gameId, {
            reason: 'resign',
            message: quitter ? `${quitter.username} resigned.` : 'A player resigned.',
            winner: winner?.username || null,
            rewards: {}
          });
        })
        .finally(()=>updatePresence());
    });

    socket.on('chess_game_end', ({ winner, reason } = {})=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.chessGames[gameId];
      if(!game || game.ended) return;

      const inGame = game.players.some(p => p.username === socket.username);
      if(!inGame) return;

      const validWinner = winner && game.players.some(p => p.username === winner);
      const winnerName = validWinner ? winner : null;
      const endReason = reason || 'completed';

      const messageByReason = {
        checkmate: 'Checkmate.',
        timeout: 'Time is over.',
        stalemate: 'Draw by stalemate.',
        draw: 'Draw.'
      };

      applyRankedResult(game, winnerName, endReason)
        .then(result=>emitGameOver(gameId, {
          reason: endReason,
          message: messageByReason[endReason] || 'Game finished.',
          winner: winnerName,
          rewards: result?.players || {}
        }))
        .catch(err => {
          console.error('ELO update error:', err);
          emitGameOver(gameId, {
            reason: endReason,
            message: messageByReason[endReason] || 'Game finished.',
            winner: winnerName,
            rewards: {}
          });
        })
        .finally(()=>updatePresence());
    });

    socket.on('chess_timeout', ()=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.chessGames[gameId];
      if(!game || game.ended) return;

      const loser = game.players.find(p => p.username === socket.username);
      if(!loser) return;

      const winner = game.players.find(p => p.username !== loser.username);

      applyRankedResult(game, winner?.username || null, 'timeout')
        .then(result=>emitGameOver(gameId, {
          reason: 'timeout',
          message: loser ? `${loser.username} ran out of time.` : 'Time is over.',
          winner: winner?.username || null,
          rewards: result?.players || {}
        }))
        .catch(err => {
          console.error('ELO update error:', err);
          emitGameOver(gameId, {
            reason: 'timeout',
            message: loser ? `${loser.username} ran out of time.` : 'Time is over.',
            winner: winner?.username || null,
            rewards: {}
          });
        })
        .finally(()=>updatePresence());
    });

    socket.on('rematch', ()=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.chessGames[gameId];
      if(!game || !game.ended) return;

      if(!state.rematchRequests[gameId]) state.rematchRequests[gameId] = {};
      state.rematchRequests[gameId][socket.username] = true;

      const requestedBy = Object.keys(state.rematchRequests[gameId]);
      game.players.forEach(player => {
        const s = io.sockets.sockets.get(player.id);
        if(s) s.emit('chess_rematch_status', { requestedBy });
      });

      const allReady = game.players.every(player => state.rematchRequests[gameId][player.username]);
      if(!allReady) return;

      game.players.forEach(player => {
        player.color = player.color === 'w' ? 'b' : 'w';
      });

      game.fen = null;
      game.turn = 'w';
      game.ended = false;
      state.rematchRequests[gameId] = {};
      emitGameStart(game);
    });
  }

  return {
    register,
    findGameIdForSocket,
    emitGameStart,
    emitGameOver
  };
}

module.exports = { createChessModule };

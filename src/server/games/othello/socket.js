function randomId(){
  return Math.random().toString(36).substr(2, 9);
}

function createInitialOthelloBoard(){
  const board = Array.from({ length: 8 }, ()=>Array(8).fill(null));
  board[3][3] = 'white';
  board[3][4] = 'black';
  board[4][3] = 'black';
  board[4][4] = 'white';
  return board;
}

function getOpponentColor(color){
  return color === 'black' ? 'white' : 'black';
}

function isInsideBoard(x, y){
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

function collectFlips(board, x, y, color){
  if(!isInsideBoard(x, y) || board[y][x]) return [];

  const enemy = getOpponentColor(color);
  const dirs = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  const flips = [];
  dirs.forEach(([dx, dy])=>{
    let cx = x + dx;
    let cy = y + dy;
    const line = [];

    while(isInsideBoard(cx, cy) && board[cy][cx] === enemy){
      line.push([cx, cy]);
      cx += dx;
      cy += dy;
    }

    if(line.length > 0 && isInsideBoard(cx, cy) && board[cy][cx] === color){
      flips.push(...line);
    }
  });

  return flips;
}

function hasAnyValidOthelloMove(board, color){
  for(let y = 0; y < 8; y++){
    for(let x = 0; x < 8; x++){
      if(collectFlips(board, x, y, color).length > 0) return true;
    }
  }
  return false;
}

function countOthelloDisks(board){
  let black = 0;
  let white = 0;

  board.forEach(row => {
    row.forEach(cell => {
      if(cell === 'black') black += 1;
      if(cell === 'white') white += 1;
    });
  });

  return { black, white };
}

function createOthelloModule({ io, socket, state, updatePresence, applyOthelloResult, isGameAllowed }){
  function findGameIdForSocket(){
    let gameId = state.othelloPlayerGames[socket.id];
    if(gameId) return gameId;
    if(!socket.username) return null;

    gameId = Object.keys(state.othelloGames).find(id =>
      state.othelloGames[id]?.players?.some(p => p.username === socket.username)
    );

    if(gameId) state.othelloPlayerGames[socket.id] = gameId;
    return gameId || null;
  }

  function emitState(game){
    if(!game) return;

    game.players.forEach(player => {
      state.othelloPlayerGames[player.id] = game.id;
      const s = io.sockets.sockets.get(player.id);
      if(!s) return;

      s.emit('othello_state', {
        board: game.board,
        turn: game.turn,
        color: player.color,
        players: game.players.map(p => ({ username: p.username, color: p.color }))
      });
    });
  }

  function register(){
    socket.on('create_othello_lobby', ({ name })=>{
      if(isGameAllowed && !isGameAllowed()) return;
      const existing = Object.values(state.othelloLobbies).find(l =>
        l.players.some(p => p.username === socket.username)
      );
      if(existing) return;

      const id = randomId();
      state.othelloLobbies[id] = {
        id,
        name: name || 'Othello Room',
        players: [{ id: socket.id, username: socket.username, ready: false }]
      };

      io.emit('othello_lobbies_update', state.othelloLobbies);
    });

    socket.on('join_othello_lobby', id => {
      if(isGameAllowed && !isGameAllowed()) return;
      const lobby = state.othelloLobbies[id];
      if(!lobby || lobby.players.length >= 2) return;

      const existing = Object.values(state.othelloLobbies).find(l =>
        l.players.some(p => p.username === socket.username)
      );
      if(existing) return;

      lobby.players.push({ id: socket.id, username: socket.username, ready: false });
      io.emit('othello_lobbies_update', state.othelloLobbies);
    });

    socket.on('toggle_othello_ready', id => {
      if(isGameAllowed && !isGameAllowed()) return;
      const lobby = state.othelloLobbies[id];
      if(!lobby) return;

      const player = lobby.players.find(p => p.id === socket.id);
      if(!player) return;
      player.ready = !player.ready;

      if(lobby.players.length === 2 && lobby.players.every(p => p.ready)){
        const gameId = randomId();
        const p1 = lobby.players[0];
        const p2 = lobby.players[1];

        state.othelloGames[gameId] = {
          id: gameId,
          players: [
            { id: p1.id, username: p1.username, color: 'black' },
            { id: p2.id, username: p2.username, color: 'white' }
          ],
          board: createInitialOthelloBoard(),
          turn: 'black',
          ended: false,
          rated: false
        };

        delete state.othelloLobbies[id];

        state.othelloGames[gameId].players.forEach(p => {
          const s = io.sockets.sockets.get(p.id);
          if(s) s.emit('othello_start');
        });

        emitState(state.othelloGames[gameId]);
      }

      io.emit('othello_lobbies_update', state.othelloLobbies);
    });

    socket.on('othello_move', ({ x, y } = {})=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.othelloGames[gameId];
      if(!game || game.ended) return;

      const player = game.players.find(p => p.username === socket.username);
      if(!player || player.color !== game.turn) return;
      if(typeof x !== 'number' || typeof y !== 'number') return;

      const flips = collectFlips(game.board, x, y, player.color);
      if(flips.length === 0) return;

      game.board[y][x] = player.color;
      flips.forEach(([fx, fy]) => {
        game.board[fy][fx] = player.color;
      });

      const opponent = getOpponentColor(player.color);
      const opponentCanPlay = hasAnyValidOthelloMove(game.board, opponent);
      const currentCanPlay = hasAnyValidOthelloMove(game.board, player.color);

      if(opponentCanPlay){
        game.turn = opponent;
      } else if(currentCanPlay){
        game.turn = player.color;
      } else {
        game.ended = true;
        const score = countOthelloDisks(game.board);
        let winnerColor = null;
        if(score.black > score.white) winnerColor = 'black';
        if(score.white > score.black) winnerColor = 'white';

        applyOthelloResult(game, winnerColor, winnerColor ? 'game_end' : 'draw')
          .then(result=>{
            const winnerPlayer = winnerColor ? game.players.find(p => p.color === winnerColor) : null;
            game.players.forEach(p => {
              const s = io.sockets.sockets.get(p.id);
              if(!s) return;
              s.emit('othello_state', { board: game.board, turn: game.turn, color: p.color });
              s.emit('othello_end', {
                winner: winnerPlayer ? winnerPlayer.username : 'Draw',
                message: winnerPlayer ? `${winnerPlayer.username} wins!` : 'Draw.',
                rewards: result?.players || {},
                score
              });
            });
          })
          .catch(err => {
            console.error('Othello points update error:', err);
            const winnerPlayer = winnerColor ? game.players.find(p => p.color === winnerColor) : null;
            game.players.forEach(p => {
              const s = io.sockets.sockets.get(p.id);
              if(!s) return;
              s.emit('othello_state', { board: game.board, turn: game.turn, color: p.color });
              s.emit('othello_end', {
                winner: winnerPlayer ? winnerPlayer.username : 'Draw',
                message: winnerPlayer ? `${winnerPlayer.username} wins!` : 'Draw.',
                rewards: {},
                score
              });
            });
          })
          .finally(()=>updatePresence());

        return;
      }

      emitState(game);
    });

    socket.on('othello_resign', ()=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.othelloGames[gameId];
      if(!game || game.ended) return;

      const quitter = game.players.find(p => p.username === socket.username);
      const winner = game.players.find(p => p.username !== socket.username);
      if(!quitter || !winner) return;

      game.ended = true;

      applyOthelloResult(game, winner.color, 'resign')
        .then(result=>{
          const score = countOthelloDisks(game.board);
          game.players.forEach(p => {
            const s = io.sockets.sockets.get(p.id);
            if(s){
              s.emit('othello_end', {
                winner: winner.username,
                reason: 'resign',
                message: `${quitter.username} resigned.`,
                rewards: result?.players || {},
                score
              });
            }
          });
        })
        .catch(err => {
          console.error('Othello points update error:', err);
          const score = countOthelloDisks(game.board);
          game.players.forEach(p => {
            const s = io.sockets.sockets.get(p.id);
            if(s){
              s.emit('othello_end', {
                winner: winner.username,
                reason: 'resign',
                message: `${quitter.username} resigned.`,
                rewards: {},
                score
              });
            }
          });
        })
        .finally(()=>updatePresence());
    });

    socket.on('othello_rematch', ()=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.othelloGames[gameId];
      if(!game || !game.ended) return;

      if(!state.rematchRequests[gameId]) state.rematchRequests[gameId] = {};
      state.rematchRequests[gameId][socket.username] = true;

      const requestedBy = Object.keys(state.rematchRequests[gameId]);
      game.players.forEach(player => {
        const s = io.sockets.sockets.get(player.id);
        if(!s) return;
        s.emit('othello_rematch_status', { requestedBy });
        if(player.username !== socket.username){
          s.emit('game_rematch_invite', {
            from: socket.username,
            toUsername: player.username,
            gameKey: 'othello',
            label: 'Othello',
            message: `${socket.username} wants an Othello rematch.`
          });
        }
      });

      const allReady = game.players.every(player => state.rematchRequests[gameId][player.username]);
      if(!allReady) return;

      game.players.forEach(player => {
        player.color = player.color === 'black' ? 'white' : 'black';
      });

      game.board = createInitialOthelloBoard();
      game.turn = 'black';
      game.ended = false;
      game.rated = false;
      game.result = null;
      state.rematchRequests[gameId] = {};

      emitState(game);
      game.players.forEach(player => {
        const s = io.sockets.sockets.get(player.id);
        if(s) s.emit('othello_rematch_start');
      });
    });
  }

  return {
    register,
    findGameIdForSocket,
    emitState
  };
}

module.exports = { createOthelloModule };

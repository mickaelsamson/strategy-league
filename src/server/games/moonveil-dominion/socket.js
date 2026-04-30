function randomId(){
  return Math.random().toString(36).substr(2, 9);
}

function randomEntry(entries){
  return entries[Math.floor(Math.random() * entries.length)] || null;
}

function createInitialMoonveilDominionBoard(){
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

function hasAnyValidMoonveilDominionMove(board, color){
  for(let y = 0; y < 8; y++){
    for(let x = 0; x < 8; x++){
      if(collectFlips(board, x, y, color).length > 0) return true;
    }
  }
  return false;
}

function countMoonveilDominionDisks(board){
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

function createMoonveilDominionModule({ io, socket, state, updatePresence, applyMoonveilDominionResult, isGameAllowed }){
  function findLobbyByUsername(username){
    return Object.values(state.moonveil_dominionLobbies).find(lobby =>
      lobby.players.some(player => player.username === username)
    ) || null;
  }

  function findGameIdForSocket(){
    let gameId = state.moonveil_dominionPlayerGames[socket.id];
    if(gameId) return gameId;
    if(!socket.username) return null;

    gameId = Object.keys(state.moonveil_dominionGames).find(id =>
      state.moonveil_dominionGames[id]?.players?.some(p => p.username === socket.username)
    );

    if(gameId) state.moonveil_dominionPlayerGames[socket.id] = gameId;
    return gameId || null;
  }

  function emitState(game){
    if(!game) return;

    game.players.forEach(player => {
      state.moonveil_dominionPlayerGames[player.id] = game.id;
      const s = io.sockets.sockets.get(player.id);
      if(!s) return;

      s.emit('moonveil_dominion_state', {
        board: game.board,
        turn: game.turn,
        color: player.color,
        players: game.players.map(p => ({ username: p.username, color: p.color }))
      });
    });
  }

  function startLobbyGame(lobbyId){
    const lobby = state.moonveil_dominionLobbies[lobbyId];
    if(!lobby || lobby.players.length !== 2) return false;

    const gameId = randomId();
    const [p1, p2] = lobby.matchmaking === 'public'
      ? lobby.players.slice().sort(() => Math.random() - 0.5)
      : lobby.players;

    state.moonveil_dominionGames[gameId] = {
      id: gameId,
      players: [
        { id: p1.id, username: p1.username, color: 'black' },
        { id: p2.id, username: p2.username, color: 'white' }
      ],
      board: createInitialMoonveilDominionBoard(),
      turn: 'black',
      ended: false,
      rated: false
    };

    delete state.moonveil_dominionLobbies[lobbyId];

    state.moonveil_dominionGames[gameId].players.forEach(p => {
      const s = io.sockets.sockets.get(p.id);
      if(s) s.emit('moonveil_dominion_start');
    });

    emitState(state.moonveil_dominionGames[gameId]);
    return true;
  }

  function findPublicMatch(){
    return randomEntry(Object.values(state.moonveil_dominionLobbies).filter(lobby =>
      lobby.matchmaking === 'public' &&
      lobby.players.length < 2 &&
      !lobby.players.some(player => player.username === socket.username)
    ));
  }

  function register(){
    socket.on('create_moonveil_dominion_lobby', ({ name })=>{
      if(isGameAllowed && !isGameAllowed('moonveil_dominion', socket)) return;
      const existing = findLobbyByUsername(socket.username);
      if(existing) return;

      const id = randomId();
      state.moonveil_dominionLobbies[id] = {
        id,
        name: name || 'Moonveil Dominion Room',
        players: [{ id: socket.id, username: socket.username, ready: false }]
      };

      io.emit('moonveil_dominion_lobbies_update', state.moonveil_dominionLobbies);
    });

    socket.on('join_moonveil_dominion_lobby', id => {
      if(isGameAllowed && !isGameAllowed('moonveil_dominion', socket)) return;
      const lobby = state.moonveil_dominionLobbies[id];
      if(!lobby || lobby.players.length >= 2) return;

      const existing = findLobbyByUsername(socket.username);
      if(existing) return;

      lobby.players.push({ id: socket.id, username: socket.username, ready: false });
      io.emit('moonveil_dominion_lobbies_update', state.moonveil_dominionLobbies);
    });

    socket.on('toggle_moonveil_dominion_ready', id => {
      if(isGameAllowed && !isGameAllowed('moonveil_dominion', socket)) return;
      const lobby = state.moonveil_dominionLobbies[id];
      if(!lobby) return;

      const player = lobby.players.find(p => p.id === socket.id);
      if(!player) return;
      player.ready = !player.ready;

      if(lobby.players.length === 2 && lobby.players.every(p => p.ready)){
        startLobbyGame(id);
      }

      io.emit('moonveil_dominion_lobbies_update', state.moonveil_dominionLobbies);
    });

    socket.on('public_moonveil_dominion_matchmaking', () => {
      if(isGameAllowed && !isGameAllowed('moonveil_dominion', socket)) return;
      if(!socket.username) return;
      if(findLobbyByUsername(socket.username)) return;

      const match = findPublicMatch();
      if(match){
        match.players.push({ id: socket.id, username: socket.username, ready: true });
        startLobbyGame(match.id);
        io.emit('moonveil_dominion_lobbies_update', state.moonveil_dominionLobbies);
        return;
      }

      const id = randomId();
      state.moonveil_dominionLobbies[id] = {
        id,
        name: 'Public matchmaking',
        matchmaking: 'public',
        players: [{ id: socket.id, username: socket.username, ready: true }]
      };

      io.emit('moonveil_dominion_lobbies_update', state.moonveil_dominionLobbies);
    });

    socket.on('moonveil_dominion_move', ({ x, y } = {})=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.moonveil_dominionGames[gameId];
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
      const opponentCanPlay = hasAnyValidMoonveilDominionMove(game.board, opponent);
      const currentCanPlay = hasAnyValidMoonveilDominionMove(game.board, player.color);

      if(opponentCanPlay){
        game.turn = opponent;
      } else if(currentCanPlay){
        game.turn = player.color;
      } else {
        game.ended = true;
        const score = countMoonveilDominionDisks(game.board);
        let winnerColor = null;
        if(score.black > score.white) winnerColor = 'black';
        if(score.white > score.black) winnerColor = 'white';

        applyMoonveilDominionResult(game, winnerColor, winnerColor ? 'game_end' : 'draw')
          .then(result=>{
            const winnerPlayer = winnerColor ? game.players.find(p => p.color === winnerColor) : null;
            game.players.forEach(p => {
              const s = io.sockets.sockets.get(p.id);
              if(!s) return;
              s.emit('moonveil_dominion_state', { board: game.board, turn: game.turn, color: p.color });
              s.emit('moonveil_dominion_end', {
                winner: winnerPlayer ? winnerPlayer.username : 'Draw',
                message: winnerPlayer ? `${winnerPlayer.username} wins!` : 'Draw.',
                rewards: result?.players || {},
                score
              });
            });
          })
          .catch(err => {
            console.error('Moonveil Dominion points update error:', err);
            const winnerPlayer = winnerColor ? game.players.find(p => p.color === winnerColor) : null;
            game.players.forEach(p => {
              const s = io.sockets.sockets.get(p.id);
              if(!s) return;
              s.emit('moonveil_dominion_state', { board: game.board, turn: game.turn, color: p.color });
              s.emit('moonveil_dominion_end', {
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

    socket.on('moonveil_dominion_resign', ()=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.moonveil_dominionGames[gameId];
      if(!game || game.ended) return;

      const quitter = game.players.find(p => p.username === socket.username);
      const winner = game.players.find(p => p.username !== socket.username);
      if(!quitter || !winner) return;

      game.ended = true;

      applyMoonveilDominionResult(game, winner.color, 'resign')
        .then(result=>{
          const score = countMoonveilDominionDisks(game.board);
          game.players.forEach(p => {
            const s = io.sockets.sockets.get(p.id);
            if(s){
              s.emit('moonveil_dominion_end', {
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
          console.error('Moonveil Dominion points update error:', err);
          const score = countMoonveilDominionDisks(game.board);
          game.players.forEach(p => {
            const s = io.sockets.sockets.get(p.id);
            if(s){
              s.emit('moonveil_dominion_end', {
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

    socket.on('moonveil_dominion_rematch', ()=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.moonveil_dominionGames[gameId];
      if(!game || !game.ended) return;

      if(!state.rematchRequests[gameId]) state.rematchRequests[gameId] = {};
      state.rematchRequests[gameId][socket.username] = true;

      const requestedBy = Object.keys(state.rematchRequests[gameId]);
      game.players.forEach(player => {
        const s = io.sockets.sockets.get(player.id);
        if(!s) return;
        s.emit('moonveil_dominion_rematch_status', { requestedBy });
        if(player.username !== socket.username){
          s.emit('game_rematch_invite', {
            from: socket.username,
            toUsername: player.username,
            gameKey: 'moonveil_dominion',
            label: 'Moonveil Dominion',
            message: `${socket.username} wants an Moonveil Dominion rematch.`
          });
        }
      });

      const allReady = game.players.every(player => state.rematchRequests[gameId][player.username]);
      if(!allReady) return;

      game.players.forEach(player => {
        player.color = player.color === 'black' ? 'white' : 'black';
      });

      game.board = createInitialMoonveilDominionBoard();
      game.turn = 'black';
      game.ended = false;
      game.rated = false;
      game.result = null;
      state.rematchRequests[gameId] = {};

      emitState(game);
      game.players.forEach(player => {
        const s = io.sockets.sockets.get(player.id);
        if(s) s.emit('moonveil_dominion_rematch_start');
      });
    });
  }

  return {
    register,
    findGameIdForSocket,
    emitState
  };
}

module.exports = { createMoonveilDominionModule };

const COLORS = ['blue', 'yellow', 'red', 'black', 'teal'];
const WALL_PATTERN = [
  ['blue', 'yellow', 'red', 'black', 'teal'],
  ['teal', 'blue', 'yellow', 'red', 'black'],
  ['black', 'teal', 'blue', 'yellow', 'red'],
  ['red', 'black', 'teal', 'blue', 'yellow'],
  ['yellow', 'red', 'black', 'teal', 'blue']
];
const FLOOR_PENALTIES = [-1, -1, -2, -2, -2, -3, -3];
const TILES_PER_FACTORY = 4;
const TURN_TIME_MS = 60 * 1000;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const SCORING_STEP_MS = 950;
const SCORING_GAP_MS = 260;

function randomId(){
  return Math.random().toString(36).substr(2, 9);
}

function shuffle(list){
  const copy = [...list];
  for(let i = copy.length - 1; i > 0; i -= 1){
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createBag(){
  const tiles = [];
  COLORS.forEach(color => {
    for(let i = 0; i < 20; i += 1) tiles.push(color);
  });
  return shuffle(tiles);
}

function createPlayer(id, username, seat){
  return {
    id,
    username,
    seat,
    active: true,
    score: 0,
    wall: Array.from({ length: 5 }, () => Array(5).fill(null)),
    pattern: Array.from({ length: 5 }, (_, row) => ({ color: null, count: 0, size: row + 1 })),
    floor: []
  };
}

function getFactoryCount(playerCount){
  return playerCount * 2 + 1;
}

function drawTile(game){
  if(game.bag.length === 0 && game.discard.length > 0){
    game.bag = shuffle(game.discard);
    game.discard = [];
  }
  return game.bag.pop() || null;
}

function refillFactories(game){
  game.factories = Array.from({ length: game.factoryCount }, () => []);
  game.center = game.nextStartSeat === null ? ['first'] : [];
  game.round += 1;

  for(let i = 0; i < game.factoryCount; i += 1){
    for(let j = 0; j < TILES_PER_FACTORY; j += 1){
      const tile = drawTile(game);
      if(tile) game.factories[i].push(tile);
    }
  }
}

function createGame(gameId, lobby){
  const players = lobby.players.slice(0, lobby.maxPlayers);
  const game = {
    id: gameId,
    players: players.map((player, seat) => createPlayer(player.id, player.username, seat)),
    maxPlayers: lobby.maxPlayers,
    factoryCount: getFactoryCount(players.length),
    turnSeat: 0,
    nextStartSeat: null,
    bag: createBag(),
    discard: [],
    factories: [],
    center: ['first'],
    round: 0,
    ended: false,
    rated: false,
    phase: 'playing',
    lastRound: null,
    scoringDelayMs: 0,
    turnStartedAt: null,
    turnDeadlineAt: null,
    turnTimer: null,
    scoringTimer: null
  };

  refillFactories(game);
  return game;
}

function getActivePlayers(game){
  return game.players.filter(player => player.active !== false);
}

function getNextActiveSeat(game, currentSeat){
  const active = getActivePlayers(game).sort((a, b) => a.seat - b.seat);
  if(!active.length) return null;

  const next = active.find(player => player.seat > currentSeat);
  return (next || active[0]).seat;
}

function countColor(tiles, color){
  return tiles.filter(tile => tile === color).length;
}

function removeColor(tiles, color){
  return tiles.filter(tile => tile !== color);
}

function hasTableTiles(game){
  return game.factories.some(factory => factory.length > 0) ||
    game.center.some(tile => tile !== 'first');
}

function wallHasColor(player, row, color){
  return player.wall[row].some(cell => cell === color);
}

function canPlaceOnPattern(player, lineIndex, color){
  if(lineIndex < 0 || lineIndex > 4) return false;
  const line = player.pattern[lineIndex];
  if(wallHasColor(player, lineIndex, color)) return false;
  return (!line.color || line.color === color) && line.count < line.size;
}

function addToFloor(game, player, tiles){
  tiles.forEach(tile => {
    if(tile === 'first'){
      player.floor.push(tile);
      return;
    }

    if(player.floor.length < FLOOR_PENALTIES.length){
      player.floor.push(tile);
    } else {
      game.discard.push(tile);
    }
  });
}

function scoreWallPlacement(wall, row, col){
  let horizontal = 1;
  for(let x = col - 1; x >= 0 && wall[row][x]; x -= 1) horizontal += 1;
  for(let x = col + 1; x < 5 && wall[row][x]; x += 1) horizontal += 1;

  let vertical = 1;
  for(let y = row - 1; y >= 0 && wall[y][col]; y -= 1) vertical += 1;
  for(let y = row + 1; y < 5 && wall[y][col]; y += 1) vertical += 1;

  if(horizontal === 1 && vertical === 1) return 1;
  if(horizontal === 1) return vertical;
  if(vertical === 1) return horizontal;
  return horizontal + vertical;
}

function applyFloorPenalty(player){
  const penalty = player.floor.reduce((total, _tile, index) => total + (FLOOR_PENALTIES[index] || 0), 0);
  player.score = Math.max(0, player.score + penalty);
  return penalty;
}

function completedRows(player){
  return player.wall.filter(row => row.every(Boolean)).length;
}

function completedColumns(player){
  let count = 0;
  for(let col = 0; col < 5; col += 1){
    let full = true;
    for(let row = 0; row < 5; row += 1){
      if(!player.wall[row][col]) full = false;
    }
    if(full) count += 1;
  }
  return count;
}

function completedColorSets(player){
  return COLORS.filter(color => player.wall.every(row => row.includes(color))).length;
}

function getScoringActionCount(summary){
  return Object.values(summary || {}).reduce((total, playerSummary) => {
    return total +
      (playerSummary.placements?.length || 0) +
      (playerSummary.floorPenalty ? 1 : 0) +
      (playerSummary.bonus ? 1 : 0);
  }, 0);
}

function getScoringDelay(summary){
  const actions = getScoringActionCount(summary);
  return Math.max(1800, Math.min(45000, 900 + actions * (SCORING_STEP_MS + SCORING_GAP_MS)));
}

function scoreRound(game){
  const summary = {};

  game.players.forEach(player => {
    const playerSummary = { placements: [], floorPenalty: 0, bonus: 0 };

    player.pattern.forEach((line, row) => {
      if(line.count !== line.size || !line.color) return;

      const color = line.color;
      const col = WALL_PATTERN[row].indexOf(color);
      player.wall[row][col] = color;
      const points = scoreWallPlacement(player.wall, row, col);
      player.score += points;
      playerSummary.placements.push({ row, col, color, points });

      for(let i = 1; i < line.count; i += 1) game.discard.push(color);
      player.pattern[row] = { color: null, count: 0, size: row + 1 };
    });

    playerSummary.floorPenalty = applyFloorPenalty(player);
    player.floor.forEach(tile => {
      if(tile !== 'first') game.discard.push(tile);
    });
    player.floor = [];
    summary[player.username] = playerSummary;
  });

  const shouldEnd = game.players.some(player => completedRows(player) > 0);
  if(shouldEnd){
    game.ended = true;
    game.players.forEach(player => {
      const bonus = completedRows(player) * 2 + completedColumns(player) * 7 + completedColorSets(player) * 10;
      player.score += bonus;
      summary[player.username].bonus = bonus;
    });
  } else {
    const preferred = game.players.find(player => player.active !== false && player.seat === game.nextStartSeat);
    game.turnSeat = preferred ? preferred.seat : getNextActiveSeat(game, -1);
    game.nextStartSeat = null;
  }

  game.lastRound = summary;
  game.scoringDelayMs = getScoringDelay(summary);
  game.phase = 'scoring';
}

function getWinnerUsername(game){
  const contenders = getActivePlayers(game).length ? getActivePlayers(game) : game.players;
  const sorted = [...contenders].sort((a, b) => {
    if(b.score !== a.score) return b.score - a.score;
    return completedRows(b) - completedRows(a);
  });

  if(sorted.length < 2) return sorted[0]?.username || null;
  if(sorted[0].score === sorted[1].score && completedRows(sorted[0]) === completedRows(sorted[1])) return null;
  return sorted[0].username;
}

function publicPlayer(player){
  return {
    username: player.username,
    seat: player.seat,
    active: player.active !== false,
    score: player.score,
    wall: player.wall,
    pattern: player.pattern,
    floor: player.floor
  };
}

function createAzulModule({ io, socket, state, updatePresence, applyAzulResult, isGameAllowed }){
  function clearTurnTimer(game){
    if(game?.turnTimer){
      clearTimeout(game.turnTimer);
      game.turnTimer = null;
    }
    if(game){
      game.turnStartedAt = null;
      game.turnDeadlineAt = null;
    }
  }

  function clearScoringTimer(game){
    if(game?.scoringTimer){
      clearTimeout(game.scoringTimer);
      game.scoringTimer = null;
    }
  }

  function endByTimeout(game){
    if(!game || game.ended) return;

    clearTurnTimer(game);
    const loser = game.players.find(p => p.seat === game.turnSeat);
    if(!loser) return;
    loser.active = false;

    const remaining = getActivePlayers(game);
    if(remaining.length > 1){
      game.turnSeat = getNextActiveSeat(game, loser.seat);
      game.lastRound = null;
      startTurnTimer(game);
      emitState(game);
      game.players.forEach(player => {
        const s = io.sockets.sockets.get(player.id);
        if(s) s.emit('azul_notice', { message: `${loser.username} ran out of time and was eliminated.` });
      });
      updatePresence();
      return;
    }

    const winner = remaining[0] || game.players.find(p => p.username !== loser.username);
    if(!winner) return;
    game.ended = true;
    emitState(game);
    applyAzulResult(game, winner.username, 'timeout')
      .then(result=>emitEnd(game, {
        winner: winner.username,
        reason: 'timeout',
        message: `${loser.username} ran out of time.`,
        rewards: result?.players || {},
        scores: game.players.reduce((acc, p) => ({ ...acc, [p.username]: p.score }), {})
      }))
      .catch(err => {
        console.error('Azul points update error:', err);
        emitEnd(game, {
          winner: winner.username,
          reason: 'timeout',
          message: `${loser.username} ran out of time.`,
          rewards: {},
          scores: game.players.reduce((acc, p) => ({ ...acc, [p.username]: p.score }), {})
        });
      })
      .finally(()=>updatePresence());
  }

  function startTurnTimer(game){
    if(!game || game.ended) return;

    clearTurnTimer(game);
    game.phase = 'playing';
    game.scoringDelayMs = 0;
    game.turnStartedAt = Date.now();
    game.turnDeadlineAt = game.turnStartedAt + TURN_TIME_MS;
    game.turnTimer = setTimeout(()=>endByTimeout(game), TURN_TIME_MS);
  }

  function finishAzulGame(game, reason){
    const winner = getWinnerUsername(game);
    applyAzulResult(game, winner, winner ? reason : 'draw')
      .then(result=>emitEnd(game, {
        winner,
        reason: winner ? reason : 'draw',
        message: winner ? `${winner} wins.` : 'Draw.',
        rewards: result?.players || {},
        scores: game.players.reduce((acc, p) => ({ ...acc, [p.username]: p.score }), {})
      }))
      .catch(err => {
        console.error('Azul points update error:', err);
        emitEnd(game, {
          winner,
          reason: winner ? reason : 'draw',
          message: winner ? `${winner} wins.` : 'Draw.',
          rewards: {},
          scores: game.players.reduce((acc, p) => ({ ...acc, [p.username]: p.score }), {})
        });
      })
      .finally(()=>updatePresence());
  }

  function scheduleRoundAdvance(game){
    clearScoringTimer(game);
    game.turnStartedAt = null;
    game.turnDeadlineAt = null;
    game.scoringTimer = setTimeout(()=>{
      game.scoringTimer = null;
      if(game.ended){
        finishAzulGame(game, 'game_end');
        return;
      }

      game.phase = 'playing';
      game.lastRound = null;
      game.scoringDelayMs = 0;
      refillFactories(game);
      startTurnTimer(game);
      emitState(game);
    }, game.scoringDelayMs || 1800);
  }

  function findGameIdForSocket(){
    let gameId = state.azulPlayerGames[socket.id];
    if(gameId) return gameId;
    if(!socket.username) return null;

    gameId = Object.keys(state.azulGames).find(id =>
      state.azulGames[id]?.players?.some(p => p.username === socket.username)
    );

    if(gameId) state.azulPlayerGames[socket.id] = gameId;
    return gameId || null;
  }

  function emitState(game){
    if(!game) return;

    game.players.forEach(player => {
      state.azulPlayerGames[player.id] = game.id;
      const s = io.sockets.sockets.get(player.id);
      if(!s) return;

      s.emit('azul_state', {
        gameId: game.id,
        factories: game.factories,
        center: game.center,
        wallPattern: WALL_PATTERN,
        round: game.round,
        turnSeat: game.turnSeat,
        turnStartedAt: game.turnStartedAt,
        turnDeadlineAt: game.turnDeadlineAt,
        turnRemainingMs: game.turnDeadlineAt ? Math.max(0, game.turnDeadlineAt - Date.now()) : 0,
        turnTimeMs: TURN_TIME_MS,
        phase: game.phase || 'playing',
        scoringDelayMs: game.scoringDelayMs || 0,
        mySeat: player.seat,
        players: game.players.map(publicPlayer),
        lastRound: game.lastRound,
        ended: game.ended
      });
    });
  }

  function emitEnd(game, payload){
    game.players.forEach(player => {
      const s = io.sockets.sockets.get(player.id);
      if(s) s.emit('azul_end', payload);
    });
  }

  function register(){
    socket.on('create_azul_lobby', ({ name, maxPlayers } = {})=>{
      if(isGameAllowed && !isGameAllowed('azul', socket)) return;
      const existing = Object.values(state.azulLobbies).find(l =>
        l.players.some(p => p.username === socket.username)
      );
      if(existing) return;

      const parsedMaxPlayers = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Number(maxPlayers) || MIN_PLAYERS));
      const id = randomId();
      state.azulLobbies[id] = {
        id,
        name: name || 'Azul Room',
        maxPlayers: parsedMaxPlayers,
        players: [{ id: socket.id, username: socket.username, ready: false }]
      };

      updatePresence();
    });

    socket.on('join_azul_lobby', id => {
      if(isGameAllowed && !isGameAllowed('azul', socket)) return;
      const lobby = state.azulLobbies[id];
      if(!lobby || lobby.players.length >= (lobby.maxPlayers || MIN_PLAYERS)) return;

      const existing = Object.values(state.azulLobbies).find(l =>
        l.players.some(p => p.username === socket.username)
      );
      if(existing) return;

      lobby.players.push({ id: socket.id, username: socket.username, ready: false });
      updatePresence();
    });

    socket.on('toggle_azul_ready', id => {
      if(isGameAllowed && !isGameAllowed('azul', socket)) return;
      const lobby = state.azulLobbies[id];
      if(!lobby) return;

      const player = lobby.players.find(p => p.id === socket.id);
      if(!player) return;
      player.ready = !player.ready;

      if(lobby.players.length === (lobby.maxPlayers || MIN_PLAYERS) && lobby.players.every(p => p.ready)){
        const gameId = randomId();
        state.azulGames[gameId] = createGame(gameId, lobby);
        delete state.azulLobbies[id];
        startTurnTimer(state.azulGames[gameId]);

        state.azulGames[gameId].players.forEach(p => {
          const s = io.sockets.sockets.get(p.id);
          if(s) s.emit('azul_start');
        });

        emitState(state.azulGames[gameId]);
      }

      updatePresence();
    });

    socket.on('azul_move', ({ sourceType, sourceIndex, color, lineIndex } = {})=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.azulGames[gameId];
      if(!game || game.ended) return;

      const player = game.players.find(p => p.username === socket.username);
      if(!player || player.active === false || player.seat !== game.turnSeat) return;
      if(!COLORS.includes(color)) return;

      let selectedCount = 0;
      let firstMarkerTaken = false;

      if(sourceType === 'factory'){
        if(!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= game.factories.length) return;
        const factory = game.factories[sourceIndex];
        selectedCount = countColor(factory, color);
        if(selectedCount <= 0) return;

        const remaining = removeColor(factory, color);
        game.center.push(...remaining);
        game.factories[sourceIndex] = [];
      } else if(sourceType === 'center'){
        selectedCount = countColor(game.center, color);
        if(selectedCount <= 0) return;

        firstMarkerTaken = game.center.includes('first');
        game.center = game.center.filter(tile => tile !== color && tile !== 'first');
        if(firstMarkerTaken && game.nextStartSeat === null) game.nextStartSeat = player.seat;
      } else {
        return;
      }

      if(Number.isInteger(lineIndex) && canPlaceOnPattern(player, lineIndex, color)){
        const line = player.pattern[lineIndex];
        const room = line.size - line.count;
        const placedCount = Math.min(room, selectedCount);
        line.color = color;
        line.count += placedCount;
        addToFloor(game, player, [
          ...(firstMarkerTaken ? ['first'] : []),
          ...Array.from({ length: selectedCount - placedCount }, () => color)
        ]);
      } else {
        addToFloor(game, player, [
          ...(firstMarkerTaken ? ['first'] : []),
          ...Array.from({ length: selectedCount }, () => color)
        ]);
      }

      if(hasTableTiles(game)){
        game.turnSeat = getNextActiveSeat(game, game.turnSeat);
        game.lastRound = null;
        startTurnTimer(game);
        emitState(game);
        return;
      }

      clearTurnTimer(game);
      scoreRound(game);
      emitState(game);
      scheduleRoundAdvance(game);
    });

    socket.on('azul_resign', ()=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.azulGames[gameId];
      if(!game || game.ended) return;
      clearScoringTimer(game);

      const quitter = game.players.find(p => p.username === socket.username);
      if(!quitter) return;
      quitter.active = false;

      const remaining = getActivePlayers(game);
      if(remaining.length > 1){
        if(quitter.seat === game.turnSeat){
          game.turnSeat = getNextActiveSeat(game, quitter.seat);
          startTurnTimer(game);
        }
        emitState(game);
        game.players.forEach(player => {
          const s = io.sockets.sockets.get(player.id);
          if(s) s.emit('azul_notice', { message: `${quitter.username} resigned and was eliminated.` });
        });
        updatePresence();
        return;
      }

      const winner = remaining[0] || game.players.find(p => p.username !== socket.username);
      if(!winner) return;
      game.ended = true;
      clearTurnTimer(game);
      applyAzulResult(game, winner.username, 'resign')
        .then(result=>emitEnd(game, {
          winner: winner.username,
          reason: 'resign',
          message: `${quitter.username} resigned.`,
          rewards: result?.players || {},
          scores: game.players.reduce((acc, p) => ({ ...acc, [p.username]: p.score }), {})
        }))
        .catch(err => {
          console.error('Azul points update error:', err);
          emitEnd(game, {
            winner: winner.username,
            reason: 'resign',
            message: `${quitter.username} resigned.`,
            rewards: {},
            scores: game.players.reduce((acc, p) => ({ ...acc, [p.username]: p.score }), {})
          });
        })
        .finally(()=>updatePresence());
    });

    socket.on('azul_rematch', ()=>{
      const gameId = findGameIdForSocket();
      if(!gameId) return;

      const game = state.azulGames[gameId];
      if(!game || !game.ended) return;

      if(!state.rematchRequests[gameId]) state.rematchRequests[gameId] = {};
      state.rematchRequests[gameId][socket.username] = true;

      const requestedBy = Object.keys(state.rematchRequests[gameId]);
      game.players.forEach(player => {
        const s = io.sockets.sockets.get(player.id);
        if(!s) return;
        s.emit('azul_rematch_status', { requestedBy });
        if(player.username !== socket.username){
          s.emit('game_rematch_invite', {
            from: socket.username,
            toUsername: player.username,
            gameKey: 'azul',
            label: 'Azul Arena',
            message: `${socket.username} wants an Azul Arena rematch.`
          });
        }
      });

      const allReady = game.players.every(player => state.rematchRequests[gameId][player.username]);
      if(!allReady) return;

      const lobby = {
        maxPlayers: game.maxPlayers || game.players.length,
        players: game.players
          .map(p => ({ id: p.id, username: p.username }))
          .reverse()
      };
      state.azulGames[gameId] = createGame(gameId, lobby);
      state.rematchRequests[gameId] = {};
      startTurnTimer(state.azulGames[gameId]);

      emitState(state.azulGames[gameId]);
      state.azulGames[gameId].players.forEach(player => {
        const s = io.sockets.sockets.get(player.id);
        if(s) s.emit('azul_rematch_start');
      });
    });
  }

  return {
    register,
    findGameIdForSocket,
    emitState
  };
}

module.exports = { createAzulModule };

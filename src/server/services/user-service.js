function computeEloDelta(winnerElo, loserElo, kFactor = 32){
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  return Math.max(8, Math.round(kFactor * (1 - expectedWinner)));
}

function pushHistoryEntry(user, entry){
  if(!Array.isArray(user.matchHistory)) user.matchHistory = [];
  user.matchHistory.unshift({
    playedAt: new Date(),
    ...entry
  });
  user.matchHistory = user.matchHistory.slice(0, 5);
}

function getUserChessElo(user){
  return user.chessElo || user.elo || 1000;
}

function syncLegacyChessElo(user, value){
  user.chessElo = value;
  user.elo = value;
}

function getChessScoreFinal(game, winnerUsername){
  if(!winnerUsername) return '1/2-1/2';

  const winner = game.players.find(p => p.username === winnerUsername);
  if(!winner) return '';
  return winner.color === 'w' ? '1-0' : '0-1';
}

function countOthelloDisks(board){
  const score = { black: 0, white: 0 };
  if(!Array.isArray(board)) return score;

  board.forEach(row => {
    if(!Array.isArray(row)) return;
    row.forEach(cell => {
      if(cell === 'black') score.black += 1;
      if(cell === 'white') score.white += 1;
    });
  });

  return score;
}

function getOthelloScoreFinal(game){
  const score = countOthelloDisks(game.board);
  return `${score.black}-${score.white}`;
}

function getAzulScoreFinal(game){
  if(!Array.isArray(game?.players)) return '';
  return game.players.map(player => `${player.username} ${player.score || 0}`).join(' - ');
}

function resultPayload(username, result, xpChange, eloChange){
  return { username, result, xpChange, eloChange };
}

async function applyRankedResult(User, game, winnerUsername, reason = 'game_end'){
  if(!game || game.rated) return;
  if(!Array.isArray(game.players) || game.players.length < 2) return;

  if(!winnerUsername){
    const [userA, userB] = await Promise.all([
      User.findOne({ username: game.players[0].username }),
      User.findOne({ username: game.players[1].username })
    ]);

    if(!userA || !userB) return;

    userA.draws = (userA.draws || 0) + 1;
    userB.draws = (userB.draws || 0) + 1;
    userA.xp += 5;
    userB.xp += 5;

    const scoreFinal = getChessScoreFinal(game, null);

    pushHistoryEntry(userA, { result: 'draw', opponent: userB.username, xpChange: 5, reason, gameKey: 'chess', gameName: 'Chess', scoreFinal, eloChange: 0 });
    pushHistoryEntry(userB, { result: 'draw', opponent: userA.username, xpChange: 5, reason, gameKey: 'chess', gameName: 'Chess', scoreFinal, eloChange: 0 });

    await Promise.all([userA.save(), userB.save()]);

    game.rated = true;
    game.result = { winner: null, loser: null, reason, eloDelta: 0 };
    return {
      players: {
        [userA.username]: resultPayload(userA.username, 'draw', 5, 0),
        [userB.username]: resultPayload(userB.username, 'draw', 5, 0)
      }
    };
  }

  const loser = game.players.find(p => p.username !== winnerUsername);
  if(!loser) return;

  const [winnerUser, loserUser] = await Promise.all([
    User.findOne({ username: winnerUsername }),
    User.findOne({ username: loser.username })
  ]);
  if(!winnerUser || !loserUser) return;

  const winnerElo = getUserChessElo(winnerUser);
  const loserElo = getUserChessElo(loserUser);
  const eloDelta = computeEloDelta(winnerElo, loserElo);

  syncLegacyChessElo(winnerUser, winnerElo + eloDelta);
  syncLegacyChessElo(loserUser, Math.max(100, loserElo - eloDelta));
  winnerUser.xp += 25;
  loserUser.xp += 5;
  winnerUser.wins = (winnerUser.wins || 0) + 1;
  loserUser.losses = (loserUser.losses || 0) + 1;

  const scoreFinal = getChessScoreFinal(game, winnerUsername);

  pushHistoryEntry(winnerUser, { result: 'win', opponent: loserUser.username, xpChange: 25, reason, gameKey: 'chess', gameName: 'Chess', scoreFinal, eloChange: eloDelta });
  pushHistoryEntry(loserUser, { result: 'loss', opponent: winnerUser.username, xpChange: 5, reason, gameKey: 'chess', gameName: 'Chess', scoreFinal, eloChange: -eloDelta });

  await Promise.all([winnerUser.save(), loserUser.save()]);

  game.rated = true;
  game.result = { winner: winnerUsername, loser: loser.username, reason, eloDelta };
  return {
    players: {
      [winnerUser.username]: resultPayload(winnerUser.username, 'win', 25, eloDelta),
      [loserUser.username]: resultPayload(loserUser.username, 'loss', 5, -eloDelta)
    }
  };
}

async function applyOthelloResult(User, game, winnerColor, reason = 'game_end'){
  if(!game || game.rated) return;

  const blackPlayer = game.players.find(p => p.color === 'black');
  const whitePlayer = game.players.find(p => p.color === 'white');
  if(!blackPlayer || !whitePlayer) return;

  const [blackUser, whiteUser] = await Promise.all([
    User.findOne({ username: blackPlayer.username }),
    User.findOne({ username: whitePlayer.username })
  ]);
  if(!blackUser || !whiteUser) return;

  const blackElo = blackUser.othelloElo || blackUser.othelloPoints || 1000;
  const whiteElo = whiteUser.othelloElo || whiteUser.othelloPoints || 1000;
  const scoreFinal = getOthelloScoreFinal(game);

  if(!winnerColor){
    blackUser.othelloPoints = (blackUser.othelloPoints || 0) + 4;
    whiteUser.othelloPoints = (whiteUser.othelloPoints || 0) + 4;
    blackUser.othelloElo = blackElo;
    whiteUser.othelloElo = whiteElo;
    blackUser.xp += 2;
    whiteUser.xp += 2;
    blackUser.draws = (blackUser.draws || 0) + 1;
    whiteUser.draws = (whiteUser.draws || 0) + 1;
    pushHistoryEntry(blackUser, { result: 'draw', opponent: whiteUser.username, xpChange: 2, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: 0 });
    pushHistoryEntry(whiteUser, { result: 'draw', opponent: blackUser.username, xpChange: 2, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: 0 });
    game.result = { winner: null, loser: null, reason, eloDelta: 0 };
  } else if(winnerColor === 'black'){
    const eloDelta = computeEloDelta(blackElo, whiteElo);
    blackUser.othelloPoints = (blackUser.othelloPoints || 0) + 12;
    whiteUser.othelloPoints = (whiteUser.othelloPoints || 0) + 3;
    blackUser.othelloElo = blackElo + eloDelta;
    whiteUser.othelloElo = Math.max(100, whiteElo - eloDelta);
    blackUser.xp += 10;
    whiteUser.xp += 2;
    blackUser.wins = (blackUser.wins || 0) + 1;
    whiteUser.losses = (whiteUser.losses || 0) + 1;
    pushHistoryEntry(blackUser, { result: 'win', opponent: whiteUser.username, xpChange: 10, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: eloDelta });
    pushHistoryEntry(whiteUser, { result: 'loss', opponent: blackUser.username, xpChange: 2, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: -eloDelta });
    game.result = { winner: blackUser.username, loser: whiteUser.username, reason, eloDelta };
  } else {
    const eloDelta = computeEloDelta(whiteElo, blackElo);
    whiteUser.othelloPoints = (whiteUser.othelloPoints || 0) + 12;
    blackUser.othelloPoints = (blackUser.othelloPoints || 0) + 3;
    whiteUser.othelloElo = whiteElo + eloDelta;
    blackUser.othelloElo = Math.max(100, blackElo - eloDelta);
    whiteUser.xp += 10;
    blackUser.xp += 2;
    whiteUser.wins = (whiteUser.wins || 0) + 1;
    blackUser.losses = (blackUser.losses || 0) + 1;
    pushHistoryEntry(whiteUser, { result: 'win', opponent: blackUser.username, xpChange: 10, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: eloDelta });
    pushHistoryEntry(blackUser, { result: 'loss', opponent: whiteUser.username, xpChange: 2, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: -eloDelta });
    game.result = { winner: whiteUser.username, loser: blackUser.username, reason, eloDelta };
  }

  await Promise.all([blackUser.save(), whiteUser.save()]);
  game.rated = true;
  return {
    players: {
      [blackUser.username]: resultPayload(
        blackUser.username,
        !winnerColor ? 'draw' : winnerColor === 'black' ? 'win' : 'loss',
        !winnerColor ? 2 : winnerColor === 'black' ? 10 : 2,
        !winnerColor ? 0 : winnerColor === 'black' ? game.result.eloDelta : -game.result.eloDelta
      ),
      [whiteUser.username]: resultPayload(
        whiteUser.username,
        !winnerColor ? 'draw' : winnerColor === 'white' ? 'win' : 'loss',
        !winnerColor ? 2 : winnerColor === 'white' ? 10 : 2,
        !winnerColor ? 0 : winnerColor === 'white' ? game.result.eloDelta : -game.result.eloDelta
      )
    }
  };
}

async function applyAzulResult(User, game, winnerUsername, reason = 'game_end'){
  if(!game || game.rated) return;
  if(!Array.isArray(game.players) || game.players.length < 2) return;

  const [playerA, playerB] = game.players;
  const [userA, userB] = await Promise.all([
    User.findOne({ username: playerA.username }),
    User.findOne({ username: playerB.username })
  ]);
  if(!userA || !userB) return;

  const scoreFinal = getAzulScoreFinal(game);
  const eloA = userA.azulElo || userA.azulPoints || 1000;
  const eloB = userB.azulElo || userB.azulPoints || 1000;

  if(!winnerUsername){
    userA.azulPoints = (userA.azulPoints || 0) + 4;
    userB.azulPoints = (userB.azulPoints || 0) + 4;
    userA.azulElo = eloA;
    userB.azulElo = eloB;
    userA.xp += 4;
    userB.xp += 4;
    userA.draws = (userA.draws || 0) + 1;
    userB.draws = (userB.draws || 0) + 1;
    pushHistoryEntry(userA, { result: 'draw', opponent: userB.username, xpChange: 4, reason, gameKey: 'azul', gameName: 'Azul', scoreFinal, eloChange: 0 });
    pushHistoryEntry(userB, { result: 'draw', opponent: userA.username, xpChange: 4, reason, gameKey: 'azul', gameName: 'Azul', scoreFinal, eloChange: 0 });
    game.result = { winner: null, loser: null, reason, eloDelta: 0 };

    await Promise.all([userA.save(), userB.save()]);
    game.rated = true;
    return {
      players: {
        [userA.username]: resultPayload(userA.username, 'draw', 4, 0),
        [userB.username]: resultPayload(userB.username, 'draw', 4, 0)
      }
    };
  }

  const winnerUser = winnerUsername === userA.username ? userA : userB;
  const loserUser = winnerUsername === userA.username ? userB : userA;
  const winnerElo = winnerUser.azulElo || winnerUser.azulPoints || 1000;
  const loserElo = loserUser.azulElo || loserUser.azulPoints || 1000;
  const eloDelta = computeEloDelta(winnerElo, loserElo);

  winnerUser.azulPoints = (winnerUser.azulPoints || 0) + 14;
  loserUser.azulPoints = (loserUser.azulPoints || 0) + 4;
  winnerUser.azulElo = winnerElo + eloDelta;
  loserUser.azulElo = Math.max(100, loserElo - eloDelta);
  winnerUser.xp += 18;
  loserUser.xp += 4;
  winnerUser.wins = (winnerUser.wins || 0) + 1;
  loserUser.losses = (loserUser.losses || 0) + 1;

  pushHistoryEntry(winnerUser, { result: 'win', opponent: loserUser.username, xpChange: 18, reason, gameKey: 'azul', gameName: 'Azul', scoreFinal, eloChange: eloDelta });
  pushHistoryEntry(loserUser, { result: 'loss', opponent: winnerUser.username, xpChange: 4, reason, gameKey: 'azul', gameName: 'Azul', scoreFinal, eloChange: -eloDelta });

  await Promise.all([winnerUser.save(), loserUser.save()]);

  game.rated = true;
  game.result = { winner: winnerUser.username, loser: loserUser.username, reason, eloDelta };
  return {
    players: {
      [winnerUser.username]: resultPayload(winnerUser.username, 'win', 18, eloDelta),
      [loserUser.username]: resultPayload(loserUser.username, 'loss', 4, -eloDelta)
    }
  };
}

async function getLeaderboard(User, type){
  if(type === 'azul'){
    return User.find({}, { username: 1, azulElo: 1, azulPoints: 1, _id: 0 }).sort({ azulElo: -1, azulPoints: -1, username: 1 }).lean();
  }

  if(type === 'strategy'){
    return User.find({}, { username: 1, strategyElo: 1, strategyPoints: 1, _id: 0 }).sort({ strategyElo: -1, strategyPoints: -1, username: 1 }).lean();
  }

  if(type === 'chess'){
    return User.find({}, { username: 1, chessElo: 1, elo: 1, _id: 0 }).sort({ chessElo: -1, elo: -1, username: 1 }).lean();
  }

  if(type === 'othello'){
    return User.find({}, { username: 1, othelloElo: 1, othelloPoints: 1, _id: 0 }).sort({ othelloElo: -1, othelloPoints: -1, username: 1 }).lean();
  }

  return User.find({}, { username: 1, xp: 1, _id: 0 }).sort({ xp: -1, username: 1 }).lean();
}

module.exports = {
  applyRankedResult,
  applyOthelloResult,
  applyAzulResult,
  getLeaderboard
};

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
    return;
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
  }

  await Promise.all([blackUser.save(), whiteUser.save()]);
  game.rated = true;
}

async function getLeaderboard(User, type){
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
  getLeaderboard
};

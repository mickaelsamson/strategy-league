function computeEloDelta(winnerElo, loserElo, kFactor = 32){
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  return Math.max(8, Math.round(kFactor * (1 - expectedWinner)));
}

function pushHistoryEntry(user, entry){
  if(!Array.isArray(user.matchHistory)) user.matchHistory = [];
  user.matchHistory.unshift(entry);
  user.matchHistory = user.matchHistory.slice(0, 20);
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

    pushHistoryEntry(userA, { result: 'draw', opponent: userB.username, xpChange: 5, reason });
    pushHistoryEntry(userB, { result: 'draw', opponent: userA.username, xpChange: 5, reason });

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

  const eloDelta = computeEloDelta(winnerUser.elo, loserUser.elo);

  winnerUser.elo += eloDelta;
  loserUser.elo = Math.max(100, loserUser.elo - eloDelta);
  winnerUser.xp += 25;
  loserUser.xp += 5;
  winnerUser.wins = (winnerUser.wins || 0) + 1;
  loserUser.losses = (loserUser.losses || 0) + 1;

  pushHistoryEntry(winnerUser, { result: 'win', opponent: loserUser.username, xpChange: 25, reason });
  pushHistoryEntry(loserUser, { result: 'loss', opponent: winnerUser.username, xpChange: 5, reason });

  await Promise.all([winnerUser.save(), loserUser.save()]);

  game.rated = true;
  game.result = { winner: winnerUsername, loser: loser.username, reason, eloDelta };
}

async function applyOthelloResult(User, game, winnerColor){
  if(!game || game.rated) return;

  const blackPlayer = game.players.find(p => p.color === 'black');
  const whitePlayer = game.players.find(p => p.color === 'white');
  if(!blackPlayer || !whitePlayer) return;

  const [blackUser, whiteUser] = await Promise.all([
    User.findOne({ username: blackPlayer.username }),
    User.findOne({ username: whitePlayer.username })
  ]);
  if(!blackUser || !whiteUser) return;

  if(!winnerColor){
    blackUser.othelloPoints = (blackUser.othelloPoints || 0) + 4;
    whiteUser.othelloPoints = (whiteUser.othelloPoints || 0) + 4;
    blackUser.xp += 2;
    whiteUser.xp += 2;
  } else if(winnerColor === 'black'){
    blackUser.othelloPoints = (blackUser.othelloPoints || 0) + 12;
    whiteUser.othelloPoints = (whiteUser.othelloPoints || 0) + 3;
    blackUser.xp += 10;
    whiteUser.xp += 2;
  } else {
    whiteUser.othelloPoints = (whiteUser.othelloPoints || 0) + 12;
    blackUser.othelloPoints = (blackUser.othelloPoints || 0) + 3;
    whiteUser.xp += 10;
    blackUser.xp += 2;
  }

  await Promise.all([blackUser.save(), whiteUser.save()]);
  game.rated = true;
}

async function getLeaderboard(User, type){
  if(type === 'strategy'){
    return User.find({}, { username: 1, strategyPoints: 1, _id: 0 }).sort({ strategyPoints: -1, username: 1 }).lean();
  }

  if(type === 'chess'){
    return User.find({}, { username: 1, elo: 1, _id: 0 }).sort({ elo: -1, username: 1 }).lean();
  }

  if(type === 'othello'){
    return User.find({}, { username: 1, othelloPoints: 1, _id: 0 }).sort({ othelloPoints: -1, username: 1 }).lean();
  }

  return User.find({}, { username: 1, xp: 1, _id: 0 }).sort({ xp: -1, username: 1 }).lean();
}

module.exports = {
  applyRankedResult,
  applyOthelloResult,
  getLeaderboard
};

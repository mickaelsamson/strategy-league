function computeEloDelta(winnerElo, loserElo, kFactor = 32){
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  return Math.max(8, Math.round(kFactor * (1 - expectedWinner)));
}

const GAME_OF_WEEK_GAMES = [
  { key: 'chess', name: 'Chess', url: '/chess/index.html', xpEnabled: true },
  { key: 'othello', name: 'Othello', url: '/othello/index.html', xpEnabled: true },
  { key: 'azul', name: 'Azul Arena', url: '/azul/index.html', xpEnabled: true }
];

function hashString(value){
  let hash = 2166136261;
  for(let i = 0; i < value.length; i += 1){
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getWeekId(date = new Date()){
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = current.getUTCDay();
  current.setUTCDate(current.getUTCDate() - day);
  return current.toISOString().slice(0, 10);
}

function getDayId(date = new Date()){
  return date.toISOString().slice(0, 10);
}

function getGameOfWeek(date = new Date()){
  const weekId = getWeekId(date);
  const index = hashString(`strategy-league:${weekId}`) % GAME_OF_WEEK_GAMES.length;
  return {
    ...GAME_OF_WEEK_GAMES[index],
    weekId
  };
}

function grantXp(user, gameKey, baseXp){
  const amount = Math.max(0, Number(baseXp) || 0);
  const gameOfWeek = getGameOfWeek();
  const today = getDayId();
  let bonus = 0;

  if(amount > 0 && gameOfWeek.key === gameKey && gameOfWeek.xpEnabled){
    const previous = user.gameOfWeekBonus || {};
    if(previous.date !== today || previous.gameKey !== gameKey){
      bonus = amount;
      user.gameOfWeekBonus = { date: today, gameKey };
    }
  }

  user.xp = (user.xp || 0) + amount + bonus;
  return { total: amount + bonus, bonus };
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

function resultPayload(username, result, xpChange, eloChange, gameOfWeekBonus = 0){
  return { username, result, xpChange, eloChange, gameOfWeekBonus };
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
    const userAXp = grantXp(userA, 'chess', 5);
    const userBXp = grantXp(userB, 'chess', 5);

    const scoreFinal = getChessScoreFinal(game, null);

    pushHistoryEntry(userA, { result: 'draw', opponent: userB.username, xpChange: userAXp.total, reason, gameKey: 'chess', gameName: 'Chess', scoreFinal, eloChange: 0, gameOfWeekBonus: userAXp.bonus });
    pushHistoryEntry(userB, { result: 'draw', opponent: userA.username, xpChange: userBXp.total, reason, gameKey: 'chess', gameName: 'Chess', scoreFinal, eloChange: 0, gameOfWeekBonus: userBXp.bonus });

    await Promise.all([userA.save(), userB.save()]);

    game.rated = true;
    game.result = { winner: null, loser: null, reason, eloDelta: 0 };
    return {
      players: {
        [userA.username]: resultPayload(userA.username, 'draw', userAXp.total, 0, userAXp.bonus),
        [userB.username]: resultPayload(userB.username, 'draw', userBXp.total, 0, userBXp.bonus)
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
  const winnerXp = grantXp(winnerUser, 'chess', 25);
  const loserXp = grantXp(loserUser, 'chess', 5);
  winnerUser.wins = (winnerUser.wins || 0) + 1;
  loserUser.losses = (loserUser.losses || 0) + 1;

  const scoreFinal = getChessScoreFinal(game, winnerUsername);

  pushHistoryEntry(winnerUser, { result: 'win', opponent: loserUser.username, xpChange: winnerXp.total, reason, gameKey: 'chess', gameName: 'Chess', scoreFinal, eloChange: eloDelta, gameOfWeekBonus: winnerXp.bonus });
  pushHistoryEntry(loserUser, { result: 'loss', opponent: winnerUser.username, xpChange: loserXp.total, reason, gameKey: 'chess', gameName: 'Chess', scoreFinal, eloChange: -eloDelta, gameOfWeekBonus: loserXp.bonus });

  await Promise.all([winnerUser.save(), loserUser.save()]);

  game.rated = true;
  game.result = { winner: winnerUsername, loser: loser.username, reason, eloDelta };
  return {
    players: {
      [winnerUser.username]: resultPayload(winnerUser.username, 'win', winnerXp.total, eloDelta, winnerXp.bonus),
      [loserUser.username]: resultPayload(loserUser.username, 'loss', loserXp.total, -eloDelta, loserXp.bonus)
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
    const blackXp = grantXp(blackUser, 'othello', 2);
    const whiteXp = grantXp(whiteUser, 'othello', 2);
    blackUser.draws = (blackUser.draws || 0) + 1;
    whiteUser.draws = (whiteUser.draws || 0) + 1;
    pushHistoryEntry(blackUser, { result: 'draw', opponent: whiteUser.username, xpChange: blackXp.total, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: 0, gameOfWeekBonus: blackXp.bonus });
    pushHistoryEntry(whiteUser, { result: 'draw', opponent: blackUser.username, xpChange: whiteXp.total, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: 0, gameOfWeekBonus: whiteXp.bonus });
    game.result = { winner: null, loser: null, reason, eloDelta: 0 };
  } else if(winnerColor === 'black'){
    const eloDelta = computeEloDelta(blackElo, whiteElo);
    blackUser.othelloPoints = (blackUser.othelloPoints || 0) + 12;
    whiteUser.othelloPoints = (whiteUser.othelloPoints || 0) + 3;
    blackUser.othelloElo = blackElo + eloDelta;
    whiteUser.othelloElo = Math.max(100, whiteElo - eloDelta);
    const blackXp = grantXp(blackUser, 'othello', 10);
    const whiteXp = grantXp(whiteUser, 'othello', 2);
    blackUser.wins = (blackUser.wins || 0) + 1;
    whiteUser.losses = (whiteUser.losses || 0) + 1;
    pushHistoryEntry(blackUser, { result: 'win', opponent: whiteUser.username, xpChange: blackXp.total, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: eloDelta, gameOfWeekBonus: blackXp.bonus });
    pushHistoryEntry(whiteUser, { result: 'loss', opponent: blackUser.username, xpChange: whiteXp.total, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: -eloDelta, gameOfWeekBonus: whiteXp.bonus });
    game.result = { winner: blackUser.username, loser: whiteUser.username, reason, eloDelta };
  } else {
    const eloDelta = computeEloDelta(whiteElo, blackElo);
    whiteUser.othelloPoints = (whiteUser.othelloPoints || 0) + 12;
    blackUser.othelloPoints = (blackUser.othelloPoints || 0) + 3;
    whiteUser.othelloElo = whiteElo + eloDelta;
    blackUser.othelloElo = Math.max(100, blackElo - eloDelta);
    const whiteXp = grantXp(whiteUser, 'othello', 10);
    const blackXp = grantXp(blackUser, 'othello', 2);
    whiteUser.wins = (whiteUser.wins || 0) + 1;
    blackUser.losses = (blackUser.losses || 0) + 1;
    pushHistoryEntry(whiteUser, { result: 'win', opponent: blackUser.username, xpChange: whiteXp.total, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: eloDelta, gameOfWeekBonus: whiteXp.bonus });
    pushHistoryEntry(blackUser, { result: 'loss', opponent: whiteUser.username, xpChange: blackXp.total, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: -eloDelta, gameOfWeekBonus: blackXp.bonus });
    game.result = { winner: whiteUser.username, loser: blackUser.username, reason, eloDelta };
  }

  await Promise.all([blackUser.save(), whiteUser.save()]);
  game.rated = true;
  const blackHistory = blackUser.matchHistory?.[0] || {};
  const whiteHistory = whiteUser.matchHistory?.[0] || {};
  return {
    players: {
      [blackUser.username]: resultPayload(
        blackUser.username,
        !winnerColor ? 'draw' : winnerColor === 'black' ? 'win' : 'loss',
        blackHistory.xpChange || 0,
        !winnerColor ? 0 : winnerColor === 'black' ? game.result.eloDelta : -game.result.eloDelta,
        blackHistory.gameOfWeekBonus || 0
      ),
      [whiteUser.username]: resultPayload(
        whiteUser.username,
        !winnerColor ? 'draw' : winnerColor === 'white' ? 'win' : 'loss',
        whiteHistory.xpChange || 0,
        !winnerColor ? 0 : winnerColor === 'white' ? game.result.eloDelta : -game.result.eloDelta,
        whiteHistory.gameOfWeekBonus || 0
      )
    }
  };
}

async function applyAzulResult(User, game, winnerUsername, reason = 'game_end'){
  if(!game || game.rated) return;
  if(!Array.isArray(game.players) || game.players.length < 2) return;

  const users = await Promise.all(game.players.map(player => User.findOne({ username: player.username })));
  if(users.some(user => !user)) return;
  const scoreFinal = getAzulScoreFinal(game);
  const payload = {};

  if(!winnerUsername){
    users.forEach(user => {
      const opponents = users.filter(other => other.username !== user.username).map(other => other.username).join(', ');
      user.azulPoints = (user.azulPoints || 0) + 4;
      user.azulElo = user.azulElo || 1000;
      const xp = grantXp(user, 'azul', 4);
      user.draws = (user.draws || 0) + 1;
      pushHistoryEntry(user, { result: 'draw', opponent: opponents || 'Table', xpChange: xp.total, reason, gameKey: 'azul', gameName: 'Azul', scoreFinal, eloChange: 0, gameOfWeekBonus: xp.bonus });
      payload[user.username] = resultPayload(user.username, 'draw', xp.total, 0, xp.bonus);
    });
    game.result = { winner: null, loser: null, reason, eloDelta: 0 };
    await Promise.all(users.map(user => user.save()));
    game.rated = true;
    return { players: payload };
  }

  const winnerUser = users.find(user => user.username === winnerUsername);
  if(!winnerUser) return;
  const loserUsers = users.filter(user => user.username !== winnerUsername);
  const winnerElo = winnerUser.azulElo || winnerUser.azulPoints || 1000;
  const eloDelta = Math.max(8, Math.round(
    loserUsers.reduce((total, loserUser) => total + computeEloDelta(winnerElo, loserUser.azulElo || loserUser.azulPoints || 1000), 0) /
    Math.max(1, loserUsers.length)
  ));

  winnerUser.azulPoints = (winnerUser.azulPoints || 0) + 14;
  winnerUser.azulElo = winnerElo + eloDelta;
  const winnerXp = grantXp(winnerUser, 'azul', 18);
  winnerUser.wins = (winnerUser.wins || 0) + 1;

  pushHistoryEntry(winnerUser, { result: 'win', opponent: loserUsers.map(user => user.username).join(', ') || 'Table', xpChange: winnerXp.total, reason, gameKey: 'azul', gameName: 'Azul', scoreFinal, eloChange: eloDelta, gameOfWeekBonus: winnerXp.bonus });
  payload[winnerUser.username] = resultPayload(winnerUser.username, 'win', winnerXp.total, eloDelta, winnerXp.bonus);

  loserUsers.forEach(loserUser => {
    const loserElo = loserUser.azulElo || loserUser.azulPoints || 1000;
    loserUser.azulPoints = (loserUser.azulPoints || 0) + 4;
    loserUser.azulElo = Math.max(100, loserElo - eloDelta);
    const loserXp = grantXp(loserUser, 'azul', 4);
    loserUser.losses = (loserUser.losses || 0) + 1;
    pushHistoryEntry(loserUser, { result: 'loss', opponent: winnerUser.username, xpChange: loserXp.total, reason, gameKey: 'azul', gameName: 'Azul', scoreFinal, eloChange: -eloDelta, gameOfWeekBonus: loserXp.bonus });
    payload[loserUser.username] = resultPayload(loserUser.username, 'loss', loserXp.total, -eloDelta, loserXp.bonus);
  });

  await Promise.all(users.map(user => user.save()));

  game.rated = true;
  game.result = { winner: winnerUser.username, losers: loserUsers.map(user => user.username), reason, eloDelta };
  return { players: payload };
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
  getGameOfWeek,
  getLeaderboard
};

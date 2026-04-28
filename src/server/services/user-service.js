const { GAME_CATALOG, LEVEL_THRESHOLDS, XP_RULES } = require('../config/constants');
const { getGameConfig, getWeeklyChallengeSettings } = require('../state');

function computeEloDelta(winnerElo, loserElo, kFactor = 32){
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  return Math.max(8, Math.round(kFactor * (1 - expectedWinner)));
}

const GAME_OF_WEEK_GAMES = Object.values(GAME_CATALOG)
  .filter(game => game.gameOfWeekEligible)
  .map(game => ({
    key: game.key,
    name: game.name,
    url: game.url,
    xpEnabled: true
  }));

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
  const settings = getWeeklyChallengeSettings();
  const index = hashString(`strategy-league:${weekId}`) % GAME_OF_WEEK_GAMES.length;
  const fallbackGame = GAME_OF_WEEK_GAMES[index];
  const configuredGame = GAME_CATALOG[settings.doubleXpGameKey] || null;
  const selectedGames = settings.selectedGameKeys
    .map(key => GAME_CATALOG[key])
    .filter(Boolean)
    .map(game => ({
      key: game.key,
      name: game.name,
      url: game.url
    }));

  if(settings.enabled && settings.mode === 'multi_game_bonus'){
    return {
      enabled: true,
      mode: settings.mode,
      key: selectedGames[0]?.key || fallbackGame.key,
      name: 'Weekly Circuit',
      url: '/games.html',
      xpEnabled: true,
      weekId,
      selectedGameKeys: selectedGames.map(game => game.key),
      games: selectedGames,
      extraXp: settings.extraXp
    };
  }

  const game = configuredGame
    ? { key: configuredGame.key, name: configuredGame.name, url: configuredGame.url, xpEnabled: true }
    : fallbackGame;

  return {
    enabled: settings.enabled,
    mode: 'double_xp',
    ...game,
    weekId
  };
}

function clampXp(value){
  return Math.max(0, Math.round(Number(value) || 0));
}

function getGameMeta(gameKey){
  return GAME_CATALOG[gameKey] || null;
}

function getXpRule(gameKey){
  return XP_RULES[gameKey] || null;
}

function isAbandonReason(reason){
  return ['resign', 'disconnect', 'timeout', 'abandon', 'surrender'].includes(reason);
}

function isSurrenderReason(reason){
  return ['resign', 'abandon', 'surrender'].includes(reason);
}

function resolveMatchXp(user, gameKey, outcome, options = {}){
  const rule = getXpRule(gameKey);
  if(!rule){
    return { total: 0, bonus: 0, weeklyChallengeBonus: 0 };
  }

  if(outcome === 'abandon'){
    return applyXpDelta(user, gameKey, rule.abandonPenalty, { allowBonus: false, reason: options.reason });
  }

  const amount = outcome === 'win'
    ? rule.win
    : outcome === 'loss'
      ? rule.loss
      : rule.draw;

  return applyXpDelta(user, gameKey, amount, { allowBonus: true, reason: options.reason });
}

function applyXpDelta(user, gameKey, amount, options = {}){
  const gameConfig = getGameConfig(gameKey);
  if(gameConfig.noXp && options.ignoreNoXp !== true){
    return { total: 0, bonus: 0, weeklyChallengeBonus: 0 };
  }

  const numericAmount = Math.round(Number(amount) || 0);
  const allowBonus = options.allowBonus !== false;
  const gameOfWeek = getGameOfWeek();
  const today = getDayId();
  let bonus = 0;
  let weeklyChallengeBonus = 0;

  if(numericAmount > 0 && allowBonus && gameOfWeek.enabled && gameOfWeek.mode === 'double_xp' && gameOfWeek.key === gameKey && gameOfWeek.xpEnabled){
    bonus = numericAmount;
    user.gameOfWeekBonus = { date: today, gameKey };
  }

  if(numericAmount > 0 && allowBonus && gameOfWeek.enabled && gameOfWeek.mode === 'multi_game_bonus'){
    const selectedGameKeys = Array.isArray(gameOfWeek.selectedGameKeys) ? gameOfWeek.selectedGameKeys : [];
    const challengeId = `${gameOfWeek.weekId}:${selectedGameKeys.join(',')}:${gameOfWeek.extraXp}`;
    const previous = user.gameOfWeekBonus || {};
    const previousAward = user.weeklyChallengeAward || {};
    const playedGames = new Set(
      (user.matchHistory || [])
        .filter(entry => entry?.playedAt && new Date(entry.playedAt) >= new Date(`${gameOfWeek.weekId}T00:00:00.000Z`))
        .filter(entry => selectedGameKeys.includes(entry.gameKey))
        .filter(entry => !isSurrenderReason(entry.reason))
        .map(entry => entry.gameKey)
    );

    if(selectedGameKeys.includes(gameKey) && !isSurrenderReason(options.reason)){
      playedGames.add(gameKey);
    }

    if(
      selectedGameKeys.length > 0 &&
      selectedGameKeys.every(key => playedGames.has(key)) &&
      (previousAward.weekId !== gameOfWeek.weekId || previousAward.challengeId !== challengeId)
    ){
      weeklyChallengeBonus = Math.max(0, Math.round(Number(gameOfWeek.extraXp) || 0));
      user.weeklyChallengeAward = { weekId: gameOfWeek.weekId, challengeId };
      user.gameOfWeekBonus = { date: previous.date || today, gameKey: previous.gameKey || gameKey };
    }
  }

  user.xp = clampXp((user.xp || 0) + numericAmount + bonus + weeklyChallengeBonus);
  return { total: numericAmount + bonus + weeklyChallengeBonus, bonus, weeklyChallengeBonus };
}

function pushHistoryEntry(user, entry){
  if(!Array.isArray(user.matchHistory)) user.matchHistory = [];
  user.matchHistory.unshift({
    playedAt: new Date(),
    ...entry
  });
  user.matchHistory = user.matchHistory.slice(0, 20);
}

function getUserElo(user, gameKey){
  const meta = getGameMeta(gameKey);
  if(!meta) return 1000;

  const value = user?.[meta.eloField]
    ?? (meta.legacyEloField ? user?.[meta.legacyEloField] : null)
    ?? (meta.pointsField ? user?.[meta.pointsField] : null)
    ?? (meta.legacyPointsField ? user?.[meta.legacyPointsField] : null);

  return Number(value) || 1000;
}

function setUserElo(user, gameKey, value){
  const meta = getGameMeta(gameKey);
  if(!meta) return;
  const safeValue = Math.max(100, Math.round(Number(value) || 1000));
  user[meta.eloField] = safeValue;
  if(meta.legacyEloField) user[meta.legacyEloField] = safeValue;
}

function getChessScoreFinal(game, winnerUsername){
  if(!winnerUsername) return '1/2-1/2';
  const winner = game.players.find(player => player.username === winnerUsername);
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

function resultPayload(username, result, xpChange, eloChange, gameOfWeekBonus = 0, weeklyChallengeBonus = 0){
  return { username, result, xpChange, eloChange, gameOfWeekBonus, weeklyChallengeBonus };
}

function buildRatingsPayload(user){
  return Object.keys(GAME_CATALOG).reduce((ratings, gameKey) => {
    ratings[gameKey] = getUserElo(user, gameKey);
    return ratings;
  }, {});
}

function getLevelInfo(xp){
  const totalXp = clampXp(xp);
  let level = 1;

  for(let i = 0; i < LEVEL_THRESHOLDS.length; i += 1){
    if(totalXp >= LEVEL_THRESHOLDS[i]){
      level = i + 1;
    }
  }

  const currentXp = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextXp = LEVEL_THRESHOLDS[level] || currentXp;
  const maxLevel = LEVEL_THRESHOLDS.length;
  const progress = level >= maxLevel || nextXp <= currentXp
    ? 100
    : Math.max(0, Math.min(100, Math.round(((totalXp - currentXp) / (nextXp - currentXp)) * 100)));

  return {
    level,
    currentXp,
    nextXp,
    progress,
    maxLevel
  };
}

function getPublicProfile(user){
  const wins = user.wins || 0;
  const losses = user.losses || 0;
  const draws = user.draws || 0;
  const total = wins + losses + draws;
  const winrate = total ? Math.round((wins / total) * 100) : 0;
  const xp = clampXp(user.xp || 0);
  const levelInfo = getLevelInfo(xp);
  const ratings = buildRatingsPayload(user);

  return {
    username: user.username,
    avatar: user.avatar || '',
    xp,
    level: levelInfo.level,
    levelInfo,
    ratings,
    elo: ratings.chess,
    chessElo: ratings.chess,
    othelloElo: ratings.othello,
    azulElo: ratings.azul,
    strategyElo: ratings.moonfall_world_conquest,
    moonfallP4Elo: ratings.moonfall_p4,
    hexblitzElo: ratings.hexblitz,
    moonfallSettlersElo: ratings.moonfall_settlers,
    moonfallWorldConquestElo: ratings.moonfall_world_conquest,
    moonfallRtsElo: ratings.moonfall_rts,
    stats: { wins, losses, draws, total, winrate },
    matchHistory: (user.matchHistory || []).slice(0, 20)
  };
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

    const userAXp = resolveMatchXp(userA, 'chess', 'draw', { reason });
    const userBXp = resolveMatchXp(userB, 'chess', 'draw', { reason });
    userA.draws = (userA.draws || 0) + 1;
    userB.draws = (userB.draws || 0) + 1;

    const scoreFinal = getChessScoreFinal(game, null);
    pushHistoryEntry(userA, { result: 'draw', opponent: userB.username, xpChange: userAXp.total, reason, gameKey: 'chess', gameName: 'Chess', scoreFinal, eloChange: 0, gameOfWeekBonus: userAXp.bonus, weeklyChallengeBonus: userAXp.weeklyChallengeBonus });
    pushHistoryEntry(userB, { result: 'draw', opponent: userA.username, xpChange: userBXp.total, reason, gameKey: 'chess', gameName: 'Chess', scoreFinal, eloChange: 0, gameOfWeekBonus: userBXp.bonus, weeklyChallengeBonus: userBXp.weeklyChallengeBonus });

    await Promise.all([userA.save(), userB.save()]);
    game.rated = true;
    game.result = { winner: null, loser: null, reason, eloDelta: 0 };
    return {
      players: {
        [userA.username]: resultPayload(userA.username, 'draw', userAXp.total, 0, userAXp.bonus, userAXp.weeklyChallengeBonus),
        [userB.username]: resultPayload(userB.username, 'draw', userBXp.total, 0, userBXp.bonus, userBXp.weeklyChallengeBonus)
      }
    };
  }

  const loser = game.players.find(player => player.username !== winnerUsername);
  if(!loser) return;

  const [winnerUser, loserUser] = await Promise.all([
    User.findOne({ username: winnerUsername }),
    User.findOne({ username: loser.username })
  ]);
  if(!winnerUser || !loserUser) return;

  const winnerElo = getUserElo(winnerUser, 'chess');
  const loserElo = getUserElo(loserUser, 'chess');
  const eloDelta = computeEloDelta(winnerElo, loserElo);
  setUserElo(winnerUser, 'chess', winnerElo + eloDelta);
  setUserElo(loserUser, 'chess', loserElo - eloDelta);

  const winnerXp = resolveMatchXp(winnerUser, 'chess', 'win', { reason });
  const loserXp = resolveMatchXp(loserUser, 'chess', isAbandonReason(reason) ? 'abandon' : 'loss', { reason });
  winnerUser.wins = (winnerUser.wins || 0) + 1;
  loserUser.losses = (loserUser.losses || 0) + 1;

  const scoreFinal = getChessScoreFinal(game, winnerUsername);
  pushHistoryEntry(winnerUser, { result: 'win', opponent: loserUser.username, xpChange: winnerXp.total, reason, gameKey: 'chess', gameName: 'Chess', scoreFinal, eloChange: eloDelta, gameOfWeekBonus: winnerXp.bonus, weeklyChallengeBonus: winnerXp.weeklyChallengeBonus });
  pushHistoryEntry(loserUser, { result: 'loss', opponent: winnerUser.username, xpChange: loserXp.total, reason, gameKey: 'chess', gameName: 'Chess', scoreFinal, eloChange: -eloDelta, gameOfWeekBonus: loserXp.bonus, weeklyChallengeBonus: loserXp.weeklyChallengeBonus });

  await Promise.all([winnerUser.save(), loserUser.save()]);
  game.rated = true;
  game.result = { winner: winnerUsername, loser: loser.username, reason, eloDelta };
  return {
    players: {
      [winnerUser.username]: resultPayload(winnerUser.username, 'win', winnerXp.total, eloDelta, winnerXp.bonus, winnerXp.weeklyChallengeBonus),
      [loserUser.username]: resultPayload(loserUser.username, 'loss', loserXp.total, -eloDelta, loserXp.bonus, loserXp.weeklyChallengeBonus)
    }
  };
}

async function applyOthelloResult(User, game, winnerColor, reason = 'game_end'){
  if(!game || game.rated) return;

  const blackPlayer = game.players.find(player => player.color === 'black');
  const whitePlayer = game.players.find(player => player.color === 'white');
  if(!blackPlayer || !whitePlayer) return;

  const [blackUser, whiteUser] = await Promise.all([
    User.findOne({ username: blackPlayer.username }),
    User.findOne({ username: whitePlayer.username })
  ]);
  if(!blackUser || !whiteUser) return;

  const blackElo = getUserElo(blackUser, 'othello');
  const whiteElo = getUserElo(whiteUser, 'othello');
  const scoreFinal = getOthelloScoreFinal(game);

  if(!winnerColor){
    const blackXp = resolveMatchXp(blackUser, 'othello', 'draw', { reason });
    const whiteXp = resolveMatchXp(whiteUser, 'othello', 'draw', { reason });
    blackUser.draws = (blackUser.draws || 0) + 1;
    whiteUser.draws = (whiteUser.draws || 0) + 1;
    pushHistoryEntry(blackUser, { result: 'draw', opponent: whiteUser.username, xpChange: blackXp.total, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: 0, gameOfWeekBonus: blackXp.bonus, weeklyChallengeBonus: blackXp.weeklyChallengeBonus });
    pushHistoryEntry(whiteUser, { result: 'draw', opponent: blackUser.username, xpChange: whiteXp.total, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: 0, gameOfWeekBonus: whiteXp.bonus, weeklyChallengeBonus: whiteXp.weeklyChallengeBonus });
    game.result = { winner: null, loser: null, reason, eloDelta: 0 };
  } else if(winnerColor === 'black'){
    const eloDelta = computeEloDelta(blackElo, whiteElo);
    setUserElo(blackUser, 'othello', blackElo + eloDelta);
    setUserElo(whiteUser, 'othello', whiteElo - eloDelta);
    const blackXp = resolveMatchXp(blackUser, 'othello', 'win', { reason });
    const whiteXp = resolveMatchXp(whiteUser, 'othello', isAbandonReason(reason) ? 'abandon' : 'loss', { reason });
    blackUser.wins = (blackUser.wins || 0) + 1;
    whiteUser.losses = (whiteUser.losses || 0) + 1;
    pushHistoryEntry(blackUser, { result: 'win', opponent: whiteUser.username, xpChange: blackXp.total, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: eloDelta, gameOfWeekBonus: blackXp.bonus, weeklyChallengeBonus: blackXp.weeklyChallengeBonus });
    pushHistoryEntry(whiteUser, { result: 'loss', opponent: blackUser.username, xpChange: whiteXp.total, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: -eloDelta, gameOfWeekBonus: whiteXp.bonus, weeklyChallengeBonus: whiteXp.weeklyChallengeBonus });
    game.result = { winner: blackUser.username, loser: whiteUser.username, reason, eloDelta };
  } else {
    const eloDelta = computeEloDelta(whiteElo, blackElo);
    setUserElo(whiteUser, 'othello', whiteElo + eloDelta);
    setUserElo(blackUser, 'othello', blackElo - eloDelta);
    const whiteXp = resolveMatchXp(whiteUser, 'othello', 'win', { reason });
    const blackXp = resolveMatchXp(blackUser, 'othello', isAbandonReason(reason) ? 'abandon' : 'loss', { reason });
    whiteUser.wins = (whiteUser.wins || 0) + 1;
    blackUser.losses = (blackUser.losses || 0) + 1;
    pushHistoryEntry(whiteUser, { result: 'win', opponent: blackUser.username, xpChange: whiteXp.total, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: eloDelta, gameOfWeekBonus: whiteXp.bonus, weeklyChallengeBonus: whiteXp.weeklyChallengeBonus });
    pushHistoryEntry(blackUser, { result: 'loss', opponent: whiteUser.username, xpChange: blackXp.total, reason, gameKey: 'othello', gameName: 'Othello', scoreFinal, eloChange: -eloDelta, gameOfWeekBonus: blackXp.bonus, weeklyChallengeBonus: blackXp.weeklyChallengeBonus });
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
        blackHistory.gameOfWeekBonus || 0,
        blackHistory.weeklyChallengeBonus || 0
      ),
      [whiteUser.username]: resultPayload(
        whiteUser.username,
        !winnerColor ? 'draw' : winnerColor === 'white' ? 'win' : 'loss',
        whiteHistory.xpChange || 0,
        !winnerColor ? 0 : winnerColor === 'white' ? game.result.eloDelta : -game.result.eloDelta,
        whiteHistory.gameOfWeekBonus || 0,
        whiteHistory.weeklyChallengeBonus || 0
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
      const xp = resolveMatchXp(user, 'azul', 'draw', { reason });
      user.draws = (user.draws || 0) + 1;
      pushHistoryEntry(user, { result: 'draw', opponent: opponents || 'Table', xpChange: xp.total, reason, gameKey: 'azul', gameName: 'Azul', scoreFinal, eloChange: 0, gameOfWeekBonus: xp.bonus, weeklyChallengeBonus: xp.weeklyChallengeBonus });
      payload[user.username] = resultPayload(user.username, 'draw', xp.total, 0, xp.bonus, xp.weeklyChallengeBonus);
    });
    game.result = { winner: null, loser: null, reason, eloDelta: 0 };
    await Promise.all(users.map(user => user.save()));
    game.rated = true;
    return { players: payload };
  }

  const winnerUser = users.find(user => user.username === winnerUsername);
  if(!winnerUser) return;

  const loserUsers = users.filter(user => user.username !== winnerUsername);
  const winnerElo = getUserElo(winnerUser, 'azul');
  const eloDelta = Math.max(8, Math.round(
    loserUsers.reduce((total, loserUser) => total + computeEloDelta(winnerElo, getUserElo(loserUser, 'azul')), 0) /
    Math.max(1, loserUsers.length)
  ));

  setUserElo(winnerUser, 'azul', winnerElo + eloDelta);
  const winnerXp = resolveMatchXp(winnerUser, 'azul', 'win', { reason });
  winnerUser.wins = (winnerUser.wins || 0) + 1;
  pushHistoryEntry(winnerUser, { result: 'win', opponent: loserUsers.map(user => user.username).join(', ') || 'Table', xpChange: winnerXp.total, reason, gameKey: 'azul', gameName: 'Azul', scoreFinal, eloChange: eloDelta, gameOfWeekBonus: winnerXp.bonus, weeklyChallengeBonus: winnerXp.weeklyChallengeBonus });
  payload[winnerUser.username] = resultPayload(winnerUser.username, 'win', winnerXp.total, eloDelta, winnerXp.bonus, winnerXp.weeklyChallengeBonus);

  loserUsers.forEach(loserUser => {
    const loserElo = getUserElo(loserUser, 'azul');
    setUserElo(loserUser, 'azul', loserElo - eloDelta);
    const loserXp = resolveMatchXp(loserUser, 'azul', isAbandonReason(reason) ? 'abandon' : 'loss', { reason });
    loserUser.losses = (loserUser.losses || 0) + 1;
    pushHistoryEntry(loserUser, { result: 'loss', opponent: winnerUser.username, xpChange: loserXp.total, reason, gameKey: 'azul', gameName: 'Azul', scoreFinal, eloChange: -eloDelta, gameOfWeekBonus: loserXp.bonus, weeklyChallengeBonus: loserXp.weeklyChallengeBonus });
    payload[loserUser.username] = resultPayload(loserUser.username, 'loss', loserXp.total, -eloDelta, loserXp.bonus, loserXp.weeklyChallengeBonus);
  });

  await Promise.all(users.map(user => user.save()));
  game.rated = true;
  game.result = { winner: winnerUser.username, losers: loserUsers.map(user => user.username), reason, eloDelta };
  return { players: payload };
}

async function applyStructuredGameResult(User, options = {}){
  const {
    gameKey,
    usernames = [],
    winnerUsername = null,
    reason = 'game_end',
    scoreFinal = ''
  } = options;

  const meta = getGameMeta(gameKey);
  if(!meta || !Array.isArray(usernames) || usernames.length < 2){
    return null;
  }

  const users = await Promise.all(usernames.map(username => User.findOne({ username })));
  if(users.some(user => !user)) return null;

  const payload = {};

  if(!winnerUsername){
    users.forEach(user => {
      const xp = resolveMatchXp(user, gameKey, 'draw', { reason });
      user.draws = (user.draws || 0) + 1;
      const opponents = users.filter(other => other.username !== user.username).map(other => other.username).join(', ') || 'Table';
      pushHistoryEntry(user, {
        result: 'draw',
        opponent: opponents,
        xpChange: xp.total,
        reason,
        gameKey,
        gameName: meta.shortName || meta.name,
        scoreFinal,
        eloChange: 0,
        gameOfWeekBonus: xp.bonus,
        weeklyChallengeBonus: xp.weeklyChallengeBonus
      });
      payload[user.username] = resultPayload(user.username, 'draw', xp.total, 0, xp.bonus, xp.weeklyChallengeBonus);
    });

    await Promise.all(users.map(user => user.save()));
    return { players: payload, result: { winner: null, losers: [], reason, eloDelta: 0 } };
  }

  const winnerUser = users.find(user => user.username === winnerUsername);
  if(!winnerUser) return null;

  const loserUsers = users.filter(user => user.username !== winnerUsername);
  const winnerElo = getUserElo(winnerUser, gameKey);
  const eloDelta = Math.max(8, Math.round(
    loserUsers.reduce((total, loserUser) => total + computeEloDelta(winnerElo, getUserElo(loserUser, gameKey)), 0) /
    Math.max(1, loserUsers.length)
  ));

  setUserElo(winnerUser, gameKey, winnerElo + eloDelta);
  const winnerXp = resolveMatchXp(winnerUser, gameKey, 'win', { reason });
  winnerUser.wins = (winnerUser.wins || 0) + 1;
  pushHistoryEntry(winnerUser, {
    result: 'win',
    opponent: loserUsers.map(user => user.username).join(', ') || 'Table',
    xpChange: winnerXp.total,
    reason,
    gameKey,
    gameName: meta.shortName || meta.name,
    scoreFinal,
    eloChange: eloDelta,
    gameOfWeekBonus: winnerXp.bonus,
    weeklyChallengeBonus: winnerXp.weeklyChallengeBonus
  });
  payload[winnerUser.username] = resultPayload(winnerUser.username, 'win', winnerXp.total, eloDelta, winnerXp.bonus, winnerXp.weeklyChallengeBonus);

  loserUsers.forEach(loserUser => {
    const loserElo = getUserElo(loserUser, gameKey);
    setUserElo(loserUser, gameKey, loserElo - eloDelta);
    const loserXp = resolveMatchXp(loserUser, gameKey, isAbandonReason(reason) ? 'abandon' : 'loss', { reason });
    loserUser.losses = (loserUser.losses || 0) + 1;
    pushHistoryEntry(loserUser, {
      result: 'loss',
      opponent: winnerUser.username,
      xpChange: loserXp.total,
      reason,
      gameKey,
      gameName: meta.shortName || meta.name,
      scoreFinal,
      eloChange: -eloDelta,
      gameOfWeekBonus: loserXp.bonus,
      weeklyChallengeBonus: loserXp.weeklyChallengeBonus
    });
    payload[loserUser.username] = resultPayload(loserUser.username, 'loss', loserXp.total, -eloDelta, loserXp.bonus, loserXp.weeklyChallengeBonus);
  });

  await Promise.all(users.map(user => user.save()));
  return {
    players: payload,
    result: {
      winner: winnerUser.username,
      losers: loserUsers.map(user => user.username),
      reason,
      eloDelta
    }
  };
}

function getLeaderboardField(type){
  const meta = getGameMeta(type);
  return meta?.eloField || null;
}

async function getLeaderboard(User, type){
  if(type === 'global' || type === 'xp'){
    return User.find({}, { username: 1, xp: 1, _id: 0 }).sort({ xp: -1, username: 1 }).lean();
  }

  const field = getLeaderboardField(type);
  if(!field){
    return [];
  }

  return User.find({}, { username: 1, [field]: 1, _id: 0 }).sort({ [field]: -1, username: 1 }).lean();
}

function getLeaderboardValue(user, type){
  if(type === 'global' || type === 'xp'){
    return clampXp(user.xp || 0);
  }
  return getUserElo(user, type);
}

function getProgressionData(){
  return {
    xpRules: XP_RULES,
    levelThresholds: LEVEL_THRESHOLDS,
    weeklyChallenge: getGameOfWeek(),
    games: Object.values(GAME_CATALOG).map(game => ({
      key: game.key,
      name: game.name,
      shortName: game.shortName,
      leaderboardLabel: game.leaderboardLabel,
      url: game.url
    }))
  };
}

module.exports = {
  applyAzulResult,
  applyOthelloResult,
  applyRankedResult,
  applyStructuredGameResult,
  applyXpDelta,
  buildRatingsPayload,
  getGameOfWeek,
  getLeaderboard,
  getLeaderboardValue,
  getLevelInfo,
  getProgressionData,
  getPublicProfile,
  getUserElo,
  pushHistoryEntry
};

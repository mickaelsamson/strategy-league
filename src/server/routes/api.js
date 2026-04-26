const express = require('express');
const fs = require('fs');
const path = require('path');
const { GAME_ACCESS_DEFAULTS, GAME_CATALOG } = require('../config/constants');
const { authCookieHeader, clearAuthCookieHeader, createAuthToken } = require('../services/auth-service');
const {
  applyXpDelta,
  getGameOfWeek,
  getLeaderboard,
  getLeaderboardValue,
  getProgressionData,
  getPublicProfile
} = require('../services/user-service');

const AVATAR_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

function listAvailableAvatars(){
  const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
  if(!fs.existsSync(avatarsDir)) return [];

  return fs.readdirSync(avatarsDir)
    .filter(file => AVATAR_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map(file => `/avatars/${encodeURIComponent(file)}`);
}

function countUniquePlayers(entries){
  const usernames = new Set();
  entries.forEach(entry => {
    const players = Array.isArray(entry?.players) ? entry.players : [];
    players.forEach(player => {
      if(player?.username) usernames.add(player.username);
    });
  });
  return usernames.size;
}

function isAdminRequest(req){
  return Boolean(req.authUser?.isAdmin);
}

function clearAllLobbies(state, io){
  state.lobbies = {};
  state.othelloLobbies = {};
  state.azulLobbies = {};
  state.moonfallSettlersLobbies = {};
  state.moonfallP4Lobbies = {};
  state.hexblitzLobbies = {};

  if(io){
    io.emit('lobbies_update', state.lobbies);
    io.emit('othello_lobbies_update', state.othelloLobbies);
    io.emit('azul_lobbies_update', state.azulLobbies);
    io.emit('moonfall_settlers_lobbies_update', state.moonfallSettlersLobbies);
    io.emit('moonfall_p4_lobbies_update', state.moonfallP4Lobbies);
    io.emit('hexblitz_lobbies_update', state.hexblitzLobbies);
  }
}

function clearGameLobbies(state, io, gameKey){
  const emitMap = {
    chess: ['lobbies', 'lobbies_update'],
    othello: ['othelloLobbies', 'othello_lobbies_update'],
    azul: ['azulLobbies', 'azul_lobbies_update'],
    moonfall_settlers: ['moonfallSettlersLobbies', 'moonfall_settlers_lobbies_update'],
    moonfall_p4: ['moonfallP4Lobbies', 'moonfall_p4_lobbies_update'],
    hexblitz: ['hexblitzLobbies', 'hexblitz_lobbies_update']
  };

  const entry = emitMap[gameKey];
  if(!entry) return;

  const [stateKey, eventName] = entry;
  state[stateKey] = {};
  if(io){
    io.emit(eventName, state[stateKey]);
  }
}

function createAccessResponse(state, isGameAllowed, actor){
  const access = Object.keys(GAME_ACCESS_DEFAULTS).reduce((acc, gameKey) => {
    const config = {
      ...GAME_ACCESS_DEFAULTS[gameKey],
      ...(state.gameAccess[gameKey] || {})
    };
    acc[gameKey] = {
      ...config,
      allowed: isGameAllowed(gameKey, actor)
    };
    return acc;
  }, {});

  return {
    enabled: state.manualOverride !== false,
    access
  };
}

function createApiRouter({ User, state, isGameAllowed, io }){
  const router = express.Router();

  async function createUser(req, res){
    try{
      const { username, email, password } = req.body;
      const exists = await User.findOne({ email });
      if(exists){
        return res.status(400).json({ error: 'User already exists' });
      }

      const user = new User({
        username,
        email,
        password,
        elo: 1000,
        chessElo: 1000,
        othelloElo: 1000,
        azulElo: 1000,
        strategyElo: 1000,
        moonfallP4Elo: 1000,
        hexblitzElo: 1000,
        moonfallSettlersElo: 1000,
        moonfallWorldConquestElo: 1000,
        moonfallRtsElo: 1000,
        xp: 0,
        isAdmin: false
      });

      await user.save();
      res.json({ success: true });
    }catch(err){
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  router.post('/signup', createUser);
  router.post('/register', createUser);

  router.post('/login', async (req, res)=>{
    try{
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if(!user || user.password !== password){
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      res.setHeader('Set-Cookie', authCookieHeader(createAuthToken(user)));
      const profile = getPublicProfile(user);
      res.json({
        username: profile.username,
        email: user.email,
        avatar: profile.avatar,
        elo: profile.elo,
        chessElo: profile.chessElo,
        othelloElo: profile.othelloElo,
        azulElo: profile.azulElo,
        strategyElo: profile.strategyElo,
        moonfallP4Elo: profile.moonfallP4Elo,
        hexblitzElo: profile.hexblitzElo,
        moonfallSettlersElo: profile.moonfallSettlersElo,
        moonfallWorldConquestElo: profile.moonfallWorldConquestElo,
        moonfallRtsElo: profile.moonfallRtsElo,
        xp: profile.xp,
        level: profile.level,
        levelInfo: profile.levelInfo,
        ratings: profile.ratings,
        isAdmin: user.isAdmin
      });
    }catch(err){
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/logout', (_req, res)=>{
    res.setHeader('Set-Cookie', clearAuthCookieHeader());
    res.json({ success: true });
  });

  router.get('/games/status', (req, res)=>{
    const actor = req.authUser || null;
    const status = createAccessResponse(state, isGameAllowed, actor);
    const requestedGameKey = String(req.query.gameKey || '').trim();

    if(requestedGameKey){
      return res.json({
        ...status,
        enabled: isGameAllowed(requestedGameKey, actor),
        gameKey: requestedGameKey
      });
    }

    res.json(status);
  });

  router.get('/games/playing', (req, res)=>{
    const chess = countUniquePlayers([
      ...Object.values(state.lobbies || {}),
      ...Object.values(state.chessGames || {}).filter(game => !game?.ended)
    ]);

    const othello = countUniquePlayers([
      ...Object.values(state.othelloLobbies || {}),
      ...Object.values(state.othelloGames || {}).filter(game => !game?.ended)
    ]);

    const azul = countUniquePlayers([
      ...Object.values(state.azulLobbies || {}),
      ...Object.values(state.azulGames || {}).filter(game => !game?.ended)
    ]);

    const strategy = countUniquePlayers([
      ...Object.values(state.moonfallSettlersLobbies || {}),
      ...Object.values(state.moonfallSettlersGames || {}).filter(game => !game?.ended),
      ...Object.values(state.moonfallP4Lobbies || {}),
      ...Object.values(state.moonfallP4Games || {}).filter(game => !game?.ended),
      ...Object.values(state.hexblitzLobbies || {}),
      ...Object.values(state.hexblitzGames || {}).filter(game => !game?.ended)
    ]);

    res.json({
      chess,
      othello,
      azul,
      strategy,
      total: chess + othello + azul + strategy
    });
  });

  router.get('/games/game-of-week', (_req, res)=>{
    res.json(getGameOfWeek());
  });

  router.get('/progression', (_req, res)=>{
    res.json(getProgressionData());
  });

  router.get('/games/catalog', (req, res)=>{
    const actor = req.authUser || null;
    const status = createAccessResponse(state, isGameAllowed, actor);
    const games = Object.values(GAME_CATALOG).map(game => ({
      key: game.key,
      name: game.name,
      shortName: game.shortName,
      url: game.url,
      gameUrl: game.gameUrl,
      leaderboardLabel: game.leaderboardLabel,
      access: status.access[game.key]
    }));

    res.json({ games, ...status });
  });

  router.post('/admin/override', async (req, res)=>{
    try{
      if(!isAdminRequest(req)){
        return res.status(403).json({ error: 'Admin required' });
      }

      state.manualOverride = Boolean(req.body.enabled);
      if(!state.manualOverride){
        clearAllLobbies(state, io);
      }

      res.json({ success: true, enabled: state.manualOverride });
    }catch(err){
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/admin/game-access', async (req, res)=>{
    if(!isAdminRequest(req)){
      return res.status(403).json({ error: 'Admin required' });
    }

    res.json(createAccessResponse(state, isGameAllowed, req.authUser));
  });

  router.post('/admin/game-access', async (req, res)=>{
    try{
      if(!isAdminRequest(req)){
        return res.status(403).json({ error: 'Admin required' });
      }

      const gameKey = String(req.body.gameKey || '').trim();
      if(!GAME_ACCESS_DEFAULTS[gameKey]){
        return res.status(400).json({ error: 'Unknown game.' });
      }

      state.gameAccess[gameKey] = {
        ...(state.gameAccess[gameKey] || GAME_ACCESS_DEFAULTS[gameKey]),
        enabled: typeof req.body.enabled === 'boolean' ? req.body.enabled : GAME_ACCESS_DEFAULTS[gameKey].enabled,
        adminOnly: typeof req.body.adminOnly === 'boolean' ? req.body.adminOnly : GAME_ACCESS_DEFAULTS[gameKey].adminOnly,
        comingSoon: typeof req.body.comingSoon === 'boolean' ? req.body.comingSoon : GAME_ACCESS_DEFAULTS[gameKey].comingSoon
      };

      if(state.gameAccess[gameKey].enabled === false){
        clearGameLobbies(state, io, gameKey);
      }

      res.json({
        success: true,
        gameKey,
        config: state.gameAccess[gameKey],
        access: createAccessResponse(state, isGameAllowed, req.authUser).access
      });
    }catch(err){
      console.error('Game access update error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/admin/adjust-xp', async (req, res)=>{
    try{
      if(!isAdminRequest(req)){
        return res.status(403).json({ error: 'Admin required' });
      }

      const username = String(req.body.username || '').trim();
      const amount = Math.round(Number(req.body.amount));
      const cleanReason = String(req.body.reason || '').trim();

      if(!username || !Number.isFinite(amount) || amount === 0){
        return res.status(400).json({ error: 'Enter a player and a non-zero XP amount.' });
      }

      if(cleanReason.length < 3){
        return res.status(400).json({ error: 'Reason is required.' });
      }

      const target = await User.findOne({ username });
      if(!target){
        return res.status(404).json({ error: 'Player not found.' });
      }

      const xpResult = applyXpDelta(target, 'chess', amount, { allowBonus: false });
      target.matchHistory = target.matchHistory || [];
      target.matchHistory.unshift({
        result: amount >= 0 ? 'draw' : 'loss',
        opponent: req.authUser.username || 'Admin',
        xpChange: xpResult.total,
        reason: `Admin adjustment: ${cleanReason.slice(0, 120)}`,
        gameKey: 'admin',
        gameName: amount >= 0 ? 'Admin XP Bonus' : 'Admin XP Penalty',
        scoreFinal: '',
        eloChange: 0
      });
      target.matchHistory = target.matchHistory.slice(0, 20);
      await target.save();

      res.json({
        success: true,
        username: target.username,
        xp: target.xp,
        amount: xpResult.total,
        reason: cleanReason
      });
    }catch(err){
      console.error('Adjust XP error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/leaderboard/:type/:username', async (req, res)=>{
    try{
      const { type, username } = req.params;
      const users = await getLeaderboard(User, type);

      const list = users.map((user, index) => ({
        username: user.username,
        value: getLeaderboardValue(user, type),
        rank: index + 1
      }));

      const me = list.find(user => user.username === username) || null;
      const top = list.slice(0, 10).map(({ username: entryUsername, value }) => ({ username: entryUsername, value }));

      res.json({ top, me: me ? { rank: me.rank, value: me.value } : null });
    }catch(err){
      console.error('Leaderboard error:', err);
      res.status(500).json({ error: 'Leaderboard unavailable' });
    }
  });

  router.get('/profile/:username', async (req, res)=>{
    try{
      const user = await User.findOne({ username: req.params.username }).lean();
      if(!user){
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(getPublicProfile(user));
    }catch(err){
      console.error('Profile error:', err);
      res.status(500).json({ error: 'Profile unavailable' });
    }
  });

  router.get('/avatars', (_req, res)=>{
    res.json({ avatars: listAvailableAvatars() });
  });

  router.post('/profile/:username/avatar', async (req, res)=>{
    try{
      const { username } = req.params;
      if(req.authUser?.username !== username){
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { avatar } = req.body;
      const availableAvatars = listAvailableAvatars();

      if(avatar && !availableAvatars.includes(avatar)){
        return res.status(400).json({ error: 'Avatar unavailable' });
      }

      const user = await User.findOneAndUpdate(
        { username },
        { avatar: avatar || '' },
        { new: true }
      ).lean();

      if(!user){
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ success: true, avatar: user.avatar || '' });
    }catch(err){
      console.error('Avatar update error:', err);
      res.status(500).json({ error: 'Avatar update unavailable' });
    }
  });

  return router;
}

module.exports = { createApiRouter };

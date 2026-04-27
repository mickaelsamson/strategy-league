const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { GAME_ACCESS_DEFAULTS, GAME_CATALOG } = require('../config/constants');
const { authCookieHeader, clearAuthCookieHeader, createAuthToken } = require('../services/auth-service');
const { sendPasswordResetEmail } = require('../services/email-service');
const {
  applyXpDelta,
  getGameOfWeek,
  getLeaderboard,
  getLeaderboardValue,
  getProgressionData,
  getPublicProfile
} = require('../services/user-service');

const AVATAR_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;
const PASSWORD_HASH_ALGORITHM = 'pbkdf2_sha256';
const PASSWORD_HASH_ITERATIONS = 210000;
const PASSWORD_HASH_KEY_LENGTH = 32;

let bcrypt = null;
try{
  bcrypt = require('bcrypt');
}catch(_err){
  bcrypt = null;
}

function normalizeEmail(email){
  return String(email || '').trim().toLowerCase();
}

function normalizeName(value){
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function isValidEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isBcryptHash(value){
  return /^\$2[aby]\$\d{2}\$/.test(String(value || ''));
}

function isPbkdf2Hash(value){
  return String(value || '').startsWith(`${PASSWORD_HASH_ALGORITHM}$`);
}

function hashResetToken(token){
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getAppBaseUrl(req){
  if(process.env.APP_BASE_URL){
    return process.env.APP_BASE_URL.replace(/\/+$/, '');
  }

  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${protocol}://${req.get('host')}`;
}

async function hashPassword(password){
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      PASSWORD_HASH_ITERATIONS,
      PASSWORD_HASH_KEY_LENGTH,
      'sha256',
      (err, derivedKey) => err ? reject(err) : resolve(derivedKey.toString('hex'))
    );
  });

  return `${PASSWORD_HASH_ALGORITHM}$${PASSWORD_HASH_ITERATIONS}$${salt}$${hash}`;
}

async function verifyPassword(password, storedPassword){
  if(isBcryptHash(storedPassword)){
    if(!bcrypt) return false;
    return bcrypt.compare(password, storedPassword);
  }

  if(isPbkdf2Hash(storedPassword)){
    const [_algorithm, iterations, salt, expectedHash] = String(storedPassword).split('$');
    if(!iterations || !salt || !expectedHash) return false;
    const iterationCount = Number(iterations);
    const keyLength = Buffer.from(expectedHash, 'hex').length;
    if(!Number.isInteger(iterationCount) || iterationCount <= 0 || keyLength <= 0) return false;

    const actualHash = await new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        iterationCount,
        keyLength,
        'sha256',
        (err, derivedKey) => err ? reject(err) : resolve(derivedKey)
      );
    });

    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    return actualHash.length === expectedBuffer.length && crypto.timingSafeEqual(actualHash, expectedBuffer);
  }

  return storedPassword === password;
}

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
      const email = normalizeEmail(req.body.email);
      const username = normalizeName(req.body.username);
      const firstName = normalizeName(req.body.firstName || req.body.prenom);
      const password = String(req.body.password || '');

      if(!email || !username || !firstName || !password){
        return res.status(400).json({ error: 'Email, pseudo, prenom et mot de passe sont requis.' });
      }

      if(!isValidEmail(email)){
        return res.status(400).json({ error: 'Email invalide.' });
      }

      if(password.length < PASSWORD_MIN_LENGTH){
        return res.status(400).json({ error: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caracteres.` });
      }

      const exists = await User.findOne({ $or: [{ email }, { username }] });
      if(exists?.email === email){
        return res.status(400).json({ error: 'Cet email est deja utilise.' });
      }

      if(exists?.username === username){
        return res.status(400).json({ error: 'Ce pseudo est deja utilise.' });
      }

      const user = new User({
        username,
        firstName,
        email,
        password: await hashPassword(password),
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
      res.json({ success: true, username, email, firstName });
    }catch(err){
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async function forgotPassword(req, res){
    const genericMessage = 'Si un compte existe avec cet email, un lien de reset vient d etre envoye.';

    try{
      const email = normalizeEmail(req.body.email);
      if(!email || !isValidEmail(email)){
        return res.json({ success: true, message: genericMessage });
      }

      const user = await User.findOne({ email });
      let devResetLink = '';
      let emailSent = false;

      if(user){
        const token = crypto.randomBytes(32).toString('hex');
        user.passwordResetTokenHash = hashResetToken(token);
        user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
        await user.save();

        const resetUrl = `${getAppBaseUrl(req)}/login.html?resetToken=${token}&email=${encodeURIComponent(user.email)}`;
        const mailResult = await sendPasswordResetEmail({
          to: user.email,
          username: user.firstName || user.username,
          resetUrl
        });

        emailSent = Boolean(mailResult.sent);
        if(!emailSent){
          console.info(`[password-reset] Reset link for ${user.email}: ${resetUrl}`);
          if(process.env.NODE_ENV !== 'production'){
            devResetLink = resetUrl;
          }
        }
      }

      res.json({
        success: true,
        message: genericMessage,
        emailSent,
        ...(devResetLink ? { devResetLink } : {})
      });
    }catch(err){
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async function resetPassword(req, res){
    try{
      const token = String(req.body.token || '').trim();
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || '');

      if(!token || !password){
        return res.status(400).json({ error: 'Lien invalide.' });
      }

      if(password.length < PASSWORD_MIN_LENGTH){
        return res.status(400).json({ error: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caracteres.` });
      }

      const query = {
        passwordResetTokenHash: hashResetToken(token),
        passwordResetExpiresAt: { $gt: new Date() }
      };

      if(email){
        query.email = email;
      }

      const user = await User.findOne(query);
      if(!user){
        return res.status(400).json({ error: 'Lien invalide ou expire.' });
      }

      user.password = await hashPassword(password);
      user.passwordResetTokenHash = '';
      user.passwordResetExpiresAt = null;
      await user.save();

      res.json({ success: true, message: 'Mot de passe mis a jour.' });
    }catch(err){
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  router.post('/signup', createUser);
  router.post('/register', createUser);

  router.post('/login', async (req, res)=>{
    try{
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || '');
      const user = await User.findOne({ email });

      if(!user || !(await verifyPassword(password, user.password))){
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      if(!isBcryptHash(user.password) && !isPbkdf2Hash(user.password)){
        user.password = await hashPassword(password);
        await user.save();
      }

      res.setHeader('Set-Cookie', authCookieHeader(createAuthToken(user)));
      const profile = getPublicProfile(user);
      res.json({
        username: profile.username,
        email: user.email,
        firstName: user.firstName || '',
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

  router.post('/password/forgot', forgotPassword);
  router.post('/forgot-password', forgotPassword);
  router.post('/password/reset', resetPassword);
  router.post('/reset-password', resetPassword);

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

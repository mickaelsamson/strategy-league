const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { GAME_ACCESS_DEFAULTS, GAME_CATALOG } = require('../config/constants');
const {
  getTournamentSettings,
  getWeeklyChallengeSettings,
  normalizeGameAccess,
  normalizeTournament,
  normalizeWeeklyChallenge,
  saveAdminSettings
} = require('../state');
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

function escapeRegExp(value){
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearAllLobbies(state, io){
  state.lobbies = {};
  state.moonveil_dominionLobbies = {};
  state.moonveil_glyphLobbies = {};
  state.moonveilRealmsLobbies = {};
  state.moonveilNexusLobbies = {};
  state.moonveil_hexfallLobbies = {};

  if(io){
    io.emit('lobbies_update', state.lobbies);
    io.emit('moonveil_dominion_lobbies_update', state.moonveil_dominionLobbies);
    io.emit('moonveil_glyph_lobbies_update', state.moonveil_glyphLobbies);
    io.emit('moonveil_realms_lobbies_update', state.moonveilRealmsLobbies);
    io.emit('moonveil_nexus_lobbies_update', state.moonveilNexusLobbies);
    io.emit('moonveil_hexfall_lobbies_update', state.moonveil_hexfallLobbies);
  }
}

function clearGameLobbies(state, io, gameKey){
  const emitMap = {
    chess: ['lobbies', 'lobbies_update'],
    moonveil_dominion: ['moonveil_dominionLobbies', 'moonveil_dominion_lobbies_update'],
    moonveil_glyph: ['moonveil_glyphLobbies', 'moonveil_glyph_lobbies_update'],
    moonveil_realms: ['moonveilRealmsLobbies', 'moonveil_realms_lobbies_update'],
    moonveil_nexus: ['moonveilNexusLobbies', 'moonveil_nexus_lobbies_update'],
    moonveil_hexfall: ['moonveil_hexfallLobbies', 'moonveil_hexfall_lobbies_update']
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
    games: Object.values(GAME_CATALOG).map(game => ({
      key: game.key,
      name: game.name,
      shortName: game.shortName,
      url: game.url,
      gameUrl: game.gameUrl,
      leaderboardLabel: game.leaderboardLabel,
      gameOfWeekEligible: Boolean(game.gameOfWeekEligible)
    })),
    access,
    weeklyChallenge: getWeeklyChallengeSettings(),
    tournament: getTournamentSettings()
  };
}

function createApiRouter({ User, state, isGameAllowed, io }){
  const router = express.Router();

  function emitToUsername(username, event, payload){
    if(!io || !username) return;
    [...io.sockets.sockets.values()]
      .filter(socket => socket.username === username)
      .forEach(socket => socket.emit(event, payload));
  }

  function requireAuth(req, res){
    if(req.authUser?.username) return true;
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }

  function uniqueStrings(values){
    return [...new Set((Array.isArray(values) ? values : [])
      .map(value => String(value || '').trim())
      .filter(Boolean))];
  }

  async function summarizeUsers(usernames){
    const names = uniqueStrings(usernames);
    if(!names.length) return [];

    const users = await User.find(
      { username: { $in: names } },
      { username: 1, avatar: 1, xp: 1, _id: 0 }
    ).lean();

    const order = new Map(names.map((name, index) => [name, index]));
    return users
      .map(user => ({
        username: user.username,
        avatar: user.avatar || '',
        xp: user.xp || 0
      }))
      .sort((a, b) => (order.get(a.username) || 0) - (order.get(b.username) || 0));
  }

  async function createFriendsPayload(username){
    const user = await User.findOne({ username }).lean();
    if(!user) return null;

    const [friends, incoming, outgoing] = await Promise.all([
      summarizeUsers(user.friends),
      summarizeUsers(user.incomingFriendRequests),
      summarizeUsers(user.outgoingFriendRequests)
    ]);

    return { friends, incoming, outgoing };
  }

  router.use((req, res, next)=>{
    if(
      req.path.startsWith('/admin') ||
      req.path.startsWith('/games') ||
      req.path.startsWith('/leaderboard') ||
      req.path.startsWith('/progression')
    ){
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });

  async function createUser(req, res){
    try{
      const email = normalizeEmail(req.body.email);
      const username = normalizeName(req.body.username);
      const firstName = normalizeName(req.body.firstName);
      const password = String(req.body.password || '');

      if(!email || !username || !firstName || !password){
        return res.status(400).json({ error: 'Email, username, first name, and password are required.' });
      }

      if(!isValidEmail(email)){
        return res.status(400).json({ error: 'Invalid email.' });
      }

      if(password.length < PASSWORD_MIN_LENGTH){
        return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` });
      }

      const exists = await User.findOne({ $or: [{ email }, { username }] });
      if(exists?.email === email){
        return res.status(400).json({ error: 'This email is already in use.' });
      }

      if(exists?.username === username){
        return res.status(400).json({ error: 'This username is already in use.' });
      }

      const user = new User({
        username,
        firstName,
        email,
        password: await hashPassword(password),
        elo: 1000,
        chessElo: 1000,
        moonveil_dominionElo: 1000,
        moonveil_glyphElo: 1000,
        strategyElo: 1000,
        moonveilNexusElo: 1000,
        moonveil_hexfallElo: 1000,
        moonveilRealmsElo: 1000,
        moonveilConquestElo: 1000,
        moonveilAscendElo: 1000,
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
    const genericMessage = 'If an account exists with this email, a reset link has been sent.';

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
        return res.status(400).json({ error: 'Invalid link.' });
      }

      if(password.length < PASSWORD_MIN_LENGTH){
        return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` });
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
        return res.status(400).json({ error: 'Invalid or expired link.' });
      }

      user.password = await hashPassword(password);
      user.passwordResetTokenHash = '';
      user.passwordResetExpiresAt = null;
      await user.save();

      res.json({ success: true, message: 'Password updated.' });
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
        moonveil_dominionElo: profile.moonveil_dominionElo,
        moonveil_glyphElo: profile.moonveil_glyphElo,
        strategyElo: profile.strategyElo,
        moonveilNexusElo: profile.moonveilNexusElo,
        moonveil_hexfallElo: profile.moonveil_hexfallElo,
        moonveilRealmsElo: profile.moonveilRealmsElo,
        moonveilConquestElo: profile.moonveilConquestElo,
        moonveilAscendElo: profile.moonveilAscendElo,
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

    const moonveil_dominion = countUniquePlayers([
      ...Object.values(state.moonveil_dominionLobbies || {}),
      ...Object.values(state.moonveil_dominionGames || {}).filter(game => !game?.ended)
    ]);

    const moonveil_glyph = countUniquePlayers([
      ...Object.values(state.moonveil_glyphLobbies || {}),
      ...Object.values(state.moonveil_glyphGames || {}).filter(game => !game?.ended)
    ]);

    const strategy = countUniquePlayers([
      ...Object.values(state.moonveilRealmsLobbies || {}),
      ...Object.values(state.moonveilRealmsGames || {}).filter(game => !game?.ended),
      ...Object.values(state.moonveilNexusLobbies || {}),
      ...Object.values(state.moonveilNexusGames || {}).filter(game => !game?.ended),
      ...Object.values(state.moonveil_hexfallLobbies || {}),
      ...Object.values(state.moonveil_hexfallGames || {}).filter(game => !game?.ended)
    ]);

    res.json({
      chess,
      moonveil_dominion,
      moonveil_glyph,
      strategy,
      total: chess + moonveil_dominion + moonveil_glyph + strategy
    });
  });

  router.get('/games/game-of-week', (_req, res)=>{
    res.json(getGameOfWeek());
  });

  router.get('/progression', (_req, res)=>{
    res.json(getProgressionData());
  });

  router.get('/friends', async (req, res)=>{
    try{
      if(!requireAuth(req, res)) return;
      const payload = await createFriendsPayload(req.authUser.username);
      if(!payload) return res.status(404).json({ error: 'User not found' });
      res.json(payload);
    }catch(err){
      console.error('Friends load error:', err);
      res.status(500).json({ error: 'Friends unavailable' });
    }
  });

  router.get('/users/search', async (req, res)=>{
    try{
      if(!requireAuth(req, res)) return;

      const q = String(req.query.q || '').trim();
      if(q.length < 2){
        return res.json({ users: [] });
      }

      const me = await User.findOne({ username: req.authUser.username }).lean();
      if(!me) return res.status(404).json({ error: 'User not found' });

      const friendNames = uniqueStrings(me.friends);
      const incomingNames = uniqueStrings(me.incomingFriendRequests);
      const outgoingNames = uniqueStrings(me.outgoingFriendRequests);
      const users = await User.find(
        {
          username: { $ne: req.authUser.username, $regex: escapeRegExp(q), $options: 'i' }
        },
        { username: 1, avatar: 1, xp: 1, _id: 0 }
      ).sort({ username: 1 }).limit(20).lean();

      res.json({
        users: users.map(user => ({
          username: user.username,
          avatar: user.avatar || '',
          xp: user.xp || 0,
          relation: friendNames.includes(user.username)
            ? 'friend'
            : incomingNames.includes(user.username)
              ? 'incoming'
              : outgoingNames.includes(user.username)
                ? 'outgoing'
                : 'none'
        }))
      });
    }catch(err){
      console.error('User search error:', err);
      res.status(500).json({ error: 'Search unavailable' });
    }
  });

  router.post('/friends/request', async (req, res)=>{
    try{
      if(!requireAuth(req, res)) return;

      const fromUsername = req.authUser.username;
      const toUsername = String(req.body.username || req.body.toUsername || '').trim();
      if(!toUsername || toUsername === fromUsername){
        return res.status(400).json({ error: 'Choose another player.' });
      }

      const [fromUser, toUser] = await Promise.all([
        User.findOne({ username: fromUsername }),
        User.findOne({ username: toUsername })
      ]);

      if(!fromUser || !toUser){
        return res.status(404).json({ error: 'Player not found.' });
      }

      fromUser.friends = uniqueStrings(fromUser.friends);
      toUser.friends = uniqueStrings(toUser.friends);
      fromUser.incomingFriendRequests = uniqueStrings(fromUser.incomingFriendRequests);
      fromUser.outgoingFriendRequests = uniqueStrings(fromUser.outgoingFriendRequests);
      toUser.incomingFriendRequests = uniqueStrings(toUser.incomingFriendRequests);
      toUser.outgoingFriendRequests = uniqueStrings(toUser.outgoingFriendRequests);

      if(fromUser.friends.includes(toUsername)){
        return res.json({ success: true, status: 'friends', ...(await createFriendsPayload(fromUsername)) });
      }

      if(fromUser.incomingFriendRequests.includes(toUsername)){
        fromUser.friends = uniqueStrings([...fromUser.friends, toUsername]);
        toUser.friends = uniqueStrings([...toUser.friends, fromUsername]);
        fromUser.incomingFriendRequests = fromUser.incomingFriendRequests.filter(name => name !== toUsername);
        toUser.outgoingFriendRequests = toUser.outgoingFriendRequests.filter(name => name !== fromUsername);
        await Promise.all([fromUser.save(), toUser.save()]);
        emitToUsername(toUsername, 'friend_update', {
          type: 'accepted',
          username: fromUsername,
          message: `${fromUsername} accepted your friend request.`
        });
        emitToUsername(fromUsername, 'friend_update', {
          type: 'accepted',
          username: toUsername,
          message: `${toUsername} is now your friend.`
        });
        return res.json({ success: true, status: 'friends', ...(await createFriendsPayload(fromUsername)) });
      }

      if(!fromUser.outgoingFriendRequests.includes(toUsername)){
        fromUser.outgoingFriendRequests.push(toUsername);
      }
      if(!toUser.incomingFriendRequests.includes(fromUsername)){
        toUser.incomingFriendRequests.push(fromUsername);
      }

      await Promise.all([fromUser.save(), toUser.save()]);

      emitToUsername(toUsername, 'friend_request', {
        from: fromUsername,
        message: `${fromUsername} wants to add you as a friend.`
      });

      res.json({ success: true, status: 'pending', ...(await createFriendsPayload(fromUsername)) });
    }catch(err){
      console.error('Friend request error:', err);
      res.status(500).json({ error: 'Friend request unavailable' });
    }
  });

  router.post('/friends/accept', async (req, res)=>{
    try{
      if(!requireAuth(req, res)) return;

      const username = req.authUser.username;
      const fromUsername = String(req.body.username || req.body.fromUsername || '').trim();
      if(!fromUsername || fromUsername === username){
        return res.status(400).json({ error: 'Invalid friend request.' });
      }

      const [user, requester] = await Promise.all([
        User.findOne({ username }),
        User.findOne({ username: fromUsername })
      ]);

      if(!user || !requester){
        return res.status(404).json({ error: 'Player not found.' });
      }

      user.friends = uniqueStrings([...(user.friends || []), fromUsername]);
      requester.friends = uniqueStrings([...(requester.friends || []), username]);
      user.incomingFriendRequests = uniqueStrings(user.incomingFriendRequests).filter(name => name !== fromUsername);
      user.outgoingFriendRequests = uniqueStrings(user.outgoingFriendRequests).filter(name => name !== fromUsername);
      requester.outgoingFriendRequests = uniqueStrings(requester.outgoingFriendRequests).filter(name => name !== username);
      requester.incomingFriendRequests = uniqueStrings(requester.incomingFriendRequests).filter(name => name !== username);

      await Promise.all([user.save(), requester.save()]);

      emitToUsername(fromUsername, 'friend_update', {
        type: 'accepted',
        username,
        message: `${username} accepted your friend request.`
      });
      emitToUsername(username, 'friend_update', {
        type: 'accepted',
        username: fromUsername,
        message: `${fromUsername} is now your friend.`
      });

      res.json({ success: true, status: 'friends', ...(await createFriendsPayload(username)) });
    }catch(err){
      console.error('Friend accept error:', err);
      res.status(500).json({ error: 'Friend accept unavailable' });
    }
  });

  router.post('/friends/decline', async (req, res)=>{
    try{
      if(!requireAuth(req, res)) return;

      const username = req.authUser.username;
      const fromUsername = String(req.body.username || req.body.fromUsername || '').trim();
      if(!fromUsername || fromUsername === username){
        return res.status(400).json({ error: 'Invalid friend request.' });
      }

      await Promise.all([
        User.updateOne({ username }, { $pull: { incomingFriendRequests: fromUsername } }),
        User.updateOne({ username: fromUsername }, { $pull: { outgoingFriendRequests: username } })
      ]);

      emitToUsername(fromUsername, 'friend_update', {
        type: 'declined',
        username,
        message: `${username} declined your friend request.`
      });

      res.json({ success: true, status: 'declined', ...(await createFriendsPayload(username)) });
    }catch(err){
      console.error('Friend decline error:', err);
      res.status(500).json({ error: 'Friend decline unavailable' });
    }
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
      await saveAdminSettings(state);

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

  router.get('/admin/settings', async (req, res)=>{
    if(!isAdminRequest(req)){
      return res.status(403).json({ error: 'Admin required' });
    }

    res.json(createAccessResponse(state, isGameAllowed, req.authUser));
  });

  router.get('/admin/users/search', async (req, res)=>{
    try{
      if(!isAdminRequest(req)){
        return res.status(403).json({ error: 'Admin required' });
      }

      const q = String(req.query.q || '').trim();
      if(q.length < 1){
        return res.json({ users: [] });
      }

      const users = await User.find(
        {
          username: { $regex: escapeRegExp(q), $options: 'i' }
        },
        { username: 1, avatar: 1, xp: 1, _id: 0 }
      ).sort({ username: 1 }).limit(20).lean();

      res.json({
        users: users.map(user => ({
          username: user.username,
          avatar: user.avatar || '',
          xp: user.xp || 0
        }))
      });
    }catch(err){
      console.error('Admin user search error:', err);
      res.status(500).json({ error: 'Search unavailable' });
    }
  });

  router.post('/admin/settings', async (req, res)=>{
    try{
      if(!isAdminRequest(req)){
        return res.status(403).json({ error: 'Admin required' });
      }

      if(typeof req.body.enabled === 'boolean'){
        state.manualOverride = req.body.enabled;
      }
      if(req.body.access && typeof req.body.access === 'object' && !Array.isArray(req.body.access)){
        state.gameAccess = normalizeGameAccess(req.body.access);
      }
      if(req.body.weeklyChallenge && typeof req.body.weeklyChallenge === 'object'){
        state.weeklyChallenge = normalizeWeeklyChallenge(req.body.weeklyChallenge);
      }
      if(req.body.tournament && typeof req.body.tournament === 'object'){
        state.tournament = normalizeTournament(req.body.tournament);
      }

      if(state.manualOverride === false){
        clearAllLobbies(state, io);
      }else{
        Object.entries(state.gameAccess).forEach(([key, config]) => {
          if(config.enabled === false){
            clearGameLobbies(state, io, key);
          }
        });
      }

      await saveAdminSettings(state);
      res.json({
        success: true,
        saved: true,
        ...createAccessResponse(state, isGameAllowed, req.authUser)
      });
    }catch(err){
      console.error('Admin settings update error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/admin/game-access', async (req, res)=>{
    try{
      if(!isAdminRequest(req)){
        return res.status(403).json({ error: 'Admin required' });
      }

      if(req.body.access && typeof req.body.access === 'object' && !Array.isArray(req.body.access)){
        state.manualOverride = typeof req.body.enabled === 'boolean' ? req.body.enabled : state.manualOverride;
        state.gameAccess = normalizeGameAccess(req.body.access);
        if(req.body.weeklyChallenge && typeof req.body.weeklyChallenge === 'object'){
          state.weeklyChallenge = normalizeWeeklyChallenge(req.body.weeklyChallenge);
        }
        if(req.body.tournament && typeof req.body.tournament === 'object'){
          state.tournament = normalizeTournament(req.body.tournament);
        }

        if(state.manualOverride === false){
          clearAllLobbies(state, io);
        }else{
          Object.entries(state.gameAccess).forEach(([key, config]) => {
            if(config.enabled === false){
              clearGameLobbies(state, io, key);
            }
          });
        }

        await saveAdminSettings(state);
        return res.json({
          success: true,
          saved: true,
          ...createAccessResponse(state, isGameAllowed, req.authUser)
        });
      }

      const gameKey = String(req.body.gameKey || '').trim();
      if(!GAME_ACCESS_DEFAULTS[gameKey]){
        return res.status(400).json({ error: 'Unknown game.' });
      }

      const previousConfig = state.gameAccess[gameKey] || GAME_ACCESS_DEFAULTS[gameKey];
      state.gameAccess[gameKey] = {
        ...previousConfig,
        enabled: typeof req.body.enabled === 'boolean' ? req.body.enabled : previousConfig.enabled,
        adminOnly: typeof req.body.adminOnly === 'boolean' ? req.body.adminOnly : previousConfig.adminOnly,
        comingSoon: typeof req.body.comingSoon === 'boolean' ? req.body.comingSoon : previousConfig.comingSoon,
        noXp: typeof req.body.noXp === 'boolean' ? req.body.noXp : previousConfig.noXp
      };

      if(state.gameAccess[gameKey].enabled === false){
        clearGameLobbies(state, io, gameKey);
      }
      await saveAdminSettings(state);

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

      const xpResult = applyXpDelta(target, 'chess', amount, { allowBonus: false, ignoreNoXp: true });
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

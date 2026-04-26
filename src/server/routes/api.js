const express = require('express');
const fs = require('fs');
const path = require('path');
const { getGameOfWeek, getLeaderboard } = require('../services/user-service');

const AVATAR_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

function listAvailableAvatars(){
  const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
  if(!fs.existsSync(avatarsDir)) return [];

  return fs.readdirSync(avatarsDir)
    .filter(file => AVATAR_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map(file => `/avatars/${encodeURIComponent(file)}`);
}

function getLeaderboardValue(user, type){
  if(type === 'chess') return user.chessElo || user.elo || 1000;
  if(type === 'strategy') return user.strategyElo || user.strategyPoints || 1000;
  if(type === 'othello') return user.othelloElo || user.othelloPoints || 1000;
  if(type === 'azul') return user.azulElo || user.azulPoints || 1000;
  return user.xp || 0;
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

function createApiRouter({ User, state, isGameAllowed, io }){
  const router = express.Router();

  async function createUser(req, res){
    try{
      const { username, email, password } = req.body;
      const exists = await User.findOne({ email });
      if(exists){
        return res.status(400).json({ error: 'User already exists' });
      }

      const user = new User({ username, email, password, elo: 1000, chessElo: 1000, othelloElo: 1000, azulElo: 1000, strategyElo: 1000, xp: 0, isAdmin: false });
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

      res.json({
        username: user.username,
        email: user.email,
        avatar: user.avatar || '',
        elo: user.chessElo || user.elo,
        chessElo: user.chessElo || user.elo || 1000,
        othelloElo: user.othelloElo || user.othelloPoints || 1000,
        azulElo: user.azulElo || user.azulPoints || 1000,
        strategyElo: user.strategyElo || user.strategyPoints || 1000,
        xp: user.xp,
        isAdmin: user.isAdmin
      });
    }catch(err){
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/games/status', (req, res)=>{
    res.json({ enabled: isGameAllowed() });
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

    const strategy = 0;
    const azul = countUniquePlayers([
      ...Object.values(state.azulLobbies || {}),
      ...Object.values(state.azulGames || {}).filter(game => !game?.ended)
    ]);

    res.json({
      chess,
      othello,
      azul,
      strategy,
      total: chess + othello + azul + strategy
    });
  });

  router.get('/games/game-of-week', (req, res)=>{
    res.json(getGameOfWeek());
  });

  router.post('/admin/override', async (req, res)=>{
    try{
      const { adminEmail, enabled } = req.body;
      const adminUser = await User.findOne({ email: adminEmail });
      if(!adminUser || !adminUser.isAdmin){
        return res.status(403).json({ error: 'Admin required' });
      }

      state.manualOverride = Boolean(enabled);
      if(!state.manualOverride){
        state.lobbies = {};
        state.othelloLobbies = {};
        state.azulLobbies = {};
        if(io){
          io.emit('lobbies_update', state.lobbies);
          io.emit('othello_lobbies_update', state.othelloLobbies);
          io.emit('azul_lobbies_update', state.azulLobbies);
        }
      }
      res.json({ success: true, enabled: state.manualOverride });
    }catch(err){
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/admin/bonus-xp', async (req, res)=>{
    try{
      const { adminEmail, username, xp, reason } = req.body;
      const adminUser = await User.findOne({ email: adminEmail });
      if(!adminUser || !adminUser.isAdmin){
        return res.status(403).json({ error: 'Admin required' });
      }

      const amount = Math.floor(Number(xp));
      if(!username || !Number.isFinite(amount) || amount <= 0){
        return res.status(400).json({ error: 'Enter a player and a positive XP amount.' });
      }

      const cleanReason = String(reason || '').trim();
      if(cleanReason.length < 3){
        return res.status(400).json({ error: 'Reason is required.' });
      }

      const target = await User.findOne({ username });
      if(!target){
        return res.status(404).json({ error: 'Player not found.' });
      }

      target.xp = (target.xp || 0) + amount;
      target.matchHistory = target.matchHistory || [];
      target.matchHistory.unshift({
        result: 'draw',
        opponent: adminUser.username || 'Admin',
        xpChange: amount,
        reason: `Admin bonus: ${cleanReason.slice(0, 120)}`,
        gameKey: 'admin',
        gameName: 'Bonus XP',
        scoreFinal: '',
        eloChange: 0
      });
      target.matchHistory = target.matchHistory.slice(0, 20);
      await target.save();

      res.json({ success: true, username: target.username, xp: target.xp, amount, reason: cleanReason });
    }catch(err){
      console.error('Bonus XP error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/leaderboard/:type/:username', async (req, res)=>{
    try{
      const { type, username } = req.params;
      const users = await getLeaderboard(User, type);

      const list = users.map((u, index) => ({ username: u.username, value: getLeaderboardValue(u, type), rank: index + 1 }));
      const me = list.find(u => u.username === username) || null;
      const top = list.slice(0, 10).map(({ username: entryUsername, value }) => ({ username: entryUsername, value }));

      res.json({ top, me: me ? { rank: me.rank, value: me.value } : null });
    }catch(err){
      console.error('Leaderboard error:', err);
      res.status(500).json({ error: 'Leaderboard unavailable' });
    }
  });

  router.get('/profile/:username', async (req, res)=>{
    try{
      const { username } = req.params;
      const user = await User.findOne({ username }).lean();
      if(!user){
        return res.status(404).json({ error: 'User not found' });
      }

      const wins = user.wins || 0;
      const losses = user.losses || 0;
      const draws = user.draws || 0;
      const total = wins + losses + draws;
      const winrate = total ? Math.round((wins / total) * 100) : 0;

      res.json({
        username: user.username,
        avatar: user.avatar || '',
        elo: user.chessElo || user.elo || 1000,
        chessElo: user.chessElo || user.elo || 1000,
        othelloElo: user.othelloElo || user.othelloPoints || 1000,
        azulElo: user.azulElo || user.azulPoints || 1000,
        strategyElo: user.strategyElo || user.strategyPoints || 1000,
        xp: user.xp || 0,
        level: Math.floor((user.xp || 0) / 100) + 1,
        stats: { wins, losses, draws, total, winrate },
        matchHistory: (user.matchHistory || []).slice(0, 5)
      });
    }catch(err){
      console.error('Profile error:', err);
      res.status(500).json({ error: 'Profile unavailable' });
    }
  });

  router.get('/avatars', (req, res)=>{
    res.json({ avatars: listAvailableAvatars() });
  });

  router.post('/profile/:username/avatar', async (req, res)=>{
    try{
      const { username } = req.params;
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

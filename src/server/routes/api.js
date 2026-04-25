const express = require('express');
const { getLeaderboard } = require('../services/user-service');

function createApiRouter({ User, state, isGameAllowed }){
  const router = express.Router();

  async function createUser(req, res){
    try{
      const { username, email, password } = req.body;
      const exists = await User.findOne({ email });
      if(exists){
        return res.status(400).json({ error: 'User already exists' });
      }

      const user = new User({ username, email, password, elo: 1000, xp: 0, isAdmin: false });
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
        elo: user.elo,
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

  router.post('/admin/override', async (req, res)=>{
    try{
      const { adminEmail, enabled } = req.body;
      const adminUser = await User.findOne({ email: adminEmail });
      if(!adminUser || !adminUser.isAdmin){
        return res.status(403).json({ error: 'Admin required' });
      }

      state.manualOverride = Boolean(enabled);
      res.json({ success: true, enabled: state.manualOverride });
    }catch(err){
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/leaderboard/:type/:username', async (req, res)=>{
    try{
      const { type, username } = req.params;
      const users = await getLeaderboard(User, type);
      const valueKey = type === 'chess' ? 'elo' : (type === 'strategy' ? 'strategyPoints' : (type === 'othello' ? 'othelloPoints' : 'xp'));

      const list = users.map((u, index) => ({ username: u.username, value: u[valueKey] || 0, rank: index + 1 }));
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
        elo: user.elo || 1000,
        xp: user.xp || 0,
        level: Math.floor((user.xp || 0) / 100) + 1,
        stats: { wins, losses, draws, total, winrate },
        matchHistory: (user.matchHistory || []).slice(0, 10)
      });
    }catch(err){
      console.error('Profile error:', err);
      res.status(500).json({ error: 'Profile unavailable' });
    }
  });

  return router;
}

module.exports = { createApiRouter };

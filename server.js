const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const mongoose = require('mongoose');
const User = require('./models/User');

app.use(express.json());
app.use(express.static('public'));

/* ================= AUTH ================= */

app.post("/api/signup", async (req,res)=>{
  try{
    const { username, email, password } = req.body;

    const exists = await User.findOne({ email });
    if(exists){
      return res.status(400).json({ error: "User already exists" });
    }

    const user = new User({
      username,
      email,
      password,
      elo: 1000,
      xp: 0,
      isAdmin: false
    });

    await user.save();

    res.json({ success: true });

  }catch(err){
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req,res)=>{
  try{
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if(!user || user.password !== password){
      return res.status(400).json({ error: "Invalid credentials" });
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
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/', (req,res)=>{
  res.sendFile('index.html', { root: 'public' });
});

/* ================= ADMIN ================= */

let manualOverride = null;

function isGameAllowed(){
  if(manualOverride !== null) return manualOverride;
  return true;
}

app.get("/api/games/status", (req,res)=>{
  res.json({ enabled: isGameAllowed() });
});

/* ================= DATA ================= */

let onlineUsers = {};
let lobbies = {};
let chessGames = {};
let playerGames = {};
let rematchRequests = {};
let pendingDisconnects = {};

/* ================= UTILS ================= */

function update(){
  io.emit("online_users", onlineUsers);
  io.emit("lobbies_update", lobbies);
}

/* ================= ELO ================= */

function calculateElo(playerElo, opponentElo, result){
  const K = 20;
  const expected =
    1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));

  return Math.round(playerElo + K * (result - expected));
}

async function applyElo(game, winnerName){

  if(game.ended) return;
  game.ended = true;

  const [p1,p2] = game.players;

  const u1 = await User.findOne({username:p1.username});
  const u2 = await User.findOne({username:p2.username});

  if(!u1 || !u2) return;

  const elo1 = u1.elo || 1000;
  const elo2 = u2.elo || 1000;

  const r1 = p1.username === winnerName ? 1 : 0;
  const r2 = p2.username === winnerName ? 1 : 0;

  const newElo1 = calculateElo(elo1, elo2, r1);
  const newElo2 = calculateElo(elo2, elo1, r2);

  const gain1 = newElo1 - elo1;
  const gain2 = newElo2 - elo2;

  u1.elo = newElo1;
  u2.elo = newElo2;

  await u1.save();
  await u2.save();

  game.players.forEach(p=>{
    const s = io.sockets.sockets.get(p.id);
    if(s){
      const gain = p.username === p1.username ? gain1 : gain2;
      const elo = p.username === p1.username ? newElo1 : newElo2;
      s.emit("elo_update",{elo,gain});
    }
  });
}

/* ================= XP SYSTEM ================= */

async function applyXP(game, winnerName, reason){

  const [p1,p2] = game.players;

  const u1 = await User.findOne({username:p1.username});
  const u2 = await User.findOne({username:p2.username});

  if(!u1 || !u2) return;

  const players = [
    { user:u1, data:p1 },
    { user:u2, data:p2 }
  ];

  for(const p of players){

    let xp = 0;

    const isWinner = p.data.username === winnerName;
    const opponent = players.find(x=>x.data.username !== p.data.username);

    xp += 1;

    if(isWinner){
      xp += 5;

      if(opponent.data.username === "The Emperor"){
        xp += 5;
      }

      if((opponent.user.elo || 1000) > (p.user.elo || 1000)){
        xp += 2;
      }
    }

    if((reason === "resign" || reason === "disconnect") && !isWinner){
      xp -= 1;
    }

    p.user.xp = (p.user.xp || 0) + xp;

    await p.user.save();

    const s = io.sockets.sockets.get(p.data.id);
    if(s){
      s.emit("xp_update",{xp:p.user.xp, gain:xp});
    }
  }
}

/* ================= ADMIN ROUTE ================= */

app.post("/api/admin/override", async (req,res)=>{
  try{
    const { adminEmail, enabled } = req.body;

    const admin = await User.findOne({email:adminEmail});
    if(!admin || !admin.isAdmin){
      return res.status(403).json({error:"Not admin"});
    }

    manualOverride = enabled;

    io.emit("games_status",{enabled});

    res.json({success:true});

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

/* ================= GAME ================= */
/* (TOUT TON CODE GAME RESTE STRICTEMENT IDENTIQUE) */

/* ================= LEADERBOARD ================= */

app.get("/api/leaderboard/:type/:username", async (req,res)=>{

  const { type, username } = req.params;

  try{

    let sortField;

    if(type === "global"){
      sortField = "xp";
    }
    else if(type === "chess"){
      sortField = "elo";
    }
    else if(type === "strategy"){
      sortField = "strategyPoints";
    }
    else{
      sortField = "xp";
    }

    const users = await User.find();

    // 🔥 FIX
    users.forEach(u=>{
      if(u.xp === undefined) u.xp = 0;
      if(u.elo === undefined) u.elo = 1000;
      if(u.strategyPoints === undefined) u.strategyPoints = 0;
    });

    users.sort((a,b)=>(b[sortField]||0)-(a[sortField]||0));

    const top10 = users.slice(0,10);

    const rank = users.findIndex(u=>u.username===username) + 1;

    const me = users.find(u=>u.username===username);

    res.json({
      top: top10.map(u=>({
        username: u.username,
        value: u[sortField] ?? 0
      })),
      me: me ? {
        username: me.username,
        value: me[sortField] ?? 0,
        rank
      } : null
    });

  }catch(err){
    console.error(err);
    res.status(500).json({top:[],me:null});
  }

});

/* ================= START ================= */

async function startServer(){
  await mongoose.connect(process.env.MONGO_URI);
  http.listen(process.env.PORT||3000, ()=>{
    console.log("Server running");
  });
}

startServer();

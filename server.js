const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const mongoose = require('mongoose');
const User = require('./models/User');

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req,res)=>{
  res.sendFile('index.html', { root: 'public' });
});

/* ================= ADMIN ================= */

let manualOverride = null;

function isGameAllowed(){
  if(manualOverride !== null) return manualOverride;
  return true;
}

/* ================= DATA ================= */

let onlineUsers = {};
let lobbies = {};
let chessGames = {};
let playerGames = {};
let rematchRequests = {};
let pendingDisconnects = {};

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

  u1.elo = newElo1;
  u2.elo = newElo2;

  await u1.save();
  await u2.save();
}

/* ================= AUTH ================= */

app.post("/api/register", async (req,res)=>{
  try{
    const { email, password, username } = req.body;

    if(!email || !password || !username){
      return res.status(400).json({error:"Missing fields"});
    }

    const existing = await User.findOne({email});
    if(existing) return res.status(400).json({error:"Email used"});

    const user = new User({
      email,
      password,
      username,
      elo:1000
    });

    await user.save();

    res.json({success:true});

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

/* 🔥 LOGIN STABLE */
app.post("/api/login", async (req,res)=>{
  try{
    const { email, password } = req.body;

    const user = await User.findOne({email, password});

    if(!user){
      return res.status(400).json({error:"Invalid credentials"});
    }

    res.json({
      username:user.username,
      email:user.email,
      elo:user.elo || 1000,
      isAdmin:user.isAdmin || false
    });

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

/* ================= ADMIN ROUTE ================= */

app.post("/api/admin/override", async (req,res)=>{
  try{
    const { adminEmail, enabled } = req.body;

    const admin = await User.findOne({email:adminEmail});

    if(!admin || !admin.isAdmin){
      return res.status(403).json({error:"Not admin"});
    }

    manualOverride = enabled;

    console.log("ADMIN SET:", enabled);

    res.json({success:true});

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

/* ================= GAME ================= */

function createGame(lobby){

  const [p1,p2] = lobby.players;
  const id = Math.random().toString(36).substr(2,6);

  const swap = Math.random() < 0.5;

  const white = swap ? p2 : p1;
  const black = swap ? p1 : p2;

  const game = {
    id,
    players:[
      {id:white.id, username:white.username, color:'w'},
      {id:black.id, username:black.username, color:'b'}
    ],
    fen:null,
    turn:'w',
    ended:false
  };

  chessGames[id] = game;

  playerGames[white.username] = id;
  playerGames[black.username] = id;

  return game;
}

/* ================= SOCKET ================= */

io.on('connection', socket=>{

  socket.on("register_online", async username=>{
    socket.username = username;

    const user = await User.findOne({username});

    onlineUsers[username] = {
      id:socket.id,
      elo:user?.elo || 1000,
      status:"idle"
    };

    update();
  });

  socket.on("create_lobby", ({name,time})=>{
    if(!isGameAllowed()){
      socket.emit("error_message","Games disabled by admin");
      return;
    }

    const id=Math.random().toString(36).substr(2,5);

    lobbies[id]={
      id,
      name,
      time,
      players:[{id:socket.id, username:socket.username, ready:false}]
    };

    update();
  });

  socket.on("join_lobby", id=>{
    if(!isGameAllowed()){
      socket.emit("error_message","Games disabled by admin");
      return;
    }

    const l=lobbies[id];
    if(!l||l.players.length>=2) return;

    l.players.push({id:socket.id, username:socket.username, ready:false});
    update();
  });

  socket.on("toggle_ready", id=>{
    if(!isGameAllowed()){
      socket.emit("error_message","Games disabled by admin");
      return;
    }

    const l=lobbies[id];
    if(!l) return;

    const p=l.players.find(p=>p.id===socket.id);
    if(!p) return;

    p.ready=!p.ready;

    update();

    if(l.players.length===2 && l.players.every(p=>p.ready)){
      const game=createGame(l);

      l.players.forEach(pl=>{
        const s=io.sockets.sockets.get(pl.id);
        const data=game.players.find(p=>p.username===pl.username);

        s.join(game.id);
        s.chessGame=game.id;
        s.color=data.color;

        s.emit("chess_start",{
          color:data.color,
          players:{
            white: game.players.find(p=>p.color==='w').username,
            black: game.players.find(p=>p.color==='b').username
          }
        });
      });

      delete lobbies[id];
      update();
    }
  });

  socket.on("chess_move", ({fen})=>{
    const g=chessGames[socket.chessGame];
    if(!g || socket.color!==g.turn) return;

    g.fen=fen;
    g.turn=g.turn==='w'?'b':'w';

    io.to(g.id).emit("chess_update",{fen});
  });

  socket.on("resign", async ()=>{
    const game = chessGames[playerGames[socket.username]];
    if(!game) return;

    const opponent = game.players.find(p=>p.username!==socket.username);

    await applyElo(game, opponent.username);

    game.players.forEach(p=>{
      io.to(p.id).emit("player_left",{winner:opponent.username});
    });

    delete chessGames[game.id];
  });

});

/* ================= START ================= */

async function startServer(){
  await mongoose.connect(process.env.MONGO_URI);
  http.listen(process.env.PORT||3000, ()=>{
    console.log("Server running");
  });
}

startServer();

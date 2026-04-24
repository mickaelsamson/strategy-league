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

/* ================= SOCKET ================= */

io.on("connection", socket => {

  socket.on("register_online", username=>{
    socket.username = username;
    onlineUsers[socket.id] = username;
    update();
  });

  /* ===== CREATE LOBBY ===== */
  socket.on("create_lobby", ({name,time})=>{

    const existing = Object.values(lobbies).find(l =>
      l.players.some(p=>p.username === socket.username)
    );
    if(existing) return;

    const id = Math.random().toString(36).substr(2,9);

    lobbies[id] = {
      id,
      name,
      time,
      players:[
        {
          id:socket.id,
          username:socket.username,
          ready:false
        }
      ]
    };

    update();
  });

  /* ===== JOIN ===== */
  socket.on("join_lobby", id=>{

    const lobby = lobbies[id];
    if(!lobby) return;

    const existing = Object.values(lobbies).find(l =>
      l.players.some(p=>p.username === socket.username)
    );
    if(existing) return;

    lobby.players.push({
      id:socket.id,
      username:socket.username,
      ready:false
    });

    update();
  });

  /* ===== READY (FIX COMPLET) ===== */
  socket.on("toggle_ready", id=>{

    const lobby = lobbies[id];
    if(!lobby) return;

    const player = lobby.players.find(p=>p.id === socket.id);
    if(!player) return;

    player.ready = !player.ready;

    // 🔥 START GAME
    if(lobby.players.length === 2 && lobby.players.every(p=>p.ready)){

      const gameId = Math.random().toString(36).substr(2,9);

      chessGames[gameId] = {
        id:gameId,
        players:[
          { ...lobby.players[0], color:"w" },
          { ...lobby.players[1], color:"b" }
        ],
        turn:"w",
        fen:null,
        ended:false
      };

      lobby.players.forEach(p=>{
        playerGames[p.username] = gameId;

        const s = io.sockets.sockets.get(p.id);
        if(s){
          s.emit("chess_start",{
            color:p.color,
            players:{
              white: chessGames[gameId].players.find(pl=>pl.color==="w").username,
              black: chessGames[gameId].players.find(pl=>pl.color==="b").username
            }
          });
        }
      });

      delete lobbies[id];
    }

    update();
  });

  /* ===== DISCONNECT ===== */
  socket.on("disconnect", ()=>{

    delete onlineUsers[socket.id];

    for(const id in lobbies){
      lobbies[id].players = lobbies[id].players.filter(p=>p.id !== socket.id);

      if(lobbies[id].players.length === 0){
        delete lobbies[id];
      }
    }

    update();
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

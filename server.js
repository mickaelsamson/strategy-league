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

function findGameIdForSocket(socket){
  let gameId = playerGames[socket.id];
  if(gameId) return gameId;

  if(!socket.username) return null;

  gameId = Object.keys(chessGames).find(id =>
    chessGames[id]?.players?.some(p=>p.username === socket.username)
  );

  if(gameId){
    playerGames[socket.id] = gameId;
  }

  return gameId || null;
}


/* ================= UTILS ================= */

async function update(){

  const users = {};

  for(const id in onlineUsers){
    const username = onlineUsers[id];
    const user = await User.findOne({username});

    users[username] = {
      elo: user?.elo || 1000
    };
  }

  io.emit("online_users", users);
  io.emit("lobbies_update", lobbies);
}

/* ================= SOCKET ================= */

io.on("connection", socket => {

function emitGameStart(game){
    game.players.forEach(player=>{
      playerGames[player.id] = game.id;
      const s = io.sockets.sockets.get(player.id);
      if(!s) return;

      s.emit("chess_start",{
        color: player.color,
        fen: game.fen,
        players:{
          white: game.players.find(pl=>pl.color==="w").username,
          black: game.players.find(pl=>pl.color==="b").username
        }
      });
    });
  }

  function emitGameOver(gameId, payload){
    const game = chessGames[gameId];
    if(!game || game.ended) return;

    game.ended = true;
    rematchRequests[gameId] = {};

    game.players.forEach(player=>{
      const s = io.sockets.sockets.get(player.id);
      if(s){
        s.emit("chess_game_over", payload);
      }
    });
  }
  
  socket.on("register_online", username=>{
    socket.username = username;
    onlineUsers[socket.id] = username;
    
    for(const gameId in chessGames){
      const game = chessGames[gameId];
      if(!game || game.ended) continue;

      const player = game.players.find(p=>p.username === username);
      if(!player) continue;

      const previousSocketId = player.id;
      player.id = socket.id;

      if(previousSocketId && previousSocketId !== socket.id){
        delete playerGames[previousSocketId];
      }

      playerGames[socket.id] = gameId;

      socket.emit("chess_start",{
        color: player.color,
        fen: game.fen,
        players:{
          white: game.players.find(pl=>pl.color==="w").username,
          black: game.players.find(pl=>pl.color==="b").username
        }
      });
    }

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

  /* ===== READY ===== */
  socket.on("toggle_ready", id=>{

    const lobby = lobbies[id];
    if(!lobby) return;

    const player = lobby.players.find(p=>p.id === socket.id);
    if(!player) return;

    player.ready = !player.ready;

    if(lobby.players.length === 2 && lobby.players.every(p=>p.ready)){

      const gameId = Math.random().toString(36).substr(2,9);

      // 🔥 FIX 1 : structure propre joueurs + couleurs
      const p1 = lobby.players[0];
      const p2 = lobby.players[1];

      chessGames[gameId] = {
        id:gameId,
        players:[
          { id:p1.id, username:p1.username, color:"w" },
          { id:p2.id, username:p2.username, color:"b" }
        ],
        turn:"w",
        fen:null,
        ended:false
      };

      emitGameStart(chessGames[gameId]);

      delete lobbies[id];
    }

    update();
  });

  /* ===== MOVE ===== */
  socket.on("chess_move", ({fen})=>{
    
    const gameId = findGameIdForSocket(socket);

    if(!gameId) return;

    const game = chessGames[gameId];
    if(!game || game.ended) return;  
    game.fen = fen;

    game.players.forEach(p=>{
      const s = io.sockets.sockets.get(p.id);
      if(s){
        s.emit("chess_update",{fen});
      }
    });

  });

  /* ===== RESIGN ===== */
  socket.on("resign", ()=>{
    const gameId = findGameIdForSocket(socket);
    if(!gameId) return;

    const game = chessGames[gameId];
    if(!game || game.ended) return;

    const quitter = game.players.find(p=>p.id === socket.id || p.username === socket.username);
    const winner = game.players.find(p=>p.username !== quitter?.username);

    emitGameOver(gameId, {
      reason: "resign",
      message: quitter ? `${quitter.username} abandoned the game.` : "A player abandoned the game.",
      winner: winner?.username || null
    });
  });

  /* ===== REMATCH ===== */
  socket.on("rematch", ()=>{
    const gameId = findGameIdForSocket(socket);
    if(!gameId) return;

    const game = chessGames[gameId];
    if(!game || !game.ended) return;

    if(!rematchRequests[gameId]){
      rematchRequests[gameId] = {};
    }

    rematchRequests[gameId][socket.username] = true;

    const requestedBy = Object.keys(rematchRequests[gameId]);

    game.players.forEach(player=>{
      const s = io.sockets.sockets.get(player.id);
      if(s){
        s.emit("chess_rematch_status", {
          requestedBy
        });
      }
    });

    const allReady = game.players.every(player => rematchRequests[gameId][player.username]);
    if(!allReady) return;

    game.players.forEach(player=>{
      player.color = player.color === "w" ? "b" : "w";
    });

    game.fen = null;
    game.turn = "w";
    game.ended = false;
    rematchRequests[gameId] = {};

    emitGameStart(game);
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

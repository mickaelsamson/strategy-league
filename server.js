const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('./models/User');

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req,res)=>{
  res.sendFile('index.html', { root: 'public' });
});

/* =========================
   AUTH
========================= */

app.post('/api/register', async (req,res)=>{
  try{
    let {email, password, firstName, lastName, username} = req.body;

    if(!email || !password || !username){
      return res.status(400).send({error:"Missing fields"});
    }

    email = email.toLowerCase().trim();

    const exists = await User.findOne({email});
    if(exists){
      return res.status(400).send({error:"Email already used"});
    }

    const hashed = await bcrypt.hash(password,10);

    await User.create({
      email,
      password: hashed,
      firstName,
      lastName,
      username
    });

    res.send({success:true});

  }catch(err){
    console.log(err);
    res.status(500).send({error:"Server error"});
  }
});

/* =========================
   STRATEGY GAME
========================= */

let games = {};
const TURN_TIME = 30;

function createGame(id){
  return {
    id,
    players:[],
    turn:0,
    timeLeft:TURN_TIME,
    territories:Array(8).fill().map((_,i)=>({
      owner: i % 2,
      troops:3
    }))
  };
}

function startTimer(g){
  if(g.timer) clearInterval(g.timer);

  g.timer=setInterval(()=>{
    g.timeLeft--;

    io.to(g.id).emit("timer",g.timeLeft);

    if(g.timeLeft<=0){
      if(g.players.length > 0){
        g.turn=(g.turn+1)%g.players.length;
      }
      g.timeLeft=TURN_TIME;
    }
  },1000);
}

function sendState(g){
  io.to(g.id).emit('state', {
    players: g.players,
    turn: g.turn,
    timeLeft: g.timeLeft,
    territories: g.territories
  });
}

/* =========================
   CHESS LOBBY SYSTEM
========================= */

let onlineUsers = {};
let lobbies = {};
let chessGames = {};

function createLobby(name, time, host){
  const id = Math.random().toString(36).substr(2,5);

  lobbies[id] = {
    id,
    name,
    time,
    players:[{
      id:host.id,
      username:host.username
    }]
  };

  return lobbies[id];
}

function createChessGame(lobby){

  const [p1,p2] = lobby.players;

  const id = Math.random().toString(36).substr(2,6);

  const game = {
    id,
    players:[
      {id:p1.id, username:p1.username, color:'w', time:lobby.time},
      {id:p2.id, username:p2.username, color:'b', time:lobby.time}
    ],
    fen:null,
    turn:'w',
    timer:null
  };

  chessGames[id] = game;
  startChessTimer(game);

  return game;
}

function startChessTimer(g){
  if(g.timer) clearInterval(g.timer);

  g.timer=setInterval(()=>{
    const current = g.players.find(p=>p.color===g.turn);
    if(!current) return;

    current.time--;

    io.to(g.id).emit("chess_timer", g.players);

    if(current.time<=0){
      const winner = g.players.find(p=>p.color!==g.turn);
      io.to(g.id).emit("chess_end",{winner:winner.username});
      clearInterval(g.timer);
    }

  },1000);
}

/* =========================
   SOCKET
========================= */

io.on('connection', socket=>{

  /* ===== ONLINE USERS ===== */

  socket.on("register_online", username=>{
    socket.username = username;
    onlineUsers[username] = socket.id;
    updateAll();
  });

  socket.on("disconnect", ()=>{
    delete onlineUsers[socket.username];

    Object.values(lobbies).forEach(l=>{
      l.players = l.players.filter(p=>p.id!==socket.id);
    });

    updateAll();
  });

  function updateAll(){
    io.emit("lobbies_update", lobbies);
    io.emit("online_users", Object.keys(onlineUsers));
  }

  /* ===== CREATE LOBBY ===== */

  socket.on("create_lobby", ({name,time})=>{
    if(!name) name = "Lobby";

    createLobby(name,time,socket);
    updateAll();
  });

  /* ===== JOIN LOBBY ===== */

  socket.on("join_lobby", id=>{
    const l = lobbies[id];
    if(!l || l.players.length>=2) return;

    l.players.push({
      id:socket.id,
      username:socket.username
    });

    updateAll();

    if(l.players.length===2){

      const game = createChessGame(l);

      l.players.forEach((p,i)=>{
        const s = io.sockets.sockets.get(p.id);

        s.join(game.id);
        s.chessGame = game.id;
        s.color = i===0?'w':'b';

        s.emit("chess_start",{
          color:s.color,
          time:l.time
        });
      });

      delete lobbies[id];
      updateAll();
    }
  });

  /* ===== INVITE ===== */

  socket.on("invite_player", ({target,lobbyId})=>{
    const id = onlineUsers[target];
    if(id){
      io.to(id).emit("invite_received",{
        from:socket.username,
        lobbyId
      });
    }
  });

  socket.on("accept_invite", ({lobbyId})=>{
    const l = lobbies[lobbyId];
    if(!l) return;

    socket.emit("join_lobby", lobbyId);
  });

  /* ===== MOVE ===== */

  socket.on("chess_move", ({from,to,fen})=>{
    const g = chessGames[socket.chessGame];
    if(!g) return;

    if(socket.color!==g.turn) return;

    g.fen = fen;
    g.turn = g.turn==='w'?'b':'w';

    io.to(g.id).emit("chess_update",{fen:g.fen});
  });

});

/* =========================
   START SERVER
========================= */

async function startServer(){
  try{
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Mongo connected");

    http.listen(process.env.PORT||3000, ()=>{
      console.log("Server running");
    });

  }catch(err){
    console.log("Mongo ERROR:", err.message);
    process.exit(1);
  }
}

startServer();

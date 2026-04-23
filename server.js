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

  const newElo =
    Math.round(playerElo + K * (result - expected));

  return newElo;
}

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

/* ================= ELO UPDATE ================= */

async function applyElo(game, winnerName){

  if(game.ended) return;
  game.ended = true;

  const p1 = game.players[0];
  const p2 = game.players[1];

  const u1 = await User.findOne({username:p1.username});
  const u2 = await User.findOne({username:p2.username});

  const r1 = p1.username === winnerName ? 1 : 0;
  const r2 = p2.username === winnerName ? 1 : 0;

  const newElo1 = calculateElo(u1.elo, u2.elo, r1);
  const newElo2 = calculateElo(u2.elo, u1.elo, r2);

  const gain1 = newElo1 - u1.elo;
  const gain2 = newElo2 - u2.elo;

  u1.elo = newElo1;
  u2.elo = newElo2;

  await u1.save();
  await u2.save();

  /* 🔥 ENVOI AUX JOUEURS */
  game.players.forEach(p=>{
    const s = io.sockets.sockets.get(p.id);
    if(s){
      const gain = p.username === p1.username ? gain1 : gain2;
      s.emit("elo_update",{
        elo: p.username === p1.username ? newElo1 : newElo2,
        gain
      });
    }
  });
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

  /* ================= RESIGN ================= */

  socket.on("resign", async ()=>{

    const gameId = playerGames[socket.username];
    const game = chessGames[gameId];
    if(!game) return;

    const opponent = game.players.find(p=>p.username!==socket.username);

    /* 🔥 ELO */
    await applyElo(game, opponent.username);

    game.players.forEach(p=>{
      io.to(p.id).emit("player_left",{winner:opponent.username});
    });

    delete chessGames[gameId];
  });

  /* ================= DISCONNECT ================= */

  socket.on("disconnect", ()=>{
    const username = socket.username;
    delete onlineUsers[username];

    const gameId = playerGames[username];
    const game = chessGames[gameId];

    if(game){

      const opponent = game.players.find(p=>p.username!==username);

      if(opponent){

        let timeLeft = 60;

        const interval = setInterval(async ()=>{

          timeLeft--;

          io.to(opponent.id).emit("disconnect_timer",{time:timeLeft});

          if(timeLeft<=0){
            clearInterval(interval);

            await applyElo(game, opponent.username);

            io.to(opponent.id).emit("player_left",{winner:opponent.username});

            delete chessGames[gameId];
          }

        },1000);
      }
    }

    update();
  });

  /* ================= LOBBY ================= */

  socket.on("create_lobby", ({name,time})=>{
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
    const l=lobbies[id];
    if(!l||l.players.length>=2) return;

    l.players.push({id:socket.id, username:socket.username, ready:false});
    update();
  });

  socket.on("toggle_ready", id=>{
    const l=lobbies[id];
    const p=l.players.find(p=>p.id===socket.id);
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

});

/* ================= START ================= */

async function startServer(){
  await mongoose.connect(process.env.MONGO_URI);
  http.listen(process.env.PORT||3000);
}

startServer();

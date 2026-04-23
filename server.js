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

/* ================= DATA ================= */

let onlineUsers = {};
let lobbies = {};
let chessGames = {};

let pendingDisconnects = {};
let playerGames = {};
let rematchRequests = {};

/* ================= UTILS ================= */

function update(){
  io.emit("online_users", onlineUsers);
  io.emit("lobbies_update", lobbies);
}

/* ================= GAME ================= */

function createGame(lobby){

  const [p1,p2] = lobby.players;
  const id = Math.random().toString(36).substr(2,6);

  /* 🎲 RANDOM COLORS */
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
    turn:'w'
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
    socket.elo = user?.elo || 1000;

    onlineUsers[username] = {
      id:socket.id,
      elo:socket.elo,
      status:"idle"
    };

    /* RECONNECT */
    if(playerGames[username]){
      const gameId = playerGames[username];
      const game = chessGames[gameId];

      if(game){

        const player = game.players.find(p=>p.username===username);

        socket.join(gameId);
        socket.chessGame = gameId;
        socket.color = player.color;

        onlineUsers[username].status = "playing";

        socket.emit("chess_start",{
          color:player.color,
          players:{
            white: game.players.find(p=>p.color==='w').username,
            black: game.players.find(p=>p.color==='b').username
          }
        });

        socket.emit("chess_update",{fen:game.fen});
      }
    }

    update();
  });

  socket.on("disconnect", ()=>{

    const username = socket.username;
    if(!username) return;

    delete onlineUsers[username];

    const gameId = playerGames[username];
    const game = chessGames[gameId];

    if(game){

      const opponent = game.players.find(p=>p.username !== username);

      if(opponent){

        io.to(opponent.id).emit("opponent_disconnected",{
          player: username
        });

        let timeLeft = 60;

        const interval = setInterval(()=>{

          timeLeft--;

          io.to(opponent.id).emit("disconnect_timer",{time: timeLeft});

          if(timeLeft <= 0){

            clearInterval(interval);

            io.to(opponent.id).emit("player_left",{
              winner: opponent.username
            });

            delete chessGames[gameId];
          }

        },1000);

        pendingDisconnects[username] = interval;
      }
    }

    update();
  });

  /* ================= REMATCH ================= */

  socket.on("rematch", ()=>{

    const username = socket.username;
    const gameId = playerGames[username];

    if(!gameId) return;

    if(!rematchRequests[gameId]){
      rematchRequests[gameId] = [];
    }

    if(!rematchRequests[gameId].includes(username)){
      rematchRequests[gameId].push(username);
    }

    let game = chessGames[gameId];

    /* 🔥 RECREATE GAME IF NEEDED */
    if(!game){
      const players = Object.keys(playerGames)
        .filter(u => playerGames[u] === gameId);

      if(players.length === 2){

        const sockets = players.map(u => onlineUsers[u]?.id);

        game = {
          id: gameId,
          players:[
            {id:sockets[0], username:players[0], color:'w'},
            {id:sockets[1], username:players[1], color:'b'}
          ],
          fen:null,
          turn:'w'
        };

        chessGames[gameId] = game;
      }
    }

    if(!game) return;

    /* 🔥 BOTH ACCEPTED */
    if(rematchRequests[gameId].length === 2){

      rematchRequests[gameId] = [];

      /* 🔁 SWAP COLORS */
      game.players = game.players.map(p=>({
        id:p.id,
        username:p.username,
        color: p.color === 'w' ? 'b' : 'w'
      }));

      game.fen = null;
      game.turn = 'w';

      game.players.forEach(p=>{
        const s = io.sockets.sockets.get(p.id);

        if(s){
          s.emit("chess_start",{
            color:p.color,
            players:{
              white: game.players.find(pl=>pl.color==='w').username,
              black: game.players.find(pl=>pl.color==='b').username
            }
          });
        }
      });

    }else{

      const opponent = game.players.find(p=>p.username !== username);

      if(opponent){
        io.to(opponent.id).emit("rematch_requested",{
          from: username
        });
      }
    }

  });

  /* ================= RESIGN ================= */

  socket.on("resign", ()=>{

    const username = socket.username;
    const gameId = playerGames[username];
    const game = chessGames[gameId];

    if(!game) return;

    const opponent = game.players.find(p=>p.username !== username);

    game.players.forEach(p=>{
      const s = io.sockets.sockets.get(p.id);
      if(s){
        s.emit("player_left",{
          winner: opponent.username
        });
      }
    });

    delete chessGames[gameId];
  });

  /* ================= LOBBY ================= */

  socket.on("create_lobby", ({name,time})=>{
    const id = Math.random().toString(36).substr(2,5);

    lobbies[id] = {
      id,
      name,
      time,
      players:[{
        id:socket.id,
        username:socket.username,
        ready:false
      }]
    };

    update();
  });

  socket.on("join_lobby", id=>{
    const l = lobbies[id];
    if(!l || l.players.length>=2) return;

    l.players.push({
      id:socket.id,
      username:socket.username,
      ready:false
    });

    update();
  });

  socket.on("toggle_ready", id=>{
    const l = lobbies[id];
    if(!l) return;

    const player = l.players.find(p=>p.id===socket.id);
    if(!player) return;

    player.ready = !player.ready;

    update();

    if(l.players.length===2 && l.players.every(p=>p.ready)){

      const game = createGame(l);

      l.players.forEach((p,i)=>{
        const s = io.sockets.sockets.get(p.id);

        onlineUsers[p.username].status="playing";

        const playerData = game.players.find(pl=>pl.username===p.username);

        s.join(game.id);
        s.chessGame = game.id;
        s.color = playerData.color;

        s.emit("chess_start",{
          color:s.color,
          players:{
            white: game.players.find(pl=>pl.color==='w').username,
            black: game.players.find(pl=>pl.color==='b').username
          }
        });
      });

      delete lobbies[id];
      update();
    }
  });

  /* ================= MOVE ================= */

  socket.on("chess_move", ({fen})=>{
    const g = chessGames[socket.chessGame];
    if(!g) return;

    if(socket.color !== g.turn) return;

    g.fen = fen;
    g.turn = g.turn==='w'?'b':'w';

    io.to(g.id).emit("chess_update",{fen:g.fen});
  });

});

/* ================= START ================= */

async function startServer(){
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Mongo connected");

  http.listen(process.env.PORT||3000, ()=>{
    console.log("Server running");
  });
}

startServer();

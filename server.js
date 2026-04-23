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

function update(){
  io.emit("online_users", onlineUsers);
  io.emit("lobbies_update", lobbies);
}

/* ================= GAME ================= */

function createGame(lobby){

  const [p1,p2] = lobby.players;

  const id = Math.random().toString(36).substr(2,6);

  const game = {
    id,
    players:[
      {id:p1.id, username:p1.username, color:'w'},
      {id:p2.id, username:p2.username, color:'b'}
    ],
    fen:null,
    turn:'w'
  };

  chessGames[id] = game;

  playerGames[p1.username] = id;
  playerGames[p2.username] = id;

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

    if(pendingDisconnects[username]){
      clearInterval(pendingDisconnects[username]);
      delete pendingDisconnects[username];

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
        socket.emit("disconnect_timer",{time:0});
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
            delete playerGames[username];
            delete playerGames[opponent.username];
          }

        },1000);

        pendingDisconnects[username] = interval;
      }
    }

    update();
  });

  /* 🔥 ABANDON */
  socket.on("resign", ()=>{

    const username = socket.username;
    const gameId = playerGames[username];
    const game = chessGames[gameId];

    if(!game) return;

    const opponent = game.players.find(p=>p.username !== username);

    if(opponent){
      io.to(opponent.id).emit("player_left",{
        winner: opponent.username
      });
    }

    delete chessGames[gameId];
    delete playerGames[username];
    if(opponent) delete playerGames[opponent.username];

    update();
  });

  /* CREATE */
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

  /* JOIN */
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

  /* READY */
  socket.on("toggle_ready", id=>{
    const l = lobbies[id];
    if(!l) return;

    const player = l.players.find(p=>p.id===socket.id);
    if(!player) return;

    player.ready = !player.ready;

    update();

    if(l.players.length===2 && l.players.every(p=>p.ready)){

      const game = createGame(l);

      const p1 = l.players[0];
      const p2 = l.players[1];

      l.players.forEach((p,i)=>{
        const s = io.sockets.sockets.get(p.id);

        onlineUsers[p.username].status="playing";

        s.join(game.id);
        s.chessGame = game.id;
        s.color = i===0 ? 'w':'b';

        s.emit("chess_start",{
          color:s.color,
          time:l.time,
          players:{
            white:p1.username,
            black:p2.username
          }
        });
      });

      delete lobbies[id];
      update();
    }
  });

  /* MOVE */
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

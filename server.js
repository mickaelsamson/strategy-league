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
let playerGames = {};
let rematchRequests = {};
let pendingDisconnects = {};

function update(){
  io.emit("online_users", onlineUsers);
  io.emit("lobbies_update", lobbies);
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

    if(playerGames[username]){
      const game = chessGames[playerGames[username]];
      if(game){
        const p = game.players.find(x=>x.username===username);

        socket.join(game.id);
        socket.chessGame = game.id;
        socket.color = p.color;

        socket.emit("chess_start",{
          color:p.color,
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
    delete onlineUsers[username];

    const gameId = playerGames[username];
    const game = chessGames[gameId];

    if(game){
      const opponent = game.players.find(p=>p.username!==username);

      if(opponent){
        io.to(opponent.id).emit("opponent_disconnected",{player:username});

        let timeLeft = 60;

        const interval = setInterval(()=>{
          timeLeft--;

          io.to(opponent.id).emit("disconnect_timer",{time:timeLeft});

          if(timeLeft<=0){
            clearInterval(interval);

            io.to(opponent.id).emit("player_left",{winner:opponent.username});

            delete chessGames[gameId];
          }
        },1000);

        pendingDisconnects[username]=interval;
      }
    }

    update();
  });

  /* ================= REMATCH ================= */

  socket.on("rematch", ()=>{

    const username = socket.username;
    const gameId = playerGames[username];

    if(!rematchRequests[gameId]) rematchRequests[gameId]=[];

    if(!rematchRequests[gameId].includes(username)){
      rematchRequests[gameId].push(username);
    }

    let game = chessGames[gameId];

    if(!game){
      const players = Object.keys(playerGames).filter(u=>playerGames[u]===gameId);

      if(players.length===2){
        game = {
          id:gameId,
          players:[
            {id:onlineUsers[players[0]].id, username:players[0], color:'w'},
            {id:onlineUsers[players[1]].id, username:players[1], color:'b'}
          ],
          fen:null,
          turn:'w'
        };
        chessGames[gameId]=game;
      }
    }

    if(rematchRequests[gameId].length===2){

      rematchRequests[gameId]=[];

      /* 🔥 SWAP + FIX SOCKET */
      game.players = game.players.map(p=>{
        const newColor = p.color==='w'?'b':'w';
        const s = io.sockets.sockets.get(p.id);
        if(s) s.color = newColor;

        return {id:p.id, username:p.username, color:newColor};
      });

      game.fen=null;
      game.turn='w';

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
      const opponent = game.players.find(p=>p.username!==username);
      if(opponent){
        io.to(opponent.id).emit("rematch_requested",{from:username});
      }
    }

  });

  /* ================= RESIGN ================= */

  socket.on("resign", ()=>{
    const game = chessGames[playerGames[socket.username]];
    if(!game) return;

    const opponent = game.players.find(p=>p.username!==socket.username);

    game.players.forEach(p=>{
      io.to(p.id).emit("player_left",{winner:opponent.username});
    });

    delete chessGames[game.id];
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

async function startServer(){
  await mongoose.connect(process.env.MONGO_URI);
  http.listen(process.env.PORT||3000);
}

startServer();

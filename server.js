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

/* ================= AUTH ================= */

app.post("/api/signup", async (req,res)=>{
  try{
    const { email, password, username, firstName, lastName } = req.body;

    if(!email || !password || !username){
      return res.status(400).json({error:"Missing required fields"});
    }

    const existingEmail = await User.findOne({email});
    if(existingEmail) return res.status(400).json({error:"Email already used"});

    const existingUsername = await User.findOne({username});
    if(existingUsername) return res.status(400).json({error:"Username taken"});

    const user = new User({
      email,
      password,
      username,
      firstName: firstName || "",
      lastName: lastName || "",
      elo: 1000
    });

    await user.save();

    res.json({success:true});

  }catch(err){
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({error:"Server error"});
  }
});

app.post("/api/login", async (req,res)=>{
  try{
    const { email, password } = req.body;

    if(!email || !password){
      return res.status(400).json({error:"Missing fields"});
    }

    const user = await User.findOne({email, password});
    if(!user) return res.status(400).json({error:"Invalid credentials"});

    res.json({
      username:user.username,
      elo:user.elo || 1000
    });

  }catch(err){
    console.error("LOGIN ERROR:", err);
    res.status(500).json({error:"Server error"});
  }
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

    /* 🔥 RECONNECT GAME */
    const gameId = playerGames[username];
    const game = chessGames[gameId];

    if(game){
      const player = game.players.find(p=>p.username===username);

      socket.join(game.id);
      socket.chessGame = game.id;
      socket.color = player.color;

      socket.emit("chess_start",{
        color: player.color,
        players:{
          white: game.players.find(p=>p.color==='w').username,
          black: game.players.find(p=>p.color==='b').username
        }
      });

      if(game.fen){
        socket.emit("chess_update",{fen:game.fen});
      }
    }

    update();
  });

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

        onlineUsers[pl.username].status="playing";

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

        pendingDisconnects[username]=interval;
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

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

/* ================= AUTH ================= */

app.post('/api/login', async (req,res)=>{
  try{
    let {email, password} = req.body;

    email = email.toLowerCase().trim();

    const user = await User.findOne({email});
    if(!user) return res.status(400).send({error:"User not found"});

    const valid = await bcrypt.compare(password, user.password);
    if(!valid) return res.status(400).send({error:"Wrong password"});

    res.send({
      username:user.username,
      elo:user.elo || 1000
    });

  }catch(err){
    res.status(500).send({error:"Server error"});
  }
});

/* ================= DATA ================= */

let onlineUsers = {};
let lobbies = {};
let chessGames = {};

/* ================= UTILS ================= */

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
      {id:p1.id, username:p1.username, color:'w', time:lobby.time},
      {id:p2.id, username:p2.username, color:'b', time:lobby.time}
    ],
    fen:null,
    turn:'w'
  };

  chessGames[id] = game;
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
      status:"idle",
      avatar:`https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
    };

    update();
  });

  socket.on("disconnect", ()=>{
    delete onlineUsers[socket.username];
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

      l.players.forEach((p,i)=>{
        const s = io.sockets.sockets.get(p.id);

        onlineUsers[p.username].status="playing";

        s.join(game.id);
        s.chessGame = game.id;
        s.color = i===0 ? 'w':'b';

        s.emit("chess_start",{
          color:s.color,
          time:l.time
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

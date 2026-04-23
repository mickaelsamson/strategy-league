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
    res.status(500).send({error:"Server error"});
  }
});

/* ================= CHESS ================= */

let onlineUsers = {};
let lobbies = {};
let chessGames = {};

/* REMOVE EXISTING LOBBY FOR USER */
function removeUserLobby(socket){
  Object.keys(lobbies).forEach(id=>{
    const l = lobbies[id];
    if(l.players.find(p=>p.id===socket.id)){
      delete lobbies[id];
    }
  });
}

/* CREATE LOBBY */
function createLobby(name,time,host){

  removeUserLobby(host);

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

/* CREATE GAME */
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
    turn:'w',
    timer:null
  };

  chessGames[id]=game;
  startTimer(game);

  return game;
}

function startTimer(g){
  if(g.timer) clearInterval(g.timer);

  g.timer=setInterval(()=>{
    const current=g.players.find(p=>p.color===g.turn);
    if(!current) return;

    current.time--;

    io.to(g.id).emit("chess_timer",g.players);

    if(current.time<=0){
      const winner=g.players.find(p=>p.color!==g.turn);
      io.to(g.id).emit("chess_end",{winner:winner.username});
      clearInterval(g.timer);
    }

  },1000);
}

io.on('connection', socket=>{

  socket.on("register_online", username=>{
    socket.username=username;
    onlineUsers[username]=socket.id;
    update();
  });

  socket.on("disconnect", ()=>{
    delete onlineUsers[socket.username];
    removeUserLobby(socket);
    update();
  });

  function update(){
    io.emit("lobbies_update", lobbies);
    io.emit("online_users", Object.keys(onlineUsers));
  }

  socket.on("create_lobby", ({name,time})=>{
    createLobby(name || "Lobby", time, socket);
    update();
  });

  socket.on("join_lobby", id=>{
    const l=lobbies[id];
    if(!l || l.players.length>=2) return;

    l.players.push({
      id:socket.id,
      username:socket.username
    });

    update();

    if(l.players.length===2){

      const game=createGame(l);

      l.players.forEach((p,i)=>{
        const s=io.sockets.sockets.get(p.id);

        s.join(game.id);
        s.chessGame=game.id;
        s.color=i===0?'w':'b';

        s.emit("chess_start",{color:s.color,time:l.time});
      });

      delete lobbies[id];
      update();
    }
  });

  socket.on("invite_player", ({target,lobbyId})=>{
    const id=onlineUsers[target];
    if(id){
      io.to(id).emit("invite_received",{from:socket.username,lobbyId});
    }
  });

  socket.on("chess_move", ({from,to,fen})=>{
    const g=chessGames[socket.chessGame];
    if(!g) return;

    if(socket.color!==g.turn) return;

    g.fen=fen;
    g.turn=g.turn==='w'?'b':'w';

    io.to(g.id).emit("chess_update",{fen:g.fen});
  });

});

/* ================= START ================= */

async function startServer(){
  try{
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Mongo connected");

    http.listen(process.env.PORT||3000, ()=>{
      console.log("Server running");
    });

  }catch(err){
    process.exit(1);
  }
}

startServer();

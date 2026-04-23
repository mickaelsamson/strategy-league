const express = require('express');
const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http); // 🔥 IMPORTANT (doit être ici)

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
      username,
      elo:1000
    });

    res.send({success:true});

  }catch(err){
    console.log("REGISTER ERROR:", err);
    res.status(500).send({error:"Server error"});
  }
});

app.post('/api/login', async (req,res)=>{
  try{
    let {email, password} = req.body;

    if(!email || !password){
      return res.status(400).send({error:"Missing fields"});
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({email});
    if(!user){
      return res.status(400).send({error:"User not found"});
    }

    const valid = await bcrypt.compare(password, user.password);
    if(!valid){
      return res.status(400).send({error:"Wrong password"});
    }

    res.send({
      username: user.username,
      firstName: user.firstName,
      elo: user.elo || 1000
    });

  }catch(err){
    console.log("LOGIN ERROR:", err);
    res.status(500).send({error:"Server error"});
  }
});

/* ================= CHESS ================= */

let onlineUsers = {};
let lobbies = {};
let chessGames = {};

function removeUserLobby(socket){
  Object.keys(lobbies).forEach(id=>{
    const l=lobbies[id];
    if(l.players.find(p=>p.id===socket.id)){
      delete lobbies[id];
    }
  });
}

function createLobby(name,time,host){

  removeUserLobby(host);

  const id=Math.random().toString(36).substr(2,5);

  lobbies[id]={
    id,
    name,
    time,
    players:[{
      id:host.id,
      username:host.username,
      elo:host.elo || 1000,
      ready:false
    }]
  };

  return lobbies[id];
}

function createGame(lobby){

  const [p1,p2]=lobby.players;

  const id=Math.random().toString(36).substr(2,6);

  const game={
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

  socket.on("register_online", async username=>{
    socket.username=username;

    const user=await User.findOne({username});
    socket.elo=user?.elo || 1000;

    onlineUsers[username]={
      id:socket.id,
      elo:socket.elo,
      status:"idle",
      avatar:`https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
    };

    update();
  });

  socket.on("disconnect", ()=>{
    delete onlineUsers[socket.username];
    removeUserLobby(socket);
    update();
  });

  function update(){
    io.emit("lobbies_update", lobbies);
    io.emit("online_users", onlineUsers);
  }

  socket.on("create_lobby", ({name,time})=>{
    createLobby(name || "Lobby", time, socket);
    update();
  });

  socket.on("join_lobby", id=>{
    const l=lobbies[id];
    if(!l || l.players.length>=2) return;

    if(l.players.find(p=>p.id===socket.id)) return;

    l.players.push({
      id:socket.id,
      username:socket.username,
      elo:socket.elo,
      ready:false
    });

    update();
  });

  socket.on("toggle_ready", lobbyId=>{

    const l = lobbies[lobbyId];
    if(!l) return;

    const player = l.players.find(p=>p.id===socket.id);
    if(!player) return;

    player.ready = !player.ready;

    update();

    if(l.players.length === 2 && l.players.every(p=>p.ready)){

      const game = createGame(l);

      l.players.forEach((p,i)=>{
        const s = io.sockets.sockets.get(p.id);
        if(!s) return;

        onlineUsers[p.username].status="playing";

        s.join(game.id);
        s.chessGame=game.id;
        s.color=i===0?'w':'b';

        s.emit("chess_start",{color:s.color,time:l.time});
      });

      delete lobbies[lobbyId];
      update();
    }

  });

  socket.on("invite_player", ({target,lobbyId})=>{
    const targetUser=onlineUsers[target];
    if(targetUser){
      io.to(targetUser.id).emit("invite_received",{
        from:socket.username,
        lobbyId
      });
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
    console.log("MONGO ERROR:", err.message);
    process.exit(1);
  }
}

startServer();

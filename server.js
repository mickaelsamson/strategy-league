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
   CHESS ROOMS SYSTEM
========================= */

let onlineUsers = {};
let chessGames = {};

let rooms = {
  blitz: {name:"Blitz", time:60, players:[]},
  rapid: {name:"Rapid", time:300, players:[]},
  classic: {name:"Classic", time:600, players:[]}
};

function createChessGame(room){

  const [p1, p2] = room.players;

  const id = Math.random().toString(36).substr(2,6);

  const game = {
    id,
    players:[
      {id:p1.id, username:p1.username, color:'w', time:room.time},
      {id:p2.id, username:p2.username, color:'b', time:room.time}
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

  g.timer = setInterval(()=>{

    const current = g.players.find(p=>p.color === g.turn);
    if(!current) return;

    current.time--;

    io.to(g.id).emit("chess_timer", g.players);

    if(current.time <= 0){
      const winner = g.players.find(p=>p.color !== g.turn);
      io.to(g.id).emit("chess_end",{winner:winner.username});
      clearInterval(g.timer);
    }

  },1000);
}

/* =========================
   SOCKET
========================= */

io.on('connection', socket => {

  /* ===== STRATEGY ===== */

  socket.on('create',name=>{
    if(!name) return;

    let id=Math.random().toString(36).substr(2,4).toUpperCase();
    let g=createGame(id);

    g.players.push(name);
    games[id]=g;

    socket.join(id);
    socket.gameId=id;
    socket.playerIndex=0;

    startTimer(g);

    socket.emit('created',id);
    sendState(g);
  });

  socket.on('move',({from,to})=>{
    let g=games[socket.gameId];
    if(!g) return;

    let f=g.territories[from];
    let t=g.territories[to];

    if(!f || !t) return;

    if(f.owner===socket.playerIndex){

      if(f.troops>t.troops){
        t.owner=socket.playerIndex;
        t.troops=f.troops-1;
        f.troops=1;

        io.to(g.id).emit("attack",{to});
      } else {
        f.troops=Math.max(1, f.troops-1);
      }

      if(g.players.length > 0){
        g.turn=(g.turn+1)%g.players.length;
      }

      g.timeLeft=TURN_TIME;

      sendState(g);
    }
  });

  /* ===== CHESS ===== */

  socket.on("register_online", username=>{
    socket.username = username;
    onlineUsers[username] = socket.id;
    io.emit("online_users", Object.keys(onlineUsers));
    updateRooms();
  });

  socket.on("disconnect", ()=>{
    delete onlineUsers[socket.username];

    Object.values(rooms).forEach(r=>{
      r.players = r.players.filter(p=>p.id !== socket.id);
    });

    io.emit("online_users", Object.keys(onlineUsers));
    updateRooms();
  });

  function updateRooms(){
    io.emit("rooms_update", rooms);
  }

  socket.on("join_room", roomKey=>{

    const room = rooms[roomKey];
    if(!room) return;

    if(room.players.length >= 2) return;

    Object.values(rooms).forEach(r=>{
      r.players = r.players.filter(p=>p.id !== socket.id);
    });

    room.players.push({
      id: socket.id,
      username: socket.username
    });

    socket.roomKey = roomKey;

    updateRooms();

    if(room.players.length === 2){

      const game = createChessGame(room);

      room.players.forEach((p,i)=>{
        const s = io.sockets.sockets.get(p.id);

        s.join(game.id);
        s.chessGame = game.id;
        s.color = i===0?'w':'b';

        s.emit("chess_start",{
          color:s.color,
          time:room.time
        });
      });

      room.players = [];
      updateRooms();
    }
  });

  socket.on("leave_room", ()=>{
    Object.values(rooms).forEach(r=>{
      r.players = r.players.filter(p=>p.id !== socket.id);
    });
    updateRooms();
  });

  socket.on("chess_move", ({from,to,fen})=>{
    const g = chessGames[socket.chessGame];
    if(!g) return;

    if(socket.color !== g.turn) return;

    g.fen = fen;
    g.turn = g.turn === 'w' ? 'b':'w';

    io.to(g.id).emit("chess_update",{fen:g.fen});
  });

  socket.on("chess_rematch", ()=>{
    const g = chessGames[socket.chessGame];
    if(!g) return;

    const players = g.players.map(p=>io.sockets.sockets.get(p.id));

    const room = {time:300, players:players};

    const game = createChessGame(room);

    players.forEach((p,i)=>{
      p.join(game.id);
      p.chessGame = game.id;
      p.color = i===0?'w':'b';

      p.emit("chess_start",{color:p.color});
    });
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

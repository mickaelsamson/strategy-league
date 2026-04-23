const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('./models/User');

app.use(express.json());
app.use(express.static('public'));

/* ===== ROUTE ROOT (FIX CLEAN) ===== */
app.get('/', (req,res)=>{
  res.sendFile('index.html', { root: 'public' });
});

/* ===== AUTH ===== */

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

app.post('/api/login', async (req,res)=>{
  try{
    let {email, password} = req.body;

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
      xp: user.xp
    });

  }catch(err){
    console.log(err);
    res.status(500).send({error:"Server error"});
  }
});

/* LEADERBOARD */
app.get('/api/stats', async (req,res)=>{
  try{
    const users = await User.find().sort({xp:-1});
    res.send(users);
  }catch(err){
    res.status(500).send([]);
  }
});

/* ===== GAME ===== */

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

/* TIMER */
function startTimer(g){
  if(g.timer) clearInterval(g.timer);

  g.timer=setInterval(()=>{
    g.timeLeft--;

    io.to(g.id).emit("timer",g.timeLeft);

    if(g.timeLeft<=0){
      if(g.players.length > 0){ // 🔧 SAFE FIX
        g.turn=(g.turn+1)%g.players.length;
      }
      g.timeLeft=TURN_TIME;
    }
  },1000);
}

/* SEND STATE CLEAN */
function sendState(g){
  io.to(g.id).emit('state', {
    players: g.players,
    turn: g.turn,
    timeLeft: g.timeLeft,
    territories: g.territories
  });
}

/* SOCKET */
io.on('connection',socket=>{

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

      if(g.players.length > 0){ // 🔧 SAFE FIX
        g.turn=(g.turn+1)%g.players.length;
      }

      g.timeLeft=TURN_TIME;

      sendState(g);
    }
  });

});

/* START SERVER AFTER MONGO */
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


/* ===== CHESS MATCHMAKING ===== */

let lobby = [];
let chessGames = {};

function createChessGame(p1, p2){

  const id = Math.random().toString(36).substr(2,6);

  const game = {
    id,
    players: [
      {id:p1.id, color:'w', time:300},
      {id:p2.id, color:'b', time:300}
    ],
    fen: null,
    turn:'w',
    timer:null
  };

  chessGames[id] = game;

  startChessTimer(game);

  return game;
}

/* TIMER */
function startChessTimer(g){

  if(g.timer) clearInterval(g.timer);

  g.timer = setInterval(()=>{

    const current = g.players.find(p=>p.color === g.turn);
    if(!current) return;

    current.time--;

    io.to(g.id).emit("chess_timer", g.players);

    if(current.time <= 0){
      io.to(g.id).emit("chess_end", {winner: g.turn === 'w' ? 'Black' : 'White'});
      clearInterval(g.timer);
    }

  },1000);
}

/* SOCKET */
io.on('connection', socket => {

  socket.on("chess_lobby_join", name=>{
    socket.name = name;
    socket.ready = false;

    lobby.push(socket);

    updateLobby();
  });

  socket.on("chess_ready", ()=>{
    socket.ready = !socket.ready;

    updateLobby();
    tryMatch();
  });

  function updateLobby(){
    io.emit("chess_lobby", lobby.map(s=>({
      name:s.name,
      ready:s.ready
    })));
  }

  function tryMatch(){

    const readyPlayers = lobby.filter(s=>s.ready);

    if(readyPlayers.length >= 2){

      const p1 = readyPlayers[0];
      const p2 = readyPlayers[1];

      lobby = lobby.filter(s=>s!==p1 && s!==p2);

      const game = createChessGame(p1, p2);

      [p1,p2].forEach((p,i)=>{
        p.join(game.id);
        p.chessGame = game.id;
        p.color = i===0 ? 'w':'b';

        p.emit("chess_start", {
          color: p.color,
          gameId: game.id
        });
      });

      updateLobby();
    }
  }

  socket.on("chess_move", ({from,to,fen})=>{

    const g = chessGames[socket.chessGame];
    if(!g) return;

    if(socket.color !== g.turn) return;

    g.fen = fen;
    g.turn = g.turn === 'w' ? 'b' : 'w';

    io.to(g.id).emit("chess_update", {
      fen:g.fen,
      turn:g.turn
    });
  });

  socket.on("disconnect", ()=>{
    lobby = lobby.filter(s=>s!==socket);
  });

});

startServer();

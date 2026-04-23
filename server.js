const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');

const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("Mongo connected"))
.catch(err=>console.log(err));

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req,res)=>{
  res.sendFile(__dirname + '/public/game.html');
});

let games = {};
const TURN_TIME = 30;

/* GAME INIT */
function createGame(id){
  return {
    id,
    players:[],
    turn:0,
    timeLeft:TURN_TIME,
    territories:Array(12).fill().map((_,i)=>({
      owner:0,
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
      g.turn=(g.turn+1)%g.players.length;
      g.timeLeft=TURN_TIME;
      io.to(g.id).emit("turnChanged",g.turn);
    }
  },1000);
}

/* SAFE STATE */
function sendState(g){
  io.to(g.id).emit('state', {
    players: g.players,
    turn: g.turn,
    timeLeft: g.timeLeft,
    territories: g.territories
  });
}

/* ===== LOGIN ===== */
app.post('/api/login', async (req,res)=>{
  const username = req.body.username?.trim();

  if(!username){
    return res.status(400).send({error:"Username required"});
  }

  let user = await User.findOne({username});

  if(!user){
    user = await User.create({username});
    console.log("New user:", username);
  }

  res.send(user);
});

/* XP */
app.post('/api/xp', async (req,res)=>{
  let user = await User.findOne({username:req.body.username});
  if(!user) return;

  user.xp += req.body.xp;
  await user.save();

  res.send(user);
});

/* LEADERBOARD */
app.get('/api/stats', async (req,res)=>{
  let users = await User.find().sort({xp:-1});
  res.send(users);
});

/* ===== SOCKET GAME ===== */
io.on('connection',socket=>{

  socket.on('create',name=>{
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

  socket.on('join',({id,name})=>{
    let g=games[id]; 
    if(!g) return;

    socket.join(id);
    socket.gameId=id;
    socket.playerIndex=g.players.length;

    g.players.push(name);

    sendState(g);
  });

  socket.on('move',({from,to})=>{
    let g=games[socket.gameId]; 
    if(!g) return;

    let f=g.territories[from];
    let t=g.territories[to];

    if(f.owner===socket.playerIndex){

      if(f.troops>t.troops){
        t.owner=socket.playerIndex;
        t.troops=f.troops-1;
        f.troops=1;

        io.to(g.id).emit("attack",{to});
      } else {
        f.troops--;
      }

      g.turn=(g.turn+1)%g.players.length;
      g.timeLeft=TURN_TIME;

      sendState(g);
    }
  });

});

http.listen(process.env.PORT||3000, ()=>{
  console.log("Server running");
});

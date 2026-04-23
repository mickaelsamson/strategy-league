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
  res.sendFile(__dirname + '/public/index.html');
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

/* ===== AUTH ===== */

/* REGISTER */
app.post('/api/register', async (req,res)=>{
  try{
    const {username, password} = req.body;

    if(!username || !password){
      return res.status(400).send({error:"Missing fields"});
    }

    const existing = await User.findOne({username});
    if(existing){
      return res.status(400).send({error:"User exists"});
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      username,
      password: hashed
    });

    res.send({success:true});

  }catch(err){
    console.log(err);
    res.status(500).send({error:"Server error"});
  }
});

/* LOGIN */
app.post('/api/login', async (req,res)=>{
  try{
    const {username, password} = req.body;

    const user = await User.findOne({username});
    if(!user){
      return res.status(400).send({error:"User not found"});
    }

    const valid = await bcrypt.compare(password, user.password);
    if(!valid){
      return res.status(400).send({error:"Wrong password"});
    }

    res.send({username:user.username, xp:user.xp});

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

/* ===== SOCKET ===== */
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

      g.turn=(g.turn+1)%g.players.length;
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

startServer();

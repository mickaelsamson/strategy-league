const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');

app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("Mongo connected"))
.catch(err=>console.error(err));

const User = require('./models/User');

function createGame(id){
  return {
    id,
    players:[],
    turn:0,
    territories:Array(9).fill().map((_,i)=>({
      owner:i%2,
      troops:2
    }))
  };
}

let games = {};

io.on('connection', socket=>{
  socket.on('create', name=>{
    let id = Math.random().toString(36).substr(2,4).toUpperCase();
    let g = createGame(id);

    g.players.push(name);
    games[id]=g;

    socket.join(id);
    socket.gameId=id;
    socket.playerIndex=0;

    socket.emit('created', id);
  });

  socket.on('join', ({id,name})=>{
    let g = games[id];
    if(!g) return;

    socket.join(id);
    socket.gameId=id;
    socket.playerIndex=g.players.length;

    g.players.push(name);

    io.to(id).emit('state', g);
  });

  socket.on('move', ({from,to})=>{
    let g = games[socket.gameId];
    if(!g) return;

    let f=g.territories[from];
    let t=g.territories[to];

    if(f.owner===socket.playerIndex){
      if(f.troops > t.troops){
        t.owner = socket.playerIndex;
        t.troops = f.troops - 1;
        f.troops = 1;
      } else {
        f.troops -=1;
      }

      g.turn = (g.turn+1)%g.players.length;
      io.to(g.id).emit('state', g);
    }
  });
});

app.post('/api/login', async (req,res)=>{
  let u = await User.findOne({username:req.body.username});
  if(!u) u = await User.create({username:req.body.username});
  res.send(u);
});

app.get('/api/stats', async (req,res)=>{
  res.send(await User.find({}).sort({rank:-1}));
});

http.listen(process.env.PORT||3000);

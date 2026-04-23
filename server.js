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
    res.status(500).send({error:"Server error"});
  }
});

/* ===== ELO SYSTEM ===== */

async function updateElo(winner, loser){

  const K = 20;

  const w = await User.findOne({username:winner});
  const l = await User.findOne({username:loser});

  if(!w || !l) return;

  const expectedW = 1 / (1 + Math.pow(10,(l.xp - w.xp)/400));
  const expectedL = 1 / (1 + Math.pow(10,(w.xp - l.xp)/400));

  w.xp = Math.round(w.xp + K*(1-expectedW));
  l.xp = Math.round(l.xp + K*(0-expectedL));

  await w.save();
  await l.save();
}

/* ===== CHESS ===== */

let lobby = [];
let chessGames = {};
let onlineUsers = {};

function createChessGame(p1, p2){

  const id = Math.random().toString(36).substr(2,6);

  const game = {
    id,
    players:[
      {id:p1.id, username:p1.username, color:'w', time:300},
      {id:p2.id, username:p2.username, color:'b', time:300}
    ],
    fen:null,
    turn:'w',
    timer:null
  };

  chessGames[id] = game;
  startTimer(game);

  return game;
}

function startTimer(g){

  if(g.timer) clearInterval(g.timer);

  g.timer = setInterval(()=>{

    const current = g.players.find(p=>p.color === g.turn);
    if(!current) return;

    current.time--;

    io.to(g.id).emit("chess_timer", g.players);

    if(current.time <= 0){

      const winner = g.players.find(p=>p.color !== g.turn);

      io.to(g.id).emit("chess_end",{winner:winner.username});

      updateElo(winner.username, current.username);

      clearInterval(g.timer);
    }

  },1000);
}

/* ===== SOCKET ===== */

io.on('connection', socket => {

  /* ONLINE */
  socket.on("register_online", username=>{
    socket.username = username;
    onlineUsers[username] = socket.id;
    io.emit("online_users", Object.keys(onlineUsers));
  });

  socket.on("disconnect", ()=>{
    delete onlineUsers[socket.username];
    lobby = lobby.filter(s=>s!==socket);
    io.emit("online_users", Object.keys(onlineUsers));
  });

  /* INVITES */
  socket.on("invite_player", target=>{
    const id = onlineUsers[target];
    if(id){
      io.to(id).emit("invite_received", socket.username);
    }
  });

  socket.on("accept_invite", opponent=>{
    const s2Id = onlineUsers[opponent];
    const s2 = io.sockets.sockets.get(s2Id);
    if(!s2) return;

    const game = createChessGame(socket, s2);

    [socket, s2].forEach((p,i)=>{
      p.join(game.id);
      p.chessGame = game.id;
      p.color = i===0?'w':'b';

      p.emit("chess_start",{color:p.color});
    });
  });

  /* MATCHMAKING */
  socket.on("chess_lobby_join", ()=>{
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
      name:s.username,
      ready:s.ready
    })));
  }

  function tryMatch(){

    const ready = lobby.filter(s=>s.ready);

    if(ready.length >= 2){

      const p1 = ready[0];
      const p2 = ready[1];

      lobby = lobby.filter(s=>s!==p1 && s!==p2);

      const game = createChessGame(p1,p2);

      [p1,p2].forEach((p,i)=>{
        p.join(game.id);
        p.chessGame = game.id;
        p.color = i===0?'w':'b';

        p.emit("chess_start",{color:p.color});
      });

      updateLobby();
    }
  }

  /* MOVE */
  socket.on("chess_move", ({from,to,fen})=>{
    const g = chessGames[socket.chessGame];
    if(!g) return;

    if(socket.color !== g.turn) return;

    g.fen = fen;
    g.turn = g.turn === 'w' ? 'b':'w';

    io.to(g.id).emit("chess_update",{fen:g.fen, turn:g.turn});
  });

  /* REMATCH */
  socket.on("chess_rematch", ()=>{
    const g = chessGames[socket.chessGame];
    if(!g) return;

    const players = g.players.map(p=>io.sockets.sockets.get(p.id));

    if(players.length === 2){
      const newGame = createChessGame(players[0], players[1]);

      players.forEach((p,i)=>{
        p.join(newGame.id);
        p.chessGame = newGame.id;
        p.color = i===0?'w':'b';

        p.emit("chess_start",{color:p.color});
      });
    }
  });

});

mongoose.connect(process.env.MONGO_URI).then(()=>{
  http.listen(process.env.PORT||3000);
});

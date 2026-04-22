const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let games = {};
let globalScores = {};

function createGame(id){
  return {
    id,
    players: [],
    scores: {},
    currentPlayer: 1,
    continents: {
      A: [0,1,5,6],
      B: [18,19,23,24]
    },
    cells: Array(25).fill().map(()=>({
      owner: Math.random()>0.5?1:2,
      troops: Math.floor(Math.random()*3)+1
    }))
  };
}

function code(){
  return Math.random().toString(36).substr(2,4).toUpperCase();
}

function roll(n){
  let r=[];
  for(let i=0;i<n;i++) r.push(Math.floor(Math.random()*6)+1);
  return r.sort((a,b)=>b-a);
}

io.on('connection', socket => {

  socket.on('createGame', ({name})=>{
    let id = code();
    games[id] = createGame(id);
    joinGame(socket, id, name);
  });

  socket.on('joinGame', ({id,name})=>{
    if(!games[id]) return;
    joinGame(socket, id, name);
  });

  function joinGame(socket, id, name){
    socket.join(id);
    socket.gameId = id;
    socket.playerName = name || "Spectator";

    if(name){
      games[id].players.push(name);
      games[id].scores[name] = 0;
      if(!globalScores[name]) globalScores[name]=0;
    }

    socket.emit('state', games[id]);
    io.emit('global', globalScores);
  }

  socket.on('move', ({from,to})=>{
    let g = games[socket.gameId];
    if(!g) return;

    let f = g.cells[from];
    let t = g.cells[to];

    let attack = roll(Math.min(3, f.troops));
    let defend = roll(Math.min(2, t.troops));

    let rounds = Math.min(attack.length, defend.length);

    for(let i=0;i<rounds;i++){
      if(attack[i] > defend[i]) t.troops--;
      else f.troops--;
    }

    if(t.troops <= 0){
      t.owner = f.owner;
      t.troops = attack.length;
      f.troops -= attack.length;

      if(socket.playerName){
        g.scores[socket.playerName] += 3;
        globalScores[socket.playerName] += 3;
      }
    }

    for(let key in g.continents){
      if(g.continents[key].every(i=>g.cells[i].owner==g.currentPlayer)){
        g.cells.forEach(c=>{
          if(c.owner==g.currentPlayer) c.troops++;
        });
      }
    }

    g.currentPlayer = g.currentPlayer===1?2:1;

    io.to(socket.gameId).emit('state', g);
    io.emit('global', globalScores);
  });

});

http.listen(3000);

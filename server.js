/* ===== CHESS SYSTEM V2 ===== */

let onlineUsers = {};
let chessGames = {};

function createChessGame(p1, p2, time){

  const id = Math.random().toString(36).substr(2,6);

  const game = {
    id,
    players:[
      {id:p1.id, username:p1.username, color:'w', time},
      {id:p2.id, username:p2.username, color:'b', time}
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
      clearInterval(g.timer);
    }

  },1000);
}

io.on('connection', socket => {

  /* REGISTER ONLINE */
  socket.on("register_online", username=>{
    socket.username = username;
    onlineUsers[username] = socket.id;
    io.emit("online_users", Object.keys(onlineUsers));
  });

  socket.on("disconnect", ()=>{
    delete onlineUsers[socket.username];
    io.emit("online_users", Object.keys(onlineUsers));
  });

  /* INVITE WITH TIME */
  socket.on("invite_player", ({target, time})=>{
    const id = onlineUsers[target];
    if(id){
      io.to(id).emit("invite_received", {
        from: socket.username,
        time
      });
    }
  });

  socket.on("accept_invite", ({opponent, time})=>{
    const s2Id = onlineUsers[opponent];
    const s2 = io.sockets.sockets.get(s2Id);
    if(!s2) return;

    const game = createChessGame(socket, s2, time);

    [socket, s2].forEach((p,i)=>{
      p.join(game.id);
      p.chessGame = game.id;
      p.color = i===0?'w':'b';

      p.emit("chess_start",{
        color:p.color,
        time
      });
    });
  });

  /* MOVE */
  socket.on("chess_move", ({from,to,fen})=>{
    const g = chessGames[socket.chessGame];
    if(!g) return;

    if(socket.color !== g.turn) return;

    g.fen = fen;
    g.turn = g.turn === 'w' ? 'b':'w';

    io.to(g.id).emit("chess_update",{fen:g.fen});
  });

  /* REMATCH */
  socket.on("chess_rematch", ()=>{
    const g = chessGames[socket.chessGame];
    if(!g) return;

    const players = g.players.map(p=>io.sockets.sockets.get(p.id));

    const game = createChessGame(players[0], players[1], 300);

    players.forEach((p,i)=>{
      p.join(game.id);
      p.chessGame = game.id;
      p.color = i===0?'w':'b';

      p.emit("chess_start",{color:p.color});
    });
  });

});

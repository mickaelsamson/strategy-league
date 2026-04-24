const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const mongoose = require('mongoose');
const User = require('./models/User');

app.use(express.json());
app.use(express.static('public'));

/* ================= AUTH ================= */

app.post("/api/signup", async (req,res)=>{
  try{
    const { username, email, password } = req.body;

    const exists = await User.findOne({ email });
    if(exists){
      return res.status(400).json({ error: "User already exists" });
    }

    const user = new User({
      username,
      email,
      password,
      elo: 1000,
      xp: 0,
      isAdmin: false
    });

    await user.save();
    res.json({ success: true });

  }catch(err){
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req,res)=>{
  try{
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if(!user || user.password !== password){
      return res.status(400).json({ error: "Invalid credentials" });
    }

    res.json({
      username: user.username,
      email: user.email,
      elo: user.elo,
      xp: user.xp,
      isAdmin: user.isAdmin
    });

  }catch(err){
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/', (req,res)=>{
  res.sendFile('index.html', { root: 'public' });
});

/* ================= ADMIN ================= */

let manualOverride = null;

function isGameAllowed(){
  if(manualOverride !== null) return manualOverride;
  return true;
}

app.get("/api/games/status", (req,res)=>{
  res.json({ enabled: isGameAllowed() });
});

/* ================= DATA ================= */

let onlineUsers = {};
let lobbies = {};
let chessGames = {};
let othelloLobbies = {};
let othelloGames = {};
let playerGames = {};
let othelloPlayerGames = {};
let rematchRequests = {};
let pendingDisconnects = {};
const CHESS_TIME_CONTROLS = [120, 300, 600, 1800];
const DISCONNECT_FORFEIT_MS = 60 * 1000;

function findGameIdForSocket(socket){
  let gameId = playerGames[socket.id];
  if(gameId) return gameId;

  if(!socket.username) return null;

  gameId = Object.keys(chessGames).find(id =>
    chessGames[id]?.players?.some(p=>p.username === socket.username)
  );

  if(gameId){
    playerGames[socket.id] = gameId;
  }

  return gameId || null;
}

function clearPendingDisconnectForUsername(username){
  if(!username || !pendingDisconnects[username]) return;
  clearTimeout(pendingDisconnects[username]);
  delete pendingDisconnects[username];
}


function findOthelloGameIdForSocket(socket){
  let gameId = othelloPlayerGames[socket.id];
  if(gameId) return gameId;

  if(!socket.username) return null;

  gameId = Object.keys(othelloGames).find(id =>
    othelloGames[id]?.players?.some(p=>p.username === socket.username)
  );

  if(gameId){
    othelloPlayerGames[socket.id] = gameId;
  }

  return gameId || null;
}

function createInitialOthelloBoard(){
  const board = Array.from({ length: 8 }, ()=>Array(8).fill(null));
  board[3][3] = "white";
  board[3][4] = "black";
  board[4][3] = "black";
  board[4][4] = "white";
  return board;
}

function getOpponentColor(color){
  return color === "black" ? "white" : "black";
}

function isInsideBoard(x, y){
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

function collectFlips(board, x, y, color){
  if(!isInsideBoard(x, y) || board[y][x]) return [];

  const enemy = getOpponentColor(color);
  const dirs = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  const flips = [];

  dirs.forEach(([dx, dy])=>{
    let cx = x + dx;
    let cy = y + dy;
    const line = [];

    while(isInsideBoard(cx, cy) && board[cy][cx] === enemy){
      line.push([cx, cy]);
      cx += dx;
      cy += dy;
    }

    if(line.length > 0 && isInsideBoard(cx, cy) && board[cy][cx] === color){
      flips.push(...line);
    }
  });

  return flips;
}

function hasAnyValidOthelloMove(board, color){
  for(let y = 0; y < 8; y++){
    for(let x = 0; x < 8; x++){
      if(collectFlips(board, x, y, color).length > 0){
        return true;
      }
    }
  }

  return false;
}

function countOthelloDisks(board){
  let black = 0;
  let white = 0;

  board.forEach(row=>{
    row.forEach(cell=>{
      if(cell === "black") black += 1;
      if(cell === "white") white += 1;
    });
  });

  return { black, white };
}

function emitOthelloState(game){
  if(!game) return;

  game.players.forEach(player=>{
    othelloPlayerGames[player.id] = game.id;

    const s = io.sockets.sockets.get(player.id);
    if(!s) return;

    s.emit("othello_state", {
      board: game.board,
      turn: game.turn,
      color: player.color
    });
  });
}

async function applyOthelloResult(game, winnerColor){
  if(!game || game.rated) return;

  const blackPlayer = game.players.find(p=>p.color === "black");
  const whitePlayer = game.players.find(p=>p.color === "white");
  if(!blackPlayer || !whitePlayer) return;

  const [blackUser, whiteUser] = await Promise.all([
    User.findOne({ username: blackPlayer.username }),
    User.findOne({ username: whitePlayer.username })
  ]);

  if(!blackUser || !whiteUser) return;

  if(!winnerColor){
    blackUser.othelloPoints = (blackUser.othelloPoints || 0) + 4;
    whiteUser.othelloPoints = (whiteUser.othelloPoints || 0) + 4;
    blackUser.xp += 2;
    whiteUser.xp += 2;
  }else if(winnerColor === "black"){
    blackUser.othelloPoints = (blackUser.othelloPoints || 0) + 12;
    whiteUser.othelloPoints = (whiteUser.othelloPoints || 0) + 3;
    blackUser.xp += 10;
    whiteUser.xp += 2;
  }else{
    whiteUser.othelloPoints = (whiteUser.othelloPoints || 0) + 12;
    blackUser.othelloPoints = (blackUser.othelloPoints || 0) + 3;
    whiteUser.xp += 10;
    blackUser.xp += 2;
  }

  await Promise.all([blackUser.save(), whiteUser.save()]);

  game.rated = true;
}


/* ================= UTILS ================= */

async function update(){

  const users = {};

  for(const id in onlineUsers){
    const username = onlineUsers[id];
    const user = await User.findOne({username});

    users[username] = {
      elo: user?.elo || 1000
    };
  }

  io.emit("online_users", users);
  io.emit("lobbies_update", lobbies);
  io.emit("othello_lobbies_update", othelloLobbies);
}
function computeEloDelta(winnerElo, loserElo, kFactor = 32){
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  return Math.max(8, Math.round(kFactor * (1 - expectedWinner)));
}
function pushHistoryEntry(user, entry){
  if(!Array.isArray(user.matchHistory)){
    user.matchHistory = [];
  }

  user.matchHistory.unshift(entry);
  user.matchHistory = user.matchHistory.slice(0, 20);
}
async function applyRankedResult(game, winnerUsername, reason = "game_end"){
  if(!game || game.rated) return;
  if(!Array.isArray(game.players) || game.players.length < 2) return;

  if(!winnerUsername){
    const [userA, userB] = await Promise.all([
      User.findOne({ username: game.players[0].username }),
      User.findOne({ username: game.players[1].username })
    ]);

    if(!userA || !userB) return;

    userA.draws = (userA.draws || 0) + 1;
    userB.draws = (userB.draws || 0) + 1;

    pushHistoryEntry(userA, {
      result: "draw",
      opponent: userB.username,
      xpChange: 5,
      reason
    });
    pushHistoryEntry(userB, {
      result: "draw",
      opponent: userA.username,
      xpChange: 5,
      reason
    });

    userA.xp += 5;
    userB.xp += 5;

    await Promise.all([userA.save(), userB.save()]);

    game.rated = true;
    game.result = {
      winner: null,
      loser: null,
      reason,
      eloDelta: 0
    };
    return;
  }

  const loser = game.players.find(p => p.username !== winnerUsername);
  if(!loser) return;

  const [winnerUser, loserUser] = await Promise.all([
    User.findOne({ username: winnerUsername }),
    User.findOne({ username: loser.username })
  ]);

  if(!winnerUser || !loserUser) return;

  const eloDelta = computeEloDelta(winnerUser.elo, loserUser.elo);

  winnerUser.elo += eloDelta;
  loserUser.elo = Math.max(100, loserUser.elo - eloDelta);

  winnerUser.xp += 25;
  loserUser.xp += 5;
  winnerUser.wins = (winnerUser.wins || 0) + 1;
  loserUser.losses = (loserUser.losses || 0) + 1;

  pushHistoryEntry(winnerUser, {
    result: "win",
    opponent: loserUser.username,
    xpChange: 25,
    reason
  });
  pushHistoryEntry(loserUser, {
    result: "loss",
    opponent: winnerUser.username,
    xpChange: 5,
    reason
  });

  await Promise.all([winnerUser.save(), loserUser.save()]);

  game.rated = true;
  game.result = {
    winner: winnerUsername,
    loser: loser.username,
    reason,
    eloDelta
  };
}

async function getLeaderboard(type){
  if(type === "strategy"){
    return User.find({}, { username: 1, strategyPoints: 1, _id: 0 })
      .sort({ strategyPoints: -1, username: 1 })
      .lean();
  }

  if(type === "chess"){
    return User.find({}, { username: 1, elo: 1, _id: 0 })
      .sort({ elo: -1, username: 1 })
      .lean();
  }

    if(type === "othello"){
    return User.find({}, { username: 1, othelloPoints: 1, _id: 0 })
      .sort({ othelloPoints: -1, username: 1 })
      .lean();
  }

  
  return User.find({}, { username: 1, xp: 1, _id: 0 })
    .sort({ xp: -1, username: 1 })
    .lean();
}

app.get("/api/leaderboard/:type/:username", async (req,res)=>{
  try{
    const { type, username } = req.params;
    const users = await getLeaderboard(type);

    const valueKey = type === "chess" ? "elo" : (type === "strategy" ? "strategyPoints" : (type === "othello" ? "othelloPoints" : "xp"));
    
    const list = users.map((u, index) => ({
      username: u.username,
      value: u[valueKey] || 0,
      rank: index + 1
    }));

    const me = list.find(u => u.username === username) || null;
    const top = list.slice(0,10).map(({ username: u, value }) => ({ username: u, value }));

    res.json({ top, me: me ? { rank: me.rank, value: me.value } : null });
  }catch(err){
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Leaderboard unavailable" });
  }
});
app.get("/api/profile/:username", async (req,res)=>{
  try{
    const { username } = req.params;
    const user = await User.findOne({ username }).lean();

    if(!user){
      return res.status(404).json({ error: "User not found" });
    }

    const wins = user.wins || 0;
    const losses = user.losses || 0;
    const draws = user.draws || 0;
    const total = wins + losses + draws;
    const winrate = total ? Math.round((wins / total) * 100) : 0;

    res.json({
      username: user.username,
      elo: user.elo || 1000,
      xp: user.xp || 0,
      level: Math.floor((user.xp || 0) / 100) + 1,
      stats: {
        wins,
        losses,
        draws,
        total,
        winrate
      },
      matchHistory: (user.matchHistory || []).slice(0, 10)
    });
  }catch(err){
    console.error("Profile error:", err);
    res.status(500).json({ error: "Profile unavailable" });
  }
});

/* ================= SOCKET ================= */

io.on("connection", socket => {

function emitGameStart(game){
    game.players.forEach(player=>{
      playerGames[player.id] = game.id;
      const s = io.sockets.sockets.get(player.id);
      if(!s) return;

      s.emit("chess_start",{
        color: player.color,
        fen: game.fen,
        timeControl: game.timeControl,
        players:{
          white: game.players.find(pl=>pl.color==="w").username,
          black: game.players.find(pl=>pl.color==="b").username
        }
      });
    });
  }

  function emitGameOver(gameId, payload){
    const game = chessGames[gameId];
    if(!game || game.ended) return;

    game.ended = true;
    rematchRequests[gameId] = {};

    game.players.forEach(player=>{
      const s = io.sockets.sockets.get(player.id);
      if(s){
        s.emit("chess_game_over", payload);
      }
    });
  }
  
  socket.on("register_online", username=>{
    socket.username = username;
    clearPendingDisconnectForUsername(username);
    onlineUsers[socket.id] = username;
    
    for(const gameId in chessGames){
      const game = chessGames[gameId];
      if(!game || game.ended) continue;

      const player = game.players.find(p=>p.username === username);
      if(!player) continue;

      const previousSocketId = player.id;
      player.id = socket.id;

      if(previousSocketId && previousSocketId !== socket.id){
        delete playerGames[previousSocketId];
      }

      playerGames[socket.id] = gameId;

      socket.emit("chess_start",{
        color: player.color,
        fen: game.fen,
        timeControl: game.timeControl,
        players:{
          white: game.players.find(pl=>pl.color==="w").username,
          black: game.players.find(pl=>pl.color==="b").username
        }
      });
    }

    for(const gameId in othelloGames){
      const game = othelloGames[gameId];
      if(!game || game.ended) continue;

      const player = game.players.find(p=>p.username === username);
      if(!player) continue;

      const previousSocketId = player.id;
      player.id = socket.id;

      if(previousSocketId && previousSocketId !== socket.id){
        delete othelloPlayerGames[previousSocketId];
      }

      othelloPlayerGames[socket.id] = gameId;
      emitOthelloState(game);
    }

    
    update();
  });

  /* ===== CREATE LOBBY ===== */
  socket.on("create_lobby", ({name,time})=>{

    const parsedTime = Number(time);
    if(!CHESS_TIME_CONTROLS.includes(parsedTime)) return;
    
    const existing = Object.values(lobbies).find(l =>
      l.players.some(p=>p.username === socket.username)
    );
    if(existing) return;

    const id = Math.random().toString(36).substr(2,9);

    lobbies[id] = {
      id,
      name,
      time: parsedTime,
      players:[
        {
          id:socket.id,
          username:socket.username,
          ready:false
        }
      ]
    };

    update();
  });

  /* ===== JOIN ===== */
  socket.on("join_lobby", id=>{

    const lobby = lobbies[id];
    if(!lobby) return;

    const existing = Object.values(lobbies).find(l =>
      l.players.some(p=>p.username === socket.username)
    );
    if(existing) return;

    lobby.players.push({
      id:socket.id,
      username:socket.username,
      ready:false
    });

    update();
  });

  /* ===== READY ===== */
  socket.on("toggle_ready", id=>{

    const lobby = lobbies[id];
    if(!lobby) return;

    const player = lobby.players.find(p=>p.id === socket.id);
    if(!player) return;

    player.ready = !player.ready;

    if(lobby.players.length === 2 && lobby.players.every(p=>p.ready)){

      const gameId = Math.random().toString(36).substr(2,9);

      // 🔥 FIX 1 : structure propre joueurs + couleurs
      const p1 = lobby.players[0];
      const p2 = lobby.players[1];

      chessGames[gameId] = {
        id:gameId,
        players:[
          { id:p1.id, username:p1.username, color:"w" },
          { id:p2.id, username:p2.username, color:"b" }
        ],
        turn:"w",
        fen:null,
        ended:false,
        rated:false,
        timeControl: lobby.time
      };

      emitGameStart(chessGames[gameId]);

      delete lobbies[id];
    }

    update();
  });

  /* ===== MOVE ===== */
  socket.on("chess_move", ({fen})=>{
    
    const gameId = findGameIdForSocket(socket);

    if(!gameId) return;

    const game = chessGames[gameId];
    if(!game || game.ended) return;  
    game.fen = fen;

    game.players.forEach(p=>{
      const s = io.sockets.sockets.get(p.id);
      if(s){
        s.emit("chess_update",{fen});
      }
    });

  });

  /* ===== RESIGN ===== */
  socket.on("resign", ()=>{
    const gameId = findGameIdForSocket(socket);
    if(!gameId) return;

    const game = chessGames[gameId];
    if(!game || game.ended) return;

    const quitter = game.players.find(p=>p.id === socket.id || p.username === socket.username);
    const winner = game.players.find(p=>p.username !== quitter?.username);

    applyRankedResult(game, winner?.username, "resign")
      .catch(err=>console.error("ELO update error:", err))
      .finally(()=>{
        emitGameOver(gameId, {
          reason: "resign",
          message: quitter ? `${quitter.username} abandoned the game.` : "A player abandoned the game.",
          winner: winner?.username || null
        });
      });
  });

  socket.on("chess_game_end", ({ winner, reason } = {})=>{
    const gameId = findGameIdForSocket(socket);
    if(!gameId) return;

    const game = chessGames[gameId];
    if(!game || game.ended) return;

    const inGame = game.players.some(p => p.username === socket.username);
    if(!inGame) return;

    const validWinner = winner && game.players.some(p => p.username === winner);
    const winnerName = validWinner ? winner : null;
    const endReason = reason || "completed";

    const messageByReason = {
      checkmate: "Checkmate.",
      timeout: "Time is over.",
      stalemate: "Draw by stalemate.",
      draw: "Draw."
    };

    const message = messageByReason[endReason] || "Game finished.";

    const finishGame = ()=>emitGameOver(gameId, {
      reason: endReason,
      message,
      winner: winnerName
    });

    applyRankedResult(game, winnerName, endReason)
      .catch(err=>console.error("ELO update error:", err))
      .finally(finishGame);
  });
  socket.on("chess_timeout", ()=>{
    const gameId = findGameIdForSocket(socket);
    if(!gameId) return;

    const game = chessGames[gameId];
    if(!game || game.ended) return;

    const loser = game.players.find(p=>p.username === socket.username);
    if(!loser) return;

    const winner = game.players.find(p=>p.username !== loser.username);

    applyRankedResult(game, winner?.username || null, "timeout")
      .catch(err=>console.error("ELO update error:", err))
      .finally(()=>{
        emitGameOver(gameId, {
          reason: "timeout",
          message: loser ? `${loser.username} ran out of time.` : "Time is over.",
          winner: winner?.username || null
        });
      });
  });

  /* ===== REMATCH ===== */
  socket.on("rematch", ()=>{
    const gameId = findGameIdForSocket(socket);
    if(!gameId) return;

    const game = chessGames[gameId];
    if(!game || !game.ended) return;

    if(!rematchRequests[gameId]){
      rematchRequests[gameId] = {};
    }

    rematchRequests[gameId][socket.username] = true;

    const requestedBy = Object.keys(rematchRequests[gameId]);

    game.players.forEach(player=>{
      const s = io.sockets.sockets.get(player.id);
      if(s){
        s.emit("chess_rematch_status", {
          requestedBy
        });
      }
    });

    const allReady = game.players.every(player => rematchRequests[gameId][player.username]);
    if(!allReady) return;

    game.players.forEach(player=>{
      player.color = player.color === "w" ? "b" : "w";
    });

    game.fen = null;
    game.turn = "w";
    game.ended = false;
    rematchRequests[gameId] = {};

    emitGameStart(game);
  });
    /* ===== OTHELLO LOBBY ===== */
  socket.on("create_othello_lobby", ({ name })=>{
    const existing = Object.values(othelloLobbies).find(l =>
      l.players.some(p=>p.username === socket.username)
    );
    if(existing) return;

    const id = Math.random().toString(36).substr(2,9);

    othelloLobbies[id] = {
      id,
      name: name || "Othello Room",
      players: [
        {
          id: socket.id,
          username: socket.username,
          ready: false
        }
      ]
    };

    io.emit("othello_lobbies_update", othelloLobbies);
  });

  socket.on("join_othello_lobby", id=>{
    const lobby = othelloLobbies[id];
    if(!lobby || lobby.players.length >= 2) return;

    const existing = Object.values(othelloLobbies).find(l =>
      l.players.some(p=>p.username === socket.username)
    );
    if(existing) return;

    lobby.players.push({
      id: socket.id,
      username: socket.username,
      ready: false
    });

    io.emit("othello_lobbies_update", othelloLobbies);
  });

  socket.on("toggle_othello_ready", id=>{
    const lobby = othelloLobbies[id];
    if(!lobby) return;

    const player = lobby.players.find(p=>p.id === socket.id);
    if(!player) return;

    player.ready = !player.ready;

    if(lobby.players.length === 2 && lobby.players.every(p=>p.ready)){
      const gameId = Math.random().toString(36).substr(2,9);
      const p1 = lobby.players[0];
      const p2 = lobby.players[1];

      othelloGames[gameId] = {
        id: gameId,
        players: [
          { id: p1.id, username: p1.username, color: "black" },
          { id: p2.id, username: p2.username, color: "white" }
        ],
        board: createInitialOthelloBoard(),
        turn: "black",
        ended: false,
        rated: false
      };

      delete othelloLobbies[id];

      othelloGames[gameId].players.forEach(p=>{
        const s = io.sockets.sockets.get(p.id);
        if(s){
          s.emit("othello_start");
        }
      });

      emitOthelloState(othelloGames[gameId]);
    }

    io.emit("othello_lobbies_update", othelloLobbies);
  });

  socket.on("othello_move", ({ x, y } = {})=>{
    const gameId = findOthelloGameIdForSocket(socket);
    if(!gameId) return;

    const game = othelloGames[gameId];
    if(!game || game.ended) return;

    const player = game.players.find(p=>p.username === socket.username);
    if(!player || player.color !== game.turn) return;

    if(typeof x !== "number" || typeof y !== "number") return;

    const flips = collectFlips(game.board, x, y, player.color);
    if(flips.length === 0) return;

    game.board[y][x] = player.color;
    flips.forEach(([fx, fy])=>{
      game.board[fy][fx] = player.color;
    });

    const opponent = getOpponentColor(player.color);
    const opponentCanPlay = hasAnyValidOthelloMove(game.board, opponent);
    const currentCanPlay = hasAnyValidOthelloMove(game.board, player.color);

    if(opponentCanPlay){
      game.turn = opponent;
    }else if(currentCanPlay){
      game.turn = player.color;
    }else{
      game.ended = true;
      const score = countOthelloDisks(game.board);
      let winnerColor = null;
      if(score.black > score.white) winnerColor = "black";
      if(score.white > score.black) winnerColor = "white";

      applyOthelloResult(game, winnerColor)
        .catch(err=>console.error("Othello points update error:", err))
        .finally(()=>{
          const winnerPlayer = winnerColor ? game.players.find(p=>p.color === winnerColor) : null;
          game.players.forEach(p=>{
            const s = io.sockets.sockets.get(p.id);
            if(s){
              s.emit("othello_state", {
                board: game.board,
                turn: game.turn,
                color: p.color
              });
              s.emit("othello_end", {
                winner: winnerPlayer ? winnerPlayer.username : "Draw"
              });
            }
          });
        });

      return;
    }

    emitOthelloState(game);
  });

  /* ===== DISCONNECT ===== */
  socket.on("disconnect", ()=>{
 if(socket.username){
      const gameId = findGameIdForSocket(socket);
      const game = gameId ? chessGames[gameId] : null;

      if(game && !game.ended){
        clearPendingDisconnectForUsername(socket.username);
        pendingDisconnects[socket.username] = setTimeout(()=>{
          delete pendingDisconnects[socket.username];
          const activeGame = chessGames[gameId];
          if(!activeGame || activeGame.ended) return;

          const disconnected = activeGame.players.find(p=>p.username === socket.username);
          if(!disconnected) return;

          const winner = activeGame.players.find(p=>p.username !== socket.username);

          applyRankedResult(activeGame, winner?.username || null, "disconnect")
            .catch(err=>console.error("ELO update error:", err))
            .finally(()=>{
              emitGameOver(gameId, {
                reason: "disconnect",
                message: `${socket.username} disconnected for more than 1 minute.`,
                winner: winner?.username || null
              });
            });

        }, DISCONNECT_FORFEIT_MS);
      }
    }
    delete onlineUsers[socket.id];

    for(const id in lobbies){
      lobbies[id].players = lobbies[id].players.filter(p=>p.id !== socket.id);

      if(lobbies[id].players.length === 0){
        delete lobbies[id];
      }
    }

        for(const id in othelloLobbies){
      othelloLobbies[id].players = othelloLobbies[id].players.filter(p=>p.id !== socket.id);

      if(othelloLobbies[id].players.length === 0){
        delete othelloLobbies[id];
      }
    }

    io.emit("othello_lobbies_update", othelloLobbies);
    
    update();
  });

});

/* ================= START ================= */

async function startServer(){
  await mongoose.connect(process.env.MONGO_URI);
  http.listen(process.env.PORT||3000, ()=>{
    console.log("Server running");
  });
}

startServer();

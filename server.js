const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const mongoose = require('mongoose');
const User = require('./models/User');

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req,res)=>{
  res.sendFile('index.html', { root: 'public' });
});

/* ================= ADMIN SYSTEM ================= */

let schedule = {
  enabled: true,
  startHour: 16,
  endHour: 18
};

let manualOverride = null;

function isGameAllowed(){
  if(manualOverride !== null) return manualOverride;
  if(!schedule.enabled) return true;

  const hour = new Date().getHours();
  return hour >= schedule.startHour && hour < schedule.endHour;
}

/* ================= AUTH ================= */

app.post("/api/register", async (req,res)=>{
  try{
    const { email, password, username } = req.body;

    if(!email || !password || !username){
      return res.status(400).json({error:"Missing fields"});
    }

    if(await User.findOne({email})) return res.status(400).json({error:"Email used"});
    if(await User.findOne({username})) return res.status(400).json({error:"Username taken"});

    const user = new User({ email, password, username, elo:1000 });
    await user.save();

    res.json({success:true});
  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

app.post("/api/login", async (req,res)=>{
  try{
    const { email, password } = req.body;

    const user = await User.findOne({email, password});
    if(!user) return res.status(400).json({error:"Invalid credentials"});

    res.json({
      username:user.username,
      email:user.email,
      elo:user.elo || 1000,
      isAdmin:user.isAdmin || false
    });

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

/* ================= ADMIN ROUTES ================= */

app.post("/api/admin/override", async (req,res)=>{
  try{
    const { adminEmail, enabled } = req.body;

    const admin = await User.findOne({email:adminEmail});
    if(!admin || !admin.isAdmin){
      return res.status(403).json({error:"Not admin"});
    }

    manualOverride = enabled;
    io.emit("games_status",{enabled});

    res.json({success:true});

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

app.post("/api/admin/set-schedule", async (req,res)=>{
  try{
    const { adminEmail, startHour, endHour } = req.body;

    const admin = await User.findOne({email:adminEmail});
    if(!admin || !admin.isAdmin){
      return res.status(403).json({error:"Not admin"});
    }

    schedule.startHour = startHour;
    schedule.endHour = endHour;

    res.json({success:true, schedule});

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

/* ================= DATA ================= */

let onlineUsers = {};
let lobbies = {};
let chessGames = {};
let playerGames = {};

function update(){
  io.emit("online_users", onlineUsers);
  io.emit("lobbies_update", lobbies);
}

/* ================= SOCKET ================= */

io.on('connection', socket=>{

  socket.on("register_online", async username=>{
    socket.username = username;

    const user = await User.findOne({username});

    onlineUsers[username] = {
      id:socket.id,
      elo:user?.elo || 1000
    };

    update();
  });

  socket.on("create_lobby", ({name,time})=>{
    if(!isGameAllowed()){
      socket.emit("error_message","Games are closed");
      return;
    }

    const id=Math.random().toString(36).substr(2,5);

    lobbies[id]={
      id,
      name,
      time,
      players:[{id:socket.id, username:socket.username, ready:false}]
    };

    update();
  });

  socket.on("join_lobby", id=>{
    if(!isGameAllowed()){
      socket.emit("error_message","Games are closed");
      return;
    }

    const l=lobbies[id];
    if(!l||l.players.length>=2) return;

    l.players.push({id:socket.id, username:socket.username, ready:false});
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

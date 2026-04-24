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

/* ================= ADMIN ================= */

let manualOverride = null;

function isGameAllowed(){
  if(manualOverride !== null) return manualOverride;
  return true; // 🔥 SIMPLE POUR L’INSTANT (on remettra schedule après)
}

/* ================= AUTH ================= */

app.post("/api/register", async (req,res)=>{
  try{
    const { email, password, username } = req.body;

    if(!email || !password || !username){
      return res.status(400).json({error:"Missing fields"});
    }

    const existing = await User.findOne({email});
    if(existing) return res.status(400).json({error:"Email used"});

    const user = new User({
      email,
      password,
      username,
      elo:1000
    });

    await user.save();

    res.json({success:true});

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

/* 🔥 LOGIN STABLE (NE PAS TOUCHER) */
app.post("/api/login", async (req,res)=>{
  try{
    const { email, password } = req.body;

    const user = await User.findOne({email, password});

    if(!user){
      return res.status(400).json({error:"Invalid credentials"});
    }

    res.json({
      username:user.username,
      email:user.email,          // ✅ AJOUT SAFE
      elo:user.elo || 1000,
      isAdmin:user.isAdmin || false // ✅ AJOUT SAFE
    });

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

/* ================= ADMIN ROUTE ================= */

app.post("/api/admin/override", async (req,res)=>{
  try{
    const { adminEmail, enabled } = req.body;

    const admin = await User.findOne({email:adminEmail});

    if(!admin || !admin.isAdmin){
      return res.status(403).json({error:"Not admin"});
    }

    manualOverride = enabled;

    console.log("ADMIN SET GAMES:", enabled);

    res.json({success:true});

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

/* ================= DATA ================= */

let lobbies = {};

/* ================= SOCKET ================= */

io.on('connection', socket=>{

  socket.on("create_lobby", ({name,time})=>{
    if(!isGameAllowed()){
      socket.emit("error_message","Games are disabled");
      return;
    }

    const id = Math.random().toString(36).substr(2,5);

    lobbies[id]={
      id,
      name,
      time,
      players:[{id:socket.id}]
    };

    io.emit("lobbies_update", lobbies);
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

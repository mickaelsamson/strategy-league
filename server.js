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

/* ================= DEBUG MONGO ================= */

mongoose.connection.on("connected", ()=>{
  console.log("✅ MongoDB connected");
});

mongoose.connection.on("error", err=>{
  console.error("❌ Mongo error:", err);
});

/* ================= AUTH ================= */

app.post("/api/signup", async (req,res)=>{
  try{
    console.log("📥 SIGNUP BODY:", req.body);

    const { email, password, username } = req.body;

    if(!email || !password || !username){
      console.log("❌ Missing fields");
      return res.status(400).json({error:"Missing required fields"});
    }

    const existingEmail = await User.findOne({email});
    if(existingEmail){
      console.log("❌ Email exists");
      return res.status(400).json({error:"Email already used"});
    }

    const existingUsername = await User.findOne({username});
    if(existingUsername){
      console.log("❌ Username exists");
      return res.status(400).json({error:"Username taken"});
    }

    const user = new User({
      email,
      password,
      username,
      elo: 1000
    });

    await user.save();

    console.log("✅ User created");

    res.json({success:true});

  }catch(err){
    console.error("🔥 SIGNUP ERROR FULL:", err);
    res.status(500).json({error:"Server error"});
  }
});

app.post("/api/login", async (req,res)=>{
  try{
    console.log("📥 LOGIN BODY:", req.body);

    const { email, password } = req.body;

    if(!email || !password){
      return res.status(400).json({error:"Missing fields"});
    }

    const user = await User.findOne({email, password});
    if(!user){
      console.log("❌ Invalid login");
      return res.status(400).json({error:"Invalid credentials"});
    }

    console.log("✅ Login success");

    res.json({
      username:user.username,
      elo:user.elo || 1000
    });

  }catch(err){
    console.error("🔥 LOGIN ERROR FULL:", err);
    res.status(500).json({error:"Server error"});
  }
});

/* ================= START ================= */

async function startServer(){
  try{
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🚀 Server + DB ready");

    http.listen(process.env.PORT||3000, ()=>{
      console.log("🌐 Server running");
    });

  }catch(err){
    console.error("❌ START ERROR:", err);
  }
}

startServer();

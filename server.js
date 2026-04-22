const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/game");

const User = require('./models/User');

let gameOpen = true;

app.post('/api/admin', (req,res)=>{
  const {username,password} = req.body;
  if(username==="Admin" && password==="WCIP25") res.send({ok:true});
  else res.send({ok:false});
});

app.post('/api/toggle', (req,res)=>{
  gameOpen = req.body.state;
  res.send({gameOpen});
});

app.get('/api/status',(req,res)=>res.send({gameOpen}));

app.post('/api/login', async (req,res)=>{
  let user = await User.findOne({username:req.body.username});
  if(!user) user = await User.create({username:req.body.username});
  res.send(user);
});

app.post('/api/xp', async (req,res)=>{
  let user = await User.findOne({username:req.body.username});
  user.xp += req.body.xp;
  user.level = Math.floor(user.xp/100)+1;
  user.xpHistory.push({date:new Date(), xp:user.xp});
  await user.save();
  res.send(user);
});

app.get('/api/stats', async (req,res)=>{
  res.send(await User.find({}));
});

app.listen(process.env.PORT||3000);

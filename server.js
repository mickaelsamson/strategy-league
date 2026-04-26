const express = require('express');
const path = require('path');

const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const User = require('./models/User');
const { state, isGameAllowed } = require('./src/server/state');
const { createApiRouter } = require('./src/server/routes/api');
const { registerSockets } = require('./src/server/sockets');
const { applyRankedResult, applyOthelloResult, applyAzulResult } = require('./src/server/services/user-service');
const { attachAuthUser } = require('./src/server/services/auth-service');
const { PROTECTED_PAGE_RULES } = require('./src/server/config/constants');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(attachAuthUser);

app.use((req, res, next)=>{
  const rule = PROTECTED_PAGE_RULES[req.path];
  if(!rule) return next();

  if(rule.adminOnly && !req.authUser?.isAdmin){
    return res.redirect('/login.html');
  }

  if(rule.gameKey && !isGameAllowed(rule.gameKey, req.authUser || null)){
    return res.redirect('/games.html');
  }

  return next();
});

app.use(express.static('public'));

app.use('/api', createApiRouter({ User, state, isGameAllowed, io }));
app.get('/', (req, res)=>{
res.sendFile('index.html', { root: 'public' });
});

app.get('/admin.html', (req, res)=>{
  res.sendFile(path.join(process.cwd(), 'public', 'admin.html'));
});

registerSockets({ io, User, state, isGameAllowed, applyRankedResult, applyOthelloResult, applyAzulResult });

async function startServer(){
  await mongoose.connect(process.env.MONGO_URI);
  server.listen(process.env.PORT || 3000, ()=>{
    console.log('Server running');
  });
}

startServer();

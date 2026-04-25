const express = require('express');

const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const User = require('./models/User');
const { state, isGameAllowed } = require('./src/server/state');
const { createApiRouter } = require('./src/server/routes/api');
const { registerSockets } = require('./src/server/sockets');
const { applyRankedResult, applyOthelloResult, applyAzulResult } = require('./src/server/services/user-service');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

app.use('/api', createApiRouter({ User, state, isGameAllowed, io }));
app.get('/', (req, res)=>{
res.sendFile('index.html', { root: 'public' });
});

registerSockets({ io, User, state, isGameAllowed, applyRankedResult, applyOthelloResult, applyAzulResult });

async function startServer(){
  await mongoose.connect(process.env.MONGO_URI);
  server.listen(process.env.PORT || 3000, ()=>{
    console.log('Server running');
  });
}

startServer();

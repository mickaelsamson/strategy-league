// ===== OTHELLO COMPLETE =====

let othelloLobbies={},othelloGames={};

function initBoard(){
 const b=Array(8).fill().map(()=>Array(8).fill(null));
 b[3][3]="white";b[3][4]="black";b[4][3]="black";b[4][4]="white";
 return b;
}

const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

function valid(b,x,y,c){
 if(b[y][x])return false;
 let opp=c==="black"?"white":"black";
 for(const[dX,dY]of dirs){
  let nx=x+dX,ny=y+dY,found=false;
  while(nx>=0&&ny>=0&&nx<8&&ny<8){
   if(b[ny][nx]===opp)found=true;
   else if(b[ny][nx]===c&&found)return true;
   else break;
   nx+=dX;ny+=dY;
  }
 }
 return false;
}

function apply(b,x,y,c){
 let opp=c==="black"?"white":"black";
 b[y][x]=c;
 for(const[dX,dY]of dirs){
  let nx=x+dX,ny=y+dY,path=[];
  while(nx>=0&&ny>=0&&nx<8&&ny<8){
   if(b[ny][nx]===opp)path.push([nx,ny]);
   else if(b[ny][nx]===c){path.forEach(([px,py])=>b[py][px]=c);break;}
   else break;
   nx+=dX;ny+=dY;
  }
 }
}

io.on("connection",socket=>{

 socket.on("create_othello_lobby",({name})=>{
  const id=Math.random().toString(36).substr(2,9);
  othelloLobbies[id]={id,name,players:[{id:socket.id,username:socket.username,ready:false}]};
  io.emit("othello_lobbies_update",othelloLobbies);
 });

 socket.on("join_othello_lobby",id=>{
  const l=othelloLobbies[id];if(!l||l.players.length>=2)return;
  l.players.push({id:socket.id,username:socket.username,ready:false});
  io.emit("othello_lobbies_update",othelloLobbies);
 });

 socket.on("toggle_othello_ready",id=>{
  const l=othelloLobbies[id];if(!l)return;
  const p=l.players.find(p=>p.id===socket.id);if(!p)return;
  p.ready=!p.ready;

  if(l.players.length===2&&l.players.every(p=>p.ready)){
   const gameId=id;
   othelloGames[gameId]={board:initBoard(),turn:"black",players:l.players};

   l.players.forEach((p,i)=>{
    const s=io.sockets.sockets.get(p.id);
    if(s)s.emit("othello_state",{board:initBoard(),turn:"black",color:i===0?"black":"white"});
   });

   delete othelloLobbies[id];
  }

  io.emit("othello_lobbies_update",othelloLobbies);
 });

 socket.on("othello_move",({x,y})=>{
  const game=Object.values(othelloGames).find(g=>g.players.some(p=>p.id===socket.id));
  if(!game)return;

  const player=game.players.find(p=>p.id===socket.id);
  const color=game.players.indexOf(player)===0?"black":"white";

  if(game.turn!==color)return;
  if(!valid(game.board,x,y,color))return;

  apply(game.board,x,y,color);
  game.turn=color==="black"?"white":"black";

  game.players.forEach(p=>{
   const s=io.sockets.sockets.get(p.id);
   if(s)s.emit("othello_state",{board:game.board,turn:game.turn,color:(p.id===player.id?color:(color==="black"?"white":"black"))});
  });
 });

});

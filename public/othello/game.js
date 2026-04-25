const socket=io();
const user=JSON.parse(localStorage.getItem("user"));
if(!user){
 window.location="/login.html";
}
socket.emit("register_online",user.username);

let board,turn,color;
let myName=user.username;
let opponentName="";

function playSound(){
 const s=document.getElementById("flipSound");
 if(s){s.currentTime=0;s.play();}
}

function spawnParticles(x,y){
 const boardEl=document.getElementById("board");
 for(let i=0;i<8;i++){
  const p=document.createElement("div");
  p.className="particle";
  p.style.left=(x*60+30)+"px";
  p.style.top=(y*60+30)+"px";
  p.style.setProperty("--x",(Math.random()*80-40)+"px");
  p.style.setProperty("--y",(Math.random()*80-40)+"px");
  boardEl.appendChild(p);
  setTimeout(()=>p.remove(),600);
 }
}

function draw(){
  const el=document.getElementById("board");
 el.innerHTML="";
 const validMoves=getValidMoves(color);
 for(let y=0;y<8;y++){
  for(let x=0;x<8;x++){
   const cell=document.createElement("div");
 cell.className="cell";
 
   const key=`${x}-${y}`;
   if(validMoves.has(key)){
    cell.classList.add("valid");
   }
 
   const value=board?.[y]?.[x];
   if(value){
    const disk=document.createElement("div");
    disk.className=`disk ${value}`;
    cell.appendChild(disk);
   }
 
   cell.onclick=()=>play(x,y);
   el.appendChild(cell);
  }
 }

 const score=count();
 document.getElementById("score").innerText=`⚫ ${score.b} - ${score.w} ⚪`;

 const turnEl=document.getElementById("turn");
 if(turn===color){
  turnEl.className="your-turn";
  turnEl.innerText="Your turn";
 }else{
  turnEl.className="opponent-turn";
  turnEl.innerText="Opponent";
 }
}

function count(){
 let b=0,w=0;
 board.forEach(r=>r.forEach(c=>{if(c=="black")b++;if(c=="white")w++;}));
 return{b,w};
}

function inBounds(x,y){
 return x>=0 && y>=0 && x<8 && y<8;
}

function isValidMove(x,y,playerColor){
 if(!board || board[y][x]) return false;
 const directions=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
 const enemy=playerColor==="black"?"white":"black";

 for(const [dx,dy] of directions){
  let cx=x+dx, cy=y+dy;
  let foundEnemy=false;
  while(inBounds(cx,cy) && board[cy][cx]===enemy){
   foundEnemy=true;
   cx+=dx;
   cy+=dy;
  }
  if(foundEnemy && inBounds(cx,cy) && board[cy][cx]===playerColor){
   return true;
  }
 }
 return false;
}

function getValidMoves(playerColor){
 const moves=new Set();
 if(!board || !playerColor) return moves;
 for(let y=0;y<8;y++){
  for(let x=0;x<8;x++){
   if(isValidMove(x,y,playerColor)){
    moves.add(`${x}-${y}`);
   }
  }
 }
 return moves;
}

function play(x,y){
 if(turn!==color)return;
 socket.emit("othello_move",{x,y});
 playSound();
 spawnParticles(x,y);
}

function showEnd(winner){
 const el=document.getElementById("endScreen");
 el.style.display="flex";
 document.getElementById("winnerText").innerText=winner+" wins!";
}

function goBack(){window.location="/othello/index.html";}

function applyPlayers(players=[]){
 const me=players.find(p=>p.username===user.username);
 const opponent=players.find(p=>p.username!==user.username);
 if(me){
  color=me.color;
  document.getElementById("youColor").innerText=me.color==="black"?"Black ⚫":"White ⚪";
 }
 if(opponent){
  opponentName=opponent.username;
  document.getElementById("opponentName").innerText=opponentName;
  document.getElementById("opponentColor").innerText=opponent.color==="black"?"Black ⚫":"White ⚪";
 }
 document.getElementById("youName").innerText=myName;
}

function resign(){
 socket.emit("othello_resign");
}

socket.on("online_users",users=>{
 document.getElementById("players").innerHTML=
 Object.entries(users).map(([name,data])=>`<div class="player" data-profile-username="${name}">${name} (ELO Othello ${data.othelloElo||1000})</div>`).join("");
});

socket.on("othello_state",data=>{
 board=data.board;turn=data.turn;color=data.color;
 if(Array.isArray(data.players)) applyPlayers(data.players);
 draw();
});

socket.on("othello_end",data=>{
 const message=data.message||`${data.winner} wins!`;
 const el=document.getElementById("endScreen");
 el.style.display="flex";
 document.getElementById("winnerText").innerText=message;
});

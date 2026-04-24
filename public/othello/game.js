const socket=io();
const user=JSON.parse(localStorage.getItem("user"));

let board,turn,color;

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
 const el=document.getElementById("board");el.innerHTML="";
 for(let y=0;y<8;y++){
  for(let x=0;x<8;x++){
   const cell=document.createElement("div");
   cell.className="cell";
   cell.onclick=()=>play(x,y);

   if(board[y][x]){
    const d=document.createElement("div");
    d.className="disk "+board[y][x]+" flip";
    cell.appendChild(d);
   }

   el.appendChild(cell);
  }
 }

 const s=count();
 document.getElementById("score").innerText="⚫ "+s.b+" - ⚪ "+s.w;

 const turnEl=document.getElementById("turn");
 if(turn===color){turnEl.className="your-turn";turnEl.innerText="Your turn";}
 else{turnEl.className="opponent-turn";turnEl.innerText="Opponent";}
}

function count(){
 let b=0,w=0;
 board.forEach(r=>r.forEach(c=>{if(c=="black")b++;if(c=="white")w++;}));
 return{b,w};
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

socket.on("othello_state",data=>{
 board=data.board;turn=data.turn;color=data.color;
 draw();
});

socket.on("othello_end",data=>{
 showEnd(data.winner);
});


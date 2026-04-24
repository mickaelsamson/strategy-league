const socket=io();
const user=JSON.parse(localStorage.getItem("user"));

let board,turn,color;

const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

function validMoves(b,c){
 let moves=[];
 for(let y=0;y<8;y++){
  for(let x=0;x<8;x++){
   if(b[y][x])continue;
   for(const[dX,dY]of dirs){
    let nx=x+dX,ny=y+dY,found=false;
    while(nx>=0&&ny>=0&&nx<8&&ny<8){
     if(b[ny][nx]&&b[ny][nx]!==c){found=true;}
     else if(b[ny][nx]===c&&found){moves.push([x,y]);break;}
     else break;
     nx+=dX;ny+=dY;
    }
   }
  }
 }
 return moves;
}

function draw(){
 const el=document.getElementById("board");el.innerHTML="";
 const valid=validMoves(board,turn);

 for(let y=0;y<8;y++){
  for(let x=0;x<8;x++){
   const cell=document.createElement("div");
   cell.className="cell";
   if(valid.some(v=>v[0]==x&&v[1]==y))cell.classList.add("valid");
   cell.onclick=()=>play(x,y);

   if(board[y][x]){
    const d=document.createElement("div");
    d.className="disk "+board[y][x];
    cell.appendChild(d);
   }
   el.appendChild(cell);
  }
 }

 const s=count();
 document.getElementById("score").innerText="⚫ "+s.b+" - ⚪ "+s.w;
 document.getElementById("turn").innerText=turn===color?"Your turn":"Opponent";
}

function count(){
 let b=0,w=0;
 board.forEach(r=>r.forEach(c=>{if(c=="black")b++;if(c=="white")w++;}));
 return{b,w};
}

function play(x,y){
 if(turn!==color)return;
 socket.emit("othello_move",{x,y});
}

socket.on("othello_state",data=>{
 board=data.board;turn=data.turn;color=data.color;
 draw();
});

socket.on("othello_end",data=>{
 document.getElementById("status").innerText="Winner: "+data.winner+" | XP: "+data.xp;
});


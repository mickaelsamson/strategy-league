const tutorialMode=new URLSearchParams(window.location.search).get("tutorial")==="1";
const socket=tutorialMode?{emit(){},on(){}}:io();
if(!tutorialMode) window.StrategyLeagueSocket=socket;
const user=JSON.parse(localStorage.getItem("user"));
if(!user){
 window.location="/login.html";
}
if(!tutorialMode) socket.emit("register_online",user.username);

let board,turn,color;
let myName=user.username;
let opponentName="";
let gameOver=false;
let draggingMove=false;
let tutorialGuide=null;
let tutorialMoveCount=0;

const TUTORIAL_STEPS=[
 {title:"Open from the center",body:"You play black against the coach AI. Start with a legal central move: the goal is mobility, not flipping the most discs.",tips:["Legal moves glow on the board.","A move is legal only if it brackets at least one white disc."]},
 {title:"Protect future corners",body:"The AI will try to tempt you near empty corners. Avoid giving it easy corner access.",tips:["Corners are stable discs: once taken, they cannot be flipped.","Early X-squares next to empty corners are usually dangerous."]},
 {title:"Win with mobility",body:"Keep giving the AI fewer legal moves than you have. In Moonveil Dominion, the player with better options usually owns the endgame.",tips:["Small quiet flips are often stronger than huge flips.","Watch what the AI can play after your move."]},
 {title:"Convert the edge",body:"When a corner or stable edge appears, take it. Stable discs become the base for the final count.",tips:["Disc count matters most near the end.","Stable corners make adjacent edges safer."]}
];

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
 const canMove=turn===color && !gameOver;
 const validMoves=canMove?getValidMoves(color):new Set();
 for(let y=0;y<8;y++){
  for(let x=0;x<8;x++){
   const cell=document.createElement("div");
 cell.className="cell";
 
   const key=`${x}-${y}`;
   if(validMoves.has(key)){
    cell.classList.add("valid");
    cell.ondragover=(event)=>{
     event.preventDefault();
     cell.classList.add("drag-over");
    };
    cell.ondragleave=()=>cell.classList.remove("drag-over");
    cell.ondrop=(event)=>{
     event.preventDefault();
     cell.classList.remove("drag-over");
     if(draggingMove) play(x,y);
    };
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

 const moveDisk=document.getElementById("moveDisk");
 if(moveDisk){
  moveDisk.className=`move-disk ${color||""} ${canMove?"ready":""}`;
  moveDisk.draggable=canMove;
  moveDisk.style.display=canMove?"inline-flex":"none";
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

function getFlips(x,y,playerColor){
 const flips=[];
 if(!board || board[y][x]) return flips;
 const directions=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
 const enemy=playerColor==="black"?"white":"black";
 for(const [dx,dy] of directions){
  let cx=x+dx,cy=y+dy;
  const line=[];
  while(inBounds(cx,cy)&&board[cy][cx]===enemy){
   line.push([cx,cy]);
   cx+=dx;cy+=dy;
  }
  if(line.length&&inBounds(cx,cy)&&board[cy][cx]===playerColor){
   flips.push(...line);
  }
 }
 return flips;
}

function applyLocalMove(x,y,playerColor){
 const flips=getFlips(x,y,playerColor);
 if(!flips.length) return false;
 board[y][x]=playerColor;
 flips.forEach(([fx,fy])=>{board[fy][fx]=playerColor;});
 return true;
}

function opposite(playerColor){
 return playerColor==="black"?"white":"black";
}

function advanceLocalTurn(){
 const enemy=opposite(turn);
 if(getValidMoves(enemy).size){
  turn=enemy;
 }else if(getValidMoves(turn).size){
  const skipped=enemy==="white"?"Coach AI":"You";
  document.getElementById("status").innerText=`${skipped} has no legal move and must pass.`;
 }else{
  finishTutorialGame();
 }
 draw();
}

function chooseAiMove(){
 const moves=[...getValidMoves("white")].map(key=>{
  const [x,y]=key.split("-").map(Number);
  const corner=(x===0||x===7)&&(y===0||y===7);
  const danger=(x===1||x===6)&&(y===1||y===6);
  return {x,y,score:getFlips(x,y,"white").length+(corner?20:0)-(danger?8:0)};
 }).sort((a,b)=>b.score-a.score);
 return moves[0]||null;
}

function scheduleTutorialAi(){
 if(!tutorialMode||gameOver||turn!=="white") return;
 tutorialGuide?.message("Coach AI is thinking. Watch which line it tries to open next.",["After the AI moves, count your legal replies before choosing one."]);
 setTimeout(()=>{
  const move=chooseAiMove();
  if(move){
   applyLocalMove(move.x,move.y,"white");
   playSound();
   spawnParticles(move.x,move.y);
   document.getElementById("status").innerText=`Coach AI played ${String.fromCharCode(97+move.x)}${move.y+1}.`;
  }
  advanceLocalTurn();
  updateTutorialGuide();
 },700);
}

function updateTutorialGuide(){
 if(!tutorialMode||!tutorialGuide) return;
 const score=count();
 tutorialGuide.setStep(Math.min(TUTORIAL_STEPS.length-1,Math.floor(tutorialMoveCount/2)));
 document.getElementById("status").innerText=document.getElementById("status").innerText||`Tutorial score: Black ${score.b} - White ${score.w}`;
}

function finishTutorialGame(){
 gameOver=true;
 const score=count();
 const result=score.b===score.w?"Draw":score.b>score.w?"Victory":"Defeat";
 tutorialGuide?.complete(`${result}. Final score: Black ${score.b} - White ${score.w}. You played a complete guided Moonveil Dominion game against the coach AI.`);
 showEnd(result);
}

function play(x,y){
 if(gameOver)return;
 if(turn!==color)return;
 if(tutorialMode){
  if(!applyLocalMove(x,y,color)) return;
  tutorialMoveCount+=1;
  playSound();
  spawnParticles(x,y);
  document.getElementById("status").innerText="";
  advanceLocalTurn();
  updateTutorialGuide();
  scheduleTutorialAi();
  return;
 }
 socket.emit("moonveil_dominion_move",{x,y});
 playSound();
 spawnParticles(x,y);
}

function showEnd(winner){
 const el=document.getElementById("endScreen");
 el.className="end-screen show";
 document.getElementById("winnerText").innerText=winner+" wins!";
 document.getElementById("endMessage").innerText="";
 document.getElementById("xpReward").innerText="+0 XP";
}

function goBack(){window.location="/moonveil-dominion/index.html";}

function viewBoard(){
 document.getElementById("endScreen").classList.remove("show");
 document.getElementById("showResultBtn").hidden=false;
}

function showResult(){
 document.getElementById("endScreen").classList.add("show");
 document.getElementById("showResultBtn").hidden=true;
}

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
 if(gameOver)return;
 if(tutorialMode){
  gameOver=true;
  tutorialGuide?.message("Tutorial resigned. Restart from the lobby when you want another guided run.",["In real matches, resign only when the position is truly lost."]);
  showEnd("Coach AI");
  return;
 }
 socket.emit("moonveil_dominion_resign");
}

function rematch(){
 if(!gameOver)return;
 if(tutorialMode){
  startTutorialGame();
  return;
 }
 socket.emit("moonveil_dominion_rematch");
 document.getElementById("rematchStatus").innerText="Rematch requested. Waiting for opponent...";
}

socket.on("online_users",users=>{
 window.dispatchEvent(new CustomEvent("site-shell-online-users",{detail:users}));
 document.getElementById("players").innerHTML=
 Object.entries(users).map(([name,data])=>`<div class="player" data-profile-username="${name}">${name} (ELO Moonveil Dominion ${data.moonveil_dominionElo||1000})</div>`).join("");
});

socket.on("moonveil_dominion_state",data=>{
 gameOver=false;
 board=data.board;turn=data.turn;color=data.color;
 if(Array.isArray(data.players)) applyPlayers(data.players);
 draw();
});

socket.on("moonveil_dominion_end",data=>{
 gameOver=true;
 const reward=data.rewards?.[myName]||{};
 const result=reward.result||(data.winner==="Draw"?"draw":data.winner===myName?"win":"loss");
 const xpChange=Number.isFinite(reward.xpChange)?reward.xpChange:0;
 const message=data.message||`${data.winner} wins!`;
 const el=document.getElementById("endScreen");
 el.className=`end-screen show ${result==="win"?"victory":result==="loss"?"defeat":"draw"}`;
 document.getElementById("showResultBtn").hidden=true;
 document.getElementById("winnerText").innerText=result==="win"?"Victory":result==="loss"?"Defeat":"Draw";
 document.getElementById("endMessage").innerText=message;
 const score=data.score||count();
 document.getElementById("finalScore").innerText=`Final score · Black ${score.black ?? score.b ?? 0} - ${score.white ?? score.w ?? 0} White`;
 document.getElementById("xpReward").innerText=`+${xpChange} XP`;
 document.getElementById("rematchStatus").innerText="";
 updateStoredXp(xpChange);
});

document.getElementById("moveDisk")?.addEventListener("dragstart", event=>{
 if(turn!==color || gameOver){
  event.preventDefault();
  return;
 }
 draggingMove=true;
 event.dataTransfer.effectAllowed="move";
 event.dataTransfer.setData("text/plain", color || "");
});

document.addEventListener("dragend", ()=>{
 draggingMove=false;
});

socket.on("moonveil_dominion_rematch_status",data=>{
 if(!gameOver)return;
 const requestedBy=data.requestedBy||[];
 document.getElementById("rematchStatus").innerText=requestedBy.length<2
  ?"Rematch requested. Waiting for opponent..."
  :"Starting rematch...";
});

socket.on("moonveil_dominion_rematch_start",()=>{
 gameOver=false;
 const el=document.getElementById("endScreen");
 el.className="end-screen";
 document.getElementById("rematchStatus").innerText="";
 document.getElementById("finalScore").innerText="";
 document.getElementById("status").innerText="";
});

function createInitialBoard(){
 return Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>{
  if(x===3&&y===3) return "white";
  if(x===4&&y===4) return "white";
  if(x===4&&y===3) return "black";
  if(x===3&&y===4) return "black";
  return null;
 }));
}

function startTutorialGame(){
 board=createInitialBoard();
 turn="black";
 color="black";
 opponentName="Coach AI";
 gameOver=false;
 tutorialMoveCount=0;
 document.getElementById("youName").innerText=myName;
 document.getElementById("youColor").innerText="Black ⚫";
 document.getElementById("opponentName").innerText=opponentName;
 document.getElementById("opponentColor").innerText="White ⚪";
 document.getElementById("players").innerHTML="<div class='player'>Coach AI (Tutorial)</div>";
 document.getElementById("endScreen").className="end-screen";
 document.getElementById("showResultBtn").hidden=true;
 tutorialGuide=tutorialGuide||window.TutorialGuide?.create({
  title:"Moonveil Dominion Tutorial",
  steps:TUTORIAL_STEPS,
  onBack:()=>window.location.href="/moonveil-dominion/index.html"
 });
 draw();
 updateTutorialGuide();
}

function updateStoredXp(xpChange){
 if(!xpChange)return;
 try{
  const stored=JSON.parse(localStorage.getItem("user")||"null");
  if(!stored)return;
  localStorage.setItem("user",JSON.stringify({
   ...stored,
   xp:(stored.xp||0)+xpChange
  }));
 }catch(err){
  console.error(err);
 }
}

if(tutorialMode){
 startTutorialGame();
}

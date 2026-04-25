const socket=io();
window.StrategyLeagueSocket=socket;
const user=JSON.parse(localStorage.getItem("user"));
if(!user){
 window.location="/login.html";
}

socket.emit("register_online",user.username);
socket.on("online_users",users=>{
 window.dispatchEvent(new CustomEvent("site-shell-online-users",{detail:users}));
});

socket.on("othello_lobbies_update",lobbies=>{
 const list=Object.values(lobbies);
 if(!list.length){
  document.getElementById("lobbies").innerHTML=`<div class="empty-state">No lobby for now. Be the first 👑</div>`;
  return;
 }
 document.getElementById("lobbies").innerHTML=list.map(l=>{
  const me=l.players.find(p=>p.username===user.username);
  return `<div class="card lobby-item">
  <strong>${l.name}</strong>
  <div class="lobby-players">${l.players.map(p=>`${p.username} ${p.ready?"✅":"⌛"}`).join(" · ")}</div>
  ${!me?`<button onclick="join('${l.id}')">Join</button>`:
  `<button onclick="ready('${l.id}')">Ready / Not ready</button>`}
  </div>`;
 }).join("");
});

function createLobby(){
 socket.emit("create_othello_lobby",{name:document.getElementById("name").value});
}
function join(id){socket.emit("join_othello_lobby",id);}
function ready(id){socket.emit("toggle_othello_ready",id);}

socket.on("othello_start",()=>window.location="/othello/game.html");

const socket=io();
const user=JSON.parse(localStorage.getItem("user"));
socket.emit("register_online",user.username);

socket.on("othello_lobbies_update",lobbies=>{
 document.getElementById("lobbies").innerHTML=Object.values(lobbies).map(l=>{
  const me=l.players.find(p=>p.username===user.username);
  return `<div class="card">
  <strong>${l.name}</strong>
  ${l.players.map(p=>p.username+" "+(p.ready?"✔":"✖")).join(", ")}
  ${!me?`<button onclick="join('${l.id}')">Join</button>`:
  `<button onclick="ready('${l.id}')">Ready</button>`}
  </div>`;
 }).join("");
});

function createLobby(){
 socket.emit("create_othello_lobby",{name:document.getElementById("name").value});
}
function join(id){socket.emit("join_othello_lobby",id);}
function ready(id){socket.emit("toggle_othello_ready",id);}

socket.on("othello_start",()=>window.location="/othello/game.html");

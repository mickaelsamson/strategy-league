const socket=io();
window.StrategyLeagueSocket=socket;
const user=JSON.parse(localStorage.getItem("user"));
if(!user){
 window.location="/login.html";
}
let gamesEnabled=true;
let pendingInviteLobbyId=new URLSearchParams(window.location.search).get("inviteLobbyId");

socket.emit("register_online",user.username);
socket.on("online_users",users=>{
 window.dispatchEvent(new CustomEvent("site-shell-online-users",{detail:users}));
});

socket.on("othello_lobbies_update",lobbies=>{
 const list=Object.values(lobbies);
 if(pendingInviteLobbyId){
  const invited=list.find(l=>l.id===pendingInviteLobbyId);
  const already=invited?.players?.some(p=>p.username===user.username);
  const full=(invited?.players?.length||0)>=2;
  if(invited&&!already&&!full){
   join(pendingInviteLobbyId);
   pendingInviteLobbyId=null;
  }
 }
 if(!list.length){
  document.getElementById("lobbies").innerHTML=`<div class="empty-state">No lobby for now. Be the first 👑</div>`;
  return;
 }
 document.getElementById("lobbies").innerHTML=list.map(l=>{
  const me=l.players.find(p=>p.username===user.username);
 return `<div class="sl-lobby-card">
  <div class="sl-lobby-head">
   <div><strong>${escapeHtml(l.name)}</strong><span>${l.matchmaking==="public"?"Public matchmaking":"Othello duel"}</span></div>
   <div class="sl-lobby-count">${l.players.length}/2</div>
  </div>
  <div class="sl-lobby-slots">${renderSlots(l,me)}</div>
  <div class="sl-lobby-actions">
   ${!me?`<button onclick="join('${l.id}')">Join</button>`:
   `<button onclick="ready('${l.id}')">${me.ready?"Cancel Ready":"Ready Up"}</button>`}
  </div>
  </div>`;
 }).join("");
});

function escapeHtml(text){
 return String(text||"")
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;")
  .replaceAll('"',"&quot;")
  .replaceAll("'","&#039;");
}

function renderSlot(player){
 if(!player){
  return `<div class="sl-player-slot"><div class="sl-empty-avatar">+</div><strong>Available</strong><small>Invite a friend</small></div>`;
 }
 return `<div class="sl-player-slot ${player.ready?"is-ready":""}">
  <div class="sl-player-avatar">${escapeHtml(player.username).slice(0,1).toUpperCase()}</div>
  <strong>${escapeHtml(player.username)}</strong>
  <small>${player.ready?"Ready":"Waiting"}</small>
 </div>`;
}

function renderSlots(lobby,me){
 const empty=Math.max(0,2-lobby.players.length);
 return `${lobby.players.map(renderSlot).join("")}${Array.from({length:empty}).map(()=>me?`<button class="sl-lobby-invite" type="button" onclick="inviteToLobby('${lobby.id}')"><b>+</b><span>Invite friend</span></button>`:renderSlot(null)).join("")}`;
}

function createLobby(){
 if(!gamesEnabled)return;
 socket.emit("create_othello_lobby",{name:document.getElementById("name").value});
}
function publicMatchmaking(){
 if(!gamesEnabled)return;
 socket.emit("public_othello_matchmaking");
}
function join(id){if(gamesEnabled)socket.emit("join_othello_lobby",id);}
function ready(id){if(gamesEnabled)socket.emit("toggle_othello_ready",id);}
function openInvitePicker(){
 if(!gamesEnabled)return;
 window.SiteShell?.openInvitePicker?.("othello");
}
function inviteToLobby(id){
 if(!gamesEnabled)return;
 window.SiteShell?.openLobbyInvitePicker?.("othello",id);
}

async function checkGamesAccess(){
 try{
 const res=await fetch("/api/games/status?gameKey=othello");
  const data=await res.json();
  gamesEnabled=Boolean(data.enabled);
  const blocked=document.getElementById("blockedScreen");
  if(blocked) blocked.style.display=gamesEnabled?"none":"flex";
 }catch(err){
  console.error(err);
 }
}

socket.on("othello_start",()=>window.location="/othello/game.html");
checkGamesAccess();

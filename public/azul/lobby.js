const socket = io();
window.StrategyLeagueSocket = socket;

const user = JSON.parse(localStorage.getItem("user"));
if(!user){
  window.location = "/login.html";
}
let gamesEnabled = true;
let pendingInviteLobbyId = new URLSearchParams(window.location.search).get("inviteLobbyId");

socket.emit("register_online", user.username);

socket.on("online_users", users => {
  window.dispatchEvent(new CustomEvent("site-shell-online-users", { detail: users }));
});

function escapeHtml(text){
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

socket.on("azul_lobbies_update", lobbies => {
  const list = Object.values(lobbies || {});
  const target = document.getElementById("lobbies");

  if(pendingInviteLobbyId){
    const invited = list.find(lobby => lobby.id === pendingInviteLobbyId);
    const already = invited?.players?.some(player => player.username === user.username);
    const full = (invited?.players?.length || 0) >= (invited?.maxPlayers || 2);
    if(invited && !already && !full){
      join(pendingInviteLobbyId);
      pendingInviteLobbyId = null;
    }
  }

  if(!list.length){
    target.innerHTML = `<div class="empty-state">No Azul lobby yet. Open the first table.</div>`;
    return;
  }

  target.innerHTML = list.map(lobby => {
    const me = lobby.players.find(p => p.username === user.username);
    const maxPlayers = lobby.maxPlayers || 2;
    const full = lobby.players.length >= maxPlayers;
    return `
      <div class="sl-lobby-card">
        <div class="sl-lobby-head">
          <div>
            <strong>${escapeHtml(lobby.name)}</strong>
            <span>${maxPlayers * 2 + 1} factories${lobby.matchmaking === "public" ? " · Public matchmaking" : ""}</span>
          </div>
          <div class="sl-lobby-count">${lobby.players.length}/${maxPlayers}</div>
        </div>
        <div class="sl-lobby-slots">${renderSlots(lobby, me, maxPlayers)}</div>
        <div class="sl-lobby-actions">
          ${!me && !full ? `<button onclick="join('${lobby.id}')">Join</button>` : ""}
          ${!me && full ? `<button disabled>Full</button>` : ""}
          ${me ? `<button onclick="ready('${lobby.id}')">${me.ready ? "Cancel Ready" : "Ready Up"}</button>` : ""}
        </div>
      </div>
    `;
  }).join("");
});

function renderSlot(player){
  if(!player){
    return `<div class="sl-player-slot"><div class="sl-empty-avatar">+</div><strong>Available</strong><small>Invite a friend</small></div>`;
  }
  return `<div class="sl-player-slot ${player.ready ? "is-ready" : ""}">
    <div class="sl-player-avatar">${escapeHtml(player.username).slice(0, 1).toUpperCase()}</div>
    <strong>${escapeHtml(player.username)}</strong>
    <small>${player.ready ? "Ready" : "Waiting"}</small>
  </div>`;
}

function renderSlots(lobby, me, maxPlayers){
  const empty = Math.max(0, maxPlayers - lobby.players.length);
  return `${lobby.players.map(renderSlot).join("")}${Array.from({ length: empty }).map(() => me ? `<button class="sl-lobby-invite" type="button" onclick="inviteToLobby('${lobby.id}')"><b>+</b><span>Invite friend</span></button>` : renderSlot(null)).join("")}`;
}

function createLobby(){
  if(!gamesEnabled) return;
  socket.emit("create_azul_lobby", {
    name: document.getElementById("name").value,
    maxPlayers: Number(document.getElementById("maxPlayers").value)
  });
}

function publicMatchmaking(){
  if(!gamesEnabled) return;
  socket.emit("public_azul_matchmaking", {
    maxPlayers: Number(document.getElementById("maxPlayers").value)
  });
}

function join(id){
  if(!gamesEnabled) return;
  socket.emit("join_azul_lobby", id);
}

function ready(id){
  if(!gamesEnabled) return;
  socket.emit("toggle_azul_ready", id);
}

function openInvitePicker(){
  if(!gamesEnabled) return;
  window.SiteShell?.openInvitePicker?.("azul");
}

function inviteToLobby(id){
  if(!gamesEnabled) return;
  window.SiteShell?.openLobbyInvitePicker?.("azul", id);
}

async function checkGamesAccess(){
  try{
    const res = await fetch("/api/games/status?gameKey=azul");
    const data = await res.json();
    gamesEnabled = Boolean(data.enabled);
    const blocked = document.getElementById("blockedScreen");
    if(blocked) blocked.style.display = gamesEnabled ? "none" : "flex";
  }catch(err){
    console.error(err);
  }
}

socket.on("azul_start", () => {
  window.location = "/azul/game.html";
});

checkGamesAccess();

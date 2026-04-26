const socket = io();
window.StrategyLeagueSocket = socket;

const user = JSON.parse(localStorage.getItem("user"));
if(!user){
  window.location = "/login.html";
}
let gamesEnabled = true;

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

  if(!list.length){
    target.innerHTML = `<div class="empty-state">No Azul lobby yet. Open the first table.</div>`;
    return;
  }

  target.innerHTML = list.map(lobby => {
    const me = lobby.players.find(p => p.username === user.username);
    const maxPlayers = lobby.maxPlayers || 2;
    const full = lobby.players.length >= maxPlayers;
    return `
      <div class="lobby-item panel">
        <strong>${escapeHtml(lobby.name)}</strong>
        <span class="lobby-size">${lobby.players.length}/${maxPlayers} players · ${maxPlayers * 2 + 1} factories</span>
        <div class="lobby-players">
          ${lobby.players.map(p => `${escapeHtml(p.username)} ${p.ready ? "Ready" : "Waiting"}`).join(" · ")}
        </div>
        ${!me && !full ? `<button onclick="join('${lobby.id}')">Join</button>` : ""}
        ${!me && full ? `<button disabled>Full</button>` : ""}
        ${me ? `<button onclick="ready('${lobby.id}')">${me.ready ? "Cancel Ready" : "Ready Up"}</button>` : ""}
      </div>
    `;
  }).join("");
});

function createLobby(){
  if(!gamesEnabled) return;
  socket.emit("create_azul_lobby", {
    name: document.getElementById("name").value,
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

async function checkGamesAccess(){
  try{
    const res = await fetch("/api/games/status");
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

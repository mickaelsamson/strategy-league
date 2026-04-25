const socket = io();
window.StrategyLeagueSocket = socket;

const user = JSON.parse(localStorage.getItem("user"));
if(!user){
  window.location = "/login.html";
}

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
    const full = lobby.players.length >= 2;
    return `
      <div class="lobby-item panel">
        <strong>${escapeHtml(lobby.name)}</strong>
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
  socket.emit("create_azul_lobby", { name: document.getElementById("name").value });
}

function join(id){
  socket.emit("join_azul_lobby", id);
}

function ready(id){
  socket.emit("toggle_azul_ready", id);
}

socket.on("azul_start", () => {
  window.location = "/azul/game.html";
});

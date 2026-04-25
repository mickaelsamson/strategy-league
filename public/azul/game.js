const socket = io();
window.StrategyLeagueSocket = socket;

const user = JSON.parse(localStorage.getItem("user"));
if(!user){
  window.location = "/login.html";
}

socket.emit("register_online", user.username);

const COLOR_LABELS = {
  blue: "Blue",
  yellow: "Gold",
  red: "Coral",
  black: "Onyx",
  teal: "Aqua",
  first: "1"
};

let state = null;
let selected = null;
let gameOver = false;

function escapeHtml(text){
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function playSound(){
  const sound = document.getElementById("tileSound");
  if(sound){
    sound.currentTime = 0;
    sound.play();
  }
}

function tileMarkup(color, extra = ""){
  return `<span class="tile ${escapeHtml(color)} ${extra}" title="${escapeHtml(COLOR_LABELS[color] || color)}">${color === "first" ? "1" : ""}</span>`;
}

function isMyTurn(){
  return state && state.turnSeat === state.mySeat && !state.ended && !gameOver;
}

function myPlayer(){
  return state?.players?.find(p => p.seat === state.mySeat);
}

function opponentPlayer(){
  return state?.players?.find(p => p.seat !== state.mySeat);
}

function getSourceTiles(sourceType, sourceIndex){
  if(!state) return [];
  if(sourceType === "factory") return state.factories[sourceIndex] || [];
  return state.center || [];
}

function canPlace(player, lineIndex, color){
  if(!player || lineIndex < 0 || lineIndex > 4) return false;
  const line = player.pattern[lineIndex];
  if(!line || line.count >= line.size) return false;
  if(player.wall[lineIndex].includes(color)) return false;
  return !line.color || line.color === color;
}

function selectedCount(){
  if(!selected) return 0;
  return getSourceTiles(selected.sourceType, selected.sourceIndex).filter(tile => tile === selected.color).length;
}

function selectTiles(sourceType, sourceIndex, color){
  if(!isMyTurn() || color === "first") return;
  selected = { sourceType, sourceIndex, color };
  playSound();
  render();
}

function clearSelection(){
  selected = null;
  render();
}

function submitMove(lineIndex){
  if(!selected || !isMyTurn()) return;
  socket.emit("azul_move", { ...selected, lineIndex });
  selected = null;
}

function renderFactories(){
  const factories = document.getElementById("factories");
  factories.innerHTML = (state.factories || []).map((factory, index) => {
    const groups = ["blue", "yellow", "red", "black", "teal"].map(color => {
      const count = factory.filter(tile => tile === color).length;
      if(!count) return "";
      const active = selected?.sourceType === "factory" && selected.sourceIndex === index && selected.color === color;
      return `<button class="tile-stack ${active ? "selected" : ""}" onclick="selectTiles('factory', ${index}, '${color}')">
        ${Array.from({ length: count }, () => tileMarkup(color)).join("")}
      </button>`;
    }).join("");

    return `<div class="factory ${factory.length ? "" : "empty"}">
      <div class="plate-ring"></div>
      <div class="factory-tiles">${groups}</div>
    </div>`;
  }).join("");
}

function renderCenter(){
  const center = document.getElementById("center");
  const tiles = state.center || [];
  const colorGroups = ["blue", "yellow", "red", "black", "teal"].map(color => {
    const count = tiles.filter(tile => tile === color).length;
    if(!count) return "";
    const active = selected?.sourceType === "center" && selected.color === color;
    return `<button class="tile-stack ${active ? "selected" : ""}" onclick="selectTiles('center', 0, '${color}')">
      ${Array.from({ length: count }, () => tileMarkup(color)).join("")}
    </button>`;
  }).join("");

  center.innerHTML = `${tiles.includes("first") ? tileMarkup("first", "marker") : ""}${colorGroups || "<span class='center-empty'>Empty</span>"}`;
}

function patternSlots(player, line, row, isMine){
  const slots = [];
  const chosenCount = selected && isMine && canPlace(player, row, selected.color) ? selectedCount() : 0;

  for(let i = 0; i < line.size; i += 1){
    const filled = i < line.count;
    const preview = !filled && i < line.count + chosenCount && isMine && selected && canPlace(player, row, selected.color);
    const color = filled ? line.color : preview ? selected.color : "";
    slots.push(`<span class="pattern-slot ${color ? "filled" : ""} ${preview ? "preview" : ""}">${color ? tileMarkup(color) : ""}</span>`);
  }

  return slots.join("");
}

function wallMarkup(player){
  return state.wallPattern.map((row, y) => `
    <div class="wall-row">
      ${row.map((color, x) => {
        const placed = player.wall[y][x];
        return `<span class="wall-cell ${placed ? "placed" : ""} ${color}">
          ${placed ? tileMarkup(placed) : ""}
        </span>`;
      }).join("")}
    </div>
  `).join("");
}

function renderBoard(player){
  const isMine = player.seat === state.mySeat;
  const active = player.seat === state.turnSeat;
  return `
    <article class="player-board ${isMine ? "mine" : ""} ${active ? "active" : ""}">
      <header>
        <div>
          <span>${isMine ? "You" : "Opponent"}</span>
          <strong>${escapeHtml(player.username)}</strong>
        </div>
        <b>${player.score}</b>
      </header>

      <div class="board-grid">
        <div class="pattern-lines">
          ${player.pattern.map((line, row) => `
            <button class="pattern-line ${isMine && selected && canPlace(player, row, selected.color) ? "can-place" : ""}"
              ${isMine ? `onclick="submitMove(${row})"` : "disabled"}>
              ${patternSlots(player, line, row, isMine)}
            </button>
          `).join("")}
        </div>
        <div class="wall">${wallMarkup(player)}</div>
      </div>

      <div class="floor-line ${isMine && selected ? "can-place" : ""}" ${isMine ? `onclick="submitMove(-1)"` : ""}>
        <span>Floor</span>
        ${Array.from({ length: 7 }, (_, i) => `<span class="floor-slot">${player.floor[i] ? tileMarkup(player.floor[i]) : ""}</span>`).join("")}
      </div>
    </article>
  `;
}

function renderPlayers(){
  const players = [...(state.players || [])].sort((a, b) => a.seat === state.mySeat ? -1 : b.seat === state.mySeat ? 1 : a.seat - b.seat);
  document.getElementById("boards").innerHTML = players.map(renderBoard).join("");
  document.getElementById("playersMini").innerHTML = players.map(player => `
    <div class="mini-player ${player.seat === state.turnSeat ? "active" : ""}">
      <span>${escapeHtml(player.username)}</span>
      <strong>${player.score}</strong>
    </div>
  `).join("");
}

function renderStatus(){
  const turnPlayer = state.players.find(p => p.seat === state.turnSeat);
  document.getElementById("roundLabel").innerText = `Round ${state.round}`;
  document.getElementById("turnLabel").innerText = isMyTurn() ? "Your turn" : `${turnPlayer?.username || "Opponent"} to play`;

  const hint = document.getElementById("selectionHint");
  if(!isMyTurn()){
    hint.innerText = "Waiting for the opponent.";
  } else if(selected){
    hint.innerText = `Place ${selectedCount()} ${COLOR_LABELS[selected.color]} tile(s) on a pattern line or the floor.`;
  } else {
    hint.innerText = "Select one color from a factory or the center.";
  }
}

function render(){
  if(!state) return;
  renderStatus();
  renderFactories();
  renderCenter();
  renderPlayers();
}

function resign(){
  if(gameOver) return;
  socket.emit("azul_resign");
}

function rematch(){
  if(!gameOver) return;
  socket.emit("azul_rematch");
  document.getElementById("rematchStatus").innerText = "Rematch requested. Waiting for opponent...";
}

function goBack(){
  window.location = "/azul/index.html";
}

function updateStoredXp(xpChange){
  if(!xpChange) return;
  try{
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    if(!stored) return;
    localStorage.setItem("user", JSON.stringify({ ...stored, xp: (stored.xp || 0) + xpChange }));
  }catch(err){
    console.error(err);
  }
}

socket.on("online_users", users => {
  window.dispatchEvent(new CustomEvent("site-shell-online-users", { detail: users }));
});

socket.on("azul_state", data => {
  state = data;
  gameOver = Boolean(data.ended);
  selected = null;
  render();
});

socket.on("azul_end", data => {
  gameOver = true;
  const reward = data.rewards?.[user.username] || {};
  const result = reward.result || (!data.winner ? "draw" : data.winner === user.username ? "win" : "loss");
  const xpChange = Number.isFinite(reward.xpChange) ? reward.xpChange : 0;
  const el = document.getElementById("endScreen");
  el.className = `end-screen show ${result === "win" ? "victory" : result === "loss" ? "defeat" : "draw"}`;
  document.getElementById("winnerText").innerText = result === "win" ? "Victory" : result === "loss" ? "Defeat" : "Draw";
  document.getElementById("endMessage").innerText = data.message || "";
  document.getElementById("xpReward").innerText = `+${xpChange} XP`;
  document.getElementById("rematchStatus").innerText = "";
  updateStoredXp(xpChange);
});

socket.on("azul_rematch_status", data => {
  const requestedBy = data.requestedBy || [];
  document.getElementById("rematchStatus").innerText = requestedBy.length < 2
    ? "Rematch requested. Waiting for opponent..."
    : "Starting rematch...";
});

socket.on("azul_rematch_start", () => {
  gameOver = false;
  document.getElementById("endScreen").className = "end-screen";
  document.getElementById("rematchStatus").innerText = "";
});

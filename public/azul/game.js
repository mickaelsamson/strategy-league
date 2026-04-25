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
const FLOOR_PENALTIES = [-1, -1, -2, -2, -2, -3, -3];

let state = null;
let selected = null;
let gameOver = false;
let timerInterval = null;
let renderedScoreKey = "";

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

    return `<div class="factory factory-${index} ${factory.length ? "" : "empty"}">
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
        return `<span class="wall-cell ${placed ? "placed" : ""} ${color}" data-seat="${player.seat}" data-row="${y}" data-col="${x}">
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
        ${FLOOR_PENALTIES.map((penalty, i) => `
          <span class="floor-slot" data-penalty="${penalty}">
            ${player.floor[i] ? tileMarkup(player.floor[i]) : `<b>${penalty}</b>`}
          </span>
        `).join("")}
      </div>
      <div class="score-pop-anchor" data-seat="${player.seat}"></div>
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
  const turnCard = document.querySelector(".turn-card");
  if(turnCard) turnCard.classList.toggle("your-turn", isMyTurn());
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
  renderTimer();
  showRoundScorePopups();
}

function formatTime(ms){
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderTimer(){
  const text = document.getElementById("timerText");
  const fill = document.getElementById("timerFill");
  if(!text || !fill || !state?.localTurnDeadlineAt){
    if(text) text.innerText = "01:00";
    if(fill) fill.style.width = "100%";
    return;
  }

  const remaining = state.localTurnDeadlineAt - Date.now();
  const percent = Math.max(0, Math.min(100, (remaining / (state.turnTimeMs || 60000)) * 100));
  text.innerText = formatTime(remaining);
  fill.style.width = `${percent}%`;
  fill.classList.toggle("danger", remaining <= 10000);
}

function startTimerLoop(){
  if(timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(renderTimer, 250);
}

function scorePopup(target, text, positive = true){
  if(!target) return;
  const popup = document.createElement("span");
  popup.className = `score-popup ${positive ? "positive" : "negative"}`;
  popup.textContent = text;
  target.appendChild(popup);
  setTimeout(() => popup.remove(), 1300);
}

function showRoundScorePopups(){
  if(!state?.lastRound) return;
  const key = `${state.gameId}-${state.round}-${JSON.stringify(state.lastRound)}`;
  if(key === renderedScoreKey) return;
  renderedScoreKey = key;

  requestAnimationFrame(() => {
    (state.players || []).forEach(player => {
      const summary = state.lastRound[player.username];
      if(!summary) return;

      (summary.placements || []).forEach(placement => {
        const target = document.querySelector(`.wall-cell[data-seat="${player.seat}"][data-row="${placement.row}"][data-col="${placement.col}"]`);
        scorePopup(target, `+${placement.points}`, true);
      });

      if(summary.floorPenalty){
        const target = document.querySelector(`.score-pop-anchor[data-seat="${player.seat}"]`);
        scorePopup(target, String(summary.floorPenalty), false);
      }

      if(summary.bonus){
        const target = document.querySelector(`.score-pop-anchor[data-seat="${player.seat}"]`);
        scorePopup(target, `+${summary.bonus}`, true);
      }
    });
  });
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
  state = {
    ...data,
    localTurnDeadlineAt: Date.now() + (Number.isFinite(data.turnRemainingMs) ? data.turnRemainingMs : data.turnTimeMs || 60000)
  };
  gameOver = Boolean(data.ended);
  selected = null;
  render();
  startTimerLoop();
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

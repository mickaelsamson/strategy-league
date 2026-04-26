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
let scoringToken = 0;
let scoringPromise = Promise.resolve();
let lastEndPayload = null;

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
  return state && state.phase === "playing" && state.turnSeat === state.mySeat && !state.ended && !gameOver;
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
  const tableFactories = state.factories || [];
  factories.innerHTML = tableFactories.map((factory, index) => {
    const groups = ["blue", "yellow", "red", "black", "teal"].map(color => {
      const count = factory.filter(tile => tile === color).length;
      if(!count) return "";
      const active = selected?.sourceType === "factory" && selected.sourceIndex === index && selected.color === color;
      return `<button class="tile-stack ${active ? "selected" : ""}" onclick="selectTiles('factory', ${index}, '${color}')">
        ${Array.from({ length: count }, () => tileMarkup(color)).join("")}
      </button>`;
    }).join("");

    const angle = -90 + (index * 360 / Math.max(1, tableFactories.length));
    const radius = 37;
    const left = 50 + radius * Math.cos(angle * Math.PI / 180);
    const top = 50 + radius * Math.sin(angle * Math.PI / 180);
    return `<div class="factory ${factory.length ? "" : "empty"}" style="left:${left}%;top:${top}%;">
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
    <article class="player-board ${isMine ? "mine" : ""} ${active ? "active" : ""} ${player.active === false ? "eliminated" : ""}" data-seat="${player.seat}">
      <header>
        <div>
          <span>${player.active === false ? "Eliminated" : isMine ? "You" : "Opponent"}</span>
          <strong>${escapeHtml(player.username)}</strong>
        </div>
        <b>${player.score}</b>
      </header>

      <div class="board-surface">
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
          ${FLOOR_PENALTIES.map((penalty, i) => `
            <span class="floor-slot ${player.floor[i] ? "has-tile" : ""}" data-penalty="${penalty}">
              ${player.floor[i] ? tileMarkup(player.floor[i]) : `<b>${penalty}</b>`}
            </span>
          `).join("")}
        </div>
      </div>
      <div class="score-pop-anchor" data-seat="${player.seat}"></div>
    </article>
  `;
}

function renderPlayers(){
  const players = [...(state.players || [])].sort((a, b) => a.seat === state.mySeat ? -1 : b.seat === state.mySeat ? 1 : a.seat - b.seat);
  document.getElementById("boards").innerHTML = players.map(renderBoard).join("");
}

function renderStatus(){
  const turnPlayer = state.players.find(p => p.seat === state.turnSeat);
  const turnCard = document.querySelector(".turn-card");
  if(turnCard) turnCard.classList.toggle("your-turn", isMyTurn());
  document.getElementById("roundLabel").innerText = `Round ${state.round}`;
  document.getElementById("turnLabel").innerText = state.phase === "scoring"
    ? "Scoring"
    : isMyTurn() ? "Your turn" : `${turnPlayer?.username || "Opponent"} to play`;

  const hint = document.getElementById("selectionHint");
  if(state.phase === "scoring"){
    hint.innerText = "Counting points. Watch each board resolve.";
  } else if(!isMyTurn()){
    hint.innerText = "Waiting for the opponent.";
  } else if(selected){
    hint.innerText = `Place ${selectedCount()} ${COLOR_LABELS[selected.color]} tile(s) on a pattern line or the floor.`;
  } else {
    hint.innerText = "Select one color from a factory or the center.";
  }
}

function render(){
  if(!state) return;
  document.body.classList.toggle("azul-scoring", state.phase === "scoring");
  document.body.dataset.azulPlayers = String(state.players?.length || 2);
  renderStatus();
  renderFactories();
  renderCenter();
  renderPlayers();
  renderTimer();
  scoringPromise = showRoundScorePopups();
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
  if(!text || !fill || state?.phase === "scoring"){
    if(text) text.innerText = state?.phase === "scoring" ? "Scoring" : "01:00";
    if(fill) fill.style.width = state?.phase === "scoring" ? "0%" : "100%";
    if(fill) fill.classList.remove("danger");
    return;
  }

  if(!state?.localTurnDeadlineAt){
    text.innerText = "01:00";
    fill.style.width = "100%";
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

function delay(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getScoringCells(player, placement){
  const cells = new Map();
  const add = (row, col) => {
    if(player.wall?.[row]?.[col]) cells.set(`${row}-${col}`, { row, col });
  };

  let horizontal = 1;
  for(let col = placement.col - 1; col >= 0 && player.wall[placement.row][col]; col -= 1){
    horizontal += 1;
    add(placement.row, col);
  }
  for(let col = placement.col + 1; col < 5 && player.wall[placement.row][col]; col += 1){
    horizontal += 1;
    add(placement.row, col);
  }

  let vertical = 1;
  for(let row = placement.row - 1; row >= 0 && player.wall[row][placement.col]; row -= 1){
    vertical += 1;
    add(row, placement.col);
  }
  for(let row = placement.row + 1; row < 5 && player.wall[row][placement.col]; row += 1){
    vertical += 1;
    add(row, placement.col);
  }

  if(horizontal > 1 || vertical > 1) add(placement.row, placement.col);
  if(!cells.size) add(placement.row, placement.col);
  return [...cells.values()];
}

function setScoringHighlight(player, cells, active){
  cells.forEach(cell => {
    const target = document.querySelector(`.wall-cell[data-seat="${player.seat}"][data-row="${cell.row}"][data-col="${cell.col}"]`);
    if(target) target.classList.toggle("scoring", active);
  });
}

function setBoardFocus(player, active){
  const board = document.querySelector(`.player-board[data-seat="${player.seat}"]`);
  if(board) board.classList.toggle("scoring-focus", active);
}

async function showRoundScorePopups(){
  if(!state?.lastRound) return Promise.resolve();
  const key = `${state.gameId}-${state.round}-${JSON.stringify(state.lastRound)}`;
  if(key === renderedScoreKey) return Promise.resolve();
  renderedScoreKey = key;
  const token = ++scoringToken;

  return new Promise(resolve => requestAnimationFrame(async () => {
    document.body.classList.add("azul-scoring");
    for(const player of (state.players || [])){
      const summary = state.lastRound[player.username];
      if(!summary) continue;
      setBoardFocus(player, true);

      for(const placement of (summary.placements || [])){
        if(token !== scoringToken){
          setBoardFocus(player, false);
          document.body.classList.remove("azul-scoring");
          return resolve();
        }
        const target = document.querySelector(`.wall-cell[data-seat="${player.seat}"][data-row="${placement.row}"][data-col="${placement.col}"]`);
        const cells = getScoringCells(player, placement);
        setScoringHighlight(player, cells, true);
        scorePopup(target, `+${placement.points}`, true);
        await delay(950);
        setScoringHighlight(player, cells, false);
        await delay(260);
      }

      if(summary.floorPenalty){
        if(token !== scoringToken){
          setBoardFocus(player, false);
          document.body.classList.remove("azul-scoring");
          return resolve();
        }
        const target = document.querySelector(`.score-pop-anchor[data-seat="${player.seat}"]`);
        document.querySelectorAll(`.player-board[data-seat="${player.seat}"] .floor-slot.has-tile`).forEach(slot => slot.classList.add("scoring"));
        scorePopup(target, String(summary.floorPenalty), false);
        await delay(950);
        document.querySelectorAll(`.player-board[data-seat="${player.seat}"] .floor-slot.scoring`).forEach(slot => slot.classList.remove("scoring"));
        await delay(260);
      }

      if(summary.bonus){
        if(token !== scoringToken){
          setBoardFocus(player, false);
          document.body.classList.remove("azul-scoring");
          return resolve();
        }
        const target = document.querySelector(`.score-pop-anchor[data-seat="${player.seat}"]`);
        document.querySelectorAll(`.player-board[data-seat="${player.seat}"] .wall-cell.placed`).forEach(cell => cell.classList.add("scoring"));
        scorePopup(target, `+${summary.bonus}`, true);
        await delay(1100);
        document.querySelectorAll(`.player-board[data-seat="${player.seat}"] .wall-cell.scoring`).forEach(cell => cell.classList.remove("scoring"));
      }
      setBoardFocus(player, false);
      await delay(260);
    }
    document.body.classList.remove("azul-scoring");
    resolve();
  }));
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

function viewBoard(){
  document.getElementById("endScreen").classList.remove("show");
  document.getElementById("showResultBtn").hidden = false;
}

function showResult(){
  document.getElementById("endScreen").classList.add("show");
  document.getElementById("showResultBtn").hidden = true;
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
  if(!data.lastRound) scoringToken += 1;
  state = {
    ...data,
    localTurnDeadlineAt: data.phase === "playing" && Number.isFinite(data.turnRemainingMs)
      ? Date.now() + data.turnRemainingMs
      : null
  };
  gameOver = Boolean(data.ended);
  selected = null;
  render();
  startTimerLoop();
});

socket.on("azul_end", async data => {
  gameOver = true;
  lastEndPayload = data;
  await scoringPromise;
  await delay(450);
  const reward = data.rewards?.[user.username] || {};
  const result = reward.result || (!data.winner ? "draw" : data.winner === user.username ? "win" : "loss");
  const xpChange = Number.isFinite(reward.xpChange) ? reward.xpChange : 0;
  const el = document.getElementById("endScreen");
  el.className = `end-screen show ${result === "win" ? "victory" : result === "loss" ? "defeat" : "draw"}`;
  document.getElementById("showResultBtn").hidden = true;
  document.getElementById("winnerText").innerText = result === "win" ? "Victory" : result === "loss" ? "Defeat" : "Draw";
  document.getElementById("endMessage").innerText = data.message || "";
  const scores = data.scores || Object.fromEntries((state?.players || []).map(player => [player.username, player.score]));
  document.getElementById("finalScores").innerHTML = Object.entries(scores)
    .map(([name, score]) => `<span>${escapeHtml(name)} <strong>${score}</strong></span>`)
    .join("");
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

socket.on("azul_notice", data => {
  const hint = document.getElementById("selectionHint");
  if(hint && data?.message) hint.innerText = data.message;
});

socket.on("azul_rematch_start", () => {
  gameOver = false;
  document.getElementById("endScreen").className = "end-screen";
  document.getElementById("rematchStatus").innerText = "";
  document.getElementById("finalScores").innerHTML = "";
});

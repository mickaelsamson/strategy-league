(() => {
  const SIZE = 9;
  const EMPTY = 0;
  const P1 = 1;
  const P2 = 2;

  let grid = [];
  let current = P1;
  let turn = 1;
  let gameOver = false;
  let seconds = 0;
  let timer = null;
  let theme = "default";

  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const turnLabel = document.getElementById("turnLabel");
  const p1Card = document.getElementById("p1Card");
  const p2Card = document.getElementById("p2Card");
  const p1Tiles = document.getElementById("p1Tiles");
  const p2Tiles = document.getElementById("p2Tiles");
  const turnCount = document.getElementById("turnCount");
  const timerA = document.getElementById("timerA");
  const resetBtn = document.getElementById("resetBtn");
  const surrenderBtn = document.getElementById("surrenderBtn");
  const winModal = document.getElementById("winModal");
  const winTitle = document.getElementById("winTitle");
  const playAgainBtn = document.getElementById("playAgainBtn");

  const dirs = [[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0]];

  function init() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
    current = P1;
    turn = 1;
    gameOver = false;
    seconds = 0;
    winModal.classList.add("hidden");
    render();
    updateUI();
    startTimer();
  }

  function startTimer() {
    clearInterval(timer);
    timerA.textContent = "00:00";
    timer = setInterval(() => {
      if (!gameOver) {
        seconds++;
        timerA.textContent = fmt(seconds);
      }
    }, 1000);
  }

  function fmt(s) {
    return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  }

  function render(path = []) {
    boardEl.innerHTML = "";
    const pathSet = new Set(path.map(([r,c]) => `${r}-${c}`));
    const hexW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hex"));
    const hexH = hexW * 1.1547;
    const xStep = hexW * 0.78;
    const yStep = hexH * 0.76;
    const w = (SIZE - 1) * xStep + hexW + (SIZE - 1) * xStep * 0.5;
    const h = (SIZE - 1) * yStep + hexH;
    boardEl.style.width = `${w}px`;
    boardEl.style.height = `${h}px`;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const btn = document.createElement("button");
        btn.className = "hex";
        btn.type = "button";
        btn.style.left = `${c * xStep + r * xStep * 0.5}px`;
        btn.style.top = `${r * yStep}px`;
        btn.style.animationDelay = `${(r+c)*13}ms`;
        btn.dataset.r = r;
        btn.dataset.c = c;
        if (grid[r][c] === P1) btn.classList.add("p1");
        if (grid[r][c] === P2) btn.classList.add("p2");
        if (pathSet.has(`${r}-${c}`)) btn.classList.add("path");
        btn.addEventListener("click", () => play(r,c));
        boardEl.appendChild(btn);
      }
    }
  }

  function play(r, c) {
    if (gameOver || grid[r][c] !== EMPTY) return;
    grid[r][c] = current;

    const path = findPath(current);
    if (path.length) {
      gameOver = true;
      clearInterval(timer);
      render(path);
      showWin(current, path);
      return;
    }

    current = current === P1 ? P2 : P1;
    turn++;
    render();
    updateUI();
  }

  function findPath(player) {
    const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    const parent = new Map();
    const queue = [];

    if (player === P1) {
      for (let r = 0; r < SIZE; r++) {
        if (grid[r][0] === P1) {
          queue.push([r,0]);
          visited[r][0] = true;
          parent.set(`${r}-0`, null);
        }
      }
    } else {
      for (let c = 0; c < SIZE; c++) {
        if (grid[0][c] === P2) {
          queue.push([0,c]);
          visited[0][c] = true;
          parent.set(`0-${c}`, null);
        }
      }
    }

    while (queue.length) {
      const [r,c] = queue.shift();
      if ((player === P1 && c === SIZE-1) || (player === P2 && r === SIZE-1)) {
        return reconstruct(parent, r, c);
      }

      for (const [dr,dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !visited[nr][nc] && grid[nr][nc] === player) {
          visited[nr][nc] = true;
          parent.set(`${nr}-${nc}`, [r,c]);
          queue.push([nr,nc]);
        }
      }
    }
    return [];
  }

  function reconstruct(parent, r, c) {
    const path = [];
    let key = `${r}-${c}`;
    while (key) {
      const [cr,cc] = key.split("-").map(Number);
      path.push([cr,cc]);
      const prev = parent.get(key);
      key = prev ? `${prev[0]}-${prev[1]}` : null;
    }
    return path;
  }

  function updateUI() {
    const counts = grid.flat().reduce((a,v) => {
      if (v === P1) a.p1++;
      if (v === P2) a.p2++;
      return a;
    }, {p1:0, p2:0});

    p1Tiles.textContent = counts.p1;
    p2Tiles.textContent = counts.p2;
    turnCount.textContent = turn;

    const p1 = current === P1;
    statusEl.textContent = p1 ? "YOUR TURN" : "RIVAL TURN";
    turnLabel.textContent = p1 ? "CRIMSON TURN" : "LUNAR TURN";
    p1Card.classList.toggle("active", p1);
    p2Card.classList.toggle("active", !p1);
  }

  function showWin(player, path) {
    const crimson = player === P1;
    winTitle.textContent = crimson ? "CRIMSON WINS" : "LUNAR WINS";
    statusEl.textContent = crimson ? "CRIMSON VICTORY" : "LUNAR VICTORY";
    winModal.classList.remove("hidden");

    window.dispatchEvent(new CustomEvent("hexblitz:gameover", {
      detail: {
        winner: crimson ? "crimson" : "lunar",
        turns: turn,
        durationSeconds: seconds,
        pathLength: path.length,
        xp: 35
      }
    }));
  }

  function surrender() {
    if (gameOver) return;
    gameOver = true;
    clearInterval(timer);
    showWin(current === P1 ? P2 : P1, []);
  }

  document.querySelectorAll(".skin-buttons button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".skin-buttons button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.body.classList.remove("theme-fire","theme-ice","theme-shadow");
      theme = btn.dataset.theme;
      if (theme !== "default") document.body.classList.add(`theme-${theme}`);
    });
  });

  resetBtn.addEventListener("click", init);
  playAgainBtn.addEventListener("click", init);
  surrenderBtn.addEventListener("click", surrender);
  document.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "r") init();
  });
  window.addEventListener("resize", () => render());

  init();
})();


// === ULTIMATE POLISH ===
let lastMove = null;

function highlightLastMove(r,c){
  lastMove = `${r}-${c}`;
  document.querySelectorAll('.hex').forEach(h=>{
    if(h.dataset.r+'-'+h.dataset.c === lastMove){
      h.style.outline = '2px solid gold';
    } else {
      h.style.outline = 'none';
    }
  });
}

const originalPlay = play;
play = function(r,c){
  originalPlay(r,c);
  highlightLastMove(r,c);
  playSound("place");
};

function playSound(type){
  const audio = new Audio();
  if(type==="place") audio.src="";
  if(type==="win") audio.src="";
  audio.volume=0.2;
  audio.play().catch(()=>{});
}

const originalShowWin = showWin;
showWin = function(player,path){
  originalShowWin(player,path);
  playSound("win");
  document.body.classList.add("screen-shake");
  setTimeout(()=>document.body.classList.remove("screen-shake"),600);
};

(() => {
  const ROWS = 6;
  const COLS = 7;
  const EMPTY = 0;
  const P1 = 1;
  const P2 = 2;

  let grid = [];
  let currentPlayer = P1;
  let gameOver = false;
  let selectedCol = 3;
  let turn = 1;
  let seconds = 0;
  let timerId = null;

  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const selectedOrbEl = document.getElementById("selectedOrb");
  const resetBtn = document.getElementById("resetBtn");
  const backBtn = document.getElementById("backBtn");
  const leftSelect = document.getElementById("leftSelect");
  const rightSelect = document.getElementById("rightSelect");
  const timerEl = document.getElementById("timer");
  const turnCountEl = document.getElementById("turnCount");
  const winCard = document.getElementById("winCard");
  const winTitle = document.getElementById("winTitle");
  const winText = document.getElementById("winText");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const menuBtn = document.getElementById("menuBtn");

  function init() {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
    currentPlayer = P1;
    gameOver = false;
    selectedCol = 3;
    turn = 1;
    seconds = 0;
    winCard.classList.add("hidden");
    renderBoard();
    updateUI();
    startTimer();
  }

  function startTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => {
      if (!gameOver) {
        seconds++;
        timerEl.textContent = formatTime(seconds);
      }
    }, 1000);
  }

  function formatTime(total) {
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function renderBoard(winCells = []) {
    boardEl.innerHTML = "";
    const winKey = new Set(winCells.map(([r, c]) => `${r}-${c}`));

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement("button");
        cell.className = "cell";
        cell.type = "button";
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.setAttribute("aria-label", `Column ${c + 1}, row ${r + 1}`);
        cell.addEventListener("click", () => dropOrb(c));

        const value = grid[r][c];
        if (value !== EMPTY) {
          const orb = document.createElement("span");
          orb.className = `orb p${value}`;
          if (winKey.has(`${r}-${c}`)) orb.classList.add("win");
          cell.appendChild(orb);
        }

        boardEl.appendChild(cell);
      }
    }
  }

  function dropOrb(col) {
    if (gameOver) return;

    const row = getAvailableRow(col);
    if (row === -1) {
      statusEl.textContent = "COLUMN FULL";
      return;
    }

    grid[row][col] = currentPlayer;
    selectedCol = col;

    const winCells = getWinningCells(row, col, currentPlayer);
    if (winCells.length) {
      gameOver = true;
      renderBoard(winCells);
      showWin(currentPlayer);
      return;
    }

    if (isDraw()) {
      gameOver = true;
      renderBoard();
      showDraw();
      return;
    }

    currentPlayer = currentPlayer === P1 ? P2 : P1;
    turn++;
    renderBoard();
    updateUI();
  }

  function getAvailableRow(col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][col] === EMPTY) return r;
    }
    return -1;
  }

  function isDraw() {
    return grid[0].every(cell => cell !== EMPTY);
  }

  function getWinningCells(row, col, player) {
    const directions = [
      [[0, 1], [0, -1]],
      [[1, 0], [-1, 0]],
      [[1, 1], [-1, -1]],
      [[1, -1], [-1, 1]],
    ];

    for (const pair of directions) {
      const cells = [[row, col]];

      for (const [dr, dc] of pair) {
        let r = row + dr;
        let c = col + dc;

        while (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c] === player) {
          cells.push([r, c]);
          r += dr;
          c += dc;
        }
      }

      if (cells.length >= 4) return cells;
    }

    return [];
  }

  function updateUI() {
    statusEl.textContent = currentPlayer === P1 ? "YOUR TURN" : "RIVAL TURN";
    statusEl.style.color = currentPlayer === P1 ? "#f5efe8" : "#e84955";
    selectedOrbEl.classList.toggle("enemy-selected", currentPlayer === P2);
    turnCountEl.textContent = String(turn);
  }

  function showWin(player) {
    clearInterval(timerId);
    statusEl.textContent = player === P1 ? "VICTORY" : "DEFEAT";
    winTitle.textContent = player === P1 ? "VICTORY" : "DEFEAT";
    winText.textContent = player === P1
      ? "You have aligned 4 moon orbs."
      : "Your rival claimed the moonfall.";
    winCard.classList.remove("hidden");

    // Integration hook for your global XP system.
    // Your main site can listen to this event.
    window.dispatchEvent(new CustomEvent("moonfall:gameover", {
      detail: {
        winner: player === P1 ? "player" : "rival",
        turns: turn,
        durationSeconds: seconds,
        xp: player === P1 ? 25 : 8
      }
    }));
  }

  function showDraw() {
    clearInterval(timerId);
    statusEl.textContent = "DRAW";
    winTitle.textContent = "DRAW";
    winText.textContent = "The moon remains unclaimed.";
    winCard.classList.remove("hidden");

    window.dispatchEvent(new CustomEvent("moonfall:gameover", {
      detail: {
        winner: "draw",
        turns: turn,
        durationSeconds: seconds,
        xp: 12
      }
    }));
  }

  function moveSelection(delta) {
    selectedCol = (selectedCol + delta + COLS) % COLS;
    const topCell = boardEl.querySelector(`[data-row="0"][data-col="${selectedCol}"]`);
    if (topCell) {
      topCell.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      topCell.animate([
        { boxShadow: "0 0 0 rgba(232,73,85,0)" },
        { boxShadow: "0 0 28px rgba(232,73,85,0.9)" },
        { boxShadow: "0 0 0 rgba(232,73,85,0)" }
      ], { duration: 500 });
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") moveSelection(-1);
    if (event.key === "ArrowRight") moveSelection(1);
    if (event.key === "Enter" || event.key === " ") dropOrb(selectedCol);
    if (event.key >= "1" && event.key <= "7") dropOrb(Number(event.key) - 1);
  });

  leftSelect.addEventListener("click", () => moveSelection(-1));
  rightSelect.addEventListener("click", () => moveSelection(1));
  resetBtn.addEventListener("click", init);
  playAgainBtn.addEventListener("click", init);
  menuBtn.addEventListener("click", () => {
    window.location.href = "../";
  });
  backBtn.addEventListener("click", () => {
    window.location.href = "../";
  });

  init();
})();

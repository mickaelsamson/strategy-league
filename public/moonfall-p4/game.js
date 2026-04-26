(() => {
  const ROWS = 6;
  const COLS = 7;
  const EMPTY = 0;
  const P1 = 1;
  const P2 = 2;

  const dom = {
    setupView: document.getElementById('setupView'),
    gameView: document.getElementById('gameView'),
    localModeBtn: document.getElementById('localModeBtn'),
    onlineModeBtn: document.getElementById('onlineModeBtn'),
    localSetupPanel: document.getElementById('localSetupPanel'),
    onlineSetupPanel: document.getElementById('onlineSetupPanel'),
    startLocalBtn: document.getElementById('startLocalBtn'),
    onlineLobbyName: document.getElementById('onlineLobbyName'),
    createOnlineLobbyBtn: document.getElementById('createOnlineLobbyBtn'),
    refreshOnlineBtn: document.getElementById('refreshOnlineBtn'),
    onlineLobbyStatus: document.getElementById('onlineLobbyStatus'),
    onlineLobbyMeta: document.getElementById('onlineLobbyMeta'),
    onlineLobbyList: document.getElementById('onlineLobbyList'),
    board: document.getElementById('board'),
    status: document.getElementById('status'),
    selectedOrb: document.getElementById('selectedOrb'),
    resetBtn: document.getElementById('resetBtn'),
    backBtn: document.getElementById('backBtn'),
    leftSelect: document.getElementById('leftSelect'),
    rightSelect: document.getElementById('rightSelect'),
    timer: document.getElementById('timer'),
    turnCount: document.getElementById('turnCount'),
    modeLabel: document.getElementById('modeLabel'),
    winCard: document.getElementById('winCard'),
    winTitle: document.getElementById('winTitle'),
    winText: document.getElementById('winText'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    menuBtn: document.getElementById('menuBtn'),
    surrenderBtn: document.getElementById('surrenderBtn'),
    youName: document.getElementById('youName'),
    enemyName: document.getElementById('enemyName'),
    youRole: document.getElementById('youRole'),
    enemyRole: document.getElementById('enemyRole')
  };

  const user = getUser();
  const socket = typeof window.io === 'function' && user?.username ? window.io() : null;
  if(socket){
    window.StrategyLeagueSocket = socket;
  }

  const online = {
    available: Boolean(socket),
    setupMode: 'local',
    lobbies: {},
    currentLobbyId: null,
    gameId: null,
    hostUsername: null,
    players: [],
    me: user?.username || 'Player'
  };

  const state = {
    grid: createEmptyGrid(),
    currentPlayer: P1,
    selectedCol: 3,
    turn: 1,
    gameOver: false,
    winner: null,
    winningCells: [],
    startedAt: Date.now(),
    startedAtMs: Date.now()
  };

  let timerId = null;

  function getUser(){
    try{
      return JSON.parse(localStorage.getItem('user') || 'null');
    }catch(_err){
      return null;
    }
  }

  function escapeHtml(text){
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function createEmptyGrid(){
    return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
  }

  function isOnlineGame(){
    return Boolean(online.gameId);
  }

  function isHost(){
    return online.hostUsername === online.me;
  }

  function playerTokenForUsername(username){
    return online.players[0] === username ? P1 : P2;
  }

  function myToken(){
    if(!isOnlineGame()) return null;
    return playerTokenForUsername(online.me);
  }

  function secondsElapsed(){
    return Math.max(0, Math.floor((Date.now() - state.startedAtMs) / 1000));
  }

  function formatTime(total){
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function startTimer(){
    clearInterval(timerId);
    timerId = setInterval(() => {
      dom.timer.textContent = formatTime(secondsElapsed());
    }, 1000);
    dom.timer.textContent = formatTime(secondsElapsed());
  }

  function resetState(){
    state.grid = createEmptyGrid();
    state.currentPlayer = P1;
    state.selectedCol = 3;
    state.turn = 1;
    state.gameOver = false;
    state.winner = null;
    state.winningCells = [];
    state.startedAt = Date.now();
    state.startedAtMs = Date.now();
  }

  function getAvailableRow(col){
    for(let row = ROWS - 1; row >= 0; row -= 1){
      if(state.grid[row][col] === EMPTY) return row;
    }
    return -1;
  }

  function isDraw(){
    return state.grid[0].every(cell => cell !== EMPTY);
  }

  function getWinningCells(row, col, player){
    const dirs = [
      [[0, 1], [0, -1]],
      [[1, 0], [-1, 0]],
      [[1, 1], [-1, -1]],
      [[1, -1], [-1, 1]]
    ];

    for(const pair of dirs){
      const cells = [[row, col]];
      for(const [dr, dc] of pair){
        let r = row + dr;
        let c = col + dc;
        while(r >= 0 && r < ROWS && c >= 0 && c < COLS && state.grid[r][c] === player){
          cells.push([r, c]);
          r += dr;
          c += dc;
        }
      }
      if(cells.length >= 4) return cells;
    }

    return [];
  }

  function syncOnlineState(){
    if(!isOnlineGame() || !isHost() || !socket) return;

    socket.emit('moonfall_p4_sync_state', {
      gameId: online.gameId,
      snapshot: {
        grid: state.grid,
        currentPlayer: state.currentPlayer,
        selectedCol: state.selectedCol,
        turn: state.turn,
        gameOver: state.gameOver,
        winner: state.winner,
        winningCells: state.winningCells,
        startedAt: state.startedAt,
        players: online.players
      }
    });
  }

  function applyDrop(col, actorUsername = null){
    if(state.gameOver) return false;

    if(col < 0 || col >= COLS) return false;

    if(isOnlineGame()){
      const expectedToken = state.currentPlayer;
      const actorToken = playerTokenForUsername(actorUsername || online.me);
      if(actorToken !== expectedToken) return false;
    }

    const row = getAvailableRow(col);
    if(row === -1) return false;

    state.grid[row][col] = state.currentPlayer;
    state.selectedCol = col;

    const winCells = getWinningCells(row, col, state.currentPlayer);
    if(winCells.length){
      state.gameOver = true;
      state.winner = state.currentPlayer;
      state.winningCells = winCells;
      renderBoard();
      showWin();
      return true;
    }

    if(isDraw()){
      state.gameOver = true;
      state.winner = null;
      state.winningCells = [];
      renderBoard();
      showDraw();
      return true;
    }

    state.currentPlayer = state.currentPlayer === P1 ? P2 : P1;
    state.turn += 1;
    renderBoard();
    updateUI();
    return true;
  }

  function handleRemoteAction(username, action){
    if(!isHost() || !action || typeof action !== 'object') return;

    if(action.type === 'drop'){
      if(typeof action.col !== 'number') return;
      if(applyDrop(action.col, username)) syncOnlineState();
      return;
    }

    if(action.type === 'reset'){
      resetState();
      renderBoard();
      updateUI();
      syncOnlineState();
      return;
    }

    if(action.type === 'surrender'){
      if(state.gameOver) return;
      const actorToken = playerTokenForUsername(username);
      state.gameOver = true;
      state.winner = actorToken === P1 ? P2 : P1;
      state.winningCells = [];
      renderBoard();
      showWin(actorToken === P1 ? P2 : P1, true);
      syncOnlineState();
    }
  }

  function renderBoard(){
    dom.board.innerHTML = '';
    const winningSet = new Set((state.winningCells || []).map(([r, c]) => `${r}-${c}`));

    for(let r = 0; r < ROWS; r += 1){
      for(let c = 0; c < COLS; c += 1){
        const cell = document.createElement('button');
        cell.className = 'cell';
        cell.type = 'button';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.setAttribute('aria-label', `Column ${c + 1}, row ${r + 1}`);

        if(r === 0 && c === state.selectedCol && !state.gameOver) cell.classList.add('selecting');

        cell.addEventListener('click', () => {
          if(isOnlineGame()){
            if(!socket || !isPlayersTurn()) return;
            if(isHost()){
              if(applyDrop(c, online.me)) syncOnlineState();
            }else{
              socket.emit('moonfall_p4_action', { gameId: online.gameId, action: { type: 'drop', col: c } });
            }
            return;
          }

          applyDrop(c);
        });

        const value = state.grid[r][c];
        if(value !== EMPTY){
          const orb = document.createElement('span');
          orb.className = `orb p${value}`;
          if(winningSet.has(`${r}-${c}`)) orb.classList.add('win');
          cell.appendChild(orb);
        }

        dom.board.appendChild(cell);
      }
    }
  }

  function isPlayersTurn(){
    if(!isOnlineGame()) return !state.gameOver;
    return !state.gameOver && myToken() === state.currentPlayer;
  }

  function updatePlayerCards(){
    if(!isOnlineGame()){
      dom.youName.textContent = 'YOU';
      dom.enemyName.textContent = 'RIVAL';
      dom.youRole.textContent = 'Player 1';
      dom.enemyRole.textContent = 'Player 2';
      return;
    }

    const p1 = online.players[0] || 'Player 1';
    const p2 = online.players[1] || 'Player 2';
    const meIsP1 = online.me === p1;

    dom.youName.textContent = online.me;
    dom.enemyName.textContent = meIsP1 ? p2 : p1;
    dom.youRole.textContent = meIsP1 ? 'Red orbs' : 'Ivory orbs';
    dom.enemyRole.textContent = meIsP1 ? 'Ivory orbs' : 'Red orbs';
  }

  function updateUI(){
    updatePlayerCards();

    const currentIsP1 = state.currentPlayer === P1;
    dom.turnCount.textContent = String(state.turn);

    if(state.gameOver){
      dom.status.textContent = state.winner ? 'VICTORY' : 'DRAW';
    }else if(isOnlineGame()){
      const token = myToken();
      const myTurn = token === state.currentPlayer;
      dom.status.textContent = myTurn ? 'YOUR TURN' : 'RIVAL TURN';
      dom.status.style.color = myTurn ? '#f5efe8' : '#e84955';
    }else{
      dom.status.textContent = currentIsP1 ? 'PLAYER 1 TURN' : 'PLAYER 2 TURN';
      dom.status.style.color = currentIsP1 ? '#f5efe8' : '#e84955';
    }

    dom.selectedOrb.classList.toggle('enemy-selected', !currentIsP1);
    dom.modeLabel.textContent = isOnlineGame() ? 'Online' : 'Local';
  }

  function showWin(forcedWinner = null, surrendered = false){
    const winnerToken = forcedWinner || state.winner;
    const localWin = !isOnlineGame() ? winnerToken === P1 : myToken() === winnerToken;

    dom.winTitle.textContent = localWin ? 'VICTORY' : 'DEFEAT';
    dom.winText.textContent = surrendered
      ? (localWin ? 'Opponent surrendered.' : 'You surrendered.')
      : (localWin ? 'You aligned 4 moon orbs.' : 'Your rival aligned 4 moon orbs.');
    dom.winCard.classList.remove('hidden');

    window.dispatchEvent(new CustomEvent('moonfall:gameover', {
      detail: {
        winner: state.winner === P1 ? 'player' : state.winner === P2 ? 'rival' : 'draw',
        turns: state.turn,
        durationSeconds: secondsElapsed(),
        xp: localWin ? 25 : 8,
        online: isOnlineGame()
      }
    }));

    updateUI();
  }

  function showDraw(){
    dom.winTitle.textContent = 'DRAW';
    dom.winText.textContent = 'The moon remains unclaimed.';
    dom.winCard.classList.remove('hidden');
    updateUI();
  }

  function goToSetup(){
    online.gameId = null;
    online.hostUsername = null;
    online.players = [];

    dom.gameView.classList.add('is-hidden');
    dom.gameView.hidden = true;
    dom.setupView.classList.remove('is-hidden');
    dom.setupView.hidden = false;
    dom.winCard.classList.add('hidden');
    renderOnlineLobbies();
  }

  function startGameView(){
    dom.setupView.classList.add('is-hidden');
    dom.setupView.hidden = true;
    dom.gameView.classList.remove('is-hidden');
    dom.gameView.hidden = false;
    dom.winCard.classList.add('hidden');

    renderBoard();
    updateUI();
    startTimer();
  }

  function startLocalGame(){
    online.gameId = null;
    online.hostUsername = null;
    online.players = [];
    resetState();
    startGameView();
  }

  function applySnapshot(snapshot){
    if(!snapshot) return;
    state.grid = Array.isArray(snapshot.grid) ? snapshot.grid : createEmptyGrid();
    state.currentPlayer = snapshot.currentPlayer === P2 ? P2 : P1;
    state.selectedCol = Number.isInteger(snapshot.selectedCol) ? snapshot.selectedCol : 3;
    state.turn = Math.max(1, Number(snapshot.turn) || 1);
    state.gameOver = Boolean(snapshot.gameOver);
    state.winner = snapshot.winner === P1 || snapshot.winner === P2 ? snapshot.winner : null;
    state.winningCells = Array.isArray(snapshot.winningCells) ? snapshot.winningCells : [];
    state.startedAt = Number(snapshot.startedAt) || Date.now();
    state.startedAtMs = state.startedAt;

    if(Array.isArray(snapshot.players) && snapshot.players.length === 2){
      online.players = snapshot.players;
    }

    renderBoard();
    updateUI();
    if(state.gameOver){
      if(state.winner) showWin();
      else showDraw();
    }
  }

  function setSetupMode(mode){
    online.setupMode = mode;
    const local = mode === 'local';
    dom.localModeBtn.classList.toggle('is-active', local);
    dom.onlineModeBtn.classList.toggle('is-active', !local);
    dom.localSetupPanel.classList.toggle('is-hidden', !local);
    dom.localSetupPanel.hidden = !local;
    dom.onlineSetupPanel.classList.toggle('is-hidden', local);
    dom.onlineSetupPanel.hidden = local;
  }

  function renderOnlineLobbies(){
    if(!online.available){
      dom.onlineLobbyStatus.textContent = 'Sign in to use online mode.';
      dom.onlineLobbyMeta.textContent = 'Socket unavailable.';
      dom.onlineLobbyList.innerHTML = '';
      return;
    }

    const list = Object.values(online.lobbies || {});
    if(!list.length){
      dom.onlineLobbyStatus.textContent = 'No lobby yet.';
      dom.onlineLobbyMeta.textContent = 'Create one and invite another player.';
      dom.onlineLobbyList.innerHTML = '<div class="online-lobby-card"><p>No active lobby for now.</p></div>';
      return;
    }

    const meLobby = list.find(lobby => lobby.players.some(player => player.username === online.me));
    online.currentLobbyId = meLobby?.id || null;

    if(meLobby){
      dom.onlineLobbyStatus.textContent = `You are in ${meLobby.name}.`;
      dom.onlineLobbyMeta.textContent = 'Ready up when both players are in.';
    }else{
      dom.onlineLobbyStatus.textContent = 'Choose a lobby or create one.';
      dom.onlineLobbyMeta.textContent = '1v1 online duel.';
    }

    dom.onlineLobbyList.innerHTML = list.map(lobby => {
      const me = lobby.players.find(player => player.username === online.me);
      const isFull = lobby.players.length >= (lobby.maxPlayers || 2);
      const action = !me
        ? (isFull ? '<button class="secondary-btn" type="button" disabled>Full</button>' : `<button class="primary-btn" type="button" data-action="join" data-id="${lobby.id}">Join</button>`)
        : `<button class="primary-btn" type="button" data-action="ready" data-id="${lobby.id}">${me.ready ? 'Cancel ready' : 'Ready up'}</button>`;
      const leaveBtn = me ? `<button class="secondary-btn" type="button" data-action="leave" data-id="${lobby.id}">Leave</button>` : '<span></span>';

      return `
        <article class="online-lobby-card">
          <strong>${escapeHtml(lobby.name)}</strong>
          <p>${lobby.players.length}/${lobby.maxPlayers || 2} players</p>
          <p>${lobby.players.map(player => `${escapeHtml(player.username)} ${player.ready ? 'Ready' : 'Waiting'}`).join(' · ')}</p>
          <div class="lobby-actions">
            ${action}
            ${leaveBtn}
          </div>
        </article>
      `;
    }).join('');

    dom.onlineLobbyList.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.id;
        if(!socket || !id) return;
        if(button.dataset.action === 'join') socket.emit('join_moonfall_p4_lobby', id);
        if(button.dataset.action === 'ready') socket.emit('toggle_moonfall_p4_ready', id);
        if(button.dataset.action === 'leave') socket.emit('leave_moonfall_p4_lobby', id);
      });
    });
  }

  function registerSocket(){
    if(!socket || !online.me) return;

    socket.emit('register_online', online.me);

    socket.on('online_users', users => {
      window.dispatchEvent(new CustomEvent('site-shell-online-users', { detail: users }));
    });

    socket.on('moonfall_p4_lobbies_update', lobbies => {
      online.lobbies = lobbies || {};
      renderOnlineLobbies();
    });

    socket.on('moonfall_p4_notice', payload => {
      if(payload?.message) dom.status.textContent = payload.message;
    });

    socket.on('moonfall_p4_start', payload => {
      online.gameId = payload?.gameId || null;
      online.hostUsername = payload?.hostUsername || null;
      online.players = Array.isArray(payload?.players)
        ? payload.players.map(player => player.username).filter(Boolean)
        : [];

      if(online.players.length < 2){
        online.players = [online.hostUsername, online.me].filter(Boolean);
      }

      startGameView();

      if(payload?.hasSnapshot){
        return;
      }

      if(isHost()){
        resetState();
        renderBoard();
        updateUI();
        syncOnlineState();
      }
    });

    socket.on('moonfall_p4_state', payload => {
      if(payload?.gameId && online.gameId && payload.gameId !== online.gameId) return;
      applySnapshot(payload?.snapshot);
    });

    socket.on('moonfall_p4_action_request', payload => {
      if(!isHost()) return;
      if(payload?.gameId !== online.gameId) return;
      handleRemoteAction(payload?.username, payload?.action);
    });
  }

  function isGameDisabled(){
    return false;
  }

  function initEvents(){
    dom.localModeBtn.addEventListener('click', () => setSetupMode('local'));
    dom.onlineModeBtn.addEventListener('click', () => setSetupMode('online'));
    dom.startLocalBtn.addEventListener('click', startLocalGame);

    dom.createOnlineLobbyBtn.addEventListener('click', () => {
      if(!socket || isGameDisabled()) return;
      socket.emit('create_moonfall_p4_lobby', { name: dom.onlineLobbyName.value, maxPlayers: 2 });
    });

    dom.refreshOnlineBtn.addEventListener('click', () => renderOnlineLobbies());

    dom.leftSelect.addEventListener('click', () => {
      state.selectedCol = (state.selectedCol - 1 + COLS) % COLS;
      renderBoard();
    });

    dom.rightSelect.addEventListener('click', () => {
      state.selectedCol = (state.selectedCol + 1) % COLS;
      renderBoard();
    });

    dom.resetBtn.addEventListener('click', () => {
      if(isOnlineGame()){
        if(!socket) return;
        if(isHost()){
          resetState();
          renderBoard();
          updateUI();
          syncOnlineState();
        }else{
          socket.emit('moonfall_p4_action', { gameId: online.gameId, action: { type: 'reset' } });
        }
        return;
      }

      resetState();
      renderBoard();
      updateUI();
    });

    dom.surrenderBtn.addEventListener('click', () => {
      if(state.gameOver) return;

      if(isOnlineGame()){
        if(!socket) return;
        if(isHost()){
          const token = myToken();
          state.gameOver = true;
          state.winner = token === P1 ? P2 : P1;
          state.winningCells = [];
          showWin(state.winner, true);
          syncOnlineState();
        }else{
          socket.emit('moonfall_p4_action', { gameId: online.gameId, action: { type: 'surrender' } });
        }
        return;
      }

      state.gameOver = true;
      state.winner = state.currentPlayer === P1 ? P2 : P1;
      showWin(state.winner, true);
    });

    dom.playAgainBtn.addEventListener('click', () => {
      if(isOnlineGame()){
        dom.resetBtn.click();
        return;
      }
      resetState();
      renderBoard();
      updateUI();
      dom.winCard.classList.add('hidden');
    });

    dom.menuBtn.addEventListener('click', goToSetup);
    dom.backBtn.addEventListener('click', goToSetup);

    document.addEventListener('keydown', event => {
      if(dom.gameView.classList.contains('is-hidden')) return;
      if(event.key === 'ArrowLeft') dom.leftSelect.click();
      if(event.key === 'ArrowRight') dom.rightSelect.click();
      if(event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const col = state.selectedCol;
        if(isOnlineGame()){
          if(!socket || !isPlayersTurn()) return;
          if(isHost()){
            if(applyDrop(col, online.me)) syncOnlineState();
          }else{
            socket.emit('moonfall_p4_action', { gameId: online.gameId, action: { type: 'drop', col } });
          }
        }else{
          applyDrop(col);
        }
      }

      if(event.key >= '1' && event.key <= '7'){
        const col = Number(event.key) - 1;
        state.selectedCol = col;
        renderBoard();
        if(isOnlineGame()){
          if(!socket || !isPlayersTurn()) return;
          if(isHost()){
            if(applyDrop(col, online.me)) syncOnlineState();
          }else{
            socket.emit('moonfall_p4_action', { gameId: online.gameId, action: { type: 'drop', col } });
          }
        }else{
          applyDrop(col);
        }
      }
    });
  }

  function init(){
    if(!user){
      window.location.href = '/login.html';
      return;
    }

    setSetupMode('local');
    resetState();
    renderBoard();
    updateUI();
    startTimer();
    initEvents();
    renderOnlineLobbies();
    registerSocket();
  }

  init();
})();

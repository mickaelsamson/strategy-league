(() => {
  const SIZE = 9;
  const EMPTY = 0;
  const P1 = 1;
  const P2 = 2;
  const dirs = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]];
  const tutorialMode = new URLSearchParams(window.location.search).get('tutorial') === '1';
  const TUTORIAL_STEPS = [
    { title: 'Build a bridge', body: 'You play Crimson. Build connected threats instead of isolated stones.', tips: ['Crimson connects left to right.', 'A bridge gives you two ways to reconnect if the AI blocks one.'] },
    { title: 'Block the cut', body: 'The Lunar AI wants to split your chain. Defend only when the cut is urgent.', tips: ['A good defensive move also keeps your path alive.', 'Do not chase random stones far from your route.'] },
    { title: 'Finish the path', body: 'When a direct connection is available, take it immediately.', tips: ['Hex has no draws.', 'The winner is the first full connected path, not the player with most stones.'] }
  ];

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
    turnLabel: document.getElementById('turnLabel'),
    p1Card: document.getElementById('p1Card'),
    p2Card: document.getElementById('p2Card'),
    p1Name: document.getElementById('p1Name'),
    p2Name: document.getElementById('p2Name'),
    p1Tiles: document.getElementById('p1Tiles'),
    p2Tiles: document.getElementById('p2Tiles'),
    turnCount: document.getElementById('turnCount'),
    timerA: document.getElementById('timerA'),
    resetBtn: document.getElementById('resetBtn'),
    surrenderBtn: document.getElementById('surrenderBtn'),
    backBtn: document.getElementById('backBtn'),
    winModal: document.getElementById('winModal'),
    winTitle: document.getElementById('winTitle'),
    playAgainBtn: document.getElementById('playAgainBtn')
  };

  const user = getUser();
  let pendingInviteLobbyId = new URLSearchParams(window.location.search).get('inviteLobbyId');
  const socket = !tutorialMode && typeof window.io === 'function' && user?.username ? window.io() : null;
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
    current: P1,
    turn: 1,
    gameOver: false,
    winner: null,
    path: [],
    startedAt: Date.now(),
    startedAtMs: Date.now()
  };

  let timerId = null;
  let tutorialGuide = null;
  let tutorialAiTimer = null;

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
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
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

  function formatTime(total){
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function secondsElapsed(){
    return Math.max(0, Math.floor((Date.now() - state.startedAtMs) / 1000));
  }

  function startTimer(){
    clearInterval(timerId);
    timerId = setInterval(() => {
      dom.timerA.textContent = formatTime(secondsElapsed());
    }, 1000);
    dom.timerA.textContent = formatTime(secondsElapsed());
  }

  function resetState(){
    clearTimeout(tutorialAiTimer);
    state.grid = createEmptyGrid();
    state.current = P1;
    state.turn = 1;
    state.gameOver = false;
    state.winner = null;
    state.path = [];
    state.startedAt = Date.now();
    state.startedAtMs = Date.now();
  }

  function reconstruct(parent, r, c){
    const path = [];
    let key = `${r}-${c}`;
    while(key){
      const [cr, cc] = key.split('-').map(Number);
      path.push([cr, cc]);
      const prev = parent.get(key);
      key = prev ? `${prev[0]}-${prev[1]}` : null;
    }
    return path;
  }

  function findPath(player){
    const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    const parent = new Map();
    const queue = [];

    if(player === P1){
      for(let r = 0; r < SIZE; r += 1){
        if(state.grid[r][0] === P1){
          queue.push([r, 0]);
          visited[r][0] = true;
          parent.set(`${r}-0`, null);
        }
      }
    }else{
      for(let c = 0; c < SIZE; c += 1){
        if(state.grid[0][c] === P2){
          queue.push([0, c]);
          visited[0][c] = true;
          parent.set(`0-${c}`, null);
        }
      }
    }

    while(queue.length){
      const [r, c] = queue.shift();
      if((player === P1 && c === SIZE - 1) || (player === P2 && r === SIZE - 1)){
        return reconstruct(parent, r, c);
      }

      for(const [dr, dc] of dirs){
        const nr = r + dr;
        const nc = c + dc;
        if(nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !visited[nr][nc] && state.grid[nr][nc] === player){
          visited[nr][nc] = true;
          parent.set(`${nr}-${nc}`, [r, c]);
          queue.push([nr, nc]);
        }
      }
    }

    return [];
  }

  function syncOnlineState(){
    if(!isOnlineGame() || !isHost() || !socket) return;
    socket.emit('hexblitz_sync_state', {
      gameId: online.gameId,
      snapshot: {
        grid: state.grid,
        current: state.current,
        turn: state.turn,
        gameOver: state.gameOver,
        winner: state.winner,
        path: state.path,
        startedAt: state.startedAt,
        players: online.players
      }
    });
  }

  function wouldHexWin(r, c, player){
    if(state.grid[r]?.[c] !== EMPTY) return false;
    state.grid[r][c] = player;
    const win = findPath(player).length > 0;
    state.grid[r][c] = EMPTY;
    return win;
  }

  function scoreAiHex(r, c){
    if(state.grid[r]?.[c] !== EMPTY) return -999;
    if(wouldHexWin(r, c, P2)) return 1000;
    if(wouldHexWin(r, c, P1)) return 900;
    const center = 4 - (Math.abs(4 - r) + Math.abs(4 - c)) * 0.4;
    const topBottom = 5 - Math.min(r, SIZE - 1 - r);
    return center + topBottom + Math.random();
  }

  function chooseAiHex(){
    const moves = [];
    for(let r = 0; r < SIZE; r += 1){
      for(let c = 0; c < SIZE; c += 1){
        if(state.grid[r][c] === EMPTY) moves.push({ r, c, score: scoreAiHex(r, c) });
      }
    }
    return moves.sort((a, b) => b.score - a.score)[0] || null;
  }

  function updateTutorialGuide(){
    if(!tutorialMode || !tutorialGuide) return;
    tutorialGuide.setStep(Math.min(TUTORIAL_STEPS.length - 1, Math.floor((state.turn - 1) / 8)));
  }

  function scheduleTutorialAi(){
    if(!tutorialMode || state.gameOver || state.current !== P2) return;
    clearTimeout(tutorialAiTimer);
    tutorialGuide?.message('Coach AI is choosing a Lunar reply. Watch whether it cuts your chain or extends top-to-bottom.', [
      'Your next move should either reconnect your path or create a stronger bridge.'
    ]);
    tutorialAiTimer = setTimeout(() => {
      if(!tutorialMode || state.gameOver || state.current !== P2) return;
      const move = chooseAiHex();
      if(move){
        claimHex(move.r, move.c);
        if(!state.gameOver){
          tutorialGuide?.message('Coach AI moved. Keep building Crimson left-to-right, but block an urgent Lunar cut when needed.', [
            'Connected threats beat isolated stones.'
          ]);
        }
      }
    }, 650);
  }

  function claimHex(r, c, actorUsername = null){
    if(state.gameOver || state.grid[r][c] !== EMPTY) return false;

    if(isOnlineGame()){
      const actorToken = playerTokenForUsername(actorUsername || online.me);
      if(actorToken !== state.current) return false;
    }

    state.grid[r][c] = state.current;

    const path = findPath(state.current);
    if(path.length){
      state.gameOver = true;
      state.winner = state.current;
      state.path = path;
      render(path);
      showWin();
      return true;
    }

    state.current = state.current === P1 ? P2 : P1;
    state.turn += 1;
    render();
    updateUI();
    updateTutorialGuide();
    scheduleTutorialAi();
    return true;
  }

  function handleRemoteAction(username, action){
    if(!isHost() || !action || typeof action !== 'object') return;

    if(action.type === 'play'){
      if(typeof action.r !== 'number' || typeof action.c !== 'number') return;
      if(claimHex(action.r, action.c, username)) syncOnlineState();
      return;
    }

    if(action.type === 'reset'){
      resetState();
      render();
      updateUI();
      syncOnlineState();
      return;
    }

    if(action.type === 'surrender'){
      if(state.gameOver) return;
      const actorToken = playerTokenForUsername(username);
      state.gameOver = true;
      state.winner = actorToken === P1 ? P2 : P1;
      state.path = [];
      render();
      showWin(state.winner, true);
      syncOnlineState();
    }
  }

  function render(path = []){
    dom.board.innerHTML = '';
    const pathSet = new Set(path.map(([r, c]) => `${r}-${c}`));
    const hexW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hb-hex'));
    const hexH = hexW * 1.1547;
    const xStep = hexW * 0.78;
    const yStep = hexH * 0.76;
    const width = (SIZE - 1) * xStep + hexW + (SIZE - 1) * xStep * 0.5;
    const height = (SIZE - 1) * yStep + hexH;
    dom.board.style.width = `${width}px`;
    dom.board.style.height = `${height}px`;

    for(let r = 0; r < SIZE; r += 1){
      for(let c = 0; c < SIZE; c += 1){
        const hex = document.createElement('button');
        hex.className = 'hex';
        hex.type = 'button';
        hex.style.left = `${c * xStep + r * xStep * 0.5}px`;
        hex.style.top = `${r * yStep}px`;
        hex.style.zIndex = String(100 + r * 2 + (state.grid[r][c] !== EMPTY ? 1 : 0));

        if(state.grid[r][c] === P1) hex.classList.add('p1');
        if(state.grid[r][c] === P2) hex.classList.add('p2');
        if(pathSet.has(`${r}-${c}`)) hex.classList.add('path');

        hex.addEventListener('click', () => {
          if(isOnlineGame()){
            if(!socket || !isPlayersTurn()) return;
            if(isHost()){
              if(claimHex(r, c, online.me)) syncOnlineState();
            }else{
              socket.emit('hexblitz_action', { gameId: online.gameId, action: { type: 'play', r, c } });
            }
            return;
          }

          if(tutorialMode && state.current !== P1) return;
          claimHex(r, c);
        });

        dom.board.appendChild(hex);
      }
    }
  }

  function updateNames(){
    if(!isOnlineGame()){
      dom.p1Name.textContent = 'Crimson';
      dom.p2Name.textContent = tutorialMode ? 'Coach AI' : 'Lunar';
      return;
    }

    dom.p1Name.textContent = online.players[0] || 'Crimson';
    dom.p2Name.textContent = online.players[1] || 'Lunar';
  }

  function counts(){
    return state.grid.flat().reduce((acc, value) => {
      if(value === P1) acc.p1 += 1;
      if(value === P2) acc.p2 += 1;
      return acc;
    }, { p1: 0, p2: 0 });
  }

  function isPlayersTurn(){
    if(!isOnlineGame()) return !state.gameOver;
    return !state.gameOver && myToken() === state.current;
  }

  function updateUI(){
    updateNames();

    const score = counts();
    dom.p1Tiles.textContent = score.p1;
    dom.p2Tiles.textContent = score.p2;
    dom.turnCount.textContent = String(state.turn);

    const p1Turn = state.current === P1;
    dom.gameView.classList.toggle('p1-turn', p1Turn);
    dom.gameView.classList.toggle('p2-turn', !p1Turn);
    dom.p1Card.classList.toggle('active', p1Turn);
    dom.p2Card.classList.toggle('active', !p1Turn);

    if(state.gameOver){
      dom.status.textContent = state.winner === P1 ? 'CRIMSON VICTORY' : 'LUNAR VICTORY';
    }else if(isOnlineGame()){
      dom.status.textContent = isPlayersTurn() ? 'YOUR TURN' : 'RIVAL TURN';
    }else if(tutorialMode){
      dom.status.textContent = p1Turn ? 'YOUR TURN' : 'COACH AI';
    }else{
      dom.status.textContent = p1Turn ? 'CRIMSON TURN' : 'LUNAR TURN';
    }

    dom.turnLabel.textContent = tutorialMode
      ? (p1Turn ? 'CRIMSON TURN' : 'COACH AI')
      : p1Turn ? 'CRIMSON TURN' : 'LUNAR TURN';
  }

  function showWin(forcedWinner = null, surrendered = false){
    const winner = forcedWinner || state.winner;
    const isCrimson = winner === P1;
    const localWin = isOnlineGame() ? myToken() === winner : isCrimson;

    dom.winTitle.textContent = isCrimson ? 'CRIMSON WINS' : 'LUNAR WINS';
    dom.winModal.classList.remove('hidden');

    window.dispatchEvent(new CustomEvent('hexblitz:gameover', {
      detail: {
        winner: isCrimson ? 'crimson' : 'lunar',
        turns: state.turn,
        durationSeconds: secondsElapsed(),
        pathLength: state.path.length,
        xp: localWin ? 35 : 10,
        online: isOnlineGame(),
        surrendered
      }
    }));

    if(tutorialMode){
      tutorialGuide?.complete(localWin
        ? 'Your Crimson path crossed the board. Nice bridge-building.'
        : 'Coach AI completed the Lunar path. Replay and watch for cuts sooner.');
    }
    updateUI();
  }

  function applySnapshot(snapshot){
    if(!snapshot) return;
    state.grid = Array.isArray(snapshot.grid) ? snapshot.grid : createEmptyGrid();
    state.current = snapshot.current === P2 ? P2 : P1;
    state.turn = Math.max(1, Number(snapshot.turn) || 1);
    state.gameOver = Boolean(snapshot.gameOver);
    state.winner = snapshot.winner === P1 || snapshot.winner === P2 ? snapshot.winner : null;
    state.path = Array.isArray(snapshot.path) ? snapshot.path : [];
    state.startedAt = Number(snapshot.startedAt) || Date.now();
    state.startedAtMs = state.startedAt;

    if(Array.isArray(snapshot.players) && snapshot.players.length === 2){
      online.players = snapshot.players;
    }

    render(state.path);
    updateUI();
    if(state.gameOver && state.winner) showWin();
  }

  function startGameView(){
    dom.setupView.classList.add('is-hidden');
    dom.setupView.hidden = true;
    dom.gameView.classList.remove('is-hidden');
    dom.gameView.hidden = false;
    dom.winModal.classList.add('hidden');
    render();
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

  function startTutorialGame(){
    online.gameId = null;
    online.hostUsername = null;
    online.players = [];
    resetState();
    tutorialGuide = tutorialGuide || window.TutorialGuide?.create({
      title: 'Hexblitz Tutorial',
      steps: TUTORIAL_STEPS,
      onBack: () => window.location.href = '/hexblitz_moonfall/index.html'
    });
    startGameView();
    updateTutorialGuide();
  }

  function goToSetup(){
    online.gameId = null;
    online.hostUsername = null;
    online.players = [];
    dom.gameView.classList.add('is-hidden');
    dom.gameView.hidden = true;
    dom.setupView.classList.remove('is-hidden');
    dom.setupView.hidden = false;
    dom.winModal.classList.add('hidden');
    renderOnlineLobbies();
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
    if(pendingInviteLobbyId){
      const invited = list.find(lobby => lobby.id === pendingInviteLobbyId);
      const already = invited?.players?.some(player => player.username === online.me);
      const full = (invited?.players?.length || 0) >= (invited?.maxPlayers || 2);
      if(invited && !already && !full){
        socket?.emit('join_hexblitz_lobby', pendingInviteLobbyId);
        pendingInviteLobbyId = null;
      }
    }
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
      const slots = lobby.players.map(player => `
        <div class="sl-player-slot ${player.ready ? 'is-ready' : ''}">
          <div class="sl-player-avatar">${escapeHtml(player.username).slice(0, 1).toUpperCase()}</div>
          <strong>${escapeHtml(player.username)}</strong>
          <small>${player.ready ? 'Ready' : 'Waiting'}</small>
        </div>
      `).join('') + Array.from({ length: Math.max(0, (lobby.maxPlayers || 2) - lobby.players.length) }).map(() => me
        ? `<button class="sl-lobby-invite" type="button" data-action="invite" data-id="${lobby.id}"><b>+</b><span>Invite friend</span></button>`
        : '<div class="sl-player-slot"><div class="sl-empty-avatar">+</div><strong>Available</strong><small>Invite a friend</small></div>'
      ).join('');

      return `
        <article class="sl-lobby-card">
          <div class="sl-lobby-head">
            <div><strong>${escapeHtml(lobby.name)}</strong><span>Hexblitz duel</span></div>
            <div class="sl-lobby-count">${lobby.players.length}/${lobby.maxPlayers || 2}</div>
          </div>
          <div class="sl-lobby-slots">${slots}</div>
          <div class="sl-lobby-actions">
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
        if(button.dataset.action === 'join') socket.emit('join_hexblitz_lobby', id);
        if(button.dataset.action === 'ready') socket.emit('toggle_hexblitz_ready', id);
        if(button.dataset.action === 'leave') socket.emit('leave_hexblitz_lobby', id);
        if(button.dataset.action === 'invite') window.SiteShell?.openLobbyInvitePicker?.('hexblitz', id);
      });
    });
  }

  function registerSocket(){
    if(!socket || !online.me) return;

    socket.emit('register_online', online.me);

    socket.on('online_users', users => {
      window.dispatchEvent(new CustomEvent('site-shell-online-users', { detail: users }));
    });

    socket.on('hexblitz_lobbies_update', lobbies => {
      online.lobbies = lobbies || {};
      renderOnlineLobbies();
    });

    socket.on('hexblitz_notice', payload => {
      if(payload?.message) dom.status.textContent = payload.message;
    });

    socket.on('hexblitz_start', payload => {
      online.gameId = payload?.gameId || null;
      online.hostUsername = payload?.hostUsername || null;
      online.players = Array.isArray(payload?.players)
        ? payload.players.map(player => player.username).filter(Boolean)
        : [];

      if(online.players.length < 2){
        online.players = [online.hostUsername, online.me].filter(Boolean);
      }

      startGameView();

      if(payload?.hasSnapshot) return;

      if(isHost()){
        resetState();
        render();
        updateUI();
        syncOnlineState();
      }
    });

    socket.on('hexblitz_state', payload => {
      if(payload?.gameId && online.gameId && payload.gameId !== online.gameId) return;
      applySnapshot(payload?.snapshot);
    });

    socket.on('hexblitz_action_request', payload => {
      if(!isHost()) return;
      if(payload?.gameId !== online.gameId) return;
      handleRemoteAction(payload?.username, payload?.action);
    });
  }

  function initEvents(){
    dom.localModeBtn.addEventListener('click', () => setSetupMode('local'));
    dom.onlineModeBtn.addEventListener('click', () => setSetupMode('online'));
    dom.startLocalBtn.addEventListener('click', startLocalGame);

    dom.createOnlineLobbyBtn.addEventListener('click', () => {
      if(!socket) return;
      socket.emit('create_hexblitz_lobby', { name: dom.onlineLobbyName.value, maxPlayers: 2 });
    });

    dom.refreshOnlineBtn.addEventListener('click', () => renderOnlineLobbies());

    dom.resetBtn.addEventListener('click', () => {
      if(isOnlineGame()){
        if(!socket) return;
        if(isHost()){
          resetState();
          render();
          updateUI();
          syncOnlineState();
        }else{
          socket.emit('hexblitz_action', { gameId: online.gameId, action: { type: 'reset' } });
        }
        return;
      }

      resetState();
      render();
      updateUI();
      dom.winModal.classList.add('hidden');
      if(tutorialMode) updateTutorialGuide();
    });

    dom.surrenderBtn.addEventListener('click', () => {
      if(state.gameOver) return;

      if(isOnlineGame()){
        if(!socket) return;
        if(isHost()){
          const token = myToken();
          state.gameOver = true;
          state.winner = token === P1 ? P2 : P1;
          state.path = [];
          showWin(state.winner, true);
          syncOnlineState();
        }else{
          socket.emit('hexblitz_action', { gameId: online.gameId, action: { type: 'surrender' } });
        }
        return;
      }

      if(tutorialMode){
        state.gameOver = true;
        state.winner = P2;
        state.path = [];
        showWin(P2, true);
        return;
      }

      state.gameOver = true;
      state.winner = state.current === P1 ? P2 : P1;
      showWin(state.winner, true);
    });

    dom.backBtn.addEventListener('click', goToSetup);

    dom.playAgainBtn.addEventListener('click', () => {
      if(isOnlineGame()){
        dom.resetBtn.click();
        return;
      }

      resetState();
      render();
      updateUI();
      dom.winModal.classList.add('hidden');
      if(tutorialMode) updateTutorialGuide();
    });

    document.addEventListener('keydown', event => {
      if(dom.gameView.classList.contains('is-hidden')) return;
      if(event.key.toLowerCase() === 'r') dom.resetBtn.click();
    });

    window.addEventListener('resize', () => render(state.path));
  }

  function init(){
    if(!user){
      window.location.href = '/login.html';
      return;
    }

    setSetupMode('local');
    resetState();
    render();
    updateUI();
    startTimer();
    initEvents();
    renderOnlineLobbies();
    registerSocket();
    if(tutorialMode) startTutorialGame();
  }

  init();
})();

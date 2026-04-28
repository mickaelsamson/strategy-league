(() => {
  const PLAYER_COLORS = ['#2f9ed9', '#d64e5e', '#44ad68', '#d59b38', '#8b64d8', '#e5eef4'];
  const DEFAULT_NAMES = ['Mickael', 'Akari', 'Kuro', 'Ren', 'Sora', 'Nami'];
  const FACTIONS = ['Dawn House', 'Red Moon', 'Iron Lotus', 'Mist Clan', 'Sand Crown', 'Shadow Pact'];
  const CARD_SYMBOLS = ['moon', 'saber', 'banner'];

  const REGIONS = {
    divin: { name: 'Divine Continent', bonus: 3 },
    wilds: { name: 'Wild Routes', bonus: 2 },
    south: { name: 'Southern Marches', bonus: 2 }
  };

  const TERRITORIES = [
    {
      id: 'divin-ouest',
      name: 'Divine West',
      region: 'divin',
      label: { x: 302, y: 282 },
      path: 'm 225.40348,382.46305 20.18955,10.76648 82.51926,18.24405 7.85898,-0.56135 18.80541,-60.34572 47.15386,-46.87318 4.77152,-34.24269 57.25826,-64.55588 -50.80267,-36.20743 -111.42907,-13.19186 -121.81414,114.51653 53.32877,41.82098 z',
      neighbors: ['divin-nord', 'divin-est', 'divin-sud', 'soleil-levant']
    },
    {
      id: 'divin-nord',
      name: 'Divine North',
      region: 'divin',
      label: { x: 512, y: 132 },
      path: 'm 462.056,202.55059 -49.3341,-34.09267 5.21417,-45.3232 98.66821,-79.81697 105.88784,46.927563 -7.21963,104.684567 -150.40885,10.02725 z',
      neighbors: ['divin-ouest', 'divin-est', 'forets']
    },
    {
      id: 'divin-est',
      name: 'Divine East',
      region: 'divin',
      label: { x: 524, y: 284 },
      path: 'm 527.03263,366.19543 96.26167,-39.70794 29.68068,-94.25622 -39.30685,-38.10357 -150.40886,10.82943 -57.35591,65.77881 -4.41199,32.48831 z',
      neighbors: ['divin-ouest', 'divin-nord', 'divin-sud', 'forets', 'ile-demons']
    },
    {
      id: 'divin-sud',
      name: 'Divine South',
      region: 'divin',
      label: { x: 421, y: 391 },
      path: 'm 334.50929,409.51318 20.8567,-60.16355 46.12538,-44.92211 133.56307,66.1799 2.00545,31.28504 -71.79516,60.56463 -97.46494,-42.11448 z',
      neighbors: ['divin-ouest', 'divin-est', 'soleil-levant', 'ile-demons']
    },
    {
      id: 'forets',
      name: 'Forest Kingdoms',
      region: 'wilds',
      label: { x: 913, y: 210 },
      path: 'm 693.10287,83.625909 87.87808,-18.426048 94.96501,-35.434707 107.72151,48.191202 96.38243,-17.00866 82.2085,62.365084 -46.7738,89.29546 5.6695,72.28681 -73.7042,43.93903 -39.6868,4.25217 -31.18257,70.86941 -49.60859,22.67821 -167.25182,-62.36508 -4.25216,-28.34777 -48.1912,-60.94769 32.59993,-66.61725 -63.78248,-53.86076 z',
      neighbors: ['divin-nord', 'divin-est', 'ile-demons', 'fer']
    },
    {
      id: 'fer',
      name: 'Iron Empire',
      region: 'wilds',
      label: { x: 1210, y: 525 },
      path: 'm 1061.7522,371.54181 180.0549,-107.17552 250.0762,135.75566 -21.4351,42.87021 18.5771,32.86716 -24.2932,47.15723 -62.8763,34.29617 -41.4412,65.73432 -38.5832,21.4351 -110.0335,17.14808 -25.7221,40.0122 -45.7282,14.29007 -87.1695,-57.16028 -71.45032,-21.4351 -28.58014,-37.15419 57.16026,-70.02134 8.5741,-60.01829 40.0122,-51.44425 z',
      neighbors: ['forets', 'ile-demons', 'sables']
    },
    {
      id: 'soleil-levant',
      name: 'Rising Sun',
      region: 'south',
      label: { x: 329, y: 654 },
      path: 'm 203.45938,433.65913 24.41512,19.18331 99.98575,28.48431 106.38019,15.69544 56.38731,48.83025 9.301,31.39088 68.01357,33.71612 30.22825,69.7575 -74.98932,38.36663 -8.71968,34.87875 -83.709,49.41156 19.18331,37.204 -45.92369,30.22825 -22.67119,4.06919 -39.52925,-16.85806 2.32525,-12.78888 -18.602,-11.62625 -29.06562,15.11413 -24.41513,25.57775 -56.96862,5.81312 -32.5535,-22.67119 2.32525,-26.74037 -16.27675,-22.67119 -12.20757,-8.13837 -41.27318,-8.71969 -49.411567,-37.78531 9.882313,-30.22825 -16.858063,-22.67119 30.22825,-57.54994 6.394438,-20.92725 -35.460063,-47.08631 66.850942,-50.57419 -14.53282,-37.204 z',
      neighbors: ['divin-ouest', 'divin-sud', 'ile-demons', 'sables']
    },
    {
      id: 'sables',
      name: 'Southern Sands',
      region: 'south',
      label: { x: 874, y: 843 },
      path: 'm 595.15426,806.09502 12.16966,-22.6008 81.13106,-57.37125 57.95076,20.86227 108.94742,-24.33931 58.53026,-33.03193 127.49168,30.13439 56.2122,19.70326 75.336,59.68927 -24.3393,33.61144 34.7704,62.00731 -66.6433,66.64337 -64.3254,-2.89754 -44.0425,23.18031 -90.98273,-31.87292 -67.22288,32.45242 -38.0049,-10.23715 -79.09593,23.36372 -73.01163,-35.7757 -58.16593,-4.3807 -90.7778,-77.87907 37.47931,-39.42628 45.75395,-27.98779 z',
      neighbors: ['soleil-levant', 'ile-demons', 'fer']
    },
    {
      id: 'ile-demons',
      name: 'Demon Isle',
      region: 'wilds',
      label: { x: 734, y: 535 },
      path: 'm 590.33864,499.03052 23.23117,-57.26026 92.98607,-50.1226 43.20915,32.1476 42.17212,-0.34567 88.49232,55.99905 2.07404,35.95 -13.48125,25.23414 31.11058,42.86347 -1.03702,43.90049 -53.20951,27.00909 -133.88609,-1.16858 -36.55992,-3.17187 -48.74655,-54.08864 10.18335,-23.2047 3.17187,-24.37328 z',
      neighbors: ['divin-est', 'divin-sud', 'forets', 'fer', 'soleil-levant', 'sables']
    }
  ];

  const dom = {
    setupView: document.getElementById('setupView'),
    gameView: document.getElementById('gameView'),
    form: document.getElementById('setupForm'),
    playerCount: document.getElementById('playerCount'),
    pace: document.getElementById('pace'),
    aiStyle: document.getElementById('aiStyle'),
    slots: document.getElementById('slots'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    activePlayer: document.getElementById('activePlayer'),
    turnHud: document.getElementById('turnHud'),
    phaseHud: document.getElementById('phaseHud'),
    reserveHud: document.getElementById('reserveHud'),
    cardsHud: document.getElementById('cardsHud'),
    territoryLayer: document.getElementById('territoryLayer'),
    territoryInfo: document.getElementById('territoryInfo'),
    playersPanel: document.getElementById('playersPanel'),
    regionsPanel: document.getElementById('regionsPanel'),
    cardsPanel: document.getElementById('cardsPanel'),
    logList: document.getElementById('logList'),
    notice: document.getElementById('notice'),
    cardsBtn: document.getElementById('cardsBtn'),
    restartBtn: document.getElementById('restartBtn'),
    reinforceBtn: document.getElementById('reinforceBtn'),
    attackBtn: document.getElementById('attackBtn'),
    blitzBtn: document.getElementById('blitzBtn'),
    fortifyBtn: document.getElementById('fortifyBtn'),
    maxFortifyBtn: document.getElementById('maxFortifyBtn'),
    nextBtn: document.getElementById('nextBtn')
  };

  let state = null;
  let noticeTimer = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const roll = sides => Math.floor(Math.random() * sides) + 1;
  const byId = id => TERRITORIES.find(territory => territory.id === id);
  const regionTerritories = region => TERRITORIES.filter(territory => territory.region === region);

  function getSavedName(){
    try{
      return JSON.parse(localStorage.getItem('user') || 'null')?.username || 'Player';
    }catch(error){
      return 'Player';
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

  function hexToRgba(hex, alpha){
    const clean = hex.replace('#', '');
    const value = parseInt(clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean, 16);
    const r = value >> 16;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function shuffle(list){
    const copy = [...list];
    for(let i = copy.length - 1; i > 0; i -= 1){
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function notice(text){
    dom.notice.textContent = text;
    dom.notice.classList.add('visible');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => dom.notice.classList.remove('visible'), 2600);
  }

  function renderSlots(){
    const count = Number(dom.playerCount.value);
    dom.slots.innerHTML = '';

    for(let i = 0; i < count; i += 1){
      const row = document.createElement('div');
      row.className = 'slot';
      row.innerHTML = `
        <div class="slot-number">${i + 1}</div>
        <label>Nom<input data-field="name" value="${escapeHtml(i === 0 ? getSavedName() : DEFAULT_NAMES[i])}"></label>
        <label>Maison<select data-field="faction">
          ${FACTIONS.map((faction, index) => `<option value="${escapeHtml(faction)}"${index === i ? ' selected' : ''}>${escapeHtml(faction)}</option>`).join('')}
        </select></label>
        <label>Type<select data-field="type">
          <option value="human"${i === 0 ? ' selected' : ''}>Human</option>
          <option value="ai"${i !== 0 ? ' selected' : ''}>AI</option>
          <option value="closed">Ferme</option>
        </select></label>
      `;
      dom.slots.appendChild(row);
    }
  }

  function readSetup(){
    return [...dom.slots.querySelectorAll('.slot')].map((slot, index) => {
      const name = slot.querySelector('[data-field="name"]').value.trim() || `Player ${index + 1}`;
      return {
        id: index,
        name,
        faction: slot.querySelector('[data-field="faction"]').value,
        type: slot.querySelector('[data-field="type"]').value,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
        cards: [],
        alive: true
      };
    }).filter(player => player.type !== 'closed');
  }

  function startingTroops(playerCount){
    const quick = { 2: 22, 3: 18, 4: 16, 5: 14, 6: 13 };
    const classic = { 2: 30, 3: 26, 4: 23, 5: 21, 6: 19 };
    return (dom.pace.value === 'classic' ? classic : quick)[playerCount] || 18;
  }

  function startGame(event){
    event.preventDefault();
    const players = readSetup();
    if(players.length < 2){
      notice('Ouvre au moins deux joueurs.');
      return;
    }

    if(!players.some(player => player.type === 'human')){
      players[0].type = 'human';
    }

    state = {
      players,
      territories: TERRITORIES.map(territory => ({
        id: territory.id,
        owner: null,
        troops: 0
      })),
      activeIndex: 0,
      phase: 'reinforce',
      turn: 1,
      pendingReinforcements: 0,
      tradeLevel: 0,
      capturedThisTurn: false,
      selectedId: null,
      targetId: null,
      logs: [],
      aiQueued: false,
      aiRunning: false,
      gameOver: false,
      aiStyle: dom.aiStyle.value
    };

    seedTerritories();
    state.pendingReinforcements = calculateReinforcements(currentPlayer().id);
    addLog(`${currentPlayer().name} opens the conquest with ${state.pendingReinforcements} reinforcements.`);

    dom.setupView.hidden = true;
    dom.setupView.classList.add('is-hidden');
    dom.gameView.hidden = false;
    dom.gameView.classList.remove('is-hidden');
    render();
  }

  function seedTerritories(){
    const territoryOrder = shuffle(state.territories.map(territory => territory.id));
    territoryOrder.forEach((territoryId, index) => {
      const territory = state.territories.find(item => item.id === territoryId);
      territory.owner = state.players[index % state.players.length].id;
      territory.troops = 1;
    });

    const total = startingTroops(state.players.length);
    for(const player of state.players){
      const owned = ownedTerritories(player.id);
      let reserve = Math.max(0, total - owned.length);
      while(reserve > 0){
        owned[Math.floor(Math.random() * owned.length)].troops += 1;
        reserve -= 1;
      }
    }
  }

  function currentPlayer(){
    return state.players[state.activeIndex];
  }

  function playerById(id){
    return state.players.find(player => player.id === id);
  }

  function territoryState(id){
    return state.territories.find(territory => territory.id === id);
  }

  function selectedTerritory(){
    return territoryState(state.selectedId);
  }

  function targetTerritory(){
    return territoryState(state.targetId);
  }

  function ownedTerritories(owner){
    return state.territories.filter(territory => territory.owner === owner);
  }

  function territoryTroops(owner){
    return ownedTerritories(owner).reduce((sum, territory) => sum + territory.troops, 0);
  }

  function calculateReinforcements(owner){
    const owned = ownedTerritories(owner);
    let amount = Math.max(3, Math.floor(owned.length / 3));
    for(const [regionId, region] of Object.entries(REGIONS)){
      const allOwned = regionTerritories(regionId).every(territory => territoryState(territory.id).owner === owner);
      if(allOwned) amount += region.bonus;
    }
    return amount;
  }

  function addLog(text){
    state.logs.unshift(text);
    state.logs = state.logs.slice(0, 12);
  }

  function regionOwner(regionId){
    const owners = new Set(regionTerritories(regionId).map(territory => territoryState(territory.id).owner));
    return owners.size === 1 ? [...owners][0] : null;
  }

  function areNeighbors(a, b){
    const source = byId(a);
    return Boolean(source && source.neighbors.includes(b));
  }

  function canAttack(origin, target){
    const player = currentPlayer();
    return Boolean(origin && target &&
      state.phase === 'attack' &&
      origin.owner === player.id &&
      target.owner !== player.id &&
      origin.troops > 1 &&
      areNeighbors(origin.id, target.id));
  }

  function canFortify(origin, target){
    const player = currentPlayer();
    return Boolean(origin && target &&
      state.phase === 'fortify' &&
      origin.owner === player.id &&
      target.owner === player.id &&
      origin.id !== target.id &&
      origin.troops > 1 &&
      areNeighbors(origin.id, target.id));
  }

  function phaseLabel(phase = state.phase){
    if(phase === 'reinforce') return 'Reinforce';
    if(phase === 'attack') return 'Attack';
    if(phase === 'fortify') return 'Fortification';
    return 'Victory';
  }

  function render(){
    if(!state) return;
    renderStatus();
    renderMap();
    renderTerritoryInfo();
    renderPlayers();
    renderCards();
    renderRegions();
    renderLog();
    renderControls();
    maybeRunAi();
  }

  function renderStatus(){
    const player = currentPlayer();
    dom.activePlayer.textContent = `${player.name} - ${player.faction}`;
    dom.activePlayer.style.color = player.color;
    dom.turnHud.textContent = String(state.turn);
    dom.phaseHud.textContent = phaseLabel();
    dom.reserveHud.textContent = String(state.pendingReinforcements);
    dom.cardsHud.textContent = String(player.cards.length);
  }

  function renderMap(){
    const edges = [];
    const seen = new Set();
    for(const territory of TERRITORIES){
      for(const neighborId of territory.neighbors){
        const key = [territory.id, neighborId].sort().join(':');
        if(seen.has(key)) continue;
        seen.add(key);
        const neighbor = byId(neighborId);
        const aState = territoryState(territory.id);
        const bState = territoryState(neighborId);
        const relation = aState.owner === bState.owner ? 'owned' : 'front';
        edges.push(`<line class="connection-line ${relation}" x1="${territory.label.x}" y1="${territory.label.y}" x2="${neighbor.label.x}" y2="${neighbor.label.y}"></line>`);
      }
    }

    const paths = TERRITORIES.map(territory => {
      const info = territoryState(territory.id);
      const owner = playerById(info.owner);
      const selected = state.selectedId === territory.id;
      const targeted = state.targetId === territory.id;
      const selectable = isSelectableTerritory(info);
      const className = [
        'territory-shape',
        selected ? 'focused' : '',
        targeted ? 'targeted' : '',
        selectable ? 'selectable' : ''
      ].filter(Boolean).join(' ');
      return `<path class="${className}" data-territory-id="${territory.id}" d="${territory.path}" style="--territory-fill:${hexToRgba(owner.color, .36)};--territory-hover:${hexToRgba(owner.color, .58)}"><title>${escapeHtml(territory.name)}</title></path>`;
    }).join('');

    const tokens = TERRITORIES.map(territory => {
      const info = territoryState(territory.id);
      const owner = playerById(info.owner);
      return `
        <g class="territory-token" transform="translate(${territory.label.x} ${territory.label.y})" style="--owner-color:${owner.color}">
          <circle r="25"></circle>
          <text y="1">${info.troops}</text>
          <text class="territory-label" y="43">${escapeHtml(shortName(territory.name))}</text>
        </g>
      `;
    }).join('');

    dom.territoryLayer.innerHTML = `
      <g>${edges.join('')}</g>
      <g>${paths}</g>
      <g>${tokens}</g>
    `;

    dom.territoryLayer.querySelectorAll('[data-territory-id]').forEach(path => {
      path.addEventListener('click', () => selectTerritory(path.dataset.territoryId));
    });
  }

  function shortName(name){
    return name
      .replace('Forest ', '')
      .replace('Iron ', '')
      .replace('Demon ', 'Demon ')
      .replace('Southern ', '');
  }

  function isSelectableTerritory(territory){
    const player = currentPlayer();
    if(player.type !== 'human' || state.gameOver) return false;
    if(state.phase === 'reinforce') return territory.owner === player.id;
    if(state.phase === 'attack'){
      if(territory.owner === player.id && territory.troops > 1) return true;
      const selected = selectedTerritory();
      return Boolean(selected && territory.owner !== player.id && areNeighbors(selected.id, territory.id));
    }
    if(state.phase === 'fortify'){
      if(territory.owner === player.id && territory.troops > 1) return true;
      const selected = selectedTerritory();
      return Boolean(selected && territory.owner === player.id && areNeighbors(selected.id, territory.id));
    }
    return false;
  }

  function renderTerritoryInfo(){
    const selected = selectedTerritory();
    const target = targetTerritory();
    if(!selected){
      dom.territoryInfo.innerHTML = '<div class="info-card"><strong>No territory</strong><span>Select a territory to view the front, neighbors, and available orders.</span></div>';
      return;
    }

    const territory = byId(selected.id);
    const owner = playerById(selected.owner);
    const neighbors = territory.neighbors.map(id => {
      const neighborState = territoryState(id);
      const neighborOwner = playerById(neighborState.owner);
      return `${byId(id).name} (${neighborOwner.name}, ${neighborState.troops})`;
    }).join(', ');

    dom.territoryInfo.innerHTML = `
      <div class="info-card">
        <strong>${escapeHtml(territory.name)}</strong>
        <span>Control: ${escapeHtml(owner.name)} · Armies: ${selected.troops}</span>
        <span>Region: ${escapeHtml(REGIONS[territory.region].name)}</span>
        <span>Neighbors: ${escapeHtml(neighbors)}</span>
      </div>
      ${target ? `<div class="info-card"><strong>Target</strong><span>${escapeHtml(byId(target.id).name)} · ${escapeHtml(playerById(target.owner).name)} · ${target.troops} armies</span></div>` : ''}
    `;
  }

  function renderPlayers(){
    dom.playersPanel.innerHTML = state.players.map(player => {
      const territories = ownedTerritories(player.id).length;
      const troops = territoryTroops(player.id);
      return `<div class="player-row ${player.alive ? '' : 'defeated'}" style="color:${player.color}">
        <strong>${escapeHtml(player.name)}</strong>
        <span>${escapeHtml(player.faction)} · ${player.type === 'ai' ? 'AI' : 'Human'} · ${territories} territories · ${troops} armies · ${player.cards.length} cards</span>
      </div>`;
    }).join('');
  }

  function renderCards(){
    const player = currentPlayer();
    if(!player.cards.length){
      dom.cardsPanel.innerHTML = '<div class="card-row"><b>0</b><span>No cards in hand.</span></div>';
      return;
    }

    dom.cardsPanel.innerHTML = player.cards.map(card => `
      <div class="card-row">
        <b>${cardIcon(card.symbol)}</b>
        <span><strong>${escapeHtml(card.territoryName)}</strong>${escapeHtml(card.symbol)}</span>
      </div>
    `).join('');
  }

  function cardIcon(symbol){
    if(symbol === 'moon') return 'M';
    if(symbol === 'saber') return 'S';
    if(symbol === 'banner') return 'B';
    return 'W';
  }

  function renderRegions(){
    dom.regionsPanel.innerHTML = Object.entries(REGIONS).map(([regionId, region]) => {
      const owner = regionOwner(regionId);
      const ownerName = owner === null ? 'Conteste' : playerById(owner).name;
      const territories = regionTerritories(regionId).map(territory => territory.name).join(', ');
      return `<div class="region-row">
        <strong>${escapeHtml(region.name)} +${region.bonus}</strong>
        <span>${escapeHtml(ownerName)} · ${escapeHtml(territories)}</span>
      </div>`;
    }).join('');
  }

  function renderLog(){
    dom.logList.innerHTML = state.logs.length
      ? state.logs.map(entry => `<div class="log-entry">${escapeHtml(entry)}</div>`).join('')
      : '<div class="log-entry">La guerre commence.</div>';
  }

  function renderControls(){
    const player = currentPlayer();
    const human = player.type === 'human' && !state.gameOver;
    const selected = selectedTerritory();
    const target = targetTerritory();
    const tradeSet = findTradeSet(player.cards);
    const mandatoryTrade = player.cards.length >= 5;

    dom.cardsBtn.disabled = !human || state.phase !== 'reinforce' || !tradeSet;
    dom.reinforceBtn.disabled = !human || state.phase !== 'reinforce' || state.pendingReinforcements <= 0 || !selected || selected.owner !== player.id;
    dom.attackBtn.disabled = !human || !canAttack(selected, target);
    dom.blitzBtn.disabled = !human || !canAttack(selected, target);
    dom.fortifyBtn.disabled = !human || !canFortify(selected, target);
    dom.maxFortifyBtn.disabled = !human || !canFortify(selected, target);
    dom.nextBtn.disabled = !human || (state.phase === 'reinforce' && (state.pendingReinforcements > 0 || mandatoryTrade));

    dom.nextBtn.textContent = state.phase === 'fortify' ? 'End Turn' : 'Next Phase';
  }

  function selectTerritory(id){
    if(!state) return;
    const clicked = territoryState(id);
    const player = currentPlayer();
    if(player.type !== 'human' || state.gameOver){
      state.selectedId = id;
      state.targetId = null;
      render();
      return;
    }

    if(state.phase === 'reinforce'){
      if(clicked.owner === player.id){
        state.selectedId = id;
        state.targetId = null;
      }
      render();
      return;
    }

    if(state.phase === 'attack'){
      const selected = selectedTerritory();
      if(clicked.owner === player.id){
        state.selectedId = id;
        state.targetId = null;
      }else if(selected && selected.owner === player.id && areNeighbors(selected.id, clicked.id)){
        state.targetId = id;
      }else{
        const origin = findBestOwnedNeighborFor(clicked.id, player.id, true);
        if(origin){
          state.selectedId = origin.id;
          state.targetId = clicked.id;
        }
      }
      render();
      return;
    }

    if(state.phase === 'fortify'){
      const selected = selectedTerritory();
      if(clicked.owner === player.id && selected && selected.id !== clicked.id && areNeighbors(selected.id, clicked.id)){
        state.targetId = id;
      }else if(clicked.owner === player.id){
        state.selectedId = id;
        state.targetId = null;
      }
      render();
    }
  }

  function findBestOwnedNeighborFor(territoryId, owner, needsAttackTroops){
    return byId(territoryId).neighbors
      .map(id => territoryState(id))
      .filter(territory => territory.owner === owner && (!needsAttackTroops || territory.troops > 1))
      .sort((a, b) => b.troops - a.troops)[0] || null;
  }

  function reinforceSelected(){
    const selected = selectedTerritory();
    const player = currentPlayer();
    if(!selected || selected.owner !== player.id || state.pendingReinforcements <= 0) return;
    selected.troops += 1;
    state.pendingReinforcements -= 1;
    if(state.pendingReinforcements === 0){
      addLog(`${player.name} finishes reinforcements.`);
    }
    render();
  }

  function resolveAttack(silent = false){
    const origin = selectedTerritory();
    const target = targetTerritory();
    if(!canAttack(origin, target)) return null;

    const attacker = currentPlayer();
    const defender = playerById(target.owner);
    const attackerDice = Math.min(3, origin.troops - 1);
    const defenderDice = Math.min(2, target.troops);
    const attackRolls = Array.from({ length: attackerDice }, () => roll(6)).sort((a, b) => b - a);
    const defenseRolls = Array.from({ length: defenderDice }, () => roll(6)).sort((a, b) => b - a);
    const comparisons = Math.min(attackRolls.length, defenseRolls.length);
    const summary = { attackerLosses: 0, defenderLosses: 0, captured: false };

    for(let i = 0; i < comparisons; i += 1){
      if(attackRolls[i] > defenseRolls[i]){
        target.troops -= 1;
        summary.defenderLosses += 1;
      }else{
        origin.troops -= 1;
        summary.attackerLosses += 1;
      }
    }

    const originName = byId(origin.id).name;
    const targetName = byId(target.id).name;
    if(target.troops <= 0){
      const moved = clamp(attackerDice - summary.attackerLosses, 1, origin.troops - 1);
      target.owner = attacker.id;
      target.troops = moved;
      origin.troops -= moved;
      state.capturedThisTurn = true;
      state.targetId = target.id;
      summary.captured = true;
      if(!silent){
        addLog(`${attacker.name} prend ${targetName} depuis ${originName}.`);
        notice(`${targetName} conquis.`);
      }
      updatePlayerLife(defender.id);
      checkWinner();
    }else if(!silent){
      addLog(`${originName} attacks ${targetName}: ${attackRolls.join('-')} against ${defenseRolls.join('-')} (${summary.defenderLosses}/${summary.attackerLosses}).`);
    }

    return summary;
  }

  function blitzAttack(){
    const origin = selectedTerritory();
    const target = targetTerritory();
    if(!canAttack(origin, target)) return;

    const originName = byId(origin.id).name;
    const targetName = byId(target.id).name;
    let rounds = 0;
    let attackerLosses = 0;
    let defenderLosses = 0;
    let captured = false;

    while(canAttack(selectedTerritory(), targetTerritory()) && rounds < 80){
      const result = resolveAttack(true);
      if(!result) break;
      rounds += 1;
      attackerLosses += result.attackerLosses;
      defenderLosses += result.defenderLosses;
      captured = result.captured;
      if(captured || state.gameOver) break;
    }

    addLog(`${originName} blitzes ${targetName}: ${defenderLosses} defense losses, ${attackerLosses} attack losses${captured ? ', conquest successful' : ''}.`);
    if(captured) notice(`${targetName} conquis par blitz.`);
    render();
  }

  function fortifySelected(max = false){
    const origin = selectedTerritory();
    const target = targetTerritory();
    if(!canFortify(origin, target)) return;
    const amount = max ? origin.troops - 1 : 1;
    origin.troops -= amount;
    target.troops += amount;
    addLog(`${currentPlayer().name} moves ${amount} arm${amount > 1 ? 'ies' : 'y'} to ${byId(target.id).name}.`);
    render();
  }

  function nextPhase(){
    if(state.gameOver) return;
    const player = currentPlayer();
    if(state.phase === 'reinforce'){
      if(player.cards.length >= 5){
        notice('Trade cards before leaving reinforcements.');
        return;
      }
      if(state.pendingReinforcements > 0){
        notice('Place all reinforcements before moving on.');
        return;
      }
      state.phase = 'attack';
      state.selectedId = null;
      state.targetId = null;
      addLog(`${player.name} opens attacks.`);
    }else if(state.phase === 'attack'){
      state.phase = 'fortify';
      state.selectedId = null;
      state.targetId = null;
      addLog(`${player.name} moves to fortification.`);
    }else{
      finishTurn();
      return;
    }
    render();
  }

  function finishTurn(){
    const player = currentPlayer();
    if(state.capturedThisTurn){
      const card = drawCard(player);
      addLog(`${player.name} gains a ${card.symbol} card (${card.territoryName}).`);
    }

    state.capturedThisTurn = false;
    state.selectedId = null;
    state.targetId = null;

    let next = state.activeIndex;
    do{
      next = (next + 1) % state.players.length;
      if(next === 0) state.turn += 1;
    }while(!state.players[next].alive);

    state.activeIndex = next;
    state.phase = 'reinforce';
    state.pendingReinforcements = calculateReinforcements(currentPlayer().id);
    addLog(`${currentPlayer().name} receives ${state.pendingReinforcements} reinforcements.`);
    render();
  }

  function updatePlayerLife(playerId){
    const player = playerById(playerId);
    if(!player) return;
    player.alive = ownedTerritories(playerId).length > 0;
    if(!player.alive){
      const victor = currentPlayer();
      victor.cards.push(...player.cards);
      player.cards = [];
      addLog(`${player.name} is eliminated. ${victor.name} takes their cards.`);
    }
  }

  function checkWinner(){
    const alive = state.players.filter(player => player.alive);
    if(alive.length !== 1) return;
    state.gameOver = true;
    state.phase = 'victory';
    state.pendingReinforcements = 0;
    addLog(`${alive[0].name} remporte Moonfall World Conquest.`);
    notice(`${alive[0].name} wins the conquest.`);
  }

  function drawCard(player){
    const territory = TERRITORIES[Math.floor(Math.random() * TERRITORIES.length)];
    const wild = Math.random() > .92;
    const symbol = wild ? 'wild' : CARD_SYMBOLS[TERRITORIES.indexOf(territory) % CARD_SYMBOLS.length];
    const card = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      territoryId: territory.id,
      territoryName: territory.name,
      symbol
    };
    player.cards.push(card);
    return card;
  }

  function findTradeSet(cards){
    if(cards.length < 3) return null;
    const regular = CARD_SYMBOLS;
    for(const symbol of regular){
      const matches = cards.map((card, index) => ({ card, index })).filter(item => item.card.symbol === symbol);
      if(matches.length >= 3) return matches.slice(0, 3).map(item => item.index);
    }

    const oneEach = [];
    const used = new Set();
    for(const symbol of regular){
      const index = cards.findIndex((card, cardIndex) => card.symbol === symbol && !used.has(cardIndex));
      if(index >= 0){
        oneEach.push(index);
        used.add(index);
      }
    }
    if(oneEach.length === 3) return oneEach;

    const jokerIndex = cards.findIndex(card => card.symbol === 'wild');
    if(jokerIndex >= 0){
      for(const symbol of regular){
        const matches = cards.map((card, index) => ({ card, index })).filter(item => item.card.symbol === symbol);
        if(matches.length >= 2) return [jokerIndex, ...matches.slice(0, 2).map(item => item.index)];
      }

      const mixed = cards.map((card, index) => ({ card, index })).filter(item => item.index !== jokerIndex).slice(0, 2);
      if(mixed.length === 2) return [jokerIndex, ...mixed.map(item => item.index)];
    }

    return null;
  }

  function tradeCards(silent = false){
    const player = currentPlayer();
    const indexes = findTradeSet(player.cards);
    if(!indexes){
      if(!silent) notice('No three-card set yet.');
      return false;
    }

    const traded = indexes.map(index => player.cards[index]);
    player.cards = player.cards.filter((_, index) => !indexes.includes(index));
    const tradeValues = [4, 6, 8, 10, 12, 15];
    const value = tradeValues[state.tradeLevel] || 15 + (state.tradeLevel - tradeValues.length + 1) * 5;
    state.tradeLevel += 1;
    state.pendingReinforcements += value;

    const ownedMatch = traded.find(card => territoryState(card.territoryId)?.owner === player.id);
    if(ownedMatch){
      territoryState(ownedMatch.territoryId).troops += 2;
      addLog(`${player.name} adds +2 to ${ownedMatch.territoryName} thanks to the cards.`);
    }

    addLog(`${player.name} trades 3 cards for ${value} reinforcements.`);
    if(!silent) notice(`${value} reinforcements added.`);
    render();
    return true;
  }

  function maybeRunAi(){
    if(!state || state.gameOver || state.aiQueued || state.aiRunning || currentPlayer().type !== 'ai') return;
    state.aiQueued = true;
    window.setTimeout(() => {
      if(!state || state.gameOver || currentPlayer().type !== 'ai') return;
      state.aiQueued = false;
      state.aiRunning = true;
      runAiTurn();
      state.aiRunning = false;
      render();
    }, 620);
  }

  function runAiTurn(){
    const player = currentPlayer();
    while(findTradeSet(player.cards) && (player.cards.length >= 5 || Math.random() > .48)){
      tradeCards(true);
    }

    while(state.pendingReinforcements > 0){
      const target = bestReinforcementTarget(player.id);
      target.troops += 1;
      state.pendingReinforcements -= 1;
    }
    addLog(`${player.name} places reinforcements.`);

    state.phase = 'attack';
    const maxAttacks = state.aiStyle === 'bold' ? 16 : 9;
    for(let i = 0; i < maxAttacks; i += 1){
      const option = bestAttackOption(player.id);
      if(!option) break;
      state.selectedId = option.origin.id;
      state.targetId = option.target.id;
      resolveAttack(true);
      if(state.gameOver) break;
      if(state.aiStyle !== 'bold' && Math.random() < .22) break;
    }

    if(state.gameOver){
      render();
      return;
    }

    state.phase = 'fortify';
    aiFortify(player.id);
    finishTurn();
  }

  function bestReinforcementTarget(owner){
    const border = ownedTerritories(owner).filter(territory => byId(territory.id).neighbors.some(neighbor => territoryState(neighbor).owner !== owner));
    const pool = border.length ? border : ownedTerritories(owner);
    return pool.sort((a, b) => {
      const aThreat = enemyNeighborTroops(a.id, owner) - a.troops;
      const bThreat = enemyNeighborTroops(b.id, owner) - b.troops;
      return bThreat - aThreat;
    })[0];
  }

  function enemyNeighborTroops(territoryId, owner){
    return byId(territoryId).neighbors.reduce((sum, neighborId) => {
      const neighbor = territoryState(neighborId);
      return sum + (neighbor.owner === owner ? 0 : neighbor.troops);
    }, 0);
  }

  function bestAttackOption(owner){
    const options = [];
    for(const origin of ownedTerritories(owner).filter(territory => territory.troops > 1)){
      for(const neighborId of byId(origin.id).neighbors){
        const target = territoryState(neighborId);
        if(target.owner === owner) continue;
        const score = origin.troops - target.troops + Math.random() * 1.6;
        const threshold = state.aiStyle === 'bold' ? .5 : 2.4;
        if(score >= threshold) options.push({ origin, target, score });
      }
    }
    return options.sort((a, b) => b.score - a.score)[0] || null;
  }

  function aiFortify(owner){
    const interior = ownedTerritories(owner)
      .filter(territory => territory.troops > 2 && byId(territory.id).neighbors.every(neighbor => territoryState(neighbor).owner === owner))
      .sort((a, b) => b.troops - a.troops)[0];
    if(!interior) return;

    const target = byId(interior.id).neighbors
      .map(id => territoryState(id))
      .filter(territory => territory.owner === owner)
      .sort((a, b) => enemyNeighborTroops(b.id, owner) - enemyNeighborTroops(a.id, owner))[0];
    if(!target) return;

    const amount = Math.floor((interior.troops - 1) / 2);
    if(amount <= 0) return;
    interior.troops -= amount;
    target.troops += amount;
    addLog(`${playerById(owner).name} fortifie ${byId(target.id).name}.`);
  }

  function shuffleSetup(){
    [...dom.slots.querySelectorAll('.slot')].forEach((slot, index) => {
      slot.querySelector('[data-field="faction"]').value = FACTIONS[Math.floor(Math.random() * FACTIONS.length)];
      if(index !== 0) slot.querySelector('[data-field="type"]').value = Math.random() > .16 ? 'ai' : 'closed';
    });
  }

  function bind(){
    dom.playerCount.addEventListener('change', renderSlots);
    dom.shuffleBtn.addEventListener('click', shuffleSetup);
    dom.form.addEventListener('submit', startGame);
    dom.cardsBtn.addEventListener('click', () => tradeCards(false));
    dom.restartBtn.addEventListener('click', () => {
      state = null;
      dom.gameView.hidden = true;
      dom.gameView.classList.add('is-hidden');
      dom.setupView.hidden = false;
      dom.setupView.classList.remove('is-hidden');
      renderSlots();
    });
    dom.reinforceBtn.addEventListener('click', reinforceSelected);
    dom.attackBtn.addEventListener('click', () => {
      resolveAttack(false);
      render();
    });
    dom.blitzBtn.addEventListener('click', blitzAttack);
    dom.fortifyBtn.addEventListener('click', () => fortifySelected(false));
    dom.maxFortifyBtn.addEventListener('click', () => fortifySelected(true));
    dom.nextBtn.addEventListener('click', nextPhase);
  }

  renderSlots();
  bind();
})();

(() => {
  const RESOURCE_KEYS = ['cedar', 'clay', 'rice', 'wisteria', 'sunsteel'];
  const RESOURCES = {
    cedar: { name: 'Wood', short: 'Wo', color: '#78d6a7', tile: '#1f6b40', dark: '#0b251d', icon: '/moonfall-settlers/assets/generated/res-wood-512.png', texture: '/moonfall-settlers/assets/generated/tile-forest.png' },
    clay: { name: 'Brick', short: 'Br', color: '#e08a58', tile: '#8a3f2c', dark: '#26100d', icon: '/moonfall-settlers/assets/generated/res-brick-512.png', texture: '/moonfall-settlers/assets/generated/tile-brick.png' },
    rice: { name: 'Wheat', short: 'Wh', color: '#f1d274', tile: '#a37b24', dark: '#2d210b', icon: '/moonfall-settlers/assets/generated/res-wheat-512.png', texture: '/moonfall-settlers/assets/generated/tile-wheat.png' },
    wisteria: { name: 'Sheep', short: 'Sh', color: '#9bc66b', tile: '#415e2a', dark: '#17210e', icon: '/moonfall-settlers/assets/generated/res-sheep-512.png', texture: '/moonfall-settlers/assets/generated/tile-pasture.png' },
    sunsteel: { name: 'Ore', short: 'Or', color: '#c7d2d9', tile: '#677173', dark: '#1d2427', icon: '/moonfall-settlers/assets/generated/res-stone-512.png', texture: '/moonfall-settlers/assets/generated/tile-mountain.png' }
  };

  const ASSETS = {
    background: '/moonfall-settlers/assets/generated/moonfall-bg.png',
    crater: '/moonfall-settlers/assets/generated/tile-crater.png',
    ship: '/moonfall-settlers/assets/generated/port-ship-cutout.png',
    token: '/moonfall-settlers/assets/generated/token-number-cutout.png',
    oni: '/moonfall-settlers/assets/generated/token-oni-medallion.png',
    cardBack: '/moonfall-settlers/assets/generated/card-back-512.png',
    cardKnight: '/moonfall-settlers/assets/generated/card-knight-512.png',
    pieceRoad: '/moonfall-settlers/assets/generated/piece-road-board.png',
    pieceSettlement: '/moonfall-settlers/assets/generated/piece-settlement-board.png',
    pieceCity: '/moonfall-settlers/assets/generated/piece-city-board.png',
    pieceDev: '/moonfall-settlers/assets/generated/piece-dev-card-board.png',
    crests: [
      '/moonfall-settlers/assets/generated/crest-red-cutout.png',
      '/moonfall-settlers/assets/generated/crest-blue-cutout.png',
      '/moonfall-settlers/assets/generated/crest-green-cutout.png',
      '/moonfall-settlers/assets/generated/crest-gold-cutout.png'
    ]
  };

  const TILE_BAG = [
    'cedar', 'cedar', 'cedar', 'cedar',
    'clay', 'clay', 'clay',
    'rice', 'rice', 'rice', 'rice',
    'wisteria', 'wisteria', 'wisteria', 'wisteria',
    'sunsteel', 'sunsteel', 'sunsteel',
    'crater'
  ];

  const NUMBER_BAG = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  const PORT_BAG = ['generic', 'generic', 'generic', 'generic', 'cedar', 'clay', 'rice', 'wisteria', 'sunsteel'];
  const MAX_PIECES = { roads: 15, settlements: 5, cities: 4 };
  const TARGET_DEFAULT = 10;

  const COSTS = {
    road: { cedar: 1, clay: 1 },
    settlement: { cedar: 1, clay: 1, rice: 1, wisteria: 1 },
    city: { rice: 2, sunsteel: 3 },
    dev: { rice: 1, wisteria: 1, sunsteel: 1 }
  };

  const DEV_CARDS = {
    knight: { name: 'Knight', detail: 'Move the Oni and count toward Largest Army.' },
    road: { name: 'Road Building', detail: 'Place two roads for free.' },
    plenty: { name: 'Year of Plenty', detail: 'Take two resources from the bank.' },
    monopoly: { name: 'Monopoly', detail: 'Take one resource type from every clan.' },
    vp: { name: 'Victory Relic', detail: 'Worth one victory point.' }
  };

  const DEV_DECK_BAG = [
    ...Array(14).fill('knight'),
    ...Array(5).fill('vp'),
    ...Array(2).fill('road'),
    ...Array(2).fill('plenty'),
    ...Array(2).fill('monopoly')
  ];

  const PLAYER_PRESETS = [
    { name: 'The Emperor', color: '#f05a5f', accent: '#ffd36b', crest: ASSETS.crests[0] },
    { name: 'Northern Clan', color: '#58b7ff', accent: '#ccecff', crest: ASSETS.crests[1] },
    { name: 'Western Clan', color: '#8dcf58', accent: '#ddffd0', crest: ASSETS.crests[2] },
    { name: 'Southern Clan', color: '#f2c44d', accent: '#fff1b3', crest: ASSETS.crests[3] }
  ];

  const PIP_WEIGHT = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

  const dom = {
    setupView: document.getElementById('setupView'),
    gameView: document.getElementById('gameView'),
    topbar: document.querySelector('.topbar'),
    form: document.getElementById('setupForm'),
    slots: document.getElementById('slots'),
    playerCount: document.getElementById('playerCount'),
    boardMode: document.getElementById('boardMode'),
    targetScore: document.getElementById('targetScore'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    canvas: document.getElementById('boardCanvas'),
    notice: document.getElementById('notice'),
    turnHud: document.getElementById('turnHud'),
    activePlayer: document.getElementById('activePlayer'),
    phaseHud: document.getElementById('phaseHud'),
    diceHud: document.getElementById('diceHud'),
    pointsHud: document.getElementById('pointsHud'),
    targetHud: document.getElementById('targetHud'),
    rollBtn: document.getElementById('rollBtn'),
    endTurnBtn: document.getElementById('endTurnBtn'),
    newGameBtn: document.getElementById('newGameBtn'),
    roadBtn: document.getElementById('roadBtn'),
    settlementBtn: document.getElementById('settlementBtn'),
    cityBtn: document.getElementById('cityBtn'),
    devBtn: document.getElementById('devBtn'),
    resourcePanel: document.getElementById('resourcePanel'),
    costPanel: document.getElementById('costPanel'),
    tradeOpenBtn: document.getElementById('tradeOpenBtn'),
    tradeModal: document.getElementById('tradeModal'),
    tradeCloseBtn: document.getElementById('tradeCloseBtn'),
    tradeCancelBtn: document.getElementById('tradeCancelBtn'),
    tradeBankModeBtn: document.getElementById('tradeBankModeBtn'),
    tradeClanModeBtn: document.getElementById('tradeClanModeBtn'),
    tradeGiveIcons: document.getElementById('tradeGiveIcons'),
    tradeGetIcons: document.getElementById('tradeGetIcons'),
    tradeGiveMinus: document.getElementById('tradeGiveMinus'),
    tradeGivePlus: document.getElementById('tradeGivePlus'),
    tradeGetMinus: document.getElementById('tradeGetMinus'),
    tradeGetPlus: document.getElementById('tradeGetPlus'),
    tradeGiveAmountLabel: document.getElementById('tradeGiveAmountLabel'),
    tradeGetAmountLabel: document.getElementById('tradeGetAmountLabel'),
    tradePartnerRow: document.getElementById('tradePartnerRow'),
    tradeSummary: document.getElementById('tradeSummary'),
    tradeSubmitBtn: document.getElementById('tradeSubmitBtn'),
    tradeResponseModal: document.getElementById('tradeResponseModal'),
    tradeResponseTitle: document.getElementById('tradeResponseTitle'),
    tradeResponseText: document.getElementById('tradeResponseText'),
    tradeResponseSummary: document.getElementById('tradeResponseSummary'),
    tradeResponseActions: document.getElementById('tradeResponseActions'),
    tradeAcceptBtn: document.getElementById('tradeAcceptBtn'),
    tradeDeclineBtn: document.getElementById('tradeDeclineBtn'),
    devPanel: document.getElementById('devPanel'),
    playersPanel: document.getElementById('playersPanel'),
    boardPanel: document.getElementById('boardPanel'),
    logPanel: document.getElementById('logPanel')
  };

  const ctx = dom.canvas.getContext('2d');
  const images = {};
  let state = null;
  let renderQueued = false;
  let noticeTimer = null;
  let aiTimer = null;
  let autoRollTimer = null;
  let tradeResponseTimer = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomInt = max => Math.floor(Math.random() * max);
  const sumResources = resources => RESOURCE_KEYS.reduce((total, key) => total + (resources[key] || 0), 0);

  function loadImage(name, src){
    const image = new Image();
    image.src = src;
    image.onload = queueRender;
    images[name] = image;
  }

  function bootImages(){
    loadImage('background', ASSETS.background);
    loadImage('crater', ASSETS.crater);
    loadImage('ship', ASSETS.ship);
    loadImage('token', ASSETS.token);
    loadImage('oni', ASSETS.oni);
    loadImage('cardBack', ASSETS.cardBack);
    loadImage('cardKnight', ASSETS.cardKnight);
    loadImage('pieceRoad', ASSETS.pieceRoad);
    loadImage('pieceSettlement', ASSETS.pieceSettlement);
    loadImage('pieceCity', ASSETS.pieceCity);
    loadImage('pieceDev', ASSETS.pieceDev);
    ASSETS.crests.forEach((src, index) => loadImage(`crest-${index}`, src));
    RESOURCE_KEYS.forEach(key => {
      loadImage(`tile-${key}`, RESOURCES[key].texture);
      loadImage(`icon-${key}`, RESOURCES[key].icon);
    });
  }

  function shuffle(list){
    const array = list.slice();
    for(let i = array.length - 1; i > 0; i -= 1){
      const j = randomInt(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function escapeHtml(text){
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getSavedName(){
    try{
      return JSON.parse(localStorage.getItem('user') || 'null')?.username || 'Player';
    }catch(_err){
      return 'Player';
    }
  }

  function notice(text){
    dom.notice.textContent = text;
    dom.notice.classList.add('visible');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => dom.notice.classList.remove('visible'), 2600);
  }

  function log(text){
    if(!state) return;
    state.log.unshift(text);
    state.log = state.log.slice(0, 18);
  }

  function renderSlots(){
    const count = Number(dom.playerCount.value);
    dom.slots.innerHTML = '';

    for(let i = 0; i < count; i += 1){
      const preset = PLAYER_PRESETS[i];
      const row = document.createElement('div');
      row.className = 'slot';
      row.innerHTML = `
        <div class="slot-number" style="color:${preset.color}">${i + 1}</div>
        <label>Name<input data-field="name" value="${escapeHtml(i === 0 ? getSavedName() : preset.name)}"></label>
        <label>Type<select data-field="type">
          <option value="human"${i === 0 ? ' selected' : ''}>Human</option>
          <option value="ai"${i !== 0 ? ' selected' : ''}>AI</option>
        </select></label>
      `;
      dom.slots.appendChild(row);
    }
  }

  function shuffleSlotNames(){
    [...dom.slots.querySelectorAll('.slot')].forEach((slot, index) => {
      const input = slot.querySelector('[data-field="name"]');
      if(index === 0) return;
      input.value = shuffle(PLAYER_PRESETS.map(preset => preset.name))[0];
    });
  }

  function readSetup(){
    return [...dom.slots.querySelectorAll('.slot')].map((slot, index) => {
      const preset = PLAYER_PRESETS[index];
      const name = slot.querySelector('[data-field="name"]').value.trim() || preset.name;
      const type = slot.querySelector('[data-field="type"]').value;
      return createPlayer(index, name, type, preset);
    });
  }

  function createPlayer(id, name, type, preset){
    return {
      id,
      name,
      type,
      color: preset.color,
      accent: preset.accent,
      crest: preset.crest,
      resources: { cedar: 0, clay: 0, rice: 0, wisteria: 0, sunsteel: 0 },
      devCards: [],
      knights: 0,
      pieces: { roads: 0, settlements: 0, cities: 0 },
      longestRoad: 0,
      hasLongestRoad: false,
      hasLargestArmy: false,
      alive: true
    };
  }

  function createTradeState(players){
    return {
      open: false,
      mode: 'bank',
      give: 'cedar',
      get: 'clay',
      giveAmount: 4,
      getAmount: 1,
      partnerId: players.find(player => player.id !== 0)?.id ?? players[1]?.id ?? null,
      pendingOffer: null
    };
  }

  function startGame(event){
    event.preventDefault();
    const players = readSetup();
    const targetScore = Number(dom.targetScore.value) || TARGET_DEFAULT;
    state = {
      players,
      board: createBoard(dom.boardMode.value),
      targetScore,
      turn: 0,
      turnNumber: 1,
      phase: 'setup',
      setupQueue: players.map(player => player.id).concat(players.map(player => player.id).reverse()),
      setupStep: 0,
      setupPart: 'settlement',
      setupPendingVertex: null,
      activeMode: 'settlement',
      selected: null,
      hover: null,
      dice: null,
      dicePair: null,
      devDeck: shuffle(DEV_DECK_BAG),
      devPlayedThisTurn: false,
      freeRoads: 0,
      pendingRobber: null,
      largestArmyHolder: null,
      longestRoadHolder: null,
      winner: null,
      log: [],
      trade: createTradeState(players),
      view: { width: 1, height: 1, scale: 1, offsetX: 0, offsetY: 0 }
    };

    dom.setupView.hidden = true;
    dom.setupView.classList.add('is-hidden');
    dom.gameView.hidden = false;
    dom.gameView.classList.remove('is-hidden');
    resizeCanvas();
    log('The clans enter the Moonfall night.');
    notice('Initial placement: settlement, then road.');
    updateAll();
    scheduleAi();
  }

  function createBoard(mode){
    const coords = [];
    for(let q = -2; q <= 2; q += 1){
      for(let r = -2; r <= 2; r += 1){
        const s = -q - r;
        if(Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= 2){
          coords.push({ q, r, s });
        }
      }
    }

    coords.sort((a, b) => a.r - b.r || a.q - b.q);
    const tileSpecs = createTileSpecs(coords, mode);
    const topology = buildTopology(coords);
    const tiles = coords.map((coord, index) => ({
      id: index,
      ...coord,
      type: tileSpecs[index].type,
      number: tileSpecs[index].number,
      center: axialToUnit(coord.q, coord.r),
      vertexIds: topology.tileLinks[index].vertexIds,
      edgeIds: topology.tileLinks[index].edgeIds
    }));

    const crater = tiles.find(tile => tile.type === 'crater') || tiles[9];
    return {
      tiles,
      vertices: topology.vertices,
      edges: topology.edges,
      robberTile: crater.id
    };
  }

  function createTileSpecs(coords, mode){
    let best = null;
    for(let attempt = 0; attempt < 400; attempt += 1){
      const types = shuffle(TILE_BAG);
      if(mode === 'balanced'){
        const centerIndex = coords.findIndex(coord => coord.q === 0 && coord.r === 0);
        const craterIndex = types.indexOf('crater');
        [types[centerIndex], types[craterIndex]] = [types[craterIndex], types[centerIndex]];
      }

      const numbers = shuffle(NUMBER_BAG);
      const specs = types.map(type => ({ type, number: type === 'crater' ? null : numbers.shift() }));
      best = specs;
      if(mode === 'wild' || !hasAdjacentHotNumbers(coords, specs)) return specs;
    }
    return best;
  }

  function hasAdjacentHotNumbers(coords, specs){
    for(let i = 0; i < coords.length; i += 1){
      if(![6, 8].includes(specs[i].number)) continue;
      for(let j = i + 1; j < coords.length; j += 1){
        if(![6, 8].includes(specs[j].number)) continue;
        const a = coords[i];
        const b = coords[j];
        if(Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s)) === 1) return true;
      }
    }
    return false;
  }

  function axialToUnit(q, r){
    return {
      x: Math.sqrt(3) * (q + r / 2),
      y: 1.5 * r
    };
  }

  function buildTopology(coords){
    const vertices = [];
    const edges = [];
    const vertexMap = new Map();
    const edgeMap = new Map();
    const tileLinks = [];

    coords.forEach((coord, tileId) => {
      const center = axialToUnit(coord.q, coord.r);
      const vertexIds = [];
      const edgeIds = [];

      for(let corner = 0; corner < 6; corner += 1){
        const angle = (Math.PI / 180) * (30 + corner * 60);
        const x = center.x + Math.cos(angle);
        const y = center.y + Math.sin(angle);
        const key = `${Math.round(x * 1000)}:${Math.round(y * 1000)}`;

        if(!vertexMap.has(key)){
          vertexMap.set(key, vertices.length);
          vertices.push({ id: vertices.length, x, y, tileIds: [], edgeIds: [], building: null, port: null });
        }

        const vertexId = vertexMap.get(key);
        vertices[vertexId].tileIds.push(tileId);
        vertexIds.push(vertexId);
      }

      for(let corner = 0; corner < 6; corner += 1){
        const a = vertexIds[corner];
        const b = vertexIds[(corner + 1) % 6];
        const key = [a, b].sort((left, right) => left - right).join(':');

        if(!edgeMap.has(key)){
          edgeMap.set(key, edges.length);
          edges.push({ id: edges.length, v1: a, v2: b, tileIds: [], road: null, port: null });
        }

        const edgeId = edgeMap.get(key);
        edges[edgeId].tileIds.push(tileId);
        edgeIds.push(edgeId);
        vertices[a].edgeIds.push(edgeId);
        vertices[b].edgeIds.push(edgeId);
      }

      tileLinks[tileId] = { vertexIds, edgeIds };
    });

    vertices.forEach(vertex => {
      vertex.tileIds = [...new Set(vertex.tileIds)];
      vertex.edgeIds = [...new Set(vertex.edgeIds)];
    });

    assignPorts(vertices, edges);
    return { vertices, edges, tileLinks };
  }

  function assignPorts(vertices, edges){
    const boundaryEdges = edges
      .filter(edge => edge.tileIds.length === 1)
      .sort((a, b) => edgeAngle(vertices, a) - edgeAngle(vertices, b));
    const ports = shuffle(PORT_BAG);
    const step = boundaryEdges.length / ports.length;

    ports.forEach((port, index) => {
      const edge = boundaryEdges[Math.floor(index * step + step / 2) % boundaryEdges.length];
      edge.port = port;
      vertices[edge.v1].port = port;
      vertices[edge.v2].port = port;
    });
  }

  function edgeAngle(vertices, edge){
    const a = vertices[edge.v1];
    const b = vertices[edge.v2];
    return Math.atan2((a.y + b.y) / 2, (a.x + b.x) / 2);
  }

  function resizeCanvas(){
    if(!state) return;
    const rect = dom.canvas.parentElement.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(420, rect.height);
    const dpr = window.devicePixelRatio || 1;
    dom.canvas.width = Math.floor(width * dpr);
    dom.canvas.height = Math.floor(height * dpr);
    dom.canvas.style.width = `${width}px`;
    dom.canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.view.width = width;
    state.view.height = height;
    updateLayout();
    queueRender();
  }

  function updateLayout(){
    const vertices = state.board.vertices;
    const minX = Math.min(...vertices.map(vertex => vertex.x));
    const maxX = Math.max(...vertices.map(vertex => vertex.x));
    const minY = Math.min(...vertices.map(vertex => vertex.y));
    const maxY = Math.max(...vertices.map(vertex => vertex.y));
    const pad = state.view.width < 700 ? 36 : 58;
    const scale = Math.min((state.view.width - pad * 2) / (maxX - minX), (state.view.height - pad * 2) / (maxY - minY));
    state.view.scale = Math.max(42, scale);
    state.view.offsetX = state.view.width / 2 - ((minX + maxX) / 2) * state.view.scale;
    state.view.offsetY = state.view.height / 2 - ((minY + maxY) / 2) * state.view.scale;
  }

  function screenPoint(point){
    return {
      x: point.x * state.view.scale + state.view.offsetX,
      y: point.y * state.view.scale + state.view.offsetY
    };
  }

  function queueRender(){
    if(renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(render);
  }

  function render(){
    renderQueued = false;
    if(!state) return;
    updateLayout();
    drawScene();
  }

  function drawScene(){
    const { width, height } = state.view;
    ctx.clearRect(0, 0, width, height);
    drawBackground(width, height);
    drawSeaVeil(width, height);
    state.board.tiles
      .slice()
      .sort((a, b) => a.center.y - b.center.y)
      .forEach(drawTile);
    drawPorts();
    drawPlacementHints();
    drawRoads();
    drawBuildings();
    drawRobber();
    drawHover();
  }

  function drawBackground(width, height){
    const image = images.background;
    if(image?.complete && image.naturalWidth){
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    }else{
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, '#06111a');
      bg.addColorStop(1, '#101820');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawSeaVeil(width, height){
    ctx.save();
    const veil = ctx.createRadialGradient(width * .5, height * .48, 80, width * .5, height * .5, Math.max(width, height) * .62);
    veil.addColorStop(0, 'rgba(0,0,0,.05)');
    veil.addColorStop(.5, 'rgba(0,0,0,.12)');
    veil.addColorStop(1, 'rgba(0,0,0,.58)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function drawHexPath(center, radius){
    ctx.beginPath();
    for(let corner = 0; corner < 6; corner += 1){
      const angle = (Math.PI / 180) * (30 + corner * 60);
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      if(corner === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function getTileCorners(tile){
    const center = screenPoint(tile.center);
    const corners = [];
    for(let corner = 0; corner < 6; corner += 1){
      const angle = (Math.PI / 180) * (30 + corner * 60);
      corners.push({
        x: center.x + Math.cos(angle) * state.view.scale,
        y: center.y + Math.sin(angle) * state.view.scale
      });
    }
    return corners;
  }

  function drawTile(tile){
    const center = screenPoint(tile.center);
    const corners = getTileCorners(tile);
    const resource = RESOURCES[tile.type];
    const tileImage = tile.type === 'crater' ? images.crater : images[`tile-${tile.type}`];

    ctx.save();
    ctx.beginPath();
    corners.forEach((point, index) => {
      if(index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,0,.22)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = tile.type === 'crater' ? '#151010' : resource.tile;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.clip();
    if(tileImage?.complete && tileImage.naturalWidth){
      const drawSize = state.view.scale * 2.34;
      ctx.drawImage(tileImage, center.x - drawSize / 2, center.y - drawSize / 2, drawSize, drawSize);
    }else{
      drawTilePattern(tile, center);
      drawTileIcon(tile, center);
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    corners.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.lineWidth = state.hover?.tileId === tile.id ? 5 : 2;
    ctx.strokeStyle = state.hover?.tileId === tile.id ? '#f4c66e' : 'rgba(187,143,73,.72)';
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,237,182,.42)';
    ctx.stroke();
    ctx.restore();

    if(tile.type !== 'crater'){
      drawNumberToken(center, tile.number);
    }
  }

  function drawTilePattern(tile, center){
    const size = state.view.scale;
    if(tile.type === 'cedar'){
      for(let i = -2; i <= 2; i += 1){
        drawTree(center.x + i * size * .23, center.y + size * .22 + ((i % 2) * size * .1), size * .18);
      }
    }else if(tile.type === 'clay'){
      ctx.strokeStyle = 'rgba(70,31,24,.42)';
      ctx.lineWidth = 3;
      for(let i = -3; i <= 3; i += 1){
        ctx.beginPath();
        ctx.moveTo(center.x - size * .72, center.y + i * size * .2);
        ctx.lineTo(center.x + size * .72, center.y + i * size * .12 - size * .16);
        ctx.stroke();
      }
    }else if(tile.type === 'rice'){
      ctx.strokeStyle = 'rgba(255,243,174,.42)';
      ctx.lineWidth = 2;
      for(let i = -3; i <= 3; i += 1){
        ctx.beginPath();
        ctx.moveTo(center.x - size * .75, center.y + i * size * .17);
        ctx.quadraticCurveTo(center.x, center.y + i * size * .17 + 10, center.x + size * .75, center.y + i * size * .17);
        ctx.stroke();
      }
    }else if(tile.type === 'wisteria'){
      ctx.strokeStyle = 'rgba(225,214,255,.36)';
      ctx.lineWidth = 2;
      for(let i = -2; i <= 2; i += 1){
        ctx.beginPath();
        ctx.moveTo(center.x + i * size * .18, center.y - size * .52);
        ctx.bezierCurveTo(center.x + i * size * .2 + 14, center.y - 8, center.x + i * size * .12 - 14, center.y + 28, center.x + i * size * .14, center.y + size * .52);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(236,220,255,.55)';
      for(let i = 0; i < 16; i += 1){
        ctx.beginPath();
        ctx.ellipse(center.x + Math.cos(i) * size * .48, center.y + Math.sin(i * 1.7) * size * .38, 4, 7, i, 0, Math.PI * 2);
        ctx.fill();
      }
    }else if(tile.type === 'sunsteel'){
      ctx.fillStyle = 'rgba(24,30,34,.34)';
      for(let i = -1; i <= 1; i += 1){
        ctx.beginPath();
        ctx.moveTo(center.x + i * size * .26 - size * .25, center.y + size * .42);
        ctx.lineTo(center.x + i * size * .26, center.y - size * .44);
        ctx.lineTo(center.x + i * size * .26 + size * .28, center.y + size * .42);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(236,247,255,.38)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center.x - size * .22, center.y - size * .1);
      ctx.lineTo(center.x, center.y - size * .44);
      ctx.lineTo(center.x + size * .2, center.y - size * .08);
      ctx.stroke();
    }else{
      ctx.fillStyle = '#120c11';
      ctx.beginPath();
      ctx.arc(center.x, center.y, size * .48, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(229,78,93,.42)';
      ctx.lineWidth = 3;
      for(let i = 0; i < 8; i += 1){
        const angle = (Math.PI * 2 / 8) * i;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(center.x + Math.cos(angle) * size * .75, center.y + Math.sin(angle) * size * .75);
        ctx.stroke();
      }
    }
  }

  function drawTileIcon(tile, center){
    const size = state.view.scale;
    ctx.save();
    ctx.translate(center.x, center.y - size * .34);
    ctx.globalAlpha = .88;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if(tile.type === 'cedar'){
      drawTree(0, 8, size * .2);
    }else if(tile.type === 'clay'){
      ctx.fillStyle = 'rgba(255,235,210,.78)';
      ctx.strokeStyle = 'rgba(109,50,33,.7)';
      ctx.lineWidth = 3;
      [-16, 0, 16].forEach((x, index) => {
        roundedRect(x - 12, index === 1 ? -10 : 2, 24, 14, 3);
        ctx.fill();
        ctx.stroke();
      });
    }else if(tile.type === 'rice'){
      ctx.strokeStyle = 'rgba(111,83,22,.78)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 22);
      ctx.lineTo(0, -22);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,245,153,.86)';
      for(let i = 0; i < 6; i += 1){
        const side = i % 2 === 0 ? -1 : 1;
        ctx.beginPath();
        ctx.ellipse(side * 10, -16 + i * 7, 6, 13, side * .7, 0, Math.PI * 2);
        ctx.fill();
      }
    }else if(tile.type === 'wisteria'){
      ctx.strokeStyle = 'rgba(55,98,30,.72)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-20, -18);
      ctx.quadraticCurveTo(0, -28, 20, -18);
      ctx.stroke();
      ctx.fillStyle = 'rgba(244,236,255,.82)';
      for(let i = -2; i <= 2; i += 1){
        ctx.beginPath();
        ctx.ellipse(i * 8, 2 + Math.abs(i) * 4, 6, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }else if(tile.type === 'sunsteel'){
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.strokeStyle = 'rgba(70,80,82,.62)';
      ctx.lineWidth = 4;
      for(let i = -1; i <= 1; i += 1){
        ctx.beginPath();
        ctx.moveTo(i * 18, -22);
        ctx.lineTo(i * 18 - 14, 18);
        ctx.lineTo(i * 18 + 16, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }else{
      ctx.fillStyle = 'rgba(40,43,38,.42)';
      ctx.beginPath();
      ctx.arc(0, 0, size * .24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(83,85,70,.55)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-24, 12);
      ctx.quadraticCurveTo(0, -18, 24, 12);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTree(x, y, size){
    ctx.fillStyle = 'rgba(14,55,43,.56)';
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - size * .62, y + size * .5);
    ctx.lineTo(x + size * .62, y + size * .5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(218,166,84,.55)';
    ctx.fillRect(x - size * .08, y + size * .3, size * .16, size * .54);
  }

  function drawNumberToken(center, number){
    ctx.save();
    const size = 58;
    const y = center.y + state.view.scale * .1;
    const rolled = state.dice === number;
    if(rolled){
      ctx.shadowColor = 'rgba(94,228,109,.58)';
      ctx.shadowBlur = 18;
    }
    if(images.token?.complete && images.token.naturalWidth){
      ctx.drawImage(images.token, center.x - size / 2, y - size / 2, size, size);
    }else{
      ctx.beginPath();
      ctx.arc(center.x, y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#d9c18b';
      ctx.fill();
      ctx.strokeStyle = '#5d4523';
      ctx.stroke();
    }
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = rolled ? '#0f8a4f' : '#151515';
    ctx.font = '900 28px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), center.x, y - 2);

    const pips = PIP_WEIGHT[number] || 0;
    ctx.fillStyle = rolled ? '#0f8a4f' : '#151515';
    const start = center.x - (pips - 1) * 3.5;
    for(let i = 0; i < pips; i += 1){
      ctx.beginPath();
      ctx.arc(start + i * 7, y + 16, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPorts(){
    const boundary = state.board.edges.filter(edge => edge.port);
    boundary.forEach(edge => {
      const a = screenPoint(state.board.vertices[edge.v1]);
      const b = screenPoint(state.board.vertices[edge.v2]);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const angle = Math.atan2(my - state.view.height / 2, mx - state.view.width / 2);
      const px = mx + Math.cos(angle) * 34;
      const py = my + Math.sin(angle) * 34;
      const label = edge.port === 'generic' ? '3:1' : `${RESOURCES[edge.port].short} 2:1`;

      ctx.save();
      ctx.strokeStyle = '#b98931';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(px, py);
      ctx.stroke();
      drawShip(px, py, angle + Math.PI / 2, label, edge.port);
      ctx.restore();
    });
  }

  function drawShip(x, y, rotation, label, port){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    if(images.ship?.complete && images.ship.naturalWidth){
      ctx.drawImage(images.ship, -32, -38, 64, 64);
    }else{
      ctx.fillStyle = '#b66f28';
      ctx.strokeStyle = '#704116';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-24, 12);
      ctx.quadraticCurveTo(0, 28, 24, 12);
      ctx.lineTo(17, 26);
      ctx.lineTo(-17, 26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fffdf4';
      ctx.strokeStyle = '#b9a781';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, -26);
      ctx.lineTo(14, -20);
      ctx.lineTo(8, 8);
      ctx.lineTo(-12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#704116';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(0, 14);
      ctx.stroke();
    }

    ctx.restore();
    ctx.save();
    roundedRect(x - 19, y + 16, 38, 22, 7);
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    ctx.strokeStyle = '#b9a781';
    ctx.stroke();
    ctx.fillStyle = '#5b4a35';
    ctx.font = '900 12px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 27);
    ctx.restore();
  }

  function drawPlacementHints(){
    if(!isHumanInteraction()) return;
    const player = getInteractionPlayer();
    if(!player) return;

    ctx.save();
    if(state.activeMode === 'settlement'){
      state.board.vertices.forEach(vertex => {
        if(canBuildSettlement(player.id, vertex.id, state.phase === 'setup')){
          const point = screenPoint(vertex);
          ctx.beginPath();
          ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(242,200,109,.3)';
          ctx.fill();
          ctx.strokeStyle = '#f2c86d';
          ctx.stroke();
        }
      });
    }else if(state.activeMode === 'city'){
      state.board.vertices.forEach(vertex => {
        if(canBuildCity(player.id, vertex.id)){
          const point = screenPoint(vertex);
          ctx.beginPath();
          ctx.arc(point.x, point.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(92,207,187,.26)';
          ctx.fill();
          ctx.strokeStyle = '#7fe3d0';
          ctx.stroke();
        }
      });
    }else if(state.activeMode === 'road'){
      state.board.edges.forEach(edge => {
        if(canBuildRoad(player.id, edge.id, state.phase === 'setup' || state.freeRoads > 0)){
          const a = screenPoint(state.board.vertices[edge.v1]);
          const b = screenPoint(state.board.vertices[edge.v2]);
          ctx.shadowColor = 'rgba(242,200,109,.48)';
          ctx.shadowBlur = 16;
          ctx.strokeStyle = 'rgba(242,200,109,.92)';
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(37,27,15,.84)';
          ctx.lineWidth = 5;
          ctx.stroke();
          [a, b].forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(242,200,109,.18)';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#f2c86d';
            ctx.stroke();
          });
        }
      });
    }
    ctx.restore();
  }

  function drawRoads(){
    state.board.edges.forEach(edge => {
      if(edge.road === null) return;
      const player = state.players[edge.road];
      const a = screenPoint(state.board.vertices[edge.v1]);
      const b = screenPoint(state.board.vertices[edge.v2]);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const image = images.pieceRoad;

      ctx.save();
      ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
      ctx.rotate(angle);

      if(image?.complete && image.naturalWidth){
        const ratio = image.naturalWidth / image.naturalHeight;
        const drawWidth = length * 1.08;
        const drawHeight = Math.min(drawWidth / ratio, Math.max(28, state.view.scale * .5));
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.34)';
        ctx.shadowBlur = 12;
        ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();
      }else{
        ctx.strokeStyle = player.color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-length * .44, 0);
        ctx.lineTo(length * .44, 0);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawBuildings(){
    state.board.vertices.forEach(vertex => {
      if(!vertex.building) return;
      const point = screenPoint(vertex);
      const player = state.players[vertex.building.playerId];
      drawBuilding(point.x, point.y, player, vertex.building.kind);
    });
  }

  function drawBuilding(x, y, player, kind){
    const size = kind === 'city' ? 18 : 14;
    const image = kind === 'city' ? images.pieceCity : images.pieceSettlement;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.44)';
    ctx.beginPath();
    ctx.ellipse(0, size * .72, size * 1.05, size * .36, 0, 0, Math.PI * 2);
    ctx.fill();

    if(image?.complete && image.naturalWidth){
      const drawHeight = kind === 'city' ? 86 : 68;
      const drawWidth = drawHeight * (image.naturalWidth / image.naturalHeight);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.38)';
      ctx.shadowBlur = 16;
      ctx.drawImage(image, -drawWidth / 2, -drawHeight + size * .75, drawWidth, drawHeight);
      ctx.restore();
      ctx.restore();
      return;
    }

    ctx.fillStyle = player.color;
    ctx.strokeStyle = '#11181c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, -size * .25);
    ctx.lineTo(size * .7, size);
    ctx.lineTo(-size * .7, size);
    ctx.lineTo(-size, -size * .25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = player.accent;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.18);
    ctx.lineTo(size * .58, -size * .45);
    ctx.lineTo(-size * .58, -size * .45);
    ctx.closePath();
    ctx.fill();

    if(kind === 'city'){
      ctx.fillStyle = player.color;
      ctx.fillRect(-size * .38, -size * 1.65, size * .76, size * .7);
      ctx.strokeRect(-size * .38, -size * 1.65, size * .76, size * .7);
      ctx.fillStyle = player.accent;
      ctx.fillRect(-size * .22, -size * 1.98, size * .44, size * .36);
    }
    ctx.restore();
  }

  function drawRobber(){
    const tile = state.board.tiles[state.board.robberTile];
    const center = screenPoint(tile.center);
    if(images.oni?.complete && images.oni.naturalWidth){
      const size = state.view.scale * .86;
      ctx.save();
      ctx.shadowColor = 'rgba(220, 24, 42, .75)';
      ctx.shadowBlur = 18;
      ctx.drawImage(images.oni, center.x - size / 2, center.y - size / 2, size, size);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(center.x, center.y - 42);
    ctx.fillStyle = 'rgba(5,8,12,.84)';
    ctx.strokeStyle = '#f05a5f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 8, 18, Math.PI, 0);
    ctx.lineTo(15, 32);
    ctx.lineTo(-15, 32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, -2);
    ctx.lineTo(-22, -20);
    ctx.lineTo(-2, -9);
    ctx.moveTo(9, -2);
    ctx.lineTo(22, -20);
    ctx.lineTo(2, -9);
    ctx.stroke();
    ctx.fillStyle = '#ffd36b';
    ctx.beginPath();
    ctx.arc(-6, 10, 2.8, 0, Math.PI * 2);
    ctx.arc(6, 10, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHover(){
    if(!state.hover) return;
    ctx.save();
    ctx.strokeStyle = '#ffe4a6';
    ctx.lineWidth = 3;
    if(state.hover.vertexId !== undefined){
      const vertex = state.board.vertices[state.hover.vertexId];
      const point = screenPoint(vertex);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }else if(state.hover.edgeId !== undefined){
      const edge = state.board.edges[state.hover.edgeId];
      const a = screenPoint(state.board.vertices[edge.v1]);
      const b = screenPoint(state.board.vertices[edge.v2]);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function roundedRect(x, y, width, height, radius){
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function handleMouseMove(event){
    if(!state) return;
    const point = getCanvasPoint(event);
    state.hover = hitTest(point.x, point.y);
    queueRender();
  }

  function handleCanvasLeave(){
    if(!state) return;
    state.hover = null;
    queueRender();
  }

  function handleCanvasClick(event){
    if(!state || state.winner || !isHumanInteraction()) return;
    const point = getCanvasPoint(event);
    const hit = hitTest(point.x, point.y);
    if(!hit) return;
    const player = getInteractionPlayer();

    if(state.phase === 'setup'){
      handleSetupClick(player, hit);
      return;
    }

    if(state.activeMode === 'robber' && hit.tileId !== undefined){
      moveRobber(player.id, hit.tileId);
      return;
    }

    if(state.phase !== 'main') return;

    if(state.activeMode === 'road' && hit.edgeId !== undefined){
      if(buildRoad(player.id, hit.edgeId, state.freeRoads > 0)){
        if(state.freeRoads > 0){
          state.freeRoads -= 1;
          if(state.freeRoads === 0) state.activeMode = null;
        }
        updateAll();
      }
      return;
    }

    if(state.activeMode === 'settlement' && hit.vertexId !== undefined){
      if(buildSettlement(player.id, hit.vertexId, false)) updateAll();
      return;
    }

    if(state.activeMode === 'city' && hit.vertexId !== undefined){
      if(buildCity(player.id, hit.vertexId)) updateAll();
      return;
    }

    if(hit.tileId !== undefined) state.selected = { type: 'tile', id: hit.tileId };
    if(hit.vertexId !== undefined) state.selected = { type: 'vertex', id: hit.vertexId };
    updateAll();
  }

  function getCanvasPoint(event){
    const rect = dom.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function hitTest(x, y){
    const player = getInteractionPlayer();
    const mode = state.activeMode;
    const freeRoad = state.phase === 'setup' || state.freeRoads > 0;
    const vertexRadius = mode === 'settlement' || mode === 'city' ? 22 : 14;
    let nearestVertex = null;
    let nearestVertexDistance = Infinity;

    state.board.vertices.forEach(vertex => {
      const point = screenPoint(vertex);
      const dist = Math.hypot(point.x - x, point.y - y);
      if(dist < nearestVertexDistance){
        nearestVertexDistance = dist;
        nearestVertex = vertex;
      }
    });

    const validVertex =
      nearestVertex
      && (
        mode === 'settlement' ? canBuildSettlement(player.id, nearestVertex.id, state.phase === 'setup')
        : mode === 'city' ? canBuildCity(player.id, nearestVertex.id)
        : true
      );

    if(validVertex && nearestVertexDistance <= vertexRadius){
      return { vertexId: nearestVertex.id };
    }

    let nearestEdge = null;
    let nearestEdgeDistance = Infinity;
    state.board.edges.forEach(edge => {
      const a = screenPoint(state.board.vertices[edge.v1]);
      const b = screenPoint(state.board.vertices[edge.v2]);
      const dist = distanceToSegment({ x, y }, a, b);
      if(dist < nearestEdgeDistance){
        nearestEdgeDistance = dist;
        nearestEdge = edge;
      }
    });

    if(nearestEdge && nearestEdgeDistance <= (mode === 'road' ? 18 : 10)){
      if(!player || mode !== 'road' || canBuildRoad(player.id, nearestEdge.id, freeRoad)){
        return { edgeId: nearestEdge.id };
      }
    }

    for(const tile of state.board.tiles){
      if(pointInPolygon({ x, y }, getTileCorners(tile))) return { tileId: tile.id };
    }
    return null;
  }

  function distanceToSegment(point, a, b){
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = dx * dx + dy * dy;
    const t = len === 0 ? 0 : clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / len, 0, 1);
    return Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t));
  }

  function pointInPolygon(point, polygon){
    let inside = false;
    for(let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1){
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if(intersect) inside = !inside;
    }
    return inside;
  }

  function handleSetupClick(player, hit){
    if(state.setupPart === 'settlement' && hit.vertexId !== undefined){
      if(!canBuildSettlement(player.id, hit.vertexId, true)){
        notice('Invalid placement.');
        return;
      }
      placeSettlement(player.id, hit.vertexId, true);
      state.setupPendingVertex = hit.vertexId;
      state.setupPart = 'road';
      state.activeMode = 'road';
      log(`${player.name} founds a settlement.`);
      notice(`${player.name}: place your starting road.`);
      updateAll();
      return;
    }

    if(state.setupPart === 'road' && hit.edgeId !== undefined){
      if(!canBuildRoad(player.id, hit.edgeId, true)){
        notice('Invalid road.');
        return;
      }
      placeRoad(player.id, hit.edgeId, true);
      if(state.setupStep >= state.players.length) grantInitialResources(player.id, state.setupPendingVertex);
      advanceSetup();
    }
  }

  function advanceSetup(){
    state.setupPendingVertex = null;
    state.setupPart = 'settlement';
    state.setupStep += 1;

    if(state.setupStep >= state.setupQueue.length){
      state.phase = 'roll';
      state.activeMode = null;
      state.turn = 0;
      state.turnNumber = 1;
      log('The last torch is planted. The dice decide what comes next.');
      notice(`${currentPlayer().name}: rolling dice.`);
      updateAll();
      scheduleAi();
      return;
    }

    state.activeMode = 'settlement';
    const next = getSetupPlayer();
    notice(`${next.name}: place your starting settlement.`);
    updateAll();
    scheduleAi();
  }

  function grantInitialResources(playerId, vertexId){
    const player = state.players[playerId];
    const vertex = state.board.vertices[vertexId];
    vertex.tileIds.forEach(tileId => {
      const tile = state.board.tiles[tileId];
      if(tile.type === 'crater') return;
      player.resources[tile.type] += 1;
    });
    log(`${player.name} receives starting resources.`);
  }

  function rollDice(){
    if(!state || state.phase !== 'roll' || state.winner) return;
    const player = currentPlayer();
    const diceOne = 1 + randomInt(6);
    const diceTwo = 1 + randomInt(6);
    const roll = diceOne + diceTwo;
    state.dice = roll;
    state.dicePair = [diceOne, diceTwo];
    state.devPlayedThisTurn = false;
    log(`${player.name} rolls ${diceOne} + ${diceTwo} = ${roll}.`);

    if(roll === 7){
      discardForSeven();
      state.phase = 'robber';
      state.activeMode = 'robber';
      state.pendingRobber = { playerId: player.id, source: 'dice' };
      notice(`${player.name}: move the Oni.`);
      updateAll();
      scheduleAi();
      return;
    }

    distributeResources(roll);
    state.phase = 'main';
    state.activeMode = null;
    updateAll();
    scheduleAi();
  }

  function discardForSeven(){
    state.players.forEach(player => {
      const total = sumResources(player.resources);
      if(total <= 7) return;
      let toDiscard = Math.floor(total / 2);
      while(toDiscard > 0){
        const available = RESOURCE_KEYS.filter(key => player.resources[key] > 0);
        if(!available.length) break;
        const key = available[randomInt(available.length)];
        player.resources[key] -= 1;
        toDiscard -= 1;
      }
      log(`${player.name} loses supplies in the panic.`);
    });
  }

  function distributeResources(roll){
    let gained = 0;
    state.board.tiles.forEach(tile => {
      if(tile.number !== roll || tile.id === state.board.robberTile || tile.type === 'crater') return;
      tile.vertexIds.forEach(vertexId => {
        const building = state.board.vertices[vertexId].building;
        if(!building) return;
        const amount = building.kind === 'city' ? 2 : 1;
        state.players[building.playerId].resources[tile.type] += amount;
        gained += amount;
      });
    });

    log(gained ? `${gained} resources arrive on the board.` : 'The night stays silent.');
  }

  function moveRobber(playerId, tileId){
    if(state.board.robberTile === tileId){
      notice('Choose another tile.');
      return false;
    }

    const player = state.players[playerId];
    state.board.robberTile = tileId;
    const victims = getRobberVictims(playerId, tileId);
    if(victims.length){
      const victim = victims[randomInt(victims.length)];
      const available = RESOURCE_KEYS.filter(key => victim.resources[key] > 0);
      const resource = available[randomInt(available.length)];
      victim.resources[resource] -= 1;
      player.resources[resource] += 1;
      log(`${player.name} steals ${RESOURCES[resource].name} from ${victim.name}.`);
    }else{
      log(`${player.name} moves the Oni without loot.`);
    }

    state.phase = 'main';
    state.activeMode = null;
    state.pendingRobber = null;
    updateAll();
    scheduleAi();
    return true;
  }

  function getRobberVictims(playerId, tileId){
    const ids = new Set();
    const tile = state.board.tiles[tileId];
    tile.vertexIds.forEach(vertexId => {
      const building = state.board.vertices[vertexId].building;
      if(building && building.playerId !== playerId && sumResources(state.players[building.playerId].resources) > 0){
        ids.add(building.playerId);
      }
    });
    return [...ids].map(id => state.players[id]);
  }

  function setMode(mode){
    if(!state || state.phase !== 'main' || !isHumanInteraction()) return;
    state.activeMode = state.activeMode === mode ? null : mode;
    updateAll();
  }

  function buildRoad(playerId, edgeId, free){
    const player = state.players[playerId];
    if(!canBuildRoad(playerId, edgeId, free)){
      notice('Invalid road.');
      return false;
    }
    if(!free && !spend(player, COSTS.road)){
      notice('Not enough resources.');
      return false;
    }
    placeRoad(playerId, edgeId, true);
    log(`${player.name} builds a road.`);
    updateAwards();
    checkVictory(playerId);
    return true;
  }

  function placeRoad(playerId, edgeId){
    const edge = state.board.edges[edgeId];
    edge.road = playerId;
    state.players[playerId].pieces.roads += 1;
  }

  function buildSettlement(playerId, vertexId, free){
    const player = state.players[playerId];
    if(!canBuildSettlement(playerId, vertexId, free)){
      notice('Invalid settlement.');
      return false;
    }
    if(!free && !spend(player, COSTS.settlement)){
      notice('Not enough resources.');
      return false;
    }
    placeSettlement(playerId, vertexId, true);
    log(`${player.name} founds a settlement.`);
    checkVictory(playerId);
    return true;
  }

  function placeSettlement(playerId, vertexId){
    const vertex = state.board.vertices[vertexId];
    vertex.building = { playerId, kind: 'settlement' };
    state.players[playerId].pieces.settlements += 1;
  }

  function buildCity(playerId, vertexId){
    const player = state.players[playerId];
    if(!canBuildCity(playerId, vertexId)){
      notice('Invalid city.');
      return false;
    }
    if(!spend(player, COSTS.city)){
      notice('Not enough resources.');
      return false;
    }
    const vertex = state.board.vertices[vertexId];
    vertex.building.kind = 'city';
    player.pieces.settlements -= 1;
    player.pieces.cities += 1;
    log(`${player.name} upgrades a city.`);
    checkVictory(playerId);
    return true;
  }

  function buyDevCard(){
    const player = currentPlayer();
    if(!isHumanInteraction() || state.phase !== 'main') return;
    if(!state.devDeck.length){
      notice('The deck is empty.');
      return;
    }
    if(!spend(player, COSTS.dev)){
      notice('Not enough resources.');
      return;
    }
    const type = state.devDeck.pop();
    player.devCards.push({ type, fresh: true });
    log(`${player.name} draws ${DEV_CARDS[type].name}.`);
    checkVictory(player.id);
    updateAll();
  }

  function playDevCard(type){
    const player = currentPlayer();
    if(!isHumanInteraction() || state.phase !== 'main' || state.devPlayedThisTurn) return;
    const index = player.devCards.findIndex(card => card.type === type && !card.fresh && card.type !== 'vp');
    if(index < 0){
      notice('Card unavailable this turn.');
      return;
    }
    player.devCards.splice(index, 1);
    state.devPlayedThisTurn = true;

    if(type === 'knight'){
      player.knights += 1;
      state.activeMode = 'robber';
      state.pendingRobber = { playerId: player.id, source: 'knight' };
      updateLargestArmy();
      log(`${player.name} plays a Knight.`);
      notice('Move the Oni.');
    }else if(type === 'road'){
      state.freeRoads = 2;
      state.activeMode = 'road';
      log(`${player.name} plays Road Building.`);
      notice('Place two free roads.');
    }else if(type === 'plenty'){
      const first = document.getElementById('plentyOne')?.value || 'cedar';
      const second = document.getElementById('plentyTwo')?.value || first;
      player.resources[first] += 1;
      player.resources[second] += 1;
      log(`${player.name} receives Year of Plenty.`);
    }else if(type === 'monopoly'){
      const resource = document.getElementById('monopolyResource')?.value || 'cedar';
      let total = 0;
      state.players.forEach(other => {
        if(other.id === player.id) return;
        total += other.resources[resource];
        player.resources[resource] += other.resources[resource];
        other.resources[resource] = 0;
      });
      log(`${player.name} prend ${total} ${RESOURCES[resource].name}.`);
    }

    checkVictory(player.id);
    updateAll();
  }

  function syncTradeState(){
    if(!state) return;
    const trade = state.trade;
    if(trade.give === trade.get){
      trade.get = RESOURCE_KEYS.find(key => key !== trade.give) || 'clay';
    }
    if(trade.mode === 'bank'){
      trade.getAmount = clamp(trade.getAmount || 1, 1, 4);
      trade.giveAmount = getTradeRatio(currentPlayer().id, trade.give) * trade.getAmount;
      return;
    }
    trade.giveAmount = clamp(trade.giveAmount || 1, 1, 19);
    trade.getAmount = clamp(trade.getAmount || 1, 1, 19);
    if(!state.players.some(player => player.id === trade.partnerId && player.id !== currentPlayer().id)){
      trade.partnerId = state.players.find(player => player.id !== currentPlayer().id)?.id ?? null;
    }
  }

  function openTradeModal(event){
    event?.preventDefault?.();
    if(!state || state.phase !== 'main' || !isHumanInteraction()) return;
    dom.tradeOpenBtn.parentElement.open = false;
    state.trade.open = true;
    syncTradeState();
    dom.tradeModal.hidden = false;
    dom.tradeModal.classList.remove('is-hidden');
    renderTradePanel();
  }

  function closeTradeModal(){
    if(!state) return;
    dom.tradeOpenBtn.parentElement.open = false;
    state.trade.open = false;
    dom.tradeModal.hidden = true;
    dom.tradeModal.classList.add('is-hidden');
  }

  function closeTradeResponse(){
    clearTimeout(tradeResponseTimer);
    if(!state) return;
    state.trade.pendingOffer = null;
    dom.tradeResponseModal.hidden = true;
    dom.tradeResponseModal.classList.add('is-hidden');
  }

  function setTradeMode(mode){
    if(!state) return;
    state.trade.mode = mode;
    syncTradeState();
    renderTradePanel();
  }

  function setTradeResource(side, resource){
    if(!state) return;
    state.trade[side] = resource;
    syncTradeState();
    renderTradePanel();
  }

  function changeTradeAmount(side, delta){
    if(!state) return;
    if(state.trade.mode === 'bank' && side === 'giveAmount') return;
    const key = side === 'giveAmount' ? 'giveAmount' : 'getAmount';
    state.trade[key] = clamp((state.trade[key] || 1) + delta, 1, 19);
    syncTradeState();
    renderTradePanel();
  }

  function selectTradePartner(partnerId){
    if(!state) return;
    state.trade.partnerId = partnerId;
    renderTradePanel();
  }

  function describeTradeOffer(offer){
    return `
      <div class="trade-summary-row">
        <strong>${state.players[offer.from].name}</strong>
        <div class="trade-summary-icons">
          ${tradeMiniCard(offer.give, offer.giveAmount)}
          ${tradeMiniCard(offer.get, offer.getAmount)}
        </div>
      </div>
    `;
  }

  function tradeMiniCard(resource, amount){
    return `
      <span class="trade-mini-card">
        <img src="${RESOURCES[resource].icon}" alt="">
        <b>x${amount}</b>
      </span>
    `;
  }

  function submitTrade(){
    if(!state || state.phase !== 'main' || !isHumanInteraction()) return;
    if(state.trade.mode === 'bank'){
      bankTrade();
      return;
    }
    playerTrade();
  }

  function bankTrade(){
    const player = currentPlayer();
    const trade = state.trade;
    syncTradeState();
    if(trade.give === trade.get){
      notice('Choose two different resources.');
      return;
    }
    if(player.resources[trade.give] < trade.giveAmount){
      notice(`Il faut ${trade.giveAmount} ${RESOURCES[trade.give].name}.`);
      return;
    }
    player.resources[trade.give] -= trade.giveAmount;
    player.resources[trade.get] += trade.getAmount;
    log(`${player.name} trades ${trade.giveAmount} ${RESOURCES[trade.give].name} with the bank for ${trade.getAmount} ${RESOURCES[trade.get].name}.`);
    closeTradeModal();
    updateAll();
  }

  function playerTrade(){
    const player = currentPlayer();
    const trade = state.trade;
    syncTradeState();
    const partner = state.players.find(entry => entry.id === trade.partnerId);
    if(!partner || partner.id === player.id){
      notice('Choose a clan.');
      return;
    }
    if(trade.give === trade.get){
      notice('Choose two different resources.');
      return;
    }
    if(player.resources[trade.give] < trade.giveAmount){
      notice(`${player.name} needs more ${RESOURCES[trade.give].name}.`);
      return;
    }
    if(partner.resources[trade.get] < trade.getAmount){
      notice(`${partner.name} needs more ${RESOURCES[trade.get].name}.`);
      return;
    }

    const offer = {
      from: player.id,
      to: partner.id,
      give: trade.give,
      giveAmount: trade.giveAmount,
      get: trade.get,
      getAmount: trade.getAmount
    };
    state.trade.pendingOffer = offer;
    openTradeResponse(offer);
  }

  function openTradeResponse(offer){
    const from = state.players[offer.from];
    const to = state.players[offer.to];
    dom.tradeResponseModal.hidden = false;
    dom.tradeResponseModal.classList.remove('is-hidden');
    dom.tradeResponseTitle.textContent = `${to.name} reviews the offer`;
    dom.tradeResponseSummary.innerHTML = describeTradeOffer(offer);

    if(to.type === 'ai'){
      dom.tradeResponseText.textContent = `${to.name} examines the exchange in silence.`;
      dom.tradeResponseActions.hidden = true;
      clearTimeout(tradeResponseTimer);
      tradeResponseTimer = setTimeout(() => resolveTradeOffer(aiAcceptTrade(offer)), 900);
      return;
    }

    dom.tradeResponseText.textContent = `${from.name} offers ${offer.giveAmount} ${RESOURCES[offer.give].name} for ${offer.getAmount} ${RESOURCES[offer.get].name}.`;
    dom.tradeResponseActions.hidden = false;
  }

  function aiAcceptTrade(offer){
    const partner = state.players[offer.to];
    if(partner.resources[offer.get] < offer.getAmount) return false;
    const incoming = tradeNeedScore(partner, offer.give) * offer.giveAmount;
    const outgoing = tradeNeedScore(partner, offer.get) * offer.getAmount;
    return incoming >= outgoing * 0.92;
  }

  function tradeNeedScore(player, resource){
    const plans = [COSTS.city, COSTS.settlement, COSTS.road, COSTS.dev];
    const shortages = plans.reduce((best, cost) => Math.max(best, Math.max(0, (cost[resource] || 0) - player.resources[resource])), 0);
    return 1 + shortages * 0.9 + (player.resources[resource] <= 1 ? 0.45 : 0);
  }

  function resolveTradeOffer(accepted){
    if(!state?.trade.pendingOffer) return;
    const offer = state.trade.pendingOffer;
    const from = state.players[offer.from];
    const to = state.players[offer.to];
    if(accepted){
      from.resources[offer.give] -= offer.giveAmount;
      to.resources[offer.give] += offer.giveAmount;
      to.resources[offer.get] -= offer.getAmount;
      from.resources[offer.get] += offer.getAmount;
      log(`${from.name} trades with ${to.name}.`);
      notice(`${to.name} accepts the offer.`);
    }else{
      log(`${to.name} refuses the trade offer.`);
      notice(`${to.name} declines the offer.`);
    }
    closeTradeResponse();
    closeTradeModal();
    updateAll();
  }

  function endTurn(){
    if(!state || state.phase !== 'main' || !isHumanInteraction()) return;
    finishTurn();
  }

  function finishTurn(){
    const player = currentPlayer();
    player.devCards.forEach(card => {
      card.fresh = false;
    });
    closeTradeResponse();
    closeTradeModal();
    state.activeMode = null;
    state.freeRoads = 0;
    state.devPlayedThisTurn = false;
    state.dice = null;
    state.dicePair = null;
    state.phase = 'roll';
    state.turn = (state.turn + 1) % state.players.length;
    if(state.turn === 0) state.turnNumber += 1;
    log(`${currentPlayer().name} prend la main.`);
    notice(`${currentPlayer().name}: rolling dice.`);
    updateAll();
    scheduleAi();
  }

  function scheduleAutoRoll(){
    clearTimeout(autoRollTimer);
    if(!state || state.winner || state.phase !== 'roll') return;
    const player = getInteractionPlayer();
    if(!player || player.type !== 'human') return;

    autoRollTimer = setTimeout(() => {
      if(!state || state.winner || state.phase !== 'roll') return;
      if(getInteractionPlayer()?.id !== player.id) return;
      rollDice();
    }, 620);
  }

  function spend(player, cost){
    if(!canAfford(player, cost)) return false;
    RESOURCE_KEYS.forEach(key => {
      player.resources[key] -= cost[key] || 0;
    });
    return true;
  }

  function canAfford(player, cost){
    return RESOURCE_KEYS.every(key => player.resources[key] >= (cost[key] || 0));
  }

  function canBuildRoad(playerId, edgeId, free){
    const player = state.players[playerId];
    const edge = state.board.edges[edgeId];
    if(!edge || edge.road !== null) return false;
    if(player.pieces.roads >= MAX_PIECES.roads) return false;
    if(!free && !canAfford(player, COSTS.road)) return false;

    if(state.phase === 'setup'){
      return state.setupPendingVertex !== null && (edge.v1 === state.setupPendingVertex || edge.v2 === state.setupPendingVertex);
    }

    return [edge.v1, edge.v2].some(vertexId => roadConnectsAtVertex(playerId, vertexId));
  }

  function roadConnectsAtVertex(playerId, vertexId){
    const vertex = state.board.vertices[vertexId];
    if(vertex.building){
      return vertex.building.playerId === playerId;
    }

    return vertex.edgeIds.some(edgeId => state.board.edges[edgeId].road === playerId);
  }

  function canBuildSettlement(playerId, vertexId, free){
    const player = state.players[playerId];
    const vertex = state.board.vertices[vertexId];
    if(!vertex || vertex.building) return false;
    if(player.pieces.settlements >= MAX_PIECES.settlements) return false;
    if(!free && !canAfford(player, COSTS.settlement)) return false;

    const adjacentBlocked = vertex.edgeIds.some(edgeId => {
      const edge = state.board.edges[edgeId];
      const otherId = edge.v1 === vertexId ? edge.v2 : edge.v1;
      return Boolean(state.board.vertices[otherId].building);
    });
    if(adjacentBlocked) return false;

    if(state.phase === 'setup') return true;
    return vertex.edgeIds.some(edgeId => state.board.edges[edgeId].road === playerId);
  }

  function canBuildCity(playerId, vertexId){
    const player = state.players[playerId];
    const vertex = state.board.vertices[vertexId];
    if(!vertex?.building || vertex.building.playerId !== playerId || vertex.building.kind !== 'settlement') return false;
    if(player.pieces.cities >= MAX_PIECES.cities) return false;
    return canAfford(player, COSTS.city);
  }

  function updateAwards(){
    state.players.forEach(player => {
      player.longestRoad = calculateLongestRoad(player.id);
    });

    const best = state.players.reduce((leader, player) => player.longestRoad > leader.longestRoad ? player : leader, state.players[0]);
    const holder = state.longestRoadHolder === null ? null : state.players[state.longestRoadHolder];
    if(best.longestRoad >= 5 && (!holder || best.longestRoad > holder.longestRoad)){
      state.players.forEach(player => {
        player.hasLongestRoad = player.id === best.id;
      });
      state.longestRoadHolder = best.id;
      log(`${best.name} controls the Longest Road.`);
    }
  }

  function updateLargestArmy(){
    const best = state.players.reduce((leader, player) => player.knights > leader.knights ? player : leader, state.players[0]);
    const holder = state.largestArmyHolder === null ? null : state.players[state.largestArmyHolder];
    if(best.knights >= 3 && (!holder || best.knights > holder.knights)){
      state.players.forEach(player => {
        player.hasLargestArmy = player.id === best.id;
      });
      state.largestArmyHolder = best.id;
      log(`${best.name} reveals the Largest Army.`);
    }
  }

  function calculateLongestRoad(playerId){
    const playerEdges = state.board.edges.filter(edge => edge.road === playerId);
    if(!playerEdges.length) return 0;
    let best = 0;

    state.board.vertices.forEach(vertex => {
      best = Math.max(best, dfsRoad(playerId, vertex.id, new Set()));
    });
    return best;
  }

  function dfsRoad(playerId, vertexId, usedEdges){
    const vertex = state.board.vertices[vertexId];
    if(vertex.building && vertex.building.playerId !== playerId && usedEdges.size > 0) return 0;

    let best = 0;
    vertex.edgeIds.forEach(edgeId => {
      if(usedEdges.has(edgeId)) return;
      const edge = state.board.edges[edgeId];
      if(edge.road !== playerId) return;
      const nextVertexId = edge.v1 === vertexId ? edge.v2 : edge.v1;
      const nextUsed = new Set(usedEdges);
      nextUsed.add(edgeId);
      best = Math.max(best, 1 + dfsRoad(playerId, nextVertexId, nextUsed));
    });
    return best;
  }

  function victoryPoints(player){
    const devPoints = player.devCards.filter(card => card.type === 'vp').length;
    return player.pieces.settlements + player.pieces.cities * 2 + devPoints + (player.hasLongestRoad ? 2 : 0) + (player.hasLargestArmy ? 2 : 0);
  }

  function checkVictory(playerId){
    const player = state.players[playerId];
    if(victoryPoints(player) >= state.targetScore){
      state.winner = playerId;
      state.phase = 'ended';
      state.activeMode = null;
      log(`${player.name} wins Moonfall Settlers.`);
      notice(`${player.name} wins the game.`);
    }
  }

  function getTradeRatio(playerId, resource){
    const ports = getPlayerPorts(playerId);
    if(ports.has(resource)) return 2;
    if(ports.has('generic')) return 3;
    return 4;
  }

  function getPlayerPorts(playerId){
    const ports = new Set();
    state.board.vertices.forEach(vertex => {
      if(vertex.port && vertex.building?.playerId === playerId) ports.add(vertex.port);
    });
    return ports;
  }

  function currentPlayer(){
    return state.players[state.turn];
  }

  function getSetupPlayer(){
    return state.players[state.setupQueue[state.setupStep]];
  }

  function getInteractionPlayer(){
    if(!state) return null;
    if(state.phase === 'setup') return getSetupPlayer();
    if(state.phase === 'ended') return null;
    return currentPlayer();
  }

  function isHumanInteraction(){
    const player = getInteractionPlayer();
    return Boolean(player && player.type === 'human' && !state.winner);
  }

  function scheduleAi(){
    clearTimeout(aiTimer);
    if(!state || state.winner) return;
    const player = getInteractionPlayer();
    if(!player || player.type !== 'ai') return;
    aiTimer = setTimeout(runAi, state.phase === 'setup' ? 650 : 850);
  }

  function runAi(){
    if(!state || state.winner) return;
    const player = getInteractionPlayer();
    if(!player || player.type !== 'ai') return;

    if(state.phase === 'setup'){
      runAiSetup(player);
    }else if(state.phase === 'roll'){
      rollDice();
    }else if(state.phase === 'robber'){
      moveRobber(player.id, chooseRobberTile(player.id));
    }else if(state.phase === 'main'){
      runAiMain(player);
    }
  }

  function runAiSetup(player){
    if(state.setupPart === 'settlement'){
      const vertexId = chooseBestSettlement(player.id, true);
      placeSettlement(player.id, vertexId, true);
      state.setupPendingVertex = vertexId;
      state.setupPart = 'road';
      state.activeMode = 'road';
      log(`${player.name} founds a settlement.`);
      updateAll();
      scheduleAi();
      return;
    }

    const edgeId = chooseBestRoad(player.id, true);
    placeRoad(player.id, edgeId, true);
    if(state.setupStep >= state.players.length) grantInitialResources(player.id, state.setupPendingVertex);
    advanceSetup();
  }

  function runAiMain(player){
    maybePlayAiKnight(player);

    for(let i = 0; i < 8; i += 1){
      if(tryAiCity(player)) continue;
      if(tryAiSettlement(player)) continue;
      if(tryAiRoad(player)) continue;
      if(tryAiDev(player)) continue;
      if(tryAiBankTrade(player)) continue;
      break;
    }

    updateAll();
    setTimeout(() => {
      if(state && !state.winner && currentPlayer().id === player.id && state.phase === 'main') finishTurn();
    }, 650);
  }

  function maybePlayAiKnight(player){
    if(state.devPlayedThisTurn) return;
    const index = player.devCards.findIndex(card => card.type === 'knight' && !card.fresh);
    if(index < 0 || Math.random() > .36) return;
    player.devCards.splice(index, 1);
    player.knights += 1;
    state.devPlayedThisTurn = true;
    updateLargestArmy();
    moveRobber(player.id, chooseRobberTile(player.id));
  }

  function tryAiCity(player){
    const candidates = state.board.vertices
      .filter(vertex => canBuildCity(player.id, vertex.id))
      .sort((a, b) => vertexScore(b.id) - vertexScore(a.id));
    if(!candidates.length) return false;
    buildCity(player.id, candidates[0].id);
    return true;
  }

  function tryAiSettlement(player){
    const vertexId = chooseBestSettlement(player.id, false);
    if(vertexId === null) return false;
    if(!canAfford(player, COSTS.settlement)) return false;
    buildSettlement(player.id, vertexId, false);
    return true;
  }

  function tryAiRoad(player){
    const edgeId = chooseBestRoad(player.id, false);
    if(edgeId === null || !canAfford(player, COSTS.road)) return false;
    buildRoad(player.id, edgeId, false);
    return true;
  }

  function tryAiDev(player){
    if(!state.devDeck.length || !canAfford(player, COSTS.dev) || Math.random() > .45) return false;
    spend(player, COSTS.dev);
    const type = state.devDeck.pop();
    player.devCards.push({ type, fresh: true });
    log(`${player.name} draws a card.`);
    checkVictory(player.id);
    return true;
  }

  function tryAiBankTrade(player){
    const plans = [COSTS.city, COSTS.settlement, COSTS.road, COSTS.dev];
    for(const cost of plans){
      const missing = RESOURCE_KEYS.find(key => player.resources[key] < (cost[key] || 0));
      if(!missing) continue;
      const give = RESOURCE_KEYS.find(key => {
        const ratio = getTradeRatio(player.id, key);
        return key !== missing && player.resources[key] - (cost[key] || 0) >= ratio;
      });
      if(!give) continue;
      const ratio = getTradeRatio(player.id, give);
      player.resources[give] -= ratio;
      player.resources[missing] += 1;
      log(`${player.name} trades with the bank.`);
      return true;
    }
    return false;
  }

  function chooseBestSettlement(playerId, free){
    const candidates = state.board.vertices
      .filter(vertex => canBuildSettlement(playerId, vertex.id, free))
      .sort((a, b) => vertexScore(b.id) - vertexScore(a.id));
    return candidates.length ? candidates[0].id : null;
  }

  function chooseBestRoad(playerId, free){
    const candidates = state.board.edges
      .filter(edge => canBuildRoad(playerId, edge.id, free))
      .sort((a, b) => edgeScore(b.id, playerId) - edgeScore(a.id, playerId));
    return candidates.length ? candidates[0].id : null;
  }

  function vertexScore(vertexId){
    const vertex = state.board.vertices[vertexId];
    const types = new Set();
    let score = vertex.port ? 2.2 : 0;
    vertex.tileIds.forEach(tileId => {
      const tile = state.board.tiles[tileId];
      if(tile.type === 'crater') return;
      types.add(tile.type);
      score += PIP_WEIGHT[tile.number] || 0;
    });
    return score + types.size * 1.4;
  }

  function edgeScore(edgeId, playerId){
    const edge = state.board.edges[edgeId];
    const aScore = canBuildSettlement(playerId, edge.v1, false) ? vertexScore(edge.v1) : vertexScore(edge.v1) * .25;
    const bScore = canBuildSettlement(playerId, edge.v2, false) ? vertexScore(edge.v2) : vertexScore(edge.v2) * .25;
    return Math.max(aScore, bScore);
  }

  function chooseRobberTile(playerId){
    const current = state.board.robberTile;
    let bestTile = state.board.tiles.find(tile => tile.id !== current && tile.type !== 'crater') || state.board.tiles[0];
    let bestScore = -Infinity;

    state.board.tiles.forEach(tile => {
      if(tile.id === current) return;
      let score = 0;
      tile.vertexIds.forEach(vertexId => {
        const building = state.board.vertices[vertexId].building;
        if(!building) return;
        const points = building.kind === 'city' ? 2 : 1;
        score += building.playerId === playerId ? -4 * points : 3 * points;
      });
      score += PIP_WEIGHT[tile.number] || 0;
      if(score > bestScore){
        bestScore = score;
        bestTile = tile;
      }
    });
    return bestTile.id;
  }

  function updateAll(){
    updateHud();
    updateButtons();
    renderResourcePanel();
    renderCostPanel();
    renderTradePanel();
    renderDevPanel();
    renderPlayersPanel();
    renderBoardPanel();
    renderLogPanel();
    scheduleAutoRoll();
    queueRender();
  }

  function updateHud(){
    const player = getInteractionPlayer() || currentPlayer();
    dom.turnHud.textContent = String(state.turnNumber);
    dom.activePlayer.textContent = player ? player.name : 'Game Over';
    dom.activePlayer.style.color = player ? player.color : '#fff';
    dom.phaseHud.textContent = phaseLabel();
    renderDiceHud();
    dom.targetHud.textContent = String(state.targetScore);
    dom.pointsHud.textContent = player ? String(victoryPoints(player)) : '0';
    dom.topbar?.classList.toggle('is-human-turn', Boolean(player?.type === 'human' && !state.winner));
  }

  function phaseLabel(){
    if(state.phase === 'setup') return state.setupPart === 'settlement' ? 'Settlement' : 'Road';
    if(state.phase === 'roll') return 'Roll';
    if(state.phase === 'robber') return 'Oni';
    if(state.phase === 'main') return 'Action';
    return 'Done';
  }

  function renderDiceHud(){
    const values = state.dicePair || [0, 0];
    dom.diceHud.innerHTML = values.map(value => renderDieFace(value)).join('');
  }

  function renderDieFace(value){
    const positions = {
      1: [[50, 50]],
      2: [[28, 28], [72, 72]],
      3: [[28, 28], [50, 50], [72, 72]],
      4: [[28, 28], [72, 28], [28, 72], [72, 72]],
      5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
      6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]]
    };
    const pips = positions[value] || [];
    const faceStyle = [
      'display:block',
      'position:relative',
      'width:72px',
      'height:72px',
      'border-radius:16px',
      'border:2px solid rgba(30,16,14,.92)',
      'background:linear-gradient(180deg,#8b2d28,#5b1715)',
      'box-shadow:inset 0 -6px 0 rgba(0,0,0,.18),0 12px 24px rgba(0,0,0,.34)',
      `opacity:${value ? 1 : .55}`
    ].join(';');
    const pipStyle = ([left, top]) => [
      'position:absolute',
      `left:${left}%`,
      `top:${top}%`,
      'width:12px',
      'height:12px',
      'margin:-6px 0 0 -6px',
      'border-radius:50%',
      'background:#121010',
      'box-shadow:inset 0 2px 3px rgba(255,255,255,.08),0 1px 0 rgba(0,0,0,.38)'
    ].join(';');
    return `<i class="die-face${value ? '' : ' is-empty'}" style="${faceStyle}">${pips.map(position => `<span class="pip" style="${pipStyle(position)}"></span>`).join('')}</i>`;
  }

  function updateButtons(){
    const human = isHumanInteraction();
    const player = getInteractionPlayer();
    const mainHuman = human && state.phase === 'main' && state.activeMode !== 'robber';
    const canRoll = human && state.phase === 'roll';
    dom.rollBtn.disabled = !(human && state.phase === 'roll');
    dom.rollBtn.textContent = 'Roll dices';
    dom.rollBtn.classList.toggle('is-attention', canRoll);
    dom.endTurnBtn.disabled = !mainHuman;
    dom.roadBtn.disabled = !mainHuman || (!canAfford(player, COSTS.road) && state.freeRoads === 0);
    dom.settlementBtn.disabled = !mainHuman || !canAfford(player, COSTS.settlement);
    dom.cityBtn.disabled = !mainHuman || !canAfford(player, COSTS.city);
    dom.devBtn.disabled = !mainHuman || !canAfford(player, COSTS.dev) || !state.devDeck.length;
    dom.tradeOpenBtn.style.pointerEvents = mainHuman ? 'auto' : 'none';
    dom.tradeOpenBtn.style.opacity = mainHuman ? '1' : '.46';

    [['road', dom.roadBtn], ['settlement', dom.settlementBtn], ['city', dom.cityBtn]].forEach(([mode, button]) => {
      button.classList.toggle('active', state.activeMode === mode);
    });

    if(!mainHuman){
      closeTradeModal();
    }

    dom.roadBtn.title = `Road cost: ${formatCost(COSTS.road)}`;
    dom.settlementBtn.title = `Settlement cost: ${formatCost(COSTS.settlement)}`;
    dom.cityBtn.title = `City cost: ${formatCost(COSTS.city)}`;
    dom.devBtn.title = `Development card cost: ${formatCost(COSTS.dev)}`;
  }

  function renderResourcePanel(){
    const player = getInteractionPlayer() || currentPlayer();
    dom.resourcePanel.innerHTML = RESOURCE_KEYS.map(key => `
      <div class="resource-row">
        <img src="${RESOURCES[key].icon}" alt="">
        <span class="resource-mark" style="background:${RESOURCES[key].color}">${RESOURCES[key].short}</span>
        <strong>${RESOURCES[key].name}</strong>
        <b>${player.resources[key]}</b>
      </div>
    `).join('');
  }

  function renderCostPanel(){
    dom.costPanel.innerHTML = '';
  }

  function formatCost(cost){
    return RESOURCE_KEYS
      .filter(key => cost[key])
      .map(key => `${cost[key]} ${RESOURCES[key].short}`)
      .join(' ');
  }

  function renderTradePanel(){
    if(!state) return;
    const player = getInteractionPlayer() || currentPlayer();
    const trade = state.trade;
    syncTradeState();

    dom.tradeBankModeBtn.classList.toggle('active', trade.mode === 'bank');
    dom.tradeClanModeBtn.classList.toggle('active', trade.mode === 'clan');
    dom.tradePartnerRow.hidden = trade.mode === 'bank';
    dom.tradePartnerRow.innerHTML = state.players
      .filter(entry => entry.id !== player.id)
      .map(entry => `
        <button class="trade-partner-chip ${trade.partnerId === entry.id ? 'active' : ''}" type="button" data-trade-partner="${entry.id}">
          <img src="${entry.crest}" alt="">
          <span>${escapeHtml(entry.name)}</span>
        </button>
      `)
      .join('');

    dom.tradeGiveIcons.innerHTML = RESOURCE_KEYS.map(key => `
      <button class="trade-resource-card ${trade.give === key ? 'active' : ''}" type="button" data-trade-side="give" data-trade-resource="${key}">
        <img src="${RESOURCES[key].icon}" alt="">
        <strong>${RESOURCES[key].name}</strong>
        <span>${player.resources[key]} in hand</span>
      </button>
    `).join('');
    dom.tradeGetIcons.innerHTML = RESOURCE_KEYS.map(key => {
      const partner = state.players.find(entry => entry.id === trade.partnerId);
      const stock = trade.mode === 'bank' ? 'bank stock' : `${partner?.resources[key] ?? 0} in stock`;
      return `
        <button class="trade-resource-card ${trade.get === key ? 'active' : ''}" type="button" data-trade-side="get" data-trade-resource="${key}">
          <img src="${RESOURCES[key].icon}" alt="">
          <strong>${RESOURCES[key].name}</strong>
          <span>${stock}</span>
        </button>
      `;
    }).join('');

    dom.tradeGiveAmountLabel.textContent = String(trade.giveAmount);
    dom.tradeGetAmountLabel.textContent = String(trade.getAmount);
    dom.tradeGiveMinus.disabled = trade.mode === 'bank';
    dom.tradeGivePlus.disabled = trade.mode === 'bank';
    dom.tradeSummary.innerHTML = `
      <div class="trade-summary-row">
        <strong>${trade.mode === 'bank' ? 'Bank route' : 'Clan proposal'}</strong>
        <span>${trade.mode === 'bank' ? `${getTradeRatio(player.id, trade.give)}:1 on ${RESOURCES[trade.give].name}` : `${state.players.find(entry => entry.id === trade.partnerId)?.name || 'Clan'} reviews the offer`}</span>
      </div>
      <div class="trade-summary-row">
        <div class="trade-summary-icons">
          ${tradeMiniCard(trade.give, trade.giveAmount)}
          ${tradeMiniCard(trade.get, trade.getAmount)}
        </div>
      </div>
    `;
    dom.tradeSubmitBtn.textContent = trade.mode === 'bank' ? 'Exchange with bank' : 'Send proposal';

    dom.tradePartnerRow.querySelectorAll('[data-trade-partner]').forEach(button => {
      button.addEventListener('click', () => selectTradePartner(Number(button.dataset.tradePartner)));
    });
    [dom.tradeGiveIcons, dom.tradeGetIcons].forEach(container => {
      container.querySelectorAll('[data-trade-resource]').forEach(button => {
        button.addEventListener('click', () => setTradeResource(button.dataset.tradeSide, button.dataset.tradeResource));
      });
    });
  }

  function renderDevPanel(){
    const player = getInteractionPlayer() || currentPlayer();
    const counts = {};
    const playable = {};
    Object.keys(DEV_CARDS).forEach(type => {
      counts[type] = player.devCards.filter(card => card.type === type).length;
      playable[type] = player.devCards.filter(card => card.type === type && !card.fresh && card.type !== 'vp').length;
    });

    const resourceOptions = RESOURCE_KEYS.map(key => `<option value="${key}">${RESOURCES[key].name}</option>`).join('');
    dom.devPanel.innerHTML = `
      ${Object.keys(DEV_CARDS).map(type => `
        <div class="dev-card-row">
          <img src="${type === 'knight' ? ASSETS.cardKnight : ASSETS.cardBack}" alt="">
          <strong>${DEV_CARDS[type].name} x${counts[type] || 0}</strong>
          <span>${DEV_CARDS[type].detail}</span>
        </div>
      `).join('')}
      <div class="dev-actions">
        <button id="playKnight" type="button"${!playable.knight || state.devPlayedThisTurn || !isHumanInteraction() ? ' disabled' : ''}>Knight</button>
        <button id="playRoadCard" type="button"${!playable.road || state.devPlayedThisTurn || !isHumanInteraction() ? ' disabled' : ''}>Routes</button>
      </div>
      <label>Year of Plenty
        <select id="plentyOne">${resourceOptions}</select>
        <select id="plentyTwo">${resourceOptions}</select>
      </label>
      <button id="playPlenty" type="button"${!playable.plenty || state.devPlayedThisTurn || !isHumanInteraction() ? ' disabled' : ''}>Play Year of Plenty</button>
      <label>Monopoly
        <select id="monopolyResource">${resourceOptions}</select>
      </label>
      <button id="playMonopoly" type="button"${!playable.monopoly || state.devPlayedThisTurn || !isHumanInteraction() ? ' disabled' : ''}>Play Monopoly</button>
    `;

    const bind = (id, type) => {
      const button = document.getElementById(id);
      if(button) button.addEventListener('click', () => playDevCard(type));
    };
    bind('playKnight', 'knight');
    bind('playRoadCard', 'road');
    bind('playPlenty', 'plenty');
    bind('playMonopoly', 'monopoly');
  }

  function renderPlayersPanel(){
    dom.playersPanel.innerHTML = state.players.map(player => {
      const ports = [...getPlayerPorts(player.id)].map(port => port === 'generic' ? '3:1' : `${RESOURCES[port].short} 2:1`).join(', ') || 'No port';
      return `
        <div class="player-row ${getInteractionPlayer()?.id === player.id ? 'active' : ''}" style="color:${player.color}">
          <img class="player-crest" src="${player.crest}" alt="">
          <strong>${escapeHtml(player.name)} - ${victoryPoints(player)} pts</strong>
          <span>${sumResources(player.resources)} resources, ${player.devCards.length} cards</span>
          <span>Road ${player.longestRoad}, Army ${player.knights}, ${ports}</span>
        </div>
      `;
    }).join('');
  }

  function renderBoardPanel(){
    const robberTile = state.board.tiles[state.board.robberTile];
    const selected = describeSelected();
    dom.boardPanel.innerHTML = `
      <div class="board-stat oni-stat"><img src="${ASSETS.oni}" alt=""><span><strong>Oni</strong>${tileLabel(robberTile)}</span></div>
      <div class="board-stat"><strong>Deck</strong><span>${state.devDeck.length} cards left</span></div>
      <div class="board-stat"><strong>Selection</strong><span>${selected}</span></div>
    `;
  }

  function describeSelected(){
    if(!state.selected) return 'None';
    if(state.selected.type === 'tile'){
      return tileLabel(state.board.tiles[state.selected.id]);
    }
    const vertex = state.board.vertices[state.selected.id];
    if(vertex.building){
      const player = state.players[vertex.building.playerId];
      return `${vertex.building.kind === 'city' ? 'City' : 'Settlement'} of ${player.name}`;
    }
    return vertex.port ? `Port ${vertex.port === 'generic' ? '3:1' : RESOURCES[vertex.port].name}` : 'Free intersection';
  }

  function tileLabel(tile){
    if(tile.type === 'crater') return 'Cursed crater';
    return `${RESOURCES[tile.type].name} ${tile.number}`;
  }

  function renderLogPanel(){
    dom.logPanel.innerHTML = state.log.map(entry => `<div class="log-entry">${escapeHtml(entry)}</div>`).join('');
  }

  function resetToSetup(){
    clearTimeout(aiTimer);
    clearTimeout(autoRollTimer);
    clearTimeout(tradeResponseTimer);
    state = null;
    dom.gameView.hidden = true;
    dom.gameView.classList.add('is-hidden');
    dom.setupView.hidden = false;
    dom.setupView.classList.remove('is-hidden');
  }

  dom.form.addEventListener('submit', startGame);
  dom.playerCount.addEventListener('change', renderSlots);
  dom.shuffleBtn.addEventListener('click', shuffleSlotNames);
  dom.canvas.addEventListener('mousemove', handleMouseMove);
  dom.canvas.addEventListener('mouseleave', handleCanvasLeave);
  dom.canvas.addEventListener('click', handleCanvasClick);
  dom.rollBtn.addEventListener('click', rollDice);
  dom.endTurnBtn.addEventListener('click', endTurn);
  dom.newGameBtn.addEventListener('click', resetToSetup);
  dom.roadBtn.addEventListener('click', () => setMode('road'));
  dom.settlementBtn.addEventListener('click', () => setMode('settlement'));
  dom.cityBtn.addEventListener('click', () => setMode('city'));
  dom.devBtn.addEventListener('click', buyDevCard);
  dom.tradeOpenBtn.addEventListener('click', openTradeModal);
  dom.tradeCloseBtn.addEventListener('click', closeTradeModal);
  dom.tradeCancelBtn.addEventListener('click', closeTradeModal);
  dom.tradeBankModeBtn.addEventListener('click', () => setTradeMode('bank'));
  dom.tradeClanModeBtn.addEventListener('click', () => setTradeMode('clan'));
  dom.tradeGiveMinus.addEventListener('click', () => changeTradeAmount('giveAmount', -1));
  dom.tradeGivePlus.addEventListener('click', () => changeTradeAmount('giveAmount', 1));
  dom.tradeGetMinus.addEventListener('click', () => changeTradeAmount('getAmount', -1));
  dom.tradeGetPlus.addEventListener('click', () => changeTradeAmount('getAmount', 1));
  dom.tradeSubmitBtn.addEventListener('click', submitTrade);
  dom.tradeAcceptBtn.addEventListener('click', () => resolveTradeOffer(true));
  dom.tradeDeclineBtn.addEventListener('click', () => resolveTradeOffer(false));
  dom.tradeModal.addEventListener('click', event => {
    if(event.target === dom.tradeModal) closeTradeModal();
  });
  dom.tradeResponseModal.addEventListener('click', event => {
    if(event.target === dom.tradeResponseModal && state?.players[state.trade.pendingOffer?.to]?.type !== 'human'){
      closeTradeResponse();
    }
  });
  (document.querySelectorAll ? document.querySelectorAll('[data-panel-target]') : []).forEach(button => {
    button.addEventListener('click', () => {
      document.getElementById(button.dataset.panelTarget)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  });
  window.addEventListener('resize', resizeCanvas);

  bootImages();
  renderSlots();
  renderTradePanel();
})();

import { UNIT_DEFS } from './data/units.js';
import { BUILDING_DEFS } from './data/buildings.js';

const FACTIONS = {
  watchers: {
    name: 'Watchers',
    enemy: 'shadows',
    color: '#40a7ff',
    dark: '#173b63',
    accent: '#8bd3ff',
    production: 'barracks'
  },
  shadows: {
    name: 'Shadows',
    enemy: 'watchers',
    color: '#9a63ff',
    dark: '#33204c',
    accent: '#d5b6ff',
    production: 'spawnPit'
  }
};

const BUILD_OPTIONS = ['house', 'farm', 'tower'];
const WORLD = { width: 2600, height: 1464 };
const START_RESOURCES = { crystal: 320, wood: 280, food: 180 };
const GATHER_AMOUNT = 14;
const GATHER_TIME = 0.85;
const ASSET_PATHS = {
  terrain: '/moonfall-rts/assets/tiles/shadow_realm_battlefield.png',
  resources: {
    crystal: '/moonfall-rts/assets/resources/crystal_node.png',
    wood: '/moonfall-rts/assets/resources/wood_node.png',
    food: '/moonfall-rts/assets/resources/food_cache.png'
  },
  ui: {
    crystal: '/moonfall-rts/assets/ui/icon_crystal.png',
    wood: '/moonfall-rts/assets/ui/icon_wood.png',
    food: '/moonfall-rts/assets/ui/icon_food.png',
    population: '/moonfall-rts/assets/ui/icon_population.png',
    build: '/moonfall-rts/assets/ui/icon_build.png',
    train: '/moonfall-rts/assets/ui/icon_train.png',
    attack: '/moonfall-rts/assets/ui/icon_attack.png'
  }
};

const dom = {
  home: document.getElementById('homeScreen'),
  game: document.getElementById('gameScreen'),
  start: document.getElementById('startGameBtn'),
  factionCards: [...document.querySelectorAll('.faction-card')],
  factionName: document.getElementById('factionName'),
  crystal: document.getElementById('crystalValue'),
  crystalRate: document.getElementById('crystalRate'),
  wood: document.getElementById('woodValue'),
  woodRate: document.getElementById('woodRate'),
  food: document.getElementById('foodValue'),
  foodRate: document.getElementById('foodRate'),
  pop: document.getElementById('popValue'),
  pause: document.getElementById('pauseBtn'),
  restart: document.getElementById('restartBtn'),
  canvas: document.getElementById('gameCanvas'),
  minimap: document.getElementById('minimap'),
  message: document.getElementById('systemMessage'),
  selectedInfo: document.getElementById('selectedInfo'),
  selectedPortrait: document.getElementById('selectedPortrait'),
  selectionGrid: document.getElementById('selectionGrid'),
  actions: document.getElementById('actionButtons'),
  matchTimer: document.getElementById('matchTimer')
};

const ctx = dom.canvas.getContext('2d');
const mini = dom.minimap.getContext('2d');

let chosenFaction = 'watchers';
let state = null;
let lastFrame = performance.now();
let messageTimer = null;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const uid = prefix => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

class AssetStore {
  constructor(){
    this.images = new Map();
  }

  load(key, src){
    if(!src || this.images.has(src)) return;
    const image = new Image();
    image.onload = () => {
      const record = this.images.get(src);
      if(record) record.ready = true;
    };
    image.onerror = () => {
      const record = this.images.get(src);
      if(record) record.failed = true;
    };
    this.images.set(src, { image, ready: false, failed: false, key });
    image.src = src;
  }

  preload(){
    this.load('terrain', ASSET_PATHS.terrain);
    for(const [key, src] of Object.entries(ASSET_PATHS.resources)){
      this.load(`resource-${key}`, src);
    }
    for(const [key, src] of Object.entries(ASSET_PATHS.ui)){
      this.load(`ui-${key}`, src);
    }
    for(const faction of Object.keys(UNIT_DEFS)){
      for(const [key, def] of Object.entries(UNIT_DEFS[faction])){
        this.load(`${faction}-${key}`, def.asset);
      }
    }
    for(const faction of Object.keys(BUILDING_DEFS)){
      for(const [key, def] of Object.entries(BUILDING_DEFS[faction])){
        this.load(`${faction}-${key}`, def.asset);
      }
    }
  }

  get(src){
    const record = this.images.get(src);
    return record && record.ready && !record.failed ? record.image : null;
  }
}

const assets = new AssetStore();
assets.preload();

function showMessage(text){
  dom.message.textContent = text;
  dom.message.classList.add('visible');
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => dom.message.classList.remove('visible'), 2400);
}

function createPlayer(id, faction, isAi){
  return {
    id,
    faction,
    isAi,
    resources: { ...START_RESOURCES },
    pop: 0,
    popCap: 0,
    aiTimer: 0,
    nextAttackTime: isAi ? 65 : 0
  };
}

function startGame(){
  const enemyFaction = FACTIONS[chosenFaction].enemy;
  state = {
    players: {
      player: createPlayer('player', chosenFaction, false),
      enemy: createPlayer('enemy', enemyFaction, true)
    },
    units: [],
    buildings: [],
    resources: [],
    projectiles: [],
    selectedId: null,
    buildMode: null,
    camera: { x: 180, y: 360 },
    mouse: { x: 0, y: 0 },
    keys: new Set(),
    paused: false,
    gameOver: false,
    time: 0,
    uiTimer: 0
  };

  seedMap();
  dom.home.hidden = true;
  dom.home.classList.add('is-hidden');
  dom.game.hidden = false;
  dom.game.classList.remove('is-hidden');
  resizeCanvas();
  centerCameraOn(getHQ('player'));
  updateUi(true);
  showMessage('Build a production building, train an army, destroy the enemy HQ.');
}

function seedMap(){
  addResource('crystal', 470, 905, 900);
  addResource('crystal', 560, 510, 700);
  addResource('wood', 310, 790, 1100);
  addResource('wood', 900, 360, 1000);
  addResource('crystal', 2070, 575, 900);
  addResource('crystal', 2190, 990, 700);
  addResource('wood', 2280, 760, 1200);
  addResource('wood', 1570, 980, 900);

  addBuilding('player', 'hq', 760, 870);
  addBuilding('player', 'house', 505, 1035);
  addBuilding('player', 'farm', 1035, 1030);
  addUnit('player', 'worker', 700, 1050);
  addUnit('player', 'worker', 760, 1060);
  addUnit('player', 'worker', 820, 1045);

  addBuilding('enemy', 'hq', 1900, 615);
  addBuilding('enemy', 'house', 2150, 800);
  addBuilding('enemy', 'farm', 1695, 800);
  addUnit('enemy', 'worker', 1840, 835);
  addUnit('enemy', 'worker', 1900, 850);
  addUnit('enemy', 'worker', 1960, 835);

  recalcPopulation();
}

function addResource(kind, x, y, amount){
  state.resources.push({
    id: uid('resource'),
    kind,
    x,
    y,
    amount,
    radius: kind === 'wood' ? 62 : 40
  });
}

function addUnit(owner, key, x, y){
  const player = state.players[owner];
  const def = UNIT_DEFS[player.faction][key];
  const unit = {
    id: uid('unit'),
    entity: 'unit',
    owner,
    faction: player.faction,
    key,
    def,
    x,
    y,
    radius: key === 'guardian' || key === 'brute' ? 28 : 22,
    hp: def.hp,
    maxHp: def.hp,
    cooldown: 0,
    gatherTimer: 0,
    carry: null,
    lastResourceId: null,
    order: { type: 'idle' }
  };
  state.units.push(unit);
  recalcPopulation();
  return unit;
}

function addBuilding(owner, key, x, y){
  const player = state.players[owner];
  const def = BUILDING_DEFS[player.faction][key];
  const building = {
    id: uid('building'),
    entity: 'building',
    owner,
    faction: player.faction,
    key,
    def,
    x,
    y,
    radius: def.footprint,
    hp: def.hp,
    maxHp: def.hp,
    cooldown: 0
  };
  state.buildings.push(building);
  recalcPopulation();
  return building;
}

function recalcPopulation(){
  if(!state) return;
  for(const player of Object.values(state.players)){
    player.pop = state.units
      .filter(unit => unit.owner === player.id)
      .reduce((sum, unit) => sum + unit.def.pop, 0);
    player.popCap = state.buildings
      .filter(building => building.owner === player.id)
      .reduce((sum, building) => sum + (building.def.popBonus || 0), 0);
  }
}

function loop(now){
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if(state && !state.paused && !state.gameOver){
    update(dt);
  }
  if(state) draw();
  requestAnimationFrame(loop);
}

function update(dt){
  state.time += dt;
  updateCamera(dt);
  updateEconomy(dt);
  updateUnits(dt);
  updateBuildings(dt);
  updateProjectiles(dt);
  separateUnits(dt);
  updateAi(dt);
  cleanupDead();
  checkVictory();
  state.uiTimer -= dt;
  if(state.uiTimer <= 0){
    state.uiTimer = 0.18;
    updateUi();
  }
}

function updateCamera(dt){
  const speed = 620 * dt;
  if(state.keys.has('ArrowLeft') || state.keys.has('a')) state.camera.x -= speed;
  if(state.keys.has('ArrowRight') || state.keys.has('d')) state.camera.x += speed;
  if(state.keys.has('ArrowUp') || state.keys.has('w')) state.camera.y -= speed;
  if(state.keys.has('ArrowDown') || state.keys.has('s')) state.camera.y += speed;
  state.camera.x = clamp(state.camera.x, 0, WORLD.width - dom.canvas.width);
  state.camera.y = clamp(state.camera.y, 0, WORLD.height - dom.canvas.height);
}

function updateEconomy(dt){
  for(const building of state.buildings){
    if(building.def.foodRate){
      state.players[building.owner].resources.food += building.def.foodRate * dt;
    }
  }
}

function updateUnits(dt){
  for(const unit of state.units){
    unit.cooldown = Math.max(0, unit.cooldown - dt);

    const autoTarget = findNearestEnemy(unit, unit.def.aggro);
    if(autoTarget && unit.order.type !== 'gather' && unit.order.type !== 'return'){
      unit.order = { type: 'attack', targetId: autoTarget.id };
    }

    if(unit.order.type === 'move'){
      moveToward(unit, unit.order.x, unit.order.y, unit.def.speed, dt);
      if(Math.hypot(unit.x - unit.order.x, unit.y - unit.order.y) < 8){
        unit.order = { type: 'idle' };
      }
    }

    if(unit.order.type === 'attack'){
      const target = getEntity(unit.order.targetId);
      if(!target){
        unit.order = { type: 'idle' };
      }else if(dist(unit, target) > unit.def.range + target.radius * 0.55){
        moveToward(unit, target.x, target.y, unit.def.speed, dt);
      }else if(unit.cooldown <= 0){
        dealDamage(unit, target, unit.def.damage);
        unit.cooldown = unit.def.cooldown;
      }
    }

    if(unit.order.type === 'gather'){
      updateGather(unit, dt);
    }

    if(unit.order.type === 'return'){
      updateReturn(unit, dt);
    }
  }
}

function updateGather(unit, dt){
  const resource = state.resources.find(item => item.id === unit.order.resourceId);
  if(!unit.def.canGather || !resource || resource.amount <= 0){
    unit.order = { type: 'idle' };
    return;
  }

  if(dist(unit, resource) > resource.radius + unit.radius + 6){
    moveToward(unit, resource.x, resource.y, unit.def.speed, dt);
    return;
  }

  unit.gatherTimer += dt;
  if(unit.gatherTimer < GATHER_TIME) return;

  const amount = Math.min(GATHER_AMOUNT, resource.amount);
  resource.amount -= amount;
  unit.carry = { kind: resource.kind, amount };
  unit.lastResourceId = resource.id;
  unit.gatherTimer = 0;
  unit.order = { type: 'return' };
}

function updateReturn(unit, dt){
  const hq = getHQ(unit.owner);
  if(!hq || !unit.carry){
    unit.order = { type: 'idle' };
    return;
  }

  if(dist(unit, hq) > hq.radius + unit.radius + 8){
    moveToward(unit, hq.x, hq.y, unit.def.speed, dt);
    return;
  }

  state.players[unit.owner].resources[unit.carry.kind] += unit.carry.amount;
  unit.carry = null;
  const previous = state.resources.find(item => item.id === unit.lastResourceId && item.amount > 0);
  unit.order = previous ? { type: 'gather', resourceId: previous.id } : { type: 'idle' };
}

function updateBuildings(dt){
  for(const building of state.buildings){
    building.cooldown = Math.max(0, building.cooldown - dt);
    if(!building.def.damage) continue;
    const target = findNearestEnemy(building, building.def.range);
    if(target && building.cooldown <= 0){
      spawnProjectile(building, target, building.def.damage);
      building.cooldown = building.def.cooldown;
    }
  }
}

function updateProjectiles(dt){
  for(const projectile of state.projectiles){
    const target = getEntity(projectile.targetId);
    if(!target){
      projectile.dead = true;
      continue;
    }
    moveToward(projectile, target.x, target.y - 20, 420, dt);
    if(Math.hypot(projectile.x - target.x, projectile.y - (target.y - 20)) < 14){
      target.hp -= projectile.damage;
      projectile.dead = true;
    }
  }
  state.projectiles = state.projectiles.filter(projectile => !projectile.dead);
}

function updateAi(dt){
  const ai = state.players.enemy;
  ai.aiTimer -= dt;
  if(ai.aiTimer > 0) return;
  ai.aiTimer = 1.2;

  const hq = getHQ('enemy');
  if(!hq) return;

  const workers = state.units.filter(unit => unit.owner === 'enemy' && unit.def.canGather);
  for(const worker of workers){
    if(worker.order.type === 'idle'){
      const resource = nearestResource(worker, Math.random() > 0.45 ? 'crystal' : 'wood');
      if(resource) worker.order = { type: 'gather', resourceId: resource.id };
    }
  }

  if(workers.length < 5) trainUnit(hq, 'worker', true);
  if(ai.popCap - ai.pop < 4) tryBuildAi('house');
  if(ai.resources.food < 260) tryBuildAi('farm');
  const productionKey = FACTIONS[ai.faction].production;
  let production = state.buildings.find(building => building.owner === 'enemy' && building.key === productionKey);
  if(!production){
    tryBuildAi(productionKey);
    production = state.buildings.find(building => building.owner === 'enemy' && building.key === productionKey);
  }

  if(production){
    const trainList = production.def.trains || [];
    const choice = trainList[Math.floor(Math.random() * trainList.length)];
    trainUnit(production, choice, true);
  }

  const army = state.units.filter(unit => unit.owner === 'enemy' && !unit.def.canGather);
  const playerHq = getHQ('player');
  if(state.time >= ai.nextAttackTime && army.length >= 5 && playerHq){
    ai.nextAttackTime = state.time + 34;
    for(const unit of army){
      if(unit.order.type === 'idle' || unit.order.type === 'move'){
        unit.order = { type: 'attack', targetId: playerHq.id };
      }
    }
  }
}

function tryBuildAi(key){
  const ai = state.players.enemy;
  const def = BUILDING_DEFS[ai.faction][key];
  if(!def || !canAfford(ai, def.cost)) return false;
  const hq = getHQ('enemy');
  if(!hq) return false;
  for(let attempt = 0; attempt < 10; attempt += 1){
    const angle = Math.random() * Math.PI * 2;
    const distance = 150 + Math.random() * 180;
    const x = clamp(hq.x + Math.cos(angle) * distance, 120, WORLD.width - 120);
    const y = clamp(hq.y + Math.sin(angle) * distance, 120, WORLD.height - 120);
    if(canPlaceBuilding(x, y, def.footprint, 'enemy')){
      pay(ai, def.cost);
      addBuilding('enemy', key, x, y);
      return true;
    }
  }
  return false;
}

function moveToward(entity, x, y, speed, dt){
  const dx = x - entity.x;
  const dy = y - entity.y;
  const d = Math.hypot(dx, dy);
  if(d < 0.1) return;
  entity.x += dx / d * speed * dt;
  entity.y += dy / d * speed * dt;
  entity.x = clamp(entity.x, 30, WORLD.width - 30);
  entity.y = clamp(entity.y, 30, WORLD.height - 30);
}

function separateUnits(dt){
  const strength = Math.min(1, dt * 14);
  for(let i = 0; i < state.units.length; i += 1){
    const a = state.units[i];
    for(let j = i + 1; j < state.units.length; j += 1){
      const b = state.units[j];
      const minDistance = a.radius + b.radius + 4;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.001;
      if(d >= minDistance) continue;
      const push = (minDistance - d) * 0.5 * strength;
      a.x -= dx / d * push;
      a.y -= dy / d * push;
      b.x += dx / d * push;
      b.y += dy / d * push;
    }
  }

  for(const unit of state.units){
    for(const obstacle of [...state.buildings, ...state.resources]){
      const minDistance = unit.radius + obstacle.radius * 0.72;
      const dx = unit.x - obstacle.x;
      const dy = unit.y - obstacle.y;
      const d = Math.hypot(dx, dy) || 0.001;
      if(d >= minDistance) continue;
      const push = (minDistance - d) * strength;
      unit.x += dx / d * push;
      unit.y += dy / d * push;
    }
    unit.x = clamp(unit.x, 30, WORLD.width - 30);
    unit.y = clamp(unit.y, 30, WORLD.height - 30);
  }
}

function dealDamage(attacker, target, amount){
  if(attacker.def.range > 70){
    spawnProjectile(attacker, target, amount);
  }else{
    target.hp -= amount;
  }
}

function spawnProjectile(source, target, damage){
  state.projectiles.push({
    id: uid('projectile'),
    x: source.x,
    y: source.y - 34,
    targetId: target.id,
    damage,
    color: FACTIONS[source.faction].accent
  });
}

function cleanupDead(){
  state.units = state.units.filter(unit => unit.hp > 0);
  state.buildings = state.buildings.filter(building => building.hp > 0);
  state.resources = state.resources.filter(resource => resource.amount > 0);
  recalcPopulation();
  if(state.selectedId && !getEntity(state.selectedId)) state.selectedId = null;
}

function checkVictory(){
  const playerHq = getHQ('player');
  const enemyHq = getHQ('enemy');
  if(!playerHq || !enemyHq){
    state.gameOver = true;
    showMessage(enemyHq ? 'Defeat. Your HQ has fallen.' : 'Victory. Enemy HQ destroyed.');
  }
}

function findNearestEnemy(entity, radius){
  let best = null;
  let bestDistance = Infinity;
  for(const target of [...state.units, ...state.buildings]){
    if(target.owner === entity.owner) continue;
    const d = dist(entity, target);
    if(d < radius && d < bestDistance){
      best = target;
      bestDistance = d;
    }
  }
  return best;
}

function nearestResource(entity, kind){
  let best = null;
  let bestDistance = Infinity;
  for(const resource of state.resources){
    if(kind && resource.kind !== kind) continue;
    const d = dist(entity, resource);
    if(d < bestDistance){
      best = resource;
      bestDistance = d;
    }
  }
  return best;
}

function getEntity(id){
  return state.units.find(unit => unit.id === id) ||
    state.buildings.find(building => building.id === id);
}

function getHQ(owner){
  return state.buildings.find(building => building.owner === owner && building.key === 'hq');
}

function canAfford(player, cost){
  return Object.entries(cost || {}).every(([key, value]) => player.resources[key] >= value);
}

function pay(player, cost){
  for(const [key, value] of Object.entries(cost || {})){
    player.resources[key] -= value;
  }
}

function trainUnit(building, unitKey, silent = false){
  const player = state.players[building.owner];
  const def = UNIT_DEFS[player.faction][unitKey];
  if(!def || !(building.def.trains || []).includes(unitKey)) return false;
  if(player.pop + def.pop > player.popCap){
    if(!silent) showMessage('Population max. Build houses or nests.');
    return false;
  }
  if(!canAfford(player, def.cost)){
    if(!silent) showMessage('Not enough resources.');
    return false;
  }
  pay(player, def.cost);
  const angle = Math.random() * Math.PI * 2;
  const unit = addUnit(building.owner, unitKey, building.x + Math.cos(angle) * 86, building.y + Math.sin(angle) * 70);
  unit.order = { type: 'move', x: unit.x + Math.cos(angle) * 54, y: unit.y + Math.sin(angle) * 42 };
  return true;
}

function placeBuilding(key, x, y){
  const player = state.players.player;
  const def = BUILDING_DEFS[player.faction][key];
  if(!def) return;
  if(!canAfford(player, def.cost)){
    showMessage('Not enough resources.');
    return;
  }
  if(!canPlaceBuilding(x, y, def.footprint, 'player')){
    showMessage('Cannot build here.');
    return;
  }
  pay(player, def.cost);
  addBuilding('player', key, x, y);
  state.buildMode = null;
  updateUi(true);
}

function canPlaceBuilding(x, y, radius, owner){
  const nearOwn = state.buildings.some(building => building.owner === owner && Math.hypot(building.x - x, building.y - y) < 360);
  if(!nearOwn) return false;
  for(const entity of [...state.buildings, ...state.resources]){
    if(Math.hypot(entity.x - x, entity.y - y) < entity.radius + radius + 18) return false;
  }
  return x > 80 && y > 80 && x < WORLD.width - 80 && y < WORLD.height - 80;
}

function issueMove(units, x, y){
  const cols = Math.ceil(Math.sqrt(units.length));
  const spacing = 46;
  units.forEach((unit, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    unit.order = {
      type: 'move',
      x: x + (col - (cols - 1) / 2) * spacing,
      y: y + (row - (Math.ceil(units.length / cols) - 1) / 2) * spacing
    };
  });
}

function issueAttack(units, target){
  for(const unit of units){
    unit.order = { type: 'attack', targetId: target.id };
  }
}

function issueGather(units, resource){
  for(const unit of units.filter(item => item.def.canGather)){
    unit.order = { type: 'gather', resourceId: resource.id };
  }
}

function selectedEntity(){
  return state ? getEntity(state.selectedId) : null;
}

function selectedUnits(){
  const selected = selectedEntity();
  if(!selected) return [];
  if(selected.entity === 'unit' && selected.owner === 'player') return [selected];
  return [];
}

function draw(){
  ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);
  drawTerrain();
  drawResources();
  drawEntities();
  drawProjectiles();
  if(state.buildMode) drawBuildPreview();
  ctx.restore();
  drawMinimap();
}

function drawTerrain(){
  const bg = assets.get(ASSET_PATHS.terrain);
  if(bg){
    ctx.drawImage(bg, 0, 0, WORLD.width, WORLD.height);
  }else{
    drawFallbackTerrain();
  }

  drawBuildZone(760, 870, '#2e9dff');
  drawBuildZone(1900, 615, '#9b55ff');
  drawWorldVignette();
}

function drawFallbackTerrain(){
  ctx.fillStyle = '#344c2d';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  const tile = 70;
  const startX = Math.floor(state.camera.x / tile) * tile;
  const startY = Math.floor(state.camera.y / tile) * tile;
  const endX = state.camera.x + dom.canvas.width + tile;
  const endY = state.camera.y + dom.canvas.height + tile;
  for(let y = startY; y < endY; y += tile){
    for(let x = startX; x < endX; x += tile){
      const n = noise(x, y);
      ctx.fillStyle = n > 0.66 ? '#435f34' : n < 0.24 ? '#263824' : '#36512f';
      ctx.fillRect(x, y, tile, tile);
    }
  }
  drawDarkGround(1900, 615, 500, 320);
}

function drawBuildZone(x, y, color){
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(x, y + 18, 20, x, y + 18, 290);
  glow.addColorStop(0, `${color}36`);
  glow.addColorStop(0.55, `${color}12`);
  glow.addColorStop(1, `${color}00`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(x, y + 35, 300, 168, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWorldVignette(){
  ctx.save();
  const gradient = ctx.createRadialGradient(
    state.camera.x + dom.canvas.width * 0.5,
    state.camera.y + dom.canvas.height * 0.5,
    120,
    state.camera.x + dom.canvas.width * 0.5,
    state.camera.y + dom.canvas.height * 0.5,
    Math.max(dom.canvas.width, dom.canvas.height) * 0.72
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(4,7,12,.34)');
  ctx.fillStyle = gradient;
  ctx.fillRect(state.camera.x, state.camera.y, dom.canvas.width, dom.canvas.height);
  ctx.restore();
}

function noise(x, y){
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
}

function drawRoad(x1, y1, x2, y2){
  ctx.save();
  ctx.strokeStyle = 'rgba(151,113,58,.8)';
  ctx.lineWidth = 58;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1 + 72);
  ctx.bezierCurveTo(850, 1020, 1250, 360, x2, y2 + 72);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,185,107,.35)';
  ctx.lineWidth = 24;
  ctx.stroke();
  ctx.restore();
}

function drawBaseGround(x, y, color){
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.32;
  ctx.beginPath();
  ctx.ellipse(x, y + 88, 280, 140, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawDarkGround(x, y, w, h){
  ctx.fillStyle = 'rgba(37,25,50,.55)';
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawMapBounds(){
  ctx.fillStyle = '#2a5562';
  ctx.fillRect(0, 0, WORLD.width, 44);
  ctx.fillRect(0, WORLD.height - 44, WORLD.width, 44);
  ctx.fillRect(0, 0, 44, WORLD.height);
  ctx.fillRect(WORLD.width - 44, 0, 44, WORLD.height);
}

function drawResources(){
  for(const resource of state.resources){
    if(!inView(resource, 100)) continue;
    if(resource.kind === 'crystal') drawCrystal(resource);
    if(resource.kind === 'wood') drawForest(resource);
  }
}

function drawCrystal(resource){
  ctx.save();
  ctx.translate(resource.x, resource.y);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(0, 28, 44, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  drawGem(-12, 8, 34, '#40bfff');
  drawGem(18, 15, 26, '#6de5ff');
  drawGem(4, -8, 42, '#2e87ff');
  drawAmount(resource);
  ctx.restore();
}

function drawGem(x, y, size, color){
  ctx.fillStyle = color;
  ctx.strokeStyle = '#13314f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.55, y);
  ctx.lineTo(x + size * 0.22, y + size);
  ctx.lineTo(x - size * 0.45, y + size * 0.7);
  ctx.lineTo(x - size * 0.6, y - size * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.62)';
  ctx.fillRect(x - 5, y - size * 0.55, 8, 16);
}

function drawForest(resource){
  ctx.save();
  ctx.translate(resource.x, resource.y);
  for(let i = 0; i < 8; i += 1){
    const angle = i / 8 * Math.PI * 2;
    const x = Math.cos(angle) * (24 + (i % 3) * 12);
    const y = Math.sin(angle) * (18 + (i % 2) * 10);
    drawTree(x, y);
  }
  drawAmount(resource);
  ctx.restore();
}

function drawTree(x, y){
  ctx.fillStyle = '#51371f';
  ctx.fillRect(x - 5, y + 10, 10, 22);
  ctx.fillStyle = '#245b37';
  ctx.strokeStyle = '#173823';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y + 2, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3d8652';
  ctx.beginPath();
  ctx.arc(x - 7, y - 6, 14, 0, Math.PI * 2);
  ctx.fill();
}

function drawAmount(resource){
  ctx.font = '700 13px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#0b1017';
  ctx.fillStyle = '#fff4c7';
  ctx.strokeText(String(Math.floor(resource.amount)), 0, resource.radius + 36);
  ctx.fillText(String(Math.floor(resource.amount)), 0, resource.radius + 36);
}

function drawEntities(){
  const entities = [...state.buildings, ...state.units].sort((a, b) => a.y - b.y);
  for(const entity of entities){
    if(!inView(entity, 180)) continue;
    if(entity.entity === 'building') drawBuilding(entity);
    else drawUnit(entity);
  }
}

function drawBuilding(building){
  const selected = building.id === state.selectedId;
  if(selected) drawSelection(building, building.radius + 14);

  const image = assets.get(building.def.asset);
  const { w, h } = building.def.size;
  ctx.save();
  ctx.translate(building.x, building.y);
  drawShadow(0, h * 0.28, w * 0.48, h * 0.13);
  if(image){
    ctx.drawImage(image, -w / 2, -h + building.radius * 0.55, w, h);
  }else{
    drawBuildingPlaceholder(building);
  }
  ctx.restore();
  drawHealthBar(building, w * 0.62, -h + building.radius * 0.45);
}

function drawBuildingPlaceholder(building){
  const faction = FACTIONS[building.faction];
  const w = building.def.size.w;
  const h = building.def.size.h;
  ctx.fillStyle = faction.dark;
  ctx.strokeStyle = '#0c1018';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-w * 0.38, -h * 0.35);
  ctx.lineTo(0, -h * 0.62);
  ctx.lineTo(w * 0.38, -h * 0.35);
  ctx.lineTo(w * 0.32, h * 0.08);
  ctx.lineTo(-w * 0.32, h * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = faction.color;
  ctx.fillRect(-w * 0.18, -h * 0.18, w * 0.36, h * 0.16);
}

function drawUnit(unit){
  const selected = unit.id === state.selectedId;
  if(selected) drawSelection(unit, unit.radius + 8);

  const image = assets.get(unit.def.asset);
  const { w, h } = unit.def.size;
  ctx.save();
  ctx.translate(unit.x, unit.y);
  drawShadow(0, 14, w * 0.34, 8);
  const bob = Math.sin(state.time * 8 + unit.x * 0.04) * (unit.order.type === 'idle' ? 0.6 : 1.8);
  if(image){
    ctx.drawImage(image, -w / 2, -h + 24 + bob, w, h);
  }else{
    drawUnitPlaceholder(unit, bob);
  }
  if(unit.carry){
    ctx.fillStyle = unit.carry.kind === 'crystal' ? '#51d7ff' : '#8a5b2c';
    ctx.beginPath();
    ctx.arc(w * 0.22, -h * 0.35, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  drawHealthBar(unit, w * 0.72, -h + 20);
}

function drawUnitPlaceholder(unit, bob){
  const faction = FACTIONS[unit.faction];
  ctx.translate(0, bob);
  ctx.fillStyle = faction.color;
  ctx.strokeStyle = '#0c1018';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, -18, 15, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = unit.faction === 'watchers' ? '#f0c792' : '#d8b5ff';
  ctx.beginPath();
  ctx.arc(0, -42, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawShadow(x, y, w, h){
  ctx.fillStyle = 'rgba(0,0,0,.26)';
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSelection(entity, radius){
  ctx.save();
  ctx.strokeStyle = entity.owner === 'player' ? '#86d7ff' : '#ff6d97';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 5]);
  ctx.beginPath();
  ctx.ellipse(entity.x, entity.y + 14, radius, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHealthBar(entity, width, yOffset){
  const h = 5;
  const x = entity.x - width / 2;
  const y = entity.y + yOffset;
  ctx.fillStyle = 'rgba(0,0,0,.58)';
  ctx.fillRect(x, y, width, h);
  ctx.fillStyle = entity.owner === 'player' ? '#61dd83' : '#ff5e7b';
  ctx.fillRect(x, y, width * clamp(entity.hp / entity.maxHp, 0, 1), h);
}

function drawProjectiles(){
  for(const projectile of state.projectiles){
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBuildPreview(){
  const def = BUILDING_DEFS[state.players.player.faction][state.buildMode];
  if(!def) return;
  const x = state.mouse.x + state.camera.x;
  const y = state.mouse.y + state.camera.y;
  const valid = canPlaceBuilding(x, y, def.footprint, 'player');
  ctx.strokeStyle = valid ? '#76e09b' : '#ff5570';
  ctx.fillStyle = valid ? 'rgba(118,224,155,.16)' : 'rgba(255,85,112,.16)';
  ctx.beginPath();
  ctx.ellipse(x, y + 12, def.footprint, def.footprint * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawMinimap(){
  mini.clearRect(0, 0, dom.minimap.width, dom.minimap.height);
  mini.fillStyle = '#23354b';
  mini.fillRect(0, 0, dom.minimap.width, dom.minimap.height);
  const sx = dom.minimap.width / WORLD.width;
  const sy = dom.minimap.height / WORLD.height;
  for(const resource of state.resources){
    mini.fillStyle = resource.kind === 'crystal' ? '#5bdcff' : '#4faa68';
    mini.fillRect(resource.x * sx - 1, resource.y * sy - 1, 3, 3);
  }
  for(const building of state.buildings){
    mini.fillStyle = building.owner === 'player' ? '#40a7ff' : '#9a63ff';
    mini.fillRect(building.x * sx - 3, building.y * sy - 3, 6, 6);
  }
  for(const unit of state.units){
    mini.fillStyle = unit.owner === 'player' ? '#9bdcff' : '#d6b3ff';
    mini.fillRect(unit.x * sx - 1, unit.y * sy - 1, 2, 2);
  }
  mini.strokeStyle = '#fff';
  mini.strokeRect(state.camera.x * sx, state.camera.y * sy, dom.canvas.width * sx, dom.canvas.height * sy);
}

function inView(entity, pad){
  return entity.x > state.camera.x - pad &&
    entity.x < state.camera.x + dom.canvas.width + pad &&
    entity.y > state.camera.y - pad &&
    entity.y < state.camera.y + dom.canvas.height + pad;
}

function updateUi(force = false){
  if(!state) return;
  const player = state.players.player;
  dom.factionName.textContent = FACTIONS[player.faction].name;
  dom.crystal.textContent = Math.floor(player.resources.crystal);
  dom.wood.textContent = Math.floor(player.resources.wood);
  dom.food.textContent = Math.floor(player.resources.food);
  dom.pop.textContent = `${player.pop}/${player.popCap}`;

  const selected = selectedEntity();
  if(!selected){
    dom.selectedInfo.textContent = 'Aucune unite selectionnee.';
  }else{
    dom.selectedInfo.innerHTML = `
      <strong>${selected.def.name}</strong>
      <span>${selected.owner === 'player' ? 'Player' : 'Enemy'} · ${Math.ceil(selected.hp)}/${selected.maxHp} HP</span>
    `;
  }

  if(force || document.activeElement?.tagName !== 'BUTTON'){
    renderActionButtons(selected);
  }
}

function renderActionButtons(selected){
  const buttons = [];
  if(selected?.owner === 'player' && selected.entity === 'building'){
    for(const unitKey of selected.def.trains || []){
      const def = UNIT_DEFS[selected.faction][unitKey];
      buttons.push(actionButton(`Train ${def.name}`, () => trainUnit(selected, unitKey)));
    }
  }
  if(selected?.owner === 'player' && selected.entity === 'unit' && selected.def.canGather){
    const faction = state.players.player.faction;
    const prodKey = FACTIONS[faction].production;
    for(const key of [prodKey, ...BUILD_OPTIONS]){
      const def = BUILDING_DEFS[faction][key];
      buttons.push(actionButton(`Build ${def.name}`, () => {
        state.buildMode = key;
        showMessage(`Place ${def.name} on the map.`);
      }));
    }
  }
  if(selected?.owner === 'player' && selected.entity === 'unit'){
    buttons.push(actionButton('Stop', () => { selected.order = { type: 'idle' }; }));
  }
  dom.actions.innerHTML = '';
  if(!buttons.length){
    const empty = document.createElement('div');
    empty.className = 'selected-info';
    empty.textContent = 'Selectionne un worker, un HQ ou un batiment de production.';
    dom.actions.appendChild(empty);
    return;
  }
  for(const button of buttons) dom.actions.appendChild(button);
}

function actionButton(label, handler){
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function canvasPoint(event){
  const rect = dom.canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * dom.canvas.width / rect.width;
  const y = (event.clientY - rect.top) * dom.canvas.height / rect.height;
  return { x, y, wx: x + state.camera.x, wy: y + state.camera.y };
}

function pickEntity(x, y){
  const entities = [...state.units, ...state.buildings].sort((a, b) => b.y - a.y);
  return entities.find(entity => Math.hypot(entity.x - x, entity.y - y) < entity.radius + 10) || null;
}

function pickResource(x, y){
  return state.resources.find(resource => Math.hypot(resource.x - x, resource.y - y) < resource.radius + 18) || null;
}

function handleMapCommand(point){
  const selected = selectedEntity();
  if(state.buildMode){
    placeBuilding(state.buildMode, point.wx, point.wy);
    return;
  }

  const entity = pickEntity(point.wx, point.wy);
  const resource = pickResource(point.wx, point.wy);

  if(entity?.owner === 'player'){
    state.selectedId = entity.id;
    updateUi(true);
    return;
  }

  const units = selectedUnits();
  if(entity && entity.owner !== 'player' && units.length){
    issueAttack(units, entity);
    return;
  }
  if(resource && units.length){
    issueGather(units, resource);
    return;
  }
  if(units.length){
    issueMove(units, point.wx, point.wy);
    return;
  }

  state.selectedId = null;
  updateUi(true);
}

function resizeCanvas(){
  const rect = dom.canvas.parentElement.getBoundingClientRect();
  dom.canvas.width = Math.max(760, Math.floor(rect.width));
  dom.canvas.height = Math.max(520, Math.floor(rect.height));
  if(state){
    state.camera.x = clamp(state.camera.x, 0, WORLD.width - dom.canvas.width);
    state.camera.y = clamp(state.camera.y, 0, WORLD.height - dom.canvas.height);
  }
}

function centerCameraOn(entity){
  if(!entity) return;
  state.camera.x = clamp(entity.x - dom.canvas.width / 2, 0, WORLD.width - dom.canvas.width);
  state.camera.y = clamp(entity.y - dom.canvas.height / 2, 0, WORLD.height - dom.canvas.height);
}

function bindEvents(){
  dom.factionCards.forEach(card => {
    card.addEventListener('click', () => {
      chosenFaction = card.dataset.faction;
      dom.factionCards.forEach(item => item.classList.toggle('selected', item === card));
    });
  });
  dom.start.addEventListener('click', startGame);
  dom.pause.addEventListener('click', () => {
    if(!state) return;
    state.paused = !state.paused;
    dom.pause.textContent = state.paused ? '▶' : 'II';
  });
  dom.restart.addEventListener('click', () => {
    state = null;
    dom.game.hidden = true;
    dom.game.classList.add('is-hidden');
    dom.home.hidden = false;
    dom.home.classList.remove('is-hidden');
  });
  dom.canvas.addEventListener('mousemove', event => {
    if(!state) return;
    const point = canvasPoint(event);
    state.mouse.x = point.x;
    state.mouse.y = point.y;
  });
  dom.canvas.addEventListener('click', event => {
    if(!state) return;
    handleMapCommand(canvasPoint(event));
  });
  dom.canvas.addEventListener('contextmenu', event => {
    event.preventDefault();
    if(!state) return;
    const point = canvasPoint(event);
    const entity = pickEntity(point.wx, point.wy);
    const resource = pickResource(point.wx, point.wy);
    const units = selectedUnits();
    if(entity && entity.owner !== 'player') issueAttack(units, entity);
    else if(resource) issueGather(units, resource);
    else issueMove(units, point.wx, point.wy);
  });
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('keydown', event => state?.keys.add(event.key));
  window.addEventListener('keyup', event => state?.keys.delete(event.key));
}

bindEvents();
if(new URLSearchParams(window.location.search).has('autostart')){
  startGame();
}
requestAnimationFrame(loop);

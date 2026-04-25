(() => {
  const FACTIONS = {
    slayer: {
      name: 'Chasseurs',
      hall: 'Domaine',
      worker: 'Eclaireur',
      fighter: 'Sabreur',
      ranged: 'Arbalete',
      elite: 'Pilier',
      barracks: 'Dojo',
      tower: 'Tour',
      shrine: 'Autel',
      house: 'Quartier'
    },
    demon: {
      name: 'Demons',
      hall: 'Antre',
      worker: 'Serviteur',
      fighter: 'Griffe',
      ranged: 'Ombre',
      elite: 'Lune',
      barracks: 'Nid',
      tower: 'Obelisque',
      shrine: 'Fosse',
      house: 'Cocon'
    }
  };

  const UNIT = {
    worker: { hp: 48, speed: 118, damage: 4, range: 24, cooldown: .9, pop: 1, cost: { food: 50 } },
    fighter: { hp: 92, speed: 106, damage: 12, range: 32, cooldown: .72, pop: 2, cost: { food: 70, steel: 30 } },
    ranged: { hp: 68, speed: 98, damage: 10, range: 150, cooldown: 1.05, pop: 2, cost: { food: 60, steel: 45 } },
    elite: { hp: 170, speed: 92, damage: 28, range: 48, cooldown: 1.1, pop: 4, cost: { food: 120, steel: 90, spirit: 45 } }
  };

  const BUILDING = {
    hall: { hp: 820, radius: 48, pop: 12, cost: {}, trains: ['worker'] },
    house: { hp: 220, radius: 25, pop: 8, cost: { food: 65, steel: 25 }, trains: [] },
    barracks: { hp: 470, radius: 36, pop: 4, cost: { food: 130, steel: 95 }, trains: ['fighter', 'ranged', 'elite'] },
    tower: { hp: 350, radius: 30, pop: 0, cost: { steel: 130, spirit: 25 }, damage: 18, range: 220, cooldown: .85, trains: [] },
    shrine: { hp: 390, radius: 32, pop: 2, cost: { food: 90, steel: 70, spirit: 40 }, trains: [] }
  };

  const PLAYER_COLORS = ['#5dd8ff', '#ff5d92', '#75e885', '#ffc75d', '#b98bff', '#f2f6ff', '#ff8a4d', '#60efca'];
  const DEFAULT_NAMES = ['Mickael', 'Akari', 'Kuro', 'Ren', 'Sora', 'Nami', 'Kaen', 'Yoru'];
  const RESOURCE_COLORS = { food: '#71d579', steel: '#c9d2dd', spirit: '#a978ff' };

  const dom = {
    setupView: document.getElementById('setupView'),
    gameView: document.getElementById('gameView'),
    form: document.getElementById('setupForm'),
    slots: document.getElementById('slots'),
    playerCount: document.getElementById('playerCount'),
    mapSize: document.getElementById('mapSize'),
    matchMode: document.getElementById('matchMode'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    canvas: document.getElementById('battlefield'),
    minimap: document.getElementById('minimap'),
    notice: document.getElementById('notice'),
    factionLabel: document.getElementById('factionLabel'),
    foodHud: document.getElementById('foodHud'),
    steelHud: document.getElementById('steelHud'),
    spiritHud: document.getElementById('spiritHud'),
    popHud: document.getElementById('popHud'),
    dayHud: document.getElementById('dayHud'),
    pauseBtn: document.getElementById('pauseBtn'),
    backBtn: document.getElementById('backBtn'),
    selectionPanel: document.getElementById('selectionPanel'),
    playersPanel: document.getElementById('playersPanel'),
    workerBtn: document.getElementById('workerBtn'),
    fighterBtn: document.getElementById('fighterBtn'),
    rangedBtn: document.getElementById('rangedBtn'),
    eliteBtn: document.getElementById('eliteBtn'),
    houseBtn: document.getElementById('houseBtn'),
    barracksBtn: document.getElementById('barracksBtn'),
    towerBtn: document.getElementById('towerBtn'),
    shrineBtn: document.getElementById('shrineBtn'),
    stopBtn: document.getElementById('stopBtn'),
    rallyBtn: document.getElementById('rallyBtn'),
    selectArmyBtn: document.getElementById('selectArmyBtn'),
    selectWorkersBtn: document.getElementById('selectWorkersBtn')
  };

  const ctx = dom.canvas.getContext('2d');
  const mini = dom.minimap.getContext('2d');
  let state = null;
  let last = performance.now();
  let noticeTimer = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const random = (min, max) => min + Math.random() * (max - min);
  const id = prefix => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

  function getSavedName(){
    try{
      return JSON.parse(localStorage.getItem('user') || 'null')?.username || 'Joueur';
    }catch(error){
      return 'Joueur';
    }
  }

  function notice(text){
    dom.notice.textContent = text;
    dom.notice.classList.add('visible');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => dom.notice.classList.remove('visible'), 2400);
  }

  function renderSlots(){
    const count = Number(dom.playerCount.value);
    dom.slots.innerHTML = '';

    for(let i = 0; i < count; i += 1){
      const team = dom.matchMode.value === 'ffa' ? i + 1 : i < count / 2 ? 1 : 2;
      const row = document.createElement('div');
      row.className = 'slot';
      row.innerHTML = `
        <div class="slot-number">${i + 1}</div>
        <label>Nom<input data-field="name" value="${i === 0 ? getSavedName() : DEFAULT_NAMES[i]}"></label>
        <label>Faction<select data-field="faction">
          <option value="slayer"${i % 2 === 0 ? ' selected' : ''}>Chasseurs</option>
          <option value="demon"${i % 2 === 1 ? ' selected' : ''}>Demons</option>
        </select></label>
        <label>Equipe<select data-field="team">
          <option value="1"${team === 1 ? ' selected' : ''}>1</option>
          <option value="2"${team === 2 ? ' selected' : ''}>2</option>
          <option value="3"${team === 3 ? ' selected' : ''}>3</option>
          <option value="4"${team === 4 ? ' selected' : ''}>4</option>
          <option value="5"${team === 5 ? ' selected' : ''}>5</option>
          <option value="6"${team === 6 ? ' selected' : ''}>6</option>
          <option value="7"${team === 7 ? ' selected' : ''}>7</option>
          <option value="8"${team === 8 ? ' selected' : ''}>8</option>
        </select></label>
        <label>Type<select data-field="type">
          <option value="human"${i === 0 ? ' selected' : ''}>Humain</option>
          <option value="ai"${i !== 0 ? ' selected' : ''}>IA</option>
          <option value="closed">Ferme</option>
        </select></label>
      `;
      dom.slots.appendChild(row);
    }
  }

  function readSetup(){
    return [...dom.slots.querySelectorAll('.slot')].map((slot, index) => {
      const name = slot.querySelector('[data-field="name"]').value.trim() || `Joueur ${index + 1}`;
      const faction = slot.querySelector('[data-field="faction"]').value;
      const team = Number(slot.querySelector('[data-field="team"]').value);
      const type = slot.querySelector('[data-field="type"]').value;
      return {
        id: index,
        name,
        faction,
        team,
        type,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
        food: 300,
        steel: 170,
        spirit: 70,
        pop: 0,
        popCap: 0,
        alive: type !== 'closed',
        aiTimer: random(.5, 1.7)
      };
    }).filter(player => player.type !== 'closed');
  }

  function startGame(event){
    event.preventDefault();
    const players = readSetup();
    if(players.length < 2){
      notice('Ouvre au moins deux slots.');
      return;
    }

    const human = players.find(player => player.type === 'human') || players[0];
    human.type = 'human';
    const huge = dom.mapSize.value === 'huge';
    state = {
      width: huge ? 4600 : 3400,
      height: huge ? 3000 : 2250,
      players,
      humanId: human.id,
      units: [],
      buildings: [],
      resources: [],
      effects: [],
      selected: [],
      camera: { x: 0, y: 0 },
      mouse: { x: 0, y: 0, wx: 0, wy: 0 },
      keys: new Set(),
      drag: null,
      buildMode: null,
      rallyMode: false,
      paused: false,
      time: 0,
      winnerTeam: null
    };

    seedMap();
    dom.setupView.hidden = true;
    dom.setupView.classList.add('is-hidden');
    dom.gameView.hidden = false;
    dom.gameView.classList.remove('is-hidden');
    resizeCanvas();
    centerCameraOn(getMainHall(state.humanId));
    updateHud();
    notice('Partie lancee. Recolte, construis une caserne, puis attaque.');
  }

  function seedMap(){
    const spawns = createSpawnPoints(state.players.length);
    state.players.forEach((player, index) => {
      const spawn = spawns[index];
      addBuilding(player.id, 'hall', spawn.x, spawn.y);
      addBuilding(player.id, 'house', spawn.x + 120, spawn.y + 38);
      addBuilding(player.id, 'tower', spawn.x - 118, spawn.y + 24);

      for(let i = 0; i < 6; i += 1){
        addUnit(player.id, 'worker', spawn.x + random(-75, 75), spawn.y + random(82, 130));
      }
      addUnit(player.id, 'fighter', spawn.x - 70, spawn.y - 92);
      addUnit(player.id, 'ranged', spawn.x + 70, spawn.y - 92);

      addResource('food', spawn.x + 175, spawn.y + 145, 950);
      addResource('steel', spawn.x - 175, spawn.y + 140, 880);
      addResource('spirit', spawn.x + 16, spawn.y - 190, 560);
    });

    for(let i = 0; i < 74; i += 1){
      const kind = i % 6 === 0 ? 'spirit' : i % 2 === 0 ? 'steel' : 'food';
      addResource(kind, random(220, state.width - 220), random(220, state.height - 220), kind === 'spirit' ? 620 : 1040);
    }
  }

  function createSpawnPoints(count){
    const points = [];
    const cx = state.width / 2;
    const cy = state.height / 2;
    const rx = state.width * .38;
    const ry = state.height * .36;
    for(let i = 0; i < count; i += 1){
      const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
      points.push({
        x: clamp(cx + Math.cos(angle) * rx, 280, state.width - 280),
        y: clamp(cy + Math.sin(angle) * ry, 280, state.height - 280)
      });
    }
    return points;
  }

  function addResource(kind, x, y, amount){
    state.resources.push({ id: id('resource'), kind, x, y, amount, radius: kind === 'food' ? 31 : 24 });
  }

  function addUnit(owner, type, x, y){
    const spec = UNIT[type];
    const player = playerById(owner);
    if(!player) return null;
    player.pop += spec.pop;
    const unit = {
      id: id('unit'),
      entity: 'unit',
      owner,
      type,
      x,
      y,
      radius: type === 'elite' ? 17 : type === 'fighter' ? 13 : type === 'ranged' ? 12 : 10,
      hp: spec.hp,
      maxHp: spec.hp,
      cooldown: 0,
      carried: null,
      order: { type: 'idle' }
    };
    state.units.push(unit);
    return unit;
  }

  function addBuilding(owner, type, x, y){
    const spec = BUILDING[type];
    const player = playerById(owner);
    if(!player) return null;
    player.popCap += spec.pop;
    const building = {
      id: id('building'),
      entity: 'building',
      owner,
      type,
      x,
      y,
      radius: spec.radius,
      hp: spec.hp,
      maxHp: spec.hp,
      cooldown: 0,
      rally: { x: x + 85, y: y + 72 }
    };
    state.buildings.push(building);
    return building;
  }

  function loop(time){
    const dt = Math.min(.05, (time - last) / 1000);
    last = time;
    if(state && !state.paused){
      update(dt);
    }
    if(state) draw();
    requestAnimationFrame(loop);
  }

  function update(dt){
    state.time += dt;
    updateCamera(dt);
    updateUnits(dt);
    updateBuildings(dt);
    updateAi(dt);
    cleanup();
    updateWinner();
    updateHud();
  }

  function updateCamera(dt){
    const speed = 780 * dt;
    const edge = 24;
    if(state.keys.has('a') || state.keys.has('ArrowLeft') || state.mouse.x < edge) state.camera.x -= speed;
    if(state.keys.has('d') || state.keys.has('ArrowRight') || state.mouse.x > dom.canvas.width - edge) state.camera.x += speed;
    if(state.keys.has('w') || state.keys.has('ArrowUp') || state.mouse.y < edge) state.camera.y -= speed;
    if(state.keys.has('s') || state.keys.has('ArrowDown') || state.mouse.y > dom.canvas.height - edge) state.camera.y += speed;
    state.camera.x = clamp(state.camera.x, 0, Math.max(0, state.width - dom.canvas.width));
    state.camera.y = clamp(state.camera.y, 0, Math.max(0, state.height - dom.canvas.height));
  }

  function updateUnits(dt){
    for(const unit of state.units){
      unit.cooldown = Math.max(0, unit.cooldown - dt);
      const spec = UNIT[unit.type];
      const target = nearestEnemy(unit, spec.range);
      if(target && unit.cooldown <= 0){
        damage(unit, target, spec.damage * factionBonus(unit.owner));
        unit.cooldown = spec.cooldown;
      }

      if(unit.type === 'worker') updateWorker(unit, dt);

      if(unit.order.type === 'attack'){
        const attackTarget = entityById(unit.order.target);
        if(attackTarget){
          if(distance(unit, attackTarget) > spec.range * .85){
            moveToward(unit, attackTarget.x, attackTarget.y, spec.speed, dt);
          }
        }else{
          unit.order = { type: 'idle' };
        }
      }

      if(unit.order.type === 'move'){
        moveToward(unit, unit.order.x, unit.order.y, spec.speed, dt);
        if(Math.hypot(unit.x - unit.order.x, unit.y - unit.order.y) < 11) unit.order = { type: 'idle' };
      }
    }
  }

  function updateWorker(unit, dt){
    if(unit.order.type !== 'gather') return;
    const resource = state.resources.find(item => item.id === unit.order.resourceId && item.amount > 0);
    const hall = nearestHall(unit);
    if(!resource || !hall){
      unit.order = { type: 'idle' };
      return;
    }

    if(!unit.carried){
      if(distance(unit, resource) > resource.radius + 10){
        moveToward(unit, resource.x, resource.y, UNIT.worker.speed, dt);
      }else{
        const amount = Math.min(10, resource.amount);
        resource.amount -= amount;
        unit.carried = { kind: resource.kind, amount };
      }
      return;
    }

    if(distance(unit, hall) > hall.radius + 12){
      moveToward(unit, hall.x, hall.y, UNIT.worker.speed, dt);
      return;
    }

    const player = playerById(unit.owner);
    player[unit.carried.kind] += unit.carried.amount;
    unit.carried = null;
  }

  function updateBuildings(dt){
    for(const building of state.buildings){
      building.cooldown = Math.max(0, building.cooldown - dt);
      const spec = BUILDING[building.type];
      if(!spec.damage || building.cooldown > 0) continue;
      const target = nearestEnemy(building, spec.range);
      if(target){
        damage(building, target, spec.damage * factionBonus(building.owner));
        building.cooldown = spec.cooldown;
      }
    }
  }

  function updateAi(dt){
    for(const player of state.players){
      if(player.type !== 'ai' || !player.alive) continue;
      player.aiTimer -= dt;
      if(player.aiTimer > 0) continue;
      player.aiTimer = random(1, 2.3);

      const hall = getMainHall(player.id);
      if(!hall) continue;
      const workers = state.units.filter(unit => unit.owner === player.id && unit.type === 'worker');
      for(const worker of workers){
        if(worker.order.type === 'idle'){
          const resource = nearestResource(worker);
          if(resource) worker.order = { type: 'gather', resourceId: resource.id };
        }
      }

      if(workers.length < 9) train(player.id, 'worker', hall, true);
      if(player.popCap - player.pop < 5 && player.food > 100) build(player.id, 'house', hall.x + random(-170, 170), hall.y + random(-170, 170), true);

      const barracks = state.buildings.find(item => item.owner === player.id && item.type === 'barracks');
      if(!barracks && player.food > 150 && player.steel > 125){
        build(player.id, 'barracks', hall.x + random(-190, 190), hall.y + random(-190, 190), true);
      }
      if(barracks){
        const roll = Math.random();
        train(player.id, roll > .88 ? 'elite' : roll > .48 ? 'ranged' : 'fighter', barracks, true);
      }

      if(player.steel > 170 && player.spirit > 35 && Math.random() > .72){
        build(player.id, 'tower', hall.x + random(-230, 230), hall.y + random(-230, 230), true);
      }

      const army = state.units.filter(unit => unit.owner === player.id && unit.type !== 'worker');
      if(army.length >= 7){
        const enemyBase = nearestEnemyBase(player.id);
        if(enemyBase){
          army.forEach(unit => { unit.order = { type: 'attack', target: enemyBase.id }; });
        }
      }
    }
  }

  function moveToward(entity, x, y, speed, dt){
    const dx = x - entity.x;
    const dy = y - entity.y;
    const d = Math.hypot(dx, dy);
    if(d < 1) return;
    entity.x = clamp(entity.x + dx / d * speed * dt, 18, state.width - 18);
    entity.y = clamp(entity.y + dy / d * speed * dt, 18, state.height - 18);
  }

  function damage(attacker, target, amount){
    if(allied(attacker.owner, target.owner)) return;
    target.hp -= amount;
    state.effects.push({ x: target.x + random(-8, 8), y: target.y + random(-8, 8), life: .35, color: playerById(attacker.owner)?.color || '#fff' });
  }

  function cleanup(){
    state.units = state.units.filter(unit => {
      if(unit.hp > 0) return true;
      const player = playerById(unit.owner);
      if(player) player.pop = Math.max(0, player.pop - UNIT[unit.type].pop);
      return false;
    });
    state.buildings = state.buildings.filter(building => {
      if(building.hp > 0) return true;
      const player = playerById(building.owner);
      if(player) player.popCap = Math.max(0, player.popCap - BUILDING[building.type].pop);
      return false;
    });
    state.resources = state.resources.filter(resource => resource.amount > 0);
    state.effects = state.effects.filter(effect => {
      effect.life -= .016;
      return effect.life > 0;
    });
    state.players.forEach(player => {
      player.alive = state.units.some(unit => unit.owner === player.id) || state.buildings.some(building => building.owner === player.id);
    });
    state.selected = state.selected.filter(entity => entityById(entity.id));
  }

  function updateWinner(){
    if(state.winnerTeam) return;
    const aliveTeams = new Set(state.players.filter(player => player.alive).map(player => player.team));
    if(aliveTeams.size === 1){
      state.winnerTeam = [...aliveTeams][0];
      state.paused = true;
      dom.pauseBtn.textContent = '▶';
      notice(`Equipe ${state.winnerTeam} gagne.`);
    }
  }

  function factionBonus(owner){
    const player = playerById(owner);
    const phase = dayPhase();
    if(player?.faction === 'demon' && phase === 'Nuit') return 1.18;
    if(player?.faction === 'slayer' && phase !== 'Nuit') return 1.1;
    return 1;
  }

  function train(owner, type, producer, silent = false){
    const player = playerById(owner);
    const spec = UNIT[type];
    if(!player || !producer || !spec) return false;
    if(!BUILDING[producer.type].trains.includes(type)) return false;
    if(player.pop + spec.pop > player.popCap){
      if(!silent) notice('Population maximale atteinte.');
      return false;
    }
    if(!canPay(player, spec.cost)){
      if(!silent) notice('Ressources insuffisantes.');
      return false;
    }
    pay(player, spec.cost);
    const angle = random(0, Math.PI * 2);
    const unit = addUnit(owner, type, producer.x + Math.cos(angle) * 72, producer.y + Math.sin(angle) * 72);
    if(producer.rally) unit.order = { type: 'move', x: producer.rally.x, y: producer.rally.y };
    return true;
  }

  function build(owner, type, x, y, silent = false){
    const player = playerById(owner);
    const spec = BUILDING[type];
    if(!player || !spec) return false;
    if(!canPay(player, spec.cost)){
      if(!silent) notice('Ressources insuffisantes pour construire.');
      return false;
    }
    const closeEnough = entities().some(entity => entity.owner === owner && distance(entity, { x, y }) < 310);
    const blocked = entities().some(entity => distance(entity, { x, y }) < entity.radius + spec.radius + 10);
    if((!closeEnough || blocked) && !silent){
      notice(blocked ? 'Emplacement bloque.' : 'Construis pres de ton territoire.');
      return false;
    }
    if(blocked && silent) return false;
    pay(player, spec.cost);
    addBuilding(owner, type, x, y);
    return true;
  }

  function canPay(player, cost){
    return Object.keys(cost).every(key => player[key] >= cost[key]);
  }

  function pay(player, cost){
    Object.keys(cost).forEach(key => { player[key] -= cost[key]; });
  }

  function playerById(owner){
    return state.players.find(player => player.id === owner);
  }

  function entities(){
    return [...state.units, ...state.buildings];
  }

  function entityById(entityId){
    return entities().find(entity => entity.id === entityId);
  }

  function allied(a, b){
    return playerById(a)?.team === playerById(b)?.team;
  }

  function getMainHall(owner){
    return state.buildings.find(building => building.owner === owner && building.type === 'hall');
  }

  function nearestHall(unit){
    let best = null;
    let bestDistance = Infinity;
    for(const building of state.buildings){
      if(building.owner !== unit.owner || building.type !== 'hall') continue;
      const d = distance(unit, building);
      if(d < bestDistance){
        best = building;
        bestDistance = d;
      }
    }
    return best;
  }

  function nearestResource(unit){
    let best = null;
    let bestDistance = Infinity;
    for(const resource of state.resources){
      const d = distance(unit, resource);
      if(d < bestDistance){
        best = resource;
        bestDistance = d;
      }
    }
    return best;
  }

  function nearestEnemy(entity, range = Infinity){
    let best = null;
    let bestDistance = range;
    for(const target of entities()){
      if(target.owner === entity.owner || allied(target.owner, entity.owner)) continue;
      const d = distance(entity, target) - target.radius;
      if(d < bestDistance){
        best = target;
        bestDistance = d;
      }
    }
    return best;
  }

  function nearestEnemyBase(owner){
    const origin = getMainHall(owner) || state.units.find(unit => unit.owner === owner);
    if(!origin) return null;
    let best = null;
    let bestDistance = Infinity;
    for(const building of state.buildings){
      if(building.type !== 'hall' || allied(owner, building.owner)) continue;
      const d = distance(origin, building);
      if(d < bestDistance){
        best = building;
        bestDistance = d;
      }
    }
    return best;
  }

  function draw(){
    ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);
    drawTerrain();
    drawResources();
    drawRallyLines();
    drawBuildings();
    drawUnits();
    drawEffects();
    drawDragBox();
    ctx.restore();
    drawAtmosphere();
    drawMinimap();
  }

  function drawTerrain(){
    const gradient = ctx.createLinearGradient(0, 0, state.width, state.height);
    gradient.addColorStop(0, '#10272a');
    gradient.addColorStop(.32, '#162211');
    gradient.addColorStop(.68, '#24161b');
    gradient.addColorStop(1, '#111225');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    for(let i = 0; i < 26; i += 1){
      const x = (i * 379) % state.width;
      const y = (i * 223) % state.height;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(70,96,75,.22)' : 'rgba(64,84,99,.16)';
      ctx.beginPath();
      ctx.ellipse(x, y, 170 + i * 3, 70 + i * 2, i, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;
    for(let x = 0; x < state.width; x += 120){
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, state.height);
      ctx.stroke();
    }
    for(let y = 0; y < state.height; y += 120){
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(state.width, y);
      ctx.stroke();
    }
  }

  function drawResources(){
    for(const resource of state.resources){
      ctx.fillStyle = RESOURCE_COLORS[resource.kind];
      ctx.globalAlpha = .88;
      ctx.beginPath();
      ctx.arc(resource.x, resource.y, resource.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,.26)';
      ctx.stroke();
    }
  }

  function drawRallyLines(){
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(255,255,255,.2)';
    for(const building of state.buildings){
      if(building.owner !== state.humanId || !building.rally) continue;
      ctx.beginPath();
      ctx.moveTo(building.x, building.y);
      ctx.lineTo(building.rally.x, building.rally.y);
      ctx.stroke();
      ctx.fillStyle = '#ffdb72';
      ctx.beginPath();
      ctx.arc(building.rally.x, building.rally.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.setLineDash([]);
  }

  function drawBuildings(){
    for(const building of state.buildings){
      const player = playerById(building.owner);
      const selected = isSelected(building);
      ctx.save();
      ctx.translate(building.x, building.y);
      ctx.fillStyle = player?.color || '#fff';
      ctx.strokeStyle = selected ? '#fff' : 'rgba(0,0,0,.68)';
      ctx.lineWidth = selected ? 4 : 2;
      const sides = building.type === 'tower' ? 6 : building.type === 'house' ? 4 : 8;
      ctx.beginPath();
      for(let i = 0; i < sides; i += 1){
        const angle = -Math.PI / 2 + i * Math.PI * 2 / sides;
        const x = Math.cos(angle) * building.radius;
        const y = Math.sin(angle) * building.radius;
        if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      drawHealth(building);
    }
  }

  function drawUnits(){
    for(const unit of state.units){
      const player = playerById(unit.owner);
      const selected = isSelected(unit);
      ctx.fillStyle = player?.color || '#fff';
      ctx.strokeStyle = selected ? '#fff' : 'rgba(0,0,0,.68)';
      ctx.lineWidth = selected ? 3 : 2;
      ctx.beginPath();
      if(unit.type === 'elite'){
        ctx.moveTo(unit.x, unit.y - unit.radius - 5);
        ctx.lineTo(unit.x + unit.radius + 5, unit.y + unit.radius);
        ctx.lineTo(unit.x - unit.radius - 5, unit.y + unit.radius);
        ctx.closePath();
      }else if(unit.type === 'ranged'){
        ctx.rect(unit.x - unit.radius, unit.y - unit.radius, unit.radius * 2, unit.radius * 2);
      }else{
        ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      if(unit.carried){
        ctx.fillStyle = RESOURCE_COLORS[unit.carried.kind];
        ctx.beginPath();
        ctx.arc(unit.x + unit.radius, unit.y - unit.radius, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      drawHealth(unit);
    }
  }

  function drawEffects(){
    for(const effect of state.effects){
      ctx.globalAlpha = clamp(effect.life / .35, 0, 1);
      ctx.fillStyle = effect.color;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 7 + (1 - effect.life) * 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHealth(entity){
    const width = entity.radius * 2;
    const x = entity.x - width / 2;
    const y = entity.y - entity.radius - 13;
    ctx.fillStyle = 'rgba(0,0,0,.52)';
    ctx.fillRect(x, y, width, 4);
    ctx.fillStyle = entity.hp / entity.maxHp > .45 ? '#65df70' : '#ff5268';
    ctx.fillRect(x, y, width * clamp(entity.hp / entity.maxHp, 0, 1), 4);
  }

  function drawDragBox(){
    if(!state.drag) return;
    const minX = Math.min(state.drag.x, state.mouse.wx);
    const minY = Math.min(state.drag.y, state.mouse.wy);
    const width = Math.abs(state.mouse.wx - state.drag.x);
    const height = Math.abs(state.mouse.wy - state.drag.y);
    ctx.fillStyle = 'rgba(93,216,255,.1)';
    ctx.strokeStyle = 'rgba(255,255,255,.72)';
    ctx.fillRect(minX, minY, width, height);
    ctx.strokeRect(minX, minY, width, height);
  }

  function drawAtmosphere(){
    if(dayPhase() === 'Nuit'){
      ctx.fillStyle = 'rgba(18,9,42,.28)';
      ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);
    }
    if(state.buildMode){
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.font = '13px Trebuchet MS';
      ctx.fillText(`Placement: ${buildingLabel(state.buildMode)}`, 16, 24);
    }
  }

  function drawMinimap(){
    mini.clearRect(0, 0, dom.minimap.width, dom.minimap.height);
    mini.fillStyle = '#081014';
    mini.fillRect(0, 0, dom.minimap.width, dom.minimap.height);
    const sx = dom.minimap.width / state.width;
    const sy = dom.minimap.height / state.height;
    for(const resource of state.resources){
      mini.fillStyle = RESOURCE_COLORS[resource.kind];
      mini.fillRect(resource.x * sx, resource.y * sy, 2, 2);
    }
    for(const entity of entities()){
      mini.fillStyle = playerById(entity.owner)?.color || '#fff';
      const size = entity.entity === 'building' ? 5 : 3;
      mini.fillRect(entity.x * sx - size / 2, entity.y * sy - size / 2, size, size);
    }
    mini.strokeStyle = '#fff';
    mini.strokeRect(state.camera.x * sx, state.camera.y * sy, dom.canvas.width * sx, dom.canvas.height * sy);
  }

  function updateHud(){
    const player = playerById(state.humanId);
    if(!player) return;
    dom.foodHud.textContent = Math.floor(player.food);
    dom.steelHud.textContent = Math.floor(player.steel);
    dom.spiritHud.textContent = Math.floor(player.spirit);
    dom.popHud.textContent = `${player.pop}/${player.popCap}`;
    dom.dayHud.textContent = dayPhase();
    dom.factionLabel.textContent = `${FACTIONS[player.faction].name} - Equipe ${player.team}`;
    renderSelection();
    renderPlayers();
    updateButtons();
  }

  function renderSelection(){
    if(!state.selected.length){
      dom.selectionPanel.innerHTML = '<div class="entity-card"><strong>Aucune selection</strong><span>Selectionne une base, un ouvrier ou une escouade.</span></div>';
      return;
    }
    dom.selectionPanel.innerHTML = state.selected.slice(0, 7).map(entity => {
      const player = playerById(entity.owner);
      return `<div class="entity-card"><strong>${entityLabel(entity)}</strong><span>${player?.name || ''} · ${Math.ceil(entity.hp)}/${entity.maxHp} PV</span></div>`;
    }).join('');
  }

  function renderPlayers(){
    dom.playersPanel.innerHTML = state.players.map(player => {
      const units = state.units.filter(unit => unit.owner === player.id).length;
      const buildings = state.buildings.filter(building => building.owner === player.id).length;
      return `<div class="player-row" style="color:${player.color}">
        <strong>${player.name}</strong>
        <span>${FACTIONS[player.faction].name} · Eq. ${player.team} · ${units} unites · ${buildings} bat.</span>
      </div>`;
    }).join('');
  }

  function updateButtons(){
    const owned = state.selected.filter(entity => entity.owner === state.humanId);
    const hall = owned.find(entity => entity.entity === 'building' && entity.type === 'hall');
    const barracks = owned.find(entity => entity.entity === 'building' && entity.type === 'barracks');
    const workers = owned.filter(entity => entity.entity === 'unit' && entity.type === 'worker');
    const buildings = owned.filter(entity => entity.entity === 'building');
    dom.workerBtn.disabled = !hall;
    dom.fighterBtn.disabled = !barracks;
    dom.rangedBtn.disabled = !barracks;
    dom.eliteBtn.disabled = !barracks;
    dom.houseBtn.disabled = workers.length === 0;
    dom.barracksBtn.disabled = workers.length === 0;
    dom.towerBtn.disabled = workers.length === 0;
    dom.shrineBtn.disabled = workers.length === 0;
    dom.rallyBtn.disabled = buildings.length === 0;
  }

  function dayPhase(){
    const cycle = (state.time % 240) / 240;
    if(cycle < .24) return 'Aube';
    if(cycle < .5) return 'Jour';
    if(cycle < .88) return 'Nuit';
    return 'Crepuscule';
  }

  function entityLabel(entity){
    const player = playerById(entity.owner);
    const faction = FACTIONS[player?.faction || 'slayer'];
    if(entity.entity === 'unit') return faction[entity.type];
    return buildingLabel(entity.type, faction);
  }

  function buildingLabel(type, faction = FACTIONS[playerById(state.humanId)?.faction || 'slayer']){
    return faction[type] || type;
  }

  function isSelected(entity){
    return state.selected.some(item => item.id === entity.id);
  }

  function screenPoint(event){
    const rect = dom.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * dom.canvas.width / rect.width;
    const y = (event.clientY - rect.top) * dom.canvas.height / rect.height;
    return { x, y, wx: x + state.camera.x, wy: y + state.camera.y };
  }

  function pickEntity(x, y){
    return entities().slice().reverse().find(entity => Math.hypot(entity.x - x, entity.y - y) <= entity.radius + 10);
  }

  function pickResource(x, y){
    return state.resources.find(resource => Math.hypot(resource.x - x, resource.y - y) <= resource.radius + 12);
  }

  function onMouseDown(event){
    if(!state || event.button !== 0) return;
    const point = screenPoint(event);
    state.mouse = point;
    if(state.buildMode){
      if(build(state.humanId, state.buildMode, point.wx, point.wy)) state.buildMode = null;
      return;
    }
    if(state.rallyMode){
      state.selected.filter(entity => entity.owner === state.humanId && entity.entity === 'building').forEach(building => {
        building.rally = { x: point.wx, y: point.wy };
      });
      state.rallyMode = false;
      notice('Point de ralliement defini.');
      return;
    }
    state.drag = { x: point.wx, y: point.wy };
  }

  function onMouseMove(event){
    if(!state) return;
    state.mouse = screenPoint(event);
  }

  function onMouseUp(event){
    if(!state || event.button !== 0 || !state.drag) return;
    const point = screenPoint(event);
    const moved = Math.hypot(point.wx - state.drag.x, point.wy - state.drag.y);
    if(moved < 8){
      const entity = pickEntity(point.wx, point.wy);
      state.selected = entity && entity.owner === state.humanId ? [entity] : [];
    }else{
      const minX = Math.min(state.drag.x, point.wx);
      const maxX = Math.max(state.drag.x, point.wx);
      const minY = Math.min(state.drag.y, point.wy);
      const maxY = Math.max(state.drag.y, point.wy);
      state.selected = state.units.filter(unit => unit.owner === state.humanId && unit.x >= minX && unit.x <= maxX && unit.y >= minY && unit.y <= maxY);
    }
    state.drag = null;
    updateHud();
  }

  function onContextMenu(event){
    if(!state) return;
    event.preventDefault();
    const point = screenPoint(event);
    const selectedUnits = state.selected.filter(entity => entity.owner === state.humanId && entity.entity === 'unit');
    if(!selectedUnits.length) return;

    const entity = pickEntity(point.wx, point.wy);
    if(entity && !allied(state.humanId, entity.owner)){
      selectedUnits.forEach(unit => { unit.order = { type: 'attack', target: entity.id }; });
      notice('Ordre attaque.');
      return;
    }

    const resource = pickResource(point.wx, point.wy);
    if(resource){
      selectedUnits.filter(unit => unit.type === 'worker').forEach(unit => { unit.order = { type: 'gather', resourceId: resource.id }; });
      notice('Recolte assignee.');
      return;
    }

    selectedUnits.forEach((unit, index) => {
      const angle = index / Math.max(1, selectedUnits.length) * Math.PI * 2;
      const spread = selectedUnits.length > 1 ? 34 : 0;
      unit.order = { type: 'move', x: point.wx + Math.cos(angle) * spread, y: point.wy + Math.sin(angle) * spread };
    });
  }

  function centerCameraOn(entity){
    if(!entity) return;
    state.camera.x = clamp(entity.x - dom.canvas.width / 2, 0, Math.max(0, state.width - dom.canvas.width));
    state.camera.y = clamp(entity.y - dom.canvas.height / 2, 0, Math.max(0, state.height - dom.canvas.height));
  }

  function resizeCanvas(){
    if(!dom.canvas.parentElement) return;
    const rect = dom.canvas.parentElement.getBoundingClientRect();
    dom.canvas.width = Math.max(720, Math.floor(rect.width));
    dom.canvas.height = Math.max(480, Math.floor(rect.height));
    if(state){
      state.camera.x = clamp(state.camera.x, 0, Math.max(0, state.width - dom.canvas.width));
      state.camera.y = clamp(state.camera.y, 0, Math.max(0, state.height - dom.canvas.height));
    }
  }

  function shuffleSetup(){
    [...dom.slots.querySelectorAll('.slot')].forEach((slot, index) => {
      slot.querySelector('[data-field="faction"]').value = Math.random() > .5 ? 'slayer' : 'demon';
      slot.querySelector('[data-field="team"]').value = String(dom.matchMode.value === 'ffa' ? index + 1 : index % 2 + 1);
      if(index !== 0) slot.querySelector('[data-field="type"]').value = Math.random() > .12 ? 'ai' : 'closed';
    });
  }

  function bind(){
    dom.playerCount.addEventListener('change', renderSlots);
    dom.matchMode.addEventListener('change', renderSlots);
    dom.shuffleBtn.addEventListener('click', shuffleSetup);
    dom.form.addEventListener('submit', startGame);
    dom.pauseBtn.addEventListener('click', () => {
      if(!state) return;
      state.paused = !state.paused;
      dom.pauseBtn.textContent = state.paused ? '▶' : 'II';
    });
    dom.backBtn.addEventListener('click', () => {
      state = null;
      dom.gameView.hidden = true;
      dom.gameView.classList.add('is-hidden');
      dom.setupView.hidden = false;
      dom.setupView.classList.remove('is-hidden');
    });

    dom.workerBtn.addEventListener('click', () => trainSelected('worker'));
    dom.fighterBtn.addEventListener('click', () => trainSelected('fighter'));
    dom.rangedBtn.addEventListener('click', () => trainSelected('ranged'));
    dom.eliteBtn.addEventListener('click', () => trainSelected('elite'));
    dom.houseBtn.addEventListener('click', () => setBuildMode('house'));
    dom.barracksBtn.addEventListener('click', () => setBuildMode('barracks'));
    dom.towerBtn.addEventListener('click', () => setBuildMode('tower'));
    dom.shrineBtn.addEventListener('click', () => setBuildMode('shrine'));
    dom.stopBtn.addEventListener('click', () => {
      state?.selected.filter(entity => entity.entity === 'unit').forEach(unit => { unit.order = { type: 'idle' }; });
    });
    dom.rallyBtn.addEventListener('click', () => {
      if(!state) return;
      state.rallyMode = true;
      notice('Clique sur la carte pour poser le ralliement.');
    });
    dom.selectArmyBtn.addEventListener('click', () => {
      if(!state) return;
      state.selected = state.units.filter(unit => unit.owner === state.humanId && unit.type !== 'worker');
      updateHud();
    });
    dom.selectWorkersBtn.addEventListener('click', () => {
      if(!state) return;
      state.selected = state.units.filter(unit => unit.owner === state.humanId && unit.type === 'worker');
      updateHud();
    });

    dom.canvas.addEventListener('mousedown', onMouseDown);
    dom.canvas.addEventListener('mousemove', onMouseMove);
    dom.canvas.addEventListener('mouseup', onMouseUp);
    dom.canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', event => state?.keys.add(event.key));
    window.addEventListener('keyup', event => state?.keys.delete(event.key));
  }

  function trainSelected(type){
    if(!state) return;
    const producer = state.selected.find(entity => entity.owner === state.humanId && entity.entity === 'building' && BUILDING[entity.type].trains.includes(type));
    if(producer) train(state.humanId, type, producer);
  }

  function setBuildMode(type){
    if(!state) return;
    state.buildMode = type;
    notice(`Clique sur la carte pour construire: ${buildingLabel(type)}.`);
  }

  renderSlots();
  bind();
  requestAnimationFrame(loop);
})();

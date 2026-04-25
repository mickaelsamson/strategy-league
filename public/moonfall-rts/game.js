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
    hall: { hp: 820, radius: 70, pop: 12, cost: {}, trains: ['worker'] },
    house: { hp: 220, radius: 36, pop: 8, cost: { food: 65, steel: 25 }, trains: [] },
    barracks: { hp: 470, radius: 52, pop: 4, cost: { food: 130, steel: 95 }, trains: ['fighter', 'ranged', 'elite'] },
    tower: { hp: 350, radius: 42, pop: 0, cost: { steel: 130, spirit: 25 }, damage: 18, range: 220, cooldown: .85, trains: [] },
    shrine: { hp: 390, radius: 44, pop: 2, cost: { food: 90, steel: 70, spirit: 40 }, trains: [] }
  };

  const PLAYER_COLORS = ['#1f9ed6', '#d6456f', '#2fa85d', '#d3952f', '#815bd6', '#f2f6ff', '#d45a25', '#1aa98c'];
  const DEFAULT_NAMES = ['Mickael', 'Akari', 'Kuro', 'Ren', 'Sora', 'Nami', 'Kaen', 'Yoru'];
  const RESOURCE_COLORS = { food: '#2f8f4d', steel: '#aebcc7', spirit: '#9a66ff' };
  const MANGA_INK = '#182c37';

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
  ctx.imageSmoothingEnabled = false;
  mini.imageSmoothingEnabled = false;
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
      const team = dom.matchMode.value === 'ffa' ? i + 1 : i < Math.ceil(count / 2) ? 1 : 2;
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
      width: huge ? 3800 : 2850,
      height: huge ? 2500 : 1900,
      players,
      humanId: human.id,
      units: [],
      buildings: [],
      resources: [],
      decor: [],
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
      hudTime: 0,
      lastRender: 0,
      needsRender: true,
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
    seedDecor(spawns);
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

    for(let i = 0; i < 10; i += 1){
      separateUnits(.08);
    }
  }

  function seedDecor(spawns){
    state.decor = [];
    const farFromSpawn = (x, y, buffer = 190) => spawns.every(spawn => Math.hypot(spawn.x - x, spawn.y - y) > buffer);

    spawns.forEach((spawn, index) => {
      state.decor.push({ type: 'road', x: spawn.x, y: spawn.y, toX: state.width / 2, toY: state.height / 2, scale: 1, variant: index });
      state.decor.push({ type: 'basePath', x: spawn.x, y: spawn.y + 70, scale: 1.1, variant: index });
      state.decor.push({ type: 'field', x: spawn.x - 190, y: spawn.y - 95, scale: 1, variant: index });
      state.decor.push({ type: 'field', x: spawn.x + 190, y: spawn.y - 92, scale: .9, variant: index + 1 });
      state.decor.push({ type: 'bush', x: spawn.x - 245, y: spawn.y + 80, scale: 1.15, variant: 1 });
      state.decor.push({ type: 'bush', x: spawn.x + 250, y: spawn.y + 92, scale: 1.05, variant: 2 });
    });

    for(let x = 90; x < state.width; x += 170){
      state.decor.push({ type: 'cliff', x, y: 34, scale: random(.85, 1.15) });
      state.decor.push({ type: 'cliff', x: x + 50, y: state.height - 48, scale: random(.85, 1.15) });
    }
    for(let y = 90; y < state.height; y += 160){
      state.decor.push({ type: 'water', x: 32, y, scale: random(.9, 1.25) });
      state.decor.push({ type: 'water', x: state.width - 38, y: y + 35, scale: random(.9, 1.25) });
    }

    for(let i = 0; i < 150; i += 1){
      const x = random(90, state.width - 90);
      const y = random(90, state.height - 90);
      if(!farFromSpawn(x, y, 260)) continue;
      state.decor.push({
        type: Math.random() > .28 ? 'tree' : 'bush',
        x,
        y,
        scale: random(.75, 1.25),
        variant: Math.floor(random(0, 4))
      });
    }

    for(let i = 0; i < 70; i += 1){
      const x = random(100, state.width - 100);
      const y = random(100, state.height - 100);
      if(farFromSpawn(x, y, 180)){
        state.decor.push({ type: 'grass', x, y, scale: random(.8, 1.4), variant: Math.floor(random(0, 4)) });
      }
    }
    state.decor.sort((a, b) => a.y - b.y);
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
      radius: type === 'elite' ? 24 : type === 'fighter' ? 20 : type === 'ranged' ? 19 : 18,
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
    if(state && (!state.paused || state.needsRender) && time - state.lastRender > 50){
      draw();
      state.lastRender = time;
      state.needsRender = false;
    }
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
    state.hudTime -= dt;
    if(state.hudTime <= 0){
      state.hudTime = .25;
      updateHud();
    }
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
    separateUnits(dt);
  }

  function separateUnits(dt){
    const strength = Math.min(1, dt * 18);
    for(let i = 0; i < state.units.length; i += 1){
      const a = state.units[i];
      for(let j = i + 1; j < state.units.length; j += 1){
        const b = state.units[j];
        const minDistance = (a.radius + b.radius) * .78;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || .001;
        if(d >= minDistance) continue;
        const push = (minDistance - d) * .5 * strength;
        const nx = dx / d;
        const ny = dy / d;
        a.x = clamp(a.x - nx * push, 18, state.width - 18);
        a.y = clamp(a.y - ny * push, 18, state.height - 18);
        b.x = clamp(b.x + nx * push, 18, state.width - 18);
        b.y = clamp(b.y + ny * push, 18, state.height - 18);
      }

      for(const building of state.buildings){
        if(a.owner !== building.owner && !allied(a.owner, building.owner)) continue;
        const minDistance = a.radius + building.radius * .62;
        const dx = a.x - building.x;
        const dy = a.y - building.y;
        const d = Math.hypot(dx, dy) || .001;
        if(d >= minDistance) continue;
        const push = (minDistance - d) * strength;
        a.x = clamp(a.x + dx / d * push, 18, state.width - 18);
        a.y = clamp(a.y + dy / d * push, 18, state.height - 18);
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
    ctx.imageSmoothingEnabled = false;
    mini.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);
    drawTerrain();
    drawResources();
    drawRallyLines();
    drawWorldObjects();
    drawEffects();
    drawDragBox();
    ctx.restore();
    drawAtmosphere();
    drawMinimap();
  }

  function drawTerrain(){
    ctx.fillStyle = '#85bd55';
    ctx.fillRect(state.camera.x, state.camera.y, dom.canvas.width, dom.canvas.height);

    const startX = Math.max(0, Math.floor(state.camera.x / 24) * 24);
    const startY = Math.max(0, Math.floor(state.camera.y / 24) * 24);
    const endX = Math.min(state.width, state.camera.x + dom.canvas.width + 48);
    const endY = Math.min(state.height, state.camera.y + dom.canvas.height + 48);

    for(let y = startY; y < endY; y += 24){
      for(let x = startX; x < endX; x += 24){
        const seed = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        ctx.fillStyle = seed > .68 ? '#93c75f' : seed > .35 ? '#79ae51' : '#89bd57';
        drawPixelGrass(x, y, seed);
      }
    }

    drawWaterEdges();
    state.decor.filter(item => item.type === 'road' && inRoadView(item)).forEach(drawDecor);
    state.decor.filter(item => item.type !== 'road' && inView(item, 180)).forEach(drawDecor);
  }

  function drawPixelGrass(x, y, seed){
    ctx.fillRect(x, y, 24, 24);
    ctx.fillStyle = seed > .5 ? '#a8c95c' : '#6ea84b';
    ctx.fillRect(x + 4, y + 6, 5, 3);
    ctx.fillRect(x + 15, y + 15, 6, 3);
    if(seed > .78){
      ctx.fillStyle = '#c5d46d';
      ctx.fillRect(x + 10, y + 4, 4, 4);
      ctx.fillRect(x + 2, y + 18, 4, 3);
    }
  }

  function drawWaterEdges(){
    ctx.fillStyle = '#3da9a2';
    const top = state.camera.y - 80;
    const height = dom.canvas.height + 160;
    if(state.camera.x < 90) ctx.fillRect(0, top, 64, height);
    if(state.camera.x + dom.canvas.width > state.width - 90) ctx.fillRect(state.width - 64, top, 64, height);
    ctx.fillStyle = '#6bd2ca';
    const firstY = Math.max(18, Math.floor((state.camera.y - 84) / 84) * 84 + 18);
    const lastY = Math.min(state.height, state.camera.y + dom.canvas.height + 120);
    for(let y = firstY; y < lastY; y += 84){
      ctx.fillRect(28, y, 6, 42);
      ctx.fillRect(state.width - 34, y + 32, 6, 42);
    }
    ctx.fillStyle = '#4c6f63';
    if(state.camera.x < 110) ctx.fillRect(58, top, 18, height);
    if(state.camera.x + dom.canvas.width > state.width - 110) ctx.fillRect(state.width - 76, top, 18, height);
  }

  function drawResources(){
    state.resources.filter(resource => inView(resource, 90)).forEach(resource => {
      drawResourceNode(resource);
    });
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

  function drawWorldObjects(){
    const objects = [
      ...state.buildings.filter(item => inView(item, 150)),
      ...state.units.filter(item => inView(item, 80))
    ].sort((a, b) => a.y - b.y);

    objects.forEach(item => {
      if(item.entity === 'building') drawBuildingSprite(item);
      else drawUnitSprite(item);
    });
  }

  function inView(item, pad){
    return item.x > state.camera.x - pad &&
      item.x < state.camera.x + dom.canvas.width + pad &&
      item.y > state.camera.y - pad &&
      item.y < state.camera.y + dom.canvas.height + pad;
  }

  function drawDecor(item){
    if(item.type === 'tree') drawTree(item.x, item.y, item.scale, item.variant);
    if(item.type === 'bush') drawBush(item.x, item.y, item.scale);
    if(item.type === 'grass') drawTallGrass(item.x, item.y, item.scale);
    if(item.type === 'cliff') drawCliff(item.x, item.y, item.scale);
    if(item.type === 'water') drawWaterRock(item.x, item.y, item.scale);
    if(item.type === 'basePath') drawBasePath(item.x, item.y, item.scale, item.variant);
    if(item.type === 'field') drawField(item.x, item.y, item.scale, item.variant);
    if(item.type === 'road') drawRoad(item);
  }

  function inRoadView(item){
    const minX = Math.min(item.x, item.toX) - 120;
    const maxX = Math.max(item.x, item.toX) + 120;
    const minY = Math.min(item.y, item.toY) - 120;
    const maxY = Math.max(item.y, item.toY) + 120;
    return maxX > state.camera.x &&
      minX < state.camera.x + dom.canvas.width &&
      maxY > state.camera.y &&
      minY < state.camera.y + dom.canvas.height;
  }

  function drawRoad(item){
    ctx.save();
    ctx.strokeStyle = 'rgba(168,122,61,.72)';
    ctx.lineWidth = 44;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(item.x, item.y + 64);
    const bend = item.variant % 2 ? -120 : 120;
    ctx.quadraticCurveTo((item.x + item.toX) / 2 + bend, (item.y + item.toY) / 2, item.toX, item.toY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(218,178,97,.42)';
    ctx.lineWidth = 20;
    ctx.stroke();
    ctx.restore();
  }

  function drawBasePath(x, y, scale, variant){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate((variant % 2 ? -.08 : .08));
    ctx.fillStyle = 'rgba(181,139,74,.78)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 190, 58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(221,185,105,.58)';
    for(let i = -7; i <= 7; i += 1){
      ctx.fillRect(i * 24 - 5, -7 + (i % 2) * 11, 16, 8);
    }
    ctx.restore();
  }

  function drawField(x, y, scale, variant){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(variant % 2 ? .18 : -.18);
    ctx.fillStyle = '#b58b46';
    ctx.strokeStyle = '#6d4c28';
    ctx.lineWidth = 3;
    ctx.fillRect(-70, -38, 140, 76);
    ctx.strokeRect(-70, -38, 140, 76);
    for(let i = -3; i <= 3; i += 1){
      ctx.strokeStyle = i % 2 ? '#d6bd67' : '#8c6835';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-62, i * 11);
      ctx.lineTo(62, i * 11 - 12);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTree(x, y, scale, variant){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#f1df9a';
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    ctx.fillRect(-7, 18, 14, 34);
    ctx.strokeRect(-7, 18, 14, 34);
    const crown = variant % 3 === 0 ? '#e9c85d' : variant % 3 === 1 ? '#6da34d' : '#456f45';
    ctx.fillStyle = '#2d4e3e';
    ctx.beginPath();
    ctx.ellipse(0, 12, 42, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = crown;
    ctx.beginPath();
    ctx.ellipse(-8, 2, 33, 29, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b7c85a';
    ctx.fillRect(-24, -7, 14, 8);
    ctx.fillRect(8, 10, 16, 8);
    ctx.restore();
  }

  function drawBush(x, y, scale){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#294d39';
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 16, 36, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4d8a4f';
    ctx.fillRect(-24, 5, 16, 10);
    ctx.fillRect(4, 0, 18, 10);
    ctx.restore();
  }

  function drawTallGrass(x, y, scale){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#2d7444';
    for(let i = -2; i <= 2; i += 1){
      ctx.fillRect(i * 8, 0 - Math.abs(i) * 2, 5, 28 + Math.abs(i) * 3);
    }
    ctx.fillStyle = '#7fb45a';
    ctx.fillRect(-14, 10, 9, 10);
    ctx.fillRect(10, 14, 10, 10);
    ctx.restore();
  }

  function drawCliff(x, y, scale){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#6c8b79';
    ctx.strokeStyle = '#273c3f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-48, -18);
    ctx.lineTo(48, -18);
    ctx.lineTo(38, 34);
    ctx.lineTo(-38, 34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b2d3c6';
    ctx.fillRect(-28, -7, 18, 7);
    ctx.fillRect(8, 4, 22, 7);
    ctx.restore();
  }

  function drawWaterRock(x, y, scale){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#6f918b';
    ctx.strokeStyle = '#274448';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 18, -.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#a6d2c8';
    ctx.fillRect(-8, -9, 16, 5);
    ctx.restore();
  }

  function drawResourceNode(resource){
    ctx.save();
    ctx.translate(resource.x, resource.y);
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    if(resource.kind === 'food'){
      ctx.fillStyle = '#315d35';
      ctx.beginPath();
      ctx.ellipse(0, 8, 35, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4e9a50';
      ctx.fillRect(-22, -2, 16, 10);
      ctx.fillRect(3, -8, 18, 12);
    }else if(resource.kind === 'steel'){
      ctx.fillStyle = '#9e9f9c';
      ctx.beginPath();
      ctx.moveTo(-32, 18);
      ctx.lineTo(-18, -20);
      ctx.lineTo(12, -30);
      ctx.lineTo(34, 0);
      ctx.lineTo(18, 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#dde4e5';
      ctx.fillRect(-12, -16, 19, 8);
    }else{
      ctx.fillStyle = '#8d60ff';
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(28, -4);
      ctx.lineTo(12, 30);
      ctx.lineTo(-20, 24);
      ctx.lineTo(-30, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#d5c4ff';
      ctx.fillRect(-5, -18, 10, 22);
    }
    ctx.fillStyle = '#fff3bf';
    ctx.font = 'bold 18px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#35220e';
    ctx.strokeText(String(Math.floor(resource.amount)), 0, resource.radius + 30);
    ctx.fillText(String(Math.floor(resource.amount)), 0, resource.radius + 30);
    ctx.restore();
  }

  function drawBuildingSprite(building){
    const player = playerById(building.owner);
    const faction = player?.faction || 'slayer';
    const color = player?.color || '#5dd8ff';
    if(isSelected(building)) drawSelectionRing(building, building.radius + 10);

    ctx.save();
    ctx.translate(building.x, building.y);
    if(building.type === 'hall') drawHall(faction, color);
    else if(building.type === 'house') drawHouse(faction, color);
    else if(building.type === 'barracks') drawBarracks(faction, color);
    else if(building.type === 'tower') drawTower(faction, color);
    else drawShrine(faction, color);
    ctx.restore();
    drawHealth(building);
  }

  function drawHall(faction, color){
    const wall = faction === 'slayer' ? '#d9c792' : '#544158';
    const roof = faction === 'slayer' ? '#6ea0a5' : '#8e3f76';
    drawIsoShadow(0, 42, 100, 34);
    drawIsoBlock(0, 6, 132, 78, 54, wall, shadeColor(wall, -.18));
    drawTieredRoof(0, -47, 154, 58, roof);
    drawTieredRoof(0, -76, 92, 42, faction === 'slayer' ? '#c99654' : '#5d2d5a');
    drawLantern(-54, -8, color);
    drawLantern(54, -8, color);
    ctx.fillStyle = shadeColor(color, -.16);
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    drawArchDoor(0, 35, 34, 42);
  }

  function drawHouse(faction, color){
    const wall = faction === 'slayer' ? '#dfd19c' : '#59475e';
    const roof = faction === 'slayer' ? '#b97445' : '#78395f';
    drawIsoShadow(0, 31, 62, 22);
    drawIsoBlock(0, 5, 70, 46, 34, wall, shadeColor(wall, -.16));
    drawTieredRoof(0, -34, 84, 34, roof);
    ctx.fillStyle = color;
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 3;
    roundRect(-9, 9, 18, 24, 4, true, true);
  }

  function drawBarracks(faction, color){
    const wall = faction === 'slayer' ? '#cdbf8e' : '#49384f';
    const roof = faction === 'slayer' ? '#517f83' : '#743864';
    drawIsoShadow(0, 37, 90, 28);
    drawIsoBlock(0, 9, 110, 62, 44, wall, shadeColor(wall, -.18));
    drawTieredRoof(0, -42, 130, 46, roof);
    ctx.fillStyle = '#332015';
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    drawArchDoor(0, 31, 28, 32);
    ctx.fillStyle = color;
    ctx.fillRect(-46, -5, 92, 10);
    ctx.strokeRect(-46, -5, 92, 10);
  }

  function drawTower(faction, color){
    const wall = faction === 'slayer' ? '#d9cfac' : '#50435a';
    const roof = faction === 'slayer' ? '#b97845' : '#7a3a67';
    drawIsoShadow(0, 39, 50, 18);
    drawIsoBlock(0, -2, 48, 42, 86, wall, shadeColor(wall, -.2));
    drawTieredRoof(0, -74, 72, 34, roof);
    drawLantern(0, -24, color);
  }

  function drawShrine(faction, color){
    const wall = faction === 'slayer' ? '#e1d3a0' : '#4b344f';
    const roof = faction === 'slayer' ? '#8a9f7c' : '#783d74';
    drawIsoShadow(0, 31, 68, 22);
    drawIsoBlock(0, 6, 78, 50, 42, wall, shadeColor(wall, -.16));
    drawTieredRoof(0, -35, 90, 34, roof);
    ctx.fillStyle = color;
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -4, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff1bd';
    ctx.fillRect(-5, -13, 10, 18);
  }

  function drawUnitSprite(unit){
    const player = playerById(unit.owner);
    const color = player?.color || '#5dd8ff';
    const faction = player?.faction || 'slayer';
    if(isSelected(unit)) drawSelectionRing(unit, unit.radius + 8);

    ctx.save();
    ctx.translate(unit.x, unit.y);
    const bob = Math.sin(state.time * 8 + unit.x * .05 + unit.y * .03) * (unit.order.type === 'idle' ? .6 : 2.2);
    ctx.translate(0, bob);
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    drawUnitShadow();
    drawUnitLegs(unit, color);
    drawUnitRobe(unit, color, faction);
    drawUnitArms(unit, faction);
    drawUnitHead(unit, faction, color);
    drawUnitEquipment(unit, faction);

    if(unit.carried){
      ctx.fillStyle = RESOURCE_COLORS[unit.carried.kind];
      ctx.strokeStyle = MANGA_INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(20, -28, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    drawHealth(unit);
  }

  function drawUnitShadow(){
    ctx.fillStyle = 'rgba(28,42,34,.28)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 25, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawUnitLegs(unit, color){
    ctx.fillStyle = shadeColor(color, -.34);
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    roundRect(-13, 13, 10, 18, 4, true, true);
    roundRect(4, 13, 10, 18, 4, true, true);
    ctx.fillStyle = '#192b35';
    roundRect(-17, 26, 15, 7, 3, true, true);
    roundRect(3, 26, 15, 7, 3, true, true);
  }

  function drawUnitRobe(unit, color, faction){
    const dark = shadeColor(color, -.18);
    const light = shadeColor(color, .24);
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.quadraticCurveTo(-24, 6, -20, 22);
    ctx.quadraticCurveTo(-7, 31, 0, 27);
    ctx.quadraticCurveTo(7, 31, 20, 22);
    ctx.quadraticCurveTo(24, 6, 18, -8);
    ctx.quadraticCurveTo(8, -18, 0, -16);
    ctx.quadraticCurveTo(-8, -18, -18, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = faction === 'slayer' ? light : shadeColor('#6f315f', .12);
    ctx.beginPath();
    ctx.moveTo(-9, -12);
    ctx.lineTo(0, 22);
    ctx.lineTo(10, -12);
    ctx.quadraticCurveTo(0, -18, -9, -12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(24,44,55,.42)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(0, 24);
    ctx.stroke();

    if(unit.type === 'elite'){
      ctx.fillStyle = '#ffe68a';
      ctx.strokeStyle = MANGA_INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 4, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawUnitArms(unit, faction){
    const skin = faction === 'slayer' ? '#f5c890' : '#caa6df';
    ctx.fillStyle = skin;
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(-21, 4, 8, 14, -.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(21, 4, 8, 14, .35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawUnitHead(unit, faction, color){
    const skin = faction === 'slayer' ? '#f4c996' : '#d5b1eb';
    const hair = faction === 'slayer' ? '#4b3325' : '#25182d';
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, -25, 17, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(-4, -36, 19, 12, -.2, Math.PI, Math.PI * 2);
    ctx.quadraticCurveTo(-14, -24, -6, -24);
    ctx.quadraticCurveTo(0, -31, 7, -24);
    ctx.quadraticCurveTo(18, -25, 16, -37);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#101820';
    ctx.fillRect(-7, -25, 4, 4);
    ctx.fillRect(5, -25, 4, 4);
    ctx.fillStyle = '#9c4a5d';
    ctx.fillRect(-3, -17, 6, 3);

    if(faction === 'demon'){
      ctx.fillStyle = '#efe1ff';
      ctx.strokeStyle = MANGA_INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-13, -38);
      ctx.lineTo(-24, -49);
      ctx.lineTo(-17, -33);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(13, -38);
      ctx.lineTo(24, -49);
      ctx.lineTo(17, -33);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(-13, -11, 26, 5);
    }else if(unit.type !== 'worker'){
      ctx.fillStyle = color;
      ctx.strokeStyle = MANGA_INK;
      ctx.lineWidth = 3;
      roundRect(-18, -36, 36, 8, 4, true, true);
    }
  }

  function drawUnitEquipment(unit, faction){
    ctx.save();
    ctx.strokeStyle = MANGA_INK;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if(unit.type === 'worker'){
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#6d4a28';
      ctx.beginPath();
      ctx.moveTo(-28, -28);
      ctx.lineTo(24, -48);
      ctx.stroke();
      ctx.fillStyle = '#b68b4b';
      ctx.strokeStyle = MANGA_INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(18, -52);
      ctx.lineTo(36, -44);
      ctx.lineTo(25, -34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }else if(unit.type === 'fighter'){
      ctx.strokeStyle = '#f7f3db';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(19, -2);
      ctx.lineTo(39, -42);
      ctx.stroke();
      ctx.strokeStyle = MANGA_INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(19, -2);
      ctx.lineTo(39, -42);
      ctx.stroke();
    }else if(unit.type === 'ranged'){
      ctx.strokeStyle = faction === 'slayer' ? '#5a351f' : '#3a2242';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(27, -8, 18, -1.35, 1.35);
      ctx.stroke();
      ctx.strokeStyle = '#f2ddb0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(31, -25);
      ctx.lineTo(31, 8);
      ctx.stroke();
    }else{
      ctx.strokeStyle = '#fff2a8';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-32, -5);
      ctx.lineTo(35, -48);
      ctx.stroke();
      ctx.strokeStyle = MANGA_INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-32, -5);
      ctx.lineTo(35, -48);
      ctx.stroke();
      ctx.fillStyle = '#fff2a8';
      ctx.strokeStyle = MANGA_INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-21, 4, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function shadeColor(hex, percent){
    const color = hex.replace('#', '');
    const num = parseInt(color.length === 3 ? color.split('').map(ch => ch + ch).join('') : color, 16);
    const amt = Math.round(255 * percent);
    const r = clamp((num >> 16) + amt, 0, 255);
    const g = clamp(((num >> 8) & 255) + amt, 0, 255);
    const b = clamp((num & 255) + amt, 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  function drawIsoShadow(x, y, w, h){
    ctx.fillStyle = 'rgba(38,48,35,.28)';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawIsoBlock(x, y, w, d, h, front, side){
    const hw = w / 2;
    const hd = d / 2;
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(x + hw, y - hd);
    ctx.lineTo(x + hw, y + h - hd);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = shadeColor(side, -.08);
    ctx.beginPath();
    ctx.moveTo(x - hw, y - hd);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x - hw, y + h - hd);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = front;
    ctx.beginPath();
    ctx.moveTo(x - hw, y - hd);
    ctx.lineTo(x, y - d);
    ctx.lineTo(x + hw, y - hd);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawTieredRoof(x, y, w, d, color){
    const hw = w / 2;
    const hd = d / 2;
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 4;
    ctx.fillStyle = shadeColor(color, .12);
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x, y - hd);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hd);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x, y + hd);
    ctx.lineTo(x, y + hd + 18);
    ctx.lineTo(x - hw, y + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = shadeColor(color, -.18);
    ctx.beginPath();
    ctx.moveTo(x + hw, y);
    ctx.lineTo(x, y + hd);
    ctx.lineTo(x, y + hd + 18);
    ctx.lineTo(x + hw, y + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f4d06b';
    ctx.fillRect(x - 6, y - hd - 8, 12, 10);
  }

  function drawLantern(x, y, color){
    ctx.fillStyle = '#2b1c15';
    ctx.strokeStyle = MANGA_INK;
    ctx.lineWidth = 3;
    ctx.fillRect(x - 5, y - 14, 10, 22);
    ctx.strokeRect(x - 5, y - 14, 10, 22);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y - 17, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawArchDoor(x, y, w, h){
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h / 2);
    ctx.lineTo(x - w / 2, y - h / 6);
    ctx.quadraticCurveTo(x, y - h / 2, x + w / 2, y - h / 6);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawSelectionRing(entity, radius){
    ctx.save();
    ctx.strokeStyle = '#fff6b0';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.ellipse(entity.x, entity.y + 8, radius, radius * .45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r, fill, stroke){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    if(fill) ctx.fill();
    if(stroke) ctx.stroke();
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

    const columns = Math.ceil(Math.sqrt(selectedUnits.length));
    const spacing = 42;
    selectedUnits.forEach((unit, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const centeredX = (col - (columns - 1) / 2) * spacing;
      const centeredY = (row - (Math.ceil(selectedUnits.length / columns) - 1) / 2) * spacing;
      unit.order = { type: 'move', x: point.wx + centeredX, y: point.wy + centeredY };
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
      state.needsRender = true;
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
  if(new URLSearchParams(window.location.search).has('autostart')){
    startGame({ preventDefault(){} });
  }
  requestAnimationFrame(loop);
})();

export const BUILDING_DEFS = {
  watchers: {
    hq: {
      name: 'Command Temple',
      asset: '/moonfall-rts/assets/generated/buildings/watchers/hq.png',
      hp: 1400,
      size: { w: 210, h: 180 },
      footprint: 82,
      cost: { crystal: 0, wood: 0, food: 0 },
      trains: ['worker'],
      popBonus: 8
    },
    barracks: {
      name: 'Barracks',
      asset: '/moonfall-rts/assets/generated/buildings/watchers/barracks.png',
      hp: 850,
      size: { w: 170, h: 142 },
      footprint: 68,
      cost: { crystal: 160, wood: 140, food: 0 },
      trains: ['soldier', 'archer', 'guardian']
    },
    house: {
      name: 'House',
      asset: '/moonfall-rts/assets/buildings/watchers/watcher_house.png',
      hp: 420,
      size: { w: 96, h: 78 },
      footprint: 42,
      cost: { crystal: 45, wood: 80, food: 0 },
      popBonus: 6
    },
    farm: {
      name: 'Farm',
      asset: '/moonfall-rts/assets/buildings/watchers/watcher_farm.png',
      hp: 360,
      size: { w: 108, h: 82 },
      footprint: 46,
      cost: { crystal: 30, wood: 70, food: 0 },
      foodRate: 1.7
    },
    tower: {
      name: 'Tower',
      asset: '/moonfall-rts/assets/buildings/watchers/watcher_tower.png',
      hp: 620,
      size: { w: 82, h: 118 },
      footprint: 44,
      cost: { crystal: 120, wood: 90, food: 0 },
      damage: 18,
      range: 230,
      cooldown: 0.9
    }
  },
  shadows: {
    hq: {
      name: 'Nexus Core',
      asset: '/moonfall-rts/assets/generated/buildings/shadows/hq.png',
      hp: 1400,
      size: { w: 210, h: 180 },
      footprint: 82,
      cost: { crystal: 0, wood: 0, food: 0 },
      trains: ['worker'],
      popBonus: 8
    },
    spawnPit: {
      name: 'Spawn Pit',
      asset: '/moonfall-rts/assets/generated/buildings/shadows/spawn_pit.png',
      hp: 850,
      size: { w: 170, h: 142 },
      footprint: 68,
      cost: { crystal: 160, wood: 140, food: 0 },
      trains: ['hunter', 'brute', 'oracle']
    },
    house: {
      name: 'Brood Nest',
      asset: '/moonfall-rts/assets/buildings/shadows/shadow_house.png',
      hp: 420,
      size: { w: 96, h: 78 },
      footprint: 42,
      cost: { crystal: 45, wood: 80, food: 0 },
      popBonus: 6
    },
    farm: {
      name: 'Flesh Farm',
      asset: '/moonfall-rts/assets/buildings/shadows/shadow_farm.png',
      hp: 360,
      size: { w: 108, h: 82 },
      footprint: 46,
      cost: { crystal: 30, wood: 70, food: 0 },
      foodRate: 1.7
    },
    tower: {
      name: 'Spire',
      asset: '/moonfall-rts/assets/buildings/shadows/shadow_spire.png',
      hp: 620,
      size: { w: 82, h: 118 },
      footprint: 44,
      cost: { crystal: 120, wood: 90, food: 0 },
      damage: 18,
      range: 230,
      cooldown: 0.9
    }
  }
};

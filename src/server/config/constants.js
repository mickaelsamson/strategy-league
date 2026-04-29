const CHESS_TIME_CONTROLS = [120, 300, 600, 1800];
const CHESS_GAME_MODES = ['classic', 'moonveil'];
const DISCONNECT_FORFEIT_MS = 60 * 1000;

const LEVEL_THRESHOLDS = [
  0, 100, 220, 360, 500, 680, 880, 1100, 1300, 1500,
  1750, 2000, 2300, 2600, 3000, 3300, 3600, 3900, 4200, 4500,
  5000, 5500, 6000, 6500, 7000, 7600, 8200, 8800, 9400, 10000,
  10800, 11600, 12400, 13200, 14000, 15000, 16000, 17000, 18500, 20000
];

const XP_RULES = {
  moonfall_p4: { gameName: 'Moonveil Nexus', win: 20, loss: 10, draw: 10, abandonPenalty: -10 },
  othello: { gameName: 'Othello / Reversi', win: 20, loss: 10, draw: 10, abandonPenalty: -10 },
  hexblitz: { gameName: 'Hexblitz', win: 20, loss: 10, draw: 10, abandonPenalty: -10 },
  chess: { gameName: 'Chess', win: 40, loss: 20, draw: 20, abandonPenalty: -10 },
  azul: { gameName: 'Azul', win: 40, loss: 20, draw: 20, abandonPenalty: -10 },
  moonfall_settlers: { gameName: 'Settlers / Catan', win: 75, loss: 40, draw: 40, abandonPenalty: -10 },
  moonfall_rts: { gameName: 'RTS Moonfall', win: 100, loss: 40, draw: 40, abandonPenalty: -10 },
  moonfall_world_conquest: { gameName: 'World Conquest', win: 75, loss: 40, draw: 40, abandonPenalty: -10 }
};

const GAME_CATALOG = {
  chess: {
    key: 'chess',
    name: 'Chess',
    shortName: 'Chess',
    url: '/chess/index.html',
    gameUrl: '/chess/chess-game.html',
    eloField: 'chessElo',
    legacyEloField: 'elo',
    leaderboardLabel: 'ELO Chess',
    gameOfWeekEligible: true
  },
  othello: {
    key: 'othello',
    name: 'Othello',
    shortName: 'Othello',
    url: '/othello/index.html',
    gameUrl: '/othello/game.html',
    eloField: 'othelloElo',
    pointsField: 'othelloPoints',
    leaderboardLabel: 'ELO Othello',
    gameOfWeekEligible: true
  },
  azul: {
    key: 'azul',
    name: 'Azul Arena',
    shortName: 'Azul',
    url: '/azul/index.html',
    gameUrl: '/azul/game.html',
    eloField: 'azulElo',
    pointsField: 'azulPoints',
    leaderboardLabel: 'ELO Azul',
    gameOfWeekEligible: true
  },
  moonfall_p4: {
    key: 'moonfall_p4',
    name: 'Moonveil Nexus',
    shortName: 'Moonveil Nexus',
    url: '/moonfall-p4/index.html',
    gameUrl: '/moonfall-p4/index.html',
    eloField: 'moonfallP4Elo',
    leaderboardLabel: 'ELO Moonveil Nexus',
    gameOfWeekEligible: true
  },
  hexblitz: {
    key: 'hexblitz',
    name: 'Hexblitz Moonfall',
    shortName: 'Hexblitz',
    url: '/hexblitz_moonfall/index.html',
    gameUrl: '/hexblitz_moonfall/index.html',
    eloField: 'hexblitzElo',
    leaderboardLabel: 'ELO Hexblitz',
    gameOfWeekEligible: true
  },
  moonfall_settlers: {
    key: 'moonfall_settlers',
    name: 'Moonfall Settlers',
    shortName: 'Settlers',
    url: '/moonfall-settlers/index.html',
    gameUrl: '/moonfall-settlers/index.html',
    eloField: 'moonfallSettlersElo',
    legacyEloField: 'strategyElo',
    legacyPointsField: 'strategyPoints',
    leaderboardLabel: 'ELO Settlers',
    gameOfWeekEligible: true
  },
  moonfall_world_conquest: {
    key: 'moonfall_world_conquest',
    name: 'Moonfall World Conquest',
    shortName: 'World Conquest',
    url: '/moonfall-world-conquest/index.html',
    gameUrl: '/moonfall-world-conquest/index.html',
    eloField: 'moonfallWorldConquestElo',
    leaderboardLabel: 'ELO World Conquest',
    gameOfWeekEligible: false
  },
  moonfall_rts: {
    key: 'moonfall_rts',
    name: 'Moonfall RTS',
    shortName: 'RTS Moonfall',
    url: '/moonfall-rts/index.html',
    gameUrl: '/moonfall-rts/index.html',
    eloField: 'moonfallRtsElo',
    leaderboardLabel: 'ELO RTS',
    gameOfWeekEligible: false
  }
};

const GAME_ACCESS_DEFAULTS = {
  chess: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  othello: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  azul: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  moonfall_p4: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  hexblitz: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  moonfall_settlers: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  moonfall_world_conquest: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  moonfall_rts: { enabled: false, adminOnly: true, comingSoon: true, noXp: false }
};

const PROTECTED_PAGE_RULES = {
  '/admin': { adminOnly: true },
  '/admin.html': { adminOnly: true },
  '/moonfall-world-conquest': { gameKey: 'moonfall_world_conquest' },
  '/moonfall-world-conquest/': { gameKey: 'moonfall_world_conquest' },
  '/moonfall-world-conquest/index.html': { gameKey: 'moonfall_world_conquest' },
  '/moonfall-rts': { gameKey: 'moonfall_rts' },
  '/moonfall-rts/': { gameKey: 'moonfall_rts' },
  '/moonfall-rts/index.html': { gameKey: 'moonfall_rts' }
};

module.exports = {
  CHESS_TIME_CONTROLS,
  CHESS_GAME_MODES,
  DISCONNECT_FORFEIT_MS,
  LEVEL_THRESHOLDS,
  XP_RULES,
  GAME_CATALOG,
  GAME_ACCESS_DEFAULTS,
  PROTECTED_PAGE_RULES
};

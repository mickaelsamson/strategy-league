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
  moonveil_nexus: { gameName: 'Moonveil Nexus', win: 20, loss: 10, draw: 10, abandonPenalty: -10 },
  moonveil_dominion: { gameName: 'Moonveil Dominion', win: 20, loss: 10, draw: 10, abandonPenalty: -10 },
  moonveil_hexfall: { gameName: 'Moonveil Hexfall', win: 20, loss: 10, draw: 10, abandonPenalty: -10 },
  chess: { gameName: 'Moonveil Chess', win: 40, loss: 20, draw: 20, abandonPenalty: -10 },
  moonveil_glyph: { gameName: 'Moonveil Glyph', win: 40, loss: 20, draw: 20, abandonPenalty: -10 },
  moonveil_realms: { gameName: 'Moonveil Realms', win: 75, loss: 40, draw: 40, abandonPenalty: -10 },
  moonveil_ascend: { gameName: 'Moonveil Ascend', win: 100, loss: 40, draw: 40, abandonPenalty: -10 },
  moonveil_conquest: { gameName: 'Moonveil Conquest', win: 75, loss: 40, draw: 40, abandonPenalty: -10 }
};

const GAME_CATALOG = {
  chess: {
    key: 'chess',
    name: 'Moonveil Chess',
    shortName: 'Moonveil Chess',
    url: '/moonveil-chess/index.html',
    gameUrl: '/moonveil-chess/game.html',
    eloField: 'chessElo',
    legacyEloField: 'elo',
    leaderboardLabel: 'ELO Moonveil Chess',
    gameOfWeekEligible: true
  },
  moonveil_dominion: {
    key: 'moonveil_dominion',
    name: 'Moonveil Dominion',
    shortName: 'Moonveil Dominion',
    url: '/moonveil-dominion/index.html',
    gameUrl: '/moonveil-dominion/game.html',
    eloField: 'moonveil_dominionElo',
    pointsField: 'moonveil_dominionPoints',
    leaderboardLabel: 'ELO Moonveil Dominion',
    gameOfWeekEligible: true
  },
  moonveil_glyph: {
    key: 'moonveil_glyph',
    name: 'Moonveil Glyph',
    shortName: 'Moonveil Glyph',
    url: '/moonveil-glyph/index.html',
    gameUrl: '/moonveil-glyph/game.html',
    eloField: 'moonveil_glyphElo',
    pointsField: 'moonveil_glyphPoints',
    leaderboardLabel: 'ELO Moonveil Glyph',
    gameOfWeekEligible: true
  },
  moonveil_nexus: {
    key: 'moonveil_nexus',
    name: 'Moonveil Nexus',
    shortName: 'Moonveil Nexus',
    url: '/moonveil-nexus/index.html',
    gameUrl: '/moonveil-nexus/index.html',
    eloField: 'moonveilNexusElo',
    leaderboardLabel: 'ELO Moonveil Nexus',
    gameOfWeekEligible: true
  },
  moonveil_hexfall: {
    key: 'moonveil_hexfall',
    name: 'Moonveil Hexfall',
    shortName: 'Moonveil Hexfall',
    url: '/moonveil-hexfall/index.html',
    gameUrl: '/moonveil-hexfall/index.html',
    eloField: 'moonveil_hexfallElo',
    leaderboardLabel: 'ELO Moonveil Hexfall',
    gameOfWeekEligible: true
  },
  moonveil_realms: {
    key: 'moonveil_realms',
    name: 'Moonveil Realms',
    shortName: 'Moonveil Realms',
    url: '/moonveil-realms/index.html',
    gameUrl: '/moonveil-realms/index.html',
    eloField: 'moonveilRealmsElo',
    legacyEloField: 'strategyElo',
    legacyPointsField: 'strategyPoints',
    leaderboardLabel: 'ELO Moonveil Realms',
    gameOfWeekEligible: true
  },
  moonveil_conquest: {
    key: 'moonveil_conquest',
    name: 'Moonveil Conquest',
    shortName: 'Moonveil Conquest',
    url: '/moonveil-conquest/index.html',
    gameUrl: '/moonveil-conquest/index.html',
    eloField: 'moonveilConquestElo',
    leaderboardLabel: 'ELO Moonveil Conquest',
    gameOfWeekEligible: false
  },
  moonveil_ascend: {
    key: 'moonveil_ascend',
    name: 'Moonveil Ascend',
    shortName: 'Moonveil Ascend',
    url: '/moonveil-ascend/index.html',
    gameUrl: '/moonveil-ascend/index.html',
    eloField: 'moonveilAscendElo',
    leaderboardLabel: 'ELO Moonveil Ascend',
    gameOfWeekEligible: false
  }
};

const GAME_ACCESS_DEFAULTS = {
  chess: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  moonveil_dominion: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  moonveil_glyph: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  moonveil_nexus: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  moonveil_hexfall: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  moonveil_realms: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  moonveil_conquest: { enabled: true, adminOnly: false, comingSoon: false, noXp: false },
  moonveil_ascend: { enabled: false, adminOnly: true, comingSoon: true, noXp: false }
};

const PROTECTED_PAGE_RULES = {
  '/admin': { adminOnly: true },
  '/admin.html': { adminOnly: true },
  '/moonveil-conquest': { gameKey: 'moonveil_conquest' },
  '/moonveil-conquest/': { gameKey: 'moonveil_conquest' },
  '/moonveil-conquest/index.html': { gameKey: 'moonveil_conquest' },
  '/moonveil-ascend': { gameKey: 'moonveil_ascend' },
  '/moonveil-ascend/': { gameKey: 'moonveil_ascend' },
  '/moonveil-ascend/index.html': { gameKey: 'moonveil_ascend' }
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

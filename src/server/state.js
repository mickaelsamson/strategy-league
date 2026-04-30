const fs = require('fs');
const path = require('path');
const { GAME_ACCESS_DEFAULTS, GAME_CATALOG } = require('./config/constants');

const SETTINGS_FILE = process.env.ADMIN_SETTINGS_FILE || path.join(process.cwd(), 'data', 'admin-settings.json');
const WEEKLY_MODES = new Set(['double_xp', 'multi_game_bonus']);
const DEFAULT_WEEKLY_CHALLENGE = {
  enabled: true,
  mode: 'double_xp',
  doubleXpGameKey: 'chess',
  selectedGameKeys: ['chess', 'moonveil_dominion', 'moonveil_glyph'],
  extraXp: 150
};
const DEFAULT_TOURNAMENT = {
  enabled: false,
  name: 'CCA Tournament',
  format: 'swiss',
  status: 'draft',
  round: 1,
  gameKeys: Object.keys(GAME_CATALOG),
  participants: [],
  notes: ''
};

let mongoose = null;
let AdminSettings = null;

function getAdminSettingsStore(){
  try{
    if(!mongoose) mongoose = require('mongoose');
    if(!AdminSettings) AdminSettings = require('../../models/AdminSettings');
  }catch(_err){
    return null;
  }

  if(mongoose.connection.readyState !== 1) return null;
  return AdminSettings;
}

function cloneAccessDefaults(){
  return JSON.parse(JSON.stringify(GAME_ACCESS_DEFAULTS));
}

function normalizeGameAccess(access = {}){
  return Object.keys(GAME_ACCESS_DEFAULTS).reduce((acc, gameKey) => {
    const source = access[gameKey] || {};
    acc[gameKey] = {
      ...GAME_ACCESS_DEFAULTS[gameKey],
      enabled: typeof source.enabled === 'boolean' ? source.enabled : GAME_ACCESS_DEFAULTS[gameKey].enabled,
      adminOnly: typeof source.adminOnly === 'boolean' ? source.adminOnly : GAME_ACCESS_DEFAULTS[gameKey].adminOnly,
      comingSoon: typeof source.comingSoon === 'boolean' ? source.comingSoon : GAME_ACCESS_DEFAULTS[gameKey].comingSoon,
      noXp: typeof source.noXp === 'boolean' ? source.noXp : GAME_ACCESS_DEFAULTS[gameKey].noXp
    };
    return acc;
  }, {});
}

function normalizeWeeklyChallenge(weekly = {}){
  const selectedGameKeys = Array.isArray(weekly.selectedGameKeys)
    ? weekly.selectedGameKeys.filter(key => GAME_ACCESS_DEFAULTS[key])
    : DEFAULT_WEEKLY_CHALLENGE.selectedGameKeys;
  const extraXp = Number(weekly.extraXp);
  const safeSelectedGameKeys = selectedGameKeys.length ? [...new Set(selectedGameKeys)] : DEFAULT_WEEKLY_CHALLENGE.selectedGameKeys;
  const doubleXpGameKey = GAME_ACCESS_DEFAULTS[weekly.doubleXpGameKey]
    ? weekly.doubleXpGameKey
    : safeSelectedGameKeys[0] || DEFAULT_WEEKLY_CHALLENGE.doubleXpGameKey;

  return {
    ...DEFAULT_WEEKLY_CHALLENGE,
    enabled: typeof weekly.enabled === 'boolean' ? weekly.enabled : DEFAULT_WEEKLY_CHALLENGE.enabled,
    mode: WEEKLY_MODES.has(weekly.mode) ? weekly.mode : DEFAULT_WEEKLY_CHALLENGE.mode,
    doubleXpGameKey,
    selectedGameKeys: safeSelectedGameKeys,
    extraXp: Math.max(0, Math.round(Number.isFinite(extraXp) ? extraXp : DEFAULT_WEEKLY_CHALLENGE.extraXp))
  };
}

function normalizeTournament(tournament = {}){
  const participants = Array.isArray(tournament.participants)
    ? tournament.participants.map(name => String(name || '').trim()).filter(Boolean)
    : DEFAULT_TOURNAMENT.participants;
  const gameKeys = Array.isArray(tournament.gameKeys)
    ? tournament.gameKeys.filter(key => GAME_CATALOG[key])
    : DEFAULT_TOURNAMENT.gameKeys;

  return {
    ...DEFAULT_TOURNAMENT,
    enabled: typeof tournament.enabled === 'boolean' ? tournament.enabled : DEFAULT_TOURNAMENT.enabled,
    name: String(tournament.name || DEFAULT_TOURNAMENT.name).trim(),
    format: String(tournament.format || DEFAULT_TOURNAMENT.format).trim(),
    status: String(tournament.status || DEFAULT_TOURNAMENT.status).trim(),
    round: Math.max(1, Math.round(Number(tournament.round) || DEFAULT_TOURNAMENT.round)),
    gameKeys: [...new Set(gameKeys)],
    participants: [...new Set(participants)],
    notes: String(tournament.notes || '').trim()
  };
}

function readSavedAdminSettings(){
  try{
    if(!fs.existsSync(SETTINGS_FILE)) return {};
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  }catch(err){
    console.error('[admin-settings] Unable to read saved settings:', err);
    return {};
  }
}

function applySavedAdminSettings(targetState, source = null){
  const saved = source || readSavedAdminSettings();
  if(typeof saved.manualOverride === 'boolean'){
    targetState.manualOverride = saved.manualOverride;
  }
  if(saved.gameAccess && typeof saved.gameAccess === 'object'){
    targetState.gameAccess = normalizeGameAccess(saved.gameAccess);
  }
  if(saved.weeklyChallenge && typeof saved.weeklyChallenge === 'object'){
    targetState.weeklyChallenge = normalizeWeeklyChallenge(saved.weeklyChallenge);
  }
  if(saved.tournament && typeof saved.tournament === 'object'){
    targetState.tournament = normalizeTournament(saved.tournament);
  }
}

function serializeAdminSettings(targetState = state){
  return {
    manualOverride: typeof targetState.manualOverride === 'boolean' ? targetState.manualOverride : null,
    gameAccess: normalizeGameAccess(targetState.gameAccess),
    weeklyChallenge: normalizeWeeklyChallenge(targetState.weeklyChallenge),
    tournament: normalizeTournament(targetState.tournament)
  };
}

function writeAdminSettingsFile(payload){
  const dir = path.dirname(SETTINGS_FILE);
  const tmpFile = `${SETTINGS_FILE}.tmp`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2));
  fs.renameSync(tmpFile, SETTINGS_FILE);
}

async function saveAdminSettings(targetState = state){
  const payload = serializeAdminSettings(targetState);
  writeAdminSettingsFile(payload);

  const Store = getAdminSettingsStore();
  if(Store){
    await Store.findOneAndUpdate(
      { key: 'global' },
      { ...payload, key: 'global', updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return payload;
}

async function loadAdminSettingsFromStore(){
  const Store = getAdminSettingsStore();
  if(!Store) return false;
  const saved = await Store.findOne({ key: 'global' }).lean();
  if(!saved) return false;

  applySavedAdminSettings(state, saved);
  writeAdminSettingsFile(serializeAdminSettings(state));
  return true;
}

const state = {
  manualOverride: null,
  gameAccess: cloneAccessDefaults(),
  weeklyChallenge: normalizeWeeklyChallenge(),
  tournament: normalizeTournament(),
  onlineUsers: {},
  lobbies: {},
  chessGames: {},
  moonveil_dominionLobbies: {},
  moonveil_dominionGames: {},
  moonveil_glyphLobbies: {},
  moonveil_glyphGames: {},
  moonveilRealmsLobbies: {},
  moonveilRealmsGames: {},
  moonveilNexusLobbies: {},
  moonveilNexusGames: {},
  moonveil_hexfallLobbies: {},
  moonveil_hexfallGames: {},
  playerGames: {},
  moonveil_dominionPlayerGames: {},
  moonveil_glyphPlayerGames: {},
  moonveilRealmsPlayerGames: {},
  moonveilNexusPlayerGames: {},
  moonveil_hexfallPlayerGames: {},
  rematchRequests: {},
  pendingDisconnects: {}
};

applySavedAdminSettings(state);

function getGameConfig(gameKey){
  return {
    ...(GAME_ACCESS_DEFAULTS[gameKey] || {}),
    ...(state.gameAccess[gameKey] || {})
  };
}

function getWeeklyChallengeSettings(){
  return normalizeWeeklyChallenge(state.weeklyChallenge);
}

function getTournamentSettings(){
  return normalizeTournament(state.tournament);
}

function isAdminActor(actor){
  return Boolean(actor?.isAdmin || actor?.authUser?.isAdmin || actor?.user?.isAdmin);
}

function isGameAllowed(gameKey = null, actor = null){
  const isAdmin = isAdminActor(actor);

  if(state.manualOverride === false && !isAdmin){
    return false;
  }

  if(!gameKey){
    return true;
  }

  const config = getGameConfig(gameKey);
  if(config.adminOnly && !isAdmin) return false;
  if(config.enabled === false && !isAdmin) return false;
  return true;
}

function getGameAccessStatus(actor = null){
  return Object.keys(GAME_ACCESS_DEFAULTS).reduce((acc, gameKey) => {
    const config = getGameConfig(gameKey);
    acc[gameKey] = {
      ...config,
      allowed: isGameAllowed(gameKey, actor)
    };
    return acc;
  }, {});
}

module.exports = {
  state,
  isGameAllowed,
  getGameAccessStatus,
  getGameConfig,
  getTournamentSettings,
  getWeeklyChallengeSettings,
  normalizeGameAccess,
  normalizeTournament,
  normalizeWeeklyChallenge,
  loadAdminSettingsFromStore,
  saveAdminSettings
};

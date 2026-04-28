const fs = require('fs');
const path = require('path');
const { GAME_ACCESS_DEFAULTS } = require('./config/constants');

const SETTINGS_FILE = process.env.ADMIN_SETTINGS_FILE || path.join(process.cwd(), 'data', 'admin-settings.json');

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
      comingSoon: typeof source.comingSoon === 'boolean' ? source.comingSoon : GAME_ACCESS_DEFAULTS[gameKey].comingSoon
    };
    return acc;
  }, {});
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

function applySavedAdminSettings(targetState){
  const saved = readSavedAdminSettings();
  if(typeof saved.manualOverride === 'boolean'){
    targetState.manualOverride = saved.manualOverride;
  }
  if(saved.gameAccess && typeof saved.gameAccess === 'object'){
    targetState.gameAccess = normalizeGameAccess(saved.gameAccess);
  }
}

function saveAdminSettings(targetState = state){
  const dir = path.dirname(SETTINGS_FILE);
  const tmpFile = `${SETTINGS_FILE}.tmp`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tmpFile, JSON.stringify({
    manualOverride: typeof targetState.manualOverride === 'boolean' ? targetState.manualOverride : null,
    gameAccess: normalizeGameAccess(targetState.gameAccess)
  }, null, 2));
  fs.renameSync(tmpFile, SETTINGS_FILE);
}

const state = {
  manualOverride: null,
  gameAccess: cloneAccessDefaults(),
  onlineUsers: {},
  lobbies: {},
  chessGames: {},
  othelloLobbies: {},
  othelloGames: {},
  azulLobbies: {},
  azulGames: {},
  moonfallSettlersLobbies: {},
  moonfallSettlersGames: {},
  moonfallP4Lobbies: {},
  moonfallP4Games: {},
  hexblitzLobbies: {},
  hexblitzGames: {},
  playerGames: {},
  othelloPlayerGames: {},
  azulPlayerGames: {},
  moonfallSettlersPlayerGames: {},
  moonfallP4PlayerGames: {},
  hexblitzPlayerGames: {},
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
  normalizeGameAccess,
  saveAdminSettings
};

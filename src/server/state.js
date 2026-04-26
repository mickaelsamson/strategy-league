const { GAME_ACCESS_DEFAULTS } = require('./config/constants');

const state = {
  manualOverride: null,
  gameAccess: JSON.parse(JSON.stringify(GAME_ACCESS_DEFAULTS)),
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
  getGameAccessStatus
};

const state = {
  manualOverride: null,
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

function isGameAllowed(){
  if(state.manualOverride !== null) return state.manualOverride;
  return true;
}

module.exports = {
  state,
  isGameAllowed
};

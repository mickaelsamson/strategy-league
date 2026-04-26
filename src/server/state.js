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
  playerGames: {},
  othelloPlayerGames: {},
  azulPlayerGames: {},
  moonfallSettlersPlayerGames: {},
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

const state = {
  manualOverride: null,
  onlineUsers: {},
  lobbies: {},
  chessGames: {},
  othelloLobbies: {},
  othelloGames: {},
  azulLobbies: {},
  azulGames: {},
  playerGames: {},
  othelloPlayerGames: {},
  azulPlayerGames: {},
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

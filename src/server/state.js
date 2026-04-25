const state = {
  manualOverride: null,
  onlineUsers: {},
  lobbies: {},
  chessGames: {},
  othelloLobbies: {},
  othelloGames: {},
  playerGames: {},
  othelloPlayerGames: {},
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

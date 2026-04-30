const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  passwordResetTokenHash: { type: String, default: "" },
  passwordResetExpiresAt: { type: Date, default: null },

  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },

  username: { type: String, required: true, unique: true },
  avatar: { type: String, default: "" },
  friends: { type: [String], default: [] },
  incomingFriendRequests: { type: [String], default: [] },
  outgoingFriendRequests: { type: [String], default: [] },

  xp: { type: Number, default: 0 },
  elo: { type: Number, default: 1000 },
  chessElo: { type: Number, default: 1000 },
  moonveil_dominionElo: { type: Number, default: 1000 },
  moonveil_glyphElo: { type: Number, default: 1000 },
  strategyElo: { type: Number, default: 1000 },
  moonveilNexusElo: { type: Number, default: 1000 },
  moonveil_hexfallElo: { type: Number, default: 1000 },
  moonveilRealmsElo: { type: Number, default: 1000 },
  moonveilConquestElo: { type: Number, default: 1000 },
  moonveilAscendElo: { type: Number, default: 1000 },
  strategyPoints: { type: Number, default: 0 },
  moonveil_dominionPoints: { type: Number, default: 0 },
  moonveil_glyphPoints: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  matchHistory: {
    type: [
      {
        result: { type: String, enum: ["win", "loss", "draw"], required: true },
        opponent: { type: String, default: "Unknown" },
        xpChange: { type: Number, default: 0 },
        gameOfWeekBonus: { type: Number, default: 0 },
        weeklyChallengeBonus: { type: Number, default: 0 },
        reason: { type: String, default: "game_end" },
        gameKey: { type: String, default: "chess" },
        gameName: { type: String, default: "Moonveil Chess" },
        scoreFinal: { type: String, default: "" },
        eloChange: { type: Number, default: 0 },
        playedAt: { type: Date, default: Date.now }
      }
    ],
    default: []
  },
  gameOfWeekBonus: {
    date: { type: String, default: "" },
    gameKey: { type: String, default: "" }
  },
  weeklyChallengeAward: {
    weekId: { type: String, default: "" },
    challengeId: { type: String, default: "" }
  },

  isAdmin: { type: Boolean, default: false } // 👑 AJOUT
});

module.exports = mongoose.model('User', UserSchema);

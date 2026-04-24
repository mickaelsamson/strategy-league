const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },

  username: { type: String, required: true, unique: true },

  xp: { type: Number, default: 0 },
  elo: { type: Number, default: 1000 },
  strategyPoints: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  matchHistory: {
    type: [
      {
        result: { type: String, enum: ["win", "loss", "draw"], required: true },
        opponent: { type: String, default: "Unknown" },
        xpChange: { type: Number, default: 0 },
        reason: { type: String, default: "game_end" },
        playedAt: { type: Date, default: Date.now }
      }
    ],
    default: []
  },

  isAdmin: { type: Boolean, default: false } // 👑 AJOUT
});

module.exports = mongoose.model('User', UserSchema);

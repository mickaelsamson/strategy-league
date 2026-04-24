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

  isAdmin: { type: Boolean, default: false } // 👑 AJOUT
});

module.exports = mongoose.model('User', UserSchema);

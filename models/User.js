const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  firstName: String,
  lastName: String,
  username: { type: String, required: true },

  xp: { type: Number, default: 0 },

  /* 🔥 IMPORTANT POUR CHESS */
  elo: { type: Number, default: 1000 },

  /* option futur */
  strategyPoints: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);

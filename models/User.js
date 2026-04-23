const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  firstName: String,
  lastName: String,
  username: String, // pseudo

  xp: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);

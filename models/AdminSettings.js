const mongoose = require('mongoose');

const AdminSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  manualOverride: { type: Boolean, default: null },
  gameAccess: { type: mongoose.Schema.Types.Mixed, default: {} },
  weeklyChallenge: { type: mongoose.Schema.Types.Mixed, default: {} },
  tournament: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now }
}, { minimize: false });

module.exports = mongoose.model('AdminSettings', AdminSettingsSchema);

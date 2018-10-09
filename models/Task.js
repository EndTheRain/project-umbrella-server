const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['email_reminder', 'strike'] },
  user: { type: String, required: true },
  dispenser: { type: Number, required: true },
  umbrella: { type: String, required: true },
  expiry: { type: Date, required: true },
});

module.exports = mongoose.model('Task', taskSchema);

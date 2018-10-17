const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['email_reminder'] },
  lease: { type: mongoose.Schema.Types.ObjectId, required: true },
  execute_at: { type: Date, required: true },
});

module.exports = mongoose.model('Task', taskSchema);

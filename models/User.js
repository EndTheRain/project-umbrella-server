const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  umbrella_id: { type: String, required: true },
  borrowed_at: { type: Date, required: true },
  borrowed_from: { type: Number, required: true },
  returned_at: { type: Date, required: true },
  returned_to: { type: Number, required: true },
});

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  strikes: {
    type: Number,
    default: 0,
    min: 0,
    max: 3,
  },
  history: [historySchema],
  settings: {
    borrow_emails: { type: Boolean, default: true },
    return_emails: { type: Boolean, default: false },
    reminder_emails: {
      type: Number,
      default: 6,
      min: 1,
      max: 23,
    },
  },
});

module.exports = mongoose.model('User', userSchema);

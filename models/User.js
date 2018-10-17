const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  strikes: {
    type: Number,
    default: 0,
    min: 0,
    max: 3,
  },
  settings: {
    borrow_emails: { type: Boolean, default: true },
    return_emails: { type: Boolean, default: false },
    reminder_emails: {
      type: Number,
      default: 21600000,
      min: 3600000,
      max: 82800000,
    },
  },
});

module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema({
  is_open: { type: Boolean, default: true },
  user: { type: String, required: true },
  umbrella: { type: String, required: true },
  borrow_dispenser: { type: Number, required: true },
  borrow_at: { type: Date, required: true },
  return_dispenser: { type: Number },
  return_at: { type: Date },
  expiry: { type: Date, required: true },
});

module.exports = mongoose.model('Lease', leaseSchema);

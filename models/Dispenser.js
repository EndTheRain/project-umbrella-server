const mongoose = require('mongoose');

const umbrellaSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  storage_location: { type: Number, required: true },
  borrower: { type: String },
  borrowed_at: { type: Date },
});

const dispenserSchema = new mongoose.Schema({
  _id: { type: Number, required: true },
  name: { type: String, required: true },
  status: { type: Boolean },
  umbrellas: [umbrellaSchema],
});

module.exports = mongoose.model('Dispenser', dispenserSchema);

const mongoose = require('mongoose');

const dispenserSchema = new mongoose.Schema({
  _id: { type: Number, required: true },
  status: { type: Boolean, default: true },
  name: { type: String, required: true },
  key: { type: String, required: true },
  location: { type: [Number], required: true },
});

module.exports = mongoose.model('Dispenser', dispenserSchema);

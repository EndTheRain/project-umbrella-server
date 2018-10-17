const mongoose = require('mongoose');

const dispenserSchema = new mongoose.Schema({
  _id: { type: Number, required: true },
  name: { type: String, required: true },
  key: { type: String, required: true },
  location: { type: [Number] },
  status: { type: Boolean },
});

module.exports = mongoose.model('Dispenser', dispenserSchema);

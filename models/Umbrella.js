const mongoose = require('mongoose');

const umbrellaSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  type: { type: String },
  dispenser: { type: Number, required: true },
});

module.exports = mongoose.model('Umbrella', umbrellaSchema);

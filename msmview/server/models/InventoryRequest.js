const mongoose = require('mongoose');

const inventoryRequestSchema = new mongoose.Schema({
  requesterName: { type: String, required: true },
  item:          { type: String, required: true },
  quantity:      { type: Number, required: true },
  category:      { type: String, enum: ['Santos', 'AV/IT', 'Sevaks'], required: true },
  status:        { type: String, enum: ['Pending', 'Complete'], default: 'Pending' },
  requestedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  handledBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('InventoryRequest', inventoryRequestSchema);

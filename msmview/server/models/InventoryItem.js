const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  itemId:    { type: String, required: true, unique: true },
  name:      { type: String, required: true },
  quantity:  { type: Number, required: true, default: 0 },
  category:  { type: String, enum: ['Santos', 'AV/IT', 'Sevaks'], required: true },
  addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);

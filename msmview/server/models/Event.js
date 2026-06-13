const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  location:    { type: String, default: '' },
  startTime:   { type: Date, required: true },
  endTime:     { type: Date, required: true },
  category:    { type: String, default: 'General' },
  postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);

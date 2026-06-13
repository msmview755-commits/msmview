const mongoose = require('mongoose');

const roadIncidentSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  type:        { type: String, enum: ['traffic', 'construction', 'accident', 'closure', 'other'], required: true },
  location: {
    lat:     { type: Number, required: true },
    lng:     { type: Number, required: true },
    address: { type: String, default: '' }
  },
  description: { type: String, default: '' },
  active:      { type: Boolean, default: true },
  postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('RoadIncident', roadIncidentSchema);

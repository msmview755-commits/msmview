const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  name:     { type: String, default: '' },
  dosage:   { type: String, default: '' },
  schedule: { type: String, default: '' }
});

const healthReportSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  measurements: {
    bloodPressure: { type: String, default: '' },
    glucose:       { type: String, default: '' },
    heartRate:     { type: String, default: '' },
    stressLevel:   { type: String, default: '' }
  },
  medications: [medicationSchema],
  notes:        { type: String, default: '' },
  fileUrl:      { type: String, default: '' },
  filePublicId: { type: String, default: '' },
  postedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('HealthReport', healthReportSchema);

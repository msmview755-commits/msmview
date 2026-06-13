const express   = require('express');
const router    = express.Router();
const multer    = require('multer');
const cloudinary = require('cloudinary').v2;
const HealthReport = require('../models/HealthReport');
const { protect, requireRole } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ storage: multer.memoryStorage() });

// GET /api/health  — all users
router.get('/', protect, async (req, res) => {
  try {
    const reports = await HealthReport.find()
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/health  — doctor only
router.post('/', protect, requireRole('doctor', 'super_admin'), upload.single('file'), async (req, res) => {
  try {
    const { patientName, bloodPressure, glucose, heartRate, stressLevel, medications, notes } = req.body;
    let fileUrl = '', filePublicId = '';

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'msmview/health' },
          (err, result) => err ? reject(err) : resolve(result)
        );
        stream.end(req.file.buffer);
      });
      fileUrl = result.secure_url;
      filePublicId = result.public_id;
    }

    const report = await HealthReport.create({
      patientName,
      measurements: { bloodPressure, glucose, heartRate, stressLevel },
      medications: medications ? JSON.parse(medications) : [],
      notes,
      fileUrl,
      filePublicId,
      postedBy: req.user.id
    });

    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/health/:id  — doctor only
router.patch('/:id', protect, requireRole('doctor', 'super_admin'), upload.single('file'), async (req, res) => {
  try {
    const { patientName, bloodPressure, glucose, heartRate, stressLevel, medications, notes } = req.body;
    const report = await HealthReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    let fileUrl = report.fileUrl, filePublicId = report.filePublicId;
    if (req.file) {
      if (filePublicId) await cloudinary.uploader.destroy(filePublicId);
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'msmview/health' },
          (err, result) => err ? reject(err) : resolve(result)
        );
        stream.end(req.file.buffer);
      });
      fileUrl = result.secure_url;
      filePublicId = result.public_id;
    }

    const updated = await HealthReport.findByIdAndUpdate(
      req.params.id,
      { patientName, measurements: { bloodPressure, glucose, heartRate, stressLevel }, medications: medications ? JSON.parse(medications) : report.medications, notes, fileUrl, filePublicId },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

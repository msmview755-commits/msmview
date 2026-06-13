const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['member', 'doctor', 'inventory_manager', 'super_admin'],
    default: 'member'
  },
  group: {
    type: String,
    enum: ['Santos', 'AV/IT', 'Sevaks', ''],
    default: ''
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);

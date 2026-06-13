require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/User');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const users = [
  { name: 'Super Admin',       email: 'admin@msmview.com',     password: 'admin123',   role: 'super_admin',       group: '' },
  { name: 'Dr. Julian Reed',   email: 'doctor@msmview.com',    password: 'doctor123',  role: 'doctor',            group: '' },
  { name: 'Inventory Manager', email: 'inv@msmview.com',       password: 'inv123',     role: 'inventory_manager', group: '' },
  { name: 'Santos Member 1',   email: 'santos1@msmview.com',   password: 'member123',  role: 'member',            group: 'Santos' },
  { name: 'AV/IT Member 1',    email: 'avit1@msmview.com',     password: 'member123',  role: 'member',            group: 'AV/IT' },
  { name: 'Sevaks Member 1',   email: 'sevaks1@msmview.com',   password: 'member123',  role: 'member',            group: 'Sevaks' },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    await User.deleteMany({});
    for (const u of users) {
      await User.create(u);
    }
    console.log('✅ Users seeded successfully:');
    users.forEach(u => console.log(`  ${u.email} / ${u.password} (${u.role})`));
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}
seed();

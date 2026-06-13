const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const dns = require('dns'); 
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();

// Allow both production (Vercel) and local development origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/health',    require('./routes/health'));
app.use('/api/news',      require('./routes/news'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/roads',     require('./routes/roads'));
app.use('/api/events',    require('./routes/events'));

app.get('/', (req, res) => res.json({ status: 'MSM View API running' }));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');

    // Set up Telegram bot webhook (replaces polling)
    const { setupWebhook } = require('./bot/telegram');
    setupWebhook(app);

    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => {
    console.error('MongoDB error:', err.message);
    process.exit(1);
  });


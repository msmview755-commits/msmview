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
  'https://msmview.vercel.app',
  'https://msmview.vercel.app/',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Normalize origin by removing trailing slash if present
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    const isAllowed = allowedOrigins.some(allowed => allowed.replace(/\/$/, '') === normalizedOrigin) ||
                      normalizedOrigin.endsWith('.vercel.app') ||
                      /^http:\/\/localhost(:\d+)?$/.test(normalizedOrigin);

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
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

app.get('/api/diagnostics', async (req, res) => {
  try {
    const { bot } = require('./bot/telegram');
    let webhookInfo = null;
    if (bot) {
      try {
        webhookInfo = await bot.getWebHookInfo();
      } catch (err) {
        webhookInfo = { error: err.message };
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      mongodb: {
        connected: mongoose.connection.readyState === 1,
        state: mongoose.connection.readyState
      },
      env: {
        PORT: process.env.PORT || 'not set',
        NODE_ENV: process.env.NODE_ENV || 'not set',
        MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
        JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
        CLIENT_URL: process.env.CLIENT_URL || 'not set',
        TELEGRAM_TOKEN_EXISTS: !!process.env.TELEGRAM_TOKEN,
        TELEGRAM_TOKEN_PREFIX: process.env.TELEGRAM_TOKEN ? process.env.TELEGRAM_TOKEN.substring(0, 6) : 'none',
        RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL || 'not set'
      },
      telegram: {
        botInitialized: !!bot,
        webhookInfo
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

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


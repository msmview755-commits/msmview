const TelegramBot  = require('node-telegram-bot-api');
const HealthReport = require('../models/HealthReport');
const User         = require('../models/User');

if (!process.env.TELEGRAM_TOKEN) return;

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Store doctor sessions: chatId → { doctorId, step, data }
const sessions = {};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    `Welcome to MSM View Health Bot 🏥\n\nCommands:\n/upload - Upload a new health report\n/latest - View latest report\n/help - Help`
  );
});

bot.onText(/\/upload/, async (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { step: 'await_email', data: {} };
  bot.sendMessage(chatId, 'Please enter your doctor email to verify:');
});

bot.onText(/\/latest/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const report = await HealthReport.findOne().sort({ createdAt: -1 }).populate('postedBy', 'name');
    if (!report) return bot.sendMessage(chatId, 'No reports found.');
    bot.sendMessage(chatId,
      `📋 Latest Report\nPatient: ${report.patientName}\nBP: ${report.measurements.bloodPressure}\nGlucose: ${report.measurements.glucose}\nHeart Rate: ${report.measurements.heartRate}\nStress: ${report.measurements.stressLevel}\nBy: ${report.postedBy?.name}\nDate: ${new Date(report.createdAt).toLocaleDateString()}`
    );
  } catch (err) {
    bot.sendMessage(chatId, 'Error fetching report.');
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text   = msg.text;
  if (!sessions[chatId] || text.startsWith('/')) return;

  const session = sessions[chatId];

  if (session.step === 'await_email') {
    const doctor = await User.findOne({ email: text.toLowerCase(), role: 'doctor' });
    if (!doctor) {
      bot.sendMessage(chatId, '❌ No doctor found with that email. Try again or /upload to restart.');
      return;
    }
    session.data.doctorId = doctor._id;
    session.step = 'await_patient';
    bot.sendMessage(chatId, `✅ Verified as ${doctor.name}\n\nEnter patient name:`);
    return;
  }

  if (session.step === 'await_patient') {
    session.data.patientName = text;
    session.step = 'await_bp';
    bot.sendMessage(chatId, 'Blood Pressure (e.g. 120/80):');
    return;
  }

  if (session.step === 'await_bp') {
    session.data.bloodPressure = text;
    session.step = 'await_glucose';
    bot.sendMessage(chatId, 'Glucose (mg/dL):');
    return;
  }

  if (session.step === 'await_glucose') {
    session.data.glucose = text;
    session.step = 'await_hr';
    bot.sendMessage(chatId, 'Heart Rate (BPM):');
    return;
  }

  if (session.step === 'await_hr') {
    session.data.heartRate = text;
    session.step = 'await_stress';
    bot.sendMessage(chatId, 'Stress Level (1-10):');
    return;
  }

  if (session.step === 'await_stress') {
    session.data.stressLevel = text;
    session.step = 'await_notes';
    bot.sendMessage(chatId, 'Any notes? (type "none" to skip):');
    return;
  }

  if (session.step === 'await_notes') {
    session.data.notes = text === 'none' ? '' : text;
    try {
      await HealthReport.create({
        patientName:  session.data.patientName,
        measurements: {
          bloodPressure: session.data.bloodPressure,
          glucose:       session.data.glucose,
          heartRate:     session.data.heartRate,
          stressLevel:   session.data.stressLevel
        },
        notes:    session.data.notes,
        postedBy: session.data.doctorId
      });
      bot.sendMessage(chatId, `✅ Health report saved for ${session.data.patientName}! It is now live on the dashboard.`);
    } catch (err) {
      bot.sendMessage(chatId, '❌ Error saving report. Try again.');
    }
    delete sessions[chatId];
    return;
  }
});

console.log('Telegram bot running');
module.exports = bot;

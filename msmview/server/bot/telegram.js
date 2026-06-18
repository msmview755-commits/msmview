const TelegramBot  = require('node-telegram-bot-api');
const HealthReport = require('../models/HealthReport');
const User         = require('../models/User');
const InventoryItem = require('../models/InventoryItem');
const InventoryRequest = require('../models/InventoryRequest');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const RENDER_URL     = process.env.RENDER_EXTERNAL_URL || 'https://msmview.onrender.com';
const IS_PRODUCTION  = process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL;

let bot = null;

if (TELEGRAM_TOKEN) {
  // Use polling in local dev, webhook in production
  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: !IS_PRODUCTION });
  if (!IS_PRODUCTION) {
    console.log('Telegram bot running (polling mode for local dev)');
  }
}

// Store conversation sessions: chatId -> { type, step, data }
const sessions = {};

/**
 * Helper to check if a Telegram user is logged in
 */
async function getLoggedInUser(chatId) {
  return await User.findOne({ telegramChatId: chatId });
}

/**
 * Register all bot commands and message handlers.
 * Called once — works for both polling and webhook mode.
 */
function registerCommands() {
  if (!bot) return;

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    delete sessions[chatId];
    
    const user = await getLoggedInUser(chatId);
    let welcomeMsg = 'Welcome to MSM View Bot\n\n';
    
    if (user) {
      welcomeMsg += `Logged in as: *${user.name}* (${user.role === 'inventory_manager' ? 'Inventory Manager' : user.role === 'super_admin' ? 'Super Admin' : user.role === 'doctor' ? 'Doctor' : 'Member'})\n\n`;
    } else {
      welcomeMsg += 'You are not logged in. Link your Telegram account using:\n`/login <your-email>`\n\n';
    }

    welcomeMsg += 'Available Commands:\n' +
      '/help - List all commands\n' +
      '/status - Check your account login status\n' +
      '/inventory - View current inventory stock\n' +
      '/addstock - Add/update inventory items\n' +
      '/request - Submit a new inventory request\n' +
      '/requests - View pending inventory requests\n' +
      '/upload - Upload a new doctor health report\n' +
      '/latest - View latest health report\n' +
      '/logout - Log out from this device';

    bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    delete sessions[chatId];

    const helpMsg = 'MSM View Bot Commands:\n\n' +
      '/start - Welcome message and quick start\n' +
      '/login <email> - Link your Telegram account to your dashboard email\n' +
      '/status - View your current login account details\n' +
      '/inventory - View stock levels (restricted by group/role)\n' +
      '/addstock - Add new items or increment existing stock\n' +
      '/request - Create a new supply request\n' +
      '/requests - View pending requests (managers can approve inline)\n' +
      '/upload - Submit a doctor health report\n' +
      '/latest - View latest doctor health report\n' +
      '/logout - Unlink your Telegram account\n' +
      '/help - Show this help menu';

    bot.sendMessage(chatId, helpMsg);
  });

  bot.onText(/\/login(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    delete sessions[chatId];

    const emailInput = match[1]?.trim();
    if (!emailInput) {
      return bot.sendMessage(chatId, 'Usage: `/login your-email@example.com`', { parse_mode: 'Markdown' });
    }

    try {
      const user = await User.findOne({ email: emailInput.toLowerCase() });
      if (!user) {
        return bot.sendMessage(chatId, 'No user account found with that email. Please check the email address or register on the dashboard.');
      }

      sessions[chatId] = {
        type: 'login',
        step: 'await_password',
        data: { userId: user._id }
      };

      bot.sendMessage(chatId, `Enter your password to verify login for *${user.email}*:`, { parse_mode: 'Markdown' });
    } catch (err) {
      bot.sendMessage(chatId, 'An error occurred during login. Please try again.');
    }
  });

  bot.onText(/\/logout/, async (msg) => {
    const chatId = msg.chat.id;
    delete sessions[chatId];

    try {
      const user = await User.findOne({ telegramChatId: chatId });
      if (!user) {
        return bot.sendMessage(chatId, 'You are not currently logged in.');
      }

      user.telegramChatId = null;
      await user.save();

      bot.sendMessage(chatId, 'Successfully logged out and unlinked your Telegram account.');
    } catch (err) {
      bot.sendMessage(chatId, 'An error occurred during logout. Please try again.');
    }
  });

  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    delete sessions[chatId];

    const user = await getLoggedInUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, 'Status: Not logged in. Use `/login <email>` to link your account.', { parse_mode: 'Markdown' });
    }

    bot.sendMessage(chatId, `Account status:\n*Name:* ${user.name}\n*Email:* ${user.email}\n*Role:* ${user.role}\n*Group:* ${user.group || 'None'}`, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/inventory/, async (msg) => {
    const chatId = msg.chat.id;
    delete sessions[chatId];

    const user = await getLoggedInUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, 'Please link your account first using `/login <email>` before viewing inventory.', { parse_mode: 'Markdown' });
    }

    if (user.role === 'inventory_manager' || user.role === 'super_admin') {
      // Show inline button options for categories
      const opts = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Santos', callback_data: 'view_inv:Santos' },
              { text: 'AV/IT', callback_data: 'view_inv:AV/IT' },
              { text: 'Sevaks', callback_data: 'view_inv:Sevaks' }
            ]
          ]
        }
      };
      bot.sendMessage(chatId, 'Select category inventory to view:', opts);
    } else {
      // Locked to group for members
      const category = user.group || 'Santos';
      try {
        const items = await InventoryItem.find({ category }).sort({ itemId: 1 });
        let resp = `📦 *${category} Inventory*\n\n`;
        if (items.length === 0) {
          resp += 'No items currently in stock.';
        } else {
          items.forEach(item => {
            const outOfStock = item.quantity === 0 ? ' ⚠️ [Out of Stock]' : '';
            resp += `• \`${item.itemId}\`: *${item.name}* (Qty: ${item.quantity})${outOfStock}\n`;
          });
        }
        bot.sendMessage(chatId, resp, { parse_mode: 'Markdown' });
      } catch (err) {
        bot.sendMessage(chatId, 'Error retrieving inventory.');
      }
    }
  });

  bot.onText(/\/addstock/, async (msg) => {
    const chatId = msg.chat.id;
    delete sessions[chatId];

    const user = await getLoggedInUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, 'Please link your account first using `/login <email>` to add stock.', { parse_mode: 'Markdown' });
    }

    if (user.role === 'inventory_manager' || user.role === 'super_admin') {
      const opts = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Santos', callback_data: 'addstock_cat:Santos' },
              { text: 'AV/IT', callback_data: 'addstock_cat:AV/IT' },
              { text: 'Sevaks', callback_data: 'addstock_cat:Sevaks' }
            ]
          ]
        }
      };
      bot.sendMessage(chatId, 'Select category to add stock to:', opts);
    } else {
      const category = user.group || 'Santos';
      sessions[chatId] = { type: 'addstock', step: 'await_name', data: { category } };
      bot.sendMessage(chatId, `Adding stock to *${category}* category.\n\nEnter item name (e.g. HDMI Cable):`, { parse_mode: 'Markdown' });
    }
  });

  bot.onText(/\/request/, async (msg) => {
    const chatId = msg.chat.id;
    delete sessions[chatId];

    const user = await getLoggedInUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, 'Please link your account first using `/login <email>` to request supplies.', { parse_mode: 'Markdown' });
    }

    if (user.role === 'inventory_manager' || user.role === 'super_admin') {
      const opts = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Santos', callback_data: 'request_cat:Santos' },
              { text: 'AV/IT', callback_data: 'request_cat:AV/IT' },
              { text: 'Sevaks', callback_data: 'request_cat:Sevaks' }
            ]
          ]
        }
      };
      bot.sendMessage(chatId, 'Select category requesting the item:', opts);
    } else {
      const category = user.group || 'Santos';
      sessions[chatId] = { type: 'request', step: 'await_requester', data: { category } };
      bot.sendMessage(chatId, `Creating request for *${category}* category.\n\nEnter requester name:`, { parse_mode: 'Markdown' });
    }
  });

  bot.onText(/\/minus/, async (msg) => {
    const chatId = msg.chat.id;
    delete sessions[chatId];

    const user = await getLoggedInUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, 'Please link your account first using `/login <email>` to decrease stock.', { parse_mode: 'Markdown' });
    }

    if (user.role === 'inventory_manager' || user.role === 'super_admin') {
      const opts = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Santos', callback_data: 'minus_cat:Santos' },
              { text: 'AV/IT', callback_data: 'minus_cat:AV/IT' },
              { text: 'Sevaks', callback_data: 'minus_cat:Sevaks' }
            ]
          ]
        }
      };
      bot.sendMessage(chatId, 'Select category to decrease stock from:', opts);
    } else {
      const category = user.group || 'Santos';
      sessions[chatId] = { type: 'minus', step: 'await_name', data: { category } };
      bot.sendMessage(chatId, `Decreasing stock from *${category}* category.\n\nEnter item name (e.g. HDMI Cable):`, { parse_mode: 'Markdown' });
    }
  });

  bot.onText(/\/requests/, async (msg) => {
    const chatId = msg.chat.id;
    delete sessions[chatId];

    const user = await getLoggedInUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, 'Please link your account first using `/login <email>` to view requests.', { parse_mode: 'Markdown' });
    }

    try {
      let filter = { status: 'Pending' };
      if (user.role !== 'inventory_manager' && user.role !== 'super_admin') {
        filter.category = user.group || 'Santos';
      }

      const pendingRequests = await InventoryRequest.find(filter).sort({ createdAt: -1 });

      if (pendingRequests.length === 0) {
        return bot.sendMessage(chatId, `No pending requests found${filter.category ? ` for ${filter.category}` : ''}.`);
      }

      bot.sendMessage(chatId, `📋 *Pending Supplies Requests:*`, { parse_mode: 'Markdown' });

      for (const req of pendingRequests) {
        let msgText = `*Item:* ${req.item}\n*Qty:* ${req.quantity}\n*Category:* ${req.category}\n*Requested By:* ${req.requesterName}`;
        
        if (user.role === 'inventory_manager' || user.role === 'super_admin') {
          const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Complete Request', callback_data: `complete_req:${req._id}` }
                ]
              ]
            }
          };
          await bot.sendMessage(chatId, msgText, opts);
        } else {
          await bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
        }
      }
    } catch (err) {
      bot.sendMessage(chatId, 'Error retrieving requests.');
    }
  });

  bot.onText(/\/upload/, async (msg) => {
    const chatId = msg.chat.id;
    delete sessions[chatId];

    const user = await getLoggedInUser(chatId);
    if (user && user.role === 'doctor') {
      sessions[chatId] = { type: 'health', step: 'await_patient', data: { doctorId: user._id } };
      bot.sendMessage(chatId, `Verified as ${user.name}\n\nEnter patient name:`);
    } else {
      sessions[chatId] = { type: 'health', step: 'await_email', data: {} };
      bot.sendMessage(chatId, 'Please enter your doctor email to verify:');
    }
  });

  bot.onText(/\/latest/, async (msg) => {
    const chatId = msg.chat.id;
    delete sessions[chatId];

    try {
      const report = await HealthReport.findOne().sort({ createdAt: -1 }).populate('postedBy', 'name');
      if (!report) return bot.sendMessage(chatId, 'No health reports found.');
      bot.sendMessage(chatId,
        `Latest Report\nPatient: ${report.patientName}\nBP: ${report.measurements.bloodPressure}\nGlucose: ${report.measurements.glucose}\nHeart Rate: ${report.measurements.heartRate}\nStress: ${report.measurements.stressLevel}\nBy: ${report.postedBy?.name}\nDate: ${new Date(report.createdAt).toLocaleDateString()}`
      );
    } catch (err) {
      bot.sendMessage(chatId, 'Error fetching report.');
    }
  });

  // Handle Callback Queries (Inline Buttons)
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    try {
      // 1. View Inventory Callbacks
      if (data.startsWith('view_inv:')) {
        const category = data.split(':')[1];
        const items = await InventoryItem.find({ category }).sort({ itemId: 1 });
        let resp = `📦 *${category} Inventory*\n\n`;
        if (items.length === 0) {
          resp += 'No items currently in stock.';
        } else {
          items.forEach(item => {
            const outOfStock = item.quantity === 0 ? ' ⚠️ [Out of Stock]' : '';
            resp += `• \`${item.itemId}\`: *${item.name}* (Qty: ${item.quantity})${outOfStock}\n`;
          });
        }
        bot.sendMessage(chatId, resp, { parse_mode: 'Markdown' });
        bot.answerCallbackQuery(query.id);
        return;
      }

      // 2. Add Stock Category Callbacks
      if (data.startsWith('addstock_cat:')) {
        const category = data.split(':')[1];
        sessions[chatId] = { type: 'addstock', step: 'await_name', data: { category } };
        bot.sendMessage(chatId, `Adding stock to *${category}* category.\n\nEnter item name (e.g. HDMI Cable):`, { parse_mode: 'Markdown' });
        bot.answerCallbackQuery(query.id);
        return;
      }

      // 3. Request Category Callbacks
      if (data.startsWith('request_cat:')) {
        const category = data.split(':')[1];
        sessions[chatId] = { type: 'request', step: 'await_requester', data: { category } };
        bot.sendMessage(chatId, `Creating request for *${category}* category.\n\nEnter requester name:`, { parse_mode: 'Markdown' });
        bot.answerCallbackQuery(query.id);
        return;
      }

      // 3b. Minus Category Callbacks
      if (data.startsWith('minus_cat:')) {
        const category = data.split(':')[1];
        sessions[chatId] = { type: 'minus', step: 'await_name', data: { category } };
        bot.sendMessage(chatId, `Decreasing stock from *${category}* category.\n\nEnter item name (e.g. HDMI Cable):`, { parse_mode: 'Markdown' });
        bot.answerCallbackQuery(query.id);
        return;
      }

      // 4. Complete Supply Request Callbacks (Managers only)
      if (data.startsWith('complete_req:')) {
        const reqId = data.split(':')[1];
        const user = await getLoggedInUser(chatId);
        if (!user || (user.role !== 'inventory_manager' && user.role !== 'super_admin')) {
          return bot.answerCallbackQuery(query.id, { text: 'Only inventory managers can complete requests.', show_alert: true });
        }

        const originalRequest = await InventoryRequest.findById(reqId);
        if (!originalRequest) {
          return bot.answerCallbackQuery(query.id, { text: 'Request not found.', show_alert: true });
        }

        if (originalRequest.status === 'Complete') {
          bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
          bot.sendMessage(chatId, `Request for ${originalRequest.item} is already Completed.`);
          return bot.answerCallbackQuery(query.id);
        }

        // Complete request in db
        originalRequest.status = 'Complete';
        originalRequest.handledBy = user._id;
        await originalRequest.save();

        // Increment stock
        const existing = await InventoryItem.findOne({
          name: { $regex: new RegExp(`^${originalRequest.item}$`, 'i') },
          category: originalRequest.category
        });

        let updatedStockQty = originalRequest.quantity;
        if (existing) {
          existing.quantity += Number(originalRequest.quantity) || 0;
          await existing.save();
          updatedStockQty = existing.quantity;
        } else {
          const count = await InventoryItem.countDocuments({ category: originalRequest.category });
          const prefix = originalRequest.category === 'AV/IT' ? 'AVIT' : originalRequest.category.toUpperCase();
          const itemId = `${prefix}-${String(count + 1).padStart(3, '0')}`;
          await InventoryItem.create({
            itemId,
            name: originalRequest.item,
            quantity: Number(originalRequest.quantity) || 0,
            category: originalRequest.category,
            addedBy: user._id
          });
        }

        // Edit original message to remove buttons and show completed status
        const updatedText = `${query.message.text}\n\n✅ *Status: Completed* (by ${user.name})`;
        bot.editMessageText(updatedText, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        });

        bot.sendMessage(chatId, `Supply request approved! Stock for *${originalRequest.item}* (Category: ${originalRequest.category}) is now *${updatedStockQty}*.`, { parse_mode: 'Markdown' });
        bot.answerCallbackQuery(query.id, { text: 'Request completed successfully!' });
        return;
      }
    } catch (err) {
      bot.sendMessage(chatId, 'An error occurred while processing the callback action.');
      bot.answerCallbackQuery(query.id);
    }
  });

  // Generic message handler for conversational workflows
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text   = msg.text;

    if (!text) return;

    // Command override: cancel any active wizard session on command input
    if (text.startsWith('/')) {
      delete sessions[chatId];
      return;
    }

    const session = sessions[chatId];
    if (!session) return;

    const user = await getLoggedInUser(chatId);

    // 0. Login verification flow
    if (session.type === 'login') {
      if (session.step === 'await_password') {
        try {
          const bcrypt = require('bcryptjs');
          const loginUser = await User.findById(session.data.userId);
          if (!loginUser) {
            delete sessions[chatId];
            return bot.sendMessage(chatId, 'User not found. Please try `/login <email>` again.');
          }

          const isMatch = await bcrypt.compare(text, loginUser.password);
          if (!isMatch) {
            delete sessions[chatId];
            return bot.sendMessage(chatId, 'Incorrect password. Login failed. Please try `/login <email>` again.');
          }

          loginUser.telegramChatId = chatId;
          await loginUser.save();

          bot.sendMessage(chatId, `Successfully logged in as:\n*Name:* ${loginUser.name}\n*Role:* ${loginUser.role}\n*Group:* ${loginUser.group || 'None'}`, { parse_mode: 'Markdown' });
        } catch (err) {
          bot.sendMessage(chatId, 'An error occurred during password validation. Please try `/login <email>` again.');
        }
        delete sessions[chatId];
        return;
      }
    }

    // 1. Health report flow (compatible with legacy doctors)
    if (session.type === 'health' || (!session.type && session.step)) {
      if (session.step === 'await_email') {
        const doctor = await User.findOne({ email: text.toLowerCase(), role: 'doctor' });
        if (!doctor) {
          bot.sendMessage(chatId, 'No doctor found with that email. Try again or /upload to restart.');
          return;
        }
        session.data.doctorId = doctor._id;
        session.step = 'await_patient';
        bot.sendMessage(chatId, `Verified as ${doctor.name}\n\nEnter patient name:`);
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
          bot.sendMessage(chatId, `Health report saved for ${session.data.patientName}! It is now live on the dashboard.`);
        } catch (err) {
          bot.sendMessage(chatId, 'Error saving report. Try again.');
        }
        delete sessions[chatId];
        return;
      }
    }

    // 2. Add Stock flow
    if (session.type === 'addstock') {
      if (!user) {
        delete sessions[chatId];
        return bot.sendMessage(chatId, 'Session expired or user not logged in.');
      }

      if (session.step === 'await_name') {
        session.data.name = text.trim();
        session.step = 'await_qty';
        bot.sendMessage(chatId, `Item: *${session.data.name}*\n\nEnter quantity to add (positive integer):`, { parse_mode: 'Markdown' });
        return;
      }

      if (session.step === 'await_qty') {
        const qty = parseInt(text.trim());
        if (isNaN(qty) || qty <= 0) {
          return bot.sendMessage(chatId, 'Please enter a valid positive number for the quantity:');
        }

        try {
          const itemCategory = session.data.category;
          const itemName = session.data.name;

          // Check if it already exists
          const existing = await InventoryItem.findOne({
            name: { $regex: new RegExp(`^${itemName}$`, 'i') },
            category: itemCategory
          });

          if (existing) {
            existing.quantity += qty;
            await existing.save();
            bot.sendMessage(chatId, `Stock updated! *${existing.name}* (Category: ${itemCategory}) now has quantity *${existing.quantity}*.`, { parse_mode: 'Markdown' });
          } else {
            const count = await InventoryItem.countDocuments({ category: itemCategory });
            const prefix = itemCategory === 'AV/IT' ? 'AVIT' : itemCategory.toUpperCase();
            const itemId = `${prefix}-${String(count + 1).padStart(3, '0')}`;

            const item = await InventoryItem.create({
              itemId,
              name: itemName,
              quantity: qty,
              category: itemCategory,
              addedBy: user._id
            });

            bot.sendMessage(chatId, `New inventory item created!\n*ID:* \`${item.itemId}\`\n*Name:* ${item.name}\n*Category:* ${item.category}\n*Quantity:* ${item.quantity}`, { parse_mode: 'Markdown' });
          }
        } catch (err) {
          bot.sendMessage(chatId, 'Error saving stock details.');
        }
        delete sessions[chatId];
        return;
      }
    }

    // 2b. Minus Stock flow
    if (session.type === 'minus') {
      if (!user) {
        delete sessions[chatId];
        return bot.sendMessage(chatId, 'Session expired or user not logged in.');
      }

      if (session.step === 'await_name') {
        const itemName = text.trim();
        try {
          const itemCategory = session.data.category;
          const existing = await InventoryItem.findOne({
            name: { $regex: new RegExp(`^${itemName}$`, 'i') },
            category: itemCategory
          });

          if (!existing) {
            delete sessions[chatId];
            return bot.sendMessage(chatId, `Item *${itemName}* not found in *${itemCategory}* category.`, { parse_mode: 'Markdown' });
          }

          session.data.itemId = existing._id;
          session.data.name = existing.name;
          session.data.currentQty = existing.quantity;
          session.step = 'await_qty';

          bot.sendMessage(chatId, `Item: *${existing.name}*\nCurrent Stock: *${existing.quantity}*\n\nEnter quantity to remove (positive integer):`, { parse_mode: 'Markdown' });
        } catch (err) {
          bot.sendMessage(chatId, 'Error looking up item.');
          delete sessions[chatId];
        }
        return;
      }

      if (session.step === 'await_qty') {
        const qty = parseInt(text.trim());
        if (isNaN(qty) || qty <= 0) {
          return bot.sendMessage(chatId, 'Please enter a valid positive number for the quantity:');
        }

        if (qty > session.data.currentQty) {
          return bot.sendMessage(chatId, `Insufficient stock! Only *${session.data.currentQty}* units available. Enter a smaller quantity:`, { parse_mode: 'Markdown' });
        }

        try {
          const item = await InventoryItem.findById(session.data.itemId);
          if (!item) {
            delete sessions[chatId];
            return bot.sendMessage(chatId, 'Item not found.');
          }

          item.quantity -= qty;
          await item.save();

          bot.sendMessage(chatId, `Stock updated successfully! *${item.name}* (Category: ${item.category}) now has quantity *${item.quantity}*.`, { parse_mode: 'Markdown' });
        } catch (err) {
          bot.sendMessage(chatId, 'Error updating stock details.');
        }
        delete sessions[chatId];
        return;
      }
    }

    // 3. Supply Request flow
    if (session.type === 'request') {
      if (!user) {
        delete sessions[chatId];
        return bot.sendMessage(chatId, 'Session expired or user not logged in.');
      }

      if (session.step === 'await_requester') {
        session.data.requesterName = text.trim();
        session.step = 'await_item';
        bot.sendMessage(chatId, 'Enter item description/name:');
        return;
      }

      if (session.step === 'await_item') {
        session.data.item = text.trim();
        session.step = 'await_qty';
        bot.sendMessage(chatId, `Item: *${session.data.item}*\n\nEnter requested quantity (positive integer):`, { parse_mode: 'Markdown' });
        return;
      }

      if (session.step === 'await_qty') {
        const qty = parseInt(text.trim());
        if (isNaN(qty) || qty <= 0) {
          return bot.sendMessage(chatId, 'Please enter a valid positive number for the quantity:');
        }

        try {
          const req = await InventoryRequest.create({
            requesterName: session.data.requesterName,
            item: session.data.item,
            quantity: qty,
            category: session.data.category,
            requestedBy: user._id
          });

          bot.sendMessage(chatId, `Supply request submitted!\n*Category:* ${req.category}\n*Item:* ${req.item}\n*Qty:* ${req.quantity}\n*Requester:* ${req.requesterName}`, { parse_mode: 'Markdown' });
        } catch (err) {
          bot.sendMessage(chatId, 'Error submitting request details.');
        }
        delete sessions[chatId];
        return;
      }
    }
  });
}

// Register commands immediately (works for both polling and webhook)
if (bot) {
  registerCommands();
}

/**
 * Set up the Telegram webhook endpoint on the Express app.
 * Called from index.js after MongoDB connects.
 * Only sets webhook in production mode.
 */
function setupWebhook(app) {
  if (!bot || !TELEGRAM_TOKEN) {
    console.warn('TELEGRAM_TOKEN not set — Telegram bot disabled');
    return;
  }

  if (!IS_PRODUCTION) {
    console.log('Skipping webhook setup — using polling mode for local dev');
    return;
  }

  const webhookPath = `/bot/telegram`;
  const webhookUrl  = `${RENDER_URL}${webhookPath}`;

  // Route that Telegram will POST updates to
  app.post(webhookPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // Tell Telegram to send updates to our webhook URL
  bot.setWebHook(webhookUrl)
    .then(() => console.log(`Telegram webhook set: ${webhookUrl}`))
    .catch(err => console.error('Failed to set Telegram webhook:', err.message));

  console.log('Telegram bot running (webhook mode)');
}

module.exports = { bot, setupWebhook };

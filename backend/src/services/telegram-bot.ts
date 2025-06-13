import TelegramBot from 'node-telegram-bot-api'
import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import { logger } from '../../../shared/utils/logger'
import NodeCache from 'node-cache'

const cache = new NodeCache();
import { config } from '../config/env'

const prisma = new PrismaClient()
if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("Environment variable TELEGRAM_BOT_TOKEN is not defined.");
}
const ADMINS = (process.env.TELEGRAM_ADMINS || '')
  .split(',')
  .map(id => Number(id))
  .filter(id => !isNaN(id));

// --- RBAC & Admins ---
const ADMINS = (process.env.TELEGRAM_ADMINS || '').split(',').map(id => Number(id))
function isAdmin(userId: number) {
  return ADMINS.includes(userId)
}

// --- Rate Limiting ---
const userLastCommand: Record<number, number> = {}
function rateLimit(userId: number, ms = 2000) {
  const now = Date.now()
  if (userLastCommand[userId] && now - userLastCommand[userId] < ms) return false
  userLastCommand[userId] = now
  return true
}

// --- Wallet Connection (Solana) ---
const WALLET_CODES = new Map<number, string>()
bot.onText(/\/connect/, async (msg) => {
  if (!rateLimit(msg.from!.id)) return
  const code = Math.random().toString(36).slice(2, 10)
  WALLET_CODES.set(msg.from!.id, code)
  const url = `${config.WEB_URL}/wallet-connect?code=${code}&tg=${msg.from!.id}`
  await bot.sendMessage(msg.chat.id, `🔗 *Connect your Solana wallet:*\n[Open Wallet Connect](${url})`, { parse_mode: 'Markdown' })
})

// --- Welcome & Onboarding ---
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id
  const welcomeMessage = `
🪳 *Welcome to BoomRoach Hydra Bot!* 🤖

The most advanced Solana trading bot for 2025!

*Available Commands:*
/connect - Link your wallet
/profile - View your profile
/balance - Check portfolio
/signals - Get AI trading signals
/trade - Execute manual trades
/config - Bot configuration
/alerts - Toggle notifications
/stats - View performance
/leaderboard - Top traders
/support - Get help
/help - Show this menu

*Getting Started:*
1. Use /connect to link your Solana wallet
2. Configure your risk settings with /config
3. Start receiving AI signals with /signals

Ready to dominate the markets? 🚀
  `
  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔗 Connect Wallet', callback_data: 'connect_wallet' },
          { text: '📊 View Signals', callback_data: 'view_signals' }
        ],
        [
          { text: '⚙️ Configuration', callback_data: 'config' },
          { text: '📈 Stats', callback_data: 'stats' }
        ]
      ]
    }
  })
})

// --- Profile Management ---
bot.onText(/\/profile/, async (msg) => {
  if (!rateLimit(msg.from!.id)) return
  const cacheKey = `user_${msg.from!.id}`;
  let user = cache.get(cacheKey);
  if (!user) {
    user = await prisma.user.findUnique({ where: { telegramId: msg.from!.id } });
    if (user) {
      cache.set(cacheKey, user, 3600); // Cache for 1 hour
    }
  }
  if (!user) return bot.sendMessage(msg.chat.id, "👤 *Profile not found.* Use /connect to get started.", { parse_mode: 'Markdown' })
  await bot.sendMessage(msg.chat.id, `👤 *Profile:*\n- Name: ${user.name || 'Not set'}\n- Wallet: ${user.wallet || 'Not connected'}`, { parse_mode: 'Markdown' })
})

// --- Settings ---
bot.onText(/\/settings|\/config/, async (msg) => {
  if (!rateLimit(msg.from!.id)) return
  await bot.sendMessage(msg.chat.id, "⚙️ *Preferences (coming soon).*", {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🌐 Language", callback_data: "settings_language" },
          { text: "🔔 Notifications", callback_data: "settings_notifications" }
        ],
        [
          { text: "🔙 Back", callback_data: "settings_back" }
        ]
      ]
    }
  })
})

// --- Portfolio & Balance ---
bot.onText(/\/balance/, async (msg) => {
  if (!rateLimit(msg.from!.id)) return
  // TODO: Fetch real portfolio from backend
  try {
    const user = await prisma.user.findUnique({ where: { telegramId: msg.from!.id } })
    if (!user || !user.wallet) return bot.sendMessage(msg.chat.id, "❌ Please connect your wallet first using /connect")
    const res = await axios.get(`${config.API_BASE_URL}/api/trading/portfolio`, {
      headers: { 'Authorization': `Bearer ${user.jwtToken}` }
    })
    const portfolio = res.data.portfolio
    let text = `📊 *Portfolio Overview*\n\n*Total Value:* $${portfolio.totalValue}\n*24h P&L:* $${portfolio.dailyPnL}\n*Total P&L:* $${portfolio.totalPnL}\n\n*Top Positions:*\n`
    for (const pos of portfolio.positions.slice(0, 5)) {
      text += `• ${pos.symbol}: $${pos.value} (${pos.pnlPercentage}%)\n`
    }
    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' })
  } catch (error) {
    logger.error('Failed to fetch portfolio', error)
    await bot.sendMessage(msg.chat.id, "❌ Failed to fetch portfolio. Please try again.")
  }
})

// --- Trading Interface ---
bot.onText(/\/trade/, async (msg) => {
  if (!rateLimit(msg.from!.id)) return
  await bot.sendMessage(msg.chat.id, "Choose an action:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🟢 BUY", callback_data: "trade_buy" }, { text: "🔴 SELL", callback_data: "trade_sell" }]
      ]
    }
  })
})

// --- Callback Queries (Inline Keyboards) ---
bot.on('callback_query', async (query) => {
  const userId = query.from.id
  if (!rateLimit(userId)) return
  if (query.data === "trade_buy" || query.data === "trade_sell") {
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(query.message!.chat.id, `Confirm ${query.data === "trade_buy" ? "buy" : "sell"}?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Confirm", callback_data: `trade_confirm_${query.data.split('_')[1]}` }],
          [{ text: "❌ Cancel", callback_data: "trade_cancel" }]
        ]
      }
    })
  }
  if (query.data?.startsWith("trade_confirm_")) {
    const side = query.data.split('_')[2]
    await bot.answerCallbackQuery(query.id)
    // --- HYDRA-BOT INTEGRATION ---
    try {
      await axios.post(`${config.HYDRA_BOT_URL}/trade`, {
        userId,
        side,
        telegramId: userId
      })
      await bot.sendMessage(query.message!.chat.id, `Trade ${side.toUpperCase()} sent to Hydra-Bot!`)
      await notifyTrade(userId, { side, timestamp: Date.now() })
    } catch (error) {
      logger.error('Hydra-Bot trade API error', error)
      await bot.sendMessage(query.message!.chat.id, "❌ Failed to execute trade. Please try again later.")
    }
  }
  if (query.data === "trade_cancel") {
    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(query.message!.chat.id, "Trade cancelled.")
  }
  // Add more callback handlers for config, stats, etc.
})

// --- Hydra-Bot: Engines, Signals, Stats, Leaderboard ---
bot.onText(/\/engines/, async (msg) => {
  if (!rateLimit(msg.from!.id)) return
  try {
    const res = await axios.get(`${config.HYDRA_BOT_URL}/engines/status`)
    const engines = res.data
    if (!engines || engines.length === 0) {
      await bot.sendMessage(msg.chat.id, "No engine status available.")
      return
    }
    let text = "🛠️ *Engine Status:*\n"
    for (const engine of engines) {
      text += `- ${engine.name}: ${engine.status}\n`
    }
    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' })
  } catch (error) {
    logger.error('Failed to fetch engine status', error)
    await bot.sendMessage(msg.chat.id, "❌ Failed to fetch engine status.")
  }
})

bot.onText(/\/signals/, async (msg) => {
  if (!rateLimit(msg.from!.id)) return
  try {
    const res = await axios.get(`${config.HYDRA_BOT_URL}/signals/latest`)
    const signals = res.data
    if (!signals || signals.length === 0) {
      await bot.sendMessage(msg.chat.id, "No latest signals available.")
      return
    }
    let text = "📡 *Latest Signals:*\n"
    for (const signal of signals) {
      text += `- ${signal.name}: ${signal.value}\n`
    }
    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' })
  } catch (error) {
    logger.error('Failed to fetch latest signals', error)
    await bot.sendMessage(msg.chat.id, "❌ Failed to fetch latest signals.")
  }
})

bot.onText(/\/stats/, async (msg) => {
  if (!rateLimit(msg.from!.id)) return
  try {
    const res = await axios.get(`${config.HYDRA_BOT_URL}/stats`, {
      params: { userId: msg.from!.id }
    })
    const stats = res.data
    let statsMessage = "📊 *Statistics:*\n";
    for (const [key, value] of Object.entries(stats)) {
      statsMessage += `- ${key}: ${value}\n`;
    }
    await bot.sendMessage(msg.chat.id, statsMessage, { parse_mode: 'Markdown' })
  } catch (error) {
    logger.error('Failed to fetch statistics', error)
    await bot.sendMessage(msg.chat.id, "❌ Failed to fetch statistics.")
  }
})

bot.onText(/\/leaderboard/, async (msg) => {
  if (!rateLimit(msg.from!.id)) return
  try {
    const res = await axios.get(`${config.HYDRA_BOT_URL}/leaderboard`)
    const leaderboard = res.data
    if (!leaderboard || leaderboard.length === 0) {
      await bot.sendMessage(msg.chat.id, "No leaderboard data available.")
      return
    }
    let text = "🏆 *Leaderboard:*\n"
    for (const entry of leaderboard) {
      text += `- ${entry.user}: ${entry.score}\n`
    }
    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' })
  } catch (error) {
    logger.error('Failed to fetch leaderboard', error)
    await bot.sendMessage(msg.chat.id, "❌ Failed to fetch leaderboard.")
  }
})

// --- Notifications & Broadcast ---
export async function notifyTrade(userId: number, trade: any) {
  await bot.sendMessage(userId, `💹 *Trade executed:* ${JSON.stringify(trade)}`, { parse_mode: 'Markdown' })
}
export async function notifySignal(userId: number, signal: any) {
  await bot.sendMessage(userId, `📡 *New signal:* ${JSON.stringify(signal)}`, { parse_mode: 'Markdown' })
}
export async function notifyAdmin(message: string) {
  for (const adminId of ADMINS) {
    await bot.sendMessage(adminId, message, { parse_mode: 'Markdown' })
  }
}
export async function notifyPnL(userId: number, pnl: number) {
  await bot.sendMessage(userId, `📈 *P&L:* ${pnl > 0 ? 'Profit' : 'Loss'} ${pnl}`, { parse_mode: 'Markdown' })
}
export async function notifyRiskAlert(userId: number, alert: string) {
  await bot.sendMessage(userId, `⚠️ *Risk alert:* ${alert}`, { parse_mode: 'Markdown' })
}
export async function notifyMaintenance(userId: number, msg: string) {
  await bot.sendMessage(userId, `🛠️ *Maintenance:* ${msg}`, { parse_mode: 'Markdown' })
}

// --- Support ---
bot.onText(/\/support/, async (msg) => {
  await bot.sendMessage(msg.chat.id, "Need help?\n- FAQ: https://boomroach.app/faq\n- Discord: https://discord.gg/xxx\n- Telegram Support: @BoomRoachSupport")
})

// --- Admin Commands ---
bot.onText(/\/admin/, async (msg) => {
  if (!isAdmin(msg.from!.id)) return
  await bot.sendMessage(msg.chat.id, "👑 *Admin menu:*\n/users, /restart, /logs, /ban, /unban, /broadcast", { parse_mode: 'Markdown' })
})
bot.onText(/\/users/, async (msg) => {
  if (!isAdmin(msg.from!.id)) return
  const count = await prisma.user.count()
  await bot.sendMessage(msg.chat.id, `👥 *Users:* ${count}`, { parse_mode: 'Markdown' })
})
bot.onText(/\/restart/, async (msg) => {
  if (!isAdmin(msg.from!.id)) return
  await bot.sendMessage(msg.chat.id, "Restart requested (to be implemented).", { parse_mode: 'Markdown' })
})
bot.onText(/\/logs/, async (msg) => {
  if (!isAdmin(msg.from!.id)) return
  await bot.sendMessage(msg.chat.id, "Recent logs (coming soon).", { parse_mode: 'Markdown' })
})
bot.onText(/\/ban (.+)/, async (msg, match) => {
  if (!isAdmin(msg.from!.id)) return
  const id = Number(match![1])
  await prisma.user.update({ where: { telegramId: id }, data: { banned: true } })
  await bot.sendMessage(msg.chat.id, `User ${id} banned.`, { parse_mode: 'Markdown' })
})
bot.onText(/\/unban (.+)/, async (msg, match) => {
  if (!isAdmin(msg.from!.id)) return
  const id = Number(match![1])
  await prisma.user.update({ where: { telegramId: id }, data: { banned: false } })
  await bot.sendMessage(msg.chat.id, `User ${id} unbanned.`, { parse_mode: 'Markdown' })
})
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  if (!isAdmin(msg.from!.id)) return
  const text = match![1]
  const users = await prisma.user.findMany({ where: { banned: false } })
  for (const user of users) {
    await bot.sendMessage(user.telegramId, `📢 ${text}`, { parse_mode: 'Markdown' })
  }
})

// --- Help ---
bot.onText(/\/help/, async (msg) => {
  const helpMessage = `
❓ *BoomRoach Bot Help*

*About:*
The most advanced Solana trading bot powered by AI and machine learning.

*Commands:*
/start - Initialize bot
/connect - Link wallet
/profile - View profile
/balance - Check portfolio
/signals - Get AI signals
/trade - Manual trade
/config - Bot settings
/alerts - Toggle notifications
/stats - Performance metrics
/leaderboard - Top traders
/support - Get help

*Security:*
• We never store private keys
• All trades require confirmation
• Use hardware wallets when possible

*Support:*
• Telegram: @BoomRoachSupport
• Discord: discord.gg/xxx
• Website: boomroach.app
  `
  await bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' })
})

// --- Security, Logging, Audit ---
bot.on('polling_error', async (err) => {
  logger.error('Telegram polling error', err);

  // Document recovery steps
  logger.info('Potential recovery steps: Ensure the bot token is correct, check network connectivity, and verify Telegram API availability.');

  // Retry logic
  const MAX_RETRIES = 5;
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      await bot.startPolling();
      logger.info('Polling successfully restarted.');
      break;
    } catch (retryError) {
      retries++;
      logger.error(`Polling retry attempt ${retries} failed`, retryError);
      if (retries === MAX_RETRIES) {
        logger.error('Max retries reached. Manual intervention required.');
        await notifyAdmin(`⚠️ Telegram polling error occurred: ${err.message}. Manual intervention required.`);
      }
    }
  }
});
bot.on('webhook_error', async (err) => {
  logger.error('Telegram webhook error', err);

  // Attempt to restart the webhook
  try {
    await bot.setWebHook(`${config.WEBHOOK_URL}/${process.env.TELEGRAM_BOT_TOKEN}`);
    logger.info('Webhook successfully restarted.');
  } catch (restartError) {
    logger.error('Failed to restart webhook', restartError);
  }

  // Notify admins about the error
  await notifyAdmin(`⚠️ Telegram webhook error occurred: ${err.message}`);
});

// --- Startup ---
logger.info(`🤖 BoomRoach Telegram Bot started in ${process.env.NODE_ENV || 'unknown'} environment!`)

export default bot
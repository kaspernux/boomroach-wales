import express from 'express';
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';
import { TelegramBot } from '../services/telegram-bot';


const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireVerified);
router.use(requireLevel);


// Telegram webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;

    console.log('📨 Telegram webhook received:', JSON.stringify(update, null, 2));

    // Handle the update
    await TelegramBot.handleWebhookUpdate(update);

    // Respond with 200 OK to Telegram
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('❌ Error handling Telegram webhook:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
});

// Health check for webhook
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Telegram webhook service is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to send a message
router.post('/test-message', async (req, res) => {
  try {
    const { chatId, message } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        error: 'chatId and message are required'
      });
    }

    const result = await TelegramBot.sendMessage(chatId, message);

    res.json({
      success: true,
      data: result,
      message: 'Test message sent successfully'
    });
  } catch (error) {
    console.error('❌ Error sending test message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test message'
    });
  }
});

export default router;

import express from 'express';
import { adminConfigService } from '../services/admin-config';
import { tokenDataService, TokenDataService } from '../services/token-data';
import { telegramBot } from '../services/telegram-bot';
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';
import { validateApiKey } from '../middleware/security';
import tradingConfig from '../../../config/trading.config.json';

const router = express.Router();

// Apply authentication and admin check to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

// ===========================================
// PLATFORM CONFIGURATION ROUTES
// ===========================================

// Get full platform configuration
router.get('/config', async (req: AuthenticatedRequest, res) => {
  try {
    const config = adminConfigService.getConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('❌ Error getting admin config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

// Update platform configuration
router.put('/config', async (req: AuthenticatedRequest, res) => {
  try {
    const updates = req.body;
    const updatedConfig = await adminConfigService.updateConfig(updates);

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating admin config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

// Get specific configuration section
router.get('/config/:section', async (req: AuthenticatedRequest, res) => {
  try {
    const { section } = req.params;
    const config = adminConfigService.getConfigSection(section as any);

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('❌ Error getting config section:', error);
    res.status(500).json({
      success: false,
      error: `Failed to get ${req.params.section} configuration`
    });
  }
});

// ===========================================
// TOKEN CONFIGURATION ROUTES
// ===========================================

// Get current token configuration
router.get('/token/config', async (req, res) => {
  try {
    const tokenConfig = tokenDataService.getTokenConfig();
    const marketData = await tokenDataService.getBoomRoachMarketData();

    res.json({
      success: true,
      data: {
        config: tokenConfig,
        marketData: marketData
      }
    });
  } catch (error) {
    console.error('❌ Error getting token config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get token configuration'
    });
  }
});

// Update token configuration
router.put('/token/config', async (req, res) => {
  try {
    const tokenUpdates = req.body;

    // Validate required fields
    if (tokenUpdates.address && !TokenDataService.isValidSolanaAddress(tokenUpdates.address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Solana token address format'
      });
    }

    const updatedConfig = await adminConfigService.updateTokenConfig(tokenUpdates);

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Token configuration updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating token config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update token configuration'
    });
  }
});

// Get token market data
router.get('/token/market-data', async (req, res) => {
  try {
    const marketData = await tokenDataService.getBoomRoachMarketData();
    const tradingPairs = await tokenDataService.getTradingPairs();
    const tokenSupply = await tokenDataService.getTokenSupply();
    const holders = await tokenDataService.getTokenHolders();

    res.json({
      success: true,
      data: {
        marketData,
        tradingPairs,
        tokenSupply,
        topHolders: holders.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('❌ Error getting token market data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get token market data'
    });
  }
});

// Get token historical prices
router.get('/token/historical/:timeframe', async (req, res) => {
  try {
    const { timeframe } = req.params;
    const validTimeframes = ['1h', '24h', '7d', '30d'];

    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeframe. Must be one of: 1h, 24h, 7d, 30d'
      });
    }

    const historicalData = await tokenDataService.getHistoricalPrices(timeframe as any);

    res.json({
      success: true,
      data: historicalData
    });
  } catch (error) {
    console.error('❌ Error getting historical prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get historical price data'
    });
  }
});

// ===========================================
// TRADING CONFIGURATION ROUTES
// ===========================================

// Get trading configuration
router.get('/trading/config', async (req, res) => {
  try {
    const tradingConfig = adminConfigService.getConfigSection('trading');
    const tradingLimits = adminConfigService.getTradingLimits();

    res.json({
      success: true,
      data: {
        config: tradingConfig,
        limits: tradingLimits
      }
    });
  } catch (error) {
    console.error('❌ Error getting trading config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trading configuration'
    });
  }
});

// Update trading configuration
router.put('/trading/config', async (req, res) => {
  try {
    const tradingUpdates = req.body;
    const updatedConfig = await adminConfigService.updateTradingConfig(tradingUpdates);

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Trading configuration updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating trading config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update trading configuration'
    });
  }
});

// Enable/disable trading
router.post('/trading/:action', async (req, res) => {
  try {
    const { action } = req.params;

    if (!['enable', 'disable'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be enable or disable'
      });
    }

    const enabled = action === 'enable';
    await adminConfigService.updateTradingConfig({ enabled });

    res.json({
      success: true,
      message: `Trading ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('❌ Error toggling trading:', error);
    res.status(500).json({
      success: false,
      error: `Failed to ${req.params.action} trading`
    });
  }
});

// ===========================================
// SECURITY CONFIGURATION ROUTES
// ===========================================

// Get security configuration
router.get('/security/config', async (req, res) => {
  try {
    const securityConfig = adminConfigService.getConfigSection('security');
    const securityRequirements = adminConfigService.getSecurityRequirements();

    res.json({
      success: true,
      data: {
        config: securityConfig,
        requirements: securityRequirements
      }
    });
  } catch (error) {
    console.error('❌ Error getting security config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security configuration'
    });
  }
});

// Update security configuration
router.put('/security/config', async (req, res) => {
  try {
    const securityUpdates = req.body;
    const updatedConfig = await adminConfigService.updateSecurityConfig(securityUpdates);

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Security configuration updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating security config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security configuration'
    });
  }
});

// ===========================================
// FEATURE MANAGEMENT ROUTES
// ===========================================

// Get enabled features
router.get('/features', async (req, res) => {
  try {
    const features = adminConfigService.getConfigSection('features');
    const enabledFeatures = adminConfigService.getEnabledFeatures();

    res.json({
      success: true,
      data: {
        all: features,
        enabled: enabledFeatures
      }
    });
  } catch (error) {
    console.error('❌ Error getting features:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feature configuration'
    });
  }
});

// Toggle feature
router.post('/features/:feature/:action', async (req, res) => {
  try {
    const { feature, action } = req.params;

    if (!['enable', 'disable'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be enable or disable'
      });
    }

    const enabled = action === 'enable';
    await adminConfigService.toggleFeature(feature as any, enabled);

    res.json({
      success: true,
      message: `Feature ${feature} ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('❌ Error toggling feature:', error);
    res.status(500).json({
      success: false,
      error: `Failed to ${req.params.action} feature ${req.params.feature}`
    });
  }
});

// ===========================================
// TELEGRAM BOT MANAGEMENT ROUTES
// ===========================================

// Get Telegram bot status
router.get('/telegram/status', async (req, res) => {
  try {
    const botInfo = await telegramBot.getBotInfo();
    const webhookInfo = await telegramBot.getWebhookInfo();
    const telegramConfig = adminConfigService.getConfigSection('notifications').telegram;

    res.json({
      success: true,
      data: {
        bot: botInfo,
        webhook: webhookInfo,
        config: telegramConfig
      }
    });
  } catch (error) {
    console.error('❌ Error getting Telegram status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Telegram bot status'
    });
  }
});

// Update Telegram bot configuration
router.put('/telegram/config', async (req, res) => {
  try {
    const { webhookUrl, alertTypes } = req.body;

    // Update webhook if provided
    if (webhookUrl) {
      await telegramBot.setWebhook(webhookUrl);
    }

    // Update configuration
    await adminConfigService.updateConfig({
      notifications: {
        ...adminConfigService.getConfigSection('notifications'),
        telegram: {
          ...adminConfigService.getConfigSection('notifications').telegram,
          webhookUrl: webhookUrl || adminConfigService.getConfigSection('notifications').telegram.webhookUrl,
          alertTypes: alertTypes || adminConfigService.getConfigSection('notifications').telegram.alertTypes
        }
      }
    });

    res.json({
      success: true,
      message: 'Telegram bot configuration updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating Telegram config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Telegram bot configuration'
    });
  }
});

// Send test message via Telegram
router.post('/telegram/test-message', async (req, res) => {
  try {
    const { chatId, message } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        error: 'chatId and message are required'
      });
    }

    const result = await telegramBot.sendMessage(chatId, message);

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

// Broadcast message to all users
router.post('/telegram/broadcast', async (req, res) => {
  try {
    const { message, userIds } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    await telegramBot.broadcastMessage(message, userIds);

    res.json({
      success: true,
      message: 'Broadcast message sent successfully'
    });
  } catch (error) {
    console.error('❌ Error broadcasting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast message'
    });
  }
});

// ===========================================
// SYSTEM MANAGEMENT ROUTES
// ===========================================

// Get system status
router.get('/system/status', async (req, res) => {
  try {
    const systemStatus = adminConfigService.getSystemStatus();

    res.json({
      success: true,
      data: systemStatus
    });
  } catch (error) {
    console.error('❌ Error getting system status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status'
    });
  }
});

// Set maintenance mode
router.post('/system/maintenance', async (req, res) => {
  try {
    const { enabled, message } = req.body;

    await adminConfigService.setMaintenanceMode(enabled, message);

    res.json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('❌ Error setting maintenance mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set maintenance mode'
    });
  }
});

// Export configuration
router.get('/config/export', async (req, res) => {
  try {
    const configExport = adminConfigService.exportConfig();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="boomroach-config-${Date.now()}.json"`);
    res.send(configExport);
  } catch (error) {
    console.error('❌ Error exporting config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export configuration'
    });
  }
});

// Import configuration
router.post('/config/import', async (req, res) => {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuration data is required'
      });
    }

    const importedConfig = await adminConfigService.importConfig(config);

    res.json({
      success: true,
      data: importedConfig,
      message: 'Configuration imported successfully'
    });
  } catch (error) {
    console.error('❌ Error importing config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import configuration'
    });
  }
});

// Reset configuration to defaults
router.post('/config/reset', async (req, res) => {
  try {
    const defaultConfig = await adminConfigService.resetToDefaults();

    res.json({
      success: true,
      data: defaultConfig,
      message: 'Configuration reset to defaults successfully'
    });
  } catch (error) {
    console.error('❌ Error resetting config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset configuration'
    });
  }
});

export default router;

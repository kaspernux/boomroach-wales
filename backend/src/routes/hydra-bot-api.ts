import express from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../shared/utils/logger';
import { WebSocketService } from '../services/websocket';
import { notifyTrade, notifyPnL } from '../services/telegram-bot';
import { Router } from 'express';
import { 
  calculateUnrealizedPnl, 
  calculateUnrealizedPnlPct, 
  calculatePortfolioPnl, 
  calculatePortfolioPnlPct, 
  detectRiskAlerts, 
  validateTrade, 
  generateTradingSignal 
} from '../services/hydra-bot'; // <-- Import des fonctions métier
import { TelegramService } from '../services/telegram-bot';
import { validateApiKey } from '../middleware/security';
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// --- ROUTES BOT (clé API uniquement) ---
router.get('/health', validateApiKey, (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'hydra-bot-api'
  });
});

// Receive trading signals from Hydra-Bot Python system
router.post('/signals', validateApiKey, async (req, res) => {
  try {
    const {
      engine, type, symbol, confidence, price, reasoning, timestamp,
      expected_return, strength, timeframe
    } = req.body;

    if (!engine || !type || !symbol || !confidence || !price) {
      return res.status(400).json({ error: 'Missing required signal fields' });
    }

    // Enregistrement du signal en base
    const signal = await prisma.signal.create({
      data: {
        type,
        symbol,
        confidence,
        price,
        reasoning: reasoning || '',
        metadata: JSON.stringify({
          engine, expected_return, strength, timeframe, timestamp
        })
      }
    });

    // Diffusion WebSocket
    WebSocketService.broadcastSignal(signal);

    logger.info(`📡 Signal reçu de ${engine}: ${type} ${symbol} (${confidence})`);

    // Exécution automatique si activée
    await autoExecuteSignal(signal, { engine, type, symbol, confidence, price, reasoning, expected_return, strength, timeframe });

    res.json({ success: true, signalId: signal.id, message: 'Signal reçu et traité' });
  } catch (error) {
    logger.error('Erreur signal Hydra-Bot:', error);
    res.status(500).json({ error: 'Erreur traitement signal' });
  }
});

// Receive engine status updates from Hydra-Bot
router.post('/engine-status', validateApiKey, async (req, res) => {
  try {
    const { engine, status, performance, last_update } = req.body;

    if (!engine || !status) {
      return res.status(400).json({ error: 'Missing required engine status fields' });
    }

    // Update or create engine status
    const engineStatus = await prisma.engineStatus.upsert({
      where: { engine },
      update: {
        status: status.toUpperCase(),
        stats: JSON.stringify(performance),
        lastHeartbeat: new Date(),
        updatedAt: new Date()
      },
      create: {
        engine,
        status: status.toUpperCase(),
        stats: JSON.stringify(performance),
        lastHeartbeat: new Date()
      }
    });

    // Broadcast engine status via WebSocket
    WebSocketService.broadcastHydraEngineStatus({
      engine,
      status,
      performance,
      lastUpdate: last_update
    });

    logger.info(`🤖 Engine status updated: ${engine} - ${status}`);

    res.json({
      success: true,
      message: 'Engine status updated'
    });

  } catch (error) {
    logger.error('Error updating engine status:', error);
    res.status(500).json({ error: 'Failed to update engine status' });
  }
});

// Send commands to Hydra-Bot (start/stop engines, config changes)
router.post('/commands', validateApiKey, async (req, res) => {
  try {
    const { command, engine, parameters } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Missing command' });
    }

    // Process the command
    let result = { success: true, message: `Command ${command} processed` };

    switch (command) {
      case 'start_engine':
        if (!engine) {
          return res.status(400).json({ error: 'Engine name required for start command' });
        }
        await prisma.engineStatus.upsert({
          where: { engine },
          update: { status: 'RUNNING', lastHeartbeat: new Date() },
          create: { engine, status: 'RUNNING', lastHeartbeat: new Date() }
        });
        result.message = `Engine ${engine} started`;
        break;

      case 'stop_engine':
        if (!engine) {
          return res.status(400).json({ error: 'Engine name required for stop command' });
        }
        await prisma.engineStatus.upsert({
          where: { engine },
          update: { status: 'STOPPED', lastHeartbeat: new Date() },
          create: { engine, status: 'STOPPED', lastHeartbeat: new Date() }
        });
        result.message = `Engine ${engine} stopped`;
        break;

      case 'update_config':
        if (!engine || !parameters) {
          return res.status(400).json({ error: 'Engine name and parameters required for config update' });
        }
        await prisma.engineStatus.upsert({
          where: { engine },
          update: { config: JSON.stringify(parameters), lastHeartbeat: new Date() },
          create: { engine, status: 'STOPPED', config: JSON.stringify(parameters), lastHeartbeat: new Date() }
        });
        result.message = `Engine ${engine} configuration updated`;
        break;

      default:
        result = { success: false, message: `Unknown command: ${command}` };
    }

    logger.info(`🎮 Hydra-Bot command executed: ${command} ${engine || ''}`);

    res.json(result);

  } catch (error) {
    logger.error('Error processing Hydra-Bot command:', error);
    res.status(500).json({ error: 'Failed to process command' });
  }
});

// Get current engine configurations for Hydra-Bot
router.get('/engine-configs', validateApiKey, async (req, res) => {
  try {
    const engineStatuses = await prisma.engineStatus.findMany();

    const configs = engineStatuses.map(status => ({
      engine: status.engine,
      status: status.status,
      config: status.config ? JSON.parse(status.config) : {},
      lastHeartbeat: status.lastHeartbeat,
      stats: status.stats ? JSON.parse(status.stats) : {}
    }));

    res.json({
      success: true,
      configs
    });

  } catch (error) {
    logger.error('Error fetching engine configs:', error);
    res.status(500).json({ error: 'Failed to fetch engine configurations' });
  }
});

// Receive trade execution reports from Hydra-Bot
router.post('/trade-execution', validateApiKey, async (req, res) => {
  try {
    const {
      signal_id,
      engine,
      type,
      symbol,
      amount,
      executed_price,
      tx_hash,
      status,
      profit_loss,
      execution_time
    } = req.body;

    // Create trade record
    const trade = await prisma.hydraTrade.create({
      data: {
        userId: 'system', // System trades from Hydra-Bot
        type: type.toUpperCase(),
        side: type.toUpperCase(),
        tokenSymbol: symbol,
        amount: Number.parseFloat(amount),
        price: Number.parseFloat(executed_price),
        status: status.toUpperCase(),
        engine,
        txSignature: tx_hash,
        blockTime: new Date(),
        signalId: signal_id
      }
    });

    // Update signal with execution details
    if (signal_id) {
      await prisma.signal.update({
        where: { id: signal_id },
        data: {
          metadata: JSON.stringify({
            ...JSON.parse(await prisma.signal.findUnique({ where: { id: signal_id } }).then(s => s?.metadata || '{}')),
            executed: true,
            trade_id: trade.id,
            execution_time,
            profit_loss
          })
        }
      });
    }

    // Broadcast trade execution
    WebSocketService.broadcastHydraTrade({
      id: trade.id,
      engine,
      type,
      symbol,
      amount,
      price: executed_price,
      status,
      txHash: tx_hash,
      timestamp: new Date().toISOString(),
      profitLoss: profit_loss
    });

    // Send Telegram notifications to users
    const usersWithTelegram = await prisma.user.findMany({
      where: {
        telegramEnabled: true,
        telegramId: { not: null }
      }
    });

    for (const user of usersWithTelegram) {
      if (user.telegramId) {
        if (profit_loss && profit_loss !== 0) {
          await notifyPnL(user.telegramId, {
            tokenSymbol: symbol,
            amount,
            price: executed_price,
            realizedPnL: profit_loss,
            engine
          });
        } else {
          await notifyTrade(user.telegramId, {
            side: type,
            tokenSymbol: symbol,
            amount,
            price: executed_price,
            engine
          });
        }
      }
    }

    logger.info(`💰 Trade executed by ${engine}: ${type} ${amount} ${symbol} at ${executed_price}`);

    res.json({
      success: true,
      tradeId: trade.id,
      message: 'Trade execution recorded'
    });

  } catch (error) {
    logger.error('Error processing trade execution:', error);
    res.status(500).json({ error: 'Failed to process trade execution' });
  }
});

// Get system stats for Hydra-Bot dashboard
router.get('/system-stats', validateApiKey, async (req, res) => {
  try {
    // Get engine statistics
    const engineStats = await prisma.engineStatus.findMany();

    // Get recent trades
    const recentTrades = await prisma.hydraTrade.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Calculate statistics
    const totalTrades = recentTrades.length;
    const successfulTrades = recentTrades.filter(t => t.status === 'CONFIRMED').length;
    const totalVolume = recentTrades.reduce((sum, t) => sum + (t.amount * t.price), 0);
    const activeEngines = engineStats.filter(e => e.status === 'RUNNING').length;

    const stats = {
      engines: {
        total: engineStats.length,
        active: activeEngines,
        stopped: engineStats.filter(e => e.status === 'STOPPED').length
      },
      trading: {
        trades_24h: totalTrades,
        successful_trades: successfulTrades,
        success_rate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
        total_volume: totalVolume
      },
      system: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory_usage: process.memoryUsage(),
        version: '1.0.0'
      }
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Error fetching system stats:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
});

// --- ROUTES UTILISATEUR (JWT obligatoire) ---
// Exemple d'endpoint API pour calculer le PnL et les alertes de risque pour un utilisateur
router.get('/portfolio/metrics', authenticateToken, requireVerified, requireLevel, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Récupère les positions de l'utilisateur
    const positions = await prisma.position.findMany({
      where: { userId }
    });

    // Calculs métier via hydra-bot.ts
    const totalPnl = calculatePortfolioPnl(positions);
    const totalPnlPct = calculatePortfolioPnlPct(positions);
    // Exemple de config utilisateur (à adapter selon votre modèle)
    const config = { stopLossPercent: 10, maxPositionSize: 1000 };
    const riskAlerts = detectRiskAlerts(positions, config);

    res.json({
      success: true,
      metrics: {
        totalPnl,
        totalPnlPct,
        riskAlerts
      }
    });
  } catch (error) {
    logger.error('Error calculating portfolio metrics:', error);
    res.status(500).json({ error: 'Failed to calculate portfolio metrics' });
  }
});

// Exemple d'endpoint pour valider un trade avant exécution
router.post('/trading/validate', authenticateToken, requireVerified, requireLevel, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { trade } = req.body;
    // Exemple de config utilisateur (à adapter selon votre modèle)
    const config = { maxPositionSize: 1000 };
    const isValid = validateTrade(trade, config);

    res.json({
      success: isValid,
      message: isValid ? 'Trade validé' : 'Trade refusé (limite dépassée)'
    });
  } catch (error) {
    logger.error('Error validating trade:', error);
    res.status(500).json({ error: 'Failed to validate trade' });
  }
});

// Auto-execute trading signals based on configuration
async function autoExecuteSignal(signal: any, signalData: any) {
  try {
    // Check if auto-execution is enabled and signal meets criteria
    const shouldAutoExecute = signalData.confidence > 0.8 &&
                              ['sniper', 'ai-signals', 'arbitrage'].includes(signalData.engine.toLowerCase());

    if (!shouldAutoExecute) {
      return;
    }

    // Get users with auto-trading enabled
    const autoTradingUsers = await prisma.user.findMany({
      where: {
        tradingEnabled: true,
        // Add additional criteria for auto-trading eligibility
      }
    });

    for (const user of autoTradingUsers) {
      // Create auto-trade order (simplified for demo)
      const order = await prisma.hydraOrder.create({
        data: {
          userId: user.id,
          type: 'MARKET',
          side: signalData.type.toUpperCase(),
          tokenMint: 'BOOMROACH_MINT',
          tokenSymbol: signalData.symbol,
          amount: 100, // Default auto-trade amount
          price: signalData.price,
          status: 'PENDING',
          signalId: signal.id
        }
      });

      logger.info(`🤖 Auto-trade created for user ${user.id}: ${signalData.type} ${signalData.symbol}`);
    }

  } catch (error) {
    logger.error('Error in auto-execution:', error);
  }
}

// Calcul du signal de trading pour une position donnée
router.post('/signals/generate', validateApiKey, async (req, res) => {
  try {
    const { position } = req.body;
    if (!position) return res.status(400).json({ error: 'Position required' });

    const signal = generateTradingSignal(position);
    res.json({ success: true, signal });
  } catch (error) {
    logger.error('Error generating trading signal:', error);
    res.status(500).json({ error: 'Failed to generate trading signal' });
  }
});

export default router;

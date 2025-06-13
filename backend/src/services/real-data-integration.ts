import { tokenDataService, type TokenMarketData } from './token-data';
import { telegramBot } from './telegram-bot';
import { adminConfigService } from './admin-config';
import type { WebsocketService } from './websocket';
import type { TradingSignal } from '../../../shared/types/hydra-bot';

interface PriceAlert {
  id: string;
  userId: string;
  type: 'above' | 'below' | 'change';
  targetPrice?: number;
  changePercent?: number;
  enabled: boolean;
  lastTriggered?: number;
}

export class RealDataIntegrationService {
  private wsService?: WebsocketService;
  private priceAlerts: Map<string, PriceAlert[]> = new Map();
  private lastMarketData?: TokenMarketData;
  private priceUpdateInterval?: NodeJS.Timeout;
  private signalGenerationInterval?: NodeJS.Timeout;

  constructor() {
    this.startRealTimeUpdates();
  }

  // Set WebSocket service for real-time updates
  setWebSocketService(wsService: WebsocketService) {
    this.wsService = wsService;
    console.log('🔗 WebSocket service connected to real data integration');
  }

  // Start real-time price updates and signal generation
  private startRealTimeUpdates() {
    // Update prices every 10 seconds
    this.priceUpdateInterval = setInterval(async () => {
      await this.updatePriceData();
    }, 10000);

    // Generate trading signals every 30 seconds
    this.signalGenerationInterval = setInterval(async () => {
      await this.generateTradingSignals();
    }, 30000);

    console.log('📊 Real-time data integration started');
  }

  // Update price data and broadcast to clients
  private async updatePriceData() {
    try {
      const marketData = await tokenDataService.getBoomRoachMarketData();

      // Check if price changed significantly
      if (this.lastMarketData) {
        const priceChange = Math.abs(marketData.price - this.lastMarketData.price);
        const changePercent = (priceChange / this.lastMarketData.price) * 100;

        // Broadcast significant price changes
        if (changePercent > 1) { // 1% change threshold
          await this.broadcastPriceUpdate(marketData, changePercent);
        }

        // Check price alerts
        await this.checkPriceAlerts(marketData);
      }

      // Always broadcast to WebSocket clients
      if (this.wsService) {
        this.wsService.broadcastPriceUpdate({
          symbol: 'BOOMROACH',
          price: marketData.price,
          change: marketData.priceChange24hPercent,
          volume: marketData.volume24h,
          marketCap: marketData.marketCap,
          timestamp: Date.now()
        });

        // Diffuse aussi community et trading si tu as ces données
        const community = await this.getCommunityMetrics();
        if (community) this.wsService.broadcastCommunityUpdate(community);

        const trading = await this.getTradingMetrics();
        if (trading) this.wsService.broadcastTradingUpdate(trading);
      }

      this.lastMarketData = marketData;

    } catch (error) {
      console.error('❌ Error updating price data:', error);
    }
  }

  // Generate AI trading signals based on market data
  private async generateTradingSignals() {
    try {
      if (!this.lastMarketData) return;

      const marketData = this.lastMarketData;
      const signals = this.analyzeMarketData(marketData);

      // Broadcast signals to WebSocket clients
      if (this.wsService && signals.length > 0) {
        for (const signal of signals) {
          this.wsService.broadcastTradingSignal(signal);

          // Send signal notifications
          await this.notifyTradingSignal(signal);
        }
      }

    } catch (error) {
      console.error('❌ Error generating trading signals:', error);
    }
  }

  // Analyze market data and generate trading signals
  private analyzeMarketData(marketData: TokenMarketData): TradingSignal[] {
    const signals: TradingSignal[] = [];
    const now = Date.now();

    // Simple momentum-based signals (replace with real AI analysis)
    const change24h = marketData.priceChange24hPercent;
    const volume = marketData.volume24h;
    const marketCap = marketData.marketCap;

    // Volume spike signal
    if (volume > 50000 && change24h > 5) {
      signals.push({
        type: 'BUY',
        confidence: 0.75,
        price: marketData.price,
        timestamp: now,
        reason: 'High volume with positive momentum detected',
        engine: 'Volume Surge Bot'
      });
    }

    // Oversold bounce signal
    if (change24h < -10 && volume > 30000) {
      signals.push({
        type: 'BUY',
        confidence: 0.65,
        price: marketData.price,
        timestamp: now,
        reason: 'Potential oversold bounce opportunity',
        engine: 'Mean Reversion Bot'
      });
    }

    // Take profit signal
    if (change24h > 20) {
      signals.push({
        type: 'SELL',
        confidence: 0.70,
        price: marketData.price,
        timestamp: now,
        reason: 'Strong pump detected - consider taking profits',
        engine: 'Profit Taking Bot'
      });
    }

    // Trend continuation signal
    if (change24h > 5 && change24h < 15 && volume > 25000) {
      signals.push({
        type: 'BUY',
        confidence: 0.60,
        price: marketData.price,
        timestamp: now,
        reason: 'Healthy uptrend with good volume',
        engine: 'Trend Following Bot'
      });
    }

    return signals;
  }

  // Broadcast significant price updates
  private async broadcastPriceUpdate(marketData: TokenMarketData, changePercent: number) {
    const changeEmoji = marketData.priceChange24hPercent >= 0 ? '📈' : '📉';
    const alertType = changePercent > 5 ? 'MAJOR' : changePercent > 2 ? 'SIGNIFICANT' : 'MINOR';

    const message = `
${changeEmoji} <b>${alertType} PRICE MOVEMENT</b>

🪙 <b>BOOMROACH</b>
💲 Price: $${marketData.price.toFixed(6)}
📊 24h Change: ${marketData.priceChange24hPercent.toFixed(2)}%
📈 Market Cap: $${marketData.marketCap.toLocaleString()}
📊 Volume: $${marketData.volume24h.toLocaleString()}

⏰ ${new Date().toLocaleString()}
    `.trim();

    // Send via Telegram if significant movement
    if (changePercent > 2 && adminConfigService.getConfigSection('notifications').telegram.enabled) {
      await telegramBot.broadcastMessage(message);
    }
  }

  // Check and trigger price alerts
  private async checkPriceAlerts(marketData: TokenMarketData) {
    for (const [userId, alerts] of this.priceAlerts) {
      for (const alert of alerts) {
        if (!alert.enabled) continue;

        let shouldTrigger = false;
        let alertMessage = '';

        switch (alert.type) {
          case 'above':
            if (alert.targetPrice && marketData.price >= alert.targetPrice) {
              shouldTrigger = true;
              alertMessage = `🚀 BOOMROACH price reached $${alert.targetPrice}! Current: $${marketData.price.toFixed(6)}`;
            }
            break;

          case 'below':
            if (alert.targetPrice && marketData.price <= alert.targetPrice) {
              shouldTrigger = true;
              alertMessage = `⚠️ BOOMROACH price dropped to $${alert.targetPrice}! Current: $${marketData.price.toFixed(6)}`;
            }
            break;

          case 'change':
            if (alert.changePercent && Math.abs(marketData.priceChange24hPercent) >= alert.changePercent) {
              shouldTrigger = true;
              alertMessage = `📊 BOOMROACH 24h change: ${marketData.priceChange24hPercent.toFixed(2)}% (Alert: ${alert.changePercent}%)`;
            }
            break;
        }

        if (shouldTrigger) {
          const now = Date.now();
          // Cooldown period of 1 hour between same alert triggers
          if (!alert.lastTriggered || (now - alert.lastTriggered) > 3600000) {
            await this.triggerPriceAlert(userId, alert, alertMessage);
            alert.lastTriggered = now;
          }
        }
      }
    }
  }

  // Trigger a price alert
  private async triggerPriceAlert(userId: string, alert: PriceAlert, message: string) {
    try {
      // Send via Telegram
      await telegramBot.sendMessage(Number.parseInt(userId), message);

      // Send via WebSocket if user is connected
      if (this.wsService) {
        this.wsService.sendToUser(userId, 'price-alert', {
          alertId: alert.id,
          message,
          timestamp: Date.now()
        });
      }

      console.log(`🔔 Price alert triggered for user ${userId}: ${alert.type}`);
    } catch (error) {
      console.error(`❌ Error triggering price alert for user ${userId}:`, error);
    }
  }

  // Notify trading signal
  private async notifyTradingSignal(signal: TradingSignal) {
    const signalEmoji = signal.type === 'BUY' ? '🟢' : signal.type === 'SELL' ? '🔴' : '🟡';
    const confidenceEmoji = signal.confidence >= 0.8 ? '🔥' : signal.confidence >= 0.6 ? '⚡' : '💡';

    const message = `
${signalEmoji} <b>${signal.type} SIGNAL</b> ${confidenceEmoji}

🤖 <b>Engine:</b> ${signal.engine}
💰 <b>Price:</b> $${signal.price.toFixed(6)}
📊 <b>Confidence:</b> ${(signal.confidence * 100).toFixed(0)}%
💭 <b>Reason:</b> ${signal.reason}

⏰ ${new Date().toLocaleString()}
    `.trim();

    // Broadcast high-confidence signals
    if (signal.confidence >= 0.7 && adminConfigService.getConfigSection('notifications').telegram.enabled) {
      await telegramBot.broadcastMessage(message);
    }
  }

  // Add price alert for user
  addPriceAlert(userId: string, alert: Omit<PriceAlert, 'id'>): string {
    const alertId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const fullAlert: PriceAlert = {
      ...alert,
      id: alertId
    };

    if (!this.priceAlerts.has(userId)) {
      this.priceAlerts.set(userId, []);
    }

    this.priceAlerts.get(userId)!.push(fullAlert);

    console.log(`🔔 Price alert added for user ${userId}: ${alert.type}`);
    return alertId;
  }

  // Remove price alert
  removePriceAlert(userId: string, alertId: string): boolean {
    const userAlerts = this.priceAlerts.get(userId);
    if (!userAlerts) return false;

    const index = userAlerts.findIndex(alert => alert.id === alertId);
    if (index === -1) return false;

    userAlerts.splice(index, 1);

    if (userAlerts.length === 0) {
      this.priceAlerts.delete(userId);
    }

    console.log(`🗑️ Price alert removed for user ${userId}: ${alertId}`);
    return true;
  }

  // Get user's price alerts
  getUserAlerts(userId: string): PriceAlert[] {
    return this.priceAlerts.get(userId) || [];
  }

  // Get current market summary
  async getMarketSummary() {
    try {
      const marketData = await tokenDataService.getBoomRoachMarketData();
      const tradingPairs = await tokenDataService.getTradingPairs();
      const tokenSupply = await tokenDataService.getTokenSupply();

      return {
        price: marketData.price,
        change24h: marketData.priceChange24hPercent,
        volume24h: marketData.volume24h,
        marketCap: marketData.marketCap,
        liquidityUSD: marketData.liquidityUSD,
        holders: marketData.holders,
        supply: tokenSupply,
        tradingPairs: tradingPairs.length,
        lastUpdated: marketData.lastUpdated,
        source: marketData.source
      };
    } catch (error) {
      console.error('❌ Error getting market summary:', error);
      return null;
    }
  }

  // Generate market report
  async generateMarketReport(): Promise<string> {
    try {
      const summary = await this.getMarketSummary();
      if (!summary) return 'Unable to generate market report';

      const changeEmoji = summary.change24h >= 0 ? '📈' : '📉';
      const trendEmoji = summary.change24h > 5 ? '🚀' : summary.change24h < -5 ? '📉' : '➡️';

      return `
🪙 <b>BOOMROACH Market Report</b>

💲 <b>Price:</b> $${summary.price.toFixed(6)}
${changeEmoji} <b>24h Change:</b> ${summary.change24h.toFixed(2)}%
📊 <b>Market Cap:</b> $${summary.marketCap.toLocaleString()}
💧 <b>Liquidity:</b> $${summary.liquidityUSD.toLocaleString()}
📊 <b>Volume 24h:</b> $${summary.volume24h.toLocaleString()}
👥 <b>Holders:</b> ${summary.holders.toLocaleString()}
🔄 <b>Trading Pairs:</b> ${summary.tradingPairs}

${trendEmoji} <b>Trend:</b> ${this.getTrendDescription(summary.change24h)}

📡 <b>Data Source:</b> ${summary.source}
⏰ <b>Last Updated:</b> ${new Date(summary.lastUpdated).toLocaleString()}
      `.trim();
    } catch (error) {
      console.error('❌ Error generating market report:', error);
      return 'Error generating market report';
    }
  }

  // Get trend description
  private getTrendDescription(change24h: number): string {
    if (change24h > 10) return 'Strong Bullish 🔥';
    if (change24h > 5) return 'Bullish 📈';
    if (change24h > 2) return 'Slightly Bullish ⬆️';
    if (change24h > -2) return 'Sideways ➡️';
    if (change24h > -5) return 'Slightly Bearish ⬇️';
    if (change24h > -10) return 'Bearish 📉';
    return 'Strong Bearish ❄️';
  }

  // Stop real-time updates
  stop() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
    if (this.signalGenerationInterval) {
      clearInterval(this.signalGenerationInterval);
    }
    console.log('🛑 Real-time data integration stopped');
  }
}

// Export singleton instance
export const realDataIntegration = new RealDataIntegrationService();

export default RealDataIntegrationService;

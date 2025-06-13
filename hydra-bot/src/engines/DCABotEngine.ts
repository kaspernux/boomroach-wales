import { type Connection, PublicKey, type Keypair } from '@solana/web3.js';
import { type Jupiter, RouteInfo } from '@jup-ag/api';

interface DCASchedule {
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'smart';
  amount: number; // Base amount per purchase
  maxAmount: number; // Maximum total amount to invest
  startDate: number;
  endDate?: number;
  isActive: boolean;
  totalInvested: number;
  totalTokens: number;
  averagePrice: number;
}

interface DCAOrder {
  id: string;
  timestamp: number;
  amount: number; // USD amount
  tokens: number; // Tokens purchased
  price: number; // Price per token
  fees: number;
  slippage: number;
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
  reason: string; // Why this order was created or skipped
}

interface MarketCondition {
  volatility: number;
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  rsi: number;
  fearGreedIndex: number;
  volume: number;
  pricePosition: number; // Position relative to recent range (0-1)
  momentum: number;
}

interface DCAConfig {
  baseAmount: number;
  maxDeviation: number; // % price deviation to trigger smart adjustments
  volatilityThreshold: number;
  minAmount: number;
  maxAmount: number;
  stopOnProfit: number; // % profit to stop DCA
  stopOnLoss: number; // % loss to stop DCA
  riskPerOrder: number;
  smartAdjustments: boolean;
  fearGreedWeight: number;
  volatilityWeight: number;
  trendWeight: number;
}

interface DCAStrategy {
  name: string;
  description: string;
  amountAdjustment: (baseAmount: number, conditions: MarketCondition) => number;
  timingAdjustment: (baseInterval: number, conditions: MarketCondition) => number;
  shouldSkip: (conditions: MarketCondition) => boolean;
}

export class DCABotEngine {
  private connection: Connection;
  private wallet: Keypair;
  private jupiter: Jupiter;

  private config: DCAConfig;
  private schedule: DCASchedule;
  private orderHistory: DCAOrder[] = [];
  private baseAsset: string;

  // Market analysis data
  private priceHistory: number[] = [];
  private volumeHistory: number[] = [];
  private maxHistoryLength = 1000;

  // DCA strategies
  private strategies: Map<string, DCAStrategy> = new Map();
  private currentStrategy = 'balanced';

  // Performance tracking
  private totalInvested = 0;
  private totalTokens = 0;
  private unrealizedPnL = 0;
  private realizedPnL = 0;
  private averageCost = 0;

  // Timing and scheduling
  private nextOrderTime = 0;
  private isActive = false;
  private lastOrderTime = 0;

  constructor(
    connection: Connection,
    wallet: Keypair,
    jupiter: Jupiter,
    baseAsset: string,
    schedule: DCASchedule,
    config: DCAConfig
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.jupiter = jupiter;
    this.baseAsset = baseAsset;
    this.schedule = schedule;
    this.config = config;

    this.initializeDCAStrategies();
  }

  /**
   * Initialize the DCA Bot Engine
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('💰 Initializing DCA Bot Engine...');

      // Load historical price data for analysis
      await this.loadHistoricalData();

      // Calculate next order time
      this.calculateNextOrderTime();

      // Validate configuration
      const validation = this.validateConfiguration();
      if (!validation.isValid) {
        return { success: false, error: validation.reason };
      }

      this.isActive = true;

      console.log('✅ DCA Bot Engine initialized successfully');
      console.log(`📅 Next order scheduled for: ${new Date(this.nextOrderTime).toISOString()}`);
      console.log(`💵 Base amount: $${this.schedule.amount}`);
      console.log(`🎯 Strategy: ${this.currentStrategy}`);

      return { success: true };
    } catch (error) {
      console.error('❌ DCA Bot initialization failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Main DCA execution cycle
   */
  async executeDCACycle(): Promise<{
    success: boolean;
    orderExecuted: boolean;
    amount?: number;
    tokens?: number;
    price?: number;
    nextOrderTime?: number;
    error?: string;
  }> {
    try {
      if (!this.isActive || !this.shouldExecuteOrder()) {
        return {
          success: true,
          orderExecuted: false,
          nextOrderTime: this.nextOrderTime
        };
      }

      // Analyze current market conditions
      const marketConditions = await this.analyzeMarketConditions();

      // Check if we should skip this order based on conditions
      const strategy = this.strategies.get(this.currentStrategy)!;
      if (strategy.shouldSkip(marketConditions)) {
        console.log('⏭️ Skipping DCA order due to market conditions');
        this.calculateNextOrderTime();
        return {
          success: true,
          orderExecuted: false,
          nextOrderTime: this.nextOrderTime
        };
      }

      // Calculate order amount with smart adjustments
      const orderAmount = this.calculateOrderAmount(marketConditions);

      // Execute the DCA order
      const orderResult = await this.executeDCAOrder(orderAmount, marketConditions);

      if (orderResult.success) {
        // Update schedule and calculate next order time
        this.updateSchedule(orderResult);
        this.calculateNextOrderTime();

        // Check stop conditions
        await this.checkStopConditions();

        console.log(`✅ DCA Order executed: $${orderAmount} → ${orderResult.tokens} tokens at $${orderResult.price}`);

        return {
          success: true,
          orderExecuted: true,
          amount: orderAmount,
          tokens: orderResult.tokens,
          price: orderResult.price,
          nextOrderTime: this.nextOrderTime
        };
      } else {
        console.error('❌ DCA Order failed:', orderResult.error);
        return {
          success: false,
          orderExecuted: false,
          error: orderResult.error
        };
      }

    } catch (error) {
      console.error('❌ DCA cycle execution error:', error);
      return {
        success: false,
        orderExecuted: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Initialize DCA strategies
   */
  private initializeDCAStrategies(): void {
    // Conservative strategy - smaller amounts during high volatility
    this.strategies.set('conservative', {
      name: 'Conservative',
      description: 'Reduces buy amounts during high volatility and bear markets',
      amountAdjustment: (baseAmount, conditions) => {
        let multiplier = 1.0;

        // Reduce during high volatility
        if (conditions.volatility > 0.05) multiplier *= 0.7;

        // Reduce during bear markets
        if (conditions.trend === 'DOWNTREND') multiplier *= 0.8;

        // Reduce when fear is high
        if (conditions.fearGreedIndex < 30) multiplier *= 0.9;

        return baseAmount * multiplier;
      },
      timingAdjustment: (baseInterval, conditions) => {
        // Extend intervals during high volatility
        return conditions.volatility > 0.05 ? baseInterval * 1.5 : baseInterval;
      },
      shouldSkip: (conditions) => {
        // Skip during extreme market conditions
        return conditions.volatility > 0.15 || conditions.fearGreedIndex < 10;
      }
    });

    // Aggressive strategy - larger amounts during dips
    this.strategies.set('aggressive', {
      name: 'Aggressive',
      description: 'Increases buy amounts during dips and bear markets',
      amountAdjustment: (baseAmount, conditions) => {
        let multiplier = 1.0;

        // Increase during downtrends
        if (conditions.trend === 'DOWNTREND') multiplier *= 1.3;

        // Increase when price is low in range
        if (conditions.pricePosition < 0.3) multiplier *= 1.4;

        // Increase during fear
        if (conditions.fearGreedIndex < 40) multiplier *= 1.2;

        // Increase during high volatility (buying opportunities)
        if (conditions.volatility > 0.05) multiplier *= 1.1;

        return baseAmount * multiplier;
      },
      timingAdjustment: (baseInterval, conditions) => {
        // Reduce intervals during bear markets (buy more frequently)
        return conditions.trend === 'DOWNTREND' ? baseInterval * 0.7 : baseInterval;
      },
      shouldSkip: (conditions) => {
        // Skip during extreme greed
        return conditions.fearGreedIndex > 90;
      }
    });

    // Balanced strategy - moderate adjustments
    this.strategies.set('balanced', {
      name: 'Balanced',
      description: 'Moderate adjustments based on market conditions',
      amountAdjustment: (baseAmount, conditions) => {
        let multiplier = 1.0;

        // Moderate adjustments based on multiple factors
        if (conditions.trend === 'DOWNTREND') multiplier *= 1.1;
        if (conditions.pricePosition < 0.4) multiplier *= 1.15;
        if (conditions.fearGreedIndex < 30) multiplier *= 1.1;
        if (conditions.volatility > 0.08) multiplier *= 0.9;

        return baseAmount * multiplier;
      },
      timingAdjustment: (baseInterval, conditions) => {
        return baseInterval; // No timing adjustments for balanced
      },
      shouldSkip: (conditions) => {
        // Skip during extreme conditions
        return conditions.volatility > 0.2 || conditions.fearGreedIndex > 95 || conditions.fearGreedIndex < 5;
      }
    });

    // Value averaging strategy
    this.strategies.set('value_averaging', {
      name: 'Value Averaging',
      description: 'Adjusts amounts to maintain target portfolio value growth',
      amountAdjustment: (baseAmount, conditions) => {
        // Calculate target value vs current value
        const targetValue = this.calculateTargetValue();
        const currentValue = this.getCurrentPortfolioValue();
        const valueDifference = targetValue - currentValue;

        // Adjust amount to bridge the gap
        return Math.max(baseAmount * 0.5, Math.min(baseAmount * 2, valueDifference));
      },
      timingAdjustment: (baseInterval, conditions) => {
        return baseInterval;
      },
      shouldSkip: (conditions) => {
        // Skip if current value exceeds target by significant margin
        const targetValue = this.calculateTargetValue();
        const currentValue = this.getCurrentPortfolioValue();
        return currentValue > targetValue * 1.1;
      }
    });
  }

  /**
   * Analyze current market conditions for DCA decision making
   */
  private async analyzeMarketConditions(): Promise<MarketCondition> {
    const currentPrice = await this.getCurrentPrice();

    // Calculate volatility (20-day rolling)
    const volatility = this.calculateVolatility(20);

    // Determine trend
    const trend = this.calculateTrend();

    // Calculate RSI
    const rsi = this.calculateRSI(14);

    // Get fear & greed index (simplified calculation)
    const fearGreedIndex = this.calculateFearGreedIndex();

    // Calculate volume metrics
    const volume = this.calculateAverageVolume(10);

    // Calculate price position in recent range
    const pricePosition = this.calculatePricePosition(currentPrice, 30);

    // Calculate momentum
    const momentum = this.calculateMomentum(10);

    return {
      volatility,
      trend,
      rsi,
      fearGreedIndex,
      volume,
      pricePosition,
      momentum
    };
  }

  /**
   * Calculate the optimal order amount based on market conditions
   */
  private calculateOrderAmount(conditions: MarketCondition): number {
    const strategy = this.strategies.get(this.currentStrategy)!;
    let amount = strategy.amountAdjustment(this.schedule.amount, conditions);

    // Apply additional smart adjustments if enabled
    if (this.config.smartAdjustments) {
      amount = this.applySmartAdjustments(amount, conditions);
    }

    // Ensure amount is within limits
    amount = Math.max(this.config.minAmount, Math.min(this.config.maxAmount, amount));

    // Check if we're approaching max investment
    const remainingBudget = this.schedule.maxAmount - this.schedule.totalInvested;
    amount = Math.min(amount, remainingBudget);

    return amount;
  }

  /**
   * Apply smart adjustments based on machine learning insights
   */
  private applySmartAdjustments(baseAmount: number, conditions: MarketCondition): number {
    let adjustmentFactor = 1.0;

    // Fear & Greed adjustment
    const fearGreedAdjustment = this.calculateFearGreedAdjustment(conditions.fearGreedIndex);
    adjustmentFactor *= 1 + (fearGreedAdjustment * this.config.fearGreedWeight);

    // Volatility adjustment
    const volatilityAdjustment = this.calculateVolatilityAdjustment(conditions.volatility);
    adjustmentFactor *= 1 + (volatilityAdjustment * this.config.volatilityWeight);

    // Trend adjustment
    const trendAdjustment = this.calculateTrendAdjustment(conditions.trend, conditions.momentum);
    adjustmentFactor *= 1 + (trendAdjustment * this.config.trendWeight);

    // Price position adjustment
    const priceAdjustment = this.calculatePricePositionAdjustment(conditions.pricePosition);
    adjustmentFactor *= 1 + priceAdjustment;

    return baseAmount * adjustmentFactor;
  }

  /**
   * Execute a DCA order
   */
  private async executeDCAOrder(amount: number, conditions: MarketCondition): Promise<{
    success: boolean;
    tokens?: number;
    price?: number;
    fees?: number;
    slippage?: number;
    error?: string;
  }> {
    try {
      const currentPrice = await this.getCurrentPrice();

      // Calculate expected tokens (before slippage)
      const expectedTokens = amount / currentPrice;

      // Execute trade via Jupiter
      const tradeResult = await this.executeJupiterTrade(amount);

      if (tradeResult.success) {
        const actualPrice = amount / tradeResult.tokens!;
        const slippage = Math.abs(actualPrice - currentPrice) / currentPrice;

        // Create order record
        const order: DCAOrder = {
          id: `dca_${Date.now()}`,
          timestamp: Date.now(),
          amount,
          tokens: tradeResult.tokens!,
          price: actualPrice,
          fees: tradeResult.fees || 0,
          slippage,
          status: 'EXECUTED',
          reason: this.generateOrderReason(conditions)
        };

        this.orderHistory.push(order);

        // Update performance metrics
        this.updatePerformanceMetrics(order);

        return {
          success: true,
          tokens: tradeResult.tokens,
          price: actualPrice,
          fees: tradeResult.fees,
          slippage
        };
      } else {
        // Record failed order
        const failedOrder: DCAOrder = {
          id: `dca_failed_${Date.now()}`,
          timestamp: Date.now(),
          amount,
          tokens: 0,
          price: currentPrice,
          fees: 0,
          slippage: 0,
          status: 'FAILED',
          reason: tradeResult.error || 'Unknown error'
        };

        this.orderHistory.push(failedOrder);

        return {
          success: false,
          error: tradeResult.error
        };
      }

    } catch (error) {
      console.error('❌ DCA order execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if DCA should be stopped based on conditions
   */
  private async checkStopConditions(): Promise<void> {
    const currentPrice = await this.getCurrentPrice();
    const currentValue = this.totalTokens * currentPrice;
    const totalPnL = currentValue - this.totalInvested;
    const pnlPercentage = (totalPnL / this.totalInvested) * 100;

    // Stop on profit target
    if (this.config.stopOnProfit > 0 && pnlPercentage >= this.config.stopOnProfit) {
      this.isActive = false;
      console.log(`🎯 DCA stopped: Profit target reached (${pnlPercentage.toFixed(2)}%)`);
      return;
    }

    // Stop on loss limit
    if (this.config.stopOnLoss > 0 && pnlPercentage <= -this.config.stopOnLoss) {
      this.isActive = false;
      console.log(`🛑 DCA stopped: Loss limit reached (${pnlPercentage.toFixed(2)}%)`);
      return;
    }

    // Stop if max amount invested
    if (this.schedule.totalInvested >= this.schedule.maxAmount) {
      this.isActive = false;
      console.log('💰 DCA completed: Maximum amount invested');
      return;
    }

    // Stop if end date reached
    if (this.schedule.endDate && Date.now() >= this.schedule.endDate) {
      this.isActive = false;
      console.log('📅 DCA completed: End date reached');
      return;
    }
  }

  /**
   * Helper methods for calculations and analysis
   */
  private shouldExecuteOrder(): boolean {
    return Date.now() >= this.nextOrderTime && this.isActive;
  }

  private calculateNextOrderTime(): void {
    const baseInterval = this.getIntervalInMs(this.schedule.interval);

    if (this.config.smartAdjustments && this.schedule.interval === 'smart') {
      // Use market conditions to adjust timing
      // This would be implemented with more sophisticated logic
      this.nextOrderTime = this.lastOrderTime + baseInterval;
    } else {
      this.nextOrderTime = this.lastOrderTime + baseInterval;
    }

    this.lastOrderTime = this.nextOrderTime;
  }

  private getIntervalInMs(interval: string): number {
    switch (interval) {
      case 'hourly': return 60 * 60 * 1000;
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      case 'monthly': return 30 * 24 * 60 * 60 * 1000;
      case 'smart': return 24 * 60 * 60 * 1000; // Default to daily for smart
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private validateConfiguration(): { isValid: boolean; reason?: string } {
    if (this.schedule.amount <= 0) {
      return { isValid: false, reason: 'Schedule amount must be positive' };
    }

    if (this.schedule.maxAmount <= this.schedule.amount) {
      return { isValid: false, reason: 'Max amount must be greater than schedule amount' };
    }

    if (this.config.minAmount > this.config.maxAmount) {
      return { isValid: false, reason: 'Min amount cannot be greater than max amount' };
    }

    return { isValid: true };
  }

  private calculateVolatility(periods: number): number {
    if (this.priceHistory.length < periods) return 0.05; // Default volatility

    const recentPrices = this.priceHistory.slice(-periods);
    const returns = [];

    for (let i = 1; i < recentPrices.length; i++) {
      returns.push((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  private calculateTrend(): 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' {
    if (this.priceHistory.length < 20) return 'SIDEWAYS';

    const recent = this.priceHistory.slice(-20);
    const slope = this.calculateLinearRegressionSlope(recent);

    if (slope > 0.001) return 'UPTREND';
    if (slope < -0.001) return 'DOWNTREND';
    return 'SIDEWAYS';
  }

  private calculateLinearRegressionSlope(data: number[]): number {
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, y) => sum + y, 0);
    const sumXY = data.reduce((sum, y, i) => sum + i * y, 0);
    const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private calculateRSI(periods: number): number {
    if (this.priceHistory.length < periods + 1) return 50; // Neutral RSI

    const changes = [];
    for (let i = 1; i < this.priceHistory.length; i++) {
      changes.push(this.priceHistory[i] - this.priceHistory[i - 1]);
    }

    const recentChanges = changes.slice(-periods);
    const gains = recentChanges.filter(change => change > 0);
    const losses = recentChanges.filter(change => change < 0).map(loss => Math.abs(loss));

    const avgGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / gains.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, loss) => sum + loss, 0) / losses.length : 0;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateFearGreedIndex(): number {
    // Simplified fear & greed calculation based on volatility and momentum
    const volatility = this.calculateVolatility(10);
    const momentum = this.calculateMomentum(5);

    let fearGreed = 50; // Neutral

    // High volatility = more fear
    fearGreed -= volatility * 1000;

    // Positive momentum = more greed
    fearGreed += momentum * 100;

    return Math.max(0, Math.min(100, fearGreed));
  }

  private calculateAverageVolume(periods: number): number {
    if (this.volumeHistory.length < periods) return 0;

    const recentVolume = this.volumeHistory.slice(-periods);
    return recentVolume.reduce((sum, vol) => sum + vol, 0) / recentVolume.length;
  }

  private calculatePricePosition(currentPrice: number, periods: number): number {
    if (this.priceHistory.length < periods) return 0.5;

    const recentPrices = this.priceHistory.slice(-periods);
    const min = Math.min(...recentPrices);
    const max = Math.max(...recentPrices);

    if (max === min) return 0.5;

    return (currentPrice - min) / (max - min);
  }

  private calculateMomentum(periods: number): number {
    if (this.priceHistory.length < periods + 1) return 0;

    const current = this.priceHistory[this.priceHistory.length - 1];
    const past = this.priceHistory[this.priceHistory.length - 1 - periods];

    return (current - past) / past;
  }

  // Smart adjustment calculation methods
  private calculateFearGreedAdjustment(fearGreedIndex: number): number {
    // More buying during fear, less during greed
    if (fearGreedIndex < 25) return 0.2; // +20% during extreme fear
    if (fearGreedIndex < 40) return 0.1; // +10% during fear
    if (fearGreedIndex > 75) return -0.2; // -20% during greed
    if (fearGreedIndex > 60) return -0.1; // -10% during mild greed
    return 0; // No adjustment in neutral zone
  }

  private calculateVolatilityAdjustment(volatility: number): number {
    // More buying during high volatility (opportunities)
    if (volatility > 0.1) return 0.15; // +15% during high volatility
    if (volatility > 0.05) return 0.05; // +5% during medium volatility
    return 0;
  }

  private calculateTrendAdjustment(trend: string, momentum: number): number {
    if (trend === 'DOWNTREND') return 0.1; // +10% during downtrend
    if (trend === 'UPTREND' && momentum > 0.05) return -0.1; // -10% during strong uptrend
    return 0;
  }

  private calculatePricePositionAdjustment(pricePosition: number): number {
    // More buying when price is low in range
    if (pricePosition < 0.2) return 0.2; // +20% when in bottom 20%
    if (pricePosition < 0.4) return 0.1; // +10% when in bottom 40%
    if (pricePosition > 0.8) return -0.1; // -10% when in top 20%
    return 0;
  }

  private generateOrderReason(conditions: MarketCondition): string {
    const reasons = [];

    reasons.push(`Scheduled ${this.schedule.interval} DCA`);

    if (conditions.trend === 'DOWNTREND') reasons.push('Downtrend opportunity');
    if (conditions.volatility > 0.05) reasons.push('High volatility');
    if (conditions.fearGreedIndex < 40) reasons.push('Market fear');
    if (conditions.pricePosition < 0.4) reasons.push('Price in lower range');

    return reasons.join(', ');
  }

  private updateSchedule(orderResult: any): void {
    this.schedule.totalInvested += orderResult.amount || 0;
    this.schedule.totalTokens += orderResult.tokens || 0;

    if (this.schedule.totalTokens > 0) {
      this.schedule.averagePrice = this.schedule.totalInvested / this.schedule.totalTokens;
    }
  }

  private updatePerformanceMetrics(order: DCAOrder): void {
    this.totalInvested += order.amount;
    this.totalTokens += order.tokens;
    this.averageCost = this.totalInvested / this.totalTokens;
  }

  private calculateTargetValue(): number {
    // For value averaging - target portfolio value growth
    const periodsElapsed = Math.floor((Date.now() - this.schedule.startDate) / this.getIntervalInMs(this.schedule.interval));
    return this.schedule.amount * periodsElapsed * 1.02; // 2% growth target
  }

  private getCurrentPortfolioValue(): number {
    // Would calculate current portfolio value
    return this.totalTokens * (this.priceHistory[this.priceHistory.length - 1] || 0);
  }

  // Placeholder methods
  private async loadHistoricalData(): Promise<void> { }
  private async getCurrentPrice(): Promise<number> { return 0; }
  private async executeJupiterTrade(amount: number): Promise<{ success: boolean; tokens?: number; fees?: number; error?: string }> {
    return { success: true, tokens: amount / 100, fees: 0 }; // Placeholder
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    const currentPrice = this.priceHistory[this.priceHistory.length - 1] || 0;
    const currentValue = this.totalTokens * currentPrice;
    const unrealizedPnL = currentValue - this.totalInvested;
    const pnlPercentage = this.totalInvested > 0 ? (unrealizedPnL / this.totalInvested) * 100 : 0;

    return {
      totalInvested: this.totalInvested,
      totalTokens: this.totalTokens,
      averageCost: this.averageCost,
      currentValue,
      unrealizedPnL,
      pnlPercentage,
      totalOrders: this.orderHistory.length,
      successfulOrders: this.orderHistory.filter(o => o.status === 'EXECUTED').length,
      isActive: this.isActive,
      nextOrderTime: this.nextOrderTime,
      currentStrategy: this.currentStrategy
    };
  }

  /**
   * Change DCA strategy
   */
  setStrategy(strategyName: string): boolean {
    if (this.strategies.has(strategyName)) {
      this.currentStrategy = strategyName;
      console.log(`🔄 DCA strategy changed to: ${strategyName}`);
      return true;
    }
    return false;
  }

  /**
   * Pause/Resume DCA
   */
  setActive(active: boolean): void {
    this.isActive = active;
    console.log(`${active ? '▶️' : '⏸️'} DCA Bot ${active ? 'resumed' : 'paused'}`);
  }
}

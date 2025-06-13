// Personalized Trading Strategy System
import { EventEmitter } from 'events';

export interface UserProfile {
  id: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  tradingExperience: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferredTimeframes: string[];
  preferredAssets: string[];
  maxPositionSize: number;
  tradingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  goals: {
    targetReturn: number;
    timeHorizon: number; // in months
    maxDrawdown: number;
  };
  behavioralTraits: {
    impulsiveness: number; // 0-1
    lossAversion: number; // 0-1
    overconfidence: number; // 0-1
    herdMentality: number; // 0-1
  };
}

export interface TradingBehavior {
  avgHoldTime: number; // in hours
  winRate: number;
  avgWin: number;
  avgLoss: number;
  maxConsecutiveLosses: number;
  maxConsecutiveWins: number;
  tradingFrequency: number; // trades per day
  preferredMarketConditions: 'trending' | 'ranging' | 'volatile' | 'any';
  emotionalState: 'calm' | 'excited' | 'fearful' | 'greedy';
}

export interface PersonalizedStrategy {
  id: string;
  name: string;
  description: string;
  userId: string;
  baseStrategy: string; // Which AI engine to base on
  customizations: {
    entryConditions: StrategyCondition[];
    exitConditions: StrategyCondition[];
    riskManagement: RiskParameters;
    timeFilters: TimeFilter[];
    marketFilters: MarketFilter[];
  };
  performance: StrategyPerformance;
  adaptations: StrategyAdaptation[];
  lastUpdated: Date;
  isActive: boolean;
}

export interface StrategyCondition {
  id: string;
  type: 'technical' | 'fundamental' | 'sentiment' | 'time' | 'risk';
  indicator: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | 'between';
  value: number | number[];
  weight: number; // 0-1
  adaptable: boolean;
}

export interface RiskParameters {
  stopLossPercent: number;
  takeProfitPercent: number;
  positionSizing: 'fixed' | 'volatility' | 'confidence' | 'kelly';
  maxRiskPerTrade: number;
  correlationLimit: number;
  drawdownLimit: number;
}

export interface TimeFilter {
  type: 'hours' | 'days' | 'sessions';
  allowed: string[] | number[];
  timezone: string;
}

export interface MarketFilter {
  type: 'volatility' | 'volume' | 'trend' | 'sentiment';
  range: [number, number];
  required: boolean;
}

export interface StrategyPerformance {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgTrade: number;
  totalTrades: number;
  profitFactor: number;
  recentPerformance: number[]; // Last 30 days
}

export interface StrategyAdaptation {
  timestamp: Date;
  trigger: string;
  changes: Array<{
    parameter: string;
    oldValue: any;
    newValue: any;
    reason: string;
  }>;
  performanceImpact: number;
}

export interface PersonalizationInsight {
  type: 'behavioral' | 'performance' | 'market' | 'timing';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  recommendation: string;
  impact: number; // Expected improvement
  confidence: number; // 0-1
}

export class StrategyPersonalizer extends EventEmitter {
  private userProfiles: Map<string, UserProfile> = new Map();
  private personalizedStrategies: Map<string, PersonalizedStrategy> = new Map();
  private behaviorTracking: Map<string, TradingBehavior[]> = new Map();
  private adaptationEngine: AdaptationEngine;
  private behaviorAnalyzer: BehaviorAnalyzer;
  private performanceAnalyzer: PerformanceAnalyzer;

  constructor() {
    super();
    this.adaptationEngine = new AdaptationEngine();
    this.behaviorAnalyzer = new BehaviorAnalyzer();
    this.performanceAnalyzer = new PerformanceAnalyzer();
  }

  // Create personalized strategy for user
  async createPersonalizedStrategy(userId: string, baseStrategy: string): Promise<PersonalizedStrategy> {
    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const behaviorHistory = this.behaviorTracking.get(userId) || [];
    const currentBehavior = behaviorHistory[behaviorHistory.length - 1];

    // Generate base customizations based on user profile
    const customizations = await this.generateCustomizations(userProfile, currentBehavior, baseStrategy);

    const strategy: PersonalizedStrategy = {
      id: `strategy_${userId}_${Date.now()}`,
      name: `Personalized ${baseStrategy} Strategy`,
      description: `Custom strategy adapted for ${userProfile.riskTolerance} risk tolerance and ${userProfile.tradingExperience} experience level`,
      userId,
      baseStrategy,
      customizations,
      performance: {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        avgTrade: 0,
        totalTrades: 0,
        profitFactor: 1,
        recentPerformance: []
      },
      adaptations: [],
      lastUpdated: new Date(),
      isActive: true
    };

    this.personalizedStrategies.set(strategy.id, strategy);
    this.emit('strategy_created', strategy);

    return strategy;
  }

  // Generate customizations based on user profile
  private async generateCustomizations(
    profile: UserProfile,
    behavior: TradingBehavior | undefined,
    baseStrategy: string
  ): Promise<PersonalizedStrategy['customizations']> {

    // Risk management based on profile
    const riskManagement: RiskParameters = {
      stopLossPercent: this.calculateStopLoss(profile, behavior),
      takeProfitPercent: this.calculateTakeProfit(profile, behavior),
      positionSizing: this.determinePositionSizing(profile),
      maxRiskPerTrade: profile.maxPositionSize,
      correlationLimit: profile.riskTolerance === 'conservative' ? 0.3 :
                       profile.riskTolerance === 'moderate' ? 0.5 : 0.7,
      drawdownLimit: profile.goals.maxDrawdown
    };

    // Entry conditions based on experience and preferences
    const entryConditions: StrategyCondition[] = [
      {
        id: 'trend_strength',
        type: 'technical',
        indicator: 'ADX',
        operator: '>',
        value: profile.tradingExperience === 'beginner' ? 25 : 20,
        weight: 0.3,
        adaptable: true
      },
      {
        id: 'volatility_filter',
        type: 'risk',
        indicator: 'ATR_percent',
        operator: 'between',
        value: this.getVolatilityRange(profile.riskTolerance),
        weight: 0.2,
        adaptable: true
      },
      {
        id: 'volume_confirmation',
        type: 'technical',
        indicator: 'volume_sma_ratio',
        operator: '>',
        value: 1.2,
        weight: 0.15,
        adaptable: true
      }
    ];

    // Add sentiment condition for experienced traders
    if (profile.tradingExperience !== 'beginner') {
      entryConditions.push({
        id: 'sentiment_score',
        type: 'sentiment',
        indicator: 'composite_sentiment',
        operator: 'between',
        value: [-0.3, 0.7], // Avoid extreme fear or greed
        weight: 0.1,
        adaptable: true
      });
    }

    // Exit conditions
    const exitConditions: StrategyCondition[] = [
      {
        id: 'profit_target',
        type: 'risk',
        indicator: 'unrealized_pnl_percent',
        operator: '>=',
        value: riskManagement.takeProfitPercent,
        weight: 1.0,
        adaptable: false
      },
      {
        id: 'stop_loss',
        type: 'risk',
        indicator: 'unrealized_pnl_percent',
        operator: '<=',
        value: -riskManagement.stopLossPercent,
        weight: 1.0,
        adaptable: false
      }
    ];

    // Add trailing stop for aggressive traders
    if (profile.riskTolerance === 'aggressive') {
      exitConditions.push({
        id: 'trailing_stop',
        type: 'risk',
        indicator: 'trailing_stop_percent',
        operator: '<=',
        value: -0.02, // 2% trailing stop
        weight: 0.8,
        adaptable: true
      });
    }

    // Time filters based on trading hours
    const timeFilters: TimeFilter[] = [
      {
        type: 'hours',
        allowed: this.generateTradingHours(profile.tradingHours),
        timezone: profile.tradingHours.timezone
      }
    ];

    // Market filters based on preferred conditions
    const marketFilters: MarketFilter[] = [
      {
        type: 'volatility',
        range: this.getVolatilityRange(profile.riskTolerance),
        required: true
      }
    ];

    if (behavior?.preferredMarketConditions === 'trending') {
      marketFilters.push({
        type: 'trend',
        range: [0.6, 1.0], // Strong trend required
        required: true
      });
    }

    return {
      entryConditions,
      exitConditions,
      riskManagement,
      timeFilters,
      marketFilters
    };
  }

  // Continuously adapt strategies based on performance and behavior
  async adaptStrategy(strategyId: string): Promise<void> {
    const strategy = this.personalizedStrategies.get(strategyId);
    if (!strategy) return;

    const userProfile = this.userProfiles.get(strategy.userId);
    if (!userProfile) return;

    const recentBehavior = this.getRecentBehavior(strategy.userId);
    const performanceMetrics = await this.performanceAnalyzer.analyze(strategy);

    const adaptations = await this.adaptationEngine.generateAdaptations(
      strategy,
      userProfile,
      recentBehavior,
      performanceMetrics
    );

    if (adaptations.length > 0) {
      this.applyAdaptations(strategy, adaptations);
      this.emit('strategy_adapted', strategy, adaptations);
    }
  }

  // Apply adaptations to strategy
  private applyAdaptations(strategy: PersonalizedStrategy, adaptations: StrategyAdaptation[]): void {
    adaptations.forEach(adaptation => {
      adaptation.changes.forEach(change => {
        this.updateStrategyParameter(strategy, change.parameter, change.newValue);
      });
      strategy.adaptations.push(adaptation);
    });

    strategy.lastUpdated = new Date();
    this.personalizedStrategies.set(strategy.id, strategy);
  }

  // Update specific strategy parameter
  private updateStrategyParameter(strategy: PersonalizedStrategy, parameter: string, newValue: any): void {
    const [section, field, subfield] = parameter.split('.');

    switch (section) {
      case 'riskManagement':
        if (field in strategy.customizations.riskManagement) {
          (strategy.customizations.riskManagement as any)[field] = newValue;
        }
        break;
      case 'entryConditions':
        const entryCondition = strategy.customizations.entryConditions.find(c => c.id === field);
        if (entryCondition && subfield in entryCondition) {
          (entryCondition as any)[subfield] = newValue;
        }
        break;
      case 'exitConditions':
        const exitCondition = strategy.customizations.exitConditions.find(c => c.id === field);
        if (exitCondition && subfield in exitCondition) {
          (exitCondition as any)[subfield] = newValue;
        }
        break;
    }
  }

  // Generate personalization insights
  async generateInsights(userId: string): Promise<PersonalizationInsight[]> {
    const userProfile = this.userProfiles.get(userId);
    const userStrategies = Array.from(this.personalizedStrategies.values())
      .filter(s => s.userId === userId);
    const behaviorHistory = this.behaviorTracking.get(userId) || [];

    if (!userProfile || userStrategies.length === 0) {
      return [];
    }

    const insights: PersonalizationInsight[] = [];

    // Behavioral insights
    const behaviorInsights = await this.behaviorAnalyzer.generateInsights(
      userProfile,
      behaviorHistory
    );
    insights.push(...behaviorInsights);

    // Performance insights
    for (const strategy of userStrategies) {
      const performanceInsights = await this.performanceAnalyzer.generateInsights(
        strategy,
        userProfile
      );
      insights.push(...performanceInsights);
    }

    // Sort by impact and confidence
    return insights.sort((a, b) => (b.impact * b.confidence) - (a.impact * a.confidence));
  }

  // Helper methods
  private calculateStopLoss(profile: UserProfile, behavior?: TradingBehavior): number {
    let baseStopLoss = 0.02; // 2%

    switch (profile.riskTolerance) {
      case 'conservative': baseStopLoss = 0.015; break;
      case 'moderate': baseStopLoss = 0.025; break;
      case 'aggressive': baseStopLoss = 0.04; break;
    }

    // Adjust based on behavior
    if (behavior) {
      if (behavior.avgLoss > baseStopLoss * 1.5) {
        baseStopLoss *= 0.8; // Tighter stops if losses are large
      }
      if (behavior.maxConsecutiveLosses > 5) {
        baseStopLoss *= 0.9; // Tighter stops if prone to streaks
      }
    }

    return baseStopLoss;
  }

  private calculateTakeProfit(profile: UserProfile, behavior?: TradingBehavior): number {
    let baseTakeProfit = 0.04; // 4%

    switch (profile.riskTolerance) {
      case 'conservative': baseTakeProfit = 0.03; break;
      case 'moderate': baseTakeProfit = 0.05; break;
      case 'aggressive': baseTakeProfit = 0.08; break;
    }

    // Adjust based on behavior
    if (behavior) {
      const riskRewardRatio = behavior.avgWin / Math.abs(behavior.avgLoss);
      if (riskRewardRatio < 1.5) {
        baseTakeProfit *= 1.2; // Higher targets if R:R is poor
      }
    }

    return baseTakeProfit;
  }

  private determinePositionSizing(profile: UserProfile): RiskParameters['positionSizing'] {
    switch (profile.tradingExperience) {
      case 'beginner': return 'fixed';
      case 'intermediate': return 'volatility';
      case 'advanced': return 'confidence';
      case 'expert': return 'kelly';
      default: return 'fixed';
    }
  }

  private getVolatilityRange(riskTolerance: UserProfile['riskTolerance']): [number, number] {
    switch (riskTolerance) {
      case 'conservative': return [0.01, 0.03]; // 1-3% daily volatility
      case 'moderate': return [0.015, 0.05]; // 1.5-5% daily volatility
      case 'aggressive': return [0.02, 0.08]; // 2-8% daily volatility
      default: return [0.015, 0.05];
    }
  }

  private generateTradingHours(tradingHours: UserProfile['tradingHours']): string[] {
    const start = Number.parseInt(tradingHours.start.split(':')[0]);
    const end = Number.parseInt(tradingHours.end.split(':')[0]);
    const hours: string[] = [];

    for (let hour = start; hour !== end; hour = (hour + 1) % 24) {
      hours.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    return hours;
  }

  private getRecentBehavior(userId: string): TradingBehavior | undefined {
    const behaviorHistory = this.behaviorTracking.get(userId) || [];
    return behaviorHistory[behaviorHistory.length - 1];
  }

  // Public methods for updating user data
  updateUserProfile(userId: string, profile: Partial<UserProfile>): void {
    const existing = this.userProfiles.get(userId);
    if (existing) {
      this.userProfiles.set(userId, { ...existing, ...profile });
    } else {
      this.userProfiles.set(userId, profile as UserProfile);
    }
  }

  recordTradingBehavior(userId: string, behavior: TradingBehavior): void {
    const history = this.behaviorTracking.get(userId) || [];
    history.push(behavior);

    // Keep only last 30 behavior records
    if (history.length > 30) {
      history.shift();
    }

    this.behaviorTracking.set(userId, history);
  }

  updateStrategyPerformance(strategyId: string, performance: Partial<StrategyPerformance>): void {
    const strategy = this.personalizedStrategies.get(strategyId);
    if (strategy) {
      strategy.performance = { ...strategy.performance, ...performance };
      this.personalizedStrategies.set(strategyId, strategy);
    }
  }

  // Getters
  getUserStrategies(userId: string): PersonalizedStrategy[] {
    return Array.from(this.personalizedStrategies.values())
      .filter(strategy => strategy.userId === userId);
  }

  getStrategy(strategyId: string): PersonalizedStrategy | undefined {
    return this.personalizedStrategies.get(strategyId);
  }
}

// Adaptation Engine
class AdaptationEngine {
  async generateAdaptations(
    strategy: PersonalizedStrategy,
    userProfile: UserProfile,
    recentBehavior: TradingBehavior | undefined,
    performanceMetrics: any
  ): Promise<StrategyAdaptation[]> {
    const adaptations: StrategyAdaptation[] = [];

    // Check if performance is declining
    if (performanceMetrics.recentPerformance < -0.05) { // More than 5% drawdown
      adaptations.push({
        timestamp: new Date(),
        trigger: 'poor_performance',
        changes: [
          {
            parameter: 'riskManagement.stopLossPercent',
            oldValue: strategy.customizations.riskManagement.stopLossPercent,
            newValue: strategy.customizations.riskManagement.stopLossPercent * 0.8,
            reason: 'Tightening stops due to poor performance'
          }
        ],
        performanceImpact: 0.02
      });
    }

    // Adapt to changing behavior
    if (recentBehavior && recentBehavior.winRate < 0.4) {
      adaptations.push({
        timestamp: new Date(),
        trigger: 'low_win_rate',
        changes: [
          {
            parameter: 'entryConditions.trend_strength.value',
            oldValue: strategy.customizations.entryConditions.find(c => c.id === 'trend_strength')?.value,
            newValue: 25, // Require stronger trend
            reason: 'Requiring stronger signals due to low win rate'
          }
        ],
        performanceImpact: 0.03
      });
    }

    return adaptations;
  }
}

// Behavior Analyzer
class BehaviorAnalyzer {
  async generateInsights(
    userProfile: UserProfile,
    behaviorHistory: TradingBehavior[]
  ): Promise<PersonalizationInsight[]> {
    const insights: PersonalizationInsight[] = [];

    if (behaviorHistory.length === 0) return insights;

    const recent = behaviorHistory[behaviorHistory.length - 1];

    // Check for overtrading
    if (recent.tradingFrequency > 10) {
      insights.push({
        type: 'behavioral',
        title: 'Potential Overtrading Detected',
        description: `You're averaging ${recent.tradingFrequency} trades per day, which may be excessive.`,
        severity: 'warning',
        recommendation: 'Consider reducing trading frequency and focusing on higher-quality setups.',
        impact: 0.15,
        confidence: 0.8
      });
    }

    // Check for loss aversion
    if (recent.avgLoss > recent.avgWin * 2) {
      insights.push({
        type: 'behavioral',
        title: 'Loss Aversion Pattern',
        description: 'Your average losses are significantly larger than average wins.',
        severity: 'critical',
        recommendation: 'Implement stricter stop-loss rules and consider position sizing adjustments.',
        impact: 0.25,
        confidence: 0.9
      });
    }

    return insights;
  }
}

// Performance Analyzer
class PerformanceAnalyzer {
  async analyze(strategy: PersonalizedStrategy): Promise<any> {
    // Calculate recent performance metrics
    const recentReturns = strategy.performance.recentPerformance.slice(-7); // Last 7 days
    const recentPerformance = recentReturns.reduce((sum, ret) => sum + ret, 0);

    return {
      recentPerformance,
      volatility: this.calculateVolatility(recentReturns),
      sharpeRatio: strategy.performance.sharpeRatio,
      maxDrawdown: strategy.performance.maxDrawdown
    };
  }

  async generateInsights(
    strategy: PersonalizedStrategy,
    userProfile: UserProfile
  ): Promise<PersonalizationInsight[]> {
    const insights: PersonalizationInsight[] = [];

    // Check if strategy is underperforming goals
    if (strategy.performance.totalReturn < userProfile.goals.targetReturn * 0.5) {
      insights.push({
        type: 'performance',
        title: 'Strategy Underperforming Goals',
        description: `Current return of ${(strategy.performance.totalReturn * 100).toFixed(1)}% is below target.`,
        severity: 'warning',
        recommendation: 'Consider adjusting strategy parameters or switching to a more aggressive approach.',
        impact: 0.2,
        confidence: 0.7
      });
    }

    return insights;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance);
  }
}

export default StrategyPersonalizer;

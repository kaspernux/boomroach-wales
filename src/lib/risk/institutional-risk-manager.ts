// Institutional-Grade Risk Management System
import { EventEmitter } from 'events';

export interface RiskProfile {
  id: string;
  name: string;
  maxPositionSize: number;
  maxLeverage: number;
  maxDrawdown: number;
  stopLossThreshold: number;
  takeProfitThreshold: number;
  dailyVaR: number; // Value at Risk
  correlationLimit: number;
  concentrationLimit: number;
  riskBudget: number;
  timeHorizon: number; // in hours
}

export interface PortfolioRisk {
  totalExposure: number;
  leverage: number;
  var95: number; // 95% Value at Risk
  var99: number; // 99% Value at Risk
  expectedShortfall: number;
  sharpeRatio: number;
  maxDrawdown: number;
  betaToMarket: number;
  correlationMatrix: number[][];
  sectorConcentration: Record<string, number>;
  currencyExposure: Record<string, number>;
}

export interface RiskLimit {
  id: string;
  type: 'position' | 'leverage' | 'drawdown' | 'var' | 'concentration' | 'correlation';
  threshold: number;
  currentValue: number;
  utilizationPercentage: number;
  breached: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'monitor' | 'warn' | 'block' | 'liquidate';
}

export interface RiskAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  affectedPositions: string[];
  recommendedActions: string[];
  autoExecuted: boolean;
}

export interface StressTestScenario {
  id: string;
  name: string;
  description: string;
  marketShock: number; // percentage
  volatilityMultiplier: number;
  correlationIncrease: number;
  liquidityReduction: number;
  timeHorizon: number; // hours
}

export interface StressTestResult {
  scenario: StressTestScenario;
  portfolioValue: number;
  portfolioValueAfterShock: number;
  loss: number;
  lossPercentage: number;
  worstCasePositions: Array<{
    symbol: string;
    currentValue: number;
    stressedValue: number;
    loss: number;
  }>;
  liquidityRequirement: number;
  marginalVaR: Record<string, number>;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'position_limits' | 'leverage_limits' | 'concentration' | 'reporting' | 'documentation';
  enabled: boolean;
  parameters: Record<string, any>;
  violationAction: 'warn' | 'block' | 'report';
}

export interface ComplianceViolation {
  id: string;
  ruleId: string;
  timestamp: Date;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  currentValue: number;
  allowedValue: number;
  affectedEntities: string[];
  status: 'open' | 'acknowledged' | 'resolved';
  assignedTo?: string;
}

export class InstitutionalRiskManager extends EventEmitter {
  private riskProfiles: Map<string, RiskProfile> = new Map();
  private activeLimits: Map<string, RiskLimit> = new Map();
  private riskAlerts: RiskAlert[] = [];
  private complianceRules: Map<string, ComplianceRule> = new Map();
  private complianceViolations: ComplianceViolation[] = [];
  private stressTestScenarios: Map<string, StressTestScenario> = new Map();

  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  constructor() {
    super();
    this.initializeDefaultProfiles();
    this.initializeComplianceRules();
    this.initializeStressTestScenarios();
  }

  // Initialize default risk profiles
  private initializeDefaultProfiles(): void {
    const conservativeProfile: RiskProfile = {
      id: 'conservative',
      name: 'Conservative Institutional',
      maxPositionSize: 0.02, // 2% per position
      maxLeverage: 2.0,
      maxDrawdown: 0.05, // 5%
      stopLossThreshold: 0.02, // 2%
      takeProfitThreshold: 0.04, // 4%
      dailyVaR: 0.01, // 1%
      correlationLimit: 0.3,
      concentrationLimit: 0.1, // 10% in any sector
      riskBudget: 0.15, // 15% annual volatility budget
      timeHorizon: 24
    };

    const moderateProfile: RiskProfile = {
      id: 'moderate',
      name: 'Moderate Institutional',
      maxPositionSize: 0.05, // 5% per position
      maxLeverage: 3.0,
      maxDrawdown: 0.10, // 10%
      stopLossThreshold: 0.03, // 3%
      takeProfitThreshold: 0.06, // 6%
      dailyVaR: 0.02, // 2%
      correlationLimit: 0.5,
      concentrationLimit: 0.15, // 15% in any sector
      riskBudget: 0.25, // 25% annual volatility budget
      timeHorizon: 12
    };

    const aggressiveProfile: RiskProfile = {
      id: 'aggressive',
      name: 'Aggressive Institutional',
      maxPositionSize: 0.10, // 10% per position
      maxLeverage: 5.0,
      maxDrawdown: 0.20, // 20%
      stopLossThreshold: 0.05, // 5%
      takeProfitThreshold: 0.10, // 10%
      dailyVaR: 0.05, // 5%
      correlationLimit: 0.7,
      concentrationLimit: 0.25, // 25% in any sector
      riskBudget: 0.40, // 40% annual volatility budget
      timeHorizon: 6
    };

    this.riskProfiles.set('conservative', conservativeProfile);
    this.riskProfiles.set('moderate', moderateProfile);
    this.riskProfiles.set('aggressive', aggressiveProfile);
  }

  // Initialize compliance rules
  private initializeComplianceRules(): void {
    const rules: ComplianceRule[] = [
      {
        id: 'max_position_size',
        name: 'Maximum Position Size',
        description: 'Limits the maximum size of any single position',
        category: 'position_limits',
        enabled: true,
        parameters: { maxSize: 0.05 },
        violationAction: 'block'
      },
      {
        id: 'leverage_limit',
        name: 'Leverage Limit',
        description: 'Controls maximum leverage used',
        category: 'leverage_limits',
        enabled: true,
        parameters: { maxLeverage: 3.0 },
        violationAction: 'warn'
      },
      {
        id: 'sector_concentration',
        name: 'Sector Concentration Limit',
        description: 'Prevents over-concentration in any sector',
        category: 'concentration',
        enabled: true,
        parameters: { maxConcentration: 0.20 },
        violationAction: 'warn'
      },
      {
        id: 'daily_var_limit',
        name: 'Daily VaR Limit',
        description: 'Limits daily Value at Risk exposure',
        category: 'position_limits',
        enabled: true,
        parameters: { maxVaR: 0.02 },
        violationAction: 'block'
      },
      {
        id: 'correlation_limit',
        name: 'Correlation Limit',
        description: 'Limits correlation between positions',
        category: 'concentration',
        enabled: true,
        parameters: { maxCorrelation: 0.8 },
        violationAction: 'warn'
      }
    ];

    rules.forEach(rule => this.complianceRules.set(rule.id, rule));
  }

  // Initialize stress test scenarios
  private initializeStressTestScenarios(): void {
    const scenarios: StressTestScenario[] = [
      {
        id: 'market_crash',
        name: 'Market Crash (-30%)',
        description: 'Severe market downturn with 30% drop',
        marketShock: -0.30,
        volatilityMultiplier: 3.0,
        correlationIncrease: 0.3,
        liquidityReduction: 0.5,
        timeHorizon: 24
      },
      {
        id: 'flash_crash',
        name: 'Flash Crash (-15%)',
        description: 'Rapid market decline with liquidity crisis',
        marketShock: -0.15,
        volatilityMultiplier: 5.0,
        correlationIncrease: 0.5,
        liquidityReduction: 0.8,
        timeHorizon: 1
      },
      {
        id: 'volatility_spike',
        name: 'Volatility Spike',
        description: 'Extreme volatility without directional move',
        marketShock: 0.0,
        volatilityMultiplier: 4.0,
        correlationIncrease: 0.2,
        liquidityReduction: 0.3,
        timeHorizon: 6
      },
      {
        id: 'crypto_winter',
        name: 'Crypto Winter (-60%)',
        description: 'Extended crypto bear market',
        marketShock: -0.60,
        volatilityMultiplier: 2.0,
        correlationIncrease: 0.4,
        liquidityReduction: 0.7,
        timeHorizon: 168 // 1 week
      }
    ];

    scenarios.forEach(scenario => this.stressTestScenarios.set(scenario.id, scenario));
  }

  // Start real-time risk monitoring
  startMonitoring(intervalMs = 30000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performRiskCheck();
    }, intervalMs);

    this.emit('monitoring_started');
  }

  // Stop risk monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    this.emit('monitoring_stopped');
  }

  // Calculate portfolio risk metrics
  async calculatePortfolioRisk(portfolio: any[]): Promise<PortfolioRisk> {
    const totalValue = portfolio.reduce((sum, position) => sum + position.value, 0);
    const totalExposure = portfolio.reduce((sum, position) => sum + Math.abs(position.exposure), 0);

    // Calculate Value at Risk using historical simulation
    const returns = await this.getHistoricalReturns(portfolio);
    const var95 = this.calculateVaR(returns, 0.95);
    const var99 = this.calculateVaR(returns, 0.99);
    const expectedShortfall = this.calculateExpectedShortfall(returns, 0.95);

    // Calculate other risk metrics
    const leverage = totalExposure / totalValue;
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    const betaToMarket = await this.calculateBetaToMarket(portfolio);

    // Calculate concentration metrics
    const sectorConcentration = this.calculateSectorConcentration(portfolio);
    const currencyExposure = this.calculateCurrencyExposure(portfolio);
    const correlationMatrix = await this.calculateCorrelationMatrix(portfolio);

    return {
      totalExposure,
      leverage,
      var95,
      var99,
      expectedShortfall,
      sharpeRatio,
      maxDrawdown,
      betaToMarket,
      correlationMatrix,
      sectorConcentration,
      currencyExposure
    };
  }

  // Perform comprehensive risk check
  private async performRiskCheck(): Promise<void> {
    try {
      // Get current portfolio (this would come from your portfolio service)
      const portfolio = await this.getCurrentPortfolio();
      const portfolioRisk = await this.calculatePortfolioRisk(portfolio);

      // Check all risk limits
      await this.checkRiskLimits(portfolio, portfolioRisk);

      // Check compliance rules
      await this.checkCompliance(portfolio, portfolioRisk);

      // Emit risk update event
      this.emit('risk_update', { portfolio, portfolioRisk });

    } catch (error) {
      this.createAlert('error', 'Risk Check Error', `Failed to perform risk check: ${error.message}`, []);
    }
  }

  // Check risk limits against current portfolio
  private async checkRiskLimits(portfolio: any[], portfolioRisk: PortfolioRisk): Promise<void> {
    const activeProfile = this.riskProfiles.get('moderate'); // Would be dynamic based on user
    if (!activeProfile) return;

    // Check leverage limit
    const leverageLimit: RiskLimit = {
      id: 'leverage_limit',
      type: 'leverage',
      threshold: activeProfile.maxLeverage,
      currentValue: portfolioRisk.leverage,
      utilizationPercentage: (portfolioRisk.leverage / activeProfile.maxLeverage) * 100,
      breached: portfolioRisk.leverage > activeProfile.maxLeverage,
      severity: this.calculateSeverity(portfolioRisk.leverage / activeProfile.maxLeverage),
      action: portfolioRisk.leverage > activeProfile.maxLeverage * 1.2 ? 'liquidate' :
              portfolioRisk.leverage > activeProfile.maxLeverage ? 'block' : 'monitor'
    };

    // Check VaR limit
    const varLimit: RiskLimit = {
      id: 'var_limit',
      type: 'var',
      threshold: activeProfile.dailyVaR,
      currentValue: portfolioRisk.var95,
      utilizationPercentage: (portfolioRisk.var95 / activeProfile.dailyVaR) * 100,
      breached: portfolioRisk.var95 > activeProfile.dailyVaR,
      severity: this.calculateSeverity(portfolioRisk.var95 / activeProfile.dailyVaR),
      action: portfolioRisk.var95 > activeProfile.dailyVaR * 1.5 ? 'liquidate' :
              portfolioRisk.var95 > activeProfile.dailyVaR ? 'block' : 'monitor'
    };

    // Check drawdown limit
    const drawdownLimit: RiskLimit = {
      id: 'drawdown_limit',
      type: 'drawdown',
      threshold: activeProfile.maxDrawdown,
      currentValue: portfolioRisk.maxDrawdown,
      utilizationPercentage: (portfolioRisk.maxDrawdown / activeProfile.maxDrawdown) * 100,
      breached: portfolioRisk.maxDrawdown > activeProfile.maxDrawdown,
      severity: this.calculateSeverity(portfolioRisk.maxDrawdown / activeProfile.maxDrawdown),
      action: portfolioRisk.maxDrawdown > activeProfile.maxDrawdown * 1.2 ? 'liquidate' :
              portfolioRisk.maxDrawdown > activeProfile.maxDrawdown ? 'warn' : 'monitor'
    };

    // Update active limits
    this.activeLimits.set('leverage_limit', leverageLimit);
    this.activeLimits.set('var_limit', varLimit);
    this.activeLimits.set('drawdown_limit', drawdownLimit);

    // Create alerts for breached limits
    [leverageLimit, varLimit, drawdownLimit].forEach(limit => {
      if (limit.breached) {
        this.createAlert(
          limit.severity === 'critical' ? 'critical' : 'warning',
          `${limit.type.toUpperCase()} Limit Breached`,
          `${limit.type} has exceeded the allowed threshold of ${limit.threshold.toFixed(4)} with current value ${limit.currentValue.toFixed(4)}`,
          portfolio.map(p => p.symbol),
          limit.action === 'liquidate' ? ['Immediate position reduction required'] :
          limit.action === 'block' ? ['Block new positions'] : ['Monitor closely']
        );
      }
    });
  }

  // Check compliance rules
  private async checkCompliance(portfolio: any[], portfolioRisk: PortfolioRisk): Promise<void> {
    for (const [ruleId, rule] of this.complianceRules) {
      if (!rule.enabled) continue;

      try {
        const violation = await this.checkComplianceRule(rule, portfolio, portfolioRisk);
        if (violation) {
          this.complianceViolations.push(violation);
          this.emit('compliance_violation', violation);
        }
      } catch (error) {
        console.error(`Error checking compliance rule ${ruleId}:`, error);
      }
    }
  }

  // Check individual compliance rule
  private async checkComplianceRule(
    rule: ComplianceRule,
    portfolio: any[],
    portfolioRisk: PortfolioRisk
  ): Promise<ComplianceViolation | null> {
    switch (rule.id) {
      case 'max_position_size':
        const maxPosition = Math.max(...portfolio.map(p => p.size));
        if (maxPosition > rule.parameters.maxSize) {
          return {
            id: `violation_${Date.now()}`,
            ruleId: rule.id,
            timestamp: new Date(),
            severity: 'major',
            description: `Position size ${maxPosition.toFixed(4)} exceeds maximum allowed ${rule.parameters.maxSize}`,
            currentValue: maxPosition,
            allowedValue: rule.parameters.maxSize,
            affectedEntities: portfolio.filter(p => p.size > rule.parameters.maxSize).map(p => p.symbol),
            status: 'open'
          };
        }
        break;

      case 'leverage_limit':
        if (portfolioRisk.leverage > rule.parameters.maxLeverage) {
          return {
            id: `violation_${Date.now()}`,
            ruleId: rule.id,
            timestamp: new Date(),
            severity: 'major',
            description: `Portfolio leverage ${portfolioRisk.leverage.toFixed(2)} exceeds maximum allowed ${rule.parameters.maxLeverage}`,
            currentValue: portfolioRisk.leverage,
            allowedValue: rule.parameters.maxLeverage,
            affectedEntities: ['portfolio'],
            status: 'open'
          };
        }
        break;

      case 'sector_concentration':
        const maxSectorConcentration = Math.max(...Object.values(portfolioRisk.sectorConcentration));
        if (maxSectorConcentration > rule.parameters.maxConcentration) {
          return {
            id: `violation_${Date.now()}`,
            ruleId: rule.id,
            timestamp: new Date(),
            severity: 'minor',
            description: `Sector concentration ${maxSectorConcentration.toFixed(4)} exceeds maximum allowed ${rule.parameters.maxConcentration}`,
            currentValue: maxSectorConcentration,
            allowedValue: rule.parameters.maxConcentration,
            affectedEntities: Object.keys(portfolioRisk.sectorConcentration),
            status: 'open'
          };
        }
        break;

      case 'daily_var_limit':
        if (portfolioRisk.var95 > rule.parameters.maxVaR) {
          return {
            id: `violation_${Date.now()}`,
            ruleId: rule.id,
            timestamp: new Date(),
            severity: 'critical',
            description: `Daily VaR ${portfolioRisk.var95.toFixed(4)} exceeds maximum allowed ${rule.parameters.maxVaR}`,
            currentValue: portfolioRisk.var95,
            allowedValue: rule.parameters.maxVaR,
            affectedEntities: ['portfolio'],
            status: 'open'
          };
        }
        break;
    }

    return null;
  }

  // Run stress test on portfolio
  async runStressTest(portfolioId: string, scenarioId: string): Promise<StressTestResult> {
    const scenario = this.stressTestScenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Stress test scenario ${scenarioId} not found`);
    }

    const portfolio = await this.getCurrentPortfolio();
    const currentValue = portfolio.reduce((sum, pos) => sum + pos.value, 0);

    // Apply stress scenario
    const stressedPositions = portfolio.map(position => {
      const baseShock = scenario.marketShock;
      const volatilityShock = (Math.random() - 0.5) * 2 * scenario.volatilityMultiplier * 0.1;
      const totalShock = baseShock + volatilityShock;

      const stressedValue = position.value * (1 + totalShock);
      const loss = position.value - stressedValue;

      return {
        symbol: position.symbol,
        currentValue: position.value,
        stressedValue,
        loss
      };
    });

    const portfolioValueAfterShock = stressedPositions.reduce((sum, pos) => sum + pos.stressedValue, 0);
    const totalLoss = currentValue - portfolioValueAfterShock;
    const lossPercentage = (totalLoss / currentValue) * 100;

    // Calculate marginal VaR for each position
    const marginalVaR: Record<string, number> = {};
    for (const position of portfolio) {
      marginalVaR[position.symbol] = await this.calculateMarginalVaR(position, portfolio);
    }

    // Estimate liquidity requirement
    const liquidityRequirement = Math.abs(totalLoss) * scenario.liquidityReduction;

    return {
      scenario,
      portfolioValue: currentValue,
      portfolioValueAfterShock,
      loss: totalLoss,
      lossPercentage,
      worstCasePositions: stressedPositions.sort((a, b) => b.loss - a.loss).slice(0, 10),
      liquidityRequirement,
      marginalVaR
    };
  }

  // Create risk alert
  private createAlert(
    severity: 'info' | 'warning' | 'error' | 'critical',
    type: string,
    message: string,
    affectedPositions: string[],
    recommendedActions: string[] = []
  ): void {
    const alert: RiskAlert = {
      id: `alert_${Date.now()}`,
      timestamp: new Date(),
      severity,
      type,
      message,
      affectedPositions,
      recommendedActions,
      autoExecuted: false
    };

    this.riskAlerts.push(alert);
    this.emit('risk_alert', alert);

    // Auto-execute critical actions if configured
    if (severity === 'critical' && recommendedActions.length > 0) {
      this.executeEmergencyActions(alert);
    }
  }

  // Execute emergency risk management actions
  private async executeEmergencyActions(alert: RiskAlert): Promise<void> {
    try {
      // This would integrate with your trading system
      for (const action of alert.recommendedActions) {
        if (action.includes('Immediate position reduction')) {
          await this.reducePositions(alert.affectedPositions, 0.5); // Reduce by 50%
        } else if (action.includes('Block new positions')) {
          await this.blockNewPositions(alert.affectedPositions);
        }
      }

      alert.autoExecuted = true;
      this.emit('emergency_action_executed', alert);
    } catch (error) {
      console.error('Failed to execute emergency actions:', error);
    }
  }

  // Helper methods
  private calculateSeverity(ratio: number): 'low' | 'medium' | 'high' | 'critical' {
    if (ratio >= 1.2) return 'critical';
    if (ratio >= 1.0) return 'high';
    if (ratio >= 0.8) return 'medium';
    return 'low';
  }

  private async getCurrentPortfolio(): Promise<any[]> {
    // This would integrate with your portfolio service
    // Placeholder implementation
    return [
      { symbol: 'SOL/USDC', value: 10000, size: 0.05, exposure: 50000, sector: 'Layer1' },
      { symbol: 'ETH/USDC', value: 15000, size: 0.08, exposure: 75000, sector: 'Layer1' },
      { symbol: 'BTC/USDC', value: 20000, size: 0.10, exposure: 40000, sector: 'Store of Value' }
    ];
  }

  private async getHistoricalReturns(portfolio: any[]): Promise<number[]> {
    // Placeholder - would fetch real historical data
    return Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.1); // Daily returns
  }

  private calculateVaR(returns: number[], confidence: number): number {
    const sortedReturns = returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * returns.length);
    return Math.abs(sortedReturns[index] || 0);
  }

  private calculateExpectedShortfall(returns: number[], confidence: number): number {
    const sortedReturns = returns.sort((a, b) => a - b);
    const cutoffIndex = Math.floor((1 - confidence) * returns.length);
    const tailReturns = sortedReturns.slice(0, cutoffIndex);
    return Math.abs(tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length || 0);
  }

  private calculateSharpeRatio(returns: number[]): number {
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    return volatility > 0 ? avgReturn / volatility : 0;
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let maxDrawdown = 0;
    let peak = 1;
    let cumulative = 1;

    for (const ret of returns) {
      cumulative *= (1 + ret);
      if (cumulative > peak) peak = cumulative;
      const drawdown = (peak - cumulative) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private async calculateBetaToMarket(portfolio: any[]): Promise<number> {
    // Placeholder - would calculate actual beta against market index
    return 1.2;
  }

  private calculateSectorConcentration(portfolio: any[]): Record<string, number> {
    const totalValue = portfolio.reduce((sum, pos) => sum + pos.value, 0);
    const sectorValues: Record<string, number> = {};

    portfolio.forEach(pos => {
      if (!sectorValues[pos.sector]) sectorValues[pos.sector] = 0;
      sectorValues[pos.sector] += pos.value;
    });

    const concentration: Record<string, number> = {};
    Object.keys(sectorValues).forEach(sector => {
      concentration[sector] = sectorValues[sector] / totalValue;
    });

    return concentration;
  }

  private calculateCurrencyExposure(portfolio: any[]): Record<string, number> {
    // Placeholder - would calculate actual currency exposure
    return { USD: 0.6, SOL: 0.3, ETH: 0.1 };
  }

  private async calculateCorrelationMatrix(portfolio: any[]): Promise<number[][]> {
    // Placeholder - would calculate actual correlation matrix
    const size = portfolio.length;
    const matrix: number[][] = [];
    for (let i = 0; i < size; i++) {
      matrix[i] = [];
      for (let j = 0; j < size; j++) {
        matrix[i][j] = i === j ? 1 : Math.random() * 0.8;
      }
    }
    return matrix;
  }

  private async calculateMarginalVaR(position: any, portfolio: any[]): Promise<number> {
    // Placeholder - would calculate actual marginal VaR
    return position.value * 0.02; // 2% of position value
  }

  private async reducePositions(symbols: string[], reductionPercentage: number): Promise<void> {
    // Placeholder - would integrate with trading system
    console.log(`Reducing positions ${symbols.join(', ')} by ${reductionPercentage * 100}%`);
  }

  private async blockNewPositions(symbols: string[]): Promise<void> {
    // Placeholder - would block new position creation
    console.log(`Blocking new positions for ${symbols.join(', ')}`);
  }

  // Public getters
  getRiskProfiles(): RiskProfile[] {
    return Array.from(this.riskProfiles.values());
  }

  getActiveLimits(): RiskLimit[] {
    return Array.from(this.activeLimits.values());
  }

  getRiskAlerts(): RiskAlert[] {
    return this.riskAlerts.slice(-100); // Return last 100 alerts
  }

  getComplianceViolations(): ComplianceViolation[] {
    return this.complianceViolations.filter(v => v.status === 'open');
  }

  getStressTestScenarios(): StressTestScenario[] {
    return Array.from(this.stressTestScenarios.values());
  }
}

export default InstitutionalRiskManager;

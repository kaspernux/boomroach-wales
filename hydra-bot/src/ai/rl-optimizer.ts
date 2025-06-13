import * as tf from '@tensorflow/tfjs-node';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';

interface RLEnvironment {
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
  done: boolean;
  info: any;
}

interface StrategyPerformance {
  returns: number[];
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgTrade: number;
  volatility: number;
  profitFactor: number;
}

interface OptimizationConfig {
  episodes: number;
  maxStepsPerEpisode: number;
  learningRate: number;
  gamma: number; // Discount factor
  epsilon: number; // Exploration rate
  epsilonDecay: number;
  batchSize: number;
  memorySize: number;
  updateFreq: number;
}

export class ReinforcementLearningOptimizer {
  private model: tf.LayersModel;
  private targetModel: tf.LayersModel;
  private memory: RLEnvironment[] = [];
  private config: OptimizationConfig;
  private stateSize = 50; // Market features + portfolio state
  private actionSize = 21; // -10 to +10 position adjustments

  constructor(config: OptimizationConfig) {
    this.config = config;
    this.initializeModels();
  }

  /**
   * Initialize the deep Q-network models
   */
  private initializeModels(): void {
    // Main Q-network
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [this.stateSize],
          units: 256,
          activation: 'relu',
          kernelInitializer: 'glorotUniform'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 128,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: this.actionSize,
          activation: 'linear'
        })
      ]
    });

    // Target network (for stable training)
    this.targetModel = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [this.stateSize],
          units: 256,
          activation: 'relu',
          kernelInitializer: 'glorotUniform'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 128,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: this.actionSize,
          activation: 'linear'
        })
      ]
    });

    // Compile models
    const optimizer = tf.train.adam(this.config.learningRate);
    this.model.compile({
      optimizer,
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    this.targetModel.compile({
      optimizer,
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    // Initialize target model with same weights
    this.updateTargetModel();
  }

  /**
   * Optimize strategy parameters using reinforcement learning
   */
  async optimizeStrategy(
    engineId: string,
    marketData: number[][],
    initialParams: any
  ): Promise<{
    optimizedParams: any;
    performance: StrategyPerformance;
    trainingHistory: any[];
    convergenceMetrics: any;
  }> {
    console.log(`🧠 Starting RL optimization for ${engineId}...`);

    const trainingHistory: any[] = [];
    let bestParams = { ...initialParams };
    let bestPerformance = Number.NEGATIVE_INFINITY;

    // Create trading environment
    const environment = new TradingEnvironment(marketData, initialParams);

    for (let episode = 0; episode < this.config.episodes; episode++) {
      let state = environment.reset();
      let totalReward = 0;
      let steps = 0;

      while (steps < this.config.maxStepsPerEpisode) {
        // Choose action using epsilon-greedy policy
        const action = await this.chooseAction(state, episode);

        // Execute action in environment
        const { nextState, reward, done, info } = environment.step(action);

        // Store experience in replay buffer
        this.remember(state, action, reward, nextState, done);

        // Train the model
        if (this.memory.length > this.config.batchSize && steps % 4 === 0) {
          await this.replay();
        }

        // Update target model periodically
        if (steps % this.config.updateFreq === 0) {
          this.updateTargetModel();
        }

        state = nextState;
        totalReward += reward;
        steps++;

        if (done) break;
      }

      // Evaluate current strategy
      const performance = environment.getPerformance();
      const compositeScore = this.calculateCompositeScore(performance);

      if (compositeScore > bestPerformance) {
        bestPerformance = compositeScore;
        bestParams = environment.getCurrentParams();
      }

      // Log progress
      if (episode % 100 === 0) {
        console.log(`Episode ${episode}: Reward=${totalReward.toFixed(2)}, Score=${compositeScore.toFixed(3)}`);
      }

      trainingHistory.push({
        episode,
        totalReward,
        performance,
        compositeScore,
        epsilon: this.getCurrentEpsilon(episode),
        steps
      });

      // Decay exploration rate
      this.decayEpsilon(episode);
    }

    const convergenceMetrics = this.analyzeConvergence(trainingHistory);

    console.log(`✅ RL optimization completed for ${engineId}`);
    console.log(`Best composite score: ${bestPerformance.toFixed(3)}`);

    return {
      optimizedParams: bestParams,
      performance: environment.getPerformance(),
      trainingHistory,
      convergenceMetrics
    };
  }

  /**
   * Choose action using epsilon-greedy policy with neural network
   */
  private async chooseAction(state: number[], episode: number): Promise<number> {
    const epsilon = this.getCurrentEpsilon(episode);

    if (Math.random() < epsilon) {
      // Exploration: random action
      return Math.floor(Math.random() * this.actionSize);
    } else {
      // Exploitation: use neural network
      const stateTensor = tf.tensor2d([state]);
      const qValues = this.model.predict(stateTensor) as tf.Tensor;
      const action = tf.argMax(qValues, 1).dataSync()[0];

      stateTensor.dispose();
      qValues.dispose();

      return action;
    }
  }

  /**
   * Store experience in replay buffer
   */
  private remember(
    state: number[],
    action: number,
    reward: number,
    nextState: number[],
    done: boolean
  ): void {
    this.memory.push({
      state,
      action,
      reward,
      nextState,
      done,
      info: {}
    });

    // Keep memory size manageable
    if (this.memory.length > this.config.memorySize) {
      this.memory.shift();
    }
  }

  /**
   * Train the neural network using experience replay
   */
  private async replay(): Promise<void> {
    if (this.memory.length < this.config.batchSize) return;

    // Sample random batch from memory
    const batch = this.sampleBatch();

    const states = batch.map(exp => exp.state);
    const nextStates = batch.map(exp => exp.nextState);

    // Get current Q-values
    const currentQs = this.model.predict(tf.tensor2d(states)) as tf.Tensor;

    // Get future Q-values from target model
    const futureQs = this.targetModel.predict(tf.tensor2d(nextStates)) as tf.Tensor;

    const targetQs = await currentQs.array() as number[][];
    const futureQsArray = await futureQs.array() as number[][];

    // Update Q-values using Bellman equation
    for (let i = 0; i < batch.length; i++) {
      const experience = batch[i];
      let target = experience.reward;

      if (!experience.done) {
        target += this.config.gamma * Math.max(...futureQsArray[i]);
      }

      targetQs[i][experience.action] = target;
    }

    // Train the model
    await this.model.fit(
      tf.tensor2d(states),
      tf.tensor2d(targetQs),
      {
        epochs: 1,
        verbose: 0,
        batchSize: this.config.batchSize
      }
    );

    // Clean up tensors
    currentQs.dispose();
    futureQs.dispose();
  }

  /**
   * Sample random batch from replay buffer
   */
  private sampleBatch(): RLEnvironment[] {
    const batch: RLEnvironment[] = [];
    const indices = new Set<number>();

    while (indices.size < this.config.batchSize) {
      indices.add(Math.floor(Math.random() * this.memory.length));
    }

    indices.forEach(index => {
      batch.push(this.memory[index]);
    });

    return batch;
  }

  /**
   * Update target model with current model weights
   */
  private updateTargetModel(): void {
    const weights = this.model.getWeights();
    this.targetModel.setWeights(weights);
  }

  /**
   * Calculate composite performance score
   */
  private calculateCompositeScore(performance: StrategyPerformance): number {
    // Weighted composite score
    const weights = {
      sharpeRatio: 0.3,
      returns: 0.25,
      maxDrawdown: 0.2,
      winRate: 0.15,
      profitFactor: 0.1
    };

    return (
      performance.sharpeRatio * weights.sharpeRatio +
      Math.max(0, performance.returns.reduce((a, b) => a + b, 0)) * weights.returns +
      (1 + performance.maxDrawdown) * weights.maxDrawdown + // Invert drawdown
      performance.winRate * weights.winRate +
      Math.min(performance.profitFactor, 3) * weights.profitFactor // Cap profit factor
    );
  }

  /**
   * Get current exploration rate
   */
  private getCurrentEpsilon(episode: number): number {
    return Math.max(
      0.01,
      this.config.epsilon * Math.pow(this.config.epsilonDecay, episode)
    );
  }

  /**
   * Decay exploration rate
   */
  private decayEpsilon(episode: number): void {
    // Already handled in getCurrentEpsilon
  }

  /**
   * Analyze training convergence
   */
  private analyzeConvergence(history: any[]): any {
    if (history.length < 100) return { converged: false };

    // Check if performance has stabilized in last 20% of episodes
    const recentHistory = history.slice(-Math.floor(history.length * 0.2));
    const recentScores = recentHistory.map(h => h.compositeScore);

    const mean = recentScores.reduce((a, b) => a + b) / recentScores.length;
    const variance = recentScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / recentScores.length;
    const stdDev = Math.sqrt(variance);

    const isConverged = stdDev < 0.1; // Convergence threshold

    return {
      converged: isConverged,
      finalScore: mean,
      stability: 1 / (1 + stdDev),
      convergenceEpisode: this.findConvergencePoint(history),
      totalImprovement: history[history.length - 1].compositeScore - history[0].compositeScore
    };
  }

  /**
   * Find the episode where convergence occurred
   */
  private findConvergencePoint(history: any[]): number {
    const windowSize = 50;
    const threshold = 0.05;

    for (let i = windowSize; i < history.length - windowSize; i++) {
      const window = history.slice(i - windowSize, i + windowSize);
      const scores = window.map(h => h.compositeScore);
      const variance = this.calculateVariance(scores);

      if (variance < threshold) {
        return i;
      }
    }

    return history.length;
  }

  /**
   * Calculate variance of an array
   */
  private calculateVariance(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b) / arr.length;
    return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  }

  /**
   * Save the trained model
   */
  async saveModel(path: string): Promise<void> {
    await this.model.save(`file://${path}`);
  }

  /**
   * Load a pre-trained model
   */
  async loadModel(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}`);
  }
}

/**
 * Trading environment for RL training
 */
class TradingEnvironment {
  private marketData: number[][];
  private currentStep = 0;
  private initialCapital = 10000;
  private capital: number;
  private position = 0;
  private params: any;
  private trades: any[] = [];
  private portfolioValues: number[] = [];

  constructor(marketData: number[][], params: any) {
    this.marketData = marketData;
    this.params = { ...params };
    this.capital = this.initialCapital;
    this.portfolioValues = [this.initialCapital];
  }

  reset(): number[] {
    this.currentStep = 0;
    this.capital = this.initialCapital;
    this.position = 0;
    this.trades = [];
    this.portfolioValues = [this.initialCapital];
    return this.getState();
  }

  step(action: number): {
    nextState: number[];
    reward: number;
    done: boolean;
    info: any;
  } {
    if (this.currentStep >= this.marketData.length - 1) {
      return {
        nextState: this.getState(),
        reward: 0,
        done: true,
        info: {}
      };
    }

    const currentPrice = this.marketData[this.currentStep][0]; // Assuming price is first column
    const nextPrice = this.marketData[this.currentStep + 1][0];

    // Convert action to position change (-10 to +10)
    const positionChange = (action - 10) / 10; // Normalize to -1 to +1

    // Execute trade
    const reward = this.executeTrade(positionChange, currentPrice, nextPrice);

    this.currentStep++;
    const portfolioValue = this.capital + (this.position * nextPrice);
    this.portfolioValues.push(portfolioValue);

    return {
      nextState: this.getState(),
      reward,
      done: this.currentStep >= this.marketData.length - 1,
      info: { portfolioValue, position: this.position }
    };
  }

  private executeTrade(positionChange: number, currentPrice: number, nextPrice: number): number {
    const maxPositionValue = this.capital * 0.95; // Max 95% of capital
    const targetPositionValue = maxPositionValue * positionChange;
    const targetPosition = targetPositionValue / currentPrice;

    const actualPositionChange = targetPosition - this.position;
    const tradeValue = Math.abs(actualPositionChange * currentPrice);
    const fee = tradeValue * 0.001; // 0.1% trading fee

    if (Math.abs(tradeValue) > this.capital * 0.01) { // Minimum trade size
      this.position = targetPosition;
      this.capital -= fee;

      this.trades.push({
        step: this.currentStep,
        price: currentPrice,
        positionChange: actualPositionChange,
        fee
      });
    }

    // Calculate reward based on profit/loss
    const pnl = this.position * (nextPrice - currentPrice);
    const portfolioReturn = pnl / this.initialCapital;

    // Risk-adjusted reward
    const volatility = this.calculateRecentVolatility();
    const sharpeReward = portfolioReturn / (volatility + 0.001);

    return sharpeReward;
  }

  private calculateRecentVolatility(): number {
    const window = 20;
    const start = Math.max(0, this.currentStep - window);
    const prices = this.marketData.slice(start, this.currentStep + 1).map(d => d[0]);

    if (prices.length < 2) return 0.02; // Default volatility

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  private getState(): number[] {
    const state: number[] = [];

    // Market features (last 20 prices normalized)
    const priceWindow = 20;
    const startIdx = Math.max(0, this.currentStep - priceWindow + 1);
    const prices = this.marketData.slice(startIdx, this.currentStep + 1).map(d => d[0]);

    // Normalize prices
    if (prices.length > 0) {
      const basePrice = prices[0];
      prices.forEach(price => {
        state.push((price - basePrice) / basePrice);
      });
    }

    // Pad if necessary
    while (state.length < priceWindow) {
      state.unshift(0);
    }

    // Portfolio state
    const currentPrice = this.marketData[this.currentStep][0];
    const portfolioValue = this.capital + (this.position * currentPrice);

    state.push(
      this.capital / this.initialCapital, // Cash ratio
      (this.position * currentPrice) / this.initialCapital, // Position ratio
      portfolioValue / this.initialCapital, // Total portfolio ratio
      this.trades.length / 100, // Trade frequency
      this.calculateRecentVolatility() * 100, // Volatility
      this.currentStep / this.marketData.length // Time progress
    );

    // Technical indicators
    state.push(
      ...this.calculateTechnicalIndicators()
    );

    // Ensure state is exactly the right size
    while (state.length < 50) {
      state.push(0);
    }

    return state.slice(0, 50);
  }

  private calculateTechnicalIndicators(): number[] {
    const window = Math.min(14, this.currentStep + 1);
    const prices = this.marketData.slice(
      Math.max(0, this.currentStep - window + 1),
      this.currentStep + 1
    ).map(d => d[0]);

    if (prices.length < 2) {
      return new Array(24).fill(0); // Return zeros if insufficient data
    }

    // Moving averages
    const sma5 = prices.slice(-5).reduce((a, b) => a + b) / Math.min(5, prices.length);
    const sma10 = prices.slice(-10).reduce((a, b) => a + b) / Math.min(10, prices.length);
    const sma20 = prices.slice(-20).reduce((a, b) => a + b) / Math.min(20, prices.length);

    const currentPrice = prices[prices.length - 1];

    // RSI calculation
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const gains = changes.filter(c => c > 0);
    const losses = changes.filter(c => c < 0).map(c => Math.abs(c));

    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b) / gains.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b) / losses.length : 1;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Bollinger Bands
    const sma = prices.reduce((a, b) => a + b) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    const upperBand = sma + (2 * stdDev);
    const lowerBand = sma - (2 * stdDev);
    const bbPosition = (currentPrice - lowerBand) / (upperBand - lowerBand);

    return [
      // Moving average ratios
      currentPrice / sma5 - 1,
      currentPrice / sma10 - 1,
      currentPrice / sma20 - 1,
      sma5 / sma10 - 1,
      sma10 / sma20 - 1,

      // Momentum indicators
      (rsi - 50) / 50, // Normalized RSI
      bbPosition - 0.5, // Centered BB position

      // Volatility measures
      stdDev / currentPrice, // Price volatility
      Math.log(prices[prices.length - 1] / prices[0]), // Log return

      // Volume indicators (if available)
      ...new Array(15).fill(0) // Placeholder for additional indicators
    ];
  }

  getPerformance(): StrategyPerformance {
    if (this.portfolioValues.length < 2) {
      return {
        returns: [0],
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        avgTrade: 0,
        volatility: 0,
        profitFactor: 1
      };
    }

    const returns = [];
    for (let i = 1; i < this.portfolioValues.length; i++) {
      returns.push((this.portfolioValues[i] - this.portfolioValues[i - 1]) / this.portfolioValues[i - 1]);
    }

    const totalReturn = (this.portfolioValues[this.portfolioValues.length - 1] - this.initialCapital) / this.initialCapital;
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;

    // Maximum drawdown
    let maxDrawdown = 0;
    let peak = this.portfolioValues[0];

    for (const value of this.portfolioValues) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Win rate
    const winningTrades = returns.filter(r => r > 0).length;
    const winRate = returns.length > 0 ? winningTrades / returns.length : 0;

    // Profit factor
    const profits = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
    const losses = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
    const profitFactor = losses > 0 ? profits / losses : profits > 0 ? 2 : 1;

    return {
      returns,
      sharpeRatio: sharpeRatio * Math.sqrt(252), // Annualized
      maxDrawdown,
      winRate,
      avgTrade: returns.reduce((a, b) => a + b, 0) / Math.max(returns.length, 1),
      volatility: volatility * Math.sqrt(252), // Annualized
      profitFactor
    };
  }

  getCurrentParams(): any {
    return { ...this.params };
  }
}

import * as tf from '@tensorflow/tfjs-node';

interface State {
  marketData: number[];
  portfolioState: number[];
  strategyParameters: number[];
  performanceMetrics: number[];
  timestamp: number;
}

interface Action {
  parameterAdjustments: number[];
  positionSizing: number;
  riskLevel: number;
  strategyWeights: number[];
}

interface Reward {
  profit: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  riskAdjustedReturn: number;
}

interface Experience {
  state: State;
  action: Action;
  reward: number;
  nextState: State;
  done: boolean;
  timestamp: number;
}

interface RLConfig {
  learningRate: number;
  gamma: number; // Discount factor
  epsilon: number; // Exploration rate
  epsilonDecay: number;
  minEpsilon: number;
  batchSize: number;
  memorySize: number;
  targetUpdateFreq: number;
  rewardWindow: number;
}

export class ReinforcementLearningOptimizer {
  private config: RLConfig;
  private qNetwork: tf.LayersModel;
  private targetNetwork: tf.LayersModel;
  private memory: Experience[] = [];
  private epsilon: number;

  // State and action dimensions
  private stateDim = 50; // Market data + portfolio + parameters + metrics
  private actionDim = 20; // Parameter adjustments + position sizing + risk + weights

  // Performance tracking
  private totalReward = 0;
  private episodeCount = 0;
  private bestReward = Number.NEGATIVE_INFINITY;
  private rewardHistory: number[] = [];

  // Strategy optimization
  private optimizedParameters: Map<string, number[]> = new Map();
  private performanceHistory: Map<string, number[]> = new Map();

  constructor(config: RLConfig) {
    this.config = config;
    this.epsilon = config.epsilon;
    this.initializeNetworks();
  }

  /**
   * Initialize the Q-network and target network
   */
  private initializeNetworks(): void {
    // Q-Network architecture
    this.qNetwork = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [this.stateDim], units: 256, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ units: this.actionDim, activation: 'linear' })
      ]
    });

    // Target network (copy of Q-network)
    this.targetNetwork = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [this.stateDim], units: 256, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ units: this.actionDim, activation: 'linear' })
      ]
    });

    // Compile networks
    this.qNetwork.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'meanSquaredError'
    });

    this.targetNetwork.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'meanSquaredError'
    });

    // Initialize target network with same weights as Q-network
    this.updateTargetNetwork();
  }

  /**
   * Optimize strategy parameters using reinforcement learning
   */
  async optimizeStrategy(
    strategyName: string,
    currentState: State,
    currentPerformance: Reward
  ): Promise<{
    optimizedParameters: number[];
    expectedImprovement: number;
    confidence: number;
    action: Action;
  }> {
    // Store current experience if we have previous state/action
    if (this.memory.length > 0) {
      const lastExperience = this.memory[this.memory.length - 1];
      if (!lastExperience.done) {
        // Calculate reward based on performance improvement
        const reward = this.calculateReward(currentPerformance);

        // Update the last experience with reward and next state
        lastExperience.reward = reward;
        lastExperience.nextState = currentState;
        lastExperience.done = false;
      }
    }

    // Choose action (parameter adjustments)
    const action = await this.chooseAction(currentState);

    // Create new experience
    const experience: Experience = {
      state: currentState,
      action,
      reward: 0, // Will be filled in next iteration
      nextState: currentState, // Will be updated
      done: false,
      timestamp: Date.now()
    };

    // Add to memory
    this.addToMemory(experience);

    // Train the network if we have enough experiences
    if (this.memory.length >= this.config.batchSize) {
      await this.trainNetwork();
    }

    // Update target network periodically
    if (this.episodeCount % this.config.targetUpdateFreq === 0) {
      this.updateTargetNetwork();
    }

    // Calculate expected improvement
    const expectedImprovement = await this.estimateImprovement(currentState, action);

    // Store optimized parameters
    this.optimizedParameters.set(strategyName, action.parameterAdjustments);

    return {
      optimizedParameters: action.parameterAdjustments,
      expectedImprovement,
      confidence: 1 - this.epsilon, // Confidence inversely related to exploration
      action
    };
  }

  /**
   * Choose action using epsilon-greedy policy
   */
  private async chooseAction(state: State): Promise<Action> {
    if (Math.random() < this.epsilon) {
      // Exploration: random action
      return this.getRandomAction();
    } else {
      // Exploitation: best action from Q-network
      return await this.getBestAction(state);
    }
  }

  /**
   * Get best action from Q-network
   */
  private async getBestAction(state: State): Promise<Action> {
    const stateTensor = tf.tensor2d([this.stateToArray(state)]);
    const qValues = this.qNetwork.predict(stateTensor) as tf.Tensor;
    const qValuesArray = await qValues.data();

    stateTensor.dispose();
    qValues.dispose();

    return this.arrayToAction(Array.from(qValuesArray));
  }

  /**
   * Get random action for exploration
   */
  private getRandomAction(): Action {
    const parameterAdjustments = Array.from(
      { length: 10 },
      () => (Math.random() - 0.5) * 0.2 // ±10% parameter adjustments
    );

    return {
      parameterAdjustments,
      positionSizing: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
      riskLevel: Math.random() * 0.3 + 0.1, // 0.1 to 0.4
      strategyWeights: this.generateRandomWeights(8) // For 8 strategies
    };
  }

  /**
   * Generate random weights that sum to 1
   */
  private generateRandomWeights(count: number): number[] {
    const weights = Array.from({ length: count }, () => Math.random());
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / sum);
  }

  /**
   * Train the Q-network using experience replay
   */
  private async trainNetwork(): Promise<void> {
    // Sample random batch from memory
    const batch = this.sampleBatch();

    const states = batch.map(exp => this.stateToArray(exp.state));
    const nextStates = batch.map(exp => this.stateToArray(exp.nextState));

    const statesTensor = tf.tensor2d(states);
    const nextStatesTensor = tf.tensor2d(nextStates);

    // Get current Q-values
    const currentQValues = this.qNetwork.predict(statesTensor) as tf.Tensor;

    // Get next Q-values from target network
    const nextQValues = this.targetNetwork.predict(nextStatesTensor) as tf.Tensor;

    const currentQValuesArray = await currentQValues.data();
    const nextQValuesArray = await nextQValues.data();

    // Calculate target Q-values
    const targetQValues = Array.from(currentQValuesArray);

    for (let i = 0; i < batch.length; i++) {
      const experience = batch[i];
      const actionIndex = this.getActionIndex(experience.action);

      if (experience.done) {
        targetQValues[i * this.actionDim + actionIndex] = experience.reward;
      } else {
        const maxNextQ = Math.max(
          ...Array.from(nextQValuesArray.slice(i * this.actionDim, (i + 1) * this.actionDim))
        );
        targetQValues[i * this.actionDim + actionIndex] =
          experience.reward + this.config.gamma * maxNextQ;
      }
    }

    const targetTensor = tf.tensor2d(targetQValues, [batch.length, this.actionDim]);

    // Train the network
    await this.qNetwork.fit(statesTensor, targetTensor, {
      epochs: 1,
      verbose: 0
    });

    // Cleanup
    statesTensor.dispose();
    nextStatesTensor.dispose();
    currentQValues.dispose();
    nextQValues.dispose();
    targetTensor.dispose();

    // Decay epsilon
    this.epsilon = Math.max(
      this.config.minEpsilon,
      this.epsilon * this.config.epsilonDecay
    );
  }

  /**
   * Sample random batch from memory
   */
  private sampleBatch(): Experience[] {
    const batch: Experience[] = [];
    const memorySize = this.memory.length;

    for (let i = 0; i < Math.min(this.config.batchSize, memorySize); i++) {
      const randomIndex = Math.floor(Math.random() * memorySize);
      batch.push(this.memory[randomIndex]);
    }

    return batch;
  }

  /**
   * Update target network weights
   */
  private updateTargetNetwork(): void {
    const qWeights = this.qNetwork.getWeights();
    this.targetNetwork.setWeights(qWeights);
  }

  /**
   * Calculate reward based on performance metrics
   */
  private calculateReward(performance: Reward): number {
    // Multi-objective reward function
    const profitWeight = 0.4;
    const sharpeWeight = 0.3;
    const drawdownWeight = 0.2;
    const volatilityWeight = 0.1;

    // Normalize metrics
    const normalizedProfit = Math.tanh(performance.profit / 1000); // Normalize profit
    const normalizedSharpe = Math.tanh(performance.sharpeRatio / 2);
    const normalizedDrawdown = -Math.tanh(performance.maxDrawdown / 0.2); // Negative because we want to minimize
    const normalizedVolatility = -Math.tanh(performance.volatility / 0.1); // Negative because we want to minimize

    const reward = (
      normalizedProfit * profitWeight +
      normalizedSharpe * sharpeWeight +
      normalizedDrawdown * drawdownWeight +
      normalizedVolatility * volatilityWeight
    );

    this.totalReward += reward;
    this.rewardHistory.push(reward);

    if (reward > this.bestReward) {
      this.bestReward = reward;
    }

    return reward;
  }

  /**
   * Add experience to memory
   */
  private addToMemory(experience: Experience): void {
    this.memory.push(experience);

    // Remove old experiences if memory is full
    if (this.memory.length > this.config.memorySize) {
      this.memory.shift();
    }
  }

  /**
   * Convert state object to array for neural network
   */
  private stateToArray(state: State): number[] {
    return [
      ...state.marketData.slice(0, 20), // First 20 market indicators
      ...state.portfolioState.slice(0, 10), // Portfolio metrics
      ...state.strategyParameters.slice(0, 15), // Strategy parameters
      ...state.performanceMetrics.slice(0, 5) // Performance metrics
    ];
  }

  /**
   * Convert action array to action object
   */
  private arrayToAction(actionArray: number[]): Action {
    return {
      parameterAdjustments: actionArray.slice(0, 10),
      positionSizing: Math.max(0.1, Math.min(1.0, actionArray[10])),
      riskLevel: Math.max(0.01, Math.min(0.5, actionArray[11])),
      strategyWeights: this.normalizeWeights(actionArray.slice(12, 20))
    };
  }

  /**
   * Normalize weights to sum to 1
   */
  private normalizeWeights(weights: number[]): number[] {
    const sum = weights.reduce((a, b) => a + Math.abs(b), 0);
    return weights.map(w => Math.abs(w) / sum);
  }

  /**
   * Get action index for Q-value update
   */
  private getActionIndex(action: Action): number {
    // Simplified action index based on dominant parameter adjustment
    const maxAdjustment = Math.max(...action.parameterAdjustments.map(Math.abs));
    return action.parameterAdjustments.findIndex(adj => Math.abs(adj) === maxAdjustment);
  }

  /**
   * Estimate improvement from taking an action
   */
  private async estimateImprovement(state: State, action: Action): Promise<number> {
    const stateTensor = tf.tensor2d([this.stateToArray(state)]);
    const qValues = this.qNetwork.predict(stateTensor) as tf.Tensor;
    const qValuesArray = await qValues.data();

    stateTensor.dispose();
    qValues.dispose();

    const actionIndex = this.getActionIndex(action);
    const expectedQValue = qValuesArray[actionIndex];

    // Convert Q-value to improvement percentage
    return Math.tanh(expectedQValue) * 0.1; // Max 10% improvement
  }

  /**
   * Get optimization results for a strategy
   */
  getOptimizationResults(strategyName: string): {
    parameters: number[] | null;
    performance: number[];
    improvementHistory: number[];
    confidence: number;
  } {
    return {
      parameters: this.optimizedParameters.get(strategyName) || null,
      performance: this.performanceHistory.get(strategyName) || [],
      improvementHistory: this.rewardHistory.slice(-100), // Last 100 rewards
      confidence: 1 - this.epsilon
    };
  }

  /**
   * Save the trained model
   */
  async saveModel(path: string): Promise<void> {
    await this.qNetwork.save(`file://${path}/q_network`);
    await this.targetNetwork.save(`file://${path}/target_network`);
  }

  /**
   * Load a trained model
   */
  async loadModel(path: string): Promise<void> {
    this.qNetwork = await tf.loadLayersModel(`file://${path}/q_network/model.json`);
    this.targetNetwork = await tf.loadLayersModel(`file://${path}/target_network/model.json`);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    totalReward: number;
    averageReward: number;
    bestReward: number;
    episodeCount: number;
    epsilon: number;
    memorySize: number;
    recentPerformance: number;
  } {
    const recentRewards = this.rewardHistory.slice(-this.config.rewardWindow);
    const averageReward = this.rewardHistory.length > 0
      ? this.totalReward / this.rewardHistory.length
      : 0;
    const recentPerformance = recentRewards.length > 0
      ? recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length
      : 0;

    return {
      totalReward: this.totalReward,
      averageReward,
      bestReward: this.bestReward,
      episodeCount: this.episodeCount,
      epsilon: this.epsilon,
      memorySize: this.memory.length,
      recentPerformance
    };
  }

  /**
   * Reset the optimizer
   */
  reset(): void {
    this.memory = [];
    this.totalReward = 0;
    this.episodeCount = 0;
    this.bestReward = Number.NEGATIVE_INFINITY;
    this.rewardHistory = [];
    this.epsilon = this.config.epsilon;
    this.optimizedParameters.clear();
    this.performanceHistory.clear();
  }
}

// Export default configuration
export const defaultRLConfig: RLConfig = {
  learningRate: 0.001,
  gamma: 0.95,
  epsilon: 0.1,
  epsilonDecay: 0.995,
  minEpsilon: 0.01,
  batchSize: 32,
  memorySize: 10000,
  targetUpdateFreq: 100,
  rewardWindow: 50
};

import * as tf from '@tensorflow/tfjs-node';

interface ModelSignal {
  modelId: string;
  modelName: string;
  signal: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    strength: number;
    probability: number;
    features: number[];
  };
  weight: number;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    sharpeRatio: number;
    profitFactor: number;
  };
  timestamp: number;
  marketCondition: string;
}

interface EnsembleSignal {
  aggregatedAction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  strength: number;
  consensusLevel: number;
  diversityScore: number;
  uncertainty: number;
  contributingModels: string[];
  weightedProbabilities: {
    buy: number;
    sell: number;
    hold: number;
  };
  explanations: string[];
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    factors: string[];
    mitigation: string[];
  };
}

interface EnsembleMethod {
  name: string;
  description: string;
  aggregate: (signals: ModelSignal[]) => EnsembleSignal;
  updateWeights: (signals: ModelSignal[], actualOutcome: number) => void;
}

interface MetaLearnerConfig {
  architecture: 'neural' | 'gradient_boosting' | 'random_forest' | 'stacking';
  inputDim: number;
  hiddenLayers: number[];
  learningRate: number;
  regularization: number;
  updateFrequency: number;
}

export class EnsembleLearningSystem {
  private methods: Map<string, EnsembleMethod> = new Map();
  private metaLearner: tf.LayersModel | null = null;
  private metaLearnerConfig: MetaLearnerConfig;

  // Performance tracking
  private signalHistory: ModelSignal[][] = [];
  private outcomeHistory: number[] = [];
  private ensembleHistory: EnsembleSignal[] = [];

  // Dynamic weights
  private modelWeights: Map<string, number> = new Map();
  private marketConditionWeights: Map<string, Map<string, number>> = new Map();

  // Ensemble statistics
  private diversityMetrics: {
    averagePairwiseCorrelation: number;
    entropy: number;
    giniIndex: number;
    bias: number;
    variance: number;
  } = {
    averagePairwiseCorrelation: 0,
    entropy: 0,
    giniIndex: 0,
    bias: 0,
    variance: 0
  };

  constructor(metaLearnerConfig: MetaLearnerConfig) {
    this.metaLearnerConfig = metaLearnerConfig;
    this.initializeEnsembleMethods();
    this.initializeMetaLearner();
  }

  /**
   * Initialize ensemble aggregation methods
   */
  private initializeEnsembleMethods(): void {
    // Simple Voting
    this.methods.set('simple_voting', {
      name: 'Simple Voting',
      description: 'Equal weight majority voting',
      aggregate: (signals) => this.simpleVoting(signals),
      updateWeights: () => {} // No weight updates for simple voting
    });

    // Weighted Voting
    this.methods.set('weighted_voting', {
      name: 'Weighted Voting',
      description: 'Performance-weighted voting',
      aggregate: (signals) => this.weightedVoting(signals),
      updateWeights: (signals, outcome) => this.updatePerformanceWeights(signals, outcome)
    });

    // Bayesian Model Averaging
    this.methods.set('bayesian_averaging', {
      name: 'Bayesian Model Averaging',
      description: 'Bayesian posterior probability aggregation',
      aggregate: (signals) => this.bayesianAveraging(signals),
      updateWeights: (signals, outcome) => this.updateBayesianWeights(signals, outcome)
    });

    // Stacking
    this.methods.set('stacking', {
      name: 'Stacking Ensemble',
      description: 'Meta-learner combines base model predictions',
      aggregate: (signals) => this.stackingEnsemble(signals),
      updateWeights: (signals, outcome) => this.updateMetaLearner(signals, outcome)
    });

    // Dynamic Ensemble Selection
    this.methods.set('dynamic_selection', {
      name: 'Dynamic Ensemble Selection',
      description: 'Context-aware model selection',
      aggregate: (signals) => this.dynamicEnsembleSelection(signals),
      updateWeights: (signals, outcome) => this.updateDynamicWeights(signals, outcome)
    });
  }

  /**
   * Initialize the meta-learner for stacking
   */
  private initializeMetaLearner(): void {
    if (this.metaLearnerConfig.architecture === 'neural') {
      const layers = [
        tf.layers.dense({
          inputShape: [this.metaLearnerConfig.inputDim],
          units: this.metaLearnerConfig.hiddenLayers[0],
          activation: 'relu'
        })
      ];

      // Add hidden layers
      for (let i = 1; i < this.metaLearnerConfig.hiddenLayers.length; i++) {
        layers.push(tf.layers.dense({
          units: this.metaLearnerConfig.hiddenLayers[i],
          activation: 'relu'
        }));
        layers.push(tf.layers.dropout({ rate: 0.2 }));
      }

      // Output layer (3 classes: BUY, SELL, HOLD)
      layers.push(tf.layers.dense({ units: 3, activation: 'softmax' }));

      this.metaLearner = tf.sequential({ layers });

      this.metaLearner.compile({
        optimizer: tf.train.adam(this.metaLearnerConfig.learningRate),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
    }
  }

  /**
   * Aggregate signals using specified ensemble method
   */
  async aggregateSignals(
    signals: ModelSignal[],
    method = 'weighted_voting',
    marketCondition?: string
  ): Promise<EnsembleSignal> {
    if (signals.length === 0) {
      throw new Error('No signals provided for aggregation');
    }

    // Filter signals by market condition if specified
    const filteredSignals = marketCondition
      ? signals.filter(s => s.marketCondition === marketCondition)
      : signals;

    if (filteredSignals.length === 0) {
      throw new Error('No signals match the specified market condition');
    }

    // Get the ensemble method
    const ensembleMethod = this.methods.get(method);
    if (!ensembleMethod) {
      throw new Error(`Unknown ensemble method: ${method}`);
    }

    // Calculate diversity metrics
    this.calculateDiversityMetrics(filteredSignals);

    // Aggregate signals
    const ensembleSignal = ensembleMethod.aggregate(filteredSignals);

    // Add timestamp and store in history
    const timestampedSignal = {
      ...ensembleSignal,
      timestamp: Date.now(),
      method
    };

    this.ensembleHistory.push(timestampedSignal);
    this.signalHistory.push(filteredSignals);

    return ensembleSignal;
  }

  /**
   * Simple majority voting
   */
  private simpleVoting(signals: ModelSignal[]): EnsembleSignal {
    const votes = { BUY: 0, SELL: 0, HOLD: 0 };
    let totalConfidence = 0;
    let totalStrength = 0;

    signals.forEach(signal => {
      votes[signal.signal.action]++;
      totalConfidence += signal.signal.confidence;
      totalStrength += signal.signal.strength;
    });

    // Determine winning action
    const actions = Object.keys(votes) as Array<'BUY' | 'SELL' | 'HOLD'>;
    const winningAction = actions.reduce((a, b) =>
      votes[a] > votes[b] ? a : b
    );

    const consensusLevel = votes[winningAction] / signals.length;
    const averageConfidence = totalConfidence / signals.length;
    const averageStrength = totalStrength / signals.length;

    return {
      aggregatedAction: winningAction,
      confidence: averageConfidence * consensusLevel,
      strength: averageStrength,
      consensusLevel,
      diversityScore: this.diversityMetrics.entropy,
      uncertainty: 1 - consensusLevel,
      contributingModels: signals.map(s => s.modelName),
      weightedProbabilities: {
        buy: votes.BUY / signals.length,
        sell: votes.SELL / signals.length,
        hold: votes.HOLD / signals.length
      },
      explanations: [`Simple majority vote: ${votes[winningAction]}/${signals.length} models agree`],
      riskAssessment: this.assessRisk(signals, consensusLevel)
    };
  }

  /**
   * Performance-weighted voting
   */
  private weightedVoting(signals: ModelSignal[]): EnsembleSignal {
    let totalWeight = 0;
    const weightedVotes = { BUY: 0, SELL: 0, HOLD: 0 };
    let weightedConfidence = 0;
    let weightedStrength = 0;

    signals.forEach(signal => {
      const weight = this.calculateModelWeight(signal);
      totalWeight += weight;
      weightedVotes[signal.signal.action] += weight;
      weightedConfidence += signal.signal.confidence * weight;
      weightedStrength += signal.signal.strength * weight;
    });

    // Normalize
    if (totalWeight > 0) {
      weightedConfidence /= totalWeight;
      weightedStrength /= totalWeight;
    }

    // Determine winning action
    const actions = Object.keys(weightedVotes) as Array<'BUY' | 'SELL' | 'HOLD'>;
    const winningAction = actions.reduce((a, b) =>
      weightedVotes[a] > weightedVotes[b] ? a : b
    );

    const consensusLevel = weightedVotes[winningAction] / totalWeight;

    return {
      aggregatedAction: winningAction,
      confidence: weightedConfidence * consensusLevel,
      strength: weightedStrength,
      consensusLevel,
      diversityScore: this.diversityMetrics.entropy,
      uncertainty: 1 - consensusLevel,
      contributingModels: signals.map(s => s.modelName),
      weightedProbabilities: {
        buy: weightedVotes.BUY / totalWeight,
        sell: weightedVotes.SELL / totalWeight,
        hold: weightedVotes.HOLD / totalWeight
      },
      explanations: [`Weighted vote based on model performance`],
      riskAssessment: this.assessRisk(signals, consensusLevel)
    };
  }

  /**
   * Bayesian model averaging
   */
  private bayesianAveraging(signals: ModelSignal[]): EnsembleSignal {
    const priors = { BUY: 0.33, SELL: 0.33, HOLD: 0.34 }; // Uniform priors
    const posteriors = { BUY: 0, SELL: 0, HOLD: 0 };
    let totalWeight = 0;

    signals.forEach(signal => {
      const likelihood = signal.signal.confidence;
      const weight = this.calculateBayesianWeight(signal);

      totalWeight += weight;
      posteriors[signal.signal.action] += likelihood * weight;
    });

    // Normalize posteriors
    if (totalWeight > 0) {
      Object.keys(posteriors).forEach(action => {
        posteriors[action as keyof typeof posteriors] /= totalWeight;
      });
    }

    // Determine winning action
    const actions = Object.keys(posteriors) as Array<'BUY' | 'SELL' | 'HOLD'>;
    const winningAction = actions.reduce((a, b) =>
      posteriors[a] > posteriors[b] ? a : b
    );

    const consensusLevel = posteriors[winningAction];
    const uncertainty = this.calculateBayesianUncertainty(posteriors);

    return {
      aggregatedAction: winningAction,
      confidence: consensusLevel,
      strength: signals.reduce((sum, s) => sum + s.signal.strength, 0) / signals.length,
      consensusLevel,
      diversityScore: this.diversityMetrics.entropy,
      uncertainty,
      contributingModels: signals.map(s => s.modelName),
      weightedProbabilities: posteriors,
      explanations: [`Bayesian averaging with posterior probabilities`],
      riskAssessment: this.assessRisk(signals, consensusLevel)
    };
  }

  /**
   * Stacking ensemble using meta-learner
   */
  private async stackingEnsemble(signals: ModelSignal[]): Promise<EnsembleSignal> {
    if (!this.metaLearner) {
      throw new Error('Meta-learner not initialized');
    }

    // Prepare input features for meta-learner
    const features = this.prepareMetaLearnerInput(signals);
    const inputTensor = tf.tensor2d([features]);

    // Get prediction from meta-learner
    const prediction = this.metaLearner.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();

    inputTensor.dispose();
    prediction.dispose();

    // Convert probabilities to action
    const actions: Array<'BUY' | 'SELL' | 'HOLD'> = ['BUY', 'SELL', 'HOLD'];
    const maxIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
    const winningAction = actions[maxIndex];

    const consensusLevel = probabilities[maxIndex];
    const uncertainty = this.calculateEntropy(Array.from(probabilities));

    return {
      aggregatedAction: winningAction,
      confidence: consensusLevel,
      strength: signals.reduce((sum, s) => sum + s.signal.strength, 0) / signals.length,
      consensusLevel,
      diversityScore: this.diversityMetrics.entropy,
      uncertainty,
      contributingModels: signals.map(s => s.modelName),
      weightedProbabilities: {
        buy: probabilities[0],
        sell: probabilities[1],
        hold: probabilities[2]
      },
      explanations: [`Meta-learner prediction based on base model outputs`],
      riskAssessment: this.assessRisk(signals, consensusLevel)
    };
  }

  /**
   * Dynamic ensemble selection
   */
  private dynamicEnsembleSelection(signals: ModelSignal[]): EnsembleSignal {
    // Select best models based on current market condition
    const marketCondition = this.getCurrentMarketCondition(signals);
    const selectedModels = this.selectBestModelsForCondition(signals, marketCondition);

    // Use weighted voting on selected models
    return this.weightedVoting(selectedModels);
  }

  /**
   * Calculate model weight based on performance metrics
   */
  private calculateModelWeight(signal: ModelSignal): number {
    const perf = signal.performance;

    // Composite weight based on multiple metrics
    const accuracyWeight = perf.accuracy * 0.3;
    const sharpeWeight = Math.tanh(perf.sharpeRatio / 2) * 0.3;
    const profitWeight = Math.tanh(perf.profitFactor / 2) * 0.25;
    const f1Weight = perf.f1Score * 0.15;

    return Math.max(0.1, accuracyWeight + sharpeWeight + profitWeight + f1Weight);
  }

  /**
   * Calculate Bayesian weight for model
   */
  private calculateBayesianWeight(signal: ModelSignal): number {
    // Weight based on model evidence (marginal likelihood)
    const accuracy = signal.performance.accuracy;
    const confidence = signal.signal.confidence;

    // Simplified evidence calculation
    return accuracy * confidence;
  }

  /**
   * Calculate Bayesian uncertainty
   */
  private calculateBayesianUncertainty(posteriors: { BUY: number; SELL: number; HOLD: number }): number {
    const probs = Object.values(posteriors);
    return this.calculateEntropy(probs);
  }

  /**
   * Calculate entropy for uncertainty measurement
   */
  private calculateEntropy(probabilities: number[]): number {
    return -probabilities.reduce((entropy, p) => {
      return p > 0 ? entropy + p * Math.log2(p) : entropy;
    }, 0);
  }

  /**
   * Calculate diversity metrics for the ensemble
   */
  private calculateDiversityMetrics(signals: ModelSignal[]): void {
    if (signals.length < 2) {
      this.diversityMetrics = {
        averagePairwiseCorrelation: 0,
        entropy: 0,
        giniIndex: 0,
        bias: 0,
        variance: 0
      };
      return;
    }

    // Calculate pairwise correlation between signals
    const correlations: number[] = [];
    for (let i = 0; i < signals.length; i++) {
      for (let j = i + 1; j < signals.length; j++) {
        const corr = this.calculateSignalCorrelation(signals[i], signals[j]);
        correlations.push(corr);
      }
    }

    const avgCorrelation = correlations.reduce((sum, corr) => sum + corr, 0) / correlations.length;

    // Calculate action distribution entropy
    const actionCounts = { BUY: 0, SELL: 0, HOLD: 0 };
    signals.forEach(signal => actionCounts[signal.signal.action]++);

    const actionProbs = Object.values(actionCounts).map(count => count / signals.length);
    const entropy = this.calculateEntropy(actionProbs);

    // Calculate Gini index
    const giniIndex = this.calculateGiniIndex(actionProbs);

    this.diversityMetrics = {
      averagePairwiseCorrelation: avgCorrelation,
      entropy,
      giniIndex,
      bias: 0, // Would need ground truth to calculate
      variance: this.calculateVariance(signals.map(s => s.signal.confidence))
    };
  }

  /**
   * Calculate correlation between two signals
   */
  private calculateSignalCorrelation(signal1: ModelSignal, signal2: ModelSignal): number {
    // Simplified correlation based on confidence and action agreement
    const actionAgreement = signal1.signal.action === signal2.signal.action ? 1 : 0;
    const confidenceCorr = 1 - Math.abs(signal1.signal.confidence - signal2.signal.confidence);

    return actionAgreement * confidenceCorr;
  }

  /**
   * Calculate Gini index for diversity measurement
   */
  private calculateGiniIndex(probabilities: number[]): number {
    const sortedProbs = probabilities.sort((a, b) => a - b);
    const n = sortedProbs.length;

    let gini = 0;
    for (let i = 0; i < n; i++) {
      gini += (2 * (i + 1) - n - 1) * sortedProbs[i];
    }

    return gini / (n * probabilities.reduce((sum, p) => sum + p, 0));
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  /**
   * Assess risk based on signal characteristics
   */
  private assessRisk(signals: ModelSignal[], consensusLevel: number): {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    factors: string[];
    mitigation: string[];
  } {
    const factors: string[] = [];
    const mitigation: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    // Low consensus increases risk
    if (consensusLevel < 0.6) {
      factors.push('Low consensus among models');
      mitigation.push('Reduce position size');
      riskLevel = 'MEDIUM';
    }

    // High correlation reduces diversity
    if (this.diversityMetrics.averagePairwiseCorrelation > 0.8) {
      factors.push('High correlation between models');
      mitigation.push('Include more diverse models');
      riskLevel = 'MEDIUM';
    }

    // Low confidence
    const avgConfidence = signals.reduce((sum, s) => sum + s.signal.confidence, 0) / signals.length;
    if (avgConfidence < 0.5) {
      factors.push('Low average confidence');
      mitigation.push('Wait for higher confidence signals');
      riskLevel = 'HIGH';
    }

    // High uncertainty
    if (this.diversityMetrics.entropy > 1.5) {
      factors.push('High uncertainty in predictions');
      mitigation.push('Use conservative position sizing');
      if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM';
    }

    return { level: riskLevel, factors, mitigation };
  }

  /**
   * Helper methods
   */
  private prepareMetaLearnerInput(signals: ModelSignal[]): number[] {
    const features: number[] = [];

    // Add signal features
    signals.forEach(signal => {
      features.push(
        signal.signal.confidence,
        signal.signal.strength,
        signal.signal.probability,
        signal.signal.action === 'BUY' ? 1 : signal.signal.action === 'SELL' ? -1 : 0
      );
    });

    // Pad or truncate to fixed size
    const targetSize = this.metaLearnerConfig.inputDim;
    if (features.length < targetSize) {
      features.push(...Array(targetSize - features.length).fill(0));
    } else if (features.length > targetSize) {
      features.splice(targetSize);
    }

    return features;
  }

  private getCurrentMarketCondition(signals: ModelSignal[]): string {
    // Simplified market condition detection
    const conditions = signals.map(s => s.marketCondition);
    const conditionCounts = conditions.reduce((acc, condition) => {
      acc[condition] = (acc[condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(conditionCounts).reduce((a, b) =>
      conditionCounts[a] > conditionCounts[b] ? a : b
    );
  }

  private selectBestModelsForCondition(signals: ModelSignal[], condition: string): ModelSignal[] {
    // Get weights for this market condition
    const conditionWeights = this.marketConditionWeights.get(condition) || new Map();

    // Sort models by their performance in this condition
    const sortedSignals = signals.sort((a, b) => {
      const weightA = conditionWeights.get(a.modelId) || 0.5;
      const weightB = conditionWeights.get(b.modelId) || 0.5;
      return weightB - weightA;
    });

    // Select top 70% of models
    const selectionSize = Math.max(2, Math.floor(signals.length * 0.7));
    return sortedSignals.slice(0, selectionSize);
  }

  /**
   * Update methods for learning
   */
  private updatePerformanceWeights(signals: ModelSignal[], outcome: number): void {
    signals.forEach(signal => {
      const currentWeight = this.modelWeights.get(signal.modelId) || 0.5;
      const correct = this.isSignalCorrect(signal, outcome);

      // Update weight based on correctness
      const newWeight = correct ?
        Math.min(1.0, currentWeight * 1.1) :
        Math.max(0.1, currentWeight * 0.9);

      this.modelWeights.set(signal.modelId, newWeight);
    });
  }

  private updateBayesianWeights(signals: ModelSignal[], outcome: number): void {
    // Update Bayesian weights based on observed outcomes
    signals.forEach(signal => {
      const correct = this.isSignalCorrect(signal, outcome);
      // Bayesian weight update would be more complex in practice
      // This is a simplified version
    });
  }

  private async updateMetaLearner(signals: ModelSignal[], outcome: number): Promise<void> {
    if (!this.metaLearner) return;

    const features = this.prepareMetaLearnerInput(signals);
    const target = this.outcomeToCategory(outcome);

    const xs = tf.tensor2d([features]);
    const ys = tf.tensor2d([target]);

    await this.metaLearner.fit(xs, ys, {
      epochs: 1,
      verbose: 0
    });

    xs.dispose();
    ys.dispose();
  }

  private updateDynamicWeights(signals: ModelSignal[], outcome: number): void {
    const condition = this.getCurrentMarketCondition(signals);
    let conditionWeights = this.marketConditionWeights.get(condition);

    if (!conditionWeights) {
      conditionWeights = new Map();
      this.marketConditionWeights.set(condition, conditionWeights);
    }

    signals.forEach(signal => {
      const currentWeight = conditionWeights!.get(signal.modelId) || 0.5;
      const correct = this.isSignalCorrect(signal, outcome);

      const newWeight = correct ?
        Math.min(1.0, currentWeight * 1.05) :
        Math.max(0.1, currentWeight * 0.95);

      conditionWeights!.set(signal.modelId, newWeight);
    });
  }

  private isSignalCorrect(signal: ModelSignal, outcome: number): boolean {
    // Simplified correctness check
    if (outcome > 0.02 && signal.signal.action === 'BUY') return true;
    if (outcome < -0.02 && signal.signal.action === 'SELL') return true;
    if (Math.abs(outcome) <= 0.02 && signal.signal.action === 'HOLD') return true;
    return false;
  }

  private outcomeToCategory(outcome: number): number[] {
    if (outcome > 0.02) return [1, 0, 0]; // BUY
    if (outcome < -0.02) return [0, 1, 0]; // SELL
    return [0, 0, 1]; // HOLD
  }

  /**
   * Public interface methods
   */
  addOutcome(outcome: number): void {
    this.outcomeHistory.push(outcome);

    // Update weights for all methods if we have corresponding signals
    const signalIndex = this.outcomeHistory.length - 1;
    if (signalIndex < this.signalHistory.length) {
      const signals = this.signalHistory[signalIndex];

      this.methods.forEach(method => {
        method.updateWeights(signals, outcome);
      });
    }
  }

  getEnsemblePerformance(): {
    accuracy: number;
    diversityScore: number;
    consensusHistory: number[];
    uncertaintyHistory: number[];
    methodPerformance: Map<string, number>;
  } {
    const consensusHistory = this.ensembleHistory.map(e => e.consensusLevel);
    const uncertaintyHistory = this.ensembleHistory.map(e => e.uncertainty);

    // Calculate accuracy if we have outcomes
    let accuracy = 0;
    if (this.outcomeHistory.length > 0) {
      const correct = this.ensembleHistory.slice(0, this.outcomeHistory.length)
        .filter((ensemble, i) => this.isEnsembleCorrect(ensemble, this.outcomeHistory[i]))
        .length;
      accuracy = correct / Math.min(this.ensembleHistory.length, this.outcomeHistory.length);
    }

    return {
      accuracy,
      diversityScore: this.diversityMetrics.entropy,
      consensusHistory,
      uncertaintyHistory,
      methodPerformance: new Map() // Would calculate per-method performance
    };
  }

  private isEnsembleCorrect(ensemble: EnsembleSignal, outcome: number): boolean {
    if (outcome > 0.02 && ensemble.aggregatedAction === 'BUY') return true;
    if (outcome < -0.02 && ensemble.aggregatedAction === 'SELL') return true;
    if (Math.abs(outcome) <= 0.02 && ensemble.aggregatedAction === 'HOLD') return true;
    return false;
  }

  getDiversityMetrics() {
    return { ...this.diversityMetrics };
  }

  getModelWeights(): Map<string, number> {
    return new Map(this.modelWeights);
  }

  reset(): void {
    this.signalHistory = [];
    this.outcomeHistory = [];
    this.ensembleHistory = [];
    this.modelWeights.clear();
    this.marketConditionWeights.clear();
  }
}

// Export default configuration
export const defaultMetaLearnerConfig: MetaLearnerConfig = {
  architecture: 'neural',
  inputDim: 32,
  hiddenLayers: [64, 32, 16],
  learningRate: 0.001,
  regularization: 0.01,
  updateFrequency: 100
};

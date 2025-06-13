import * as tf from '@tensorflow/tfjs-node';
import { EventEmitter } from 'events';

interface ModelPrediction {
  modelId: string;
  prediction: number[];
  confidence: number;
  timestamp: number;
  features: number[];
  metadata: any;
}

interface EnsembleConfig {
  votingMethod: 'hard' | 'soft' | 'weighted' | 'stacking';
  weightingStrategy: 'equal' | 'performance' | 'dynamic' | 'adaptive';
  diversityThreshold: number;
  minModels: number;
  maxModels: number;
  retrainingInterval: number;
  performanceWindow: number;
}

interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  sharpeRatio: number;
  returns: number[];
  lastUpdated: number;
  trainingEpochs: number;
  validationLoss: number;
}

interface EnsemblePrediction {
  finalPrediction: number[];
  confidence: number;
  modelContributions: Map<string, number>;
  diversityScore: number;
  consensusLevel: number;
  uncertainty: number;
  reasoning: string[];
}

export class EnsembleLearningSystem extends EventEmitter {
  private models: Map<string, tf.LayersModel> = new Map();
  private modelPerformances: Map<string, ModelPerformance> = new Map();
  private modelWeights: Map<string, number> = new Map();
  private stackingModel: tf.LayersModel | null = null;
  private config: EnsembleConfig;
  private predictionHistory: ModelPrediction[] = [];
  private diversityMatrix: number[][] = [];

  constructor(config: EnsembleConfig) {
    super();
    this.config = config;
    this.initializeStackingModel();
  }

  /**
   * Add a new model to the ensemble
   */
  async addModel(
    modelId: string,
    model: tf.LayersModel,
    initialWeight = 1.0
  ): Promise<void> {
    if (this.models.size >= this.config.maxModels) {
      throw new Error(`Maximum number of models (${this.config.maxModels}) reached`);
    }

    this.models.set(modelId, model);
    this.modelWeights.set(modelId, initialWeight);

    // Initialize performance tracking
    this.modelPerformances.set(modelId, {
      accuracy: 0.5,
      precision: 0.5,
      recall: 0.5,
      f1Score: 0.5,
      sharpeRatio: 0,
      returns: [],
      lastUpdated: Date.now(),
      trainingEpochs: 0,
      validationLoss: Number.POSITIVE_INFINITY
    });

    console.log(`✅ Added model ${modelId} to ensemble (${this.models.size}/${this.config.maxModels})`);
    this.emit('modelAdded', { modelId, weight: initialWeight });

    // Update diversity matrix
    await this.updateDiversityMatrix();
  }

  /**
   * Remove a model from the ensemble
   */
  removeModel(modelId: string): boolean {
    if (!this.models.has(modelId)) {
      return false;
    }

    // Dispose of TensorFlow model to free memory
    const model = this.models.get(modelId);
    if (model) {
      model.dispose();
    }

    this.models.delete(modelId);
    this.modelWeights.delete(modelId);
    this.modelPerformances.delete(modelId);

    console.log(`🗑️ Removed model ${modelId} from ensemble`);
    this.emit('modelRemoved', { modelId });

    return true;
  }

  /**
   * Get ensemble prediction by aggregating all model predictions
   */
  async getEnsemblePrediction(features: number[]): Promise<EnsemblePrediction> {
    if (this.models.size < this.config.minModels) {
      throw new Error(`Insufficient models: ${this.models.size} < ${this.config.minModels}`);
    }

    // Get predictions from all models
    const predictions: ModelPrediction[] = [];
    const featureTensor = tf.tensor2d([features]);

    for (const [modelId, model] of this.models.entries()) {
      try {
        const predictionTensor = model.predict(featureTensor) as tf.Tensor;
        const predictionData = await predictionTensor.data();
        const prediction = Array.from(predictionData);

        // Calculate confidence based on prediction entropy
        const confidence = this.calculatePredictionConfidence(prediction);

        predictions.push({
          modelId,
          prediction,
          confidence,
          timestamp: Date.now(),
          features,
          metadata: { modelType: 'neural_network' }
        });

        predictionTensor.dispose();
      } catch (error) {
        console.error(`Error getting prediction from model ${modelId}:`, error);
      }
    }

    featureTensor.dispose();

    if (predictions.length === 0) {
      throw new Error('No valid predictions obtained from models');
    }

    // Store predictions for analysis
    this.predictionHistory.push(...predictions);
    this.trimPredictionHistory();

    // Aggregate predictions based on voting method
    const ensemblePrediction = this.aggregatePredictions(predictions);

    this.emit('predictionGenerated', ensemblePrediction);

    return ensemblePrediction;
  }

  /**
   * Aggregate predictions using the configured voting method
   */
  private aggregatePredictions(predictions: ModelPrediction[]): EnsemblePrediction {
    switch (this.config.votingMethod) {
      case 'hard':
        return this.hardVoting(predictions);
      case 'soft':
        return this.softVoting(predictions);
      case 'weighted':
        return this.weightedVoting(predictions);
      case 'stacking':
        return this.stackingVoting(predictions);
      default:
        return this.softVoting(predictions);
    }
  }

  /**
   * Hard voting: Majority vote
   */
  private hardVoting(predictions: ModelPrediction[]): EnsemblePrediction {
    const numClasses = predictions[0].prediction.length;
    const votes = new Array(numClasses).fill(0);
    const modelContributions = new Map<string, number>();

    // Convert to class predictions and vote
    predictions.forEach(pred => {
      const classIndex = pred.prediction.indexOf(Math.max(...pred.prediction));
      votes[classIndex]++;
      modelContributions.set(pred.modelId, 1 / predictions.length);
    });

    const finalPrediction = new Array(numClasses).fill(0);
    const winningClass = votes.indexOf(Math.max(...votes));
    finalPrediction[winningClass] = 1;

    return {
      finalPrediction,
      confidence: Math.max(...votes) / predictions.length,
      modelContributions,
      diversityScore: this.calculateDiversityScore(predictions),
      consensusLevel: Math.max(...votes) / predictions.length,
      uncertainty: 1 - (Math.max(...votes) / predictions.length),
      reasoning: [`Hard voting: Class ${winningClass} won with ${Math.max(...votes)} votes`]
    };
  }

  /**
   * Soft voting: Average probabilities
   */
  private softVoting(predictions: ModelPrediction[]): EnsemblePrediction {
    const numClasses = predictions[0].prediction.length;
    const finalPrediction = new Array(numClasses).fill(0);
    const modelContributions = new Map<string, number>();

    // Average predictions
    predictions.forEach(pred => {
      const weight = 1 / predictions.length;
      pred.prediction.forEach((prob, i) => {
        finalPrediction[i] += prob * weight;
      });
      modelContributions.set(pred.modelId, weight);
    });

    const maxProb = Math.max(...finalPrediction);
    const confidence = maxProb;

    // Calculate entropy for uncertainty
    const entropy = -finalPrediction.reduce((sum, prob) => {
      return prob > 0 ? sum + prob * Math.log2(prob) : sum;
    }, 0);

    return {
      finalPrediction,
      confidence,
      modelContributions,
      diversityScore: this.calculateDiversityScore(predictions),
      consensusLevel: this.calculateConsensusLevel(predictions),
      uncertainty: entropy / Math.log2(numClasses),
      reasoning: [`Soft voting: Averaged ${predictions.length} model predictions`]
    };
  }

  /**
   * Weighted voting: Performance-based weights
   */
  private weightedVoting(predictions: ModelPrediction[]): EnsemblePrediction {
    const numClasses = predictions[0].prediction.length;
    const finalPrediction = new Array(numClasses).fill(0);
    const modelContributions = new Map<string, number>();

    // Update weights based on current strategy
    this.updateModelWeights();

    let totalWeight = 0;
    predictions.forEach(pred => {
      const weight = this.modelWeights.get(pred.modelId) || 1;
      totalWeight += weight;
    });

    // Weighted average
    predictions.forEach(pred => {
      const weight = (this.modelWeights.get(pred.modelId) || 1) / totalWeight;
      pred.prediction.forEach((prob, i) => {
        finalPrediction[i] += prob * weight;
      });
      modelContributions.set(pred.modelId, weight);
    });

    return {
      finalPrediction,
      confidence: Math.max(...finalPrediction),
      modelContributions,
      diversityScore: this.calculateDiversityScore(predictions),
      consensusLevel: this.calculateConsensusLevel(predictions),
      uncertainty: this.calculateUncertainty(finalPrediction),
      reasoning: [`Weighted voting with performance-based weights`]
    };
  }

  /**
   * Stacking: Meta-model learns to combine predictions
   */
  private stackingVoting(predictions: ModelPrediction[]): EnsemblePrediction {
    if (!this.stackingModel) {
      // Fallback to weighted voting if stacking model not ready
      return this.weightedVoting(predictions);
    }

    // Prepare features for stacking model
    const stackingFeatures: number[] = [];

    predictions.forEach(pred => {
      stackingFeatures.push(...pred.prediction);
      stackingFeatures.push(pred.confidence);
    });

    // Get meta-prediction
    const featureTensor = tf.tensor2d([stackingFeatures]);
    const metaPrediction = this.stackingModel.predict(featureTensor) as tf.Tensor;
    const finalPrediction = Array.from(metaPrediction.dataSync());

    featureTensor.dispose();
    metaPrediction.dispose();

    const modelContributions = new Map<string, number>();
    predictions.forEach(pred => {
      modelContributions.set(pred.modelId, 1 / predictions.length);
    });

    return {
      finalPrediction,
      confidence: Math.max(...finalPrediction),
      modelContributions,
      diversityScore: this.calculateDiversityScore(predictions),
      consensusLevel: this.calculateConsensusLevel(predictions),
      uncertainty: this.calculateUncertainty(finalPrediction),
      reasoning: [`Stacking meta-model combination`]
    };
  }

  /**
   * Update model weights based on performance
   */
  private updateModelWeights(): void {
    if (this.config.weightingStrategy === 'equal') {
      // Equal weights for all models
      this.models.forEach((_, modelId) => {
        this.modelWeights.set(modelId, 1.0);
      });
      return;
    }

    if (this.config.weightingStrategy === 'performance') {
      // Weight based on recent performance
      let totalPerformance = 0;
      const performances = new Map<string, number>();

      this.modelPerformances.forEach((perf, modelId) => {
        const score = this.calculateCompositePerformanceScore(perf);
        performances.set(modelId, score);
        totalPerformance += score;
      });

      if (totalPerformance > 0) {
        performances.forEach((score, modelId) => {
          this.modelWeights.set(modelId, score / totalPerformance);
        });
      }
    }

    if (this.config.weightingStrategy === 'dynamic') {
      // Adjust weights based on recent prediction accuracy
      this.updateDynamicWeights();
    }

    if (this.config.weightingStrategy === 'adaptive') {
      // Use reinforcement learning to adjust weights
      this.updateAdaptiveWeights();
    }
  }

  /**
   * Update weights dynamically based on recent performance
   */
  private updateDynamicWeights(): void {
    const recentWindow = 50;
    const recentPredictions = this.predictionHistory.slice(-recentWindow);

    if (recentPredictions.length < 10) return;

    const modelAccuracies = new Map<string, number>();

    // Calculate recent accuracy for each model
    this.models.forEach((_, modelId) => {
      const modelPredictions = recentPredictions.filter(p => p.modelId === modelId);
      if (modelPredictions.length > 0) {
        // This would require actual labels to calculate accuracy
        // For now, use confidence as a proxy
        const avgConfidence = modelPredictions.reduce((sum, p) => sum + p.confidence, 0) / modelPredictions.length;
        modelAccuracies.set(modelId, avgConfidence);
      }
    });

    // Normalize to weights
    const totalAccuracy = Array.from(modelAccuracies.values()).reduce((a, b) => a + b, 0);
    if (totalAccuracy > 0) {
      modelAccuracies.forEach((accuracy, modelId) => {
        this.modelWeights.set(modelId, accuracy / totalAccuracy);
      });
    }
  }

  /**
   * Update weights adaptively using bandit algorithms
   */
  private updateAdaptiveWeights(): void {
    // Implement epsilon-greedy or UCB algorithm for weight adaptation
    const epsilon = 0.1;
    const totalModels = this.models.size;

    if (Math.random() < epsilon) {
      // Exploration: randomize weights
      const randomWeights = Array.from({ length: totalModels }, () => Math.random());
      const sum = randomWeights.reduce((a, b) => a + b, 0);

      let i = 0;
      this.models.forEach((_, modelId) => {
        this.modelWeights.set(modelId, randomWeights[i] / sum);
        i++;
      });
    } else {
      // Exploitation: use performance-based weights
      this.updateModelWeights();
    }
  }

  /**
   * Calculate diversity score among predictions
   */
  private calculateDiversityScore(predictions: ModelPrediction[]): number {
    if (predictions.length < 2) return 0;

    let totalDistance = 0;
    let comparisons = 0;

    for (let i = 0; i < predictions.length; i++) {
      for (let j = i + 1; j < predictions.length; j++) {
        const distance = this.calculatePredictionDistance(
          predictions[i].prediction,
          predictions[j].prediction
        );
        totalDistance += distance;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalDistance / comparisons : 0;
  }

  /**
   * Calculate distance between two predictions
   */
  private calculatePredictionDistance(pred1: number[], pred2: number[]): number {
    if (pred1.length !== pred2.length) return 1;

    let sumSquaredDiff = 0;
    for (let i = 0; i < pred1.length; i++) {
      sumSquaredDiff += Math.pow(pred1[i] - pred2[i], 2);
    }

    return Math.sqrt(sumSquaredDiff / pred1.length);
  }

  /**
   * Calculate consensus level among predictions
   */
  private calculateConsensusLevel(predictions: ModelPrediction[]): number {
    if (predictions.length < 2) return 1;

    const classVotes = new Map<number, number>();

    predictions.forEach(pred => {
      const predictedClass = pred.prediction.indexOf(Math.max(...pred.prediction));
      classVotes.set(predictedClass, (classVotes.get(predictedClass) || 0) + 1);
    });

    const maxVotes = Math.max(...Array.from(classVotes.values()));
    return maxVotes / predictions.length;
  }

  /**
   * Calculate prediction confidence based on entropy
   */
  private calculatePredictionConfidence(prediction: number[]): number {
    // Normalize prediction to probabilities
    const sum = prediction.reduce((a, b) => a + b, 0);
    const probs = sum > 0 ? prediction.map(p => p / sum) : prediction;

    // Calculate entropy
    const entropy = -probs.reduce((sum, prob) => {
      return prob > 0 ? sum + prob * Math.log2(prob) : sum;
    }, 0);

    const maxEntropy = Math.log2(probs.length);
    return maxEntropy > 0 ? 1 - (entropy / maxEntropy) : 0;
  }

  /**
   * Calculate uncertainty from prediction distribution
   */
  private calculateUncertainty(prediction: number[]): number {
    const sum = prediction.reduce((a, b) => a + b, 0);
    const probs = sum > 0 ? prediction.map(p => p / sum) : prediction;

    const entropy = -probs.reduce((sum, prob) => {
      return prob > 0 ? sum + prob * Math.log2(prob) : sum;
    }, 0);

    const maxEntropy = Math.log2(probs.length);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  /**
   * Initialize the stacking meta-model
   */
  private initializeStackingModel(): void {
    if (this.config.votingMethod !== 'stacking') return;

    const inputSize = this.config.maxModels * 4; // prediction + confidence per model

    this.stackingModel = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [inputSize],
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 3, // Assuming 3-class output (buy/hold/sell)
          activation: 'softmax'
        })
      ]
    });

    this.stackingModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
  }

  /**
   * Train the stacking meta-model
   */
  async trainStackingModel(
    trainingData: { features: number[][], labels: number[][] }
  ): Promise<void> {
    if (!this.stackingModel) return;

    console.log('🎯 Training stacking meta-model...');

    const { features, labels } = trainingData;

    const xTrain = tf.tensor2d(features);
    const yTrain = tf.tensor2d(labels);

    await this.stackingModel.fit(xTrain, yTrain, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, accuracy=${logs?.acc?.toFixed(4)}`);
          }
        }
      }
    });

    xTrain.dispose();
    yTrain.dispose();

    console.log('✅ Stacking meta-model training completed');
  }

  /**
   * Update diversity matrix
   */
  private async updateDiversityMatrix(): Promise<void> {
    const modelIds = Array.from(this.models.keys());
    const numModels = modelIds.length;

    this.diversityMatrix = Array(numModels).fill(null).map(() => Array(numModels).fill(0));

    // Generate test features for diversity calculation
    const testFeatures = Array.from({ length: 100 }, () =>
      Array.from({ length: 50 }, () => Math.random() * 2 - 1)
    );

    for (let i = 0; i < numModels; i++) {
      for (let j = i + 1; j < numModels; j++) {
        let totalDistance = 0;

        for (const features of testFeatures) {
          const pred1 = await this.getModelPrediction(modelIds[i], features);
          const pred2 = await this.getModelPrediction(modelIds[j], features);

          const distance = this.calculatePredictionDistance(pred1, pred2);
          totalDistance += distance;
        }

        const avgDistance = totalDistance / testFeatures.length;
        this.diversityMatrix[i][j] = avgDistance;
        this.diversityMatrix[j][i] = avgDistance;
      }
    }
  }

  /**
   * Get prediction from a specific model
   */
  private async getModelPrediction(modelId: string, features: number[]): Promise<number[]> {
    const model = this.models.get(modelId);
    if (!model) return [];

    const featureTensor = tf.tensor2d([features]);
    const prediction = model.predict(featureTensor) as tf.Tensor;
    const result = Array.from(await prediction.data());

    featureTensor.dispose();
    prediction.dispose();

    return result;
  }

  /**
   * Calculate composite performance score
   */
  private calculateCompositePerformanceScore(performance: ModelPerformance): number {
    return (
      performance.accuracy * 0.3 +
      performance.f1Score * 0.3 +
      Math.max(0, performance.sharpeRatio) * 0.2 +
      (1 / (1 + performance.validationLoss)) * 0.2
    );
  }

  /**
   * Update model performance metrics
   */
  updateModelPerformance(
    modelId: string,
    performance: Partial<ModelPerformance>
  ): void {
    const current = this.modelPerformances.get(modelId);
    if (current) {
      this.modelPerformances.set(modelId, {
        ...current,
        ...performance,
        lastUpdated: Date.now()
      });
    }
  }

  /**
   * Trim prediction history to manage memory
   */
  private trimPredictionHistory(): void {
    const maxHistory = 1000;
    if (this.predictionHistory.length > maxHistory) {
      this.predictionHistory = this.predictionHistory.slice(-maxHistory);
    }
  }

  /**
   * Get ensemble statistics
   */
  getEnsembleStats(): any {
    return {
      totalModels: this.models.size,
      activeModels: this.models.size,
      votingMethod: this.config.votingMethod,
      weightingStrategy: this.config.weightingStrategy,
      averageDiversity: this.calculateAverageDiversity(),
      modelWeights: Object.fromEntries(this.modelWeights),
      modelPerformances: Object.fromEntries(this.modelPerformances),
      predictionHistorySize: this.predictionHistory.length,
      lastPrediction: this.predictionHistory[this.predictionHistory.length - 1]?.timestamp
    };
  }

  /**
   * Calculate average diversity across all models
   */
  private calculateAverageDiversity(): number {
    if (this.diversityMatrix.length === 0) return 0;

    let sum = 0;
    let count = 0;

    for (let i = 0; i < this.diversityMatrix.length; i++) {
      for (let j = i + 1; j < this.diversityMatrix[i].length; j++) {
        sum += this.diversityMatrix[i][j];
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  /**
   * Save ensemble configuration and weights
   */
  async saveEnsemble(path: string): Promise<void> {
    const ensembleData = {
      config: this.config,
      modelWeights: Object.fromEntries(this.modelWeights),
      modelPerformances: Object.fromEntries(this.modelPerformances),
      diversityMatrix: this.diversityMatrix
    };

    // Save ensemble metadata
    require('fs').writeFileSync(`${path}/ensemble_config.json`, JSON.stringify(ensembleData, null, 2));

    // Save individual models
    for (const [modelId, model] of this.models.entries()) {
      await model.save(`file://${path}/models/${modelId}`);
    }

    // Save stacking model if it exists
    if (this.stackingModel) {
      await this.stackingModel.save(`file://${path}/stacking_model`);
    }

    console.log(`✅ Ensemble saved to ${path}`);
  }

  /**
   * Load ensemble from saved files
   */
  async loadEnsemble(path: string): Promise<void> {
    // Load ensemble metadata
    const ensembleData = JSON.parse(require('fs').readFileSync(`${path}/ensemble_config.json`, 'utf8'));

    this.config = ensembleData.config;
    this.modelWeights = new Map(Object.entries(ensembleData.modelWeights));
    this.modelPerformances = new Map(Object.entries(ensembleData.modelPerformances));
    this.diversityMatrix = ensembleData.diversityMatrix;

    // Load individual models
    const modelFiles = require('fs').readdirSync(`${path}/models`);
    for (const modelId of modelFiles) {
      try {
        const model = await tf.loadLayersModel(`file://${path}/models/${modelId}/model.json`);
        this.models.set(modelId, model);
      } catch (error) {
        console.error(`Failed to load model ${modelId}:`, error);
      }
    }

    // Load stacking model if it exists
    try {
      this.stackingModel = await tf.loadLayersModel(`file://${path}/stacking_model/model.json`);
    } catch (error) {
      console.log('No stacking model found, skipping...');
    }

    console.log(`✅ Ensemble loaded from ${path}`);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Dispose of all TensorFlow models
    this.models.forEach(model => model.dispose());
    if (this.stackingModel) {
      this.stackingModel.dispose();
    }

    this.models.clear();
    this.modelWeights.clear();
    this.modelPerformances.clear();
    this.predictionHistory = [];

    console.log('🧹 Ensemble resources cleaned up');
  }
}

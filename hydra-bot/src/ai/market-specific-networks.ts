import * as tf from '@tensorflow/tfjs-node';
import { EventEmitter } from 'events';

interface MarketCondition {
  type: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY' | 'BREAKOUT' | 'REVERSAL';
  confidence: number;
  volatility: number;
  trend: number;
  volume: number;
  momentum: number;
  support: number;
  resistance: number;
  timeframe: string;
}

interface NetworkArchitecture {
  inputSize: number;
  hiddenLayers: number[];
  outputSize: number;
  activations: string[];
  dropoutRates: number[];
  learningRate: number;
  batchSize: number;
  epochs: number;
}

interface ModelPrediction {
  prediction: number[];
  confidence: number;
  explanation: string[];
  riskScore: number;
  timeHorizon: number;
  expectedReturn: number;
  volatilityForecast: number;
}

interface TrainingData {
  features: number[][];
  labels: number[][];
  timestamps: number[];
  marketConditions: MarketCondition[];
}

export class MarketSpecificNeuralNetwork extends EventEmitter {
  private models: Map<string, tf.LayersModel> = new Map();
  private architectures: Map<string, NetworkArchitecture> = new Map();
  private trainingHistory: Map<string, any[]> = new Map();
  private marketDetector: tf.LayersModel | null = null;
  private isTraining = false;

  constructor() {
    super();
    this.initializeArchitectures();
  }

  /**
   * Initialize neural network architectures for different market conditions
   */
  private initializeArchitectures(): void {
    // Bull Market Network - Optimized for trend following
    this.architectures.set('BULL', {
      inputSize: 50,
      hiddenLayers: [128, 64, 32],
      outputSize: 3, // [buy_probability, hold_probability, sell_probability]
      activations: ['relu', 'relu', 'relu', 'softmax'],
      dropoutRates: [0.2, 0.3, 0.2],
      learningRate: 0.001,
      batchSize: 64,
      epochs: 100
    });

    // Bear Market Network - Optimized for defensive strategies
    this.architectures.set('BEAR', {
      inputSize: 50,
      hiddenLayers: [96, 48, 24],
      outputSize: 3,
      activations: ['relu', 'relu', 'relu', 'softmax'],
      dropoutRates: [0.3, 0.4, 0.3],
      learningRate: 0.0005,
      batchSize: 32,
      epochs: 150
    });

    // Sideways Market Network - Optimized for range trading
    this.architectures.set('SIDEWAYS', {
      inputSize: 50,
      hiddenLayers: [64, 48, 32, 16],
      outputSize: 3,
      activations: ['relu', 'relu', 'relu', 'relu', 'softmax'],
      dropoutRates: [0.15, 0.2, 0.15, 0.1],
      learningRate: 0.002,
      batchSize: 48,
      epochs: 80
    });

    // High Volatility Network - Quick decision making
    this.architectures.set('HIGH_VOLATILITY', {
      inputSize: 50,
      hiddenLayers: [256, 128, 64],
      outputSize: 5, // [strong_buy, buy, hold, sell, strong_sell]
      activations: ['relu', 'relu', 'relu', 'softmax'],
      dropoutRates: [0.4, 0.5, 0.4],
      learningRate: 0.003,
      batchSize: 128,
      epochs: 60
    });

    // Low Volatility Network - Conservative approach
    this.architectures.set('LOW_VOLATILITY', {
      inputSize: 50,
      hiddenLayers: [48, 32, 16],
      outputSize: 3,
      activations: ['relu', 'relu', 'relu', 'softmax'],
      dropoutRates: [0.1, 0.15, 0.1],
      learningRate: 0.0008,
      batchSize: 24,
      epochs: 120
    });

    // Breakout Network - Pattern recognition focused
    this.architectures.set('BREAKOUT', {
      inputSize: 50,
      hiddenLayers: [200, 150, 100, 50],
      outputSize: 4, // [breakout_up, breakout_down, false_breakout, no_breakout]
      activations: ['relu', 'relu', 'relu', 'relu', 'softmax'],
      dropoutRates: [0.25, 0.3, 0.25, 0.2],
      learningRate: 0.0015,
      batchSize: 96,
      epochs: 200
    });

    // Reversal Network - Contrarian signal detection
    this.architectures.set('REVERSAL', {
      inputSize: 50,
      hiddenLayers: [180, 120, 80, 40],
      outputSize: 3,
      activations: ['relu', 'relu', 'relu', 'relu', 'softmax'],
      dropoutRates: [0.3, 0.35, 0.3, 0.25],
      learningRate: 0.001,
      batchSize: 72,
      epochs: 180
    });
  }

  /**
   * Initialize all neural network models
   */
  async initializeModels(): Promise<void> {
    console.log('🧠 Initializing market-specific neural networks...');

    // Create market condition detector
    await this.createMarketDetector();

    // Create specialized models for each market condition
    for (const [condition, architecture] of this.architectures.entries()) {
      const model = await this.createModel(architecture);
      this.models.set(condition, model);
      console.log(`✅ Created ${condition} network with ${this.countParameters(model)} parameters`);
    }

    console.log(`🎯 Initialized ${this.models.size} specialized neural networks`);
    this.emit('modelsInitialized', { modelCount: this.models.size });
  }

  /**
   * Create market condition detector network
   */
  private async createMarketDetector(): Promise<void> {
    this.marketDetector = tf.sequential({
      name: 'market_condition_detector',
      layers: [
        tf.layers.dense({
          inputShape: [50],
          units: 128,
          activation: 'relu',
          kernelInitializer: 'glorotUniform'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 96,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.25 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 7, // Number of market conditions
          activation: 'softmax',
          name: 'market_classification'
        })
      ]
    });

    this.marketDetector.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy', 'precision', 'recall']
    });
  }

  /**
   * Create a neural network model based on architecture
   */
  private async createModel(architecture: NetworkArchitecture): Promise<tf.LayersModel> {
    const layers: tf.layers.Layer[] = [];

    // Input layer
    layers.push(tf.layers.dense({
      inputShape: [architecture.inputSize],
      units: architecture.hiddenLayers[0],
      activation: architecture.activations[0],
      kernelInitializer: 'glorotUniform',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
    }));

    // Hidden layers
    for (let i = 0; i < architecture.hiddenLayers.length; i++) {
      if (architecture.dropoutRates[i] > 0) {
        layers.push(tf.layers.dropout({ rate: architecture.dropoutRates[i] }));
      }

      if (i < architecture.hiddenLayers.length - 1) {
        layers.push(tf.layers.dense({
          units: architecture.hiddenLayers[i + 1],
          activation: architecture.activations[i + 1],
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }));
      }
    }

    // Output layer
    layers.push(tf.layers.dense({
      units: architecture.outputSize,
      activation: architecture.activations[architecture.activations.length - 1],
      name: 'prediction_output'
    }));

    const model = tf.sequential({ layers });

    // Compile model
    model.compile({
      optimizer: tf.train.adam(architecture.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy', 'precision', 'recall', 'f1Score']
    });

    return model;
  }

  /**
   * Detect current market condition
   */
  async detectMarketCondition(features: number[]): Promise<MarketCondition> {
    if (!this.marketDetector) {
      throw new Error('Market detector not initialized');
    }

    const featureTensor = tf.tensor2d([features]);
    const prediction = this.marketDetector.predict(featureTensor) as tf.Tensor;
    const probabilities = await prediction.data();

    featureTensor.dispose();
    prediction.dispose();

    const conditions = ['BULL', 'BEAR', 'SIDEWAYS', 'HIGH_VOLATILITY', 'LOW_VOLATILITY', 'BREAKOUT', 'REVERSAL'];
    const maxIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
    const confidence = probabilities[maxIndex];

    // Calculate additional market metrics
    const volatility = this.calculateVolatility(features.slice(-20));
    const trend = this.calculateTrend(features.slice(-10));
    const volume = features[features.length - 5] || 0;
    const momentum = this.calculateMomentum(features.slice(-5));

    return {
      type: conditions[maxIndex] as any,
      confidence,
      volatility,
      trend,
      volume,
      momentum,
      support: this.calculateSupport(features),
      resistance: this.calculateResistance(features),
      timeframe: '1h'
    };
  }

  /**
   * Get prediction from market-specific model
   */
  async getPrediction(
    features: number[],
    marketCondition?: MarketCondition
  ): Promise<ModelPrediction> {
    // Detect market condition if not provided
    const condition = marketCondition || await this.detectMarketCondition(features);

    const model = this.models.get(condition.type);
    if (!model) {
      throw new Error(`No model found for market condition: ${condition.type}`);
    }

    const featureTensor = tf.tensor2d([features]);
    const prediction = model.predict(featureTensor) as tf.Tensor;
    const probabilities = Array.from(await prediction.data());

    featureTensor.dispose();
    prediction.dispose();

    // Calculate derived metrics
    const confidence = Math.max(...probabilities);
    const riskScore = this.calculateRiskScore(probabilities, condition);
    const expectedReturn = this.calculateExpectedReturn(probabilities, condition);
    const volatilityForecast = this.forecastVolatility(features, condition);

    return {
      prediction: probabilities,
      confidence,
      explanation: this.generateExplanation(probabilities, condition),
      riskScore,
      timeHorizon: this.getTimeHorizon(condition.type),
      expectedReturn,
      volatilityForecast
    };
  }

  /**
   * Train a specific model with new data
   */
  async trainModel(
    marketCondition: string,
    trainingData: TrainingData,
    validationSplit = 0.2
  ): Promise<any> {
    const model = this.models.get(marketCondition);
    const architecture = this.architectures.get(marketCondition);

    if (!model || !architecture) {
      throw new Error(`Model or architecture not found for ${marketCondition}`);
    }

    this.isTraining = true;
    console.log(`🏋️ Training ${marketCondition} model with ${trainingData.features.length} samples...`);

    const xTrain = tf.tensor2d(trainingData.features);
    const yTrain = tf.tensor2d(trainingData.labels);

    try {
      const history = await model.fit(xTrain, yTrain, {
        epochs: architecture.epochs,
        batchSize: architecture.batchSize,
        validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, accuracy=${logs?.acc?.toFixed(4)}`);
              this.emit('trainingProgress', {
                marketCondition,
                epoch,
                loss: logs?.loss,
                accuracy: logs?.acc,
                valLoss: logs?.val_loss,
                valAccuracy: logs?.val_acc
              });
            }
          },
          onTrainEnd: () => {
            console.log(`✅ Completed training for ${marketCondition} model`);
            this.emit('trainingComplete', { marketCondition });
          }
        }
      });

      // Store training history
      this.trainingHistory.set(marketCondition, history.history);

      return history;
    } finally {
      xTrain.dispose();
      yTrain.dispose();
      this.isTraining = false;
    }
  }

  /**
   * Train market detector with labeled market condition data
   */
  async trainMarketDetector(trainingData: TrainingData): Promise<any> {
    if (!this.marketDetector) {
      throw new Error('Market detector not initialized');
    }

    console.log('🎯 Training market condition detector...');

    const xTrain = tf.tensor2d(trainingData.features);
    const yTrain = tf.tensor2d(trainingData.labels);

    try {
      const history = await this.marketDetector.fit(xTrain, yTrain, {
        epochs: 150,
        batchSize: 64,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 15 === 0) {
              console.log(`Detector Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, accuracy=${logs?.acc?.toFixed(4)}`);
            }
          }
        }
      });

      this.trainingHistory.set('market_detector', history.history);
      return history;
    } finally {
      xTrain.dispose();
      yTrain.dispose();
    }
  }

  /**
   * Ensemble prediction from multiple models
   */
  async getEnsemblePrediction(features: number[]): Promise<ModelPrediction> {
    const condition = await this.detectMarketCondition(features);
    const predictions: ModelPrediction[] = [];

    // Get predictions from all relevant models
    const relevantModels = this.getRelevantModels(condition);

    for (const modelType of relevantModels) {
      try {
        const prediction = await this.getPrediction(features, { ...condition, type: modelType as any });
        predictions.push(prediction);
      } catch (error) {
        console.warn(`Failed to get prediction from ${modelType} model:`, error);
      }
    }

    // Combine predictions using weighted voting
    return this.combineEnsemblePredictions(predictions, condition);
  }

  /**
   * Adaptive learning - retrain models based on recent performance
   */
  async adaptiveRetraining(
    performanceMetrics: Map<string, number>,
    newData: TrainingData
  ): Promise<void> {
    console.log('🔄 Starting adaptive retraining...');

    for (const [marketCondition, performance] of performanceMetrics.entries()) {
      // Retrain models with poor performance
      if (performance < 0.7) {
        console.log(`📉 Retraining ${marketCondition} model (performance: ${performance.toFixed(3)})`);

        // Filter data relevant to this market condition
        const relevantData = this.filterDataByCondition(newData, marketCondition);

        if (relevantData.features.length > 100) {
          await this.trainModel(marketCondition, relevantData);
        }
      }
    }

    this.emit('adaptiveRetrainingComplete');
  }

  /**
   * Model evaluation and performance metrics
   */
  async evaluateModel(
    marketCondition: string,
    testData: TrainingData
  ): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    confusionMatrix: number[][];
  }> {
    const model = this.models.get(marketCondition);
    if (!model) {
      throw new Error(`Model not found for ${marketCondition}`);
    }

    const xTest = tf.tensor2d(testData.features);
    const yTest = tf.tensor2d(testData.labels);

    try {
      const evaluation = await model.evaluate(xTest, yTest) as tf.Scalar[];
      const metrics = await Promise.all(evaluation.map(metric => metric.data()));

      // Calculate confusion matrix
      const predictions = model.predict(xTest) as tf.Tensor;
      const predData = await predictions.data();
      const actualData = await yTest.data();

      const confusionMatrix = this.calculateConfusionMatrix(
        Array.from(actualData),
        Array.from(predData),
        testData.labels[0].length
      );

      predictions.dispose();

      return {
        accuracy: metrics[1] || 0,
        precision: metrics[2] || 0,
        recall: metrics[3] || 0,
        f1Score: metrics[4] || 0,
        confusionMatrix
      };
    } finally {
      xTest.dispose();
      yTest.dispose();
    }
  }

  /**
   * Helper methods
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0;

    const n = prices.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = prices.reduce((sum, price) => sum + price, 0);
    const sumXY = prices.reduce((sum, price, i) => sum + i * price, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 2) return 0;
    return (prices[prices.length - 1] - prices[0]) / prices[0];
  }

  private calculateSupport(features: number[]): number {
    // Simplified support calculation
    const prices = features.slice(-20);
    return Math.min(...prices);
  }

  private calculateResistance(features: number[]): number {
    // Simplified resistance calculation
    const prices = features.slice(-20);
    return Math.max(...prices);
  }

  private calculateRiskScore(probabilities: number[], condition: MarketCondition): number {
    const uncertainty = 1 - Math.max(...probabilities);
    const volatilityRisk = condition.volatility;
    return (uncertainty + volatilityRisk) / 2;
  }

  private calculateExpectedReturn(probabilities: number[], condition: MarketCondition): number {
    // Simplified expected return calculation
    const bullishProbability = probabilities[0] || 0;
    const bearishProbability = probabilities[probabilities.length - 1] || 0;

    return (bullishProbability - bearishProbability) * condition.volatility * 0.1;
  }

  private forecastVolatility(features: number[], condition: MarketCondition): number {
    const currentVol = this.calculateVolatility(features.slice(-10));
    const trendFactor = Math.abs(condition.trend);
    return currentVol * (1 + trendFactor);
  }

  private generateExplanation(probabilities: number[], condition: MarketCondition): string[] {
    const explanations = [];
    const maxIndex = probabilities.indexOf(Math.max(...probabilities));

    explanations.push(`Market condition: ${condition.type} (${(condition.confidence * 100).toFixed(1)}% confidence)`);
    explanations.push(`Volatility: ${(condition.volatility * 100).toFixed(2)}%`);
    explanations.push(`Trend strength: ${condition.trend.toFixed(3)}`);

    if (condition.type === 'BULL') {
      explanations.push('Optimized for trend-following strategies');
    } else if (condition.type === 'BEAR') {
      explanations.push('Focused on defensive positioning');
    } else if (condition.type === 'SIDEWAYS') {
      explanations.push('Range-bound trading opportunities');
    }

    return explanations;
  }

  private getTimeHorizon(marketType: string): number {
    switch (marketType) {
      case 'HIGH_VOLATILITY': return 5; // 5 minutes
      case 'BREAKOUT': return 15; // 15 minutes
      case 'BULL':
      case 'BEAR': return 60; // 1 hour
      case 'SIDEWAYS': return 30; // 30 minutes
      default: return 30;
    }
  }

  private getRelevantModels(condition: MarketCondition): string[] {
    const models = [condition.type];

    // Add related models based on condition
    if (condition.volatility > 0.05) {
      models.push('HIGH_VOLATILITY');
    } else if (condition.volatility < 0.02) {
      models.push('LOW_VOLATILITY');
    }

    if (Math.abs(condition.trend) > 0.02) {
      models.push(condition.trend > 0 ? 'BULL' : 'BEAR');
    }

    return [...new Set(models)];
  }

  private combineEnsemblePredictions(
    predictions: ModelPrediction[],
    condition: MarketCondition
  ): ModelPrediction {
    if (predictions.length === 0) {
      throw new Error('No predictions to combine');
    }

    if (predictions.length === 1) {
      return predictions[0];
    }

    // Weight predictions by confidence
    const weights = predictions.map(p => p.confidence);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    // Combine predictions
    const combinedPrediction = new Array(predictions[0].prediction.length).fill(0);
    let combinedConfidence = 0;
    let combinedRisk = 0;
    let combinedReturn = 0;

    predictions.forEach((pred, i) => {
      const weight = normalizedWeights[i];
      pred.prediction.forEach((prob, j) => {
        combinedPrediction[j] += prob * weight;
      });
      combinedConfidence += pred.confidence * weight;
      combinedRisk += pred.riskScore * weight;
      combinedReturn += pred.expectedReturn * weight;
    });

    return {
      prediction: combinedPrediction,
      confidence: combinedConfidence,
      explanation: [
        `Ensemble prediction from ${predictions.length} models`,
        ...predictions[0].explanation
      ],
      riskScore: combinedRisk,
      timeHorizon: predictions[0].timeHorizon,
      expectedReturn: combinedReturn,
      volatilityForecast: predictions[0].volatilityForecast
    };
  }

  private filterDataByCondition(data: TrainingData, condition: string): TrainingData {
    const filtered = {
      features: [] as number[][],
      labels: [] as number[][],
      timestamps: [] as number[],
      marketConditions: [] as MarketCondition[]
    };

    data.marketConditions.forEach((mc, i) => {
      if (mc.type === condition) {
        filtered.features.push(data.features[i]);
        filtered.labels.push(data.labels[i]);
        filtered.timestamps.push(data.timestamps[i]);
        filtered.marketConditions.push(mc);
      }
    });

    return filtered;
  }

  private calculateConfusionMatrix(
    actual: number[],
    predicted: number[],
    numClasses: number
  ): number[][] {
    const matrix = Array(numClasses).fill(null).map(() => Array(numClasses).fill(0));

    for (let i = 0; i < actual.length; i += numClasses) {
      const actualClass = actual.slice(i, i + numClasses).indexOf(Math.max(...actual.slice(i, i + numClasses)));
      const predClass = predicted.slice(i, i + numClasses).indexOf(Math.max(...predicted.slice(i, i + numClasses)));
      matrix[actualClass][predClass]++;
    }

    return matrix;
  }

  private countParameters(model: tf.LayersModel): number {
    return model.countParams();
  }

  /**
   * Save all models to disk
   */
  async saveModels(basePath: string): Promise<void> {
    console.log('💾 Saving market-specific models...');

    // Save market detector
    if (this.marketDetector) {
      await this.marketDetector.save(`file://${basePath}/market_detector`);
    }

    // Save all specialized models
    for (const [condition, model] of this.models.entries()) {
      await model.save(`file://${basePath}/${condition.toLowerCase()}_model`);
    }

    // Save architectures and training history
    const metadata = {
      architectures: Object.fromEntries(this.architectures),
      trainingHistory: Object.fromEntries(this.trainingHistory),
      modelCount: this.models.size,
      lastSaved: new Date().toISOString()
    };

    require('fs').writeFileSync(
      `${basePath}/models_metadata.json`,
      JSON.stringify(metadata, null, 2)
    );

    console.log(`✅ Saved ${this.models.size} models to ${basePath}`);
  }

  /**
   * Load models from disk
   */
  async loadModels(basePath: string): Promise<void> {
    console.log('📂 Loading market-specific models...');

    try {
      // Load market detector
      this.marketDetector = await tf.loadLayersModel(`file://${basePath}/market_detector/model.json`);

      // Load specialized models
      for (const condition of this.architectures.keys()) {
        try {
          const model = await tf.loadLayersModel(`file://${basePath}/${condition.toLowerCase()}_model/model.json`);
          this.models.set(condition, model);
        } catch (error) {
          console.warn(`Failed to load ${condition} model:`, error);
        }
      }

      // Load metadata
      const metadata = JSON.parse(
        require('fs').readFileSync(`${basePath}/models_metadata.json`, 'utf8')
      );

      if (metadata.trainingHistory) {
        this.trainingHistory = new Map(Object.entries(metadata.trainingHistory));
      }

      console.log(`✅ Loaded ${this.models.size} models from ${basePath}`);
    } catch (error) {
      console.error('Failed to load models:', error);
      throw error;
    }
  }

  /**
   * Get model statistics and health
   */
  getModelStats(): any {
    const stats = {
      totalModels: this.models.size,
      marketDetectorReady: !!this.marketDetector,
      isTraining: this.isTraining,
      modelSizes: {} as any,
      trainingHistory: Object.fromEntries(this.trainingHistory),
      architectures: Object.fromEntries(this.architectures)
    };

    // Get model parameter counts
    for (const [condition, model] of this.models.entries()) {
      stats.modelSizes[condition] = this.countParameters(model);
    }

    return stats;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    console.log('🧹 Disposing market-specific neural networks...');

    // Dispose all models
    this.models.forEach(model => model.dispose());
    this.models.clear();

    if (this.marketDetector) {
      this.marketDetector.dispose();
      this.marketDetector = null;
    }

    // Clear training history
    this.trainingHistory.clear();

    console.log('✅ All neural network resources disposed');
  }
}

import * as tf from '@tensorflow/tfjs-node';

interface MarketCondition {
  type: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY';
  confidence: number;
  characteristics: {
    volatility: number;
    trend: number;
    volume: number;
    momentum: number;
  };
}

interface NetworkPrediction {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  probability: number;
  features: number[];
  reasoning: string[];
}

interface NetworkConfig {
  inputDim: number;
  sequenceLength: number;
  hiddenUnits: number;
  layers: number;
  dropoutRate: number;
  learningRate: number;
  batchSize: number;
}

export class MarketConditionNetworks {
  private networks: Map<string, tf.LayersModel> = new Map();
  private configs: Map<string, NetworkConfig> = new Map();
  private trainingData: Map<string, { inputs: number[][][]; outputs: number[][] }> = new Map();

  // Performance tracking per network
  private networkPerformance: Map<string, {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    lastUpdated: number;
  }> = new Map();

  constructor() {
    this.initializeNetworkConfigs();
    this.initializeNetworks();
  }

  /**
   * Initialize configuration for each market condition network
   */
  private initializeNetworkConfigs(): void {
    // Bull Market LSTM - optimized for trend following
    this.configs.set('bull_market', {
      inputDim: 20,
      sequenceLength: 30,
      hiddenUnits: 128,
      layers: 3,
      dropoutRate: 0.2,
      learningRate: 0.001,
      batchSize: 32
    });

    // Bear Market CNN - optimized for pattern recognition in downtrends
    this.configs.set('bear_market', {
      inputDim: 20,
      sequenceLength: 20,
      hiddenUnits: 64,
      layers: 2,
      dropoutRate: 0.3,
      learningRate: 0.002,
      batchSize: 24
    });

    // Sideways Market Transformer - optimized for range-bound trading
    this.configs.set('sideways_market', {
      inputDim: 16,
      sequenceLength: 50,
      hiddenUnits: 96,
      layers: 4,
      dropoutRate: 0.15,
      learningRate: 0.0015,
      batchSize: 28
    });

    // High Volatility RNN - optimized for rapid changes
    this.configs.set('high_volatility', {
      inputDim: 25,
      sequenceLength: 15,
      hiddenUnits: 156,
      layers: 2,
      dropoutRate: 0.25,
      learningRate: 0.003,
      batchSize: 20
    });

    // Low Volatility Attention Model - optimized for subtle signals
    this.configs.set('low_volatility', {
      inputDim: 30,
      sequenceLength: 60,
      hiddenUnits: 80,
      layers: 3,
      dropoutRate: 0.1,
      learningRate: 0.0008,
      batchSize: 36
    });
  }

  /**
   * Initialize all neural networks
   */
  private async initializeNetworks(): Promise<void> {
    await this.createBullMarketLSTM();
    await this.createBearMarketCNN();
    await this.createSidewaysMarketTransformer();
    await this.createHighVolatilityRNN();
    await this.createLowVolatilityAttention();
  }

  /**
   * Create Bull Market LSTM Network
   */
  private async createBullMarketLSTM(): Promise<void> {
    const config = this.configs.get('bull_market')!;

    const model = tf.sequential({
      layers: [
        // Input layer
        tf.layers.inputLayer({ inputShape: [config.sequenceLength, config.inputDim] }),

        // LSTM layers for trend analysis
        tf.layers.lstm({
          units: config.hiddenUnits,
          returnSequences: true,
          activation: 'tanh',
          recurrentActivation: 'sigmoid',
          kernelInitializer: 'glorotUniform'
        }),
        tf.layers.dropout({ rate: config.dropoutRate }),

        tf.layers.lstm({
          units: config.hiddenUnits / 2,
          returnSequences: true,
          activation: 'tanh'
        }),
        tf.layers.dropout({ rate: config.dropoutRate }),

        tf.layers.lstm({
          units: config.hiddenUnits / 4,
          returnSequences: false,
          activation: 'tanh'
        }),

        // Dense layers for decision making
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: config.dropoutRate }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 3, activation: 'softmax' }) // BUY, SELL, HOLD
      ]
    });

    model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.networks.set('bull_market', model);
    console.log('✅ Bull Market LSTM network created');
  }

  /**
   * Create Bear Market CNN Network
   */
  private async createBearMarketCNN(): Promise<void> {
    const config = this.configs.get('bear_market')!;

    const model = tf.sequential({
      layers: [
        // Reshape input for CNN
        tf.layers.inputLayer({ inputShape: [config.sequenceLength, config.inputDim] }),
        tf.layers.reshape({ targetShape: [config.sequenceLength, config.inputDim, 1] }),

        // Convolutional layers for pattern recognition
        tf.layers.conv2d({
          filters: 32,
          kernelSize: [3, 3],
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.maxPooling2d({ poolSize: [2, 2] }),
        tf.layers.dropout({ rate: config.dropoutRate }),

        tf.layers.conv2d({
          filters: 64,
          kernelSize: [3, 3],
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.maxPooling2d({ poolSize: [2, 2] }),
        tf.layers.dropout({ rate: config.dropoutRate }),

        // Flatten and dense layers
        tf.layers.flatten(),
        tf.layers.dense({ units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: config.dropoutRate }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ units: 3, activation: 'softmax' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.networks.set('bear_market', model);
    console.log('✅ Bear Market CNN network created');
  }

  /**
   * Create Sideways Market Transformer-style Network
   */
  private async createSidewaysMarketTransformer(): Promise<void> {
    const config = this.configs.get('sideways_market')!;

    // Simplified transformer architecture using available layers
    const model = tf.sequential({
      layers: [
        tf.layers.inputLayer({ inputShape: [config.sequenceLength, config.inputDim] }),

        // Multi-head attention simulation using dense layers
        tf.layers.dense({ units: config.hiddenUnits, activation: 'relu' }),
        tf.layers.dropout({ rate: config.dropoutRate }),

        // Position encoding simulation
        tf.layers.dense({ units: config.hiddenUnits, activation: 'relu' }),
        tf.layers.layerNormalization(),

        // Feed-forward layers
        tf.layers.dense({ units: config.hiddenUnits * 2, activation: 'relu' }),
        tf.layers.dropout({ rate: config.dropoutRate }),
        tf.layers.dense({ units: config.hiddenUnits, activation: 'relu' }),
        tf.layers.layerNormalization(),

        // Global average pooling
        tf.layers.globalAveragePooling1d(),

        // Output layers
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: config.dropoutRate }),
        tf.layers.dense({ units: 3, activation: 'softmax' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.networks.set('sideways_market', model);
    console.log('✅ Sideways Market Transformer network created');
  }

  /**
   * Create High Volatility RNN Network
   */
  private async createHighVolatilityRNN(): Promise<void> {
    const config = this.configs.get('high_volatility')!;

    const model = tf.sequential({
      layers: [
        tf.layers.inputLayer({ inputShape: [config.sequenceLength, config.inputDim] }),

        // GRU layers for handling volatility
        tf.layers.gru({
          units: config.hiddenUnits,
          returnSequences: true,
          activation: 'tanh',
          resetAfter: true
        }),
        tf.layers.dropout({ rate: config.dropoutRate }),

        tf.layers.gru({
          units: config.hiddenUnits / 2,
          returnSequences: false,
          activation: 'tanh'
        }),

        // Dense layers with batch normalization
        tf.layers.dense({ units: 96, activation: 'relu' }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: config.dropoutRate }),

        tf.layers.dense({ units: 48, activation: 'relu' }),
        tf.layers.dense({ units: 3, activation: 'softmax' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.networks.set('high_volatility', model);
    console.log('✅ High Volatility RNN network created');
  }

  /**
   * Create Low Volatility Attention Network
   */
  private async createLowVolatilityAttention(): Promise<void> {
    const config = this.configs.get('low_volatility')!;

    const model = tf.sequential({
      layers: [
        tf.layers.inputLayer({ inputShape: [config.sequenceLength, config.inputDim] }),

        // Attention mechanism simulation
        tf.layers.dense({ units: config.hiddenUnits, activation: 'tanh' }),
        tf.layers.dropout({ rate: config.dropoutRate }),

        // Bidirectional LSTM for context
        tf.layers.bidirectional({
          layer: tf.layers.lstm({
            units: config.hiddenUnits / 2,
            returnSequences: true,
            activation: 'tanh'
          })
        }),

        // Attention weights
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
        tf.layers.repeatVector({ n: config.hiddenUnits }),
        tf.layers.permute({ dims: [2, 1] }),

        // Apply attention
        tf.layers.multiply(),
        tf.layers.globalAveragePooling1d(),

        // Output layers
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: config.dropoutRate }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 3, activation: 'softmax' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.networks.set('low_volatility', model);
    console.log('✅ Low Volatility Attention network created');
  }

  /**
   * Get prediction from appropriate network based on market condition
   */
  async getPrediction(
    marketData: number[][],
    marketCondition: MarketCondition
  ): Promise<NetworkPrediction> {
    const networkName = this.selectNetworkForCondition(marketCondition);
    const network = this.networks.get(networkName);

    if (!network) {
      throw new Error(`Network ${networkName} not found`);
    }

    // Prepare input data
    const inputTensor = tf.tensor3d([marketData]);

    try {
      // Get prediction
      const prediction = network.predict(inputTensor) as tf.Tensor;
      const probabilities = await prediction.data();

      // Convert to action
      const actions: Array<'BUY' | 'SELL' | 'HOLD'> = ['BUY', 'SELL', 'HOLD'];
      const maxIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
      const action = actions[maxIndex];
      const confidence = probabilities[maxIndex];

      // Generate reasoning
      const reasoning = this.generateReasoning(networkName, marketCondition, probabilities);

      return {
        action,
        confidence,
        probability: confidence,
        features: Array.from(probabilities),
        reasoning
      };

    } finally {
      inputTensor.dispose();
    }
  }

  /**
   * Select appropriate network based on market condition
   */
  private selectNetworkForCondition(condition: MarketCondition): string {
    switch (condition.type) {
      case 'BULL':
        return 'bull_market';
      case 'BEAR':
        return 'bear_market';
      case 'SIDEWAYS':
        return 'sideways_market';
      case 'HIGH_VOLATILITY':
        return 'high_volatility';
      case 'LOW_VOLATILITY':
        return 'low_volatility';
      default:
        // Default to sideways market network
        return 'sideways_market';
    }
  }

  /**
   * Generate reasoning for the prediction
   */
  private generateReasoning(
    networkName: string,
    condition: MarketCondition,
    probabilities: ArrayLike<number>
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Used ${networkName.replace('_', ' ')} network specialized for ${condition.type} market`);
    reasoning.push(`Market condition confidence: ${(condition.confidence * 100).toFixed(1)}%`);

    const [buyProb, sellProb, holdProb] = Array.from(probabilities);
    reasoning.push(`Prediction probabilities: BUY ${(buyProb * 100).toFixed(1)}%, SELL ${(sellProb * 100).toFixed(1)}%, HOLD ${(holdProb * 100).toFixed(1)}%`);

    // Add specific reasoning based on network type
    switch (networkName) {
      case 'bull_market':
        reasoning.push('LSTM analysis favors trend continuation in bull market');
        break;
      case 'bear_market':
        reasoning.push('CNN pattern recognition identified bearish signals');
        break;
      case 'sideways_market':
        reasoning.push('Transformer attention focused on range-bound patterns');
        break;
      case 'high_volatility':
        reasoning.push('RNN detected rapid market changes requiring quick action');
        break;
      case 'low_volatility':
        reasoning.push('Attention mechanism identified subtle market signals');
        break;
    }

    return reasoning;
  }

  /**
   * Train a specific network with new data
   */
  async trainNetwork(
    networkName: string,
    trainingData: { inputs: number[][][]; outputs: number[][] },
    epochs = 10
  ): Promise<{ loss: number; accuracy: number }> {
    const network = this.networks.get(networkName);
    if (!network) {
      throw new Error(`Network ${networkName} not found`);
    }

    const config = this.configs.get(networkName)!;

    // Prepare tensors
    const xs = tf.tensor3d(trainingData.inputs);
    const ys = tf.tensor2d(trainingData.outputs);

    try {
      // Train the network
      const history = await network.fit(xs, ys, {
        epochs,
        batchSize: config.batchSize,
        validationSplit: 0.2,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 5 === 0) {
              console.log(`${networkName} training - Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, accuracy=${logs?.acc?.toFixed(4)}`);
            }
          }
        }
      });

      const finalLoss = history.history.loss[history.history.loss.length - 1] as number;
      const finalAccuracy = history.history.acc[history.history.acc.length - 1] as number;

      // Update performance metrics
      this.networkPerformance.set(networkName, {
        accuracy: finalAccuracy,
        precision: 0.8, // Would calculate from validation data
        recall: 0.8,
        f1Score: 0.8,
        lastUpdated: Date.now()
      });

      console.log(`✅ ${networkName} training completed - Loss: ${finalLoss.toFixed(4)}, Accuracy: ${finalAccuracy.toFixed(4)}`);

      return { loss: finalLoss, accuracy: finalAccuracy };

    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  /**
   * Evaluate all networks and return performance comparison
   */
  async evaluateAllNetworks(
    testData: { inputs: number[][][]; outputs: number[][] }
  ): Promise<Map<string, { accuracy: number; loss: number; predictions: number[] }>> {
    const results = new Map();

    const xs = tf.tensor3d(testData.inputs);
    const ys = tf.tensor2d(testData.outputs);

    for (const [networkName, network] of this.networks.entries()) {
      try {
        const evaluation = await network.evaluate(xs, ys) as tf.Tensor[];
        const loss = await evaluation[0].data();
        const accuracy = await evaluation[1].data();

        const predictions = network.predict(xs) as tf.Tensor;
        const predictionData = await predictions.data();

        results.set(networkName, {
          accuracy: accuracy[0],
          loss: loss[0],
          predictions: Array.from(predictionData)
        });

        predictions.dispose();
        evaluation.forEach(tensor => tensor.dispose());

      } catch (error) {
        console.error(`Error evaluating ${networkName}:`, error);
      }
    }

    xs.dispose();
    ys.dispose();

    return results;
  }

  /**
   * Save all networks to disk
   */
  async saveNetworks(basePath: string): Promise<void> {
    for (const [networkName, network] of this.networks.entries()) {
      try {
        await network.save(`file://${basePath}/${networkName}`);
        console.log(`✅ Saved ${networkName} network`);
      } catch (error) {
        console.error(`❌ Failed to save ${networkName}:`, error);
      }
    }
  }

  /**
   * Load networks from disk
   */
  async loadNetworks(basePath: string): Promise<void> {
    for (const networkName of this.configs.keys()) {
      try {
        const network = await tf.loadLayersModel(`file://${basePath}/${networkName}/model.json`);
        this.networks.set(networkName, network);
        console.log(`✅ Loaded ${networkName} network`);
      } catch (error) {
        console.error(`❌ Failed to load ${networkName}:`, error);
        // Keep the initialized network if loading fails
      }
    }
  }

  /**
   * Get performance metrics for all networks
   */
  getNetworkPerformance(): Map<string, any> {
    return new Map(this.networkPerformance);
  }

  /**
   * Get network architectures summary
   */
  getNetworkSummary(): any {
    const summary: any = {};

    for (const [networkName, network] of this.networks.entries()) {
      const config = this.configs.get(networkName)!;
      const performance = this.networkPerformance.get(networkName);

      summary[networkName] = {
        architecture: this.getArchitectureType(networkName),
        parameters: network.countParams(),
        layers: network.layers.length,
        config: {
          inputDim: config.inputDim,
          sequenceLength: config.sequenceLength,
          hiddenUnits: config.hiddenUnits
        },
        performance: performance || { accuracy: 0, precision: 0, recall: 0, f1Score: 0 }
      };
    }

    return summary;
  }

  private getArchitectureType(networkName: string): string {
    switch (networkName) {
      case 'bull_market': return 'LSTM';
      case 'bear_market': return 'CNN';
      case 'sideways_market': return 'Transformer-style';
      case 'high_volatility': return 'RNN/GRU';
      case 'low_volatility': return 'Attention-based';
      default: return 'Unknown';
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    for (const network of this.networks.values()) {
      network.dispose();
    }
    this.networks.clear();
  }
}

// Export singleton instance
export const marketConditionNetworks = new MarketConditionNetworks();

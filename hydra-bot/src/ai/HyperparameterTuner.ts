import type * as tf from '@tensorflow/tfjs-node';

interface ParameterSpace {
  name: string;
  type: 'continuous' | 'discrete' | 'categorical';
  bounds?: [number, number]; // For continuous/discrete
  choices?: any[]; // For categorical
  scale?: 'linear' | 'log'; // For continuous parameters
}

interface Hyperparameters {
  learningRate: number;
  batchSize: number;
  hiddenUnits: number;
  layers: number;
  dropoutRate: number;
  regularization: number;
  optimizerType: string;
  activationFunction: string;
  sequenceLength?: number;
  [key: string]: any;
}

interface TrialResult {
  parameters: Hyperparameters;
  score: number; // Higher is better
  metrics: {
    accuracy: number;
    loss: number;
    validationAccuracy: number;
    validationLoss: number;
    trainingTime: number;
  };
  trialId: string;
  timestamp: number;
}

interface OptimizationConfig {
  maxTrials: number;
  maxTime: number; // Maximum time in seconds
  earlyStoppingPatience: number;
  acquisitionFunction: 'ucb' | 'ei' | 'poi'; // Upper Confidence Bound, Expected Improvement, Probability of Improvement
  kappa: number; // UCB exploration parameter
  xi: number; // EI exploration parameter
  randomTrials: number; // Number of random trials before Bayesian optimization
}

interface GaussianProcess {
  mean: number[];
  covariance: number[][];
  hyperparams: {
    lengthScale: number;
    signalVariance: number;
    noiseVariance: number;
  };
}

export class HyperparameterTuner {
  private parameterSpace: ParameterSpace[];
  private trialHistory: TrialResult[] = [];
  private bestResult: TrialResult | null = null;
  private config: OptimizationConfig;

  // Gaussian Process for Bayesian optimization
  private gaussianProcess: GaussianProcess | null = null;
  private observedPoints: number[][] = [];
  private observedValues: number[] = [];

  // Optimization state
  private currentTrial = 0;
  private startTime = 0;
  private isOptimizing = false;

  constructor(parameterSpace: ParameterSpace[], config: OptimizationConfig) {
    this.parameterSpace = parameterSpace;
    this.config = config;
  }

  /**
   * Start hyperparameter optimization
   */
  async optimize(
    modelFactory: (params: Hyperparameters) => tf.LayersModel,
    trainingData: { xs: tf.Tensor; ys: tf.Tensor },
    validationData: { xs: tf.Tensor; ys: tf.Tensor },
    evaluationMetric: 'accuracy' | 'loss' | 'f1Score' = 'accuracy'
  ): Promise<{
    bestParameters: Hyperparameters;
    bestScore: number;
    optimizationHistory: TrialResult[];
    convergenceInfo: {
      converged: boolean;
      improvementHistory: number[];
      totalTrials: number;
      totalTime: number;
    };
  }> {
    this.isOptimizing = true;
    this.startTime = Date.now();
    this.currentTrial = 0;

    console.log('🔍 Starting hyperparameter optimization...');
    console.log(`📊 Parameter space: ${this.parameterSpace.length} dimensions`);
    console.log(`🎯 Max trials: ${this.config.maxTrials}`);

    // Initialize with random trials
    await this.performRandomTrials(
      modelFactory,
      trainingData,
      validationData,
      evaluationMetric
    );

    // Perform Bayesian optimization
    await this.performBayesianOptimization(
      modelFactory,
      trainingData,
      validationData,
      evaluationMetric
    );

    const totalTime = (Date.now() - this.startTime) / 1000;
    const improvementHistory = this.calculateImprovementHistory();

    console.log('✅ Hyperparameter optimization completed');
    console.log(`🏆 Best score: ${this.bestResult?.score.toFixed(4)}`);
    console.log(`⏱️ Total time: ${totalTime.toFixed(2)}s`);

    return {
      bestParameters: this.bestResult?.parameters || this.generateRandomParameters(),
      bestScore: this.bestResult?.score || 0,
      optimizationHistory: [...this.trialHistory],
      convergenceInfo: {
        converged: this.hasConverged(),
        improvementHistory,
        totalTrials: this.currentTrial,
        totalTime
      }
    };
  }

  /**
   * Perform initial random trials
   */
  private async performRandomTrials(
    modelFactory: (params: Hyperparameters) => tf.LayersModel,
    trainingData: { xs: tf.Tensor; ys: tf.Tensor },
    validationData: { xs: tf.Tensor; ys: tf.Tensor },
    evaluationMetric: string
  ): Promise<void> {
    console.log(`🎲 Performing ${this.config.randomTrials} random trials...`);

    for (let i = 0; i < this.config.randomTrials && this.shouldContinue(); i++) {
      const parameters = this.generateRandomParameters();
      await this.evaluateParameters(
        parameters,
        modelFactory,
        trainingData,
        validationData,
        evaluationMetric
      );
      this.currentTrial++;
    }

    // Initialize Gaussian Process with random trial results
    this.initializeGaussianProcess();
  }

  /**
   * Perform Bayesian optimization using Gaussian Process
   */
  private async performBayesianOptimization(
    modelFactory: (params: Hyperparameters) => tf.LayersModel,
    trainingData: { xs: tf.Tensor; ys: tf.Tensor },
    validationData: { xs: tf.Tensor; ys: tf.Tensor },
    evaluationMetric: string
  ): Promise<void> {
    console.log('🧠 Starting Bayesian optimization...');

    while (this.shouldContinue()) {
      // Find next promising parameters using acquisition function
      const nextParameters = await this.acquireNextParameters();

      // Evaluate the parameters
      const result = await this.evaluateParameters(
        nextParameters,
        modelFactory,
        trainingData,
        validationData,
        evaluationMetric
      );

      // Update Gaussian Process
      this.updateGaussianProcess(result);

      this.currentTrial++;

      // Log progress
      if (this.currentTrial % 5 === 0) {
        console.log(`📈 Trial ${this.currentTrial}/${this.config.maxTrials} - Best score: ${this.bestResult?.score.toFixed(4)}`);
      }
    }
  }

  /**
   * Generate random parameters within the defined space
   */
  private generateRandomParameters(): Hyperparameters {
    const parameters: any = {};

    for (const param of this.parameterSpace) {
      switch (param.type) {
        case 'continuous':
          if (param.bounds) {
            const [min, max] = param.bounds;
            if (param.scale === 'log') {
              const logMin = Math.log(min);
              const logMax = Math.log(max);
              parameters[param.name] = Math.exp(Math.random() * (logMax - logMin) + logMin);
            } else {
              parameters[param.name] = Math.random() * (max - min) + min;
            }
          }
          break;

        case 'discrete':
          if (param.bounds) {
            const [min, max] = param.bounds;
            parameters[param.name] = Math.floor(Math.random() * (max - min + 1)) + min;
          }
          break;

        case 'categorical':
          if (param.choices) {
            const randomIndex = Math.floor(Math.random() * param.choices.length);
            parameters[param.name] = param.choices[randomIndex];
          }
          break;
      }
    }

    return parameters as Hyperparameters;
  }

  /**
   * Evaluate a set of hyperparameters
   */
  private async evaluateParameters(
    parameters: Hyperparameters,
    modelFactory: (params: Hyperparameters) => tf.LayersModel,
    trainingData: { xs: tf.Tensor; ys: tf.Tensor },
    validationData: { xs: tf.Tensor; ys: tf.Tensor },
    evaluationMetric: string
  ): Promise<TrialResult> {
    const trialStartTime = Date.now();

    try {
      // Create model with these parameters
      const model = modelFactory(parameters);

      // Train the model
      const history = await model.fit(trainingData.xs, trainingData.ys, {
        epochs: 50, // Fixed epochs for hyperparameter tuning
        batchSize: parameters.batchSize,
        validationData: [validationData.xs, validationData.ys],
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            // Early stopping for obviously bad hyperparameters
            if (epoch > 10 && (logs?.val_loss as number) > 10) {
              model.stopTraining = true;
            }
          }
        }
      });

      // Calculate final metrics
      const finalEpoch = history.epoch.length - 1;
      const metrics = {
        accuracy: history.history.acc?.[finalEpoch] as number || 0,
        loss: history.history.loss[finalEpoch] as number,
        validationAccuracy: history.history.val_acc?.[finalEpoch] as number || 0,
        validationLoss: history.history.val_loss[finalEpoch] as number,
        trainingTime: (Date.now() - trialStartTime) / 1000
      };

      // Calculate score based on evaluation metric
      let score = 0;
      switch (evaluationMetric) {
        case 'accuracy':
          score = metrics.validationAccuracy;
          break;
        case 'loss':
          score = -metrics.validationLoss; // Negative because lower is better
          break;
        case 'f1Score':
          // Simplified F1 score calculation
          score = 2 * (metrics.accuracy * metrics.validationAccuracy) /
                  (metrics.accuracy + metrics.validationAccuracy);
          break;
      }

      const result: TrialResult = {
        parameters,
        score,
        metrics,
        trialId: `trial_${this.currentTrial}_${Date.now()}`,
        timestamp: Date.now()
      };

      // Update best result
      if (!this.bestResult || score > this.bestResult.score) {
        this.bestResult = result;
        console.log(`🎯 New best score: ${score.toFixed(4)} with parameters:`, parameters);
      }

      // Add to history
      this.trialHistory.push(result);

      // Update Gaussian Process data
      this.observedPoints.push(this.parametersToVector(parameters));
      this.observedValues.push(score);

      // Cleanup model
      model.dispose();

      return result;

    } catch (error) {
      console.error('❌ Trial evaluation failed:', error);

      // Return poor result for failed trials
      const failedResult: TrialResult = {
        parameters,
        score: Number.NEGATIVE_INFINITY,
        metrics: {
          accuracy: 0,
          loss: Number.POSITIVE_INFINITY,
          validationAccuracy: 0,
          validationLoss: Number.POSITIVE_INFINITY,
          trainingTime: (Date.now() - trialStartTime) / 1000
        },
        trialId: `failed_trial_${this.currentTrial}_${Date.now()}`,
        timestamp: Date.now()
      };

      this.trialHistory.push(failedResult);
      return failedResult;
    }
  }

  /**
   * Initialize Gaussian Process with random trial results
   */
  private initializeGaussianProcess(): void {
    if (this.observedPoints.length === 0) return;

    const dimension = this.observedPoints[0].length;

    this.gaussianProcess = {
      mean: new Array(this.observedValues.length).fill(0),
      covariance: this.calculateCovarianceMatrix(),
      hyperparams: {
        lengthScale: 1.0,
        signalVariance: 1.0,
        noiseVariance: 0.1
      }
    };

    console.log(`🔬 Initialized Gaussian Process with ${this.observedPoints.length} observations`);
  }

  /**
   * Calculate covariance matrix using RBF kernel
   */
  private calculateCovarianceMatrix(): number[][] {
    const n = this.observedPoints.length;
    const matrix: number[][] = [];

    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        const distance = this.euclideanDistance(this.observedPoints[i], this.observedPoints[j]);
        const lengthScale = this.gaussianProcess?.hyperparams.lengthScale || 1.0;
        const signalVariance = this.gaussianProcess?.hyperparams.signalVariance || 1.0;

        // RBF kernel
        const kernel = signalVariance * Math.exp(-0.5 * Math.pow(distance / lengthScale, 2));

        // Add noise to diagonal
        matrix[i][j] = kernel + (i === j ? this.gaussianProcess?.hyperparams.noiseVariance || 0.1 : 0);
      }
    }

    return matrix;
  }

  /**
   * Acquire next parameters using acquisition function
   */
  private async acquireNextParameters(): Promise<Hyperparameters> {
    // Generate candidate points
    const candidates: Hyperparameters[] = [];
    for (let i = 0; i < 1000; i++) {
      candidates.push(this.generateRandomParameters());
    }

    // Evaluate acquisition function for each candidate
    let bestCandidate = candidates[0];
    let bestAcquisitionValue = Number.NEGATIVE_INFINITY;

    for (const candidate of candidates) {
      const acquisitionValue = this.evaluateAcquisitionFunction(candidate);
      if (acquisitionValue > bestAcquisitionValue) {
        bestAcquisitionValue = acquisitionValue;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  /**
   * Evaluate acquisition function (Upper Confidence Bound)
   */
  private evaluateAcquisitionFunction(parameters: Hyperparameters): number {
    const x = this.parametersToVector(parameters);
    const { mean, variance } = this.predictGaussianProcess(x);

    switch (this.config.acquisitionFunction) {
      case 'ucb':
        return mean + this.config.kappa * Math.sqrt(variance);

      case 'ei':
        const improvement = mean - (this.bestResult?.score || 0) - this.config.xi;
        if (variance === 0) return improvement > 0 ? improvement : 0;

        const z = improvement / Math.sqrt(variance);
        return improvement * this.normalCDF(z) + Math.sqrt(variance) * this.normalPDF(z);

      case 'poi':
        const threshold = (this.bestResult?.score || 0) + this.config.xi;
        const zPoi = (mean - threshold) / Math.sqrt(variance);
        return this.normalCDF(zPoi);

      default:
        return mean + Math.sqrt(variance); // Default UCB with kappa=1
    }
  }

  /**
   * Predict mean and variance for a point using Gaussian Process
   */
  private predictGaussianProcess(x: number[]): { mean: number; variance: number } {
    if (!this.gaussianProcess || this.observedPoints.length === 0) {
      return { mean: 0, variance: 1 };
    }

    // Calculate kernel vector between x and observed points
    const kernelVector = this.observedPoints.map(point => {
      const distance = this.euclideanDistance(x, point);
      const lengthScale = this.gaussianProcess!.hyperparams.lengthScale;
      const signalVariance = this.gaussianProcess!.hyperparams.signalVariance;
      return signalVariance * Math.exp(-0.5 * Math.pow(distance / lengthScale, 2));
    });

    // Predict mean
    const covarianceMatrix = this.gaussianProcess.covariance;
    const alpha = this.solveLinearSystem(covarianceMatrix, this.observedValues);
    const mean = kernelVector.reduce((sum, k, i) => sum + k * alpha[i], 0);

    // Predict variance
    const kStar = this.gaussianProcess.hyperparams.signalVariance;
    const covInvK = this.solveLinearSystem(covarianceMatrix, kernelVector);
    const variance = kStar - kernelVector.reduce((sum, k, i) => sum + k * covInvK[i], 0);

    return { mean, variance: Math.max(0, variance) };
  }

  /**
   * Update Gaussian Process with new observation
   */
  private updateGaussianProcess(result: TrialResult): void {
    if (!this.gaussianProcess) return;

    // Recalculate covariance matrix with new observation
    this.gaussianProcess.covariance = this.calculateCovarianceMatrix();

    // Optionally update hyperparameters (simplified)
    if (this.trialHistory.length % 10 === 0) {
      this.optimizeGaussianProcessHyperparameters();
    }
  }

  /**
   * Simple hyperparameter optimization for Gaussian Process
   */
  private optimizeGaussianProcessHyperparameters(): void {
    // Simplified optimization - in practice would use gradient-based optimization
    const bestLengthScale = this.findBestLengthScale();
    if (this.gaussianProcess) {
      this.gaussianProcess.hyperparams.lengthScale = bestLengthScale;
    }
  }

  private findBestLengthScale(): number {
    const candidates = [0.1, 0.5, 1.0, 2.0, 5.0];
    let bestLengthScale = 1.0;
    let bestLogLikelihood = Number.NEGATIVE_INFINITY;

    for (const lengthScale of candidates) {
      const logLikelihood = this.calculateLogLikelihood(lengthScale);
      if (logLikelihood > bestLogLikelihood) {
        bestLogLikelihood = logLikelihood;
        bestLengthScale = lengthScale;
      }
    }

    return bestLengthScale;
  }

  private calculateLogLikelihood(lengthScale: number): number {
    // Simplified log likelihood calculation
    // In practice would use proper marginal likelihood
    return -Math.abs(lengthScale - 1.0); // Prefer length scale around 1.0
  }

  /**
   * Helper methods
   */
  private parametersToVector(parameters: Hyperparameters): number[] {
    const vector: number[] = [];

    for (const param of this.parameterSpace) {
      const value = parameters[param.name];

      switch (param.type) {
        case 'continuous':
          if (param.scale === 'log') {
            vector.push(Math.log(value));
          } else {
            vector.push(value);
          }
          break;

        case 'discrete':
          vector.push(value);
          break;

        case 'categorical':
          if (param.choices) {
            const index = param.choices.indexOf(value);
            vector.push(index);
          }
          break;
      }
    }

    return vector;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  private normalCDF(z: number): number {
    // Approximation of normal cumulative distribution function
    return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
  }

  private normalPDF(z: number): number {
    // Normal probability density function
    return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private solveLinearSystem(A: number[][], b: number[]): number[] {
    // Simplified linear system solver using Gaussian elimination
    const n = A.length;
    const augmented: number[][] = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Elimination
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augmented[i][j] * x[j];
      }
      x[i] /= augmented[i][i];
    }

    return x;
  }

  private shouldContinue(): boolean {
    if (!this.isOptimizing) return false;
    if (this.currentTrial >= this.config.maxTrials) return false;

    const elapsed = (Date.now() - this.startTime) / 1000;
    if (elapsed >= this.config.maxTime) return false;

    return true;
  }

  private hasConverged(): boolean {
    if (this.trialHistory.length < this.config.earlyStoppingPatience) return false;

    const recentScores = this.trialHistory
      .slice(-this.config.earlyStoppingPatience)
      .map(trial => trial.score);

    const improvement = Math.max(...recentScores) - Math.min(...recentScores);
    return improvement < 0.001; // Converged if improvement < 0.1%
  }

  private calculateImprovementHistory(): number[] {
    const improvements: number[] = [];
    let bestSoFar = Number.NEGATIVE_INFINITY;

    for (const trial of this.trialHistory) {
      if (trial.score > bestSoFar) {
        bestSoFar = trial.score;
        improvements.push(trial.score);
      } else {
        improvements.push(bestSoFar);
      }
    }

    return improvements;
  }

  /**
   * Get optimization progress
   */
  getProgress(): {
    currentTrial: number;
    maxTrials: number;
    bestScore: number;
    averageScore: number;
    timeElapsed: number;
    estimatedTimeRemaining: number;
  } {
    const timeElapsed = (Date.now() - this.startTime) / 1000;
    const averageTimePerTrial = timeElapsed / Math.max(1, this.currentTrial);
    const estimatedTimeRemaining = (this.config.maxTrials - this.currentTrial) * averageTimePerTrial;

    const averageScore = this.trialHistory.length > 0
      ? this.trialHistory.reduce((sum, trial) => sum + trial.score, 0) / this.trialHistory.length
      : 0;

    return {
      currentTrial: this.currentTrial,
      maxTrials: this.config.maxTrials,
      bestScore: this.bestResult?.score || 0,
      averageScore,
      timeElapsed,
      estimatedTimeRemaining
    };
  }

  /**
   * Stop optimization
   */
  stop(): void {
    this.isOptimizing = false;
  }

  /**
   * Reset tuner state
   */
  reset(): void {
    this.trialHistory = [];
    this.bestResult = null;
    this.gaussianProcess = null;
    this.observedPoints = [];
    this.observedValues = [];
    this.currentTrial = 0;
    this.isOptimizing = false;
  }
}

// Export default parameter spaces for common use cases
export const defaultParameterSpaces = {
  neuralNetwork: [
    { name: 'learningRate', type: 'continuous' as const, bounds: [0.0001, 0.1], scale: 'log' as const },
    { name: 'batchSize', type: 'discrete' as const, bounds: [16, 128] },
    { name: 'hiddenUnits', type: 'discrete' as const, bounds: [32, 512] },
    { name: 'layers', type: 'discrete' as const, bounds: [2, 6] },
    { name: 'dropoutRate', type: 'continuous' as const, bounds: [0.0, 0.5] },
    { name: 'regularization', type: 'continuous' as const, bounds: [0.0001, 0.01], scale: 'log' as const },
    { name: 'optimizerType', type: 'categorical' as const, choices: ['adam', 'sgd', 'rmsprop'] },
    { name: 'activationFunction', type: 'categorical' as const, choices: ['relu', 'tanh', 'sigmoid', 'elu'] }
  ],

  tradingStrategy: [
    { name: 'lookbackPeriod', type: 'discrete' as const, bounds: [10, 100] },
    { name: 'signalThreshold', type: 'continuous' as const, bounds: [0.1, 2.0] },
    { name: 'riskPerTrade', type: 'continuous' as const, bounds: [0.01, 0.05] },
    { name: 'stopLossMultiplier', type: 'continuous' as const, bounds: [1.0, 3.0] },
    { name: 'takeProfitMultiplier', type: 'continuous' as const, bounds: [1.5, 5.0] }
  ]
};

export const defaultOptimizationConfig: OptimizationConfig = {
  maxTrials: 100,
  maxTime: 3600, // 1 hour
  earlyStoppingPatience: 10,
  acquisitionFunction: 'ucb',
  kappa: 2.576, // 99% confidence for UCB
  xi: 0.01, // Small exploration for EI/POI
  randomTrials: 10
};

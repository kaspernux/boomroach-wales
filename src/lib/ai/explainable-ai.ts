// Explainable AI System for Trading Decision Transparency
import { TensorFlow } from '@tensorflow/tfjs-node';

export interface FeatureImportance {
  feature: string;
  importance: number;
  contribution: number;
  confidence: number;
}

export interface ExplanationResult {
  prediction: number;
  confidence: number;
  features: FeatureImportance[];
  shapValues: number[];
  limeExplanation: LimeExplanation;
  decisionPath: DecisionNode[];
  riskFactors: RiskFactor[];
}

export interface LimeExplanation {
  localFeatures: FeatureImportance[];
  perturbationCount: number;
  localFidelity: number;
  explanation: string;
}

export interface DecisionNode {
  feature: string;
  threshold: number;
  decision: 'buy' | 'sell' | 'hold';
  confidence: number;
  path: string[];
}

export interface RiskFactor {
  factor: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  impact: number;
  mitigation: string[];
}

export class ExplainableAISystem {
  private model: any;
  private featureNames: string[];
  private shapExplainer: SHAPExplainer;
  private limeExplainer: LIMEExplainer;
  private decisionTreeVisualizer: DecisionTreeVisualizer;

  constructor(model: any, featureNames: string[]) {
    this.model = model;
    this.featureNames = featureNames;
    this.shapExplainer = new SHAPExplainer(model);
    this.limeExplainer = new LIMEExplainer(model);
    this.decisionTreeVisualizer = new DecisionTreeVisualizer();
  }

  // Main explanation function
  async explainPrediction(inputData: number[]): Promise<ExplanationResult> {
    const prediction = await this.model.predict(inputData);
    const confidence = this.calculateConfidence(prediction);

    // Generate SHAP values
    const shapValues = await this.shapExplainer.explain(inputData);

    // Generate LIME explanation
    const limeExplanation = await this.limeExplainer.explain(inputData);

    // Calculate feature importance
    const features = this.calculateFeatureImportance(inputData, shapValues);

    // Generate decision path
    const decisionPath = await this.generateDecisionPath(inputData);

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(inputData, features);

    return {
      prediction: prediction[0],
      confidence,
      features,
      shapValues,
      limeExplanation,
      decisionPath,
      riskFactors
    };
  }

  private calculateFeatureImportance(inputData: number[], shapValues: number[]): FeatureImportance[] {
    return this.featureNames.map((feature, index) => ({
      feature,
      importance: Math.abs(shapValues[index]),
      contribution: shapValues[index],
      confidence: this.calculateFeatureConfidence(inputData[index], shapValues[index])
    })).sort((a, b) => b.importance - a.importance);
  }

  private calculateFeatureConfidence(value: number, shapValue: number): number {
    // Calculate confidence based on feature value and SHAP contribution
    const normalizedValue = Math.abs(value / (Math.abs(value) + 1));
    const normalizedShap = Math.abs(shapValue / (Math.abs(shapValue) + 1));
    return (normalizedValue + normalizedShap) / 2;
  }

  private calculateConfidence(prediction: number[]): number {
    // Calculate prediction confidence using entropy
    const probabilities = this.softmax(prediction);
    const entropy = -probabilities.reduce((sum, p) => sum + p * Math.log2(p + 1e-10), 0);
    const maxEntropy = Math.log2(probabilities.length);
    return 1 - (entropy / maxEntropy);
  }

  private softmax(values: number[]): number[] {
    const maxVal = Math.max(...values);
    const expValues = values.map(v => Math.exp(v - maxVal));
    const sumExp = expValues.reduce((sum, val) => sum + val, 0);
    return expValues.map(val => val / sumExp);
  }

  private async generateDecisionPath(inputData: number[]): Promise<DecisionNode[]> {
    // Generate decision tree path for interpretability
    const path: DecisionNode[] = [];
    const currentNode = 0;
    const features = [...inputData];

    // Simulate decision tree traversal
    for (let depth = 0; depth < 5; depth++) {
      const featureIndex = this.selectBestFeature(features, depth);
      const threshold = this.calculateThreshold(features[featureIndex]);
      const decision = this.makeDecision(features[featureIndex], threshold);

      path.push({
        feature: this.featureNames[featureIndex],
        threshold,
        decision,
        confidence: this.calculateNodeConfidence(features, featureIndex, threshold),
        path: path.map(n => `${n.feature} ${n.decision}`)
      });

      if (decision !== 'hold') break;
    }

    return path;
  }

  private selectBestFeature(features: number[], depth: number): number {
    // Select feature with highest information gain
    let bestFeature = 0;
    let bestGain = 0;

    for (let i = 0; i < features.length; i++) {
      const gain = this.calculateInformationGain(features, i);
      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = i;
      }
    }

    return bestFeature;
  }

  private calculateInformationGain(features: number[], featureIndex: number): number {
    // Simplified information gain calculation
    const value = features[featureIndex];
    const variance = this.calculateVariance(features);
    return Math.abs(value) / (variance + 1);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  private calculateThreshold(value: number): number {
    // Dynamic threshold based on value magnitude
    return value * 0.5;
  }

  private makeDecision(value: number, threshold: number): 'buy' | 'sell' | 'hold' {
    if (value > threshold) return 'buy';
    if (value < -threshold) return 'sell';
    return 'hold';
  }

  private calculateNodeConfidence(features: number[], featureIndex: number, threshold: number): number {
    const value = features[featureIndex];
    const distance = Math.abs(value - threshold);
    const maxDistance = Math.max(Math.abs(value), Math.abs(threshold)) + 1;
    return distance / maxDistance;
  }

  private identifyRiskFactors(inputData: number[], features: FeatureImportance[]): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    // High volatility risk
    const volatilityFeature = features.find(f => f.feature.includes('volatility'));
    if (volatilityFeature && volatilityFeature.importance > 0.7) {
      riskFactors.push({
        factor: 'High Market Volatility',
        riskLevel: volatilityFeature.importance > 0.9 ? 'critical' : 'high',
        impact: volatilityFeature.importance,
        mitigation: [
          'Reduce position size',
          'Implement tighter stop losses',
          'Consider volatility-based position sizing'
        ]
      });
    }

    // Liquidity risk
    const liquidityFeature = features.find(f => f.feature.includes('liquidity'));
    if (liquidityFeature && liquidityFeature.contribution < -0.5) {
      riskFactors.push({
        factor: 'Low Liquidity',
        riskLevel: 'medium',
        impact: Math.abs(liquidityFeature.contribution),
        mitigation: [
          'Execute trades in smaller chunks',
          'Monitor order book depth',
          'Use limit orders instead of market orders'
        ]
      });
    }

    // Trend reversal risk
    const trendFeature = features.find(f => f.feature.includes('trend'));
    if (trendFeature && Math.abs(trendFeature.contribution) > 0.6) {
      riskFactors.push({
        factor: 'Trend Uncertainty',
        riskLevel: 'medium',
        impact: Math.abs(trendFeature.contribution),
        mitigation: [
          'Wait for trend confirmation',
          'Use multiple timeframe analysis',
          'Implement momentum filters'
        ]
      });
    }

    return riskFactors;
  }

  // Generate human-readable explanation
  generateTextExplanation(result: ExplanationResult): string {
    const { prediction, confidence, features, riskFactors } = result;

    const action = prediction > 0.6 ? 'BUY' : prediction < 0.4 ? 'SELL' : 'HOLD';
    const confidenceText = confidence > 0.8 ? 'high' : confidence > 0.5 ? 'moderate' : 'low';

    const topFeatures = features.slice(0, 3);
    const featureText = topFeatures.map(f =>
      `${f.feature} (${f.contribution > 0 ? '+' : ''}${(f.contribution * 100).toFixed(1)}%)`
    ).join(', ');

    const riskText = riskFactors.length > 0
      ? `Key risks: ${riskFactors.map(r => r.factor).join(', ')}`
      : 'No significant risks identified';

    return `
**Trading Decision: ${action}** (${confidenceText} confidence)

**Key Factors:** ${featureText}

**Risk Assessment:** ${riskText}

**Recommendation:** The AI model suggests a ${action} signal with ${(confidence * 100).toFixed(1)}% confidence based on the analysis of ${features.length} market indicators. The top contributing factors are ${topFeatures[0].feature} and ${topFeatures[1]?.feature || 'market sentiment'}.
    `.trim();
  }
}

// SHAP Explainer Implementation
class SHAPExplainer {
  private model: any;
  private baseline: number[];

  constructor(model: any) {
    this.model = model;
    this.baseline = new Array(10).fill(0); // Baseline feature values
  }

  async explain(inputData: number[]): Promise<number[]> {
    const shapValues = new Array(inputData.length).fill(0);
    const coalitionSize = Math.min(inputData.length, 10);

    // Approximate SHAP values using sampling
    for (let i = 0; i < inputData.length; i++) {
      shapValues[i] = await this.calculateShapValue(inputData, i, coalitionSize);
    }

    return shapValues;
  }

  private async calculateShapValue(inputData: number[], featureIndex: number, coalitionSize: number): Promise<number> {
    let shapValue = 0;
    const numSamples = 100;

    for (let sample = 0; sample < numSamples; sample++) {
      // Create coalition with and without the feature
      const coalitionWith = this.createCoalition(inputData, featureIndex, true, coalitionSize);
      const coalitionWithout = this.createCoalition(inputData, featureIndex, false, coalitionSize);

      // Get predictions
      const predictionWith = await this.model.predict([coalitionWith]);
      const predictionWithout = await this.model.predict([coalitionWithout]);

      // Calculate marginal contribution
      shapValue += (predictionWith[0] - predictionWithout[0]) / numSamples;
    }

    return shapValue;
  }

  private createCoalition(inputData: number[], featureIndex: number, includeFeature: boolean, coalitionSize: number): number[] {
    const coalition = [...this.baseline];

    // Randomly select features for coalition
    const selectedFeatures = this.randomlySelectFeatures(inputData.length, coalitionSize);

    for (const idx of selectedFeatures) {
      if (idx === featureIndex && includeFeature) {
        coalition[idx] = inputData[idx];
      } else if (idx !== featureIndex) {
        coalition[idx] = inputData[idx];
      }
    }

    return coalition;
  }

  private randomlySelectFeatures(totalFeatures: number, coalitionSize: number): number[] {
    const features = Array.from({ length: totalFeatures }, (_, i) => i);
    const selected: number[] = [];

    for (let i = 0; i < coalitionSize; i++) {
      const randomIndex = Math.floor(Math.random() * features.length);
      selected.push(features.splice(randomIndex, 1)[0]);
    }

    return selected;
  }
}

// LIME Explainer Implementation
class LIMEExplainer {
  private model: any;
  private perturbationCount = 5000;

  constructor(model: any) {
    this.model = model;
  }

  async explain(inputData: number[]): Promise<LimeExplanation> {
    const perturbedSamples = this.generatePerturbedSamples(inputData);
    const predictions = await this.getPredictions(perturbedSamples);
    const weights = this.calculateWeights(inputData, perturbedSamples);

    const localModel = this.fitLocalModel(perturbedSamples, predictions, weights);
    const localFeatures = this.extractFeatureImportance(localModel);
    const localFidelity = this.calculateLocalFidelity(localModel, perturbedSamples, predictions, weights);

    return {
      localFeatures,
      perturbationCount: this.perturbationCount,
      localFidelity,
      explanation: this.generateExplanation(localFeatures)
    };
  }

  private generatePerturbedSamples(inputData: number[]): number[][] {
    const samples: number[][] = [];
    const standardDeviations = inputData.map(val => Math.abs(val) * 0.1 + 0.01);

    for (let i = 0; i < this.perturbationCount; i++) {
      const perturbedSample = inputData.map((val, idx) => {
        const noise = this.generateGaussianNoise(0, standardDeviations[idx]);
        return val + noise;
      });
      samples.push(perturbedSample);
    }

    return samples;
  }

  private generateGaussianNoise(mean: number, stdDev: number): number {
    // Box-Muller transformation for Gaussian noise
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  private async getPredictions(samples: number[][]): Promise<number[]> {
    const predictions: number[] = [];

    for (const sample of samples) {
      const prediction = await this.model.predict([sample]);
      predictions.push(prediction[0]);
    }

    return predictions;
  }

  private calculateWeights(originalData: number[], perturbedSamples: number[][]): number[] {
    return perturbedSamples.map(sample => {
      const distance = this.calculateEuclideanDistance(originalData, sample);
      return Math.exp(-distance / 0.25); // Kernel width of 0.25
    });
  }

  private calculateEuclideanDistance(point1: number[], point2: number[]): number {
    return Math.sqrt(
      point1.reduce((sum, val, idx) => sum + Math.pow(val - point2[idx], 2), 0)
    );
  }

  private fitLocalModel(samples: number[][], predictions: number[], weights: number[]): LinearModel {
    // Simplified weighted linear regression
    const features = samples[0].length;
    const coefficients = new Array(features).fill(0);

    // Calculate weighted means
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    const weightedMeanX = new Array(features).fill(0);
    const weightedMeanY = weights.reduce((sum, w, i) => sum + w * predictions[i], 0) / weightSum;

    for (let j = 0; j < features; j++) {
      weightedMeanX[j] = weights.reduce((sum, w, i) => sum + w * samples[i][j], 0) / weightSum;
    }

    // Calculate coefficients using normal equations (simplified)
    for (let j = 0; j < features; j++) {
      let numerator = 0;
      let denominator = 0;

      for (let i = 0; i < samples.length; i++) {
        const xDiff = samples[i][j] - weightedMeanX[j];
        const yDiff = predictions[i] - weightedMeanY;
        numerator += weights[i] * xDiff * yDiff;
        denominator += weights[i] * xDiff * xDiff;
      }

      coefficients[j] = denominator !== 0 ? numerator / denominator : 0;
    }

    return new LinearModel(coefficients, weightedMeanY);
  }

  private extractFeatureImportance(model: LinearModel): FeatureImportance[] {
    return model.coefficients.map((coef, index) => ({
      feature: `feature_${index}`,
      importance: Math.abs(coef),
      contribution: coef,
      confidence: Math.min(Math.abs(coef) * 2, 1) // Simplified confidence
    })).sort((a, b) => b.importance - a.importance);
  }

  private calculateLocalFidelity(model: LinearModel, samples: number[][], predictions: number[], weights: number[]): number {
    let totalError = 0;
    let totalWeight = 0;

    for (let i = 0; i < samples.length; i++) {
      const localPrediction = model.predict(samples[i]);
      const error = Math.pow(localPrediction - predictions[i], 2);
      totalError += weights[i] * error;
      totalWeight += weights[i];
    }

    const mse = totalError / totalWeight;
    return Math.exp(-mse); // Convert MSE to fidelity score
  }

  private generateExplanation(features: FeatureImportance[]): string {
    const topFeatures = features.slice(0, 3);
    return `Local explanation based on ${this.perturbationCount} perturbations. Top contributing features: ${topFeatures.map(f => `${f.feature} (${(f.contribution * 100).toFixed(1)}%)`).join(', ')}.`;
  }
}

// Linear Model for LIME
class LinearModel {
  public coefficients: number[];
  private intercept: number;

  constructor(coefficients: number[], intercept: number) {
    this.coefficients = coefficients;
    this.intercept = intercept;
  }

  predict(features: number[]): number {
    const prediction = features.reduce((sum, feature, index) => {
      return sum + feature * this.coefficients[index];
    }, this.intercept);

    return prediction;
  }
}

// Decision Tree Visualizer
class DecisionTreeVisualizer {
  generateVisualization(decisionPath: DecisionNode[]): string {
    let visualization = "Decision Tree Path:\n";

    for (let i = 0; i < decisionPath.length; i++) {
      const node = decisionPath[i];
      const indent = "  ".repeat(i);
      const arrow = i === 0 ? "🌳" : "└─";

      visualization += `${indent}${arrow} ${node.feature} > ${node.threshold.toFixed(3)} → ${node.decision.toUpperCase()} (${(node.confidence * 100).toFixed(1)}%)\n`;
    }

    return visualization;
  }

  generateMermaidDiagram(decisionPath: DecisionNode[]): string {
    let diagram = "graph TD\n";

    for (let i = 0; i < decisionPath.length; i++) {
      const node = decisionPath[i];
      const nodeId = `node${i}`;
      const nextNodeId = i < decisionPath.length - 1 ? `node${i + 1}` : 'end';

      diagram += `  ${nodeId}["${node.feature}<br/>threshold: ${node.threshold.toFixed(3)}<br/>confidence: ${(node.confidence * 100).toFixed(1)}%"]\n`;

      if (i < decisionPath.length - 1) {
        diagram += `  ${nodeId} --> ${nextNodeId}\n`;
      } else {
        diagram += `  ${nodeId} --> end["${node.decision.toUpperCase()}"]\n`;
      }
    }

    return diagram;
  }
}

// Export the main class and interfaces
export { ExplainableAISystem, SHAPExplainer, LIMEExplainer, DecisionTreeVisualizer };

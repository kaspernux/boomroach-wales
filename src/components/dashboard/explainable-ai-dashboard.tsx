"use client";

import React, { useState, useEffect } from 'react';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, TreeChart, Tree
} from 'recharts';
import {
  Brain, TrendingUp, AlertTriangle, Target, Eye, Lightbulb,
  BarChart3, PieChart as PieChartIcon, Network, Shield
} from 'lucide-react';
import { type ExplanationResult, FeatureImportance, RiskFactor } from '@/lib/ai/explainable-ai';

interface ExplainableAIDashboardProps {
  explanationResult: ExplanationResult | null;
  isLoading: boolean;
  onRefresh: () => void;
}

interface DecisionHistoryEntry {
  timestamp: string;
  model: string;
  version: string;
  prediction: number;
  confidence: number;
  features: FeatureImportance[];
  riskFactors: RiskFactor[];
}

interface ExplainableAIDashboardProps {
  explanationResult: ExplanationResult | null;
  isLoading: boolean;
  onRefresh: () => void;
  history?: DecisionHistoryEntry[];
  availableModels?: string[];
  availableVersions?: string[];
  onFilterChange?: (filters: { model?: string; version?: string; period?: string }) => void;
  filters?: { model?: string; version?: string; period?: string };
}

export default function ExplainableAIDashboard({
  explanationResult,
  isLoading,
  onRefresh,
  history = [],
  availableModels = [],
  availableVersions = [],
  onFilterChange,
  filters = {}
}: ExplainableAIDashboardProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filtering logic for history
  const filteredHistory = useMemo(() => {
    return history.filter(entry => {
      const modelMatch = !filters.model || entry.model === filters.model;
      const versionMatch = !filters.version || entry.version === filters.version;
      // Period filter can be implemented as needed
      return modelMatch && versionMatch;
    });
  }, [history, filters]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 animate-pulse" />
              <CardTitle>Analyzing Trading Decision...</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={75} className="w-full" />
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!explanationResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Explainable AI Dashboard</span>
          </CardTitle>
          <CardDescription>
            No trading decision to explain. Execute a trade to see AI explanations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onRefresh} className="w-full">
            <Brain className="h-4 w-4 mr-2" />
            Generate Explanation
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { prediction, confidence, features, shapValues, limeExplanation, decisionPath, riskFactors } = explanationResult;

  const getDecisionColor = (prediction: number) => {
    if (prediction > 0.6) return 'text-green-600';
    if (prediction < 0.4) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getDecisionLabel = (prediction: number) => {
    if (prediction > 0.6) return 'BUY';
    if (prediction < 0.4) return 'SELL';
    return 'HOLD';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center mb-4">
        <div>
          <label className="block text-xs font-medium mb-1">Model</label>
          <select
            className="border rounded px-2 py-1"
            value={filters.model || ''}
            onChange={e => onFilterChange?.({ ...filters, model: e.target.value })}
          >
            <option value="">All</option>
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Version</label>
          <select
            className="border rounded px-2 py-1"
            value={filters.version || ''}
            onChange={e => onFilterChange?.({ ...filters, version: e.target.value })}
          >
            <option value="">All</option>
            {availableVersions.map(version => (
              <option key={version} value={version}>{version}</option>
            ))}
          </select>
        </div>
        {/* Add period filter if needed */}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Decision</p>
                <p className={`text-2xl font-bold ${getDecisionColor(prediction)}`}>
                  {getDecisionLabel(prediction)}
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confidence</p>
                <p className="text-2xl font-bold">{(confidence * 100).toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Key Features</p>
                <p className="text-2xl font-bold">{features.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Risk Factors</p>
                <p className="text-2xl font-bold text-red-600">{riskFactors.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="shap">SHAP Analysis</TabsTrigger>
          <TabsTrigger value="lime">LIME Local</TabsTrigger>
          <TabsTrigger value="decision">Decision Tree</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Importance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Feature Importance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={features.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="feature" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="importance" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Risk Assessment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskFactors.length === 0 ? (
                    <Alert>
                      <Lightbulb className="h-4 w-4" />
                      <AlertDescription>
                        No significant risks detected for this trading decision.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    riskFactors.map((risk, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{risk.factor}</span>
                          <Badge className={getRiskColor(risk.riskLevel)}>
                            {risk.riskLevel.toUpperCase()}
                          </Badge>
                        </div>
                        <Progress value={risk.impact * 100} className="w-full" />
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium">Mitigation strategies:</p>
                          <ul className="list-disc list-inside ml-2">
                            {risk.mitigation.map((strategy, idx) => (
                              <li key={idx}>{strategy}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LIME Explanation Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Local Interpretation Summary</CardTitle>
              <CardDescription>
                LIME analysis with {limeExplanation.perturbationCount} perturbations
                (Fidelity: {(limeExplanation.localFidelity * 100).toFixed(1)}%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {limeExplanation.explanation}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {limeExplanation.localFeatures.slice(0, 3).map((feature, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h4 className="font-medium">{feature.feature}</h4>
                    <p className={`text-lg font-bold ${feature.contribution > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {feature.contribution > 0 ? '+' : ''}{(feature.contribution * 100).toFixed(1)}%
                    </p>
                    <Progress value={feature.importance * 100} className="mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Feature Analysis</CardTitle>
              <CardDescription>
                Click on a feature to see detailed analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedFeature === feature.feature ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedFeature(feature.feature)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{feature.feature}</h4>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">Importance:</span>
                            <span className="font-medium">{(feature.importance * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">Contribution:</span>
                            <span className={`font-medium ${feature.contribution > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {feature.contribution > 0 ? '+' : ''}{(feature.contribution * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">Confidence:</span>
                            <span className="font-medium">{(feature.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-32">
                        <Progress value={feature.importance * 100} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SHAP Values Analysis</CardTitle>
              <CardDescription>
                Shapley values showing each feature's contribution to the prediction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={features.map((f, i) => ({
                  feature: f.feature,
                  shapValue: shapValues[i],
                  color: shapValues[i] > 0 ? '#10b981' : '#ef4444'
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feature" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value > 0 ? '+' : ''}${value.toFixed(4)}`,
                      'SHAP Value'
                    ]}
                  />
                  <Bar dataKey="shapValue" fill="#8884d8">
                    {features.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={shapValues[index] > 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">SHAP Interpretation:</h4>
                <ul className="text-sm space-y-1">
                  <li>• <span className="text-green-600">Positive values</span> push the prediction toward BUY</li>
                  <li>• <span className="text-red-600">Negative values</span> push the prediction toward SELL</li>
                  <li>• Larger absolute values indicate stronger influence</li>
                  <li>• Sum of all SHAP values equals the difference from baseline prediction</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LIME Local Explanation</CardTitle>
              <CardDescription>
                Local interpretable model-agnostic explanations around the specific prediction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Local Feature Contributions</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={limeExplanation.localFeatures.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="feature" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="contribution" fill="#8884d8">
                        {limeExplanation.localFeatures.slice(0, 8).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.contribution > 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium text-green-600">Explanation Quality</h5>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Local Fidelity:</span>
                        <span className="font-medium">{(limeExplanation.localFidelity * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={limeExplanation.localFidelity * 100} />
                      <div className="flex justify-between">
                        <span className="text-sm">Perturbations:</span>
                        <span className="font-medium">{limeExplanation.perturbationCount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium">Top Local Factors</h5>
                    <div className="mt-2 space-y-2">
                      {limeExplanation.localFeatures.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{feature.feature}</span>
                          <span className={`font-medium ${feature.contribution > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {feature.contribution > 0 ? '+' : ''}{(feature.contribution * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      {limeExplanation.explanation}
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decision" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5" />
                <span>Decision Tree Path</span>
              </CardTitle>
              <CardDescription>
                Step-by-step decision process showing how the AI reached its conclusion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Decision Path Visualization */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium mb-4">Decision Flow</h4>
                  <div className="space-y-4">
                    {decisionPath.map((node, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 p-4 border rounded-lg bg-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{node.feature}</p>
                              <p className="text-sm text-muted-foreground">
                                Threshold: {node.threshold.toFixed(3)}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className={`${
                                node.decision === 'buy' ? 'bg-green-500' :
                                node.decision === 'sell' ? 'bg-red-500' : 'bg-yellow-500'
                              }`}>
                                {node.decision.toUpperCase()}
                              </Badge>
                              <p className="text-sm text-muted-foreground mt-1">
                                {(node.confidence * 100).toFixed(1)}% confidence
                              </p>
                            </div>
                          </div>
                          <Progress value={node.confidence * 100} className="mt-2" />
                        </div>
                        {index < decisionPath.length - 1 && (
                          <div className="flex-shrink-0 text-muted-foreground">
                            ↓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decision Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium text-blue-600">Final Decision Path</h5>
                    <div className="mt-2 space-y-1">
                      {decisionPath.map((node, index) => (
                        <div key={index} className="text-sm">
                          <span className="text-muted-foreground">Step {index + 1}:</span> {node.feature} → {node.decision}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium text-green-600">Confidence Metrics</h5>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Average Confidence:</span>
                        <span className="font-medium">
                          {(decisionPath.reduce((sum, node) => sum + node.confidence, 0) / decisionPath.length * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Decision Depth:</span>
                        <span className="font-medium">{decisionPath.length} steps</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Final Action:</span>
                        <Badge className={`${
                          decisionPath[decisionPath.length - 1]?.decision === 'buy' ? 'bg-green-500' :
                          decisionPath[decisionPath.length - 1]?.decision === 'sell' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}>
                          {decisionPath[decisionPath.length - 1]?.decision.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={onRefresh} size="lg">
          <Brain className="h-4 w-4 mr-2" />
          Generate New Explanation
        </Button>
      </div>

      {/* Decision History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Decision & Signal History</CardTitle>
          <CardDescription>
            Review past AI trading decisions, explanations, and risk assessments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-muted-foreground text-sm">No history available for the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left">Time</th>
                    <th className="px-2 py-1 text-left">Model</th>
                    <th className="px-2 py-1 text-left">Version</th>
                    <th className="px-2 py-1 text-left">Decision</th>
                    <th className="px-2 py-1 text-left">Confidence</th>
                    <th className="px-2 py-1 text-left">Top Features</th>
                    <th className="px-2 py-1 text-left">Risks</th>
                  </tr>
                </thead>
                <tbody>
                {filteredHistory.map((entry, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1">{new Date(entry.timestamp).toLocaleString()}</td>
                      <td className="px-2 py-1">{entry.model}</td>
                      <td className="px-2 py-1">{entry.version}</td>
                      <td className="px-2 py-1 font-bold">
                        {entry.prediction > 0.6 ? 'BUY' : entry.prediction < 0.4 ? 'SELL' : 'HOLD'}
                      </td>
                      <td className="px-2 py-1">{(entry.confidence * 100).toFixed(1)}%</td>
                      <td className="px-2 py-1">
                        {entry.features.slice(0, 2).map(f =>
                          <span key={f.feature} className="mr-2">{f.feature}</span>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        {entry.riskFactors.length > 0
                          ? entry.riskFactors.map(r => r.factor).join(', ')
                          : 'None'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

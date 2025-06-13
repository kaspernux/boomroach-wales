"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import {
  Shield, AlertTriangle, TrendingUp, TrendingDown, Activity, Eye,
  BarChart3, PieChart as PieChartIcon, Zap, Target, Settings,
  Clock, Users, FileText, Bell, Play, Pause, RotateCcw
} from 'lucide-react';
import type {
  RiskProfile, PortfolioRisk, RiskLimit, RiskAlert, StressTestResult,
  ComplianceViolation, StressTestScenario
} from '@/lib/risk/institutional-risk-manager';

interface RiskManagementDashboardProps {
  portfolioRisk: PortfolioRisk | null;
  activeLimits: RiskLimit[];
  riskAlerts: RiskAlert[];
  complianceViolations: ComplianceViolation[];
  riskProfiles: RiskProfile[];
  stressTestScenarios: StressTestScenario[];
  isMonitoring: boolean;
  onStartMonitoring: () => void;
  onStopMonitoring: () => void;
  onRunStressTest: (scenarioId: string) => Promise<StressTestResult>;
  onUpdateRiskProfile: (profileId: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function RiskManagementDashboard({
  portfolioRisk,
  activeLimits,
  riskAlerts,
  complianceViolations,
  riskProfiles,
  stressTestScenarios,
  isMonitoring,
  onStartMonitoring,
  onStopMonitoring,
  onRunStressTest,
  onUpdateRiskProfile
}: RiskManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRiskProfile, setSelectedRiskProfile] = useState('moderate');
  const [stressTestResults, setStressTestResults] = useState<StressTestResult[]>([]);
  const [isRunningStressTest, setIsRunningStressTest] = useState(false);

  const criticalAlerts = riskAlerts.filter(alert => alert.severity === 'critical').length;
  const warningAlerts = riskAlerts.filter(alert => alert.severity === 'warning').length;
  const breachedLimits = activeLimits.filter(limit => limit.breached).length;

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleStressTest = async (scenarioId: string) => {
    setIsRunningStressTest(true);
    try {
      const result = await onRunStressTest(scenarioId);
      setStressTestResults(prev => [...prev.slice(-4), result]); // Keep last 5 results
    } catch (error) {
      console.error('Stress test failed:', error);
    } finally {
      setIsRunningStressTest(false);
    }
  };

  if (!portfolioRisk) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Risk Management Dashboard</span>
          </CardTitle>
          <CardDescription>
            Loading portfolio risk data...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Risk Management</h1>
          <p className="text-muted-foreground">Institutional-grade risk monitoring and control</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedRiskProfile} onValueChange={onUpdateRiskProfile}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select risk profile" />
            </SelectTrigger>
            <SelectContent>
              {riskProfiles.map(profile => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={isMonitoring ? onStopMonitoring : onStartMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
            className="flex items-center space-x-2"
          >
            {isMonitoring ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isMonitoring ? 'Stop' : 'Start'} Monitoring</span>
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Portfolio VaR</p>
                <p className="text-2xl font-bold text-red-600">{(portfolioRisk.var95 * 100).toFixed(2)}%</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leverage</p>
                <p className="text-2xl font-bold">{portfolioRisk.leverage.toFixed(2)}x</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sharpe Ratio</p>
                <p className="text-2xl font-bold text-green-600">{portfolioRisk.sharpeRatio.toFixed(2)}</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Max Drawdown</p>
                <p className="text-2xl font-bold text-orange-600">{(portfolioRisk.maxDrawdown * 100).toFixed(2)}%</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Breached Limits</p>
                <p className="text-2xl font-bold text-red-600">{breachedLimits}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monitoring</p>
                <Badge className={isMonitoring ? 'bg-green-500' : 'bg-red-500'}>
                  {isMonitoring ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <Activity className={`h-8 w-8 ${isMonitoring ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="limits">Risk Limits</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="stress">Stress Tests</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Metrics Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Risk Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Value at Risk (95%)</span>
                    <span className="font-bold text-red-600">{(portfolioRisk.var95 * 100).toFixed(2)}%</span>
                  </div>
                  <Progress value={portfolioRisk.var95 * 100} max={5} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Expected Shortfall</span>
                    <span className="font-bold text-red-600">{(portfolioRisk.expectedShortfall * 100).toFixed(2)}%</span>
                  </div>
                  <Progress value={portfolioRisk.expectedShortfall * 100} max={8} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Portfolio Beta</span>
                    <span className="font-bold">{portfolioRisk.betaToMarket.toFixed(2)}</span>
                  </div>
                  <Progress value={Math.abs(portfolioRisk.betaToMarket) * 50} max={100} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Exposure</span>
                    <span className="font-bold">${portfolioRisk.totalExposure.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sector Concentration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChartIcon className="h-5 w-5" />
                  <span>Sector Concentration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(portfolioRisk.sectorConcentration).map(([sector, value], index) => ({
                        name: sector,
                        value: value * 100,
                        color: COLORS[index % COLORS.length]
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    >
                      {Object.entries(portfolioRisk.sectorConcentration).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Allocation']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Recent Alerts</span>
                <Badge variant="destructive">{criticalAlerts}</Badge>
                <Badge variant="secondary">{warningAlerts}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {riskAlerts.slice(-5).reverse().map((alert, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${getRiskColor(alert.severity)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${
                          alert.severity === 'critical' ? 'bg-red-500' :
                          alert.severity === 'warning' ? 'bg-orange-500' :
                          alert.severity === 'error' ? 'bg-red-400' : 'bg-blue-500'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="font-medium">{alert.type}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {alert.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm mt-2">{alert.message}</p>
                    {alert.recommendedActions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium">Recommended Actions:</p>
                        <ul className="text-xs list-disc list-inside">
                          {alert.recommendedActions.map((action, idx) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Limits Monitoring</CardTitle>
              <CardDescription>
                Real-time monitoring of all risk limits and thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {activeLimits.map((limit, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium capitalize">{limit.type} Limit</h4>
                        <p className="text-sm text-muted-foreground">
                          Current: {limit.currentValue.toFixed(4)} / Threshold: {limit.threshold.toFixed(4)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={`${
                          limit.breached ? 'bg-red-500' :
                          limit.utilizationPercentage > 80 ? 'bg-orange-500' :
                          limit.utilizationPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}>
                          {limit.utilizationPercentage.toFixed(1)}%
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Action: {limit.action}
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={Math.min(limit.utilizationPercentage, 100)}
                      className={`h-3 ${getUtilizationColor(limit.utilizationPercentage)}`}
                    />
                    {limit.breached && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>LIMIT BREACHED</strong> - {limit.severity.toUpperCase()} severity.
                          Recommended action: {limit.action}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Alerts Management</CardTitle>
              <CardDescription>
                Complete history and management of risk alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskAlerts.map((alert, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${getRiskColor(alert.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={`${
                            alert.severity === 'critical' ? 'bg-red-500' :
                            alert.severity === 'warning' ? 'bg-orange-500' :
                            alert.severity === 'error' ? 'bg-red-400' : 'bg-blue-500'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{alert.type}</span>
                          {alert.autoExecuted && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Auto-Executed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mb-2">{alert.message}</p>
                        {alert.affectedPositions.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Affected: {alert.affectedPositions.join(', ')}
                          </p>
                        )}
                        {alert.recommendedActions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium">Actions:</p>
                            <ul className="text-xs list-disc list-inside">
                              {alert.recommendedActions.map((action, idx) => (
                                <li key={idx}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {alert.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stress" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stress Test Scenarios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Stress Test Scenarios</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stressTestScenarios.map((scenario, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{scenario.name}</h4>
                        <Button
                          size="sm"
                          onClick={() => handleStressTest(scenario.id)}
                          disabled={isRunningStressTest}
                        >
                          {isRunningStressTest ? 'Running...' : 'Run Test'}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{scenario.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Market Shock: {(scenario.marketShock * 100).toFixed(1)}%</div>
                        <div>Vol Multiplier: {scenario.volatilityMultiplier}x</div>
                        <div>Correlation +{(scenario.correlationIncrease * 100).toFixed(0)}%</div>
                        <div>Liquidity -{(scenario.liquidityReduction * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stress Test Results */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Stress Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                {stressTestResults.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No stress tests run yet</p>
                    <p className="text-sm text-muted-foreground">Run a scenario to see results</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stressTestResults.slice(-3).map((result, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{result.scenario.name}</h5>
                          <Badge className={`${
                            result.lossPercentage < -20 ? 'bg-red-500' :
                            result.lossPercentage < -10 ? 'bg-orange-500' :
                            result.lossPercentage < -5 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}>
                            {result.lossPercentage.toFixed(1)}% Loss
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Portfolio Value:</span>
                            <p className="font-medium">${result.portfolioValue.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">After Shock:</span>
                            <p className="font-medium">${result.portfolioValueAfterShock.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Loss:</span>
                            <p className="font-medium text-red-600">${result.loss.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Liquidity Need:</span>
                            <p className="font-medium">${result.liquidityRequirement.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Compliance Monitoring</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceViolations.length === 0 ? (
                  <Alert className="border-green-200 bg-green-50">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>All Clear</strong> - No compliance violations detected
                    </AlertDescription>
                  </Alert>
                ) : (
                  complianceViolations.map((violation, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      violation.severity === 'critical' ? 'border-red-200 bg-red-50' :
                      violation.severity === 'major' ? 'border-orange-200 bg-orange-50' :
                      'border-yellow-200 bg-yellow-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={`${
                              violation.severity === 'critical' ? 'bg-red-500' :
                              violation.severity === 'major' ? 'bg-orange-500' : 'bg-yellow-500'
                            }`}>
                              {violation.severity.toUpperCase()}
                            </Badge>
                            <span className="font-medium">Rule ID: {violation.ruleId}</span>
                            <Badge variant="outline" className={`${
                              violation.status === 'open' ? 'bg-red-50 text-red-700' :
                              violation.status === 'acknowledged' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-green-50 text-green-700'
                            }`}>
                              {violation.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{violation.description}</p>
                          <div className="text-xs text-muted-foreground">
                            <p>Current: {violation.currentValue.toFixed(4)} | Allowed: {violation.allowedValue.toFixed(4)}</p>
                            <p>Affected: {violation.affectedEntities.join(', ')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {violation.timestamp.toLocaleString()}
                          </p>
                          {violation.assignedTo && (
                            <p className="text-xs text-muted-foreground">
                              Assigned: {violation.assignedTo}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Profile Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={[
                    { metric: 'Leverage', value: (portfolioRisk.leverage / 5) * 100 },
                    { metric: 'VaR', value: (portfolioRisk.var95 / 0.05) * 100 },
                    { metric: 'Drawdown', value: (portfolioRisk.maxDrawdown / 0.2) * 100 },
                    { metric: 'Concentration', value: (Math.max(...Object.values(portfolioRisk.sectorConcentration)) / 0.3) * 100 },
                    { metric: 'Beta', value: (Math.abs(portfolioRisk.betaToMarket) / 2) * 100 },
                    { metric: 'Sharpe', value: Math.min((portfolioRisk.sharpeRatio / 2) * 100, 100) }
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Risk Level" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Currency Exposure */}
            <Card>
              <CardHeader>
                <CardTitle>Currency Exposure</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(portfolioRisk.currencyExposure).map(([currency, exposure]) => ({
                    currency,
                    exposure: exposure * 100
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="currency" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Exposure']} />
                    <Bar dataKey="exposure" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Correlation Matrix Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Position Correlation Matrix</CardTitle>
              <CardDescription>
                Correlation between different positions in the portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-4 gap-1 min-w-96">
                  {portfolioRisk.correlationMatrix.map((row, i) =>
                    row.map((correlation, j) => (
                      <div
                        key={`${i}-${j}`}
                        className={`p-2 text-xs text-center rounded ${
                          i === j ? 'bg-blue-100' :
                          correlation > 0.7 ? 'bg-red-100' :
                          correlation > 0.3 ? 'bg-yellow-100' : 'bg-green-100'
                        }`}
                      >
                        {correlation.toFixed(2)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Settings,
  Brain,
  Target,
  Zap,
  Shield,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Play,
  Pause,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Activity,
  DollarSign,
  Flame,
  Award,
  Eye,
  Lock,
  Unlock,
  Gauge,
  Sliders
} from 'lucide-react'

interface ParameterSet {
  // Sniper Engine
  sniper_min_liquidity: number
  sniper_max_buy: number
  sniper_reaction_time: number
  sniper_confidence_threshold: number

  // Re-entry Engine
  momentum_threshold: number
  volume_spike_threshold: number
  rsi_oversold: number
  rsi_overbought: number

  // Risk Management
  max_position_size: number
  stop_loss_percentage: number
  take_profit_percentage: number
  max_daily_loss: number

  // BoomRoach Optimization
  commission_rate: number
  treasury_allocation: number
  burn_allocation: number
  burn_threshold: number

  // AI Signals
  ai_min_confidence: number
  sentiment_weight: number
  technical_weight: number
}

interface OptimizationResult {
  timestamp: string
  method: string
  score: number
  improvement: number
  parameters: ParameterSet
  status: 'running' | 'completed' | 'failed'
}

export function ParameterController() {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [autoOptimization, setAutoOptimization] = useState(true)
  const [parameters, setParameters] = useState<ParameterSet>({
    // Default values
    sniper_min_liquidity: 10.0,
    sniper_max_buy: 2.5,
    sniper_reaction_time: 2000,
    sniper_confidence_threshold: 0.75,
    momentum_threshold: 0.15,
    volume_spike_threshold: 2.5,
    rsi_oversold: 30,
    rsi_overbought: 70,
    max_position_size: 5.0,
    stop_loss_percentage: 0.15,
    take_profit_percentage: 0.30,
    max_daily_loss: 0.05,
    commission_rate: 0.015,
    treasury_allocation: 0.70,
    burn_allocation: 0.20,
    burn_threshold: 1000.0,
    ai_min_confidence: 0.70,
    sentiment_weight: 0.30,
    technical_weight: 0.70
  })

  const [backupParameters, setBackupParameters] = useState<ParameterSet>(parameters)
  const [optimizationHistory, setOptimizationHistory] = useState<OptimizationResult[]>([])
  const [currentScore, setCurrentScore] = useState(87.5)
  const [targetScore, setTargetScore] = useState(95.0)

  // Mock optimization results
  useEffect(() => {
    // Initialize with some historical results
    setOptimizationHistory([
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        method: 'Bayesian',
        score: 85.2,
        improvement: 2.3,
        parameters: parameters,
        status: 'completed'
      },
      {
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        method: 'Genetic Algorithm',
        score: 83.1,
        improvement: 1.8,
        parameters: parameters,
        status: 'completed'
      }
    ])
  }, [])

  const handleParameterChange = (key: keyof ParameterSet, value: number) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleOptimization = async (method: string) => {
    setIsOptimizing(true)

    // Create new optimization result
    const newResult: OptimizationResult = {
      timestamp: new Date().toISOString(),
      method,
      score: 0,
      improvement: 0,
      parameters: { ...parameters },
      status: 'running'
    }

    setOptimizationHistory(prev => [newResult, ...prev.slice(0, 9)])

    // Simulate optimization process
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Generate optimized parameters
    const optimizedParams = await simulateOptimization(method)
    const newScore = calculateScore(optimizedParams)
    const improvement = ((newScore / currentScore - 1) * 100)

    // Update result
    const completedResult: OptimizationResult = {
      ...newResult,
      score: newScore,
      improvement,
      parameters: optimizedParams,
      status: 'completed'
    }

    setOptimizationHistory(prev => [completedResult, ...prev.slice(1)])
    setParameters(optimizedParams)
    setCurrentScore(newScore)
    setIsOptimizing(false)
  }

  const simulateOptimization = async (method: string): Promise<ParameterSet> => {
    // Simulate different optimization methods
    const variance = method === 'Bayesian' ? 0.05 : method === 'Genetic Algorithm' ? 0.08 : 0.03

    return {
      sniper_min_liquidity: Math.max(5, Math.min(50, parameters.sniper_min_liquidity * (1 + (Math.random() - 0.5) * variance))),
      sniper_max_buy: Math.max(0.5, Math.min(5, parameters.sniper_max_buy * (1 + (Math.random() - 0.5) * variance))),
      sniper_reaction_time: Math.max(1000, Math.min(5000, parameters.sniper_reaction_time * (1 + (Math.random() - 0.5) * variance))),
      sniper_confidence_threshold: Math.max(0.6, Math.min(0.95, parameters.sniper_confidence_threshold * (1 + (Math.random() - 0.5) * variance))),
      momentum_threshold: Math.max(0.05, Math.min(0.30, parameters.momentum_threshold * (1 + (Math.random() - 0.5) * variance))),
      volume_spike_threshold: Math.max(1.5, Math.min(5.0, parameters.volume_spike_threshold * (1 + (Math.random() - 0.5) * variance))),
      rsi_oversold: Math.max(20, Math.min(40, parameters.rsi_oversold * (1 + (Math.random() - 0.5) * variance))),
      rsi_overbought: Math.max(60, Math.min(80, parameters.rsi_overbought * (1 + (Math.random() - 0.5) * variance))),
      max_position_size: Math.max(1, Math.min(10, parameters.max_position_size * (1 + (Math.random() - 0.5) * variance))),
      stop_loss_percentage: Math.max(0.05, Math.min(0.25, parameters.stop_loss_percentage * (1 + (Math.random() - 0.5) * variance))),
      take_profit_percentage: Math.max(0.15, Math.min(0.50, parameters.take_profit_percentage * (1 + (Math.random() - 0.5) * variance))),
      max_daily_loss: Math.max(0.01, Math.min(0.08, parameters.max_daily_loss * (1 + (Math.random() - 0.5) * variance))),
      commission_rate: Math.max(0.010, Math.min(0.025, parameters.commission_rate * (1 + (Math.random() - 0.5) * variance))),
      treasury_allocation: Math.max(0.60, Math.min(0.80, parameters.treasury_allocation * (1 + (Math.random() - 0.5) * variance))),
      burn_allocation: Math.max(0.15, Math.min(0.30, parameters.burn_allocation * (1 + (Math.random() - 0.5) * variance))),
      burn_threshold: Math.max(500, Math.min(2000, parameters.burn_threshold * (1 + (Math.random() - 0.5) * variance))),
      ai_min_confidence: Math.max(0.60, Math.min(0.90, parameters.ai_min_confidence * (1 + (Math.random() - 0.5) * variance))),
      sentiment_weight: Math.max(0.10, Math.min(0.50, parameters.sentiment_weight * (1 + (Math.random() - 0.5) * variance))),
      technical_weight: Math.max(0.50, Math.min(0.90, parameters.technical_weight * (1 + (Math.random() - 0.5) * variance)))
    }
  }

  const calculateScore = (params: ParameterSet): number => {
    // Simplified scoring function
    let score = 80

    // BoomRoach optimization bonus
    score += (params.commission_rate / 0.025) * 10
    score += (params.burn_allocation / 0.30) * 5
    score += (1 - params.max_daily_loss / 0.08) * 5

    // Add some randomness for simulation
    score += (Math.random() - 0.5) * 10

    return Math.min(100, Math.max(0, score))
  }

  const resetToBackup = () => {
    setParameters(backupParameters)
  }

  const saveAsBackup = () => {
    setBackupParameters({ ...parameters })
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'Bayesian': return <Brain className="w-4 h-4" />
      case 'Genetic Algorithm': return <Cpu className="w-4 h-4" />
      case 'Gradient Descent': return <TrendingUp className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-neon-green'
    if (score >= 80) return 'text-neon-blue'
    if (score >= 70) return 'text-neon-orange'
    return 'text-neon-red'
  }

  return (
    <Card className="glassmorphism border-nuclear-glow/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-nuclear-glow">
            <Settings className="w-6 h-6" />
            <span>Parameter Optimization Controller</span>
            <Badge className="bg-nuclear-glow/20 text-nuclear-glow border-nuclear-glow/30">
              Score: {currentScore.toFixed(1)}/100
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="auto-optimization" className="text-sm">Auto Optimization</Label>
            <Switch
              id="auto-optimization"
              checked={autoOptimization}
              onCheckedChange={setAutoOptimization}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="parameters" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="parameters" className="flex items-center space-x-2">
              <Sliders className="w-4 h-4" />
              <span>Parameters</span>
            </TabsTrigger>
            <TabsTrigger value="optimization" className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span>Optimization</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>History</span>
            </TabsTrigger>
            <TabsTrigger value="boomroach" className="flex items-center space-x-2">
              <Flame className="w-4 h-4" />
              <span>BoomRoach</span>
            </TabsTrigger>
          </TabsList>

          {/* Parameters Tab */}
          <TabsContent value="parameters" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Trading Parameters</h3>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={resetToBackup}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button variant="outline" size="sm" onClick={saveAsBackup}>
                  <Save className="w-4 h-4 mr-2" />
                  Backup
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sniper Engine Parameters */}
              <Card className="glassmorphism border-neon-red/30">
                <CardHeader>
                  <CardTitle className="text-neon-red flex items-center space-x-2">
                    <Zap className="w-5 h-5" />
                    <span>Sniper Engine</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Min Liquidity: ${parameters.sniper_min_liquidity.toFixed(1)}k</Label>
                    <Slider
                      value={[parameters.sniper_min_liquidity]}
                      onValueChange={([value]) => handleParameterChange('sniper_min_liquidity', value)}
                      max={50}
                      min={5}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Max Buy: {parameters.sniper_max_buy.toFixed(1)} SOL</Label>
                    <Slider
                      value={[parameters.sniper_max_buy]}
                      onValueChange={([value]) => handleParameterChange('sniper_max_buy', value)}
                      max={5}
                      min={0.5}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Reaction Time: {parameters.sniper_reaction_time}ms</Label>
                    <Slider
                      value={[parameters.sniper_reaction_time]}
                      onValueChange={([value]) => handleParameterChange('sniper_reaction_time', value)}
                      max={5000}
                      min={1000}
                      step={100}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Confidence: {(parameters.sniper_confidence_threshold * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[parameters.sniper_confidence_threshold]}
                      onValueChange={([value]) => handleParameterChange('sniper_confidence_threshold', value)}
                      max={0.95}
                      min={0.6}
                      step={0.05}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Risk Management Parameters */}
              <Card className="glassmorphism border-neon-orange/30">
                <CardHeader>
                  <CardTitle className="text-neon-orange flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Risk Management</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Max Position: {parameters.max_position_size.toFixed(1)} SOL</Label>
                    <Slider
                      value={[parameters.max_position_size]}
                      onValueChange={([value]) => handleParameterChange('max_position_size', value)}
                      max={10}
                      min={1}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Stop Loss: {(parameters.stop_loss_percentage * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[parameters.stop_loss_percentage]}
                      onValueChange={([value]) => handleParameterChange('stop_loss_percentage', value)}
                      max={0.25}
                      min={0.05}
                      step={0.01}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Take Profit: {(parameters.take_profit_percentage * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[parameters.take_profit_percentage]}
                      onValueChange={([value]) => handleParameterChange('take_profit_percentage', value)}
                      max={0.50}
                      min={0.15}
                      step={0.05}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Max Daily Loss: {(parameters.max_daily_loss * 100).toFixed(1)}%</Label>
                    <Slider
                      value={[parameters.max_daily_loss]}
                      onValueChange={([value]) => handleParameterChange('max_daily_loss', value)}
                      max={0.08}
                      min={0.01}
                      step={0.005}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* AI Signals Parameters */}
              <Card className="glassmorphism border-neon-green/30">
                <CardHeader>
                  <CardTitle className="text-neon-green flex items-center space-x-2">
                    <Brain className="w-5 h-5" />
                    <span>AI Signals</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Min Confidence: {(parameters.ai_min_confidence * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[parameters.ai_min_confidence]}
                      onValueChange={([value]) => handleParameterChange('ai_min_confidence', value)}
                      max={0.90}
                      min={0.60}
                      step={0.05}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Sentiment Weight: {(parameters.sentiment_weight * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[parameters.sentiment_weight]}
                      onValueChange={([value]) => handleParameterChange('sentiment_weight', value)}
                      max={0.50}
                      min={0.10}
                      step={0.05}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Technical Weight: {(parameters.technical_weight * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[parameters.technical_weight]}
                      onValueChange={([value]) => handleParameterChange('technical_weight', value)}
                      max={0.90}
                      min={0.50}
                      step={0.05}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Re-entry Parameters */}
              <Card className="glassmorphism border-neon-blue/30">
                <CardHeader>
                  <CardTitle className="text-neon-blue flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Re-entry Engine</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Momentum: {(parameters.momentum_threshold * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[parameters.momentum_threshold]}
                      onValueChange={([value]) => handleParameterChange('momentum_threshold', value)}
                      max={0.30}
                      min={0.05}
                      step={0.05}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Volume Spike: {parameters.volume_spike_threshold.toFixed(1)}x</Label>
                    <Slider
                      value={[parameters.volume_spike_threshold]}
                      onValueChange={([value]) => handleParameterChange('volume_spike_threshold', value)}
                      max={5.0}
                      min={1.5}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>RSI Oversold: {parameters.rsi_oversold}</Label>
                    <Slider
                      value={[parameters.rsi_oversold]}
                      onValueChange={([value]) => handleParameterChange('rsi_oversold', value)}
                      max={40}
                      min={20}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>RSI Overbought: {parameters.rsi_overbought}</Label>
                    <Slider
                      value={[parameters.rsi_overbought]}
                      onValueChange={([value]) => handleParameterChange('rsi_overbought', value)}
                      max={80}
                      min={60}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glassmorphism border-neon-blue/30">
                <CardContent className="p-6 text-center">
                  <Brain className="w-8 h-8 text-neon-blue mx-auto mb-2" />
                  <Button
                    className="w-full"
                    onClick={() => handleOptimization('Bayesian')}
                    disabled={isOptimizing}
                  >
                    {isOptimizing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                    Bayesian Optimization
                  </Button>
                  <div className="text-xs text-muted-foreground mt-2">
                    Advanced probabilistic optimization
                  </div>
                </CardContent>
              </Card>

              <Card className="glassmorphism border-neon-green/30">
                <CardContent className="p-6 text-center">
                  <Cpu className="w-8 h-8 text-neon-green mx-auto mb-2" />
                  <Button
                    className="w-full"
                    onClick={() => handleOptimization('Genetic Algorithm')}
                    disabled={isOptimizing}
                  >
                    {isOptimizing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Cpu className="w-4 h-4 mr-2" />}
                    Genetic Algorithm
                  </Button>
                  <div className="text-xs text-muted-foreground mt-2">
                    Evolutionary optimization method
                  </div>
                </CardContent>
              </Card>

              <Card className="glassmorphism border-neon-orange/30">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 text-neon-orange mx-auto mb-2" />
                  <Button
                    className="w-full"
                    onClick={() => handleOptimization('Gradient Descent')}
                    disabled={isOptimizing}
                  >
                    {isOptimizing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                    Gradient Descent
                  </Button>
                  <div className="text-xs text-muted-foreground mt-2">
                    ML-guided optimization
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Score */}
            <Card className="glassmorphism border-nuclear-glow/30">
              <CardHeader>
                <CardTitle className="text-nuclear-glow">Optimization Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Current Score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(currentScore)}`}>
                      {currentScore.toFixed(1)}/100
                    </span>
                  </div>
                  <Progress value={currentScore} className="h-3" />
                  <div className="flex justify-between items-center">
                    <span>Target Score</span>
                    <span className="text-nuclear-glow font-bold">{targetScore.toFixed(1)}/100</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-neon-green">92</div>
                      <div className="text-muted-foreground">Profit</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-neon-blue">85</div>
                      <div className="text-muted-foreground">Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-neon-orange">88</div>
                      <div className="text-muted-foreground">Speed</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-nuclear-glow">90</div>
                      <div className="text-muted-foreground">BoomRoach</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <h3 className="text-lg font-semibold">Optimization History</h3>
            <div className="space-y-3">
              {optimizationHistory.map((result, index) => (
                <Card key={index} className="glassmorphism border-neon-blue/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getMethodIcon(result.method)}
                        <div>
                          <div className="font-semibold">{result.method}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(result.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreColor(result.score)}`}>
                          {result.score.toFixed(1)}
                        </div>
                        <div className={`text-sm ${result.improvement > 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                          {result.improvement > 0 ? '+' : ''}{result.improvement.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* BoomRoach Tab */}
          <TabsContent value="boomroach" className="space-y-6">
            <Card className="glassmorphism border-nuclear-glow/30">
              <CardHeader>
                <CardTitle className="text-nuclear-glow flex items-center space-x-2">
                  <Flame className="w-5 h-5" />
                  <span>BoomRoach Value Optimization</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Commission Rate: {(parameters.commission_rate * 100).toFixed(1)}%</Label>
                  <Slider
                    value={[parameters.commission_rate]}
                    onValueChange={([value]) => handleParameterChange('commission_rate', value)}
                    max={0.025}
                    min={0.010}
                    step={0.001}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Higher rates = More treasury growth
                  </div>
                </div>

                <div>
                  <Label>Treasury Allocation: {(parameters.treasury_allocation * 100).toFixed(0)}%</Label>
                  <Slider
                    value={[parameters.treasury_allocation]}
                    onValueChange={([value]) => handleParameterChange('treasury_allocation', value)}
                    max={0.80}
                    min={0.60}
                    step={0.05}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>LP Burn Allocation: {(parameters.burn_allocation * 100).toFixed(0)}%</Label>
                  <Slider
                    value={[parameters.burn_allocation]}
                    onValueChange={([value]) => handleParameterChange('burn_allocation', value)}
                    max={0.30}
                    min={0.15}
                    step={0.05}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Burn Threshold: ${parameters.burn_threshold.toFixed(0)}</Label>
                  <Slider
                    value={[parameters.burn_threshold]}
                    onValueChange={([value]) => handleParameterChange('burn_threshold', value)}
                    max={2000}
                    min={500}
                    step={50}
                    className="mt-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Lower threshold = More frequent burns
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-nuclear-glow/10 border border-nuclear-glow/30">
                  <h4 className="font-semibold text-nuclear-glow mb-2">Allocation Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Treasury:</span>
                      <span>{(parameters.treasury_allocation * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>LP Burning:</span>
                      <span>{(parameters.burn_allocation * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Buybacks:</span>
                      <span>{((1 - parameters.treasury_allocation - parameters.burn_allocation) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default ParameterController

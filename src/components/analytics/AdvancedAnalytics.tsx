'use client'

import type React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Zap,
  Shield,
  Crown,
  Flame,
  DollarSign,
  Clock,
  Users,
  Bot,
  AlertTriangle,
  CheckCircle,
  Eye,
  Brain,
  Rocket,
  Award,
  Star,
  Heart,
  ThumbsUp,
  Filter,
  Calendar,
  RefreshCw,
  Download,
  Share2
} from 'lucide-react'

interface PerformanceData {
  timestamp: string
  totalPnL: number
  dailyPnL: number
  portfolioValue: number
  winRate: number
  sharpeRatio: number
  maxDrawdown: number
  boomroachPrice: number
  treasuryBalance: number
  lpBurned: number
  communityGrowth: number
}

interface TradingMetrics {
  totalTrades: number
  successfulTrades: number
  avgExecutionTime: number
  avgProfitPerTrade: number
  avgLossPerTrade: number
  bestTrade: number
  worstTrade: number
  profitFactor: number
  recoveryFactor: number
  calmarRatio: number
  sortinoRatio: number
  maxConsecutiveWins: number
  maxConsecutiveLosses: number
  avgHoldTime: number
  tradingFrequency: number
}

interface BoomRoachMetrics {
  tokenPrice: number
  priceChange24h: number
  marketCap: number
  volume24h: number
  treasuryBalance: number
  totalBurned: number
  burnRate: number
  commissionGenerated: number
  holders: number
  communityScore: number
  viralityIndex: number
  memePotential: number
}

interface EnginePerformance {
  sniper: {
    signals: number
    successRate: number
    avgReturn: number
    totalProfit: number
  }
  reentry: {
    signals: number
    successRate: number
    avgReturn: number
    totalProfit: number
  }
  ai: {
    signals: number
    successRate: number
    avgReturn: number
    totalProfit: number
    confidence: number
  }
  guardian: {
    alertsTriggered: number
    lossesAvoided: number
    riskScore: number
    protectionRate: number
  }
}

export function AdvancedAnalytics() {
  const [activeTab, setActiveTab] = useState('performance')
  const [timeRange, setTimeRange] = useState('24h')
  const [isLive, setIsLive] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Mock data - in real app, this would come from APIs
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [tradingMetrics, setTradingMetrics] = useState<TradingMetrics>({
    totalTrades: 1247,
    successfulTrades: 972,
    avgExecutionTime: 1.8,
    avgProfitPerTrade: 145.50,
    avgLossPerTrade: 78.20,
    bestTrade: 2840.50,
    worstTrade: -324.80,
    profitFactor: 1.86,
    recoveryFactor: 4.2,
    calmarRatio: 2.1,
    sortinoRatio: 2.8,
    maxConsecutiveWins: 15,
    maxConsecutiveLosses: 4,
    avgHoldTime: 4.2,
    tradingFrequency: 12.4
  })

  const [boomroachMetrics, setBoomroachMetrics] = useState<BoomRoachMetrics>({
    tokenPrice: 0.00342,
    priceChange24h: 0.156,
    marketCap: 3420000,
    volume24h: 1850000,
    treasuryBalance: 156800,
    totalBurned: 2450000,
    burnRate: 0.034,
    commissionGenerated: 12450,
    holders: 8950,
    communityScore: 8.7,
    viralityIndex: 7.2,
    memePotential: 9.1
  })

  const [enginePerformance, setEnginePerformance] = useState<EnginePerformance>({
    sniper: {
      signals: 156,
      successRate: 0.74,
      avgReturn: 0.23,
      totalProfit: 45600
    },
    reentry: {
      signals: 89,
      successRate: 0.82,
      avgReturn: 0.18,
      totalProfit: 28900
    },
    ai: {
      signals: 134,
      successRate: 0.79,
      avgReturn: 0.31,
      totalProfit: 52300,
      confidence: 0.86
    },
    guardian: {
      alertsTriggered: 23,
      lossesAvoided: 18,
      riskScore: 2.4,
      protectionRate: 0.78
    }
  })

  // Generate mock performance data
  useEffect(() => {
    const generateData = () => {
      const data = []
      const now = new Date()
      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720

      for (let i = hours; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
        data.push({
          timestamp: timestamp.toISOString(),
          totalPnL: 100000 + Math.random() * 50000 + i * 100,
          dailyPnL: (Math.random() - 0.5) * 5000,
          portfolioValue: 250000 + Math.random() * 100000,
          winRate: 0.65 + Math.random() * 0.2,
          sharpeRatio: 2.0 + Math.random() * 1.0,
          maxDrawdown: Math.random() * 0.08,
          boomroachPrice: 0.00300 + Math.random() * 0.001,
          treasuryBalance: 150000 + Math.random() * 20000,
          lpBurned: 2000000 + i * 100,
          communityGrowth: 8000 + i * 2
        })
      }
      setPerformanceData(data)
    }

    generateData()

    // Update data every 30 seconds if live
    const interval = setInterval(() => {
      if (isLive) {
        generateData()
        setLastUpdate(new Date())
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [timeRange, isLive])

  const performanceScore = useMemo(() => {
    const winRateScore = (tradingMetrics.successfulTrades / tradingMetrics.totalTrades) * 100
    const profitScore = Math.min(tradingMetrics.profitFactor * 20, 100)
    const riskScore = Math.max(100 - (tradingMetrics.avgExecutionTime * 20), 0)
    const boomroachScore = (boomroachMetrics.memePotential * 10)

    return Math.round((winRateScore + profitScore + riskScore + boomroachScore) / 4)
  }, [tradingMetrics, boomroachMetrics])

  return (
    <Card className="glassmorphism border-nuclear-glow/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-nuclear-glow">
            <BarChart3 className="w-6 h-6" />
            <span>Advanced Analytics Dashboard</span>
            <Badge className="bg-nuclear-glow/20 text-nuclear-glow border-nuclear-glow/30">
              Performance Score: {performanceScore}/100
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant={isLive ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLive(!isLive)}
            >
              <Activity className={`w-4 h-4 mr-2 ${isLive ? 'animate-pulse' : ''}`} />
              {isLive ? 'LIVE' : 'PAUSED'}
            </Button>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 rounded bg-background border border-border text-sm"
            >
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="performance" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="trading" className="flex items-center space-x-2">
              <Bot className="w-4 h-4" />
              <span>Trading Engines</span>
            </TabsTrigger>
            <TabsTrigger value="boomroach" className="flex items-center space-x-2">
              <Rocket className="w-4 h-4" />
              <span>BoomRoach</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Risk Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Community</span>
            </TabsTrigger>
          </TabsList>

          {/* Performance Analytics */}
          <TabsContent value="performance" className="space-y-6">
            <PerformanceAnalytics
              data={performanceData}
              metrics={tradingMetrics}
              timeRange={timeRange}
            />
          </TabsContent>

          {/* Trading Engines */}
          <TabsContent value="trading" className="space-y-6">
            <TradingEngineAnalytics
              performance={enginePerformance}
              data={performanceData}
            />
          </TabsContent>

          {/* BoomRoach Analytics */}
          <TabsContent value="boomroach" className="space-y-6">
            <BoomRoachAnalytics
              metrics={boomroachMetrics}
              data={performanceData}
            />
          </TabsContent>

          {/* Risk Analysis */}
          <TabsContent value="risk" className="space-y-6">
            <RiskAnalytics
              metrics={tradingMetrics}
              data={performanceData}
            />
          </TabsContent>

          {/* Community Analytics */}
          <TabsContent value="community" className="space-y-6">
            <CommunityAnalytics
              metrics={boomroachMetrics}
              data={performanceData}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Performance Analytics Component
function PerformanceAnalytics({
  data,
  metrics,
  timeRange
}: {
  data: PerformanceData[]
  metrics: TradingMetrics
  timeRange: string
}) {
  const chartData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    pnl: d.totalPnL,
    portfolio: d.portfolioValue,
    winRate: d.winRate * 100,
    sharpe: d.sharpeRatio
  }))

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glassmorphism border-neon-green/30">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-neon-green mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-green">
              {((metrics.successfulTrades / metrics.totalTrades) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-blue/30">
          <CardContent className="p-4 text-center">
            <Zap className="w-6 h-6 text-neon-blue mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-blue">
              {metrics.avgExecutionTime.toFixed(1)}s
            </div>
            <div className="text-xs text-muted-foreground">Avg Execution</div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-nuclear-glow/30">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 text-nuclear-glow mx-auto mb-2" />
            <div className="text-xl font-bold text-nuclear-glow">
              {metrics.profitFactor.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Profit Factor</div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-orange/30">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 text-neon-orange mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-orange">
              ${metrics.avgProfitPerTrade.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Profit</div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Chart */}
      <Card className="glassmorphism border-neon-green/30">
        <CardHeader>
          <CardTitle className="text-neon-green">Portfolio Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="#10b981"
                  fill="url(#greenGradient)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glassmorphism border-neon-blue/30">
          <CardHeader>
            <CardTitle className="text-neon-blue">Risk-Adjusted Returns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Sharpe Ratio</span>
              <span className="font-bold text-neon-blue">{metrics.sortinoRatio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Sortino Ratio</span>
              <span className="font-bold text-neon-blue">{metrics.sortinoRatio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Calmar Ratio</span>
              <span className="font-bold text-neon-blue">{metrics.calmarRatio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Recovery Factor</span>
              <span className="font-bold text-neon-blue">{metrics.recoveryFactor.toFixed(1)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-nuclear-glow/30">
          <CardHeader>
            <CardTitle className="text-nuclear-glow">Trading Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Trades</span>
              <span className="font-bold text-nuclear-glow">{metrics.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span>Best Trade</span>
              <span className="font-bold text-neon-green">${metrics.bestTrade.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Worst Trade</span>
              <span className="font-bold text-neon-red">${metrics.worstTrade.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Hold Time</span>
              <span className="font-bold text-nuclear-glow">{metrics.avgHoldTime.toFixed(1)}h</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Trading Engine Analytics Component
function TradingEngineAnalytics({
  performance
}: {
  performance: EnginePerformance
  data: PerformanceData[]
}) {
  const engineData = [
    { name: 'Sniper', success: performance.sniper.successRate * 100, profit: performance.sniper.totalProfit, color: '#ef4444' },
    { name: 'Re-entry', success: performance.reentry.successRate * 100, profit: performance.reentry.totalProfit, color: '#3b82f6' },
    { name: 'AI Signals', success: performance.ai.successRate * 100, profit: performance.ai.totalProfit, color: '#10b981' },
  ]

  return (
    <div className="space-y-6">
      {/* Engine Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glassmorphism border-neon-red/30">
          <CardContent className="p-4 text-center">
            <Zap className="w-6 h-6 text-neon-red mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-red">
              {(performance.sniper.successRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Sniper Success</div>
            <div className="text-xs text-neon-red mt-1">
              ${(performance.sniper.totalProfit / 1000).toFixed(1)}k profit
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-blue/30">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-neon-blue mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-blue">
              {(performance.reentry.successRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Re-entry Success</div>
            <div className="text-xs text-neon-blue mt-1">
              ${(performance.reentry.totalProfit / 1000).toFixed(1)}k profit
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-green/30">
          <CardContent className="p-4 text-center">
            <Brain className="w-6 h-6 text-neon-green mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-green">
              {(performance.ai.successRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">AI Success</div>
            <div className="text-xs text-neon-green mt-1">
              {(performance.ai.confidence * 100).toFixed(0)}% confidence
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-nuclear-glow/30">
          <CardContent className="p-4 text-center">
            <Shield className="w-6 h-6 text-nuclear-glow mx-auto mb-2" />
            <div className="text-xl font-bold text-nuclear-glow">
              {(performance.guardian.protectionRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Protection Rate</div>
            <div className="text-xs text-nuclear-glow mt-1">
              {performance.guardian.lossesAvoided} losses avoided
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engine Comparison Chart */}
      <Card className="glassmorphism border-neon-orange/30">
        <CardHeader>
          <CardTitle className="text-neon-orange">Engine Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engineData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="success" fill="url(#barGradient)" />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Engine Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <EngineCard
          title="Sniper Engine"
          icon={<Zap className="w-5 h-5" />}
          color="neon-red"
          stats={performance.sniper}
        />
        <EngineCard
          title="Re-entry Engine"
          icon={<TrendingUp className="w-5 h-5" />}
          color="neon-blue"
          stats={performance.reentry}
        />
        <EngineCard
          title="AI Signal Engine"
          icon={<Brain className="w-5 h-5" />}
          color="neon-green"
          stats={performance.ai}
        />
      </div>
    </div>
  )
}

// Engine Card Component
function EngineCard({
  title,
  icon,
  color,
  stats
}: {
  title: string
  icon: React.ReactNode
  color: string
  stats: any
}) {
  return (
    <Card className={`glassmorphism border-${color}/30`}>
      <CardHeader>
        <CardTitle className={`text-${color} flex items-center space-x-2`}>
          {icon}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm">Signals Generated</span>
          <span className="font-bold">{stats.signals}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Success Rate</span>
          <span className={`font-bold text-${color}`}>
            {(stats.successRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Avg Return</span>
          <span className="font-bold text-neon-green">
            {(stats.avgReturn * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Total Profit</span>
          <span className="font-bold text-neon-green">
            ${(stats.totalProfit / 1000).toFixed(1)}k
          </span>
        </div>
        {stats.confidence && (
          <div className="flex justify-between">
            <span className="text-sm">Confidence</span>
            <span className={`font-bold text-${color}`}>
              {(stats.confidence * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// BoomRoach Analytics Component
function BoomRoachAnalytics({
  metrics,
  data
}: {
  metrics: BoomRoachMetrics
  data: PerformanceData[]
}) {
  const priceData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: d.boomroachPrice,
    treasury: d.treasuryBalance,
    burned: d.lpBurned
  }))

  return (
    <div className="space-y-6">
      {/* BoomRoach Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glassmorphism border-nuclear-glow/30">
          <CardContent className="p-4 text-center">
            <Rocket className="w-6 h-6 text-nuclear-glow mx-auto mb-2" />
            <div className="text-xl font-bold text-nuclear-glow">
              ${metrics.tokenPrice.toFixed(5)}
            </div>
            <div className="text-xs text-muted-foreground">Token Price</div>
            <div className={`text-xs mt-1 ${metrics.priceChange24h > 0 ? 'text-neon-green' : 'text-neon-red'}`}>
              {metrics.priceChange24h > 0 ? '+' : ''}{(metrics.priceChange24h * 100).toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-orange/30">
          <CardContent className="p-4 text-center">
            <Flame className="w-6 h-6 text-neon-orange mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-orange">
              ${(metrics.totalBurned / 1000000).toFixed(1)}M
            </div>
            <div className="text-xs text-muted-foreground">Total Burned</div>
            <div className="text-xs text-neon-orange mt-1">
              {(metrics.burnRate * 100).toFixed(1)}% rate
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-green/30">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 text-neon-green mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-green">
              ${(metrics.treasuryBalance / 1000).toFixed(0)}k
            </div>
            <div className="text-xs text-muted-foreground">Treasury</div>
            <div className="text-xs text-neon-green mt-1">
              ${(metrics.commissionGenerated / 1000).toFixed(1)}k today
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-blue/30">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-neon-blue mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-blue">
              {(metrics.holders / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-muted-foreground">Holders</div>
            <div className="text-xs text-neon-blue mt-1">
              Score: {metrics.communityScore.toFixed(1)}/10
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BoomRoach Price Chart */}
      <Card className="glassmorphism border-nuclear-glow/30">
        <CardHeader>
          <CardTitle className="text-nuclear-glow">BoomRoach Price & Treasury</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis yAxisId="price" orientation="left" className="text-xs" />
                <YAxis yAxisId="treasury" orientation="right" className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="price"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="treasury"
                  type="monotone"
                  dataKey="treasury"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Meme Potential Radar */}
      <Card className="glassmorphism border-neon-purple/30">
        <CardHeader>
          <CardTitle className="text-neon-purple">Meme Potential Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={[
                { subject: 'Community', A: metrics.communityScore, fullMark: 10 },
                { subject: 'Virality', A: metrics.viralityIndex, fullMark: 10 },
                { subject: 'Meme Potential', A: metrics.memePotential, fullMark: 10 },
                { subject: 'Treasury Health', A: 8.5, fullMark: 10 },
                { subject: 'Trading Volume', A: 7.8, fullMark: 10 },
                { subject: 'Price Momentum', A: 8.2, fullMark: 10 },
              ]}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" className="text-xs" />
                <PolarRadiusAxis angle={90} domain={[0, 10]} className="text-xs" />
                <Radar
                  name="BoomRoach"
                  dataKey="A"
                  stroke="#a855f7"
                  fill="#a855f7"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Risk Analytics Component
function RiskAnalytics({
  metrics,
  data
}: {
  metrics: TradingMetrics
  data: PerformanceData[]
}) {
  const riskData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    drawdown: d.maxDrawdown * 100,
    riskScore: (1 - d.maxDrawdown) * 10
  }))

  return (
    <div className="space-y-6">
      {/* Risk Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glassmorphism border-neon-green/30">
          <CardContent className="p-4 text-center">
            <Shield className="w-6 h-6 text-neon-green mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-green">
              8.5/10
            </div>
            <div className="text-xs text-muted-foreground">Risk Score</div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-red/30">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-neon-red mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-red">
              {data[data.length - 1]?.maxDrawdown ? (data[data.length - 1].maxDrawdown * 100).toFixed(1) : '0.0'}%
            </div>
            <div className="text-xs text-muted-foreground">Max Drawdown</div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-orange/30">
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 text-neon-orange mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-orange">
              2.1
            </div>
            <div className="text-xs text-muted-foreground">VaR Ratio</div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-blue/30">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 text-neon-blue mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-blue">
              94.2%
            </div>
            <div className="text-xs text-muted-foreground">Risk-Adj Return</div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Timeline */}
      <Card className="glassmorphism border-neon-red/30">
        <CardHeader>
          <CardTitle className="text-neon-red">Risk Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="#ef4444"
                  fill="url(#redGradient)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Community Analytics Component
function CommunityAnalytics({
  metrics,
  data
}: {
  metrics: BoomRoachMetrics
  data: PerformanceData[]
}) {
  const communityData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    growth: d.communityGrowth,
    engagement: Math.random() * 100 + 50
  }))

  return (
    <div className="space-y-6">
      {/* Community Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glassmorphism border-neon-blue/30">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-neon-blue mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-blue">
              {(metrics.holders / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-muted-foreground">Total Holders</div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-green/30">
          <CardContent className="p-4 text-center">
            <Heart className="w-6 h-6 text-neon-green mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-green">
              {metrics.communityScore.toFixed(1)}/10
            </div>
            <div className="text-xs text-muted-foreground">Community Score</div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-orange/30">
          <CardContent className="p-4 text-center">
            <Flame className="w-6 h-6 text-neon-orange mx-auto mb-2" />
            <div className="text-xl font-bold text-neon-orange">
              {metrics.viralityIndex.toFixed(1)}/10
            </div>
            <div className="text-xs text-muted-foreground">Virality Index</div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-nuclear-glow/30">
          <CardContent className="p-4 text-center">
            <Star className="w-6 h-6 text-nuclear-glow mx-auto mb-2" />
            <div className="text-xl font-bold text-nuclear-glow">
              {metrics.memePotential.toFixed(1)}/10
            </div>
            <div className="text-xs text-muted-foreground">Meme Potential</div>
          </CardContent>
        </Card>
      </div>

      {/* Community Growth Chart */}
      <Card className="glassmorphism border-neon-blue/30">
        <CardHeader>
          <CardTitle className="text-neon-blue">Community Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={communityData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="growth"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdvancedAnalytics

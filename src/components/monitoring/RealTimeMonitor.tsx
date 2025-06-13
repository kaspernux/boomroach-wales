'use client'

import React, { useState, useEffect } from 'react'
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Bot,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Flame,
  Target,
  Eye,
  Brain,
  Rocket,
  Crown,
  Settings,
  RefreshCw,
  Pause,
  Play,
  BarChart3,
  Users,
  Award,
  Star,
  Heart
} from 'lucide-react'

interface RealTimeMetrics {
  timestamp: string
  totalPnL: number
  dailyPnL: number
  winRate: number
  totalTrades: number
  activeTrades: number
  avgExecutionTime: number
  boomroachPrice: number
  treasuryBalance: number
  lpBurned: number
  communityGrowth: number
  riskScore: number
  optimizationScore: number
}

interface EngineStatus {
  sniper: {
    active: boolean
    signals: number
    successRate: number
    profit: number
    lastTrade: string
  }
  reentry: {
    active: boolean
    signals: number
    successRate: number
    profit: number
    lastTrade: string
  }
  ai: {
    active: boolean
    signals: number
    successRate: number
    profit: number
    confidence: number
    lastTrade: string
  }
  guardian: {
    active: boolean
    alerts: number
    protectionRate: number
    riskLevel: number
    emergencyStops: number
  }
}

export function RealTimeMonitor() {
  const [isLive, setIsLive] = useState(true)
  const [metrics, setMetrics] = useState<RealTimeMetrics[]>([])
  const [currentMetrics, setCurrentMetrics] = useState<RealTimeMetrics | null>(null)
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({
    sniper: { active: true, signals: 24, successRate: 0.78, profit: 12450, lastTrade: '2m ago' },
    reentry: { active: true, signals: 18, successRate: 0.82, profit: 8900, lastTrade: '5m ago' },
    ai: { active: true, signals: 31, successRate: 0.76, profit: 15600, confidence: 0.89, lastTrade: '1m ago' },
    guardian: { active: true, alerts: 3, protectionRate: 0.94, riskLevel: 2.4, emergencyStops: 0 }
  })
  const [alerts, setAlerts] = useState<Array<{
    id: string
    type: 'success' | 'warning' | 'error' | 'info'
    message: string
    timestamp: Date
  }>>([])

  // Real-time data simulation
  useEffect(() => {
    if (!isLive) return

    const generateMetrics = (): RealTimeMetrics => ({
      timestamp: new Date().toISOString(),
      totalPnL: 47239 + Math.random() * 1000,
      dailyPnL: 2341 + (Math.random() - 0.5) * 500,
      winRate: 0.747 + (Math.random() - 0.5) * 0.1,
      totalTrades: 127 + Math.floor(Math.random() * 5),
      activeTrades: 3 + Math.floor(Math.random() * 3),
      avgExecutionTime: 1.8 + Math.random() * 0.5,
      boomroachPrice: 0.00342 + (Math.random() - 0.5) * 0.0001,
      treasuryBalance: 156800 + Math.random() * 1000,
      lpBurned: 2450000 + Math.random() * 10000,
      communityGrowth: 8950 + Math.random() * 10,
      riskScore: 2.4 + (Math.random() - 0.5) * 0.5,
      optimizationScore: 87.5 + (Math.random() - 0.5) * 5
    })

    const interval = setInterval(() => {
      const newMetrics = generateMetrics()
      setCurrentMetrics(newMetrics)
      setMetrics(prev => [...prev.slice(-59), newMetrics]) // Keep last 60 data points

      // Generate alerts based on metrics
      if (newMetrics.riskScore > 5.0) {
        addAlert('warning', 'Risk score elevated: Emergency monitoring activated')
      }
      if (newMetrics.avgExecutionTime > 3.0) {
        addAlert('error', 'Execution time spike detected: Optimizing parameters')
      }
      if (newMetrics.dailyPnL > 3000) {
        addAlert('success', `Daily P&L milestone reached: $${newMetrics.dailyPnL.toFixed(0)}`)
      }

    }, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [isLive])

  const addAlert = (type: 'success' | 'warning' | 'error' | 'info', message: string) => {
    const newAlert = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: new Date()
    }
    setAlerts(prev => [newAlert, ...prev.slice(0, 9)]) // Keep last 10 alerts
  }

  const chartData = metrics.map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    pnl: m.totalPnL,
    winRate: m.winRate * 100,
    riskScore: m.riskScore,
    price: m.boomroachPrice * 1000 // Scale for better visualization
  }))

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-neon-green" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-neon-orange" />
      case 'error': return <AlertTriangle className="w-4 h-4 text-neon-red" />
      default: return <Activity className="w-4 h-4 text-neon-blue" />
    }
  }

  const getEngineIcon = (engine: string) => {
    switch (engine) {
      case 'sniper': return <Zap className="w-5 h-5" />
      case 'reentry': return <TrendingUp className="w-5 h-5" />
      case 'ai': return <Brain className="w-5 h-5" />
      case 'guardian': return <Shield className="w-5 h-5" />
      default: return <Bot className="w-5 h-5" />
    }
  }

  return (
    <Card className="glassmorphism border-nuclear-glow/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-nuclear-glow">
            <Activity className="w-6 h-6" />
            <span>Real-Time Performance Monitor</span>
            <Badge className={`${isLive ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 'bg-muted/20 text-muted-foreground border-muted/30'}`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${isLive ? 'bg-neon-green animate-pulse' : 'bg-muted-foreground'}`} />
              {isLive ? 'LIVE' : 'PAUSED'}
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant={isLive ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isLive ? 'Pause' : 'Resume'}
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="engines" className="flex items-center space-x-2">
              <Bot className="w-4 h-4" />
              <span>Engines</span>
            </TabsTrigger>
            <TabsTrigger value="boomroach" className="flex items-center space-x-2">
              <Rocket className="w-4 h-4" />
              <span>BoomRoach</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Alerts</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glassmorphism border-neon-green/30">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-6 h-6 text-neon-green mx-auto mb-2" />
                  <div className="text-xl font-bold text-neon-green">
                    ${currentMetrics?.dailyPnL.toFixed(0) || '0'}
                  </div>
                  <div className="text-xs text-muted-foreground">Daily P&L</div>
                </CardContent>
              </Card>

              <Card className="glassmorphism border-neon-blue/30">
                <CardContent className="p-4 text-center">
                  <Target className="w-6 h-6 text-neon-blue mx-auto mb-2" />
                  <div className="text-xl font-bold text-neon-blue">
                    {((currentMetrics?.winRate || 0) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </CardContent>
              </Card>

              <Card className="glassmorphism border-nuclear-glow/30">
                <CardContent className="p-4 text-center">
                  <Clock className="w-6 h-6 text-nuclear-glow mx-auto mb-2" />
                  <div className="text-xl font-bold text-nuclear-glow">
                    {currentMetrics?.avgExecutionTime.toFixed(1) || '0.0'}s
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Execution</div>
                </CardContent>
              </Card>

              <Card className="glassmorphism border-neon-orange/30">
                <CardContent className="p-4 text-center">
                  <Shield className="w-6 h-6 text-neon-orange mx-auto mb-2" />
                  <div className="text-xl font-bold text-neon-orange">
                    {currentMetrics?.riskScore.toFixed(1) || '0.0'}/10
                  </div>
                  <div className="text-xs text-muted-foreground">Risk Score</div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <Card className="glassmorphism border-neon-green/30">
              <CardHeader>
                <CardTitle className="text-neon-green">Live Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis yAxisId="left" className="text-xs" />
                      <YAxis yAxisId="right" orientation="right" className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px'
                        }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="pnl"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        name="Total P&L"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="winRate"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        name="Win Rate %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trading Engines Tab */}
          <TabsContent value="engines" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(engineStatus).map(([engine, status]) => (
                <Card key={engine} className="glassmorphism border-neon-blue/30">
                  <CardHeader>
                    <CardTitle className={`flex items-center space-x-2 ${status.active ? 'text-neon-green' : 'text-muted-foreground'}`}>
                      {getEngineIcon(engine)}
                      <span className="capitalize">{engine} Engine</span>
                      <Badge className={`${status.active ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 'bg-muted/20 text-muted-foreground border-muted/30'}`}>
                        {status.active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {engine !== 'guardian' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm">Signals Today</span>
                          <span className="font-bold">{status.signals}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Success Rate</span>
                          <span className="font-bold text-neon-green">
                            {(status.successRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Profit Today</span>
                          <span className="font-bold text-neon-green">
                            ${status.profit.toLocaleString()}
                          </span>
                        </div>
                        {engine === 'ai' && (
                          <div className="flex justify-between">
                            <span className="text-sm">AI Confidence</span>
                            <span className="font-bold text-nuclear-glow">
                              {(status.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm">Last Trade</span>
                          <span className="text-muted-foreground">{status.lastTrade}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm">Alerts Today</span>
                          <span className="font-bold">{status.alerts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Protection Rate</span>
                          <span className="font-bold text-neon-green">
                            {(status.protectionRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Risk Level</span>
                          <span className={`font-bold ${status.riskLevel < 3 ? 'text-neon-green' : status.riskLevel < 7 ? 'text-neon-orange' : 'text-neon-red'}`}>
                            {status.riskLevel.toFixed(1)}/10
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Emergency Stops</span>
                          <span className="font-bold">{status.emergencyStops}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* BoomRoach Tab */}
          <TabsContent value="boomroach" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glassmorphism border-nuclear-glow/30">
                <CardContent className="p-4 text-center">
                  <Rocket className="w-6 h-6 text-nuclear-glow mx-auto mb-2" />
                  <div className="text-xl font-bold text-nuclear-glow">
                    ${(currentMetrics?.boomroachPrice || 0).toFixed(5)}
                  </div>
                  <div className="text-xs text-muted-foreground">Token Price</div>
                </CardContent>
              </Card>

              <Card className="glassmorphism border-neon-green/30">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-6 h-6 text-neon-green mx-auto mb-2" />
                  <div className="text-xl font-bold text-neon-green">
                    ${(currentMetrics?.treasuryBalance || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Treasury</div>
                </CardContent>
              </Card>

              <Card className="glassmorphism border-neon-orange/30">
                <CardContent className="p-4 text-center">
                  <Flame className="w-6 h-6 text-neon-orange mx-auto mb-2" />
                  <div className="text-xl font-bold text-neon-orange">
                    {((currentMetrics?.lpBurned || 0) / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-xs text-muted-foreground">LP Burned</div>
                </CardContent>
              </Card>

              <Card className="glassmorphism border-neon-blue/30">
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 text-neon-blue mx-auto mb-2" />
                  <div className="text-xl font-bold text-neon-blue">
                    {(currentMetrics?.communityGrowth || 0).toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Holders</div>
                </CardContent>
              </Card>
            </div>

            {/* BoomRoach Optimization Score */}
            <Card className="glassmorphism border-nuclear-glow/30">
              <CardHeader>
                <CardTitle className="text-nuclear-glow">BoomRoach Optimization Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Overall Score</span>
                    <span className="text-2xl font-bold text-nuclear-glow">
                      {currentMetrics?.optimizationScore.toFixed(1) || '0.0'}/100
                    </span>
                  </div>
                  <Progress value={currentMetrics?.optimizationScore || 0} className="h-3" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-neon-green">92</div>
                      <div className="text-muted-foreground">Treasury</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-neon-orange">88</div>
                      <div className="text-muted-foreground">LP Burning</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-neon-blue">85</div>
                      <div className="text-muted-foreground">Community</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-nuclear-glow">90</div>
                      <div className="text-muted-foreground">Trading</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">System Alerts</h3>
              <Button variant="outline" size="sm" onClick={() => setAlerts([])}>
                Clear All
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-start space-x-3 p-3 rounded-lg glassmorphism border border-neon-blue/20"
                  >
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="text-sm">{alert.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {alert.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {alerts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No alerts - System running smoothly</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default RealTimeMonitor

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWallet } from '@solana/wallet-adapter-react'
import { useGamification } from '@/components/gamification/AchievementSystem'
import { useHydraBot } from '@/hydra-bot/hooks/useHydraBot'
import { useRealTimeData } from '@/hooks/useRealTimeData'
import { HydraBotDashboard } from './HydraBotDashboard'
import {
  TrendingUp,
  Bot,
  Activity,
  BarChart3,
  PieChart,
  Wallet,
  Star,
  Clock,
  Zap,
  Shield
} from 'lucide-react'

export function TradingInterface() {
  const { connected, publicKey } = useWallet()
  const { updateStats, unlockAchievement, addXP } = useGamification()
  const { signals, portfolio, recentTrades, placeTrade, executeSignal, loading, error, authenticate, isAuthenticated } = useHydraBot()
  const { data: realTimeData } = useRealTimeData()

  // Utilise les paires de trading réelles du backend (extraction depuis realTimeData)
  const tradingPairs = Object.values(realTimeData?.prices ?? {})
  const [selectedPair, setSelectedPair] = useState(tradingPairs[0])
  const [orders, setOrders] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('trade')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')

  // Met à jour la paire sélectionnée si la liste change
  React.useEffect(() => {
    if (tradingPairs.length && (!selectedPair || !tradingPairs.find(p => p.symbol === selectedPair.symbol))) {
      setSelectedPair(tradingPairs[0])
    }
  }, [tradingPairs])

  const executeOrder = async () => {
    if (!connected || !amount) return

    // Utilise placeTrade du hook pour envoyer au backend
    await placeTrade({
      pair: selectedPair.symbol,
      type: tradeType,
      amount: Number.parseFloat(amount),
      price: orderType === 'limit' ? Number.parseFloat(price) : selectedPair.price,
      orderType
    })

    // Gamification
    updateStats('totalTrades', 1)
    addXP(50)
    if (orders.length === 0) unlockAchievement('first-trade')
    if (orders.length >= 9) unlockAchievement('trader-veteran')

    setAmount('')
    setPrice('')
  }

  const followAISignal = (signal: any) => {
    setSelectedPair(tradingPairs.find(p => p.symbol === signal.tokenSymbol) || tradingPairs[0])
    setTradeType(signal.type)
    setOrderType('limit')
    setPrice(signal.price.toString())
    setActiveTab('trade')
    unlockAchievement('ai-follower')
    addXP(25)
  }

  if (!connected) {
    return (
      <Card className="glassmorphism border-neon-orange/30">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <Wallet className="w-16 h-16 text-neon-orange mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-neon-orange mb-2">Connect Wallet to Trade</h3>
            <p className="text-muted-foreground">
              Connect your Solana wallet to access advanced trading features with Hydra AI Bot
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
              <Bot className="w-8 h-8 text-neon-blue mx-auto mb-2" />
              <div className="font-semibold text-neon-blue">AI Trading Signals</div>
              <div className="text-muted-foreground">Live win rate</div>
            </div>
            <div className="p-4 rounded-lg bg-neon-green/10 border border-neon-green/30">
              <Shield className="w-8 h-8 text-neon-green mx-auto mb-2" />
              <div className="font-semibold text-neon-green">Secure Trading</div>
              <div className="text-muted-foreground">Non-custodial</div>
            </div>
            <div className="p-4 rounded-lg bg-nuclear-glow/10 border border-nuclear-glow/30">
              <Zap className="w-8 h-8 text-nuclear-glow mx-auto mb-2" />
              <div className="font-semibold text-nuclear-glow">Real-time Data</div>
              <div className="text-muted-foreground">Live updates</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <Card className="glassmorphism border-neon-green/30">
        <CardHeader>
          <CardTitle className="flex items-center text-neon-green">
            <BarChart3 className="w-5 h-5 mr-2" />
            Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-neon-green">
                ${portfolio?.totalValue?.toLocaleString() ?? '0'}
              </div>
              <div className="text-sm text-muted-foreground">Total Value</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${portfolio?.dailyPnL >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                {portfolio?.dailyPnL >= 0 ? '+' : ''}${portfolio?.dailyPnL?.toFixed(2) ?? '0.00'}
              </div>
              <div className="text-sm text-muted-foreground">24h P&L</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${portfolio?.totalPnLPercentage >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                {portfolio?.totalPnLPercentage >= 0 ? '+' : ''}{portfolio?.totalPnLPercentage?.toFixed(2) ?? '0.00'}%
              </div>
              <div className="text-sm text-muted-foreground">Total Change</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-neon-blue">
                {portfolio?.positions?.length ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">Active Positions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Trading Interface */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="trade">Trade</TabsTrigger>
              <TabsTrigger value="hydra-bot">Hydra Bot</TabsTrigger>
              <TabsTrigger value="ai-signals">AI Signals</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="positions">Positions</TabsTrigger>
            </TabsList>

            <TabsContent value="trade">
              <Card className="glassmorphism border-neon-orange/30">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center text-neon-orange">
                      <Activity className="w-5 h-5 mr-2" />
                      Trade {selectedPair?.symbol}
                    </span>
                    <Badge className={`${selectedPair?.change24h >= 0 ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 'bg-red-400/20 text-red-400 border-red-400/30'}`}>
                      {selectedPair?.change24h >= 0 ? '+' : ''}{selectedPair?.change24h?.toFixed(2)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Price Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Price</div>
                      <div className="text-xl font-bold">${selectedPair?.price?.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">24h High</div>
                      <div className="text-lg font-semibold text-neon-green">${selectedPair?.high24h?.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">24h Low</div>
                      <div className="text-lg font-semibold text-red-400">${selectedPair?.low24h?.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Volume</div>
                      <div className="text-lg font-semibold">${(selectedPair?.volume24h / 1000000)?.toFixed(1)}M</div>
                    </div>
                  </div>

                  {/* Order Form */}
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <Button
                        variant={tradeType === 'BUY' ? 'default' : 'outline'}
                        onClick={() => setTradeType('BUY')}
                        className={`flex-1 ${tradeType === 'BUY' ? 'bg-neon-green/20 text-neon-green border-neon-green' : 'border-neon-green text-neon-green hover:bg-neon-green/10'}`}
                      >
                        BUY
                      </Button>
                      <Button
                        variant={tradeType === 'SELL' ? 'default' : 'outline'}
                        onClick={() => setTradeType('SELL')}
                        className={`flex-1 ${tradeType === 'SELL' ? 'bg-red-400/20 text-red-400 border-red-400' : 'border-red-400 text-red-400 hover:bg-red-400/10'}`}
                      >
                        SELL
                      </Button>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant={orderType === 'market' ? 'default' : 'outline'}
                        onClick={() => setOrderType('market')}
                        className="flex-1"
                      >
                        Market
                      </Button>
                      <Button
                        variant={orderType === 'limit' ? 'default' : 'outline'}
                        onClick={() => setOrderType('limit')}
                        className="flex-1"
                      >
                        Limit
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Amount</label>
                        <Input
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                        />
                      </div>

                      {orderType === 'limit' && (
                        <div>
                          <label className="text-sm text-muted-foreground">Price</label>
                          <Input
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder={selectedPair?.price?.toFixed(6)}
                            type="number"
                            step="0.000001"
                          />
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={executeOrder}
                      disabled={!amount || (orderType === 'limit' && !price)}
                      className={`w-full text-lg py-6 ${
                        tradeType === 'BUY'
                          ? 'bg-neon-green/20 text-neon-green hover:bg-neon-green/30 border border-neon-green/30'
                          : 'bg-red-400/20 text-red-400 hover:bg-red-400/30 border border-red-400/30'
                      }`}
                    >
                      {tradeType} {selectedPair?.symbol?.split('/')[0]}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hydra-bot">
              <HydraBotDashboard />
            </TabsContent>

            <TabsContent value="ai-signals">
              <Card className="glassmorphism border-neon-blue/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-neon-blue">
                    <Bot className="w-5 h-5 mr-2" />
                    Hydra AI Signals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {signals.map((signal) => (
                      <motion.div
                        key={signal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg glassmorphism border border-neon-blue/20 hover:border-neon-blue/40 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Badge className={`${signal.type === 'BUY' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 'bg-red-400/20 text-red-400 border-red-400/30'}`}>
                              {signal.type}
                            </Badge>
                            <div>
                              <div className="font-semibold">{signal.tokenSymbol}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(signal.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <Star className="w-4 h-4 text-nuclear-glow" />
                              <span className="font-bold text-nuclear-glow">{signal.confidence}%</span>
                            </div>
                            <Badge className="text-xs bg-neon-blue/20 text-neon-blue border-neon-blue/30">
                              {signal.action}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                          <div>
                            <div className="text-muted-foreground">Entry</div>
                            <div className="font-semibold">${signal.price?.toFixed(6)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Target</div>
                            <div className="font-semibold text-neon-green">${signal.targetPrice?.toFixed(6) ?? '-'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Stop Loss</div>
                            <div className="font-semibold text-red-400">${signal.stopLoss?.toFixed(6) ?? '-'}</div>
                          </div>
                        </div>

                        {signal.expectedProfit && (
                          <div className="mb-3">
                            <Badge className={`${signal.expectedProfit >= 0 ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 'bg-red-400/20 text-red-400 border-red-400/30'}`}>
                              P&L: {signal.expectedProfit >= 0 ? '+' : ''}{signal.expectedProfit.toFixed(2)}%
                            </Badge>
                          </div>
                        )}

                        <div className="text-sm text-muted-foreground mb-3">
                          <span className="font-semibold">Reason:</span> {signal.reasoning}
                        </div>

                        {signal.action?.toLowerCase().includes('buy') && (
                          <Button
                            onClick={() => followAISignal(signal)}
                            size="sm"
                            className="w-full bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 border border-neon-blue/30"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Follow Signal
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card className="glassmorphism border-nuclear-glow/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-nuclear-glow">
                    <Clock className="w-5 h-5 mr-2" />
                    Order History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentTrades.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No orders yet. Place your first trade to get started!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentTrades.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                        >
                          <div className="flex items-center space-x-3">
                            <Badge className={`${order.side === 'BUY' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 'bg-red-400/20 text-red-400 border-red-400/30'}`}>
                              {order.side}
                            </Badge>
                            <div>
                              <div className="font-semibold">{order.tokenSymbol}</div>
                              <div className="text-sm text-muted-foreground">
                                {order.amount} @ ${order.price?.toFixed(6)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={`text-xs ${
                              order.status === 'CONFIRMED' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' :
                              order.status === 'PENDING' ? 'bg-neon-blue/20 text-neon-blue border-neon-blue/30' :
                              'bg-red-400/20 text-red-400 border-red-400/30'
                            }`}>
                              {order.status}
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(order.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="positions">
              <Card className="glassmorphism border-neon-green/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-neon-green">
                    <PieChart className="w-5 h-5 mr-2" />
                    Current Positions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {portfolio?.positions?.map((position) => (
                      <div
                        key={position.tokenSymbol}
                        className="p-4 rounded-lg glassmorphism border border-neon-green/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold">{position.tokenSymbol}</div>
                          <Badge className={`${position.unrealizedPnl >= 0 ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 'bg-red-400/20 text-red-400 border-red-400/30'}`}>
                            {position.unrealizedPnlPct >= 0 ? '+' : ''}{position.unrealizedPnlPct?.toFixed(2)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Amount</div>
                            <div className="font-semibold">{position.amount?.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Value</div>
                            <div className="font-semibold">${position.value?.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">P&L</div>
                            <div className={`font-semibold ${position.unrealizedPnl >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                              {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl?.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Market Data Sidebar */}
        <div className="space-y-6">
          <Card className="glassmorphism border-neon-orange/30">
            <CardHeader>
              <CardTitle className="flex items-center text-neon-orange">
                <TrendingUp className="w-5 h-5 mr-2" />
                Markets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tradingPairs.map((pair) => (
                  <motion.div
                    key={pair.symbol}
                    onClick={() => setSelectedPair(pair)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedPair?.symbol === pair.symbol
                        ? 'bg-neon-orange/20 border border-neon-orange/30'
                        : 'bg-background/50 hover:bg-background/80 border border-transparent'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{pair.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          Vol: ${(pair.volume24h / 1000000).toFixed(1)}M
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${pair.price.toFixed(6)}</div>
                        <div className={`text-sm ${pair.change24h >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                          {pair.change24h >= 0 ? '+' : ''}{pair.change24h.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="glassmorphism border-nuclear-glow/30">
            <CardHeader>
              <CardTitle className="flex items-center text-nuclear-glow">
                <Activity className="w-5 h-5 mr-2" />
                Trading Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-nuclear-glow">
                    {realTimeData?.trading?.aiSignalsAccuracy ? `${realTimeData.trading.aiSignalsAccuracy}%` : '--'}
                  </div>
                  <div className="text-sm text-muted-foreground">AI Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-neon-green">{recentTrades.length}</div>
                  <div className="text-sm text-muted-foreground">Total Trades</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-neon-blue">{signals.length}</div>
                  <div className="text-sm text-muted-foreground">Active Signals</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

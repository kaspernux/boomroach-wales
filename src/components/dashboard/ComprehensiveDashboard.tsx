"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHydraBot } from "@/hydra-bot/hooks/useHydraBot";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import { Activity, BarChart3, Bot, Wallet, Target, Pause, Play, LineChart, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";

export function ComprehensiveDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { portfolio, engines, recentTrades, loading: hydraLoading } = useHydraBot();
  const { data: realTimeData, isConnected, error: rtError } = useRealTimeData();

  if (hydraLoading || !isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-neon-green" />
        <span className="ml-2 text-neon-green">Chargement du dashboard...</span>
      </div>
    );
  }
  if (rtError) {
    return <div className="text-red-500">Erreur : {rtError}</div>;
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl text-nuclear-glow">🪳 Roach Command Center</h1>
              <p className="text-muted-foreground mt-2">Live trading & AI engine dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30">
                <Activity className="w-4 h-4 mr-2" />
                Live
              </Badge>
              <span className="text-sm text-muted-foreground">
                Last update: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glassmorphism border-neon-green/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Portfolio Value</p>
                  <p className="text-2xl font-bold text-neon-green">
                    ${portfolio?.totalValue?.toLocaleString() ?? '0'}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-neon-green" />
              </div>
            </CardContent>
          </Card>
          <Card className="glassmorphism border-nuclear-glow/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Daily P&L</p>
                  <p className={`text-2xl font-bold ${(portfolio?.dailyPnL || 0) >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                    ${portfolio?.dailyPnL?.toFixed(2) ?? '0.00'}
                  </p>
                </div>
                {(portfolio?.dailyPnL || 0) >= 0 ?
                  <ArrowUpRight className="w-8 h-8 text-neon-green" /> :
                  <ArrowDownRight className="w-8 h-8 text-red-400" />
                }
              </div>
            </CardContent>
          </Card>
          <Card className="glassmorphism border-neon-blue/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Engines</p>
                  <p className="text-2xl font-bold text-neon-blue">
                    {engines.filter(e => e.status === "RUNNING").length}/{engines.length}
                  </p>
                </div>
                <Bot className="w-8 h-8 text-neon-blue" />
              </div>
            </CardContent>
          </Card>
          <Card className="glassmorphism border-neon-orange/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">AI Win Rate</p>
                  <p className="text-2xl font-bold text-neon-orange">
                    {realTimeData?.trading?.aiSignalsAccuracy ?? '--'}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-neon-orange" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engines">Hydra Engines</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="trades">Trading</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Portfolio Chart */}
              <Card className="glassmorphism border-neon-green/30">
                <CardHeader>
                  <CardTitle className="text-neon-green">Portfolio Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <LineChart className="w-16 h-16 mx-auto mb-4 text-neon-green" />
                      <p className="text-muted-foreground">Chart visualization coming soon!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="glassmorphism border-nuclear-glow/30">
                <CardHeader>
                  <CardTitle className="text-nuclear-glow">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentTrades.slice(0, 5).map((trade, index) => (
                    <motion.div
                      key={trade.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${trade.side === 'BUY' ? 'bg-neon-green' : 'bg-red-400'}`} />
                        <div>
                          <p className="font-medium">{trade.tokenSymbol}</p>
                          <p className="text-sm text-muted-foreground">{trade.engine}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${trade.profit >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                          {formatCurrency(trade.profit)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(trade.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Hydra Engines Tab */}
          <TabsContent value="engines" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {engines.map((engine, index) => (
                <motion.div
                  key={engine.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`glassmorphism border-${engine.status === 'RUNNING' ? 'neon-green' : 'muted'}/30 hover-glow`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{engine.name}</CardTitle>
                        <Badge className={`${
                          engine.status === 'RUNNING' ? 'bg-neon-green/20 text-neon-green' :
                          engine.status === 'ERROR' ? 'bg-red-500/20 text-red-400' :
                          'bg-muted/20'
                        }`}>
                          {engine.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{engine.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Success Rate</p>
                          <p className="text-lg font-semibold text-neon-green">
                            {engine.realTimeMetrics.successRate}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Daily P&L</p>
                          <p className={`text-lg font-semibold ${
                            engine.realTimeMetrics.dailyPnL >= 0 ? 'text-neon-green' : 'text-red-400'
                          }`}>
                            {formatCurrency(engine.realTimeMetrics.dailyPnL)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Active Trades</span>
                          <span>{engine.realTimeMetrics.activeTrades}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Pending Orders</span>
                          <span>{engine.realTimeMetrics.pendingOrders}</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => toggleEngine(engine.id, engine.status === 'RUNNING' ? 'stop' : 'start')}
                        className={`w-full ${
                          engine.status === 'RUNNING'
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'nuclear-gradient'
                        }`}
                      >
                        {engine.status === 'RUNNING' ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Stop Engine
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Engine
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            <Card className="glassmorphism border-neon-blue/30">
              <CardHeader>
                <CardTitle className="text-neon-blue">Portfolio Positions</CardTitle>
              </CardHeader>
              <CardContent>
                {portfolio?.positions && portfolio.positions.length > 0 ? (
                  <div className="space-y-4">
                    {portfolio.positions.map((position, index) => (
                      <motion.div
                        key={position.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-background/50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full bg-nuclear-gradient flex items-center justify-center">
                            <span className="font-bold text-background">
                              {position.tokenSymbol.slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold">{position.tokenSymbol}</p>
                            <p className="text-sm text-muted-foreground">
                              {position.amount.toFixed(4)} tokens
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(position.currentPrice * position.amount)}
                          </p>
                          <p className={`text-sm ${
                            position.unrealizedPnL >= 0 ? 'text-neon-green' : 'text-red-400'
                          }`}>
                            {formatPercentage(position.pnlPercentage)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No positions yet. Start trading to see your portfolio!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trading Tab */}
          <TabsContent value="trades" className="space-y-6">
            <Card className="glassmorphism border-neon-orange/30">
              <CardHeader>
                <CardTitle className="text-neon-orange">Recent Trades</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTrades.length > 0 ? (
                  <div className="space-y-3">
                    {recentTrades.map((trade, index) => (
                      <motion.div
                        key={trade.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-center space-x-3">
                          <Badge className={`${
                            trade.side === 'BUY' ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {trade.side}
                          </Badge>
                          <div>
                            <p className="font-medium">{trade.tokenSymbol}</p>
                            <p className="text-sm text-muted-foreground">{trade.engine}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{trade.amount.toFixed(4)}</p>
                          <p className="text-sm text-muted-foreground">
                            @ {formatCurrency(trade.price)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            trade.profit >= 0 ? 'text-neon-green' : 'text-red-400'
                          }`}>
                            {formatCurrency(trade.profit)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(trade.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <LineChart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No trades yet. Activate an engine to start trading!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glassmorphism border-neon-purple/30">
                <CardHeader>
                  <CardTitle className="text-neon-purple">Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Email Notifications</span>
                    <Badge className="bg-neon-green/20 text-neon-green">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>2FA Security</span>
                    <Badge className="bg-muted/20">Not Set</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Trading Alerts</span>
                    <Badge className="bg-neon-green/20 text-neon-green">Enabled</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="glassmorphism border-nuclear-glow/30">
                <CardHeader>
                  <CardTitle className="text-nuclear-glow">Risk Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Max Daily Loss</label>
                    <Progress value={25} className="mt-2" />
                    <p className="text-sm text-muted-foreground mt-1">$500 / $2000</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Position Size Limit</label>
                    <Progress value={60} className="mt-2" />
                    <p className="text-sm text-muted-foreground mt-1">$3000 / $5000</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

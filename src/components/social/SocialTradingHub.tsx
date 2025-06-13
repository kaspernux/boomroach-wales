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
  Trophy,
  Users,
  Copy,
  TrendingUp,
  TrendingDown,
  Star,
  Crown,
  Shield,
  Zap,
  Target,
  Activity,
  DollarSign,
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Settings,
  Bell,
  Flame,
  Award,
  Rocket
} from 'lucide-react'

interface Trader {
  id: string
  username: string
  displayName: string
  avatar: string
  level: number
  reputation: number
  followers: number
  following: number
  totalPnL: number
  monthlyPnL: number
  weeklyPnL: number
  winRate: number
  totalTrades: number
  averageHoldTime: number
  maxDrawdown: number
  sharpeRatio: number
  copiers: number
  isVerified: boolean
  isPro: boolean
  isOnline: boolean
  badges: string[]
  specialization: string[]
  riskLevel: 'low' | 'medium' | 'high'
  copyTradingEnabled: boolean
  subscriptionPrice: number
  performanceHistory: number[]
}

interface TradeSignal {
  id: string
  traderId: string
  traderName: string
  action: 'BUY' | 'SELL'
  token: string
  symbol: string
  amount: number
  price: number
  confidence: number
  reasoning: string
  tags: string[]
  timestamp: Date
  followers: number
  likes: number
  comments: number
  isHot: boolean
  riskLevel: 'low' | 'medium' | 'high'
  expectedReturn: number
  timeHorizon: string
}

interface CopyTradeSettings {
  traderId: string
  enabled: boolean
  copyPercentage: number // 0-100% of portfolio
  maxPositionSize: number
  riskLimit: number
  autoStopLoss: boolean
  stopLossPercentage: number
  takeProfitPercentage: number
  delaySeconds: number
  onlyVerifiedTrades: boolean
  minConfidence: number
  allowedTokens: string[]
  excludedTokens: string[]
}

export function SocialTradingHub() {
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [traders, setTraders] = useState<Trader[]>([])
  const [signals, setSignals] = useState<TradeSignal[]>([])
  const [copySettings, setCopySettings] = useState<CopyTradeSettings[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  const [sortBy, setSortBy] = useState('performance')

  // Mock data for demonstration
  useEffect(() => {
    // Load traders data
    setTraders([
      {
        id: '1',
        username: 'roach_king',
        displayName: 'The Roach King 👑',
        avatar: '/avatars/roach-king.png',
        level: 50,
        reputation: 9850,
        followers: 15420,
        following: 89,
        totalPnL: 847250,
        monthlyPnL: 125800,
        weeklyPnL: 34250,
        winRate: 0.78,
        totalTrades: 1247,
        averageHoldTime: 4.2,
        maxDrawdown: 0.08,
        sharpeRatio: 2.85,
        copiers: 892,
        isVerified: true,
        isPro: true,
        isOnline: true,
        badges: ['legend', 'sniper', 'nuclear'],
        specialization: ['meme-coins', 'degen', 'sniper'],
        riskLevel: 'high',
        copyTradingEnabled: true,
        subscriptionPrice: 50,
        performanceHistory: [100, 108, 112, 118, 125, 132, 128, 135, 142, 147]
      },
      {
        id: '2',
        username: 'diamond_roach',
        displayName: 'Diamond Roach 💎',
        avatar: '/avatars/diamond-roach.png',
        level: 42,
        reputation: 8200,
        followers: 8950,
        following: 156,
        totalPnL: 456780,
        monthlyPnL: 78900,
        weeklyPnL: 18500,
        winRate: 0.82,
        totalTrades: 892,
        averageHoldTime: 8.7,
        maxDrawdown: 0.05,
        sharpeRatio: 3.12,
        copiers: 445,
        isVerified: true,
        isPro: true,
        isOnline: false,
        badges: ['diamond', 'conservative', 'whale'],
        specialization: ['hodl', 'blue-chip', 'conservative'],
        riskLevel: 'low',
        copyTradingEnabled: true,
        subscriptionPrice: 25,
        performanceHistory: [100, 103, 106, 109, 111, 115, 117, 120, 122, 125]
      },
      {
        id: '3',
        username: 'nuclear_survivor',
        displayName: 'Nuclear Survivor ☢️',
        avatar: '/avatars/nuclear-survivor.png',
        level: 38,
        reputation: 7450,
        followers: 6780,
        following: 234,
        totalPnL: 289450,
        monthlyPnL: 45600,
        weeklyPnL: 12800,
        winRate: 0.69,
        totalTrades: 1567,
        averageHoldTime: 2.1,
        maxDrawdown: 0.12,
        sharpeRatio: 2.34,
        copiers: 289,
        isVerified: true,
        isPro: false,
        isOnline: true,
        badges: ['survivor', 'degen', 'speed'],
        specialization: ['scalping', 'momentum', 'news'],
        riskLevel: 'high',
        copyTradingEnabled: true,
        subscriptionPrice: 15,
        performanceHistory: [100, 95, 102, 98, 105, 110, 107, 113, 108, 115]
      }
    ])

    // Load signals data
    setSignals([
      {
        id: '1',
        traderId: '1',
        traderName: 'The Roach King 👑',
        action: 'BUY',
        token: 'So11111111111111111111111111111111111111112',
        symbol: '$PEPE',
        amount: 5.5,
        price: 0.000012,
        confidence: 0.89,
        reasoning: 'Strong breakout pattern with volume spike. Meme season incoming! 🚀',
        tags: ['meme', 'breakout', 'volume'],
        timestamp: new Date(Date.now() - 1800000),
        followers: 1250,
        likes: 892,
        comments: 156,
        isHot: true,
        riskLevel: 'high',
        expectedReturn: 0.45,
        timeHorizon: '1-3 days'
      },
      {
        id: '2',
        traderId: '2',
        traderName: 'Diamond Roach 💎',
        action: 'BUY',
        token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: '$SOL',
        amount: 12.0,
        price: 185.50,
        confidence: 0.92,
        reasoning: 'SOL showing strong support at 180. Good accumulation zone for long-term hodl.',
        tags: ['hodl', 'support', 'accumulation'],
        timestamp: new Date(Date.now() - 3600000),
        followers: 875,
        likes: 654,
        comments: 89,
        isHot: false,
        riskLevel: 'low',
        expectedReturn: 0.25,
        timeHorizon: '2-4 weeks'
      }
    ])
  }, [])

  const filteredTraders = traders.filter(trader => {
    const matchesSearch = trader.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         trader.specialization.some(spec => spec.includes(searchQuery.toLowerCase()))

    const matchesFilter = filterBy === 'all' ||
                         (filterBy === 'verified' && trader.isVerified) ||
                         (filterBy === 'pro' && trader.isPro) ||
                         (filterBy === 'online' && trader.isOnline) ||
                         (filterBy === trader.riskLevel)

    return matchesSearch && matchesFilter
  }).sort((a, b) => {
    switch (sortBy) {
      case 'performance':
        return b.monthlyPnL - a.monthlyPnL
      case 'winrate':
        return b.winRate - a.winRate
      case 'followers':
        return b.followers - a.followers
      case 'sharpe':
        return b.sharpeRatio - a.sharpeRatio
      default:
        return 0
    }
  })

  return (
    <Card className="glassmorphism border-nuclear-glow/30">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-nuclear-glow">
          <Users className="w-6 h-6" />
          <span>Social Trading Hub</span>
          <Badge className="bg-nuclear-glow/20 text-nuclear-glow border-nuclear-glow/30">
            Community Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="leaderboard" className="flex items-center space-x-2">
              <Trophy className="w-4 h-4" />
              <span>Leaderboard</span>
            </TabsTrigger>
            <TabsTrigger value="signals" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Live Signals</span>
            </TabsTrigger>
            <TabsTrigger value="copytrade" className="flex items-center space-x-2">
              <Copy className="w-4 h-4" />
              <span>Copy Trading</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <LeaderboardSection
              traders={filteredTraders}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterBy={filterBy}
              setFilterBy={setFilterBy}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
          </TabsContent>

          {/* Live Signals Tab */}
          <TabsContent value="signals" className="space-y-6">
            <LiveSignalsSection signals={signals} />
          </TabsContent>

          {/* Copy Trading Tab */}
          <TabsContent value="copytrade" className="space-y-6">
            <CopyTradingSection
              traders={traders}
              copySettings={copySettings}
              setCopySettings={setCopySettings}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsSection traders={traders} signals={signals} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Leaderboard Section Component
function LeaderboardSection({
  traders,
  searchQuery,
  setSearchQuery,
  filterBy,
  setFilterBy,
  sortBy,
  setSortBy
}: {
  traders: Trader[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  filterBy: string
  setFilterBy: (filter: string) => void
  sortBy: string
  setSortBy: (sort: string) => void
}) {
  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search traders or specializations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="px-3 py-2 rounded-lg bg-background border border-border"
          >
            <option value="all">All Traders</option>
            <option value="verified">Verified Only</option>
            <option value="pro">Pro Traders</option>
            <option value="online">Online Now</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg bg-background border border-border"
          >
            <option value="performance">Performance</option>
            <option value="winrate">Win Rate</option>
            <option value="followers">Followers</option>
            <option value="sharpe">Sharpe Ratio</option>
          </select>
        </div>
      </div>

      {/* Trader Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {traders.map((trader, index) => (
          <TraderCard key={trader.id} trader={trader} rank={index + 1} />
        ))}
      </div>
    </div>
  )
}

// Trader Card Component
function TraderCard({ trader, rank }: { trader: Trader; rank: number }) {
  const [isFollowing, setIsFollowing] = useState(false)

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />
    if (rank === 2) return <Award className="w-5 h-5 text-gray-300" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
    return <span className="text-sm font-bold">#{rank}</span>
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-neon-green'
      case 'medium': return 'text-neon-orange'
      case 'high': return 'text-neon-red'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className="glassmorphism border-neon-blue/30 hover:border-neon-blue/50 transition-all duration-300"
    >
      <Card className="bg-transparent border-0">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-nuclear-gradient flex items-center justify-center">
                  <span className="text-background font-bold text-lg">
                    {trader.displayName[0]}
                  </span>
                </div>
                {trader.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-neon-green rounded-full border-2 border-background" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold truncate max-w-32">{trader.displayName}</h3>
                  {trader.isVerified && <Shield className="w-4 h-4 text-neon-green" />}
                  {trader.isPro && <Star className="w-4 h-4 text-neon-orange" />}
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Level {trader.level}</span>
                  <span>•</span>
                  <span className={getRiskColor(trader.riskLevel)}>{trader.riskLevel} risk</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              {getRankIcon(rank)}
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-neon-green">
                ${(trader.monthlyPnL / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-muted-foreground">Monthly P&L</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-neon-blue">
                {(trader.winRate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-nuclear-glow">
                {trader.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-neon-orange">
                {trader.copiers}
              </div>
              <div className="text-xs text-muted-foreground">Copiers</div>
            </div>
          </div>

          {/* Specializations */}
          <div className="flex flex-wrap gap-1 mb-4">
            {trader.specialization.slice(0, 3).map((spec) => (
              <Badge key={spec} className="text-xs bg-muted/20">
                {spec}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant={isFollowing ? "secondary" : "default"}
              size="sm"
              className="flex-1"
              onClick={() => setIsFollowing(!isFollowing)}
            >
              {isFollowing ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Following
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2" />
                  Follow
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>

          {/* Copy Trading Price */}
          {trader.copyTradingEnabled && (
            <div className="mt-3 text-center text-sm text-muted-foreground">
              Copy trading: ${trader.subscriptionPrice}/month
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Live Signals Section Component
function LiveSignalsSection({ signals }: { signals: TradeSignal[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Live Trading Signals</h3>
        <Button variant="outline" size="sm">
          <Bell className="w-4 h-4 mr-2" />
          Subscribe to Alerts
        </Button>
      </div>

      <div className="space-y-4">
        {signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </div>
    </div>
  )
}

// Signal Card Component
function SignalCard({ signal }: { signal: TradeSignal }) {
  const [isLiked, setIsLiked] = useState(false)

  const getActionColor = (action: string) => {
    return action === 'BUY' ? 'text-neon-green' : 'text-neon-red'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-neon-green'
    if (confidence >= 0.6) return 'text-neon-orange'
    return 'text-muted-foreground'
  }

  return (
    <Card className="glassmorphism border-neon-orange/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-nuclear-gradient flex items-center justify-center">
              <span className="text-background font-bold text-sm">
                {signal.traderName[0]}
              </span>
            </div>
            <div>
              <div className="font-semibold">{signal.traderName}</div>
              <div className="text-sm text-muted-foreground">
                {signal.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
          {signal.isHot && (
            <Badge className="bg-neon-red/20 text-neon-red border-neon-red/30">
              <Flame className="w-3 h-3 mr-1" />
              HOT
            </Badge>
          )}
        </div>

        <div className="mb-3">
          <div className="flex items-center space-x-4 mb-2">
            <span className={`font-bold ${getActionColor(signal.action)}`}>
              {signal.action} {signal.symbol}
            </span>
            <Badge className="bg-muted/20">
              ${signal.amount} SOL
            </Badge>
            <span className={`text-sm ${getConfidenceColor(signal.confidence)}`}>
              {(signal.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {signal.reasoning}
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {signal.tags.map((tag) => (
              <Badge key={tag} className="text-xs bg-nuclear-glow/20 text-nuclear-glow">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Expected: +{(signal.expectedReturn * 100).toFixed(0)}%</span>
            <span>{signal.timeHorizon}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`flex items-center space-x-1 ${isLiked ? 'text-neon-red' : 'text-muted-foreground'}`}
            >
              <Heart className="w-4 h-4" />
              <span>{signal.likes}</span>
            </button>
            <button className="flex items-center space-x-1 text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span>{signal.comments}</span>
            </button>
            <button className="flex items-center space-x-1 text-muted-foreground">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Copy Trading Section Component
function CopyTradingSection({
  traders,
  copySettings,
  setCopySettings
}: {
  traders: Trader[]
  copySettings: CopyTradeSettings[]
  setCopySettings: (settings: CopyTradeSettings[]) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Copy Trading Dashboard</h3>
        <p className="text-muted-foreground">
          Automatically copy trades from top performers. Set your risk levels and let the pros work for you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {traders.filter(t => t.copyTradingEnabled).map((trader) => (
          <CopyTradeCard key={trader.id} trader={trader} />
        ))}
      </div>
    </div>
  )
}

// Copy Trade Card Component
function CopyTradeCard({ trader }: { trader: Trader }) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [copyPercentage, setCopyPercentage] = useState([10])

  return (
    <Card className="glassmorphism border-neon-blue/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-nuclear-gradient flex items-center justify-center">
              <span className="text-background font-bold">
                {trader.displayName[0]}
              </span>
            </div>
            <div>
              <div className="font-semibold">{trader.displayName}</div>
              <div className="text-sm text-muted-foreground">
                ${trader.subscriptionPrice}/month
              </div>
            </div>
          </div>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>

        {isEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <div>
              <Label className="text-sm font-medium">
                Copy Percentage: {copyPercentage[0]}%
              </Label>
              <Slider
                value={copyPercentage}
                onValueChange={setCopyPercentage}
                max={50}
                min={1}
                step={1}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Win Rate</div>
                <div className="font-semibold text-neon-green">
                  {(trader.winRate * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Monthly P&L</div>
                <div className="font-semibold text-neon-blue">
                  ${(trader.monthlyPnL / 1000).toFixed(1)}k
                </div>
              </div>
            </div>

            <Button className="w-full" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Start Copying
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

// Analytics Section Component
function AnalyticsSection({ traders, signals }: { traders: Trader[]; signals: TradeSignal[] }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Community Analytics</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glassmorphism border-neon-green/30">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 text-neon-green mx-auto mb-2" />
            <div className="text-2xl font-bold text-neon-green">
              {traders.reduce((sum, t) => sum + t.totalPnL, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Community P&L</div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-neon-blue/30">
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-neon-blue mx-auto mb-2" />
            <div className="text-2xl font-bold text-neon-blue">
              {traders.reduce((sum, t) => sum + t.followers, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Followers</div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-nuclear-glow/30">
          <CardContent className="p-6 text-center">
            <Activity className="w-8 h-8 text-nuclear-glow mx-auto mb-2" />
            <div className="text-2xl font-bold text-nuclear-glow">
              {signals.length}
            </div>
            <div className="text-sm text-muted-foreground">Active Signals</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glassmorphism border-neon-orange/30">
        <CardHeader>
          <CardTitle className="text-neon-orange">Top Performing Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['meme-coins', 'degen', 'hodl', 'scalping'].map((strategy, index) => (
              <div key={strategy} className="flex items-center justify-between">
                <span className="capitalize">{strategy}</span>
                <div className="flex items-center space-x-2">
                  <Progress value={85 - index * 15} className="w-24" />
                  <span className="text-sm text-muted-foreground">
                    {85 - index * 15}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SocialTradingHub

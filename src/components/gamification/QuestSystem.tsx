'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Trophy,
  Clock,
  Flame,
  Zap,
  Crown,
  Calendar,
  Timer,
  CheckCircle,
  Lock,
  Sparkles,
  Coins,
  Award,
  Gem
} from 'lucide-react'
import { useGamification } from './AchievementSystem'
import { useRealTimeData } from '@/hooks/useRealTimeData'
import { useHydraBot } from '@/hooks/useHydraBot'

// For TypeScript JSX support
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

interface Quest {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'seasonal' | 'special'
  category: 'trading' | 'social' | 'community' | 'achievement' | 'exploration'
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary'
  progress: number
  maxProgress: number
  rewards: {
    xp: number
    tokens: number
    badges?: string[]
    nfts?: string[]
    titles?: string[]
  }
  timeLeft?: number // seconds
  isCompleted: boolean
  isLocked: boolean
  requirements?: string[]
  icon: React.ReactNode
  seasonalTheme?: 'halloween' | 'christmas' | 'summer' | 'spring'
}

interface SeasonalEvent {
  id: string
  name: string
  description: string
  theme: 'halloween' | 'christmas' | 'summer' | 'spring'
  startDate: Date
  endDate: Date
  isActive: boolean
  specialRewards: {
    type: 'nft' | 'badge' | 'title' | 'tokens'
    name: string
    description: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
  }[]
  questIds: string[]
}

interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  score: number
  avatar?: string
  level: number
  badges: string[]
  change: number // position change from last week
}

export function QuestSystem() {
  const { addXP, unlockAchievement, userStats } = useGamification()
  const { data: realTimeData } = useRealTimeData()
  const { signals, portfolio, orders } = useHydraBot()
export function QuestSystem() {
  const { userStats } = useGamification()
  const { data: realTimeData } = useRealTimeData()
  const { quests, seasonalEvents, leaderboard, loginStreak } = realTimeData?.gamification ?? {}
  const { topTraders } = realTimeData?.trading ?? {}
  const [activeTab, setActiveTab] = useState('daily')
    const interval = setInterval(() => {
      // Optionally, trigger a refresh or rely on backend for timeLeft updates
    }, 1000)
    return () => clearInterval(interval)
  }, [quests])

  const completeQuest = (questId: string) => {
    // Call backend or hydra-bot to mark quest as complete
    // Optionally, update local state if needed
    // Example: addXP, unlockAchievement, etc.
    // This is a placeholder; actual implementation should call backend API
  }

  const formatTimeLeft = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0h 0m'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 border-green-400/30'
      case 'medium': return 'text-yellow-400 border-yellow-400/30'
      case 'hard': return 'text-orange-400 border-orange-400/30'
      case 'legendary': return 'text-purple-400 border-purple-400/30'
      default: return 'text-gray-400 border-gray-400/30'
    }
  }

  return (
    <div className="space-y-6">
      {/* Login Streak Banner */}
      {typeof loginStreak === 'number' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden"
        >
          <Card className="glassmorphism border-neon-orange/30 bg-gradient-to-r from-neon-orange/10 to-nuclear-glow/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    className="text-neon-orange"
                  >
                    <Flame className="w-8 h-8" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold text-neon-orange">
                      🔥 {loginStreak} Day Streak!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Keep logging in daily to earn bonus rewards!
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-nuclear-glow">
                    +{loginStreak * 50} XP
                  </div>
                  <div className="text-sm text-muted-foreground">Streak Bonus</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Quest Interface */}
      <Card className="glassmorphism border-nuclear-glow/30">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-nuclear-glow">
            <Trophy className="w-6 h-6" />
            <span>Quest Hub</span>
            <Badge className="bg-nuclear-glow/20 text-nuclear-glow border-nuclear-glow/30">
              Level {userStats?.level ?? 1}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="daily" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Daily</span>
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Weekly</span>
              </TabsTrigger>
              <TabsTrigger value="seasonal" className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Seasonal</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex items-center space-x-2">
                <Crown className="w-4 h-4" />
                <span>Rankings</span>
              </TabsTrigger>
            </TabsList>

            {/* Daily Quests */}
            <TabsContent value="daily" className="space-y-4">
              {quests?.filter((q: Quest) => q.type === 'daily').map((quest: Quest, index: number) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onComplete={completeQuest}
                  index={index}
                />
                  quest={quest}
                  onComplete={completeQuest}
                  index={index}
                  key={quest.id}
            <TabsContent value="weekly" className="space-y-4">
              {quests?.filter((q: Quest) => q.type === 'weekly').map((quest: Quest, index: number) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onComplete={completeQuest}
                  index={index}
                />
              ))}
            </TabsContent>

            {/* Seasonal Events */}
            <TabsContent value="seasonal" className="space-y-6">
              {seasonalEvents?.filter((e: SeasonalEvent) => e.isActive).map((event: SeasonalEvent) => (
                <SeasonalEventCard key={event.id} event={event} />
              ))}

              <div className="space-y-4">
                {quests?.filter((q: Quest) => q.type === 'seasonal').map((quest: Quest, index: number) => (
                <SeasonalEventCard event={event} key={event.id} />
                    key={quest.id}
                    quest={quest}
                    onComplete={completeQuest}
                    index={index}
                    seasonal={true}
                    quest={quest}
                    onComplete={completeQuest}
                    index={index}
                    seasonal={true}
                    key={quest.id}
            {/* Leaderboard */}
            <TabsContent value="leaderboard">
              <LeaderboardPanel leaderboard={leaderboard ?? []} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Real-time Leaderboard Section */}
      <Card className="glassmorphism border-nuclear-glow/30">
        <CardHeader>
          <CardTitle className="text-nuclear-glow">
            <Crown className="w-6 h-6 inline-block mr-2" />
            Top Traders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            {topTraders?.map((trader: any) => (
              <div key={trader.address} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-nuclear-gradient" />
                  <div>
                    <div className="font-semibold text-nuclear-glow">{trader.username}</div>
                    <div className="text-sm text-muted-foreground">
                      {trader.score?.toLocaleString()} pts
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Level {trader.level}
                  </div>
                  <div className="flex space-x-1">
                    {trader.badges?.slice(0, 3).map((badge: string, i: number) => (
                      <Award key={i} className="w-3 h-3" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
}

// Quest Card Component
function QuestCard({
  quest,
  onComplete,
  index,
  seasonal = false
}: {
  quest: Quest
  onComplete: (id: string) => void
  index: number
  seasonal?: boolean
}) {
  const formatTimeLeft = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0h 0m'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 border-green-400/30'
      case 'medium': return 'text-yellow-400 border-yellow-400/30'
      case 'hard': return 'text-orange-400 border-orange-400/30'
      case 'legendary': return 'text-purple-400 border-purple-400/30'
      default: return 'text-gray-400 border-gray-400/30'
    }
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative ${seasonal ? getSeasonalTheme(quest.seasonalTheme) : 'glassmorphism border-nuclear-glow/20'} rounded-lg p-4 hover:border-nuclear-glow/40 transition-all`}
    >
      {quest.isLocked && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Quest Locked</p>
            {quest.requirements && (
              <div className="text-xs text-muted-foreground mt-1">
                Requires: {quest.requirements.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-nuclear-glow/20 text-nuclear-glow">
            {quest.icon}
          </div>
          <div>
            <h4 className="font-semibold">{quest.title}</h4>
            <p className="text-sm text-muted-foreground">{quest.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={`${getDifficultyColor(quest.difficulty)} capitalize text-xs`}>
            {quest.difficulty}
          </Badge>
          {quest.timeLeft && (
            <Badge variant="outline" className="text-xs">
              <Timer className="w-3 h-3 mr-1" />
              {formatTimeLeft(quest.timeLeft)}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{quest.progress}/{quest.maxProgress}</span>
        </div>
        <Progress
          value={(quest.progress / quest.maxProgress) * 100}
          className="h-2"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs">
            <span className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-nuclear-glow" />
              <span>{quest.rewards.xp} XP</span>
            </span>
            <span className="flex items-center space-x-1">
              <Coins className="w-3 h-3 text-neon-orange" />
              <span>{quest.rewards.tokens} tokens</span>
            </span>
            {quest.rewards.badges && (
              <span className="flex items-center space-x-1">
                <Award className="w-3 h-3 text-neon-blue" />
                <span>{quest.rewards.badges.length} badges</span>
              </span>
            )}
          </div>

          {quest.isCompleted ? (
            <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          ) : quest.progress >= quest.maxProgress ? (
            <Button
              size="sm"
              onClick={() => onComplete(quest.id)}
              className="bg-nuclear-glow/20 text-nuclear-glow hover:bg-nuclear-glow/30"
            >
              Claim Reward
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="border-nuclear-glow/30 text-nuclear-glow"
              disabled
            >
              In Progress
            </Button>
          )}
        </div>
      </div>
    </motion.div>

// Seasonal Event Card
function SeasonalEventCard({ event }: { event: SeasonalEvent }) {
  const timeLeft = event.endDate.getTime() - Date.now()
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-lg ${getSeasonalTheme(event.theme)} p-6`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-neon-orange mb-2">{event.name}</h3>
          <p className="text-muted-foreground">{event.description}</p>
        </div>
        <Badge className="bg-neon-orange/20 text-neon-orange border-neon-orange/30">
          {daysLeft} days left
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-nuclear-glow mb-2">Special Rewards:</h4>
          <div className="space-y-2">
            {event.specialRewards.map((reward, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <Gem className="w-4 h-4 text-purple-400" />
                <span>{reward.name}</span>
                <Badge className="text-xs">{reward.rarity}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Leaderboard Panel
function LeaderboardPanel({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  return (
    <div className="space-y-4">
      {leaderboard.map((entry, index) => (
        <motion.div
          key={entry.userId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`flex items-center justify-between p-4 rounded-lg ${
            entry.username === 'You'
              ? 'bg-nuclear-glow/20 border border-nuclear-glow/30'
              : 'glassmorphism border-nuclear-glow/20'
          } hover:border-nuclear-glow/40 transition-all`}
        >
          <div className="flex items-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
              entry.rank === 2 ? 'bg-gray-300/20 text-gray-300' :
              entry.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
              'bg-nuclear-glow/20 text-nuclear-glow'
            }`}>
              {entry.rank <= 3 ? <Crown className="w-4 h-4" /> : entry.rank}
            </div>
            <div className="w-10 h-10 rounded-full bg-nuclear-gradient" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold">{entry.username}</span>
                {entry.username === 'You' && (
                  <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30 text-xs">
                    You
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Level {entry.level}</span>
                <div className="flex space-x-1">
                  {entry.badges.slice(0, 3).map((badge, i) => (
                    <Award key={i} className="w-3 h-3" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="font-bold text-nuclear-glow">
              {entry.score.toLocaleString()} pts
            </div>
            <div className={`text-xs flex items-center ${
              entry.change > 0 ? 'text-neon-green' :
              entry.change < 0 ? 'text-red-400' : 'text-muted-foreground'
            }`}>
              {entry.change > 0 && '↗'}
              {entry.change < 0 && '↘'}
              {entry.change === 0 && '→'}
              {Math.abs(entry.change)} from last week
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
  )
}

// Helper: Get seasonal theme classes
function getSeasonalTheme(theme?: 'halloween' | 'christmas' | 'summer' | 'spring') {
  switch (theme) {
    case 'halloween':
      return 'bg-gradient-to-r from-orange-500/20 to-purple-700/20 border border-orange-500/30'
    case 'christmas':
      return 'bg-gradient-to-r from-red-500/20 to-green-500/20 border border-red-500/30'
    case 'summer':
      return 'bg-gradient-to-r from-yellow-500/20 to-blue-500/20 border border-yellow-500/30'
    case 'spring':
      return 'bg-gradient-to-r from-green-500/20 to-pink-500/20 border border-green-500/30'
    default:
      return 'glassmorphism border-nuclear-glow/30'
  }
}

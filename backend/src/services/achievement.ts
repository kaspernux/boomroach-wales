import type { PrismaClient } from '@prisma/client'
import { logger } from '../../../shared/utils/logger'

export class AchievementService {
  private prisma: PrismaClient
  private processingInterval: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async startAchievementProcessing(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Achievement service is already running')
      return
    }

    this.isRunning = true
    logger.info('Starting achievement processing service')

    // Process achievements every 30 seconds
    this.processingInterval = setInterval(async () => {
      try {
        await this.processAchievements()
      } catch (error) {
        logger.error('Achievement processing error', { error: error.message })
      }
    }, 30000) // 30 seconds

    // Initial processing
    await this.createDefaultAchievements()
    await this.processAchievements()
  }

  async stopAchievementProcessing(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    this.isRunning = false
    logger.info('Achievement processing service stopped')
  }

  private async processAchievements(): Promise<void> {
    try {
      // Get all active achievements
      const achievements = await this.prisma.achievement.findMany({
        where: { isActive: true }
      })

      // Get all users who might qualify for achievements
      const users = await this.prisma.user.findMany({
        where: { isBanned: false },
        include: {
          achievements: true,
          trades: true,
          guildMember: true
        }
      })

      for (const user of users) {
        for (const achievement of achievements) {
          await this.checkUserAchievement(user, achievement)
        }
      }
    } catch (error) {
      logger.error('Failed to process achievements', { error: error.message })
    }
  }

  private async checkUserAchievement(user: any, achievement: any): Promise<void> {
    try {
      // Check if user already has this achievement
      const existingAchievement = user.achievements.find(
        (ua: any) => ua.achievementId === achievement.id
      )

      if (existingAchievement?.isUnlocked) {
        return // Already unlocked
      }

      const requirements = achievement.requirements as any
      let progress = 0
      let maxProgress = 1

      // Check different achievement types
      switch (achievement.type) {
        case 'WALLET':
          progress = this.checkWalletAchievement(user, requirements)
          break
        case 'TRADING':
          ({ progress, maxProgress } = this.checkTradingAchievement(user, requirements))
          break
        case 'SOCIAL':
          progress = this.checkSocialAchievement(user, requirements)
          break
        case 'GUILD':
          progress = this.checkGuildAchievement(user, requirements)
          break
        case 'SPECIAL':
          progress = this.checkSpecialAchievement(user, requirements)
          break
      }

      const isUnlocked = progress >= maxProgress

      // Update or create user achievement
      if (existingAchievement) {
        if (existingAchievement.progress !== progress || (!existingAchievement.isUnlocked && isUnlocked)) {
          await this.prisma.userAchievement.update({
            where: { id: existingAchievement.id },
            data: {
              progress,
              maxProgress,
              isUnlocked,
              unlockedAt: isUnlocked ? new Date() : null
            }
          })

          if (isUnlocked && !existingAchievement.isUnlocked) {
            await this.awardAchievementRewards(user.id, achievement)
          }
        }
      } else if (progress > 0) {
        await this.prisma.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achievement.id,
            progress,
            maxProgress,
            isUnlocked,
            unlockedAt: isUnlocked ? new Date() : null
          }
        })

        if (isUnlocked) {
          await this.awardAchievementRewards(user.id, achievement)
        }
      }
    } catch (error) {
      logger.error('Failed to check user achievement', {
        userId: user.id,
        achievementId: achievement.id,
        error: error.message
      })
    }
  }

  private checkWalletAchievement(user: any, requirements: any): number {
    let progress = 0

    if (requirements.walletConnected && user.walletAddress) {
      progress = 1
    }

    if (requirements.verifiedEmail && user.isVerified) {
      progress = 1
    }

    return progress
  }

  private checkTradingAchievement(user: any, requirements: any): { progress: number, maxProgress: number } {
    let progress = 0
    const maxProgress = requirements.target || 1

    if (requirements.type === 'tradeCount') {
      progress = user.totalTrades
    } else if (requirements.type === 'profitAmount') {
      progress = Math.max(0, user.totalPnL)
    } else if (requirements.type === 'winStreak') {
      // Calculate win streak (simplified)
      const recentTrades = user.trades
        .filter((t: any) => t.pnl > 0)
        .slice(-requirements.target)
      progress = recentTrades.length
    }

    return { progress: Math.min(progress, maxProgress), maxProgress }
  }

  private checkSocialAchievement(user: any, requirements: any): number {
    let progress = 0

    if (requirements.type === 'guildMember' && user.guildMember) {
      progress = 1
    }

    if (requirements.type === 'levelReached') {
      progress = user.level >= requirements.level ? 1 : 0
    }

    return progress
  }

  private checkGuildAchievement(user: any, requirements: any): number {
    let progress = 0

    if (!user.guildMember) {
      return 0
    }

    if (requirements.type === 'guildRole' && user.guildMember.role === requirements.role) {
      progress = 1
    }

    if (requirements.type === 'guildContribution') {
      progress = user.guildMember.contribution >= requirements.amount ? 1 : 0
    }

    return progress
  }

  private checkSpecialAchievement(user: any, requirements: any): number {
    let progress = 0

    // Special achievements for specific events, early adopters, etc.
    if (requirements.type === 'earlyAdopter') {
      const earlyDate = new Date('2025-01-01')
      progress = user.createdAt <= earlyDate ? 1 : 0
    }

    if (requirements.type === 'levelMilestone') {
      progress = user.level >= requirements.level ? 1 : 0
    }

    return progress
  }

  private async awardAchievementRewards(userId: string, achievement: any): Promise<void> {
    try {
      const rewards = achievement.rewards as any

      // Award XP
      if (rewards.xp) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            experience: { increment: rewards.xp }
          }
        })
      }

      // Award level ups if enough XP
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      })

      if (user) {
        const newLevel = this.calculateLevel(user.experience + (rewards.xp || 0))
        if (newLevel > user.level) {
          await this.prisma.user.update({
            where: { id: userId },
            data: { level: newLevel }
          })
        }
      }

      logger.info('Achievement rewards awarded', {
        userId,
        achievementId: achievement.id,
        title: achievement.title,
        rewards
      })
    } catch (error) {
      logger.error('Failed to award achievement rewards', {
        userId,
        achievementId: achievement.id,
        error: error.message
      })
    }
  }

  private calculateLevel(experience: number): number {
    // Simple leveling formula: level = sqrt(experience / 100)
    return Math.floor(Math.sqrt(experience / 100)) + 1
  }

  private async createDefaultAchievements(): Promise<void> {
    try {
      const defaultAchievements = [
        {
          title: 'Welcome to the Roach Army',
          description: 'Connected your first wallet',
          icon: '🪳',
          type: 'WALLET',
          rarity: 'COMMON',
          requirements: { walletConnected: true },
          rewards: { xp: 100 }
        },
        {
          title: 'First Steps',
          description: 'Complete your first trade',
          icon: '👶',
          type: 'TRADING',
          rarity: 'COMMON',
          requirements: { type: 'tradeCount', target: 1 },
          rewards: { xp: 200 }
        },
        {
          title: 'Trader Veteran',
          description: 'Complete 10 trades',
          icon: '⚔️',
          type: 'TRADING',
          rarity: 'RARE',
          requirements: { type: 'tradeCount', target: 10 },
          rewards: { xp: 500 }
        },
        {
          title: 'Profit Master',
          description: 'Achieve $1000 in total profits',
          icon: '💰',
          type: 'TRADING',
          rarity: 'EPIC',
          requirements: { type: 'profitAmount', target: 1000 },
          rewards: { xp: 1000 }
        },
        {
          title: 'Guild Leader',
          description: 'Become a guild leader',
          icon: '👑',
          type: 'GUILD',
          rarity: 'EPIC',
          requirements: { type: 'guildRole', role: 'LEADER' },
          rewards: { xp: 800 }
        },
        {
          title: 'Nuclear Survivor',
          description: 'Survive the market crash of 2025',
          icon: '☢️',
          type: 'SPECIAL',
          rarity: 'LEGENDARY',
          requirements: { type: 'earlyAdopter' },
          rewards: { xp: 2000 }
        },
        {
          title: 'AI Follower',
          description: 'Follow your first AI trading signal',
          icon: '🤖',
          type: 'TRADING',
          rarity: 'COMMON',
          requirements: { type: 'aiSignalFollow', target: 1 },
          rewards: { xp: 150 }
        },
        {
          title: 'Level Up Champion',
          description: 'Reach level 20',
          icon: '🏆',
          type: 'SPECIAL',
          rarity: 'RARE',
          requirements: { type: 'levelMilestone', level: 20 },
          rewards: { xp: 1500 }
        }
      ]

      for (const achievementData of defaultAchievements) {
        // Check if achievement already exists
        const existing = await this.prisma.achievement.findFirst({
          where: { title: achievementData.title }
        })

        if (!existing) {
          await this.prisma.achievement.create({
            data: {
              ...achievementData,
              isActive: true
            }
          })
        }
      }

      logger.info('Default achievements created')
    } catch (error) {
      logger.error('Failed to create default achievements', { error: error.message })
    }
  }

  public async unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId }
      })

      if (!achievement) {
        return false
      }

      const userAchievement = await this.prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId,
            achievementId
          }
        },
        update: {
          isUnlocked: true,
          unlockedAt: new Date(),
          progress: 1,
          maxProgress: 1
        },
        create: {
          userId,
          achievementId,
          isUnlocked: true,
          unlockedAt: new Date(),
          progress: 1,
          maxProgress: 1
        }
      })

      if (userAchievement) {
        await this.awardAchievementRewards(userId, achievement)
        return true
      }

      return false
    } catch (error) {
      logger.error('Failed to unlock achievement', {
        userId,
        achievementId,
        error: error.message
      })
      return false
    }
  }

  public async updateAchievementProgress(userId: string, achievementType: string, data: any): Promise<void> {
    try {
      const achievements = await this.prisma.achievement.findMany({
        where: {
          type: achievementType.toUpperCase(),
          isActive: true
        }
      })

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          achievements: true,
          trades: true,
          guildMember: true
        }
      })

      if (!user) return

      for (const achievement of achievements) {
        await this.checkUserAchievement(user, achievement)
      }
    } catch (error) {
      logger.error('Failed to update achievement progress', {
        userId,
        achievementType,
        error: error.message
      })
    }
  }

  public getServiceStatus() {
    return {
      isRunning: this.isRunning,
      lastUpdate: new Date()
    }
  }
}

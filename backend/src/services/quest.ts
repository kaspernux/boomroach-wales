import type { PrismaClient } from '@prisma/client'
import { logger } from '../../../shared/utils/logger'

export class QuestService {
  private prisma: PrismaClient
  private processingInterval: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async startQuestProcessing(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Quest service is already running')
      return
    }

    this.isRunning = true
    logger.info('Starting quest processing service')

    // Process expired quests every minute
    this.processingInterval = setInterval(async () => {
      try {
        await this.processExpiredQuests()
        await this.updateQuestProgress()
      } catch (error) {
        logger.error('Quest processing error', { error: error.message })
      }
    }, 60000) // 60 seconds

    // Initial processing
    await this.processExpiredQuests()
    await this.createDailyQuests()
  }

  async stopQuestProcessing(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    this.isRunning = false
    logger.info('Quest processing service stopped')
  }

  private async processExpiredQuests(): Promise<void> {
    try {
      // Mark expired quests as failed
      const expiredQuests = await this.prisma.userQuest.updateMany({
        where: {
          expiresAt: {
            lt: new Date()
          },
          isCompleted: false
        },
        data: {
          // Mark as expired (we can add an expired field to the schema)
        }
      })

      if (expiredQuests.count > 0) {
        logger.info(`Processed ${expiredQuests.count} expired quests`)
      }
    } catch (error) {
      logger.error('Failed to process expired quests', { error: error.message })
    }
  }

  private async updateQuestProgress(): Promise<void> {
    try {
      // This is where we would update quest progress based on user activities
      // For now, we'll implement basic progress tracking

      // Get all active user quests
      const activeQuests = await this.prisma.userQuest.findMany({
        where: {
          isCompleted: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          quest: true,
          user: true
        }
      })

      for (const userQuest of activeQuests) {
        await this.checkQuestCompletion(userQuest)
      }
    } catch (error) {
      logger.error('Failed to update quest progress', { error: error.message })
    }
  }

  private async checkQuestCompletion(userQuest: any): Promise<void> {
    try {
      const requirements = userQuest.quest.requirements as any
      let newProgress = userQuest.progress

      // Example quest progress checking
      switch (userQuest.quest.category) {
        case 'TRADING':
          newProgress = await this.checkTradingProgress(userQuest, requirements)
          break
        case 'SOCIAL':
          newProgress = await this.checkSocialProgress(userQuest, requirements)
          break
        case 'COMMUNITY':
          newProgress = await this.checkCommunityProgress(userQuest, requirements)
          break
      }

      // Update progress if changed
      if (newProgress !== userQuest.progress) {
        const isCompleted = newProgress >= userQuest.quest.maxProgress

        await this.prisma.userQuest.update({
          where: { id: userQuest.id },
          data: {
            progress: newProgress,
            isCompleted,
            completedAt: isCompleted ? new Date() : null
          }
        })

        // Award rewards if completed
        if (isCompleted && !userQuest.isCompleted) {
          await this.awardQuestRewards(userQuest)
        }
      }
    } catch (error) {
      logger.error('Failed to check quest completion', {
        questId: userQuest.quest.id,
        userId: userQuest.user.id,
        error: error.message
      })
    }
  }

  private async checkTradingProgress(userQuest: any, requirements: any): Promise<number> {
    // Check trading-related progress
    const trades = await this.prisma.trade.count({
      where: {
        userId: userQuest.userId,
        status: 'FILLED',
        createdAt: {
          gte: userQuest.createdAt
        }
      }
    })

    return Math.min(trades, userQuest.quest.maxProgress)
  }

  private async checkSocialProgress(userQuest: any, requirements: any): Promise<number> {
    // Check social-related progress
    const messages = await this.prisma.message.count({
      where: {
        senderId: userQuest.userId,
        createdAt: {
          gte: userQuest.createdAt
        }
      }
    })

    return Math.min(messages, userQuest.quest.maxProgress)
  }

  private async checkCommunityProgress(userQuest: any, requirements: any): Promise<number> {
    // Check community-related progress (guilds, achievements, etc.)
    let progress = 0

    if (requirements.joinGuild) {
      const guildMember = await this.prisma.guildMember.findUnique({
        where: { userId: userQuest.userId }
      })
      if (guildMember) progress++
    }

    return Math.min(progress, userQuest.quest.maxProgress)
  }

  private async awardQuestRewards(userQuest: any): Promise<void> {
    try {
      const rewards = userQuest.quest.rewards as any

      // Award XP
      if (rewards.xp) {
        await this.prisma.user.update({
          where: { id: userQuest.userId },
          data: {
            experience: { increment: rewards.xp }
          }
        })
      }

      // Award tokens (if applicable)
      if (rewards.tokens) {
        // Implement token rewards
      }

      // Unlock achievements (if applicable)
      if (rewards.achievements) {
        for (const achievementId of rewards.achievements) {
          await this.prisma.userAchievement.upsert({
            where: {
              userId_achievementId: {
                userId: userQuest.userId,
                achievementId
              }
            },
            update: {
              isUnlocked: true,
              unlockedAt: new Date()
            },
            create: {
              userId: userQuest.userId,
              achievementId,
              progress: 1,
              maxProgress: 1,
              isUnlocked: true,
              unlockedAt: new Date()
            }
          })
        }
      }

      logger.info('Quest rewards awarded', {
        questId: userQuest.quest.id,
        userId: userQuest.userId,
        rewards
      })
    } catch (error) {
      logger.error('Failed to award quest rewards', {
        questId: userQuest.quest.id,
        userId: userQuest.userId,
        error: error.message
      })
    }
  }

  private async createDailyQuests(): Promise<void> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Check if daily quests already exist for today
      const existingDailyQuests = await this.prisma.quest.findMany({
        where: {
          type: 'DAILY',
          createdAt: {
            gte: today
          }
        }
      })

      if (existingDailyQuests.length > 0) {
        return // Daily quests already created
      }

      // Create daily quests
      const dailyQuestTemplates = [
        {
          title: 'Daily Trader',
          description: 'Execute 3 trades today',
          category: 'TRADING',
          difficulty: 'EASY',
          maxProgress: 3,
          rewards: { xp: 100, tokens: 50 },
          requirements: { tradeCount: 3 }
        },
        {
          title: 'Social Butterfly',
          description: 'Send 5 messages in guild chat',
          category: 'SOCIAL',
          difficulty: 'EASY',
          maxProgress: 5,
          rewards: { xp: 75 },
          requirements: { messageCount: 5 }
        },
        {
          title: 'Community Helper',
          description: 'Help guild members complete objectives',
          category: 'COMMUNITY',
          difficulty: 'MEDIUM',
          maxProgress: 1,
          rewards: { xp: 200, tokens: 100 },
          requirements: { helpCount: 1 }
        }
      ]

      for (const template of dailyQuestTemplates) {
        await this.prisma.quest.create({
          data: {
            ...template,
            type: 'DAILY',
            timeLimit: 24 * 60 * 60, // 24 hours
            isActive: true
          }
        })
      }

      logger.info('Daily quests created')
    } catch (error) {
      logger.error('Failed to create daily quests', { error: error.message })
    }
  }

  public async createQuest(questData: any): Promise<any> {
    try {
      const quest = await this.prisma.quest.create({
        data: questData
      })

      logger.info('Quest created', { questId: quest.id, title: quest.title })
      return quest
    } catch (error) {
      logger.error('Failed to create quest', { error: error.message })
      throw error
    }
  }

  public async updateQuestProgress(userId: string, questId: string, progressDelta: number): Promise<void> {
    try {
      const userQuest = await this.prisma.userQuest.findUnique({
        where: {
          userId_questId: {
            userId,
            questId
          }
        },
        include: { quest: true }
      })

      if (!userQuest || userQuest.isCompleted) {
        return
      }

      const newProgress = Math.min(
        userQuest.progress + progressDelta,
        userQuest.quest.maxProgress
      )

      const isCompleted = newProgress >= userQuest.quest.maxProgress

      await this.prisma.userQuest.update({
        where: { id: userQuest.id },
        data: {
          progress: newProgress,
          isCompleted,
          completedAt: isCompleted ? new Date() : null
        }
      })

      if (isCompleted && !userQuest.isCompleted) {
        await this.awardQuestRewards(userQuest)
      }
    } catch (error) {
      logger.error('Failed to update quest progress', {
        userId,
        questId,
        progressDelta,
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

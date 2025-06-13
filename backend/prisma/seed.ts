import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean up existing data
  await prisma.userAchievement.deleteMany();
  await prisma.userQuest.deleteMany();
  await prisma.hydraTrade.deleteMany();
  await prisma.hydraOrder.deleteMany();
  await prisma.position.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.engineStatus.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing data');

  // Create system configuration
  const systemConfigs = [
    { key: 'TRADING_ENABLED', value: 'true' },
    { key: 'MAX_DAILY_TRADES', value: '1000' },
    { key: 'DEFAULT_SLIPPAGE', value: '0.01' },
    { key: 'EMERGENCY_STOP', value: 'false' },
    { key: 'PLATFORM_VERSION', value: '2.0.0' },
    { key: 'MAINTENANCE_MODE', value: 'false' },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: 'site_name' },
      update: { value: 'BoomRoach Memecoin powered AI Trading' },
      create: {
        key: 'site_name',
        value: 'BoomRoach Memecoin powered AI Trading',
      },
    });
  }

  console.log('⚙️ Created system configuration');

  // Create trading engine statuses
  const engines = [
    {
      engine: 'sniper',
      status: 'STOPPED',
      config: JSON.stringify({
        maxPositionSize: 50000,
        riskLevel: 'high',
        targetWinRate: 0.78,
        avgExecutionTime: 1.2,
        minInvestment: 100,
        fees: 0.015,
        features: ['auto-buy', 'honeypot-detection', 'slippage-protection']
      }),
      stats: JSON.stringify({
        totalTrades: 0,
        winRate: 0,
        dailyPnL: 0,
        totalVolume: 0
      })
    },
    {
      engine: 'reentry',
      status: 'STOPPED',
      config: JSON.stringify({
        maxPositionSize: 75000,
        riskLevel: 'medium',
        targetWinRate: 0.82,
        avgExecutionTime: 2.1,
        minInvestment: 250,
        fees: 0.012,
        features: ['momentum-analysis', 'volume-confirmation', 'risk-scaling']
      }),
      stats: JSON.stringify({
        totalTrades: 0,
        winRate: 0,
        dailyPnL: 0,
        totalVolume: 0
      })
    },
    {
      engine: 'ai-signals',
      status: 'STOPPED',
      config: JSON.stringify({
        maxPositionSize: 40000,
        riskLevel: 'medium',
        targetWinRate: 0.76,
        avgExecutionTime: 3.5,
        minInvestment: 500,
        fees: 0.02,
        features: ['sentiment-analysis', 'news-integration', 'ai-predictions']
      }),
      stats: JSON.stringify({
        totalTrades: 0,
        winRate: 0,
        dailyPnL: 0,
        totalVolume: 0
      })
    },
    {
      engine: 'guardian',
      status: 'STOPPED',
      config: JSON.stringify({
        maxPositionSize: 25000,
        riskLevel: 'low',
        targetWinRate: 0.94,
        avgExecutionTime: 0.8,
        minInvestment: 1000,
        fees: 0.008,
        features: ['stop-loss', 'portfolio-rebalancing', 'drawdown-protection']
      }),
      stats: JSON.stringify({
        totalTrades: 0,
        winRate: 0,
        dailyPnL: 0,
        totalVolume: 0
      })
    },
    {
      engine: 'scalper',
      status: 'STOPPED',
      config: JSON.stringify({
        maxPositionSize: 30000,
        riskLevel: 'medium',
        targetWinRate: 0.85,
        avgExecutionTime: 0.5,
        minInvestment: 50,
        fees: 0.005,
        features: ['micro-profits', 'high-frequency', 'quick-exits']
      }),
      stats: JSON.stringify({
        totalTrades: 0,
        winRate: 0,
        dailyPnL: 0,
        totalVolume: 0
      })
    },
    {
      engine: 'arbitrage',
      status: 'STOPPED',
      config: JSON.stringify({
        maxPositionSize: 100000,
        riskLevel: 'low',
        targetWinRate: 0.92,
        avgExecutionTime: 2.8,
        minInvestment: 2000,
        fees: 0.01,
        features: ['cross-platform', 'risk-free', 'automatic-execution']
      }),
      stats: JSON.stringify({
        totalTrades: 0,
        winRate: 0,
        dailyPnL: 0,
        totalVolume: 0
      })
    }
  ];

  for (const engine of engines) {
    await prisma.engineStatus.create({ data: engine });
  }

  console.log('🤖 Created trading engine statuses');

  // Create achievements
  const achievements = [
    {
      name: 'First Trade',
      description: 'Complete your first trade',
      icon: '🎯',
      type: 'TRADING',
      rarity: 'COMMON',
      xpReward: 100,
      tokenReward: 10,
    },
    {
      name: 'Hydra Master',
      description: 'Use all 6 trading engines',
      icon: '🐉',
      type: 'TRADING',
      rarity: 'LEGENDARY',
      xpReward: 1000,
      tokenReward: 500,
    },
    {
      name: 'Risk Manager',
      description: 'Keep portfolio risk under 5% for 30 days',
      icon: '🛡️',
      type: 'TRADING',
      rarity: 'EPIC',
      xpReward: 500,
      tokenReward: 200,
    },
    {
      name: 'Profit Hunter',
      description: 'Achieve 50% profit in a month',
      icon: '💰',
      type: 'TRADING',
      rarity: 'RARE',
      xpReward: 300,
      tokenReward: 100,
    },
    {
      name: 'Social Butterfly',
      description: 'Join 5 different guilds',
      icon: '🦋',
      type: 'SOCIAL',
      rarity: 'COMMON',
      xpReward: 50,
      tokenReward: 25,
    },
    {
      name: 'AI Whisperer',
      description: 'Use AI Signals engine for 100 trades',
      icon: '🤖',
      type: 'TRADING',
      rarity: 'EPIC',
      xpReward: 750,
      tokenReward: 300,
    }
  ];

  for (const achievement of achievements) {
    await prisma.achievement.create({ data: achievement });
  }

  console.log('🏆 Created achievements');

  // Create quests
  const quests = [
    {
      name: 'Daily Trader',
      description: 'Complete 5 trades today',
      type: 'DAILY',
      difficulty: 'EASY',
      xpReward: 100,
      tokenReward: 50,
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
    {
      name: 'Engine Explorer',
      description: 'Try 3 different trading engines this week',
      type: 'WEEKLY',
      difficulty: 'MEDIUM',
      xpReward: 300,
      tokenReward: 150,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    {
      name: 'Risk Master',
      description: 'Maintain portfolio risk under 10% for this month',
      type: 'MONTHLY',
      difficulty: 'HARD',
      xpReward: 1000,
      tokenReward: 500,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    {
      name: 'Hydra Champion',
      description: 'Achieve 1000% total returns',
      type: 'SPECIAL',
      difficulty: 'EXPERT',
      xpReward: 5000,
      tokenReward: 2500,
      startDate: new Date(),
    }
  ];

  for (const quest of quests) {
    await prisma.quest.create({ data: quest });
  }

  console.log('📜 Created quests');

  // Create demo users
  const demoUsers = [
    {
      username: 'demo_trader',
      walletAddress: 'DEMO1' + 'A'.repeat(40),
      email: 'demo@boomroach.wales',
      level: 5,
      experience: 2500,
      totalTrades: 25,
      totalPnL: 1250.75,
      isVerified: true,
      tradingEnabled: true,
      autoTrading: false,
      riskTolerance: 'MEDIUM',
      maxPositionSize: 10000,
      stopLossPercent: 10.0,
    },
    {
      username: 'hydra_master',
      walletAddress: 'DEMO2' + 'B'.repeat(40),
      email: 'master@boomroach.wales',
      level: 15,
      experience: 15000,
      totalTrades: 150,
      totalPnL: 25000.50,
      isVerified: true,
      tradingEnabled: true,
      autoTrading: true,
      riskTolerance: 'HIGH',
      maxPositionSize: 50000,
      stopLossPercent: 15.0,
    },
    {
      username: 'risk_guardian',
      walletAddress: 'DEMO3' + 'C'.repeat(40),
      email: 'guardian@boomroach.wales',
      level: 10,
      experience: 7500,
      totalTrades: 75,
      totalPnL: 5000.25,
      isVerified: true,
      tradingEnabled: true,
      autoTrading: false,
      riskTolerance: 'LOW',
      maxPositionSize: 5000,
      stopLossPercent: 5.0,
    }
  ];

  const createdUsers: any[] = [];
  for (const userData of demoUsers) {
    const password = await bcrypt.hash('password123', 10);

    const user = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        username: 'admin',
        password,
        displayName: 'Admin User',
        isAdmin: true,
        isVerified: true,
        socialProfile: {
          create: {
            bio: 'BoomRoach Admin',
            socialLinks: JSON.stringify({ twitter: 'https://twitter.com/$BOOMROCH' }),
          },
        },
        portfolio: {
          create: {
            totalValue: 1000,
            totalPnL: 100,
            positions: JSON.stringify([]),
          },
        },
      },

    createdUsers.push(user);

    // Create portfolio for each user
    await prisma.portfolio.create({
      data: {
        userId: user.id,
        totalValue: Math.random() * 50000 + 10000,
        totalPnl: userData.totalPnL,
        dailyPnl: (Math.random() - 0.3) * 1000,
        weeklyPnl: (Math.random() - 0.2) * 5000,
        monthlyPnl: userData.totalPnL,
      }
    });
  }

  console.log('👥 Created demo users with portfolios');

  // Create some demo positions
  for (const user of createdUsers) {
    const positionsCount = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < positionsCount; i++) {
      await prisma.position.create({
        data: {
          userId: user.id,
          portfolioId: (await prisma.portfolio.findUnique({ where: { userId: user.id } }))?.id,
          tokenMint: 'BOOMROACH_MINT',
          tokenSymbol: '$BOOMROACH',
          tokenName: 'BoomRoach Token',
          amount: Math.random() * 10000 + 1000,
          avgBuyPrice: 0.00342 + (Math.random() - 0.5) * 0.0001,
          currentPrice: 0.00342 + (Math.random() - 0.5) * 0.00001,
          status: 'OPEN',
        }
      });
    }
  }

  console.log('📊 Created demo positions');

  // Create demo tokens first
  const demoToken = await prisma.token.create({
    data: {
      mint: 'BOOMROACH_MINT_ADDRESS',
      symbol: '$BOOMROACH',
      name: 'BoomRoach Token',
      decimals: 9,
      logoUrl: 'https://example.com/boomroach-logo.png',
      description: 'The official BoomRoach meme coin',
      website: 'https://boomroach.wales',
      isVerified: true,
    }
  });

  console.log('🪙 Created demo token');

  // Create some trading signals
  const signalTypes = ['BUY', 'SELL', 'HOLD', 'ALERT'];
  const signalEngines = ['sniper', 'reentry', 'ai-signals', 'guardian', 'scalper', 'arbitrage'];

  for (let i = 0; i < 10; i++) {
    await prisma.signal.create({
      data: {
        engine: signalEngines[Math.floor(Math.random() * signalEngines.length)],
        type: signalTypes[Math.floor(Math.random() * signalTypes.length)],
        action: 'BUY',
        confidence: 0.6 + Math.random() * 0.35,
        price: 0.00342 + (Math.random() - 0.5) * 0.0001,
        targetPrice: 0.00342 + (Math.random() - 0.5) * 0.0002,
        timeframe: '1h',
        reasoning: `AI analysis detected ${Math.random() > 0.5 ? 'bullish' : 'bearish'} sentiment`,
        status: 'ACTIVE',
        tokenId: demoToken.id,
      }
    });
  }

  console.log('🎯 Created trading signals');

  console.log('✅ Database seeding completed successfully!');

  // Print summary
  const userCount = await prisma.user.count();
  const achievementCount = await prisma.achievement.count();
  const questCount = await prisma.quest.count();
  const engineCount = await prisma.engineStatus.count();
  const signalCount = await prisma.signal.count();

  console.log('\n📊 Seeding Summary:');
  console.log(`👥 Users: ${userCount}`);
  console.log(`🏆 Achievements: ${achievementCount}`);
  console.log(`📜 Quests: ${questCount}`);
  console.log(`🤖 Trading Engines: ${engineCount}`);
  console.log(`🎯 Signals: ${signalCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

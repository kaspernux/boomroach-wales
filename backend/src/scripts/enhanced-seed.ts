import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function enhancedSeed() {
  console.log("🌱 Starting enhanced database seeding...");

  try {
    // Create enhanced system configuration
    const tradingConfig = await prisma.tradingConfig.create({
      data: {
        minBoomroachTokens: 100.0,
        commissionRate: 0.005, // 0.5%
        stakingRewardRate: 0.02, // 2% APY
        burnVoteThreshold: 1000,
        maxDailyTrades: 100,
        maxPositionSize: 10000.0,
        emergencyStopEnabled: false,
        maintenanceMode: false
      }
    });

    console.log("✅ Trading configuration created");

    // Create commission pool
    const commissionPool = await prisma.commissionPool.create({
      data: {
        totalCommissions: 0,
        totalStaked: 0,
        pendingBurn: 0,
        distributionPeriod: 7
      }
    });

    console.log("✅ Commission pool created");

    // Create demo admin user
    const adminPassword = await bcrypt.hash("Admin123!", 12);
    const adminUser = await prisma.user.create({
      data: {
        email: "admin@boomroach.wales",
        username: "admin",
        passwordHash: adminPassword,
        isEmailVerified: true,
        isWalletConnected: false,
        isAdmin: true,
        isVerified: true
      }
    });

    console.log("✅ Admin user created: admin@boomroach.wales / Admin123!");

    // Create demo regular user with wallet
    const userPassword = await bcrypt.hash("Demo123!", 12);
    const demoUser = await prisma.user.create({
      data: {
        email: "demo@boomroach.wales",
        username: "demo_user",
        passwordHash: userPassword,
        walletAddress: "DemoWallet123456789ABC",
        isEmailVerified: true,
        isWalletConnected: true,
        isAdmin: false,
        isVerified: true
      }
    });

    console.log("✅ Demo user created: demo@boomroach.wales / Demo123!");

    // Create user portfolio
    const portfolio = await prisma.portfolio.create({
      data: {
        userId: demoUser.id,
        totalValue: 5000.0,
        totalPnl: 247.50,
        totalPnlPercent: 5.2,
        dailyPnl: 23.40,
        weeklyPnl: 156.80,
        monthlyPnl: 247.50
      }
    });

    console.log("✅ User portfolio created");

    // Create staking record for demo user
    const staking = await prisma.userStaking.create({
      data: {
        userId: demoUser.id,
        stakedAmount: 500.0,
        rewardsClaimed: 12.50
      }
    });

    console.log("✅ User staking record created");

    // Create Hydra-Bot trading engines
    const engines = [
      {
        engine: "sniper",
        status: "RUNNING",
        config: JSON.stringify({
          maxPositionSize: 50000,
          riskLevel: "high",
          targetWinRate: 0.785,
          avgExecutionTime: 145
        }),
        stats: JSON.stringify({
          totalTrades: 1247,
          successfulTrades: 979,
          totalPnL: 15420.50,
          avgTradeSize: 2840.0
        })
      },
      {
        engine: "reentry",
        status: "RUNNING",
        config: JSON.stringify({
          maxPositionSize: 35000,
          riskLevel: "medium",
          targetWinRate: 0.721,
          avgExecutionTime: 230
        }),
        stats: JSON.stringify({
          totalTrades: 892,
          successfulTrades: 643,
          totalPnL: 8960.30,
          avgTradeSize: 1950.0
        })
      },
      {
        engine: "ai-signals",
        status: "RUNNING",
        config: JSON.stringify({
          maxPositionSize: 75000,
          riskLevel: "medium",
          targetWinRate: 0.813,
          avgExecutionTime: 89
        }),
        stats: JSON.stringify({
          totalTrades: 2156,
          successfulTrades: 1753,
          totalPnL: 28750.80,
          avgTradeSize: 3420.0
        })
      },
      {
        engine: "guardian",
        status: "RUNNING",
        config: JSON.stringify({
          maxPositionSize: 25000,
          riskLevel: "low",
          targetWinRate: 0.892,
          avgExecutionTime: 340
        }),
        stats: JSON.stringify({
          totalTrades: 567,
          successfulTrades: 506,
          totalPnL: 4520.20,
          avgTradeSize: 1200.0
        })
      },
      {
        engine: "scalper",
        status: "STOPPED",
        config: JSON.stringify({
          maxPositionSize: 15000,
          riskLevel: "high",
          targetWinRate: 0.658,
          avgExecutionTime: 25
        }),
        stats: JSON.stringify({
          totalTrades: 8934,
          successfulTrades: 5879,
          totalPnL: -1240.50,
          avgTradeSize: 450.0
        })
      },
      {
        engine: "arbitrage",
        status: "RUNNING",
        config: JSON.stringify({
          maxPositionSize: 100000,
          riskLevel: "low",
          targetWinRate: 0.947,
          avgExecutionTime: 67
        }),
        stats: JSON.stringify({
          totalTrades: 3421,
          successfulTrades: 3240,
          totalPnL: 18760.40,
          avgTradeSize: 5680.0
        })
      }
    ];

    for (const engine of engines) {
      await prisma.engineStatus.create({ data: engine });
    }

    console.log("✅ Hydra-Bot trading engines created");

    // Create sample tokens
    const tokens = [
      {
        mint: "So11111111111111111111111111111111111111112",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        logoUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        isVerified: true,
        marketCap: 25000000000,
        totalSupply: 580000000,
        circulatingSupply: 470000000
      },
      {
        mint: "DEMO_BOOMROACH_MINT_ADDRESS",
        symbol: "BOOMROACH",
        name: "BoomRoach",
        decimals: 9,
        logoUrl: "https://example.com/boomroach-logo.png",
        isVerified: true,
        marketCap: 150000000,
        totalSupply: 1000000000,
        circulatingSupply: 650000000
      },
      {
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        logoUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
        isVerified: true,
        marketCap: 50000000000,
        totalSupply: 50000000000,
        circulatingSupply: 48500000000
      }
    ];

    for (const token of tokens) {
      const createdToken = await prisma.token.create({ data: token });

      // Add current price data
      await prisma.tokenPrice.create({
        data: {
          tokenId: createdToken.id,
          mint: token.mint,
          price: token.symbol === "SOL" ? 185.50 : token.symbol === "BOOMROACH" ? 0.23 : 1.00,
          priceUsd: token.symbol === "SOL" ? 185.50 : token.symbol === "BOOMROACH" ? 0.23 : 1.00,
          volume24h: Math.random() * 10000000,
          change24h: (Math.random() - 0.5) * 20,
          change7d: (Math.random() - 0.5) * 50,
          liquidity: Math.random() * 5000000,
          source: "jupiter"
        }
      });
    }

    console.log("✅ Sample tokens and prices created");

    // Create sample trading signals
    const tokenIds = await prisma.token.findMany({ select: { id: true } });

    for (let i = 0; i < 10; i++) {
      const randomToken = tokenIds[Math.floor(Math.random() * tokenIds.length)];
      await prisma.signal.create({
        data: {
          userId: demoUser.id,
          tokenId: randomToken.id,
          engine: ["AI_ANALYSIS", "SNIPER", "REENTRY", "TECHNICAL"][Math.floor(Math.random() * 4)],
          type: ["BUY", "SELL", "HOLD"][Math.floor(Math.random() * 3)],
          action: ["STRONG_BUY", "BUY", "WEAK_BUY", "HOLD", "WEAK_SELL", "SELL", "STRONG_SELL"][Math.floor(Math.random() * 7)],
          confidence: Math.random(),
          price: Math.random() * 200,
          targetPrice: Math.random() * 250,
          stopLoss: Math.random() * 150,
          timeframe: ["1m", "5m", "15m", "1h", "4h", "1d"][Math.floor(Math.random() * 6)],
          reasoning: "AI analysis indicates strong momentum with favorable risk/reward ratio.",
          status: "ACTIVE"
        }
      });
    }

    console.log("✅ Sample trading signals created");

    // Create sample community votes
    const proposals = [
      "BURN_COMMISSION_POOL",
      "INCREASE_STAKING_REWARDS",
      "REDUCE_TRADING_FEES",
      "ADD_NEW_TRADING_ENGINE"
    ];

    for (const proposal of proposals) {
      await prisma.communityVote.create({
        data: {
          userId: demoUser.id,
          proposal,
          voteType: ["FOR", "AGAINST", "ABSTAIN"][Math.floor(Math.random() * 3)],
          weight: 500.0
        }
      });
    }

    console.log("✅ Sample community votes created");

    // Create system configurations
    const systemConfigs = [
      { key: "TRADING_ENABLED", value: "true" },
      { key: "MAINTENANCE_MODE", value: "false" },
      { key: "MIN_BOOMROACH_TOKENS", value: "100" },
      { key: "COMMISSION_RATE", value: "0.005" },
      { key: "STAKING_REWARD_RATE", value: "0.02" },
      { key: "MAX_DAILY_TRADES", value: "100" },
      { key: "EMERGENCY_STOP", value: "false" },
      { key: "TELEGRAM_NOTIFICATIONS", value: "true" }
    ];

    for (const config of systemConfigs) {
      await prisma.systemConfig.create({ data: config });
    }

    console.log("✅ System configurations created");

    console.log("🎉 Enhanced database seeding completed successfully!");
    console.log("");
    console.log("📊 Summary:");
    console.log("• 1 Admin user: admin@boomroach.wales / Admin123!");
    console.log("• 1 Demo user: demo@boomroach.wales / Demo123!");
    console.log("• 6 Hydra-Bot trading engines");
    console.log("• 3 Sample tokens (SOL, BOOMROACH, USDC)");
    console.log("• 10 Trading signals");
    console.log("• Commission pool and staking system");
    console.log("• Enhanced trading configuration");
    console.log("");
    console.log("🚀 System ready for enhanced trading with email + wallet authentication!");

  } catch (error) {
    console.error("❌ Enhanced seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

enhancedSeed().catch((error) => {
  console.error(error);
  process.exit(1);
});

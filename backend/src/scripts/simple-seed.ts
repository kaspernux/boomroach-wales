import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting simple database seeding...");

  try {
    // Create demo user
    const hashedPassword = await bcrypt.hash("demo123", 10);

    const demoUser = await prisma.user.upsert({
      where: { username: "demo_user" },
      update: {},
      create: {
        email: "demo@boomroach.wales",
        username: "demo_user",
        walletAddress: "demo_wallet_address_123",
        tradingEnabled: true,
        riskTolerance: "MEDIUM"
      }
    });

    console.log("✅ Demo user created:", demoUser.email);

    // Create 6 Hydra-Bot engines
    const engines = [
      {
        id: "sniper",
        name: "Sniper Engine",
        description: "High-precision entry points with laser focus on momentum reversals",
        engineType: "SNIPER",
        status: "STOPPED",
        isActive: true,
        targetWinRate: 0.785,
        avgExecutionTime: 2.3,
        minInvestment: 100.0,
        riskLevel: "high",
        subscriptionRequired: "premium",
        features: ["Momentum Detection", "Volume Analysis", "Precision Entry"],
        realTimeMetrics: {
          successRate: "78.5%",
          activeTrades: 2,
          pendingOrders: 1,
          dailyPnL: 124.50
        }
      },
      {
        id: "reentry",
        name: "Re-entry Engine",
        description: "Strategic re-entry points after partial profits or minor pullbacks",
        engineType: "REENTRY",
        status: "RUNNING",
        isActive: true,
        targetWinRate: 0.721,
        avgExecutionTime: 4.1,
        minInvestment: 200.0,
        riskLevel: "medium",
        subscriptionRequired: "premium",
        features: ["Pullback Analysis", "Support/Resistance", "Risk Management"],
        realTimeMetrics: {
          successRate: "72.1%",
          activeTrades: 3,
          pendingOrders: 2,
          dailyPnL: 89.30
        }
      },
      {
        id: "ai-signals",
        name: "AI Signals Engine",
        description: "Advanced machine learning algorithms for pattern recognition",
        engineType: "AI_SIGNALS",
        status: "RUNNING",
        isActive: true,
        targetWinRate: 0.813,
        avgExecutionTime: 3.7,
        minInvestment: 300.0,
        riskLevel: "medium",
        subscriptionRequired: "elite",
        features: ["Neural Networks", "Pattern Recognition", "Sentiment Analysis"],
        realTimeMetrics: {
          successRate: "81.3%",
          activeTrades: 4,
          pendingOrders: 1,
          dailyPnL: 267.80
        }
      },
      {
        id: "guardian",
        name: "Guardian Engine",
        description: "Risk management focused with capital preservation priority",
        engineType: "GUARDIAN",
        status: "RUNNING",
        isActive: true,
        targetWinRate: 0.892,
        avgExecutionTime: 8.2,
        minInvestment: 500.0,
        riskLevel: "low",
        subscriptionRequired: "premium",
        features: ["Capital Protection", "Risk Assessment", "Conservative Trading"],
        realTimeMetrics: {
          successRate: "89.2%",
          activeTrades: 1,
          pendingOrders: 0,
          dailyPnL: 45.20
        }
      },
      {
        id: "scalper",
        name: "Scalper Engine",
        description: "High-frequency micro-profits from small price movements",
        engineType: "SCALPER",
        status: "STOPPED",
        isActive: true,
        targetWinRate: 0.658,
        avgExecutionTime: 0.8,
        minInvestment: 50.0,
        riskLevel: "high",
        subscriptionRequired: "elite",
        features: ["High Frequency", "Micro Profits", "Speed Execution"],
        realTimeMetrics: {
          successRate: "65.8%",
          activeTrades: 0,
          pendingOrders: 0,
          dailyPnL: -12.30
        }
      },
      {
        id: "arbitrage",
        name: "Arbitrage Engine",
        description: "Cross-exchange price discrepancies and statistical arbitrage",
        engineType: "ARBITRAGE",
        status: "RUNNING",
        isActive: true,
        targetWinRate: 0.947,
        avgExecutionTime: 1.2,
        minInvestment: 1000.0,
        riskLevel: "low",
        subscriptionRequired: "elite",
        features: ["Cross-Exchange", "Statistical Arbitrage", "Low Risk"],
        realTimeMetrics: {
          successRate: "94.7%",
          activeTrades: 5,
          pendingOrders: 3,
          dailyPnL: 156.70
        }
      }
    ];

    for (const engine of engines) {
      await prisma.engineStatus.upsert({
        where: { engine: engine.id },
        update: {
          status: engine.status,
          stats: JSON.stringify(engine.realTimeMetrics),
          config: JSON.stringify({
            name: engine.name,
            description: engine.description,
            targetWinRate: engine.targetWinRate,
            avgExecutionTime: engine.avgExecutionTime,
            minInvestment: engine.minInvestment,
            riskLevel: engine.riskLevel,
            subscriptionRequired: engine.subscriptionRequired,
            features: engine.features
          })
        },
        create: {
          engine: engine.id,
          status: engine.status,
          stats: JSON.stringify(engine.realTimeMetrics),
          config: JSON.stringify({
            name: engine.name,
            description: engine.description,
            targetWinRate: engine.targetWinRate,
            avgExecutionTime: engine.avgExecutionTime,
            minInvestment: engine.minInvestment,
            riskLevel: engine.riskLevel,
            subscriptionRequired: engine.subscriptionRequired,
            features: engine.features
          }),
          lastHeartbeat: new Date()
        }
      });

      console.log(`✅ Engine created: ${engine.name}`);
    }

    console.log("🎉 Simple database seeding completed successfully!");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

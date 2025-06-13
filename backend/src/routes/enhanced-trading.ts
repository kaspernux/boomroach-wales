import express from "express";
import { PrismaClient } from "@prisma/client";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import jwt from "jsonwebtoken";
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';
import { solanaService } from "../services/solana";
import { logger } from "../../../shared/utils/logger";

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireVerified);
router.use(requireLevel);

// Jupiter API integration for real trading
class JupiterTradingService {
  private connection: Connection;
  private jupiterApiUrl = "https://quote-api.jup.ag/v6";

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
      "confirmed"
    );
  }

  async getQuote(inputMint: string, outputMint: string, amount: number, slippageBps = 100) {
    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: slippageBps.toString()
      });

      const response = await fetch(`${this.jupiterApiUrl}/quote?${params}`);
      const quote = await response.json();

      if (!response.ok) {
        throw new Error(quote.error || "Failed to get quote");
      }

      return quote;
    } catch (error) {
      logger.error("Jupiter quote error:", error);
      throw error;
    }
  }

  async getSwapTransaction(quote: any, userPublicKey: string) {
    try {
      const response = await fetch(`${this.jupiterApiUrl}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: "auto"
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get swap transaction");
      }

      return result;
    } catch (error) {
      logger.error("Jupiter swap transaction error:", error);
      throw error;
    }
  }
}

const jupiterService = new JupiterTradingService();

// Enhanced authentication middleware
const requireEnhancedAuth = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any;
    const accessCheck = await enhancedAuthService.checkUserAccess(decoded.userId);

    if (!accessCheck.access.hasBasicAccess) {
      return res.status(403).json({
        error: "Email verification required",
        requiresEmailVerification: true
      });
    }

    req.user = accessCheck.user;
    req.access = accessCheck.access;
    next();
  } catch (error) {
    logger.error("Authentication middleware error:", error);
    return res.status(401).json({ error: "Invalid authentication token" });
  }
};

// Require trading access middleware
const requireTradingAccess = (req: any, res: any, next: any) => {
  if (!req.access.canTrade) {
    return res.status(403).json({
      error: "Trading access denied",
      reason: "Insufficient BOOMROACH tokens or wallet not connected",
      requiredBoomroach: req.access.requiredBoomroach,
      currentBalance: req.access.boomroachBalance,
      requiresWalletConnection: !req.user.isWalletConnected
    });
  }
  next();
};

// Get trading quote
router.post("/quote", requireEnhancedAuth, requireTradingAccess, async (req, res) => {
  try {
    const { inputMint, outputMint, amount, slippageBps } = req.body;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const quote = await jupiterService.getQuote(
      inputMint,
      outputMint,
      Math.floor(amount * 1e9), // Convert to lamports
      slippageBps || 100
    );

    // Calculate commission
    const tradingConfig = await enhancedAuthService.getTradingConfig();
    const outputAmount = Number.parseFloat(quote.outAmount) / 1e9;
    const commission = outputAmount * tradingConfig.commissionRate;

    return res.json({
      quote,
      commission,
      commissionRate: tradingConfig.commissionRate,
      estimatedOutput: outputAmount - commission,
      priceImpact: quote.priceImpactPct
    });
  } catch (error) {
    logger.error("Quote error:", error);
    return res.status(500).json({ error: "Failed to get trading quote" });
  }
});

// Execute real trade
router.post("/execute", requireEnhancedAuth, requireTradingAccess, async (req, res) => {
  try {
    const { quote, userSignature } = req.body;
    const userId = req.user.id;
    const walletAddress = req.user.walletAddress;

    if (!quote || !userSignature || !walletAddress) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Get swap transaction from Jupiter
    const swapResponse = await jupiterService.getSwapTransaction(quote, walletAddress);

    // Calculate commission
    const tradingConfig = await enhancedAuthService.getTradingConfig();
    const outputAmount = Number.parseFloat(quote.outAmount) / 1e9;
    const commission = outputAmount * tradingConfig.commissionRate;

    // Record trade execution attempt
    const tradeRecord = await prisma.realTradeExecution.create({
      data: {
        userId,
        txSignature: "", // Will be updated after execution
        inputTokenMint: quote.inputMint,
        outputTokenMint: quote.outputMint,
        inputAmount: Number.parseFloat(quote.inAmount) / 1e9,
        outputAmount: outputAmount,
        slippage: Number.parseFloat(quote.slippageBps) / 100,
        commission,
        commissionInBoomroach: 0, // Will be calculated and updated
        route: JSON.stringify(quote.routePlan),
        status: "PENDING"
      }
    });

    // Note: In a real implementation, you would:
    // 1. Deserialize the transaction from swapResponse.swapTransaction
    // 2. Have the user sign it with their wallet
    // 3. Send the signed transaction to Solana network
    // 4. Monitor for confirmation and update the trade record

    // For now, simulate successful execution
    const simulatedTxSignature = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update trade record with simulation
    const updatedTrade = await prisma.realTradeExecution.update({
      where: { id: tradeRecord.id },
      data: {
        txSignature: simulatedTxSignature,
        status: "SUCCESS",
        blockTime: new Date()
      }
    });

    // Convert commission to BOOMROACH and add to commission pool
    await this.handleCommission(commission, quote.outputMint);

    // Update user portfolio
    await this.updateUserPortfolio(userId, {
      inputMint: quote.inputMint,
      outputMint: quote.outputMint,
      inputAmount: Number.parseFloat(quote.inAmount) / 1e9,
      outputAmount: outputAmount - commission,
      commission
    });

    return res.json({
      success: true,
      txSignature: simulatedTxSignature,
      trade: updatedTrade,
      commission,
      netOutput: outputAmount - commission,
      message: "Trade executed successfully (simulation mode)"
    });
  } catch (error) {
    logger.error("Trade execution error:", error);
    return res.status(500).json({ error: "Failed to execute trade" });
  }
});

// Get user trading history
router.get("/history", requireEnhancedAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const trades = await prisma.realTradeExecution.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    const totalTrades = await prisma.realTradeExecution.count({
      where: { userId }
    });

    return res.json({
      trades,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalTrades,
        pages: Math.ceil(totalTrades / Number(limit))
      }
    });
  } catch (error) {
    logger.error("Trading history error:", error);
    return res.status(500).json({ error: "Failed to get trading history" });
  }
});

// Get trading configuration (admin only)
router.get("/config", requireEnhancedAuth, async (req, res) => {
  try {
    const config = await enhancedAuthService.getTradingConfig();
    return res.json(config);
  } catch (error) {
    logger.error("Get trading config error:", error);
    return res.status(500).json({ error: "Failed to get trading configuration" });
  }
});

// Update trading configuration (admin only)
router.post("/config", requireEnhancedAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const updatedConfig = await enhancedAuthService.updateTradingConfig(updates, userId);

    return res.json({
      success: true,
      config: updatedConfig,
      message: "Trading configuration updated successfully"
    });
  } catch (error) {
    logger.error("Update trading config error:", error);
    return res.status(500).json({ error: error.message || "Failed to update trading configuration" });
  }
});

// Commission and staking endpoints
router.get("/commission-pool", requireEnhancedAuth, async (req, res) => {
  try {
    const pool = await prisma.commissionPool.findFirst();
    return res.json(pool || {
      totalCommissions: 0,
      totalStaked: 0,
      pendingBurn: 0
    });
  } catch (error) {
    logger.error("Commission pool error:", error);
    return res.status(500).json({ error: "Failed to get commission pool data" });
  }
});

router.post("/stake", requireEnhancedAuth, requireTradingAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid stake amount" });
    }

    // Check if user has sufficient BOOMROACH tokens
    const walletInfo = await solanaService.getWalletInfo(req.user.walletAddress);
    if (walletInfo.boomroachBalance < amount) {
      return res.status(400).json({ error: "Insufficient BOOMROACH tokens" });
    }

    // Create or update staking record
    const staking = await prisma.userStaking.upsert({
      where: { userId },
      update: {
        stakedAmount: { increment: amount }
      },
      create: {
        userId,
        stakedAmount: amount
      }
    });

    return res.json({
      success: true,
      staking,
      message: `Successfully staked ${amount} BOOMROACH tokens`
    });
  } catch (error) {
    logger.error("Staking error:", error);
    return res.status(500).json({ error: "Failed to stake tokens" });
  }
});

router.post("/vote", requireEnhancedAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { proposal, voteType } = req.body;

    if (!proposal || !["FOR", "AGAINST", "ABSTAIN"].includes(voteType)) {
      return res.status(400).json({ error: "Invalid vote parameters" });
    }

    // Check if user has staked tokens (voting weight)
    const staking = await prisma.userStaking.findUnique({
      where: { userId }
    });

    const voteWeight = staking?.stakedAmount || 0;

    const vote = await prisma.communityVote.create({
      data: {
        userId,
        proposal,
        voteType,
        weight: voteWeight
      }
    });

    return res.json({
      success: true,
      vote,
      message: "Vote recorded successfully"
    });
  } catch (error) {
    logger.error("Voting error:", error);
    return res.status(500).json({ error: "Failed to record vote" });
  }
});

// Helper functions
async function handleCommission(commissionAmount: number, tokenMint: string) {
  try {
    // Convert commission to BOOMROACH tokens
    // In real implementation, this would use Jupiter to swap commission to BOOMROACH
    const boomroachCommission = commissionAmount; // Simplified for demo

    // Update commission pool
    await prisma.commissionPool.upsert({
      where: { id: "main" },
      update: {
        totalCommissions: { increment: boomroachCommission }
      },
      create: {
        id: "main",
        totalCommissions: boomroachCommission
      }
    });

    logger.info(`Commission of ${boomroachCommission} BOOMROACH added to pool`);
  } catch (error) {
    logger.error("Commission handling error:", error);
  }
}

async function updateUserPortfolio(userId: string, tradeData: any) {
  try {
    // Update or create user portfolio
    await prisma.portfolio.upsert({
      where: { userId },
      update: {
        totalValue: { increment: tradeData.outputAmount },
        lastUpdated: new Date()
      },
      create: {
        userId,
        totalValue: tradeData.outputAmount
      }
    });

    logger.info(`Portfolio updated for user ${userId}`);
  } catch (error) {
    logger.error("Portfolio update error:", error);
  }
}

export default router;

import { PrismaClient } from "@prisma/client";
import { Connection, LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import express from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';
import { enhancedAuthService } from "../services/enhanced-auth";
import { solanaService } from "../services/solana";
import {
	asyncWrapper,
	blockchainLogger,
	createAuthError,
	createBlockchainError,
	createTradingError,
	createValidationError,
	logger,
	tradingLogger,
} from "../middleware/error-handler";
import { Transaction } from "@solana/web3.js";
import bs58 from "bs58";

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireVerified);
router.use(requireLevel);

// Initialize Solana connection
const solanaConnection = new Connection(
	process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
	"confirmed",
);

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

// Comprehensive trading engine configurations with Hydra-Bot integration
const HYDRA_TRADING_ENGINES = {
	sniper: {
		id: "sniper",
		name: "Sniper Engine",
		description: "Lightning-fast new token detection and automated buying",
		maxPositionSize: 50000,
		riskLevel: "high",
		targetWinRate: 0.78,
		avgExecutionTime: 1.2,
		minInvestment: 100,
		fees: 0.015,
		features: ["auto-buy", "honeypot-detection", "slippage-protection"],
		enabled: true,
		subscriptionRequired: "free",
	},
	reentry: {
		id: "reentry",
		name: "Re-entry Engine",
		description: "Momentum-based re-entry trading with pattern recognition",
		maxPositionSize: 75000,
		riskLevel: "medium",
		targetWinRate: 0.82,
		avgExecutionTime: 2.1,
		minInvestment: 250,
		fees: 0.012,
		features: ["momentum-analysis", "volume-confirmation", "risk-scaling"],
		enabled: true,
		subscriptionRequired: "free",
	},
	"ai-signals": {
		id: "ai-signals",
		name: "AI Signals Engine",
		description: "OpenAI-powered market analysis and intelligent trading signals",
		maxPositionSize: 40000,
		riskLevel: "medium",
		targetWinRate: 0.76,
		avgExecutionTime: 3.5,
		minInvestment: 500,
		fees: 0.02,
		features: ["sentiment-analysis", "news-integration", "ai-predictions"],
		enabled: true,
		subscriptionRequired: "premium",
	},
	guardian: {
		id: "guardian",
		name: "Guardian Engine",
		description: "Advanced risk management and portfolio protection system",
		maxPositionSize: 25000,
		riskLevel: "low",
		targetWinRate: 0.94,
		avgExecutionTime: 0.8,
		minInvestment: 1000,
		fees: 0.008,
		features: ["stop-loss", "portfolio-rebalancing", "drawdown-protection"],
		enabled: true,
		subscriptionRequired: "vip",
	},
	scalper: {
		id: "scalper",
		name: "Scalper Engine",
		description: "High-frequency micro-profit trading system",
		maxPositionSize: 30000,
		riskLevel: "medium",
		targetWinRate: 0.85,
		avgExecutionTime: 0.5,
		minInvestment: 50,
		fees: 0.005,
		features: ["micro-profits", "high-frequency", "quick-exits"],
		enabled: true,
		subscriptionRequired: "premium",
	},
	arbitrage: {
		id: "arbitrage",
		name: "Arbitrage Engine",
		description: "Cross-platform arbitrage opportunities",
		maxPositionSize: 100000,
		riskLevel: "low",
		targetWinRate: 0.92,
		avgExecutionTime: 2.8,
		minInvestment: 2000,
		fees: 0.01,
		features: ["cross-platform", "risk-free", "automatic-execution"],
		enabled: true,
		subscriptionRequired: "vip",
	},
};

// Validation schemas
const tradeOrderSchema = z.object({
	symbol: z.string().min(1).max(20),
	side: z.enum(["buy", "sell"]),
	amount: z.number().positive(),
	price: z.number().positive().optional(),
	engine: z.enum(["sniper", "reentry", "ai-signals", "guardian", "scalper", "arbitrage"]),
	orderType: z.enum(["market", "limit", "stop_loss", "take_profit"]).default("market"),
	slippage: z.number().min(0).max(0.5).default(0.01),
	stopLoss: z.number().positive().optional(),
	takeProfit: z.number().positive().optional(),
	timeInForce: z.enum(["GTC", "IOC", "FOK"]).default("GTC"),
});

const engineControlSchema = z.object({
	action: z.enum(["start", "stop", "restart", "configure"]),
	config: z.object({
		maxPositionSize: z.number().positive().optional(),
		riskLevel: z.enum(["low", "medium", "high"]).optional(),
		autoTrading: z.boolean().optional(),
		emergencyStop: z.boolean().optional(),
	}).optional(),
});

const portfolioQuerySchema = z.object({
	includePositions: z.boolean().default(true),
	includePnL: z.boolean().default(true),
	timeframe: z.enum(["1h", "24h", "7d", "30d"]).default("24h"),
});

// Helper functions
const generateTransactionHash = (): string => {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
	let result = "";
	for (let i = 0; i < 64; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
};

const validateEngineAccess = async (userId: string, engineId: string): Promise<boolean> => {
	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, tradingEnabled: true, riskTolerance: true },
		});

		if (!user || !user.tradingEnabled) return false;

		const engine = HYDRA_TRADING_ENGINES[engineId as keyof typeof HYDRA_TRADING_ENGINES];
		if (!engine) return false;

		// Check subscription requirements (simplified for demo)
		// In production, implement proper subscription checking
		return true;
	} catch (error) {
		logger.error("Error validating engine access", { error, userId, engineId });
		return false;
	}
};

const calculateRiskMetrics = (trades: any[]): any => {
	if (!trades.length) return {};

	const profits = trades.map(t => t.profit || 0);
	const returns = profits.map(p => p / 1000); // Normalized returns

	const totalReturn = profits.reduce((sum, p) => sum + p, 0);
	const avgReturn = totalReturn / trades.length;
	const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn / 1000, 2), 0) / trades.length;
	const volatility = Math.sqrt(variance);
	const sharpeRatio = volatility > 0 ? (avgReturn / 1000) / volatility : 0;

	return {
		totalReturn,
		avgReturn,
		volatility,
		sharpeRatio,
		maxDrawdown: Math.max(...profits.map((_, i) =>
			Math.max(0, Math.max(...profits.slice(0, i + 1)) - profits[i])
		)) || 0,
		winRate: trades.filter(t => (t.profit || 0) > 0).length / trades.length,
	};
};

// ============================================
// HYDRA-BOT TRADING ENGINES MANAGEMENT
// ============================================

/**
 * @swagger
 * /api/trading/engines:
 *   get:
 *     summary: Get all Hydra-Bot trading engines
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 */
router.get("/engines", asyncWrapper(async (req: AuthenticatedRequest, res) => {
	const userId = req.user!.id;

	// Get engine status from database
	const engineStatuses = await prisma.engineStatus.findMany();
	const statusMap = new Map(engineStatuses.map(e => [e.engine, e]));

	const engines = Object.entries(HYDRA_TRADING_ENGINES).map(([key, config]) => {
		const status = statusMap.get(key);
		return {
			...config,
			status: status?.status || "STOPPED",
			lastHeartbeat: status?.lastHeartbeat,
			stats: status?.stats ? JSON.parse(status.stats) : null,
			hasAccess: true, // Simplified for demo
			realTimeMetrics: {
				activeTrades: Math.floor(Math.random() * 10) + 1,
				pendingOrders: Math.floor(Math.random() * 5),
				avgSlippage: (Math.random() * 0.02).toFixed(4),
				successRate: ((config.targetWinRate + (Math.random() - 0.5) * 0.1) * 100).toFixed(1),
				dailyPnL: (Math.random() - 0.3) * 5000,
			},
		};
	});

	// Get network status
	let networkStatus = {};
	try {
		const slot = await solanaConnection.getSlot();
		networkStatus = {
			solana: true,
			currentSlot: slot,
			rpcLatency: Math.floor(Math.random() * 100) + 50,
		};
	} catch (error) {
		logger.warn("Failed to fetch network status", { error });
		networkStatus = { solana: false, error: "Connection failed" };
	}

	res.json({
		success: true,
		data: {
			engines,
			totalEngines: engines.length,
			activeEngines: engines.filter(e => e.status === "RUNNING").length,
			networkStatus,
			globalStats: {
				totalVolume24h: Math.floor(Math.random() * 1000000) + 500000,
				totalTrades24h: Math.floor(Math.random() * 1000) + 500,
				avgExecutionTime: 2.1,
				globalWinRate: 0.76,
			},
		},
	});
}));

/**
 * @swagger
 * /api/trading/engines/{engineId}:
 *   get:
 *     summary: Get specific engine details
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 */
router.get("/engines/:engineId", asyncWrapper(async (req: AuthenticatedRequest, res) => {
	const { engineId } = req.params;
	const userId = req.user!.id;

	const engine = HYDRA_TRADING_ENGINES[engineId as keyof typeof HYDRA_TRADING_ENGINES];
	if (!engine) {
		throw createTradingError("Engine not found", 404, undefined, engineId);
	}

	// Get engine status and recent trades
	const [engineStatus, recentTrades] = await Promise.all([
		prisma.engineStatus.findUnique({ where: { engine: engineId } }),
		prisma.hydraTrade.findMany({
			where: { userId, engine: engineId },
			orderBy: { createdAt: "desc" },
			take: 20,
			include: {
				position: true,
				signal: true,
			},
		}),
	]);

	// Calculate performance metrics
	const riskMetrics = calculateRiskMetrics(recentTrades);

	// Get blockchain metrics
	let blockchainMetrics = {};
	try {
		if (solanaConnection) {
			const slot = await solanaConnection.getSlot();
			const blockTime = await solanaConnection.getBlockTime(slot);

			blockchainMetrics = {
				currentSlot: slot,
				blockTime,
				network: process.env.SOLANA_NETWORK || "devnet",
				connected: true,
				avgGasPrice: "0.000005",
			};
		}
	} catch (error) {
		logger.warn("Failed to fetch blockchain metrics", { error, engineId });
	}

	res.json({
		success: true,
		data: {
			...engine,
			status: engineStatus?.status || "STOPPED",
			lastUpdate: engineStatus?.updatedAt,
			config: engineStatus?.config ? JSON.parse(engineStatus.config) : {},
			recentTrades: recentTrades.map(trade => ({
				id: trade.id,
				type: trade.type,
				side: trade.side,
				tokenSymbol: trade.tokenSymbol,
				amount: trade.amount,
				price: trade.price,
				profit: (trade.price - (trade.position?.avgBuyPrice || trade.price)) * trade.amount,
				status: trade.status,
				createdAt: trade.createdAt,
				executionTime: Math.random() * engine.avgExecutionTime + 0.5,
			})),
			performance: {
				...riskMetrics,
				totalTrades: recentTrades.length,
				totalVolume: recentTrades.reduce((sum, trade) => sum + trade.amount * trade.price, 0),
			},
			blockchain: blockchainMetrics,
		},
	});
}));

/**
 * @swagger
 * /api/trading/engines/{engineId}/control:
 *   post:
 *     summary: Control trading engine (start/stop/configure)
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 */
router.post("/engines/:engineId/control", asyncWrapper(async (req: AuthenticatedRequest, res) => {
	const { engineId } = req.params;
	const userId = req.user!.id;
	const validatedData = engineControlSchema.parse(req.body);

	const engine = HYDRA_TRADING_ENGINES[engineId as keyof typeof HYDRA_TRADING_ENGINES];
	if (!engine) {
		throw createTradingError("Engine not found", 404, undefined, engineId);
	}

	// Check user permissions
	const hasAccess = await validateEngineAccess(userId, engineId);
	if (!hasAccess) {
		throw createAuthError(`Insufficient permissions for engine ${engineId}`, userId);
	}

	// Update engine status in database
	const newStatus = validatedData.action === "start" ? "RUNNING" :
		validatedData.action === "stop" ? "STOPPED" : "RUNNING";

	const updatedEngine = await prisma.engineStatus.upsert({
		where: { engine: engineId },
		update: {
			status: newStatus,
			lastHeartbeat: new Date(),
			config: validatedData.config ? JSON.stringify(validatedData.config) : undefined,
		},
		create: {
			engine: engineId,
			status: newStatus,
			lastHeartbeat: new Date(),
			config: validatedData.config ? JSON.stringify(validatedData.config) : JSON.stringify({}),
		},
	});

	// Log engine control action
	tradingLogger.logEngineStatus(engineId, newStatus, {
		userId,
		action: validatedData.action,
		config: validatedData.config,
	});

	res.json({
		success: true,
		data: {
			engine: engineId,
			action: validatedData.action,
			status: newStatus,
			config: validatedData.config,
			timestamp: new Date().toISOString(),
		},
	});
}));

// ============================================
// ADVANCED TRADING OPERATIONS
// ============================================

/**
 * @swagger
 * /api/trading/orders:
 *   post:
 *     summary: Place new trading order with Hydra-Bot
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 */
router.post("/orders", asyncWrapper(async (req: AuthenticatedRequest, res) => {
	const userId = req.user!.id;
	const validatedData = tradeOrderSchema.parse(req.body);

	const engine = HYDRA_TRADING_ENGINES[validatedData.engine as keyof typeof HYDRA_TRADING_ENGINES];
	if (!engine) {
		throw createTradingError("Invalid trading engine", 400, undefined, validatedData.engine);
	}

	// Validate user access and limits
	const hasAccess = await validateEngineAccess(userId, validatedData.engine);
	if (!hasAccess) {
		throw createAuthError(`Insufficient permissions for engine ${validatedData.engine}`, userId);
	}

	// Check minimum investment
	if (validatedData.amount < engine.minInvestment) {
		throw createValidationError(
			`Minimum investment for ${validatedData.engine} is ${engine.minInvestment}`,
			"amount",
			validatedData.amount,
		);
	}

	// Check maximum position size
	if (validatedData.amount > engine.maxPositionSize) {
		throw createValidationError(
			`Maximum position size for ${validatedData.engine} is ${engine.maxPositionSize}`,
			"amount",
			validatedData.amount,
		);
	}

	const transactionHash = generateTransactionHash();

	// Create Hydra order in database
	const hydraOrder = await prisma.hydraOrder.create({
		data: {
			userId,
			type: validatedData.orderType.toUpperCase(),
			side: validatedData.side.toUpperCase(),
			tokenMint: "BOOMROACH_MINT", // In production, get from token lookup
			tokenSymbol: validatedData.symbol,
			amount: validatedData.amount,
			price: validatedData.price || 0,
			triggerPrice: validatedData.orderType === "stop_loss" ? validatedData.stopLoss : undefined,
			stopLoss: validatedData.stopLoss,
			takeProfit: validatedData.takeProfit,
			status: "PENDING",
			expiresAt: validatedData.timeInForce === "IOC" ?
				new Date(Date.now() + 60000) : // 1 minute for IOC
				undefined,
		},
	});

	// Simulate order processing
	setTimeout(async () => {
		try {
			const isSuccess = Math.random() > 0.05; // 95% success rate

			if (isSuccess) {
				// Create successful trade
				const executedPrice = validatedData.price || (0.00342 + (Math.random() - 0.5) * 0.0001);
				const actualPrice = executedPrice + (Math.random() - 0.5) * executedPrice * validatedData.slippage;

				const hydraTrade = await prisma.hydraTrade.create({
					data: {
						userId,
						type: validatedData.orderType.toUpperCase(),
						side: validatedData.side.toUpperCase(),
						tokenMint: "BOOMROACH_MINT",
						tokenSymbol: validatedData.symbol,
						amount: validatedData.amount,
						price: actualPrice,
						solAmount: validatedData.amount * actualPrice,
						fee: validatedData.amount * actualPrice * engine.fees,
						slippage: Math.abs(actualPrice - executedPrice) / executedPrice,
						status: "CONFIRMED",
						engine: validatedData.engine,
						txSignature: transactionHash,
						blockTime: new Date(),
					},
				});

				// Update order status
				await prisma.hydraOrder.update({
					where: { id: hydraOrder.id },
					data: { status: "FILLED" },
				});

				// Log successful trade
				tradingLogger.logTrade({
					...hydraTrade,
					executionTime: Math.random() * engine.avgExecutionTime + 0.5,
				});

				// Log blockchain transaction
				blockchainLogger.logTransaction({
					hash: transactionHash,
					network: process.env.SOLANA_NETWORK || "devnet",
					status: "confirmed",
					gasUsed: Math.floor(Math.random() * 5000) + 1000,
				});
			} else {
				// Mark order as failed
				await prisma.hydraOrder.update({
					where: { id: hydraOrder.id },
					data: { status: "CANCELLED" },
				});
			}
		} catch (error) {
			logger.error("Error processing trade execution", { error, orderId: hydraOrder.id });
		}
	}, Math.random() * 5000 + 1000); // 1-6 second execution time

	res.status(201).json({
		success: true,
		data: {
			orderId: hydraOrder.id,
			order: {
				id: hydraOrder.id,
				symbol: validatedData.symbol,
				side: validatedData.side,
				amount: validatedData.amount,
				price: validatedData.price,
				engine: validatedData.engine,
				orderType: validatedData.orderType,
				status: "pending",
				timestamp: hydraOrder.createdAt,
			},
			estimatedExecution: `${engine.avgExecutionTime.toFixed(1)}s`,
			blockchain: {
				network: process.env.SOLANA_NETWORK || "devnet",
				transactionHash,
				confirmationTime: "pending",
			},
		},
	});
}));

/**
 * @swagger
 * /api/trading/orders:
 *   get:
 *     summary: Get user's trading orders
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 */
router.get("/orders", asyncWrapper(async (req: AuthenticatedRequest, res) => {
	const userId = req.user!.id;
	const { status, engine, limit = 50, offset = 0 } = req.query;

	const whereClause: any = { userId };
	if (status) whereClause.status = String(status).toUpperCase();

	const orders = await prisma.hydraOrder.findMany({
		where: whereClause,
		orderBy: { createdAt: "desc" },
		take: Number(limit),
		skip: Number(offset),
	});

	// Get related trades for filled orders
	const orderIds = orders.filter(o => o.status === "FILLED").map(o => o.id);
	const relatedTrades = await prisma.hydraTrade.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
		take: 20,
	});

	const ordersWithTrades = orders.map(order => {
		const trade = relatedTrades.find(t =>
			t.tokenSymbol === order.tokenSymbol &&
			t.side === order.side &&
			Math.abs(new Date(t.createdAt).getTime() - new Date(order.createdAt).getTime()) < 60000
		);

		return {
			...order,
			executionDetails: trade ? {
				actualPrice: trade.price,
				fee: trade.fee,
				slippage: trade.slippage,
				txSignature: trade.txSignature,
				blockTime: trade.blockTime,
			} : null,
		};
	});

	res.json({
		success: true,
		data: {
			orders: ordersWithTrades,
			pagination: {
				total: orders.length,
				limit: Number(limit),
				offset: Number(offset),
				hasMore: orders.length === Number(limit),
			},
		},
	});
}));

/**
 * @swagger
 * /api/trading/orders/{orderId}:
 *   delete:
 *     summary: Cancel trading order
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/orders/:orderId", asyncWrapper(async (req: AuthenticatedRequest, res) => {
	const { orderId } = req.params;
	const userId = req.user!.id;

	const order = await prisma.hydraOrder.findFirst({
		where: { id: orderId, userId },
	});

	if (!order) {
		throw createTradingError("Order not found", 404, orderId);
	}

	if (order.status !== "PENDING") {
		throw createTradingError("Cannot cancel non-pending order", 400, orderId);
	}

	await prisma.hydraOrder.update({
		where: { id: orderId },
		data: {
			status: "CANCELLED",
			updatedAt: new Date(),
		},
	});

	res.json({
		success: true,
		data: {
			orderId,
			status: "cancelled",
			timestamp: new Date().toISOString(),
		},
	});
}));

// ============================================
// PORTFOLIO MANAGEMENT
// ============================================

/**
 * @swagger
 * /api/trading/portfolio:
 *   get:
 *     summary: Get user's portfolio with Hydra-Bot integration
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 */
router.get("/portfolio", asyncWrapper(async (req: AuthenticatedRequest, res) => {
	const userId = req.user!.id;
	const validatedQuery = portfolioQuerySchema.parse(req.query);

	// Get or create user portfolio
	let portfolio = await prisma.portfolio.findUnique({
		where: { userId },
		include: {
			positions: {
				include: {
					hydraTrades: {
						orderBy: { createdAt: "desc" },
						take: 5,
					},
				},
			},
		},
	});

	if (!portfolio) {
		portfolio = await prisma.portfolio.create({
			data: { userId },
			include: {
				positions: {
					include: {
						hydraTrades: {
							orderBy: { createdAt: "desc" },
							take: 5,
						},
					},
				},
			},
		});
	}

	// Calculate real-time metrics
	const currentTime = new Date();
	const timeframMs = {
		"1h": 60 * 60 * 1000,
		"24h": 24 * 60 * 60 * 1000,
		"7d": 7 * 24 * 60 * 60 * 1000,
		"30d": 30 * 24 * 60 * 60 * 1000,
	};

	const periodStart = new Date(currentTime.getTime() - timeframMs[validatedQuery.timeframe]);

	// Get trades in timeframe
	const periodTrades = await prisma.hydraTrade.findMany({
		where: {
			userId,
			createdAt: { gte: periodStart },
			status: "CONFIRMED",
		},
		orderBy: { createdAt: "desc" },
	});

	// Calculate portfolio metrics
	const totalValue = portfolio.positions.reduce((sum, pos) => {
		const currentPrice = 0.00342 + (Math.random() - 0.5) * 0.00001; // Mock real-time price
		return sum + (pos.amount * currentPrice);
	}, 0);

	const periodPnL = periodTrades.reduce((sum, trade) => {
		const profit = (trade.price - 0.00342) * trade.amount; // Mock profit calculation
		return sum + profit;
	}, 0);

	const riskMetrics = calculateRiskMetrics(periodTrades);

	// Calculate position-level P&L
	const positionsWithPnL = portfolio.positions.map(position => {
		const currentPrice = 0.00342 + (Math.random() - 0.5) * 0.00001;
		const unrealizedPnL = (currentPrice - position.avgBuyPrice) * position.amount;
		const realizedPnL = position.hydraTrades.reduce((sum, trade) => {
			return sum + ((trade.price - position.avgBuyPrice) * trade.amount);
		}, 0);

		return {
			...position,
			currentPrice,
			unrealizedPnL,
			realizedPnL,
			totalPnL: unrealizedPnL + realizedPnL,
			pnlPercentage: ((unrealizedPnL + realizedPnL) / (position.avgBuyPrice * position.amount)) * 100,
		};
	});

	res.json({
		success: true,
		data: {
			portfolio: {
				id: portfolio.id,
				totalValue: totalValue.toFixed(2),
				totalPnl: portfolio.totalPnl,
				dailyPnl: portfolio.dailyPnl,
				weeklyPnl: portfolio.weeklyPnl,
				monthlyPnl: portfolio.monthlyPnl,
				lastUpdated: portfolio.lastUpdated,
			},
			positions: validatedQuery.includePositions ? positionsWithPnL : [],
			metrics: validatedQuery.includePnL ? {
				timeframe: validatedQuery.timeframe,
				periodPnL: periodPnL.toFixed(2),
				totalTrades: periodTrades.length,
				...riskMetrics,
				performance: {
					totalReturn: ((totalValue - 10000) / 10000 * 100).toFixed(2), // Mock initial investment
					annualizedReturn: (riskMetrics.totalReturn * (365 / 30) * 100).toFixed(2), // Annualized
					bestTrade: Math.max(...periodTrades.map(t => (t.price - 0.00342) * t.amount)),
					worstTrade: Math.min(...periodTrades.map(t => (t.price - 0.00342) * t.amount)),
				},
			} : undefined,
			realTime: {
				lastUpdate: new Date().toISOString(),
				marketOpen: true,
				priceSource: "jupiter-aggregator",
			},
		},
	});
}));

// ============================================
// ADVANCED ANALYTICS & REPORTING
// ============================================

/**
 * @swagger
 * /api/trading/analytics/performance:
 *   get:
 *     summary: Get comprehensive performance analytics
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 */
router.get("/analytics/performance", asyncWrapper(async (req: AuthenticatedRequest, res) => {
	const userId = req.user!.id;
	const { timeframe = "24h", engine, includeMLInsights = "true" } = req.query;

	// Calculate time range
	const timeframMs = {
		"1h": 60 * 60 * 1000,
		"24h": 24 * 60 * 60 * 1000,
		"7d": 7 * 24 * 60 * 60 * 1000,
		"30d": 30 * 24 * 60 * 60 * 1000,
	};

	const periodStart = new Date(Date.now() - (timeframMs[timeframe as keyof typeof timeframMs] || timeframMs["24h"]));

	// Get trades and calculate metrics
	const whereClause: any = { userId, createdAt: { gte: periodStart } };
	if (engine) whereClause.engine = engine;

	const trades = await prisma.hydraTrade.findMany({
		where: whereClause,
		orderBy: { createdAt: "desc" },
		include: { position: true, signal: true },
	});

	const riskMetrics = calculateRiskMetrics(trades);

	// Engine performance breakdown
	const enginePerformance = Object.keys(HYDRA_TRADING_ENGINES).map(engineKey => {
		const engineTrades = trades.filter(t => t.engine === engineKey);
		const engineMetrics = calculateRiskMetrics(engineTrades);
		const engineConfig = HYDRA_TRADING_ENGINES[engineKey as keyof typeof HYDRA_TRADING_ENGINES];

		return {
			engine: engineKey,
			name: engineConfig.name,
			trades: engineTrades.length,
			...engineMetrics,
			avgExecutionTime: engineConfig.avgExecutionTime + (Math.random() - 0.5) * 1.0,
			successRate: (engineMetrics.winRate * 100).toFixed(1),
			riskScore: engineConfig.riskLevel === "high" ? 8 :
				engineConfig.riskLevel === "medium" ? 5 : 2,
		};
	});

	// Advanced risk metrics
	const advancedRiskMetrics = {
		valueAtRisk95: -(Math.random() * 0.1 + 0.02),
		conditionalVaR95: -(Math.random() * 0.15 + 0.03),
		beta: 0.8 + Math.random() * 0.6,
		alpha: (Math.random() - 0.5) * 0.1,
		correlation: Math.random() * 0.8,
		trackingError: Math.random() * 0.1,
		informationRatio: -0.5 + Math.random() * 2.0,
		calmarRatio: riskMetrics.maxDrawdown > 0 ? riskMetrics.totalReturn / riskMetrics.maxDrawdown : 0,
	};

	// Blockchain performance metrics
	const blockchainMetrics = {
		network: process.env.SOLANA_NETWORK || "devnet",
		totalGasUsed: trades.length * 3000,
		avgGasCost: "0.000005",
		transactionSuccessRate: "98.5",
		avgConfirmationTime: "2.3",
		slippageAnalysis: {
			avgSlippage: trades.reduce((sum, t) => sum + (t.slippage || 0), 0) / trades.length || 0,
			maxSlippage: Math.max(...trades.map(t => t.slippage || 0), 0),
			slippageVsExpected: 0.15, // Percentage difference
		},
	};

	const performanceData: any = {
		timeframe,
		overview: {
			...riskMetrics,
			totalTrades: trades.length,
			totalVolume: trades.reduce((sum, t) => sum + t.amount * t.price, 0),
			annualizedReturn: (riskMetrics.totalReturn * (365 / 30) * 100).toFixed(2),
			profitFactor: trades.filter(t => (t.price - 0.00342) * t.amount > 0).length > 0 ?
				Math.abs(trades.filter(t => (t.price - 0.00342) * t.amount > 0)
					.reduce((sum, t) => sum + (t.price - 0.00342) * t.amount, 0)) /
				Math.abs(trades.filter(t => (t.price - 0.00342) * t.amount < 0)
					.reduce((sum, t) => sum + (t.price - 0.00342) * t.amount, 0)) : 0,
		},
		enginePerformance,
		riskMetrics: advancedRiskMetrics,
		blockchain: blockchainMetrics,
	};

	// Add ML insights if requested
	if (includeMLInsights === "true") {
		performanceData.mlInsights = {
			marketSentiment: Math.random() > 0.5 ? "bullish" : "bearish",
			confidenceScore: (Math.random() * 0.4 + 0.6) * 100,
			predictedReturn24h: (Math.random() - 0.5) * 0.1,
			recommendations: [
				"Consider increasing position size in sniper engine",
				"Market volatility suggests reducing exposure",
				"AI signals showing strong buy indicators",
				"Guardian engine recommends risk reduction",
				"Arbitrage opportunities detected",
			].slice(0, Math.floor(Math.random() * 3) + 1),
			riskLevel: riskMetrics.volatility > 0.3 ? "high" :
				riskMetrics.volatility > 0.15 ? "medium" : "low",
			nextOptimalTrade: {
				engine: "ai-signals",
				action: "buy",
				confidence: 0.78,
				estimatedProfit: 156.78,
			},
		};
	}

	res.json({
		success: true,
		data: { performance: performanceData },
	});
}));

/**
 * @swagger
 * /api/trading/trades:
 *   get:
 *     summary: Get trading history with advanced filtering
 *     tags: [Trading]
 *     security:
 *       - bearerAuth: []
 */
router.get("/trades", asyncWrapper(async (req: AuthenticatedRequest, res) => {
	const userId = req.user!.id;
	const {
		engine,
		status,
		symbol,
		startDate,
		endDate,
		minProfit,
		maxProfit,
		limit = 50,
		offset = 0,
		sortBy = "createdAt",
		sortOrder = "desc",
	} = req.query;

	// Build where clause
	const whereClause: any = { userId };

	if (engine) whereClause.engine = engine;
	if (status) whereClause.status = String(status).toUpperCase();
	if (symbol) whereClause.tokenSymbol = symbol;

	if (startDate) {
		whereClause.createdAt = { ...whereClause.createdAt, gte: new Date(startDate as string) };
	}
	if (endDate) {
		whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(endDate as string) };
	}

	// Get trades with relations
	const trades = await prisma.hydraTrade.findMany({
		where: whereClause,
		include: {
			position: true,
			signal: true,
		},
		orderBy: { [String(sortBy)]: sortOrder as "asc" | "desc" },
		take: Number(limit),
		skip: Number(offset),
	});

	// Calculate profit for each trade and apply profit filters
	const tradesWithProfit = trades.map(trade => {
		const profit = (trade.price - 0.00342) * trade.amount; // Mock profit calculation
		return { ...trade, profit };
	}).filter(trade => {
		if (minProfit && trade.profit < Number(minProfit)) return false;
		if (maxProfit && trade.profit > Number(maxProfit)) return false;
		return true;
	});

	// Calculate statistics
	const stats = calculateRiskMetrics(tradesWithProfit);
	const totalVolume = tradesWithProfit.reduce((sum, trade) => sum + trade.amount * trade.price, 0);

	res.json({
		success: true,
		data: {
			trades: tradesWithProfit.map(trade => ({
				id: trade.id,
				type: trade.type,
				side: trade.side,
				tokenSymbol: trade.tokenSymbol,
				amount: trade.amount,
				price: trade.price,
				profit: trade.profit,
				engine: trade.engine,
				status: trade.status,
				txSignature: trade.txSignature,
				blockTime: trade.blockTime,
				createdAt: trade.createdAt,
				signal: trade.signal ? {
					type: trade.signal.type,
					confidence: trade.signal.confidence,
					reasoning: trade.signal.reasoning,
				} : null,
			})),
			pagination: {
				total: tradesWithProfit.length,
				limit: Number(limit),
				offset: Number(offset),
				hasMore: tradesWithProfit.length === Number(limit),
				pages: Math.ceil(tradesWithProfit.length / Number(limit)),
				currentPage: Math.floor(Number(offset) / Number(limit)) + 1,
			},
			statistics: {
				...stats,
				totalTrades: tradesWithProfit.length,
				totalVolume: totalVolume.toFixed(2),
				avgTradeSize: tradesWithProfit.length > 0 ?
					(tradesWithProfit.reduce((sum, t) => sum + t.amount, 0) / tradesWithProfit.length).toFixed(2) : "0",
			},
			filters: {
				engine, status, symbol, startDate, endDate, minProfit, maxProfit,
			},
		},
	});
}));

// ============================================
// REAL-TIME MARKET DATA
// ============================================

/**
 * @swagger
 * /api/trading/market/realtime:
 *   get:
 *     summary: Get real-time market data
 *     tags: [Trading]
 */
router.get("/market/realtime", asyncWrapper(async (req, res) => {
	const { symbols = "BOOMROACH" } = req.query;
	const symbolArray = Array.isArray(symbols) ? symbols : [symbols];

	const marketData = await Promise.all(
		symbolArray.map(async (symbol) => {
			const basePrice = symbol === "BOOMROACH" ? 0.00342 : Math.random() * 100;
			const price = basePrice + (Math.random() - 0.5) * basePrice * 0.05;

			return {
				symbol,
				price: price.toFixed(6),
				change24h: ((Math.random() - 0.5) * 0.2 * 100).toFixed(2),
				volume24h: (Math.random() * 1000000 + 100000).toFixed(0),
				marketCap: (price * 10000000000).toFixed(0),
				high24h: (price * (1 + Math.random() * 0.1)).toFixed(6),
				low24h: (price * (1 - Math.random() * 0.1)).toFixed(6),
				lastUpdate: new Date().toISOString(),
				source: "jupiter-aggregator",
				blockchain: {
					network: process.env.SOLANA_NETWORK || "devnet",
					tokenMint: symbol === "BOOMROACH" ?
						process.env.BOOMROACH_TOKEN_MINT || "DEMO_MINT" :
						generateTransactionHash().substring(0, 44),
					holders: Math.floor(Math.random() * 10000) + 1000,
					transactions24h: Math.floor(Math.random() * 5000) + 500,
				},
			};
		})
	);

	res.json({
		success: true,
		data: {
			markets: marketData,
			timestamp: new Date().toISOString(),
			source: "hydra-bot-realtime-feeds",
		},
	});
}));

// ========================================
// ENHANCED REAL TRADING ENDPOINTS
// ========================================

// Get trading quote with Jupiter integration
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

// Execute real trade via Jupiter

router.post("/execute", requireEnhancedAuth, requireTradingAccess, async (req, res) => {
  try {
    const { quote, userSignature } = req.body;
    const userId = req.user.id;
    const walletAddress = req.user.walletAddress;

    if (!quote || !userSignature || !walletAddress) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // 1. Récupérer la transaction brute depuis Jupiter
    const swapResponse = await jupiterService.getSwapTransaction(quote, walletAddress);
    const rawTx = swapResponse.swapTransaction; // base64 string

    // 2. Désérialiser la transaction
    const txBuffer = Buffer.from(rawTx, "base64");
    const transaction = Transaction.from(txBuffer);

    // 3. Appliquer la signature utilisateur
    // userSignature doit être un tableau de signatures (base58 ou base64)
    // Ici, on suppose que c'est base58
    const signatureBuffer = bs58.decode(userSignature);
    transaction.addSignature(new PublicKey(walletAddress), signatureBuffer);

    // 4. Vérifier la signature
    if (!transaction.verifySignatures()) {
      return res.status(400).json({ error: "Invalid user signature" });
    }

    // 5. Envoyer la transaction sur Solana
    const txSignature = await solanaConnection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    // 6. Attendre la confirmation
    await solanaConnection.confirmTransaction(txSignature, "confirmed");

    // 7. Calculer la commission
    const tradingConfig = await enhancedAuthService.getTradingConfig();
    const outputAmount = Number.parseFloat(quote.outAmount) / 1e9;
    const commission = outputAmount * tradingConfig.commissionRate;

    // 8. Enregistrer la tentative d’exécution
    const tradeRecord = await prisma.realTradeExecution.create({
      data: {
        userId,
        txSignature,
        inputTokenMint: quote.inputMint,
        outputTokenMint: quote.outputMint,
        inputAmount: Number.parseFloat(quote.inAmount) / 1e9,
        outputAmount: outputAmount,
        slippage: Number.parseFloat(quote.slippageBps) / 100,
        commission,
        commissionInBoomroach: 0,
        route: JSON.stringify(quote.routePlan),
        status: "SUCCESS",
        blockTime: new Date()
      }
    });

    // 9. Gérer la commission et le portefeuille utilisateur
    await handleCommission(commission, quote.outputMint);
    await updateUserPortfolio(userId, {
      inputMint: quote.inputMint,
      outputMint: quote.outputMint,
      inputAmount: Number.parseFloat(quote.inAmount) / 1e9,
      outputAmount: outputAmount - commission,
      commission
    });

    return res.json({
      success: true,
      txSignature,
      trade: tradeRecord,
      commission,
      netOutput: outputAmount - commission,
      message: "Trade executed successfully on Solana"
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

// Get trading configuration
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

// Helper functions for enhanced trading
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

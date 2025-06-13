import { PrismaClient } from "@prisma/client";
import express from "express";
import { z } from "zod";
import { asyncWrapper } from "../middleware/error-handler";
import { PriceService } from "../services/price";
import { ApiError } from "../../../shared/utils/errors";
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();
router.use(authenticateToken);
router.use(requireVerified);
router.use(requireLevel);

// Validation schemas
const symbolSchema = z.object({
	symbol: z.string().min(1),
});

const historySchema = z.object({
	symbol: z.string().min(1),
	hours: z.number().min(1).max(168).optional().default(24), // Max 7 days
});

/**
 * @swagger
 * /api/prices/current:
 *   get:
 *     summary: Get current prices for all tracked tokens
 *     tags: [Prices]
 *     responses:
 *       200:
 *         description: Current prices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                       price:
 *                         type: number
 *                       change24h:
 *                         type: number
 *                       volume24h:
 *                         type: number
 *                       high24h:
 *                         type: number
 *                       low24h:
 *                         type: number
 *                       marketCap:
 *                         type: number
 *                       source:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
router.get(
	"/current",
	asyncWrapper(async (req, res) => {
		try {
			// Use PriceService instead of prisma.priceData
			const currentPrices = await PriceService.getCurrentPrices();

			res.json({
				success: true,
				prices: currentPrices,
			});
		} catch (error) {
			throw new ApiError(500, "Failed to fetch current prices");
		}
	}),
);

/**
 * @swagger
 * /api/prices/{symbol}:
 *   get:
 *     summary: Get current price for a specific token
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Token symbol (e.g., SOL/USDC)
 *     responses:
 *       200:
 *         description: Price data retrieved successfully
 *       404:
 *         description: Symbol not found
 */
router.get(
	"/:symbol",
	asyncWrapper(async (req, res) => {
		const { symbol } = req.params;

		// Use PriceService instead of prisma.priceData
		const latestPrice = await PriceService.getPrice(symbol);

		if (!latestPrice) {
			throw new ApiError(404, `Price data not found for symbol: ${symbol}`);
		}

		res.json({
			success: true,
			price: latestPrice,
		});
	}),
);

/**
 * @swagger
 * /api/prices/{symbol}/history:
 *   get:
 *     summary: Get price history for a specific token
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *           default: 24
 *         description: Number of hours of history to retrieve
 *     responses:
 *       200:
 *         description: Price history retrieved successfully
 *       404:
 *         description: Symbol not found
 */
router.get(
	"/:symbol/history",
	asyncWrapper(async (req, res) => {
		const { symbol } = req.params;
		const { hours = 24 } = req.query;

		// Use PriceService instead of prisma.priceData
		const priceHistory = await PriceService.getPriceHistory(
			symbol,
			Number(hours),
		);

		res.json({
			success: true,
			history: priceHistory,
		});
	}),
);

/**
 * @swagger
 * /api/prices/market/summary:
 *   get:
 *     summary: Get market summary statistics
 *     tags: [Prices]
 *     responses:
 *       200:
 *         description: Market summary retrieved successfully
 */
router.get(
	"/market/summary",
	asyncWrapper(async (req, res) => {
		const summary = await PriceService.getMarketSummary();

		res.json({
			success: true,
			summary,
		});
	}),
);

/**
 * @swagger
 * /api/prices/trading-pairs:
 *   get:
 *     summary: Get all available trading pairs
 *     tags: [Prices]
 *     responses:
 *       200:
 *         description: Trading pairs retrieved successfully
 */
router.get(
	"/trading-pairs",
	asyncWrapper(async (req, res) => {
		const symbols = await PriceService.getTradingPairs();

		res.json({
			success: true,
			pairs: symbols,
		});
	}),
);

/**
 * @swagger
 * /api/prices/alerts:
 *   post:
 *     summary: Create a price alert
 *     tags: [Prices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symbol
 *               - targetPrice
 *               - condition
 *             properties:
 *               symbol:
 *                 type: string
 *               targetPrice:
 *                 type: number
 *               condition:
 *                 type: string
 *                 enum: [above, below]
 *     responses:
 *       201:
 *         description: Price alert created successfully
 *       400:
 *         description: Invalid input
 */
router.post(
	"/alerts",
	asyncWrapper(async (req, res) => {
		// Placeholder for price alerts
		res.json({
			success: true,
			message: "Price alert created",
		});
	}),
);

/**
 * @swagger
 * /api/prices/ws-stats:
 *   get:
 *     summary: Get WebSocket subscription statistics
 *     tags: [Prices]
 *     responses:
 *       200:
 *         description: WebSocket stats retrieved successfully
 */
router.get(
	"/ws-stats",
	asyncWrapper(async (req, res) => {
		const stats = await PriceService.getWebSocketStats();

		res.json({
			success: true,
			stats,
		});
	}),
);

export default router;

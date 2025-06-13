import express from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../shared/utils/logger';
import { wsService } from '../services/websocket';
import { notifyTradeExecution, notifyProfitLoss } from '../services/telegram-bot';
import { Router } from 'express';
import { HydraBotService } from '../services/hydra-bot';
import { TelegramService } from '../services/telegram-bot';
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';


import { asyncWrapper, createValidationError} from "../middleware/error-handler";
import { mlTradingService } from "../services/ml-trading";


const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireVerified);
router.use(requireLevel);


/**
 * @swagger
 * /api/ml/predict/price:
 *   post:
 *     summary: Generate price predictions using ML algorithms
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol]
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: "BTC/USDT"
 *                 description: Trading pair symbol
 *               timeHorizon:
 *                 type: integer
 *                 default: 60
 *                 example: 60
 *                 description: Prediction time horizon in minutes
 *     responses:
 *       200:
 *         description: Price prediction generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PricePrediction'
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
	"/predict/price",
	asyncWrapper(async (req, res) => {
		const { symbol, timeHorizon = 60 } = req.body;

		if (!symbol) {
			throw createValidationError("Symbol is required", "symbol", symbol);
		}

		if (timeHorizon < 1 || timeHorizon > 1440) {
			throw createValidationError(
				"Time horizon must be between 1 and 1440 minutes",
				"timeHorizon",
				timeHorizon,
			);
		}

		const prediction = await mlTradingService.predictPrice(symbol, timeHorizon);

		logger.info("Price prediction requested", {
			symbol,
			timeHorizon,
			confidence: prediction.confidence,
			trend: prediction.trend,
		});

		res.json({
			success: true,
			data: prediction,
		});
	}),
);

/**
 * @swagger
 * /api/ml/patterns:
 *   post:
 *     summary: Detect trading patterns using AI pattern recognition
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol]
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: "ETH/USDT"
 *                 description: Trading pair symbol
 *     responses:
 *       200:
 *         description: Pattern detection completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PatternDetection'
 */
router.post(
	"/patterns",
	asyncWrapper(async (req, res) => {
		const { symbol } = req.body;

		if (!symbol) {
			throw createValidationError("Symbol is required", "symbol", symbol);
		}

		const patterns = await mlTradingService.detectPatterns(symbol);

		logger.info("Pattern detection requested", {
			symbol,
			patternsFound: patterns.patterns.length,
			marketCondition: patterns.marketCondition,
		});

		res.json({
			success: true,
			data: patterns,
		});
	}),
);

/**
 * @swagger
 * /api/ml/sentiment:
 *   post:
 *     summary: Analyze market sentiment using AI sentiment analysis
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol]
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: "DOGE/USDT"
 *                 description: Trading pair symbol
 *     responses:
 *       200:
 *         description: Sentiment analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SentimentAnalysis'
 */
router.post(
	"/sentiment",
	asyncWrapper(async (req, res) => {
		const { symbol } = req.body;

		if (!symbol) {
			throw createValidationError("Symbol is required", "symbol", symbol);
		}

		const sentiment = await mlTradingService.analyzeSentiment(symbol);

		logger.info("Sentiment analysis requested", {
			symbol,
			sentiment: sentiment.sentiment,
			overallSentiment: sentiment.overallSentiment,
		});

		res.json({
			success: true,
			data: sentiment,
		});
	}),
);

/**
 * @swagger
 * /api/ml/risk-assessment:
 *   post:
 *     summary: Perform AI-powered risk assessment for trading positions
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, portfolioValue, positionSize]
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: "BTC/USDT"
 *                 description: Trading pair symbol
 *               portfolioValue:
 *                 type: number
 *                 example: 50000
 *                 description: Total portfolio value in USD
 *               positionSize:
 *                 type: number
 *                 example: 5000
 *                 description: Proposed position size in USD
 *     responses:
 *       200:
 *         description: Risk assessment completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RiskAssessment'
 */
router.post(
	"/risk-assessment",
	asyncWrapper(async (req, res) => {
		const { symbol, portfolioValue, positionSize } = req.body;

		if (!symbol) {
			throw createValidationError("Symbol is required", "symbol", symbol);
		}

		if (!portfolioValue || portfolioValue <= 0) {
			throw createValidationError(
				"Valid portfolio value is required",
				"portfolioValue",
				portfolioValue,
			);
		}

		if (!positionSize || positionSize <= 0) {
			throw createValidationError(
				"Valid position size is required",
				"positionSize",
				positionSize,
			);
		}

		if (positionSize > portfolioValue) {
			throw createValidationError(
				"Position size cannot exceed portfolio value",
				"positionSize",
				positionSize,
			);
		}

		const riskAssessment = await mlTradingService.assessRisk(
			symbol,
			portfolioValue,
			positionSize,
		);

		logger.info("Risk assessment requested", {
			symbol,
			portfolioValue,
			positionSize,
			riskLevel: riskAssessment.riskLevel,
			riskScore: riskAssessment.riskScore,
		});

		res.json({
			success: true,
			data: riskAssessment,
		});
	}),
);

/**
 * @swagger
 * /api/ml/market-data/{symbol}:
 *   get:
 *     summary: Get historical market data for ML analysis
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         example: "BTC/USDT"
 *         description: Trading pair symbol
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of data points to return
 *     responses:
 *       200:
 *         description: Market data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     symbol:
 *                       type: string
 *                       example: "BTC/USDT"
 *                     dataPoints:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           price:
 *                             type: number
 *                             example: 65000.50
 *                           volume:
 *                             type: number
 *                             example: 1500000
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 */
router.get(
	"/market-data/:symbol",
	asyncWrapper(async (req, res) => {
		const { symbol } = req.params;
		const { limit = 100 } = req.query;

		if (!symbol) {
			throw createValidationError("Symbol is required", "symbol", symbol);
		}

		const marketData = mlTradingService.getMarketData(symbol);
		const limitedData = marketData.slice(-Number(limit));

		res.json({
			success: true,
			data: {
				symbol,
				dataPoints: limitedData,
				count: limitedData.length,
				lastUpdate: limitedData[limitedData.length - 1]?.timestamp,
			},
		});
	}),
);

/**
 * @swagger
 * /api/ml/comprehensive-analysis:
 *   post:
 *     summary: Get comprehensive ML analysis including predictions, patterns, sentiment, and risk
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol]
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: "SOL/USDT"
 *                 description: Trading pair symbol
 *               timeHorizon:
 *                 type: integer
 *                 default: 60
 *                 example: 60
 *                 description: Prediction time horizon in minutes
 *               portfolioValue:
 *                 type: number
 *                 example: 25000
 *                 description: Portfolio value for risk assessment (optional)
 *               positionSize:
 *                 type: number
 *                 example: 2500
 *                 description: Position size for risk assessment (optional)
 *     responses:
 *       200:
 *         description: Comprehensive analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     symbol:
 *                       type: string
 *                       example: "SOL/USDT"
 *                     prediction:
 *                       $ref: '#/components/schemas/PricePrediction'
 *                     patterns:
 *                       $ref: '#/components/schemas/PatternDetection'
 *                     sentiment:
 *                       $ref: '#/components/schemas/SentimentAnalysis'
 *                     riskAssessment:
 *                       $ref: '#/components/schemas/RiskAssessment'
 *                     recommendation:
 *                       type: object
 *                       properties:
 *                         action:
 *                           type: string
 *                           enum: [buy, sell, hold]
 *                           example: "buy"
 *                         confidence:
 *                           type: number
 *                           example: 0.75
 *                         reasoning:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["Bullish price prediction", "Positive sentiment"]
 */
router.post(
	"/comprehensive-analysis",
	asyncWrapper(async (req, res) => {
		const { symbol, timeHorizon = 60, portfolioValue, positionSize } = req.body;

		if (!symbol) {
			throw createValidationError("Symbol is required", "symbol", symbol);
		}

		// Run all ML analyses concurrently
		const [prediction, patterns, sentiment, riskAssessment] = await Promise.all(
			[
				mlTradingService.predictPrice(symbol, timeHorizon),
				mlTradingService.detectPatterns(symbol),
				mlTradingService.analyzeSentiment(symbol),
				portfolioValue && positionSize
					? mlTradingService.assessRisk(symbol, portfolioValue, positionSize)
					: null,
			],
		);

		// Generate overall recommendation
		const recommendation = generateRecommendation(
			prediction,
			patterns,
			sentiment,
			riskAssessment,
		);

		logger.info("Comprehensive ML analysis requested", {
			symbol,
			timeHorizon,
			recommendation: recommendation.action,
			confidence: recommendation.confidence,
		});

		res.json({
			success: true,
			data: {
				symbol,
				prediction,
				patterns,
				sentiment,
				riskAssessment,
				recommendation,
				timestamp: new Date().toISOString(),
			},
		});
	}),
);

/**
 * @swagger
 * /api/ml/performance:
 *   get:
 *     summary: Get ML model performance metrics and statistics
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ML performance metrics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     models:
 *                       type: object
 *                       properties:
 *                         pricePrediction:
 *                           type: object
 *                           properties:
 *                             accuracy:
 *                               type: number
 *                               example: 0.78
 *                             totalPredictions:
 *                               type: integer
 *                               example: 1250
 *                             avgConfidence:
 *                               type: number
 *                               example: 0.72
 *                         patternRecognition:
 *                           type: object
 *                           properties:
 *                             accuracy:
 *                               type: number
 *                               example: 0.73
 *                             patternsDetected:
 *                               type: integer
 *                               example: 320
 *                             avgConfidence:
 *                               type: number
 *                               example: 0.68
 *                     systemHealth:
 *                       type: object
 *                       properties:
 *                         uptime:
 *                           type: number
 *                           example: 86400
 *                         cacheHitRate:
 *                           type: number
 *                           example: 0.89
 *                         avgResponseTime:
 *                           type: number
 *                           example: 285
 *                         errorRate:
 *                           type: number
 *                           example: 0.012
 */
router.get(
	"/performance",
	asyncWrapper(async (req, res) => {
		const performance = await mlTradingService.getMLPerformance();

		res.json({
			success: true,
			data: performance,
		});
	}),
);

/**
 * @swagger
 * /api/ml/batch-analysis:
 *   post:
 *     summary: Perform batch analysis on multiple symbols
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbols]
 *             properties:
 *               symbols:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["BTC/USDT", "ETH/USDT", "SOL/USDT"]
 *                 description: Array of trading pair symbols
 *               analysisTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [prediction, patterns, sentiment]
 *                 default: ["prediction", "sentiment"]
 *                 description: Types of analysis to perform
 *               timeHorizon:
 *                 type: integer
 *                 default: 60
 *                 description: Time horizon for predictions
 *     responses:
 *       200:
 *         description: Batch analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           symbol:
 *                             type: string
 *                           prediction:
 *                             $ref: '#/components/schemas/PricePrediction'
 *                           patterns:
 *                             $ref: '#/components/schemas/PatternDetection'
 *                           sentiment:
 *                             $ref: '#/components/schemas/SentimentAnalysis'
 */
router.post(
	"/batch-analysis",
	asyncWrapper(async (req, res) => {
		const {
			symbols,
			analysisTypes = ["prediction", "sentiment"],
			timeHorizon = 60,
		} = req.body;

		if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
			throw createValidationError(
				"Symbols array is required",
				"symbols",
				symbols,
			);
		}

		if (symbols.length > 10) {
			throw createValidationError(
				"Maximum 10 symbols allowed per batch",
				"symbols",
				symbols.length,
			);
		}

		const results = await Promise.all(
			symbols.map(async (symbol: string) => {
				const result: any = { symbol };

				try {
					if (analysisTypes.includes("prediction")) {
						result.prediction = await mlTradingService.predictPrice(
							symbol,
							timeHorizon,
						);
					}

					if (analysisTypes.includes("patterns")) {
						result.patterns = await mlTradingService.detectPatterns(symbol);
					}

					if (analysisTypes.includes("sentiment")) {
						result.sentiment = await mlTradingService.analyzeSentiment(symbol);
					}

					result.success = true;
				} catch (error) {
					result.success = false;
					result.error =
						error instanceof Error ? error.message : "Unknown error";
				}

				return result;
			}),
		);

		logger.info("Batch ML analysis requested", {
			symbols: symbols.length,
			analysisTypes,
			timeHorizon,
		});

		res.json({
			success: true,
			data: {
				results,
				summary: {
					totalSymbols: symbols.length,
					successful: results.filter((r) => r.success).length,
					failed: results.filter((r) => !r.success).length,
					timestamp: new Date().toISOString(),
				},
			},
		});
	}),
);

// Helper function to generate trading recommendations
function generateRecommendation(
	prediction: any,
	patterns: any,
	sentiment: any,
	riskAssessment: any,
): {
	action: "buy" | "sell" | "hold";
	confidence: number;
	reasoning: string[];
} {
	const reasoning: string[] = [];
	let score = 0;
	let confidence = 0;

	// Price prediction factor (40% weight)
	if (prediction.trend === "bullish") {
		score += 0.4 * prediction.confidence;
		reasoning.push(
			`Bullish price prediction (${(prediction.confidence * 100).toFixed(1)}% confidence)`,
		);
	} else if (prediction.trend === "bearish") {
		score -= 0.4 * prediction.confidence;
		reasoning.push(
			`Bearish price prediction (${(prediction.confidence * 100).toFixed(1)}% confidence)`,
		);
	}

	// Pattern analysis factor (25% weight)
	const bullishPatterns = patterns.patterns.filter(
		(p: any) => p.name.includes("Bull") || p.name.includes("Support"),
	);
	const bearishPatterns = patterns.patterns.filter(
		(p: any) =>
			p.name.includes("Bear") ||
			p.name.includes("Head") ||
			p.name.includes("Double Top"),
	);

	if (bullishPatterns.length > 0) {
		const avgConfidence =
			bullishPatterns.reduce((sum: number, p: any) => sum + p.confidence, 0) /
			bullishPatterns.length;
		score += 0.25 * avgConfidence;
		reasoning.push(`${bullishPatterns.length} bullish pattern(s) detected`);
	}

	if (bearishPatterns.length > 0) {
		const avgConfidence =
			bearishPatterns.reduce((sum: number, p: any) => sum + p.confidence, 0) /
			bearishPatterns.length;
		score -= 0.25 * avgConfidence;
		reasoning.push(`${bearishPatterns.length} bearish pattern(s) detected`);
	}

	// Sentiment factor (25% weight)
	score += 0.25 * sentiment.overallSentiment;
	reasoning.push(`${sentiment.sentiment} market sentiment`);

	// Risk factor (10% weight)
	if (riskAssessment) {
		if (riskAssessment.riskLevel === "low") {
			score += 0.1;
			reasoning.push("Low risk assessment");
		} else if (riskAssessment.riskLevel === "high") {
			score -= 0.1;
			reasoning.push("High risk detected");
		}
	}

	// Calculate confidence based on data quality
	confidence = Math.min(
		0.95,
		Math.max(
			0.3,
			(prediction.confidence +
				sentiment.overallSentiment +
				patterns.patterns.length * 0.1) /
				3,
		),
	);

	// Determine action
	let action: "buy" | "sell" | "hold";
	if (score > 0.2) {
		action = "buy";
	} else if (score < -0.2) {
		action = "sell";
	} else {
		action = "hold";
		reasoning.push("Mixed signals suggest holding position");
	}

	return { action, confidence, reasoning };
}

export default router;

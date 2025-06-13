import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "BoomRoach 2025 Trading Platform API",
			version: "3.0.0",
			description: `
        Comprehensive API documentation for the BoomRoach 2025 advanced meme coin trading platform.

        ## Features
        - 🔐 JWT Authentication with refresh tokens
        - 💰 Advanced trading engines (Sniper, Re-entry, AI Signals, Guardian)
        - 🤖 Machine Learning algorithms for price prediction and pattern recognition
        - 📊 Real-time WebSocket data streaming
        - 📈 Portfolio and position management
        - 🏆 Leaderboards and social trading features
        - ⚠️ Advanced risk management

        ## Getting Started
        1. Register a new account at \`/api/auth/register\`
        2. Login to get your JWT token at \`/api/auth/login\`
        3. Use the token in the Authorization header: \`Bearer <token>\`
        4. Explore trading engines and ML features

        ## Rate Limits
        - General API: 1000 requests per 15 minutes
        - Trading API: 100 requests per minute
        - ML API: 50 requests per minute
      `,
			contact: {
				name: "BoomRoach Team",
				email: "support@boomroach.wales",
				url: "https://boomroach.wales",
			},
			license: {
				name: "MIT",
				url: "https://opensource.org/licenses/MIT",
			},
		},
		servers: [
			{
				url: "http://localhost:3001",
				description: "Development server",
			},
			{
				url: "https://api.boomroach.wales",
				description: "Production server",
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
					description: "JWT token obtained from login endpoint",
				},
				apiKeyAuth: {
					type: "apiKey",
					in: "header",
					name: "X-API-Key",
					description: "API key for service-to-service communication",
				},
			},
			schemas: {
				// User Models
				User: {
					type: "object",
					properties: {
						id: { type: "string", example: "user_123" },
						username: { type: "string", example: "trader_joe" },
						email: {
							type: "string",
							format: "email",
							example: "joe@example.com",
						},
						walletAddress: {
							type: "string",
							example: "YmGKDfzgMK76xSVLjkmXCeVfK42TQ3r5JHaYEVcCpNBi",
						},
						level: { type: "integer", example: 15 },
						experience: { type: "integer", example: 12500 },
						totalTrades: { type: "integer", example: 456 },
						winRate: { type: "number", example: 0.75 },
						totalProfit: { type: "number", example: 25000.5 },
						reputation: { type: "integer", example: 850 },
						subscription: {
							type: "string",
							enum: ["free", "premium", "vip"],
							example: "premium",
						},
						isActive: { type: "boolean", example: true },
						emailVerified: { type: "boolean", example: true },
						twoFactorEnabled: { type: "boolean", example: false },
						joinedAt: { type: "string", format: "date-time" },
						lastLoginAt: { type: "string", format: "date-time" },
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
					},
				},

				// Authentication Models
				LoginRequest: {
					type: "object",
					required: ["identifier", "password"],
					properties: {
						identifier: {
							type: "string",
							description: "Email or username",
							example: "trader_joe",
						},
						password: {
							type: "string",
							format: "password",
							example: "SecurePassword123!",
						},
					},
				},

				RegisterRequest: {
					type: "object",
					required: ["username", "email", "password", "confirmPassword"],
					properties: {
						username: {
							type: "string",
							minLength: 3,
							maxLength: 20,
							example: "trader_joe",
						},
						email: {
							type: "string",
							format: "email",
							example: "joe@example.com",
						},
						password: {
							type: "string",
							minLength: 8,
							example: "SecurePassword123!",
						},
						confirmPassword: { type: "string", example: "SecurePassword123!" },
						walletAddress: {
							type: "string",
							description: "Optional Solana wallet address",
						},
					},
				},

				AuthResponse: {
					type: "object",
					properties: {
						success: { type: "boolean", example: true },
						message: { type: "string", example: "Login successful" },
						data: {
							type: "object",
							properties: {
								user: { $ref: "#/components/schemas/User" },
								tokens: {
									type: "object",
									properties: {
										accessToken: {
											type: "string",
											example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
										},
										refreshToken: {
											type: "string",
											example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
										},
										expiresIn: { type: "string", example: "7d" },
									},
								},
							},
						},
					},
				},

				// Trading Models
				TradingEngine: {
					type: "object",
					properties: {
						id: { type: "string", example: "sniper" },
						name: { type: "string", example: "Sniper Engine" },
						description: {
							type: "string",
							example:
								"Lightning-fast new token detection and automated buying",
						},
						status: {
							type: "string",
							enum: ["active", "inactive"],
							example: "active",
						},
						riskLevel: {
							type: "string",
							enum: ["low", "medium", "high"],
							example: "high",
						},
						targetWinRate: { type: "number", example: 0.78 },
						avgExecutionTime: { type: "number", example: 1.2 },
						minInvestment: { type: "number", example: 100 },
						maxPositionSize: { type: "number", example: 50000 },
						fees: { type: "number", example: 0.015 },
						features: {
							type: "array",
							items: { type: "string" },
							example: ["auto-buy", "honeypot-detection"],
						},
						metrics: {
							type: "object",
							properties: {
								trades: { type: "integer", example: 156 },
								winRate: { type: "number", example: 0.82 },
								dailyPnL: { type: "number", example: 2450.75 },
								lastUpdate: { type: "string", format: "date-time" },
							},
						},
					},
				},

				Trade: {
					type: "object",
					properties: {
						id: { type: "string", example: "trade_123" },
						symbol: { type: "string", example: "BOOMROACH" },
						side: { type: "string", enum: ["buy", "sell"], example: "buy" },
						amount: { type: "number", example: 1000 },
						price: { type: "number", example: 0.00342 },
						engine: { type: "string", example: "sniper" },
						status: {
							type: "string",
							enum: ["pending", "filled", "cancelled", "rejected"],
							example: "filled",
						},
						profit: { type: "number", example: 125.5 },
						timestamp: { type: "string", format: "date-time" },
						userId: { type: "string", example: "user_123" },
						transactionHash: { type: "string", example: "A1B2C3D4E5F6..." },
						gasUsed: { type: "integer", example: 1500 },
						fees: { type: "number", example: 0.015 },
					},
				},

				PlaceTradeRequest: {
					type: "object",
					required: ["symbol", "side", "amount", "engine"],
					properties: {
						symbol: { type: "string", example: "BOOMROACH" },
						side: { type: "string", enum: ["buy", "sell"], example: "buy" },
						amount: { type: "number", minimum: 1, example: 1000 },
						price: {
							type: "number",
							description: "Optional for market orders",
						},
						engine: {
							type: "string",
							enum: ["sniper", "reentry", "ai-signals", "guardian"],
							example: "sniper",
						},
						orderType: {
							type: "string",
							enum: ["market", "limit"],
							default: "market",
						},
						slippage: { type: "number", minimum: 0, maximum: 1, default: 0.01 },
					},
				},

				// ML Models
				PricePrediction: {
					type: "object",
					properties: {
						symbol: { type: "string", example: "BTC/USDT" },
						currentPrice: { type: "number", example: 65000.5 },
						predictedPrice: { type: "number", example: 66500.25 },
						timeHorizon: { type: "integer", example: 60 },
						confidence: { type: "number", example: 0.78 },
						trend: {
							type: "string",
							enum: ["bullish", "bearish", "neutral"],
							example: "bullish",
						},
						factors: {
							type: "object",
							properties: {
								technical: { type: "number", example: 0.65 },
								sentiment: { type: "number", example: 0.72 },
								volume: { type: "number", example: 0.58 },
							},
						},
						timestamp: { type: "string", format: "date-time" },
					},
				},

				PatternDetection: {
					type: "object",
					properties: {
						symbol: { type: "string", example: "ETH/USDT" },
						patterns: {
							type: "array",
							items: {
								type: "object",
								properties: {
									name: { type: "string", example: "Bull Flag" },
									confidence: { type: "number", example: 0.85 },
									timeframe: { type: "string", example: "1h" },
									priceTarget: { type: "number", example: 3250.0 },
									probability: { type: "number", example: 0.72 },
								},
							},
						},
						marketCondition: {
							type: "string",
							enum: ["bullish", "bearish", "sideways"],
							example: "bullish",
						},
						timestamp: { type: "string", format: "date-time" },
					},
				},

				SentimentAnalysis: {
					type: "object",
					properties: {
						symbol: { type: "string", example: "DOGE/USDT" },
						overallSentiment: {
							type: "number",
							minimum: -1,
							maximum: 1,
							example: 0.65,
						},
						sentiment: {
							type: "string",
							enum: [
								"very_bearish",
								"bearish",
								"neutral",
								"bullish",
								"very_bullish",
							],
							example: "bullish",
						},
						sources: {
							type: "object",
							properties: {
								news: { type: "number", example: 0.72 },
								social: { type: "number", example: 0.58 },
								technical: { type: "number", example: 0.65 },
							},
						},
						volume: { type: "integer", example: 1250 },
						timestamp: { type: "string", format: "date-time" },
					},
				},

				RiskAssessment: {
					type: "object",
					properties: {
						symbol: { type: "string", example: "BTC/USDT" },
						riskLevel: {
							type: "string",
							enum: ["low", "medium", "high"],
							example: "medium",
						},
						riskScore: {
							type: "number",
							minimum: 0,
							maximum: 10,
							example: 4.5,
						},
						metrics: {
							type: "object",
							properties: {
								valueAtRisk: { type: "number", example: -1250.5 },
								maxDrawdown: { type: "number", example: 0.15 },
								volatility: { type: "number", example: 0.25 },
								beta: { type: "number", example: 1.2 },
							},
						},
						recommendations: {
							type: "object",
							properties: {
								positionSize: { type: "number", example: 2500 },
								stopLoss: { type: "number", example: 0.05 },
								riskReward: { type: "number", example: 2.5 },
							},
						},
						timestamp: { type: "string", format: "date-time" },
					},
				},

				// Portfolio Models
				Portfolio: {
					type: "object",
					properties: {
						id: { type: "string", example: "portfolio_123" },
						userId: { type: "string", example: "user_123" },
						totalValue: { type: "number", example: 50000.75 },
						totalPnL: { type: "number", example: 12500.5 },
						dailyPnL: { type: "number", example: 450.25 },
						positions: {
							type: "array",
							items: {
								type: "object",
								properties: {
									symbol: { type: "string", example: "BTC/USDT" },
									quantity: { type: "number", example: 0.5 },
									avgPrice: { type: "number", example: 65000 },
									currentPrice: { type: "number", example: 66500 },
									unrealizedPnL: { type: "number", example: 750 },
								},
							},
						},
						performance: {
							type: "object",
							properties: {
								winRate: { type: "number", example: 0.72 },
								sharpeRatio: { type: "number", example: 1.85 },
								maxDrawdown: { type: "number", example: 0.12 },
							},
						},
					},
				},

				// Error Models
				Error: {
					type: "object",
					properties: {
						error: {
							type: "object",
							properties: {
								message: { type: "string", example: "Validation failed" },
								code: { type: "string", example: "VALIDATION_ERROR" },
								statusCode: { type: "integer", example: 400 },
								requestId: { type: "string", example: "req_123" },
								timestamp: { type: "string", format: "date-time" },
								details: {
									type: "object",
									description: "Additional error details",
								},
							},
						},
					},
				},

				// Health Models
				HealthCheck: {
					type: "object",
					properties: {
						status: { type: "string", example: "healthy" },
						timestamp: { type: "string", format: "date-time" },
						version: { type: "string", example: "3.0.0" },
						environment: { type: "string", example: "production" },
						uptime: { type: "number", example: 86400 },
						memory: {
							type: "object",
							properties: {
								rss: { type: "integer" },
								heapTotal: { type: "integer" },
								heapUsed: { type: "integer" },
								external: { type: "integer" },
							},
						},
						database: {
							type: "object",
							properties: {
								status: { type: "string", example: "connected" },
								provider: { type: "string", example: "postgresql" },
							},
						},
						websocket: {
							type: "object",
							properties: {
								enabled: { type: "boolean", example: true },
								connections: { type: "integer", example: 0 },
							},
						},
					},
				},
			},
		},
		tags: [
			{
				name: "Authentication",
				description: "🔐 User authentication and account management",
			},
			{
				name: "Trading",
				description: "💰 Trading engines and execution",
			},
			{
				name: "Machine Learning",
				description: "🤖 AI-powered trading algorithms and predictions",
			},
			{
				name: "Portfolio",
				description: "📊 Portfolio and position management",
			},
			{
				name: "Market Data",
				description: "📈 Real-time and historical market data",
			},
			{
				name: "WebSocket",
				description: "⚡ Real-time data streaming",
			},
			{
				name: "Analytics",
				description: "📊 Performance metrics and reporting",
			},
			{
				name: "System",
				description: "🔧 Health checks and system monitoring",
			},
		],
	},
	apis: ["./src/routes/*.ts", "./src/server.ts"],
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };

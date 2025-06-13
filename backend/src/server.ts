// BoomRoach Backend - Express Only (no Hono, no double definition)

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import path from "path";
import { PrismaClient } from "@prisma/client";
import logger from "../../shared/utils/logger";
import { errorHandler } from "./middleware/error-handler";
import { performanceMiddleware, requestIdMiddleware } from "./middleware/performance";
import {
  corsOptions,
  helmetOptions,
  rateLimiters,
  speedLimiter,
  sanitizeInput,
  securityHeaders,
  requestLogger,
} from "./middleware/security";
import { authMiddleware } from './middleware/auth';
console.log("🔥 DEBUG: Security middleware imported");

// Services
import { WebSocketService } from './services/websocket';
import { PriceService } from "./services/price";
import { solanaHealth } from "./services/solana-compatible";
import { emailService } from "./services/email";
import { jupiterDEXService } from "./services/jupiter-dex";
console.log("🔥 DEBUG: WebSocket, Email, Jupiter DEX services imported");

// Routers
import authRouter from "./routes/auth";
import usersRouter from './routes/users';
import adminRouter from './routes/admin';
import guildRouter from './routes/guilds';
import questRouter from './routes/quests';
import socialRouter from './routes/social';
import hydrabotRouter from './routes/hydra-bot-api';
import tradingRouter from './routes/trading';
import telegramRouter from './routes/telegram';
import achievementsRouter from './routes/achievements';
import mlTradingRouter from './routes/ml-trading';
import pricesRouter from './routes/prices';
import crudRouter from './routes/enhanced-crud';
import realSolanaRouter from './routes/real-solana-routes';
import modelRegistryRouter from './routes/model-registry';
console.log("🔥 DEBUG: Routes successfully imported");

// Environment
const PORT = Number.parseInt(process.env.PORT || '5000');
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🚀 Environment loaded ! Starting BoomRoach Full-Stack Backend...');

// Express app & HTTP server
const app = express();
const server = createServer(app);

// Prisma (async initialization)
const prisma = new PrismaClient();
console.log("🔥 DEBUG: Express app created, Http server configured and PrismaClient imported");

let wsService: WebSocketService | undefined;

// --- Database service initialization ---
const initializeDatabase = async () => {
  try {
    logger.info("💾 Connecting to database...");
    await prisma.$connect();
    logger.info("✅ Database connected successfully");
    return true;
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    return false;
  }
};

// --- WebSocket Service initialization ---
const initializeWebSocketService = () => {
  try {
    wsService = new WebSocketService(server);
    logger.info("🔗 WebSocket service initialized with Hydra-Bot features");
  } catch (error) {
    logger.error("❌ Failed to initialize WebSocket service:", error);
  }
};

// --- Middleware setup ---
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(helmet(helmetOptions));
app.use(cors(corsOptions));
app.use(requestLogger);
app.use(speedLimiter);
app.use(sanitizeInput);
app.use(express.json({
  limit: "2mb",
  verify: (req, res, buf) => {
    if (buf.length === 0) throw new Error("Empty request body");
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: "2mb",
  parameterLimit: 100,
}));
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => req.headers['x-no-compression'] ? false : compression.filter(req, res)
}));
app.use(requestIdMiddleware);
app.use(performanceMiddleware);

// --- Rate limiting (global, puis par route) ---
app.use(rateLimiters.general);

// --- Static frontend (production only) ---
if (NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
  });
}

// --- Public routes ---
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "boomroach-server-5.0.0",
    hydraBot: {
      status: "integrated",
      websocket: wsService?.getConnectionCount?.() ?? 0,
    },
    services: {
      database: "connected",
      email: emailService ? "configured" : "not-configured",
      websocket: wsService ? "running" : "disabled",
      solana: solanaHealth ? "connected" : "disconnected",
      jupiter: jupiterDEXService?.isLiveMode?.() ? "live" : "demo"
    },
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "🚀 BoomRoach Working Backend API",
    version: "working-2.0.0",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      trading: "/api/trading",
      users: "/api/users",
      guilds: "/api/guilds",
      social: "/api/social",
      quests: "/api/quests",
      prices: "/api/prices",
      mlTrading: "/api/ml-trading",
      hydraBot: "/api/hydra-bot-api",
      telegram: "/api/telegram",
      achievements: "/api/achievements",
      crud: "/api/crud",
      solana: "/api/solana",
    },
    websocket: `ws://localhost:${PORT}`,
    note: "Version with Solana dependencies for production",
  });
});

// --- Feature & protected routes (rate limiters par type) ---
app.use("/api/auth", rateLimiters.auth, authRouter);
app.use("/api/admin", rateLimiters.admin, authMiddleware, adminRouter);
app.use("/api/users", rateLimiters.auth, authMiddleware, usersRouter);
app.use("/api/guilds", rateLimiters.general, authMiddleware, guildRouter);
app.use("/api/quests", rateLimiters.general, authMiddleware, questRouter);
app.use("/api/social", rateLimiters.general, authMiddleware, socialRouter);
app.use("/api/hydra-bot-api", rateLimiters.general, authMiddleware, hydrabotRouter);
app.use("/api/trading", rateLimiters.trading, authMiddleware, tradingRouter);
app.use("/api/achievements", rateLimiters.general, authMiddleware, achievementsRouter);
app.use("/api/ml-trading", rateLimiters.ml, authMiddleware, mlTradingRouter);
app.use("/api/prices", rateLimiters.general, authMiddleware, pricesRouter);
app.use("/api/crud", rateLimiters.general, authMiddleware, crudRouter);
app.use("/api/solana", rateLimiters.trading, authMiddleware, realSolanaRouter);
app.use("/api/telegram", rateLimiters.general, authMiddleware, telegramRouter);
app.use("/api/models", rateLimiters.ml, authMiddleware, modelRegistryRouter);

// --- Error Handling ---
app.use(errorHandler);
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggestion: "Check /api for available endpoints",
  });
});

// --- Startup Sequence ---
const startServer = async () => {
  logger.info("🚀 Booting BoomRoach backend...");
  const dbConnected = await initializeDatabase();
  if (!dbConnected) {
    logger.error('❌ Failed to connect to database, exiting...');
    process.exit(1);
  }
  initializeWebSocketService();

  server.listen(PORT, () => {
    logger.info(`🚀 BoomRoach Backend running on port ${PORT}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    logger.info(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
    logger.info(`📈 Trading API: http://localhost:${PORT}/api/trading`);
    logger.info(`👤 User API: http://localhost:${PORT}/api/users`);
    logger.info(`🤖 Hydra Bot API: http://localhost:${PORT}/api/hydra-bot-api`);
    logger.info(`💰 Prices API: http://localhost:${PORT}/api/prices`);
    logger.info(`⚡ Solana API: http://localhost:${PORT}/api/solana`);
    logger.info(`🔗 Ready for frontend integration!`);
  });
};

startServer();

// --- Graceful shutdown ---
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    logger.info("HTTP server closed");
    await prisma.$disconnect();
    if (wsService && typeof wsService.destroy === "function") {
      wsService.destroy();
    }
    logger.info("✅ Graceful shutdown completed");
    process.exit(0);
  });
  setTimeout(() => {
    logger.error("Force shutdown after timeout");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

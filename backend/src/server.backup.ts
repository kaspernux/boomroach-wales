import { createServer } from "http";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";

console.log("🚀 Starting minimal BoomRoach server...");

const app = express();
const server = createServer(app);
const prisma = new PrismaClient();

// Basic middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());
app.use(cors());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'BoomRoach Backend API',
    version: '3.0.0',
    status: 'running'
  });
});

// Import working auth routes
import authRouter from "./routes/auth";
app.use('/api/auth', authRouter);

// Simple trading routes
app.get('/api/trading/portfolio', (req, res) => {
  res.json({
    success: true,
    data: {
      totalValue: 1000,
      assets: [],
      performance: { daily: 0, total: 0 }
    }
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Database initialization
const initializeDatabase = async () => {
  try {
    console.log("💾 Connecting to database...");
    await prisma.$connect();
    console.log("✅ Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
};

const PORT = process.env.PORT || 3001;

// Start server
const startServer = async () => {
  const dbConnected = await initializeDatabase();

  if (!dbConnected) {
    console.error("Failed to connect to database, exiting...");
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`🚀 BoomRoach Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth API available at /api/auth`);
  });
};

startServer().catch(console.error);

export default app;

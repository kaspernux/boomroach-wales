import express from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../../../shared/utils/logger';
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireVerified);
router.use(requireLevel);

// ==========================================
// USER CRUD OPERATIONS
// ==========================================

// GET /api/crud/users - List all users
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        walletAddress: true,
        tradingLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const total = await prisma.user.count();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to fetch users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// GET /api/crud/users/:id - Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        username: true,
        walletAddress: true,
        tradingLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Failed to fetch user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// POST /api/crud/users - Create new user
router.post('/users', async (req, res) => {
  try {
    const { email, username, walletAddress, tradingLevel } = req.body;

    if (!email || !username) {
      return res.status(400).json({
        success: false,
        error: 'Email and username are required'
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        username,
        walletAddress,
        tradingLevel: tradingLevel || 'Beginner',
        hashedPassword: 'temp_hash', // This would be properly hashed in real implementation
        isActive: true
      },
      select: {
        id: true,
        email: true,
        username: true,
        walletAddress: true,
        tradingLevel: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Failed to create user:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// PUT /api/crud/users/:id - Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, username, walletAddress, tradingLevel, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        email,
        username,
        walletAddress,
        tradingLevel,
        isActive,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        username: true,
        walletAddress: true,
        tradingLevel: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Failed to update user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// DELETE /api/crud/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete user:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// ==========================================
// TRADING ENGINE CRUD OPERATIONS
// ==========================================

// GET /api/crud/engines - List all trading engines
router.get('/engines', async (req, res) => {
  try {
    const engines = await prisma.tradingEngine.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: engines
    });
  } catch (error) {
    logger.error('Failed to fetch engines:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch engines' });
  }
});

// POST /api/crud/engines - Create new trading engine
router.post('/engines', async (req, res) => {
  try {
    const { name, type, parameters, isActive } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Name and type are required'
      });
    }

    const engine = await prisma.tradingEngine.create({
      data: {
        name,
        type,
        parameters: parameters || {},
        isActive: isActive !== undefined ? isActive : true,
        performance: 0,
        totalTrades: 0,
        successRate: 0
      }
    });

    res.status(201).json({
      success: true,
      data: engine
    });
  } catch (error) {
    logger.error('Failed to create engine:', error);
    res.status(500).json({ success: false, error: 'Failed to create engine' });
  }
});

// PUT /api/crud/engines/:id - Update trading engine
router.put('/engines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, parameters, isActive, performance, totalTrades, successRate } = req.body;

    const engine = await prisma.tradingEngine.update({
      where: { id: parseInt(id) },
      data: {
        name,
        type,
        parameters,
        isActive,
        performance,
        totalTrades,
        successRate,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: engine
    });
  } catch (error) {
    logger.error('Failed to update engine:', error);
    res.status(500).json({ success: false, error: 'Failed to update engine' });
  }
});

// DELETE /api/crud/engines/:id - Delete trading engine
router.delete('/engines/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.tradingEngine.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Trading engine deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete engine:', error);
    res.status(500).json({ success: false, error: 'Failed to delete engine' });
  }
});

// ==========================================
// TRANSACTION CRUD OPERATIONS
// ==========================================

// GET /api/crud/transactions - List all transactions
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where = userId ? { userId } : {};

    const transactions = await prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    const total = await prisma.transaction.count({ where });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to fetch transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

// POST /api/crud/transactions - Create new transaction
router.post('/transactions', async (req, res) => {
  try {
    const {
      userId,
      type,
      amount,
      tokenSymbol,
      pricePerToken,
      totalValue,
      txHash,
      status
    } = req.body;

    if (!userId || !type || !amount || !tokenSymbol) {
      return res.status(400).json({
        success: false,
        error: 'UserId, type, amount, and tokenSymbol are required'
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type,
        amount: parseFloat(amount),
        tokenSymbol,
        pricePerToken: pricePerToken ? parseFloat(pricePerToken) : null,
        totalValue: totalValue ? parseFloat(totalValue) : null,
        txHash,
        status: status || 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.error('Failed to create transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to create transaction' });
  }
});

// PUT /api/crud/transactions/:id - Update transaction
router.put('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, txHash, pricePerToken, totalValue } = req.body;

    const transaction = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: {
        status,
        txHash,
        pricePerToken: pricePerToken ? parseFloat(pricePerToken) : undefined,
        totalValue: totalValue ? parseFloat(totalValue) : undefined,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.error('Failed to update transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to update transaction' });
  }
});

// ==========================================
// ANALYTICS AND REPORTING
// ==========================================

// GET /api/crud/analytics/summary - Get overall analytics summary
router.get('/analytics/summary', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalEngines,
      activeEngines,
      totalTransactions,
      totalVolume
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.tradingEngine.count(),
      prisma.tradingEngine.count({ where: { isActive: true } }),
      prisma.transaction.count(),
      prisma.transaction.aggregate({
        _sum: { totalValue: true },
        where: { status: 'COMPLETED' }
      })
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers
        },
        engines: {
          total: totalEngines,
          active: activeEngines
        },
        transactions: {
          total: totalTransactions,
          volume: totalVolume._sum.totalValue || 0
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to fetch analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// GET /api/crud/analytics/performance - Get trading performance analytics
router.get('/analytics/performance', async (req, res) => {
  try {
    const engines = await prisma.tradingEngine.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        performance: true,
        totalTrades: true,
        successRate: true,
        isActive: true
      },
      orderBy: { performance: 'desc' }
    });

    const avgPerformance = engines.reduce((sum, engine) => sum + (engine.performance || 0), 0) / engines.length;
    const totalTrades = engines.reduce((sum, engine) => sum + (engine.totalTrades || 0), 0);
    const avgSuccessRate = engines.reduce((sum, engine) => sum + (engine.successRate || 0), 0) / engines.length;

    res.json({
      success: true,
      data: {
        engines,
        summary: {
          avgPerformance: Number(avgPerformance.toFixed(2)),
          totalTrades,
          avgSuccessRate: Number(avgSuccessRate.toFixed(2)),
          topPerformer: engines[0] || null
        }
      }
    });
  } catch (error) {
    logger.error('Failed to fetch performance analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance analytics' });
  }
});

export default router;

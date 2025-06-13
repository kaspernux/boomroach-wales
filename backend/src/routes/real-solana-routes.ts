import { PrismaClient } from "@prisma/client";
import express from "express";
import { RealDataIntegrationService } from '../services/real-data-integration';
import logger from '../../../shared/utils/logger';
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';


const router = express.Router();
// const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireVerified);
router.use(requireLevel);

// ==========================================
// REAL-TIME PRICE ENDPOINTS
// ==========================================

// GET /api/solana/prices/live - Get real-time token prices
router.get('/prices/live', async (req, res) => {
  try {
    const { tokens } = req.query;
    const tokenList = tokens ? (tokens as string).split(',') : ['So11111111111111111111111111111111111111112'];

    const prices = await Promise.all(
      tokenList.map(async (token) => {
        const price = await RealDataIntegrationService.getRealTimePrice(token);
        return { token, price };
      })
    );

    res.json({
      success: true,
      data: {
        prices: prices.filter(p => p.price !== null),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get live prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live prices'
    });
  }
});

// GET /api/solana/prices/boomroach - Get BOOMROACH token price
router.get('/prices/boomroach', async (req, res) => {
  try {
    const price = await RealDataIntegrationService.getBoomRoachPrice();

    if (!price) {
      return res.status(404).json({
        success: false,
        error: 'BOOMROACH price not available'
      });
    }

    res.json({
      success: true,
      data: price
    });
  } catch (error) {
    logger.error('Failed to get BOOMROACH price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch BOOMROACH price'
    });
  }
});

// GET /api/solana/prices/sol - Get Solana price
router.get('/prices/sol', async (req, res) => {
  try {
    const price = await RealDataIntegrationService.getSolanaPrice();

    if (!price) {
      return res.status(404).json({
        success: false,
        error: 'SOL price not available'
      });
    }

    res.json({
      success: true,
      data: price
    });
  } catch (error) {
    logger.error('Failed to get SOL price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SOL price'
    });
  }
});

// ==========================================
// WALLET OPERATIONS
// ==========================================

// GET /api/solana/wallet/:address/balances - Get wallet balances
router.get('/wallet/:address/balances', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const balances = await RealDataIntegrationService.getWalletBalances(address);

    res.json({
      success: true,
      data: {
        walletAddress: address,
        balances,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get wallet balances:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet balances'
    });
  }
});

// GET /api/solana/wallet/:address/validate - Validate wallet for trading
router.get('/wallet/:address/validate', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const validation = await RealDataIntegrationService.validateWalletForTrading(address);

    res.json({
      success: true,
      data: {
        walletAddress: address,
        validation,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to validate wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate wallet'
    });
  }
});

// GET /api/solana/wallet/:address/transactions - Get recent transactions
router.get('/wallet/:address/transactions', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const transactions = await RealDataIntegrationService.getRecentTransactions(address, limit);

    res.json({
      success: true,
      data: {
        walletAddress: address,
        transactions,
        count: transactions.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

// ==========================================
// TRADING OPERATIONS
// ==========================================

// POST /api/solana/trading/quote - Get swap quote
router.post('/trading/quote', async (req, res) => {
  try {
    const { inputMint, outputMint, amount, slippageBps } = req.body;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({
        success: false,
        error: 'inputMint, outputMint, and amount are required'
      });
    }

    const quote = await RealDataIntegrationService.getSwapQuote(
      inputMint,
      outputMint,
      parseFloat(amount),
      slippageBps
    );

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'No quote available for this swap'
      });
    }

    res.json({
      success: true,
      data: {
        quote,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get swap quote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get swap quote'
    });
  }
});

// POST /api/solana/trading/execute - Execute trade (simulation)
router.post('/trading/execute', async (req, res) => {
  try {
    const { fromToken, toToken, amount, walletAddress, maxSlippage } = req.body;

    if (!fromToken || !toToken || !amount || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'fromToken, toToken, amount, and walletAddress are required'
      });
    }

    const execution = await RealDataIntegrationService.executeTrade(
      fromToken,
      toToken,
      parseFloat(amount),
      walletAddress,
      maxSlippage
    );

    if (!execution.success) {
      return res.status(400).json({
        success: false,
        error: execution.error,
        data: execution
      });
    }

    res.json({
      success: true,
      data: {
        execution,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to execute trade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute trade'
    });
  }
});

// GET /api/solana/trading/transaction/:signature/status - Get transaction status
router.get('/trading/transaction/:signature/status', async (req, res) => {
  try {
    const { signature } = req.params;

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'Transaction signature is required'
      });
    }

    const status = await RealDataIntegrationService.getTransactionStatus(signature);

    res.json({
      success: true,
      data: {
        signature,
        status,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get transaction status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction status'
    });
  }
});

// ==========================================
// NETWORK STATUS
// ==========================================

// GET /api/solana/network/status - Get Solana network status
router.get('/network/status', async (req, res) => {
  try {
    const status = await RealDataIntegrationService.getNetworkStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get network status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get network status'
    });
  }
});

// ==========================================
// HEALTH CHECK
// ==========================================

// GET /api/solana/health - Solana service health check
router.get('/health', async (req, res) => {
  try {
    const networkStatus = await RealDataIntegrationService.getNetworkStatus();
    const solPrice = await RealDataIntegrationService.getSolanaPrice();

    res.json({
      success: true,
      data: {
        service: 'Real Solana Integration',
        status: 'operational',
        network: networkStatus.cluster,
        priceFeeds: solPrice ? 'active' : 'degraded',
        features: [
          'Live price feeds',
          'Wallet balance checking',
          'Jupiter DEX integration',
          'Transaction monitoring',
          'Trading validation'
        ],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Solana health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Solana service health check failed'
    });
  }
});

export default router;

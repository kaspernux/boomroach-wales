import { PrismaClient } from "@prisma/client";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import logger from "../../../shared/utils/logger";
import { emailService } from "../services/email";
import { solanaService } from "../services/solana-compatible";
import cryptoRandomString from "crypto-random-string";
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Health check
router.get("/health", (req, res) => {
  return res.json({
    status: "ok",
    service: "enhanced-auth-with-solana",
    timestamp: new Date().toISOString(),
    features: ["email-verification", "solana-wallet-integration", "real-balance-checking"],
  });
});

// ========================================
// EMAIL + PASSWORD AUTHENTICATION
// ========================================

// Register with email and password
router.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format"
      });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long"
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        error: "User with this email already exists"
      });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const emailVerificationToken = cryptoRandomString({ length: 32, type: 'url-safe' });
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        email,
        username: username || email.split('@')[0],
        password: hashedPassword,
        emailVerificationToken,
        emailVerificationExpires,
        isEmailVerified: false,
        isWalletConnected: false,
        tradingEnabled: false
      }
    });

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, user.username, emailVerificationToken);
      logger.info(`📧 Verification email sent to ${email}`);
    } catch (emailError) {
      logger.error("Failed to send verification email:", emailError);
    }

    logger.info(`✅ New user registered: ${email} (ID: ${user.id})`);

    return res.status(201).json({
      success: true,
      message: "Registration successful! Check your email for verification.",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isEmailVerified: user.isEmailVerified,
        isWalletConnected: user.isWalletConnected,
        tradingEnabled: user.tradingEnabled
      },
      requiresEmailVerification: true
    });

  } catch (error) {
    logger.error("Registration error:", error);
    return res.status(500).json({
      error: "Registration failed"
    });
  }
});

// Email verification
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        error: "Verification token is required"
      });
    }

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token as string,
        emailVerificationExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid or expired verification token"
      });
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email!, user.username);
    } catch (emailError) {
      logger.error("Failed to send welcome email:", emailError);
    }

    logger.info(`✅ Email verified for user: ${user.email}`);

    return res.json({
      success: true,
      message: "Email verified successfully! Welcome to BoomRoach Army!",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isEmailVerified: true,
        isWalletConnected: user.isWalletConnected,
        tradingEnabled: user.tradingEnabled
      }
    });

  } catch (error) {
    logger.error("Email verification error:", error);
    return res.status(500).json({
      error: "Email verification failed"
    });
  }
});

// Login with email and password
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    // Check if account is locked
    if (user.accountLocked) {
      return res.status(423).json({
        error: "Account is locked. Please contact support."
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginAttempts: 0
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      },
      process.env.JWT_SECRET || "demo-secret-key",
      { expiresIn: "24h" }
    );

    logger.info(`✅ User logged in: ${email}`);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isEmailVerified: user.isEmailVerified,
        isWalletConnected: user.isWalletConnected,
        tradingEnabled: user.tradingEnabled,
        walletAddress: user.walletAddress
      }
    });

  } catch (error) {
    logger.error("Login error:", error);
    return res.status(500).json({
      error: "Login failed"
    });
  }
});

// ========================================
// SOLANA WALLET INTEGRATION
// ========================================

// Connect wallet with real Solana integration
router.post("/connect-wallet", async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Login required to connect wallet"
      });
    }

    if (!walletAddress) {
      return res.status(400).json({
        error: "Wallet address is required"
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "demo-secret-key") as any;

    // Validate Solana public key
    if (!solanaService.isValidPublicKey(walletAddress)) {
      return res.status(400).json({
        error: "Invalid Solana wallet address format"
      });
    }

    // Get wallet balance and info
    const [walletBalance, networkInfo] = await Promise.all([
      solanaService.getWalletBalance(walletAddress),
      solanaService.getNetworkInfo()
    ]);

    // Verify wallet ownership if signature provided
    let isOwnershipVerified = false;
    if (signature && message) {
      isOwnershipVerified = await solanaService.verifyWalletOwnership(
        walletAddress,
        signature,
        message
      );
    }

    // Update user with wallet info
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        walletAddress,
        isWalletConnected: true,
        tradingEnabled: isOwnershipVerified && walletBalance.sol > 0.01 // Require some SOL for gas
      }
    });

    // Get BOOMROACH token balance if token mint is configured
    let boomroachBalance = 0;
    if (process.env.BOOMROACH_TOKEN_MINT) {
      const boomroachToken = walletBalance.tokens.find(
        token => token.mint === process.env.BOOMROACH_TOKEN_MINT
      );
      if (boomroachToken) {
        boomroachBalance = Number.parseInt(boomroachToken.amount) / Math.pow(10, boomroachToken.decimals);
      }
    }

    logger.info(`✅ Wallet connected for user ${decoded.email}: ${walletAddress}`);

    return res.json({
      success: true,
      message: "Wallet connected successfully",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        walletAddress,
        isEmailVerified: user.isEmailVerified,
        isWalletConnected: true,
        tradingEnabled: user.tradingEnabled
      },
      walletInfo: {
        address: walletAddress,
        solBalance: walletBalance.sol,
        boomroachBalance,
        tokenAccounts: walletBalance.tokens.length,
        canTrade: user.tradingEnabled,
        ownershipVerified: isOwnershipVerified,
        networkHealth: networkInfo.healthy
      }
    });

  } catch (error) {
    logger.error("Wallet connection error:", error);
    return res.status(500).json({
      error: "Wallet connection failed"
    });
  }
});

// Get wallet info
router.get("/wallet-info/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!solanaService.isValidPublicKey(address)) {
      return res.status(400).json({
        error: "Invalid wallet address format"
      });
    }

    const [walletBalance, recentTxs] = await Promise.all([
      solanaService.getWalletBalance(address),
      solanaService.getRecentTransactions(address, 5)
    ]);

    // Get BOOMROACH balance
    let boomroachBalance = 0;
    if (process.env.BOOMROACH_TOKEN_MINT) {
      const boomroachToken = walletBalance.tokens.find(
        token => token.mint === process.env.BOOMROACH_TOKEN_MINT
      );
      if (boomroachToken) {
        boomroachBalance = Number.parseInt(boomroachToken.amount) / Math.pow(10, boomroachToken.decimals);
      }
    }

    return res.json({
      address,
      solBalance: walletBalance.sol,
      boomroachBalance,
      hasMinimumBoomroach: boomroachBalance >= 100,
      canTrade: walletBalance.sol > 0.01 && boomroachBalance >= 100,
      tokenAccounts: walletBalance.tokens.length,
      recentTransactions: recentTxs.length,
      lastActivity: recentTxs[0]?.blockTime ? new Date(recentTxs[0].blockTime * 1000) : null
    });

  } catch (error) {
    logger.error("Wallet info error:", error);
    return res.status(500).json({
      error: "Failed to get wallet info"
    });
  }
});

// Get user profile
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "demo-secret-key") as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    // Get wallet info if connected
    let walletInfo = null;
    if (user.walletAddress) {
      try {
        const walletBalance = await solanaService.getWalletBalance(user.walletAddress);
        walletInfo = {
          address: user.walletAddress,
          solBalance: walletBalance.sol,
          tokenAccounts: walletBalance.tokens.length
        };
      } catch (error) {
        logger.warn("Failed to get wallet info for profile:", error);
      }
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isEmailVerified: user.isEmailVerified,
        isWalletConnected: user.isWalletConnected,
        tradingEnabled: user.tradingEnabled,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      walletInfo,
      access: {
        hasBasicAccess: user.isEmailVerified,
        canTrade: user.tradingEnabled,
        securityLevel: user.securityLevel
      }
    });

  } catch (error) {
    logger.error("Profile fetch error:", error);
    return res.status(401).json({
      error: "Invalid authentication token"
    });
  }
});

// Trading status check
router.get("/trading-status", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "demo-secret-key") as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    // Get real-time wallet balance if connected
    let boomroachBalance = 0;
    let solBalance = 0;

    if (user.walletAddress) {
      try {
        const walletBalance = await solanaService.getWalletBalance(user.walletAddress);
        solBalance = walletBalance.sol;

        if (process.env.BOOMROACH_TOKEN_MINT) {
          const boomroachToken = walletBalance.tokens.find(
            token => token.mint === process.env.BOOMROACH_TOKEN_MINT
          );
          if (boomroachToken) {
            boomroachBalance = Number.parseInt(boomroachToken.amount) / Math.pow(10, boomroachToken.decimals);
          }
        }
      } catch (error) {
        logger.warn("Failed to get real-time balance:", error);
      }
    }

    const canTrade = user.isEmailVerified &&
                    user.isWalletConnected &&
                    solBalance > 0.01 &&
                    boomroachBalance >= 1000;

    return res.json({
      canTrade,
      requirements: {
        emailVerified: user.isEmailVerified,
        walletConnected: user.isWalletConnected,
        sufficientSol: solBalance > 0.01,
        sufficientTokens: boomroachBalance >= 1000
      },
      balance: {
        sol: solBalance,
        boomroach: boomroachBalance,
        required: 1000
      },
      tradingConfig: {
        minBoomroachTokens: 1000,
        minSolForGas: 0.01,
        commissionRate: 0.005,
        maxDailyTrades: 1000
      },
      networkStatus: await solanaService.healthCheck()
    });

  } catch (error) {
    logger.error("Trading status error:", error);
    return res.status(401).json({
      error: "Invalid authentication token"
    });
  }
});

// Logout
router.post("/logout", async (req, res) => {
  try {
    return res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    logger.error("Logout error:", error);
    return res.status(500).json({
      error: "Logout failed"
    });
  }
});

// Solana network status
router.get("/solana-status", async (req, res) => {
  try {
    const networkInfo = await solanaService.getNetworkInfo();
    return res.json({
      success: true,
      network: networkInfo
    });
  } catch (error) {
    logger.error("Solana status error:", error);
    return res.status(500).json({
      error: "Failed to get Solana network status"
    });
  }
});

export default router;

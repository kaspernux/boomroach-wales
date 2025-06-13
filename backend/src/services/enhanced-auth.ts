import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import cryptoRandomString from "crypto-random-string";
import nodemailer from "nodemailer";
import { solanaService } from "./solana";
import { logger } from "../../../shared/utils/logger";

const prisma = new PrismaClient();

interface RegisterData {
  email: string;
  password: string;
  username?: string;
}

interface LoginData {
  email: string;
  password: string;
  walletAddress?: string;
}

interface WalletConnectionData {
  walletAddress: string;
  signature?: string;
  userId: string;
}

export class EnhancedAuthService {
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter (configure with your email service)
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async register(data: RegisterData) {
    try {
      const { email, password, username } = data;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error("User already exists with this email");
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Generate username if not provided
      const finalUsername = username || `user_${Date.now()}`;

      // Generate email verification token
      const emailVerificationToken = cryptoRandomString({ length: 32, type: 'url-safe' });
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username: finalUsername,
          passwordHash,
          emailVerificationToken,
          emailVerificationExpires,
          isEmailVerified: false,
          isWalletConnected: false
        }
      });

      // Send verification email
      await this.sendVerificationEmail(email, emailVerificationToken);

      return {
        success: true,
        message: "Registration successful. Please check your email for verification.",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isEmailVerified: user.isEmailVerified,
          isWalletConnected: user.isWalletConnected
        }
      };
    } catch (error) {
      logger.error("Registration error:", error);
      throw error;
    }
  }

  async login(data: LoginData) {
    try {
      const { email, password } = data;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          staking: true
        }
      });

      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        // Increment failed login attempts
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: { increment: 1 }
          }
        });
        throw new Error("Invalid email or password");
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new Error("Account is temporarily locked due to failed login attempts");
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        throw new Error("Please verify your email address before logging in");
      }

      // Reset failed login attempts on successful login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date()
        }
      });

      // Check trading eligibility
      const tradingConfig = await this.getTradingConfig();
      let canTrade = false;
      let boomroachBalance = 0;

      if (user.isWalletConnected && user.walletAddress) {
        const walletInfo = await solanaService.getWalletInfo(user.walletAddress);
        boomroachBalance = walletInfo.boomroachBalance;
        canTrade = walletInfo.boomroachBalance >= tradingConfig.minBoomroachTokens;
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          walletAddress: user.walletAddress,
          isEmailVerified: user.isEmailVerified,
          isWalletConnected: user.isWalletConnected,
          canTrade
        },
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "24h" }
      );

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          walletAddress: user.walletAddress,
          isEmailVerified: user.isEmailVerified,
          isWalletConnected: user.isWalletConnected,
          canTrade,
          boomroachBalance,
          requiredBoomroach: tradingConfig.minBoomroachTokens,
          stakingInfo: user.staking
        }
      };
    } catch (error) {
      logger.error("Login error:", error);
      throw error;
    }
  }

  async connectWallet(data: WalletConnectionData) {
    try {
      const { walletAddress, userId } = data;

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Check if wallet is already connected to another user
      const existingWalletUser = await prisma.user.findUnique({
        where: { walletAddress }
      });

      if (existingWalletUser && existingWalletUser.id !== userId) {
        throw new Error("This wallet is already connected to another account");
      }

      // Get wallet info and check BOOMROACH balance
      const walletInfo = await solanaService.getWalletInfo(walletAddress);
      const tradingConfig = await this.getTradingConfig();
      const canTrade = walletInfo.boomroachBalance >= tradingConfig.minBoomroachTokens;

      // Update user with wallet connection
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          walletAddress,
          isWalletConnected: true
        }
      });

      return {
        success: true,
        message: "Wallet connected successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          walletAddress: updatedUser.walletAddress,
          isEmailVerified: updatedUser.isEmailVerified,
          isWalletConnected: updatedUser.isWalletConnected,
          canTrade,
          boomroachBalance: walletInfo.boomroachBalance,
          requiredBoomroach: tradingConfig.minBoomroachTokens
        },
        walletInfo
      };
    } catch (error) {
      logger.error("Wallet connection error:", error);
      throw error;
    }
  }

  async verifyEmail(token: string) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        throw new Error("Invalid or expired verification token");
      }

      // Update user as verified
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      });

      return {
        success: true,
        message: "Email verified successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          isEmailVerified: updatedUser.isEmailVerified
        }
      };
    } catch (error) {
      logger.error("Email verification error:", error);
      throw error;
    }
  }

  async checkUserAccess(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          staking: true
        }
      });

      if (!user) {
        throw new Error("User not found");
      }

      const tradingConfig = await this.getTradingConfig();
      let canTrade = false;
      let boomroachBalance = 0;

      // Check both email verification and wallet connection
      const hasBasicAccess = user.isEmailVerified;

      if (user.isWalletConnected && user.walletAddress) {
        const walletInfo = await solanaService.getWalletInfo(user.walletAddress);
        boomroachBalance = walletInfo.boomroachBalance;
        canTrade = hasBasicAccess && walletInfo.boomroachBalance >= tradingConfig.minBoomroachTokens;
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          walletAddress: user.walletAddress,
          isEmailVerified: user.isEmailVerified,
          isWalletConnected: user.isWalletConnected
        },
        access: {
          hasBasicAccess,
          canTrade,
          boomroachBalance,
          requiredBoomroach: tradingConfig.minBoomroachTokens,
          stakingInfo: user.staking
        }
      };
    } catch (error) {
      logger.error("Access check error:", error);
      throw error;
    }
  }

  async getTradingConfig() {
    try {
      let config = await prisma.tradingConfig.findFirst();

      if (!config) {
        // Create default config if none exists
        config = await prisma.tradingConfig.create({
          data: {
            minBoomroachTokens: 100.0,
            commissionRate: 0.005,
            stakingRewardRate: 0.02,
            burnVoteThreshold: 1000,
            maxDailyTrades: 100,
            maxPositionSize: 10000.0
          }
        });
      }

      return config;
    } catch (error) {
      logger.error("Trading config error:", error);
      throw error;
    }
  }

  async updateTradingConfig(updates: any, adminUserId: string) {
    try {
      // Verify admin privileges
      const admin = await prisma.user.findUnique({
        where: { id: adminUserId }
      });

      if (!admin?.isAdmin) {
        throw new Error("Insufficient privileges");
      }

      const config = await prisma.tradingConfig.findFirst();

      if (config) {
        const updatedConfig = await prisma.tradingConfig.update({
          where: { id: config.id },
          data: updates
        });
        return updatedConfig;
      } else {
        const newConfig = await prisma.tradingConfig.create({
          data: updates
        });
        return newConfig;
      }
    } catch (error) {
      logger.error("Trading config update error:", error);
      throw error;
    }
  }

  private async sendVerificationEmail(email: string, token: string) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${token}`;

      const mailOptions = {
        from: process.env.SMTP_FROM || "noreply@boomroach.wales",
        to: email,
        subject: "🪳 BoomRoach - Verify Your Email Address",
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #3b82f6;">🪳 BoomRoach</h1>
              <p style="color: #6b7280;">Advanced Solana Trading Platform</p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1f2937; margin-bottom: 15px;">Welcome to BoomRoach!</h2>
              <p style="color: #4b5563; margin-bottom: 15px;">
                Thank you for registering with BoomRoach. To complete your registration and access trading features, please verify your email address.
              </p>

              <div style="text-align: center; margin: 25px 0;">
                <a href="${verificationUrl}"
                   style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Verify Email Address
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${verificationUrl}" style="color: #3b82f6;">${verificationUrl}</a>
              </p>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #d97706; margin-bottom: 10px;">⚠️ Important Security Notice</h3>
              <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                <li>This verification link expires in 24 hours</li>
                <li>Only click this link if you registered for BoomRoach</li>
                <li>Never share your account credentials with anyone</li>
              </ul>
            </div>

            <div style="text-align: center; color: #6b7280; font-size: 12px;">
              <p>This email was sent to ${email}</p>
              <p>© 2025 BoomRoach. All rights reserved.</p>
            </div>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${email}`);
    } catch (error) {
      logger.error("Failed to send verification email:", error);
      throw new Error("Failed to send verification email");
    }
  }
}

export const enhancedAuthService = new EnhancedAuthService();

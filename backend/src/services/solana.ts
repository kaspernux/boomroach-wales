import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { config } from "../config/env";
import { logger } from "../../../shared/utils/logger";

export interface TokenBalance {
  address: string;
  balance: number;
  decimals: number;
  uiAmount: number;
}

export interface WalletInfo {
  address: string;
  solBalance: number;
  boomroachBalance: number;
  hasMinimumBoomroach: boolean;
  canTrade: boolean;
}

export interface TradeResult {
  success: boolean;
  txHash?: string;
  error?: string;
  newBalance?: number;
}

export class SolanaService {
  private connection: Connection;
  private boomroachMint: PublicKey;

  constructor() {
    this.connection = new Connection(
      config.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    );

    // Demo BOOMROACH token mint (replace with actual mint address)
    this.boomroachMint = new PublicKey(
      config.BOOMROACH_TOKEN_MINT || "So11111111111111111111111111111111111111112" // Wrapped SOL for demo
    );

    logger.info("✅ Solana service initialized");
  }

  async getWalletInfo(walletAddress: string): Promise<WalletInfo> {
    try {
      const publicKey = new PublicKey(walletAddress);

      // Get SOL balance
      const solBalance = await this.connection.getBalance(publicKey);
      const solBalanceFormatted = solBalance / LAMPORTS_PER_SOL;

      // Get BOOMROACH token balance
      const boomroachBalance = await this.getBoomroachBalance(walletAddress);

      // Check if user has minimum BOOMROACH tokens to trade (e.g., 100 tokens)
      const minimumBoomroach = 100;
      const hasMinimumBoomroach = boomroachBalance >= minimumBoomroach;

      return {
        address: walletAddress,
        solBalance: solBalanceFormatted,
        boomroachBalance,
        hasMinimumBoomroach,
        canTrade: hasMinimumBoomroach
      };
    } catch (error) {
      logger.error("Error getting wallet info:", error);
      return {
        address: walletAddress,
        solBalance: 0,
        boomroachBalance: 0,
        hasMinimumBoomroach: false,
        canTrade: false
      };
    }
  }

  async getBoomroachBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);

      // Get associated token account for BOOMROACH
      const associatedTokenAccount = await getAssociatedTokenAddress(
        this.boomroachMint,
        publicKey
      );

      try {
        const accountInfo = await getAccount(this.connection, associatedTokenAccount);
        return Number(accountInfo.amount) / Math.pow(10, 9); // Assuming 9 decimals
      } catch (error) {
        // Account doesn't exist - no tokens
        return 0;
      }
    } catch (error) {
      logger.error("Error getting BOOMROACH balance:", error);
      return 0;
    }
  }

  async validateWalletForTrading(walletAddress: string): Promise<{
    valid: boolean;
    reason?: string;
    boomroachBalance?: number;
  }> {
    try {
      const walletInfo = await this.getWalletInfo(walletAddress);

      if (!walletInfo.hasMinimumBoomroach) {
        return {
          valid: false,
          reason: `Insufficient BOOMROACH tokens. Need at least 100, you have ${walletInfo.boomroachBalance}`,
          boomroachBalance: walletInfo.boomroachBalance
        };
      }

      return {
        valid: true,
        boomroachBalance: walletInfo.boomroachBalance
      };
    } catch (error) {
      logger.error("Error validating wallet:", error);
      return {
        valid: false,
        reason: "Failed to validate wallet"
      };
    }
  }

  async executeTradeWithBoomroach(
    walletAddress: string,
    tradeAmount: number,
    tradeType: "buy" | "sell",
    targetToken: string
  ): Promise<TradeResult> {
    try {
      // Validate wallet has sufficient BOOMROACH tokens
      const validation = await this.validateWalletForTrading(walletAddress);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.reason
        };
      }

      // Check if user has enough BOOMROACH for this trade
      if (validation.boomroachBalance! < tradeAmount) {
        return {
          success: false,
          error: `Insufficient BOOMROACH tokens for trade. Need ${tradeAmount}, have ${validation.boomroachBalance}`
        };
      }

      // Simulate trade execution
      logger.info(`Executing ${tradeType} trade for ${tradeAmount} BOOMROACH tokens`);

      // In a real implementation, this would:
      // 1. Create a transaction to swap BOOMROACH tokens
      // 2. Execute the trade through a DEX (Jupiter, Raydium, etc.)
      // 3. Update user's portfolio balance

      // For demo, we'll simulate a successful trade
      const simulatedTxHash = `demo_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newBalance = validation.boomroachBalance! - tradeAmount;

      // Store trade result in database
      await this.recordTradeResult(walletAddress, tradeAmount, tradeType, targetToken, simulatedTxHash);

      return {
        success: true,
        txHash: simulatedTxHash,
        newBalance
      };
    } catch (error) {
      logger.error("Error executing trade:", error);
      return {
        success: false,
        error: "Trade execution failed"
      };
    }
  }

  async convertRevenueToSol(
    walletAddress: string,
    revenueAmount: number
  ): Promise<TradeResult> {
    try {
      // Validate user has revenue to convert
      const userRevenue = await this.getUserRevenue(walletAddress);
      if (userRevenue < revenueAmount) {
        return {
          success: false,
          error: `Insufficient revenue. Available: ${userRevenue}, requested: ${revenueAmount}`
        };
      }

      // Simulate conversion (in real implementation, would swap through DEX)
      const solAmount = revenueAmount * 0.1; // Example conversion rate
      const simulatedTxHash = `conversion_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update user revenue and add SOL to withdrawable balance
      await this.updateUserRevenue(walletAddress, -revenueAmount);
      await this.addWithdrawableBalance(walletAddress, solAmount);

      logger.info(`Converted ${revenueAmount} revenue to ${solAmount} SOL for ${walletAddress}`);

      return {
        success: true,
        txHash: simulatedTxHash,
        newBalance: solAmount
      };
    } catch (error) {
      logger.error("Error converting revenue to SOL:", error);
      return {
        success: false,
        error: "Conversion failed"
      };
    }
  }

  async withdrawSol(
    walletAddress: string,
    amount: number
  ): Promise<TradeResult> {
    try {
      const withdrawableBalance = await this.getWithdrawableBalance(walletAddress);
      if (withdrawableBalance < amount) {
        return {
          success: false,
          error: `Insufficient withdrawable balance. Available: ${withdrawableBalance}, requested: ${amount}`
        };
      }

      // In real implementation, would create and send SOL transfer transaction
      const simulatedTxHash = `withdrawal_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update withdrawable balance
      await this.addWithdrawableBalance(walletAddress, -amount);

      logger.info(`Withdrew ${amount} SOL to ${walletAddress}`);

      return {
        success: true,
        txHash: simulatedTxHash,
        newBalance: withdrawableBalance - amount
      };
    } catch (error) {
      logger.error("Error withdrawing SOL:", error);
      return {
        success: false,
        error: "Withdrawal failed"
      };
    }
  }

  // Database operations (simplified for demo)
  private async recordTradeResult(
    walletAddress: string,
    amount: number,
    type: string,
    targetToken: string,
    txHash: string
  ): Promise<void> {
    // In real implementation, store in database
    logger.info(`Recording trade: ${walletAddress} ${type} ${amount} BOOMROACH for ${targetToken}`);
  }

  private async getUserRevenue(walletAddress: string): Promise<number> {
    // In real implementation, get from database
    // For demo, return a random revenue amount
    return Math.random() * 1000;
  }

  private async updateUserRevenue(walletAddress: string, amount: number): Promise<void> {
    // In real implementation, update database
    logger.info(`Updating revenue for ${walletAddress}: ${amount}`);
  }

  private async getWithdrawableBalance(walletAddress: string): Promise<number> {
    // In real implementation, get from database
    return Math.random() * 10;
  }

  private async addWithdrawableBalance(walletAddress: string, amount: number): Promise<void> {
    // In real implementation, update database
    logger.info(`Adding withdrawable balance for ${walletAddress}: ${amount}`);
  }

  // Utility methods
  async getTokenPrice(tokenSymbol: string): Promise<number> {
    try {
      // In real implementation, fetch from price API
      return Math.random() * 100 + 1;
    } catch (error) {
      logger.error("Error getting token price:", error);
      return 0;
    }
  }

  async estimateTransactionFee(): Promise<number> {
    try {
      const recentBlockhash = await this.connection.getLatestBlockhash();
      return 0.000005; // Approximate SOL transaction fee
    } catch (error) {
      logger.error("Error estimating transaction fee:", error);
      return 0.000005;
    }
  }
}

export const solanaService = new SolanaService();

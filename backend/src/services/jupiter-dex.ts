import { Connection, PublicKey, Transaction, VersionedTransaction, Keypair } from "@solana/web3.js";
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";
import logger from "../../../shared/utils/logger";
import { emailService } from "./email";

interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: RouteInfo[];
  contextSlot?: number;
  timeTaken?: number;
}

interface RouteInfo {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

interface SwapRequest {
  quoteResponse: JupiterQuoteResponse;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  useSharedAccounts?: boolean;
  feeAccount?: string;
  computeUnitPriceMicroLamports?: number;
  asLegacyTransaction?: boolean;
  useTokenLedger?: boolean;
  dynamicComputeUnitLimit?: boolean;
  skipUserAccountsRpcCalls?: boolean;
}

interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

interface TradeExecution {
  id: string;
  userId: string;
  inputTokenMint: string;
  outputTokenMint: string;
  inputAmount: number;
  outputAmount: number;
  expectedOutput: number;
  actualOutput: number;
  slippage: number;
  commission: number;
  commissionInBoomroach: number;
  txSignature: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  errorMessage?: string;
  route: string;
  blockTime?: Date;
  gasUsed?: number;
  priorityFee?: number;
  createdAt: Date;
}

export class JupiterDEXService {
  private connection: Connection;
  private prisma: PrismaClient;
  private apiUrl: string;
  private boomroachMint: string;
  private commissionRate: number;
  private burnPercentage: number;
  private isEnabled: boolean;

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
      "confirmed"
    );
    this.prisma = new PrismaClient();
    this.apiUrl = process.env.JUPITER_API_URL || "https://quote-api.jup.ag/v6";
    this.boomroachMint = process.env.BOOMROACH_TOKEN_MINT || "";
    this.commissionRate = Number.parseFloat(process.env.COMMISSION_RATE || "0.005");
    this.burnPercentage = Number.parseFloat(process.env.BURN_PERCENTAGE || "0.5");
    this.isEnabled = process.env.ENABLE_REAL_TRADING === "true";

    if (!this.boomroachMint) {
      logger.warn("🚨 BOOMROACH token mint not configured - commission collection disabled");
    }

    logger.info(`🔄 Jupiter DEX Service initialized (${this.isEnabled ? 'LIVE' : 'DEMO'} mode)`);
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps = 100,
    platformFeeBps?: number
  ): Promise<JupiterQuoteResponse> {
    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: Math.floor(amount * 1e9).toString(), // Convert to lamports
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: "false",
        asLegacyTransaction: "false",
        excludeDexes: "",
        maxAccounts: "64"
      });

      if (platformFeeBps) {
        params.append("platformFeeBps", platformFeeBps.toString());
      }

      const response = await fetch(`${this.apiUrl}/quote?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
      }

      const quote = await response.json() as JupiterQuoteResponse;

      // Add our platform fee for commission
      if (this.boomroachMint) {
        quote.platformFee = {
          amount: Math.floor(Number.parseFloat(quote.outAmount) * this.commissionRate).toString(),
          feeBps: Math.floor(this.commissionRate * 10000)
        };
      }

      logger.info(`📊 Quote generated: ${amount} ${inputMint} → ${Number.parseFloat(quote.outAmount) / 1e9} ${outputMint}`);
      return quote;
    } catch (error) {
      logger.error("❌ Failed to get Jupiter quote:", error);
      throw new Error(`Failed to get quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSwapTransaction(
    quote: JupiterQuoteResponse,
    userPublicKey: string,
    priorityFee?: number
  ): Promise<SwapResponse> {
    try {
      const swapRequest: SwapRequest = {
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        useSharedAccounts: true,
        dynamicComputeUnitLimit: true,
        skipUserAccountsRpcCalls: false
      };

      if (priorityFee) {
        swapRequest.computeUnitPriceMicroLamports = priorityFee;
      }

      const response = await fetch(`${this.apiUrl}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(swapRequest),
      });

      if (!response.ok) {
        throw new Error(`Jupiter swap API error: ${response.status} ${response.statusText}`);
      }

      const swapResponse = await response.json() as SwapResponse;

      logger.info(`🔄 Swap transaction prepared for ${userPublicKey}`);
      return swapResponse;
    } catch (error) {
      logger.error("❌ Failed to get swap transaction:", error);
      throw new Error(`Failed to prepare swap: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeSwap(
    userId: string,
    quote: JupiterQuoteResponse,
    userPublicKey: string,
    signedTransaction: string
  ): Promise<TradeExecution> {
    const tradeExecution: Partial<TradeExecution> = {
      userId,
      inputTokenMint: quote.inputMint,
      outputTokenMint: quote.outputMint,
      inputAmount: Number.parseFloat(quote.inAmount) / 1e9,
      expectedOutput: Number.parseFloat(quote.outAmount) / 1e9,
      slippage: quote.slippageBps / 100,
      route: JSON.stringify(quote.routePlan),
      status: "PENDING",
      createdAt: new Date()
    };

    try {
      // Calculate commission
      const commission = tradeExecution.expectedOutput! * this.commissionRate;
      const commissionInBoomroach = await this.convertToBoomroach(commission, quote.outputMint);

      tradeExecution.commission = commission;
      tradeExecution.commissionInBoomroach = commissionInBoomroach;

      // Create trade record
      const trade = await this.prisma.realTradeExecution.create({
        data: {
          userId,
          inputTokenMint: quote.inputMint,
          outputTokenMint: quote.outputMint,
          inputAmount: tradeExecution.inputAmount!,
          outputAmount: tradeExecution.expectedOutput!,
          slippage: tradeExecution.slippage!,
          commission: commission,
          commissionInBoomroach: commissionInBoomroach,
          route: tradeExecution.route!,
          status: "PENDING",
          txSignature: "", // Will be updated after execution
        }
      });

      if (!this.isEnabled) {
        // Demo mode - simulate successful execution
        const simulatedTxSignature = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const actualOutput = tradeExecution.expectedOutput! * (1 - Math.random() * tradeExecution.slippage! / 100);

        const updatedTrade = await this.prisma.realTradeExecution.update({
          where: { id: trade.id },
          data: {
            txSignature: simulatedTxSignature,
            status: "SUCCESS",
            blockTime: new Date(),
            outputAmount: actualOutput
          }
        });

        // Process commission in demo mode
        await this.processCommission(userId, commissionInBoomroach, true);

        logger.info(`✅ Demo trade executed: ${simulatedTxSignature}`);

        return {
          ...updatedTrade,
          actualOutput,
          gasUsed: 5000 + Math.floor(Math.random() * 2000),
          priorityFee: 1000 + Math.floor(Math.random() * 500)
        } as TradeExecution;
      }

      // Real execution mode
      const transaction = VersionedTransaction.deserialize(Buffer.from(signedTransaction, 'base64'));

      // Send transaction
      const txSignature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature: txSignature,
        ...(await this.connection.getLatestBlockhash())
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      // Get transaction details
      const txDetails = await this.connection.getTransaction(txSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      const actualOutput = this.parseTransactionOutput(txDetails, quote.outputMint);
      const gasUsed = txDetails?.meta?.fee || 0;

      // Update trade record
      const updatedTrade = await this.prisma.realTradeExecution.update({
        where: { id: trade.id },
        data: {
          txSignature,
          status: "SUCCESS",
          blockTime: new Date(txDetails?.blockTime ? txDetails.blockTime * 1000 : Date.now()),
          outputAmount: actualOutput
        }
      });

      // Process commission
      await this.processCommission(userId, commissionInBoomroach, false);

      // Update user portfolio
      await this.updateUserPortfolio(userId, {
        inputMint: quote.inputMint,
        outputMint: quote.outputMint,
        inputAmount: tradeExecution.inputAmount!,
        outputAmount: actualOutput - commission,
        commission
      });

      // Send notification email
      await this.sendTradeNotification(userId, {
        type: "SUCCESS",
        inputAmount: tradeExecution.inputAmount!,
        outputAmount: actualOutput,
        inputToken: quote.inputMint,
        outputToken: quote.outputMint,
        txSignature,
        commission
      });

      logger.info(`✅ Real trade executed: ${txSignature}`);

      return {
        ...updatedTrade,
        actualOutput,
        gasUsed,
        priorityFee: txDetails?.meta?.fee || 0
      } as TradeExecution;

    } catch (error) {
      logger.error("❌ Trade execution failed:", error);

      // Update trade record with error
      await this.prisma.realTradeExecution.update({
        where: { id: (tradeExecution as any).id || "" },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      // Send error notification
      await this.sendTradeNotification(userId, {
        type: "FAILED",
        inputAmount: tradeExecution.inputAmount!,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  private async convertToBoomroach(amount: number, fromMint: string): Promise<number> {
    if (fromMint === this.boomroachMint) {
      return amount;
    }

    try {
      // Get quote for converting commission to BOOMROACH
      const quote = await this.getQuote(fromMint, this.boomroachMint, amount, 500); // 5% slippage for commission conversion
      return Number.parseFloat(quote.outAmount) / 1e9;
    } catch (error) {
      logger.warn("Failed to convert commission to BOOMROACH, using USD equivalent");
      // Fallback: assume 1:1 USD ratio for simplicity
      return amount;
    }
  }

  private async processCommission(userId: string, commissionAmount: number, isDemoMode: boolean) {
    try {
      // Add to commission pool
      await this.prisma.commissionPool.upsert({
        where: { id: "main" },
        update: {
          totalCommissions: { increment: commissionAmount },
          lastUpdated: new Date()
        },
        create: {
          id: "main",
          totalCommissions: commissionAmount,
          totalStaked: 0,
          pendingBurn: commissionAmount * this.burnPercentage,
          lastUpdated: new Date()
        }
      });

      // Record commission transaction
      await this.prisma.commissionTransaction.create({
        data: {
          userId,
          amount: commissionAmount,
          type: "TRADING_FEE",
          status: isDemoMode ? "DEMO" : "CONFIRMED",
          createdAt: new Date()
        }
      });

      // Update pending burn amount
      const burnAmount = commissionAmount * this.burnPercentage;
      await this.prisma.commissionPool.update({
        where: { id: "main" },
        data: {
          pendingBurn: { increment: burnAmount }
        }
      });

      logger.info(`💰 Commission processed: ${commissionAmount} BOOMROACH (${burnAmount} marked for burn)`);
    } catch (error) {
      logger.error("Failed to process commission:", error);
    }
  }

  private parseTransactionOutput(txDetails: any, outputMint: string): number {
    // Parse transaction to extract actual output amount
    // This is a simplified implementation
    if (!txDetails?.meta?.postTokenBalances) {
      return 0;
    }

    // Find the output token balance change
    const postBalances = txDetails.meta.postTokenBalances;
    const preBalances = txDetails.meta.preTokenBalances || [];

    for (const postBalance of postBalances) {
      if (postBalance.mint === outputMint) {
        const preBalance = preBalances.find((pb: any) =>
          pb.owner === postBalance.owner && pb.mint === outputMint
        );

        const pre = preBalance ? Number.parseFloat(preBalance.uiTokenAmount.amount) : 0;
        const post = Number.parseFloat(postBalance.uiTokenAmount.amount);

        if (post > pre) {
          return (post - pre) / Math.pow(10, postBalance.uiTokenAmount.decimals);
        }
      }
    }

    return 0;
  }

  private async updateUserPortfolio(userId: string, tradeData: any) {
    try {
      // Update or create portfolio
      await this.prisma.portfolio.upsert({
        where: { userId },
        update: {
          totalValue: { increment: tradeData.outputAmount },
          lastUpdated: new Date()
        },
        create: {
          userId,
          totalValue: tradeData.outputAmount,
          totalPnl: 0,
          lastUpdated: new Date()
        }
      });

      // Update or create position for output token
      await this.prisma.position.upsert({
        where: {
          userId_tokenSymbol: {
            userId,
            tokenSymbol: tradeData.outputToken
          }
        },
        update: {
          amount: { increment: tradeData.outputAmount }
        },
        create: {
          userId,
          tokenSymbol: tradeData.outputToken,
          tokenMint: tradeData.outputMint,
          amount: tradeData.outputAmount,
          avgBuyPrice: tradeData.outputAmount / tradeData.inputAmount,
          portfolioId: userId // Assuming portfolio ID same as user ID
        }
      });

      logger.info(`📊 Portfolio updated for user ${userId}`);
    } catch (error) {
      logger.error("Failed to update user portfolio:", error);
    }
  }

  private async sendTradeNotification(userId: string, tradeData: any) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, username: true }
      });

      if (!user || !user.email) return;

      const alertType = tradeData.type === "SUCCESS" ? "PROFIT" : "LOSS";

      await emailService.sendTradingAlert(
        user.email,
        alertType,
        "Jupiter DEX",
        {
          message: tradeData.type === "SUCCESS"
            ? `Trade completed successfully`
            : `Trade failed: ${tradeData.error}`,
          tokenSymbol: tradeData.outputToken || "Unknown",
          amount: tradeData.inputAmount,
          price: tradeData.outputAmount / tradeData.inputAmount,
          pnl: tradeData.outputAmount - tradeData.inputAmount,
        }
      );
    } catch (error) {
      logger.error("Failed to send trade notification:", error);
    }
  }

  // Public utility methods
  async getTokenInfo(mintAddress: string) {
    try {
      const response = await fetch(`${this.apiUrl}/tokens/${mintAddress}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      logger.error("Failed to get token info:", error);
      return null;
    }
  }

  async getTokenPrice(mintAddress: string): Promise<number> {
    try {
      const response = await fetch(`${this.apiUrl}/price?ids=${mintAddress}`);
      if (response.ok) {
        const data = await response.json();
        return data.data?.[mintAddress]?.price || 0;
      }
      return 0;
    } catch (error) {
      logger.error("Failed to get token price:", error);
      return 0;
    }
  }

  async getSwapHistory(userId: string, limit = 50) {
    return this.prisma.realTradeExecution.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async getCommissionStats() {
    const pool = await this.prisma.commissionPool.findUnique({
      where: { id: "main" }
    });

    const recentCommissions = await this.prisma.commissionTransaction.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      pool: pool || { totalCommissions: 0, totalStaked: 0, pendingBurn: 0 },
      dailyCommissions: recentCommissions.reduce((sum, c) => sum + c.amount, 0),
      recentTransactions: recentCommissions
    };
  }

  isLiveMode(): boolean {
    return this.isEnabled;
  }

  getConnectionStatus(): boolean {
    try {
      return this.connection !== null;
    } catch {
      return false;
    }
  }
}

export const jupiterDEXService = new JupiterDEXService();

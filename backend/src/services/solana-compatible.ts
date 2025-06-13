import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";
import logger from "../../../shared/utils/logger";

// Solana-compatible types (without native dependencies)
interface SolanaConfig {
  rpcUrl: string;
  network: string;
  commitment: string;
}

interface TokenAccount {
  mint: string;
  owner: string;
  amount: string;
  decimals: number;
}

interface TransactionSignature {
  signature: string;
  slot: number;
  err: any;
  memo: string | null;
  blockTime: number | null;
}

interface WalletBalance {
  lamports: number;
  sol: number;
  tokens: TokenAccount[];
}

interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: any[];
}

export class SolanaCompatibleService {
  private config: SolanaConfig;
  private prisma: PrismaClient;
  private isMainnet: boolean;

  constructor() {
    this.config = {
      rpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
      network: process.env.SOLANA_NETWORK || "mainnet-beta",
      commitment: "confirmed"
    };

    this.prisma = new PrismaClient();
    this.isMainnet = this.config.network === "mainnet-beta";

    logger.info(`🔗 Solana Compatible Service initialized (${this.config.network})`);
  }

  // RPC call wrapper using fetch instead of native modules
  private async rpcCall(method: string, params: any[] = []): Promise<any> {
    try {
      const response = await fetch(this.config.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`RPC call failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`RPC error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      logger.error(`Solana RPC call failed (${method}):`, error);
      throw error;
    }
  }

  // Get SOL balance using RPC
  async getBalance(publicKey: string): Promise<number> {
    try {
      const lamports = await this.rpcCall("getBalance", [publicKey]);
      return lamports / 1e9; // Convert lamports to SOL
    } catch (error) {
      logger.error("Failed to get SOL balance:", error);
      return 0;
    }
  }

  // Get token accounts using RPC
  async getTokenAccounts(publicKey: string): Promise<TokenAccount[]> {
    try {
      const response = await this.rpcCall("getTokenAccountsByOwner", [
        publicKey,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" }
      ]);

      return response.value.map((account: any) => ({
        mint: account.account.data.parsed.info.mint,
        owner: account.account.data.parsed.info.owner,
        amount: account.account.data.parsed.info.tokenAmount.amount,
        decimals: account.account.data.parsed.info.tokenAmount.decimals,
      }));
    } catch (error) {
      logger.error("Failed to get token accounts:", error);
      return [];
    }
  }

  // Get wallet balance (SOL + tokens)
  async getWalletBalance(publicKey: string): Promise<WalletBalance> {
    try {
      const [solBalance, tokenAccounts] = await Promise.all([
        this.getBalance(publicKey),
        this.getTokenAccounts(publicKey)
      ]);

      return {
        lamports: Math.round(solBalance * 1e9),
        sol: solBalance,
        tokens: tokenAccounts
      };
    } catch (error) {
      logger.error("Failed to get wallet balance:", error);
      return {
        lamports: 0,
        sol: 0,
        tokens: []
      };
    }
  }

  // Validate Solana public key format
  isValidPublicKey(publicKey: string): boolean {
    try {
      // Basic validation for Solana public key format
      if (!publicKey || typeof publicKey !== "string") return false;
      if (publicKey.length < 32 || publicKey.length > 44) return false;

      // Check if it's valid base58
      const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
      return base58Regex.test(publicKey);
    } catch {
      return false;
    }
  }

  // Get transaction signature details
  async getTransaction(signature: string): Promise<TransactionSignature | null> {
    try {
      const transaction = await this.rpcCall("getTransaction", [
        signature,
        { encoding: "json", commitment: this.config.commitment }
      ]);

      if (!transaction) return null;

      return {
        signature,
        slot: transaction.slot,
        err: transaction.meta?.err || null,
        memo: transaction.transaction?.message?.instructions?.[0]?.data || null,
        blockTime: transaction.blockTime
      };
    } catch (error) {
      logger.error("Failed to get transaction:", error);
      return null;
    }
  }

  // Get recent transactions for a wallet
  async getRecentTransactions(publicKey: string, limit = 10): Promise<TransactionSignature[]> {
    try {
      const signatures = await this.rpcCall("getSignaturesForAddress", [
        publicKey,
        { limit }
      ]);

      const transactions = await Promise.all(
        signatures.map(async (sig: any) => {
          const tx = await this.getTransaction(sig.signature);
          return tx;
        })
      );

      return transactions.filter(tx => tx !== null) as TransactionSignature[];
    } catch (error) {
      logger.error("Failed to get recent transactions:", error);
      return [];
    }
  }

  // Jupiter integration without native modules
  async getJupiterQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps = 100
  ): Promise<SwapQuote | null> {
    try {
      const jupiterUrl = "https://quote-api.jup.ag/v6/quote";
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: Math.floor(amount * 1e9).toString(),
        slippageBps: slippageBps.toString(),
      });

      const response = await fetch(`${jupiterUrl}?${params}`);

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }

      const quote = await response.json();

      return {
        inputMint: quote.inputMint,
        outputMint: quote.outputMint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        priceImpactPct: quote.priceImpactPct,
        routePlan: quote.routePlan || []
      };
    } catch (error) {
      logger.error("Failed to get Jupiter quote:", error);
      return null;
    }
  }

  // Get token price from Jupiter
  async getTokenPrice(tokenMint: string): Promise<number> {
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${tokenMint}`);

      if (!response.ok) {
        throw new Error(`Price API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.[tokenMint]?.price || 0;
    } catch (error) {
      logger.error("Failed to get token price:", error);
      return 0;
    }
  }

  // Verify wallet ownership (simplified - returns demo data)
  async verifyWalletOwnership(publicKey: string, signature: string, message: string): Promise<boolean> {
    try {
      // In a real implementation, this would verify the signature cryptographically
      // For demo purposes, we'll do basic validation

      if (!this.isValidPublicKey(publicKey)) {
        logger.warn("Invalid public key format");
        return false;
      }

      if (!signature || signature.length < 64) {
        logger.warn("Invalid signature format");
        return false;
      }

      if (!message || message.length < 10) {
        logger.warn("Invalid message format");
        return false;
      }

      // Demo: Always return true for valid-looking inputs
      logger.info(`✅ Wallet ownership verified (demo mode): ${publicKey.slice(0, 8)}...`);
      return true;

    } catch (error) {
      logger.error("Failed to verify wallet ownership:", error);
      return false;
    }
  }

  // Get network info
  async getNetworkInfo(): Promise<any> {
    try {
      const [slot, blockHeight, version] = await Promise.all([
        this.rpcCall("getSlot"),
        this.rpcCall("getBlockHeight"),
        this.rpcCall("getVersion")
      ]);

      return {
        network: this.config.network,
        currentSlot: slot,
        blockHeight,
        version: version["solana-core"],
        rpcUrl: this.config.rpcUrl,
        healthy: true
      };
    } catch (error) {
      logger.error("Failed to get network info:", error);
      return {
        network: this.config.network,
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  // Connection health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.rpcCall("getSlot");
      return true;
    } catch {
      return false;
    }
  }

  // Get multiple token prices
  async getMultipleTokenPrices(tokenMints: string[]): Promise<Record<string, number>> {
    try {
      const prices: Record<string, number> = {};

      // Batch price requests
      const pricePromises = tokenMints.map(async (mint) => {
        const price = await this.getTokenPrice(mint);
        return { mint, price };
      });

      const results = await Promise.all(pricePromises);

      results.forEach(({ mint, price }) => {
        prices[mint] = price;
      });

      return prices;
    } catch (error) {
      logger.error("Failed to get multiple token prices:", error);
      return {};
    }
  }

  // Demo wallet creation (generates fake wallet data)
  generateDemoWallet(): { publicKey: string; privateKey: string } {
    const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let publicKey = "";

    // Generate a valid-looking Solana public key
    for (let i = 0; i < 44; i++) {
      publicKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return {
      publicKey,
      privateKey: "demo-private-key-" + Date.now()
    };
  }

  // Clean shutdown
  async shutdown(): Promise<void> {
    logger.info("🔗 Shutting down Solana Compatible Service...");
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const solanaService = new SolanaCompatibleService();

// Export types
export type {
  SolanaConfig,
  TokenAccount,
  TransactionSignature,
  WalletBalance,
  SwapQuote
};

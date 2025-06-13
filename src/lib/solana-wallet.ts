import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, SendTransactionError } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, TokenAccountNotFoundError, getMint } from '@solana/spl-token';
import { toast } from 'react-hot-toast';

// BOOMROACH token configuration
export const BOOMROACH_CONFIG = {
  MINT_ADDRESS: process.env.NEXT_PUBLIC_BOOMROACH_MINT || 'So11111111111111111111111111111111111111112', // Replace with actual BOOMROACH mint
  DECIMALS: 9,
  SYMBOL: 'BOOMROACH',
  NAME: 'BoomRoach Token',
  MIN_TRADING_BALANCE: 1000, // Minimum BOOMROACH tokens required for trading
  MIN_HOLDING_BALANCE: 100   // Minimum BOOMROACH tokens to hold in wallet
};

// Solana network configuration
export const SOLANA_CONFIG = {
  NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
  RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  COMMITMENT: 'confirmed' as const,
  CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet'
};

export interface WalletBalance {
  sol: number;
  boomroach: number;
  hasMinimumForTrading: boolean;
  hasMinimumHolding: boolean;
  canTrade: boolean;
}

export interface TradeRequirement {
  hasWallet: boolean;
  hasMinimumBoomroach: boolean;
  currentBalance: number;
  requiredBalance: number;
  shortfall: number;
  canProceed: boolean;
}

export interface TradeProfitConversion {
  profit: number;
  profitInBoomroach: number;
  conversionRate: number;
  newBalance: number;
  transactionHash?: string;
}

export interface SolanaTransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  confirmedAt?: number;
}

export class SolanaWalletService {
  private connection: Connection;
  private boomroachMint: PublicKey;

  constructor() {
    this.connection = new Connection(SOLANA_CONFIG.RPC_URL, SOLANA_CONFIG.COMMITMENT);
    this.boomroachMint = new PublicKey(BOOMROACH_CONFIG.MINT_ADDRESS);
  }

  /**
   * Check if a wallet address is valid
   */
  isValidWalletAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get wallet balances (SOL and BOOMROACH)
   */
  async getWalletBalance(walletAddress: string): Promise<WalletBalance> {
    try {
      if (!this.isValidWalletAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      const publicKey = new PublicKey(walletAddress);

      // Get SOL balance
      const solBalance = await this.connection.getBalance(publicKey);
      const solBalanceFormatted = solBalance / LAMPORTS_PER_SOL;

      // Get BOOMROACH balance
      const boomroachBalance = await this.getBoomroachBalance(walletAddress);

      return {
        sol: solBalanceFormatted,
        boomroach: boomroachBalance,
        hasMinimumForTrading: boomroachBalance >= BOOMROACH_CONFIG.MIN_TRADING_BALANCE,
        hasMinimumHolding: boomroachBalance >= BOOMROACH_CONFIG.MIN_HOLDING_BALANCE,
        canTrade: boomroachBalance >= BOOMROACH_CONFIG.MIN_TRADING_BALANCE
      };
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return {
        sol: 0,
        boomroach: 0,
        hasMinimumForTrading: false,
        hasMinimumHolding: false,
        canTrade: false
      };
    }
  }

  /**
   * Get BOOMROACH token balance for a wallet
   */
  async getBoomroachBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);

      // Get associated token account for BOOMROACH
      const associatedTokenAccount = await getAssociatedTokenAddress(
        this.boomroachMint,
        publicKey
      );

      try {
        const tokenAccount = await getAccount(this.connection, associatedTokenAccount);
        const balance = Number(tokenAccount.amount) / Math.pow(10, BOOMROACH_CONFIG.DECIMALS);
        return balance;
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          // Account doesn't exist - no tokens
          return 0;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error getting BOOMROACH balance:', error);
      return 0;
    }
  }

  /**
   * Check trading requirements for a wallet
   */
  async checkTradingRequirements(walletAddress: string): Promise<TradeRequirement> {
    try {
      if (!walletAddress) {
        return {
          hasWallet: false,
          hasMinimumBoomroach: false,
          currentBalance: 0,
          requiredBalance: BOOMROACH_CONFIG.MIN_TRADING_BALANCE,
          shortfall: BOOMROACH_CONFIG.MIN_TRADING_BALANCE,
          canProceed: false
        };
      }

      const balance = await this.getWalletBalance(walletAddress);
      const shortfall = Math.max(0, BOOMROACH_CONFIG.MIN_TRADING_BALANCE - balance.boomroach);

      return {
        hasWallet: true,
        hasMinimumBoomroach: balance.hasMinimumForTrading,
        currentBalance: balance.boomroach,
        requiredBalance: BOOMROACH_CONFIG.MIN_TRADING_BALANCE,
        shortfall,
        canProceed: balance.canTrade
      };
    } catch (error) {
      console.error('Error checking trading requirements:', error);
      return {
        hasWallet: false,
        hasMinimumBoomroach: false,
        currentBalance: 0,
        requiredBalance: BOOMROACH_CONFIG.MIN_TRADING_BALANCE,
        shortfall: BOOMROACH_CONFIG.MIN_TRADING_BALANCE,
        canProceed: false
      };
    }
  }

  /**
   * Convert trading profits to BOOMROACH tokens and store in wallet
   */
  async convertProfitToBoomroach(
    walletAddress: string,
    profitInUSD: number,
    conversionRate?: number
  ): Promise<TradeProfitConversion> {
    try {
      // Default conversion rate (1 USD = 10 BOOMROACH for example)
      const rate = conversionRate || 10;
      const profitInBoomroach = profitInUSD * rate;

      // In a real implementation, this would:
      // 1. Mint new BOOMROACH tokens or transfer from treasury
      // 2. Send tokens to user's wallet
      // 3. Record the transaction on-chain

      // For now, simulate the conversion
      const currentBalance = await this.getBoomroachBalance(walletAddress);
      const newBalance = currentBalance + profitInBoomroach;

      // Simulate transaction hash
      const simulatedTxHash = `profit_conversion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log(`💰 Converted $${profitInUSD} profit to ${profitInBoomroach} BOOMROACH tokens`);
      console.log(`📈 New balance: ${newBalance} BOOMROACH`);

      return {
        profit: profitInUSD,
        profitInBoomroach,
        conversionRate: rate,
        newBalance,
        transactionHash: simulatedTxHash
      };
    } catch (error) {
      console.error('Error converting profit to BOOMROACH:', error);
      throw new Error('Failed to convert profit to BOOMROACH tokens');
    }
  }

  /**
   * Create associated token account for BOOMROACH if it doesn't exist
   */
  async createBoomroachTokenAccount(
    walletAddress: string,
    wallet: any // Wallet adapter
  ): Promise<SolanaTransactionResult> {
    try {
      const publicKey = new PublicKey(walletAddress);

      // Check if account already exists
      const associatedTokenAccount = await getAssociatedTokenAddress(
        this.boomroachMint,
        publicKey
      );

      try {
        await getAccount(this.connection, associatedTokenAccount);
        // Account exists
        return {
          success: true,
          signature: 'account_exists'
        };
      } catch (error) {
        if (!(error instanceof TokenAccountNotFoundError)) {
          throw error;
        }
      }

      // Create the account
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          publicKey, // payer
          associatedTokenAccount, // associated token account
          publicKey, // owner
          this.boomroachMint // mint
        )
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign and send transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());

      // Confirm transaction
      await this.connection.confirmTransaction(signature, SOLANA_CONFIG.COMMITMENT);

      return {
        success: true,
        signature,
        confirmedAt: Date.now()
      };
    } catch (error) {
      console.error('Error creating BOOMROACH token account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Transfer BOOMROACH tokens between wallets
   */
  async transferBoomroach(
    fromWallet: string,
    toWallet: string,
    amount: number,
    wallet: any // Wallet adapter
  ): Promise<SolanaTransactionResult> {
    try {
      const fromPublicKey = new PublicKey(fromWallet);
      const toPublicKey = new PublicKey(toWallet);

      // Get associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(this.boomroachMint, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(this.boomroachMint, toPublicKey);

      // Check if destination account exists, create if not
      try {
        await getAccount(this.connection, toTokenAccount);
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          // Create destination account first
          const createAccountResult = await this.createBoomroachTokenAccount(toWallet, wallet);
          if (!createAccountResult.success) {
            throw new Error('Failed to create destination token account');
          }
        } else {
          throw error;
        }
      }

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPublicKey,
        amount * Math.pow(10, BOOMROACH_CONFIG.DECIMALS), // Convert to raw amount
        []
      );

      const transaction = new Transaction().add(transferInstruction);

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      // Sign and send transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());

      // Confirm transaction
      await this.connection.confirmTransaction(signature, SOLANA_CONFIG.COMMITMENT);

      return {
        success: true,
        signature,
        confirmedAt: Date.now()
      };
    } catch (error) {
      console.error('Error transferring BOOMROACH:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get BOOMROACH token info
   */
  async getBoomroachTokenInfo() {
    try {
      const mintInfo = await getMint(this.connection, this.boomroachMint);

      return {
        mintAddress: this.boomroachMint.toString(),
        decimals: mintInfo.decimals,
        supply: Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals),
        symbol: BOOMROACH_CONFIG.SYMBOL,
        name: BOOMROACH_CONFIG.NAME,
        minTradingBalance: BOOMROACH_CONFIG.MIN_TRADING_BALANCE,
        minHoldingBalance: BOOMROACH_CONFIG.MIN_HOLDING_BALANCE
      };
    } catch (error) {
      console.error('Error getting BOOMROACH token info:', error);
      return null;
    }
  }

  /**
   * Validate wallet connection and BOOMROACH balance for trading
   */
  async validateForTrading(walletAddress: string): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
    balance?: WalletBalance;
    requirement?: TradeRequirement;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      if (!walletAddress) {
        issues.push('No wallet connected');
        recommendations.push('Connect your Solana wallet to start trading');
        return { isValid: false, issues, recommendations };
      }

      if (!this.isValidWalletAddress(walletAddress)) {
        issues.push('Invalid wallet address format');
        recommendations.push('Please connect a valid Solana wallet');
        return { isValid: false, issues, recommendations };
      }

      const balance = await this.getWalletBalance(walletAddress);
      const requirement = await this.checkTradingRequirements(walletAddress);

      if (!balance.hasMinimumForTrading) {
        issues.push(`Insufficient BOOMROACH tokens for trading`);
        recommendations.push(`You need at least ${BOOMROACH_CONFIG.MIN_TRADING_BALANCE} BOOMROACH tokens to trade`);
        recommendations.push(`Current balance: ${balance.boomroach} BOOMROACH`);
        recommendations.push(`Required: ${requirement.shortfall} more BOOMROACH tokens`);
      }

      if (balance.sol < 0.001) {
        issues.push('Insufficient SOL for transaction fees');
        recommendations.push('Add some SOL to your wallet to cover transaction fees');
      }

      const isValid = issues.length === 0;

      return {
        isValid,
        issues,
        recommendations,
        balance,
        requirement
      };
    } catch (error) {
      console.error('Error validating for trading:', error);
      issues.push('Failed to validate wallet');
      recommendations.push('Please try reconnecting your wallet');

      return { isValid: false, issues, recommendations };
    }
  }

  /**
   * Show user-friendly trading requirement notifications
   */
  showTradingRequirementToast(requirement: TradeRequirement) {
    if (requirement.canProceed) {
      toast.success(
        `✅ Ready to trade! You have ${requirement.currentBalance.toLocaleString()} BOOMROACH tokens`,
        { duration: 3000 }
      );
    } else if (!requirement.hasWallet) {
      toast.error(
        '🔌 Please connect your Solana wallet to start trading',
        { duration: 5000 }
      );
    } else {
      toast.error(
        `❌ Need ${requirement.shortfall.toLocaleString()} more BOOMROACH tokens to trade\n` +
        `Current: ${requirement.currentBalance.toLocaleString()} | Required: ${requirement.requiredBalance.toLocaleString()}`,
        { duration: 8000 }
      );
    }
  }

  /**
   * Show profit conversion notification
   */
  showProfitConversionToast(conversion: TradeProfitConversion) {
    toast.success(
      `💰 Profit converted! +${conversion.profitInBoomroach.toLocaleString()} BOOMROACH\n` +
      `New balance: ${conversion.newBalance.toLocaleString()} BOOMROACH`,
      { duration: 5000 }
    );
  }

  /**
   * Get network status
   */
  async getNetworkStatus() {
    try {
      const slot = await this.connection.getSlot();
      const blockTime = await this.connection.getBlockTime(slot);
      const epochInfo = await this.connection.getEpochInfo();

      return {
        connected: true,
        network: SOLANA_CONFIG.NETWORK,
        cluster: SOLANA_CONFIG.CLUSTER,
        slot,
        blockTime: blockTime ? new Date(blockTime * 1000) : null,
        epoch: epochInfo.epoch,
        health: 'healthy'
      };
    } catch (error) {
      console.error('Error getting network status:', error);
      return {
        connected: false,
        network: SOLANA_CONFIG.NETWORK,
        cluster: SOLANA_CONFIG.CLUSTER,
        health: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const solanaWalletService = new SolanaWalletService();

// Export configuration for easy access
// BOOMROACH_CONFIG and SOLANA_CONFIG are already exported above as const exports

// Utility functions
export const formatBoomroachAmount = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

export const formatSolAmount = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  });
};

export const shortenWalletAddress = (address: string, chars = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const getBoomroachRequirementMessage = (currentBalance: number, required: number): string => {
  if (currentBalance >= required) {
    return `✅ You have sufficient BOOMROACH tokens (${formatBoomroachAmount(currentBalance)})`;
  }

  const shortfall = required - currentBalance;
  return `❌ You need ${formatBoomroachAmount(shortfall)} more BOOMROACH tokens to trade`;
};

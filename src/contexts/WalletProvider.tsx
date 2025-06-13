"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter, TorusWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { toast } from 'react-hot-toast';

// Import our Solana service
import {
  solanaWalletService,
  BOOMROACH_CONFIG,
  SOLANA_CONFIG,
  type WalletBalance,
  type TradeRequirement,
  type TradeProfitConversion,
  formatBoomroachAmount,
  formatSolAmount,
  shortenWalletAddress,
  getBoomroachRequirementMessage
} from '@/lib/solana-wallet';

// Wallet adapter styles
require('@solana/wallet-adapter-react-ui/styles.css');

interface WalletContextType {
  // Basic wallet info
  isConnected: boolean;
  walletAddress: string | null;
  connecting: boolean;

  // Balances
  balances: WalletBalance | null;
  loadingBalances: boolean;

  // Trading requirements
  tradingRequirement: TradeRequirement | null;
  canTrade: boolean;

  // Functions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  checkTradingRequirements: () => Promise<void>;
  validateForTrading: () => Promise<boolean>;
  convertProfitToBoomroach: (profitInUSD: number) => Promise<TradeProfitConversion | null>;

  // Network status
  networkStatus: any;

  // Error handling
  error: string | null;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

// Configure wallets
const network = SOLANA_CONFIG.NETWORK as WalletAdapterNetwork;
const endpoint = SOLANA_CONFIG.RPC_URL;

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new TorusWalletAdapter()
];

function WalletContextProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, connected, connecting, connect, disconnect, wallet, signTransaction } = useWallet();

  // State
  const [balances, setBalances] = useState<WalletBalance | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [tradingRequirement, setTradingRequirement] = useState<TradeRequirement | null>(null);
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const walletAddress = publicKey?.toString() || null;
  const isConnected = connected && !!walletAddress;
  const canTrade = tradingRequirement?.canProceed || false;

  /**
   * Clear any errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Connect wallet with error handling
   */
  const connectWallet = useCallback(async () => {
    try {
      clearError();
      if (!wallet) {
        toast.error('Please select a wallet first');
        return;
      }

      await connect();
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setError(errorMessage);
      toast.error(`Failed to connect wallet: ${errorMessage}`);
    }
  }, [connect, wallet, clearError]);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
      setBalances(null);
      setTradingRequirement(null);
      clearError();
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [disconnect, clearError]);

  /**
   * Refresh wallet balances
   */
  const refreshBalances = useCallback(async () => {
    if (!walletAddress) {
      setBalances(null);
      return;
    }

    setLoadingBalances(true);
    try {
      const balance = await solanaWalletService.getWalletBalance(walletAddress);
      setBalances(balance);

      console.log('💰 Wallet balances updated:', {
        sol: formatSolAmount(balance.sol),
        boomroach: formatBoomroachAmount(balance.boomroach),
        canTrade: balance.canTrade
      });
    } catch (error) {
      console.error('Failed to refresh balances:', error);
      setError('Failed to refresh balances');
    } finally {
      setLoadingBalances(false);
    }
  }, [walletAddress]);

  /**
   * Check trading requirements
   */
  const checkTradingRequirements = useCallback(async () => {
    if (!walletAddress) {
      setTradingRequirement(null);
      return;
    }

    try {
      const requirement = await solanaWalletService.checkTradingRequirements(walletAddress);
      setTradingRequirement(requirement);

      // Show toast notification about trading status
      if (!requirement.canProceed) {
        solanaWalletService.showTradingRequirementToast(requirement);
      }
    } catch (error) {
      console.error('Failed to check trading requirements:', error);
      setError('Failed to check trading requirements');
    }
  }, [walletAddress]);

  /**
   * Validate wallet for trading with detailed feedback
   */
  const validateForTrading = useCallback(async (): Promise<boolean> => {
    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return false;
    }

    try {
      const validation = await solanaWalletService.validateForTrading(walletAddress);

      if (validation.isValid) {
        toast.success('✅ Wallet validated for trading!');
        return true;
      } else {
        // Show detailed validation issues
        validation.issues.forEach(issue => {
          toast.error(issue, { duration: 5000 });
        });

        // Show recommendations
        if (validation.recommendations.length > 0) {
          setTimeout(() => {
            validation.recommendations.forEach((rec, index) => {
              setTimeout(() => {
                toast(rec, {
                  icon: '💡',
                  duration: 7000,
                  style: {
                    background: '#3b82f6',
                    color: 'white'
                  }
                });
              }, index * 1000);
            });
          }, 2000);
        }

        return false;
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate wallet for trading');
      return false;
    }
  }, [walletAddress]);

  /**
   * Convert trading profits to BOOMROACH tokens
   */
  const convertProfitToBoomroach = useCallback(async (profitInUSD: number): Promise<TradeProfitConversion | null> => {
    if (!walletAddress) {
      toast.error('No wallet connected');
      return null;
    }

    try {
      const conversion = await solanaWalletService.convertProfitToBoomroach(walletAddress, profitInUSD);

      // Show success notification
      solanaWalletService.showProfitConversionToast(conversion);

      // Refresh balances to reflect the new tokens
      await refreshBalances();
      await checkTradingRequirements();

      return conversion;
    } catch (error) {
      console.error('Failed to convert profit:', error);
      toast.error('Failed to convert profit to BOOMROACH tokens');
      return null;
    }
  }, [walletAddress, refreshBalances, checkTradingRequirements]);

  /**
   * Get network status
   */
  const updateNetworkStatus = useCallback(async () => {
    try {
      const status = await solanaWalletService.getNetworkStatus();
      setNetworkStatus(status);
    } catch (error) {
      console.error('Failed to get network status:', error);
    }
  }, []);

  /**
   * Initialize wallet data when connected
   */
  useEffect(() => {
    if (isConnected && walletAddress) {
      // Initialize wallet data
      refreshBalances();
      checkTradingRequirements();
      updateNetworkStatus();

      // Show connection success with wallet details
      toast.success(
        `🔗 Connected to ${wallet?.adapter?.name || 'wallet'}\n` +
        `Address: ${shortenWalletAddress(walletAddress, 6)}`,
        { duration: 4000 }
      );

      console.log('🔗 Wallet connected:', {
        address: walletAddress,
        wallet: wallet?.adapter?.name
      });
    }
  }, [isConnected, walletAddress, wallet, refreshBalances, checkTradingRequirements, updateNetworkStatus]);

  /**
   * Periodic balance updates when connected
   */
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      refreshBalances();
      checkTradingRequirements();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, refreshBalances, checkTradingRequirements]);

  /**
   * Handle wallet connection errors
   */
  useEffect(() => {
    if (connecting) {
      toast.loading('Connecting to wallet...', { id: 'wallet-connecting' });
    } else {
      toast.dismiss('wallet-connecting');
    }
  }, [connecting]);

  /**
   * Show BOOMROACH requirements info on mount
   */
  useEffect(() => {
    const hasShownInfo = sessionStorage.getItem('boomroach-info-shown');
    if (!hasShownInfo) {
      setTimeout(() => {
        toast(
          `ℹ️ BOOMROACH Trading Requirements:\n` +
          `• Minimum ${BOOMROACH_CONFIG.MIN_TRADING_BALANCE.toLocaleString()} BOOMROACH tokens required to trade\n` +
          `• Profits are automatically converted to BOOMROACH tokens\n` +
          `• All trading profits are stored in your connected wallet`,
          {
            duration: 10000,
            style: {
              background: '#0f172a',
              color: '#f1f5f9',
              border: '1px solid #334155'
            }
          }
        );
        sessionStorage.setItem('boomroach-info-shown', 'true');
      }, 2000);
    }
  }, []);

  const contextValue: WalletContextType = {
    // Basic wallet info
    isConnected,
    walletAddress,
    connecting,

    // Balances
    balances,
    loadingBalances,

    // Trading requirements
    tradingRequirement,
    canTrade,

    // Functions
    connectWallet,
    disconnectWallet,
    refreshBalances,
    checkTradingRequirements,
    validateForTrading,
    convertProfitToBoomroach,

    // Network status
    networkStatus,

    // Error handling
    error,
    clearError
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Main provider component
export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextProvider>
            {children}
          </WalletContextProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

// Hook to use wallet context
export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

// Utility hooks for specific features
export const useBoomroachBalance = () => {
  const { balances, loadingBalances, refreshBalances } = useWalletContext();
  return {
    balance: balances?.boomroach || 0,
    hasMinimumForTrading: balances?.hasMinimumForTrading || false,
    canTrade: balances?.canTrade || false,
    loading: loadingBalances,
    refresh: refreshBalances
  };
};

export const useTradingRequirement = () => {
  const { tradingRequirement, checkTradingRequirements, validateForTrading } = useWalletContext();
  return {
    requirement: tradingRequirement,
    canTrade: tradingRequirement?.canProceed || false,
    shortfall: tradingRequirement?.shortfall || 0,
    check: checkTradingRequirements,
    validate: validateForTrading
  };
};

export const useWalletActions = () => {
  const {
    connectWallet,
    disconnectWallet,
    refreshBalances,
    convertProfitToBoomroach,
    validateForTrading
  } = useWalletContext();

  return {
    connect: connectWallet,
    disconnect: disconnectWallet,
    refresh: refreshBalances,
    convertProfit: convertProfitToBoomroach,
    validate: validateForTrading
  };
};

// Export wallet configuration
export { SOLANA_CONFIG, wallets };

// Default export for layout import
export default WalletProvider;

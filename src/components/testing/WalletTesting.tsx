"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiService } from "@/lib/api";
import {
  Wallet,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  Shield,
  Zap,
  AlertTriangle,
  Info,
  ExternalLink
} from "lucide-react";

interface WalletInfo {
  address: string;
  solBalance: number;
  boomroachBalance: number;
  hasMinimumBoomroach: boolean;
  canTrade: boolean;
  tokenAccounts: number;
  recentTransactions: number;
  lastActivity: string | null;
}

interface SolanaNetworkInfo {
  network: string;
  currentSlot: number;
  blockHeight: number;
  version: string;
  rpcUrl: string;
  healthy: boolean;
}

interface TestResult {
  name: string;
  status: "pending" | "success" | "error";
  message: string;
  data?: any;
}

export function WalletTesting() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [networkInfo, setNetworkInfo] = useState<SolanaNetworkInfo | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Initialize test results
  useEffect(() => {
    const initialTests: TestResult[] = [
      { name: "Wallet Connection", status: "pending", message: "Not started" },
      { name: "Solana Network Health", status: "pending", message: "Not started" },
      { name: "SOL Balance Check", status: "pending", message: "Not started" },
      { name: "Token Account Reading", status: "pending", message: "Not started" },
      { name: "BOOMROACH Balance", status: "pending", message: "Not started" },
      { name: "Trading Eligibility", status: "pending", message: "Not started" },
      { name: "Transaction History", status: "pending", message: "Not started" },
      { name: "Real-time Price Feed", status: "pending", message: "Not started" }
    ];
    setTestResults(initialTests);
  }, []);

  // Connect wallet using Web3 wallet adapter
  const connectWallet = async () => {
    setIsConnecting(true);

    try {
      // Check if Phantom wallet is available
      if (typeof window !== "undefined" && (window as any).solana?.isPhantom) {
        const resp = await (window as any).solana.connect();
        const publicKey = resp.publicKey.toString();
        setWalletAddress(publicKey);

        updateTestResult("Wallet Connection", "success", `Connected to ${publicKey.slice(0, 8)}...${publicKey.slice(-8)}`);

        // Run all tests after connection
        await runAllTests(publicKey);
      } else {
        updateTestResult("Wallet Connection", "error", "Phantom wallet not found. Please install Phantom wallet.");
      }
    } catch (error) {
      updateTestResult("Wallet Connection", "error", `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Update individual test result
  const updateTestResult = (name: string, status: "success" | "error", message: string, data?: any) => {
    setTestResults(prev => prev.map(test =>
      test.name === name ? { ...test, status, message, data } : test
    ));
  };

  // Run all wallet tests
  const runAllTests = async (address: string) => {
    setIsRunningTests(true);

    try {
      // Test 1: Solana Network Health
      updateTestResult("Solana Network Health", "pending", "Checking network status...");
      try {
        const networkResponse = await apiService.getSolanaNetworkStatus();
        if (networkResponse.success && networkResponse.network.healthy) {
          setNetworkInfo(networkResponse.network);
          updateTestResult("Solana Network Health", "success",
            `Network healthy - Slot: ${networkResponse.network.currentSlot.toLocaleString()}`
          );
        } else {
          updateTestResult("Solana Network Health", "error", "Network unhealthy or unreachable");
        }
      } catch (error) {
        updateTestResult("Solana Network Health", "error", `Network check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Test 2: Get wallet info
      updateTestResult("SOL Balance Check", "pending", "Fetching wallet information...");
      try {
        const walletResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/wallet-info/${address}`);
        const walletData = await walletResponse.json();

        if (walletResponse.ok) {
          setWalletInfo(walletData);
          updateTestResult("SOL Balance Check", "success",
            `SOL Balance: ${walletData.solBalance.toFixed(4)} SOL`
          );

          // Test 3: Token accounts
          updateTestResult("Token Account Reading", "success",
            `Found ${walletData.tokenAccounts} token accounts`
          );

          // Test 4: BOOMROACH balance
          if (walletData.boomroachBalance > 0) {
            updateTestResult("BOOMROACH Balance", "success",
              `BOOMROACH: ${walletData.boomroachBalance.toLocaleString()} tokens`
            );
          } else {
            updateTestResult("BOOMROACH Balance", "error",
              "No BOOMROACH tokens found. Need 100+ for trading."
            );
          }

          // Test 5: Trading eligibility
          if (walletData.canTrade) {
            updateTestResult("Trading Eligibility", "success", "Wallet eligible for trading");
          } else {
            updateTestResult("Trading Eligibility", "error",
              "Trading not enabled. Need 0.01+ SOL and 100+ BOOMROACH"
            );
          }

          // Test 6: Transaction history
          updateTestResult("Transaction History", "success",
            `${walletData.recentTransactions} recent transactions found`
          );

        } else {
          updateTestResult("SOL Balance Check", "error", `Failed to fetch wallet info: ${walletData.error}`);
        }
      } catch (error) {
        updateTestResult("SOL Balance Check", "error", `Wallet info fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Test 7: Real-time price feed
      updateTestResult("Real-time Price Feed", "pending", "Testing price feeds...");
      try {
        const priceResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/trading/market/realtime`);
        const priceData = await priceResponse.json();

        if (priceResponse.ok && priceData.success) {
          const boomroachPrice = priceData.data.markets.find((m: any) => m.symbol === "BOOMROACH");
          if (boomroachPrice) {
            updateTestResult("Real-time Price Feed", "success",
              `BOOMROACH: $${boomroachPrice.price} (${boomroachPrice.change24h})`
            );
          } else {
            updateTestResult("Real-time Price Feed", "error", "BOOMROACH price not found");
          }
        } else {
          updateTestResult("Real-time Price Feed", "error", "Price feed unavailable");
        }
      } catch (error) {
        updateTestResult("Real-time Price Feed", "error", `Price feed error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

    } finally {
      setIsRunningTests(false);
    }
  };

  // Test wallet signature (for ownership verification)
  const testWalletSignature = async () => {
    if (!walletAddress) return;

    try {
      const message = `BoomRoach wallet verification: ${Date.now()}`;

      if (typeof window !== "undefined" && (window as any).solana) {
        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await (window as any).solana.signMessage(encodedMessage, "utf8");

        // Send to backend for verification
        const response = await apiService.connectWallet(walletAddress, signedMessage.signature, message);

        if (response.success) {
          updateTestResult("Wallet Connection", "success", "Signature verified - ownership confirmed");
        } else {
          updateTestResult("Wallet Connection", "error", `Signature verification failed: ${response.message}`);
        }
      }
    } catch (error) {
      updateTestResult("Wallet Connection", "error", `Signature test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).solana) {
        await (window as any).solana.disconnect();
      }
      setWalletAddress("");
      setWalletInfo(null);
      setNetworkInfo(null);

      // Reset test results
      const resetTests = testResults.map(test => ({ ...test, status: "pending" as const, message: "Not started" }));
      setTestResults(resetTests);
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "border-green-500/30 bg-green-500/10";
      case "error":
        return "border-red-500/30 bg-red-500/10";
      case "pending":
        return "border-yellow-500/30 bg-yellow-500/10";
      default:
        return "border-gray-500/30 bg-gray-500/10";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glassmorphism border-neon-green/30">
        <CardHeader>
          <CardTitle className="text-neon-green flex items-center space-x-2">
            <Wallet className="w-6 h-6" />
            <span>🧪 Wallet Integration Testing</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {walletAddress ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Connected: {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                </Badge>
              ) : (
                <Badge className="bg-gray-500/20 text-gray-400">
                  Not Connected
                </Badge>
              )}
            </div>

            <div className="flex space-x-2">
              {!walletAddress ? (
                <Button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="nuclear-gradient"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4 mr-2" />
                      Connect Phantom
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={testWalletSignature}
                    variant="outline"
                    className="border-neon-blue/30"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Test Signature
                  </Button>
                  <Button
                    onClick={() => runAllTests(walletAddress)}
                    disabled={isRunningTests}
                    variant="outline"
                    className="border-neon-orange/30"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Rerun Tests
                  </Button>
                  <Button
                    onClick={disconnectWallet}
                    variant="outline"
                    className="border-red-500/30"
                  >
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Wallet Info Display */}
          {walletInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glassmorphism border-neon-blue/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">SOL Balance</span>
                    <span className="font-bold text-neon-blue">{walletInfo.solBalance.toFixed(4)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glassmorphism border-neon-green/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">BOOMROACH</span>
                    <span className="font-bold text-neon-green">{walletInfo.boomroachBalance.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glassmorphism border-nuclear-glow/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Can Trade</span>
                    {walletInfo.canTrade ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Network Info */}
          {networkInfo && (
            <Alert className="border-neon-green/30 bg-neon-green/10">
              <Zap className="h-4 w-4 text-neon-green" />
              <AlertDescription className="text-neon-green">
                Solana {networkInfo.network} - Slot: {networkInfo.currentSlot.toLocaleString()} -
                Height: {networkInfo.blockHeight.toLocaleString()} - Version: {networkInfo.version}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card className="glassmorphism border-nuclear-glow/30">
        <CardHeader>
          <CardTitle className="text-nuclear-glow flex items-center space-x-2">
            <TrendingUp className="w-6 h-6" />
            <span>Test Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {testResults.map((test, index) => (
              <motion.div
                key={test.name}
                className={`p-4 rounded-lg border ${getStatusColor(test.status)}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(test.status)}
                    <span className="font-medium">{test.name}</span>
                  </div>
                  <Badge className={
                    test.status === "success" ? "bg-green-500/20 text-green-400" :
                    test.status === "error" ? "bg-red-500/20 text-red-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }>
                    {test.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{test.message}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert className="border-neon-blue/30 bg-neon-blue/10">
        <Info className="h-4 w-4 text-neon-blue" />
        <AlertDescription className="text-neon-blue">
          <strong>Testing Instructions:</strong><br />
          1. Install Phantom wallet browser extension<br />
          2. Create or import a Solana wallet<br />
          3. Add some SOL for gas fees (minimum 0.01 SOL)<br />
          4. Connect your wallet using the button above<br />
          5. Review all test results for validation<br />
          6. Report any failures to the development team
        </AlertDescription>
      </Alert>

      <Alert className="border-neon-orange/30 bg-neon-orange/10">
        <AlertTriangle className="h-4 w-4 text-neon-orange" />
        <AlertDescription className="text-neon-orange">
          <strong>⚠️ UAT Environment:</strong> This is a testing environment.
          No real trading will occur. All transactions are simulated for validation purposes.
        </AlertDescription>
      </Alert>
    </div>
  );
}

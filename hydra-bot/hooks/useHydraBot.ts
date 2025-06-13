'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { io, Socket } from 'socket.io-client'
import type { Position, Trade, Portfolio, TradingSignal } from '../../shared/types/hydra-bot'

export interface TradingSignal {
  id: string
  tokenMint: string
  tokenSymbol: string
  type: 'BUY' | 'SELL'
  action: 'STRONG_BUY' | 'BUY' | 'WEAK_BUY' | 'HOLD' | 'WEAK_SELL' | 'SELL' | 'STRONG_SELL'
  confidence: number
  price: number
  targetPrice?: number
  stopLoss?: number
  reasoning: string
  timestamp: string
}

export interface Position {
  id: string
  tokenMint: string
  tokenSymbol: string
  tokenName: string
  amount: number
  avgBuyPrice: number
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPct: number
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED'
}

export interface Trade {
  id: string
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'SNIPER' | 'REENTRY'
  side: 'BUY' | 'SELL'
  tokenSymbol: string
  amount: number
  price: number
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED'
  timestamp: string
}

export interface Portfolio {
  totalValue: number
  totalPnl: number
  totalPnlPercent: number
  dailyPnl: number
  weeklyPnl: number
  monthlyPnl: number
  positions: Position[]
}

export interface RiskAlert {
  id: string
  type: 'RISK_LIMIT' | 'PRICE_ALERT' | 'POSITION_ALERT' | 'SYSTEM_ALERT'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  timestamp: string
}

export interface HydraBotConfig {
  sniperEnabled: boolean
  reentryEnabled: boolean
  aiSignalsEnabled: boolean
  guardianEnabled: boolean
  maxPositionSize: number
  stopLossPercent: number
  autoTrading: boolean
}

const BACKEND_URL = process.env.NEXT_PUBLIC_HYDRA_BACKEND_URL || 'http://localhost:3001'

export function useHydraBot() {
  const { publicKey, signMessage, connected } = useWallet()

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [signals, setSignals] = useState<TradingSignal[]>([])
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([])
  const [config, setConfig] = useState<HydraBotConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)

  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('hydra_auth_token')
    if (token) {
      setAuthToken(token)
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && authToken && !socketRef.current) {
      connectWebSocket();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authToken]);

  const connectWebSocket = useCallback(() => {
    if (!authToken) return;
    socketRef.current = io(BACKEND_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling']
    });
    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      socket.emit('subscribe:signals');
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('trading:signal', (signal: TradingSignal) => setSignals(prev => [signal, ...prev.slice(0, 19)]));
    socket.on('portfolio:update', (portfolioData: Portfolio) => setPortfolio(portfolioData));
    socket.on('trade_executed', (trade: Trade) => setRecentTrades(prev => [trade, ...prev.slice(0, 9)]));
    socket.on('risk_alert', (alert: RiskAlert) => setRiskAlerts(prev => [alert, ...prev.slice(0, 4)]));
    socket.on('price_update', (priceData: any) => {
      setPortfolio(prev =>
        prev
          ? {
              ...prev,
              positions: prev.positions.map(pos =>
                pos.tokenMint === priceData.mint
                  ? { ...pos, currentPrice: priceData.price }
                  : pos
              )
            }
          : prev
      )
    });
    socket.on('error', () => setError('Connection error occurred'));
  }, [authToken]);

  const apiRequest = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      if (!authToken) throw new Error('Not authenticated')
      const response = await fetch(`${BACKEND_URL}/api${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          ...options.headers
        }
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }
      return response.json()
    },
    [authToken]
  )

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage || !connected) throw new Error('Wallet not connected')
    setLoading(true)
    setError(null)
    try {
      const { message: challengeMessage } = await fetch(`${BACKEND_URL}/api/auth/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString() })
      }).then(res => res.json())
      const signature = await signMessage(new TextEncoder().encode(challengeMessage))
      const { token } = await fetch(`${BACKEND_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          signature: Array.from(signature),
          message: challengeMessage
        })
      }).then(res => res.json())
      localStorage.setItem('hydra_auth_token', token)
      setAuthToken(token)
      setIsAuthenticated(true)
      await loadPortfolio()
      await loadSignals()
      await loadConfig()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed')
      throw error
    } finally {
      setLoading(false)
    }
  }, [publicKey, signMessage, connected])

  const loadPortfolio = useCallback(async () => {
    try {
      const data = await apiRequest('/portfolio')
      setPortfolio(data)
    } catch (error) {}
  }, [apiRequest])

  const loadSignals = useCallback(async () => {
    try {
      const data = await apiRequest('/signals?limit=20')
      setSignals(data.signals || [])
    } catch (error) {}
  }, [apiRequest])

  const loadConfig = useCallback(async () => {
    try {
      const data = await apiRequest('/users/config')
      setConfig(data)
    } catch (error) {}
  }, [apiRequest])

  const loadPortfolioMetrics = useCallback(async () => {
    try {
      await apiRequest('/hydra-bot-api/portfolio/metrics');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load portfolio metrics');
    }
  }, [apiRequest]);

  const executeSignal = useCallback(
    async (signalId: string, amount: number) => {
      setLoading(true)
      try {
        const result = await apiRequest('/trading/execute-signal', {
          method: 'POST',
          body: JSON.stringify({ signalId, amount })
        })
        return result
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to execute signal')
        throw error
      } finally {
        setLoading(false)
      }
    },
    [apiRequest]
  )

  const placeTrade = useCallback(
    async (tradeData: {
      tokenMint: string
      side: 'BUY' | 'SELL'
      amount: number
      type?: 'MARKET' | 'LIMIT'
      price?: number
    }) => {
      setLoading(true)
      try {
        const result = await apiRequest('/trading/place-trade', {
          method: 'POST',
          body: JSON.stringify(tradeData)
        })
        return result
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to place trade')
        throw error
      } finally {
        setLoading(false)
      }
    },
    [apiRequest]
  )

  const updateConfig = useCallback(
    async (newConfig: Partial<HydraBotConfig>) => {
      setLoading(true)
      try {
        const result = await apiRequest('/users/config', {
          method: 'PATCH',
          body: JSON.stringify(newConfig)
        })
        setConfig(prev => ({ ...prev!, ...newConfig }))
        return result
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to update config')
        throw error
      } finally {
        setLoading(false)
      }
    },
    [apiRequest]
  )

  const validateTrade = useCallback(async (trade: any) => {
    try {
      const data = await apiRequest('/hydra-bot-api/trading/validate', {
        method: 'POST',
        body: JSON.stringify({ trade })
      });
      return data;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to validate trade');
      throw error;
    }
  }, [apiRequest]);

  const dismissAlert = useCallback((alertId: string) => {
    setRiskAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const logout = useCallback(() => {
    localStorage.removeItem('hydra_auth_token')
    setAuthToken(null)
    setIsAuthenticated(false)
    setPortfolio(null)
    setSignals([])
    setRecentTrades([])
    setRiskAlerts([])
    setConfig(null)
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setIsConnected(false)
  }, [])

  return {
    isAuthenticated,
    portfolio,
    signals,
    recentTrades,
    riskAlerts,
    config,
    loading,
    error,
    isConnected,
    authenticate,
    executeSignal,
    placeTrade,
    updateConfig,
    dismissAlert,
    clearError,
    logout,
    loadPortfolio,
    loadSignals,
    loadConfig,
    loadPortfolioMetrics,
  }
}

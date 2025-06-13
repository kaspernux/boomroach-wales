"use client";

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Real token data types
export interface TokenMarketData {
  address: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChange24hPercent: number;
  volume24h: number;
  marketCap: number;
  liquidityUSD: number;
  holders: number;
  lastUpdated: number;
  source: 'pump.fun' | 'raydium' | 'jupiter' | 'coingecko' | 'dexscreener';
}

export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
  description: string;
  image: string;
  website: string;
  telegram: string;
  twitter: string;
  pumpFunUrl?: string;
  raydiumPool?: string;
  jupiterMarket?: string;
}

export interface TradingPair {
  baseToken: string;
  quoteToken: string;
  price: number;
  volume24h: number;
  liquidity: number;
  fdv: number;
  marketCap: number;
  priceChange: {
    '5m': number;
    '1h': number;
    '6h': number;
    '24h': number;
  };
  dex: string;
  pairAddress: string;
  url: string;
}

export interface TokenSupply {
  total: number;
  circulating: number;
  burned: number;
  locked: number;
}

export interface TradingSignal {
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timestamp: number;
  reason: string;
  engine: string;
}

export interface PriceFeed {
  price: number;
  change: number;
  volume: number;
  timestamp: number;
}

export interface MarketSummary {
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  liquidityUSD: number;
  holders: number;
  supply: TokenSupply;
  tradingPairs: number;
  lastUpdated: number;
  source: string;
}

export class RealTokenAPI {
  private static instance: RealTokenAPI;
  private axios = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  });

  static getInstance(): RealTokenAPI {
    if (!RealTokenAPI.instance) {
      RealTokenAPI.instance = new RealTokenAPI();
    }
    return RealTokenAPI.instance;
  }

  // Get current token configuration
  async getTokenConfig(): Promise<TokenConfig> {
    try {
      const response = await this.axios.get('/api/token/config');
      return response.data.data;
    } catch (error) {
      console.error('❌ Error fetching token config:', error);
      throw error;
    }
  }

  // Get real-time market data
  async getMarketData(): Promise<TokenMarketData> {
    try {
      const response = await this.axios.get('/api/token/market-data');
      return response.data.data;
    } catch (error) {
      console.error('❌ Error fetching market data:', error);
      throw error;
    }
  }

  // Get real-time price feed
  async getPriceFeed(): Promise<PriceFeed> {
    try {
      const response = await this.axios.get('/api/token/price');
      return response.data.data;
    } catch (error) {
      console.error('❌ Error fetching price feed:', error);
      throw error;
    }
  }

  // Get trading pairs
  async getTradingPairs(): Promise<TradingPair[]> {
    try {
      const response = await this.axios.get('/api/token/trading-pairs');
      return response.data.data;
    } catch (error) {
      console.error('❌ Error fetching trading pairs:', error);
      throw error;
    }
  }

  // Get historical prices
  async getHistoricalPrices(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<Array<{timestamp: number, price: number, volume: number}>> {
    try {
      const response = await this.axios.get(`/api/token/historical/${timeframe}`);
      return response.data.data;
    } catch (error) {
      console.error('❌ Error fetching historical prices:', error);
      throw error;
    }
  }

  // Get market summary
  async getMarketSummary(): Promise<MarketSummary> {
    try {
      const response = await this.axios.get('/api/market/report');
      return response.data.data;
    } catch (error) {
      console.error('❌ Error fetching market summary:', error);
      throw error;
    }
  }

  // Get admin dashboard data
  async getAdminDashboard(): Promise<any> {
    try {
      const response = await this.axios.get('/api/admin/dashboard');
      return response.data.data;
    } catch (error) {
      console.error('❌ Error fetching admin dashboard:', error);
      throw error;
    }
  }

  // Admin: Update token configuration
  async updateTokenConfig(config: Partial<TokenConfig>): Promise<TokenConfig> {
    try {
      const response = await this.axios.put('/api/admin/token/config', config);
      return response.data.data;
    } catch (error) {
      console.error('❌ Error updating token config:', error);
      throw error;
    }
  }

  // Admin: Get system status
  async getSystemStatus(): Promise<any> {
    try {
      const response = await this.axios.get('/api/admin/system/status');
      return response.data.data;
    } catch (error) {
      console.error('❌ Error fetching system status:', error);
      throw error;
    }
  }

  // Admin: Toggle trading
  async toggleTrading(enable: boolean): Promise<void> {
    try {
      const action = enable ? 'enable' : 'disable';
      await this.axios.post(`/api/admin/trading/${action}`);
    } catch (error) {
      console.error('❌ Error toggling trading:', error);
      throw error;
    }
  }

  // Admin: Set maintenance mode
  async setMaintenanceMode(enabled: boolean, message?: string): Promise<void> {
    try {
      await this.axios.post('/api/admin/system/maintenance', { enabled, message });
    } catch (error) {
      console.error('❌ Error setting maintenance mode:', error);
      throw error;
    }
  }

  // Admin: Send test Telegram message
  async sendTestTelegramMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.axios.post('/api/admin/telegram/test-message', { chatId, message });
    } catch (error) {
      console.error('❌ Error sending test message:', error);
      throw error;
    }
  }

  // Admin: Broadcast Telegram message
  async broadcastTelegramMessage(message: string, userIds?: number[]): Promise<void> {
    try {
      await this.axios.post('/api/admin/telegram/broadcast', { message, userIds });
    } catch (error) {
      console.error('❌ Error broadcasting message:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const realTokenAPI = RealTokenAPI.getInstance();

// React hooks for real-time data
import { useState, useEffect } from 'react';

export function useRealTimePrice(intervalMs = 10000) {
  const [priceData, setPriceData] = useState<PriceFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchPrice = async () => {
      try {
        const data = await realTokenAPI.getPriceFeed();
        setPriceData(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch price data');
        console.error('Price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchPrice();

    // Set up interval
    interval = setInterval(fetchPrice, intervalMs);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [intervalMs]);

  return { priceData, loading, error };
}

export function useRealTimeMarketData(intervalMs = 30000) {
  const [marketData, setMarketData] = useState<TokenMarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchMarketData = async () => {
      try {
        const data = await realTokenAPI.getMarketData();
        setMarketData(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch market data');
        console.error('Market data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchMarketData();

    // Set up interval
    interval = setInterval(fetchMarketData, intervalMs);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [intervalMs]);

  return { marketData, loading, error };
}

export function useTokenConfig() {
  const [config, setConfig] = useState<TokenConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await realTokenAPI.getTokenConfig();
        setConfig(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch token config');
        console.error('Token config fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const updateConfig = async (updates: Partial<TokenConfig>) => {
    try {
      setLoading(true);
      const updatedConfig = await realTokenAPI.updateTokenConfig(updates);
      setConfig(updatedConfig);
      setError(null);
      return updatedConfig;
    } catch (err) {
      setError('Failed to update token config');
      console.error('Token config update error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { config, loading, error, updateConfig };
}

export function useTradingPairs() {
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPairs = async () => {
      try {
        const data = await realTokenAPI.getTradingPairs();
        setPairs(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch trading pairs');
        console.error('Trading pairs fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPairs();
  }, []);

  return { pairs, loading, error };
}

export default realTokenAPI;

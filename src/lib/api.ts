"use client";

import axios, { type AxiosInstance, type AxiosResponse } from "axios";

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Types for API responses
export interface User {
  id: string;
  username: string;
  email: string;
  walletAddress?: string;
  isEmailVerified: boolean;
  isWalletConnected: boolean;
  tradingEnabled: boolean;
  securityLevel?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  requiresEmailVerification?: boolean;
  requiresWalletConnection?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username?: string;
}

export interface TradingEngine {
  id: string;
  name: string;
  description: string;
  maxPositionSize: number;
  riskLevel: "low" | "medium" | "high";
  targetWinRate: number;
  avgExecutionTime: number;
  minInvestment: number;
  fees: number;
  features: string[];
  enabled: boolean;
  subscriptionRequired: string;
  status: "RUNNING" | "STOPPED" | "ERROR";
  lastHeartbeat?: string;
  stats?: any;
  hasAccess: boolean;
  realTimeMetrics: {
    activeTrades: number;
    pendingOrders: number;
    avgSlippage: string;
    successRate: string;
    dailyPnL: number;
  };
}

export interface Portfolio {
  id: string;
  totalValue: string;
  totalPnl: number;
  dailyPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  lastUpdated: string;
}

export interface Position {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  pnlPercentage: number;
  status: string;
  openedAt: string;
}

export interface Trade {
  id: string;
  type: string;
  side: string;
  tokenSymbol: string;
  amount: number;
  price: number;
  profit: number;
  engine: string;
  status: string;
  txSignature?: string;
  blockTime?: string;
  createdAt: string;
  signal?: {
    type: string;
    confidence: number;
    reasoning: string;
  };
}

export interface TradingOrder {
  symbol: string;
  side: "buy" | "sell";
  amount: number;
  price?: number;
  engine: "sniper" | "reentry" | "ai-signals" | "guardian" | "scalper" | "arbitrage";
  orderType?: "market" | "limit" | "stop_loss" | "take_profit";
  slippage?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeInForce?: "GTC" | "IOC" | "FOK";
}

export interface Signal {
  id: string;
  engine: string;
  type: "BUY" | "SELL" | "HOLD" | "ALERT";
  symbol: string;
  confidence: number;
  price: number;
  reasoning?: string;
  timestamp: number;
}

export interface EngineControlRequest {
  action: "start" | "stop" | "restart" | "configure";
  config?: {
    maxPositionSize?: number;
    riskLevel?: "low" | "medium" | "high";
    autoTrading?: boolean;
    emergencyStop?: boolean;
  };
}

export interface MarketData {
  symbol: string;
  price: string;
  change24h: string;
  volume24h: string;
  marketCap: string;
  high24h: string;
  low24h: string;
  lastUpdate: string;
  source: string;
  blockchain: {
    network: string;
    tokenMint: string;
    holders: number;
    transactions24h: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Enhanced API Service with Authentication
export class APIService {
  private static instance: APIService;
  private axios: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add auth token
    this.axios.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.axios.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          // Redirect to login or dispatch logout action
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }
    );

    // Load token from localStorage on initialization
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
  }

  static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  private setToken(token: string): void {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  private getToken(): string | null {
    if (typeof window !== "undefined" && !this.token) {
      this.token = localStorage.getItem("auth_token");
    }
    return this.token;
  }

  private clearToken(): void {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  }

  // Authentication Methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.axios.post("/api/auth/login", credentials);
      const data = response.data;

      if (data.success && data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error: any) {
      console.error("Login failed:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Login failed",
      };
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await this.axios.post("/api/auth/register", credentials);
      const data = response.data;

      if (data.success && data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error: any) {
      console.error("Registration failed:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Registration failed",
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.axios.post("/api/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.clearToken();
    }
  }

  async getProfile(): Promise<User | null> {
    try {
      const response = await this.axios.get("/api/auth/profile");
      if (response.data.success && response.data.user) {
        return response.data.user;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Wallet Connection Methods
  async connectWallet(walletAddress: string): Promise<AuthResponse> {
    try {
      const response = await this.axios.post("/api/auth/connect-wallet", { walletAddress });
      return response.data;
    } catch (error: any) {
      console.error("Wallet connection failed:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Wallet connection failed",
      };
    }
  }

  async getTradingStatus(): Promise<any> {
    try {
      const response = await this.axios.get("/api/auth/trading-status");
      return response.data;
    } catch (error: any) {
      console.error("Failed to get trading status:", error);
      return null;
    }
  }

  // Trading Engine Methods
  async getTradingEngines(): Promise<TradingEngine[]> {
    try {
      const response = await this.axios.get<ApiResponse<{ engines: TradingEngine[] }>>("/api/trading/engines");
      return response.data.data?.engines || [];
    } catch (error) {
      console.error("Failed to fetch trading engines:", error);
      return [];
    }
  }

  async getEngineDetails(engineId: string): Promise<TradingEngine | null> {
    try {
      const response = await this.axios.get<ApiResponse<TradingEngine>>(`/api/trading/engines/${engineId}`);
      return response.data.data || null;
    } catch (error) {
      console.error("Failed to fetch engine details:", error);
      return null;
    }
  }

  async controlEngine(engineId: string, request: EngineControlRequest): Promise<ApiResponse> {
    try {
      const response = await this.axios.post<ApiResponse>(`/api/trading/engines/${engineId}/control`, request);
      return response.data;
    } catch (error: any) {
      console.error("Failed to control engine:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Engine control failed",
      };
    }
  }

  // Portfolio & Trading Methods
  async getPortfolio(): Promise<{ portfolio: Portfolio; positions: Position[] } | null> {
    try {
      const response = await this.axios.get<ApiResponse<{ portfolio: Portfolio; positions: Position[] }>>("/api/trading/portfolio");
      return response.data.data || null;
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
      return null;
    }
  }

  async placeOrder(order: TradingOrder): Promise<ApiResponse> {
    try {
      const response = await this.axios.post<ApiResponse>("/api/trading/orders", order);
      return response.data;
    } catch (error: any) {
      console.error("Failed to place order:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Order placement failed",
      };
    }
  }

  async getOrders(params?: { status?: string; engine?: string; limit?: number; offset?: number }): Promise<Trade[]> {
    try {
      const response = await this.axios.get<ApiResponse<{ orders: Trade[] }>>("/api/trading/orders", { params });
      return response.data.data?.orders || [];
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      return [];
    }
  }

  async cancelOrder(orderId: string): Promise<ApiResponse> {
    try {
      const response = await this.axios.delete<ApiResponse>(`/api/trading/orders/${orderId}`);
      return response.data;
    } catch (error: any) {
      console.error("Failed to cancel order:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Order cancellation failed",
      };
    }
  }

  async getTrades(params?: {
    engine?: string;
    status?: string;
    symbol?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<Trade[]> {
    try {
      const response = await this.axios.get<ApiResponse<{ trades: Trade[] }>>("/api/trading/trades", { params });
      return response.data.data?.trades || [];
    } catch (error) {
      console.error("Failed to fetch trades:", error);
      return [];
    }
  }

  async getPerformanceAnalytics(params?: {
    timeframe?: string;
    engine?: string;
    includeMLInsights?: boolean;
  }): Promise<any> {
    try {
      const response = await this.axios.get<ApiResponse>("/api/trading/analytics/performance", { params });
      return response.data.data || null;
    } catch (error) {
      console.error("Failed to fetch performance analytics:", error);
      return null;
    }
  }

  // Market Data Methods
  async getMarketData(symbols?: string[]): Promise<MarketData[]> {
    try {
      const params = symbols ? { symbols: symbols.join(",") } : {};
      const response = await this.axios.get<ApiResponse<{ markets: MarketData[] }>>("/api/trading/market/realtime", { params });
      return response.data.data?.markets || [];
    } catch (error) {
      console.error("Failed to fetch market data:", error);
      return [];
    }
  }

  // WebSocket Info
  async getWebSocketInfo(): Promise<any> {
    try {
      const response = await this.axios.get<ApiResponse>("/api/websocket/info");
      return response.data.data || null;
    } catch (error) {
      console.error("Failed to fetch WebSocket info:", error);
      return null;
    }
  }

  // Get Solana Network Status
  async getSolanaNetworkStatus(): Promise<any> {
    try {
      const response = await this.axios.get<ApiResponse>("/api/auth/solana-status");
      return response.data || null;
    } catch (error) {
      console.error("Failed to fetch Solana network status:", error);
      return null;
    }
  }
}

// WebSocket Service for Real-time Data
export class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.connect();
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(): void {
    if (typeof window === "undefined") return;

    const wsUrl = API_BASE_URL.replace(/^http/, "ws");

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.reconnect();
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  private handleMessage(data: any): void {
    const { event, ...payload } = data;
    const listeners = this.eventListeners.get(event);

    if (listeners) {
      listeners.forEach(callback => callback(payload));
    }
  }

  subscribe(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    // Send subscription message to server
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: `subscribe:${event}` }));
    }
  }

  unsubscribe(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  send(event: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, ...data }));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventListeners.clear();
  }
}

// Export singleton instances
export const apiService = APIService.getInstance();
export const wsService = WebSocketService.getInstance();

// Placeholder hooks for real-time features
export const useRealTimeSignals = () => {
  return {
    signals: [
      {
        id: '1',
        type: 'BUY',
        symbol: 'BOOMROACH',
        confidence: 0.89,
        price: 0.00342,
        engine: 'AI Signals',
        timestamp: Date.now() - 300000,
        reasoning: 'Strong momentum breakout detected',
        expectedReturn: 15.7,
        strength: 'High',
        timeframe: '4h'
      },
      {
        id: '2',
        type: 'SELL',
        symbol: 'SOL',
        confidence: 0.76,
        price: 195.20,
        engine: 'Sniper Bot',
        timestamp: Date.now() - 600000,
        reasoning: 'Resistance level reached',
        expectedReturn: 8.3,
        strength: 'Medium',
        timeframe: '1h'
      },
      {
        id: '3',
        type: 'BUY',
        symbol: 'BONK',
        confidence: 0.82,
        price: 0.000024,
        engine: 'Re-entry Engine',
        timestamp: Date.now() - 180000,
        reasoning: 'Oversold bounce opportunity',
        expectedReturn: 12.4,
        strength: 'High',
        timeframe: '2h'
      }
    ],
    loading: false
  };
};

export const useRealTimeBotPerformance = () => {
  return {
    performance: {
      totalTrades: 1247,
      successRate: 94.7,
      totalProfit: 12450.50,
      activeEngines: 3,
      winRate: 94.7,
      totalReturn: 247.8,
      avgTradeTime: 23.5,
      riskScore: 2.3,
      dailyProfit: 342.80,
      weeklyProfit: 1890.40,
      monthlyProfit: 8450.20,
      dailyPnL: 342.80,
      weeklyPnL: 1890.40,
      monthlyPnL: 8450.20,
      totalPnL: 12450.50,
      avgProfitPerTrade: 9.98,
      maxDrawdown: 5.2,
      sharpeRatio: 2.34,
      activeTrades: 3,
      pendingOrders: 7,
      successfulTrades: 1181,
      failedTrades: 66
    },
    loading: false
  };
};

export interface TradingSignal {
  id?: string
  token?: string
  tokenMint?: string
  tokenSymbol?: string
  type: 'BUY' | 'SELL' | 'HOLD'
  action?: string
  confidence: number
  price: number
  targetPrice?: number
  stopLoss?: number
  reasoning?: string
  reason?: string
  timestamp: number | string | Date
  engine?: string
  aiScore?: number
  riskLevel?: string
  expectedProfit?: number
  liquidityScore?: number
}

export interface Position {
  id?: string
  token?: string
  tokenMint?: string
  tokenSymbol?: string
  tokenName?: string
  symbol?: string
  amount: number
  avgBuyPrice?: number
  currentPrice?: number
  value?: number
  pnl?: number
  pnlPercentage?: number
  unrealizedPnl?: number
  unrealizedPnlPct?: number
  status?: string
  lastUpdated?: Date
}

export interface Trade {
  id: string
  token?: string
  tokenSymbol?: string
  type: string
  side?: string
  amount: number
  price: number
  value?: number
  fee?: number
  pnl?: number
  status: string
  signature?: string
  timestamp: number | string | Date
  strategy?: string
  confidence?: number
}

export interface Portfolio {
  totalValue: number
  totalPnL?: number
  totalPnLPercentage?: number
  dailyPnL?: number
  weeklyPnL?: number
  monthlyPnL?: number
  positions: Position[]
  trades?: Trade[]
  performance?: any
}
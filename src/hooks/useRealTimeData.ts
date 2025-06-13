import { useState, useEffect } from 'react'

interface RealTimePriceData {
  symbol: string
  price: number
  change24h: number
  volume24h: number
  marketCap: number
  lastUpdate: Date
}

interface CommunityMetrics {
  onlineUsers: number
  totalHolders: number
  messagesLast24h: number
  activeTrades: number
  communityScore: number
  socialSentiment: 'bullish' | 'bearish' | 'neutral'
  lastUpdate: Date
}

interface TradingMetrics {
  totalVolume24h: number
  successfulTrades: number
  aiSignalsAccuracy: number
  avgProfitPerTrade: number
  topTraders: Array<{
    address: string
    profit24h: number
    winRate: number
  }>
  lastUpdate: Date
}

interface RealTimeData {
  prices: Record<string, RealTimePriceData>
  community: CommunityMetrics | null
  trading: TradingMetrics | null
  isConnected: boolean
  error: string | null
}

export function useRealTimeData() {
  const [data, setData] = useState<RealTimeData>({
    prices: {},
    community: null,
    trading: null,
    isConnected: false,
    error: null
  })

  useEffect(() => {
    const socket = new WebSocket(process.env.NEXT_PUBLIC_REALTIME_WS_URL || 'ws://localhost:3001')

    socket.onopen = () => {
      setData(prev => ({ ...prev, isConnected: true, error: null }))
      socket.send(JSON.stringify({ type: 'subscribe:prices' }))
      socket.send(JSON.stringify({ type: 'subscribe:community' }))
      socket.send(JSON.stringify({ type: 'subscribe:trading' }))
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'prices:update') {
          setData(prev => ({ ...prev, prices: msg.data }))
        }
        if (msg.type === 'community:update') {
          setData(prev => ({ ...prev, community: msg.data }))
        }
        if (msg.type === 'trading:update') {
          setData(prev => ({ ...prev, trading: msg.data }))
        }
      } catch {
        // ignore parse errors
      }
    }

    socket.onerror = () => {
      setData(prev => ({ ...prev, isConnected: false, error: 'WebSocket error' }))
    }

    socket.onclose = () => {
      setData(prev => ({ ...prev, isConnected: false }))
    }

    return () => socket.close()
  }, [])

  return {
    data,
    isConnected: data.isConnected,
    error: data.error
  }
}

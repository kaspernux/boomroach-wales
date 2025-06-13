import { logger } from '../../../shared/utils/logger'

export class PriceService {
  private static instance: PriceService
  private prices: Map<string, any> = new Map()

  constructor() {
    // Initialize with some mock data
    this.prices.set('SOL/USDC', {
      symbol: 'SOL/USDC',
      price: 98.75,
      change24h: 5.2,
      volume24h: 2500000,
      timestamp: new Date().toISOString()
    })

    this.prices.set('BTC/USDC', {
      symbol: 'BTC/USDC',
      price: 45200.50,
      change24h: -2.1,
      volume24h: 15000000,
      timestamp: new Date().toISOString()
    })
  }

  static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService()
    }
    return PriceService.instance
  }

  static async getCurrentPrices(): Promise<any[]> {
    const instance = PriceService.getInstance()
    return Array.from(instance.prices.values())
  }

  static async getPrice(symbol: string): Promise<any | null> {
    const instance = PriceService.getInstance()
    return instance.prices.get(symbol) || null
  }

  static async getPriceHistory(symbol: string, hours: number): Promise<any[]> {
    // Mock price history
    const currentPrice = await PriceService.getPrice(symbol)
    if (!currentPrice) return []

    const history = []
    for (let i = hours; i >= 0; i--) {
      history.push({
        price: currentPrice.price + (Math.random() - 0.5) * 10,
        timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString()
      })
    }
    return history
  }

  static async getMarketSummary(): Promise<any> {
    const prices = await PriceService.getCurrentPrices()

    return {
      totalVolume24h: prices.reduce((sum, p) => sum + p.volume24h, 0),
      avgChange24h: prices.reduce((sum, p) => sum + p.change24h, 0) / prices.length,
      marketSentiment: {
        bullish: prices.filter(p => p.change24h > 0).length,
        bearish: prices.filter(p => p.change24h < 0).length
      },
      totalTokens: prices.length,
      lastUpdate: new Date().toISOString()
    }
  }

  static async getTradingPairs(): Promise<string[]> {
    const instance = PriceService.getInstance()
    return Array.from(instance.prices.keys())
  }

  static async getWebSocketStats(): Promise<any> {
    return {
      activeConnections: 42,
      subscriptions: 156,
      lastUpdate: new Date().toISOString()
    }
  }

  async updatePrice(symbol: string, price: number): Promise<void> {
    const existingPrice = this.prices.get(symbol)
    if (existingPrice) {
      const change24h = ((price - existingPrice.price) / existingPrice.price) * 100
      this.prices.set(symbol, {
        ...existingPrice,
        price,
        change24h,
        timestamp: new Date().toISOString()
      })
    } else {
      this.prices.set(symbol, {
        symbol,
        price,
        change24h: 0,
        volume24h: 1000000,
        timestamp: new Date().toISOString()
      })
    }

    logger.info('Price updated', { symbol, price })
  }
}

/**
 * Service métier Hydra-Bot
 * Toute la logique métier (calculs PnL, risk, stratégie, validation de trade, etc.)
 * utilisée par les routes API et non exposée côté frontend.
 */

import type { Position, Trade, Portfolio, TradingSignal } from '../../shared/types/hydra-bot'

/**
 * Calcule le PnL non réalisé pour une position.
 */
export function calculateUnrealizedPnl(position: Position): number {
  return (position.currentPrice - position.avgBuyPrice) * position.amount
}

/**
 * Calcule le pourcentage de PnL non réalisé pour une position.
 */
export function calculateUnrealizedPnlPct(position: Position): number {
  if (position.avgBuyPrice === 0) return 0
  return ((position.currentPrice - position.avgBuyPrice) / position.avgBuyPrice) * 100
}

/**
 * Calcule le PnL total du portefeuille.
 */
export function calculatePortfolioPnl(positions: Position[]): number {
  return positions.reduce((sum, pos) => sum + calculateUnrealizedPnl(pos), 0)
}

/**
 * Calcule le pourcentage de PnL total du portefeuille.
 */
export function calculatePortfolioPnlPct(positions: Position[]): number {
  const invested = positions.reduce((sum, pos) => sum + pos.avgBuyPrice * pos.amount, 0)
  if (invested === 0) return 0
  return (calculatePortfolioPnl(positions) / invested) * 100
}

/**
 * Détecte les alertes de risque sur le portefeuille.
 */
export function detectRiskAlerts(positions: Position[], config: { stopLossPercent: number }): string[] {
  const alerts: string[] = []
  positions.forEach(pos => {
    const pnlPct = calculateUnrealizedPnlPct(pos)
    if (pnlPct <= -Math.abs(config.stopLossPercent)) {
      alerts.push(
        `Stop loss triggered for ${pos.tokenSymbol}: ${pnlPct.toFixed(2)}%`
      )
    }
  })
  return alerts
}

/**
 * Valide un trade selon la stratégie (exemple simple).
 */
export function validateTrade(trade: Trade, config: { maxPositionSize: number }): boolean {
  // Exemple : refuse si la taille dépasse la limite
  return trade.amount <= config.maxPositionSize
}

/**
 * Génère un signal de trading (exemple fictif).
 */
export function generateTradingSignal(position: Position): string {
  if (position.unrealizedPnlPct > 10) return 'TAKE_PROFIT'
  if (position.unrealizedPnlPct < -5) return 'STOP_LOSS'
  return 'HOLD'
}

// Ajoute ici d'autres fonctions métier nécessaires à Hydra-Bot (Sharpe, drawdown, etc.)

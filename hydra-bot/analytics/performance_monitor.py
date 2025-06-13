"""
Advanced Performance Monitor for Hydra Bot
Real-time analytics and BoomRoach value optimization
"""

import asyncio
import json
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from decimal import Decimal
import redis
from sqlalchemy.orm import Session

from core.database import get_db
from models.trading import Trade, Portfolio, Performance
from services.telegram_service import TelegramService
from utils.calculations import calculate_sharpe_ratio, calculate_max_drawdown
from config.settings import get_settings

settings = get_settings()

@dataclass
class PerformanceMetrics:
    """Real-time performance metrics"""
    total_trades: int
    successful_trades: int
    win_rate: float
    total_pnl: float
    daily_pnl: float
    weekly_pnl: float
    monthly_pnl: float
    avg_profit_per_trade: float
    avg_loss_per_trade: float
    best_trade: float
    worst_trade: float
    sharpe_ratio: float
    max_drawdown: float
    profit_factor: float
    avg_execution_time: float
    current_positions: int
    portfolio_value: float
    boomroach_treasury_balance: float
    commission_earned_today: float
    lp_tokens_burned_today: float
    boomroach_price_impact: float

@dataclass
class TradingSignalMetrics:
    """Trading signal performance analytics"""
    sniper_signals: int
    sniper_success_rate: float
    reentry_signals: int
    reentry_success_rate: float
    ai_signals: int
    ai_success_rate: float
    manual_trades: int
    manual_success_rate: float
    avg_signal_confidence: float
    signal_accuracy_trend: List[float]

@dataclass
class RiskMetrics:
    """Risk management analytics"""
    current_risk_score: float
    portfolio_concentration: float
    correlation_risk: float
    volatility_score: float
    var_1d: float  # Value at Risk 1 day
    var_7d: float  # Value at Risk 7 days
    stress_test_score: float
    emergency_stops_triggered: int
    risk_alerts_today: int

class PerformanceMonitor:
    """Advanced performance monitoring and optimization system"""

    def __init__(self):
        self.redis_client = redis.Redis.from_url(settings.REDIS_URL)
        self.telegram_service = TelegramService()
        self.logger = logging.getLogger(__name__)

        # Performance tracking
        self.metrics_history: List[PerformanceMetrics] = []
        self.optimization_parameters = {
            'target_win_rate': 0.65,
            'target_sharpe_ratio': 2.0,
            'max_drawdown_threshold': 0.05,
            'min_profit_factor': 1.5,
            'target_execution_time': 2.0,
            'boomroach_value_weight': 0.3  # Weight for BoomRoach optimization
        }

        # BoomRoach specific optimization
        self.boomroach_metrics = {
            'commission_target_daily': 1000.0,  # $1000 daily target
            'burn_threshold': 1000.0,  # Burn when treasury reaches $1000
            'price_impact_target': 0.05,  # 5% daily price impact target
            'treasury_allocation': 0.70,  # 70% to treasury
            'burn_allocation': 0.20,     # 20% to LP burning
            'buyback_allocation': 0.10   # 10% to buybacks
        }

        # Real-time monitoring
        self.monitoring_active = False
        self.alert_thresholds = {
            'win_rate_drop': 0.10,  # Alert if win rate drops 10%
            'drawdown_limit': 0.04,  # Alert at 4% drawdown
            'execution_time_spike': 5.0,  # Alert if execution > 5s
            'boomroach_impact_low': 0.01  # Alert if price impact < 1%
        }

    async def start_monitoring(self):
        """Start real-time performance monitoring"""
        self.monitoring_active = True
        self.logger.info("🚀 Advanced Performance Monitor started")

        # Start monitoring tasks
        tasks = [
            self.monitor_trading_performance(),
            self.monitor_boomroach_optimization(),
            self.monitor_risk_metrics(),
            self.auto_parameter_optimization(),
            self.generate_performance_reports()
        ]

        await asyncio.gather(*tasks)

    async def monitor_trading_performance(self):
        """Real-time trading performance monitoring"""
        while self.monitoring_active:
            try:
                # Get current performance metrics
                metrics = await self.calculate_performance_metrics()

                # Store metrics in Redis for real-time access
                await self.store_metrics(metrics)

                # Check for performance alerts
                await self.check_performance_alerts(metrics)

                # Optimize parameters if needed
                if await self.should_optimize_parameters(metrics):
                    await self.optimize_trading_parameters(metrics)

                # Update BoomRoach value optimization
                await self.optimize_boomroach_value(metrics)

                self.logger.info(f"📊 Performance: Win Rate: {metrics.win_rate:.1%}, "
                               f"Daily P&L: ${metrics.daily_pnl:,.2f}, "
                               f"Sharpe: {metrics.sharpe_ratio:.2f}")

            except Exception as e:
                self.logger.error(f"Performance monitoring error: {e}")

            await asyncio.sleep(30)  # Update every 30 seconds

    async def calculate_performance_metrics(self) -> PerformanceMetrics:
        """Calculate comprehensive performance metrics"""
        db = next(get_db())

        try:
            # Get trades from last 24 hours
            yesterday = datetime.utcnow() - timedelta(days=1)
            recent_trades = db.query(Trade).filter(
                Trade.created_at >= yesterday
            ).all()

            # Get all trades for comprehensive analysis
            all_trades = db.query(Trade).all()

            # Calculate basic metrics
            total_trades = len(all_trades)
            successful_trades = len([t for t in all_trades if t.pnl and t.pnl > 0])
            win_rate = successful_trades / total_trades if total_trades > 0 else 0

            # P&L calculations
            daily_pnl = sum(t.pnl or 0 for t in recent_trades)
            weekly_pnl = sum(t.pnl or 0 for t in all_trades
                           if t.created_at >= datetime.utcnow() - timedelta(days=7))
            monthly_pnl = sum(t.pnl or 0 for t in all_trades
                            if t.created_at >= datetime.utcnow() - timedelta(days=30))
            total_pnl = sum(t.pnl or 0 for t in all_trades)

            # Performance calculations
            profits = [t.pnl for t in all_trades if t.pnl and t.pnl > 0]
            losses = [abs(t.pnl) for t in all_trades if t.pnl and t.pnl < 0]

            avg_profit = np.mean(profits) if profits else 0
            avg_loss = np.mean(losses) if losses else 0
            best_trade = max(profits) if profits else 0
            worst_trade = -max(losses) if losses else 0

            # Risk metrics
            returns = [t.pnl or 0 for t in all_trades]
            sharpe_ratio = calculate_sharpe_ratio(returns) if returns else 0
            max_drawdown = calculate_max_drawdown(returns) if returns else 0
            profit_factor = avg_profit / avg_loss if avg_loss > 0 else 0

            # Execution performance
            execution_times = [t.execution_time or 0 for t in recent_trades
                             if t.execution_time]
            avg_execution_time = np.mean(execution_times) if execution_times else 0

            # Portfolio metrics
            portfolio = db.query(Portfolio).first()
            portfolio_value = portfolio.total_value if portfolio else 0
            current_positions = portfolio.positions_count if portfolio else 0

            # BoomRoach specific metrics
            boomroach_treasury = await self.get_boomroach_treasury_balance()
            commission_today = await self.get_daily_commission_earned()
            lp_burned_today = await self.get_lp_tokens_burned_today()
            price_impact = await self.calculate_boomroach_price_impact()

            return PerformanceMetrics(
                total_trades=total_trades,
                successful_trades=successful_trades,
                win_rate=win_rate,
                total_pnl=total_pnl,
                daily_pnl=daily_pnl,
                weekly_pnl=weekly_pnl,
                monthly_pnl=monthly_pnl,
                avg_profit_per_trade=avg_profit,
                avg_loss_per_trade=avg_loss,
                best_trade=best_trade,
                worst_trade=worst_trade,
                sharpe_ratio=sharpe_ratio,
                max_drawdown=max_drawdown,
                profit_factor=profit_factor,
                avg_execution_time=avg_execution_time,
                current_positions=current_positions,
                portfolio_value=portfolio_value,
                boomroach_treasury_balance=boomroach_treasury,
                commission_earned_today=commission_today,
                lp_tokens_burned_today=lp_burned_today,
                boomroach_price_impact=price_impact
            )

        finally:
            db.close()

    async def optimize_boomroach_value(self, metrics: PerformanceMetrics):
        """Optimize parameters specifically for BoomRoach value maximization"""

        # Calculate BoomRoach optimization score
        boomroach_score = self.calculate_boomroach_score(metrics)

        optimization_actions = []

        # Treasury burning optimization
        if metrics.boomroach_treasury_balance >= self.boomroach_metrics['burn_threshold']:
            burn_amount = metrics.boomroach_treasury_balance * self.boomroach_metrics['burn_allocation']
            await self.trigger_lp_burn(burn_amount)
            optimization_actions.append(f"🔥 LP Burn triggered: ${burn_amount:,.2f}")

        # Commission rate optimization
        if metrics.commission_earned_today < self.boomroach_metrics['commission_target_daily']:
            # Increase trading frequency for more commissions
            await self.adjust_trading_frequency(increase=True)
            optimization_actions.append("📈 Increased trading frequency for commission optimization")

        # Price impact optimization
        if metrics.boomroach_price_impact < self.boomroach_metrics['price_impact_target']:
            await self.optimize_for_price_impact()
            optimization_actions.append("🎯 Optimized trading for BoomRoach price impact")

        # Buyback optimization
        buyback_amount = metrics.commission_earned_today * self.boomroach_metrics['buyback_allocation']
        if buyback_amount > 100:  # Minimum $100 for buyback
            await self.trigger_boomroach_buyback(buyback_amount)
            optimization_actions.append(f"💎 BoomRoach buyback: ${buyback_amount:,.2f}")

        if optimization_actions:
            message = "🚀 **BoomRoach Value Optimization**\n\n" + "\n".join(optimization_actions)
            await self.telegram_service.send_admin_alert(message)

        # Store optimization metrics
        await self.store_boomroach_metrics(boomroach_score, optimization_actions)

    def calculate_boomroach_score(self, metrics: PerformanceMetrics) -> float:
        """Calculate overall BoomRoach optimization score (0-100)"""
        score = 0

        # Commission generation (25 points)
        commission_ratio = metrics.commission_earned_today / self.boomroach_metrics['commission_target_daily']
        score += min(25, commission_ratio * 25)

        # Price impact (25 points)
        impact_ratio = metrics.boomroach_price_impact / self.boomroach_metrics['price_impact_target']
        score += min(25, impact_ratio * 25)

        # Treasury growth (25 points)
        treasury_score = min(25, metrics.boomroach_treasury_balance / 10000 * 25)
        score += treasury_score

        # Trading performance (25 points)
        performance_score = (metrics.win_rate * 15) + (min(metrics.sharpe_ratio, 3) / 3 * 10)
        score += performance_score

        return min(100, score)

    async def auto_parameter_optimization(self):
        """Automatically optimize trading parameters based on performance"""
        while self.monitoring_active:
            try:
                metrics = await self.calculate_performance_metrics()

                # Parameter adjustment logic
                adjustments = {}

                # Win rate optimization
                if metrics.win_rate < self.optimization_parameters['target_win_rate']:
                    # Increase signal confidence threshold
                    adjustments['min_signal_confidence'] = min(0.85,
                        await self.get_current_parameter('min_signal_confidence') + 0.05)

                # Sharpe ratio optimization
                if metrics.sharpe_ratio < self.optimization_parameters['target_sharpe_ratio']:
                    # Reduce position sizes for better risk-adjusted returns
                    adjustments['max_position_size'] = max(0.5,
                        await self.get_current_parameter('max_position_size') * 0.95)

                # Execution time optimization
                if metrics.avg_execution_time > self.optimization_parameters['target_execution_time']:
                    # Increase priority fees for faster execution
                    adjustments['priority_fee'] = min(0.05,
                        await self.get_current_parameter('priority_fee') * 1.1)

                # Drawdown protection
                if metrics.max_drawdown > self.optimization_parameters['max_drawdown_threshold']:
                    # Implement emergency risk reduction
                    adjustments['max_daily_loss'] = max(0.02,
                        await self.get_current_parameter('max_daily_loss') * 0.8)

                if adjustments:
                    await self.apply_parameter_adjustments(adjustments)

                    message = "🔧 **Auto-Optimization Applied**\n\n"
                    for param, value in adjustments.items():
                        message += f"• {param}: {value}\n"

                    await self.telegram_service.send_admin_alert(message)

            except Exception as e:
                self.logger.error(f"Auto-optimization error: {e}")

            await asyncio.sleep(300)  # Check every 5 minutes

    async def generate_performance_reports(self):
        """Generate comprehensive performance reports"""
        while self.monitoring_active:
            try:
                # Generate hourly summary
                await self.generate_hourly_report()

                # Generate daily report (at midnight)
                if datetime.utcnow().hour == 0:
                    await self.generate_daily_report()

                # Generate weekly report (on Sundays)
                if datetime.utcnow().weekday() == 6 and datetime.utcnow().hour == 0:
                    await self.generate_weekly_report()

            except Exception as e:
                self.logger.error(f"Report generation error: {e}")

            await asyncio.sleep(3600)  # Check every hour

    async def generate_daily_report(self):
        """Generate comprehensive daily performance report"""
        metrics = await self.calculate_performance_metrics()
        signal_metrics = await self.calculate_signal_metrics()
        risk_metrics = await self.calculate_risk_metrics()
        boomroach_score = self.calculate_boomroach_score(metrics)

        report = f"""
📊 **Daily Performance Report** - {datetime.utcnow().strftime('%Y-%m-%d')}

💰 **Trading Performance**
• Total P&L: ${metrics.daily_pnl:,.2f}
• Win Rate: {metrics.win_rate:.1%}
• Trades: {len([t for t in await self.get_daily_trades()])}
• Avg Execution: {metrics.avg_execution_time:.2f}s
• Sharpe Ratio: {metrics.sharpe_ratio:.2f}

🎯 **BoomRoach Optimization Score: {boomroach_score:.1f}/100**
• Commission Earned: ${metrics.commission_earned_today:,.2f}
• LP Tokens Burned: ${metrics.lp_tokens_burned_today:,.2f}
• Price Impact: {metrics.boomroach_price_impact:.2%}
• Treasury Balance: ${metrics.boomroach_treasury_balance:,.2f}

📈 **Signal Performance**
• Sniper Success: {signal_metrics.sniper_success_rate:.1%}
• Re-entry Success: {signal_metrics.reentry_success_rate:.1%}
• AI Signal Success: {signal_metrics.ai_success_rate:.1%}
• Avg Confidence: {signal_metrics.avg_signal_confidence:.1%}

🛡️ **Risk Metrics**
• Current Risk Score: {risk_metrics.current_risk_score:.1f}/10
• Max Drawdown: {metrics.max_drawdown:.2%}
• Portfolio Concentration: {risk_metrics.portfolio_concentration:.1%}
• VaR (1d): ${risk_metrics.var_1d:,.2f}

🚀 **Next 24h Targets**
• Commission Target: ${self.boomroach_metrics['commission_target_daily']:,.0f}
• Price Impact Target: {self.boomroach_metrics['price_impact_target']:.1%}
• Win Rate Target: {self.optimization_parameters['target_win_rate']:.1%}
"""

        await self.telegram_service.send_performance_report(report)
        await self.store_daily_report(report)

    async def trigger_lp_burn(self, amount: float):
        """Trigger LP token burning for BoomRoach value optimization"""
        try:
            # Call LP burning service
            burn_result = await self.execute_lp_burn(amount)

            if burn_result['success']:
                message = f"""
🔥 **LP BURN EXECUTED**

💰 Amount Burned: ${amount:,.2f}
🔗 Transaction: {burn_result.get('tx_hash', 'N/A')}
📈 Estimated Price Impact: +{burn_result.get('price_impact', 0):.2%}
🏆 BoomRoach holders rejoice!

The roach army grows stronger! 🪳💎
"""
                await self.telegram_service.broadcast_burn_notification(message)

                # Update metrics
                await self.redis_client.hset(
                    'boomroach:burns',
                    datetime.utcnow().isoformat(),
                    json.dumps(burn_result)
                )

        except Exception as e:
            self.logger.error(f"LP burn execution error: {e}")
            await self.telegram_service.send_admin_alert(f"❌ LP Burn failed: {e}")

    async def monitor_boomroach_optimization(self):
        """Dedicated BoomRoach value optimization monitoring"""
        while self.monitoring_active:
            try:
                # Check price action and optimize accordingly
                price_data = await self.get_boomroach_price_data()

                # Optimize trading based on price trends
                if price_data['trend'] == 'bullish':
                    await self.optimize_for_bull_market()
                elif price_data['trend'] == 'bearish':
                    await self.optimize_for_bear_market()

                # Community milestone celebrations
                await self.check_community_milestones()

                # Automatic treasury management
                await self.manage_treasury_automatically()

            except Exception as e:
                self.logger.error(f"BoomRoach optimization error: {e}")

            await asyncio.sleep(60)  # Check every minute

    async def optimize_for_bull_market(self):
        """Optimize trading parameters for bull market conditions"""
        adjustments = {
            'position_size_multiplier': 1.2,  # Increase position sizes
            'take_profit_threshold': 0.30,    # Higher take profits
            'stop_loss_threshold': 0.08,      # Looser stop losses
            'trading_frequency': 1.5          # More aggressive trading
        }
        await self.apply_market_adjustments(adjustments, "bull")

    async def optimize_for_bear_market(self):
        """Optimize trading parameters for bear market conditions"""
        adjustments = {
            'position_size_multiplier': 0.8,  # Reduce position sizes
            'take_profit_threshold': 0.15,    # Quick profits
            'stop_loss_threshold': 0.05,      # Tight stop losses
            'trading_frequency': 0.7          # More conservative
        }
        await self.apply_market_adjustments(adjustments, "bear")

    # Additional helper methods...
    async def store_metrics(self, metrics: PerformanceMetrics):
        """Store metrics in Redis for real-time access"""
        await self.redis_client.hset(
            'hydra:performance',
            'current',
            json.dumps(asdict(metrics), default=str)
        )

    async def get_current_parameter(self, param_name: str) -> float:
        """Get current trading parameter value"""
        # Implementation to get from config/database
        pass

    async def apply_parameter_adjustments(self, adjustments: Dict[str, Any]):
        """Apply parameter adjustments to trading engines"""
        # Implementation to update trading engine parameters
        pass

    # ... Additional methods for signal metrics, risk metrics, etc.

if __name__ == "__main__":
    monitor = PerformanceMonitor()
    asyncio.run(monitor.start_monitoring())

import numpy as np
import tensorflow as tf
from typing import Dict, List, Tuple, Optional, Any
import json
import asyncio
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TradingEnvironment:
    """
    Trading environment for reinforcement learning
    Simulates market conditions and trading actions
    """

    def __init__(self, market_data: np.ndarray, initial_balance: float = 10000):
        self.market_data = market_data
        self.initial_balance = initial_balance
        self.current_step = 0
        self.balance = initial_balance
        self.position = 0.0  # Current position size
        self.max_steps = len(market_data) - 1

        # Trading parameters
        self.transaction_cost = 0.001  # 0.1% transaction cost
        self.max_position_size = 1.0   # Maximum position as fraction of balance

        # State space: [price_features, balance, position, technical_indicators]
        self.state_size = 20  # Configurable based on features
        self.action_size = 3  # 0: Hold, 1: Buy, 2: Sell

        # Performance tracking
        self.trades = []
        self.portfolio_values = []
        self.reset()

    def reset(self) -> np.ndarray:
        """Reset environment to initial state"""
        self.current_step = 0
        self.balance = self.initial_balance
        self.position = 0.0
        self.trades = []
        self.portfolio_values = [self.initial_balance]
        return self._get_state()

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, Dict]:
        """
        Execute one step in the environment

        Args:
            action: 0=Hold, 1=Buy, 2=Sell

        Returns:
            next_state, reward, done, info
        """
        if self.current_step >= self.max_steps:
            return self._get_state(), 0, True, {}

        current_price = self.market_data[self.current_step]
        next_price = self.market_data[self.current_step + 1]

        # Execute action
        reward = self._execute_action(action, current_price, next_price)

        # Move to next step
        self.current_step += 1

        # Calculate portfolio value
        portfolio_value = self.balance + (self.position * next_price)
        self.portfolio_values.append(portfolio_value)

        # Check if episode is done
        done = self.current_step >= self.max_steps or portfolio_value <= 0

        # Get next state
        next_state = self._get_state()

        # Info dict for debugging
        info = {
            'portfolio_value': portfolio_value,
            'balance': self.balance,
            'position': self.position,
            'price': next_price,
            'total_trades': len(self.trades)
        }

        return next_state, reward, done, info

    def _execute_action(self, action: int, current_price: float, next_price: float) -> float:
        """Execute trading action and calculate reward"""
        reward = 0.0

        if action == 1:  # Buy
            if self.balance > 0:
                # Calculate how much we can buy
                available_balance = self.balance * 0.95  # Keep 5% as buffer
                shares_to_buy = available_balance / current_price

                # Apply transaction cost
                transaction_cost = shares_to_buy * current_price * self.transaction_cost

                if self.balance >= (shares_to_buy * current_price + transaction_cost):
                    self.position += shares_to_buy
                    self.balance -= (shares_to_buy * current_price + transaction_cost)

                    # Record trade
                    self.trades.append({
                        'type': 'BUY',
                        'shares': shares_to_buy,
                        'price': current_price,
                        'cost': transaction_cost,
                        'timestamp': self.current_step
                    })

                    # Reward based on next price movement
                    price_change = (next_price - current_price) / current_price
                    reward = price_change * shares_to_buy * current_price

        elif action == 2:  # Sell
            if self.position > 0:
                # Sell all position
                shares_to_sell = self.position
                transaction_cost = shares_to_sell * current_price * self.transaction_cost

                self.balance += (shares_to_sell * current_price - transaction_cost)
                self.position = 0

                # Record trade
                self.trades.append({
                    'type': 'SELL',
                    'shares': shares_to_sell,
                    'price': current_price,
                    'cost': transaction_cost,
                    'timestamp': self.current_step
                })

                # Reward based on avoiding loss or capturing profit
                price_change = (next_price - current_price) / current_price
                reward = -price_change * shares_to_sell * current_price

        # Penalty for holding when strong signals present
        price_volatility = abs((next_price - current_price) / current_price)
        if action == 0 and price_volatility > 0.02:  # 2% movement
            reward -= price_volatility * 100  # Opportunity cost penalty

        return reward

    def _get_state(self) -> np.ndarray:
        """Get current state representation"""
        if self.current_step >= len(self.market_data):
            # Return zero state if we're past the data
            return np.zeros(self.state_size)

        # Price features (last 10 steps normalized)
        look_back = 10
        start_idx = max(0, self.current_step - look_back + 1)
        price_window = self.market_data[start_idx:self.current_step + 1]

        # Normalize prices
        if len(price_window) > 1:
            price_features = (price_window - price_window[0]) / price_window[0]
        else:
            price_features = np.array([0.0])

        # Pad if necessary
        if len(price_features) < look_back:
            price_features = np.pad(price_features, (look_back - len(price_features), 0))

        # Technical indicators
        technical_indicators = self._calculate_technical_indicators()

        # Portfolio state
        current_price = self.market_data[self.current_step]
        portfolio_value = self.balance + (self.position * current_price)

        portfolio_state = np.array([
            self.balance / self.initial_balance,  # Normalized balance
            self.position * current_price / self.initial_balance,  # Position value normalized
            portfolio_value / self.initial_balance,  # Total portfolio normalized
            len(self.trades) / 100.0,  # Trade count normalized
        ])

        # Combine all features
        state = np.concatenate([
            price_features,
            technical_indicators,
            portfolio_state
        ])

        # Ensure state is exactly the right size
        if len(state) > self.state_size:
            state = state[:self.state_size]
        elif len(state) < self.state_size:
            state = np.pad(state, (0, self.state_size - len(state)))

        return state.astype(np.float32)

    def _calculate_technical_indicators(self) -> np.ndarray:
        """Calculate technical indicators for current state"""
        window_size = min(14, self.current_step + 1)
        start_idx = max(0, self.current_step - window_size + 1)
        price_window = self.market_data[start_idx:self.current_step + 1]

        if len(price_window) < 2:
            return np.zeros(6)

        # Simple moving average
        sma = np.mean(price_window)
        current_price = self.market_data[self.current_step]
        sma_ratio = current_price / sma if sma > 0 else 1.0

        # Price momentum
        momentum = (price_window[-1] - price_window[0]) / price_window[0] if price_window[0] > 0 else 0.0

        # Volatility
        returns = np.diff(price_window) / price_window[:-1]
        volatility = np.std(returns) if len(returns) > 1 else 0.0

        # RSI approximation
        gains = np.maximum(returns, 0)
        losses = np.maximum(-returns, 0)
        avg_gain = np.mean(gains) if len(gains) > 0 else 0.0
        avg_loss = np.mean(losses) if len(losses) > 0 else 0.0

        if avg_loss > 0:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
        else:
            rsi = 100 if avg_gain > 0 else 50

        # Bollinger Band position
        std_dev = np.std(price_window)
        upper_band = sma + (2 * std_dev)
        lower_band = sma - (2 * std_dev)

        if upper_band > lower_band:
            bb_position = (current_price - lower_band) / (upper_band - lower_band)
        else:
            bb_position = 0.5

        return np.array([
            sma_ratio - 1,  # Centered around 0
            momentum,
            volatility,
            (rsi - 50) / 50,  # Normalized RSI
            bb_position - 0.5,  # Centered BB position
            min(self.current_step / 100.0, 1.0)  # Time progress
        ])


class AdvancedDQN:
    """
    Advanced Deep Q-Network with experience replay and target network
    """

    def __init__(self, state_size: int, action_size: int, learning_rate: float = 0.001):
        self.state_size = state_size
        self.action_size = action_size
        self.learning_rate = learning_rate

        # Hyperparameters
        self.memory_size = 10000
        self.batch_size = 32
        self.epsilon = 1.0
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.gamma = 0.95  # Discount factor
        self.tau = 0.001   # Target network update rate

        # Experience replay buffer
        self.memory = []
        self.memory_idx = 0

        # Build networks
        self.q_network = self._build_network()
        self.target_network = self._build_network()
        self.update_target_network()

        # Performance tracking
        self.training_history = []

    def _build_network(self) -> tf.keras.Model:
        """Build the neural network"""
        model = tf.keras.Sequential([
            tf.keras.layers.Dense(128, activation='relu', input_shape=(self.state_size,)),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dense(self.action_size, activation='linear')
        ])

        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=self.learning_rate),
            loss='mse',
            metrics=['mae']
        )

        return model

    def remember(self, state: np.ndarray, action: int, reward: float,
                 next_state: np.ndarray, done: bool):
        """Store experience in replay buffer"""
        experience = (state, action, reward, next_state, done)

        if len(self.memory) < self.memory_size:
            self.memory.append(experience)
        else:
            self.memory[self.memory_idx] = experience
            self.memory_idx = (self.memory_idx + 1) % self.memory_size

    def act(self, state: np.ndarray, training: bool = True) -> int:
        """Choose action using epsilon-greedy policy"""
        if training and np.random.random() <= self.epsilon:
            return np.random.randint(self.action_size)

        q_values = self.q_network.predict(state.reshape(1, -1), verbose=0)
        return np.argmax(q_values[0])

    def replay(self) -> Dict[str, float]:
        """Train the model on a batch of experiences"""
        if len(self.memory) < self.batch_size:
            return {}

        # Sample batch
        batch_indices = np.random.choice(len(self.memory), self.batch_size, replace=False)
        batch = [self.memory[i] for i in batch_indices]

        # Prepare training data
        states = np.array([e[0] for e in batch])
        actions = np.array([e[1] for e in batch])
        rewards = np.array([e[2] for e in batch])
        next_states = np.array([e[3] for e in batch])
        dones = np.array([e[4] for e in batch])

        # Current Q values
        current_q_values = self.q_network.predict(states, verbose=0)

        # Target Q values
        next_q_values = self.target_network.predict(next_states, verbose=0)

        # Update Q values
        for i in range(self.batch_size):
            if dones[i]:
                current_q_values[i][actions[i]] = rewards[i]
            else:
                current_q_values[i][actions[i]] = rewards[i] + self.gamma * np.max(next_q_values[i])

        # Train the model
        history = self.q_network.fit(states, current_q_values,
                                   epochs=1, verbose=0, batch_size=self.batch_size)

        # Update epsilon
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

        # Soft update target network
        self.update_target_network()

        return {
            'loss': history.history['loss'][0],
            'mae': history.history['mae'][0],
            'epsilon': self.epsilon
        }

    def update_target_network(self):
        """Soft update of target network"""
        q_weights = self.q_network.get_weights()
        target_weights = self.target_network.get_weights()

        for i in range(len(q_weights)):
            target_weights[i] = self.tau * q_weights[i] + (1 - self.tau) * target_weights[i]

        self.target_network.set_weights(target_weights)

    def save(self, filepath: str):
        """Save the model"""
        self.q_network.save(filepath)

        # Save additional parameters
        params = {
            'epsilon': self.epsilon,
            'memory_size': len(self.memory),
            'training_history': self.training_history
        }

        with open(f"{filepath}_params.json", 'w') as f:
            json.dump(params, f)

    def load(self, filepath: str):
        """Load the model"""
        self.q_network = tf.keras.models.load_model(filepath)
        self.target_network = tf.keras.models.load_model(filepath)

        # Load additional parameters
        try:
            with open(f"{filepath}_params.json", 'r') as f:
                params = json.load(f)
                self.epsilon = params.get('epsilon', self.epsilon_min)
                self.training_history = params.get('training_history', [])
        except FileNotFoundError:
            logger.warning("Parameter file not found, using defaults")


class ReinforcementLearningOptimizer:
    """
    Main RL optimizer that coordinates training and optimization of trading strategies
    """

    def __init__(self, strategy_engines: List[Any]):
        self.strategy_engines = strategy_engines
        self.agents = {}
        self.training_data = {}
        self.optimization_results = {}

        # Training parameters
        self.episodes = 1000
        self.max_steps_per_episode = 1000
        self.training_frequency = 100  # Episodes between training sessions

        # Initialize agents for each strategy
        for engine in strategy_engines:
            engine_id = engine.get('id', 'unknown')
            self.agents[engine_id] = AdvancedDQN(
                state_size=20,
                action_size=3,
                learning_rate=0.001
            )
            self.training_data[engine_id] = []

    async def optimize_strategy(self, engine_id: str, market_data: np.ndarray) -> Dict[str, Any]:
        """
        Optimize a specific trading strategy using reinforcement learning

        Args:
            engine_id: Identifier for the trading engine
            market_data: Historical market data for training

        Returns:
            Optimization results and performance metrics
        """
        logger.info(f"Starting RL optimization for engine: {engine_id}")

        if engine_id not in self.agents:
            logger.error(f"No agent found for engine: {engine_id}")
            return {}

        agent = self.agents[engine_id]
        env = TradingEnvironment(market_data)

        # Training metrics
        episode_rewards = []
        episode_portfolios = []
        training_losses = []

        best_performance = float('-inf')
        best_weights = None

        for episode in range(self.episodes):
            state = env.reset()
            total_reward = 0
            step_count = 0

            while step_count < self.max_steps_per_episode:
                # Choose action
                action = agent.act(state, training=True)

                # Execute action
                next_state, reward, done, info = env.step(action)

                # Store experience
                agent.remember(state, action, reward, next_state, done)

                state = next_state
                total_reward += reward
                step_count += 1

                if done:
                    break

            # Train the agent
            if len(agent.memory) > agent.batch_size:
                training_metrics = agent.replay()
                if training_metrics:
                    training_losses.append(training_metrics['loss'])

            # Record episode results
            episode_rewards.append(total_reward)
            final_portfolio = info.get('portfolio_value', env.initial_balance)
            episode_portfolios.append(final_portfolio)

            # Check for best performance
            if final_portfolio > best_performance:
                best_performance = final_portfolio
                best_weights = agent.q_network.get_weights()

            # Log progress
            if episode % 100 == 0:
                avg_reward = np.mean(episode_rewards[-100:])
                avg_portfolio = np.mean(episode_portfolios[-100:])
                logger.info(f"Episode {episode}: Avg Reward: {avg_reward:.2f}, "
                          f"Avg Portfolio: ${avg_portfolio:.2f}, "
                          f"Epsilon: {agent.epsilon:.3f}")

        # Save best model
        if best_weights is not None:
            agent.q_network.set_weights(best_weights)
            agent.save(f"models/rl_optimized_{engine_id}")

        # Calculate optimization results
        results = self._calculate_optimization_results(
            engine_id, episode_rewards, episode_portfolios, training_losses
        )

        self.optimization_results[engine_id] = results

        logger.info(f"RL optimization completed for {engine_id}")
        return results

    def _calculate_optimization_results(self, engine_id: str, rewards: List[float],
                                      portfolios: List[float], losses: List[float]) -> Dict[str, Any]:
        """Calculate comprehensive optimization results"""

        # Performance metrics
        total_return = (portfolios[-1] - portfolios[0]) / portfolios[0] if portfolios else 0
        max_portfolio = max(portfolios) if portfolios else 0
        min_portfolio = min(portfolios) if portfolios else 0

        # Volatility and Sharpe ratio
        portfolio_returns = np.diff(portfolios) / portfolios[:-1] if len(portfolios) > 1 else [0]
        volatility = np.std(portfolio_returns)
        sharpe_ratio = np.mean(portfolio_returns) / volatility if volatility > 0 else 0

        # Maximum drawdown
        running_max = np.maximum.accumulate(portfolios)
        drawdowns = (portfolios - running_max) / running_max
        max_drawdown = np.min(drawdowns) if len(drawdowns) > 0 else 0

        # Win rate (episodes with positive returns)
        positive_episodes = sum(1 for p in portfolio_returns if p > 0)
        win_rate = positive_episodes / len(portfolio_returns) if portfolio_returns else 0

        # Training stability
        avg_loss = np.mean(losses) if losses else 0
        loss_trend = np.polyfit(range(len(losses)), losses, 1)[0] if len(losses) > 1 else 0

        results = {
            'engine_id': engine_id,
            'optimization_timestamp': datetime.now().isoformat(),
            'performance_metrics': {
                'total_return': total_return,
                'sharpe_ratio': sharpe_ratio,
                'max_drawdown': max_drawdown,
                'volatility': volatility,
                'win_rate': win_rate,
                'max_portfolio_value': max_portfolio,
                'min_portfolio_value': min_portfolio,
                'final_portfolio_value': portfolios[-1] if portfolios else 0
            },
            'training_metrics': {
                'total_episodes': len(rewards),
                'average_reward': np.mean(rewards),
                'reward_std': np.std(rewards),
                'average_loss': avg_loss,
                'loss_trend': loss_trend,
                'convergence_episode': self._find_convergence_episode(rewards)
            },
            'optimization_recommendations': self._generate_recommendations(
                total_return, sharpe_ratio, max_drawdown, win_rate
            )
        }

        return results

    def _find_convergence_episode(self, rewards: List[float], window_size: int = 100) -> int:
        """Find the episode where the agent converged"""
        if len(rewards) < window_size * 2:
            return len(rewards)

        # Look for stability in the moving average
        moving_avg = np.convolve(rewards, np.ones(window_size), 'valid') / window_size

        # Find where the standard deviation of the moving average becomes small
        for i in range(window_size, len(moving_avg)):
            recent_window = moving_avg[i-window_size:i]
            if np.std(recent_window) < np.std(moving_avg) * 0.1:
                return i + window_size

        return len(rewards)

    def _generate_recommendations(self, total_return: float, sharpe_ratio: float,
                                max_drawdown: float, win_rate: float) -> List[str]:
        """Generate optimization recommendations based on performance"""
        recommendations = []

        if total_return < 0.1:  # Less than 10% return
            recommendations.append("Consider increasing risk tolerance or position sizing")

        if sharpe_ratio < 1.0:
            recommendations.append("Improve risk-adjusted returns by optimizing stop-loss strategies")

        if max_drawdown < -0.2:  # More than 20% drawdown
            recommendations.append("Implement stronger risk management to reduce maximum drawdown")

        if win_rate < 0.5:
            recommendations.append("Focus on improving signal quality and entry timing")

        if not recommendations:
            recommendations.append("Strategy performance is strong across all metrics")

        return recommendations

    async def optimize_all_strategies(self, market_data: Dict[str, np.ndarray]) -> Dict[str, Any]:
        """
        Optimize all trading strategies in parallel

        Args:
            market_data: Dictionary mapping engine_id to market data

        Returns:
            Combined optimization results for all strategies
        """
        logger.info("Starting parallel optimization of all strategies")

        # Create optimization tasks
        tasks = []
        for engine_id in self.agents.keys():
            if engine_id in market_data:
                task = self.optimize_strategy(engine_id, market_data[engine_id])
                tasks.append(task)

        # Run optimizations in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Combine results
        combined_results = {
            'optimization_summary': 
                'total_strategies': len(self.agents),
                'optimized_strategies': len([r for r in results if isinstance(r, dict)]),
                'failed_optimizations': len([r for r in results if isinstance(r, Exception)]),
                'optimization_timestamp': datetime.now().isoformat(),
            'individual_results': ,
            'comparative_analysis': 
        }

        # Process individual results
        valid_results = []
        for i, result in enumerate(results):
            if isinstance(result, dict):
                engine_id = result.get('engine_id', f'engine_{i}')
                combined_results['individual_results'][engine_id] = result
                valid_results.append(result)
            else:
                logger.error(f"Optimization failed for strategy {i}: {result}")

        # Comparative analysis
        if valid_results:
            combined_results['comparative_analysis'] = self._generate_comparative_analysis(valid_results)

        logger.info("Parallel optimization completed")
        return combined_results

    def _generate_comparative_analysis(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate comparative analysis across all optimized strategies"""

        performance_metrics = [r['performance_metrics'] for r in results]

        # Best performers in each category
        best_return = max(results, key=lambda x: x['performance_metrics']['total_return'])
        best_sharpe = max(results, key=lambda x: x['performance_metrics']['sharpe_ratio'])
        best_drawdown = max(results, key=lambda x: -x['performance_metrics']['max_drawdown'])
        best_winrate = max(results, key=lambda x: x['performance_metrics']['win_rate'])

        # Overall rankings
        rankings = []
        for result in results:
            metrics = result['performance_metrics']
            # Composite score (you can adjust weights)
            score = (
                metrics['total_return'] * 0.3 +
                metrics['sharpe_ratio'] * 0.3 +
                (-metrics['max_drawdown']) * 0.2 +
                metrics['win_rate'] * 0.2
            )
            rankings.append({
                'engine_id': result['engine_id'],
                'composite_score': score,
                'rank': 0  # Will be filled after sorting
            })

        rankings.sort(key=lambda x: x['composite_score'], reverse=True)
        for i, ranking in enumerate(rankings):
            ranking['rank'] = i + 1

        return {
            'best_performers': {
                'highest_return': best_return['engine_id'],
                'best_sharpe_ratio': best_sharpe['engine_id'],
                'lowest_drawdown': best_drawdown['engine_id'],
                'highest_win_rate': best_winrate['engine_id']
            },
            'performance_statistics': {
                'avg_return': np.mean([m['total_return'] for m in performance_metrics]),
                'avg_sharpe': np.mean([m['sharpe_ratio'] for m in performance_metrics]),
                'avg_drawdown': np.mean([m['max_drawdown'] for m in performance_metrics]),
                'avg_win_rate': np.mean([m['win_rate'] for m in performance_metrics])
            },
            'strategy_rankings': rankings,
            'improvement_opportunities': self._identify_improvement_opportunities(results)
        }

    def _identify_improvement_opportunities(self, results: List[Dict[str, Any]]) -> List[str]:
        """Identify system-wide improvement opportunities"""
        opportunities = []

        # Analyze patterns across strategies
        total_returns = [r['performance_metrics']['total_return'] for r in results]
        sharpe_ratios = [r['performance_metrics']['sharpe_ratio'] for r in results]
        drawdowns = [r['performance_metrics']['max_drawdown'] for r in results]

        if np.mean(total_returns) < 0.15:
            opportunities.append("Overall system returns could be improved through better signal aggregation")

        if np.std(total_returns) > 0.2:
            opportunities.append("High variance in strategy performance suggests need for better risk normalization")

        if np.mean(sharpe_ratios) < 1.5:
            opportunities.append("Risk-adjusted returns could be improved through dynamic position sizing")

        if any(dd < -0.25 for dd in drawdowns):
            opportunities.append("Some strategies show excessive drawdown - implement circuit breakers")

        return opportunities

    def get_optimization_status(self) -> Dict[str, Any]:
        """Get current optimization status and results"""
        return {
            'active_agents': list(self.agents.keys()),
            'optimization_results': self.optimization_results,
            'training_progress': {
                engine_id: {
                    'memory_size': len(agent.memory),
                    'epsilon': agent.epsilon,
                    'training_episodes': len(agent.training_history)
                }
                for engine_id, agent in self.agents.items()
            }
        }


# Example usage and integration
async def main():
    """Example of how to use the RL optimizer"""

    # Mock strategy engines (in real implementation, these would be actual engine instances)
    strategy_engines = [
        {'id': 'quantum_arbitrage', 'name': 'Quantum Arbitrage Engine'},
        {'id': 'neural_trend', 'name': 'Neural Trend Rider Engine'},
        {'id': 'grid_trading', 'name': 'Grid Trading Engine'},
        {'id': 'momentum_scalper', 'name': 'Momentum Scalper Engine'},
        {'id': 'mean_reversion', 'name': 'Mean Reversion Engine'},
        {'id': 'sentiment_analyzer', 'name': 'Sentiment Analyzer Engine'},
        {'id': 'dca_bot', 'name': 'DCA Bot Engine'},
        {'id': 'hybrid_ai', 'name': 'Hybrid AI Master Engine'}
    ]

    # Initialize RL optimizer
    rl_optimizer = ReinforcementLearningOptimizer(strategy_engines)

    # Generate sample market data (in real implementation, use actual market data)
    def generate_sample_market_data(length: int = 1000) -> np.ndarray:
        """Generate sample market data for testing"""
        np.random.seed(42)

        # Generate a price series with trend and volatility
        base_price = 100.0
        trend = 0.0001  # Small positive trend
        volatility = 0.02

        prices = [base_price]
        for _ in range(length - 1):
            change = np.random.normal(trend, volatility)
            new_price = prices[-1] * (1 + change)
            prices.append(max(new_price, 1.0))  # Prevent negative prices

        return np.array(prices)

    # Create market data for each strategy
    market_data = {}
    for engine in strategy_engines:
        market_data[engine['id']] = generate_sample_market_data()

    # Run optimization
    logger.info("Starting RL optimization example")
    results = await rl_optimizer.optimize_all_strategies(market_data)

    # Print results
    print("\n" + "="*80)
    print("REINFORCEMENT LEARNING OPTIMIZATION RESULTS")
    print("="*80)

    print(f"\nOptimization Summary:")
    summary = results['optimization_summary']
    print(f"  Total Strategies: {summary['total_strategies']}")
    print(f"  Successfully Optimized: {summary['optimized_strategies']}")
    print(f"  Failed Optimizations: {summary['failed_optimizations']}")

    if 'comparative_analysis' in results:
        analysis = results['comparative_analysis']
        print(f"\nBest Performers:")
        best = analysis['best_performers']
        for category, engine_id in best.items():
            print(f"  {category.replace('_', ' ').title()}: {engine_id}")

        print(f"\nStrategy Rankings:")
        for ranking in analysis['strategy_rankings'][:5]:  # Top 5
            print(f"  #{ranking['rank']}: {ranking['engine_id']} "
                  f"(Score: {ranking['composite_score']:.3f})")

        if analysis['improvement_opportunities']:
            print(f"\nImprovement Opportunities:")
            for opportunity in analysis['improvement_opportunities']:
                print(f"  • {opportunity}")

    print("\n" + "="*80)

if __name__ == "__main__":
    asyncio.run(main())

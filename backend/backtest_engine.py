"""
Backtesting Engine Module.
Simulates trading based on strategy signals and calculates performance.
"""

import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import Optional
from strategy import ATRBreakoutStrategy, KeltnerMeanReversionStrategy, Signal, PositionType, Trade, create_strategy
from indicators import add_indicators, add_indicators_s2


@dataclass
class BacktestResult:
    """Contains all backtesting results."""
    trades: list[Trade]
    signals: list[dict]
    equity_curve: list[dict]
    metrics: dict
    final_capital: float
    initial_capital: float


class BacktestEngine:
    """
    Backtesting engine that simulates trading on historical data.
    """

    def __init__(
        self,
        initial_capital: float = 100000,
        strategy_type: str = "s1",
        # S1 specific parameters
        atr_period: int = 14,
        breakout_period: int = 20,
        entry_multiplier: float = 0.5,
        stop_multiplier: float = 2.0,
        profit_multiplier: float = 3.0,
        leverage: int = 10,
        risk_per_trade: float = 0.02,
        spread: float = 0.04,
        # S2 specific parameters
        kc_basis_period: int = 20,
        kc_mult: float = 2.0,
        profit_mode: str = "to_basis",
        big_stop_multiplier: float = 0,
        max_hold_bars: int = 100,
        trend_filter_period: int = 100,
        vol_lookback: int = 200,
        vol_ratio_max: float = 1.0,
        max_consecutive_losses: int = 3,
        cooldown_bars: int = 5,
    ):
        self.initial_capital = initial_capital
        self.strategy_type = strategy_type.lower()

        if self.strategy_type == "s1":
            self.strategy = ATRBreakoutStrategy(
                atr_period=atr_period,
                breakout_period=breakout_period,
                entry_multiplier=entry_multiplier,
                stop_multiplier=stop_multiplier,
                profit_multiplier=profit_multiplier,
                leverage=leverage,
                risk_per_trade=risk_per_trade,
                spread=spread,
            )
        elif self.strategy_type == "s2":
            self.strategy = KeltnerMeanReversionStrategy(
                atr_period=atr_period,
                kc_basis_period=kc_basis_period,
                kc_mult=kc_mult,
                stop_multiplier=stop_multiplier,
                profit_multiplier=profit_multiplier,
                profit_mode=profit_mode,
                big_stop_multiplier=big_stop_multiplier,
                max_hold_bars=max_hold_bars,
                trend_filter_period=trend_filter_period,
                vol_lookback=vol_lookback,
                vol_ratio_max=vol_ratio_max,
                max_consecutive_losses=max_consecutive_losses,
                cooldown_bars=cooldown_bars,
                leverage=leverage,
                risk_per_trade=risk_per_trade,
                spread=spread,
            )
        else:
            raise ValueError(f"Unknown strategy type: {strategy_type}")

    def run(self, df: pd.DataFrame) -> BacktestResult:
        """
        Run backtest on OHLCV data.

        Args:
            df: DataFrame with OHLCV columns

        Returns:
            BacktestResult with all metrics and data
        """
        # Add indicators based on strategy type
        if self.strategy_type == "s1":
            df_with_indicators = add_indicators(
                df,
                atr_period=self.strategy.atr_period,
                breakout_period=self.strategy.breakout_period
            )
        elif self.strategy_type == "s2":
            df_with_indicators = add_indicators_s2(
                df,
                atr_period=self.strategy.atr_period,
                kc_basis_period=self.strategy.kc_basis_period,
                kc_mult=self.strategy.kc_mult,
                trend_filter_period=self.strategy.trend_filter_period,
                vol_lookback=self.strategy.vol_lookback
            )
        else:
            df_with_indicators = add_indicators(df)

        # Generate signals
        df_with_signals, signals = self.strategy.generate_signals(df_with_indicators)

        # Simulate trading
        trades, equity_curve = self._simulate_trades(df_with_signals, signals)

        # Calculate metrics
        metrics = self._calculate_metrics(trades, equity_curve)

        # Convert signals to dict format
        signals_dict = [
            {
                "time": s.time,
                "type": s.type,
                "price": round(s.price, 3),
                "reason": s.reason
            }
            for s in signals
        ]

        return BacktestResult(
            trades=trades,
            signals=signals_dict,
            equity_curve=equity_curve,
            metrics=metrics,
            final_capital=equity_curve[-1]["equity"] if equity_curve else self.initial_capital,
            initial_capital=self.initial_capital,
        )

    def _simulate_trades(
        self,
        df: pd.DataFrame,
        signals: list[Signal]
    ) -> tuple[list[Trade], list[dict]]:
        """
        Simulate trades based on signals and track equity.
        """
        capital = self.initial_capital
        trades = []
        equity_curve = []

        position: Optional[PositionType] = None
        entry_price = 0.0
        entry_time = 0
        position_size = 0.0

        # Create signal lookup by time
        signal_map = {s.time: s for s in signals}

        for i, row in df.iterrows():
            current_time = int(row["timestamp"])

            if current_time in signal_map:
                signal = signal_map[current_time]

                if signal.type == "buy":
                    # Open long position
                    position = PositionType.LONG
                    entry_price = signal.price
                    entry_time = current_time
                    position_size = self.strategy.calculate_position_size(
                        capital, row["atr"], entry_price
                    )

                elif signal.type == "sell":
                    # Open short position
                    position = PositionType.SHORT
                    entry_price = signal.price
                    entry_time = current_time
                    position_size = self.strategy.calculate_position_size(
                        capital, row["atr"], entry_price
                    )

                elif signal.type in ["close_long", "close_short"]:
                    # Close position
                    exit_price = signal.price

                    if position == PositionType.LONG:
                        pnl = (exit_price - entry_price) * position_size
                    else:  # SHORT
                        pnl = (entry_price - exit_price) * position_size

                    # Subtract spread cost
                    pnl -= self.strategy.spread * position_size

                    pnl_percent = pnl / capital

                    trades.append(Trade(
                        entry_time=entry_time,
                        exit_time=current_time,
                        entry_price=entry_price,
                        exit_price=exit_price,
                        position_type=position,
                        size=position_size,
                        pnl=pnl,
                        pnl_percent=pnl_percent,
                    ))

                    capital += pnl
                    position = None

            # Record equity at each bar
            unrealized_pnl = 0.0
            if position == PositionType.LONG:
                unrealized_pnl = (row["close"] - entry_price) * position_size
            elif position == PositionType.SHORT:
                unrealized_pnl = (entry_price - row["close"]) * position_size

            equity_curve.append({
                "time": current_time,
                "equity": round(capital + unrealized_pnl, 2),
                "capital": round(capital, 2),
            })

        return trades, equity_curve

    def _calculate_metrics(
        self,
        trades: list[Trade],
        equity_curve: list[dict]
    ) -> dict:
        """
        Calculate performance metrics from trades and equity curve.
        """
        if not trades:
            return {
                "annual_return": 0,
                "max_drawdown": 0,
                "sharpe_ratio": 0,
                "sortino_ratio": 0,
                "win_rate": 0,
                "profit_factor": 0,
                "total_trades": 0,
                "avg_trade": 0,
                "calmar_ratio": 0,
                "recovery_factor": 0,
            }

        # Extract data
        pnls = [t.pnl for t in trades]
        pnl_percents = [t.pnl_percent for t in trades]
        equities = [e["equity"] for e in equity_curve]

        # Basic stats
        total_trades = len(trades)
        winning_trades = len([p for p in pnls if p > 0])
        win_rate = winning_trades / total_trades if total_trades > 0 else 0

        gross_profit = sum([p for p in pnls if p > 0])
        gross_loss = abs(sum([p for p in pnls if p < 0]))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float("inf")

        avg_trade = sum(pnls) / total_trades if total_trades > 0 else 0

        # Total return and annual return
        total_return = (equities[-1] - self.initial_capital) / self.initial_capital

        # Calculate trading days
        if equity_curve:
            start_time = equity_curve[0]["time"]
            end_time = equity_curve[-1]["time"]
            days = (end_time - start_time) / (24 * 60 * 60)
            years = days / 365
            annual_return = ((1 + total_return) ** (1 / years) - 1) if years > 0 else total_return
        else:
            annual_return = 0

        # Max Drawdown
        peak = equities[0]
        max_drawdown = 0
        for equity in equities:
            if equity > peak:
                peak = equity
            drawdown = (peak - equity) / peak
            max_drawdown = max(max_drawdown, drawdown)

        # Sharpe Ratio (assuming risk-free rate = 0)
        if len(pnl_percents) > 1:
            returns_std = np.std(pnl_percents)
            avg_return = np.mean(pnl_percents)
            sharpe_ratio = (avg_return / returns_std) * np.sqrt(252) if returns_std > 0 else 0
        else:
            sharpe_ratio = 0

        # Sortino Ratio (downside deviation)
        negative_returns = [r for r in pnl_percents if r < 0]
        if negative_returns:
            downside_std = np.std(negative_returns)
            avg_return = np.mean(pnl_percents)
            sortino_ratio = (avg_return / downside_std) * np.sqrt(252) if downside_std > 0 else 0
        else:
            sortino_ratio = float("inf") if np.mean(pnl_percents) > 0 else 0

        # Calmar Ratio
        calmar_ratio = annual_return / max_drawdown if max_drawdown > 0 else float("inf")

        # Recovery Factor
        total_profit = sum(pnls)
        max_dd_amount = max_drawdown * self.initial_capital
        recovery_factor = total_profit / max_dd_amount if max_dd_amount > 0 else float("inf")

        return {
            "annual_return": round(annual_return * 100, 2),  # percentage
            "max_drawdown": round(max_drawdown * 100, 2),  # percentage
            "sharpe_ratio": round(sharpe_ratio, 2),
            "sortino_ratio": round(min(sortino_ratio, 99.99), 2),  # cap for display
            "win_rate": round(win_rate * 100, 2),  # percentage
            "profit_factor": round(min(profit_factor, 99.99), 2),  # cap for display
            "total_trades": total_trades,
            "avg_trade": round(avg_trade, 2),
            "calmar_ratio": round(min(calmar_ratio, 99.99), 2),
            "recovery_factor": round(min(recovery_factor, 99.99), 2),
            "total_return": round(total_return * 100, 2),
            "final_capital": round(equities[-1], 2),
        }

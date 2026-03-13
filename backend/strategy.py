"""
ATR Breakout Trading Strategy Module.
Implements entry/exit logic based on ATR and Donchian Channel breakouts.
"""

import pandas as pd
import numpy as np
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class PositionType(Enum):
    NONE = 0
    LONG = 1
    SHORT = -1


@dataclass
class Trade:
    """Represents a completed trade."""
    entry_time: int
    exit_time: int
    entry_price: float
    exit_price: float
    position_type: PositionType
    size: float
    pnl: float
    pnl_percent: float


@dataclass
class Signal:
    """Represents a trading signal."""
    time: int
    type: str  # 'buy', 'sell', 'close_long', 'close_short'
    price: float
    reason: str


class ATRBreakoutStrategy:
    """
    ATR Breakout Strategy with Trailing Stop.

    Entry:
        - Long: Price breaks above Donchian upper + (ATR * entry_multiplier)
        - Short: Price breaks below Donchian lower - (ATR * entry_multiplier)

    Exit:
        - Trailing Stop: ATR * stop_multiplier
        - Take Profit: ATR * profit_multiplier
    """

    def __init__(
        self,
        atr_period: int = 14,
        breakout_period: int = 20,
        entry_multiplier: float = 0.5,
        stop_multiplier: float = 2.0,
        profit_multiplier: float = 3.0,
        leverage: int = 10,
        risk_per_trade: float = 0.02,
        spread: float = 0.04,
    ):
        self.atr_period = atr_period
        self.breakout_period = breakout_period
        self.entry_multiplier = entry_multiplier
        self.stop_multiplier = stop_multiplier
        self.profit_multiplier = profit_multiplier
        self.leverage = leverage
        self.risk_per_trade = risk_per_trade
        self.spread = spread

    def calculate_position_size(
        self,
        capital: float,
        atr: float,
        price: float
    ) -> float:
        """
        Calculate position size based on ATR risk management.

        Size = (Capital * Risk%) / (ATR * Stop Multiplier)
        Then apply leverage.
        """
        risk_amount = capital * self.risk_per_trade
        stop_distance = atr * self.stop_multiplier

        if stop_distance == 0:
            return 0

        # Position size in units (contracts)
        size = (risk_amount / stop_distance) * self.leverage

        return size

    def generate_signals(self, df: pd.DataFrame) -> tuple[pd.DataFrame, list[Signal]]:
        """
        Generate trading signals based on the strategy.

        Args:
            df: DataFrame with OHLCV and indicator columns

        Returns:
            Tuple of (DataFrame with signal columns, list of Signal objects)
        """
        result = df.copy()
        signals = []

        # Calculate entry levels
        result["long_entry_level"] = result["dc_upper"] + (result["atr"] * self.entry_multiplier)
        result["short_entry_level"] = result["dc_lower"] - (result["atr"] * self.entry_multiplier)

        # Initialize signal columns
        result["signal"] = 0  # 1 = long entry, -1 = short entry, 2 = close long, -2 = close short

        # Track position state
        position = PositionType.NONE
        entry_price = 0.0
        trailing_stop = 0.0
        take_profit = 0.0
        entry_atr = 0.0

        for i in range(1, len(result)):
            row = result.iloc[i]
            prev_row = result.iloc[i-1]

            # Skip if indicators not yet calculated
            if pd.isna(row["atr"]) or pd.isna(row["dc_upper"]):
                continue

            current_time = int(row["timestamp"])

            # Check exit conditions first
            if position == PositionType.LONG:
                # Update trailing stop (only move up)
                new_stop = row["high"] - (row["atr"] * self.stop_multiplier)
                trailing_stop = max(trailing_stop, new_stop)

                # Check stop loss
                if row["low"] <= trailing_stop:
                    result.iloc[i, result.columns.get_loc("signal")] = 2
                    signals.append(Signal(
                        time=current_time,
                        type="close_long",
                        price=trailing_stop,
                        reason="trailing_stop"
                    ))
                    position = PositionType.NONE
                    continue

                # Check take profit
                if row["high"] >= take_profit:
                    result.iloc[i, result.columns.get_loc("signal")] = 2
                    signals.append(Signal(
                        time=current_time,
                        type="close_long",
                        price=take_profit,
                        reason="take_profit"
                    ))
                    position = PositionType.NONE
                    continue

            elif position == PositionType.SHORT:
                # Update trailing stop (only move down)
                new_stop = row["low"] + (row["atr"] * self.stop_multiplier)
                trailing_stop = min(trailing_stop, new_stop)

                # Check stop loss
                if row["high"] >= trailing_stop:
                    result.iloc[i, result.columns.get_loc("signal")] = -2
                    signals.append(Signal(
                        time=current_time,
                        type="close_short",
                        price=trailing_stop,
                        reason="trailing_stop"
                    ))
                    position = PositionType.NONE
                    continue

                # Check take profit
                if row["low"] <= take_profit:
                    result.iloc[i, result.columns.get_loc("signal")] = -2
                    signals.append(Signal(
                        time=current_time,
                        type="close_short",
                        price=take_profit,
                        reason="take_profit"
                    ))
                    position = PositionType.NONE
                    continue

            # Check entry conditions (only if no position)
            if position == PositionType.NONE:
                # Long entry: price breaks above entry level
                if row["high"] > row["long_entry_level"] and not pd.isna(row["long_entry_level"]):
                    entry_price = row["long_entry_level"] + self.spread / 2
                    entry_atr = row["atr"]
                    trailing_stop = entry_price - (entry_atr * self.stop_multiplier)
                    take_profit = entry_price + (entry_atr * self.profit_multiplier)

                    result.iloc[i, result.columns.get_loc("signal")] = 1
                    signals.append(Signal(
                        time=current_time,
                        type="buy",
                        price=entry_price,
                        reason="breakout_long"
                    ))
                    position = PositionType.LONG

                # Short entry: price breaks below entry level
                elif row["low"] < row["short_entry_level"] and not pd.isna(row["short_entry_level"]):
                    entry_price = row["short_entry_level"] - self.spread / 2
                    entry_atr = row["atr"]
                    trailing_stop = entry_price + (entry_atr * self.stop_multiplier)
                    take_profit = entry_price - (entry_atr * self.profit_multiplier)

                    result.iloc[i, result.columns.get_loc("signal")] = -1
                    signals.append(Signal(
                        time=current_time,
                        type="sell",
                        price=entry_price,
                        reason="breakout_short"
                    ))
                    position = PositionType.SHORT

        return result, signals

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


class KeltnerMeanReversionStrategy:
    """
    S2: Keltner Channel Mean Reversion Strategy.

    Entry:
        - Long: Price closes below lower Keltner band (oversold)
        - Short: Price closes above upper Keltner band (overbought)
        - Both require filters to pass

    Filters:
        - Volatility: ATR ratio < vol_ratio_max (avoid high volatility)
        - Trend: Check if not against strong trend

    Exit:
        - Stop Loss: ATR * stop_multiplier
        - Big Stop (optional): ATR * big_stop_multiplier
        - Profit modes: to_basis, fixed_atr, trailing
        - Max hold bars timeout
    """

    def __init__(
        self,
        atr_period: int = 14,
        kc_basis_period: int = 20,
        kc_mult: float = 2.0,
        stop_multiplier: float = 2.0,
        profit_multiplier: float = 3.0,
        profit_mode: str = "to_basis",  # to_basis, fixed_atr, trailing
        big_stop_multiplier: float = 0,  # 0 = disabled
        max_hold_bars: int = 100,
        trend_filter_period: int = 100,
        vol_lookback: int = 200,
        vol_ratio_max: float = 1.0,
        max_consecutive_losses: int = 3,
        cooldown_bars: int = 5,
        leverage: int = 10,
        risk_per_trade: float = 0.005,  # 0.5%
        spread: float = 0.04,
    ):
        self.atr_period = atr_period
        self.kc_basis_period = kc_basis_period
        self.kc_mult = kc_mult
        self.stop_multiplier = stop_multiplier
        self.profit_multiplier = profit_multiplier
        self.profit_mode = profit_mode
        self.big_stop_multiplier = big_stop_multiplier
        self.max_hold_bars = max_hold_bars
        self.trend_filter_period = trend_filter_period
        self.vol_lookback = vol_lookback
        self.vol_ratio_max = vol_ratio_max
        self.max_consecutive_losses = max_consecutive_losses
        self.cooldown_bars = cooldown_bars
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
        """
        risk_amount = capital * self.risk_per_trade
        stop_distance = atr * self.stop_multiplier

        if stop_distance == 0:
            return 0

        size = (risk_amount / stop_distance) * self.leverage
        return size

    def _check_filters(
        self,
        row: pd.Series,
        position_type: PositionType
    ) -> bool:
        """
        Check if all filters pass for entry.

        Args:
            row: Current bar data
            position_type: Intended position type (LONG or SHORT)

        Returns:
            True if all filters pass
        """
        # Volatility filter: avoid high volatility environments
        atr_ratio = row.get("atr_ratio", 1.0)
        if pd.isna(atr_ratio) or atr_ratio > self.vol_ratio_max:
            return False

        # Trend filter: avoid trading against strong trends
        close = row["close"]
        ema_trend = row.get("ema_trend", close)

        if pd.isna(ema_trend):
            return True  # No trend data, allow entry

        # For long: prefer when price is not too far below trend (not in strong downtrend)
        # For short: prefer when price is not too far above trend (not in strong uptrend)
        if position_type == PositionType.LONG:
            # Don't go long if price is significantly below trend EMA (strong downtrend)
            if close < ema_trend * 0.95:  # More than 5% below trend
                return False
        elif position_type == PositionType.SHORT:
            # Don't go short if price is significantly above trend EMA (strong uptrend)
            if close > ema_trend * 1.05:  # More than 5% above trend
                return False

        return True

    def generate_signals(self, df: pd.DataFrame) -> tuple[pd.DataFrame, list[Signal]]:
        """
        Generate trading signals based on Keltner mean reversion.

        Args:
            df: DataFrame with OHLCV and indicator columns

        Returns:
            Tuple of (DataFrame with signal columns, list of Signal objects)
        """
        result = df.copy()
        signals = []

        # Initialize signal column
        result["signal"] = 0

        # Track position state
        position = PositionType.NONE
        entry_price = 0.0
        entry_bar = 0
        stop_loss = 0.0
        big_stop = 0.0
        take_profit = 0.0
        trailing_stop = 0.0
        entry_atr = 0.0

        # Track consecutive losses and cooldown
        consecutive_losses = 0
        cooldown_remaining = 0

        for i in range(1, len(result)):
            row = result.iloc[i]
            prev_row = result.iloc[i-1]

            # Skip if indicators not yet calculated
            if pd.isna(row["atr"]) or pd.isna(row.get("kc_upper")):
                continue

            current_time = int(row["timestamp"])

            # Decrement cooldown
            if cooldown_remaining > 0:
                cooldown_remaining -= 1

            # Check exit conditions first
            if position == PositionType.LONG:
                bars_held = i - entry_bar

                # Big stop (disaster stop) - if enabled
                if self.big_stop_multiplier > 0 and row["low"] <= big_stop:
                    result.iloc[i, result.columns.get_loc("signal")] = 2
                    signals.append(Signal(
                        time=current_time,
                        type="close_long",
                        price=big_stop,
                        reason="big_stop"
                    ))
                    position = PositionType.NONE
                    consecutive_losses += 1
                    if consecutive_losses >= self.max_consecutive_losses:
                        cooldown_remaining = self.cooldown_bars
                    continue

                # Regular stop loss
                if row["low"] <= stop_loss:
                    result.iloc[i, result.columns.get_loc("signal")] = 2
                    signals.append(Signal(
                        time=current_time,
                        type="close_long",
                        price=stop_loss,
                        reason="stop_loss"
                    ))
                    position = PositionType.NONE
                    consecutive_losses += 1
                    if consecutive_losses >= self.max_consecutive_losses:
                        cooldown_remaining = self.cooldown_bars
                    continue

                # Profit exit based on mode
                exit_triggered = False
                exit_price = 0.0

                if self.profit_mode == "to_basis":
                    # Exit when price reaches Keltner basis (mean reversion complete)
                    kc_basis = row.get("kc_basis", row["close"])
                    if row["high"] >= kc_basis:
                        exit_triggered = True
                        exit_price = kc_basis

                elif self.profit_mode == "fixed_atr":
                    # Fixed ATR take profit
                    if row["high"] >= take_profit:
                        exit_triggered = True
                        exit_price = take_profit

                elif self.profit_mode == "trailing":
                    # Trailing stop mode - update trailing stop
                    new_trailing = row["high"] - (row["atr"] * self.stop_multiplier)
                    trailing_stop = max(trailing_stop, new_trailing)
                    if row["low"] <= trailing_stop:
                        exit_triggered = True
                        exit_price = trailing_stop

                if exit_triggered:
                    result.iloc[i, result.columns.get_loc("signal")] = 2
                    signals.append(Signal(
                        time=current_time,
                        type="close_long",
                        price=exit_price,
                        reason="take_profit"
                    ))
                    position = PositionType.NONE
                    consecutive_losses = 0  # Reset on profitable exit
                    continue

                # Max hold bars timeout
                if bars_held >= self.max_hold_bars:
                    result.iloc[i, result.columns.get_loc("signal")] = 2
                    signals.append(Signal(
                        time=current_time,
                        type="close_long",
                        price=row["close"],
                        reason="timeout"
                    ))
                    position = PositionType.NONE
                    continue

            elif position == PositionType.SHORT:
                bars_held = i - entry_bar

                # Big stop (disaster stop) - if enabled
                if self.big_stop_multiplier > 0 and row["high"] >= big_stop:
                    result.iloc[i, result.columns.get_loc("signal")] = -2
                    signals.append(Signal(
                        time=current_time,
                        type="close_short",
                        price=big_stop,
                        reason="big_stop"
                    ))
                    position = PositionType.NONE
                    consecutive_losses += 1
                    if consecutive_losses >= self.max_consecutive_losses:
                        cooldown_remaining = self.cooldown_bars
                    continue

                # Regular stop loss
                if row["high"] >= stop_loss:
                    result.iloc[i, result.columns.get_loc("signal")] = -2
                    signals.append(Signal(
                        time=current_time,
                        type="close_short",
                        price=stop_loss,
                        reason="stop_loss"
                    ))
                    position = PositionType.NONE
                    consecutive_losses += 1
                    if consecutive_losses >= self.max_consecutive_losses:
                        cooldown_remaining = self.cooldown_bars
                    continue

                # Profit exit based on mode
                exit_triggered = False
                exit_price = 0.0

                if self.profit_mode == "to_basis":
                    # Exit when price reaches Keltner basis
                    kc_basis = row.get("kc_basis", row["close"])
                    if row["low"] <= kc_basis:
                        exit_triggered = True
                        exit_price = kc_basis

                elif self.profit_mode == "fixed_atr":
                    # Fixed ATR take profit
                    if row["low"] <= take_profit:
                        exit_triggered = True
                        exit_price = take_profit

                elif self.profit_mode == "trailing":
                    # Trailing stop mode - update trailing stop
                    new_trailing = row["low"] + (row["atr"] * self.stop_multiplier)
                    trailing_stop = min(trailing_stop, new_trailing)
                    if row["high"] >= trailing_stop:
                        exit_triggered = True
                        exit_price = trailing_stop

                if exit_triggered:
                    result.iloc[i, result.columns.get_loc("signal")] = -2
                    signals.append(Signal(
                        time=current_time,
                        type="close_short",
                        price=exit_price,
                        reason="take_profit"
                    ))
                    position = PositionType.NONE
                    consecutive_losses = 0
                    continue

                # Max hold bars timeout
                if bars_held >= self.max_hold_bars:
                    result.iloc[i, result.columns.get_loc("signal")] = -2
                    signals.append(Signal(
                        time=current_time,
                        type="close_short",
                        price=row["close"],
                        reason="timeout"
                    ))
                    position = PositionType.NONE
                    continue

            # Check entry conditions (only if no position and not in cooldown)
            if position == PositionType.NONE and cooldown_remaining == 0:
                kc_lower = row.get("kc_lower")
                kc_upper = row.get("kc_upper")
                kc_basis = row.get("kc_basis")

                if pd.isna(kc_lower) or pd.isna(kc_upper):
                    continue

                # Long entry: close below lower Keltner band (oversold)
                if prev_row["close"] < kc_lower:
                    if self._check_filters(row, PositionType.LONG):
                        entry_price = row["open"] + self.spread / 2
                        entry_bar = i
                        entry_atr = row["atr"]
                        stop_loss = entry_price - (entry_atr * self.stop_multiplier)
                        if self.big_stop_multiplier > 0:
                            big_stop = entry_price - (entry_atr * self.big_stop_multiplier)
                        take_profit = entry_price + (entry_atr * self.profit_multiplier)
                        trailing_stop = stop_loss

                        result.iloc[i, result.columns.get_loc("signal")] = 1
                        signals.append(Signal(
                            time=current_time,
                            type="buy",
                            price=entry_price,
                            reason="kc_oversold"
                        ))
                        position = PositionType.LONG

                # Short entry: close above upper Keltner band (overbought)
                elif prev_row["close"] > kc_upper:
                    if self._check_filters(row, PositionType.SHORT):
                        entry_price = row["open"] - self.spread / 2
                        entry_bar = i
                        entry_atr = row["atr"]
                        stop_loss = entry_price + (entry_atr * self.stop_multiplier)
                        if self.big_stop_multiplier > 0:
                            big_stop = entry_price + (entry_atr * self.big_stop_multiplier)
                        take_profit = entry_price - (entry_atr * self.profit_multiplier)
                        trailing_stop = stop_loss

                        result.iloc[i, result.columns.get_loc("signal")] = -1
                        signals.append(Signal(
                            time=current_time,
                            type="sell",
                            price=entry_price,
                            reason="kc_overbought"
                        ))
                        position = PositionType.SHORT

        return result, signals


def create_strategy(strategy_type: str, **kwargs):
    """
    Factory function to create strategy instances.

    Args:
        strategy_type: "s1" for ATR Breakout, "s2" for Keltner Mean Reversion
        **kwargs: Strategy parameters

    Returns:
        Strategy instance
    """
    if strategy_type.lower() == "s1":
        return ATRBreakoutStrategy(**kwargs)
    elif strategy_type.lower() == "s2":
        return KeltnerMeanReversionStrategy(**kwargs)
    else:
        raise ValueError(f"Unknown strategy type: {strategy_type}")

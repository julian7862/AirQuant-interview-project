"""
Technical indicators module.
Implements ATR and other indicators needed for the trading strategy.
"""

import pandas as pd
import numpy as np


def calculate_true_range(df: pd.DataFrame) -> pd.Series:
    """
    Calculate True Range for each bar.

    True Range = max(
        High - Low,
        abs(High - Previous Close),
        abs(Low - Previous Close)
    )
    """
    high = df["high"]
    low = df["low"]
    close = df["close"]
    prev_close = close.shift(1)

    tr1 = high - low
    tr2 = abs(high - prev_close)
    tr3 = abs(low - prev_close)

    true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    return true_range


def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """
    Calculate Average True Range (ATR).

    Uses Wilder's smoothing method (exponential moving average).

    Args:
        df: DataFrame with OHLC columns
        period: ATR calculation period (default 14)

    Returns:
        Series with ATR values
    """
    tr = calculate_true_range(df)

    # Wilder's smoothing: EMA with alpha = 1/period
    atr = tr.ewm(alpha=1/period, min_periods=period, adjust=False).mean()

    return atr


def calculate_donchian_channel(df: pd.DataFrame, period: int = 20) -> tuple:
    """
    Calculate Donchian Channel (highest high and lowest low over period).

    Args:
        df: DataFrame with OHLC columns
        period: Lookback period

    Returns:
        Tuple of (upper_band, lower_band) Series
    """
    upper = df["high"].rolling(window=period).max()
    lower = df["low"].rolling(window=period).min()

    return upper, lower


def add_indicators(df: pd.DataFrame, atr_period: int = 14, breakout_period: int = 20) -> pd.DataFrame:
    """
    Add all required indicators to the OHLCV dataframe.

    Args:
        df: DataFrame with OHLCV columns
        atr_period: ATR calculation period
        breakout_period: Donchian channel period for breakout detection

    Returns:
        DataFrame with added indicator columns
    """
    result = df.copy()

    # ATR
    result["atr"] = calculate_atr(result, atr_period)

    # Donchian Channel
    result["dc_upper"], result["dc_lower"] = calculate_donchian_channel(result, breakout_period)

    # Shift Donchian by 1 to avoid look-ahead bias (use previous period's levels)
    result["dc_upper"] = result["dc_upper"].shift(1)
    result["dc_lower"] = result["dc_lower"].shift(1)

    return result

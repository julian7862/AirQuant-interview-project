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


def calculate_ema(df: pd.DataFrame, period: int, column: str = "close") -> pd.Series:
    """
    Calculate Exponential Moving Average (EMA).

    Args:
        df: DataFrame with price data
        period: EMA period
        column: Column to calculate EMA on (default "close")

    Returns:
        Series with EMA values
    """
    return df[column].ewm(span=period, min_periods=period, adjust=False).mean()


def calculate_keltner_channel(
    df: pd.DataFrame,
    basis_period: int = 20,
    atr_period: int = 14,
    multiplier: float = 2.0
) -> tuple:
    """
    Calculate Keltner Channel.

    Keltner Channel uses EMA as basis and ATR for bands:
    - Basis = EMA(Close, basis_period)
    - Upper = Basis + multiplier * ATR
    - Lower = Basis - multiplier * ATR

    Args:
        df: DataFrame with OHLC columns
        basis_period: EMA period for channel basis
        atr_period: ATR calculation period
        multiplier: ATR multiplier for bands

    Returns:
        Tuple of (basis, upper, lower) Series
    """
    basis = calculate_ema(df, basis_period, "close")
    atr = calculate_atr(df, atr_period)

    upper = basis + multiplier * atr
    lower = basis - multiplier * atr

    return basis, upper, lower


def calculate_historical_atr_ratio(
    df: pd.DataFrame,
    atr_period: int = 14,
    lookback: int = 200
) -> pd.Series:
    """
    Calculate ATR ratio compared to historical ATR.

    Used as volatility filter: ATR / Historical_ATR
    - Ratio < 1.0 means current volatility is below historical average
    - Ratio > 1.0 means current volatility is above historical average

    Args:
        df: DataFrame with OHLC columns
        atr_period: ATR calculation period
        lookback: Historical lookback period for average ATR

    Returns:
        Series with ATR ratio values
    """
    atr = calculate_atr(df, atr_period)
    historical_atr = atr.rolling(window=lookback).mean()
    ratio = atr / historical_atr

    return ratio


def add_indicators(df: pd.DataFrame, atr_period: int = 14, breakout_period: int = 20) -> pd.DataFrame:
    """
    Add all required indicators to the OHLCV dataframe for S1 (ATR Breakout).

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


def add_indicators_s2(
    df: pd.DataFrame,
    atr_period: int = 14,
    kc_basis_period: int = 20,
    kc_mult: float = 2.0,
    trend_filter_period: int = 100,
    vol_lookback: int = 200
) -> pd.DataFrame:
    """
    Add all required indicators for S2 (Keltner Mean Reversion).

    Args:
        df: DataFrame with OHLCV columns
        atr_period: ATR calculation period
        kc_basis_period: Keltner Channel EMA basis period
        kc_mult: Keltner Channel ATR multiplier
        trend_filter_period: EMA period for trend filter
        vol_lookback: Lookback period for volatility filter

    Returns:
        DataFrame with added indicator columns
    """
    result = df.copy()

    # ATR
    result["atr"] = calculate_atr(result, atr_period)

    # Keltner Channel
    result["kc_basis"], result["kc_upper"], result["kc_lower"] = calculate_keltner_channel(
        result, kc_basis_period, atr_period, kc_mult
    )

    # Trend filter EMA (long period)
    result["ema_trend"] = calculate_ema(result, trend_filter_period, "close")

    # Volatility filter - ATR ratio
    result["atr_ratio"] = calculate_historical_atr_ratio(result, atr_period, vol_lookback)

    return result

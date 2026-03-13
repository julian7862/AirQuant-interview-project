"""
Tick data to OHLCV conversion module.
Converts raw tick data from CSV to candlestick (OHLCV) format for various timeframes.
"""

import pandas as pd
import numpy as np
from datetime import datetime
from functools import lru_cache
from indicators import calculate_atr

# Timeframe mapping: name -> minutes
TIMEFRAME_MAP = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "4h": 240,
    "1d": 1440,
    "3d": 4320,
}


def load_tick_data(filepath: str) -> pd.DataFrame:
    """Load tick data from CSV file."""
    df = pd.read_csv(filepath)

    # Calculate mid price from bid and ask
    df["mid_price"] = (df["bid"] + df["ask"]) / 2

    # Convert Unix timestamp to datetime
    df["datetime"] = pd.to_datetime(df["time"], unit="s")
    df.set_index("datetime", inplace=True)

    return df


def resample_to_ohlcv(df: pd.DataFrame, timeframe: str) -> pd.DataFrame:
    """
    Resample tick data to OHLCV candlesticks.

    Args:
        df: DataFrame with 'mid_price' column and datetime index
        timeframe: Timeframe string (e.g., '1m', '5m', '1h')

    Returns:
        DataFrame with OHLCV columns
    """
    if timeframe not in TIMEFRAME_MAP:
        raise ValueError(f"Invalid timeframe: {timeframe}. Valid options: {list(TIMEFRAME_MAP.keys())}")

    minutes = TIMEFRAME_MAP[timeframe]
    rule = f"{minutes}min"

    ohlcv = df["mid_price"].resample(rule).agg({
        "open": "first",
        "high": "max",
        "low": "min",
        "close": "last",
    })

    # Calculate volume from tick count (since actual volume is 0 in data)
    ohlcv["volume"] = df["mid_price"].resample(rule).count()

    # Drop rows with NaN (periods with no ticks)
    ohlcv.dropna(inplace=True)

    # Reset index to have datetime as a column
    ohlcv.reset_index(inplace=True)
    ohlcv.rename(columns={"datetime": "time"}, inplace=True)

    # Convert datetime to Unix timestamp for frontend
    ohlcv["timestamp"] = ohlcv["time"].apply(lambda x: int(x.timestamp()))

    return ohlcv


class DataManager:
    """Manages tick data loading and OHLCV conversion with caching."""

    def __init__(self, data_dir: str = "../data"):
        self.data_dir = data_dir
        self._tick_data_cache = {}

    def get_tick_data(self, year: str) -> pd.DataFrame:
        """Get tick data for a specific year (cached)."""
        if year not in self._tick_data_cache:
            filepath = f"{self.data_dir}/USOIL_1y_{year}.csv"
            self._tick_data_cache[year] = load_tick_data(filepath)
        return self._tick_data_cache[year]

    def get_ohlcv(self, year: str, timeframe: str) -> pd.DataFrame:
        """Get OHLCV data for a specific year and timeframe."""
        tick_data = self.get_tick_data(year)
        return resample_to_ohlcv(tick_data, timeframe)

    def get_ohlcv_json(self, year: str, timeframe: str, atr_period: int = 14) -> dict:
        """Get OHLCV data as JSON-serializable dict for frontend."""
        ohlcv = self.get_ohlcv(year, timeframe)

        # Calculate ATR
        ohlcv["atr"] = calculate_atr(ohlcv, atr_period)

        # Format for Lightweight Charts
        candles = []
        atr_data = []
        for _, row in ohlcv.iterrows():
            candles.append({
                "time": int(row["timestamp"]),
                "open": round(row["open"], 3),
                "high": round(row["high"], 3),
                "low": round(row["low"], 3),
                "close": round(row["close"], 3),
                "volume": int(row["volume"]),
            })
            if pd.notna(row["atr"]):
                atr_data.append({
                    "time": int(row["timestamp"]),
                    "value": round(row["atr"], 4),
                })

        return {"candles": candles, "atr": atr_data}

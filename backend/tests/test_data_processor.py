"""
Unit tests for data_processor module.
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_processor import (
    load_tick_data,
    resample_to_ohlcv,
    TIMEFRAME_MAP,
    DataManager,
)


class TestTimeframeMap:
    """Tests for TIMEFRAME_MAP configuration."""

    def test_all_timeframes_exist(self):
        """Verify all expected timeframes are defined."""
        expected = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "3d"]
        for tf in expected:
            assert tf in TIMEFRAME_MAP, f"Timeframe {tf} not in TIMEFRAME_MAP"

    def test_timeframe_minutes_correct(self):
        """Verify timeframe minute values are correct."""
        assert TIMEFRAME_MAP["1m"] == 1
        assert TIMEFRAME_MAP["5m"] == 5
        assert TIMEFRAME_MAP["15m"] == 15
        assert TIMEFRAME_MAP["30m"] == 30
        assert TIMEFRAME_MAP["1h"] == 60
        assert TIMEFRAME_MAP["4h"] == 240
        assert TIMEFRAME_MAP["1d"] == 1440
        assert TIMEFRAME_MAP["3d"] == 4320


class TestResampleToOHLCV:
    """Tests for resample_to_ohlcv function."""

    @pytest.fixture
    def sample_tick_data(self):
        """Create sample tick data for testing."""
        # Create 100 ticks over 10 minutes
        timestamps = pd.date_range(
            start="2024-01-01 09:00:00",
            periods=100,
            freq="6s"  # One tick every 6 seconds = 10 ticks per minute
        )
        prices = 70.0 + np.random.randn(100) * 0.1

        df = pd.DataFrame({
            "mid_price": prices,
        }, index=timestamps)
        df.index.name = "datetime"

        return df

    def test_resample_1m(self, sample_tick_data):
        """Test 1-minute resampling."""
        result = resample_to_ohlcv(sample_tick_data, "1m")

        assert "open" in result.columns
        assert "high" in result.columns
        assert "low" in result.columns
        assert "close" in result.columns
        assert "volume" in result.columns
        assert "timestamp" in result.columns

        # Should have approximately 10 candles (10 minutes of data)
        assert len(result) <= 10

    def test_resample_5m(self, sample_tick_data):
        """Test 5-minute resampling."""
        result = resample_to_ohlcv(sample_tick_data, "5m")

        # Should have approximately 2 candles (10 minutes / 5)
        assert len(result) <= 2

    def test_resample_invalid_timeframe(self, sample_tick_data):
        """Test that invalid timeframe raises ValueError."""
        with pytest.raises(ValueError) as exc_info:
            resample_to_ohlcv(sample_tick_data, "invalid")

        assert "Invalid timeframe" in str(exc_info.value)

    def test_timestamp_is_unix(self, sample_tick_data):
        """Test that timestamp is valid Unix timestamp."""
        result = resample_to_ohlcv(sample_tick_data, "1m")

        for ts in result["timestamp"]:
            # Unix timestamp should be a large integer (seconds since 1970)
            assert isinstance(ts, (int, np.integer))
            assert ts > 1000000000  # After year 2001
            assert ts < 2000000000  # Before year 2033

    def test_ohlc_values_valid(self, sample_tick_data):
        """Test OHLC values are logically valid."""
        result = resample_to_ohlcv(sample_tick_data, "1m")

        for _, row in result.iterrows():
            # High should be >= open, close, low
            assert row["high"] >= row["open"]
            assert row["high"] >= row["close"]
            assert row["high"] >= row["low"]

            # Low should be <= open, close, high
            assert row["low"] <= row["open"]
            assert row["low"] <= row["close"]
            assert row["low"] <= row["high"]

    def test_volume_is_tick_count(self, sample_tick_data):
        """Test that volume represents tick count."""
        result = resample_to_ohlcv(sample_tick_data, "1m")

        for _, row in result.iterrows():
            assert row["volume"] > 0
            assert isinstance(row["volume"], (int, np.integer))


class TestDataManager:
    """Tests for DataManager class."""

    def test_init(self):
        """Test DataManager initialization."""
        dm = DataManager("/test/path")
        assert dm.data_dir == "/test/path"
        assert dm._tick_data_cache == {}

    def test_get_ohlcv_json_returns_dict(self):
        """Test get_ohlcv_json returns correct structure."""
        # This test requires actual data files, so we skip if not available
        dm = DataManager(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

        try:
            result = dm.get_ohlcv_json("24", "1h", 14)

            assert isinstance(result, dict)
            assert "candles" in result
            assert "atr" in result
            assert isinstance(result["candles"], list)
            assert isinstance(result["atr"], list)

            if len(result["candles"]) > 0:
                candle = result["candles"][0]
                assert "time" in candle
                assert "open" in candle
                assert "high" in candle
                assert "low" in candle
                assert "close" in candle
                assert "volume" in candle

            if len(result["atr"]) > 0:
                atr_point = result["atr"][0]
                assert "time" in atr_point
                assert "value" in atr_point

        except FileNotFoundError:
            pytest.skip("Data files not available")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

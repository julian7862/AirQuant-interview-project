"""
Unit tests for indicators module.
"""

import pytest
import pandas as pd
import numpy as np
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from indicators import (
    calculate_true_range,
    calculate_atr,
    calculate_donchian_channel,
    add_indicators,
    calculate_ema,
    calculate_keltner_channel,
    calculate_historical_atr_ratio,
    add_indicators_s2,
)


class TestTrueRange:
    """Tests for True Range calculation."""

    @pytest.fixture
    def sample_ohlc(self):
        """Create sample OHLC data."""
        return pd.DataFrame({
            "open": [100, 102, 101, 103, 102],
            "high": [105, 106, 104, 107, 105],
            "low": [98, 100, 99, 101, 100],
            "close": [102, 101, 103, 102, 104],
        })

    def test_true_range_length(self, sample_ohlc):
        """Test that TR has same length as input."""
        tr = calculate_true_range(sample_ohlc)
        assert len(tr) == len(sample_ohlc)

    def test_true_range_first_value(self, sample_ohlc):
        """Test first TR value is high - low (no previous close)."""
        tr = calculate_true_range(sample_ohlc)
        # First value: high - low = 105 - 98 = 7
        assert tr.iloc[0] == 7

    def test_true_range_positive(self, sample_ohlc):
        """Test all TR values are positive."""
        tr = calculate_true_range(sample_ohlc)
        # Skip first value which might be NaN-affected
        assert all(tr.iloc[1:] > 0)

    def test_true_range_formula(self):
        """Test TR formula with known values."""
        df = pd.DataFrame({
            "open": [100, 105],
            "high": [110, 115],
            "low": [95, 100],
            "close": [105, 110],
        })
        tr = calculate_true_range(df)

        # Second bar:
        # TR1 = high - low = 115 - 100 = 15
        # TR2 = |high - prev_close| = |115 - 105| = 10
        # TR3 = |low - prev_close| = |100 - 105| = 5
        # TR = max(15, 10, 5) = 15
        assert tr.iloc[1] == 15


class TestATR:
    """Tests for ATR calculation."""

    @pytest.fixture
    def sample_ohlc(self):
        """Create sample OHLC data with 20 bars."""
        np.random.seed(42)
        n = 20
        opens = 100 + np.cumsum(np.random.randn(n) * 0.5)
        highs = opens + np.abs(np.random.randn(n)) * 2
        lows = opens - np.abs(np.random.randn(n)) * 2
        closes = opens + np.random.randn(n) * 1

        return pd.DataFrame({
            "open": opens,
            "high": highs,
            "low": lows,
            "close": closes,
        })

    def test_atr_length(self, sample_ohlc):
        """Test ATR has same length as input."""
        atr = calculate_atr(sample_ohlc, period=14)
        assert len(atr) == len(sample_ohlc)

    def test_atr_nan_before_period(self, sample_ohlc):
        """Test ATR is NaN before period is reached."""
        atr = calculate_atr(sample_ohlc, period=14)
        # First 13 values should be NaN
        assert all(pd.isna(atr.iloc[:13]))

    def test_atr_not_nan_after_period(self, sample_ohlc):
        """Test ATR has values after period."""
        atr = calculate_atr(sample_ohlc, period=14)
        # Values from index 13 onwards should not be NaN
        assert all(pd.notna(atr.iloc[13:]))

    def test_atr_positive(self, sample_ohlc):
        """Test ATR values are positive."""
        atr = calculate_atr(sample_ohlc, period=14)
        valid_atr = atr.dropna()
        assert all(valid_atr > 0)

    def test_atr_different_periods(self, sample_ohlc):
        """Test ATR with different periods produces different results."""
        atr_7 = calculate_atr(sample_ohlc, period=7)
        atr_14 = calculate_atr(sample_ohlc, period=14)

        # ATR-7 should have values earlier than ATR-14
        assert pd.notna(atr_7.iloc[7])
        assert pd.isna(atr_14.iloc[7])


class TestDonchianChannel:
    """Tests for Donchian Channel calculation."""

    @pytest.fixture
    def sample_ohlc(self):
        """Create sample OHLC data."""
        return pd.DataFrame({
            "open": [100, 102, 101, 103, 102, 104, 103, 105, 104, 106],
            "high": [105, 107, 106, 108, 107, 109, 108, 110, 109, 111],
            "low": [98, 100, 99, 101, 100, 102, 101, 103, 102, 104],
            "close": [102, 101, 103, 102, 104, 103, 105, 104, 106, 105],
        })

    def test_donchian_returns_tuple(self, sample_ohlc):
        """Test Donchian returns upper and lower bands."""
        upper, lower = calculate_donchian_channel(sample_ohlc, period=5)

        assert isinstance(upper, pd.Series)
        assert isinstance(lower, pd.Series)
        assert len(upper) == len(sample_ohlc)
        assert len(lower) == len(sample_ohlc)

    def test_donchian_upper_is_highest_high(self, sample_ohlc):
        """Test upper band is highest high over period."""
        upper, _ = calculate_donchian_channel(sample_ohlc, period=5)

        # At index 4, upper should be max of highs[0:5] = max(105,107,106,108,107) = 108
        assert upper.iloc[4] == 108

    def test_donchian_lower_is_lowest_low(self, sample_ohlc):
        """Test lower band is lowest low over period."""
        _, lower = calculate_donchian_channel(sample_ohlc, period=5)

        # At index 4, lower should be min of lows[0:5] = min(98,100,99,101,100) = 98
        assert lower.iloc[4] == 98

    def test_donchian_upper_gte_lower(self, sample_ohlc):
        """Test upper band is always >= lower band."""
        upper, lower = calculate_donchian_channel(sample_ohlc, period=5)

        valid_mask = pd.notna(upper) & pd.notna(lower)
        assert all(upper[valid_mask] >= lower[valid_mask])


class TestAddIndicators:
    """Tests for add_indicators function."""

    @pytest.fixture
    def sample_ohlc(self):
        """Create sample OHLC data with 30 bars."""
        np.random.seed(42)
        n = 30
        opens = 100 + np.cumsum(np.random.randn(n) * 0.5)
        highs = opens + np.abs(np.random.randn(n)) * 2
        lows = opens - np.abs(np.random.randn(n)) * 2
        closes = opens + np.random.randn(n) * 1

        return pd.DataFrame({
            "open": opens,
            "high": highs,
            "low": lows,
            "close": closes,
        })

    def test_add_indicators_columns(self, sample_ohlc):
        """Test all indicator columns are added."""
        result = add_indicators(sample_ohlc, atr_period=14, breakout_period=20)

        assert "atr" in result.columns
        assert "dc_upper" in result.columns
        assert "dc_lower" in result.columns

    def test_add_indicators_preserves_original(self, sample_ohlc):
        """Test original OHLC columns are preserved."""
        result = add_indicators(sample_ohlc, atr_period=14, breakout_period=20)

        assert "open" in result.columns
        assert "high" in result.columns
        assert "low" in result.columns
        assert "close" in result.columns

    def test_add_indicators_donchian_shifted(self, sample_ohlc):
        """Test Donchian channels are shifted by 1 to avoid look-ahead bias."""
        result = add_indicators(sample_ohlc, atr_period=14, breakout_period=20)

        # First value of Donchian should be NaN (shifted from previous period)
        assert pd.isna(result["dc_upper"].iloc[0])
        assert pd.isna(result["dc_lower"].iloc[0])


class TestEMA:
    """Tests for EMA calculation."""

    @pytest.fixture
    def sample_ohlc(self):
        """Create sample OHLC data."""
        return pd.DataFrame({
            "open": [100, 102, 101, 103, 102, 104, 103, 105, 104, 106],
            "high": [105, 107, 106, 108, 107, 109, 108, 110, 109, 111],
            "low": [98, 100, 99, 101, 100, 102, 101, 103, 102, 104],
            "close": [102, 101, 103, 102, 104, 103, 105, 104, 106, 105],
        })

    def test_ema_length(self, sample_ohlc):
        """Test EMA has same length as input."""
        ema = calculate_ema(sample_ohlc, period=5, column="close")
        assert len(ema) == len(sample_ohlc)

    def test_ema_nan_before_period(self, sample_ohlc):
        """Test EMA is NaN before period is reached."""
        ema = calculate_ema(sample_ohlc, period=5, column="close")
        assert all(pd.isna(ema.iloc[:4]))

    def test_ema_not_nan_after_period(self, sample_ohlc):
        """Test EMA has values after period."""
        ema = calculate_ema(sample_ohlc, period=5, column="close")
        assert all(pd.notna(ema.iloc[4:]))


class TestKeltnerChannel:
    """Tests for Keltner Channel calculation."""

    @pytest.fixture
    def sample_ohlc(self):
        """Create sample OHLC data with 30 bars."""
        np.random.seed(42)
        n = 30
        opens = 100 + np.cumsum(np.random.randn(n) * 0.5)
        highs = opens + np.abs(np.random.randn(n)) * 2
        lows = opens - np.abs(np.random.randn(n)) * 2
        closes = opens + np.random.randn(n) * 1

        return pd.DataFrame({
            "open": opens,
            "high": highs,
            "low": lows,
            "close": closes,
        })

    def test_keltner_returns_tuple(self, sample_ohlc):
        """Test Keltner returns basis, upper, and lower bands."""
        basis, upper, lower = calculate_keltner_channel(
            sample_ohlc, basis_period=20, atr_period=14, multiplier=2.0
        )

        assert isinstance(basis, pd.Series)
        assert isinstance(upper, pd.Series)
        assert isinstance(lower, pd.Series)

    def test_keltner_upper_gt_basis_gt_lower(self, sample_ohlc):
        """Test upper > basis > lower relationship."""
        basis, upper, lower = calculate_keltner_channel(
            sample_ohlc, basis_period=20, atr_period=14, multiplier=2.0
        )

        valid_mask = pd.notna(upper) & pd.notna(lower) & pd.notna(basis)
        assert all(upper[valid_mask] > basis[valid_mask])
        assert all(basis[valid_mask] > lower[valid_mask])

    def test_keltner_multiplier_effect(self, sample_ohlc):
        """Test larger multiplier gives wider bands."""
        _, upper1, lower1 = calculate_keltner_channel(
            sample_ohlc, basis_period=20, atr_period=14, multiplier=1.0
        )
        _, upper2, lower2 = calculate_keltner_channel(
            sample_ohlc, basis_period=20, atr_period=14, multiplier=2.0
        )

        valid_mask = pd.notna(upper1) & pd.notna(upper2)
        # With larger multiplier, bands should be wider
        width1 = upper1[valid_mask] - lower1[valid_mask]
        width2 = upper2[valid_mask] - lower2[valid_mask]
        assert all(width2 > width1)


class TestHistoricalATRRatio:
    """Tests for historical ATR ratio calculation."""

    @pytest.fixture
    def sample_ohlc(self):
        """Create sample OHLC data with enough bars for lookback."""
        np.random.seed(42)
        n = 250
        opens = 100 + np.cumsum(np.random.randn(n) * 0.5)
        highs = opens + np.abs(np.random.randn(n)) * 2
        lows = opens - np.abs(np.random.randn(n)) * 2
        closes = opens + np.random.randn(n) * 1

        return pd.DataFrame({
            "open": opens,
            "high": highs,
            "low": lows,
            "close": closes,
        })

    def test_atr_ratio_length(self, sample_ohlc):
        """Test ATR ratio has same length as input."""
        ratio = calculate_historical_atr_ratio(sample_ohlc, atr_period=14, lookback=200)
        assert len(ratio) == len(sample_ohlc)

    def test_atr_ratio_positive(self, sample_ohlc):
        """Test ATR ratio values are positive where valid."""
        ratio = calculate_historical_atr_ratio(sample_ohlc, atr_period=14, lookback=200)
        valid_ratio = ratio.dropna()
        assert all(valid_ratio > 0)

    def test_atr_ratio_around_one(self, sample_ohlc):
        """Test ATR ratio should be around 1.0 for stable data."""
        ratio = calculate_historical_atr_ratio(sample_ohlc, atr_period=14, lookback=200)
        valid_ratio = ratio.dropna()
        # Most values should be between 0.5 and 2.0
        assert np.mean((valid_ratio > 0.3) & (valid_ratio < 3.0)) > 0.8


class TestAddIndicatorsS2:
    """Tests for add_indicators_s2 function."""

    @pytest.fixture
    def sample_ohlc(self):
        """Create sample OHLC data with 250 bars."""
        np.random.seed(42)
        n = 250
        opens = 100 + np.cumsum(np.random.randn(n) * 0.5)
        highs = opens + np.abs(np.random.randn(n)) * 2
        lows = opens - np.abs(np.random.randn(n)) * 2
        closes = opens + np.random.randn(n) * 1

        return pd.DataFrame({
            "open": opens,
            "high": highs,
            "low": lows,
            "close": closes,
        })

    def test_add_indicators_s2_columns(self, sample_ohlc):
        """Test all S2 indicator columns are added."""
        result = add_indicators_s2(sample_ohlc)

        assert "atr" in result.columns
        assert "kc_basis" in result.columns
        assert "kc_upper" in result.columns
        assert "kc_lower" in result.columns
        assert "ema_trend" in result.columns
        assert "atr_ratio" in result.columns

    def test_add_indicators_s2_preserves_original(self, sample_ohlc):
        """Test original OHLC columns are preserved."""
        result = add_indicators_s2(sample_ohlc)

        assert "open" in result.columns
        assert "high" in result.columns
        assert "low" in result.columns
        assert "close" in result.columns


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

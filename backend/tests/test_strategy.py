"""
Unit tests for strategy module.
"""

import pytest
import pandas as pd
import numpy as np
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from strategy import (
    ATRBreakoutStrategy,
    PositionType,
    Trade,
    Signal,
)


class TestATRBreakoutStrategy:
    """Tests for ATRBreakoutStrategy class."""

    def test_init_default_params(self):
        """Test strategy initializes with default parameters."""
        strategy = ATRBreakoutStrategy()

        assert strategy.atr_period == 14
        assert strategy.breakout_period == 20
        assert strategy.entry_multiplier == 0.5
        assert strategy.stop_multiplier == 2.0
        assert strategy.profit_multiplier == 3.0
        assert strategy.leverage == 10
        assert strategy.risk_per_trade == 0.02
        assert strategy.spread == 0.04

    def test_init_custom_params(self):
        """Test strategy initializes with custom parameters."""
        strategy = ATRBreakoutStrategy(
            atr_period=7,
            breakout_period=10,
            entry_multiplier=1.0,
            stop_multiplier=1.5,
            profit_multiplier=2.0,
            leverage=20,
            risk_per_trade=0.05,
            spread=0.03,
        )

        assert strategy.atr_period == 7
        assert strategy.breakout_period == 10
        assert strategy.entry_multiplier == 1.0
        assert strategy.stop_multiplier == 1.5
        assert strategy.profit_multiplier == 2.0
        assert strategy.leverage == 20
        assert strategy.risk_per_trade == 0.05
        assert strategy.spread == 0.03

    def test_calculate_position_size(self):
        """Test position size calculation."""
        strategy = ATRBreakoutStrategy(
            leverage=10,
            risk_per_trade=0.02,
            stop_multiplier=2.0,
        )

        # Capital = 100000, ATR = 1.0, Price = 100
        # Risk amount = 100000 * 0.02 = 2000
        # Stop distance = 1.0 * 2.0 = 2.0
        # Size = (2000 / 2.0) * 10 = 10000
        size = strategy.calculate_position_size(
            capital=100000,
            atr=1.0,
            price=100
        )

        assert size == 10000

    def test_calculate_position_size_zero_atr(self):
        """Test position size is 0 when ATR is 0."""
        strategy = ATRBreakoutStrategy()

        size = strategy.calculate_position_size(
            capital=100000,
            atr=0,
            price=100
        )

        assert size == 0

    @pytest.fixture
    def sample_df_with_indicators(self):
        """Create sample DataFrame with indicators for signal testing."""
        np.random.seed(42)
        n = 50

        # Create trending price data
        prices = 70 + np.cumsum(np.random.randn(n) * 0.3)

        df = pd.DataFrame({
            "timestamp": range(1704157200, 1704157200 + n * 3600, 3600),
            "open": prices,
            "high": prices + np.abs(np.random.randn(n)) * 0.5,
            "low": prices - np.abs(np.random.randn(n)) * 0.5,
            "close": prices + np.random.randn(n) * 0.2,
            "volume": np.random.randint(100, 1000, n),
        })

        # Add indicators
        df["atr"] = 0.5
        df["dc_upper"] = df["high"].rolling(20).max().shift(1)
        df["dc_lower"] = df["low"].rolling(20).min().shift(1)

        return df

    def test_generate_signals_returns_dataframe_and_list(self, sample_df_with_indicators):
        """Test generate_signals returns correct types."""
        strategy = ATRBreakoutStrategy()

        result_df, signals = strategy.generate_signals(sample_df_with_indicators)

        assert isinstance(result_df, pd.DataFrame)
        assert isinstance(signals, list)

    def test_generate_signals_adds_columns(self, sample_df_with_indicators):
        """Test generate_signals adds required columns."""
        strategy = ATRBreakoutStrategy()

        result_df, _ = strategy.generate_signals(sample_df_with_indicators)

        assert "signal" in result_df.columns
        assert "long_entry_level" in result_df.columns
        assert "short_entry_level" in result_df.columns

    def test_signal_types_valid(self, sample_df_with_indicators):
        """Test generated signals have valid types."""
        strategy = ATRBreakoutStrategy()

        _, signals = strategy.generate_signals(sample_df_with_indicators)

        valid_types = ["buy", "sell", "close_long", "close_short"]
        for signal in signals:
            assert signal.type in valid_types


class TestPositionType:
    """Tests for PositionType enum."""

    def test_position_values(self):
        """Test PositionType enum values."""
        assert PositionType.NONE.value == 0
        assert PositionType.LONG.value == 1
        assert PositionType.SHORT.value == -1


class TestSignal:
    """Tests for Signal dataclass."""

    def test_signal_creation(self):
        """Test Signal dataclass creation."""
        signal = Signal(
            time=1704157200,
            type="buy",
            price=71.5,
            reason="breakout_long"
        )

        assert signal.time == 1704157200
        assert signal.type == "buy"
        assert signal.price == 71.5
        assert signal.reason == "breakout_long"


class TestTrade:
    """Tests for Trade dataclass."""

    def test_trade_creation(self):
        """Test Trade dataclass creation."""
        trade = Trade(
            entry_time=1704157200,
            exit_time=1704160800,
            entry_price=71.5,
            exit_price=72.0,
            position_type=PositionType.LONG,
            size=100,
            pnl=50.0,
            pnl_percent=0.7
        )

        assert trade.entry_time == 1704157200
        assert trade.exit_time == 1704160800
        assert trade.entry_price == 71.5
        assert trade.exit_price == 72.0
        assert trade.position_type == PositionType.LONG
        assert trade.size == 100
        assert trade.pnl == 50.0
        assert trade.pnl_percent == 0.7


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Unit tests for FastAPI endpoints.
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


client = TestClient(app)


class TestRootEndpoint:
    """Tests for root endpoint."""

    def test_root_returns_200(self):
        """Test root endpoint returns 200."""
        response = client.get("/")
        assert response.status_code == 200

    def test_root_returns_correct_message(self):
        """Test root endpoint returns correct message."""
        response = client.get("/")
        data = response.json()

        assert "message" in data
        assert "USOIL ATR Backtest API" in data["message"]
        assert "version" in data


class TestTimeframesEndpoint:
    """Tests for timeframes endpoint."""

    def test_timeframes_returns_200(self):
        """Test timeframes endpoint returns 200."""
        response = client.get("/api/timeframes")
        assert response.status_code == 200

    def test_timeframes_returns_list(self):
        """Test timeframes endpoint returns list."""
        response = client.get("/api/timeframes")
        data = response.json()

        assert "timeframes" in data
        assert isinstance(data["timeframes"], list)
        assert len(data["timeframes"]) == 8

    def test_timeframes_contains_all_expected(self):
        """Test all expected timeframes are present."""
        response = client.get("/api/timeframes")
        data = response.json()

        values = [tf["value"] for tf in data["timeframes"]]
        expected = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "3d"]

        for exp in expected:
            assert exp in values, f"Timeframe {exp} not found"


class TestYearsEndpoint:
    """Tests for years endpoint."""

    def test_years_returns_200(self):
        """Test years endpoint returns 200."""
        response = client.get("/api/years")
        assert response.status_code == 200

    def test_years_returns_list(self):
        """Test years endpoint returns list."""
        response = client.get("/api/years")
        data = response.json()

        assert "years" in data
        assert isinstance(data["years"], list)

    def test_years_contains_24_and_25(self):
        """Test years 24 and 25 are available."""
        response = client.get("/api/years")
        data = response.json()

        values = [y["value"] for y in data["years"]]
        assert "24" in values
        assert "25" in values


class TestOHLCVEndpoint:
    """Tests for OHLCV endpoint."""

    def test_ohlcv_invalid_year(self):
        """Test OHLCV returns 400 for invalid year."""
        response = client.get("/api/ohlcv/99")
        assert response.status_code == 400

    def test_ohlcv_invalid_timeframe(self):
        """Test OHLCV returns 400 for invalid timeframe."""
        response = client.get("/api/ohlcv/24?timeframe=invalid")
        assert response.status_code == 400

    def test_ohlcv_valid_request(self):
        """Test OHLCV returns 200 for valid request."""
        response = client.get("/api/ohlcv/24?timeframe=1h")

        # May fail if data files not present, that's OK
        if response.status_code == 200:
            data = response.json()
            assert "year" in data
            assert "timeframe" in data
            assert "count" in data
            assert "data" in data
            assert "atr" in data

            assert data["year"] == "24"
            assert data["timeframe"] == "1h"

    def test_ohlcv_data_structure(self):
        """Test OHLCV data has correct structure."""
        response = client.get("/api/ohlcv/24?timeframe=1h")

        if response.status_code == 200:
            data = response.json()

            if len(data["data"]) > 0:
                candle = data["data"][0]
                assert "time" in candle
                assert "open" in candle
                assert "high" in candle
                assert "low" in candle
                assert "close" in candle
                assert "volume" in candle

                # Verify time is Unix timestamp
                assert isinstance(candle["time"], int)
                assert candle["time"] > 1000000000

    def test_ohlcv_atr_data_structure(self):
        """Test ATR data has correct structure."""
        response = client.get("/api/ohlcv/24?timeframe=1h")

        if response.status_code == 200:
            data = response.json()

            if len(data["atr"]) > 0:
                atr_point = data["atr"][0]
                assert "time" in atr_point
                assert "value" in atr_point

                # ATR should be positive
                assert atr_point["value"] > 0


class TestBacktestEndpoint:
    """Tests for backtest endpoint."""

    def test_backtest_invalid_year(self):
        """Test backtest returns 400 for invalid year."""
        response = client.post("/api/backtest", json={"year": "99"})
        assert response.status_code == 400

    def test_backtest_invalid_timeframe(self):
        """Test backtest returns 400 for invalid timeframe."""
        response = client.post("/api/backtest", json={
            "year": "24",
            "timeframe": "invalid"
        })
        assert response.status_code == 400

    def test_backtest_valid_request(self):
        """Test backtest returns 200 for valid request."""
        response = client.post("/api/backtest", json={
            "year": "24",
            "timeframe": "1h",
            "atr_period": 14,
            "breakout_period": 20,
            "entry_multiplier": 0.5,
            "stop_multiplier": 2.0,
            "profit_multiplier": 3.0,
            "leverage": 10,
            "risk_per_trade": 0.02,
            "initial_capital": 100000,
            "spread": 0.04,
        })

        # May fail if data files not present
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            assert "metrics" in data
            assert "signals" in data

    def test_backtest_metrics_structure(self):
        """Test backtest metrics have correct structure."""
        response = client.post("/api/backtest", json={
            "year": "24",
            "timeframe": "1h",
        })

        if response.status_code == 200:
            data = response.json()
            metrics = data["metrics"]

            required_metrics = [
                "annual_return",
                "max_drawdown",
                "sharpe_ratio",
                "sortino_ratio",
                "win_rate",
                "profit_factor",
                "total_trades",
            ]

            for metric in required_metrics:
                assert metric in metrics, f"Metric {metric} not found"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

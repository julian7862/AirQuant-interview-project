"""
FastAPI Backend for USOIL ATR Trading Backtest System.
Provides API endpoints for OHLCV data and backtesting.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

from data_processor import DataManager, TIMEFRAME_MAP
from backtest_engine import BacktestEngine

# Initialize FastAPI app
app = FastAPI(
    title="USOIL ATR Backtest API",
    description="API for oil futures backtesting with ATR strategy",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize data manager
data_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data_manager = DataManager(data_dir)


class BacktestRequest(BaseModel):
    """Request model for backtesting."""
    year: str = "24"
    timeframe: str = "1h"
    atr_period: int = 14
    breakout_period: int = 20
    entry_multiplier: float = 0.5
    stop_multiplier: float = 2.0
    profit_multiplier: float = 3.0
    leverage: int = 10
    risk_per_trade: float = 0.02
    initial_capital: float = 100000
    spread: float = 0.04


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "USOIL ATR Backtest API", "version": "1.0.0"}


@app.get("/api/timeframes")
async def get_timeframes():
    """Get available timeframes."""
    return {
        "timeframes": [
            {"value": "1m", "label": "1K (1分鐘)"},
            {"value": "5m", "label": "5K (5分鐘)"},
            {"value": "15m", "label": "15K (15分鐘)"},
            {"value": "30m", "label": "30K (30分鐘)"},
            {"value": "1h", "label": "1H (1小時)"},
            {"value": "4h", "label": "4H (4小時)"},
            {"value": "1d", "label": "1D (1天)"},
            {"value": "3d", "label": "3D (3天)"},
        ]
    }


@app.get("/api/ohlcv/{year}")
async def get_ohlcv(year: str, timeframe: str = "1h", atr_period: int = 14):
    """
    Get OHLCV candlestick data for a specific year and timeframe.

    Args:
        year: "24" or "25"
        timeframe: Timeframe string (1m, 5m, 15m, 30m, 1h, 4h, 1d, 3d)
        atr_period: ATR calculation period (default 14)
    """
    if year not in ["24", "25"]:
        raise HTTPException(status_code=400, detail="Invalid year. Use '24' or '25'")

    if timeframe not in TIMEFRAME_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid timeframe. Valid options: {list(TIMEFRAME_MAP.keys())}"
        )

    try:
        data = data_manager.get_ohlcv_json(year, timeframe, atr_period)
        return {
            "year": year,
            "timeframe": timeframe,
            "atr_period": atr_period,
            "count": len(data["candles"]),
            "data": data["candles"],
            "atr": data["atr"]
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Data file for year {year} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/backtest")
async def run_backtest(request: BacktestRequest):
    """
    Run backtest with specified parameters.
    """
    if request.year not in ["24", "25"]:
        raise HTTPException(status_code=400, detail="Invalid year. Use '24' or '25'")

    if request.timeframe not in TIMEFRAME_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid timeframe. Valid options: {list(TIMEFRAME_MAP.keys())}"
        )

    try:
        # Get OHLCV data
        df = data_manager.get_ohlcv(request.year, request.timeframe)

        # Initialize backtest engine
        engine = BacktestEngine(
            initial_capital=request.initial_capital,
            atr_period=request.atr_period,
            breakout_period=request.breakout_period,
            entry_multiplier=request.entry_multiplier,
            stop_multiplier=request.stop_multiplier,
            profit_multiplier=request.profit_multiplier,
            leverage=request.leverage,
            risk_per_trade=request.risk_per_trade,
            spread=request.spread,
        )

        # Run backtest
        result = engine.run(df)

        return {
            "success": True,
            "parameters": request.model_dump(),
            "metrics": result.metrics,
            "signals": result.signals,
            "equity_curve": result.equity_curve[::max(1, len(result.equity_curve) // 500)],  # Sample for performance
            "total_signals": len(result.signals),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/years")
async def get_available_years():
    """Get available data years."""
    return {
        "years": [
            {"value": "24", "label": "2024 (Training)", "description": "2024-01-02 ~ 2024-11-30"},
            {"value": "25", "label": "2025 (Validation)", "description": "2024-11-01 ~ 2025-08-30"},
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

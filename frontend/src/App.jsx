import React, { useState, useEffect, useCallback } from 'react';
import Chart from './components/Chart';
import TimeframeSelector from './components/TimeframeSelector';
import ParameterPanel from './components/ParameterPanel';
import MetricsPanel from './components/MetricsPanel';
import { getOHLCV, runBacktest } from './services/api';

const DEFAULT_PARAMS = {
  year: '24',
  timeframe: '1h',
  strategy_type: 's1',

  // Common parameters
  atr_period: 14,
  stop_multiplier: 2.0,
  profit_multiplier: 3.0,
  leverage: 10,
  risk_per_trade: 0.02,
  initial_capital: 100000,
  spread: 0.04,

  // S1 specific parameters
  breakout_period: 20,
  entry_multiplier: 0.5,

  // S2 specific parameters
  kc_basis_period: 20,
  kc_mult: 2.0,
  profit_mode: 'to_basis',
  big_stop_multiplier: 0,
  max_hold_bars: 100,
  trend_filter_period: 100,
  vol_lookback: 200,
  vol_ratio_max: 1.0,
  max_consecutive_losses: 3,
  cooldown_bars: 5,
};

function App() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [chartData, setChartData] = useState([]);
  const [atrData, setAtrData] = useState([]);
  const [signals, setSignals] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load chart data
  const loadChartData = useCallback(async () => {
    setDataLoading(true);
    setError(null);
    try {
      const response = await getOHLCV(params.year, params.timeframe);
      setChartData(response.data || []);
      setAtrData(response.atr || []);
    } catch (err) {
      setError('Failed to load chart data. Make sure the backend is running on port 8000.');
      setChartData([]);
      setAtrData([]);
      console.error('API Error:', err);
    } finally {
      setDataLoading(false);
    }
  }, [params.year, params.timeframe]);

  // Load data on mount and when timeframe/year changes
  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  // Handle timeframe change
  const handleTimeframeChange = (timeframe) => {
    setParams((prev) => ({ ...prev, timeframe }));
    setSignals([]);
    setMetrics(null);
  };

  // Handle year change
  const handleYearChange = (year) => {
    setParams((prev) => ({ ...prev, year }));
    setSignals([]);
    setMetrics(null);
  };

  // Run backtest
  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await runBacktest(params);
      setSignals(response.signals);
      setMetrics(response.metrics);
    } catch (err) {
      setError('Backtest failed. Please check your parameters.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-chart-bg p-4">
      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              USOIL ATR Backtest System
            </h1>
            <p className="text-sm text-text-secondary">
              {params.strategy_type === 's1'
                ? 'S1: ATR Breakout Strategy'
                : 'S2: Keltner Mean Reversion Strategy'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Year Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => handleYearChange('24')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  params.year === '24'
                    ? 'bg-blue text-white'
                    : 'bg-panel-bg text-text-secondary hover:bg-border'
                }`}
              >
                2024 (Training)
              </button>
              <button
                onClick={() => handleYearChange('25')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  params.year === '25'
                    ? 'bg-blue text-white'
                    : 'bg-panel-bg text-text-secondary hover:bg-border'
                }`}
              >
                2025 (Validation)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red/20 border border-red rounded text-red text-sm">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-4">
        {/* Chart Section */}
        <div className="flex-1">
          {/* Timeframe Selector */}
          <div className="mb-2">
            <TimeframeSelector
              selected={params.timeframe}
              onChange={handleTimeframeChange}
            />
          </div>

          {/* Chart */}
          <div className="bg-panel-bg rounded-lg border border-border overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            {dataLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-text-secondary">Loading chart data...</div>
              </div>
            ) : (
              <Chart
                data={chartData}
                atrData={atrData}
                signals={signals}
              />
            )}
          </div>

          {/* Signal Stats */}
          {signals.length > 0 && (
            <div className="mt-2 text-xs text-text-secondary">
              Showing {signals.length} signals ({signals.filter(s => s.type === 'buy').length} buys, {signals.filter(s => s.type === 'sell').length} sells)
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="w-80 flex flex-col gap-4">
          <ParameterPanel
            params={params}
            onChange={setParams}
            onRunBacktest={handleRunBacktest}
            loading={loading}
          />
          <MetricsPanel metrics={metrics} />
        </div>
      </div>
    </div>
  );
}

export default App;

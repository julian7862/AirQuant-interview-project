import React from 'react';

const MetricCard = ({ label, value, suffix = '', highlight = false, positive = true }) => {
  const valueColor = highlight
    ? positive
      ? 'text-green'
      : 'text-red'
    : 'text-text-primary';

  return (
    <div className="bg-chart-bg rounded-lg p-3 border border-border">
      <div className="text-xs text-text-secondary mb-1">{label}</div>
      <div className={`text-lg font-semibold ${valueColor}`}>
        {value}{suffix}
      </div>
    </div>
  );
};

const MetricsPanel = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="bg-panel-bg rounded-lg p-4 border border-border">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Performance Metrics</h3>
        <div className="text-center text-text-secondary py-8">
          Run a backtest to see results
        </div>
      </div>
    );
  }

  return (
    <div className="bg-panel-bg rounded-lg p-4 border border-border">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Performance Metrics</h3>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <MetricCard
          label="Annual Return"
          value={metrics.annual_return}
          suffix="%"
          highlight
          positive={metrics.annual_return >= 0}
        />
        <MetricCard
          label="Max Drawdown"
          value={metrics.max_drawdown}
          suffix="%"
          highlight
          positive={false}
        />
        <MetricCard
          label="Sharpe Ratio"
          value={metrics.sharpe_ratio}
          highlight
          positive={metrics.sharpe_ratio >= 1}
        />
        <MetricCard
          label="Sortino Ratio"
          value={metrics.sortino_ratio}
          highlight
          positive={metrics.sortino_ratio >= 1}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricCard
          label="Win Rate"
          value={metrics.win_rate}
          suffix="%"
        />
        <MetricCard
          label="Profit Factor"
          value={metrics.profit_factor}
        />
        <MetricCard
          label="Total Trades"
          value={metrics.total_trades}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <MetricCard
          label="Calmar Ratio"
          value={metrics.calmar_ratio}
        />
        <MetricCard
          label="Recovery Factor"
          value={metrics.recovery_factor}
        />
      </div>

      {/* Final Results */}
      <div className="border-t border-border pt-4 mt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-text-secondary">Total Return</span>
          <span className={`text-sm font-semibold ${metrics.total_return >= 0 ? 'text-green' : 'text-red'}`}>
            {metrics.total_return >= 0 ? '+' : ''}{metrics.total_return}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-text-secondary">Final Capital</span>
          <span className="text-sm font-semibold text-text-primary">
            ${metrics.final_capital?.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;

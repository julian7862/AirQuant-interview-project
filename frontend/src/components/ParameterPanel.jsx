import React from 'react';

const ParameterInput = ({ label, value, onChange, min, max, step = 1, suffix = '' }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-text-secondary">{label}</label>
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 bg-chart-bg border border-border rounded text-sm text-text-primary focus:outline-none focus:border-blue"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const ParameterPanel = ({ params, onChange, onRunBacktest, loading }) => {
  const handleChange = (key, value) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="bg-panel-bg rounded-lg p-4 border border-border">
      <h3 className="text-sm font-semibold text-text-primary mb-4">ATR Strategy Parameters</h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <ParameterInput
          label="ATR Period"
          value={params.atr_period}
          onChange={(v) => handleChange('atr_period', v)}
          min={5}
          max={50}
        />
        <ParameterInput
          label="Breakout Period"
          value={params.breakout_period}
          onChange={(v) => handleChange('breakout_period', v)}
          min={5}
          max={100}
        />
        <ParameterInput
          label="Entry Multiplier"
          value={params.entry_multiplier}
          onChange={(v) => handleChange('entry_multiplier', v)}
          min={0.1}
          max={3}
          step={0.1}
          suffix="x ATR"
        />
        <ParameterInput
          label="Stop Multiplier"
          value={params.stop_multiplier}
          onChange={(v) => handleChange('stop_multiplier', v)}
          min={0.5}
          max={5}
          step={0.1}
          suffix="x ATR"
        />
        <ParameterInput
          label="Profit Multiplier"
          value={params.profit_multiplier}
          onChange={(v) => handleChange('profit_multiplier', v)}
          min={1}
          max={10}
          step={0.1}
          suffix="x ATR"
        />
        <ParameterInput
          label="Leverage"
          value={params.leverage}
          onChange={(v) => handleChange('leverage', v)}
          min={1}
          max={50}
          suffix="x"
        />
        <ParameterInput
          label="Risk Per Trade"
          value={params.risk_per_trade * 100}
          onChange={(v) => handleChange('risk_per_trade', v / 100)}
          min={0.5}
          max={10}
          step={0.5}
          suffix="%"
        />
        <ParameterInput
          label="Spread"
          value={params.spread}
          onChange={(v) => handleChange('spread', v)}
          min={0}
          max={0.2}
          step={0.01}
        />
      </div>

      <div className="mb-4">
        <ParameterInput
          label="Initial Capital"
          value={params.initial_capital}
          onChange={(v) => handleChange('initial_capital', v)}
          min={1000}
          max={10000000}
          step={1000}
          suffix="USD"
        />
      </div>

      <button
        onClick={onRunBacktest}
        disabled={loading}
        className={`w-full py-2.5 rounded font-medium transition-colors ${
          loading
            ? 'bg-border text-text-secondary cursor-not-allowed'
            : 'bg-blue text-white hover:bg-blue/80'
        }`}
      >
        {loading ? 'Running Backtest...' : 'Run Backtest'}
      </button>
    </div>
  );
};

export default ParameterPanel;

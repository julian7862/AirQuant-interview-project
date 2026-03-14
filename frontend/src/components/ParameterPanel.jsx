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

const SelectInput = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-text-secondary">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-chart-bg border border-border rounded text-sm text-text-primary focus:outline-none focus:border-blue"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const ParameterPanel = ({ params, onChange, onRunBacktest, loading }) => {
  const handleChange = (key, value) => {
    onChange({ ...params, [key]: value });
  };

  const isS1 = params.strategy_type === 's1';
  const isS2 = params.strategy_type === 's2';

  return (
    <div className="bg-panel-bg rounded-lg p-4 border border-border">
      {/* Strategy Selector */}
      <div className="mb-4">
        <label className="text-xs text-text-secondary block mb-2">Strategy</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleChange('strategy_type', 's1')}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              isS1
                ? 'bg-blue text-white'
                : 'bg-chart-bg text-text-secondary hover:bg-border'
            }`}
          >
            S1: Breakout
          </button>
          <button
            onClick={() => handleChange('strategy_type', 's2')}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              isS2
                ? 'bg-purple-500 text-white'
                : 'bg-chart-bg text-text-secondary hover:bg-border'
            }`}
          >
            S2: Mean Rev
          </button>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-text-primary mb-4">
        {isS1 ? 'ATR Breakout Parameters' : 'Keltner Mean Reversion Parameters'}
      </h3>

      {/* Common Parameters */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <ParameterInput
          label="ATR Period"
          value={params.atr_period}
          onChange={(v) => handleChange('atr_period', v)}
          min={5}
          max={50}
        />

        {/* S1 Specific: Breakout Period */}
        {isS1 && (
          <ParameterInput
            label="Breakout Period"
            value={params.breakout_period}
            onChange={(v) => handleChange('breakout_period', v)}
            min={5}
            max={100}
          />
        )}

        {/* S2 Specific: KC Basis Period */}
        {isS2 && (
          <ParameterInput
            label="KC Basis Period"
            value={params.kc_basis_period}
            onChange={(v) => handleChange('kc_basis_period', v)}
            min={10}
            max={60}
          />
        )}

        {/* S1 Specific: Entry Multiplier */}
        {isS1 && (
          <ParameterInput
            label="Entry Multiplier"
            value={params.entry_multiplier}
            onChange={(v) => handleChange('entry_multiplier', v)}
            min={0.1}
            max={3}
            step={0.1}
            suffix="x ATR"
          />
        )}

        {/* S2 Specific: KC Multiplier */}
        {isS2 && (
          <ParameterInput
            label="KC Multiplier"
            value={params.kc_mult}
            onChange={(v) => handleChange('kc_mult', v)}
            min={1.0}
            max={3.0}
            step={0.1}
            suffix="x ATR"
          />
        )}

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
          min={0.1}
          max={10}
          step={0.1}
          suffix="%"
        />
      </div>

      {/* S2 Specific Parameters */}
      {isS2 && (
        <>
          <div className="border-t border-border pt-3 mb-3">
            <h4 className="text-xs font-semibold text-text-secondary mb-3">Exit Settings</h4>
            <div className="grid grid-cols-2 gap-3">
              <SelectInput
                label="Profit Mode"
                value={params.profit_mode}
                onChange={(v) => handleChange('profit_mode', v)}
                options={[
                  { value: 'to_basis', label: 'To Basis (Mean)' },
                  { value: 'fixed_atr', label: 'Fixed ATR' },
                  { value: 'trailing', label: 'Trailing Stop' },
                ]}
              />
              <ParameterInput
                label="Big Stop Mult"
                value={params.big_stop_multiplier}
                onChange={(v) => handleChange('big_stop_multiplier', v)}
                min={0}
                max={10}
                step={0.5}
                suffix="(0=off)"
              />
              <ParameterInput
                label="Max Hold Bars"
                value={params.max_hold_bars}
                onChange={(v) => handleChange('max_hold_bars', v)}
                min={10}
                max={500}
              />
            </div>
          </div>

          <div className="border-t border-border pt-3 mb-3">
            <h4 className="text-xs font-semibold text-text-secondary mb-3">Filters</h4>
            <div className="grid grid-cols-2 gap-3">
              <ParameterInput
                label="Trend EMA Period"
                value={params.trend_filter_period}
                onChange={(v) => handleChange('trend_filter_period', v)}
                min={50}
                max={200}
              />
              <ParameterInput
                label="Vol Lookback"
                value={params.vol_lookback}
                onChange={(v) => handleChange('vol_lookback', v)}
                min={50}
                max={500}
              />
              <ParameterInput
                label="Vol Ratio Max"
                value={params.vol_ratio_max}
                onChange={(v) => handleChange('vol_ratio_max', v)}
                min={0.5}
                max={2.0}
                step={0.1}
              />
            </div>
          </div>

          <div className="border-t border-border pt-3 mb-3">
            <h4 className="text-xs font-semibold text-text-secondary mb-3">Risk Management</h4>
            <div className="grid grid-cols-2 gap-3">
              <ParameterInput
                label="Max Consec Losses"
                value={params.max_consecutive_losses}
                onChange={(v) => handleChange('max_consecutive_losses', v)}
                min={1}
                max={10}
              />
              <ParameterInput
                label="Cooldown Bars"
                value={params.cooldown_bars}
                onChange={(v) => handleChange('cooldown_bars', v)}
                min={0}
                max={50}
              />
            </div>
          </div>
        </>
      )}

      {/* Common Bottom Parameters */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <ParameterInput
          label="Spread"
          value={params.spread}
          onChange={(v) => handleChange('spread', v)}
          min={0}
          max={0.2}
          step={0.01}
        />
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
            : isS1
              ? 'bg-blue text-white hover:bg-blue/80'
              : 'bg-purple-500 text-white hover:bg-purple-600'
        }`}
      >
        {loading ? 'Running Backtest...' : 'Run Backtest'}
      </button>
    </div>
  );
};

export default ParameterPanel;

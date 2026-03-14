import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParameterPanel from './ParameterPanel';

describe('ParameterPanel Component', () => {
  const defaultParams = {
    year: '24',
    timeframe: '1h',
    strategy_type: 's1',
    atr_period: 14,
    stop_multiplier: 2.0,
    profit_multiplier: 3.0,
    leverage: 10,
    risk_per_trade: 0.02,
    initial_capital: 100000,
    spread: 0.04,
    breakout_period: 20,
    entry_multiplier: 0.5,
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

  it('renders without crashing', () => {
    const onChange = vi.fn();
    const onRunBacktest = vi.fn();
    render(
      <ParameterPanel
        params={defaultParams}
        onChange={onChange}
        onRunBacktest={onRunBacktest}
        loading={false}
      />
    );
    expect(screen.getByText('S1: Breakout')).toBeInTheDocument();
  });

  it('shows S1 parameters when strategy_type is s1', () => {
    const onChange = vi.fn();
    const onRunBacktest = vi.fn();
    render(
      <ParameterPanel
        params={{ ...defaultParams, strategy_type: 's1' }}
        onChange={onChange}
        onRunBacktest={onRunBacktest}
        loading={false}
      />
    );
    expect(screen.getByText('ATR Breakout Parameters')).toBeInTheDocument();
    expect(screen.getByText('Breakout Period')).toBeInTheDocument();
  });

  it('shows S2 parameters when strategy_type is s2', () => {
    const onChange = vi.fn();
    const onRunBacktest = vi.fn();
    render(
      <ParameterPanel
        params={{ ...defaultParams, strategy_type: 's2' }}
        onChange={onChange}
        onRunBacktest={onRunBacktest}
        loading={false}
      />
    );
    expect(screen.getByText('Keltner Mean Reversion Parameters')).toBeInTheDocument();
    expect(screen.getByText('KC Basis Period')).toBeInTheDocument();
    expect(screen.getByText('Profit Mode')).toBeInTheDocument();
  });

  it('calls onChange when strategy is switched', () => {
    const onChange = vi.fn();
    const onRunBacktest = vi.fn();
    render(
      <ParameterPanel
        params={defaultParams}
        onChange={onChange}
        onRunBacktest={onRunBacktest}
        loading={false}
      />
    );

    fireEvent.click(screen.getByText('S2: Mean Rev'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      strategy_type: 's2',
    }));
  });

  it('calls onRunBacktest when Run Backtest button is clicked', () => {
    const onChange = vi.fn();
    const onRunBacktest = vi.fn();
    render(
      <ParameterPanel
        params={defaultParams}
        onChange={onChange}
        onRunBacktest={onRunBacktest}
        loading={false}
      />
    );

    fireEvent.click(screen.getByText('Run Backtest'));
    expect(onRunBacktest).toHaveBeenCalled();
  });

  it('disables Run Backtest button when loading', () => {
    const onChange = vi.fn();
    const onRunBacktest = vi.fn();
    render(
      <ParameterPanel
        params={defaultParams}
        onChange={onChange}
        onRunBacktest={onRunBacktest}
        loading={true}
      />
    );

    expect(screen.getByText('Running Backtest...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Running Backtest/i })).toBeDisabled();
  });

  it('shows S2 exit settings section', () => {
    const onChange = vi.fn();
    const onRunBacktest = vi.fn();
    render(
      <ParameterPanel
        params={{ ...defaultParams, strategy_type: 's2' }}
        onChange={onChange}
        onRunBacktest={onRunBacktest}
        loading={false}
      />
    );

    expect(screen.getByText('Exit Settings')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Risk Management')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Chart from './Chart';

describe('Chart Component', () => {
  const mockData = [
    { time: 1704157200, open: 71.924, high: 72.039, low: 71.774, close: 71.859, volume: 141 },
    { time: 1704160800, open: 71.859, high: 72.004, low: 71.84, close: 71.949, volume: 103 },
    { time: 1704164400, open: 71.979, high: 72.843, low: 71.979, close: 72.404, volume: 829 },
  ];

  const mockAtrData = [
    { time: 1704157200, value: 0.3322 },
    { time: 1704160800, value: 0.3584 },
    { time: 1704164400, value: 0.4676 },
  ];

  const mockSignals = [
    { time: 1704160800, type: 'buy', price: 71.949, reason: 'breakout_long' },
  ];

  const mockEquityCurve = [
    { time: 1704157200, equity: 100000, capital: 100000 },
    { time: 1704160800, equity: 100500, capital: 100500 },
    { time: 1704164400, equity: 101200, capital: 101200 },
  ];

  const mockDrawdownCurve = [
    { time: 1704157200, value: 0 },
    { time: 1704160800, value: 1.5 },
    { time: 1704164400, value: 0.5 },
  ];

  const mockDrawdownMarkers = {
    start: 1704157200,
    bottom: 1704160800,
    recovered: 1704164400,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing with empty data', () => {
    render(<Chart data={[]} atrData={[]} signals={[]} equityCurve={[]} drawdownCurve={[]} drawdownMarkers={null} />);
    // Chart should render even with empty data
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('renders without crashing with valid data', () => {
    render(<Chart data={mockData} atrData={mockAtrData} signals={mockSignals} equityCurve={mockEquityCurve} drawdownCurve={mockDrawdownCurve} drawdownMarkers={mockDrawdownMarkers} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('renders without crashing with null data', () => {
    render(<Chart data={null} atrData={null} signals={null} equityCurve={null} drawdownCurve={null} drawdownMarkers={null} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('renders without crashing with undefined data', () => {
    render(<Chart data={undefined} atrData={undefined} signals={undefined} equityCurve={undefined} drawdownCurve={undefined} drawdownMarkers={undefined} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('renders main chart container', () => {
    render(<Chart data={mockData} atrData={mockAtrData} signals={[]} equityCurve={[]} drawdownCurve={[]} drawdownMarkers={null} />);
    const containers = document.querySelectorAll('.w-full');
    expect(containers.length).toBeGreaterThan(0);
  });

  it('renders ATR indicator label', () => {
    render(<Chart data={mockData} atrData={mockAtrData} signals={[]} equityCurve={[]} drawdownCurve={[]} drawdownMarkers={null} />);
    expect(screen.getByText(/ATR \(14\)/)).toBeInTheDocument();
  });

  it('renders Equity label', () => {
    render(<Chart data={mockData} atrData={mockAtrData} signals={[]} equityCurve={mockEquityCurve} drawdownCurve={[]} drawdownMarkers={null} />);
    expect(screen.getByText(/Equity \(USD\)/)).toBeInTheDocument();
  });

  it('renders Drawdown label', () => {
    render(<Chart data={mockData} atrData={mockAtrData} signals={[]} equityCurve={[]} drawdownCurve={mockDrawdownCurve} drawdownMarkers={null} />);
    expect(screen.getByText(/Drawdown \(%\)/)).toBeInTheDocument();
  });

  it('handles data with missing ATR values gracefully', () => {
    const partialAtrData = [
      { time: 1704157200 }, // No value
      { time: 1704160800, value: 0.3584 },
    ];
    render(<Chart data={mockData} atrData={partialAtrData} signals={[]} equityCurve={[]} drawdownCurve={[]} drawdownMarkers={null} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('handles signals with different types', () => {
    const mixedSignals = [
      { time: 1704160800, type: 'buy', price: 71.949, reason: 'breakout_long' },
      { time: 1704164400, type: 'sell', price: 72.404, reason: 'breakout_short' },
      { time: 1704168000, type: 'close_long', price: 72.5, reason: 'take_profit' },
      { time: 1704171600, type: 'close_short', price: 72.3, reason: 'stop_loss' },
    ];
    render(<Chart data={mockData} atrData={mockAtrData} signals={mixedSignals} equityCurve={[]} drawdownCurve={[]} drawdownMarkers={null} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('renders with equity and drawdown data', () => {
    render(<Chart data={mockData} atrData={mockAtrData} signals={[]} equityCurve={mockEquityCurve} drawdownCurve={mockDrawdownCurve} drawdownMarkers={mockDrawdownMarkers} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });
});

describe('Chart Component Error Handling', () => {
  it('does not crash with large data arrays', () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      time: 1704157200 + i * 3600,
      open: 70 + Math.random() * 5,
      high: 72 + Math.random() * 5,
      low: 69 + Math.random() * 5,
      close: 71 + Math.random() * 5,
      volume: Math.floor(Math.random() * 1000),
    }));
    const largeAtr = Array.from({ length: 1000 }, (_, i) => ({
      time: 1704157200 + i * 3600,
      value: 0.3 + Math.random() * 0.2,
    }));
    const largeEquity = Array.from({ length: 1000 }, (_, i) => ({
      time: 1704157200 + i * 3600,
      equity: 100000 + i * 10,
      capital: 100000 + i * 10,
    }));
    const largeDrawdown = Array.from({ length: 1000 }, (_, i) => ({
      time: 1704157200 + i * 3600,
      value: Math.random() * 5,
    }));

    render(<Chart data={largeData} atrData={largeAtr} signals={[]} equityCurve={largeEquity} drawdownCurve={largeDrawdown} drawdownMarkers={null} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('handles mismatched data and ATR timestamps', () => {
    const data = [
      { time: 1704157200, open: 71, high: 72, low: 70, close: 71.5, volume: 100 },
    ];
    const atrData = [
      { time: 1704200000, value: 0.5 }, // Different timestamp
    ];

    render(<Chart data={data} atrData={atrData} signals={[]} equityCurve={[]} drawdownCurve={[]} drawdownMarkers={null} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });
});

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing with empty data', () => {
    render(<Chart data={[]} atrData={[]} signals={[]} />);
    // Chart should render even with empty data
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('renders without crashing with valid data', () => {
    render(<Chart data={mockData} atrData={mockAtrData} signals={mockSignals} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('renders without crashing with null data', () => {
    render(<Chart data={null} atrData={null} signals={null} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('renders without crashing with undefined data', () => {
    render(<Chart data={undefined} atrData={undefined} signals={undefined} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('renders main chart container', () => {
    render(<Chart data={mockData} atrData={mockAtrData} signals={[]} />);
    const containers = document.querySelectorAll('.w-full');
    expect(containers.length).toBeGreaterThan(0);
  });

  it('renders ATR indicator label', () => {
    render(<Chart data={mockData} atrData={mockAtrData} signals={[]} />);
    expect(screen.getByText(/ATR \(14\)/)).toBeInTheDocument();
  });

  it('handles data with missing ATR values gracefully', () => {
    const partialAtrData = [
      { time: 1704157200 }, // No value
      { time: 1704160800, value: 0.3584 },
    ];
    render(<Chart data={mockData} atrData={partialAtrData} signals={[]} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('handles signals with different types', () => {
    const mixedSignals = [
      { time: 1704160800, type: 'buy', price: 71.949, reason: 'breakout_long' },
      { time: 1704164400, type: 'sell', price: 72.404, reason: 'breakout_short' },
      { time: 1704168000, type: 'close_long', price: 72.5, reason: 'take_profit' },
      { time: 1704171600, type: 'close_short', price: 72.3, reason: 'stop_loss' },
    ];
    render(<Chart data={mockData} atrData={mockAtrData} signals={mixedSignals} />);
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

    render(<Chart data={largeData} atrData={largeAtr} signals={[]} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });

  it('handles mismatched data and ATR timestamps', () => {
    const data = [
      { time: 1704157200, open: 71, high: 72, low: 70, close: 71.5, volume: 100 },
    ];
    const atrData = [
      { time: 1704200000, value: 0.5 }, // Different timestamp
    ];

    render(<Chart data={data} atrData={atrData} signals={[]} />);
    expect(document.querySelector('.flex.flex-col.h-full')).toBeInTheDocument();
  });
});

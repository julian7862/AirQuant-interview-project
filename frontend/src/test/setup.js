import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock lightweight-charts since it requires a DOM canvas
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({
      setData: vi.fn(),
      createPriceLine: vi.fn(() => ({
        applyOptions: vi.fn(),
        options: vi.fn(() => ({ price: 0.5 })),
      })),
      removePriceLine: vi.fn(),
      priceToCoordinate: vi.fn(() => 100),
      coordinateToPrice: vi.fn(() => 0.5),
    })),
    timeScale: vi.fn(() => ({
      subscribeVisibleLogicalRangeChange: vi.fn(),
      setVisibleLogicalRange: vi.fn(),
    })),
    subscribeCrosshairMove: vi.fn(),
    setCrosshairPosition: vi.fn(),
    clearCrosshairPosition: vi.fn(),
    priceScale: vi.fn(() => ({
      options: vi.fn(() => ({ scaleMargins: { top: 0.1, bottom: 0.1 } })),
      applyOptions: vi.fn(),
    })),
    applyOptions: vi.fn(),
    remove: vi.fn(),
  })),
  // v5 API: createSeriesMarkers returns a markers primitive
  createSeriesMarkers: vi.fn(() => ({
    setMarkers: vi.fn(),
    markers: vi.fn(() => []),
    detach: vi.fn(),
  })),
  CandlestickSeries: 'CandlestickSeries',
  LineSeries: 'LineSeries',
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

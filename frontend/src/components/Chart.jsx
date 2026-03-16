import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers } from 'lightweight-charts';

const Chart = ({ data, atrData, signals, equityCurve, drawdownCurve }) => {
  const mainChartContainerRef = useRef(null);
  const atrChartContainerRef = useRef(null);
  const equityChartContainerRef = useRef(null);  // Combined equity + drawdown chart
  const mainChartRef = useRef(null);
  const atrChartRef = useRef(null);
  const equityChartRef = useRef(null);  // Combined chart ref
  const candlestickSeriesRef = useRef(null);
  const atrSeriesRef = useRef(null);
  const equitySeriesRef = useRef(null);
  const drawdownSeriesRef = useRef(null);  // Drawdown on same chart, right scale
  const positionSeriesRef = useRef(null);  // Position histogram
  const priceLineRef = useRef(null);
  const markersRef = useRef(null);
  const [lineValue, setLineValue] = useState(null);
  const [chartError, setChartError] = useState(null);
  const isDraggingLineRef = useRef(false);

  // Initialize charts
  useEffect(() => {
    if (!mainChartContainerRef.current || !atrChartContainerRef.current ||
        !equityChartContainerRef.current) return;

    let mainChart = null;
    let atrChart = null;
    let equityChart = null;  // Combined equity + drawdown chart
    let mainWheelHandler = null;
    let atrWheelHandler = null;
    let handleResize = null;
    const mainContainer = mainChartContainerRef.current;
    const atrContainer = atrChartContainerRef.current;
    const equityContainer = equityChartContainerRef.current;

    try {
      // Time formatter function
    const formatTime = (time) => {
      const date = new Date(time * 1000);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    // Common chart options
    const commonOptions = {
      layout: {
        background: { type: 'solid', color: '#131722' },
        textColor: '#d1d4dc',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#758696', width: 1, style: 2, labelVisible: true },
        horzLine: { color: '#758696', width: 1, style: 2, labelVisible: true },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: false,
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        tickMarkFormatter: (time) => {
          const date = new Date(time * 1000);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${month}/${day} ${hours}:${minutes}`;
        },
      },
      localization: {
        timeFormatter: formatTime,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        axisDoubleClickReset: true,
        mouseWheel: true,
        pinch: true,
      },
      kineticScroll: {
        mouse: true,
        touch: true,
      },
    };

    // Create main chart
    mainChart = createChart(mainContainer, {
      ...commonOptions,
      height: mainContainer.clientHeight,
      width: mainContainer.clientWidth,
      watermark: { visible: false },
    });

    // Create ATR chart - enable all interactions
    atrChart = createChart(atrContainer, {
      ...commonOptions,
      height: atrContainer.clientHeight,
      width: atrContainer.clientWidth,
      watermark: { visible: false },
      timeScale: { ...commonOptions.timeScale, visible: true },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        axisDoubleClickReset: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // Create candlestick series (v5 API)
    const candlestickSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      wickUpColor: '#26a69a',
    });

    // Disable auto-scale for candlestick series to fix drag issues
    candlestickSeries.priceScale().applyOptions({
      autoScale: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    // Create ATR line series (v5 API)
    const atrSeries = atrChart.addSeries(LineSeries, {
      color: '#f48fb1',
      lineWidth: 2,
      priceScaleId: 'right',
      title: 'ATR',
      lastValueVisible: true,
      priceLineVisible: false,
    });

    // Disable auto-scale for ATR series to fix drag issues
    atrSeries.priceScale().applyOptions({
      autoScale: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    // Create combined Equity + Drawdown Chart with dual price scales
    // Disable price scale interactions (no zoom needed for equity/dd)
    equityChart = createChart(equityContainer, {
      ...commonOptions,
      height: equityContainer.clientHeight,
      width: equityContainer.clientWidth,
      watermark: { visible: false },
      timeScale: { ...commonOptions.timeScale, visible: true },
      handleScale: {
        axisPressedMouseMove: false,  // Disable price scale drag zoom
        axisDoubleClickReset: false,
        mouseWheel: true,  // Keep time scale wheel zoom
        pinch: true,
      },
      leftPriceScale: {
        visible: true,
        borderColor: '#2a2e39',
        scaleMargins: { top: 0.15, bottom: 0.15 },  // More padding for lines
      },
      rightPriceScale: {
        visible: true,
        borderColor: '#2a2e39',
        scaleMargins: { top: 0.15, bottom: 0.15 },  // More padding for lines
      },
    });

    // Equity series on LEFT price scale (USD)
    const equitySeries = equityChart.addSeries(LineSeries, {
      color: '#4caf50',  // Green
      lineWidth: 2,
      priceScaleId: 'left',
      title: 'Equity',
      lastValueVisible: true,
      priceLineVisible: false,
    });

    // Keep autoScale true for equity series with more padding
    equitySeries.priceScale().applyOptions({
      autoScale: true,
      scaleMargins: { top: 0.15, bottom: 0.15 },
    });

    // Drawdown series on RIGHT price scale (%)
    const drawdownSeries = equityChart.addSeries(LineSeries, {
      color: '#f44336',  // Red
      lineWidth: 2,
      priceScaleId: 'right',
      title: 'DD%',
      lastValueVisible: true,
      priceLineVisible: false,
    });

    // Keep autoScale true for drawdown series with more padding
    drawdownSeries.priceScale().applyOptions({
      autoScale: true,
      scaleMargins: { top: 0.15, bottom: 0.15 },
    });

    // Position histogram series (background indicator)
    const positionSeries = equityChart.addSeries(HistogramSeries, {
      priceScaleId: 'position',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // Configure position price scale (hidden, just for layout)
    equityChart.priceScale('position').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },  // Small area at bottom
      visible: false,
    });

    mainChartRef.current = mainChart;
    atrChartRef.current = atrChart;
    equityChartRef.current = equityChart;  // Combined chart
    candlestickSeriesRef.current = candlestickSeries;
    atrSeriesRef.current = atrSeries;
    equitySeriesRef.current = equitySeries;
    drawdownSeriesRef.current = drawdownSeries;  // On same chart as equity
    positionSeriesRef.current = positionSeries;  // Position histogram

    // Sync time scales for all 3 charts
    let isSyncingTimeScale = false;
    const allCharts = [mainChart, atrChart, equityChart];

    const syncTimeScale = (sourceChart, range) => {
      if (isSyncingTimeScale || !range || isDraggingLineRef.current) return;
      try {
        isSyncingTimeScale = true;
        allCharts.forEach(chart => {
          if (chart !== sourceChart) {
            chart.timeScale().setVisibleLogicalRange(range);
          }
        });
      } catch (e) {
        console.warn('Sync error:', e);
      } finally {
        isSyncingTimeScale = false;
      }
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => syncTimeScale(mainChart, range));
    atrChart.timeScale().subscribeVisibleLogicalRangeChange((range) => syncTimeScale(atrChart, range));
    equityChart.timeScale().subscribeVisibleLogicalRangeChange((range) => syncTimeScale(equityChart, range));

    // Sync crosshair for all 3 charts
    let isSyncing = false;

    const syncCrosshair = (sourceChart, param, sourceSeries) => {
      if (isSyncing) return;
      isSyncing = true;

      if (param.time !== undefined) {
        // Sync to all other charts
        if (sourceChart !== mainChart) {
          mainChart.setCrosshairPosition(0, param.time, candlestickSeries);
        }
        if (sourceChart !== atrChart) {
          atrChart.setCrosshairPosition(0, param.time, atrSeries);
        }
        if (sourceChart !== equityChart) {
          equityChart.setCrosshairPosition(0, param.time, equitySeries);
        }
      } else {
        // Clear all crosshairs
        if (sourceChart !== mainChart) mainChart.clearCrosshairPosition();
        if (sourceChart !== atrChart) atrChart.clearCrosshairPosition();
        if (sourceChart !== equityChart) equityChart.clearCrosshairPosition();
      }

      isSyncing = false;
    };

    mainChart.subscribeCrosshairMove((param) => syncCrosshair(mainChart, param, candlestickSeries));
    atrChart.subscribeCrosshairMove((param) => syncCrosshair(atrChart, param, atrSeries));
    equityChart.subscribeCrosshairMove((param) => syncCrosshair(equityChart, param, equitySeries));

    // Handle resize for all 3 charts
    handleResize = () => {
      if (mainChartContainerRef.current && mainChartRef.current) {
        mainChartRef.current.applyOptions({
          width: mainChartContainerRef.current.clientWidth,
          height: mainChartContainerRef.current.clientHeight,
        });
      }
      if (atrChartContainerRef.current && atrChartRef.current) {
        atrChartRef.current.applyOptions({
          width: atrChartContainerRef.current.clientWidth,
          height: atrChartContainerRef.current.clientHeight,
        });
      }
      if (equityChartContainerRef.current && equityChartRef.current) {
        equityChartRef.current.applyOptions({
          width: equityChartContainerRef.current.clientWidth,
          height: equityChartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Price scale wheel zoom handler
    const PRICE_SCALE_WIDTH = 60; // Approximate width of price scale area

    const createPriceScaleWheelHandler = (container, chart) => {
      return (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const containerWidth = rect.width;

        // Check if mouse is in the price scale area (rightmost pixels)
        if (x > containerWidth - PRICE_SCALE_WIDTH) {
          e.preventDefault();
          e.stopPropagation();

          const currentOptions = chart.priceScale('right').options();
          const currentTop = currentOptions.scaleMargins?.top ?? 0.1;
          const currentBottom = currentOptions.scaleMargins?.bottom ?? 0.1;

          // Zoom factor based on wheel direction
          const zoomFactor = e.deltaY > 0 ? 0.05 : -0.05;

          // Calculate new margins (smaller margins = more zoom)
          const newTop = Math.max(0.01, Math.min(0.45, currentTop + zoomFactor));
          const newBottom = Math.max(0.01, Math.min(0.45, currentBottom + zoomFactor));

          chart.priceScale('right').applyOptions({
            scaleMargins: { top: newTop, bottom: newBottom },
          });
        }
      };
    };

    mainWheelHandler = createPriceScaleWheelHandler(mainContainer, mainChart);
    atrWheelHandler = createPriceScaleWheelHandler(atrContainer, atrChart);

    mainContainer.addEventListener('wheel', mainWheelHandler, { passive: false });
    atrContainer.addEventListener('wheel', atrWheelHandler, { passive: false });

    } catch (err) {
      console.error('Chart initialization error:', err);
      setChartError(err.message || 'Failed to initialize chart');
    }

    // Cleanup function - always runs on unmount
    return () => {
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      if (mainWheelHandler && mainContainer) {
        mainContainer.removeEventListener('wheel', mainWheelHandler);
      }
      if (atrWheelHandler && atrContainer) {
        atrContainer.removeEventListener('wheel', atrWheelHandler);
      }
      // Clean up markers primitives
      if (markersRef.current) {
        try {
          markersRef.current.detach();
        } catch (e) {
          // Ignore cleanup errors
        }
        markersRef.current = null;
      }
      // Clean up all 3 charts
      if (mainChartRef.current) {
        mainChartRef.current.remove();
        mainChartRef.current = null;
      }
      if (atrChartRef.current) {
        atrChartRef.current.remove();
        atrChartRef.current = null;
      }
      if (equityChartRef.current) {
        equityChartRef.current.remove();
        equityChartRef.current = null;
      }
    };
  }, []);

  // Update both charts data together to ensure alignment
  useEffect(() => {
    if (!candlestickSeriesRef.current || !atrSeriesRef.current) return;
    if (!data || data.length === 0) return;

    // Handle case where ATR data might be empty or not yet available
    const hasValidAtrData = atrData && atrData.length > 0 && atrData.some(d => d.value !== undefined);

    // Set candlestick data
    candlestickSeriesRef.current.setData(data);

    // Handle ATR data if available
    if (hasValidAtrData) {
      // Create ATR lookup map by timestamp
      const atrMap = new Map(atrData.map(d => [d.time, d.value]));

      // Pad ATR data to match candlestick timestamps for proper alignment
      // Use whitespace data format for bars without ATR values
      const alignedAtrData = data.map(candle => {
        const atrValue = atrMap.get(candle.time);
        if (atrValue !== undefined) {
          return { time: candle.time, value: atrValue };
        } else {
          // Whitespace data - just time, no value (creates gap in line)
          return { time: candle.time };
        }
      });

      atrSeriesRef.current.setData(alignedAtrData);

      // Remove old price line if exists
      if (priceLineRef.current) {
        try {
          atrSeriesRef.current.removePriceLine(priceLineRef.current);
        } catch (e) {
          // Ignore if price line doesn't exist
        }
      }

      // Create draggable price line at last valid ATR value
      const lastValidAtr = [...atrData].reverse().find(d => d.value !== undefined);
      if (lastValidAtr) {
        const priceLine = atrSeriesRef.current.createPriceLine({
          price: lastValidAtr.value,
          color: '#ffab00',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: '',
        });

        priceLineRef.current = priceLine;
        setLineValue(lastValidAtr.value);
      }
    } else {
      // Clear ATR series if no valid data
      atrSeriesRef.current.setData([]);
    }

    // Scroll to show most recent data (right-aligned)
    if (mainChartRef.current && atrChartRef.current) {
      // Show last 100 bars
      setTimeout(() => {
        try {
          const barsToShow = 100;
          const from = Math.max(0, data.length - barsToShow);
          const to = data.length + 5;
          const range = { from, to };

          mainChartRef.current?.timeScale().setVisibleLogicalRange(range);
          atrChartRef.current?.timeScale().setVisibleLogicalRange(range);
          equityChartRef.current?.timeScale().setVisibleLogicalRange(range);
        } catch (e) {
          console.warn('Range error:', e);
        }
      }, 0);
    }

  }, [data, atrData]);

  // Handle price line drag using document-level listeners
  useEffect(() => {
    if (!atrChartRef.current || !atrSeriesRef.current) return;

    const container = atrChartContainerRef.current;
    if (!container) return;

    let isDragging = false;
    let startY = 0;

    const handleMouseDown = (e) => {
      if (!priceLineRef.current || !atrSeriesRef.current) return;

      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const currentPrice = priceLineRef.current.options().price;
      const priceCoord = atrSeriesRef.current.priceToCoordinate(currentPrice);

      if (priceCoord !== null && Math.abs(y - priceCoord) < 10) {
        // Prevent chart from also handling this event
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        isDragging = true;
        startY = e.clientY;
        isDraggingLineRef.current = true;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
      }
    };

    const handleMouseMove = (e) => {
      if (!isDragging || !priceLineRef.current || !atrSeriesRef.current) return;

      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;

      const newPrice = atrSeriesRef.current.coordinateToPrice(y);

      if (newPrice !== null && newPrice > 0) {
        priceLineRef.current.applyOptions({ price: newPrice });
        setLineValue(newPrice);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        isDraggingLineRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    // Use capture phase for mousedown to intercept before chart handles it
    container.addEventListener('mousedown', handleMouseDown, { capture: true });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown, { capture: true });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [atrData]);

  // Update markers for signals (v5 API: createSeriesMarkers)
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;

    try {
      // Handle empty or null signals - clear markers
      if (!signals || signals.length === 0) {
        if (markersRef.current) {
          markersRef.current.setMarkers([]);
        }
        return;
      }

      const markers = signals.map((signal) => {
        const isBuy = signal.type === 'buy';
        const isClose = signal.type.startsWith('close');

        return {
          time: signal.time,
          position: isBuy ? 'belowBar' : 'aboveBar',
          color: isClose ? '#ffa726' : (isBuy ? '#26a69a' : '#ef5350'),
          shape: isClose ? 'square' : (isBuy ? 'arrowUp' : 'arrowDown'),
          text: isClose
            ? (signal.reason === 'take_profit' ? 'TP' : 'SL')
            : (isBuy ? 'BUY' : 'SELL'),
        };
      });

      // v5 API: use createSeriesMarkers primitive
      if (markersRef.current) {
        // Update existing markers primitive
        markersRef.current.setMarkers(markers);
      } else {
        // Create new markers primitive
        markersRef.current = createSeriesMarkers(candlestickSeriesRef.current, markers);
      }
    } catch (err) {
      console.warn('Failed to set markers:', err);
    }
  }, [signals]);

  // Update equity curve data
  useEffect(() => {
    if (!equitySeriesRef.current) return;

    try {
      // Handle empty or null equityCurve - clear data
      if (!equityCurve || equityCurve.length === 0) {
        equitySeriesRef.current.setData([]);
        return;
      }

      const equityData = equityCurve.map(point => ({
        time: point.time,
        value: point.equity,
      }));
      equitySeriesRef.current.setData(equityData);
    } catch (err) {
      console.warn('Failed to set equity data:', err);
    }
  }, [equityCurve]);

  // Update drawdown curve data
  useEffect(() => {
    if (!drawdownSeriesRef.current) return;

    try {
      // Handle empty or null drawdownCurve - clear data
      if (!drawdownCurve || drawdownCurve.length === 0) {
        drawdownSeriesRef.current.setData([]);
        return;
      }

      // Set drawdown line data
      drawdownSeriesRef.current.setData(drawdownCurve);
    } catch (err) {
      console.warn('Failed to set drawdown data:', err);
    }
  }, [drawdownCurve]);

  // Update position histogram data (from equityCurve)
  useEffect(() => {
    if (!positionSeriesRef.current) return;

    try {
      // Handle empty or null equityCurve - clear data
      if (!equityCurve || equityCurve.length === 0) {
        positionSeriesRef.current.setData([]);
        return;
      }

      // Create histogram data with colors based on position
      const positionData = equityCurve
        .filter(point => point.position !== 0)  // Only show when in position
        .map(point => ({
          time: point.time,
          value: 1,  // Fixed height
          color: point.position === 1 ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)',  // Green for long, red for short
        }));

      positionSeriesRef.current.setData(positionData);
    } catch (err) {
      console.warn('Failed to set position data:', err);
    }
  }, [equityCurve]);

  // Show error if chart initialization failed
  if (chartError) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-red-500">
        <p>Chart Error: {chartError}</p>
        <p className="text-sm text-text-secondary mt-2">Please refresh the page</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Main Chart (50%) */}
      <div
        ref={mainChartContainerRef}
        className="w-full"
        style={{ height: '50%', minHeight: '200px' }}
      />

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* ATR Sub-Chart (18%) */}
      <div className="relative" style={{ height: '18%', minHeight: '80px' }}>
        <div className="absolute top-1 left-2 z-10 text-xs text-text-secondary bg-chart-bg/80 px-2 py-0.5 rounded">
          ATR (14) | <span className="text-amber-400">Threshold: {lineValue?.toFixed(4) || '-'}</span>
        </div>
        <div
          ref={atrChartContainerRef}
          className="w-full h-full"
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Combined Equity + Drawdown Chart (32%) */}
      <div className="relative" style={{ height: '32%', minHeight: '120px' }}>
        <div className="absolute top-1 z-10 text-xs text-text-secondary bg-chart-bg/80 px-2 py-0.5 rounded" style={{ left: '70px' }}>
          <span className="text-green-400">Equity (USD)</span>
          <span className="mx-2">|</span>
          <span className="text-red-400">Drawdown (%)</span>
          <span className="mx-2">|</span>
          <span className="text-text-secondary">Position: </span>
          <span className="text-green-400/60">Long</span>
          <span className="text-text-secondary">/</span>
          <span className="text-red-400/60">Short</span>
        </div>
        <div
          ref={equityChartContainerRef}
          className="w-full h-full"
        />
      </div>

      <style>{`
        [class*="attribution"],
        [class*="trademark"],
        a[href*="tradingview"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default Chart;

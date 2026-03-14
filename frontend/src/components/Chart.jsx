import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, createSeriesMarkers } from 'lightweight-charts';

const Chart = ({ data, atrData, signals }) => {
  const mainChartContainerRef = useRef(null);
  const atrChartContainerRef = useRef(null);
  const mainChartRef = useRef(null);
  const atrChartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const atrSeriesRef = useRef(null);
  const priceLineRef = useRef(null);
  const markersRef = useRef(null);
  const [lineValue, setLineValue] = useState(null);
  const [chartError, setChartError] = useState(null);
  const isDraggingLineRef = useRef(false);

  // Initialize charts
  useEffect(() => {
    if (!mainChartContainerRef.current || !atrChartContainerRef.current) return;

    let mainChart = null;
    let atrChart = null;
    let mainWheelHandler = null;
    let atrWheelHandler = null;
    let handleResize = null;
    const mainContainer = mainChartContainerRef.current;
    const atrContainer = atrChartContainerRef.current;

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
        axisPressedMouseMove: true,
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
        axisPressedMouseMove: true,
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

    mainChartRef.current = mainChart;
    atrChartRef.current = atrChart;
    candlestickSeriesRef.current = candlestickSeries;
    atrSeriesRef.current = atrSeries;

    // Sync time scales - simple logical range sync with error handling
    let isSyncingTimeScale = false;

    mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (isSyncingTimeScale || !range || isDraggingLineRef.current) return;
      try {
        isSyncingTimeScale = true;
        atrChart.timeScale().setVisibleLogicalRange(range);
      } catch (e) {
        console.warn('Sync error:', e);
      } finally {
        isSyncingTimeScale = false;
      }
    });

    atrChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (isSyncingTimeScale || !range || isDraggingLineRef.current) return;
      try {
        isSyncingTimeScale = true;
        mainChart.timeScale().setVisibleLogicalRange(range);
      } catch (e) {
        console.warn('Sync error:', e);
      } finally {
        isSyncingTimeScale = false;
      }
    });

    // Sync crosshair
    let isSyncing = false;

    mainChart.subscribeCrosshairMove((param) => {
      if (isSyncing) return;
      isSyncing = true;

      if (param.time !== undefined) {
        const dataPoint = param.seriesData.get(candlestickSeries);
        const atrPoint = param.seriesData.get(atrSeries);
        if (dataPoint) {
          // Use ATR value if available, otherwise use close price for positioning
          const priceForPosition = atrPoint?.value ?? dataPoint.close;
          atrChart.setCrosshairPosition(priceForPosition, param.time, atrSeries);
        }
      } else {
        atrChart.clearCrosshairPosition();
      }

      isSyncing = false;
    });

    atrChart.subscribeCrosshairMove((param) => {
      if (isSyncing) return;
      isSyncing = true;

      if (param.time !== undefined) {
        const atrPoint = param.seriesData.get(atrSeries);
        if (atrPoint?.value !== undefined) {
          mainChart.setCrosshairPosition(atrPoint.value, param.time, candlestickSeries);
        } else {
          // If no ATR value at this time, still sync crosshair position using time
          mainChart.setCrosshairPosition(0, param.time, candlestickSeries);
        }
      } else {
        mainChart.clearCrosshairPosition();
      }

      isSyncing = false;
    });

    // Handle resize
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
      // Clean up markers primitive
      if (markersRef.current) {
        try {
          markersRef.current.detach();
        } catch (e) {
          // Ignore cleanup errors
        }
        markersRef.current = null;
      }
      if (mainChartRef.current) {
        mainChartRef.current.remove();
        mainChartRef.current = null;
      }
      if (atrChartRef.current) {
        atrChartRef.current.remove();
        atrChartRef.current = null;
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
    if (!candlestickSeriesRef.current || !signals) return;

    try {
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
      {/* Main Chart (70%) */}
      <div
        ref={mainChartContainerRef}
        className="w-full"
        style={{ height: '70%', minHeight: '300px' }}
      />

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* ATR Sub-Chart (30%) */}
      <div className="relative" style={{ height: '30%', minHeight: '120px' }}>
        <div className="absolute top-2 left-2 z-10 text-xs text-text-secondary bg-chart-bg/80 px-2 py-1 rounded">
          ATR (14) | <span className="text-amber-400">Threshold: {lineValue?.toFixed(4) || '-'}</span>
        </div>
        <div
          ref={atrChartContainerRef}
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

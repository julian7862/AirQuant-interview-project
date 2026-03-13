import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

const Chart = ({ data, atrData, signals }) => {
  const mainChartContainerRef = useRef(null);
  const atrChartContainerRef = useRef(null);
  const mainChartRef = useRef(null);
  const atrChartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const atrSeriesRef = useRef(null);
  const priceLineRef = useRef(null);
  const [lineValue, setLineValue] = useState(null);
  const isDraggingLineRef = useRef(false);
  const mainValueByTimeRef = useRef(new Map());
  const atrValueByTimeRef = useRef(new Map());

  const RIGHT_SCALE_INTERACTION_WIDTH = 80;

  // Initialize charts
  useEffect(() => {
    if (!mainChartContainerRef.current || !atrChartContainerRef.current) return;

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
        minimumWidth: RIGHT_SCALE_INTERACTION_WIDTH,
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
    const mainChart = createChart(mainChartContainerRef.current, {
      ...commonOptions,
      height: mainChartContainerRef.current.clientHeight,
      width: mainChartContainerRef.current.clientWidth,
      watermark: { visible: false },
    });

    // Create ATR chart - enable all interactions
    const atrChart = createChart(atrChartContainerRef.current, {
      ...commonOptions,
      height: atrChartContainerRef.current.clientHeight,
      width: atrChartContainerRef.current.clientWidth,
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

    // Create candlestick series
    const candlestickSeries = mainChart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      wickUpColor: '#26a69a',
    });

    // Create ATR line series
    const atrSeries = atrChart.addLineSeries({
      color: '#f48fb1',
      lineWidth: 2,
      priceScaleId: 'right',
      title: 'ATR',
      lastValueVisible: true,
      priceLineVisible: false,
    });

    mainChartRef.current = mainChart;
    atrChartRef.current = atrChart;
    candlestickSeriesRef.current = candlestickSeries;
    atrSeriesRef.current = atrSeries;

    // Sync time scales by visible time range (instead of logical index)
    // to keep panes aligned even when ATR has fewer early data points.
    let isSyncingTimeScale = false;

    mainChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (isSyncingTimeScale || !range || isDraggingLineRef.current) return;
      try {
        isSyncingTimeScale = true;
        atrChart.timeScale().setVisibleRange(range);
      } catch (e) {
        console.warn('Sync error:', e);
      } finally {
        isSyncingTimeScale = false;
      }
    });

    atrChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (isSyncingTimeScale || !range || isDraggingLineRef.current) return;
      try {
        isSyncingTimeScale = true;
        mainChart.timeScale().setVisibleRange(range);
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
        const atrValue = atrValueByTimeRef.current.get(param.time);
        if (atrValue !== undefined) {
          atrChart.setCrosshairPosition(atrValue, param.time, atrSeries);
        } else {
          atrChart.clearCrosshairPosition();
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
        const closeValue = mainValueByTimeRef.current.get(param.time);
        if (closeValue !== undefined) {
          mainChart.setCrosshairPosition(closeValue, param.time, candlestickSeries);
        } else {
          mainChart.clearCrosshairPosition();
        }
      } else {
        mainChart.clearCrosshairPosition();
      }

      isSyncing = false;
    });

    // Handle resize
    const handleResize = () => {
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

    // TradingView-like wheel interaction on right value scale:
    // wheel behaves like dragging the scale up/down while cursor is inside this area.
    const simulateAxisDragWithWheel = (event, container) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const isOnRightScale = event.clientX >= rect.right - RIGHT_SCALE_INTERACTION_WIDTH;
      if (!isOnRightScale) return;

      event.preventDefault();

      const target = container.querySelector('canvas') || container;
      const dragDelta = Math.sign(event.deltaY) * 18;

      target.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: event.clientX,
        clientY: event.clientY,
        buttons: 1,
      }));

      document.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: event.clientX,
        clientY: event.clientY + dragDelta,
        buttons: 1,
      }));

      document.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: event.clientX,
        clientY: event.clientY + dragDelta,
      }));
    };

    const mainWheelHandler = (event) => simulateAxisDragWithWheel(event, mainChartContainerRef.current);
    const atrWheelHandler = (event) => simulateAxisDragWithWheel(event, atrChartContainerRef.current);

    mainChartContainerRef.current.addEventListener('wheel', mainWheelHandler, { passive: false });
    atrChartContainerRef.current.addEventListener('wheel', atrWheelHandler, { passive: false });

    return () => {
      window.removeEventListener('resize', handleResize);
      mainChartContainerRef.current?.removeEventListener('wheel', mainWheelHandler);
      atrChartContainerRef.current?.removeEventListener('wheel', atrWheelHandler);
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
    if (!data || data.length === 0 || !atrData || atrData.length === 0) return;

    // Keep lookup maps for precise crosshair sync by timestamp.
    mainValueByTimeRef.current = new Map(data.map((item) => [item.time, item.close]));
    atrValueByTimeRef.current = new Map(atrData.map((item) => [item.time, item.value]));

    // Set candlestick data
    candlestickSeriesRef.current.setData(data);

    // Set ATR data directly - alignment handled by time-based sync
    atrSeriesRef.current.setData(atrData);

    // Scroll to show most recent data
    if (mainChartRef.current && atrChartRef.current) {
      // Use fitContent first to ensure proper initialization
      mainChartRef.current.timeScale().fitContent();

      // Then scroll to right side showing last 100 bars based on timestamps
      setTimeout(() => {
        try {
          const barsToShow = 100;
          const from = Math.max(0, data.length - barsToShow);
          const range = {
            from: data[from]?.time,
            to: data[data.length - 1]?.time,
          };

          if (range.from && range.to) {
            mainChartRef.current?.timeScale().setVisibleRange(range);
            atrChartRef.current?.timeScale().setVisibleRange(range);
          }
        } catch (e) {
          console.warn('Range error:', e);
        }
      }, 0);
    }

    // Remove old price line if exists
    if (priceLineRef.current) {
      atrSeriesRef.current.removePriceLine(priceLineRef.current);
    }

    // Create draggable price line at last ATR value
    const lastValue = atrData[atrData.length - 1].value;
    const priceLine = atrSeriesRef.current.createPriceLine({
      price: lastValue,
      color: '#ffab00',
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '',
    });

    priceLineRef.current = priceLine;
    setLineValue(lastValue);

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
      // Check if click is inside ATR container
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top || e.clientY > rect.bottom) {
        return;
      }

      const y = e.clientY - rect.top;
      const currentPrice = priceLineRef.current.options().price;
      const priceCoord = atrSeriesRef.current.priceToCoordinate(currentPrice);

      if (priceCoord !== null && Math.abs(y - priceCoord) < 15) {
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

    // Use document-level listeners to avoid interfering with chart events
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [atrData]);

  // Update markers for signals
  useEffect(() => {
    if (!candlestickSeriesRef.current || !signals) return;

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

    candlestickSeriesRef.current.setMarkers(markers);
  }, [signals]);

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

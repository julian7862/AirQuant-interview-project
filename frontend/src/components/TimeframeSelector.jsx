import React from 'react';

const TIMEFRAMES = [
  { value: '1m', label: '1K' },
  { value: '5m', label: '5K' },
  { value: '15m', label: '15K' },
  { value: '30m', label: '30K' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '3d', label: '3D' },
];

const TimeframeSelector = ({ selected, onChange }) => {
  return (
    <div className="flex gap-1">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
            selected === tf.value
              ? 'bg-blue text-white'
              : 'bg-panel-bg text-text-secondary hover:bg-border hover:text-text-primary'
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;

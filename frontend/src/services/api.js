import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60 seconds for large data
});

export const getTimeframes = async () => {
  const response = await api.get('/api/timeframes');
  return response.data.timeframes;
};

export const getYears = async () => {
  const response = await api.get('/api/years');
  return response.data.years;
};

export const getOHLCV = async (year, timeframe) => {
  const response = await api.get(`/api/ohlcv/${year}`, {
    params: { timeframe }
  });
  return response.data;
};

export const runBacktest = async (params) => {
  const response = await api.post('/api/backtest', params);
  return response.data;
};

export default api;

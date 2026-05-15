import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const initData = window.Telegram?.WebApp?.initData || '';
  if (initData) {
    config.headers = config.headers ?? {};
    config.headers['X-Telegram-Init-Data'] = initData;
  }
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Қате орын алды';
    return Promise.reject({ ...error, message });
  },
);

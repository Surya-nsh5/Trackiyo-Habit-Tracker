import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { secureAuthStorage } from './secureAuthStorage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

// Request interceptor to add Bearer token from secure storage
api.interceptors.request.use(
  (config) => {
    const token = secureAuthStorage.getAccessToken() || localStorage.getItem('access_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle token refresh and 401s gracefully
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Do not attempt refresh on auth endpoints (login, signup, refresh) or if already retried
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
                           originalRequest?.url?.includes('/auth/signup') ||
                           originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject: (err: any) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = secureAuthStorage.getRefreshToken() || localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        await secureAuthStorage.clearSession();
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { session } = response.data;
        if (session?.access_token) {
          await secureAuthStorage.saveSession(
            session.access_token,
            session.refresh_token || refreshToken,
            session.expires_in || 3600
          );

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          }

          processQueue(null, session.access_token);
          return api(originalRequest);
        } else {
          throw new Error('No session returned from refresh');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await secureAuthStorage.clearSession();
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Detect network / offline failures and notify the application
    if (!error.response && (error.code === 'ERR_NETWORK' || (typeof navigator !== 'undefined' && !navigator.onLine))) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('trackiyo:network-offline'));
      }
      error.message = "You're offline. Reconnect to continue using the latest Trackiyo data.";
    }

    return Promise.reject(error);
  }
);

export default api;

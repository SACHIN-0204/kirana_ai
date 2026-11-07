import axios from 'axios';

// const API = axios.create({ baseURL: 'http://localhost:5000/api' });
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,  // 30s timeout (Render free tier cold starts)
});

// ── Auth token handling ──
let onUnauthorized = null;
export const setAuthToken = (token) => {
  if (token) API.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete API.defaults.headers.common.Authorization;
};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// Request interceptor — log in dev
API.interceptors.request.use(config => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`→ ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

// Response interceptor — global error handling
API.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.error || err.message || 'Network error';
    console.error('API Error:', msg);
    // Expired/invalid session → force logout (but not for failed login attempts)
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      onUnauthorized?.();
    }
    return Promise.reject(err);
  }
);

// Auth
export const loginRequest   = (email, password) => API.post('/auth/login', { email, password });
export const getMe          = ()          => API.get('/auth/me');
export const changePassword = (currentPassword, newPassword) =>
  API.post('/auth/change-password', { currentPassword, newPassword });

// Users (admin)
export const getUsers   = ()         => API.get('/users');
export const createUser = (data)     => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const deleteUser = (id)       => API.delete(`/users/${id}`);

// Sales management (admin)
export const updateSale = (id, data) => API.put(`/sales/${id}`, data);
export const deleteSale = (id)       => API.delete(`/sales/${id}`);

export const getProducts      = ()          => API.get('/products');
export const createProduct      = (data)     => API.post('/products', data);
export const updateStock      = (id, qty)   => API.put(`/products/${id}/stock`, { currentStock: qty });

export const getSales         = (id, days)  => API.get(`/sales/${id}?days=${days}`);
export const recordSale       = (data)      => API.post('/sales', data);
export const recordBulkSales    = (sales)    => API.post('/sales/bulk', { sales });
export const getDailySummary    = (days)     => API.get(`/sales/summary/daily?days=${days}`);
export const getCategorySummary = (days)     => API.get(`/sales/summary/category?days=${days}`);

export const getPrediction    = (id, days)  => API.get(`/predictions/${id}?days=${days}`);
export const getBatchPredict  = (days = 7)  => API.get(`/predictions/batch/all?days=${days}`);
export const warmUpServices = async () => {
  try {
    await Promise.all([
      axios.get(`${BASE_URL.replace('/api','')}/`),
      axios.get(
        `${process.env.REACT_APP_ML_URL ||
          'https://kirana-ml-service.onrender.com'}/health`
      ),
    ]);
    console.log('Services warmed up ✅');

  } catch {
    console.log('Warm-up ping sent');
  }
};

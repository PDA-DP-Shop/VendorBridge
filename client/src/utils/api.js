import axios from 'axios';

// Create an Axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token to headers if it exists
api.interceptors.request.use(
  (config) => {
    // Skip auth header for public routes
    const publicRoutes = ['/auth/register', '/auth/login'];
    const isPublic = publicRoutes.some((route) => config.url?.includes(route));
    if (!isPublic) {
      const token = localStorage.getItem('vendorbridge_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global response errors (e.g. 401 Unauthorized)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log full error detail in development
    console.error('[API Error]', error.config?.url, error.response?.status, error.response?.data);

    // If the server returns a 401 Unauthorized on a protected route, clear token
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      // Don't wipe token on login/register failures
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('vendorbridge_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

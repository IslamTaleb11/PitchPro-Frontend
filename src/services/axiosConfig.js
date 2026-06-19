import axios from 'axios';

// 1. Get the domain straight from Vercel. 
// Example value in Vercel: https://pitchprobackend-production.up.railway.app
const baseDomain = import.meta.env.VITE_API_URL || 'https://localhost:7057';
const authTokenKey = 'pitchpro-auth-token';
const sessionTokenKey = 'pitchpro-session-auth-token';

// 2. Clean up any trailing slashes from the domain to prevent double slashes (//api)
const cleanDomain = baseDomain.replace(/\/+$/, '');

function getAuthToken() {
  return localStorage.getItem(authTokenKey) || sessionStorage.getItem(sessionTokenKey);
}

function setAuthHeader(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
}

function setAuthToken(token, persist = false) {
  localStorage.removeItem(authTokenKey);
  sessionStorage.removeItem(sessionTokenKey);

  if (persist) {
    localStorage.setItem(authTokenKey, token);
    setAuthHeader(token);
    return;
  }

  sessionStorage.setItem(sessionTokenKey, token);
  setAuthHeader(token);
}

function clearAuthToken() {
  localStorage.removeItem(authTokenKey);
  sessionStorage.removeItem(sessionTokenKey);
  setAuthHeader(null);
}

function redirectToLogin() {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

function getResponseHeader(headers, headerName) {
  if (!headers) {
    return undefined;
  }

  if (typeof headers.get === 'function') {
    return headers.get(headerName);
  }

  const normalizedHeaderName = headerName.toLowerCase();

  return headers[normalizedHeaderName] || headers[headerName];
}

const api = axios.create({
  // This smoothly combines the domain and the global /api prefix
  baseURL: `${cleanDomain}/api`,
  
  timeout: 20000, 
  headers: {
    'Accept': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const tokenExpired = Boolean(getResponseHeader(error?.response?.headers, 'Token-Expired'));

    if (status === 401) {
      if (tokenExpired) {
        console.info('Authentication token expired. Redirecting to login.');
      }

      clearAuthToken();
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export { clearAuthToken, getAuthToken, setAuthToken };

export default api;
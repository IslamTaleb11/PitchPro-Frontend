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

function setAuthToken(token, persist = false) {
  localStorage.removeItem(authTokenKey);
  sessionStorage.removeItem(sessionTokenKey);

  if (persist) {
    localStorage.setItem(authTokenKey, token);
    return;
  }

  sessionStorage.setItem(sessionTokenKey, token);
}

function clearAuthToken() {
  localStorage.removeItem(authTokenKey);
  sessionStorage.removeItem(sessionTokenKey);
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

export { clearAuthToken, getAuthToken, setAuthToken };

export default api;
import axios from 'axios';

// 1. Get the base domain from Vercel (e.g., 'https://pitchprobackend-production.up.railway.app')
// DO NOT include '/api' inside the Vercel environment variable value itself. Keep it clean.
const baseDomain = import.meta.env.VITE_API_URL || 'https://localhost:7057';

const api = axios.create({
  // This explicitly forces '/api' to be the root prefix for every request
  baseURL: `${baseDomain}/api`,
  
  timeout: 20000, 
  headers: {
    'Accept': 'application/json'
  }
});

// 2. Interceptor (Fail-safe)
// This intercepts any request right before it leaves and double-checks the path
api.interceptors.request.use((config) => {
  // If for some reason the URL doesn't start with /api, force it to.
  if (config.url && !config.url.startsWith('/api') && !config.url.startsWith('http')) {
    config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
import axios from 'axios';

// 1. Get the domain straight from Vercel. 
// Example value in Vercel: https://pitchprobackend-production.up.railway.app
const baseDomain = import.meta.env.VITE_API_URL || 'https://localhost:7057';

// 2. Clean up any trailing slashes from the domain to prevent double slashes (//api)
const cleanDomain = baseDomain.replace(/\/+$/, '');

const api = axios.create({
  // This smoothly combines the domain and the global /api prefix
  baseURL: `${cleanDomain}/api`,
  
  timeout: 20000, 
  headers: {
    'Accept': 'application/json'
  }
});

export default api;
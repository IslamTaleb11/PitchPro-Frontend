import axios from 'axios';

// Pull the clean domain straight from Vercel
const baseDomain = import.meta.env.VITE_API_URL || 'https://localhost:7057';

const api = axios.create({
  // Just use the base domain. Your endpoints already include the "/api" part!
  baseURL: baseDomain,
  
  timeout: 20000, 
  headers: {
    'Accept': 'application/json'
  }
});

export default api;
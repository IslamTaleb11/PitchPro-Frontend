import axios from 'axios';

// 1. Define the Base Instance
const api = axios.create({
  // Use environment variables for different stages (Dev vs Prod)
  baseURL: import.meta.env.VITE_API_URL || 'https://localhost:7057/api',
  
  // Allow a bit more time for backend processing in development
  timeout: 20000, 
  
  headers: {
    'Accept': 'application/json'
  }
});
export default api;
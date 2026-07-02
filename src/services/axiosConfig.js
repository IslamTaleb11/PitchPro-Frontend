import axios from 'axios';

// 1. Get the domain straight from Vercel. 
// Example value in Vercel: https://pitchprobackend-production.up.railway.app
const baseDomain = import.meta.env.VITE_API_URL || 'https://localhost:7057';
const authTokenKey = 'pitchpro-auth-token';
const sessionTokenKey = 'pitchpro-session-auth-token';
let loginRedirectTimer = null;
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

function getAuthTokenStorageType() {
  if (localStorage.getItem(authTokenKey)) {
    return 'local';
  }

  if (sessionStorage.getItem(sessionTokenKey)) {
    return 'session';
  }

  return null;
}

function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.')
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function getCurrentPlanFromJwt() {
  const token = getAuthToken();
  const claims = parseJwt(token);
  if (!claims) return null;

  const rawPlan =
    claims.plan ||
    claims.subscription ||
    claims.tier ||
    claims.membership ||
    claims['https://pitchpro.io/plan'] ||
    claims['planType'] ||
    claims['accountType'];

  if (typeof rawPlan === 'string' && rawPlan.trim().length > 0) {
    return rawPlan.trim();
  }

  if (rawPlan && typeof rawPlan === 'object') {
    return rawPlan.name || rawPlan.type || rawPlan.label || null;
  }

  if (claims.premium === true || claims.isPremium === true) {
    return 'premium';
  }

  if (claims.paid === true || claims.isPaid === true) {
    return 'paid';
  }

  return null;
}

function getCurrentClubIdFromJwt() {
  const token = getAuthToken();
  const claims = parseJwt(token);
  if (!claims) return null;

  const clubId =
    claims.clubId ||
    claims.clubID ||
    claims.ClubID ||
    claims.club ||
    claims.club_name ||
    claims.organizationId ||
    claims.organizationID ||
    claims.tenantId ||
    claims.tenantID;

  return clubId ?? null;
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

      clearTimeout(loginRedirectTimer);
      loginRedirectTimer = setTimeout(() => {
        clearAuthToken();
        redirectToLogin();
      }, 2200);
    }

    return Promise.reject(error);
  }
);

export { clearAuthToken, getAuthToken, setAuthToken, getAuthTokenStorageType, getCurrentPlanFromJwt, getCurrentClubIdFromJwt };

export default api;
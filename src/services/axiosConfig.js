import axios from 'axios';

// 1. Get the domain straight from Vercel. 
// Example value in Vercel: https://pitchprobackend-production.up.railway.app
const baseDomain = import.meta.env.VITE_API_URL || 'https://localhost:7057';
const authTokenKey = 'pitchpro-auth-token';
const refreshTokenKey = 'pitchpro-refresh-token';
const sessionTokenKey = 'pitchpro-session-auth-token';
const sessionRefreshTokenKey = 'pitchpro-session-refresh-token';
// Proactively refresh 30 seconds before the 15-minute access token expires.
const refreshIntervalMs = Number(import.meta.env.VITE_REFRESH_INTERVAL_MS) || 14.5 * 60 * 1000;
let loginRedirectTimer = null;
let refreshTimer = null;
let syncTimer = null;
let refreshRequestPromise = null;
// 2. Clean up any trailing slashes from the domain to prevent double slashes (//api)
const cleanDomain = typeof baseDomain === 'string' ? baseDomain.replace(/\/+$/, '') : '';

// --- Clock-skew compensation -------------------------------------------------
// JWT `exp` is stamped by the SERVER's clock. Comparing it against the client's
// `Date.now()` only works when the user's machine clock is correct — which we
// cannot assume. We measure the offset between the server's time (read from the
// HTTP `Date` response header) and the local clock, then add it back so every
// expiry check runs in server-relative time. This keeps auth working correctly
// even when the client clock is hours off, wrong timezone, or unset.
let serverTimeOffsetMs = null;
const SERVER_TIME_OFFSET_KEY = 'pitchpro-server-time-offset';

function loadServerTimeOffset() {
  try {
    const raw = localStorage.getItem(SERVER_TIME_OFFSET_KEY);
    if (raw != null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        serverTimeOffsetMs = parsed;
      }
    }
  } catch {
    // Storage may be unavailable (private mode) — fall back to local clock.
  }
}

function saveServerTimeOffset() {
  try {
    if (serverTimeOffsetMs != null) {
      localStorage.setItem(SERVER_TIME_OFFSET_KEY, String(serverTimeOffsetMs));
    }
  } catch {
    // Ignore write failures.
  }
}

// Server-relative "now" in ms. Falls back to the local clock only when we have
// not yet measured the server time.
function getServerNowMs() {
  return serverTimeOffsetMs != null ? Date.now() + serverTimeOffsetMs : Date.now();
}

// Recompute the offset from a response's `Date` header (RFC 1123 GMT). Called
// from the response interceptor on every API call so the offset self-corrects
// if the user later fixes their clock or crosses a DST boundary. This is a
// best-effort secondary source — see syncServerTime() for the authoritative one.
function captureServerTime(dateHeader) {
  if (!dateHeader) return;
  const serverMs = Date.parse(dateHeader);
  if (!Number.isFinite(serverMs)) return;
  serverTimeOffsetMs = serverMs - Date.now();
  saveServerTimeOffset();
}

// Authoritative clock sync. Asks the server for its current Unix time (ms) via
// a dedicated endpoint whose value lives in the JSON body (so it is never
// stripped by CORS/proxies the way the `Date` response header can be). The
// client computes offset = serverTime - Date.now() and stores it, giving
// server-relative time for all expiry checks regardless of the client clock.
async function syncServerTime() {
  try {
    const res = await api.get('/auth/server-time');
    const serverMs = res?.data?.serverTime;
    if (typeof serverMs === 'number' && Number.isFinite(serverMs)) {
      serverTimeOffsetMs = serverMs - Date.now();
      saveServerTimeOffset();
    }
  } catch {
    // Network/endpoint failure: keep any previously known offset (or fall back
    // to the local clock). The proactive refresh timer is the safety net.
  }
}

function getAuthToken() {
  return localStorage.getItem(authTokenKey) || sessionStorage.getItem(sessionTokenKey);
}

function getRefreshToken() {
  return localStorage.getItem(refreshTokenKey) || sessionStorage.getItem(sessionRefreshTokenKey);
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
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('auth:tokenChanged', { detail: { token } }));
      } catch (e) {
        // ignore unsupported browsers
      }
    }
  } else {
    sessionStorage.setItem(sessionTokenKey, token);
    setAuthHeader(token);
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('auth:tokenChanged', { detail: { token } }));
      } catch (e) {
        // ignore unsupported browsers
      }
    }
  }

  if (token) {
    scheduleTokenRefresh();
  } else {
    clearRefreshTimer();
  }
}

function setRefreshToken(token) {
  localStorage.removeItem(refreshTokenKey);
  sessionStorage.removeItem(sessionRefreshTokenKey);

  if (!token) {
    clearRefreshTimer();
    return;
  }

  // Refresh tokens are ALWAYS persisted to localStorage so the session can be
  // silently re-established after the browser/tab is closed (via the startup
  // refresh in main.js). This is independent of the "stay logged in" choice,
  // which only governs where the short-lived access token is stored.
  localStorage.setItem(refreshTokenKey, token);

  // Arm (or re-arm) the proactive refresh timer as soon as we hold a refresh token.
  scheduleTokenRefresh();
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

// Returns true if the given access token is missing, unparsable, or has an
// `exp` (Unix seconds) at/before now (plus an optional skew buffer). Used to
// decide whether a refresh is actually necessary on app startup. All time
// comparisons use getServerNowMs() (server-relative) so a wrong client clock
// cannot make a perfectly valid token look expired.
function isAccessTokenExpired(token, skewSeconds = 30) {
  const claims = parseJwt(token);
  if (!claims || typeof claims.exp !== 'number') {
    return true;
  }

  // If we have never measured the server clock, don't trust the local clock —
  // conservatively treat the token as expired so startup refreshes and
  // calibrates the offset. Once measured (persisted across loads), this is
  // skipped.
  if (serverTimeOffsetMs == null) {
    return true;
  }

  const expiresAtMs = claims.exp * 1000;
  return expiresAtMs <= getServerNowMs() + skewSeconds * 1000;
}

function normalizePlanValue(plan) {
  if (plan == null) return null;
  const normalized = String(plan).trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes('premium') || normalized.includes('pro')) {
    return 'premium';
  }
  if (normalized.includes('paid')) {
    return 'paid';
  }
  if (normalized.includes('free')) {
    return 'free';
  }
  if (normalized.includes('basic') || normalized.includes('starter')) {
    return 'free';
  }

  return normalized;
}

function getCurrentPlanFromJwt(token) {
  const rawToken = token || getAuthToken();
  const claims = parseJwt(rawToken);
  if (!claims) return null;

  console.log('Claims:', claims); // Debugging line to check the claims
  const rawPlan =
    claims.plan ||
    claims.subscription ||
    claims.tier ||
    claims.membership
;

  if (typeof rawPlan === 'string' && rawPlan.trim().length > 0) {
    return normalizePlanValue(rawPlan);
  }

  if (rawPlan && typeof rawPlan === 'object') {
    const planValue =
      rawPlan.name ||
      rawPlan.type ||
      rawPlan.label ||
      rawPlan.plan ||
      rawPlan.value ||
      rawPlan.accountType ||
      rawPlan.subscriptionType ||
      rawPlan.tier ||
      rawPlan.product ||
      rawPlan.description;

    const normalizedValue = normalizePlanValue(planValue);
    if (normalizedValue) {
      return normalizedValue;
    }
    if (planValue != null) {
      return String(planValue).trim();
    }
  }

  if (claims.premium === true || claims.isPremium === true) {
    return 'premium';
  }

  if (claims.paid === true || claims.isPaid === true) {
    return 'paid';
  }

  return null;
}

function getPlanFromToken(token) {
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
    return normalizePlanValue(rawPlan);
  }

  if (rawPlan && typeof rawPlan === 'object') {
    const planValue =
      rawPlan.name ||
      rawPlan.type ||
      rawPlan.label ||
      rawPlan.plan ||
      rawPlan.value ||
      rawPlan.accountType ||
      rawPlan.subscriptionType ||
      rawPlan.tier ||
      rawPlan.product ||
      rawPlan.description;

    const normalizedPlanValue = normalizePlanValue(planValue);
    if (normalizedPlanValue) {
      return normalizedPlanValue;
    }

    if (planValue != null) {
      return String(planValue).trim();
    }
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

function clearRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

function clearAuthToken() {
  localStorage.removeItem(authTokenKey);
  localStorage.removeItem(refreshTokenKey);
  sessionStorage.removeItem(sessionTokenKey);
  sessionStorage.removeItem(sessionRefreshTokenKey);
  clearRefreshTimer();
  setAuthHeader(null);
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('auth:tokenChanged', { detail: { token: null } }));
    } catch (e) {
      // ignore unsupported browsers
    }
  }
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

async function refreshAuthToken() {
  const refreshToken = getRefreshToken();

  // Nothing to refresh with — drop the session.
  if (!refreshToken) {
    clearAuthToken();
    return null;
  }

  // De-duplicate concurrent refreshes so a slow request can't stack up.
  if (refreshRequestPromise) {
    return refreshRequestPromise;
  }

  refreshRequestPromise = (async () => {
    try {
      const response = await api.post('/auth/refresh', { refreshToken });

      const nextAccessToken =
        response?.data?.accessToken || response?.data?.token || response?.data?.access_token;
      const nextRefreshToken =
        response?.data?.refreshToken || response?.data?.refresh_token || refreshToken;

      if (!nextAccessToken) {
        throw new Error('Refresh succeeded but no access token was returned.');
      }

      // Keep the same storage type (local vs session) as the current session.
      const persist = Boolean(localStorage.getItem(authTokenKey));
      setAuthToken(nextAccessToken, persist);
      setRefreshToken(nextRefreshToken);

      return response;
    } catch (error) {
      clearAuthToken();
      redirectToLogin();
      throw error;
    } finally {
      refreshRequestPromise = null;
    }
  })();

  return refreshRequestPromise;
}

function scheduleTokenRefresh() {
  if (typeof window === 'undefined') {
    return;
  }

  // A refresh token is all we need to proactively refresh the session.
  if (!getRefreshToken()) {
    return;
  }

  clearRefreshTimer();

  refreshTimer = window.setInterval(() => {
    refreshAuthToken().catch(() => {
      // refreshAuthToken already clears auth and redirects on failure
    });
  }, refreshIntervalMs);

  // Keep the clock-skew offset fresh over long sessions (in case the user's
  // clock changes mid-session). Cheap, unauthenticated GET — no DB work.
  syncTimer = window.setInterval(() => {
    syncServerTime().catch(() => {});
  }, 5 * 60 * 1000);
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
  (response) => {
    // Calibrate the server clock from the response's Date header so future
    // expiry checks are clock-skew safe.
    captureServerTime(getResponseHeader(response.headers, 'Date'));
    return response;
  },
  async (error) => {
    // Error responses still carry a Date header — keep the offset fresh.
    const errHeaders = error?.response?.headers;
    if (errHeaders) {
      captureServerTime(getResponseHeader(errHeaders, 'Date'));
    }

    const status = error?.response?.status;
    const tokenExpired = Boolean(getResponseHeader(error?.response?.headers, 'Token-Expired'));
    const isRetry = Boolean(error?.config?._retry);

    if (status === 401 && !isRetry && getRefreshToken()) {
      error.config._retry = true;

      try {
        await refreshAuthToken();
        const refreshedToken = getAuthToken();

        if (refreshedToken) {
          error.config.headers = error.config.headers || {};
          error.config.headers.Authorization = `Bearer ${refreshedToken}`;
          return api.request(error.config);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

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

if (typeof window !== 'undefined' && getAuthToken() && getRefreshToken()) {
  scheduleTokenRefresh();
}

// Restore the last measured server-time offset so the very first load of a
// session already does correct, clock-skew-safe expiry checks.
loadServerTimeOffset();

export { clearAuthToken, getAuthToken, getRefreshToken, setAuthToken, setRefreshToken, getAuthTokenStorageType, getCurrentPlanFromJwt, getPlanFromToken, getCurrentClubIdFromJwt, refreshAuthToken, isAccessTokenExpired, parseJwt, getServerNowMs, syncServerTime };

export default api;
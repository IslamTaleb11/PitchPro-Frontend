import { createApp, watch } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ar from './locales/ar.json'
import { getAuthToken, getRefreshToken, refreshAuthToken, isAccessTokenExpired, syncServerTime } from './services/axiosConfig'

const savedLocaleValue = localStorage.getItem('pitchpro-locale')
const savedLocale = savedLocaleValue === 'en' || savedLocaleValue === 'ar' ? savedLocaleValue : 'en'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, ar }
})

// Apply dir and lang on the document root
function applyLocale(lang) {
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  localStorage.setItem('pitchpro-locale', lang)
}

// Apply immediately on load
applyLocale(savedLocale)

// Watch for runtime locale changes and persist them
watch(i18n.global.locale, (newLocale) => {
  applyLocale(newLocale)
})

const app = createApp(App)
app.use(router)
app.use(i18n)

// Proactively swap any stale access token for a fresh one BEFORE the app
// mounts and before any dashboard API call is made. This keeps returning
// users (who still hold a valid refresh token) logged in instead of being
// bounced to /login or hitting 401s on first render.
async function bootstrapSession() {
  if (!getRefreshToken()) {
    return
  }

  // Calibrate the client<->server clock skew from an authoritative server
  // endpoint BEFORE deciding whether to refresh. This stops a wrong client
  // clock from forcing a refresh on every page load.
  await syncServerTime()

  // If we already hold a valid (not-yet-expired) access token, skip the
  // refresh entirely — no need to hit the endpoint or rotate the token on
  // every reload. Only refresh when there's no token or it has expired.
  const token = getAuthToken()
  if (token && !isAccessTokenExpired(token)) {
    return
  }

  try {
    await refreshAuthToken()
  } catch {
    // refreshAuthToken() only clears the session and redirects to /login when
    // the refresh token is definitively invalid/expired (401). Transient
    // failures keep the stored tokens so the router can retry on next
    // navigation instead of logging the user out.
  }
}

// Always mount the app. With no session the router shows the login page;
// with a valid session the refreshed token is already in place. If the
// refresh failed fatally, refreshAuthToken() already cleared the session and
// redirected to /login (which reloads the app), so mounting is harmless.
bootstrapSession().finally(() => {
  app.mount('#app')
})

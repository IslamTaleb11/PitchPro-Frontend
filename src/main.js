import { createApp, watch } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ar from './locales/ar.json'
import { getAuthToken, getRefreshToken, refreshAuthToken, isAccessTokenExpired } from './services/axiosConfig'

const savedLocaleValue = localStorage.getItem('pitchpro-locale')
const savedLocale = savedLocaleValue === 'en' || savedLocaleValue === 'ar' ? savedLocaleValue : 'ar'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'ar',
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

  // If we already hold a valid (not-yet-expired) access token, skip the
  // refresh entirely — no need to hit the endpoint or rotate the token on
  // every reload. Only refresh when there's no token or it has expired.
  const token = getAuthToken()
  if (token && !isAccessTokenExpired(token)) {
    console.info('[auth] startup: access token still valid — skipping refresh.')
    return
  }

  console.info('[auth] startup: no valid access token — refreshing.')
  try {
    await refreshAuthToken()
  } catch {
    // refreshAuthToken() already clears the session and redirects to /login
    // when the refresh token is invalid/expired, so there is nothing to do here.
  }
}

// Always mount the app. With no session the router shows the login page;
// with a valid session the refreshed token is already in place. If the
// refresh failed, refreshAuthToken() already cleared the session and
// redirected to /login (which reloads the app), so mounting is harmless.
bootstrapSession().finally(() => {
  app.mount('#app')
})

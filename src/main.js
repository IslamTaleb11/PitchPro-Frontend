import { createApp, watch } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ar from './locales/ar.json'

// Restore saved locale or default to 'en'
const savedLocale = localStorage.getItem('pitchpro-locale') || 'en'

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
app.mount('#app')

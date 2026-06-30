import { createApp, watch } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ar from './locales/ar.json'

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
app.mount('#app')

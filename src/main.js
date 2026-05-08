import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ar from './locales/ar.json'

const i18n = createI18n({
  legacy: false,
  locale: 'en', // default language
  messages: {
    en,
    ar
  }
})

const app = createApp(App)

app.use(router)
app.use(i18n)

app.mount('#app')
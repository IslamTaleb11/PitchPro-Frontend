import { reactive } from 'vue'
import enMessages from '../locales/en.json'
import arMessages from '../locales/ar.json'

const toastState = reactive({
  visible: false,
  title: '',
  message: '',
  mode: 'info'
})

let hideTimer = null

function currentMessages() {
  const saved =
    typeof localStorage !== 'undefined' &&
    (localStorage.getItem('pitchpro-locale') === 'en' || localStorage.getItem('pitchpro-locale') === 'ar')
      ? localStorage.getItem('pitchpro-locale')
      : 'ar'
  return saved === 'en' ? enMessages : arMessages
}

function showToast({ title, message = '', mode = 'info', duration = 1800 }) {
  if (hideTimer) clearTimeout(hideTimer)

  toastState.title = title
  toastState.message = message
  toastState.mode = mode
  toastState.visible = true

  if (duration > 0) {
    hideTimer = setTimeout(() => {
      toastState.visible = false
    }, duration)
  }
}

function hideToast() {
  if (hideTimer) clearTimeout(hideTimer)
  toastState.visible = false
}

function showLoadingToast({
  title,
  message,
  successTitle,
  successMessage,
  loadingDuration = 900,
  successDuration = 1400
} = {}) {
  const common = currentMessages().common || {}

  const loadingTitle = title ?? common.processingRequest ?? 'Processing request'
  const loadingMessage = message ?? common.pleaseWait ?? 'Please wait...'
  const successTitleText = successTitle ?? common.done ?? 'Done'
  const successMessageText = successMessage ?? common.actionCompleted ?? 'Action completed'

  showToast({ title: loadingTitle, message: loadingMessage, mode: 'loading', duration: loadingDuration })

  setTimeout(() => {
    showToast({
      title: successTitleText,
      message: successMessageText,
      mode: 'success',
      duration: successDuration
    })
  }, loadingDuration - 100)
}

export function useUiToast() {
  return {
    toastState,
    showToast,
    showLoadingToast,
    hideToast
  }
}

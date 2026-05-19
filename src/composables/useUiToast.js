import { reactive } from 'vue'

const toastState = reactive({
  visible: false,
  title: '',
  message: '',
  mode: 'info'
})

let hideTimer = null

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
  title = 'Processing request',
  message = 'Please wait...',
  successTitle = 'Done',
  successMessage = 'Action completed',
  loadingDuration = 900,
  successDuration = 1400
} = {}) {
  showToast({ title, message, mode: 'loading', duration: loadingDuration })

  setTimeout(() => {
    showToast({
      title: successTitle,
      message: successMessage,
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

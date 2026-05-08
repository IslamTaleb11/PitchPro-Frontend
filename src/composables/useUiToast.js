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

  hideTimer = setTimeout(() => {
    toastState.visible = false
  }, duration)
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
    showLoadingToast
  }
}

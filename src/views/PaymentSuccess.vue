<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUiToast } from '../composables/useUiToast'
import { upgradeToken } from '../services/authService'
import { getAuthTokenStorageType, setAuthToken } from '../services/axiosConfig'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { showToast } = useUiToast()

const isRefreshing = ref(true)
const refreshError = ref('')

const checkoutId = computed(() => route.query.checkout_id || route.query.checkoutId || route.query.invoice_id || null)

const displayedId = computed(() => checkoutId.value || 'TXN_8829_PPRO_TACTICAL')

onMounted(async () => {
  try {
    const storageType = getAuthTokenStorageType()
    const response = await upgradeToken()
    const newToken = response?.data?.token || response?.data?.accessToken || response?.data?.access_token

    if (!newToken) {
      throw new Error('Upgrade endpoint did not return a token.')
    }

    setAuthToken(newToken, storageType === 'local')
  } catch (error) {
    refreshError.value =
      error?.response?.data?.message ||
      error?.message ||
      t('paymentSuccess.upgradeErrorMessage') ||
      'Unable to refresh subscription token.'
    showToast({
      title: t('paymentSuccess.upgradeFailed') || 'Upgrade failed',
      message: refreshError.value,
      mode: 'error',
      duration: 4000
    })
  } finally {
    isRefreshing.value = false
  }
})

function goToDashboard() {
  router.push({ name: 'StaffManagementDashboard' })
}

function goToSubscription() {
  router.push({ name: 'SubscriptionDashboard' })
}
</script>

<template>
  <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 py-10 text-on-surface">
    <div
      class="pointer-events-none absolute inset-0"
      style="
        background-image:
          linear-gradient(to right, rgba(0, 230, 57, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 230, 57, 0.05) 1px, transparent 1px);
        background-size: 40px 40px;
      "
    />
    <div class="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 bg-primary-container/10 blur-[120px]" />

    <div class="relative z-10 w-full max-w-md">
      <!-- Brand header -->
      <div class="mb-10 flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-surface-container-highest shadow-[0_0_30px_rgba(0,230,57,0.15)]">
          <img alt="PitchPro Club Logo" class="h-8 w-8 object-contain" src="/assets/club-logo.svg" />
        </div>
        <div class="flex-1 border-l-2 border-primary-fixed-dim pl-4">
          <h1 class="font-headline text-xl font-bold tracking-tighter text-white">PitchPro</h1>
          <p class="font-headline text-[10px] font-medium uppercase tracking-[0.2em] text-primary-fixed">
            {{ t('paymentSuccess.tagline') }}
          </p>
        </div>
      </div>

      <!-- Success hero -->
      <div class="mb-6 flex flex-col items-center gap-6 rounded-xl border-t-2 border-primary-fixed-dim/40 bg-surface-container-low/80 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div class="relative">
          <div class="flex h-28 w-28 items-center justify-center rounded-full border-2 border-primary-fixed-dim bg-primary-container/20 glow-effect">
            <span class="material-symbols-outlined text-6xl text-primary-fixed-dim" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          </div>
          <div class="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border border-primary-fixed-dim/30 bg-surface-container-highest">
            <span class="material-symbols-outlined text-primary-fixed-dim text-xl">verified</span>
          </div>
        </div>

        <transition name="fade-slide" mode="out-in">
          <div v-if="isRefreshing" class="flex flex-col items-center gap-3">
            <span class="h-5 w-5 animate-spin rounded-full border-2 border-primary-fixed/30 border-t-primary-fixed" />
            <p class="font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              {{ t('paymentSuccess.upgrading') }}
            </p>
          </div>
          <div v-else class="space-y-3">
            <p class="font-headline text-[11px] font-black uppercase tracking-[0.3em] text-primary-fixed">
              {{ t('paymentSuccess.paymentCompleted') }}
            </p>
            <h2 class="font-headline text-3xl font-black uppercase leading-tight tracking-tight text-white">
              {{ t('paymentSuccess.upgradeSuccessful') }}
            </h2>
            <p class="mx-auto max-w-xs text-sm leading-relaxed text-on-surface-variant">
              {{ t('paymentSuccess.description') }}
            </p>
          </div>
        </transition>
      </div>

      <!-- Receipt card -->
      <div
        class="relative mb-6 overflow-hidden rounded-xl border-t-2 border-primary-fixed-dim/40 bg-surface-container-low/80 p-6 shadow-2xl backdrop-blur-xl"
      >
        <div class="mb-5 flex items-center justify-between">
          <div>
            <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
              {{ t('paymentSuccess.activeLicense') }}
            </p>
            <h3 class="font-headline text-lg font-bold text-white">{{ t('paymentSuccess.planName') }}</h3>
          </div>
          <span class="flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-on-primary-container">
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-on-primary-container" />
            {{ t('paymentSuccess.statusLive') }}
          </span>
        </div>

        <!-- Unlocked features -->
        <div class="mb-5 space-y-2.5">
          <div class="flex items-center gap-3 rounded-lg bg-surface-container-lowest p-3.5">
            <span class="material-symbols-outlined text-primary-fixed-dim">dashboard_customize</span>
            <div>
              <p class="text-xs font-bold text-on-surface">{{ t('paymentSuccess.tacticsBoard') }}</p>
              <p class="text-[11px] text-on-surface-variant/70">{{ t('paymentSuccess.tacticsBoardDescription') }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 rounded-lg bg-surface-container-lowest p-3.5">
            <span class="material-symbols-outlined text-primary-fixed-dim">medical_services</span>
            <div>
              <p class="text-xs font-bold text-on-surface">{{ t('paymentSuccess.medicalCenter') }}</p>
              <p class="text-[11px] text-on-surface-variant/70">{{ t('paymentSuccess.medicalCenterDescription') }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 rounded-lg bg-surface-container-lowest p-3.5">
            <span class="material-symbols-outlined text-primary-fixed-dim">all_inclusive</span>
            <div>
              <p class="text-xs font-bold text-on-surface">{{ t('paymentSuccess.unlimitedCategories') }}</p>
              <p class="text-[11px] text-on-surface-variant/70">{{ t('paymentSuccess.unlimitedCategoriesDescription') }}</p>
            </div>
          </div>
        </div>

        <!-- Transaction footer -->
        <div class="flex items-center justify-between border-t border-outline-variant/20 pt-4">
          <p class="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {{ t('paymentSuccess.encryptedTransactionId') }}
          </p>
          <p class="font-mono text-[11px] font-bold tracking-tight text-primary-fixed">{{ displayedId }}</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-3">
        <button
          type="button"
          class="pressable w-full rounded-md bg-linear-to-br from-primary to-primary-container p-px"
          @click="goToDashboard"
        >
          <div class="flex items-center justify-center gap-3 bg-primary-container py-4 transition-colors hover:bg-primary-fixed-dim">
            <span class="font-headline text-sm font-black uppercase tracking-widest text-on-primary-container">
              {{ t('paymentSuccess.goToDashboard') }}
            </span>
            <span class="material-symbols-outlined text-[18px] font-bold text-on-primary-container">arrow_forward</span>
          </div>
        </button>
        <button
          type="button"
          class="pressable flex w-full items-center justify-center gap-3 rounded-md border border-outline-variant/20 bg-surface-container-high py-4 transition-colors hover:bg-surface-container-highest"
          @click="goToSubscription"
        >
          <span class="material-symbols-outlined text-[18px] text-on-surface-variant">receipt_long</span>
          <span class="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            {{ t('paymentSuccess.viewSubscription') }}
          </span>
        </button>
      </div>

      <p class="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/40">
        {{ t('paymentSuccess.secureConfirmation') }}
      </p>
    </div>
  </main>
</template>

<style scoped>
.glow-effect {
  box-shadow: 0 0 40px -10px rgba(0, 255, 65, 0.35);
}
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
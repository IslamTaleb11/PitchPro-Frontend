<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUiToast } from '../composables/useUiToast'
import { upgradeToken } from '../services/authService'
import { getAuthTokenStorageType, setAuthToken } from '../services/axiosConfig'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { showToast } = useUiToast()
const isSidebarOpen = ref(true)

const checkoutId = computed(() => route.query.checkout_id || route.query.checkoutId || null)

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
    const message = error?.response?.data?.message || error?.message || t('paymentSuccess.upgradeErrorMessage') || 'Unable to refresh subscription token.'
    showToast({ title: t('paymentSuccess.upgradeFailed') || 'Upgrade failed', message, mode: 'error', duration: 4000 })
    console.error('Upgrade token failed:', error)
  }
})

function goToSubscription() {
  router.push({ name: 'SubscriptionDashboard' })
}
</script>

<template>
  <div class="min-h-screen bg-background text-on-background">
     <DashboardSidebar active-item="subscription" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      :class="[
          'pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300 lg:flex-1',
          'ms-0',
      ]"
    >
      <div class="scanline"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] bg-primary-container/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div class="relative h-full flex items-center justify-center p-8">
        <div class="w-full max-w-5xl grid gap-8 md:grid-cols-12 items-center">
          <div class="md:col-span-5 flex flex-col items-center text-center gap-8">
            <div class="relative mb-8">
              <div class="w-32 h-32 rounded-full border-4 border-primary flex items-center justify-center glow-effect animate-pulse">
                <span class="material-symbols-outlined text-7xl text-primary" style="font-variation-settings: 'FILL' 1;">check_circle</span>
              </div>
              <div class="absolute -top-4 -right-4 w-12 h-12 bg-surface-container-highest border border-outline-variant/20 rounded flex items-center justify-center">
                <span class="material-symbols-outlined text-primary text-xl">verified</span>
              </div>
            </div>

            <div>
              <p class="text-sm tracking-[0.2em] uppercase text-primary-fixed font-black mb-4">{{ t('paymentSuccess.paymentCompleted') }}</p>
              <h2 class="font-headline text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight text-primary-fixed">
                {{ t('paymentSuccess.upgradeSuccessful') }}
              </h2>
              <p class="text-on-surface-variant/80 text-sm max-w-xs leading-relaxed mt-4">
                {{ t('paymentSuccess.description') }}
              </p>
            </div>
          </div>

          <div class="md:col-span-7 relative">
            <div class="bg-surface-container-high rounded-[1.25rem] p-8 border-l-4 border-primary relative overflow-hidden">
              <div class="flex justify-between items-start mb-10">
                <div>
                  <p class="text-[10px] uppercase tracking-[0.2em] text-primary-fixed font-black mb-1">{{ t('paymentSuccess.activeLicense') }}</p>
                  <h3 class="font-headline text-2xl font-bold text-on-surface uppercase italic tracking-tight">{{ t('paymentSuccess.proTacticalPlan') }}</h3>
                </div>
                <div class="bg-surface-container-lowest px-4 py-2 rounded-lg border border-outline-variant/20 text-right">
                  <p class="text-[10px] text-on-surface-variant font-bold uppercase mb-0.5">{{ t('paymentSuccess.transaction') }}</p>
                  <p class="text-xl font-headline font-black text-primary tracking-tighter">4,000 DA</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 mb-10">
                <div class="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/10 group hover:border-primary/40 transition-colors">
                  <div class="flex items-center gap-3 mb-2">
                    <span class="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">dashboard_customize</span>
                    <span class="text-[10px] font-black uppercase text-on-surface-variant">{{ t('paymentSuccess.tacticsBoard') }}</span>
                  </div>
                  <p class="text-xs text-on-surface-variant/60">{{ t('paymentSuccess.tacticsBoardDescription') }}</p>
                </div>
                <div class="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/10 group hover:border-primary/40 transition-colors">
                  <div class="flex items-center gap-3 mb-2">
                    <span class="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">medical_services</span>
                    <span class="text-[10px] font-black uppercase text-on-surface-variant">{{ t('paymentSuccess.medicalCenter') }}</span>
                  </div>
                  <p class="text-xs text-on-surface-variant/60">{{ t('paymentSuccess.medicalCenterDescription') }}</p>
                </div>
                <div class="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/10 group hover:border-primary/40 transition-colors col-span-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <span class="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">all_inclusive</span>
                      <span class="text-[10px] font-black uppercase text-on-surface-variant">{{ t('paymentSuccess.unlimitedCategories') }}</span>
                    </div>
                    <span class="px-2 py-0.5 bg-primary-container text-on-primary-container text-[8px] font-black rounded uppercase">{{ t('paymentSuccess.statusLive') }}</span>
                  </div>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row gap-4">
                <button
                  class="flex-1 bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded font-headline font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all glow-effect"
                  type="button"
                  @click="router.push({ name: 'StaffManagementDashboard' })"
                >
                  {{ t('paymentSuccess.goToDashboard') }}
                  <span class="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
                <button
                  class="px-8 py-4 bg-transparent border border-outline-variant/30 text-on-surface-variant font-headline font-bold text-sm uppercase tracking-widest hover:bg-surface-container-highest transition-all active:scale-95 flex items-center justify-center gap-3"
                  type="button"
                  @click="goToSubscription"
                >
                  <span class="material-symbols-outlined text-lg">receipt_long</span>
                  {{ t('paymentSuccess.viewReceipt') }}
                </button>
              </div>

              <div class="absolute -bottom-4 -right-12 text-[80px] font-black text-on-surface-variant/5 pointer-events-none select-none italic font-headline">
                {{ t('paymentSuccess.completed') }}
              </div>
            </div>

            <div class="mt-6 flex items-center gap-2 text-[10px] text-on-surface-variant/40 font-mono uppercase tracking-widest">
              <span class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              {{ t('paymentSuccess.encryptedTransactionId') }}: {{ checkoutId || 'TXN_8829_PPRO_TACTICAL' }}
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
<style>
.scanline {
  width: 100%;
  height: 2px;
  background: rgba(0, 255, 65, 0.1);
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  animation: scan 4s linear infinite;
}
@keyframes scan {
  0% { top: 0; }
  100% { top: 100%; }
}
.glow-effect {
  box-shadow: 0 0 40px -10px rgba(0, 255, 65, 0.3);
}
</style>

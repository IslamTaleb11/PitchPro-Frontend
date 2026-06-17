<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const isSidebarOpen = ref(true)

const checkoutId = computed(() => route.query.checkout_id || route.query.checkoutId || null)

function returnToPlans() {
  router.push({ name: 'SubscriptionDashboard' })
}
function retryPayment() {
  router.push({ name: 'SubscriptionDashboard' })
}

onMounted(() => {
  // Simple cursor tracker for ambient glow effect
  document.addEventListener('mousemove', (e) => {
    const glow = document.querySelector('.bg-tertiary-fixed-dim\\/20');
    if (glow) {
      const moveX = (e.clientX - window.innerWidth / 2) / 40;
      const moveY = (e.clientY - window.innerHeight / 2) / 40;
      glow.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
    }
  });
})
</script>

<template>
  <div class="min-h-screen bg-background text-on-background lg:flex lg:items-stretch">
    <DashboardSidebar active-item="subscription" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      :class="[
        'pt-20 h-[calc(100vh-5rem)] overflow-hidden bg-background relative flex items-center justify-center p-6 lg:flex-1',
        'ml-0',
      ]"
    >
      <div class="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-tertiary-fixed-dim/20 rounded-full blur-[120px]"></div>
        <div class="absolute -top-24 -right-24 w-96 h-96 bg-error-container/30 rounded-full blur-[80px]"></div>
      </div>

      <div class="relative z-10 w-full max-w-4xl grid md:grid-cols-12 gap-8 items-center">
        <div class="md:col-span-5 hidden md:block">
          <div class="relative aspect-[4/5] rounded-xl overflow-hidden border border-outline-variant/20 bg-surface-container-low shadow-2xl">
            <img
              class="w-full h-full object-cover grayscale opacity-40 mix-blend-overlay"
              alt="A cinematic, high-contrast photograph of an empty, high-tech stadium at night under heavy rainfall"
              src="/assets/stadium.svg"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div class="absolute top-4 left-4 font-label text-[10px] text-tertiary-fixed-dim tracking-[0.2em] font-bold">
              {{ t('paymentFailure.systemId') }}
            </div>
            <div class="absolute bottom-4 left-4 space-y-1">
              <div class="flex items-center gap-2 text-error text-[10px] font-black uppercase tracking-widest animate-pulse">
                <span class="material-symbols-outlined text-sm">warning</span>
                {{ t('paymentFailure.connectionDropped') }}
              </div>
              <div class="w-32 h-1 bg-surface-container-high rounded-full overflow-hidden">
                <div class="w-2/3 h-full bg-tertiary-fixed-dim"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="md:col-span-7 space-y-8">
          <div class="space-y-2">
            <h1 class="text-5xl md:text-6xl font-headline font-black tracking-tighter text-on-surface leading-none">{{ t('paymentFailure.transactionCancelled') }}</h1>
            <p class="text-on-surface-variant font-body text-lg leading-relaxed max-w-md">
              {{ t('paymentFailure.pausedDescription') }}
            </p>
          </div>

          <div class="grid gap-3">
            <h3 class="text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest">{{ t('paymentFailure.nextSteps') }}</h3>
            <div class="group flex items-center gap-4 p-4 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-lg border border-outline-variant/10">
              <div class="w-10 h-10 flex-shrink-0 bg-surface-container-highest rounded flex items-center justify-center text-tertiary-fixed-dim">
                <span class="material-symbols-outlined">visibility</span>
              </div>
              <div>
                <p class="text-sm font-bold text-on-surface">{{ t('paymentFailure.reviewPlans') }}</p>
                <p class="text-xs text-on-surface-variant">{{ t('paymentFailure.reviewPlansDescription') }}</p>
              </div>
            </div>
            <div class="group flex items-center gap-4 p-4 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-lg border border-outline-variant/10">
              <div class="w-10 h-10 flex-shrink-0 bg-surface-container-highest rounded flex items-center justify-center text-tertiary-fixed-dim">
                <span class="material-symbols-outlined">bookmark</span>
              </div>
              <div>
                <p class="text-sm font-bold text-on-surface">{{ t('paymentFailure.saveForLater') }}</p>
                <p class="text-xs text-on-surface-variant">{{ t('paymentFailure.saveForLaterDescription') }}</p>
              </div>
            </div>
            <div class="group flex items-center gap-4 p-4 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-lg border border-outline-variant/10">
              <div class="w-10 h-10 flex-shrink-0 bg-surface-container-highest rounded flex items-center justify-center text-tertiary-fixed-dim">
                <span class="material-symbols-outlined">play_circle</span>
              </div>
              <div>
                <p class="text-sm font-bold text-on-surface">{{ t('paymentFailure.resumeUpgrade') }}</p>
                <p class="text-xs text-on-surface-variant">{{ t('paymentFailure.resumeUpgradeDescription') }}</p>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              class="px-8 py-4 performance-gradient text-on-primary font-headline font-black text-sm uppercase tracking-widest rounded shadow-lg shadow-primary/10 active:scale-95 transition-all flex items-center justify-center gap-2"
              type="button"
              @click="retryPayment"
            >
              <span class="material-symbols-outlined text-sm">play_arrow</span>
              {{ t('paymentFailure.resumeUpgrade') }}
            </button>
            <button
              class="px-8 py-4 bg-surface-container-high text-on-surface font-headline font-bold text-sm uppercase tracking-widest rounded border border-outline-variant/20 hover:bg-surface-container-highest active:scale-95 transition-all flex items-center justify-center gap-2"
              type="button"
              @click="returnToPlans"
            >
              <span class="material-symbols-outlined text-sm">arrow_back</span>
              {{ t('paymentFailure.returnToPlans') }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

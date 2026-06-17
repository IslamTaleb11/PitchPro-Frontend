<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { useUiToast } from '../composables/useUiToast'
import { paymentService } from '../services/paymentService'

const { t: $t } = useI18n()
const isSidebarOpen = ref(true)
const isCheckingOut = ref(false)
const { showToast } = useUiToast()

async function orderProPlan() {
  if (isCheckingOut.value) return

  try {
    isCheckingOut.value = true
    showToast({
      title: $t('subscription.toast.preparingPaymentTitle'),
      message: $t('subscription.toast.preparingPaymentMessage'),
      mode: 'loading',
      duration: 0
    })

    // Call checkout without clubId
    const response = await paymentService.createCheckout({})
    const paymentUrl = response?.data?.paymentUrl

    if (paymentUrl) {
      window.location.href = paymentUrl
      return
    }

    showToast({
      title: $t('subscription.toast.paymentFailedTitle'),
      message: $t('subscription.toast.paymentFailedMessage'),
      mode: 'error',
      duration: 6000
    })
  } catch (error) {
    console.error('Checkout error', error)
    showToast({
      title: $t('subscription.toast.checkoutErrorTitle'),
      message: error?.response?.data?.message || $t('subscription.toast.checkoutErrorMessage'),
      mode: 'error',
      duration: 6000
    })
  } finally {
    isCheckingOut.value = false
  }
}

onMounted(() => {
  document.querySelectorAll('.glow-hover').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      card.style.setProperty('--mouse-x', `${x}px`)
      card.style.setProperty('--mouse-y', `${y}px`)
    })
  })
})
</script>

<template>
  <div class="min-h-screen bg-background text-on-background lg:flex lg:items-stretch">
    <DashboardSidebar active-item="subscription" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      :class="[
        'pt-20 h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300 lg:flex-1',
        'ms-0',
      ]"
    >
      <section class="mb-12 max-w-5xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span class="label-md inline-block bg-primary-container text-on-primary-container px-2 py-0.5 rounded-sm font-bold tracking-widest text-[10px] mb-4">{{ $t('subscription.banner') }}</span>
            <h2 class="text-4xl md:text-6xl font-black font-display tracking-tighter text-white uppercase leading-none">
              {{ $t('subscription.headlinePrefix') }}<br /><span class="text-primary-fixed italic">{{ $t('subscription.headlineAccent') }}</span>
            </h2>
          </div>
          <div class="max-w-xs">
            <p class="text-neutral-400 text-sm font-body leading-relaxed">
              {{ $t('subscription.subheadline') }}
            </p>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
        <div class="lg:col-span-5 flex flex-col bg-surface-container-low p-8 rounded-xl relative overflow-hidden group border border-transparent hover:border-outline-variant/30 transition-all">
          <div class="relative z-10 h-full flex flex-col">
            <div class="mb-8">
              <h3 class="font-display text-2xl font-bold text-white uppercase tracking-tight">{{ $t('subscription.freeTitle') }}</h3>
              <p class="text-neutral-500 text-xs font-bold tracking-widest mt-1 uppercase">{{ $t('subscription.freeSubtitle') }}</p>
            </div>
            <div class="mb-10">
              <div class="flex items-baseline gap-1">
                <span class="text-5xl font-black font-display text-white">0</span>
                <span class="text-xl font-bold text-neutral-500 uppercase">DA</span>
                <span class="text-xs text-neutral-500 ml-2">/ {{ $t('subscription.lifetime') }}</span>
              </div>
              <p class="text-neutral-400 text-xs mt-3 leading-relaxed">{{ $t('subscription.freeDescription') }}</p>
            </div>
            <ul class="space-y-4 mb-12 flex-1">
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary-fixed text-lg" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                <span class="text-sm text-neutral-300 font-medium">{{ $t('subscription.featureOne') }}</span>
              </li>
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary-fixed text-lg" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                <span class="text-sm text-neutral-300 font-medium">{{ $t('subscription.featureTwo') }}</span>
              </li>
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary-fixed text-lg" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                <span class="text-sm text-neutral-300 font-medium">{{ $t('subscription.featureThree') }}</span>
              </li>
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary-fixed text-lg" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                <span class="text-sm text-neutral-300 font-medium">{{ $t('subscription.featureFour') }}</span>
              </li>
              <li class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary-fixed text-lg" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                <span class="text-sm text-neutral-300 font-medium">{{ $t('subscription.featureFive') }}</span>
              </li>
            </ul>
            <button class="w-full py-4 border border-outline-variant/50 text-white font-bold text-sm tracking-widest uppercase hover:bg-white hover:text-black transition-all">
              {{ $t('subscription.currentPlan') }}
            </button>
          </div>
          <div class="absolute -right-12 -bottom-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <span class="material-symbols-outlined text-[200px]" style="font-variation-settings: 'wght' 100;">monitoring</span>
          </div>
        </div>

        <div class="lg:col-span-7 flex flex-col bg-surface-container-high p-8 rounded-xl relative overflow-hidden glow-hover border-2 border-primary-container transition-all" style="--mouse-x: 74px; --mouse-y: 534px;">
          <div class="absolute top-0 right-0 bg-primary-container text-on-primary-container px-4 py-1.5 font-display font-black text-xs uppercase tracking-tighter skew-x-[-15deg] origin-top-right transform translate-x-1">
            {{ $t('subscription.recommended') }}
          </div>
          <div class="relative z-10 h-full flex flex-col">
            <div class="mb-8">
              <h3 class="font-display text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                {{ $t('subscription.proTitle') }}
                <span class="material-symbols-outlined text-primary-container" style="font-variation-settings: 'FILL' 1;">verified</span>
              </h3>
              <p class="text-primary-container/80 text-xs font-bold tracking-widest mt-1 uppercase">{{ $t('subscription.eliteSuite') }}</p>
            </div>
            <div class="grid md:grid-cols-2 gap-10 h-full">
              <div class="flex flex-col">
                <div class="mb-8">
                  <div class="flex items-baseline gap-1">
                    <span class="text-6xl font-black font-display text-white italic">6200</span>
                    <span class="text-2xl font-black text-white uppercase">DA</span>
                    <span class="text-xs text-neutral-400 ml-2">/ {{ $t('subscription.month') }}</span>
                  </div>
                  <p class="text-neutral-300 text-xs mt-4 leading-relaxed font-medium">{{ $t('subscription.proDescription') }}</p>
                </div>
                <div class="mt-auto">
                  <button
                    class="w-full bg-linear-to-r from-green-400 to-emerald-500 text-slate-950 py-5 rounded-sm font-display font-black text-sm tracking-[0.2em] uppercase shadow-lg shadow-primary-container/20 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    @click="orderProPlan"
                    :disabled="isCheckingOut"
                  >
                    {{ isCheckingOut ? $t('subscription.processing') : $t('subscription.orderNow') }}
                  </button>
                  <p class="text-[10px] text-neutral-500 mt-4 uppercase text-center tracking-widest font-bold">{{ $t('subscription.cancelAnytime') }}</p>
                </div>
              </div>
              <div class="flex flex-col">
                <p class="text-[10px] text-primary-container font-black tracking-widest uppercase mb-4 opacity-70">{{ $t('subscription.capabilities') }}</p>
                <ul class="space-y-4">
                  <li class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-primary-container text-lg mt-0.5" style="font-variation-settings: 'FILL' 1;">add_moderator</span>
                    <div>
                      <p class="text-sm text-white font-bold uppercase tracking-tight">{{ $t('subscription.unlimitedCategories') }}</p>
                      <p class="text-[11px] text-neutral-500 font-medium leading-tight">{{ $t('subscription.unlimitedCategoriesDetail') }}</p>
                    </div>
                  </li>
                  <li class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-primary-container text-lg mt-0.5" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
                    <div>
                      <p class="text-sm text-white font-bold uppercase tracking-tight">{{ $t('subscription.advancedFinancials') }}</p>
                      <p class="text-[11px] text-neutral-500 font-medium leading-tight">{{ $t('subscription.advancedFinancialsDetail') }}</p>
                    </div>
                  </li>
                  <li class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-primary-container text-lg mt-0.5" style="font-variation-settings: 'FILL' 1;">health_and_safety</span>
                    <div>
                      <p class="text-sm text-white font-bold uppercase tracking-tight">{{ $t('subscription.medicalLogs') }}</p>
                      <p class="text-[11px] text-neutral-500 font-medium leading-tight">{{ $t('subscription.medicalLogsDetail') }}</p>
                    </div>
                  </li>
                  <li class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-primary-container text-lg mt-0.5" style="font-variation-settings: 'FILL' 1;">draw</span>
                    <div>
                      <p class="text-sm text-white font-bold uppercase tracking-tight">{{ $t('subscription.tacticsBoard') }}</p>
                      <p class="text-[11px] text-neutral-500 font-medium leading-tight">{{ $t('subscription.tacticsBoardDetail') }}</p>
                    </div>
                  </li>
                  <li class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-primary-container text-lg mt-0.5" style="font-variation-settings: 'FILL' 1;">picture_as_pdf</span>
                    <div>
                      <p class="text-sm text-white font-bold uppercase tracking-tight">{{ $t('subscription.pdfReports') }}</p>
                      <p class="text-[11px] text-neutral-500 font-medium leading-tight">{{ $t('subscription.pdfReportsDetail') }}</p>
                    </div>
                  </li>
                  <li class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-primary-container text-lg mt-0.5" style="font-variation-settings: 'FILL' 1;">query_stats</span>
                    <div>
                      <p class="text-sm text-white font-bold uppercase tracking-tight">{{ $t('subscription.attendanceAnalytics') }}</p>
                      <p class="text-[11px] text-neutral-500 font-medium leading-tight">{{ $t('subscription.attendanceAnalyticsDetail') }}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: radial-gradient(#00FF41 0.5px, transparent 0.5px); background-size: 20px 20px;"></div>
        </div>
      </div>

      <section class="mt-20 mb-20 max-w-5xl mx-auto overflow-hidden">
        <div class="flex items-center gap-4 mb-8">
          <div class="h-0.5 w-12 bg-primary-container"></div>
          <h3 class="font-display font-black text-xl text-white uppercase tracking-tighter">{{ $t('subscription.planComparisonTitle') }}</h3>
        </div>
        <div class="bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container-high">
                <th class="p-6 text-xs font-black text-neutral-500 uppercase tracking-widest">{{ $t('subscription.featureCategory') }}</th>
                <th class="p-6 text-xs font-black text-white uppercase tracking-widest text-center">{{ $t('subscription.freeTitle') }}</th>
                <th class="p-6 text-xs font-black text-primary-container uppercase tracking-widest text-center">{{ $t('subscription.proTitle') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/20">
              <tr class="bg-surface-container-lowest/30">
                <td class="px-6 py-3 text-[10px] font-black text-primary-container/50 uppercase tracking-[0.2em]" colspan="3">{{ $t('subscription.coreCapacitySection') }}</td>
              </tr>
              <tr>
                <td class="p-6 text-sm text-white font-medium">{{ $t('subscription.squadCategories') }}</td>
                <td class="p-6 text-sm text-neutral-400 text-center">{{ $t('subscription.freeSquadCategories') }}</td>
                <td class="p-6 text-sm text-primary-container font-bold text-center">{{ $t('subscription.proSquadCategories') }}</td>
              </tr>
              <tr>
                <td class="p-6 text-sm text-white font-medium">{{ $t('subscription.playerRoster') }}</td>
                <td class="p-6 text-sm text-neutral-400 text-center">{{ $t('subscription.freePlayerRoster') }}</td>
                <td class="p-6 text-sm text-primary-container font-bold text-center">{{ $t('subscription.proPlayerRoster') }}</td>
              </tr>
              <tr>
                <td class="p-6 text-sm text-white font-medium">{{ $t('subscription.staffAccounts') }}</td>
                <td class="p-6 text-sm text-neutral-400 text-center">{{ $t('subscription.freeStaffAccounts') }}</td>
                <td class="p-6 text-sm text-primary-container font-bold text-center">{{ $t('subscription.proStaffAccounts') }}</td>
              </tr>
              <tr class="bg-surface-container-lowest/30">
                <td class="px-6 py-3 text-[10px] font-black text-primary-container/50 uppercase tracking-[0.2em]" colspan="3">{{ $t('subscription.technicalFeaturesSection') }}</td>
              </tr>
              <tr>
                <td class="p-6 text-sm text-white font-medium">{{ $t('subscription.matchReports') }}</td>
                <td class="p-6 text-sm text-neutral-400 text-center">{{ $t('subscription.freeMatchReports') }}</td>
                <td class="p-6 text-sm text-primary-container font-bold text-center">{{ $t('subscription.proMatchReports') }}</td>
              </tr>
              <tr>
                <td class="p-6 text-sm text-white font-medium">{{ $t('subscription.tacticsBoard') }}</td>
                <td class="p-6 text-sm text-neutral-400 text-center"><span class="material-symbols-outlined opacity-20">close</span></td>
                <td class="p-6 text-sm text-primary-container text-center"><span class="material-symbols-outlined">check_circle</span></td>
              </tr>
              <tr>
                <td class="p-6 text-sm text-white font-medium">{{ $t('subscription.attendanceAnalytics') }}</td>
                <td class="p-6 text-sm text-neutral-400 text-center">{{ $t('subscription.freeAttendanceAnalytics') }}</td>
                <td class="p-6 text-sm text-primary-container font-bold text-center">{{ $t('subscription.proAttendanceAnalytics') }}</td>
              </tr>
              <tr class="bg-surface-container-lowest/30">
                <td class="px-6 py-3 text-[10px] font-black text-primary-container/50 uppercase tracking-[0.2em]" colspan="3">{{ $t('subscription.operationsSection') }}</td>
              </tr>
              <tr>
                <td class="p-6 text-sm text-white font-medium">{{ $t('subscription.medicalCenterInjuryTracking') }}</td>
                <td class="p-6 text-sm text-neutral-400 text-center"><span class="material-symbols-outlined opacity-20">close</span></td>
                <td class="p-6 text-sm text-primary-container text-center"><span class="material-symbols-outlined">check_circle</span></td>
              </tr>
              <tr>
                <td class="p-6 text-sm text-white font-medium">{{ $t('subscription.financialLedger') }}</td>
                <td class="p-6 text-sm text-neutral-400 text-center"><span class="material-symbols-outlined opacity-20">close</span></td>
                <td class="p-6 text-sm text-primary-container text-center"><span class="material-symbols-outlined">check_circle</span></td>
              </tr>
              <tr>
                <td class="p-6 text-sm text-white font-medium">{{ $t('subscription.exportablePdfReports') }}</td>
                <td class="p-6 text-sm text-neutral-400 text-center"><span class="material-symbols-outlined opacity-20">close</span></td>
                <td class="p-6 text-sm text-primary-container text-center"><span class="material-symbols-outlined">check_circle</span></td>
              </tr>
              <tr class="bg-surface-container-lowest/30">
                <td class="px-6 py-3 text-[10px] font-black text-primary-container/50 uppercase tracking-[0.2em]" colspan="3">{{ $t('subscription.supportSection') }}</td>
              </tr>
              <tr>
                <td class="p-6 text-sm text-white font-medium">{{ $t('subscription.responseTime') }}</td>
                <td class="p-6 text-sm text-neutral-400 text-center">{{ $t('subscription.standard') }}</td>
                <td class="p-6 text-sm text-primary-container font-bold text-center">{{ $t('subscription.priority') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <div class="fixed bottom-0 right-0 w-150 h-150 bg-primary-container/5 rounded-full blur-[120px] -z-10 translate-x-1/2 translate-y-1/2"></div>
    </main>
  </div>
</template>

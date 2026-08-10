<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api, { getCurrentPlanFromJwt, getPlanFromToken, getRefreshToken, clearAuthToken } from '../../../services/axiosConfig'

defineProps({
  sidebarOpen: {
    type: Boolean,
    default: true
  }
})

defineEmits(['toggle-sidebar'])

const { locale, t: $t } = useI18n()
const isLangDropdownOpen = ref(false)

const currentLangLabel = computed(() => {
  return locale.value === 'ar' ? 'العربية' : 'English'
})

const currentLangFlag = computed(() => {
  return locale.value === 'ar' ? '🇩🇿' : '🇬🇧'
})

const currentPlan = ref(null)
const subscriptionRemainingDays = ref(null)
const isLoadingSubscriptionInfo = ref(false)

async function fetchSubscriptionRemainingDays() {
  if (typeof window === 'undefined') return
  if (isFreePlan.value) {
    subscriptionRemainingDays.value = null
    return
  }

  try {
    isLoadingSubscriptionInfo.value = true
    const response = await api.get('/club/subscription/remaining')
    const parsedValue = Number(response?.data)
    subscriptionRemainingDays.value = Number.isFinite(parsedValue) ? parsedValue : null
  } catch (error) {
    subscriptionRemainingDays.value = null
    console.error('Failed to load subscription remaining days', error)
  } finally {
    isLoadingSubscriptionInfo.value = false
  }
}

function updatePlan(evt) {
  if (evt && evt.detail && evt.detail.token) {
    currentPlan.value = getPlanFromToken(evt.detail.token) || getCurrentPlanFromJwt()
    fetchSubscriptionRemainingDays()
    return
  }

  currentPlan.value = getCurrentPlanFromJwt()
  fetchSubscriptionRemainingDays()
}

onMounted(() => {
  updatePlan()
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:tokenChanged', updatePlan)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('auth:tokenChanged', updatePlan)
  }
})

const planLabel = computed(() => {
  const plan = currentPlan.value
  if (!plan) return null

  const normalized = plan.toString().trim().toLowerCase()
  if (normalized.includes('premium') || normalized.includes('pro')) {
    return $t('topbar.premiumPlanLabel')
  }
  if (normalized.includes('paid')) {
    return $t('topbar.paidPlanLabel')
  }
  if (normalized.includes('free')) {
    return $t('topbar.freePlanLabel')
  }

  return $t('topbar.planLabel', { plan })
})

const isPremiumPlan = computed(() => {
  const plan = String(currentPlan.value ?? '').trim().toLowerCase()
  return plan.includes('premium') || plan.includes('pro')
})

const isFreePlan = computed(() => {
  const plan = String(currentPlan.value ?? '').trim().toLowerCase()
  return !plan || plan.includes('free') || plan.includes('basic') || plan.includes('starter')
})

const remainingDaysLabel = computed(() => {
  if (subscriptionRemainingDays.value == null) return null

  const days = Number(subscriptionRemainingDays.value)
  if (!Number.isFinite(days)) return null

  if (days <= 0) {
    return $t('topbar.subscriptionExpired')
  }

  if (days === 1) {
    return $t('topbar.oneDayLeft', { count: days })
  }

  return $t('topbar.daysLeft', { count: days })
})

function setLanguage(lang) {
  locale.value = lang
  isLangDropdownOpen.value = false
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

const router = useRouter()

async function logout() {
  try {
    const refreshToken = getRefreshToken()

    if (refreshToken) {
      await api.post('/auth/logout', {
        refreshToken
      })
    }
  } catch (error) {
    console.warn('Logout backend request failed, clearing local auth anyway.', error)
  } finally {
    clearAuthToken()
    router.push('/login')
  }
}
</script>

<template>
  <header
    :class="[
      'fixed top-0 ltr:right-0 ltr:left-auto rtl:left-0 rtl:right-auto z-40 flex w-full flex-wrap items-center justify-between gap-3 bg-slate-950/80 px-4 py-3 shadow-2xl shadow-green-900/5 backdrop-blur-xl transition-all duration-300 md:h-20 md:px-8 md:py-0 lg:w-[calc(100%-16rem)]',
    ]"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3 md:flex-initial md:gap-4">
      <button
        type="button"
        class="pressable inline-flex h-9 w-9 items-center justify-center rounded border border-outline-variant/30 bg-surface-container-low text-slate-300 hover:text-primary-fixed lg:hidden"
        @click="$emit('toggle-sidebar')"
      >
        <span class="material-symbols-outlined text-lg">{{ sidebarOpen ? 'close' : 'menu' }}</span>
      </button>
      <h1 class="min-w-0 truncate text-base font-black uppercase tracking-widest text-white md:text-lg">{{ pageTitle }}</h1>
      <span class="hidden rounded border border-green-400/20 bg-green-400/10 px-2 py-0.5 text-[10px] font-bold text-green-400 md:inline-flex">
        {{ $t('topbar.liveOps') }}
      </span>
      <span v-if="planLabel" class="hidden rounded border border-slate-500/20 bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-slate-200 md:inline-flex">
        {{ planLabel }}
      </span>
      <div v-if="!isFreePlan && remainingDaysLabel" class="hidden items-center gap-2 rounded-full border border-amber-400/20 bg-gradient-to-r from-amber-400/15 via-amber-500/10 to-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200 shadow-lg shadow-amber-500/10 md:inline-flex">
        <span class="material-symbols-outlined text-sm">calendar_month</span>
        <span>{{ remainingDaysLabel }}</span>
      </div>
    </div>
<div class="flex items-center gap-2 md:gap-4 lg:gap-6">
        <div class="flex items-center gap-2 md:gap-4">
        <router-link
          v-if="!isPremiumPlan"
          to="/dashboard/subscription"
          class="pressable hidden items-center gap-2 rounded-lg bg-green-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-950 transition-colors hover:bg-green-300 md:inline-flex"
        >
          <span>{{ $t('topbar.upgradeNow') }}</span>
          <span class="material-symbols-outlined text-sm">bolt</span>
        </router-link>
        <button type="button" class="pressable hidden text-slate-400 transition-opacity hover:text-green-400 active:opacity-80 md:inline-flex">
          <span class="material-symbols-outlined">notifications</span>
        </button>

        <!-- Language Switcher -->
        <div class="relative">
          <button
            type="button"
            class="pressable flex items-center gap-2 rounded-lg border border-white/10 bg-surface-container-low px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:border-green-400/30 hover:text-green-400"
            @click="isLangDropdownOpen = !isLangDropdownOpen"
          >
            <span class="text-sm">{{ currentLangFlag }}</span>
            <span class="hidden sm:inline">{{ currentLangLabel }}</span>
            <span class="material-symbols-outlined text-xs transition-transform" :class="{ 'rotate-180': isLangDropdownOpen }">expand_more</span>
          </button>

          <div
            v-if="isLangDropdownOpen"
            class="absolute ltr:right-0 rtl:left-0 mt-2 w-40 rounded-lg border border-white/10 bg-surface-container-high shadow-2xl overflow-hidden"
          >
            <button
              type="button"
              :class="[
                'flex w-full items-center gap-2 px-3 py-2.5 text-xs font-bold transition-colors',
                locale === 'en'
                  ? 'bg-green-400/10 text-green-400'
                  : 'text-slate-400 hover:bg-surface-container-highest hover:text-white'
              ]"
              @click="setLanguage('en')"
            >
              <span>🇬🇧</span>
              <span>{{ $t('languages.en') }}</span>
            </button>
            <button
              type="button"
              :class="[
                'flex w-full items-center gap-2 px-3 py-2.5 text-xs font-bold transition-colors',
                locale === 'ar'
                  ? 'bg-green-400/10 text-green-400'
                  : 'text-slate-400 hover:bg-surface-container-highest hover:text-white'
              ]"
              @click="setLanguage('ar')"
            >
              <span>🇩🇿</span>
              <span>{{ $t('languages.ar') }}</span>
            </button>
          </div>
        </div>

        <button type="button" @click="logout" class="pressable hidden text-slate-400 transition-opacity hover:text-red-400 active:opacity-80 md:inline-flex" title="Logout">
          <span class="material-symbols-outlined">logout</span>
        </button>

        <div class="h-9 w-9 rounded-full border-2 border-green-400/30 p-0.5 md:h-10 md:w-10">
          <img
            alt="Director Portrait"
            class="h-full w-full rounded-full object-cover"
            src="/assets/director-avatar.svg"
          />
        </div>
      </div>
    </div>
  </header>

  <!-- Click-away listener for language dropdown -->
  <div v-if="isLangDropdownOpen" class="fixed inset-0 z-30" @click="isLangDropdownOpen = false"></div>
</template>

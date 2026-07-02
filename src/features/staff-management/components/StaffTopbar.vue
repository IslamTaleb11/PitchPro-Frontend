<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCurrentPlanFromJwt } from '../../../services/axiosConfig'

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

const planLabel = computed(() => {
  const plan = getCurrentPlanFromJwt()
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

function setLanguage(lang) {
  locale.value = lang
  isLangDropdownOpen.value = false
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
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
    </div>
    <div class="flex items-center gap-2 md:gap-4 lg:gap-6">
      <div class="relative hidden xl:block">
        <span class="material-symbols-outlined absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-lg text-slate-500">search</span>
        <input
          type="text"
          :placeholder="$t('topbar.searchStaff')"
          class="w-64 rounded-lg border-none bg-slate-900 py-2 ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 text-xs text-white transition-all focus:ring-1 focus:ring-green-400/50"
        />
      </div>
      <div class="flex items-center gap-2 md:gap-4">
        <router-link
          to="/dashboard/subscription"
          class="pressable hidden items-center gap-2 rounded-lg bg-green-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-950 transition-colors hover:bg-green-300 md:inline-flex"
        >
          <span>{{ $t('topbar.upgradeNow') }}</span>
          <span class="material-symbols-outlined text-sm">bolt</span>
        </router-link>
        <button type="button" class="pressable hidden text-slate-400 transition-opacity hover:text-green-400 active:opacity-80 md:inline-flex">
          <span class="material-symbols-outlined">notifications</span>
        </button>
        <button type="button" class="pressable hidden text-slate-400 transition-opacity hover:text-green-400 active:opacity-80 md:inline-flex">
          <span class="material-symbols-outlined">analytics</span>
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

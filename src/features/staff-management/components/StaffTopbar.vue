<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

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
      'fixed top-0 ltr:right-0 ltr:left-auto rtl:left-0 rtl:right-auto z-40 flex h-20 items-center justify-between bg-slate-950/80 px-8 shadow-2xl shadow-green-900/5 backdrop-blur-xl transition-all duration-300',
      sidebarOpen ? 'w-[calc(100%-16rem)]' : 'w-full',
    ]"
  >
    <div class="flex items-center gap-4">
      <button
        type="button"
        class="pressable inline-flex h-9 w-9 items-center justify-center rounded border border-outline-variant/30 bg-surface-container-low text-slate-300 hover:text-primary-fixed"
        @click="$emit('toggle-sidebar')"
      >
        <span class="material-symbols-outlined text-lg">{{ sidebarOpen ? 'close' : 'menu' }}</span>
      </button>
      <h1 class="text-lg font-black uppercase tracking-widest text-white">{{ $t('topbar.staffAndRoleConfig') }}</h1>
      <span class="rounded border border-green-400/20 bg-green-400/10 px-2 py-0.5 text-[10px] font-bold text-green-400">
        {{ $t('topbar.liveOps') }}
      </span>
    </div>
    <div class="flex items-center gap-6">
      <div class="relative">
        <span class="material-symbols-outlined absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-lg text-slate-500">search</span>
        <input
          type="text"
          :placeholder="$t('topbar.searchStaff')"
          class="w-64 rounded-lg border-none bg-slate-900 py-2 ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 text-xs text-white transition-all focus:ring-1 focus:ring-green-400/50"
        />
      </div>
      <div class="flex items-center gap-4">
        <router-link
          to="/dashboard/subscription"
          class="pressable inline-flex items-center gap-2 rounded-lg bg-green-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-950 transition-colors hover:bg-green-300"
        >
          <span>{{ $t('topbar.upgradeNow') }}</span>
          <span class="material-symbols-outlined text-sm">bolt</span>
        </router-link>
        <button type="button" class="pressable text-slate-400 transition-opacity hover:text-green-400 active:opacity-80">
          <span class="material-symbols-outlined">notifications</span>
        </button>
        <button type="button" class="pressable text-slate-400 transition-opacity hover:text-green-400 active:opacity-80">
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
            <span>{{ currentLangLabel }}</span>
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

        <div class="h-10 w-10 rounded-full border-2 border-green-400/30 p-0.5">
          <img
            alt="Director Portrait"
            class="h-full w-full rounded-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-BzVYmJKXJdcA-qAHMZ14u0FG5WsdDVe0PNNiMVdD6H1qfiElHEyCs9_mFThkcCc1--9t34meTMf5M3OQyDnS-aski7rib1xPQJRTUQZbPfVzNdD_wOpR0_kGJHFyqYs2clLjswj6DfZcrBbprpt5yhZM7qg77kRdJVho1JL-6cwEKewRKArRO6P_VLdQLfUlD5WWzo4qf0yCOBgeHzd2l8Mx5oQi3xpgxEG-A4ethqK4_8olIpAwVTx_lv5-E21yrUzoFDv3nmM"
          />
        </div>
      </div>
    </div>
  </header>

  <!-- Click-away listener for language dropdown -->
  <div v-if="isLangDropdownOpen" class="fixed inset-0 z-30" @click="isLangDropdownOpen = false"></div>
</template>

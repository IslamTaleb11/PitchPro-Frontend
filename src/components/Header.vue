<template>
  <header class="bg-surface-container-high border-b border-outline-variant/60 px-4 py-3 md:px-6">
    <div class="mx-auto flex max-w-6xl items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="font-headline text-xl font-bold text-on-surface">PitchPro</h1>
        <span class="font-body text-xs tracking-[0.2em] text-primary-fixed">ELITE PERFORMANCE ANALYTICS</span>
      </div>
      <button
        @click="showLanguageModal = true"
        class="flex items-center gap-2 rounded-md bg-surface-container-low px-3 py-2 font-body text-sm text-on-surface hover:bg-surface-container-lowest"
      >
        <span>{{ currentLanguage }}</span>
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
    </div>

    <!-- Language Modal -->
    <div v-if="showLanguageModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click="showLanguageModal = false">
      <div class="rounded-lg bg-surface-container-high p-6 shadow-2xl" @click.stop>
        <h3 class="font-headline text-lg font-bold text-on-surface mb-4">{{ t('common.selectLanguage') }}</h3>
        <div class="space-y-2">
          <button
            @click="setLanguage('en')"
            class="w-full rounded bg-surface-container-low px-4 py-2 text-left font-body text-on-surface hover:bg-surface-container-lowest"
          >
            {{ t('languages.en') }}
          </button>
          <button
            @click="setLanguage('ar')"
            class="w-full rounded bg-surface-container-low px-4 py-2 text-left font-body text-on-surface hover:bg-surface-container-lowest"
          >
            {{ t('languages.ar') }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const showLanguageModal = ref(false)

const currentLanguage = computed(() => {
  return locale.value === 'en' ? 'EN' : 'AR'
})

const setLanguage = (lang) => {
  locale.value = lang
  showLanguageModal.value = false
}
</script>
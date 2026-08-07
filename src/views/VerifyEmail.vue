<script setup>
import { ref } from 'vue'
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { verifyEmail } from '../services/authService'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const token = ref(route.query.token || '')
const status = ref('verifying') // verifying | success | error
const message = ref('')

onMounted(async () => {
  if (!token.value) {
    status.value = 'error'
    message.value = t('verifyEmail.missingToken')
    return
  }

  try {
    const res = await verifyEmail(token.value)
    const data = res?.data
    message.value = data?.message || t('verifyEmail.successMessage')
    status.value = 'success'
  } catch (error) {
    status.value = 'error'
    message.value =
      error?.response?.data?.message || error?.response?.data || error?.message || t('verifyEmail.invalidLink')
  }
})

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 text-on-surface">
    <div
      class="pointer-events-none absolute inset-0"
      style="
        background-image:
          linear-gradient(to right, rgba(0, 230, 57, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 230, 57, 0.05) 1px, transparent 1px);
        background-size: 40px 40px;
      "
    />

    <div class="relative z-10 w-full max-w-md">
      <div class="mb-12 flex items-end gap-6">
        <div class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-surface-container-highest shadow-[0_0_30px_rgba(0,230,57,0.15)]">
          <img alt="PitchPro Club Logo" class="h-14 w-14 object-contain" src="/assets/club-logo.svg" />
        </div>
        <div class="flex-1 border-l-2 border-primary-fixed-dim pl-4">
          <h1 class="font-headline text-3xl font-bold tracking-tighter text-white">PitchPro</h1>
          <p class="font-headline text-xs font-medium uppercase tracking-[0.2em] text-primary-fixed">
            {{ t('verifyEmail.tagline') }}
          </p>
        </div>
      </div>

      <div class="rounded-lg border-t-2 border-primary-fixed-dim/30 bg-surface-container-low/80 p-8 shadow-2xl backdrop-blur-xl">
        <!-- Verifying -->
        <div v-if="status === 'verifying'" class="flex flex-col items-center gap-6 py-6 text-center">
          <span class="material-symbols-outlined animate-spin text-5xl text-primary-fixed-dim">progress_activity</span>
          <p class="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            {{ t('verifyEmail.verifying') }}
          </p>
        </div>

        <!-- Success -->
        <div v-else-if="status === 'success'" class="flex flex-col items-center gap-6 py-6 text-center">
          <div class="relative">
            <div class="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary-fixed-dim bg-primary-container/20">
              <span class="material-symbols-outlined text-5xl text-primary-fixed-dim">verified</span>
            </div>
          </div>
          <div class="space-y-3">
            <h2 class="font-headline text-2xl font-bold uppercase tracking-tight text-white">
              {{ t('verifyEmail.successTitle') }}
            </h2>
            <p class="text-sm text-on-surface-variant">{{ message }}</p>
          </div>
          <button
            type="button"
            class="pressable flex w-full items-center justify-center gap-2 rounded-md bg-linear-to-br from-primary to-primary-container p-px"
            @click="goToLogin"
          >
            <div class="flex w-full items-center justify-center gap-3 bg-primary-container py-4 transition-colors hover:bg-primary-fixed-dim">
              <span class="font-headline text-sm font-bold uppercase tracking-widest text-on-primary-container">
                {{ t('verifyEmail.goToLogin') }}
              </span>
              <span class="material-symbols-outlined text-[18px] font-bold text-on-primary-container">arrow_forward</span>
            </div>
          </button>
        </div>

        <!-- Error -->
        <div v-else class="flex flex-col items-center gap-6 py-6 text-center">
          <div class="flex h-24 w-24 items-center justify-center rounded-full border-2 border-red-400/40 bg-red-400/10">
            <span class="material-symbols-outlined text-5xl text-red-400">cancel</span>
          </div>
          <div class="space-y-3">
            <h2 class="font-headline text-2xl font-bold uppercase tracking-tight text-white">
              {{ t('verifyEmail.errorTitle') }}
            </h2>
            <p class="text-sm text-on-surface-variant">{{ message }}</p>
          </div>
          <button
            type="button"
            class="pressable w-full rounded-md border border-outline-variant/20 bg-surface-container-high py-4 transition-colors hover:bg-surface-container-highest"
            @click="goToLogin"
          >
            <span class="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant">
              {{ t('verifyEmail.goToLogin') }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
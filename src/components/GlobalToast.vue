<script setup>
import { useUiToast } from '../composables/useUiToast'

const { toastState } = useUiToast()
</script>

<template>
  <Teleport to="body">
    <Transition name="toast-pop">
      <div
        v-if="toastState.visible"
        :class="[
          'pointer-events-none fixed right-4 top-4 z-[200] w-[min(92vw,360px)] rounded-xl p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]',
          toastState.mode === 'error'
            ? 'border border-red-500/20 bg-red-600/95 text-white'
            : 'border border-outline-variant/60 bg-surface-container-high/95'
        ]"
      >
        <div class="flex items-start gap-3">
          <span
            v-if="toastState.mode === 'loading'"
            class="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary-fixed/30 border-t-primary-fixed"
          />
          <span
            v-else-if="toastState.mode === 'success'"
            class="material-symbols-outlined mt-0.5 text-primary-fixed"
          >
            check_circle
          </span>
          <span
            v-else-if="toastState.mode === 'error'"
            class="material-symbols-outlined mt-0.5 text-red-200"
          >
            error
          </span>
          <span v-else class="material-symbols-outlined mt-0.5 text-on-surface-variant">info</span>

          <div class="min-w-0">
            <p :class="['font-headline text-sm font-bold tracking-[0.02em]', toastState.mode === 'error' ? 'text-white' : 'text-on-surface']">
              {{ toastState.title }}
            </p>
            <p
              v-if="toastState.message"
              :class="['mt-1 font-body text-xs leading-relaxed', toastState.mode === 'error' ? 'text-white/90' : 'text-on-surface-variant']"
            >
              {{ toastState.message }}
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

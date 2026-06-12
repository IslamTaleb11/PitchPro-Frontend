<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'

const { t: $t } = useI18n()
const isSidebarOpen = ref(true)

defineProps({
  pageTitle: {
    type: String,
    default: 'Coming Soon'
  },
  pageSubtitle: {
    type: String,
    default: 'This feature is under development and will be available soon.'
  }
})
</script>

<template>
  <div class="min-h-screen bg-background text-on-background">
    <DashboardSidebar active-item="coming-soon" :is-open="isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      :class="[
        'pt-20 min-h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300 flex items-center justify-center',
        isSidebarOpen ? 'ms-64' : 'ms-0',
      ]"
    >
      <div class="text-center space-y-6 max-w-md">
        <div class="relative">
          <div class="h-32 w-32 rounded-full bg-surface-container-high border border-white/5 flex items-center justify-center mx-auto">
            <span class="material-symbols-outlined text-6xl text-neutral-700">construction</span>
          </div>
          <div class="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-primary-container/20 border border-primary-container/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-lg text-primary-container">schedule</span>
          </div>
        </div>

        <div class="space-y-3">
          <h1 class="text-4xl font-black font-display tracking-tighter text-white uppercase">
            {{ $t('comingSoon.title') }}
          </h1>
          <p class="text-neutral-400 text-sm font-body leading-relaxed">
            {{ $t('comingSoon.subtitle') }}
          </p>
        </div>

        <div class="flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/5 bg-surface-container-high">
          <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          <span class="text-[10px] font-black text-green-400 uppercase tracking-widest">{{ $t('comingSoon.status') }}</span>
        </div>
      </div>
    </main>
  </div>
</template>
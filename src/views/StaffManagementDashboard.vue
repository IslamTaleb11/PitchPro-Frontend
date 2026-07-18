<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import StaffCreationForm from '../features/staff-management/components/StaffCreationForm.vue'
import StaffStatsStrip from '../features/staff-management/components/StaffStatsStrip.vue'
import StaffDirectoryTable from '../features/staff-management/components/StaffDirectoryTable.vue'
import StaffInsightsCards from '../features/staff-management/components/StaffInsightsCards.vue'
import { useUiToast } from '../composables/useUiToast'

const { showToast } = useUiToast()
const { t: $t } = useI18n()
const isSidebarOpen = ref(true)
const staffTableRef = ref(null)
const staffStatsRef = ref(null)

async function onDeployStaff() {
  const results = await Promise.allSettled([
    staffTableRef.value?.reloadStaff(),
    staffStatsRef.value?.reloadCounts()
  ])

  const failed = results.filter(r => r.status === 'rejected')
  if (failed.length > 0) {
    showToast({
      title: $t('common.error'),
      message: $t('staffManagement.refreshError') || 'Failed to refresh staff data.',
      mode: 'error',
      duration: 4000
    })
  }
}
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-background text-on-background lg:flex lg:items-stretch">
    <DashboardSidebar active-item="staff-management" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      :class="[
        'pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300 lg:flex-1',
        'ml-0',
      ]"
    >
      <div class="grid grid-cols-12 items-start gap-6">
        <StaffCreationForm @deploy="onDeployStaff" />

        <section class="col-span-12 space-y-6 lg:col-span-7 xl:col-span-8">
          <StaffStatsStrip ref="staffStatsRef" />
          <StaffDirectoryTable ref="staffTableRef" @staff-updated="staffStatsRef?.reloadCounts()" />
          <StaffInsightsCards />
        </section>
      </div>
    </main>
  </div>
</template>

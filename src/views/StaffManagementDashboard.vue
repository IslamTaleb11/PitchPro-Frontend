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

async function onDeployStaff() {
  showToast({
    title: $t('common.deployingStaff'),
    message: $t('common.deployingStaffMsg'),
    mode: 'loading',
    duration: 30000
  })

  await new Promise(resolve => setTimeout(resolve, 2000))

  showToast({
    title: $t('common.staffCreated'),
    message: $t('common.staffCreatedMsg'),
    mode: 'success',
    duration: 2000
  })
}
</script>

<template>
  <div class="min-h-screen bg-background text-on-background">
    <DashboardSidebar active-item="staff-management" :is-open="isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      :class="[
        'pt-20 h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300',
        isSidebarOpen ? 'ml-64' : 'ml-0',
      ]"
    >
      <div class="grid grid-cols-12 items-start gap-6">
        <StaffCreationForm @deploy="onDeployStaff" />

        <section class="col-span-12 space-y-6 lg:col-span-7 xl:col-span-8">
          <StaffStatsStrip />
          <StaffDirectoryTable />
          <StaffInsightsCards />
        </section>
      </div>
    </main>
  </div>
</template>

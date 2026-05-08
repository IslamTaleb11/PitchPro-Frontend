<script setup>
import { ref } from 'vue'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import StaffCreationForm from '../features/staff-management/components/StaffCreationForm.vue'
import StaffStatsStrip from '../features/staff-management/components/StaffStatsStrip.vue'
import StaffDirectoryTable from '../features/staff-management/components/StaffDirectoryTable.vue'
import StaffInsightsCards from '../features/staff-management/components/StaffInsightsCards.vue'
import { useUiToast } from '../composables/useUiToast'

const { showToast } = useUiToast()
const isSidebarOpen = ref(true)

async function onDeployStaff() {
  // Simulate API call
  showToast({
    title: 'Deploying staff member',
    message: 'Provisioning profile, role access, and tactical permissions...',
    mode: 'loading',
    duration: 30000
  })

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000))

  showToast({
    title: 'Staff deployed',
    message: 'Personnel record was created successfully.',
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

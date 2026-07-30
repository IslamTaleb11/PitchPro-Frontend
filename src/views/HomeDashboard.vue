<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { useUiToast } from '../composables/useUiToast'
import { dashboardService } from '../services/dashboardService'
import { lookupService } from '../services/lookupService'
import { playerService } from '../services/playerService'
import { scheduleService } from '../services/scheduleService'

const { t } = useI18n()
const { showToast } = useUiToast()

const isSidebarOpen = ref(true)
const isLoading = ref(true)

const dashboardCounts = ref(null)
const categories = ref([])
const playersByCategory = ref({})
const upcomingEvents = ref([])

const totalPlayers = computed(() => dashboardCounts.value?.totalPlayers ?? 0)
const totalCategories = computed(() => dashboardCounts.value?.totalCategories ?? 0)
const totalStaff = computed(() => dashboardCounts.value?.totalActiveStaff ?? 0)
const totalMatches = computed(() => dashboardCounts.value?.totalMatches ?? 0)
const totalUpcomingMatches = computed(() => dashboardCounts.value?.totalUpcomingMatches ?? 0)
const totalTrainingSessions = computed(() => dashboardCounts.value?.totalTrainingSessions ?? 0)
const totalUpcomingTrainingSessions = computed(() => dashboardCounts.value?.totalUpcomingTrainingSessions ?? 0)

function normalizeLookupItem(item) {
  if (!item) return { id: 'Unknown', name: 'Unknown' }
  if (typeof item === 'string' || typeof item === 'number') return { id: item, name: String(item) }
  const idCandidates = ['id', 'Id', 'ID', 'value', 'categoryId', 'categoryID']
  const nameCandidates = ['name', 'Name', 'label', 'title', 'categoryName']
  let id = null
  let name = null
  for (const key of idCandidates) {
    if (item[key] !== undefined && item[key] !== null) { id = item[key]; break }
  }
  for (const key of nameCandidates) {
    if (item[key] !== undefined && item[key] !== null) { name = item[key]; break }
  }
  return { id: id ?? name ?? 'Unknown', name: name ?? String(id ?? 'Unknown') }
}

function normalizeLookupArray(data) {
  let array = data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    array = data.data || data.items || data.result || data.value || data.$values || []
  }
  if (!Array.isArray(array)) return []
  return array.map(normalizeLookupItem).filter((i) => i.id !== 'Unknown')
}

async function loadDashboard() {
  isLoading.value = true
  try {
    const [dashRes, catRes, schedRes] = await Promise.allSettled([
      dashboardService.getCounts(),
      lookupService.getCategories(),
      scheduleService.getUpcoming(1, 5),
    ])

    if (dashRes.status === 'fulfilled') {
      dashboardCounts.value = dashRes.value?.data ?? null
    }

    if (catRes.status === 'fulfilled') {
      const list = normalizeLookupArray(catRes.value?.data)
      categories.value = list
      const playerPromises = list.map(cat =>
        playerService.getPlayersByCategory(cat.id).then(r => ({ id: cat.id, data: r?.data })).catch(() => ({ id: cat.id, data: [] }))
      )
      const playerResults = await Promise.allSettled(playerPromises)
      const map = {}
      for (const result of playerResults) {
        if (result.status === 'fulfilled') {
          const { id, data } = result.value
          const raw = data?.data ?? data ?? []
          map[id] = Array.isArray(raw) ? raw : []
        }
      }
      playersByCategory.value = map
    }

    if (schedRes.status === 'fulfilled') {
      const raw = schedRes.value?.data?.data ?? schedRes.value?.data ?? []
      upcomingEvents.value = Array.isArray(raw) ? raw.slice(0, 5) : []
    }
  } catch {
    showToast({ title: t('common.error'), message: t('homeDashboard.loadError'), mode: 'error' })
  } finally {
    isLoading.value = false
  }
}

function normalizeDate(dateStr) {
  if (!dateStr) return '-'
  try { return new Date(dateStr).toLocaleDateString() } catch { return String(dateStr) }
}

function normalizeTime(timeStr) {
  if (!timeStr) return ''
  return String(timeStr).substring(0, 5)
}

onMounted(loadDashboard)
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <DashboardSidebar active-item="home" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main class="pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background transition-all duration-300 lg:flex-1">
      <div class="p-8">
        <div class="mb-8">
          <h1 class="font-headline text-4xl font-black text-on-surface tracking-tight uppercase leading-none">{{ t('homeDashboard.pageTitle') }}</h1>
          <p class="text-on-surface-variant font-medium text-sm mt-2 opacity-80">{{ t('homeDashboard.pageSubtitle') }}</p>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <span class="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">{{ t('homeDashboard.loading') }}</span>
        </div>

        <template v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-surface-container-low rounded-xl p-5 border-l-4 border-primary">
              <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black mb-1">{{ t('homeDashboard.totalPlayers') }}</p>
              <p class="text-3xl font-black text-on-surface font-headline">{{ totalPlayers }}</p>
              <p class="text-[10px] text-on-surface-variant mt-1">{{ totalCategories }} {{ t('homeDashboard.categories') }}</p>
            </div>
            <div class="bg-surface-container-low rounded-xl p-5 border-l-4 border-secondary">
              <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black mb-1">{{ t('homeDashboard.totalStaff') }}</p>
              <p class="text-3xl font-black text-on-surface font-headline">{{ totalStaff }}</p>
              <p class="text-[10px] text-on-surface-variant mt-1">
                {{ dashboardCounts?.totalCoachingStaff ?? 0 }} {{ t('homeDashboard.coaching') }} &middot;
                {{ dashboardCounts?.totalMedicalStaff ?? 0 }} {{ t('homeDashboard.medical') }} &middot;
                {{ dashboardCounts?.totalFitnessStaff ?? 0 }} {{ t('homeDashboard.fitness') }}
              </p>
            </div>
            <div class="bg-surface-container-low rounded-xl p-5 border-l-4 border-tertiary">
              <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black mb-1">{{ t('homeDashboard.totalMatches') }}</p>
              <p class="text-3xl font-black text-on-surface font-headline">{{ totalMatches }}</p>
              <p class="text-[10px] text-on-surface-variant mt-1">{{ totalUpcomingMatches }} {{ t('homeDashboard.upcoming') }}</p>
            </div>
            <div class="bg-surface-container-low rounded-xl p-5 border-l-4 border-error">
              <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black mb-1">{{ t('homeDashboard.totalTraining') }}</p>
              <p class="text-3xl font-black text-on-surface font-headline">{{ totalTrainingSessions }}</p>
              <p class="text-[10px] text-on-surface-variant mt-1">{{ totalUpcomingTrainingSessions }} {{ t('homeDashboard.upcoming') }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-surface-container-low rounded-xl p-6">
              <h2 class="text-sm font-black uppercase tracking-wider text-on-surface mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-lg">calendar_month</span>
                {{ t('homeDashboard.upcomingEvents') }}
              </h2>
              <div v-if="!upcomingEvents.length" class="text-center py-8 text-sm text-on-surface-variant font-bold uppercase tracking-wider">
                {{ t('homeDashboard.noUpcomingEvents') }}
              </div>
              <div v-else class="space-y-2">
                <div v-for="evt in upcomingEvents" :key="evt.id ?? evt.ID"
                  class="flex items-center gap-4 bg-surface-container-high rounded-lg px-4 py-3">
                  <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-primary text-lg">
                      {{ evt.eventClassification === 'Match' || evt.eventClassification === 'match' ? 'sports_soccer' : 'fitness_center' }}
                    </span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-on-surface uppercase truncate">{{ evt.title ?? evt.eventClassification ?? evt.eventTypeName ?? '-' }}</p>
                    <p class="text-[10px] text-on-surface-variant">{{ normalizeDate(evt.date ?? evt.Date) }} <span v-if="evt.startTime || evt.kickoffTime">{{ normalizeTime(evt.startTime ?? evt.kickoffTime) }}</span></p>
                  </div>
                  <span class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                    :class="evt.eventClassification === 'Match' || evt.eventClassification === 'match' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'">
                    {{ evt.eventClassification ?? (evt.eventTypeName ?? 'Event') }}
                  </span>
                </div>
              </div>
            </div>

            <div class="bg-surface-container-low rounded-xl p-6">
              <h2 class="text-sm font-black uppercase tracking-wider text-on-surface mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-lg">groups</span>
                {{ t('homeDashboard.squadOverview') }}
              </h2>
              <div v-if="!categories.length" class="text-center py-8 text-sm text-on-surface-variant font-bold uppercase tracking-wider">
                {{ t('homeDashboard.noCategories') }}
              </div>
              <div v-else class="space-y-2">
                <div v-for="cat in categories" :key="cat.id"
                  class="flex items-center justify-between bg-surface-container-high rounded-lg px-4 py-3">
                  <span class="text-xs font-bold text-on-surface uppercase">{{ cat.name }}</span>
                  <span class="text-xs font-black text-primary font-mono">{{ playersByCategory[cat.id]?.length ?? 0 }} {{ t('homeDashboard.players') }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { useUiToast } from '../composables/useUiToast'
import { lookupService } from '../services/lookupService'
import { trainingService } from '../services/trainingService'

const { t } = useI18n()
const { showToast } = useUiToast()

const isSidebarOpen = ref(true)

const categories = ref([])
const selectedCategory = ref('')
const sessions = ref([])
const isLoading = ref(false)
const isLoadingCategories = ref(false)

function normalizeLookupItem(item) {
  if (!item) return { id: 'Unknown', name: 'Unknown' }
  if (typeof item === 'string' || typeof item === 'number') return { id: item, name: String(item) }
  const idCandidates = ['id', 'Id', 'ID', 'value', 'categoryId', 'categoryID']
  const nameCandidates = ['name', 'Name', 'label', 'title', 'categoryName']
  let id = null
  let name = null
  for (const key of idCandidates) {
    if (item[key] !== undefined && item[key] !== null) {
      id = item[key]
      break
    }
  }
  for (const key of nameCandidates) {
    if (item[key] !== undefined && item[key] !== null) {
      name = item[key]
      break
    }
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

function normalizeDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString()
  } catch {
    return String(dateStr)
  }
}

const stats = computed(() => {
  const total = sessions.value.length
  const completed = sessions.value.filter(s => s.status === 'completed' || s.status === 'Completed').length
  return { total, completed, upcoming: total - completed }
})

async function loadCategories() {
  isLoadingCategories.value = true
  try {
    const response = await lookupService.getCategories()
    const list = normalizeLookupArray(response?.data)
    if (list.length) categories.value = list
  } catch {
    console.warn('Could not load categories')
  } finally {
    isLoadingCategories.value = false
  }
}

async function loadSessions() {
  if (!selectedCategory.value) return
  isLoading.value = true
  sessions.value = []
  try {
    const res = await trainingService.getSessionsByCategory(selectedCategory.value)
    const list = res?.data?.data ?? []
    sessions.value = Array.isArray(list)
      ? list.map((s) => ({
          id: s.id ?? s.ID,
          date: s.date ?? s.Date,
          sessionTypeName: s.sessionTypeName ?? s.SessionTypeName ?? '',
          focusArea: s.focusArea ?? s.FocusArea ?? '',
          duration: s.duration ?? s.Duration ?? 0,
          playersAttended: s.playersAttended ?? s.PlayersAttended ?? 0,
          status: s.status ?? s.Status ?? '',
        }))
      : []
  } catch {
    showToast({ title: t('trainingMonitor.loadErrorTitle'), message: t('trainingMonitor.loadErrorMsg'), mode: 'error' })
  } finally {
    isLoading.value = false
  }
}

onMounted(loadCategories)
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <DashboardSidebar active-item="training-monitor" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main class="pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background transition-all duration-300 lg:flex-1">
      <div class="flex gap-8 p-8">
        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="mb-8 flex items-start justify-between">
            <div>
              <h1 class="font-headline text-4xl font-black text-on-surface tracking-tight uppercase leading-none">{{ t('trainingMonitor.pageTitle') }}</h1>
              <p class="text-on-surface-variant font-medium text-sm mt-2 opacity-80">{{ t('trainingMonitor.pageSubtitle') }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('trainingMonitor.squadCategory') }}</label>
              <select v-model="selectedCategory" @change="loadSessions" class="bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider">
                <option value="" disabled>{{ t('trainingMonitor.selectCategory') }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>

          <div v-if="isLoading" class="flex items-center justify-center py-20">
            <span class="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">{{ t('trainingMonitor.loading') }}</span>
          </div>

          <div v-else-if="!selectedCategory" class="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span class="material-symbols-outlined text-5xl mb-4 opacity-30">fitness_center</span>
            <p class="text-sm font-bold uppercase tracking-wider">{{ t('trainingMonitor.selectCategoryPrompt') }}</p>
          </div>

          <div v-else-if="!sessions.length" class="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span class="material-symbols-outlined text-5xl mb-4 opacity-30">fitness_center</span>
            <p class="text-sm font-bold uppercase tracking-wider">{{ t('trainingMonitor.noSessions') }}</p>
          </div>

          <template v-else>
            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="bg-surface-container-high rounded-xl p-4 border-l-4 border-primary">
                <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black">{{ t('trainingMonitor.totalSessions') }}</p>
                <p class="text-2xl font-black text-on-surface font-mono mt-1">{{ stats.total }}</p>
              </div>
              <div class="bg-surface-container-high rounded-xl p-4 border-l-4 border-[#00ff41]">
                <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black">{{ t('trainingMonitor.completed') }}</p>
                <p class="text-2xl font-black text-[#00ff41] font-mono mt-1">{{ stats.completed }}</p>
              </div>
              <div class="bg-surface-container-high rounded-xl p-4 border-l-4 border-[#ffd601]">
                <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black">{{ t('trainingMonitor.upcoming') }}</p>
                <p class="text-2xl font-black text-[#ffd601] font-mono mt-1">{{ stats.upcoming }}</p>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto pb-8 no-scrollbar">
              <table class="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr class="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">
                    <th class="px-4 pb-2">{{ t('trainingMonitor.date') }}</th>
                    <th class="px-4 pb-2">{{ t('trainingMonitor.sessionType') }}</th>
                    <th class="px-4 pb-2">{{ t('trainingMonitor.focusArea') }}</th>
                    <th class="px-4 pb-2 text-center">{{ t('trainingMonitor.duration') }}</th>
                    <th class="px-4 pb-2 text-center">{{ t('trainingMonitor.attended') }}</th>
                    <th class="px-4 pb-2 text-center">{{ t('trainingMonitor.status') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in sessions" :key="s.id"
                    class="bg-surface-container-low/40 hover:bg-surface-container-low transition-colors group">
                    <td class="px-4 py-4 border-y border-l border-outline-variant/5 rounded-l whitespace-nowrap">
                      <span class="text-sm font-bold text-on-surface">{{ normalizeDate(s.date) }}</span>
                    </td>
                    <td class="px-4 py-4 border-y border-outline-variant/5">
                      <span class="text-sm font-bold text-on-surface uppercase">{{ s.sessionTypeName || '-' }}</span>
                    </td>
                    <td class="px-4 py-4 border-y border-outline-variant/5">
                      <span class="text-xs text-on-surface-variant font-medium">{{ s.focusArea || '-' }}</span>
                    </td>
                    <td class="px-4 py-4 border-y border-outline-variant/5 text-center">
                      <span class="text-sm font-black text-on-surface font-mono">{{ s.duration }}<span class="text-[10px] text-on-surface-variant font-bold ml-0.5">min</span></span>
                    </td>
                    <td class="px-4 py-4 border-y border-outline-variant/5 text-center">
                      <span class="text-sm font-black text-on-surface font-mono">{{ s.playersAttended }}</span>
                    </td>
                    <td class="px-4 py-4 border-y border-r border-outline-variant/5 rounded-r text-center">
                      <span class="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full inline-block"
                        :class="s.status === 'Completed' || s.status === 'completed' ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'bg-[#ffd601]/10 text-[#ffd601]'">
                        {{ s.status || '-' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>

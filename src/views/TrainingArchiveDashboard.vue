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

const page = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize.value)))

const selectedSession = ref(null)
const showDetailModal = ref(false)
const isLoadingDetail = ref(false)
const detailPlayers = ref([])
const detailPresent = computed(() => detailPlayers.value.filter(p => p.isAttended))
const detailAbsent = computed(() => detailPlayers.value.filter(p => !p.isAttended))
const activeDetailTab = ref('present')

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

function normalizeSession(raw) {
  if (!raw) return null
  return {
    id: raw.ID ?? raw.id,
    categoryID: raw.CategoryID ?? raw.categoryID,
    date: raw.Date ?? raw.date,
    sessionTypeName: raw.SessionTypeName ?? raw.sessionTypeName ?? '',
    focusArea: raw.FocusArea ?? raw.focusArea ?? '',
    duration: raw.Duration ?? raw.duration,
    playersAttended: raw.PlayersAttended ?? raw.playersAttended ?? 0,
    totalPlayers: raw.TotalPlayers ?? raw.totalPlayers ?? 0,
    status: raw.Status ?? raw.status ?? 'scheduled',
    location: raw.Location ?? raw.location ?? '',
    startTime: raw.StartTime ?? raw.startTime,
    endTime: raw.EndTime ?? raw.endTime,
  }
}

function normalizeDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString()
  } catch {
    return String(dateStr)
  }
}

function normalizeTime(timeStr) {
  if (!timeStr) return ''
  return String(timeStr).substring(0, 5)
}

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

async function loadSessions(newPage) {
  if (!selectedCategory.value) return
  if (newPage !== undefined) page.value = newPage
  isLoading.value = true
  sessions.value = []
  try {
    const res = await trainingService.getSessionsByCategory(selectedCategory.value)
    const body = res?.data
    const list = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : [])
    sessions.value = list.map(normalizeSession)
    totalCount.value = sessions.value.length
  } catch {
    sessions.value = []
    totalCount.value = 0
  } finally {
    isLoading.value = false
  }
}

const paginatedSessions = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sessions.value.slice(start, end)
})

function goToPage(p) {
  if (p < 1 || p > totalPages.value) return
  page.value = p
}

const visiblePages = computed(() => {
  const tp = totalPages.value
  const cp = page.value
  const pages = []
  const start = Math.max(1, cp - 2)
  const end = Math.min(tp, cp + 2)
  if (start > 1) pages.push(1)
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < tp - 1) pages.push('...')
  if (end < tp) pages.push(tp)
  return pages
})

function openDetail(session) {
  selectedSession.value = session
  showDetailModal.value = true
  activeDetailTab.value = 'present'
  loadDetailData(session.id)
}

function closeDetail() {
  showDetailModal.value = false
  selectedSession.value = null
  detailPlayers.value = []
}

async function loadDetailData(sessionId) {
  isLoadingDetail.value = true
  try {
    const res = await trainingService.getPlayersByCategory(selectedCategory.value, sessionId)
    const rawPlayers = res?.data?.data ?? []
    detailPlayers.value = Array.isArray(rawPlayers)
      ? rawPlayers.map((p) => ({
          id: p.playerID ?? p.PlayerID,
          name: p.playerName ?? p.PlayerName ?? '',
          position: p.positionName ?? p.PositionName ?? '',
          jersey: p.jerseyNumber ?? p.JerseyNumber ?? '',
          avatar: p.playerImage ?? p.PlayerImage ?? null,
          isAttended: p.isAttended === true || p.IsAttended === true || p.attended === true || p.Attended === true,
        }))
      : []
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || ''
    showToast({ title: t('trainingArchive.loadErrorTitle'), message: msg || t('trainingArchive.loadErrorMsg'), mode: 'error' })
    detailPlayers.value = []
  } finally {
    isLoadingDetail.value = false
  }
}

onMounted(loadCategories)
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <DashboardSidebar active-item="training-archive" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main class="pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background transition-all duration-300 lg:flex-1">
      <div class="flex gap-8 p-8">
        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="mb-8 flex items-start justify-between">
            <div>
              <h1 class="font-headline text-4xl font-black text-on-surface tracking-tight uppercase leading-none">{{ t('trainingArchive.pageTitle') }}</h1>
              <p class="text-on-surface-variant font-medium text-sm mt-2 opacity-80">{{ t('trainingArchive.pageSubtitle') }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('trainingArchive.squadCategory') }}</label>
              <select v-model="selectedCategory" @change="loadSessions(1)" class="bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider">
                <option value="" disabled>{{ t('trainingArchive.selectCategory') }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>

          <div v-if="isLoading" class="flex items-center justify-center py-20">
            <span class="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">{{ t('trainingArchive.loading') }}</span>
          </div>

          <div v-else-if="!selectedCategory" class="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span class="material-symbols-outlined text-5xl mb-4 opacity-30">database_search</span>
            <p class="text-sm font-bold uppercase tracking-wider">{{ t('trainingArchive.selectCategoryPrompt') }}</p>
          </div>

          <div v-else-if="!sessions.length" class="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span class="material-symbols-outlined text-5xl mb-4 opacity-30">fitness_center</span>
            <p class="text-sm font-bold uppercase tracking-wider">{{ t('trainingArchive.noSessions') }}</p>
          </div>

          <div v-else class="flex-1 flex flex-col overflow-hidden">
            <div class="flex-1 overflow-y-auto pb-4 no-scrollbar">
              <table class="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr class="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">
                    <th class="px-4 pb-2">{{ t('trainingArchive.date') }}</th>
                    <th class="px-4 pb-2">{{ t('trainingArchive.sessionType') }}</th>
                    <th class="px-4 pb-2">{{ t('trainingArchive.focusArea') }}</th>
                    <th class="px-4 pb-2 text-center">{{ t('trainingArchive.duration') }}</th>
                    <th class="px-4 pb-2 text-center">{{ t('trainingArchive.attendance') }}</th>
                    <th class="px-4 pb-2 text-center">{{ t('trainingArchive.status') }}</th>
                    <th class="px-4 pb-2 text-center">{{ t('trainingArchive.records') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in paginatedSessions" :key="s.id"
                    class="bg-surface-container-low/40 hover:bg-surface-container-low transition-colors group cursor-pointer"
                    @click="openDetail(s)">
                    <td class="px-4 py-4 border-y border-l border-outline-variant/5 rounded-l whitespace-nowrap">
                      <span class="text-xs font-bold text-on-surface">{{ normalizeDate(s.date) }}</span>
                      <span v-if="s.startTime" class="text-[10px] text-on-surface-variant font-mono ml-2">{{ normalizeTime(s.startTime) }}</span>
                    </td>
                    <td class="px-4 py-4 border-y border-outline-variant/5">
                      <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary">{{ s.sessionTypeName || '-' }}</span>
                    </td>
                    <td class="px-4 py-4 border-y border-outline-variant/5">
                      <span class="text-xs text-on-surface-variant font-medium">{{ s.focusArea || '-' }}</span>
                    </td>
                    <td class="px-4 py-4 border-y border-outline-variant/5 text-center">
                      <span class="text-xs font-bold text-on-surface font-mono">{{ s.duration ? s.duration + 'm' : '-' }}</span>
                    </td>
                    <td class="px-4 py-4 border-y border-outline-variant/5 text-center">
                      <span class="text-xs font-bold text-on-surface font-mono">{{ s.playersAttended }} / {{ s.totalPlayers }}</span>
                    </td>
                    <td class="px-4 py-4 border-y border-outline-variant/5 text-center">
                      <span v-if="s.status === 'completed'" class="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">{{ t('trainingArchive.completed') }}</span>
                      <span v-else class="text-[9px] font-black uppercase tracking-widest text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">{{ t('trainingArchive.scheduled') }}</span>
                    </td>
                    <td class="px-4 py-4 border-y border-r border-outline-variant/5 rounded-r text-center">
                      <button class="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-fixed px-3 py-1.5 rounded border border-primary/20 hover:border-primary/40 transition-all inline-flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">visibility</span>
                        {{ t('trainingArchive.viewRecords') }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="totalPages > 1" class="flex items-center justify-between border-t border-outline-variant/10 pt-4">
              <span class="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                {{ totalCount }} {{ t('trainingArchive.totalSessions') }}
              </span>
              <div class="flex items-center gap-1">
                <button @click="goToPage(page - 1)" :disabled="page <= 1"
                  class="flex items-center justify-center w-8 h-8 rounded text-[11px] font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-high text-on-surface-variant">
                  <span class="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <template v-for="p in visiblePages" :key="p">
                  <span v-if="p === '...'" class="px-2 text-[11px] text-on-surface-variant font-bold">...</span>
                  <button v-else @click="goToPage(p)"
                    class="flex items-center justify-center min-w-[32px] h-8 px-2 rounded text-[11px] font-bold transition-colors"
                    :class="p === page ? 'bg-primary text-black' : 'hover:bg-surface-container-high text-on-surface-variant'">
                    {{ p }}
                  </button>
                </template>
                <button @click="goToPage(page + 1)" :disabled="page >= totalPages"
                  class="flex items-center justify-center w-8 h-8 rounded text-[11px] font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-high text-on-surface-variant">
                  <span class="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <Teleport to="body">
    <div v-if="showDetailModal" class="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="closeDetail"></div>
      <div class="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-outline-variant/10 bg-surface-container-low shadow-2xl">
        <div v-if="isLoadingDetail" class="flex items-center justify-center py-20">
          <span class="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">{{ t('trainingArchive.loading') }}</span>
        </div>
        <template v-else-if="selectedSession">
          <div class="sticky top-0 z-10 flex items-center justify-between bg-surface-container-low border-b border-outline-variant/10 px-6 py-4">
            <div class="flex items-center gap-3">
              <span class="font-headline text-lg font-black uppercase text-on-surface">{{ selectedSession.sessionTypeName || t('trainingArchive.session') }}</span>
            </div>
            <button @click="closeDetail" class="flex items-center justify-center w-8 h-8 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="px-6 py-5 space-y-6">
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-surface-container-high rounded-xl p-4">
                <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black mb-1">{{ t('trainingArchive.date') }}</p>
                <p class="text-sm font-bold text-on-surface">{{ normalizeDate(selectedSession.date) }}</p>
                <p v-if="selectedSession.startTime" class="text-xs text-on-surface-variant font-mono">{{ normalizeTime(selectedSession.startTime) }} - {{ normalizeTime(selectedSession.endTime) }}</p>
              </div>
              <div class="bg-surface-container-high rounded-xl p-4">
                <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black mb-1">{{ t('trainingArchive.focusArea') }}</p>
                <p class="text-sm font-bold text-on-surface">{{ selectedSession.focusArea || '-' }}</p>
              </div>
              <div class="bg-surface-container-high rounded-xl p-4">
                <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black mb-1">{{ t('trainingArchive.duration') }}</p>
                <p class="text-sm font-black text-on-surface font-mono">{{ selectedSession.duration ? selectedSession.duration + ' min' : '-' }}</p>
              </div>
            </div>

            <div>
              <div class="flex gap-1 mb-4">
                <button @click="activeDetailTab = 'present'"
                  class="px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded transition-all"
                  :class="activeDetailTab === 'present' ? 'bg-primary text-black' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'">
                  {{ t('trainingArchive.presentPlayers') }} ({{ detailPresent.length }})
                </button>
                <button @click="activeDetailTab = 'absent'"
                  class="px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded transition-all"
                  :class="activeDetailTab === 'absent' ? 'bg-error text-white' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'">
                  {{ t('trainingArchive.absentPlayers') }} ({{ detailAbsent.length }})
                </button>
              </div>

              <div v-if="activeDetailTab === 'present'" class="space-y-1.5">
                <div v-if="!detailPresent.length" class="text-center py-8 text-sm text-on-surface-variant font-bold uppercase tracking-wider">
                  {{ t('trainingArchive.noPresentPlayers') }}
                </div>
                <div v-for="p in detailPresent" :key="p.id"
                  class="flex items-center gap-3 bg-surface-container-high rounded-lg px-4 py-3 border border-primary/10">
                  <div class="w-9 h-9 rounded-full border-2 border-primary/30 overflow-hidden shrink-0 bg-surface-container-highest">
                    <img v-if="p.avatar" :src="p.avatar" :alt="p.name" class="w-full h-full object-cover">
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-on-surface uppercase truncate">{{ p.name }}</p>
                    <p class="text-[10px] text-on-surface-variant font-medium">{{ p.position }} • #{{ p.jersey }}</p>
                  </div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">{{ t('trainingArchive.present') }}</span>
                </div>
              </div>

              <div v-if="activeDetailTab === 'absent'" class="space-y-1.5">
                <div v-if="!detailAbsent.length" class="text-center py-8 text-sm text-on-surface-variant font-bold uppercase tracking-wider">
                  {{ t('trainingArchive.noAbsentPlayers') }}
                </div>
                <div v-for="p in detailAbsent" :key="p.id"
                  class="flex items-center gap-3 bg-surface-container-high rounded-lg px-4 py-3 border border-error/10">
                  <div class="w-9 h-9 rounded-full border-2 border-error/30 overflow-hidden shrink-0 bg-surface-container-highest">
                    <img v-if="p.avatar" :src="p.avatar" :alt="p.name" class="w-full h-full object-cover">
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-on-surface uppercase truncate">{{ p.name }}</p>
                    <p class="text-[10px] text-on-surface-variant font-medium">{{ p.position }} • #{{ p.jersey }}</p>
                  </div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-error bg-error/10 px-3 py-1 rounded-full">{{ t('trainingArchive.absent') }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
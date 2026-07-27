<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { useUiToast } from '../composables/useUiToast'
import { lookupService } from '../services/lookupService'
import { matchService } from '../services/matchService'
import { playerService } from '../services/playerService'

const { t } = useI18n()
const { showToast } = useUiToast()

const isSidebarOpen = ref(true)

const categories = ref([])
const selectedCategory = ref('')
const matches = ref([])
const isLoading = ref(false)
const isLoadingCategories = ref(false)

const selectedMatch = ref(null)
const showDetailModal = ref(false)
const isLoadingDetail = ref(false)
const detailPlayers = ref([])
const detailEvents = ref([])
const detailPresent = computed(() => detailPlayers.value.filter(p => p.status === 'present' || p.isAlreadyAttended))
const detailAbsent = computed(() => detailPlayers.value.filter(p => p.status === 'absent'))
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

function normalizeDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString()
  } catch {
    return dateStr
  }
}

function normalizeTime(timeStr) {
  if (!timeStr) return ''
  return timeStr
}

async function loadCategories() {
  isLoadingCategories.value = true
  try {
    const response = await lookupService.getCategories()
    const list = normalizeLookupArray(response?.data)
    if (list.length) categories.value = list
  } catch (e) {
    console.warn('Could not load categories', e)
  } finally {
    isLoadingCategories.value = false
  }
}

async function loadMatches() {
  if (!selectedCategory.value) return
  isLoading.value = true
  matches.value = []
  try {
    const res = await matchService.getCompletedMatchesByCategory(selectedCategory.value)
    const list = res?.data?.data ?? []
    matches.value = list
  } catch {
    matches.value = []
  } finally {
    isLoading.value = false
  }
}

function openDetail(match) {
  selectedMatch.value = match
  showDetailModal.value = true
  activeDetailTab.value = 'present'
  loadDetailData(match.id)
}

function closeDetail() {
  showDetailModal.value = false
  selectedMatch.value = null
  detailPlayers.value = []
  detailEvents.value = []
}

async function loadDetailData(matchId) {
  isLoadingDetail.value = true
  try {
    const [playersRes, eventsRes] = await Promise.all([
      playerService.getMatchCallUpPlayersByCategory(selectedCategory.value, matchId),
      matchService.getMatchEvents(matchId),
    ])
    const rawPlayers = playersRes?.data ?? []
    const list = Array.isArray(rawPlayers)
      ? rawPlayers.map((p) => ({
          id: p.PlayerID ?? p.playerID ?? p.id ?? p.Id,
          name: p.PlayerName ?? p.playerName ?? p.FullName ?? p.fullName ?? p.name ?? '',
          position: p.PositionName ?? p.positionName ?? p.position ?? '',
          jersey: p.JerseyNumber ?? p.jerseyNumber ?? p.jersey ?? '',
          avatar: p.PlayerImage ?? p.playerImage ?? p.photo ?? p.Photo ?? '',
          isAlreadyAttended: !!(p.isAlreadyAttended ?? p.IsAlreadyAttended ?? false),
          isAbsent: !!(p.isAbsent ?? p.IsAbsent ?? false),
          status: (p.recordedStatus ?? p.RecordedStatus) || (p.isAbsent ?? p.IsAbsent ? 'absent' : p.isAlreadyAttended ?? p.IsAlreadyAttended ? 'present' : null),
        }))
      : []
    detailPlayers.value = list

    const rawEvents = eventsRes?.data ?? []
    detailEvents.value = Array.isArray(rawEvents)
      ? rawEvents.map((e) => ({
          id: e.eventID ?? e.EventID,
          minute: e.eventAt ?? e.EventAt,
          eventTypeName: e.eventName ?? e.EventName,
          playerName: e.name ?? e.Name,
        }))
      : []
  } catch {
    showToast({ title: t('matchArchive.loadErrorTitle'), message: t('matchArchive.loadErrorMsg'), mode: 'error' })
    detailPlayers.value = []
    detailEvents.value = []
  } finally {
    isLoadingDetail.value = false
  }
}

onMounted(loadCategories)
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <DashboardSidebar active-item="match-archive" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main class="pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background transition-all duration-300 lg:flex-1">
      <div class="flex gap-8 p-8">
        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="mb-8 flex items-start justify-between">
            <div>
              <h1 class="font-headline text-4xl font-black text-on-surface tracking-tight uppercase leading-none">{{ t('matchArchive.pageTitle') }}</h1>
              <p class="text-on-surface-variant font-medium text-sm mt-2 opacity-80">{{ t('matchArchive.pageSubtitle') }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('matchArchive.squadCategory') }}</label>
              <select v-model="selectedCategory" @change="loadMatches" class="bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider">
                <option value="" disabled>{{ t('matchArchive.selectCategory') }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>

          <div v-if="isLoading" class="flex items-center justify-center py-20">
            <span class="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">{{ t('matchArchive.loading') }}</span>
          </div>

          <div v-else-if="!selectedCategory" class="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span class="material-symbols-outlined text-5xl mb-4 opacity-30">database_search</span>
            <p class="text-sm font-bold uppercase tracking-wider">{{ t('matchArchive.selectCategoryPrompt') }}</p>
          </div>

          <div v-else-if="!matches.length" class="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span class="material-symbols-outlined text-5xl mb-4 opacity-30">history</span>
            <p class="text-sm font-bold uppercase tracking-wider">{{ t('matchArchive.noMatches') }}</p>
          </div>

          <div v-else class="flex-1 overflow-y-auto pb-8 no-scrollbar">
            <table class="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr class="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">
                  <th class="px-4 pb-2">{{ t('matchArchive.opponent') }}</th>
                  <th class="px-4 pb-2">{{ t('matchArchive.date') }}</th>
                  <th class="px-4 pb-2 text-center">{{ t('matchArchive.result') }}</th>
                  <th class="px-4 pb-2">{{ t('matchArchive.stadium') }}</th>
                  <th class="px-4 pb-2 text-center">{{ t('matchArchive.records') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in matches" :key="m.id"
                  class="bg-surface-container-low/40 hover:bg-surface-container-low transition-colors group cursor-pointer"
                  @click="openDetail(m)">
                  <td class="px-4 py-4 border-y border-l border-outline-variant/5 rounded-l">
                    <div class="flex items-center gap-3">
                      <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
                        :class="m.isHome ? 'bg-primary/10 text-primary' : 'bg-surface-container-highest text-on-surface-variant'">
                        {{ m.isHome ? t('callUp.home') : t('callUp.away') }}
                      </span>
                      <span class="font-headline font-bold text-on-surface text-sm uppercase">{{ m.opponentName || t('callUp.tbd') }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-4 border-y border-outline-variant/5 whitespace-nowrap">
                    <span class="text-xs font-bold text-on-surface">{{ normalizeDate(m.date) }}</span>
                    <span v-if="m.kickoffTime" class="text-[10px] text-on-surface-variant font-mono ml-2">{{ m.kickoffTime }}</span>
                  </td>
                  <td class="px-4 py-4 border-y border-outline-variant/5 text-center">
                    <span class="inline-flex items-center gap-2 text-xs font-black">
                      <span v-if="m.homeScore !== undefined && m.awayScore !== undefined" class="text-on-surface">
                        {{ m.homeScore }} – {{ m.awayScore }}
                      </span>
                      <span v-else class="text-on-surface-variant text-[10px]">–</span>
                    </span>
                  </td>
                  <td class="px-4 py-4 border-y border-outline-variant/5">
                    <span class="text-xs text-on-surface-variant font-medium">{{ m.stadiumName || '-' }}</span>
                  </td>
                  <td class="px-4 py-4 border-y border-r border-outline-variant/5 rounded-r text-center">
                    <button class="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-fixed px-3 py-1.5 rounded border border-primary/20 hover:border-primary/40 transition-all inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-sm">visibility</span>
                      {{ t('matchArchive.viewRecords') }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
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
          <span class="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">{{ t('matchArchive.loading') }}</span>
        </div>
        <template v-else-if="selectedMatch">
          <div class="sticky top-0 z-10 flex items-center justify-between bg-surface-container-low border-b border-outline-variant/10 px-6 py-4">
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
                :class="selectedMatch.isHome ? 'bg-primary/10 text-primary' : 'bg-surface-container-highest text-on-surface-variant'">
                {{ selectedMatch.isHome ? t('callUp.home') : t('callUp.away') }}
              </span>
              <span class="font-headline text-lg font-black uppercase text-on-surface">{{ selectedMatch.opponentName || t('callUp.tbd') }}</span>
            </div>
            <button @click="closeDetail" class="flex items-center justify-center w-8 h-8 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="px-6 py-5 space-y-6">
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-surface-container-high rounded-xl p-4">
                <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black mb-1">{{ t('matchArchive.date') }}</p>
                <p class="text-sm font-bold text-on-surface">{{ normalizeDate(selectedMatch.date) }}</p>
                <p v-if="selectedMatch.kickoffTime" class="text-xs text-on-surface-variant font-mono">{{ normalizeTime(selectedMatch.kickoffTime) }}</p>
              </div>
              <div class="bg-surface-container-high rounded-xl p-4">
                <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black mb-1">{{ t('matchArchive.stadium') }}</p>
                <p class="text-sm font-bold text-on-surface">{{ selectedMatch.stadiumName || '-' }}</p>
              </div>
              <div class="bg-surface-container-high rounded-xl p-4">
                <p class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black mb-1">{{ t('matchArchive.result') }}</p>
                <p class="text-sm font-black text-on-surface">
                  <span v-if="selectedMatch.homeScore !== undefined && selectedMatch.awayScore !== undefined">
                    {{ selectedMatch.homeScore }} – {{ selectedMatch.awayScore }}
                  </span>
                  <span v-else class="text-on-surface-variant">-</span>
                </p>
              </div>
            </div>

            <div>
              <div class="flex gap-1 mb-4">
                <button @click="activeDetailTab = 'present'"
                  class="px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded transition-all"
                  :class="activeDetailTab === 'present' ? 'bg-primary text-black' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'">
                  {{ t('matchArchive.presentPlayers') }} ({{ detailPresent.length }})
                </button>
                <button @click="activeDetailTab = 'absent'"
                  class="px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded transition-all"
                  :class="activeDetailTab === 'absent' ? 'bg-error text-white' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'">
                  {{ t('matchArchive.absentPlayers') }} ({{ detailAbsent.length }})
                </button>
                <button @click="activeDetailTab = 'events'"
                  class="px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded transition-all"
                  :class="activeDetailTab === 'events' ? 'bg-primary-container text-black' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'">
                  {{ t('matchArchive.matchEvents') }} ({{ detailEvents.length }})
                </button>
              </div>

              <div v-if="activeDetailTab === 'present'" class="space-y-1.5">
                <div v-if="!detailPresent.length" class="text-center py-8 text-sm text-on-surface-variant font-bold uppercase tracking-wider">
                  {{ t('matchArchive.noPresentPlayers') }}
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
                  <span class="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">{{ t('matchArchive.present') }}</span>
                </div>
              </div>

              <div v-if="activeDetailTab === 'absent'" class="space-y-1.5">
                <div v-if="!detailAbsent.length" class="text-center py-8 text-sm text-on-surface-variant font-bold uppercase tracking-wider">
                  {{ t('matchArchive.noAbsentPlayers') }}
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
                  <span class="text-[10px] font-black uppercase tracking-widest text-error bg-error/10 px-3 py-1 rounded-full">{{ t('matchArchive.absent') }}</span>
                </div>
              </div>

              <div v-if="activeDetailTab === 'events'" class="space-y-1.5">
                <div v-if="!detailEvents.length" class="text-center py-8 text-sm text-on-surface-variant font-bold uppercase tracking-wider">
                  {{ t('matchArchive.noEvents') }}
                </div>
                <div v-for="evt in detailEvents" :key="evt.id"
                  class="flex items-center gap-3 bg-surface-container-high rounded-lg px-4 py-3 border border-outline-variant/10">
                  <span class="font-mono text-sm font-black text-primary min-w-[40px]">{{ evt.minute }}'</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <span class="flex-1 text-sm font-bold text-on-surface">{{ evt.eventTypeName }}</span>
                  <span class="text-xs text-on-surface-variant font-medium">{{ evt.playerName }}</span>
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

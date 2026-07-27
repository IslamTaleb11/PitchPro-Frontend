<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { useUiToast } from '../composables/useUiToast'
import { lookupService } from '../services/lookupService'
import { trainingService } from '../services/trainingService'

const { t } = useI18n()
const { showToast } = useUiToast()

const POSITION_GROUPS = {
  'callUp.posGoalkeeper': ['goalkeeper', 'keeper', 'gk'],
  'callUp.posCentreBack': ['centre back', 'center back', 'cb', 'lcb', 'rcb'],
  'callUp.posLeftBack': ['left back', 'lb'],
  'callUp.posRightBack': ['right back', 'rb'],
  'callUp.posSweeper': ['sweeper', 'sw', 'libero'],
  'callUp.posLeftWingBack': ['left wing back', 'left wing-back', 'lwb'],
  'callUp.posRightWingBack': ['right wing back', 'right wing-back', 'rwb'],
  'callUp.posFullBack': ['full back', 'fb'],
  'callUp.posDefender': ['defender', 'defence', 'defense', 'back', 'df'],
  'callUp.posDefensiveMidfielder': ['defensive midfielder', 'defensive midfield', 'dm', 'cdm'],
  'callUp.posCentralMidfielder': ['central midfielder', 'centre midfielder', 'cm'],
  'callUp.posAttackingMidfielder': ['attacking midfielder', 'attacking midfield', 'am', 'cam'],
  'callUp.posLeftMidfielder': ['left midfielder', 'lm'],
  'callUp.posRightMidfielder': ['right midfielder', 'rm'],
  'callUp.posWideMidfielder': ['wide midfielder', 'wm'],
  'callUp.posMidfielder': ['midfielder', 'midfield', 'mf'],
  'callUp.posStriker': ['striker', 'st', 'cf'],
  'callUp.posCentreForward': ['centre forward', 'center forward'],
  'callUp.posSecondStriker': ['second striker', 'ss'],
  'callUp.posLeftWinger': ['left winger', 'left wing', 'lw'],
  'callUp.posRightWinger': ['right winger', 'right wing', 'rw'],
  'callUp.posForward': ['forward', 'fw', 'attacker'],
}
const POSITION_KEYS = Object.fromEntries(
  Object.entries(POSITION_GROUPS).flatMap(([key, names]) => names.map((n) => [n, key]))
)
function localizePosition(raw) {
  const name = String(raw ?? '').trim().toLowerCase()
  if (!name) return ''
  const key = POSITION_KEYS[name]
  return key ? t(key) : raw
}

const isSidebarOpen = ref(true)
const startupModalOpen = ref(true)
const isLoadingCategories = ref(false)
const isLoadingSessions = ref(false)
const isLoadingPlayers = ref(false)
const savingAttendance = ref(false)

const categories = ref([])
const selectedCategory = ref('')
const sessions = ref([])
const selectedSession = ref(null)
const players = ref([])
const playerStatuses = ref({})

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

const playersForTable = computed(() =>
  players.value.map((p) => {
    const localStatus = playerStatuses.value[p.id] ?? null
    return {
      ...p,
      status: localStatus !== null ? localStatus : p.recordedStatus,
      isLocallyChanged: localStatus !== null,
    }
  })
)

const presentCount = computed(() => playersForTable.value.filter((p) => p.status === 'present').length)
const absentCount = computed(() => playersForTable.value.filter((p) => p.status === 'absent').length)
const totalEligible = computed(() => players.value.length)

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

async function onCategoryChange() {
  selectedSession.value = null
  sessions.value = []
  if (!selectedCategory.value) return
  isLoadingSessions.value = true
  try {
    const res = await trainingService.getSessionsByCategory(selectedCategory.value)
    const list = res?.data?.data ?? []
    sessions.value = Array.isArray(list)
      ?         list.map((s) => ({
          id: s.id ?? s.ID,
          date: s.date ?? s.Date,
          sessionTypeName: s.sessionTypeName ?? s.SessionTypeName ?? '',
          location: s.location ?? s.Location ?? '',
          startTime: s.startTime ?? s.StartTime ?? '',
          endTime: s.endTime ?? s.EndTime ?? '',
          focusArea: s.focusArea ?? s.FocusArea ?? '',
          duration: s.duration ?? s.Duration ?? 0,
          playersAttended: s.playersAttended ?? s.PlayersAttended ?? 0,
          status: s.status ?? s.Status ?? '',
        }))
      : []
  } catch {
    sessions.value = []
  } finally {
    isLoadingSessions.value = false
  }
}

async function startSession() {
  if (!selectedCategory.value) {
    showToast({ title: t('trainingMonitor.selectionRequiredTitle'), message: t('trainingMonitor.selectionRequiredMsg'), mode: 'error' })
    return
  }
  if (!selectedSession.value) {
    showToast({ title: t('trainingMonitor.selectionRequiredTitle'), message: t('trainingMonitor.noSessionSelected'), mode: 'error' })
    return
  }
  startupModalOpen.value = false
  await loadPlayers()
}

async function loadPlayers() {
  isLoadingPlayers.value = true
  try {
    const res = await trainingService.getPlayersByCategory(selectedCategory.value)
    const raw = res?.data?.data ?? res?.data ?? []
    const list = Array.isArray(raw) ? raw : []
    players.value = list.map((p) => ({
      id: p.playerID ?? p.PlayerID ?? p.id,
      name: p.playerName ?? p.PlayerName ?? p.fullName ?? '',
      jersey: p.jerseyNumber ?? p.JerseyNumber ?? '',
      image: p.playerImage ?? p.PlayerImage ?? null,
      positionName: p.positionName ?? p.PositionName ?? null,
      recordedStatus: null,
    }))
    playerStatuses.value = {}
  } catch {
    players.value = []
    showToast({ title: t('trainingMonitor.errorTitle'), message: t('trainingMonitor.loadPlayersError'), mode: 'error' })
  } finally {
    isLoadingPlayers.value = false
  }
}

function handleCategoryChange() {
  selectedSession.value = null
  sessions.value = []
  if (!startupModalOpen.value) {
    players.value = []
    playerStatuses.value = {}
    startupModalOpen.value = true
  }
}

function updateStatus(playerId, type) {
  playerStatuses.value = { ...playerStatuses.value, [playerId]: type }
}

async function saveAttendance() {
  const changed = Object.keys(playerStatuses.value)
  if (!changed.length) {
    showToast({ title: t('trainingMonitor.noChanges'), mode: 'info' })
    return
  }
  savingAttendance.value = true
  try {
    const attendanceMap = {}
    changed.forEach((pid) => {
      attendanceMap[pid] = playerStatuses.value[pid] === 'present'
    })
    await trainingService.saveAttendance(selectedSession.value.id, attendanceMap)
    showToast({ title: t('trainingMonitor.saveSuccess'), mode: 'success' })
    changed.forEach((pid) => {
      const p = players.value.find((x) => x.id === Number(pid))
      if (p) p.recordedStatus = playerStatuses.value[pid]
    })
    playerStatuses.value = {}
  } catch {
    showToast({ title: t('trainingMonitor.saveError'), mode: 'error' })
  } finally {
    savingAttendance.value = false
  }
}

watch(startupModalOpen, (open) => {
  if (open && selectedCategory.value) {
    onCategoryChange()
  }
})

onMounted(loadCategories)
</script>

<template>
  <!-- Startup modal -->
  <div v-if="startupModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <div class="w-full max-w-lg rounded-3xl bg-surface-container-lowest border border-outline-variant/10 p-8 shadow-2xl">
      <h2 class="font-headline text-2xl font-black uppercase tracking-tighter text-on-surface">{{ t('trainingMonitor.selectSessionTitle') }}</h2>
      <p class="mt-2 text-sm text-on-surface-variant">{{ t('trainingMonitor.selectSessionDesc') }}</p>
      <div class="mt-8 space-y-2">
        <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('trainingMonitor.squadCategory') }}</label>
        <select v-model="selectedCategory" @change="onCategoryChange" class="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface text-sm rounded px-4 py-3 focus:ring-1 focus:ring-primary-fixed">
          <option value="" disabled>{{ t('trainingMonitor.selectCategory') }}</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>

      <div v-if="selectedCategory" class="mt-6">
        <p class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black mb-3">{{ t('trainingMonitor.availableSessions') }}</p>
        <div v-if="isLoadingSessions" class="flex items-center justify-center py-6">
          <span class="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">{{ t('trainingMonitor.loading') }}</span>
        </div>
        <div v-else-if="sessions.length" class="space-y-2 max-h-64 overflow-y-auto sessions-scroll">
          <div v-for="s in sessions" :key="s.id"
            @click="selectedSession = s"
            class="flex items-center gap-4 p-4 rounded border cursor-pointer transition-all"
            :class="selectedSession?.id === s.id ? 'bg-primary-container/20 border-primary/40' : 'bg-surface-container-high border-outline-variant/10 hover:border-outline-variant/30'">
            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" :class="selectedSession?.id === s.id ? 'border-primary' : 'border-outline-variant/30'">
              <div v-if="selectedSession?.id === s.id" class="w-2.5 h-2.5 rounded-full bg-primary"></div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-headline font-black text-on-surface text-sm uppercase leading-tight truncate">{{ s.sessionTypeName || t('trainingMonitor.session') }}</p>
              <p class="text-[11px] text-on-surface-variant font-medium">{{ normalizeDate(s.date) }}</p>
              <p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-tight">
                <span v-if="s.location">{{ s.location }}</span>
                <span v-if="s.startTime"> • {{ s.startTime }}</span>
                <span v-if="s.endTime"> – {{ s.endTime }}</span>
              </p>
            </div>
            <span class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded shrink-0"
              :class="s.status === 'Completed' || s.status === 'completed' ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'bg-surface-container-highest text-on-surface-variant'">{{ s.status || t('trainingMonitor.scheduled') }}</span>
          </div>
        </div>
        <div v-else class="bg-surface-container-high rounded border border-outline-variant/10 p-5 text-center">
          <p class="text-[11px] text-on-surface-variant font-bold">{{ t('trainingMonitor.noSessions') }}</p>
        </div>
      </div>

      <div class="mt-8 flex items-center justify-between">
        <button @click="startSession" :disabled="!selectedSession" class="w-full sm:w-auto bg-primary-container text-on-primary-container text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded shadow-lg hover:brightness-110 transition-all disabled:opacity-50">
          {{ t('trainingMonitor.startSession') }}
        </button>
        <p class="text-[11px] text-on-surface-variant">{{ selectedSession ? t('trainingMonitor.ready') : (selectedCategory ? t('trainingMonitor.selectSession') : t('trainingMonitor.selectRequired')) }}</p>
      </div>
    </div>
  </div>

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
            <div class="flex gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('trainingMonitor.squadCategory') }}</label>
                <select v-model="selectedCategory" @change="handleCategoryChange" class="bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider">
                  <option value="" disabled>{{ t('trainingMonitor.selectCategory') }}</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Session Details Card -->
          <div v-if="selectedSession" class="bg-surface-container-high rounded-xl p-5 mb-4 border-l-4 border-primary relative overflow-hidden">
            <div class="flex items-center gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-2">
                  <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{{ t('trainingMonitor.currentSession') }}</span>
                  <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    :class="selectedSession.status === 'Completed' || selectedSession.status === 'completed' ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'bg-surface-container-highest text-on-surface-variant'">{{ selectedSession.status || t('trainingMonitor.scheduled') }}</span>
                </div>
                <div class="font-headline text-xl md:text-2xl font-black text-on-surface uppercase truncate">{{ selectedSession.sessionTypeName || t('trainingMonitor.session') }}</div>
              </div>
              <div class="flex items-center gap-6 text-xs text-on-surface-variant shrink-0">
                <span v-if="selectedSession.date" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-primary text-sm">calendar_today</span>
                  <span class="font-bold">{{ normalizeDate(selectedSession.date) }}</span>
                </span>
                <span v-if="selectedSession.duration" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-primary text-sm">schedule</span>
                  <span class="font-bold">{{ selectedSession.duration }} min</span>
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2 ml-auto shrink-0 mt-3">
              <button @click="startupModalOpen = true" class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded border border-outline-variant/20 hover:border-outline-variant/40 transition-all flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">swap_horiz</span> {{ t('trainingMonitor.changeSession') }}
              </button>
            </div>
          </div>

          <!-- Player list -->
          <div v-if="selectedSession">
            <div v-if="isLoadingPlayers" class="flex items-center justify-center py-16">
              <span class="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">{{ t('trainingMonitor.loading') }}</span>
            </div>
            <div v-else-if="players.length">
              <!-- Summary -->
              <div class="flex items-center gap-4 mb-4 p-4 bg-surface-container-high rounded-xl border border-outline-variant/10">
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">{{ t('trainingMonitor.attendanceSummary') }}</span>
                <span class="text-xs font-black text-[#00ff41] flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[#00ff41]"></span>{{ t('trainingMonitor.presentCount') }} {{ presentCount }}</span>
                <span class="text-xs font-black text-[#ff4141] flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[#ff4141]"></span>{{ t('trainingMonitor.absentCount') }} {{ absentCount }}</span>
                <span class="text-xs font-black text-on-surface-variant flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-on-surface-variant"></span>{{ t('trainingMonitor.totalEligible') }} {{ totalEligible }}</span>
                <div class="ml-auto">
                  <button @click="saveAttendance" :disabled="savingAttendance"
                    class="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded transition-all"
                    :class="savingAttendance ? 'bg-surface-container-highest text-on-surface-variant/50' : 'bg-primary-container text-black hover:brightness-110'">
                    {{ savingAttendance ? t('trainingMonitor.saving') : t('trainingMonitor.saveAttendance') }}
                  </button>
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black border-b border-outline-variant/10">
                      <th class="py-3 px-2">{{ t('trainingMonitor.jersey') }}</th>
                      <th class="py-3 px-2">{{ t('trainingMonitor.player') }}</th>
                      <th class="py-3 px-2 hidden sm:table-cell">{{ t('trainingMonitor.position') }}</th>
                      <th class="py-3 px-2 text-center">{{ t('trainingMonitor.status') }}</th>
                      <th class="py-3 px-2 text-center">{{ t('trainingMonitor.present') }}</th>
                      <th class="py-3 px-2 text-center">{{ t('trainingMonitor.absent') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="p in playersForTable" :key="p.id"
                      class="border-b border-outline-variant/5 hover:bg-surface-container-high/50 transition-colors text-sm"
                      :class="{ 'opacity-40': p.status === 'absent' }">
                      <td class="py-3 px-2 font-black text-on-surface">{{ p.jersey }}</td>
                      <td class="py-3 px-2">
                        <div class="flex items-center gap-3">
                          <div class="w-9 h-9 rounded-full bg-surface-container-highest overflow-hidden shrink-0 flex items-center justify-center border border-outline-variant/10">
                            <img v-if="p.image" :src="p.image" class="w-full h-full object-cover" alt="" />
                            <span v-else class="material-symbols-outlined text-on-surface-variant text-lg">person</span>
                          </div>
                          <div>
                            <p class="font-bold text-on-surface">{{ p.name }}</p>
                            <p v-if="p.positionName" class="text-[10px] text-on-surface-variant font-medium sm:hidden">{{ localizePosition(p.positionName) }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="py-3 px-2 hidden sm:table-cell">
                        <span class="text-[11px] text-on-surface-variant font-medium">{{ localizePosition(p.positionName) }}</span>
                      </td>
                      <td class="py-3 px-2 text-center">
                        <span v-if="p.isLocallyChanged" class="text-[10px] font-black uppercase tracking-wider"
                          :class="p.status === 'present' ? 'text-[#00ff41]' : p.status === 'absent' ? 'text-[#ff4141]' : 'text-on-surface-variant'">
                          {{ p.status === 'present' ? t('trainingMonitor.present') : p.status === 'absent' ? t('trainingMonitor.absent') : t('trainingMonitor.notMarked') }}
                        </span>
                        <span v-else class="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-wider">{{ t('trainingMonitor.notMarked') }}</span>
                      </td>
                      <td class="py-3 px-2 text-center">
                        <button @click="updateStatus(p.id, 'present')"
                          class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded transition-all"
                          :class="p.status === 'present' ? 'bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/30' : 'bg-surface-container-highest text-on-surface-variant hover:text-[#00ff41] hover:bg-[#00ff41]/10 border border-transparent'">
                          {{ t('trainingMonitor.present') }}
                        </button>
                      </td>
                      <td class="py-3 px-2 text-center">
                        <button @click="updateStatus(p.id, 'absent')"
                          class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded transition-all"
                          :class="p.status === 'absent' ? 'bg-[#ff4141]/20 text-[#ff4141] border border-[#ff4141]/30' : 'bg-surface-container-highest text-on-surface-variant hover:text-[#ff4141] hover:bg-[#ff4141]/10 border border-transparent'">
                          {{ t('trainingMonitor.absent') }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-16 text-on-surface-variant border border-dashed border-outline-variant/20 rounded-xl">
              <span class="material-symbols-outlined text-5xl mb-4 opacity-30">fitness_center</span>
              <p class="text-sm font-bold uppercase tracking-wider">{{ t('trainingMonitor.sessionReady') }}</p>
              <p class="text-xs text-on-surface-variant/60 mt-2">{{ t('trainingMonitor.sessionReadyDesc') }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.sessions-scroll::-webkit-scrollbar { width: 4px; }
.sessions-scroll::-webkit-scrollbar-track { background: transparent; }
.sessions-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
</style>

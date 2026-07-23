<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { useUiToast } from '../composables/useUiToast'
import { lookupService } from '../services/lookupService'
import { playerService } from '../services/playerService'
import { matchService } from '../services/matchService'

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
const isLoadingPlayers = ref(false)

const categories = ref([])
const selectedCategory = ref('')
const selectedSessionType = ref('Training Session')
const players = ref([])

const playerStatuses = ref({})
const matchId = ref(null)

const eligiblePlayers = computed(() =>
  players.value.filter(p => !p.isAlreadyAttended)
)

const playersForTable = computed(() =>
  eligiblePlayers.value.map(p => ({
    ...p,
    status: playerStatuses.value[p.id] ?? null,
  }))
)

const presentCount = computed(() => playersForTable.value.filter(p => p.status === 'present').length)
const absentCount = computed(() => playersForTable.value.filter(p => p.status === 'absent').length)
const excusedCount = computed(() => playersForTable.value.filter(p => p.status === 'excused').length)

function normalizeLookupItem(item) {
  if (!item) return { id: 'Unknown', name: 'Unknown' }
  if (typeof item === 'string' || typeof item === 'number') return { id: item, name: String(item) }
  const idCandidates = ['id', 'Id', 'ID', 'value', 'categoryId', 'categoryID']
  const nameCandidates = ['name', 'Name', 'label', 'title', 'categoryName']
  let id = null
  let name = null
  for (const key of idCandidates) { if (item[key] !== undefined && item[key] !== null) { id = item[key]; break } }
  for (const key of nameCandidates) { if (item[key] !== undefined && item[key] !== null) { name = item[key]; break } }
  return { id: id ?? name ?? 'Unknown', name: name ?? String(id ?? 'Unknown') }
}

function normalizeLookupArray(data) {
  let array = data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    array = data.data || data.items || data.result || data.value || data.$values || []
  }
  if (!Array.isArray(array)) return []
  return array.map(normalizeLookupItem).filter(i => i.id !== 'Unknown')
}

function normalizePlayers(payload) {
  let data = payload
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    data = data.data ?? data.Data ?? data.$values ?? data.result ?? data.Result ?? []
  }
  if (!Array.isArray(data)) return []
  return data.map(p => ({
    id: p.PlayerID ?? p.playerID ?? p.id ?? p.Id,
    name: p.PlayerName ?? p.playerName ?? p.FullName ?? p.fullName ?? p.name ?? '',
    position: p.PositionName ?? p.positionName ?? p.position ?? '',
    jersey: p.JerseyNumber ?? p.jerseyNumber ?? p.jersey ?? '',
    avatar: p.PlayerImage ?? p.playerImage ?? p.photo ?? p.Photo ?? '',
    isAlreadyAttended: !!(p.isAlreadyAttended ?? p.IsAlreadyAttended ?? false),
  }))
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

async function loadPlayersByCategory(categoryId) {
  isLoadingPlayers.value = true
  try {
    const response = await playerService.getMatchCallUpPlayersByCategory(categoryId)
    const list = normalizePlayers(response?.data)
    players.value = list
    playerStatuses.value = Object.fromEntries(list.map(p => [p.id, null]))

    const matchRes = await matchService.getUpcomingMatch(categoryId)
    const match = matchRes?.data?.data ?? matchRes?.data
    if (match?.matchID ?? match?.id) {
      matchId.value = match.matchID ?? match.id
    } else {
      matchId.value = null
    }
  } catch (e) {
    matchId.value = null
    showToast({ title: t('matchMonitor.loadErrorTitle'), message: t('matchMonitor.loadErrorMsg'), mode: 'error' })
  } finally {
    isLoadingPlayers.value = false
  }
}

function startSession() {
  if (!selectedCategory.value) {
    showToast({ title: t('matchMonitor.selectionRequiredTitle'), message: t('matchMonitor.selectionRequiredMsg'), mode: 'error' })
    return
  }
  startupModalOpen.value = false
  loadPlayersByCategory(selectedCategory.value)
}

function updateStatus(playerId, type) {
  playerStatuses.value = { ...playerStatuses.value, [playerId]: type }
}

async function markAllPresent() {
  const updated = { ...playerStatuses.value }
  Object.keys(updated).forEach(id => { updated[id] = 'present' })
  playerStatuses.value = updated

  if (!matchId.value) return
  const playersAttendance = {}
  for (const p of eligiblePlayers.value) {
    playersAttendance[p.id] = true
  }
  try {
    await matchService.markAttendance({ matchID: matchId.value, playersAttendance })
    showToast({ title: t('matchMonitor.attendanceSavedTitle'), message: t('matchMonitor.attendanceSavedMsg'), mode: 'success' })
  } catch (e) {
    const msg = e?.response?.data?.message || t('matchMonitor.attendanceSaveErrorMsg')
    showToast({ title: t('matchMonitor.attendanceSaveErrorTitle'), message: msg, mode: 'error' })
  }
}

function resetAll() {
  playerStatuses.value = {}
}

async function saveAttendance() {
  if (!matchId.value) {
    showToast({ title: t('matchMonitor.attendanceSaveErrorTitle'), message: t('matchMonitor.noMatchForAttendance'), mode: 'error' })
    return
  }
  const playersAttendance = {}
  for (const p of eligiblePlayers.value) {
    playersAttendance[p.id] = playerStatuses.value[p.id] === 'present'
  }
  try {
    await matchService.markAttendance({ matchID: matchId.value, playersAttendance })
    showToast({ title: t('matchMonitor.attendanceSavedTitle'), message: t('matchMonitor.attendanceSavedMsg'), mode: 'success' })
  } catch (e) {
    const msg = e?.response?.data?.message || t('matchMonitor.attendanceSaveErrorMsg')
    showToast({ title: t('matchMonitor.attendanceSaveErrorTitle'), message: msg, mode: 'error' })
  }
}

onMounted(loadCategories)
</script>

<template>
  <!-- Startup modal -->
  <div v-if="startupModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <div class="w-full max-w-lg rounded-3xl bg-surface-container-lowest border border-outline-variant/10 p-8 shadow-2xl">
      <h2 class="font-headline text-2xl font-black uppercase tracking-tighter text-on-surface">{{ t('matchMonitor.selectSquadTitle') }}</h2>
      <p class="mt-2 text-sm text-on-surface-variant">{{ t('matchMonitor.selectSquadDesc') }}</p>
      <div class="mt-8 space-y-2">
        <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('matchMonitor.squadCategory') }}</label>
        <select v-model="selectedCategory" class="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface text-sm rounded px-4 py-3 focus:ring-1 focus:ring-primary-fixed">
          <option value="" disabled>{{ t('matchMonitor.selectCategory') }}</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>
      <div class="mt-8 flex items-center justify-between">
        <button @click="startSession" :disabled="isLoadingPlayers" class="w-full sm:w-auto bg-primary-container text-on-primary-container text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded shadow-lg hover:brightness-110 transition-all disabled:opacity-50">
          {{ isLoadingPlayers ? t('matchMonitor.loading') : t('matchMonitor.startSession') }}
        </button>
        <p class="text-[11px] text-on-surface-variant">{{ selectedCategory ? t('matchMonitor.ready') : t('matchMonitor.selectRequired') }}</p>
      </div>
    </div>
  </div>

  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <DashboardSidebar active-item="match-monitor" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main class="pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background transition-all duration-300 lg:flex-1">
      <div class="flex gap-8 p-8">
        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="mb-8">
            <div class="flex items-start justify-between">
              <div>
                <h1 class="font-headline text-4xl font-black text-on-surface tracking-tight uppercase leading-none">{{ t('matchMonitor.dailyOperations') }}</h1>
                <p class="text-on-surface-variant font-medium text-sm mt-2 opacity-80">{{ t('matchMonitor.dailyOperationsSub') }}</p>
              </div>
              <div class="flex gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('matchMonitor.squadCategory') }}</label>
                  <select v-model="selectedCategory" @change="loadPlayersByCategory(selectedCategory)" class="bg-surface-container-high border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider">
                    <option value="" disabled>{{ t('matchMonitor.selectCategory') }}</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('matchMonitor.sessionType') }}</label>
                  <select v-model="selectedSessionType" class="bg-surface-container-high border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider">
                    <option>Training Session</option>
                    <option>Matchday Prep</option>
                    <option>Recovery / Gym</option>
                    <option>Technical Video</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between bg-surface-container-low border border-outline-variant/10 p-4 rounded mb-2">
            <div class="flex items-center gap-4">
              <button class="bg-primary-container text-on-primary-container text-[11px] font-black px-6 py-2.5 rounded shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest" type="button" @click="markAllPresent">
                <span class="material-symbols-outlined text-sm">done_all</span> {{ t('matchMonitor.markAllPresent') }}
              </button>
              <button class="bg-primary-container text-on-primary-container text-[11px] font-black px-6 py-2.5 rounded shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest" type="button" @click="saveAttendance">
                <span class="material-symbols-outlined text-sm">save</span> {{ t('matchMonitor.saveAttendance') }}
              </button>
              <button class="text-[11px] font-black text-on-surface-variant hover:text-on-surface px-4 py-2.5 rounded transition-all flex items-center gap-2 uppercase tracking-widest border border-outline-variant/20 bg-surface-container-high" type="button" @click="resetAll">
                <span class="material-symbols-outlined text-sm">refresh</span> {{ t('matchMonitor.resetAll') }}
              </button>
            </div>
            <div class="flex items-center gap-2 px-3 py-1 bg-surface-container-highest rounded border border-outline-variant/10">
                <span class="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{{ playersForTable.length }}</span>
                <span class="text-[11px] font-mono font-bold text-primary">Players</span>
              </div>
          </div>

          <div class="flex-1 overflow-y-auto pb-8 no-scrollbar">
            <table class="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr class="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">
                  <th class="px-4 pb-2" colspan="2">{{ t('matchMonitor.playerProfile') }}</th>
                  <th class="px-4 pb-2 text-center">{{ t('matchMonitor.colJersey') }}</th>
                  <th class="px-4 pb-2">{{ t('matchMonitor.pos') }}</th>
                  <th class="px-4 pb-2 text-center">{{ t('matchMonitor.operationalStatus') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="player in playersForTable" :key="player.id" class="bg-surface-container-low/40 hover:bg-surface-container-low transition-colors group">
                  <td class="px-4 py-3 border-y border-l border-outline-variant/5 w-14">
                    <div class="w-12 h-12 rounded border-2 p-0.5 relative" :class="player.status === 'present' ? 'border-primary/20' : player.status === 'absent' ? 'border-error/20' : 'border-outline-variant/10'">
                      <img v-if="player.avatar" :src="player.avatar" :alt="player.name" class="w-full h-full object-cover rounded-sm">
                      <div v-else class="w-full h-full bg-surface-container-highest rounded-sm"></div>
                      <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-surface" :class="player.status === 'present' ? 'bg-primary' : player.status === 'absent' ? 'bg-error' : 'bg-surface-container-highest'"></div>
                    </div>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <p class="font-headline font-bold text-on-surface text-sm uppercase leading-tight">{{ player.name }}</p>
                    <p class="text-[10px] text-on-surface-variant font-mono tracking-tighter">REF: {{ player.id }}</p>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5 text-center">
                    <span class="font-mono font-bold text-on-surface text-base">{{ player.jersey }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <span class="bg-surface-container-highest px-3 py-1.5 rounded text-[11px] font-bold text-on-surface-variant border border-outline-variant/20 uppercase tracking-tighter">{{ localizePosition(player.position) }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-r border-outline-variant/5">
                    <div class="flex justify-center gap-2">
                      <button type="button"
                        :class="[
                          'status-btn flex-1 min-w-[100px] py-2.5 rounded border text-[11px] font-black uppercase tracking-widest',
                          player.status === 'present' ? 'active-pill-present' : 'border-outline-variant/20 hover:border-primary/40'
                        ]"
                        @click="updateStatus(player.id, 'present')">{{ t('matchMonitor.present') }}</button>
                      <button type="button"
                        :class="[
                          'status-btn flex-1 min-w-[100px] py-2.5 rounded border text-[11px] font-black uppercase tracking-widest',
                          player.status === 'absent' ? 'active-pill-absent' : 'border-outline-variant/20 hover:border-error/40'
                        ]"
                        @click="updateStatus(player.id, 'absent')">{{ t('matchMonitor.absent') }}</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <aside class="hidden xl:flex xl:flex-col w-80 bg-surface-container-lowest glass-panel p-8 border-l border-outline-variant/10 overflow-y-auto no-scrollbar">
          <h2 class="font-headline text-xl font-black text-on-surface mb-8 uppercase tracking-tighter border-b border-outline-variant/10 pb-4">{{ t('matchMonitor.sessionSummary') }}</h2>
          <div class="space-y-6">
            <div class="bg-surface-container-low p-6 rounded border border-outline-variant/10 relative overflow-hidden">
              <div class="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-8 -mt-8 rounded-full blur-2xl"></div>
              <p class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black mb-2">{{ t('matchMonitor.totalPresent') }}</p>
              <div class="flex items-baseline gap-3">
                <span class="text-6xl font-display font-black text-primary leading-none">{{ presentCount }}</span>
                <span class="text-base font-mono font-bold text-on-surface-variant">/ {{ playersForTable.length }}</span>
              </div>
              <div class="mt-4 h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div class="h-full bg-primary" :style="{ width: `${playersForTable.length ? Math.round((presentCount / playersForTable.length) * 100) : 0}%` }" style="box-shadow: 0 0 10px rgba(0,255,65,0.4)"></div>
              </div>
              <p class="text-[10px] font-bold text-primary mt-2 uppercase tracking-widest">{{ playersForTable.length ? t('matchMonitor.availability', { pct: Math.round((presentCount / playersForTable.length) * 100) }) : t('matchMonitor.availability', { pct: 0 }) }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="bg-surface-container-low p-4 rounded border border-outline-variant/10 text-center">
                <p class="text-[9px] uppercase tracking-widest text-on-surface-variant font-black mb-1">{{ t('matchMonitor.absent') }}</p>
                <p class="text-2xl font-display font-black text-error">{{ absentCount }}</p>
              </div>
              <div class="bg-surface-container-low p-4 rounded border border-outline-variant/10 text-center">
                <p class="text-[9px] uppercase tracking-widest text-on-surface-variant font-black mb-1">{{ t('matchMonitor.excused') }}</p>
                <p class="text-2xl font-display font-black text-tertiary-fixed-dim">{{ excusedCount }}</p>
              </div>
            </div>

            <div class="pt-6 border-t border-outline-variant/10">
              <h3 class="font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4">{{ t('matchMonitor.quickEventLogger') }}</h3>
              <div class="bg-surface-container-low p-4 rounded border border-outline-variant/10 space-y-3">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[9px] uppercase tracking-widest text-on-surface-variant font-black">{{ t('matchMonitor.selectPlayer') }}</label>
                  <select class="bg-surface-container-high border-outline-variant/20 text-on-surface text-[10px] font-bold rounded px-3 py-2 focus:ring-1 focus:ring-primary-fixed w-full uppercase">
                    <option v-for="player in playersForTable" :key="player.id">{{ player.name }}</option>
                  </select>
                </div>
                <div class="grid grid-cols-4 gap-2">
                  <button class="aspect-square rounded bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center hover:border-primary/40 transition-all group" type="button">
                    <span class="material-symbols-outlined text-sm text-primary">sports_soccer</span>
                    <span class="text-[8px] font-black mt-1">{{ t('matchMonitor.goal') }}</span>
                  </button>
                  <button class="aspect-square rounded bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center hover:border-primary/40 transition-all group" type="button">
                    <span class="material-symbols-outlined text-sm text-primary">handshake</span>
                    <span class="text-[8px] font-black mt-1">{{ t('matchMonitor.ast') }}</span>
                  </button>
                  <button class="aspect-square rounded bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center hover:border-error/40 transition-all group" type="button">
                    <span class="material-symbols-outlined text-sm text-tertiary-fixed-dim">style</span>
                    <span class="text-[8px] font-black mt-1">{{ t('matchMonitor.yel') }}</span>
                  </button>
                  <button class="aspect-square rounded bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center hover:border-error/40 transition-all group" type="button">
                    <span class="material-symbols-outlined text-sm text-error">style</span>
                    <span class="text-[8px] font-black mt-1">{{ t('matchMonitor.red') }}</span>
                  </button>
                </div>
                <button class="w-full bg-primary/10 text-primary text-[9px] font-black py-2 rounded border border-primary/20 uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all" type="button">{{ t('matchMonitor.logEvent') }}</button>
              </div>
            </div>

            <div class="pt-6 border-t border-outline-variant/10">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">{{ t('matchMonitor.activeSidelined') }}</h3>
                <span class="bg-error/10 text-error px-2 py-0.5 rounded text-[9px] font-black border border-error/20">{{ t('matchMonitor.critical', { count: 3 }) }}</span>
              </div>
              <div class="space-y-3">
                <div class="flex items-center gap-3 p-3 bg-surface-container-high/40 rounded border-l-2 border-error">
                  <div class="w-8 h-8 rounded-full bg-surface-container-highest shrink-0"></div>
                  <div>
                    <p class="text-[10px] font-black text-on-surface uppercase">R. Varane</p>
                    <p class="text-[9px] text-error font-bold uppercase tracking-tighter">Hamstring GII</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-3 bg-surface-container-high/40 rounded border-l-2 border-error">
                  <div class="w-8 h-8 rounded-full bg-surface-container-highest shrink-0"></div>
                  <div>
                    <p class="text-[10px] font-black text-on-surface uppercase">T. Courtois</p>
                    <p class="text-[9px] text-error font-bold uppercase tracking-tighter">ACL Rehab</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-8 space-y-4">
              <button class="w-full bg-surface-container-high border border-outline-variant/30 text-on-surface-variant font-headline font-bold py-3 rounded uppercase text-[10px] tracking-widest hover:text-on-surface hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 group" type="button">
                <span class="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">download</span>
                {{ t('matchMonitor.syncCloudRoster') }}
              </button>
              <button class="w-full bg-primary-container text-on-primary-container font-headline font-black py-5 rounded-sm shadow-[0_10px_30px_rgba(0,255,65,0.2)] uppercase text-xs tracking-[0.3em] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all" type="button">
                {{ t('matchMonitor.finalizeSession') }}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<style scoped>
.glass-panel {
  background: rgba(17, 20, 23, 0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}
.status-btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.active-pill-present { background-color: #00ff41 !important; color: #000000 !important; font-weight: 800; border-color: #00ff41 !important; }
.active-pill-absent { background-color: #93000a !important; color: #ffdad6 !important; font-weight: 800; border-color: #93000a !important; }
.active-pill-excused { background-color: #ffd6a1 !important; color: #452b00 !important; font-weight: 800; border-color: #ffd6a1 !important; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
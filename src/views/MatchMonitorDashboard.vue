<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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
const isLoadingEventTypes = ref(false)

const categories = ref([])
const selectedCategory = ref('')
const matches = ref([])
const selectedMatch = ref(null)
const isLoadingMatches = ref(false)
const selectedSessionType = ref('Matchday Prep')
const players = ref([])

const playerStatuses = ref({})
const matchId = ref(null)
const showResetConfirm = ref(false)
const showMarkAllConfirm = ref(false)
const highlightedRow = ref(null)
const isSaving = ref(false)
const isResetting = ref(false)

const EVENT_TYPES = ref([])

const matchEvents = ref([])
const showEventLogger = ref(true)
const eventPlayer = ref('')
const eventType = ref('goal')
const eventMinute = ref('')

const playersForTable = computed(() =>
  players.value.map((p) => {
    const localStatus = playerStatuses.value[p.id] ?? null
    const effectiveStatus = localStatus !== null ? localStatus : p.recordedStatus
    return {
      ...p,
      status: effectiveStatus,
      isLocallyChanged: localStatus !== null,
    }
  })
)

const pendingPlayers = computed(() =>
  players.value.filter((p) => playerStatuses.value[p.id] !== null && playerStatuses.value[p.id] !== undefined)
)

const totalEligible = computed(() => players.value.length)
const presentCount = computed(() =>
  playersForTable.value.filter((p) => p.status === 'present').length
)
const absentCount = computed(() =>
  playersForTable.value.filter((p) => p.status === 'absent').length
)

const presentPlayers = computed(() =>
  players.value.filter((p) => p.isAlreadyAttended)
)

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

function normalizePlayers(payload) {
  let data = payload
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    data = data.data ?? data.Data ?? data.$values ?? data.result ?? data.Result ?? []
  }
  if (!Array.isArray(data)) return []
  return data.map((p) => {
    const isAbsent = !!(p.isAbsent ?? p.IsAbsent ?? false)
    const isAlreadyAttended = !!(p.isAlreadyAttended ?? p.IsAlreadyAttended ?? false)
    let recordedStatus = p.recordedStatus ?? p.RecordedStatus ?? null
    if (recordedStatus == null) {
      recordedStatus = isAbsent ? 'absent' : (isAlreadyAttended ? 'present' : null)
    }
    return {
      id: p.PlayerID ?? p.playerID ?? p.id ?? p.Id,
      name: p.PlayerName ?? p.playerName ?? p.FullName ?? p.fullName ?? p.name ?? '',
      position: p.PositionName ?? p.positionName ?? p.position ?? '',
      jersey: p.JerseyNumber ?? p.jerseyNumber ?? p.jersey ?? '',
      avatar: p.PlayerImage ?? p.playerImage ?? p.photo ?? p.Photo ?? '',
      isAlreadyAttended,
      recordedStatus,
      matchAttendanceId: p.MatchAttendanceID ?? p.matchAttendanceID ?? p.matchAttendanceId ?? null,
    }
  })
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
  isLoadingEventTypes.value = true
  try {
    const [playersRes, eventTypesRes, matchEventsRes] = await Promise.all([
      playerService.getMatchCallUpPlayersByCategory(categoryId, matchId.value),
      lookupService.getEventTypes(),
      matchService.getMatchEvents(matchId.value),
    ])
    const list = normalizePlayers(playersRes?.data)
    players.value = list
    playerStatuses.value = Object.fromEntries(list.map((p) => [p.id, null]))
    EVENT_TYPES.value = normalizeLookupArray(eventTypesRes?.data)
    const rawEvents = matchEventsRes?.data ?? []
    matchEvents.value = Array.isArray(rawEvents)
      ? rawEvents.map((e) => ({
          id: e.eventID ?? e.EventID,
          minute: e.eventAt ?? e.EventAt,
          eventTypeName: e.eventName ?? e.EventName,
          playerName: e.name ?? e.Name,
          isFromServer: true,
        }))
      : []
  } catch (e) {
    showToast({ title: t('matchMonitor.loadErrorTitle'), message: t('matchMonitor.loadErrorMsg'), mode: 'error' })
  } finally {
    isLoadingPlayers.value = false
    isLoadingEventTypes.value = false
  }
}

function handleCategorySelect() {
  selectedMatch.value = null
  matches.value = []
  if (!startupModalOpen.value) {
    players.value = []
    playerStatuses.value = {}
    matchId.value = null
    startupModalOpen.value = true
  }
}

async function onCategoryChange() {
  selectedMatch.value = null
  matches.value = []
  if (!selectedCategory.value) return
  isLoadingMatches.value = true
  try {
    const res = await matchService.getIncompleteMatchesByCategory(selectedCategory.value)
    const list = res?.data?.data ?? []
    matches.value = list
  } catch {
    matches.value = []
  } finally {
    isLoadingMatches.value = false
  }
}

function startSession() {
  if (!selectedCategory.value) {
    showToast({ title: t('matchMonitor.selectionRequiredTitle'), message: t('matchMonitor.selectionRequiredMsg'), mode: 'error' })
    return
  }
  if (!selectedMatch.value) {
    showToast({ title: t('matchMonitor.selectionRequiredTitle'), message: t('matchMonitor.noMatchForAttendance'), mode: 'error' })
    return
  }
  matchId.value = selectedMatch.value.id
  startupModalOpen.value = false
  loadPlayersByCategory(selectedCategory.value)
}

function updateStatus(playerId, type) {
  playerStatuses.value = { ...playerStatuses.value, [playerId]: type }
  highlightedRow.value = playerId
  setTimeout(() => {
    highlightedRow.value = null
  }, 1500)
}

function markAllPresent() {
  if (!matchId.value) return
  showMarkAllConfirm.value = true
}

async function confirmMarkAllPresent() {
  showMarkAllConfirm.value = false
  if (!matchId.value) return
  isSaving.value = true
  const playersAttendance = {}
  for (const p of players.value) {
    playersAttendance[p.id] = true
  }
  try {
    const res = await matchService.markAttendance({ matchID: matchId.value, playersAttendance })
    const attendanceIds = res?.data?.attendanceIds ?? {}
    players.value = players.value.map((p) => ({
      ...p,
      isAlreadyAttended: true,
      recordedStatus: 'present',
      matchAttendanceId: attendanceIds[p.id] ?? p.matchAttendanceId,
    }))
    playerStatuses.value = Object.fromEntries(players.value.map((p) => [p.id, null]))
    showToast({ title: t('matchMonitor.attendanceSavedTitle'), message: t('matchMonitor.attendanceSavedMsg'), mode: 'success' })
  } catch (e) {
    const msg = e?.response?.data?.message || t('matchMonitor.attendanceSaveErrorMsg')
    showToast({ title: t('matchMonitor.attendanceSaveErrorTitle'), message: msg, mode: 'error' })
  } finally {
    isSaving.value = false
  }
}

async function logEvent() {
  const playerId = eventPlayer.value
  if (!playerId) {
    showToast({ title: t('matchMonitor.selectPlayerTitle'), message: t('matchMonitor.selectPlayerMessage'), mode: 'error' })
    return
  }
  if (!eventMinute.value || isNaN(Number(eventMinute.value))) {
    showToast({ title: t('matchMonitor.logEventErrorTitle'), message: t('matchMonitor.logEventErrorMsg'), mode: 'error' })
    return
  }
  const player = presentPlayers.value.find((p) => String(p.id) === String(playerId))
  if (!player) {
    showToast({ title: t('matchMonitor.logEventErrorTitle'), message: t('matchMonitor.playerMustBePresent'), mode: 'error' })
    return
  }
  const selectedType = EVENT_TYPES.value.find((e) => String(e.id) === String(eventType.value))
  if (!selectedType) return
  if (!player.matchAttendanceId) {
    showToast({ title: t('matchMonitor.logEventErrorTitle'), message: t('matchMonitor.playerNotAttended'), mode: 'error' })
    return
  }
  try {
    await matchService.saveMatchEvent({
      matchAttendanceID: player.matchAttendanceId,
      eventTypeID: Number(selectedType.id),
      eventAt: Number(eventMinute.value),
    })
    matchEvents.value = [
      ...matchEvents.value,
      {
        minute: Number(eventMinute.value),
        eventTypeId: selectedType.id,
        eventTypeName: selectedType.name,
        playerId: player.id,
        playerName: player.name,
        jersey: player.jersey,
      },
    ]
    eventPlayer.value = ''
    eventType.value = ''
    eventMinute.value = ''
    showToast({ title: t('matchMonitor.eventLoggedTitle'), message: t('matchMonitor.eventLoggedMsg', { type: selectedType.name, player: player.name }), mode: 'success' })
  } catch (e) {
    const msg = e?.response?.data?.message || t('matchMonitor.attendanceSaveErrorMsg')
    showToast({ title: t('matchMonitor.attendanceSaveErrorTitle'), message: msg, mode: 'error' })
  }
}

async function removeEvent(index) {
  const evt = matchEvents.value[index]
  if (!evt) return
  if (evt.isFromServer && evt.id) {
    try {
      await matchService.deleteMatchEvent(matchId.value, evt.id)
    } catch {
      showToast({ title: t('matchMonitor.attendanceSaveErrorTitle'), message: t('matchMonitor.attendanceSaveErrorMsg'), mode: 'error' })
      return
    }
  }
  matchEvents.value = matchEvents.value.filter((_, i) => i !== index)
}

function resetAll() {
  if (!matchId.value) {
    showToast({ title: t('matchMonitor.attendanceSaveErrorTitle'), message: t('matchMonitor.noMatchForAttendance'), mode: 'error' })
    return
  }
  showResetConfirm.value = true
}

async function confirmResetAttendance() {
  const playerIDs = players.value.map((p) => p.id)
  if (!playerIDs.length) return
  showResetConfirm.value = false
  isResetting.value = true
  try {
    await matchService.resetAttendance({ matchID: matchId.value, playerIDs })
    players.value = players.value.map((p) => ({
      ...p,
      isAlreadyAttended: false,
      recordedStatus: null,
    }))
    playerStatuses.value = Object.fromEntries(players.value.map((p) => [p.id, null]))
    matchEvents.value = []
    EVENT_TYPES.value = []
    showToast({ title: t('matchMonitor.attendanceResetTitle'), message: t('matchMonitor.attendanceResetMsg'), mode: 'success' })
  } catch (e) {
    const msg = e?.response?.data?.message || t('matchMonitor.attendanceSaveErrorMsg')
    showToast({ title: t('matchMonitor.attendanceSaveErrorTitle'), message: msg, mode: 'error' })
  } finally {
    isResetting.value = false
  }
}

async function saveAttendance() {
  if (!matchId.value) {
    showToast({ title: t('matchMonitor.attendanceSaveErrorTitle'), message: t('matchMonitor.noMatchForAttendance'), mode: 'error' })
    return
  }
  if (!pendingPlayers.value.length) {
    showToast({ title: t('matchMonitor.attendanceSavedTitle'), message: t('matchMonitor.noChangesToSave'), mode: 'info' })
    return
  }
  isSaving.value = true
  const playersAttendance = {}
  for (const p of pendingPlayers.value) {
    playersAttendance[p.id] = playerStatuses.value[p.id] === 'present'
  }
  try {
    const res = await matchService.markAttendance({ matchID: matchId.value, playersAttendance })
    const attendanceIds = res?.data?.attendanceIds ?? {}
    players.value = players.value.map((p) => {
      const localStatus = playerStatuses.value[p.id]
      if (localStatus === null || localStatus === undefined) return p
      return {
        ...p,
        isAlreadyAttended: localStatus === 'present' || p.isAlreadyAttended,
        recordedStatus: localStatus === 'present' ? 'present' : localStatus === 'absent' ? 'absent' : p.recordedStatus,
        matchAttendanceId: attendanceIds[p.id] ?? p.matchAttendanceId,
      }
    })
    const rem = { ...playerStatuses.value }
    for (const id of pendingPlayers.value.map((p) => p.id)) {
      delete rem[id]
    }
    playerStatuses.value = rem
    showToast({ title: t('matchMonitor.attendanceSavedTitle'), message: t('matchMonitor.attendanceSavedMsg'), mode: 'success' })
  } catch (e) {
    const msg = e?.response?.data?.message || t('matchMonitor.attendanceSaveErrorMsg')
    showToast({ title: t('matchMonitor.attendanceSaveErrorTitle'), message: msg, mode: 'error' })
  } finally {
    isSaving.value = false
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
      <h2 class="font-headline text-2xl font-black uppercase tracking-tighter text-on-surface">{{ t('matchMonitor.selectSquadTitle') }}</h2>
      <p class="mt-2 text-sm text-on-surface-variant">{{ t('matchMonitor.selectSquadDesc') }}</p>
      <div class="mt-8 space-y-2">
        <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('matchMonitor.squadCategory') }}</label>
        <select v-model="selectedCategory" @change="onCategoryChange" class="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface text-sm rounded px-4 py-3 focus:ring-1 focus:ring-primary-fixed">
          <option value="" disabled>{{ t('matchMonitor.selectCategory') }}</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>

      <div v-if="selectedCategory" class="mt-6">
        <p class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black mb-3">{{ t('matchMonitor.upcomingFixture') }}</p>
        <div v-if="isLoadingMatches" class="flex items-center justify-center py-6">
          <span class="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">{{ t('matchMonitor.loading') }}</span>
        </div>
        <div v-else-if="matches.length" class="space-y-2 max-h-64 overflow-y-auto matches-scroll">
          <div v-for="m in matches" :key="m.id"
            @click="selectedMatch = m"
            class="flex items-center gap-4 p-4 rounded border cursor-pointer transition-all"
            :class="selectedMatch?.id === m.id ? 'bg-primary-container/20 border-primary/40' : 'bg-surface-container-high border-outline-variant/10 hover:border-outline-variant/30'">
            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" :class="selectedMatch?.id === m.id ? 'border-primary' : 'border-outline-variant/30'">
              <div v-if="selectedMatch?.id === m.id" class="w-2.5 h-2.5 rounded-full bg-primary"></div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-headline font-black text-on-surface text-sm uppercase leading-tight truncate">{{ m.opponentName }}</p>
              <p class="text-[11px] text-on-surface-variant font-medium">
                {{ new Date(m.date).toLocaleDateString() }}
                <span v-if="m.kickoffTime"> • {{ m.kickoffTime }}</span>
              </p>
              <p v-if="m.stadiumName" class="text-[10px] text-on-surface-variant font-bold uppercase tracking-tight truncate">{{ m.stadiumName }}</p>
            </div>
            <span class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded shrink-0" :class="m.isHome ? 'bg-primary/10 text-primary' : 'bg-surface-container-highest text-on-surface-variant'">{{ m.isHome ? t('callUp.home') : t('callUp.away') }}</span>
          </div>
        </div>
        <div v-else class="bg-surface-container-high rounded border border-outline-variant/10 p-5 text-center">
          <p class="text-[11px] text-on-surface-variant font-bold">{{ t('matchMonitor.noMatchForAttendance') }}</p>
        </div>
      </div>

      <div class="mt-8 flex items-center justify-between">
        <button @click="startSession" :disabled="isLoadingPlayers || !selectedMatch" class="w-full sm:w-auto bg-primary-container text-on-primary-container text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded shadow-lg hover:brightness-110 transition-all disabled:opacity-50">
          {{ isLoadingPlayers ? t('matchMonitor.loading') : t('matchMonitor.startSession') }}
        </button>
        <p class="text-[11px] text-on-surface-variant">{{ selectedMatch ? t('matchMonitor.ready') : (selectedCategory ? t('matchMonitor.selectMatch') : t('matchMonitor.selectRequired')) }}</p>
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
                <h1 class="font-headline text-4xl font-black text-on-surface tracking-tight uppercase leading-none">{{ t('matchMonitor.matchCenter') }}</h1>
                <p class="text-on-surface-variant font-medium text-sm mt-2 opacity-80">{{ t('matchMonitor.matchCenterSub') }}</p>
              </div>
              <div class="flex gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('matchMonitor.squadCategory') }}</label>
                  <select v-model="selectedCategory" @change="handleCategorySelect" class="bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider">
                    <option value="" disabled>{{ t('matchMonitor.selectCategory') }}</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('matchMonitor.sessionType') }}</label>
                  <select v-model="selectedSessionType" disabled class="bg-surface-container-high border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider opacity-60 cursor-not-allowed">
                    <option>Training Session</option>
                    <option>Matchday Prep</option>
                    <option>Recovery / Gym</option>
                    <option>Technical Video</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Match Details Card -->
          <div v-if="selectedMatch" class="bg-surface-container-high rounded-xl p-5 mb-4 border-l-4 border-primary relative overflow-hidden">
            <div class="flex items-center gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-2">
                  <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{{ t('matchMonitor.upcomingFixture') }}</span>
                  <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary">{{ selectedMatch.isHome ? t('callUp.home') : t('callUp.away') }}</span>
                </div>
                <div class="font-headline text-xl md:text-2xl font-black text-on-surface uppercase truncate">{{ selectedMatch.opponentName || t('callUp.tbd') }}</div>
              </div>
              <div class="flex items-center gap-6 text-xs text-on-surface-variant shrink-0">
                <span v-if="selectedMatch.date" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-primary text-sm">calendar_today</span>
                  <span class="font-bold">{{ new Date(selectedMatch.date).toLocaleDateString() }}<span v-if="selectedMatch.kickoffTime"> • {{ selectedMatch.kickoffTime }}</span></span>
                </span>
                <span v-if="selectedMatch.stadiumName" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-primary text-sm">location_on</span>
                  <span class="font-bold">{{ selectedMatch.stadiumName }}</span>
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2 ml-auto shrink-0">
              <button @click="startupModalOpen = true" class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded border border-outline-variant/20 hover:border-outline-variant/40 transition-all flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">swap_horiz</span> {{ t('matchMonitor.changeMatch') }}
              </button>
            </div>
            <div class="absolute -right-8 -top-8 opacity-5 pointer-events-none">
              <span class="material-symbols-outlined text-[160px]" style="font-variation-settings: 'FILL' 1;">sports_soccer</span>
            </div>
          </div>

          <div class="flex items-center justify-between bg-surface-container-low border border-outline-variant/10 p-4 rounded mb-2">
            <div class="flex items-center gap-4">
              <button class="bg-primary-container text-black text-[11px] font-black px-6 py-2.5 rounded shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest" type="button" @click="markAllPresent" :disabled="isSaving || isResetting">
                <span class="material-symbols-outlined text-sm">done_all</span> {{ t('matchMonitor.markAllPresent') }}
              </button>
              <button class="bg-primary-container text-black text-[11px] font-black px-6 py-2.5 rounded shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest" type="button" @click="saveAttendance" :disabled="isSaving || isResetting || !pendingPlayers.length">
                <span class="material-symbols-outlined text-sm">save</span> {{ t('matchMonitor.saveAttendance') }}
              </button>
              <button class="text-[11px] font-black text-on-surface-variant hover:text-on-surface px-4 py-2.5 rounded transition-all flex items-center gap-2 uppercase tracking-widest border border-outline-variant/20 bg-surface-container-high" type="button" @click="resetAll" :disabled="isSaving || isResetting">
                <span class="material-symbols-outlined text-sm">refresh</span> {{ t('matchMonitor.resetAll') }}
              </button>
            </div>
            <div class="flex items-center gap-4 text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">
              <span class="text-primary">{{ presentCount }} {{ t('matchMonitor.present') }}</span>
              <span class="text-error">{{ absentCount }} {{ t('matchMonitor.absent') }}</span>
            </div>
          </div>

          <!-- Match Event Logger -->
          <div v-if="players.length" class="bg-surface-container-low border border-outline-variant/10 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                {{ t('matchMonitor.matchEvents') }} ({{ matchEvents.length }})
              </h3>
            </div>
            <div class="flex flex-wrap gap-3 items-end">
              <div class="flex flex-col gap-1">
                <label class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black">{{ t('matchMonitor.player') }}</label>
                <select v-model="eventPlayer" class="bg-surface-container-high border border-outline-variant/20 text-on-surface text-[11px] font-bold rounded px-3 py-2 focus:ring-1 focus:ring-primary-fixed min-w-[150px]">
                  <option value="" disabled>{{ t('matchMonitor.selectPlayer') }}</option>
                  <option v-for="p in presentPlayers" :key="p.id" :value="p.id">{{ p.name }} ({{ p.jersey }})</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black">{{ t('matchMonitor.eventType') }}</label>
                <select v-model="eventType" class="bg-surface-container-high border border-outline-variant/20 text-on-surface text-[11px] font-bold rounded px-3 py-2 focus:ring-1 focus:ring-primary-fixed min-w-[140px]">
                  <option value="" disabled>{{ t('matchMonitor.selectEventType') }}</option>
                  <option v-for="e in EVENT_TYPES" :key="e.id" :value="e.id">{{ e.name }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant font-black">Min</label>
                <input v-model="eventMinute" type="number" min="1" max="150" placeholder="'" class="bg-surface-container-high border border-outline-variant/20 text-on-surface text-[11px] font-bold rounded px-3 py-2 focus:ring-1 focus:ring-primary-fixed w-20 text-center font-mono" />
              </div>
              <button @click="logEvent" class="bg-primary-container text-black text-[11px] font-black px-5 py-2 rounded shadow-lg hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest whitespace-nowrap">
                <span class="material-symbols-outlined text-sm align-middle">add</span> {{ t('matchMonitor.logEvent') }}
              </button>
            </div>
            <div v-if="matchEvents.length" class="mt-3 flex flex-wrap gap-2">
              <div v-for="(evt, idx) in matchEvents" :key="idx"
                class="flex items-center gap-2 bg-surface-container-high border border-outline-variant/20 rounded px-3 py-1.5 text-[11px] font-bold text-on-surface hover:border-outline-variant/40 transition-colors group">
                <span class="font-mono text-on-surface-variant text-[10px]">{{ evt.minute }}'</span>
                <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                <span class="text-on-surface">{{ evt.eventTypeName }}</span>
                <span class="text-on-surface-variant font-mono">{{ evt.playerName }}</span>
                <button @click="removeEvent(idx)" class="ml-1 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity">
                  <span class="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
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
                <tr v-for="player in playersForTable" :key="player.id"
                  class="bg-surface-container-low/40 hover:bg-surface-container-low transition-colors group"
                  :class="highlightedRow === player.id ? 'highlight-row' : ''">
                  <td class="px-4 py-3 border-y border-l border-outline-variant/5 w-14">
                    <div class="w-12 h-12 rounded border-2 p-0.5 relative" :class="player.isAlreadyAttended ? 'border-tertiary-fixed-dim/30' : player.status === 'present' ? 'border-primary/20' : player.status === 'absent' ? 'border-error/20' : 'border-outline-variant/10'">
                      <img v-if="player.avatar" :src="player.avatar" :alt="player.name" class="w-full h-full object-cover rounded-sm">
                      <div v-else class="w-full h-full bg-surface-container-highest rounded-sm"></div>
                      <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-surface" :class="player.isAlreadyAttended ? 'bg-tertiary-fixed-dim' : player.status === 'present' ? 'bg-primary' : player.status === 'absent' ? 'bg-error' : 'bg-surface-container-highest'"></div>
                    </div>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <p class="font-headline font-bold text-on-surface text-sm uppercase leading-tight" :class="player.isAlreadyAttended ? 'text-on-surface-variant' : ''">{{ player.name }}</p>
                    <p class="text-[10px] text-on-surface-variant font-mono tracking-tighter">REF: {{ player.id }}</p>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5 text-center">
                    <span class="font-mono font-bold text-on-surface text-base">{{ player.jersey }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <span class="bg-surface-container-highest px-3 py-1.5 rounded text-[11px] font-bold text-on-surface-variant border border-outline-variant/20 uppercase tracking-tighter">{{ localizePosition(player.position) }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-r border-outline-variant/5">
                    <div v-if="player.isAlreadyAttended" class="flex justify-center gap-2">
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
                    <div v-else class="flex justify-center gap-2">
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

      </div>
    </main>
  </div>

  <!-- ── Mark All Present confirmation ── -->
  <Teleport to="body">
    <div v-if="showMarkAllConfirm" class="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="showMarkAllConfirm = false"></div>
      <div class="relative w-full max-w-md overflow-hidden rounded-xl border border-primary/20 bg-surface-container-low shadow-2xl">
        <div class="flex flex-col items-center p-6 text-center">
          <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <span class="material-symbols-outlined text-3xl text-primary">done_all</span>
          </div>
          <h2 class="font-headline text-lg font-black uppercase tracking-tight text-on-surface">{{ t('matchMonitor.markAllPresentConfirmTitle') }}</h2>
          <p class="mt-3 text-sm text-on-surface-variant">
            {{ t('matchMonitor.markAllPresentConfirmMessage', { count: totalEligible }) }}
          </p>
        </div>
        <div class="flex gap-3 border-t border-outline-variant/10 p-4">
          <button
            type="button"
            @click="showMarkAllConfirm = false"
            class="flex-1 rounded-md py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            @click="confirmMarkAllPresent"
            class="flex-1 rounded-md bg-primary py-3 text-[10px] font-black uppercase tracking-widest text-black transition-colors hover:brightness-110 flex items-center justify-center gap-1"
          >
            <span class="material-symbols-outlined text-sm">done_all</span>
            {{ t('matchMonitor.confirmMarkAllPresent') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Reset Attendance confirmation ── -->
  <Teleport to="body">
    <div v-if="showResetConfirm" class="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="showResetConfirm = false"></div>
      <div class="relative w-full max-w-md overflow-hidden rounded-xl border border-red-500/20 bg-surface-container-low shadow-2xl">
        <div class="flex flex-col items-center p-6 text-center">
          <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
            <span class="material-symbols-outlined text-3xl text-red-400">warning</span>
          </div>
          <h2 class="font-headline text-lg font-black uppercase tracking-tight text-on-surface">{{ t('matchMonitor.resetAttendanceConfirmTitle') }}</h2>
          <p class="mt-3 text-sm text-on-surface-variant">
            {{ t('matchMonitor.resetAttendanceConfirmMessage', { count: players.length }) }}
          </p>
        </div>
        <div class="flex gap-3 border-t border-outline-variant/10 p-4">
          <button
            type="button"
            @click="showResetConfirm = false"
            class="flex-1 rounded-md py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            @click="confirmResetAttendance"
            class="flex-1 rounded-md bg-red-500 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-red-600 flex items-center justify-center gap-1"
          >
            <span class="material-symbols-outlined text-sm">restart_alt</span>
            {{ t('matchMonitor.confirmResetAttendance') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
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
.matches-scroll::-webkit-scrollbar { width: 4px; }
.matches-scroll::-webkit-scrollbar-track { background: transparent; }
.matches-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.highlight-row { animation: status-flash 1.5s ease-out; }
@keyframes status-flash {
  0% { background-color: rgba(0, 255, 65, 0.15); }
  100% { background-color: transparent; }
}
</style>
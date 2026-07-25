<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { useUiToast } from '../composables/useUiToast'
import { lookupService } from '../services/lookupService'
import { matchService } from '../services/matchService'
import { playerService } from '../services/playerService'

const { t: $t } = useI18n()
const { showToast } = useUiToast()

const isSidebarOpen = ref(true)

// ── Squad categories (mirrors CallUpDashboard) ────────────────────────────────
const categories = ref([])
const selectedCategory = ref('')
const selectedMatch = ref('')
const selectedSessionType = ref('Training Session')
const startupModalOpen = ref(true)
const isLoadingCategories = ref(false)
const isLoadingIntel = ref(false)
const matchLoaded = ref(false)
const monitoring = ref(false)
const highlightedRow = ref(null)

// ── Match intelligence state ─────────────────────────────────────────────────
const match = ref(null)
const callUpPlayers = ref([])
const samplePlayers = [
  { id: '31', name: 'Ederson', position: 'GK', jersey: '31', status: 'present' },
  { id: '3', name: 'R. Dias', position: 'CB', jersey: '3', status: 'present' },
  { id: '25', name: 'M. Akanji', position: 'CB', jersey: '25', status: 'present' },
  { id: '24', name: 'J. Gvardiol', position: 'LB', jersey: '24', status: 'present' },
  { id: '16', name: 'Rodri', position: 'CDM', jersey: '16', status: 'present' },
  { id: '17', name: 'K. De Bruyne', position: 'CAM', jersey: '17', status: 'present' },
]
const playerStatuses = ref({})
const selectedCategoryName = computed(() => {
  const category = categories.value.find((cat) => String(cat.id) === String(selectedCategory.value))
  return category?.name || ''
})
const matchOptions = computed(() => {
  const label = selectedCategoryName.value || 'Squad'
  return [
    { id: 'matchday-prep', label: `Matchday Prep vs ${label}` },
    { id: 'training-session', label: 'Training Session' },
    { id: 'recovery-gym', label: 'Recovery / Gym' },
    { id: 'technical-video', label: 'Technical Video' },
  ]
})
const playersForTable = computed(() => {
  const source = callUpPlayers.value.length ? callUpPlayers.value : samplePlayers
  return source.map((player) => ({
    ...player,
    status: playerStatuses.value[player.id] || player.status || 'present',
  }))
})
const presentCount = computed(() => playersForTable.value.filter((p) => p.status === 'present').length)
const absentCount = computed(() => playersForTable.value.filter((p) => p.status === 'absent').length)
const excusedCount = computed(() => playersForTable.value.filter((p) => p.status === 'excused').length)

// Final result (editable, local)
const homeScore = ref(0)
const awayScore = ref(0)

// Tactical directives (editable, local)
const directivePress = ref(
  'Aggressive transition in Zone 14. Target the opposition pivot during build-up phases. Maintain a 4-1-4-1 structure off-ball.'
)
const directiveTransition = ref(
  'Swift rotation after ball recovery. Utilise wing-back overlaps to stretch a low block.'
)

// Match-events log (interactive, local)
const events = ref([
  { time: '12:45', type: 'goal', player: 'E. Haaland', detail: 'Assist: K. De Bruyne' },
  { time: '34:20', type: 'yellow', player: 'Rodri', detail: 'Tactical Foul' },
])
const eventPlayer = ref('')
const eventType = ref('goal')

// Illustrative forecast (no analytics endpoint exists yet)
const winProbability = ref(64.2)

// ── Position normalisation (specific + localised, matches CallUpDashboard) ─────
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
function normalizePosition(raw) {
  const name = String(raw ?? '').trim()
  if (!name) return { label: '', key: null }
  return { label: name, key: POSITION_KEYS[name.toLowerCase()] ?? null }
}
function normalizeAvailablePlayers(payload) {
  let data = payload
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    data = data.data ?? data.Data ?? data.$values ?? data.result ?? data.Result ?? []
  }
  if (!Array.isArray(data)) return []
  return data.map((p) => {
    const pos = normalizePosition(p.PositionName ?? p.positionName ?? p.position)
    return {
      id: p.PlayerID ?? p.playerID ?? p.id ?? p.Id,
      name: p.PlayerName ?? p.playerName ?? p.name ?? p.FullName ?? '',
      avatar: p.PlayerImage ?? p.playerImage ?? p.photo ?? p.Photo ?? p.imageUrl ?? p.ImageUrl ?? '',
      position: pos.label,
      positionKey: pos.key,
      jersey: p.JerseyNumber ?? p.jerseyNumber ?? p.jersey ?? '',
      isAlreadyAttended: !!(p.isAlreadyAttended ?? p.IsAlreadyAttended ?? p.isAbsent ?? p.IsAbsent ?? false),
      recordedStatus: p.isAbsent === true || p.IsAbsent === true ? 'absent' : p.isAbsent === false || p.IsAbsent === false ? 'present' : null,
    }
  })
}

// Normalise the GET /api/matches/upcoming/{id} response.
function normalizeUpcomingMatch(data) {
  if (!data) return null
  let m = data
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    m = m.data ?? m.Data ?? m.result ?? m.Result ?? m.value ?? m.Value ?? m.$values ?? m.items ?? m.Item ?? m.match ?? m.Match ?? m
  }
  if (Array.isArray(m)) m = m[0]
  if (!m || typeof m !== 'object') return null
  const asText = (v) => {
    if (v == null) return null
    if (typeof v === 'string') return v
    if (typeof v === 'object') return v.name ?? v.Name ?? v.title ?? v.Title ?? null
    return null
  }
  const opponent = asText(m.opponentName ?? m.OpponentName ?? m.opponent ?? m.Opponent)
  const stadium = asText(m.stadiumName ?? m.StadiumName ?? m.venue ?? m.Venue ?? m.stadium ?? m.Stadium)
  const dateRaw = m.date ?? m.Date ?? m.matchDate ?? m.MatchDate
  const kickoff = m.kickoffTime ?? m.KickoffTime ?? m.kickoff ?? m.Kickoff
  const isHome = m.isHome ?? m.IsHome ?? null
  const club = asText(m.clubName ?? m.ClubName ?? m.club ?? m.Club ?? m.team ?? m.Team)
  const matchId = m.id ?? m.Id ?? m.ID ?? m.matchId ?? m.MatchID

  let dateLabel = ''
  if (dateRaw) {
    const base = String(dateRaw).split('T')[0]
    const combined = kickoff ? `${base}T${kickoff}` : `${base}T00:00:00`
    const d = new Date(combined)
    if (!isNaN(d.getTime())) {
      dateLabel = `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    }
  }
  if (!opponent && !dateLabel && !stadium && isHome == null && club == null && matchId == null) return null
  return { opponentName: opponent, isHome, stadiumName: stadium, clubName: club, matchId, dateLabel }
}

// ── Lookups (categories) ──────────────────────────────────────────────────────
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
async function loadCategories() {
  isLoadingCategories.value = true
  try {
    const response = await lookupService.getCategories()
    const list = normalizeLookupArray(response?.data)
    if (list.length) categories.value = list
  } catch (e) {
    console.warn('MatchMonitor: could not load categories', e)
  } finally {
    isLoadingCategories.value = false
  }
}

// ── Load match intelligence ───────────────────────────────────────────────────
function handleCategorySelect() {
  selectedMatch.value = ''
  match.value = null
  callUpPlayers.value = []
  playerStatuses.value = {}
  matchLoaded.value = false
  monitoring.value = false
  if (!startupModalOpen.value) {
    startupModalOpen.value = true
  }
}

async function loadMatchIntelligence() {
  if (!selectedCategory.value || isLoadingIntel.value) return
  isLoadingIntel.value = true
  try {
    const [matchRes, playersRes] = await Promise.all([
      matchService.getUpcomingMatch(selectedCategory.value),
      playerService.getMatchCallUpPlayersByCategory(selectedCategory.value),
    ])
    match.value = normalizeUpcomingMatch(matchRes?.data)
    callUpPlayers.value = normalizeAvailablePlayers(playersRes?.data)
    matchLoaded.value = true
  } catch (e) {
    const message = e?.response?.data?.message || $t('matchMonitor.loadErrorMessage')
    showToast({ title: $t('matchMonitor.loadErrorTitle'), message, mode: 'error' })
  } finally {
    isLoadingIntel.value = false
  }
}

// Enter the monitor once the upcoming match has been loaded.
function startMonitoring() {
  if (match.value?.opponentName) monitoring.value = true
}
function resetMatchLoad() {
  matchLoaded.value = false
  match.value = null
}

// ── Match events ──────────────────────────────────────────────────────────────
function clockNow() {
  const d = new Date()
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${String(d.getHours()).padStart(2, '0')}:${mm}:${ss}`
}
function addEvent() {
  if (!eventPlayer.value) {
    showToast({ title: $t('matchMonitor.selectPlayerTitle'), message: $t('matchMonitor.selectPlayerMessage'), mode: 'error' })
    return
  }
  const player = callUpPlayers.value.find((p) => String(p.id) === String(eventPlayer.value))
  events.value = [
    ...events.value,
    { time: clockNow(), type: eventType.value, player: player?.name ?? '', detail: '' },
  ]
  eventPlayer.value = ''
}
function eventIcon(type) {
  if (type === 'goal') return 'sports_soccer'
  if (type === 'yellow') return 'style'
  if (type === 'red') return 'style'
  return 'sports_soccer'
}

// ── Final result ──────────────────────────────────────────────────────────────
function finalizeReport() {
  showToast({
    title: $t('matchMonitor.finalizedTitle'),
    message: $t('matchMonitor.finalizedMessage', { home: homeTeamName.value, away: awayTeamName.value, hs: homeScore.value, as: awayScore.value }),
    mode: 'success',
  })
}

// ── Derived team names from the fixture ──────────────────────────────────────
const ourSquadName = computed(() => match.value?.clubName || $t('matchMonitor.ourSquad'))
const homeTeamName = computed(() =>
  match.value?.isHome ? ourSquadName.value : match.value?.opponentName || ''
)
const awayTeamName = computed(() =>
  match.value?.isHome ? match.value?.opponentName || '' : ourSquadName.value
)

function statusButtonClass(player, type) {
  const current = player.status
  const base = 'status-btn flex-1 min-w-[100px] py-2.5 rounded border border-outline-variant/20 text-[11px] font-black uppercase tracking-widest'
  if (type === 'present') {
    return `${base} ${current === 'present' ? 'active-pill-present' : 'hover:border-primary/40'}`
  }
  if (type === 'absent') {
    return `${base} ${current === 'absent' ? 'active-pill-absent' : 'hover:border-error/40'}`
  }
  return `${base} ${current === 'excused' ? 'active-pill-excused' : 'hover:border-tertiary-container/40'}`
}

function setPlayerStatus(playerId, type) {
  const player = callUpPlayers.value.find(p => String(p.id) === String(playerId))
  playerStatuses.value = {
    ...playerStatuses.value,
    [playerId]: type,
  }
  const statusLabel = $t(`matchMonitor.${type}`) || type
  showToast({
    title: $t('matchMonitor.statusChangedTitle'),
    message: $t('matchMonitor.statusChangedMsg', { name: player?.name ?? '', status: statusLabel }),
    mode: 'success',
  })
  highlightedRow.value = playerId
  setTimeout(() => { highlightedRow.value = null }, 1500)
}

function startSession() {
  if (!selectedCategory.value || !selectedMatch.value) {
    showToast({
      title: $t('matchMonitor.selectCategoryTitle'),
      message: $t('matchMonitor.selectCategoryMessage'),
      mode: 'error',
    })
    return
  }

  startupModalOpen.value = false
  loadMatchIntelligence()
}

watch(startupModalOpen, (open) => {
  if (open && selectedCategory.value) {
    loadMatchIntelligence()
  }
})

onMounted(loadCategories)
</script>

<template>
  <!-- Startup modal — category selection before entering the terminal -->
  <div v-if="startupModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <div class="w-full max-w-2xl rounded-3xl bg-surface-container-lowest border border-outline-variant/10 p-8 shadow-2xl">
      <h2 class="font-headline text-2xl font-black uppercase tracking-tighter text-on-surface">Select Squad &amp; Match</h2>
      <p class="mt-2 text-sm text-on-surface-variant">Choose your category and the next session before entering the operations terminal.</p>
      <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">Squad Category</label>
          <select v-model="selectedCategory" class="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface text-sm rounded px-4 py-3 focus:ring-1 focus:ring-primary-fixed">
            <option value="" disabled>Select category</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">Match Mode</label>
          <select v-model="selectedMatch" class="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface text-sm rounded px-4 py-3 focus:ring-1 focus:ring-primary-fixed">
            <option v-for="option in matchOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
          </select>
        </div>
      </div>
      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button @click="startSession" class="w-full sm:w-auto bg-primary-container text-on-primary-container text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded shadow-lg hover:brightness-110 transition-all">Start Session</button>
        <p class="text-[11px] text-on-surface-variant">Session type: {{ selectedSessionType }}</p>
      </div>
    </div>
  </div>

  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <!-- Shared sidebar -->
    <DashboardSidebar active-item="match-monitor" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <!-- Shared topbar -->
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <!-- Main content -->
    <main class="pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background transition-all duration-300 lg:flex-1">
      <div class="flex gap-8 p-8">
        <!-- Terminal content -->
        <div class="flex-1 flex flex-col overflow-hidden">
          <!-- Context Header -->
          <div class="mb-8">
            <div class="flex items-start justify-between">
              <div>
                <h1 class="font-headline text-4xl font-black text-on-surface tracking-tight uppercase leading-none">Daily Operations</h1>
                <p class="text-on-surface-variant font-medium text-sm mt-2 opacity-80">Squad Availability &amp; Attendance Terminal</p>
              </div>
              <div class="flex gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">Squad Category</label>
                  <select v-model="selectedCategory" @change="handleCategorySelect" class="bg-surface-container-high border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider">
                    <option disabled value="">Select Squad</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">Session Type</label>
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

          <!-- Bulk Actions -->
          <div class="flex items-center justify-between bg-surface-container-low border border-outline-variant/10 p-4 rounded mb-2">
            <div class="flex items-center gap-4">
              <button class="bg-primary-container text-on-primary-container text-[11px] font-black px-6 py-2.5 rounded shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest" type="button" @click="startSession">
                <span class="material-symbols-outlined text-sm">done_all</span> Mark All Present
              </button>
              <button class="bg-primary-container text-on-primary-container text-[11px] font-black px-6 py-2.5 rounded shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest" type="button">
                <span class="material-symbols-outlined text-sm">task_alt</span> Finalize Match &amp; Mark Completed
              </button>
              <button class="text-[11px] font-black text-on-surface-variant hover:text-on-surface px-4 py-2.5 rounded transition-all flex items-center gap-2 uppercase tracking-widest border border-outline-variant/20 bg-surface-container-high" type="button">
                <span class="material-symbols-outlined text-sm">refresh</span> Reset All
              </button>
            </div>
            <div class="flex items-center gap-6">
              <div class="flex items-center gap-2 px-3 py-1 bg-surface-container-highest rounded border border-outline-variant/10">
                <span class="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Active Roster:</span>
                <span class="text-[11px] font-mono font-bold text-primary">{{ playersForTable.length }} Players</span>
              </div>
              <div class="flex items-center gap-2 text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
                <span class="material-symbols-outlined text-lg">filter_list</span>
                <span class="text-[10px] font-black uppercase tracking-widest">Filter</span>
              </div>
            </div>
          </div>

          <!-- Roster Table Area -->
          <div class="flex-1 overflow-y-auto pb-8 no-scrollbar">
            <table class="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr class="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">
                  <th class="px-4 pb-2">Player Profile</th>
                  <th class="px-4 pb-2">Pos</th>
                  <th class="px-4 pb-2 text-center">Operational Status</th>
                  <th class="px-4 pb-2 text-center">Match Events</th>
                  <th class="px-4 pb-2 text-right">Activity Notes</th>
                </tr>
              </thead>
              <tbody>
<tr v-for="player in playersForTable" :key="player.id" 
                class="bg-surface-container-low/40 hover:bg-surface-container-low transition-colors group"
                :class="highlightedRow === player.id ? 'highlight-row' : ''">
                  <td class="px-4 py-3 border-y border-l border-outline-variant/5">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded border-2 border-primary/20 p-0.5 relative">
                        <div class="w-full h-full bg-surface-container-highest rounded-sm"></div>
                        <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-surface"></div>
                      </div>
                      <div>
                        <p class="font-headline font-bold text-on-surface text-base uppercase leading-tight">{{ player.name }}</p>
                        <p class="text-[10px] text-on-surface-variant font-mono tracking-tighter">REF: {{ player.id }}-A</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <span class="bg-surface-container-highest px-2 py-1 rounded text-[10px] font-mono font-bold text-on-surface-variant border border-outline-variant/20 uppercase tracking-tighter">{{ player.position }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <div class="flex justify-center gap-2">
                      <button type="button" :class="statusButtonClass(player, 'present')" @click="setPlayerStatus(player.id, 'present')">Present</button>
                      <button type="button" :class="statusButtonClass(player, 'absent')" @click="setPlayerStatus(player.id, 'absent')">Absent</button>
                      <button type="button" :class="statusButtonClass(player, 'excused')" @click="setPlayerStatus(player.id, 'excused')">Excused</button>
                    </div>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <div class="flex justify-center gap-2">
                      <button class="w-8 h-8 rounded bg-surface-container-high border border-outline-variant/20 flex items-center justify-center hover:text-primary transition-colors" title="Log Goal">
                        <span class="material-symbols-outlined text-sm">sports_soccer</span>
                      </button>
                      <button class="w-8 h-8 rounded bg-surface-container-high border border-outline-variant/20 flex items-center justify-center hover:text-primary transition-colors" title="Log Assist">
                        <span class="material-symbols-outlined text-sm">handshake</span>
                      </button>
                      <button class="w-8 h-8 rounded bg-surface-container-high border border-outline-variant/20 flex items-center justify-center hover:text-error transition-colors" title="Log Card">
                        <span class="material-symbols-outlined text-sm">style</span>
                      </button>
                    </div>
                  </td>
                  <td class="px-4 py-3 border-y border-r border-outline-variant/5 text-right">
                    <input class="bg-transparent border-b border-outline-variant/20 text-on-surface-variant text-[11px] py-1 text-right focus:border-primary outline-none transition-all w-full max-w-[200px] placeholder:italic placeholder:opacity-30" placeholder="Add operational note..." type="text">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Session Summary Sidebar -->
        <aside class="hidden xl:flex xl:flex-col w-80 bg-surface-container-lowest glass-panel p-8 border-l border-outline-variant/10 overflow-y-auto no-scrollbar">
          <h2 class="font-headline text-xl font-black text-on-surface mb-8 uppercase tracking-tighter border-b border-outline-variant/10 pb-4">Session Summary</h2>
          <div class="space-y-6">
            <!-- Availability Card -->
            <div class="bg-surface-container-low p-6 rounded border border-outline-variant/10 relative overflow-hidden">
              <div class="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-8 -mt-8 rounded-full blur-2xl"></div>
              <p class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black mb-2">Total Present</p>
              <div class="flex items-baseline gap-3">
                <span class="text-6xl font-display font-black text-primary leading-none">{{ presentCount }}</span>
                <span class="text-base font-mono font-bold text-on-surface-variant">/ {{ playersForTable.length }}</span>
              </div>
              <div class="mt-4 h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div class="h-full bg-primary" :style="{ width: `${playersForTable.length ? Math.round((presentCount / playersForTable.length) * 100) : 0}%` }" style="box-shadow: 0 0 10px rgba(0,255,65,0.4)"></div>
              </div>
              <p class="text-[10px] font-bold text-primary mt-2 uppercase tracking-widest">{{ playersForTable.length ? `${Math.round((presentCount / playersForTable.length) * 100)}% Availability` : '0% Availability' }}</p>
            </div>
            <!-- Stats Grid -->
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-surface-container-low p-4 rounded border border-outline-variant/10 text-center">
                <p class="text-[9px] uppercase tracking-widest text-on-surface-variant font-black mb-1">Absent</p>
                <p class="text-2xl font-display font-black text-error">{{ absentCount }}</p>
              </div>
              <div class="bg-surface-container-low p-4 rounded border border-outline-variant/10 text-center">
                <p class="text-[9px] uppercase tracking-widest text-on-surface-variant font-black mb-1">Excused</p>
                <p class="text-2xl font-display font-black text-tertiary-fixed-dim">{{ excusedCount }}</p>
              </div>
            </div>
            <!-- Event Logger -->
            <div class="pt-6 border-t border-outline-variant/10">
              <h3 class="font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4">Quick Event Logger</h3>
              <div class="bg-surface-container-low p-4 rounded border border-outline-variant/10 space-y-3">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[9px] uppercase tracking-widest text-on-surface-variant font-black">Select Player</label>
                  <select class="bg-surface-container-high border-outline-variant/20 text-on-surface text-[10px] font-bold rounded px-3 py-2 focus:ring-1 focus:ring-primary-fixed w-full uppercase">
                    <option v-for="player in playersForTable" :key="player.id">{{ player.name }}</option>
                  </select>
                </div>
                <div class="grid grid-cols-4 gap-2">
                  <button class="aspect-square rounded bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center hover:border-primary/40 transition-all group" type="button">
                    <span class="material-symbols-outlined text-sm text-primary">sports_soccer</span>
                    <span class="text-[8px] font-black mt-1">GOAL</span>
                  </button>
                  <button class="aspect-square rounded bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center hover:border-primary/40 transition-all group" type="button">
                    <span class="material-symbols-outlined text-sm text-primary">handshake</span>
                    <span class="text-[8px] font-black mt-1">AST</span>
                  </button>
                  <button class="aspect-square rounded bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center hover:border-error/40 transition-all group" type="button">
                    <span class="material-symbols-outlined text-sm text-tertiary-fixed-dim">style</span>
                    <span class="text-[8px] font-black mt-1">YEL</span>
                  </button>
                  <button class="aspect-square rounded bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center hover:border-error/40 transition-all group" type="button">
                    <span class="material-symbols-outlined text-sm text-error">style</span>
                    <span class="text-[8px] font-black mt-1">RED</span>
                  </button>
                </div>
                <button class="w-full bg-primary/10 text-primary text-[9px] font-black py-2 rounded border border-primary/20 uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all" type="button">Log Event</button>
              </div>
            </div>
            <!-- Active Sidelined -->
            <div class="pt-6 border-t border-outline-variant/10">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Active Sidelined</h3>
                <span class="bg-error/10 text-error px-2 py-0.5 rounded text-[9px] font-black border border-error/20">3 CRITICAL</span>
              </div>
              <div class="space-y-3">
                <div class="flex items-center gap-3 p-3 bg-surface-container-high/40 rounded border-l-2 border-error">
                  <img alt="" class="w-8 h-8 rounded-full grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHKf9ujzJjESd8OCOCCnMR-2N3-1wGZe6fWBoLCML28gXAUWaxQtYkBsT1-PJ23qdKWpLX_6aHQass4qA6VMKBeo5TlO5IotQqIeOx-m0vtpY1i5VGcvTxHE3cptJtty5zq9pYFFXBzUkVSEsYkqNmKpgURE6amX-YE1yHZxbEheKUcI2GOmqV39KLjBfF7DHLtsOBO2bOOQRol1j0FSMIERsCQh9Qv3CBPS2UcrjVVDGp2jjC" />
                  <div>
                    <p class="text-[10px] font-black text-on-surface uppercase">R. Varane</p>
                    <p class="text-[9px] text-error font-bold uppercase tracking-tighter">Hamstring GII</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-3 bg-surface-container-high/40 rounded border-l-2 border-error">
                  <img alt="" class="w-8 h-8 rounded-full grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAr2FAsbYJ6DTioIQgIrNNhvH8S3swlyRDRlnSdiagUHYUM7TFx5MC4AcyEpuCdpHfSvPDEsEZcpKhBA-zIN2VAVpZ_G9duVtK-aTmhEajO6OJ0D1TXW7WlyklhAp-OxgisO4GMUTib-H95vcTUA3EwZg3-p8GdQgmRv368pO3ZXpCKRMTp94mjsG65XydHbcWyPGuiG1qiHZ2ssaqEL7XgQFbgeP_DGSIwpTPDkLjNQLUCikUIntO2" />
                  <div>
                    <p class="text-[10px] font-black text-on-surface uppercase">T. Courtois</p>
                    <p class="text-[9px] text-error font-bold uppercase tracking-tighter">ACL Rehab</p>
                  </div>
                </div>
              </div>
            </div>
            <!-- Finalize Section -->
            <div class="pt-8 space-y-4">
              <button class="w-full bg-surface-container-high border border-outline-variant/30 text-on-surface-variant font-headline font-bold py-3 rounded uppercase text-[10px] tracking-widest hover:text-on-surface hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 group" type="button">
                <span class="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">download</span>
                Sync Cloud Roster
              </button>
              <button class="w-full bg-primary-container text-on-primary-container font-headline font-black py-5 rounded-sm shadow-[0_10px_30px_rgba(0,255,65,0.2)] uppercase text-xs tracking-[0.3em] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all" type="button">
                Finalize Session
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
  background: rgba(50, 53, 56, 0.6);
  backdrop-filter: blur(20px);
}
.status-btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.active-pill-present { background-color: #00ff41 !important; color: #003907 !important; font-weight: 800; border-color: #00ff41 !important; }
.active-pill-absent { background-color: #93000a !important; color: #ffdad6 !important; font-weight: 800; border-color: #93000a !important; }
.active-pill-excused { background-color: #ffd6a1 !important; color: #452b00 !important; font-weight: 800; border-color: #ffd6a1 !important; }
.highlight-row { animation: status-flash 1.5s ease-out; }
@keyframes status-flash {
  0% { background-color: rgba(0, 255, 65, 0.15); }
  100% { background-color: transparent; }
}
</style>
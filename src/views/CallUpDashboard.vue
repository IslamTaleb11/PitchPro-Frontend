<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
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

// ── Squad configuration ───────────────────────────────────────────────────────
const SQUAD_LIMIT = 23
const RING_RADIUS = 40
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS // ≈ 251.327

// ── Category selector (drives the roster) ─────────────────────────────────────
// These mirror the squads in the provided mockup. In production the category
// list and the roster would come from the API (categoryService + a future
// playerService.getPlayersByCategory call) — see loadRoster() for the seam.
const categories = ref([
  { id: 'senior', name: $t('callUp.categorySenior') },
  { id: 'u19', name: $t('callUp.categoryU19') },
  { id: 'u16', name: $t('callUp.categoryU16') },
])
const selectedCategory = ref('')

// ── Available-player normalization ────────────────────────────────────────────
// GET /api/players/available/{categoryId} -> { data: [ {
//   PlayerID, PlayerName, JerseyNumber, PositionName } ] }. These are players
// with no active injury in the chosen category, so every one is fit and eligible
// for selection (no blocked state, no market-value/role tags). We also accept
// Maps a backend position value to its SPECIFIC localized i18n key. The API
// returns pp.name (e.g. "Centre Back", "Defensive Midfielder"), but we also
// tolerate the standard short codes (GK/CB/LB/DM/ST/…) in case the API
// convention differs. Each distinct position resolves to its own granular key
// (posCentreBack, posDefensiveMidfielder, …) defined in both locale files, so
// the table shows the exact role, translated per language. Broad terms
// (defender/midfielder/forward) and unrecognised values fall back gracefully.
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
  Object.entries(POSITION_GROUPS).flatMap(([key, names]) =>
    names.map((n) => [n, key])
  )
)
// Resolves a backend position name to its localized key, keeping the raw full
// name as a fallback display value when no key matches.
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
      position: pos.label,
      positionKey: pos.key,
      jersey: p.JerseyNumber ?? p.jerseyNumber ?? p.jersey ?? '',
      isCalled: !!(p.isCalled ?? p.IsCalled ?? false),
    }
  })
}
const players = ref([])
const isLoadingCategories = ref(false)

// ── Upcoming match (driven by /matches/upcoming/{categoryId}) ──────────────────
const upcomingMatch = ref(null)
const isLoadingMatch = ref(false)

// Flexibly pull the first defined, non-empty value for a set of candidate keys.
// Lets us tolerate whatever field-naming convention the match API uses
// (camelCase, .NET PascalCase, etc.).
function pick(obj, keys) {
  for (const k of keys) {
    const v = obj[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return null
}

// Normalize the GET /api/matches/upcoming/{id} response into the shape the
// fixture card expects. The real API returns: opponentName, stadiumName, date,
// kickoffTime, isHome, isCompleted, endTime (plus ids). We also accept common
// alternative field names and envelope wrappers for resilience.
function normalizeUpcomingMatch(data) {
  if (!data) return null
  let m = data
  // Unwrap a possible envelope.
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    m = m.data ?? m.Data ?? m.result ?? m.Result ?? m.value ?? m.Value ?? m.$values ?? m.items ?? m.Item ?? m.match ?? m.Match ?? m
  }
  // Support an array of upcoming matches.
  if (Array.isArray(m)) m = m[0]
  if (!m || typeof m !== 'object') return null

  // Resolve a value that may be a plain string or an object with a name.
  const asText = (v) => {
    if (v == null) return null
    if (typeof v === 'string') return v
    if (typeof v === 'object') {
      return v.name ?? v.Name ?? v.teamName ?? v.TeamName ?? v.title ?? v.Title ?? v.shortName ?? v.ShortName ?? null
    }
    return null
  }

  const opponent = asText(pick(m, ['opponentName', 'OpponentName', 'opponent', 'Opponent', 'opponentTeam', 'OpponentTeam', 'vsTeam', 'VsTeam']))
  const stadium = asText(pick(m, ['stadiumName', 'StadiumName', 'venue', 'Venue', 'stadium', 'Stadium', 'location', 'Location', 'ground', 'Ground']))
  const dateRaw = pick(m, ['date', 'Date', 'matchDate', 'MatchDate', 'dateTime', 'DateTime'])
  const kickoff = pick(m, ['kickoffTime', 'KickoffTime', 'kickoff', 'Kickoff', 'startTime', 'StartTime', 'time', 'Time'])
  const isHome = m.isHome ?? m.IsHome ?? null
  const isCompleted = m.isCompleted ?? m.IsCompleted ?? null
  const endTime = asText(pick(m, ['endTime', 'EndTime']))
  const club = asText(pick(m, ['clubName', 'ClubName', 'club', 'Club', 'teamName', 'TeamName', 'team', 'Team']))
  const matchId = pick(m, ['id', 'Id', 'ID', 'matchId', 'MatchID'])

  // Build the kickoff label by combining the date with the kickoff time.
  let dateLabel = ''
  if (dateRaw) {
    const base = String(dateRaw).split('T')[0]
    const combined = kickoff ? `${base}T${kickoff}` : `${base}T00:00:00`
    dateLabel = formatMatchDate(combined)
  }

  if (!opponent && !dateLabel && !stadium && isHome == null && isCompleted == null && !club && matchId == null) return null
  return { opponentName: opponent, isHome, isCompleted, stadiumName: stadium, endTime, clubName: club, matchId, dateLabel }
}

// Format an ISO/.NET date string as "Oct 24, 2023 • 20:00" (locale time, no TZ label).
function formatMatchDate(value) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return `${date} • ${time}`
}

async function loadUpcomingMatch(categoryId) {
  upcomingMatch.value = null
  calledUpCount.value = 0
  if (!categoryId) return
  isLoadingMatch.value = true
  try {
    const response = await matchService.getUpcomingMatch(categoryId)
    const match = normalizeUpcomingMatch(response?.data)
    upcomingMatch.value = match
    if (match?.matchId != null) loadCallUpCount(match.matchId)
  } catch (error) {
    // No upcoming match (or endpoint unavailable) — leave the card in its empty state.
    console.warn('Call-Up: could not load upcoming match for', categoryId, error)
    upcomingMatch.value = null
  } finally {
    isLoadingMatch.value = false
  }
}

// Loads how many players are already in the call-up for a match so the
// squad-capacity counter reflects the real squad size.
async function loadCallUpCount(matchId) {
  try {
    const response = await matchService.getCallUpCount(matchId)
    calledUpCount.value = Number(response?.data?.count ?? 0)
  } catch (error) {
    console.warn('Call-Up: could not load call-up count for', matchId, error)
    calledUpCount.value = 0
  }
}

// The API returns our own club (clubName) plus the opponent and an isHome flag.
// Place the opponent on the correct side (home/away) so the fixture reads
// correctly. We show the club name here rather than the squad category.
const ourSquadName = computed(() => upcomingMatch.value?.clubName || '')
const homeTeamName = computed(() => {
  if (!upcomingMatch.value) return ''
  return upcomingMatch.value.isHome ? ourSquadName.value : upcomingMatch.value.opponentName || ''
})
const awayTeamName = computed(() => {
  if (!upcomingMatch.value) return ''
  return upcomingMatch.value.isHome ? upcomingMatch.value.opponentName || '' : ourSquadName.value
})

// Track image load failures so we can fall back to initials.
const imgErrors = reactive({})

// ── Selection state (persists across category switches) ───────────────────────
const selectedIds = ref([])
const isFinalising = ref(false)

// Players already called up for the loaded match, from
// GET /api/match-callup-players/count/{matchId}. This is the source of truth for
// the squad-capacity counter — the ring reflects the real squad size, not the
// local draft selection (which drives only the Finalise action).
const calledUpCount = ref(0)

const isSelected = (id) => selectedIds.value.includes(id)
const selectedCount = computed(() => selectedIds.value.length)
const squadCount = computed(() => calledUpCount.value)
const remainingSlots = computed(() => Math.max(0, SQUAD_LIMIT - squadCount.value))
const ringOffset = computed(() =>
  RING_CIRCUMFERENCE * (1 - Math.min(squadCount.value, SQUAD_LIMIT) / SQUAD_LIMIT)
)

function toggleSelect(player) {
  if (player.isCalled) return
  const idx = selectedIds.value.indexOf(player.id)
  if (idx === -1) {
    selectedIds.value = [...selectedIds.value, player.id]
  } else {
    selectedIds.value = selectedIds.value.filter((id) => id !== player.id)
  }
}

function resetSelection() {
  selectedIds.value = []
}

// ── Reset the whole match call-up ───────────────────────────────────────────
// A destructive action (DELETE /api/match-callup-players/{matchId}) that drops
// every player from the loaded match's call-up. We gate it behind a styled
// confirmation modal (openResetConfirm) so it can never fire by accident.
const showResetConfirm = ref(false)
const isResetting = ref(false)

function openResetConfirm() {
  if (!upcomingMatch.value?.matchId) return
  showResetConfirm.value = true
}

async function confirmResetCallUp() {
  const matchId = Number(upcomingMatch.value?.matchId)
  if (!matchId || isResetting.value) return

  showResetConfirm.value = false
  isResetting.value = true
  // Loading toast (duration 0 keeps it visible until the request resolves).
  showToast({
    title: $t('callUp.resettingTitle'),
    message: $t('callUp.resettingMessage'),
    mode: 'loading',
    duration: 0,
  })

  try {
    const response = await matchService.resetCallUp(matchId)
    const removed = Number(response?.data?.removed ?? 0)
    // Re-sync the squad counter and clear any locally-drafted selection.
    if (matchId) loadCallUpCount(matchId)
    if (selectedCategory.value) loadRoster(selectedCategory.value)
    resetSelection()
    showToast({
      title: $t('callUp.resetSuccessTitle'),
      message: $t('callUp.resetSuccessMessage', { count: removed }),
      mode: 'success',
    })
  } catch (error) {
    const message = error?.response?.data?.message || $t('callUp.resetFailedMessage')
    showToast({
      title: $t('callUp.resetFailedTitle'),
      message,
      mode: 'error',
    })
  } finally {
    isResetting.value = false
  }
}

// ── Roster loading: real API ─────────────────────────────────────────────────
// Load the players available for call-up in the chosen category from
// GET /api/players/available/{categoryId} -> { data: [...] }.
async function loadRoster(categoryId) {
  players.value = []
  if (!categoryId) return
  try {
    const response = await playerService.getAvailablePlayersByCategory(categoryId)
    players.value = normalizeAvailablePlayers(response?.data)
  } catch (error) {
    console.warn('Call-Up: could not load available players for', categoryId, error)
    players.value = []
  }
}

// ── Load the squad categories from the same /lookups/categories endpoint the
//    rest of the dashboard uses (PlayerAcquisition, Schedule, Training, Staff).
//    Normalization mirrors the PitchPro lookup standard so any field-naming
//    convention from the API works. Falls back to the demo categories if the
//    request fails, so the page is never left without options. ────────────────
function normalizeLookupItem(item) {
  if (!item) return { id: 'Unknown', name: 'Unknown' }
  if (typeof item === 'string' || typeof item === 'number') {
    return { id: item, name: String(item) }
  }
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
  return array.map(normalizeLookupItem).filter((item) => item.id !== 'Unknown')
}

async function loadCategories() {
  isLoadingCategories.value = true
  try {
    const response = await lookupService.getCategories()
    const list = normalizeLookupArray(response?.data)
    if (list.length) {
      categories.value = list
    }
  } catch (error) {
    // Keep the default demo categories already in state.
    console.warn('Call-Up: could not load categories from /lookups/categories, using defaults.', error)
  } finally {
    isLoadingCategories.value = false
  }
}

const filteredPlayers = computed(() => players.value)

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ── Finalise the match squad ──────────────────────────────────────────────────
// POST the selected players to the match call-up endpoint
// (POST /api/match-callup-players) for the currently loaded upcoming match +
// category. The server validates that the match and every player belong to the
// category within the club, so MatchID/CategoryID must come from the loaded data.
async function finaliseSquad() {
  if (selectedCount.value === 0 || isFinalising.value) return

  const matchId = Number(upcomingMatch.value?.matchId)
  const categoryId = Number(selectedCategory.value)

  if (!matchId || !categoryId) {
    showToast({
      title: $t('callUp.noMatchTitle'),
      message: $t('callUp.noMatchMessage'),
      mode: 'error',
    })
    return
  }

  isFinalising.value = true
  showToast({
    title: $t('callUp.finalisingTitle'),
    message: $t('callUp.finalisingMessage'),
    mode: 'loading',
    duration: 0,
  })

  try {
    const response = await matchService.addCallUpPlayers({
      MatchID: matchId,
      CategoryID: categoryId,
      PlayerIDs: selectedIds.value.map((id) => Number(id)),
    })
    showToast({
      title: $t('callUp.finalisedTitle'),
      message: $t('callUp.finalisedMessage', {
        count: response?.data?.added ?? selectedCount.value,
      }),
      mode: 'success',
    })
    resetSelection()
    loadCallUpCount(matchId)
    loadRoster(categoryId)
  } catch (error) {
    const message = error?.response?.data?.message || $t('callUp.finaliseError')
    showToast({
      title: $t('callUp.finaliseErrorTitle'),
      message,
      mode: 'error',
    })
  } finally {
    isFinalising.value = false
  }
}

onMounted(loadCategories)
watch(selectedCategory, (id) => {
  loadRoster(id)
  loadUpcomingMatch(id)
})
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <DashboardSidebar active-item="call-up" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      class="pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300 lg:flex-1"
    >
      <div class="space-y-8">

        <!-- ── Page Header ── -->
        <section class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div class="space-y-2">
            <span class="text-[10px] font-bold tracking-[0.2em] text-green-400 font-headline uppercase">{{ $t('callUp.sectionTitle') }}</span>
            <h2 class="text-4xl font-black font-headline tracking-tighter text-white">
              {{ $t('callUp.pageTitle') }} <span class="text-slate-500">{{ $t('callUp.pageSubtitle') }}</span>
            </h2>
          </div>
        </section>

        <!-- ── Match Details & Counter Bento Grid ── -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <!-- Match Card -->
          <div class="lg:col-span-8 bg-surface-container-high rounded-xl p-6 relative overflow-hidden flex flex-col justify-between border-l-4 border-green-400">
            <div v-if="selectedCategory" class="relative z-10">
              <div class="flex items-center justify-between mb-5">
                <span class="font-label text-[10px] uppercase tracking-[0.2em] text-green-400">{{ $t('callUp.nextFixture') }}</span>
                <span v-if="upcomingMatch?.isCompleted != null" class="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                  :class="upcomingMatch.isCompleted ? 'bg-surface-container-lowest text-on-surface-variant' : 'bg-green-400/10 text-green-400'"
                >
                  {{ upcomingMatch.isCompleted ? $t('callUp.completed') : $t('callUp.upcoming') }}
                </span>
              </div>

              <div v-if="isLoadingMatch" class="flex items-center gap-2 text-on-surface-variant py-6">
                <span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span class="text-sm">{{ $t('callUp.loadingMatch') }}</span>
              </div>

              <template v-else-if="upcomingMatch">
                <!-- Teams -->
                <div class="flex items-center justify-between gap-4">
                  <div class="flex-1 text-right min-w-0">
                    <div class="font-headline text-2xl md:text-3xl font-black text-on-surface uppercase truncate">{{ homeTeamName || $t('callUp.tbd') }}</div>
                    <div class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">{{ $t('callUp.home') }}</div>
                  </div>
                  <div class="flex flex-col items-center px-2 md:px-6">
                    <span class="font-headline text-xl md:text-2xl font-black text-green-400">{{ $t('callUp.vs') }}</span>
                  </div>
                  <div class="flex-1 text-left min-w-0">
                    <div class="font-headline text-2xl md:text-3xl font-black text-on-surface uppercase truncate">{{ awayTeamName || $t('callUp.tbd') }}</div>
                    <div class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">{{ $t('callUp.away') }}</div>
                  </div>
                </div>

                <!-- Match details -->
                <div class="mt-7 grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <div v-if="upcomingMatch.dateLabel" class="bg-surface-container-lowest rounded-lg p-3 flex items-center gap-3">
                    <span class="material-symbols-outlined text-green-400 text-xl">calendar_today</span>
                    <div class="min-w-0">
                      <div class="text-[9px] uppercase tracking-widest text-on-surface-variant">{{ $t('callUp.kickoff') }}</div>
                      <div class="text-sm font-bold text-on-surface truncate">{{ upcomingMatch.dateLabel }}</div>
                    </div>
                  </div>
                  <div v-if="upcomingMatch.stadiumName" class="bg-surface-container-lowest rounded-lg p-3 flex items-center gap-3">
                    <span class="material-symbols-outlined text-green-400 text-xl">location_on</span>
                    <div class="min-w-0">
                      <div class="text-[9px] uppercase tracking-widest text-on-surface-variant">{{ $t('callUp.venue') }}</div>
                      <div class="text-sm font-bold text-on-surface truncate">{{ upcomingMatch.stadiumName }}</div>
                    </div>
                  </div>
                  <div v-if="upcomingMatch.isHome != null" class="bg-surface-container-lowest rounded-lg p-3 flex items-center gap-3">
                    <span class="material-symbols-outlined text-green-400 text-xl">{{ upcomingMatch.isHome ? 'home' : 'flight' }}</span>
                    <div class="min-w-0">
                      <div class="text-[9px] uppercase tracking-widest text-on-surface-variant">{{ $t('callUp.fixture') }}</div>
                      <div class="text-sm font-bold text-on-surface truncate">{{ upcomingMatch.isHome ? $t('callUp.home') : $t('callUp.away') }}</div>
                    </div>
                  </div>
                </div>
              </template>

              <p v-else class="font-headline font-bold text-on-surface py-6">{{ $t('callUp.noUpcomingMatch') }}</p>
            </div>
            <div v-else class="relative z-10 flex flex-col items-center justify-center text-center py-10">
              <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-3">tune</span>
              <p class="font-headline font-bold text-on-surface">{{ $t('callUp.selectCategoryFirst') }}</p>
            </div>
            <div class="absolute -right-12 -top-12 opacity-5 pointer-events-none">
              <span class="material-symbols-outlined text-[240px]" style="font-variation-settings: 'FILL' 1;">sports_soccer</span>
            </div>
          </div>

          <!-- Squad Limit Counter -->
          <div class="lg:col-span-4 bg-surface-container-lowest rounded-xl p-6 flex flex-col items-center justify-center text-center border border-outline-variant/10 shadow-xl">
            <span class="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">{{ $t('callUp.squadCapacity') }}</span>
            <template v-if="selectedCategory">
              <div class="relative">
                <svg class="w-24 h-24 transform -rotate-90">
                  <circle class="text-surface-container-highest" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" stroke-width="4"></circle>
                  <circle
                    class="text-green-400 transition-all duration-1000"
                    cx="48" cy="48" fill="transparent" r="40"
                    stroke="currentColor"
                    :stroke-dasharray="RING_CIRCUMFERENCE.toFixed(1)"
                    :stroke-dashoffset="ringOffset.toFixed(1)"
                    stroke-width="6"
                  ></circle>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center flex-col">
                  <span class="font-headline text-3xl font-black text-on-surface">{{ squadCount }}</span>
                  <span class="text-[10px] text-outline-variant font-bold">/ {{ SQUAD_LIMIT }}</span>
                </div>
              </div>
              <p class="font-body text-xs text-on-surface-variant mt-3">
                <template v-if="remainingSlots > 0">{{ $t('callUp.slotsRemaining', { count: remainingSlots }) }}</template>
                <template v-else>{{ $t('callUp.squadFull') }}</template>
              </p>
            </template>
            <template v-else>
              <div class="flex flex-col items-center justify-center py-6 text-on-surface-variant">
                <span class="material-symbols-outlined text-3xl mb-2 text-green-400">category</span>
                <p class="font-headline font-bold text-sm">{{ $t('callUp.selectCategoryFirst') }}</p>
              </div>
            </template>
          </div>
        </div>

        <!-- ── Roster Interface ── -->
        <div class="bg-surface-container-low rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/5">
          <!-- Table Controls -->
          <div class="p-6 flex flex-col md:flex-row gap-4 justify-between items-center bg-surface-container-high/50">
            <!-- Category selector -->
            <div class="relative group w-full md:w-48">
              <button
                type="button"
                class="w-full flex items-center justify-between px-4 py-3 bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-[10px] font-bold uppercase tracking-widest text-on-surface hover:border-green-400 transition-all"
              >
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm text-green-400">groups</span>
                  {{ selectedCategory ? (categories.find((c) => c.id === selectedCategory)?.name) : $t('callUp.selectCategoryFirst') }}
                </div>
                <span class="material-symbols-outlined text-xs">expand_more</span>
              </button>
              <div class="absolute top-full left-0 w-full bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50 overflow-hidden before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 before:content-['']">
                <div class="p-1">
                  <button
                    v-for="cat in categories"
                    :key="cat.id"
                    type="button"
                    @click="selectedCategory = cat.id"
                    :class="[
                      'w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors',
                      cat.id === selectedCategory
                        ? 'text-green-400 bg-green-400/10'
                        : 'text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                    ]"
                  >{{ cat.name }}</button>
                </div>
              </div>
            </div>

            <!-- Reset Call-Up -->
            <button
              type="button"
              :disabled="!upcomingMatch?.matchId || isResetting"
              @click="openResetConfirm"
              :class="[
                'w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors border',
                upcomingMatch?.matchId
                  ? 'border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500'
                  : 'border-outline-variant/20 text-slate-600 cursor-not-allowed'
              ]"
            >
              <span class="material-symbols-outlined text-sm">restart_alt</span> {{ $t('callUp.resetCallUps') }}
            </button>
          </div>

          <!-- Table Content -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-container-low border-b border-outline-variant/10">
                  <th class="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{{ $t('callUp.colPlayer') }}</th>
                  <th class="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{{ $t('callUp.colPosition') }}</th>
                  <th class="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant text-center">{{ $t('callUp.colJersey') }}</th>
                  <th class="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant text-right">{{ $t('callUp.colSelection') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/5">
                <tr
                  v-for="player in filteredPlayers"
                  :key="player.id"
                  :class="[
                    'group hover:bg-surface-container-high/40 transition-colors',
                    isSelected(player.id) ? 'bg-green-400/[0.04]' : '',
                    player.isCalled ? 'bg-error-container/10' : ''
                  ]"
                >
                  <!-- Player -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-md bg-surface-container-highest flex-shrink-0 overflow-hidden border border-outline-variant/10">
                        <img
                          v-if="!imgErrors[player.id] && player.avatar"
                          :src="player.avatar"
                          :alt="player.name"
                          class="w-full h-full object-cover"
                          @error="imgErrors[player.id] = true"
                        />
                        <div v-else class="w-full h-full flex items-center justify-center text-[10px] font-black text-on-surface-variant">
                          {{ initials(player.name) }}
                        </div>
                      </div>
                      <div>
                        <p class="font-headline font-bold" :class="player.isCalled ? 'text-error' : 'text-on-surface'">{{ player.name }}</p>
                        <p v-if="player.tag?.market" class="text-[10px] text-outline-variant uppercase font-bold tracking-tighter">
                          {{ $t('callUp.marketValue') }}: £{{ player.tag.market }}M
                        </p>
                        <p v-else-if="player.tag?.key" class="text-[10px] text-outline-variant uppercase font-bold tracking-tighter">
                          {{ $t(player.tag.key) }}
                        </p>
                      </div>
                    </div>
                  </td>

                  <!-- Position -->
                  <td class="px-6 py-4">
                    <span class="px-2 py-1 bg-surface-container-highest text-on-surface-variant text-[10px] font-bold rounded uppercase">{{ player.positionKey ? $t(player.positionKey) : player.position }}</span>
                  </td>

                  <!-- Jersey -->
                  <td class="px-6 py-4 text-center font-headline font-black text-green-400">{{ player.jersey }}</td>

                  <!-- Selection -->
                  <td class="px-6 py-4 flex justify-end items-center">
                    <button
                      v-if="!player.isCalled"
                      type="button"
                      @click="toggleSelect(player)"
                      :class="[
                        'w-6 h-6 rounded-md flex items-center justify-center transition-all',
                        isSelected(player.id)
                          ? 'bg-green-400 text-slate-950 border-2 border-green-400'
                          : 'border-2 border-outline-variant group-hover:border-green-400'
                      ]"
                    >
                      <span :class="['material-symbols-outlined text-sm font-bold', isSelected(player.id) ? '' : 'opacity-0']">check</span>
                    </button>
                    <span v-else class="text-[10px] font-bold uppercase tracking-widest text-error">{{ $t('callUp.calledUp') }}</span>
                  </td>
                </tr>

                <!-- Empty state -->
                <tr v-if="filteredPlayers.length === 0">
                  <td colspan="4" class="px-6 py-16 text-center text-on-surface-variant text-sm">
                    {{ selectedCategory ? $t('callUp.emptyRoster') : $t('callUp.selectCategoryFirst') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Spacer for bottom floating actions -->
        <div class="h-24"></div>
      </div>
    </main>

    <!-- ── Floating Action Bar ── -->
    <div class="fixed bottom-0 right-0 left-0 lg:left-64 p-6 pointer-events-none z-30">
      <div class="max-w-7xl mx-auto flex justify-end pointer-events-auto">
        <div class="bg-surface-container-highest/80 backdrop-blur-xl p-4 rounded-2xl flex items-center gap-6 shadow-[0_10px_50px_rgba(0,230,57,0.15)] border border-outline-variant/10">
          <div class="hidden md:block">
            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none">{{ $t('callUp.draftSelection') }}</p>
            <p class="text-sm font-headline font-bold text-on-surface mt-1">{{ $t('callUp.matchReady') }}: <span class="text-green-400">{{ selectedCount }}</span> {{ $t('callUp.playersLabel') }}</p>
          </div>
          <button
            type="button"
            :disabled="selectedCount === 0 || isFinalising || !upcomingMatch"
            @click="finaliseSquad"
            :class="[
              'font-headline font-bold text-sm uppercase tracking-tighter rounded-lg px-8 py-4 shadow-lg transition-all flex items-center gap-2',
              selectedCount > 0
                ? 'bg-gradient-to-br from-green-400 to-green-300 text-slate-950 hover:scale-[1.02] active:scale-95'
                : 'bg-surface-container-high text-slate-600 cursor-not-allowed'
            ]"
          >
            {{ $t('callUp.finalise') }} <span class="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Reset Call-Up confirmation ── -->
    <Teleport to="body">
      <div v-if="showResetConfirm" class="fixed inset-0 z-[130] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="showResetConfirm = false"></div>
        <div class="relative w-full max-w-md overflow-hidden rounded-xl border border-red-500/20 bg-surface-container-low shadow-2xl">
          <div class="flex flex-col items-center p-6 text-center">
            <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
              <span class="material-symbols-outlined text-3xl text-red-400">warning</span>
            </div>
            <h2 class="font-headline text-lg font-black uppercase tracking-tight text-on-surface">{{ $t('callUp.resetConfirmTitle') }}</h2>
            <p class="mt-3 text-sm text-on-surface-variant">
              {{ $t('callUp.resetConfirmMessage', { count: squadCount }) }}
            </p>
          </div>
          <div class="flex gap-3 border-t border-outline-variant/10 p-4">
            <button
              type="button"
              :disabled="isResetting"
              @click="showResetConfirm = false"
              class="flex-1 rounded-md py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="button"
              :disabled="isResetting"
              @click="confirmResetCallUp"
              class="flex-1 rounded-md bg-red-500 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <span v-if="isResetting" class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              <span v-else class="material-symbols-outlined text-sm">restart_alt</span>
              {{ $t('callUp.confirmReset') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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
const isLoadingCategories = ref(false)

// ── Match intelligence state ─────────────────────────────────────────────────
const match = ref(null)
const callUpPlayers = ref([])
const isLoadingIntel = ref(false)
const matchLoaded = ref(false)
const monitoring = ref(false)

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
      isCalled: !!(p.isCalled ?? p.IsCalled ?? false),
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
async function loadMatchIntelligence() {
  if (!selectedCategory.value || isLoadingIntel.value) return
  isLoadingIntel.value = true
  try {
    const [matchRes, playersRes] = await Promise.all([
      matchService.getUpcomingMatch(selectedCategory.value),
      playerService.getAvailablePlayersByCategory(selectedCategory.value),
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

onMounted(loadCategories)
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <DashboardSidebar active-item="match-monitor" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main class="pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background p-6 lg:p-10 lg:flex-1 flex flex-col">

        <!-- MONITORING dashboard -->
        <div class="space-y-8 relative">
          <!-- Fixture bento -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2 bg-surface-container-high rounded-xl p-8 relative overflow-hidden flex items-center justify-between">
              <div class="relative z-10">
                <span class="text-primary-fixed-dim font-label text-xs uppercase tracking-widest mb-2 block">{{ $t('matchMonitor.upcomingFixture') }}</span>
                <h3 class="font-headline text-5xl font-black tracking-tighter uppercase mb-2 text-on-surface">{{ match?.opponentName || '—' }}</h3>
                <div class="flex items-center gap-4 text-on-surface-variant">
                  <div class="flex items-center gap-1" v-if="match?.stadiumName">
                    <span class="material-symbols-outlined text-sm">stadium</span>
                    <span class="text-sm font-medium">{{ match.stadiumName }}</span>
                  </div>
                  <div class="w-1 h-1 bg-outline-variant rounded-full" v-if="match?.stadiumName && match?.dateLabel"></div>
                  <div class="flex items-center gap-1" v-if="match?.dateLabel">
                    <span class="material-symbols-outlined text-sm">schedule</span>
                    <span class="text-sm font-medium">{{ match.dateLabel }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <span class="text-on-surface-variant font-label text-[10px] uppercase tracking-widest block mb-4">{{ $t('matchMonitor.winProbability') }}</span>
                <div class="flex items-end gap-2">
                  <span class="font-headline text-5xl font-black text-primary-fixed-dim tracking-tighter">{{ winProbability.toFixed(1) }}</span>
                  <span class="text-xl font-headline font-bold mb-1">%</span>
                </div>
              </div>
              <div class="space-y-2">
                <div class="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div class="h-full bg-primary-container" :style="{ width: winProbability + '%' }"></div>
                </div>
                <p class="text-[10px] text-on-surface-variant italic">{{ $t('matchMonitor.forecastNote') }}</p>
              </div>
            </div>
          </div>

          <!-- Matchday Call-Up -->
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <h4 class="font-headline text-xl font-bold tracking-tight uppercase flex items-center gap-3 text-on-surface">
                {{ $t('matchMonitor.callUpTitle') }}
                <span class="text-xs bg-surface-container-high px-2 py-1 rounded text-on-surface-variant">{{ $t('matchMonitor.playersSelected', { count: callUpPlayers.length }) }}</span>
              </h4>
              <router-link to="/dashboard/call-up" class="flex items-center gap-2 text-primary-fixed-dim text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all">
                <span class="material-symbols-outlined text-sm">edit</span> {{ $t('matchMonitor.adjustRoster') }}
              </router-link>
            </div>
            <div v-if="callUpPlayers.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div
                v-for="p in callUpPlayers"
                :key="p.id"
                class="bg-surface-container-low group hover:bg-surface-container-high transition-all duration-300 rounded-lg p-4 border border-outline-variant/5 relative overflow-hidden"
              >
                <div class="absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span class="font-headline text-6xl font-black italic tracking-tighter">{{ p.jersey || '–' }}</span>
                </div>
                <div class="relative z-10">
                  <div class="flex justify-between items-start mb-4">
                    <span class="text-[10px] font-mono text-primary-fixed-dim bg-primary-fixed-dim/10 px-1.5 py-0.5 rounded">
                      {{ p.positionKey ? $t(p.positionKey) : (p.position || '—') }}
                    </span>
                    <span
                      class="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                      :class="p.isCalled ? 'bg-primary-container/20 text-primary-fixed-dim' : 'bg-surface-container-high text-on-surface-variant'"
                    >
                      {{ p.isCalled ? $t('matchMonitor.statusCalledUp') : $t('matchMonitor.statusAvailable') }}
                    </span>
                  </div>
                  <h5 class="font-headline text-lg font-bold leading-none mb-1 text-on-surface">{{ p.name }}</h5>
                </div>
              </div>
            </div>
            <p v-else class="text-on-surface-variant text-sm">{{ $t('matchMonitor.noPlayers') }}</p>
          </div>

          <!-- Tactical directive + Pitch simulation -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-surface-container-low rounded-xl p-6 border border-outline-variant/5">
              <h4 class="font-headline text-lg font-bold uppercase mb-6 flex items-center gap-2 text-on-surface">
                <span class="material-symbols-outlined text-primary-fixed-dim">radar</span> {{ $t('matchMonitor.tacticalDirective') }}
              </h4>
              <div class="space-y-4">
                <div class="p-4 bg-surface-container-lowest rounded-lg border-l-4 border-primary-fixed-dim">
                  <p class="text-sm font-medium mb-2 text-on-surface">{{ $t('matchMonitor.highPress') }}</p>
                  <textarea
                    v-model="directivePress"
                    rows="3"
                    class="w-full bg-transparent text-xs text-on-surface-variant leading-relaxed focus:outline-none resize-none"
                  ></textarea>
                </div>
                <div class="p-4 bg-surface-container-lowest rounded-lg border-l-4 border-outline-variant">
                  <p class="text-sm font-medium mb-2 text-on-surface">{{ $t('matchMonitor.transitionMgmt') }}</p>
                  <textarea
                    v-model="directiveTransition"
                    rows="3"
                    class="w-full bg-transparent text-xs text-on-surface-variant leading-relaxed focus:outline-none resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
            <div class="relative rounded-xl overflow-hidden glass-panel border border-outline-variant/10 min-h-[300px] flex flex-col">
              <div class="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,65,0.05)_0%,transparent_70%)]"></div>
              <div class="p-6 relative z-10 flex-1 flex flex-col">
                <h4 class="font-headline text-lg font-bold uppercase mb-4 text-on-surface">{{ $t('matchMonitor.pitchSimulation') }}</h4>
                <div class="flex-1 flex items-center justify-center border border-dashed border-outline-variant/20 rounded-lg">
                  <div class="text-center">
                    <span class="material-symbols-outlined text-4xl text-on-surface-variant/20">sports_soccer</span>
                    <p class="text-xs text-on-surface-variant mt-2 font-mono uppercase tracking-widest">{{ $t('matchMonitor.awaitingFeed') }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Final result + Match events -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
            <div class="lg:col-span-1 bg-surface-container-high rounded-xl p-6 border border-primary-fixed-dim/20 relative overflow-hidden">
              <div class="absolute top-0 right-0 p-2 opacity-10">
                <span class="material-symbols-outlined text-4xl">fact_check</span>
              </div>
              <h4 class="font-headline text-lg font-bold uppercase mb-6 flex items-center gap-2 text-primary-fixed-dim">
                <span class="material-symbols-outlined">scoreboard</span> {{ $t('matchMonitor.finalResult') }}
              </h4>
              <div class="flex items-center justify-around gap-4 bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10">
                <div class="text-center">
                  <p class="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-2">{{ homeTeamName || 'HOME' }}</p>
                  <input
                    v-model.number="homeScore"
                    class="w-16 h-16 bg-background border-2 border-outline-variant/20 rounded-lg text-center text-3xl font-black text-primary-fixed-dim focus:border-primary-fixed-dim focus:ring-0 transition-colors"
                    min="0" type="number"
                  />
                </div>
                <div class="text-2xl font-black text-on-surface-variant/30">VS</div>
                <div class="text-center">
                  <p class="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-2">{{ awayTeamName || 'AWAY' }}</p>
                  <input
                    v-model.number="awayScore"
                    class="w-16 h-16 bg-background border-2 border-outline-variant/20 rounded-lg text-center text-3xl font-black text-on-surface-variant focus:border-primary-fixed-dim focus:ring-0 transition-colors"
                    min="0" type="number"
                  />
                </div>
              </div>
              <button
                type="button"
                @click="finalizeReport"
                class="w-full mt-6 py-3 bg-primary-container text-on-primary-container font-headline font-bold text-xs uppercase tracking-widest rounded hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,230,57,0.2)]"
              >
                {{ $t('matchMonitor.finalizeReport') }}
              </button>
            </div>

            <div class="lg:col-span-2 bg-surface-container-low rounded-xl p-6 border border-outline-variant/10 flex flex-col">
              <div class="flex items-center justify-between mb-6">
                <h4 class="font-headline text-lg font-bold uppercase flex items-center gap-2 text-on-surface">
                  <span class="material-symbols-outlined text-primary-fixed-dim">terminal</span> {{ $t('matchMonitor.matchEvents') }}
                </h4>
                <div class="flex gap-2">
                  <button
                    type="button"
                    @click="eventType = 'goal'"
                    :class="['p-2 rounded transition-colors', eventType === 'goal' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-primary-fixed-dim hover:bg-primary-container hover:text-on-primary-container']"
                  >
                    <span class="material-symbols-outlined text-sm">sports_soccer</span>
                  </button>
                  <button
                    type="button"
                    @click="eventType = 'yellow'"
                    :class="['p-2 rounded transition-colors', eventType === 'yellow' ? 'bg-yellow-400 text-black' : 'bg-surface-container-high text-yellow-400 hover:bg-yellow-400 hover:text-black']"
                  >
                    <span class="material-symbols-outlined text-sm">style</span>
                  </button>
                  <button
                    type="button"
                    @click="eventType = 'red'"
                    :class="['p-2 rounded transition-colors', eventType === 'red' ? 'bg-error text-on-error' : 'bg-surface-container-high text-error hover:bg-error hover:text-on-error']"
                  >
                    <span class="material-symbols-outlined text-sm">style</span>
                  </button>
                </div>
              </div>
              <div class="flex-1 bg-surface-container-lowest rounded border border-outline-variant/5 p-4 font-mono text-xs space-y-2 overflow-y-auto max-h-[200px]">
                <div class="flex items-center gap-3 text-primary-fixed-dim/60">
                  <span class="opacity-40">[00:00]</span>
                  <span>SYSTEM: MATCH_LOG_INITIALIZED...</span>
                </div>
                <div
                  v-for="(ev, i) in events"
                  :key="i"
                  class="flex items-center gap-3 text-on-surface"
                >
                  <span class="text-primary-fixed-dim">[{{ ev.time }}]</span>
                  <span class="flex items-center gap-1">
                    <span
                      class="material-symbols-outlined text-[14px]"
                      :class="ev.type === 'goal' ? 'text-primary-fixed-dim' : ev.type === 'yellow' ? 'text-yellow-400' : 'text-error'"
                    >{{ eventIcon(ev.type) }}</span>
                    {{ ev.type === 'goal' ? $t('matchMonitor.logGoal') : ev.type === 'yellow' ? $t('matchMonitor.logYellow') : $t('matchMonitor.logRed') }}: {{ ev.player }}
                  </span>
                  <span class="text-on-surface-variant" v-if="ev.detail">/ {{ ev.detail }}</span>
                </div>
                <div class="animate-pulse text-primary-fixed-dim mt-2">_</div>
              </div>
              <div class="mt-4 flex gap-2">
                <select v-model="eventPlayer" class="flex-1 bg-background border-outline-variant/20 rounded text-xs text-on-surface focus:ring-primary-fixed-dim p-2">
                  <option value="">{{ $t('matchMonitor.selectPlayer') }}</option>
                  <option v-for="p in callUpPlayers" :key="p.id" :value="p.id">{{ p.name }} ({{ p.jersey }})</option>
                </select>
                <button
                  type="button"
                  @click="addEvent"
                  class="px-4 py-2 bg-surface-container-highest text-primary-fixed-dim border border-primary-fixed-dim/30 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-primary-fixed-dim/10 transition-all"
                >
                  {{ $t('matchMonitor.addEvent') }}
                </button>
              </div>
            </div>
          </div>
        </div>
    </main>
  </div>
</template>

<style scoped>
.glass-panel {
  background: rgba(50, 53, 56, 0.6);
  backdrop-filter: blur(20px);
}
.scanline::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent, rgba(0, 255, 65, 0.05), transparent);
  animation: scanline 8s linear infinite;
  pointer-events: none;
  border-radius: 0.75rem;
}
@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
</style>

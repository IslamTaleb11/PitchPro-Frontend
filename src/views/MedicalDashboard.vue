<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { useUiToast } from '../composables/useUiToast'
import { lookupService } from '../services/lookupService'
import { playerService } from '../services/playerService'

const { t: $t, locale } = useI18n()
const { showToast } = useUiToast()

const isSidebarOpen = ref(true)

// Total squad size used to derive the readiness matrix.
const SQUAD_TOTAL = 28

// ── Active injury ledger (demo data; no medical API exists yet) ──────────────
// `ready: true` means the player is available (e.g. load management), so they
// are NOT counted as unavailable in the readiness matrix.
const injuries = ref([
  {
    id: 'inj-1',
    name: 'M. Rashford',
    jersey: '10',
    category: 'Senior A',
    injury: 'Hamstring Strain',
    detail: 'Lvl 2 Tear - Lateral Head',
    severity: 4,
    erdLabel: '12 DAYS',
    erdDate: 'Oct 24, 2024',
    ready: false,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcJgXPTVaeyuj8lC_VBXWWtr1K1mnj1snUXxkL-NgciAugdJRY74v9GADQa4W9bm0BpybryjZS6IiEy1TO8z2pH6Ds3p1nvTXNwX2ZmOd0KdDMgd5xxWJGwLNmpXBr0KzgJSzwSX19e0AqGZYbcgQ16p02L_go74A43kZ1JlIPzkz5WyZOO1YcMhrHftIWId0jeI7ekTle3Jf4swDDxndQ4w26siRHdHRgu0kpKd2_OGNu_iTzZ4HAifSmgTuhK34PyxFwXn8PX_M',
  },
  {
    id: 'inj-2',
    name: 'L. Shaw',
    jersey: '23',
    category: 'Senior A',
    injury: 'Ankle Sprain',
    detail: 'Inversion Injury',
    severity: 2,
    erdLabel: '4 DAYS',
    erdDate: 'Oct 16, 2024',
    ready: false,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4nb31mD8LMaynP6ESJWKRyayP-_f35Gw9yT-IOq9RIdmJ5VRckAgHvTso8UEFVN8ETUDBMntlgt1pRZdEr3Y-TmM__g1-Y8tb9A0Mux6DygNl2F-O0F3V9BOL2c6Upzpc8wZOODhW_04VuIstT2217ANIaylaRI1j6zAwaRLbv0A0XhTxLwigEfsXov0woiyRJeH9m8e_gftUIoePprtB8cqGz9tIO2RRSmS64RYirbB1ClLG1H3U1dgJNVgZS6UeRAi2BF3XNPE',
  },
  {
    id: 'inj-3',
    name: 'K. Mainoo',
    jersey: '37',
    category: 'Development',
    injury: 'Fatigue Mgmt',
    detail: 'Load Reduction Plan',
    severity: 1,
    erdLabel: 'READY',
    erdDate: 'Oct 12, 2024',
    ready: true,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3IXwrw3AJppl5AZl8r24xH6GvEbO9zTdqnmFlX_NPkb7kJXInZ7PVvSau_-M6zinhW2V55v-CKKqz5_EbaeRL-QhTlv0cYFtpc0TgyOZkws2zmWIb4-Ui6IIw6EPS3VcNXbFSyzj4BmodqH5SBnrUUlElswREzTvlUqvwQCFCWj0e1qD1eXBWOANqLYrSjoK_gHhGOL25TNwSMg04QQobJ1pkMd4OCTGHc9ueRwVmbq-RxwGgMdyiHo_oJX7zd-PWdE3R01H1Vzo',
  },
])

// ── Readiness matrix (derived from the ledger) ───────────────────────────────
const unavailableCount = computed(() => injuries.value.filter((i) => !i.ready).length)
const matchFit = computed(() => SQUAD_TOTAL - unavailableCount.value)
const squadAvailability = computed(() => `${Math.round((matchFit.value / SQUAD_TOTAL) * 100)}%`)

// ── Category filter for the injury ledger ────────────────────────────────────
// Options are derived from the categories actually present in the ledger so the
// filter always reflects what is shown, regardless of the demo/API category mix.
const selectedInjuryCategory = ref('')
const injuryCategories = computed(() => [...new Set(injuries.value.map((i) => i.category))])
const filteredInjuries = computed(() =>
  selectedInjuryCategory.value
    ? injuries.value.filter((i) => i.category === selectedInjuryCategory.value)
    : injuries.value
)

// ── Categories (loaded from /lookups/categories, same as the rest of app) ────
// Stored as `{ id, name }` objects so we can resolve the category id needed by
// the `/players/by-category/{categoryId}` endpoint when recording an incident.
const categories = ref([
  { id: 'first-team', name: 'First Team' },
  { id: 'u21', name: 'U-21 Squad' },
  { id: 'u18', name: 'U-18 Squad' },
])
const isLoadingCategories = ref(false)

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
    console.warn('Medical: could not load categories from /lookups/categories, using defaults.', error)
  } finally {
    isLoadingCategories.value = false
  }
}

// Resolve a stored category id back to its display name.
function categoryName(id) {
  const found = categories.value.find((c) => c.id === id)
  return found ? found.name : id
}

// ── Players available for the terminals (demo data) ──────────────────────────
const players = ref([
  'A. Onana (#24)',
  'B. Fernandes (#8)',
  'Diogo Dalot (#20)',
  'Harry Maguire',
  'Casemiro',
  'Antony',
])

// ── Status Management Terminal ───────────────────────────────────────────────
const terminalCategory = ref('')
const terminalPlayer = ref('')
const terminalFitness = ref('fit') // 'fit' | 'partial' | 'sidelined'

function executeCommand() {
  if (!terminalPlayer.value) {
    showToast({
      title: $t('common.missingFields'),
      message: $t('medical.selectPlayerFirst'),
      mode: 'error',
    })
    return
  }
  showToast({
    title: $t('medical.commandExecutedTitle'),
    message: $t('medical.commandExecutedMessage', {
      player: terminalPlayer.value,
      state: $t(terminalFitness === 'fit' ? 'medical.fit' : terminalFitness === 'partial' ? 'medical.partial' : 'medical.sidelined'),
    }),
    mode: 'success',
  })
}

// ── Record Incident form ─────────────────────────────────────────────────────
const incidentDate = ref('')
// Stores the selected category *id* so we can hit /players/by-category/{id}.
const incidentCategory = ref('')
const incidentPlayer = ref('')
// Players belonging to the selected category, loaded from the API.
const incidentPlayers = ref([])
const isLoadingIncidentPlayers = ref(false)

// Body-part catalogue. The numeric `id` is what gets stored on a record and is
// the canonical value the medical API is expected to use.
const bodyParts = [
  { id: 1, labelKey: 'medical.bodyPartHead' },
  { id: 2, labelKey: 'medical.bodyPartNeck' },
  { id: 3, labelKey: 'medical.bodyPartShoulder' },
  { id: 4, labelKey: 'medical.bodyPartArm' },
  { id: 5, labelKey: 'medical.bodyPartElbow' },
  { id: 6, labelKey: 'medical.bodyPartWrist' },
  { id: 7, labelKey: 'medical.bodyPartHand' },
  { id: 8, labelKey: 'medical.bodyPartChest' },
  { id: 9, labelKey: 'medical.bodyPartBack' },
  { id: 10, labelKey: 'medical.bodyPartAbdomen' },
  { id: 11, labelKey: 'medical.bodyPartHip' },
  { id: 12, labelKey: 'medical.bodyPartGroin' },
  { id: 13, labelKey: 'medical.bodyPartThigh' },
  { id: 14, labelKey: 'medical.bodyPartHamstring' },
  { id: 15, labelKey: 'medical.bodyPartKnee' },
  { id: 16, labelKey: 'medical.bodyPartCalf' },
  { id: 17, labelKey: 'medical.bodyPartShin' },
  { id: 18, labelKey: 'medical.bodyPartAnkle' },
  { id: 19, labelKey: 'medical.bodyPartFoot' },
]
function bodyPartLabelKey(id) {
  const found = bodyParts.find((p) => p.id === id)
  return found ? found.labelKey : null
}

// Flexibly normalize the player list returned by /players/by-category/{id}.
// We do NOT trust the backend shape: it may be a bare array, wrapped in an
// envelope under any key, nested arbitrarily deep, or even returned as a JSON
// string. We tolerate many id/name/jersey field names, including default .NET
// PascalCase serialization.
function deepFindPlayerArray(node, depth = 0) {
  if (Array.isArray(node)) {
    if (node.length === 0 || typeof node[0] !== 'object' || node[0] === null) return null
    return node
  }
  if (node && typeof node === 'object' && depth < 6) {
    let best = null
    for (const key of Object.keys(node)) {
      const found = deepFindPlayerArray(node[key], depth + 1)
      if (found) {
        const item = found[0] || {}
        const score = ['id', 'playerId', 'Id', 'name', 'fullName', 'Name'].reduce(
          (s, k) => s + (k in item ? 1 : 0),
          0
        )
        if (!best || score > best.score) best = { arr: found, score }
      }
    }
    return best ? best.arr : null
  }
  return null
}

function normalizePlayers(data) {
  // The API sometimes returns the body as a JSON string rather than parsed JSON.
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return []
    }
  }
  let array = data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    array =
      data.data ||
      data.items ||
      data.result ||
      data.value ||
      data.$values ||
      data.players ||
      data.records ||
      data.content ||
      data.list ||
      null
    // Fallback: scan the envelope for the first array-shaped collection.
    if (!array) array = deepFindPlayerArray(data)
  }
  if (!Array.isArray(array)) return []
  return array
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const id = item.id ?? item.playerID ?? item.PlayerID ?? item.playerId ?? item.Id ?? item.ID ?? item.value
      const name =
        item.fullName ||
        item.FullName ||
        item.full_name ||
        item.name ||
        item.Name ||
        item.playerName ||
        item.PlayerName ||
        [item.firstName, item.lastName].filter(Boolean).join(' ') ||
        [item.first_name, item.last_name].filter(Boolean).join(' ') ||
        String(id ?? '')
      const jersey =
        item.jerseyNumber ?? item.JerseyNumber ?? item.jersey ?? item.shirtNumber ?? item.ShirtNumber ?? null
      if (id == null) return null
      return { id, name: name || 'Unknown Player', jersey }
    })
    .filter(Boolean)
}

// Resolve a stored player id back to a display label (name + jersey if present).
function playerName(id) {
  const found = incidentPlayers.value.find((p) => p.id === id)
  if (!found) return id
  return found.jersey ? `${found.name} (#${found.jersey})` : found.name
}

// When the user picks a category on the incident form, load that category's
// players via /players/by-category/{categoryId}.
watch(incidentCategory, async (categoryId) => {
  // Reset the player selection whenever the category changes.
  incidentPlayer.value = ''
  incidentPlayers.value = []
  if (!categoryId) return

  isLoadingIncidentPlayers.value = true
  try {
    const response = await playerService.getPlayersByCategory(categoryId)
    incidentPlayers.value = normalizePlayers(response?.data)
  } catch (error) {
    console.warn('Medical: could not load players for category', categoryId, error)
    incidentPlayers.value = []
  } finally {
    isLoadingIncidentPlayers.value = false
  }
})
const selectedBodyPart = ref('')
// Injury severity scale. The numeric `level` is what gets stored on a record
// (Minor = 1, Moderate = 2, Severe = 3, Critical = 4) and is the canonical
// value the medical API is expected to use.
const severityLevels = [
  { level: 1, dot: 'bg-green-400', badge: 'bg-secondary-container text-on-secondary-container', labelKey: 'medical.severityMinor' },
  { level: 2, dot: 'bg-yellow-400', badge: 'bg-tertiary-container text-on-tertiary-container', labelKey: 'medical.severityModerate' },
  { level: 3, dot: 'bg-orange-400', badge: 'bg-tertiary-container text-on-tertiary-container', labelKey: 'medical.severitySevere' },
  { level: 4, dot: 'bg-error', badge: 'bg-error-container text-on-error-container', labelKey: 'medical.severityCritical' },
]
const selectedSeverity = ref('')
// Expected return date, stored as a YYYY-MM-DD string from a native date input.
const erdDateInput = ref('')

// Format a YYYY-MM-DD date string for display, localized to the active locale.
function formatErdDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(`${dateStr}T00:00:00`)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(locale.value, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Whole days from today until the given YYYY-MM-DD date (negative = in the past).
function daysUntilErd(dateStr) {
  const target = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}
// Recorded status of the player for this incident: 'fit' or 'injured'.
const incidentStatus = ref('injured')

const imgErrors = reactive({})

function initials(name) {
  return name
    .replace(/\([^)]*\)/g, '')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function severityMeta(level) {
  return severityLevels.find((s) => s.level === level) || severityLevels[0]
}
function severityBadgeClass(severity) {
  return severityMeta(severity).badge
}
function severityLabelKey(severity) {
  return severityMeta(severity).labelKey
}

function submitIncident() {
  if (!incidentPlayer.value || !selectedBodyPart.value || !selectedSeverity.value) {
    showToast({
      title: $t('common.missingFields'),
      message: $t('medical.incidentMissingFields'),
      mode: 'error',
    })
    return
  }

  const isMinor = selectedSeverity.value === 1
  const selectedPlayer = incidentPlayers.value.find((p) => p.id === incidentPlayer.value)
  const playerLabel = playerName(incidentPlayer.value)
  const jersey = selectedPlayer?.jersey ? String(selectedPlayer.jersey) : '—'
  const erdValue = erdDateInput.value
  const erdLabel = erdValue
    ? isMinor
      ? 'READY'
      : (() => {
          const days = daysUntilErd(erdValue)
          return days <= 0 ? 'READY' : `${days} DAYS`
        })()
    : isMinor
      ? 'READY'
      : 'TBD'
  const erdDisplayDate = erdValue ? formatErdDate(erdValue) : '—'

  injuries.value = [
    {
      id: `inj-${Date.now()}`,
      name: playerLabel,
      jersey,
      category: categoryName(incidentCategory.value) || categories.value[0]?.name || 'Senior A',
      injury: `${$t(bodyPartLabelKey(selectedBodyPart.value))} ${$t('medical.injurySuffix')}`,
      detail: 'Newly recorded incident',
      bodyPart: selectedBodyPart.value,
      severity: selectedSeverity.value,
      status: incidentStatus.value,
      erdLabel,
      erdDate: erdDisplayDate,
      ready: isMinor,
      avatar: null,
    },
    ...injuries.value,
  ]

  // Reset form
  incidentDate.value = ''
  incidentCategory.value = ''
  incidentPlayer.value = ''
  selectedBodyPart.value = ''
  selectedSeverity.value = ''
  incidentStatus.value = 'injured'
  erdDateInput.value = ''

  showToast({
    title: $t('medical.incidentRecordedTitle'),
    message: $t('medical.incidentRecordedMessage', { player: incidentPlayer.value || $t('medical.newIncident') }),
    mode: 'success',
  })
}

onMounted(loadCategories)
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <DashboardSidebar active-item="medical" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      class="pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300 lg:flex-1"
    >
      <div class="grid grid-cols-12 gap-6">
        <!-- ── Header Info ── -->
        <div class="col-span-12 lg:col-span-8">
          <span class="text-[10px] font-bold tracking-[0.2em] text-green-400 font-headline uppercase">{{ $t('medical.sectionTitle') }}</span>
          <h1 class="text-4xl font-black text-white tracking-tight mb-2 font-headline">{{ $t('medical.pageTitle') }}</h1>
          <p class="text-on-surface-variant text-sm font-body max-w-2xl">{{ $t('medical.description') }}</p>
        </div>

        <!-- ── Readiness Matrix ── -->
        <div class="col-span-12 lg:col-span-4 bg-surface-container-low p-5 rounded-lg flex flex-col justify-between">
          <div class="flex justify-between items-center mb-4">
            <span class="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">{{ $t('medical.readinessMatrix') }}</span>
            <span class="material-symbols-outlined text-green-400 text-lg">monitoring</span>
          </div>
          <div class="flex gap-4">
            <div class="flex-1 bg-surface-container-lowest p-3 rounded">
              <div class="text-xs text-on-surface-variant mb-1 uppercase tracking-tighter">{{ $t('medical.matchFit') }}</div>
              <div class="text-3xl font-headline font-black text-green-400">{{ matchFit }}</div>
            </div>
            <div class="flex-1 bg-surface-container-lowest p-3 rounded">
              <div class="text-xs text-on-surface-variant mb-1 uppercase tracking-tighter">{{ $t('medical.unavailable') }}</div>
              <div class="text-3xl font-headline font-black text-error">{{ unavailableCount.toString().padStart(2, '0') }}</div>
            </div>
          </div>
        </div>

        <!-- ── Active Injury Tracking ── -->
        <div class="col-span-12 lg:col-span-8 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-headline font-bold text-white uppercase tracking-wider">{{ $t('medical.activeInjury') }}</h2>
            <div class="flex gap-2">
              <div class="bg-surface-container-high px-3 py-1 rounded text-[10px] font-bold text-on-surface-variant flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-error"></span> {{ $t('medical.highRisk') }}
              </div>
              <div class="bg-surface-container-high px-3 py-1 rounded text-[10px] font-bold text-on-surface-variant flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-tertiary-fixed-dim"></span> {{ $t('medical.recovery') }}
              </div>
            </div>
          </div>

          <!-- Category filter -->
          <div class="flex flex-wrap items-center gap-2 bg-surface-container-high/50 p-3 rounded-lg">
            <span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mr-1">{{ $t('medical.filterByCategory') }}</span>
            <button
              type="button"
              @click="selectedInjuryCategory = ''"
              :class="[
                'px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all',
                selectedInjuryCategory === ''
                  ? 'bg-gradient-to-br from-green-400 to-green-300 text-slate-950'
                  : 'text-on-surface-variant hover:text-white'
              ]"
            >{{ $t('medical.allCategories') }}</button>
            <button
              v-for="cat in injuryCategories"
              :key="cat"
              type="button"
              @click="selectedInjuryCategory = cat"
              :class="[
                'px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all',
                selectedInjuryCategory === cat
                  ? 'bg-gradient-to-br from-green-400 to-green-300 text-slate-950'
                  : 'text-on-surface-variant hover:text-white'
              ]"
            >{{ cat }}</button>
          </div>

          <div class="bg-surface-container-low overflow-hidden rounded-lg">
            <table class="w-full text-left font-body">
              <thead>
                <tr class="bg-surface-container-high/50 text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  <th class="px-6 py-4">{{ $t('medical.colPlayer') }}</th>
                  <th class="px-6 py-4">{{ $t('medical.colCategory') }}</th>
                  <th class="px-6 py-4">{{ $t('medical.colInjury') }}</th>
                  <th class="px-6 py-4 text-center">{{ $t('medical.colSeverity') }}</th>
                  <th class="px-6 py-4 text-right">{{ $t('medical.colErd') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10">
                <tr v-for="injury in filteredInjuries" :key="injury.id" class="hover:bg-surface-container-high/30 transition-colors">
                  <td class="px-6 py-4 flex items-center gap-3">
                    <div class="w-10 h-10 rounded bg-surface-container-lowest border border-outline-variant/20 overflow-hidden flex-shrink-0">
                      <img
                        v-if="!imgErrors[injury.id] && injury.avatar"
                        :src="injury.avatar"
                        :alt="injury.name"
                        class="w-full h-full object-cover"
                        @error="imgErrors[injury.id] = true"
                      />
                      <div v-else class="w-full h-full flex items-center justify-center text-[10px] font-black text-on-surface-variant">
                        {{ initials(injury.name) }}
                      </div>
                    </div>
                    <div>
                      <div class="text-sm font-bold text-white">{{ injury.name }}</div>
                      <div class="text-[10px] text-on-surface-variant uppercase">{{ $t('medical.jersey') }} #{{ injury.jersey }}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="text-xs text-on-surface font-medium uppercase">{{ injury.category }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-xs text-on-surface">{{ injury.injury }}</div>
                    <div class="text-[10px] text-on-surface-variant">{{ injury.detail }}</div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span :class="['inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider', severityBadgeClass(injury.severity)]">
                      {{ $t(severityLabelKey(injury.severity)) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="text-xs font-headline font-bold text-green-400">{{ injury.erdLabel }}</div>
                    <div v-if="injury.erdDate && injury.erdDate !== '—'" class="text-[10px] text-on-surface-variant">{{ injury.erdDate }}</div>
                  </td>
                </tr>

                <tr v-if="filteredInjuries.length === 0">
                  <td colspan="5" class="px-6 py-16 text-center text-on-surface-variant text-sm">
                    {{ selectedInjuryCategory ? $t('medical.noInjuriesInCategory') : $t('medical.noInjuries') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ── Status Management Terminal ── -->
          <div class="mt-8 bg-surface-container-low p-6 rounded-lg border-l-4 border-green-400">
            <h2 class="text-sm font-headline font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-green-400 text-lg">terminal</span>
              {{ $t('medical.statusTerminal') }}
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase">{{ $t('medical.squadCategory') }}</label>
                <select v-model="terminalCategory" class="bg-surface-container-lowest border-none text-on-surface text-xs p-2 rounded focus:ring-1 focus:ring-green-400">
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase">{{ $t('medical.selectPlayer') }}</label>
                <select v-model="terminalPlayer" class="bg-surface-container-lowest border-none text-on-surface text-xs p-2 rounded focus:ring-1 focus:ring-green-400">
                  <option value="" disabled>{{ $t('medical.selectPlayerPlaceholder') }}</option>
                  <option v-for="p in players" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase">{{ $t('medical.updateFitness') }}</label>
                <div class="flex bg-surface-container-lowest p-1 rounded gap-1">
                  <button
                    type="button"
                    @click="terminalFitness = 'fit'"
                    :class="['flex-1 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded transition-colors', terminalFitness === 'fit' ? 'bg-green-400 text-slate-950' : 'hover:bg-surface-container-high text-on-surface-variant']"
                  >{{ $t('medical.fit') }}</button>
                  <button
                    type="button"
                    @click="terminalFitness = 'partial'"
                    :class="['flex-1 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded transition-colors', terminalFitness === 'partial' ? 'bg-tertiary-fixed-dim text-slate-950' : 'hover:bg-surface-container-high text-on-surface-variant']"
                  >{{ $t('medical.partial') }}</button>
                  <button
                    type="button"
                    @click="terminalFitness = 'sidelined'"
                    :class="['flex-1 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded transition-colors', terminalFitness === 'sidelined' ? 'bg-error text-slate-950' : 'hover:bg-surface-container-high text-error']"
                  >{{ $t('medical.sidelined') }}</button>
                </div>
              </div>
              <div class="flex items-end">
                <button
                  type="button"
                  @click="executeCommand"
                  class="w-full bg-surface-container-highest text-white border border-outline-variant/30 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:border-green-400 transition-colors"
                >{{ $t('medical.executeCommand') }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Record Incident Form ── -->
        <div class="col-span-12 lg:col-span-4">
          <div class="bg-surface-container-high p-6 rounded-lg lg:sticky lg:top-6">
            <h2 class="text-lg font-headline font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <span class="material-symbols-outlined text-green-400">add_notes</span>
              {{ $t('medical.recordIncident') }}
            </h2>
            <form class="space-y-5" @submit.prevent="submitIncident">
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ $t('medical.dateOccurred') }}</label>
                <input v-model="incidentDate" type="date" class="w-full bg-surface-container-lowest border-none text-on-surface text-sm p-3 rounded focus:ring-1 focus:ring-green-400 scheme-dark" />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ $t('medical.selectCategory') }}</label>
                <select v-model="incidentCategory" class="w-full bg-surface-container-lowest border-none text-on-surface text-sm p-3 rounded focus:ring-1 focus:ring-green-400">
                  <option value="" disabled>{{ $t('medical.selectCategoryPlaceholder') }}</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ $t('medical.playerInvolved') }}</label>
                <select
                  v-model="incidentPlayer"
                  :disabled="!incidentCategory || isLoadingIncidentPlayers"
                  class="w-full bg-surface-container-lowest border-none text-on-surface text-sm p-3 rounded focus:ring-1 focus:ring-green-400 disabled:opacity-60"
                >
                  <option value="" disabled>{{ $t('medical.selectPlayerPlaceholder') }}</option>
                  <option v-if="isLoadingIncidentPlayers" disabled>{{ $t('medical.loadingPlayers') }}</option>
                  <option v-for="p in incidentPlayers" :key="p.id" :value="p.id">
                    {{ p.jersey ? `${p.name} (#${p.jersey})` : p.name }}
                  </option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ $t('medical.primaryBodyPart') }}</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="part in bodyParts"
                    :key="part.id"
                    type="button"
                    @click="selectedBodyPart = part.id"
                    :class="['bg-surface-container-lowest py-2 text-[10px] border rounded uppercase font-bold transition-colors', selectedBodyPart === part.id ? 'border-green-400 text-green-400' : 'border-outline-variant/20 text-on-surface-variant hover:border-green-400']"
                  >{{ $t(part.labelKey) }}</button>
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ $t('medical.severityTier') }}</label>
                <div class="flex gap-2">
                  <button
                    v-for="tier in severityLevels"
                    :key="tier.level"
                    type="button"
                    @click="selectedSeverity = tier.level"
                    :class="['flex-1 bg-surface-container-lowest p-3 rounded flex flex-col items-center gap-1 cursor-pointer border transition-colors', selectedSeverity === tier.level ? 'border-green-400' : 'border-transparent hover:border-green-400']"
                  >
                    <span :class="['w-2 h-2 rounded-full', tier.dot]"></span>
                    <span class="text-[9px] font-bold uppercase">{{ $t(tier.labelKey) }}</span>
                    <span class="text-[8px] text-on-surface-variant">{{ tier.level }}</span>
                  </button>
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ $t('medical.status') }}</label>
                <select v-model="incidentStatus" class="w-full bg-surface-container-lowest border-none text-on-surface text-sm p-3 rounded focus:ring-1 focus:ring-green-400">
                  <option value="fit">{{ $t('medical.statusFit') }}</option>
                  <option value="injured">{{ $t('medical.statusInjured') }}</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ $t('medical.expectedReturn') }}</label>
                <input v-model="erdDateInput" :placeholder="$t('medical.expectedReturnPlaceholder')" type="date" class="w-full bg-surface-container-lowest border-none text-on-surface text-sm p-3 rounded focus:ring-1 focus:ring-green-400 scheme-dark" />
              </div>
              <button type="submit" class="w-full bg-gradient-to-r from-green-400 to-green-300 text-slate-950 py-4 rounded-md text-sm font-black uppercase tracking-widest mt-4 shadow-lg shadow-green-900/20 hover:brightness-110 transition-all">
                {{ $t('medical.commit') }}
              </button>
            </form>
          </div>
        </div>

        <!-- ── Metrics Row ── -->
        <div class="col-span-12 mt-4 grid grid-cols-1 md:grid-cols-4 gap-6 opacity-80">
          <div class="p-4 border-l-2 border-outline-variant/30">
            <div class="text-[10px] text-on-surface-variant uppercase tracking-widest">{{ $t('medical.avgRecovery') }}</div>
            <div class="text-xl font-headline font-bold text-white">18.4 Days</div>
          </div>
          <div class="p-4 border-l-2 border-outline-variant/30">
            <div class="text-[10px] text-on-surface-variant uppercase tracking-widest">{{ $t('medical.rehabEfficiency') }}</div>
            <div class="text-xl font-headline font-bold text-green-400">94.2%</div>
          </div>
          <div class="p-4 border-l-2 border-outline-variant/30">
            <div class="text-[10px] text-on-surface-variant uppercase tracking-widest">{{ $t('medical.medicalBudget') }}</div>
            <div class="text-xl font-headline font-bold text-white">42%</div>
          </div>
          <div class="p-4 border-l-2 border-outline-variant/30">
            <div class="text-[10px] text-on-surface-variant uppercase tracking-widest">{{ $t('medical.squadAvailability') }}</div>
            <div class="text-xl font-headline font-bold text-white">{{ squadAvailability }}</div>
          </div>
        </div>
      </div>

      <!-- Spacer for bottom nav on mobile -->
      <div class="h-20 md:hidden"></div>
    </main>
  </div>
</template>

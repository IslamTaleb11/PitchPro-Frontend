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

// ── Active injury ledger ──────────────────────────────────────────────────────
// Loaded from GET /api/player-injuries/by-category/{categoryId} when a category
// filter is selected (see the watch on selectedInjuryCategory). The API does not
// return a fit/injured status, so every listed injury counts as unavailable.
const categoryInjuries = ref([])
const isLoadingCategoryInjuries = ref(false)

// ── Category filter for the injury ledger ────────────────────────────────────
// `selectedInjuryCategory` holds the API category *id*, passed straight to the
// /player-injuries/by-category/{categoryId} request.
const selectedInjuryCategory = ref('')

// Normalize the GET /api/player-injuries/by-category/{id} response into the shape
// the ledger table expects. The body is wrapped as { data: [...] } using PascalCase
// field names; bodyPart/severity are numeric codes with *Name display labels, and
// estimatedReturnDate is null when not yet known.
function normalizeCategoryInjuries(data) {
  let array = data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    array = data.data ?? data.items ?? data.result ?? data.value ?? data.$values ?? data.players ?? null
    if (!array) {
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
          array = data[key]
          break
        }
      }
    }
  }
  if (!Array.isArray(array)) return []
  return array
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const id = item.id ?? item.ID ?? item.injuryId ?? item.InjuryId ?? null
      const name = item.playerName ?? item.PlayerName ?? ''
      const avatar = item.playerImage ?? item.PlayerImage ?? null
      const category = item.categoryName ?? item.CategoryName ?? ''
      const bodyPart = item.bodyPart ?? item.BodyPart ?? null
      const bodyPartName = item.bodyPartName ?? item.BodyPartName ?? ''
      const severity = item.severity ?? item.Severity ?? null
      const severityName = item.severityName ?? item.SeverityName ?? ''
      const estimatedReturnDate = item.estimatedReturnDate ?? item.EstimatedReturnDate ?? null

      const erdLabel = estimatedReturnDate
        ? (() => {
            const days = daysUntilErd(toDateInput(estimatedReturnDate))
            return days <= 0 ? 'READY' : `${days} DAYS`
          })()
        : 'TBD'
      const erdDate = estimatedReturnDate ? formatErdDate(toDateInput(estimatedReturnDate)) : '—'

      return {
        id,
        name,
        jersey: null,
        avatar: avatar || null,
        category,
        injury: bodyPartName ? `${bodyPartName} Injury` : severityName || 'Injury',
        detail: severityName || '',
        bodyPart,
        severity,
        severityName,
        status: 'injured',
        erdLabel,
        erdDate,
        ready: false,
      }
    })
    .filter(Boolean)
}

// Fetch the injury ledger for a squad category from the API.
async function fetchInjuriesByCategory(categoryId) {
  categoryInjuries.value = []
  if (!categoryId) return
  isLoadingCategoryInjuries.value = true
  try {
    const response = await playerService.getInjuriesByCategory(categoryId)
    categoryInjuries.value = normalizeCategoryInjuries(response?.data)
  } catch (error) {
    console.warn('Medical: could not load injuries for category', categoryId, error)
    categoryInjuries.value = []
  } finally {
    isLoadingCategoryInjuries.value = false
  }
}

// Reload the ledger whenever the category filter changes.
watch(selectedInjuryCategory, (categoryId) => {
  fetchInjuriesByCategory(categoryId)
})

// Mark an injury as recovered (PATCH /api/player-injuries/{injuryId}/recover).
// The backend deactivates the record, so we drop it from the local ledger.
async function recoverInjury(injuryId) {
  try {
    await playerService.recoverInjury(injuryId)
    categoryInjuries.value = categoryInjuries.value.filter((i) => i.id !== injuryId)
    showToast({
      title: $t('medical.incidentRecoveredTitle'),
      message: $t('medical.incidentRecoveredMessage'),
      mode: 'success',
    })
  } catch (error) {
    const message =
      error?.response?.data?.message || error?.message || $t('medical.incidentRecoverFailed')
    showToast({
      title: $t('medical.incidentRecoveredTitle'),
      message,
      mode: 'error',
    })
  }
}

// ── Mark-as-recovered confirmation ────────────────────────────────────────────
// Clicking "Mark as Recovered" opens a confirmation modal first; the actual
// PATCH request only fires once the user confirms.
const showRecoverConfirm = ref(false)
const pendingRecoverInjury = ref(null)

function askRecover(injury) {
  pendingRecoverInjury.value = injury
  showRecoverConfirm.value = true
}

async function confirmRecover() {
  const injury = pendingRecoverInjury.value
  showRecoverConfirm.value = false
  pendingRecoverInjury.value = null
  if (injury) await recoverInjury(injury.id)
}

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
      // The injury endpoint needs the player's MEDICAL DOSSIER id, not the
      // player id — the player list carries it as `medicalDossierID`.
      const dossierId = item.medicalDossierID ?? item.MedicalDossierID ?? null
      if (id == null) return null
      return { id, name: name || 'Unknown Player', jersey, dossierId }
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
const selectedSeverity = ref('')
// Expected return date, stored as a YYYY-MM-DD string from a native date input.
const erdDateInput = ref('')
// Recorded status of the player for this incident: 'fit' or 'injured'.
const incidentStatus = ref('injured')

async function submitIncident() {
  if (!incidentPlayer.value || !selectedBodyPart.value || !selectedSeverity.value || !incidentDate.value) {
    showToast({
      title: $t('common.missingFields'),
      message: $t('medical.incidentMissingFields'),
      mode: 'error',
    })
    return
  }

  const isMinor = selectedSeverity.value === 1
  const selectedPlayer = incidentPlayers.value.find((p) => p.id === incidentPlayer.value)
  // The injury endpoint keys off the player's MEDICAL DOSSIER id, not the player id.
  if (!selectedPlayer?.dossierId) {
    showToast({
      title: $t('common.missingFields'),
      message: $t('medical.incidentMissingDossier'),
      mode: 'error',
    })
    return
  }

  // The backend rejects an estimated return date earlier than the injury date.
  if (erdDateInput.value && erdDateInput.value < incidentDate.value) {
    showToast({
      title: $t('common.missingFields'),
      message: $t('medical.incidentErdBeforeInjury'),
      mode: 'error',
    })
    return
  }

  const playerLabel = playerName(incidentPlayer.value)
  const jersey = selectedPlayer.jersey ? String(selectedPlayer.jersey) : '—'
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

  // Matches the backend PlayerInjuryRegistrationRequestDTO (PascalCase, numeric codes).
  const payload = {
    PlayerMedicalDossierID: Number(selectedPlayer.dossierId),
    BodyPart: Number(selectedBodyPart.value),
    Severity: Number(selectedSeverity.value),
    Status: incidentStatus.value === 'fit' ? 1 : 2,
    InjuryDate: incidentDate.value,
    EstimatedReturnDate: erdValue ? erdValue : null,
  }

  try {
    const response = await playerService.recordPlayerInjury(payload)

    // Reset form
    incidentDate.value = ''
    incidentCategory.value = ''
    incidentPlayer.value = ''
    selectedBodyPart.value = ''
    selectedSeverity.value = ''
    incidentStatus.value = 'injured'
    erdDateInput.value = ''

    // Refresh the open category ledger so the new injury appears immediately.
    if (selectedInjuryCategory.value) {
      await fetchInjuriesByCategory(selectedInjuryCategory.value)
    }

    showToast({
      title: $t('medical.incidentRecordedTitle'),
      message: $t('medical.incidentRecordedMessage', { player: playerLabel }),
      mode: 'success',
    })
  } catch (error) {
    const message =
      error?.response?.data?.message || error?.message || $t('medical.incidentRecordFailed')
    showToast({
      title: $t('medical.incidentRecordedTitle'),
      message,
      mode: 'error',
    })
  }
}

// ── Severity display helpers (shared with the ledger table) ──────────────────
// The numeric `level` is the canonical value the medical API uses
// (Minor = 1, Moderate = 2, Severe = 3, Critical = 4).
const severityLevels = [
  { level: 1, dot: 'bg-green-400', badge: 'bg-secondary-container text-on-secondary-container', labelKey: 'medical.severityMinor' },
  { level: 2, dot: 'bg-yellow-400', badge: 'bg-tertiary-container text-on-tertiary-container', labelKey: 'medical.severityModerate' },
  { level: 3, dot: 'bg-orange-400', badge: 'bg-tertiary-container text-on-tertiary-container', labelKey: 'medical.severitySevere' },
  { level: 4, dot: 'bg-error', badge: 'bg-error-container text-on-error-container', labelKey: 'medical.severityCritical' },
]

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

// Coerce a .NET DateTime (ISO string, e.g. "2024-10-24T00:00:00") or any date
// value into the YYYY-MM-DD string the date helpers expect.
function toDateInput(value) {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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

        <!-- ── Active Injury Tracking (full width) ── -->
        <div class="col-span-12 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-headline font-bold text-white uppercase tracking-wider">{{ $t('medical.activeInjury') }}</h2>
          </div>

          <!-- Category filter (driven by the API-loaded categories) -->
          <div class="flex flex-wrap items-center gap-2 bg-surface-container-high/50 p-3 rounded-lg">
            <span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mr-1">{{ $t('medical.filterByCategory') }}</span>
            <button
              v-for="cat in categories"
              :key="cat.id"
              type="button"
              @click="selectedInjuryCategory = cat.id"
              :class="[
                'px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all',
                selectedInjuryCategory === cat.id
                  ? 'bg-gradient-to-br from-green-400 to-green-300 text-slate-950'
                  : 'text-on-surface-variant hover:text-white'
              ]"
            >{{ cat.name }}</button>
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
                  <th class="px-6 py-4 text-center">{{ $t('medical.colAction') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10">
                <tr v-for="injury in categoryInjuries" :key="injury.id" class="hover:bg-surface-container-high/30 transition-colors">
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
                      <div v-if="injury.jersey" class="text-[10px] text-on-surface-variant uppercase">{{ $t('medical.jersey') }} #{{ injury.jersey }}</div>
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
                  <td class="px-6 py-4 text-center">
                    <button
                      type="button"
                      @click="askRecover(injury)"
                      class="bg-green-400/10 text-green-400 border border-green-400/40 py-1.5 px-3 rounded text-[10px] font-black uppercase tracking-widest hover:bg-green-400 hover:text-slate-950 transition-colors"
                    >{{ $t('medical.markAsRecovered') }}</button>
                  </td>
                </tr>

                <tr v-if="!selectedInjuryCategory">
                  <td colspan="6" class="px-6 py-16 text-center text-on-surface-variant text-sm">
                    {{ $t('medical.selectCategoryToView') }}
                  </td>
                </tr>
                <tr v-else-if="isLoadingCategoryInjuries">
                  <td colspan="6" class="px-6 py-16 text-center text-on-surface-variant text-sm">
                    {{ $t('medical.loadingInjuries') }}
                  </td>
                </tr>
                <tr v-else-if="categoryInjuries.length === 0">
                  <td colspan="6" class="px-6 py-16 text-center text-on-surface-variant text-sm">
                    {{ $t('medical.noInjuriesInCategory') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── Record Incident Form ── -->
        <div class="col-span-12">
          <div class="bg-surface-container-high p-6 rounded-lg">
            <h2 class="text-lg font-headline font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <span class="material-symbols-outlined text-green-400">add_notes</span>
              {{ $t('medical.recordIncident') }}
            </h2>
            <form class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" @submit.prevent="submitIncident">
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
              <div class="md:col-span-2 lg:col-span-3 space-y-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ $t('medical.primaryBodyPart') }}</label>
                <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  <button
                    v-for="part in bodyParts"
                    :key="part.id"
                    type="button"
                    @click="selectedBodyPart = part.id"
                    :class="['bg-surface-container-lowest py-2 text-[10px] border rounded uppercase font-bold transition-colors', selectedBodyPart === part.id ? 'border-green-400 text-green-400' : 'border-outline-variant/20 text-on-surface-variant hover:border-green-400']"
                  >{{ $t(part.labelKey) }}</button>
                </div>
              </div>
              <div class="lg:col-span-3 space-y-1">
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
              <div class="md:col-span-2 lg:col-span-3">
                <button type="submit" class="w-full bg-gradient-to-r from-green-400 to-green-300 text-slate-950 py-4 rounded-md text-sm font-black uppercase tracking-widest mt-4 shadow-lg shadow-green-900/20 hover:brightness-110 transition-all">
                  {{ $t('medical.commit') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Spacer for bottom nav on mobile -->
      <div class="h-20 md:hidden"></div>
    </main>

    <!-- MARK AS RECOVERED — CONFIRMATION MODAL -->
    <Teleport to="body">
      <div v-if="showRecoverConfirm" class="fixed inset-0 z-[130] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="showRecoverConfirm = false"></div>
        <div class="relative w-full max-w-md overflow-hidden rounded-xl border border-green-500/20 bg-surface-container-low shadow-2xl">
          <div class="flex flex-col items-center p-6 text-center">
            <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
              <span class="material-symbols-outlined text-3xl text-green-400">health_and_safety</span>
            </div>
            <h2 class="font-headline text-lg font-black uppercase tracking-tight text-white">{{ $t('medical.recoverConfirmTitle') }}</h2>
            <p class="mt-3 text-sm text-on-surface-variant">
              {{ $t('medical.recoverConfirmMessage', { player: pendingRecoverInjury?.name || '' }) }}
            </p>
          </div>
          <div class="flex gap-3 border-t border-white/5 p-4">
            <button
              type="button"
              @click="showRecoverConfirm = false"
              class="flex-1 rounded-md py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="button"
              @click="confirmRecover"
              class="flex-1 rounded-md bg-gradient-to-r from-green-400 to-green-300 py-3 text-[10px] font-black uppercase tracking-widest text-slate-950 transition-colors hover:brightness-110"
            >
              {{ $t('medical.confirmRecover') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

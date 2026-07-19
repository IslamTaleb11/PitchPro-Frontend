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

// ── Active injury ledger ──────────────────────────────────────────────────────
// Loaded from GET /api/player-injuries/by-category/{categoryId} when a category
// filter is selected (see the watch on selectedInjuryCategory). The API does not
// return a fit/injured status, so every listed injury counts as unavailable.
const categoryInjuries = ref([])
const isLoadingCategoryInjuries = ref(false)

// ── Readiness matrix (derived from the injuries shown for the selected category) ─
const unavailableCount = computed(() => categoryInjuries.value.length)
const matchFit = computed(() => SQUAD_TOTAL - unavailableCount.value)
const squadAvailability = computed(() => `${Math.round((matchFit.value / SQUAD_TOTAL) * 100)}%`)

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

        <!-- ── Active Injury Tracking (full width) ── -->
        <div class="col-span-12 space-y-4">
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
                      @click="recoverInjury(injury.id)"
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
      </div>

      <!-- Spacer for bottom nav on mobile -->
      <div class="h-20 md:hidden"></div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { useUiToast } from '../composables/useUiToast'
import { lookupService } from '../services/lookupService'

const { t: $t } = useI18n()
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
    severity: 'high',
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
    severity: 'medium',
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
    severity: 'low',
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

// ── Categories (loaded from /lookups/categories, same as the rest of app) ────
const categories = ref(['First Team', 'U-21 Squad', 'U-18 Squad'])
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
      categories.value = list.map((c) => c.name)
    }
  } catch (error) {
    console.warn('Medical: could not load categories from /lookups/categories, using defaults.', error)
  } finally {
    isLoadingCategories.value = false
  }
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
const incidentCategory = ref('')
const incidentPlayer = ref('')
const bodyParts = ['Knee', 'Ankle', 'Groin', 'Hamstring']
const selectedBodyPart = ref('')
const severityTiers = [
  { key: 'low', dot: 'bg-green-400', label: 'Low' },
  { key: 'med', dot: 'bg-tertiary-fixed-dim', label: 'Med' },
  { key: 'high', dot: 'bg-error', label: 'High' },
]
const selectedSeverity = ref('')
const erdText = ref('')

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

function severityBadgeClass(severity) {
  if (severity === 'high') return 'bg-error-container text-on-error-container'
  if (severity === 'medium') return 'bg-tertiary-container text-on-tertiary-container'
  return 'bg-secondary-container text-on-secondary-container'
}
function severityLabelKey(severity) {
  if (severity === 'high') return 'medical.severityHigh'
  if (severity === 'medium') return 'medical.severityMedium'
  return 'medical.severityLow'
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

  const isLow = selectedSeverity.value === 'low'
  const jerseyMatch = incidentPlayer.value.match(/#(\d+)/)
  const erdLabel = erdText.value.trim()
    ? erdText.value.trim().toUpperCase()
    : isLow
      ? 'READY'
      : 'TBD'

  injuries.value = [
    {
      id: `inj-${Date.now()}`,
      name: incidentPlayer.value,
      jersey: jerseyMatch ? jerseyMatch[1] : '—',
      category: incidentCategory.value || categories.value[0] || 'Senior A',
      injury: `${selectedBodyPart.value} Injury`,
      detail: 'Newly recorded incident',
      severity: isLow ? 'low' : selectedSeverity.value === 'med' ? 'medium' : 'high',
      erdLabel,
      erdDate: incidentDate.value || '—',
      ready: isLow,
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
  erdText.value = ''

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
                <tr v-for="injury in injuries" :key="injury.id" class="hover:bg-surface-container-high/30 transition-colors">
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

                <tr v-if="injuries.length === 0">
                  <td colspan="5" class="px-6 py-16 text-center text-on-surface-variant text-sm">
                    {{ $t('medical.noInjuries') }}
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
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
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
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ $t('medical.playerInvolved') }}</label>
                <select v-model="incidentPlayer" class="w-full bg-surface-container-lowest border-none text-on-surface text-sm p-3 rounded focus:ring-1 focus:ring-green-400">
                  <option value="" disabled>{{ $t('medical.selectPlayerPlaceholder') }}</option>
                  <option v-for="p in players" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ $t('medical.primaryBodyPart') }}</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="part in bodyParts"
                    :key="part"
                    type="button"
                    @click="selectedBodyPart = part"
                    :class="['bg-surface-container-lowest py-2 text-[10px] border rounded uppercase font-bold transition-colors', selectedBodyPart === part ? 'border-green-400 text-green-400' : 'border-outline-variant/20 text-on-surface-variant hover:border-green-400']"
                  >{{ part }}</button>
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ $t('medical.severityTier') }}</label>
                <div class="flex gap-2">
                  <button
                    v-for="tier in severityTiers"
                    :key="tier.key"
                    type="button"
                    @click="selectedSeverity = tier.key"
                    :class="['flex-1 bg-surface-container-lowest p-3 rounded flex flex-col items-center gap-1 cursor-pointer border transition-colors', selectedSeverity === tier.key ? 'border-green-400' : 'border-transparent hover:border-green-400']"
                  >
                    <span :class="['w-2 h-2 rounded-full', tier.dot]"></span>
                    <span class="text-[9px] font-bold uppercase">{{ tier.label }}</span>
                  </button>
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{{ $t('medical.expectedReturn') }}</label>
                <input v-model="erdText" :placeholder="$t('medical.expectedReturnPlaceholder')" type="text" class="w-full bg-surface-container-lowest border-none text-on-surface text-sm p-3 rounded focus:ring-1 focus:ring-green-400" />
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

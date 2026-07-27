<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { useUiToast } from '../composables/useUiToast'
import { lookupService } from '../services/lookupService'
import { matchService } from '../services/matchService'

const { t } = useI18n()
const { showToast } = useUiToast()

const isSidebarOpen = ref(true)

const categories = ref([])
const selectedCategory = ref('')
const players = ref([])
const isLoading = ref(false)
const isLoadingCategories = ref(false)
const sortField = ref('goals')
const sortDir = ref('desc')

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

const sortedPlayers = computed(() => {
  const list = [...players.value]
  list.sort((a, b) => {
    const va = a[sortField.value] ?? 0
    const vb = b[sortField.value] ?? 0
    return sortDir.value === 'asc' ? va - vb : vb - va
  })
  return list
})

function toggleSort(field) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'desc'
  }
}

function sortIcon(field) {
  if (sortField.value !== field) return 'unfold_more'
  return sortDir.value === 'asc' ? 'arrow_upward' : 'arrow_downward'
}

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

async function loadStats() {
  if (!selectedCategory.value) return
  isLoading.value = true
  players.value = []
  try {
    const res = await matchService.getPlayerStats(selectedCategory.value)
    const list = res?.data?.data ?? []
    players.value = Array.isArray(list)
      ? list.map((p) => ({
          id: p.playerID ?? p.PlayerID,
          name: p.playerName ?? p.PlayerName ?? '',
          jersey: p.jerseyNumber ?? p.JerseyNumber ?? '',
          position: p.positionName ?? p.PositionName ?? '',
          avatar: p.playerImage ?? p.PlayerImage ?? null,
          matchesPlayed: p.matchesPlayed ?? p.MatchesPlayed ?? 0,
          goals: p.goals ?? p.Goals ?? 0,
          assists: p.assists ?? p.Assists ?? 0,
          yellowCards: p.yellowCards ?? p.YellowCards ?? 0,
          redCards: p.redCards ?? p.RedCards ?? 0,
        }))
      : []
  } catch {
    showToast({ title: t('playerStats.loadErrorTitle'), message: t('playerStats.loadErrorMsg'), mode: 'error' })
  } finally {
    isLoading.value = false
  }
}

onMounted(loadCategories)
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <DashboardSidebar active-item="player-stats" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main class="pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background transition-all duration-300 lg:flex-1">
      <div class="flex gap-8 p-8">
        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="mb-8 flex items-start justify-between">
            <div>
              <h1 class="font-headline text-4xl font-black text-on-surface tracking-tight uppercase leading-none">{{ t('playerStats.pageTitle') }}</h1>
              <p class="text-on-surface-variant font-medium text-sm mt-2 opacity-80">{{ t('playerStats.pageSubtitle') }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('playerStats.squadCategory') }}</label>
              <select v-model="selectedCategory" @change="loadStats" class="bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider">
                <option value="" disabled>{{ t('playerStats.selectCategory') }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>

          <div v-if="isLoading" class="flex items-center justify-center py-20">
            <span class="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">{{ t('playerStats.loading') }}</span>
          </div>

          <div v-else-if="!selectedCategory" class="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span class="material-symbols-outlined text-5xl mb-4 opacity-30">bar_chart</span>
            <p class="text-sm font-bold uppercase tracking-wider">{{ t('playerStats.selectCategoryPrompt') }}</p>
          </div>

          <div v-else-if="!players.length" class="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span class="material-symbols-outlined text-5xl mb-4 opacity-30">sentiment_neutral</span>
            <p class="text-sm font-bold uppercase tracking-wider">{{ t('playerStats.noPlayers') }}</p>
          </div>

          <div v-else class="flex-1 overflow-y-auto pb-8 no-scrollbar">
            <table class="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr class="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">
                  <th class="px-4 pb-2" colspan="2">{{ t('playerStats.player') }}</th>
                  <th class="px-4 pb-2">{{ t('playerStats.pos') }}</th>
                  <th class="px-4 pb-2 text-center cursor-pointer select-none" @click="toggleSort('matchesPlayed')">
                    <span class="inline-flex items-center gap-1 hover:text-on-surface transition-colors">
                      {{ t('playerStats.mp') }}
                      <span class="material-symbols-outlined text-sm">{{ sortIcon('matchesPlayed') }}</span>
                    </span>
                  </th>
                  <th class="px-4 pb-2 text-center cursor-pointer select-none" @click="toggleSort('goals')">
                    <span class="inline-flex items-center gap-1 hover:text-on-surface transition-colors">
                      {{ t('playerStats.goals') }}
                      <span class="material-symbols-outlined text-sm">{{ sortIcon('goals') }}</span>
                    </span>
                  </th>
                  <th class="px-4 pb-2 text-center cursor-pointer select-none" @click="toggleSort('assists')">
                    <span class="inline-flex items-center gap-1 hover:text-on-surface transition-colors">
                      {{ t('playerStats.assists') }}
                      <span class="material-symbols-outlined text-sm">{{ sortIcon('assists') }}</span>
                    </span>
                  </th>
                  <th class="px-4 pb-2 text-center cursor-pointer select-none" @click="toggleSort('yellowCards')">
                    <span class="inline-flex items-center gap-1 hover:text-on-surface transition-colors">
                      {{ t('playerStats.yellowCards') }}
                      <span class="material-symbols-outlined text-sm">{{ sortIcon('yellowCards') }}</span>
                    </span>
                  </th>
                  <th class="px-4 pb-2 text-center cursor-pointer select-none" @click="toggleSort('redCards')">
                    <span class="inline-flex items-center gap-1 hover:text-on-surface transition-colors">
                      {{ t('playerStats.redCards') }}
                      <span class="material-symbols-outlined text-sm">{{ sortIcon('redCards') }}</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in sortedPlayers" :key="p.id"
                  class="bg-surface-container-low/40 hover:bg-surface-container-low transition-colors group">
                  <td class="px-4 py-3 border-y border-l border-outline-variant/5 w-14 rounded-l">
                    <div class="w-10 h-10 rounded-full border-2 border-outline-variant/10 overflow-hidden bg-surface-container-highest">
                      <img v-if="p.avatar" :src="p.avatar" :alt="p.name" class="w-full h-full object-cover">
                    </div>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <p class="font-headline font-bold text-on-surface text-sm uppercase leading-tight">{{ p.name }}</p>
                    <p class="text-[10px] text-on-surface-variant font-mono">#{{ p.jersey }}</p>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <span class="bg-surface-container-highest px-3 py-1.5 rounded text-[11px] font-bold text-on-surface-variant border border-outline-variant/20 uppercase tracking-tighter">{{ localizePosition(p.position) }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5 text-center">
                    <span class="text-sm font-black text-on-surface font-mono">{{ p.matchesPlayed }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5 text-center">
                    <span class="text-sm font-black text-primary font-mono">{{ p.goals }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5 text-center">
                    <span class="text-sm font-black text-tertiary-fixed-dim font-mono">{{ p.assists }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5 text-center">
                    <span class="text-sm font-black text-[#ffd601] font-mono">{{ p.yellowCards }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-r border-outline-variant/5 text-center rounded-r">
                    <span class="text-sm font-black text-error font-mono">{{ p.redCards }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>

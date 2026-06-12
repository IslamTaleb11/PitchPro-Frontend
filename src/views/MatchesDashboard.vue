<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'

const { t: $t, locale } = useI18n()
const isSidebarOpen = ref(true)

// ── Event Type Selection ──────────────────────────────────────────────────────
const selectedEventType = ref('match') // 'match' | 'training' | 'general'

const eventTypes = [
  { key: 'match',    icon: 'stadium',      labelKey: 'schedule.match'    },
  { key: 'training', icon: 'exercise',     labelKey: 'schedule.training' },
  { key: 'general',  icon: 'description',  labelKey: 'schedule.demo.general'  },
]

// ── Form State ────────────────────────────────────────────────────────────────
const eventCategory  = ref('')
const opponentFocus  = ref('')
const eventDate      = ref('')
const kickoffTime    = ref('')
const venue          = ref('')

// ── Category Filter ───────────────────────────────────────────────────────────
const activeCategory = ref('all')

const categoryFilters = [
  { key: 'all',    labelKey: 'schedule.allCategories' },
  { key: 'u14',    labelKey: 'schedule.demo.u14Squad'     },
  { key: 'u16',    labelKey: 'schedule.demo.u16Academy'   },
  { key: 'senior', labelKey: 'schedule.demo.seniorA'       },
]

// ── Ledger Entries (static demo data) ────────────────────────────────────────
const ledgerEntries = ref([
  {
    id: 1,
    day: '14', month: 'OCT',
    type: 'match',
    icon: 'stadium',
    iconColor: 'text-green-400',
    iconBg: 'bg-green-400/10',
    title: 'vs Arsenal U-16',
    demoKey: 'vsArsenal',
    subtitle: 'League Match',
    subtitleKey: 'leagueMatch',
    timeLabel: 'Kickoff',
    timeLabelKey: 'schedule.kickoff',
    time: '15:30',
    detailLabel: 'Venue',
    detailLabelKey: 'schedule.venueType',
    detail: 'Emirates Complex (A)',
    detailKey: 'emiratesComplex',
    badge: 'U-16 Academy',
    badgeKey: 'u16Academy',
    highlight: true,
  },
  {
    id: 2,
    day: '15', month: 'OCT',
    type: 'training',
    icon: 'exercise',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-400/10',
    title: 'Tactical Recovery',
    demoKey: 'tacticalRecovery',
    subtitle: 'Field Session',
    subtitleKey: 'fieldSession',
    timeLabel: 'Time',
    timeLabelKey: 'schedule.time',
    time: '09:00',
    detailLabel: 'Focus',
    detailLabelKey: 'schedule.locationLabel',
    detail: 'Zone Pressing',
    detailKey: 'zonePressing',
    badge: 'Senior A',
    badgeKey: 'seniorA',
    highlight: false,
  },
  {
    id: 3,
    day: '16', month: 'OCT',
    type: 'training',
    icon: 'fitness_center',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-400/10',
    title: 'Strength & Power',
    demoKey: 'strengthPower',
    subtitle: 'Gym Complex',
    subtitleKey: 'gymComplex',
    timeLabel: 'Time',
    timeLabelKey: 'schedule.time',
    time: '11:30',
    detailLabel: 'Group',
    detailLabelKey: 'schedule.category',
    detail: 'Full Squad',
    detailKey: 'allSquads',
    badge: 'U-14 Squad',
    badgeKey: 'u14Squad',
    highlight: false,
  },
  {
    id: 4,
    day: '17', month: 'OCT',
    type: 'general',
    icon: 'groups',
    iconColor: 'text-slate-400',
    iconBg: 'bg-slate-800',
    title: 'Technical Meeting',
    demoKey: 'technicalMeeting',
    subtitle: 'Video Room',
    subtitleKey: 'videoRoom',
    timeLabel: 'Time',
    timeLabelKey: 'schedule.time',
    time: '18:00',
    detailLabel: 'Focus',
    detailLabelKey: 'schedule.locationLabel',
    detail: 'Opposition Analysis',
    detailKey: 'oppositionAnalysis',
    badge: 'All Squads',
    badgeKey: 'allSquads',
    highlight: false,
  },
])

// ── Edit Modal ────────────────────────────────────────────────────────────────
const showEditModal  = ref(false)
const editingEntry   = ref(null)

function openEdit(entry) {
  editingEntry.value = { ...entry }
  showEditModal.value = true
}

function saveEdit() {
  const idx = ledgerEntries.value.findIndex(e => e.id === editingEntry.value.id)
  if (idx !== -1) ledgerEntries.value[idx] = { ...editingEntry.value }
  showEditModal.value = false
}

// ── Deploy new event ──────────────────────────────────────────────────────────
function deployEvent() {
  if (!opponentFocus.value.trim() || !eventDate.value || !kickoffTime.value) return

  const typeMap = {
    match:    { icon: 'stadium',       iconColor: 'text-green-400', iconBg: 'bg-green-400/10',  subtitle: 'Match',    timeLabel: 'Kickoff', detailLabel: 'Venue' },
    training: { icon: 'exercise',      iconColor: 'text-amber-400', iconBg: 'bg-amber-400/10',  subtitle: 'Training', timeLabel: 'Time',    detailLabel: 'Focus' },
    general:  { icon: 'description',   iconColor: 'text-slate-400', iconBg: 'bg-slate-800',     subtitle: 'General',  timeLabel: 'Time',    detailLabel: 'Notes' },
  }

  const t = typeMap[selectedEventType.value]
  const d = new Date(eventDate.value)

  ledgerEntries.value.push({
    id: Date.now(),
    day:   String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleString(locale.value || 'en', { month: 'short' }).toUpperCase(),
    type:  selectedEventType.value,
    icon:  t.icon,
    iconColor: t.iconColor,
    iconBg:    t.iconBg,
    title:     opponentFocus.value.toUpperCase(),
    subtitle:  t.subtitle,
    timeLabel: t.timeLabel,
    time:      kickoffTime.value,
    detailLabel: t.detailLabel,
    detail:    venue.value || '—',
    badge:     eventCategory.value || 'All Squads',
    highlight: selectedEventType.value === 'match',
  })

  // reset form
  opponentFocus.value = ''
  eventDate.value     = ''
  kickoffTime.value   = ''
  venue.value         = ''
  eventCategory.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface">
    <DashboardSidebar active-item="matches" :is-open="isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      :class="[
        'pt-20 min-h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300',
        isSidebarOpen ? 'ms-64' : 'ms-0',
      ]"
    >
      <div class="space-y-8">

        <!-- ── Page Header + Category Filter ── -->
        <section class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div class="space-y-2">
            <span class="text-[10px] font-bold tracking-[0.2em] text-green-400 font-headline uppercase">{{ $t('schedule.pageSectionTitle') }}</span>
            <h2 class="text-4xl font-black font-headline tracking-tighter text-white">
              {{ $t('schedule.pageTitle') }} <span class="text-slate-500">{{ $t('schedule.pageSubtitle') }}</span>
            </h2>
          </div>
          <div class="flex flex-wrap items-center gap-2 bg-surface-container-low p-1.5 rounded-lg border border-white/5">
            <button
              v-for="cat in categoryFilters"
              :key="cat.key"
              type="button"
              @click="activeCategory = cat.key"
              :class="[
                'px-5 py-2 text-[10px] font-bold tracking-widest font-headline uppercase rounded-md transition-all',
                activeCategory === cat.key
                  ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary'
                  : 'text-slate-500 hover:text-white'
              ]"
            >
              {{ $t(cat.labelKey) }}
            </button>
            <div class="h-4 w-px bg-white/10 mx-1"></div>
            <button type="button" class="p-2 text-slate-500 hover:text-green-400 transition-colors">
              <span class="material-symbols-outlined text-sm">tune</span>
            </button>
          </div>
        </section>

        <!-- ── Main Grid ── -->
        <div class="grid grid-cols-12 gap-6">

          <!-- ── Left: Event Creation Terminal ── -->
          <div class="col-span-12 lg:col-span-4 space-y-6">
            <div class="bg-surface-container-high p-6 rounded-xl relative overflow-hidden group border border-white/5 shadow-2xl">
              <!-- Decorative icon -->
              <div class="absolute -right-10 -bottom-10 opacity-[0.04] pointer-events-none group-hover:opacity-[0.07] transition-opacity">
                <span class="material-symbols-outlined text-[180px]">sports_soccer</span>
              </div>

              <div class="flex items-center gap-3 mb-6">
                <div class="h-8 w-1 bg-green-400 rounded-full"></div>
                <h3 class="font-headline font-bold text-lg tracking-tight uppercase text-white">{{ $t('schedule.eventTerminal') }}</h3>
              </div>

              <form class="space-y-5 relative z-10" @submit.prevent="deployEvent">

                <!-- Event type selector -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ $t('schedule.eventClassificationLabel') }}</label>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="et in eventTypes"
                      :key="et.key"
                      type="button"
                      @click="selectedEventType = et.key"
                      :class="[
                        'py-3 px-2 rounded-md text-[10px] font-bold font-headline uppercase flex flex-col items-center gap-1 border transition-all',
                        selectedEventType === et.key
                          ? 'border-green-400 bg-green-400/10 text-green-400'
                          : 'border-white/10 text-slate-400 hover:border-slate-500 hover:text-white'
                      ]"
                    >
                      <span class="material-symbols-outlined text-base">{{ et.icon }}</span>
                      {{ $t(et.labelKey) }}
                    </button>
                  </div>
                </div>

                <!-- Category -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ $t('schedule.assignCategory') }}</label>
                  <select v-model="eventCategory" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50">
                    <option value="">{{ $t('schedule.selectCategoryPlaceholder') }}</option>
                    <option>{{ $t('schedule.demo.u14Squad') }}</option>
                    <option>{{ $t('schedule.demo.u16Academy') }}</option>
                    <option>{{ $t('schedule.demo.seniorA') }}</option>
                    <option>{{ $t('schedule.demo.allSquads') }}</option>
                  </select>
                </div>

                <!-- Opponent / Focus -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {{ selectedEventType === 'match' ? $t('schedule.opponent') : $t('schedule.sessionFocus') }}
                  </label>
                  <input
                    v-model="opponentFocus"
                    required
                    :placeholder="selectedEventType === 'match' ? $t('schedule.opponentPlaceholder') : $t('schedule.demo.zonePressing')"
                    class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 placeholder:text-slate-600 uppercase"
                    type="text"
                  />
                </div>

                <!-- Date + Time -->
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ $t('schedule.date') }}</label>
                    <input v-model="eventDate" required type="date" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark"/>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {{ selectedEventType === 'match' ? $t('schedule.kickoff') : $t('schedule.startTime') }}
                    </label>
                    <input v-model="kickoffTime" required type="time" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark"/>
                  </div>
                </div>

                <!-- Venue -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {{ selectedEventType === 'match' ? $t('schedule.venueType') : $t('schedule.location') }}
                  </label>
                  <select v-model="venue" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50">
                    <option value="">{{ $t('schedule.selectVenuePlaceholder') }}</option>
                    <option>Pitch 1 — Main Arena (Home)</option>
                    <option>Pitch 4 — Technical Zone</option>
                    <option>Gym Complex</option>
                    <option>Video Room</option>
                    <option>External Venue (Away)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  class="w-full py-4 bg-gradient-to-r from-green-400 to-green-300 text-slate-950 font-black font-headline text-xs tracking-[0.2em] uppercase rounded-md shadow-lg shadow-green-900/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <span class="material-symbols-outlined text-sm">add_circle</span>
                  {{ $t('schedule.deployEvent') }}
                </button>
              </form>
            </div>
          </div>

          <!-- ── Right: Schedule Ledger ── -->
          <div class="col-span-12 lg:col-span-8 space-y-6">

            <div class="flex items-center justify-between">
              <h3 class="font-headline font-bold text-lg tracking-tight uppercase flex items-center gap-3 text-white">
                <span class="material-symbols-outlined text-green-400">analytics</span>
                {{ $t('schedule.scheduleLedger') }}
              </h3>
              <div class="flex gap-2">
                <button type="button" class="p-2 bg-surface-container-high rounded-md text-slate-400 hover:text-white border border-white/5 transition-colors">
                  <span class="material-symbols-outlined">chevron_left</span>
                </button>
                <button type="button" class="p-2 bg-surface-container-high rounded-md text-slate-400 hover:text-white border border-white/5 transition-colors">
                  <span class="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

            <!-- Ledger entries -->
            <div class="space-y-3">
              <div
                v-for="entry in ledgerEntries"
                :key="entry.id"
                class="bg-surface-container-low rounded-lg p-5 flex items-center gap-6 group hover:bg-surface-container-high transition-all border border-white/5"
              >
                <!-- Date column -->
                <div class="flex flex-col items-center justify-center min-w-[56px] border-r border-white/10 pr-5">
                  <span
                    class="text-2xl font-black font-headline leading-none"
                    :class="entry.highlight ? 'text-green-400' : 'text-white'"
                  >{{ entry.day }}</span>
                  <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{{ entry.month }}</span>
                </div>

                <!-- Content -->
                <div class="flex-1 flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
                  <!-- Type + title -->
                  <div class="flex items-center gap-4 min-w-[160px]">
                    <div :class="['h-10 w-10 rounded-md flex items-center justify-center', entry.iconBg]">
                      <span :class="['material-symbols-outlined', entry.iconColor]">{{ entry.icon }}</span>
                    </div>
                    <div>
                      <h4 class="text-sm font-black font-headline uppercase tracking-tight text-white">
                        {{ entry.demoKey ? $t('schedule.demo.' + entry.demoKey) : entry.title }}
                      </h4>
                      <p class="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
                        {{ entry.subtitleKey ? $t('schedule.demo.' + entry.subtitleKey) : entry.subtitle }}
                      </p>
                    </div>
                  </div>

                  <!-- Meta -->
                  <div class="flex items-center gap-8">
                    <div class="flex flex-col">
                      <span class="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                        {{ entry.timeLabelKey ? $t(entry.timeLabelKey) : entry.timeLabel }}
                      </span>
                      <span class="text-xs font-mono font-bold text-white">{{ entry.time }}</span>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                        {{ entry.detailLabelKey ? $t(entry.detailLabelKey) : entry.detailLabel }}
                      </span>
                      <span class="text-xs font-bold text-white uppercase">
                        {{ entry.detailKey ? $t('schedule.demo.' + entry.detailKey) : entry.detail }}
                      </span>
                    </div>
                  </div>

                  <!-- Badge -->
                  <div class="md:ml-auto">
                    <span class="px-3 py-1 bg-surface-container-highest border border-white/10 text-[9px] font-black uppercase text-slate-300 rounded-sm">
                      {{ entry.badgeKey ? $t('schedule.demo.' + entry.badgeKey) : entry.badge }}
                    </span>
                  </div>
                </div>

                <!-- Edit button -->
                <button
                  type="button"
                  @click="openEdit(entry)"
                  class="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-green-400 transition-all"
                >
                  <span class="material-symbols-outlined">edit</span>
                </button>
              </div>

              <!-- Empty state -->
              <div v-if="ledgerEntries.length === 0" class="py-16 text-center text-slate-500 text-sm">
                {{ $t('schedule.noEventsScheduled') }}
              </div>
            </div>

            <!-- ── Bottom Stats Card ── -->
            <div class="relative overflow-hidden bg-surface-container-high rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-10 border border-white/5">
              <div class="space-y-4 max-w-md">
                <h4 class="text-3xl font-black font-headline tracking-tighter italic text-green-400 leading-none">
                  {{ $t('schedule.bottomStatsTitlePrefix') }} <br/><span class="text-white">{{ $t('schedule.bottomStatsTitleAccent') }}</span>
                </h4>
                <p class="text-sm text-slate-400 leading-relaxed">
                  {{ $t('schedule.bottomStatsSubtitle') }}
                </p>
                <div class="flex gap-6">
                  <div class="flex flex-col">
                    <span class="text-2xl font-black font-headline text-white">{{ ledgerEntries.length }}</span>
                    <span class="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">{{ $t('schedule.eventsThisWeek') }}</span>
                  </div>
                  <div class="w-px h-8 bg-white/10 self-center"></div>
                  <div class="flex flex-col">
                    <span class="text-2xl font-black font-headline text-white">98%</span>
                    <span class="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">{{ $t('schedule.pitchUtilization') }}</span>
                  </div>
                </div>
              </div>
              <div class="relative w-full md:w-auto">
                <img
                  src="/assets/stadium.svg"
                  alt="Stadium at night"
                  class="rounded-lg shadow-2xl shadow-black/50 grayscale hover:grayscale-0 transition-all duration-700 w-full max-w-sm"
                />
                <div class="absolute -top-4 -right-4 bg-green-400 text-slate-900 p-3 rounded-lg shadow-xl shadow-green-900/30">
                  <span class="material-symbols-outlined">trending_up</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>

    <!-- ── Edit Modal ── -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="showEditModal = false"></div>
        <div class="relative bg-surface-container-low w-full max-w-md rounded-xl border border-white/10 shadow-2xl overflow-hidden">
          <div class="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <div class="text-green-400 text-[10px] font-black tracking-[0.2em] uppercase mb-1">{{ $t('schedule.modifyEvent') }}</div>
              <h2 class="text-xl font-black text-white tracking-tight uppercase">{{ $t('schedule.editEvent') }}</h2>
            </div>
            <button type="button" class="text-slate-500 hover:text-white transition-colors" @click="showEditModal = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="p-6 space-y-4" v-if="editingEntry">
            <div class="space-y-1.5">
              <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ $t('schedule.fixture') }}</label>
              <input v-model="editingEntry.title" type="text" class="w-full bg-surface-container-lowest border-none text-white text-sm rounded-md p-3 focus:ring-1 focus:ring-green-400/50 uppercase font-bold"/>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ $t('schedule.date') }}</label>
                <input v-model="editingEntry.day" type="text" maxlength="2" class="w-full bg-surface-container-lowest border-none text-white text-sm rounded-md p-3 focus:ring-1 focus:ring-green-400/50 font-mono font-bold"/>
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ $t('schedule.date') }}</label>
                <input v-model="editingEntry.month" type="text" maxlength="3" class="w-full bg-surface-container-lowest border-none text-white text-sm rounded-md p-3 focus:ring-1 focus:ring-green-400/50 uppercase font-bold"/>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ $t('schedule.time') }}</label>
                <input v-model="editingEntry.time" type="time" class="w-full bg-surface-container-lowest border-none text-white text-sm rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark"/>
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ $t('schedule.locationLabel') }}</label>
                <input v-model="editingEntry.detail" type="text" class="w-full bg-surface-container-lowest border-none text-white text-sm rounded-md p-3 focus:ring-1 focus:ring-green-400/50 uppercase font-bold"/>
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ $t('schedule.category') }}</label>
              <input v-model="editingEntry.badge" type="text" class="w-full bg-surface-container-lowest border-none text-white text-sm rounded-md p-3 focus:ring-1 focus:ring-green-400/50 uppercase font-bold"/>
            </div>
          </div>
          <div class="p-6 bg-surface-container-high/50 border-t border-white/5 flex gap-3">
            <button type="button" @click="showEditModal = false" class="flex-1 py-3 text-slate-400 font-black text-xs uppercase tracking-widest rounded-md hover:bg-white/5 transition-all">
              {{ $t('common.cancel') }}
            </button>
            <button type="button" @click="saveEdit" class="flex-[2] py-3 bg-gradient-to-r from-green-400 to-green-300 text-slate-950 font-black text-xs uppercase tracking-widest rounded-md hover:brightness-110 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-sm">save</span>
              {{ $t('schedule.saveChanges') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

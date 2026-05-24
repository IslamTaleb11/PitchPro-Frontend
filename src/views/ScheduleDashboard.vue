<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { lookupService } from '../services/lookupService'
import { matchService } from '../services/matchService'
import { trainingService } from '../services/trainingService'
import { scheduleService } from '../services/scheduleService'
import { useUiToast } from '../composables/useUiToast'

const { t: $t } = useI18n()
const { showToast } = useUiToast()
const isSidebarOpen = ref(true)

// ── Event Classification (MATCH / TRAINING) ────────────────────────────────────
const activeEventType = ref('all') // 'all', 'match', 'training'
const activeCreationTab = ref('match') // 'match', 'training'

// ── Categories (fetched from API) ─────────────────────────────────────────────
const categories    = ref([])
const sessionTypes  = ref([])
const activeCategory = ref('all')

function normalizeLookup(data) {
  let arr = Array.isArray(data) ? data : (data?.data || data?.$values || data?.items || [])
  return arr.map(item => ({
    id:   item.id   ?? item.ID,
    name: item.name ?? item.Name,
  }))
}

function formatTimeSpan(ts) {
  if (!ts) return ''
  const [hours, minutes] = ts.split(':')
  const date = new Date()
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10))
  return date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
}

function formatEventForUI(event) {
  const date = new Date(event.eventDate)
  const isMatch = event.eventType === 'Match'
  
  let timeDisplay = ''
  if (event.startTime && event.endTime) {
    const start = formatTimeSpan(event.startTime)
    const end = formatTimeSpan(event.endTime)
    timeDisplay = `${start} — ${end}`
  } else if (event.startTime) {
    timeDisplay = formatTimeSpan(event.startTime)
  } else {
    timeDisplay = date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
  }
  
  return {
    id: event.eventId,
    eventId: event.eventId,
    eventType: event.eventType,
    eventDate: event.eventDate,
    categoryID: event.categoryID,
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleString('en', { month: 'short' }).toUpperCase(),
    icon: isMatch ? 'stadium' : 'exercise',
    iconColor: isMatch ? 'text-green-400' : 'text-amber-400',
    iconBg: isMatch ? 'bg-green-400/10' : 'bg-amber-400/10',
    title: event.title,
    subtitle: isMatch ? 'Match' : 'Training',
    timeLabel: 'Time',
    time: timeDisplay,
    detailLabel: 'Location',
    detail: event.location,
    location: event.location,
    badge: event.categoryName || (isMatch ? 'Match' : 'Training'),
    categoryName: event.categoryName,
    highlight: isMatch,
    isHome: event.isHome,
    startTime: event.startTime,
    endTime: event.endTime,
  }
}

// ── Filtered Events ─────────────────────────────────────────────────────────────
const filteredEvents = computed(() => {
  return ledgerEntries.value
})

// ── Fetch Events ─────────────────────────────────────────────────────────────────
async function fetchEvents() {
  isLoading.value = true
  try {
    let eventClassification = null
    if (activeEventType.value === 'match') eventClassification = 'Match'
    else if (activeEventType.value === 'training') eventClassification = 'Training'
    
    let category = activeCategory.value === 'all' ? null : activeCategory.value
    
    const response = await scheduleService.getUpcoming(
      currentPage.value, 
      pageSize.value, 
      eventClassification, 
      category
    )
    const data = response.data
    const rawEvents = data.data || []
    ledgerEntries.value = rawEvents.map(formatEventForUI)
    hasMore.value = data.hasMore
  } catch (error) {
    console.error('Failed to fetch events:', error)
    showToast({ title: 'Error', message: 'Failed to load events.', mode: 'error', duration: 4000 })
  } finally {
    isLoading.value = false
  }
}

// ── Watch filters to refetch ──────────────────────────────────────────────────────
watch([activeEventType, activeCategory], () => {
  currentPage.value = 1
  fetchEvents()
})

// ── Pagination Handlers ───────────────────────────────────────────────────────────
function goToPrevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchEvents()
  }
}

function goToNextPage() {
  if (hasMore.value) {
    currentPage.value++
    fetchEvents()
  }
}

// ── Match Form State ───────────────────────────────────────────────────────────────
const matchCategoryID    = ref('')
const opponentName  = ref('')
const matchDate     = ref('')
const kickoffTime   = ref('')
const matchEndTime  = ref('')
const stadiumName   = ref('')
const isHome        = ref(true)
const isSubmittingMatch = ref(false)

// ── Edit Modal State ──────────────────────────────────────────────────────────
const showEditModal = ref(false)
const editingEntry  = ref(null)
const isSubmittingEdit = ref(false)

function parseTimeForInput(ts) {
  if (!ts) return ''
  const parts = ts.split(':')
  if (parts.length >= 2) {
    return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`
  }
  return ''
}

function openEdit(entry) {
  console.log('openEdit called with:', entry)
  
  const dateObj = new Date(entry.eventDate)
  const editDate = dateObj.toISOString().split('T')[0]
  
  editingEntry.value = {
    ...entry,
    isMatch: entry.eventType === 'Match',
    editCategoryID: entry.categoryID ? String(entry.categoryID) : (categories.length > 0 ? String(categories[0].id) : ''),
    editSessionTypeID: sessionTypes.length > 0 ? String(sessionTypes[0].id) : '',
    editOpponentName: entry.title.split(' vs ')[0] || '',
    editDate: editDate,
    editKickoffTime: parseTimeForInput(entry.startTime),
    editEndTime: parseTimeForInput(entry.endTime),
    editIsHome: entry.isHome ?? true,
    editStadiumName: entry.location || '',
    editSessionDate: editDate,
    editStartTime: parseTimeForInput(entry.startTime),
    editLocation: entry.location || '',
  }
  console.log('editingEntry.value:', editingEntry.value)
  console.log('Setting showEditModal to true!')
  showEditModal.value = true
  console.log('showEditModal.value after:', showEditModal.value)
}

async function saveEdit() {
  if (!editingEntry.value) return

  isSubmittingEdit.value = true
  try {
    showToast({ title: 'Updating Event...', message: 'Saving changes to database.', mode: 'loading', duration: 0 })

    if (editingEntry.value.eventType === 'Match') {
      const payload = {
        ID: editingEntry.value.id,
        ClubID: 7,
        CategoryID: Number(editingEntry.value.editCategoryID),
        OpponentName: editingEntry.value.editOpponentName,
        Date: editingEntry.value.editDate,
        KickoffTime: editingEntry.value.editKickoffTime + ':00',
        EndTime: editingEntry.value.editEndTime + ':00',
        IsHome: editingEntry.value.editIsHome,
        StadiumName: editingEntry.value.editStadiumName
      }
      await matchService.updateMatch(payload)
    } else {
      const payload = {
        ID: editingEntry.value.id,
        ClubID: 7,
        CategoryID: Number(editingEntry.value.editCategoryID),
        SessionTypeID: Number(editingEntry.value.editSessionTypeID),
        Date: editingEntry.value.editDate,
        StartTime: editingEntry.value.editStartTime + ':00',
        EndTime: editingEntry.value.editEndTime + ':00',
        Location: editingEntry.value.editLocation
      }
      await trainingService.updateSession(payload)
    }

    showToast({ title: 'Event Updated', message: 'Changes saved successfully.', mode: 'success', duration: 3000 })

    showEditModal.value = false
    currentPage.value = 1
    fetchEvents()

  } catch (error) {
    const message = error.response?.data?.message || error.message || 'An error occurred.'
    showToast({ title: 'Error', message, mode: 'error', duration: 4000 })
  } finally {
    isSubmittingEdit.value = false
  }
}

// ── Training Session Form State ────────────────────────────────────────────────
const trainingCategoryID  = ref('')
const sessionDate   = ref('')
const startTime     = ref('')
const endTime       = ref('')
const location      = ref('')
const sessionTypeID = ref('')
const isSubmittingTraining = ref(false)

// ── Ledger Entries ────────────────────────────────────────────────────────────
const ledgerEntries = ref([])
const currentPage = ref(1)
const pageSize = ref(5)
const hasMore = ref(false)
const isLoading = ref(false)



onMounted(async () => {
  const [catRes, typeRes] = await Promise.allSettled([
    lookupService.getCategories(),
    lookupService.getSessionTypes()
  ])
  if (catRes.status === 'fulfilled') categories.value = normalizeLookup(catRes.value.data)
  if (typeRes.status === 'fulfilled') sessionTypes.value = normalizeLookup(typeRes.value.data)
  fetchEvents()
})

// ── Deploy Match ──────────────────────────────────────────────────────────────
async function deployMatch() {
  if (!matchCategoryID.value || !opponentName.value.trim() || !matchDate.value || !kickoffTime.value || !matchEndTime.value) {
    showToast({ title: 'Missing Fields', message: 'Please fill in all required fields.', mode: 'error', duration: 4000 })
    return
  }

  const selectedDate = new Date(matchDate.value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (selectedDate < today) {
    showToast({ title: 'Invalid Date', message: 'Match date must be today or in the future.', mode: 'error', duration: 4000 })
    return
  }

  const start = new Date(`2000-01-01 ${kickoffTime.value}`)
  const end = new Date(`2000-01-01 ${matchEndTime.value}`)

  if (end <= start) {
    showToast({ title: 'Invalid Time', message: 'End time must be after kickoff time.', mode: 'error', duration: 4000 })
    return
  }

  isSubmittingMatch.value = true
  try {
    showToast({ title: 'Scheduling Match...', message: 'Saving match to database.', mode: 'loading', duration: 0 })

    const payload = {
      ClubID:       7,
      CategoryID:   Number(matchCategoryID.value),
      OpponentName: opponentName.value,
      Date:         matchDate.value,
      KickoffTime:  kickoffTime.value + ':00',
      EndTime:      matchEndTime.value + ':00',
      IsHome:       isHome.value,
      StadiumName:  stadiumName.value
    }

    await matchService.createMatch(payload)

    showToast({ title: 'Match Scheduled', message: 'Match saved successfully.', mode: 'success', duration: 3000 })

    matchCategoryID.value   = ''
    opponentName.value = ''
    matchDate.value    = ''
    kickoffTime.value  = ''
    matchEndTime.value = ''
    stadiumName.value  = ''
    isHome.value       = true

    currentPage.value = 1
    fetchEvents()

  } catch (error) {
    const message = error.response?.data?.message || error.message || 'An error occurred.'
    showToast({ title: 'Error', message, mode: 'error', duration: 4000 })
  } finally {
    isSubmittingMatch.value = false
  }
}

// ── Deploy Training Session ──────────────────────────────────────────────────────
async function deployTraining() {
  if (!trainingCategoryID.value || !sessionDate.value || !startTime.value || !endTime.value || !location.value.trim() || !sessionTypeID.value) {
    showToast({ title: 'Missing Fields', message: 'Please fill in all required fields.', mode: 'error', duration: 4000 })
    return
  }

  const selectedDate = new Date(sessionDate.value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (selectedDate < today) {
    showToast({ title: 'Invalid Date', message: 'Training date must be today or in the future.', mode: 'error', duration: 4000 })
    return
  }

  const start = new Date(`2000-01-01 ${startTime.value}`)
  const end = new Date(`2000-01-01 ${endTime.value}`)

  if (end <= start) {
    showToast({ title: 'Invalid Time', message: 'End time must be after start time.', mode: 'error', duration: 4000 })
    return
  }

  isSubmittingTraining.value = true
  try {
    showToast({ title: 'Creating Session...', message: 'Saving training session to database.', mode: 'loading', duration: 0 })

    const payload = {
      ClubID:        7,
      CategoryID:    Number(trainingCategoryID.value),
      Date:          sessionDate.value,
      StartTime:     startTime.value + ':00',
      EndTime:       endTime.value   + ':00',
      Location:      location.value,
      SessionTypeID: Number(sessionTypeID.value),
    }

    await trainingService.createSession(payload)

    showToast({ title: 'Session Created', message: 'Training session saved successfully.', mode: 'success', duration: 3000 })

    trainingCategoryID.value    = ''
    sessionDate.value   = ''
    startTime.value     = ''
    endTime.value       = ''
    location.value      = ''
    sessionTypeID.value = ''

    currentPage.value = 1
    fetchEvents()

  } catch (error) {
    const message = error.response?.data?.message || error.message || 'An error occurred.'
    showToast({ title: 'Error', message, mode: 'error', duration: 4000 })
  } finally {
    isSubmittingTraining.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface">
    <DashboardSidebar active-item="schedule" :is-open="isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      :class="[
        'pt-20 min-h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300',
        isSidebarOpen ? 'ml-64' : 'ml-0',
      ]"
    >
      <div class="space-y-8">

        <!-- ── Page Header + Event Classification Tabs ── -->
        <section class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div class="space-y-2">
            <span class="text-[10px] font-bold tracking-[0.2em] text-green-400 font-headline uppercase">Technical Hub</span>
            <h2 class="text-4xl font-black font-headline tracking-tighter text-white">
              CALENDAR <span class="text-slate-500">&amp; SCHEDULE</span>
            </h2>
          </div>
          <div class="flex flex-col gap-4">
            <!-- Event Classification Tabs -->
            <div class="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-lg border border-white/5">
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Event Classification</div>
              <button
                type="button"
                @click="activeEventType = 'all'"
                :class="[
                  'px-4 py-2 text-[10px] font-bold tracking-widest font-headline uppercase rounded-md transition-all cursor-pointer',
                  activeEventType === 'all'
                    ? 'bg-gradient-to-br from-green-400 to-green-300 text-slate-950'
                    : 'text-slate-500 hover:text-white'
                ]"
              >
                All
              </button>
              <button
                type="button"
                @click="activeEventType = 'match'"
                :class="[
                  'px-4 py-2 text-[10px] font-bold tracking-widest font-headline uppercase rounded-md transition-all cursor-pointer',
                  activeEventType === 'match'
                    ? 'bg-gradient-to-br from-green-400 to-green-300 text-slate-950'
                    : 'text-slate-500 hover:text-white'
                ]"
              >
                Match
              </button>
              <button
                type="button"
                @click="activeEventType = 'training'"
                :class="[
                  'px-4 py-2 text-[10px] font-bold tracking-widest font-headline uppercase rounded-md transition-all cursor-pointer',
                  activeEventType === 'training'
                    ? 'bg-gradient-to-br from-green-400 to-green-300 text-slate-950'
                    : 'text-slate-500 hover:text-white'
                ]"
              >
                Training
              </button>
            </div>
            <!-- Category Filter -->
            <div class="flex flex-wrap items-center gap-2 bg-surface-container-low p-1.5 rounded-lg border border-white/5">
              <button
                type="button"
                @click="activeCategory = 'all'"
                :class="[
                  'px-4 py-2 text-[10px] font-bold tracking-widest font-headline uppercase rounded-md transition-all cursor-pointer',
                  activeCategory === 'all'
                    ? 'bg-gradient-to-br from-green-400 to-green-300 text-slate-950'
                    : 'text-slate-500 hover:text-white'
                ]"
              >
                All Categories
              </button>
              <button
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                @click="activeCategory = cat.name"
                :class="[
                  'px-4 py-2 text-[10px] font-bold tracking-widest font-headline uppercase rounded-md transition-all cursor-pointer',
                  activeCategory === cat.name
                    ? 'bg-gradient-to-br from-green-400 to-green-300 text-slate-950'
                    : 'text-slate-500 hover:text-white'
                ]"
              >
                {{ cat.name }}
              </button>
            </div>
          </div>
        </section>

        <!-- ── Main Grid ── -->
        <div class="grid grid-cols-12 gap-6">

          <!-- ── Left: Creation Terminal ── -->
          <div class="col-span-12 lg:col-span-4 space-y-6">
            <div class="bg-surface-container-high p-6 rounded-xl relative overflow-hidden group border border-white/5 shadow-2xl">
              <div class="absolute -right-10 -bottom-10 opacity-[0.04] pointer-events-none group-hover:opacity-[0.07] transition-opacity">
                <span class="material-symbols-outlined text-[180px]">sports_soccer</span>
              </div>

              <div class="flex items-center gap-3 mb-6">
                <div class="h-8 w-1 bg-green-400 rounded-full"></div>
                <h3 class="font-headline font-bold text-lg tracking-tight uppercase text-white">Event Terminal</h3>
              </div>

              <!-- Creation Tabs -->
              <div class="flex gap-2 mb-6 bg-surface-container-low p-1 rounded-lg border border-white/5">
                <button
                  type="button"
                  @click="activeCreationTab = 'match'"
                  :class="[
                    'flex-1 py-2 px-4 text-[10px] font-bold font-headline uppercase rounded-md transition-all cursor-pointer',
                    activeCreationTab === 'match'
                      ? 'bg-gradient-to-br from-green-400 to-green-300 text-slate-950'
                      : 'text-slate-500 hover:text-white'
                  ]"
                >
                  Match
                </button>
                <button
                  type="button"
                  @click="activeCreationTab = 'training'"
                  :class="[
                    'flex-1 py-2 px-4 text-[10px] font-bold font-headline uppercase rounded-md transition-all cursor-pointer',
                    activeCreationTab === 'training'
                      ? 'bg-gradient-to-br from-green-400 to-green-300 text-slate-950'
                      : 'text-slate-500 hover:text-white'
                  ]"
                >
                  Training
                </button>
              </div>

              <!-- Match Form -->
              <form v-if="activeCreationTab === 'match'" class="space-y-4 relative z-10" @submit.prevent="deployMatch">

                <!-- Category -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
                  <select v-model="matchCategoryID" required class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 cursor-pointer">
                    <option value="" disabled>Select Category...</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>

                <!-- Opponent Name -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opponent</label>
                  <input
                    v-model="opponentName"
                    required
                    type="text"
                    placeholder="E.G. REAL MADRID CF"
                    class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 placeholder:text-slate-600 uppercase"
                  />
                </div>

                <!-- Date + Kickoff + End Time -->
                <div class="grid grid-cols-3 gap-4">
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</label>
                    <input v-model="matchDate" required type="date" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark cursor-pointer"/>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kickoff</label>
                    <input v-model="kickoffTime" required type="time" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark cursor-pointer"/>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">End</label>
                    <input v-model="matchEndTime" required type="time" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark cursor-pointer"/>
                  </div>
                </div>

                <!-- Stadium Name -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stadium Name</label>
                  <input
                    v-model="stadiumName"
                    type="text"
                    placeholder="E.G. STADE DU 5 JUILLET"
                    class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 placeholder:text-slate-600 uppercase"
                  />
                </div>

                <!-- Home / Away Toggle -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Venue Type</label>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      @click="isHome = true"
                      :class="[
                        'py-3 px-2 rounded-md text-[10px] font-bold font-headline uppercase flex items-center justify-center gap-2 border transition-all cursor-pointer',
                        isHome
                          ? 'border-green-400 bg-green-400/10 text-green-400'
                          : 'border-white/10 text-slate-400 hover:border-slate-500 hover:text-white'
                      ]"
                    >
                      <span class="material-symbols-outlined text-base">home</span>
                      Home
                    </button>
                    <button
                      type="button"
                      @click="isHome = false"
                      :class="[
                        'py-3 px-2 rounded-md text-[10px] font-bold font-headline uppercase flex items-center justify-center gap-2 border transition-all cursor-pointer',
                        !isHome
                          ? 'border-blue-400 bg-blue-400/10 text-blue-400'
                          : 'border-white/10 text-slate-400 hover:border-slate-500 hover:text-white'
                      ]"
                    >
                      <span class="material-symbols-outlined text-base">flight_takeoff</span>
                      Away
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  :disabled="isSubmittingMatch"
                  class="w-full py-4 bg-gradient-to-r from-green-400 to-green-300 text-slate-950 font-black font-headline text-xs tracking-[0.2em] uppercase rounded-md shadow-lg shadow-green-900/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="material-symbols-outlined text-sm">add_circle</span>
                  Schedule Match
                </button>
              </form>

              <!-- Training Form -->
              <form v-else class="space-y-4 relative z-10" @submit.prevent="deployTraining">

                <!-- Category -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
                  <select v-model="trainingCategoryID" required class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 cursor-pointer">
                    <option value="" disabled>Select Category...</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>

                <!-- Session Type -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Session Type</label>
                  <select v-model="sessionTypeID" required class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 cursor-pointer">
                    <option value="" disabled>Select Session Type...</option>
                    <option v-for="type in sessionTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
                  </select>
                </div>

                <!-- Date -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</label>
                  <input v-model="sessionDate" required type="date" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark cursor-pointer"/>
                </div>

                <!-- Start Time + End Time -->
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Start Time</label>
                    <input v-model="startTime" required type="time" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark cursor-pointer"/>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">End Time</label>
                    <input v-model="endTime" required type="time" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark cursor-pointer"/>
                  </div>
                </div>

                <!-- Location -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location</label>
                  <input
                    v-model="location"
                    required
                    type="text"
                    placeholder="E.G. PITCH 1 — MAIN ARENA"
                    class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 placeholder:text-slate-600 uppercase"
                  />
                </div>

                <button
                  type="submit"
                  :disabled="isSubmittingTraining"
                  class="w-full py-4 bg-gradient-to-r from-green-400 to-green-300 text-slate-950 font-black font-headline text-xs tracking-[0.2em] uppercase rounded-md shadow-lg shadow-green-900/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="material-symbols-outlined text-sm">add_circle</span>
                  Create Session
                </button>
              </form>
            </div>
          </div>

          <!-- ── Right: Schedule Ledger ── -->
          <div class="col-span-12 lg:col-span-8 space-y-6">

            <div class="flex items-center justify-between">
              <h3 class="font-headline font-bold text-lg tracking-tight uppercase flex items-center gap-3 text-white">
                <span class="material-symbols-outlined text-green-400">analytics</span>
                Schedule Ledger
              </h3>
              <div class="flex items-center gap-4">
                <div class="text-sm text-slate-400">
                  Page {{ currentPage }}
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    @click="goToPrevPage"
                    :disabled="currentPage === 1"
                    :class="[
                      'p-2 rounded-md border transition-colors',
                      currentPage === 1
                        ? 'bg-surface-container-high text-slate-400 border-white/5 cursor-not-allowed'
                        : 'bg-surface-container-high text-slate-400 hover:text-white border-white/5'
                    ]"
                  >
                    <span class="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    @click="goToNextPage"
                    :disabled="!hasMore"
                    :class="[
                      'p-2 rounded-md border transition-colors',
                      !hasMore
                        ? 'bg-surface-container-high text-slate-400 border-white/5 cursor-not-allowed'
                        : 'bg-surface-container-high text-slate-400 hover:text-white border-white/5'
                    ]"
                  >
                    <span class="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Ledger entries -->
            <div class="space-y-4">
              <div
                v-for="entry in filteredEvents"
                :key="entry.id"
                class="relative bg-surface-container-low rounded-xl p-6 group hover:bg-surface-container-high transition-all duration-300 border border-white/5 overflow-hidden"
              >
                <!-- Decorative gradient border -->
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 to-amber-400"></div>
                
                <div class="flex items-start gap-6 pl-4">
                  <!-- Date column -->
                  <div class="flex flex-col items-center justify-center min-w-[60px]">
                    <span class="text-3xl font-black font-headline leading-none" :class="entry.highlight ? 'text-green-400' : 'text-white'">
                      {{ entry.day }}
                    </span>
                    <span class="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">{{ entry.month }}</span>
                  </div>

                  <!-- Content -->
                  <div class="flex-1 flex flex-col gap-4">
                    <div class="flex items-start justify-between gap-4">
                      <div class="flex items-center gap-4 flex-1">
                        <div :class="['h-12 w-12 rounded-lg flex items-center justify-center', entry.iconBg, 'shadow-lg']">
                          <span :class="['material-symbols-outlined text-2xl', entry.iconColor]">{{ entry.icon }}</span>
                        </div>
                        <div class="flex-1">
                          <h4 class="text-base font-black font-headline uppercase tracking-tight text-white">{{ entry.title }}</h4>
                          <div class="flex items-center gap-3">
                            <p class="text-[10px] font-bold tracking-widest uppercase" :class="entry.isHome ? 'text-green-400' : 'text-blue-400'">
                              {{ entry.subtitle }}
                            </p>
                            <span v-if="entry.eventType === 'Match'" class="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded" :class="entry.isHome ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'bg-blue-400/10 text-blue-400 border border-blue-400/20'">
                              {{ entry.isHome ? 'HOME' : 'AWAY' }}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span class="px-4 py-1.5 bg-surface-container-highest border border-white/10 text-[10px] font-black uppercase text-slate-200 rounded-md shadow-md whitespace-nowrap">
                        {{ entry.badge }}
                      </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-slate-500 text-sm">schedule</span>
                          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Time</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-mono font-bold text-white">{{ entry.time }}</span>
                        </div>
                      </div>
                      <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-slate-500 text-sm">location_on</span>
                          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Location</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-bold text-white uppercase">{{ entry.detail }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <button
                      type="button"
                      @click="openEdit(entry)"
                      class="p-2 text-slate-500 hover:text-green-400 transition-all rounded-lg hover:bg-white/5"
                    >
                      <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="filteredEvents.length === 0" class="flex flex-col items-center justify-center py-20 gap-6">
                <div class="relative">
                  <div class="h-24 w-24 rounded-full bg-surface-container-high border border-white/5 flex items-center justify-center">
                    <span class="material-symbols-outlined text-5xl text-slate-700">calendar_month</span>
                  </div>
                  <div class="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm text-green-400">add</span>
                  </div>
                </div>
                <div class="text-center space-y-2">
                  <p class="font-headline font-black uppercase tracking-tight text-white text-lg">No Events Found</p>
                  <p class="text-slate-500 text-xs font-medium max-w-xs leading-relaxed">
                    There are no events matching your current filters. Use the Event Terminal on the left to deploy a new match or training session, or adjust your filters.
                  </p>
                </div>
                <div class="flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/5 bg-surface-container-high">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Ready for Deployment</span>
                </div>
              </div>
            </div>

            <!-- ── Bottom Stats Card ── -->
            <div class="relative overflow-hidden bg-surface-container-high rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-10 border border-white/5">
              <div class="space-y-4 max-w-md">
                <h4 class="text-3xl font-black font-headline tracking-tighter italic text-green-400 leading-none">
                  PEAK PERFORMANCE <br/><span class="text-white">SCHEDULED.</span>
                </h4>
                <p class="text-sm text-slate-400 leading-relaxed">
                  Manage the tactical lifecycle of every squad from the academy to the first team. Integrated telemetry ensures pitch availability is never a bottleneck.
                </p>
                <div class="flex gap-6">
                  <div class="flex flex-col">
                    <span class="text-2xl font-black font-headline text-white">{{ filteredEvents.length }}</span>
                    <span class="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">Events This Week</span>
                  </div>
                  <div class="w-px h-8 bg-white/10 self-center"></div>
                  <div class="flex flex-col">
                    <span class="text-2xl font-black font-headline text-white">98%</span>
                    <span class="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">Pitch Utilization</span>
                  </div>
                </div>
              </div>
              <div class="relative w-full md:w-auto">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdqJLouIsFLiDNmg1vM1cLaF-0wU7H2BHwvlRX6fckIdd_XtIWTcpYvFK0DWJ3n0yim_cRX2xBBX4WKRT0r3fZ3CFGcvuNEJgA-beenBdyllO-x02RPJkiooB4lMBIapcSFlJrBQ91oG2bPjJJ83S5uhytqpYqZXoFhSilYDxLi6AhKn_Wt8iH5l8QtWLD1J_GrDmof5ZDyBM9wD9gap9nHmVyAVldkv8gNWQOZZX_T8f9S0SvCJXLs6OsTOp0hyv3N5YSETYKIzk"
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
              <div class="text-green-400 text-[10px] font-black tracking-[0.2em] uppercase mb-1">Modify Event</div>
              <h2 class="text-xl font-black text-white tracking-tight uppercase">Edit Event</h2>
            </div>
            <button type="button" class="text-slate-500 hover:text-white transition-colors" @click="showEditModal = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="p-6 space-y-4" v-if="editingEntry">
            <!-- Category -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
              <select v-model="editingEntry.editCategoryID" required class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 cursor-pointer">
                <option value="" disabled>Select Category...</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>

            <!-- Match or Training specific fields -->
            <template v-if="editingEntry.eventType === 'Match'">
              <!-- Opponent Name -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opponent</label>
                <input
                  v-model="editingEntry.editOpponentName"
                  required
                  type="text"
                  placeholder="E.G. LIVERPOOL FC"
                  class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 placeholder:text-slate-600 uppercase"
                />
              </div>

              <!-- Date -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</label>
                <input v-model="editingEntry.editDate" required type="date" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark cursor-pointer"/>
              </div>

              <!-- Kickoff + End Time -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kickoff</label>
                  <input v-model="editingEntry.editKickoffTime" required type="time" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark cursor-pointer"/>
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">End</label>
                  <input v-model="editingEntry.editEndTime" required type="time" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark cursor-pointer"/>
                </div>
              </div>

              <!-- Home/Away Toggle -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fixture</label>
                <div class="grid grid-cols-2 gap-2 bg-surface-container-lowest p-1 rounded-md border border-white/5">
                  <button
                    type="button"
                    @click="editingEntry.editIsHome = true"
                    :class="[
                      'py-3 px-2 rounded-md text-[10px] font-bold font-headline uppercase flex items-center justify-center gap-2 border transition-all cursor-pointer',
                      editingEntry.editIsHome
                        ? 'border-green-400 bg-green-400/10 text-green-400'
                        : 'border-white/10 text-slate-400 hover:border-slate-500 hover:text-white'
                    ]"
                  >
                    <span class="material-symbols-outlined text-base">home</span>
                    Home
                  </button>
                  <button
                    type="button"
                    @click="editingEntry.editIsHome = false"
                    :class="[
                      'py-3 px-2 rounded-md text-[10px] font-bold font-headline uppercase flex items-center justify-center gap-2 border transition-all cursor-pointer',
                      !editingEntry.editIsHome
                        ? 'border-blue-400 bg-blue-400/10 text-blue-400'
                        : 'border-white/10 text-slate-400 hover:border-slate-500 hover:text-white'
                    ]"
                  >
                    <span class="material-symbols-outlined text-base">flight_takeoff</span>
                    Away
                  </button>
                </div>
              </div>

              <!-- Stadium Name -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stadium</label>
                <input
                  v-model="editingEntry.editStadiumName"
                  type="text"
                  placeholder="E.G. ANFIELD"
                  class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 placeholder:text-slate-600 uppercase"
                />
              </div>
            </template>

            <template v-else>
              <!-- Session Type -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Session Type</label>
                <select v-model="editingEntry.editSessionTypeID" required class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 cursor-pointer">
                  <option value="" disabled>Select Session Type...</option>
                  <option v-for="type in sessionTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
                </select>
              </div>

              <!-- Date -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</label>
                <input v-model="editingEntry.editDate" required type="date" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark cursor-pointer"/>
              </div>

              <!-- Start + End Time -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Start</label>
                  <input v-model="editingEntry.editStartTime" required type="time" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark cursor-pointer"/>
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">End</label>
                  <input v-model="editingEntry.editEndTime" required type="time" class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 scheme-dark cursor-pointer"/>
                </div>
              </div>

              <!-- Location -->
              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location</label>
                <input
                  v-model="editingEntry.editLocation"
                  required
                  type="text"
                  placeholder="E.G. PITCH 1"
                  class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 placeholder:text-slate-600 uppercase"
                />
              </div>
            </template>
          </div>
          <div class="p-6 bg-surface-container-high/50 border-t border-white/5 flex gap-3">
            <button type="button" @click="showEditModal = false" class="flex-1 py-3 text-slate-400 font-black text-xs uppercase tracking-widest rounded-md hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button type="button" @click="saveEdit" :disabled="isSubmittingEdit" class="flex-[2] py-3 bg-gradient-to-r from-green-400 to-green-300 text-slate-950 font-black text-xs uppercase tracking-widest rounded-md hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="material-symbols-outlined text-sm">save</span>
              {{ isSubmittingEdit ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

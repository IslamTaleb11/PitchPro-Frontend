<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { lookupService } from '../services/lookupService'
import { trainingService } from '../services/trainingService'
import { useUiToast } from '../composables/useUiToast'

const { t: $t } = useI18n()
const { showToast } = useUiToast()
const isSidebarOpen = ref(true)

// ── Lookups ───────────────────────────────────────────────────────────────────
const categories    = ref([])
const sessionTypes  = ref([])

function normalizeLookup(data) {
  let arr = Array.isArray(data) ? data : (data?.data || data?.$values || data?.items || [])
  return arr.map(item => ({
    id:   item.id   ?? item.ID,
    name: item.name ?? item.Name,
  }))
}

onMounted(async () => {
  const [catRes, typeRes] = await Promise.allSettled([
    lookupService.getCategories(),
    lookupService.getSessionTypes(),
  ])
  if (catRes.status === 'fulfilled')  categories.value   = normalizeLookup(catRes.value.data)
  if (typeRes.status === 'fulfilled') sessionTypes.value = normalizeLookup(typeRes.value.data)
})

// ── Form State ────────────────────────────────────────────────────────────────
const categoryID    = ref('')
const sessionDate   = ref('')
const startTime     = ref('')
const endTime       = ref('')
const location      = ref('')
const sessionTypeID = ref('')

// ── Sessions Ledger ───────────────────────────────────────────────────────────
const sessions = ref([])

// ── Submit ────────────────────────────────────────────────────────────────────
async function submitSession() {
  if (!categoryID.value || !sessionDate.value || !startTime.value || !endTime.value || !location.value.trim() || !sessionTypeID.value) {
    showToast({ title: $t('schedule.toast.missingFieldsTitle'), message: $t('schedule.toast.fillAllFieldsMessage'), mode: 'error', duration: 4000 })
    return
  }

  // Client-side validation for future date
  const selectedDate = new Date(sessionDate.value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (selectedDate < today) {
    showToast({ title: $t('schedule.toast.invalidDateTitle'), message: $t('schedule.toast.trainingDateFutureMessage'), mode: 'error', duration: 4000 })
    return
  }

  // Validate end time is after start time
  const start = new Date(`2000-01-01 ${startTime.value}`)
  const end = new Date(`2000-01-01 ${endTime.value}`)

  if (end <= start) {
    showToast({ title: $t('schedule.toast.invalidTimeTitle'), message: $t('schedule.toast.endAfterStartMessage'), mode: 'error', duration: 4000 })
    return
  }

  try {
    showToast({ title: $t('schedule.toast.creatingSessionTitle'), message: $t('schedule.toast.creatingSessionMessage'), mode: 'loading', duration: 0 })

    const payload = {
      ClubID:        7,
      CategoryID:    Number(categoryID.value),
      Date:          sessionDate.value,
      StartTime:     startTime.value + ':00',
      EndTime:       endTime.value   + ':00',
      Location:      location.value,
      SessionTypeID: Number(sessionTypeID.value),
    }

    const response = await trainingService.createSession(payload)

    // Add to local ledger
    const cat  = categories.value.find(c => c.id === Number(categoryID.value))
    const type = sessionTypes.value.find(t => t.id === Number(sessionTypeID.value))
    const d    = new Date(sessionDate.value)

    sessions.value.unshift({
      id:       response.data?.id ?? Date.now(),
      day:      String(d.getDate()).padStart(2, '0'),
      month:    d.toLocaleString('en', { month: 'short' }).toUpperCase(),
      type:     type?.name ?? '—',
      location: location.value,
      start:    startTime.value,
      end:      endTime.value,
      category: cat?.name ?? '—',
    })

    showToast({ title: $t('schedule.toast.sessionCreatedTitle'), message: response.data?.message || $t('schedule.toast.sessionCreatedMessage'), mode: 'success', duration: 3000 })

    // Reset form
    categoryID.value    = ''
    sessionDate.value   = ''
    startTime.value     = ''
    endTime.value       = ''
    location.value      = ''
    sessionTypeID.value = ''

  } catch (error) {
    const message = error.response?.data?.message || error.message || $t('schedule.toast.genericError')
    showToast({ title: $t('common.error'), message, mode: 'error', duration: 4000 })
  }
}
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <DashboardSidebar active-item="training" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      :class="[
        'pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300 lg:flex-1',
        'ml-0',
      ]"
    >
      <div class="space-y-8">

        <!-- ── Page Header ── -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 class="font-headline text-4xl font-black italic tracking-tighter text-white mb-2 uppercase">
              Training <span class="text-green-400">Sessions</span>
            </h1>
            <div class="flex items-center gap-2">
              <div class="h-1 w-12 bg-green-400"></div>
              <p class="font-headline text-xs font-bold uppercase tracking-widest text-slate-500">
                Schedule & Manage Training Sessions
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full border border-white/5">
            <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span class="text-[10px] font-black text-green-400 uppercase tracking-tighter">Session Terminal Active</span>
          </div>
        </div>

        <!-- ── Main Grid ── -->
        <div class="grid grid-cols-12 gap-6">

          <!-- ── Left: Session Creation Form ── -->
          <div class="col-span-12 lg:col-span-4">
            <div class="bg-surface-container-high p-6 rounded-xl relative overflow-hidden group border border-white/5 shadow-2xl">
              <div class="absolute -right-10 -bottom-10 opacity-[0.04] pointer-events-none group-hover:opacity-[0.07] transition-opacity">
                <span class="material-symbols-outlined text-[180px]">exercise</span>
              </div>

              <div class="flex items-center gap-3 mb-6">
                <div class="h-8 w-1 bg-green-400 rounded-full"></div>
                <h3 class="font-headline font-bold text-lg tracking-tight uppercase text-white">Session Terminal</h3>
              </div>

              <form class="space-y-4 relative z-10" @submit.prevent="submitSession">

                <!-- Category -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
                  <select v-model="categoryID" required class="w-full bg-surface-container-lowest border-none text-xs font-medium text-white rounded-md p-3 focus:ring-1 focus:ring-green-400/50 cursor-pointer">
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
                  class="w-full py-4 bg-gradient-to-r from-green-400 to-green-300 text-slate-950 font-black font-headline text-xs tracking-[0.2em] uppercase rounded-md shadow-lg shadow-green-900/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span class="material-symbols-outlined text-sm">add_circle</span>
                  Create Session
                </button>
              </form>
            </div>
          </div>

          <!-- ── Right: Sessions Ledger ── -->
          <div class="col-span-12 lg:col-span-8 space-y-6">

            <div class="flex items-center justify-between">
              <h3 class="font-headline font-bold text-lg tracking-tight uppercase flex items-center gap-3 text-white">
                <span class="material-symbols-outlined text-green-400">event_note</span>
                Sessions Ledger
              </h3>
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {{ sessions.length }} session{{ sessions.length !== 1 ? 's' : '' }}
              </span>
            </div>

            <!-- Ledger entries -->
            <div class="space-y-3">
              <div
                v-for="session in sessions"
                :key="session.id"
                class="bg-surface-container-low rounded-lg p-5 flex items-center gap-6 group hover:bg-surface-container-high transition-all border border-white/5"
              >
                <!-- Date column -->
                <div class="flex flex-col items-center justify-center min-w-[56px] border-r border-white/10 pr-5">
                  <span class="text-2xl font-black font-headline leading-none text-amber-400">{{ session.day }}</span>
                  <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{{ session.month }}</span>
                </div>

                <!-- Content -->
                <div class="flex-1 flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
                  <div class="flex items-center gap-4 min-w-[160px]">
                    <div class="h-10 w-10 rounded-md bg-amber-400/10 flex items-center justify-center">
                      <span class="material-symbols-outlined text-amber-400">exercise</span>
                    </div>
                    <div>
                      <h4 class="text-sm font-black font-headline uppercase tracking-tight text-white">{{ session.type }}</h4>
                      <p class="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Training</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-8">
                    <div class="flex flex-col">
                      <span class="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Time</span>
                      <span class="text-xs font-mono font-bold text-white">{{ session.start }} — {{ session.end }}</span>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Location</span>
                      <span class="text-xs font-bold text-white uppercase">{{ session.location }}</span>
                    </div>
                  </div>

                  <div class="md:ml-auto">
                    <span class="px-3 py-1 bg-surface-container-highest border border-white/10 text-[9px] font-black uppercase text-slate-300 rounded-sm">
                      {{ session.category }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div v-if="sessions.length === 0" class="flex flex-col items-center justify-center py-20 gap-6">
                <div class="relative">
                  <div class="h-24 w-24 rounded-full bg-surface-container-high border border-white/5 flex items-center justify-center">
                    <span class="material-symbols-outlined text-5xl text-slate-700">fitness_center</span>
                  </div>
                  <div class="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm text-green-400">add</span>
                  </div>
                </div>
                <div class="text-center space-y-2">
                  <p class="font-headline font-black uppercase tracking-tight text-white text-lg">No Sessions Scheduled</p>
                  <p class="text-slate-500 text-xs font-medium max-w-xs leading-relaxed">
                    Use the Session Terminal on the left to create your first training session.
                  </p>
                </div>
                <div class="flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/5 bg-surface-container-high">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Ready for Deployment</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'

const isSidebarOpen = ref(true)

const selectedCategory = ref('')
const selectedSessionType = ref('Training Session')

const players = ref([
  { id: 'SIL-0824-A', name: 'L. Silva', position: 'CAM', status: 'present', note: '' },
  { id: 'RAS-0824-B', name: 'M. Rashford', position: 'ST', status: 'absent', note: 'Medical Leave' },
  { id: 'DEB-0824-C', name: 'K. De Bruyne', position: 'CAM', status: 'present', note: '' },
  { id: 'SAK-0824-D', name: 'B. Saka', position: 'RW', status: 'present', note: '' },
  { id: 'HAA-0824-E', name: 'E. Haaland', position: 'ST', status: 'excused', note: 'Personal' },
  { id: 'ROD-0824-F', name: 'Rodri', position: 'CDM', status: 'present', note: '' },
])

const playerStatuses = ref(
  Object.fromEntries(players.value.map(p => [p.id, p.status]))
)

const playersForTable = computed(() =>
  players.value.map(p => ({ ...p, status: playerStatuses.value[p.id] || p.status }))
)

const presentCount = computed(() => playersForTable.value.filter(p => p.status === 'present').length)
const absentCount = computed(() => playersForTable.value.filter(p => p.status === 'absent').length)
const excusedCount = computed(() => playersForTable.value.filter(p => p.status === 'excused').length)

function updateStatus(playerId, type) {
  playerStatuses.value = { ...playerStatuses.value, [playerId]: type }
}

function markAllPresent() {
  const updated = { ...playerStatuses.value }
  Object.keys(updated).forEach(id => { updated[id] = 'present' })
  playerStatuses.value = updated
}

function resetAll() {
  const updated = {}
  players.value.forEach(p => { updated[p.id] = p.status })
  playerStatuses.value = updated
}
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <DashboardSidebar active-item="match-monitor" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main class="pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background transition-all duration-300 lg:flex-1">
      <div class="flex gap-8 p-8">
        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="mb-8">
            <div class="flex items-start justify-between">
              <div>
                <h1 class="font-headline text-4xl font-black text-on-surface tracking-tight uppercase leading-none">Daily Operations</h1>
                <p class="text-on-surface-variant font-medium text-sm mt-2 opacity-80">Squad Availability &amp; Attendance Terminal</p>
              </div>
              <div class="flex gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">Squad Category</label>
                  <select v-model="selectedCategory" class="bg-surface-container-high border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider">
                    <option value="">U-16 Elite</option>
                    <option>Senior A-Team</option>
                    <option>Reserve Squad</option>
                    <option>Academy U-14</option>
                  </select>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">Session Type</label>
                  <select v-model="selectedSessionType" class="bg-surface-container-high border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider">
                    <option>Training Session</option>
                    <option>Matchday Prep</option>
                    <option>Recovery / Gym</option>
                    <option>Technical Video</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between bg-surface-container-low border border-outline-variant/10 p-4 rounded mb-2">
            <div class="flex items-center gap-4">
              <button class="bg-primary-container text-on-primary-container text-[11px] font-black px-6 py-2.5 rounded shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest" type="button" @click="markAllPresent">
                <span class="material-symbols-outlined text-sm">done_all</span> Mark All Present
              </button>
              <button class="bg-primary-container text-on-primary-container text-[11px] font-black px-6 py-2.5 rounded shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest" type="button">
                <span class="material-symbols-outlined text-sm">task_alt</span> Finalize Match &amp; Mark Completed
              </button>
              <button class="text-[11px] font-black text-on-surface-variant hover:text-on-surface px-4 py-2.5 rounded transition-all flex items-center gap-2 uppercase tracking-widest border border-outline-variant/20 bg-surface-container-high" type="button" @click="resetAll">
                <span class="material-symbols-outlined text-sm">refresh</span> Reset All
              </button>
            </div>
            <div class="flex items-center gap-6">
              <div class="flex items-center gap-2 px-3 py-1 bg-surface-container-highest rounded border border-outline-variant/10">
                <span class="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Active Roster:</span>
                <span class="text-[11px] font-mono font-bold text-primary">{{ playersForTable.length }} Players</span>
              </div>
              <div class="flex items-center gap-2 text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
                <span class="material-symbols-outlined text-lg">filter_list</span>
                <span class="text-[10px] font-black uppercase tracking-widest">Filter</span>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto pb-8 no-scrollbar">
            <table class="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr class="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">
                  <th class="px-4 pb-2">Player Profile</th>
                  <th class="px-4 pb-2">Pos</th>
                  <th class="px-4 pb-2 text-center">Operational Status</th>
                  <th class="px-4 pb-2 text-center">Match Events</th>
                  <th class="px-4 pb-2 text-right">Activity Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="player in playersForTable" :key="player.id" class="bg-surface-container-low/40 hover:bg-surface-container-low transition-colors group">
                  <td class="px-4 py-3 border-y border-l border-outline-variant/5">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded border-2 border-primary/20 p-0.5 relative">
                        <div class="w-full h-full bg-surface-container-highest rounded-sm"></div>
                        <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-surface" :class="player.status === 'present' ? 'bg-primary' : player.status === 'absent' ? 'bg-error' : 'bg-tertiary-fixed-dim'"></div>
                      </div>
                      <div>
                        <p class="font-headline font-bold text-on-surface text-base uppercase leading-tight">{{ player.name }}</p>
                        <p class="text-[10px] text-on-surface-variant font-mono tracking-tighter">REF: {{ player.id }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <span class="bg-surface-container-highest px-2 py-1 rounded text-[10px] font-mono font-bold text-on-surface-variant border border-outline-variant/20 uppercase tracking-tighter">{{ player.position }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <div class="flex justify-center gap-2">
                      <button type="button"
                        :class="[
                          'status-btn flex-1 min-w-[100px] py-2.5 rounded border border-outline-variant/20 text-[11px] font-black uppercase tracking-widest',
                          player.status === 'present' ? 'active-pill-present' : 'hover:border-primary/40'
                        ]"
                        @click="updateStatus(player.id, 'present')">Present</button>
                      <button type="button"
                        :class="[
                          'status-btn flex-1 min-w-[100px] py-2.5 rounded border border-outline-variant/20 text-[11px] font-black uppercase tracking-widest',
                          player.status === 'absent' ? 'active-pill-absent' : 'hover:border-error/40'
                        ]"
                        @click="updateStatus(player.id, 'absent')">Absent</button>
                      <button type="button"
                        :class="[
                          'status-btn flex-1 min-w-[100px] py-2.5 rounded border border-outline-variant/20 text-[11px] font-black uppercase tracking-widest',
                          player.status === 'excused' ? 'active-pill-excused' : 'hover:border-tertiary-container/40'
                        ]"
                        @click="updateStatus(player.id, 'excused')">Excused</button>
                    </div>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <div class="flex justify-center gap-2">
                      <button class="w-8 h-8 rounded bg-surface-container-high border border-outline-variant/20 flex items-center justify-center hover:text-primary transition-colors" title="Log Goal">
                        <span class="material-symbols-outlined text-sm">sports_soccer</span>
                      </button>
                      <button class="w-8 h-8 rounded bg-surface-container-high border border-outline-variant/20 flex items-center justify-center hover:text-primary transition-colors" title="Log Assist">
                        <span class="material-symbols-outlined text-sm">handshake</span>
                      </button>
                      <button class="w-8 h-8 rounded bg-surface-container-high border border-outline-variant/20 flex items-center justify-center hover:text-error transition-colors" title="Log Card">
                        <span class="material-symbols-outlined text-sm">style</span>
                      </button>
                    </div>
                  </td>
                  <td class="px-4 py-3 border-y border-r border-outline-variant/5 text-right">
                    <div v-if="player.note" class="flex items-center justify-end gap-2 text-error">
                      <span class="material-symbols-outlined text-base">medical_services</span>
                      <span class="text-[10px] font-black uppercase tracking-widest">{{ player.note }}</span>
                    </div>
                    <input v-else class="bg-transparent border-b border-outline-variant/20 text-on-surface-variant text-[11px] py-1 text-right focus:border-primary outline-none transition-all w-full max-w-[200px] placeholder:italic placeholder:opacity-30" placeholder="Add operational note..." type="text">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <aside class="hidden xl:flex xl:flex-col w-80 bg-surface-container-lowest glass-panel p-8 border-l border-outline-variant/10 overflow-y-auto no-scrollbar">
          <h2 class="font-headline text-xl font-black text-on-surface mb-8 uppercase tracking-tighter border-b border-outline-variant/10 pb-4">Session Summary</h2>
          <div class="space-y-6">
            <div class="bg-surface-container-low p-6 rounded border border-outline-variant/10 relative overflow-hidden">
              <div class="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-8 -mt-8 rounded-full blur-2xl"></div>
              <p class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black mb-2">Total Present</p>
              <div class="flex items-baseline gap-3">
                <span class="text-6xl font-display font-black text-primary leading-none">{{ presentCount }}</span>
                <span class="text-base font-mono font-bold text-on-surface-variant">/ {{ playersForTable.length }}</span>
              </div>
              <div class="mt-4 h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div class="h-full bg-primary" :style="{ width: `${playersForTable.length ? Math.round((presentCount / playersForTable.length) * 100) : 0}%` }" style="box-shadow: 0 0 10px rgba(0,255,65,0.4)"></div>
              </div>
              <p class="text-[10px] font-bold text-primary mt-2 uppercase tracking-widest">{{ playersForTable.length ? `${Math.round((presentCount / playersForTable.length) * 100)}% Availability` : '0% Availability' }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="bg-surface-container-low p-4 rounded border border-outline-variant/10 text-center">
                <p class="text-[9px] uppercase tracking-widest text-on-surface-variant font-black mb-1">Absent</p>
                <p class="text-2xl font-display font-black text-error">{{ absentCount }}</p>
              </div>
              <div class="bg-surface-container-low p-4 rounded border border-outline-variant/10 text-center">
                <p class="text-[9px] uppercase tracking-widest text-on-surface-variant font-black mb-1">Excused</p>
                <p class="text-2xl font-display font-black text-tertiary-fixed-dim">{{ excusedCount }}</p>
              </div>
            </div>

            <div class="pt-6 border-t border-outline-variant/10">
              <h3 class="font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4">Quick Event Logger</h3>
              <div class="bg-surface-container-low p-4 rounded border border-outline-variant/10 space-y-3">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[9px] uppercase tracking-widest text-on-surface-variant font-black">Select Player</label>
                  <select class="bg-surface-container-high border-outline-variant/20 text-on-surface text-[10px] font-bold rounded px-3 py-2 focus:ring-1 focus:ring-primary-fixed w-full uppercase">
                    <option v-for="player in playersForTable" :key="player.id">{{ player.name }}</option>
                  </select>
                </div>
                <div class="grid grid-cols-4 gap-2">
                  <button class="aspect-square rounded bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center hover:border-primary/40 transition-all group" type="button">
                    <span class="material-symbols-outlined text-sm text-primary">sports_soccer</span>
                    <span class="text-[8px] font-black mt-1">GOAL</span>
                  </button>
                  <button class="aspect-square rounded bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center hover:border-primary/40 transition-all group" type="button">
                    <span class="material-symbols-outlined text-sm text-primary">handshake</span>
                    <span class="text-[8px] font-black mt-1">AST</span>
                  </button>
                  <button class="aspect-square rounded bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center hover:border-error/40 transition-all group" type="button">
                    <span class="material-symbols-outlined text-sm text-tertiary-fixed-dim">style</span>
                    <span class="text-[8px] font-black mt-1">YEL</span>
                  </button>
                  <button class="aspect-square rounded bg-surface-container-highest border border-outline-variant/20 flex flex-col items-center justify-center hover:border-error/40 transition-all group" type="button">
                    <span class="material-symbols-outlined text-sm text-error">style</span>
                    <span class="text-[8px] font-black mt-1">RED</span>
                  </button>
                </div>
                <button class="w-full bg-primary/10 text-primary text-[9px] font-black py-2 rounded border border-primary/20 uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all" type="button">Log Event</button>
              </div>
            </div>

            <div class="pt-6 border-t border-outline-variant/10">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Active Sidelined</h3>
                <span class="bg-error/10 text-error px-2 py-0.5 rounded text-[9px] font-black border border-error/20">3 CRITICAL</span>
              </div>
              <div class="space-y-3">
                <div class="flex items-center gap-3 p-3 bg-surface-container-high/40 rounded border-l-2 border-error">
                  <div class="w-8 h-8 rounded-full bg-surface-container-highest shrink-0"></div>
                  <div>
                    <p class="text-[10px] font-black text-on-surface uppercase">R. Varane</p>
                    <p class="text-[9px] text-error font-bold uppercase tracking-tighter">Hamstring GII</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-3 bg-surface-container-high/40 rounded border-l-2 border-error">
                  <div class="w-8 h-8 rounded-full bg-surface-container-highest shrink-0"></div>
                  <div>
                    <p class="text-[10px] font-black text-on-surface uppercase">T. Courtois</p>
                    <p class="text-[9px] text-error font-bold uppercase tracking-tighter">ACL Rehab</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-8 space-y-4">
              <button class="w-full bg-surface-container-high border border-outline-variant/30 text-on-surface-variant font-headline font-bold py-3 rounded uppercase text-[10px] tracking-widest hover:text-on-surface hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 group" type="button">
                <span class="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">download</span>
                Sync Cloud Roster
              </button>
              <button class="w-full bg-primary-container text-on-primary-container font-headline font-black py-5 rounded-sm shadow-[0_10px_30px_rgba(0,255,65,0.2)] uppercase text-xs tracking-[0.3em] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all" type="button">
                Finalize Session
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<style scoped>
.glass-panel {
  background: rgba(17, 20, 23, 0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}
.status-btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.active-pill-present { background-color: #00ff41 !important; color: #003907 !important; font-weight: 800; border-color: #00ff41 !important; }
.active-pill-absent { background-color: #93000a !important; color: #ffdad6 !important; font-weight: 800; border-color: #93000a !important; }
.active-pill-excused { background-color: #ffd6a1 !important; color: #452b00 !important; font-weight: 800; border-color: #ffd6a1 !important; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
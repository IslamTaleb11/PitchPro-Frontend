<script setup>
defineProps({
  sidebarOpen: {
    type: Boolean,
    default: true
  }
})

defineEmits(['toggle-sidebar'])
</script>

<template>
  <header
    :class="[
      'fixed top-0 right-0 z-40 flex h-20 items-center justify-between bg-slate-950/80 px-8 shadow-2xl shadow-green-900/5 backdrop-blur-xl transition-all duration-300',
      sidebarOpen ? 'w-[calc(100%-16rem)]' : 'w-full',
    ]"
  >
    <div class="flex items-center gap-4">
      <button
        type="button"
        class="pressable inline-flex h-9 w-9 items-center justify-center rounded border border-outline-variant/30 bg-surface-container-low text-slate-300 hover:text-primary-fixed"
        @click="$emit('toggle-sidebar')"
      >
        <span class="material-symbols-outlined text-lg">{{ sidebarOpen ? 'close' : 'menu' }}</span>
      </button>
      <h1 class="text-lg font-black uppercase tracking-widest text-white">STAFF &amp; ROLE CONFIG</h1>
      <span class="rounded border border-green-400/20 bg-green-400/10 px-2 py-0.5 text-[10px] font-bold text-green-400">
        LIVE OPS
      </span>
    </div>
    <div class="flex items-center gap-6">
      <div class="relative">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-500">search</span>
        <input
          type="text"
          placeholder="Search staff members..."
          class="w-64 rounded-lg border-none bg-slate-900 py-2 pl-10 pr-4 text-xs text-white transition-all focus:ring-1 focus:ring-green-400/50"
        />
      </div>
      <div class="flex items-center gap-4">
        <button type="button" class="pressable text-slate-400 transition-opacity hover:text-green-400 active:opacity-80">
          <span class="material-symbols-outlined">notifications</span>
        </button>
        <button type="button" class="pressable text-slate-400 transition-opacity hover:text-green-400 active:opacity-80">
          <span class="material-symbols-outlined">analytics</span>
        </button>
        <div class="h-10 w-10 rounded-full border-2 border-green-400/30 p-0.5">
          <img
            alt="Director Portrait"
            class="h-full w-full rounded-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-BzVYmJKXJdcA-qAHMZ14u0FG5WsdDVe0PNNiMVdD6H1qfiElHEyCs9_mFThkcCc1--9t34meTMf5M3OQyDnS-aski7rib1xPQJRTUQZbPfVzNdD_wOpR0_kGJHFyqYs2clLjswj6DfZcrBbprpt5yhZM7qg77kRdJVho1JL-6cwEKewRKArRO6P_VLdQLfUlD5WWzo4qf0yCOBgeHzd2l8Mx5oQi3xpgxEG-A4ethqK4_8olIpAwVTx_lv5-E21yrUzoFDv3nmM"
          />
        </div>
      </div>
    </div>
  </header>
</template>

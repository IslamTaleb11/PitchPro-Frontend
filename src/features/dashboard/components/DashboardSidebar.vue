<script setup>
defineProps({
  activeItem: {
    type: String,
    default: 'staff-management'
  },
  isOpen: {
    type: Boolean,
    default: true
  }
})

const items = [
  { key: 'staff-management', icon: 'groups', label: 'Staff Management' },
  { key: 'players', icon: 'sports_soccer', label: 'Players' },
  { key: 'finances', icon: 'payments', label: 'Finances' },
  { key: 'categories', icon: 'category', label: 'Categories' },
  { key: 'settings', icon: 'settings', label: 'Settings' }
]
</script>

<template>
  <aside
    :class="[
      'fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-slate-900 py-6 transition-transform duration-300',
      isOpen ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <div class="mb-10 px-6">
      <div class="text-xl font-black tracking-tighter text-green-400">CLUB OPS</div>
      <div class="mt-4 flex items-center gap-3">
        <div class="h-10 w-10 overflow-hidden rounded-lg border border-outline-variant/20 bg-surface-container-high">
          <img
            alt="Club Director Profile"
            class="h-full w-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCu0zvtXwlqz4V0i-1xvN-1ltRo3iZ8kIWKiUkdAkNsx-x7zYf93tWG-CJBPfxdRd8Uxj9aBGNo-PgTbUp9tiRycNBR1GfAneYDAy-NGJLzDn6u9FaFFZ6w4-KYuGvsAKGFT0pttslGukof3X1MQFsxL87-v9FVTDOFd2DFluZwP3QNk2B3WMo_8PVXJu0cuZV33l20J-sMmYMWjNzOHJAqtKU7RJOUaTl33jsyup80ofiLUsB8yb9jURooC2nYf6wONETKdzfWPck"
          />
        </div>
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">TECHNICAL DIRECTOR</div>
          <div class="text-xs font-bold uppercase tracking-tight text-white">Elite Performance Unit</div>
        </div>
      </div>
    </div>

    <nav class="flex-1 space-y-1 px-4">
      <a
        v-for="item in items"
        :key="item.key"
        href="#"
        :class="[
          'pressable flex items-center gap-3 rounded px-4 py-3 text-slate-400 transition-colors',
          item.key === activeItem
            ? 'scale-95 border-l-4 border-green-400 bg-green-400/10 text-green-400'
            : 'hover:bg-slate-800 hover:text-green-300',
        ]"
      >
        <span class="material-symbols-outlined">{{ item.icon }}</span>
        <span class="text-xs font-bold uppercase tracking-wider">{{ item.label }}</span>
      </a>
    </nav>

    <div class="mt-auto px-4">
      <button
        type="button"
        class="pressable flex w-full items-center justify-center gap-2 rounded bg-green-400 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 transition-all hover:bg-green-300"
      >
        MATCH PREP
        <span class="material-symbols-outlined text-sm">bolt</span>
      </button>
    </div>
  </aside>
</template>

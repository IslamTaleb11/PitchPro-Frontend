<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCurrentPlanFromJwt, getPlanFromToken } from '../../../services/axiosConfig'

const { t: $t } = useI18n()

const currentPlan = ref(null)

function updatePlan(evt) {
  if (evt && evt.detail && evt.detail.token) {
    currentPlan.value = getPlanFromToken(evt.detail.token) || getCurrentPlanFromJwt()
    return
  }

  currentPlan.value = getCurrentPlanFromJwt()
}

onMounted(() => {
  updatePlan()
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:tokenChanged', updatePlan)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('auth:tokenChanged', updatePlan)
  }
})

const isPremiumPlan = computed(() => {
  const plan = String(currentPlan.value ?? '').trim().toLowerCase()
  return plan.includes('premium') || plan.includes('pro')
})

defineEmits(['toggle-sidebar'])

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
  { key: 'staff-management', icon: 'groups',         labelKey: 'sidebar.staffManagement', path: '/dashboard/staff-management' },
  { key: 'players',          icon: 'sports_soccer',  labelKey: 'sidebar.players',         path: '/dashboard/players'          },
  { key: 'schedule',  icon: 'calendar_month', labelKey: 'sidebar.schedule',  path: '/dashboard/schedule'  },
  { key: 'finances',         icon: 'payments',       labelKey: 'sidebar.finances',         path: '/dashboard/finances'         },
  { key: 'subscription',     icon: 'upgrade',        labelKey: 'sidebar.subscription',     path: '/dashboard/subscription'     },
  { key: 'categories',       icon: 'category',       labelKey: 'sidebar.categories',       path: '/dashboard/categories'       },
  { key: 'settings',         icon: 'settings',       labelKey: 'sidebar.settings',         path: '/dashboard/settings'         },
]
</script>

<template>
  <aside
    :class="[
      'fixed inset-y-0 ltr:left-0 rtl:right-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-slate-900 py-6 transition-transform duration-300 lg:relative lg:inset-auto lg:translate-x-0',
      isOpen ? 'translate-x-0 lg:translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full lg:translate-x-0',
    ]"
  >
    <div class="mb-10 flex items-start justify-between px-6">
      <div class="text-xl font-black tracking-tighter text-green-400">{{ $t('sidebar.clubOps') }}</div>
      <button
        type="button"
        class="pressable inline-flex h-9 w-9 items-center justify-center rounded border border-white/10 bg-slate-800 text-slate-300 lg:hidden"
        @click="$emit('toggle-sidebar')"
      >
        <span class="material-symbols-outlined text-lg">close</span>
      </button>
    </div>

    <div class="mb-10 px-6 lg:pt-0">
      <div class="mt-4 flex items-center gap-3">
        <div class="h-10 w-10 overflow-hidden rounded-lg border border-outline-variant/20 bg-surface-container-high">
          <img
            alt="Club Director Profile"
            class="h-full w-full object-cover"
            src="/assets/director-avatar.svg"
          />
        </div>
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ $t('sidebar.technicalDirector') }}</div>
          <div class="text-xs font-bold uppercase tracking-tight text-white">{{ $t('sidebar.elitePerformanceUnit') }}</div>
        </div>
      </div>
    </div>

    <nav class="flex-1 space-y-1 px-4">
      <router-link
        v-for="item in items"
        :key="item.key"
        :to="item.path"
        :class="[
          'pressable flex items-center gap-3 rounded px-4 py-3 text-slate-400 transition-colors',
          item.key === activeItem
            ? 'scale-95 border-s-4 border-green-400 bg-green-400/10 text-green-400'
            : 'hover:bg-slate-800 hover:text-green-300',
        ]"
      >
        <span class="material-symbols-outlined">{{ item.icon }}</span>
        <span class="text-xs font-bold uppercase tracking-wider">{{ $t(item.labelKey) }}</span>
      </router-link>
    </nav>

    <div v-if="!isPremiumPlan" class="mt-auto px-4 space-y-3">
      <router-link
        to="/dashboard/subscription"
        class="pressable flex w-full items-center justify-center gap-2 rounded bg-green-500 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-950 transition-all hover:bg-green-400"
      >
        {{ $t('topbar.upgradeNow') }}
        <span class="material-symbols-outlined text-sm">bolt</span>
      </router-link>
    </div>
  </aside>
</template>

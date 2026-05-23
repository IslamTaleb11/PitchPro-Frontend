<script setup>
import { useI18n } from 'vue-i18n'
const { t: $t } = useI18n()
</script>

<template>
  <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
    <div class="rounded-xl border border-white/5 bg-surface-container-low p-6">
      <h4 class="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-white">{{ $t('staffManagement.tacticalCoverage') }}</h4>
      <div class="flex flex-wrap gap-2">
        <span class="rounded-sm border-l-2 border-green-400 bg-surface-container-lowest px-3 py-1.5 text-[10px] font-bold text-slate-300">U-8 (2)</span>
        <span class="rounded-sm border-l-2 border-green-400 bg-surface-container-lowest px-3 py-1.5 text-[10px] font-bold text-slate-300">U-10 (2)</span>
        <span class="rounded-sm border-l-2 border-green-400 bg-surface-container-lowest px-3 py-1.5 text-[10px] font-bold text-slate-300">U-12 (3)</span>
        <span class="rounded-sm border-l-2 border-red-500 bg-surface-container-lowest px-3 py-1.5 text-[10px] font-bold text-slate-300">U-14 (1)</span>
        <span class="rounded-sm border-l-2 border-green-400 bg-surface-container-lowest px-3 py-1.5 text-[10px] font-bold text-slate-300">U-16 (2)</span>
        <span class="rounded-sm border-l-2 border-green-400 bg-surface-container-lowest px-3 py-1.5 text-[10px] font-bold text-slate-300">SENIOR A (4)</span>
      </div>
      <p class="mt-4 text-[10px] uppercase text-slate-500">{{ $t('staffManagement.criticalShortage') }}</p>
    </div>
    <div class="rounded-xl border border-white/5 bg-surface-container-low p-6">
      <h4 class="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-white">{{ $t('staffManagement.logHistory') }}</h4>
      <div class="space-y-3">
        <div class="flex items-center justify-between text-[10px]"><span class="text-slate-400">{{ $t('staffManagement.staffAdded') }}</span><span class="text-green-400/70">2{{ $t('staffManagement.hAgo') }}</span></div>
        <div class="flex items-center justify-between text-[10px]"><span class="text-slate-400">{{ $t('staffManagement.roleModified') }}</span><span class="text-green-400/70">5{{ $t('staffManagement.hAgo') }}</span></div>
        <div class="flex items-center justify-between text-[10px]"><span class="text-slate-400">{{ $t('staffManagement.securityAudit') }}</span><span class="text-green-400/70">1{{ $t('staffManagement.dAgo') }}</span></div>
      </div>
    </div>
  </div>
</template>

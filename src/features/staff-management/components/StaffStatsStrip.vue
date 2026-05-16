<script setup>
import { ref, onMounted } from 'vue'
import { staffService } from '../../../services/staffService'

const counts = ref({
  totalActiveStaff: 0,
  totalCoachingStaff: 0,
  totalMedicalStaff: 0,
  totalFitnessStaff: 0
})

onMounted(async () => {
  try {
    const response = await staffService.getStaffCounts()
    // Depending on axios/API wrapper config, the response might be nested under data or data.data
    const data = response.data?.data || response.data || response;
    if (data && typeof data.totalActiveStaff !== 'undefined') {
      counts.value = data
    }
  } catch (error) {
    console.error('Failed to load staff counts', error?.response?.data || error)
  }
})

const pad = (num) => (num < 10 ? '0' + num : num)
</script>

<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-xl border-l-4 border-green-400 bg-surface-container-low p-6">
      <div class="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Personnel</div>
      <div class="font-headline text-3xl font-black text-white">{{ pad(counts.totalActiveStaff) }}</div>
    </div>
    <div class="rounded-xl border-l-4 border-blue-400 bg-surface-container-low p-6">
      <div class="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Coaching Staff</div>
      <div class="font-headline text-3xl font-black text-white">{{ pad(counts.totalCoachingStaff) }}</div>
    </div>
    <div class="rounded-xl border-l-4 border-orange-400 bg-surface-container-low p-6">
      <div class="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Medical/Physio</div>
      <div class="font-headline text-3xl font-black text-white">{{ pad(counts.totalMedicalStaff) }}</div>
    </div>
    <div class="rounded-xl border-l-4 border-slate-700 bg-surface-container-low p-6">
      <div class="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Fitness Staff</div>
      <div class="font-headline text-3xl font-black text-white">{{ pad(counts.totalFitnessStaff) }}</div>
    </div>
  </div>
</template>

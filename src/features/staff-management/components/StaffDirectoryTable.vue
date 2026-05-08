<template>
  <div class="overflow-hidden rounded-xl bg-surface-container-low">
    <div class="flex items-center justify-between bg-surface-container-high/50 p-6">
      <h3 class="text-sm font-black uppercase tracking-wider text-white">Staff Directory</h3>
      <div class="flex items-center gap-3">
        <button type="button" class="pressable flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white">
          <span class="material-symbols-outlined text-sm">filter_list</span> FILTER
        </button>
        <button type="button" class="pressable flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white">
          <span class="material-symbols-outlined text-sm">download</span> EXPORT
        </button>
      </div>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead class="bg-surface-container-low">
          <tr class="border-b border-white/5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
            <th class="px-6 py-4">MEMBER</th><th class="px-6 py-4">STRATEGIC ROLE</th><th class="px-6 py-4">ASSIGNED UNITS</th><th class="px-6 py-4">STATUS</th><th class="px-6 py-4 text-right">ACTION</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <tr class="group transition-colors hover:bg-surface-container-high">
            <td class="px-6 py-5"><div class="flex items-center gap-4"><div class="h-10 w-10 overflow-hidden rounded-lg bg-surface-container-lowest"><img class="h-full w-full object-cover" alt="Roberto Mancini" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrKMqAo2Dsiw9GChSYZskA-oRuK3KK1vGjWH6-1o0xKeqvjiLVdVOxIR08bkITD0or8UAPDIjZkQhOgqj7t2Ckx37pI0Qzog34rAuwDlCkxKIKOR08pQZp1C0-jJ5IZSEUUYfHgo16TB_7iVIiFO3tuJnQ22aUbvsfFekGD3DWHcloOnWLMb_b7lMvo6YkmNqRytFqseKhq_8Trwf1u4kGW3Rd1c5g_1ycv8sjSy6ZI-d_pzNqIG3O4wNmvxyJIDXTRHL6P4mo7fE" /></div><div><div class="text-sm font-bold text-white">Roberto Mancini</div><div class="text-[10px] text-slate-500">r.mancini@pitchpro.club</div></div></div></td>
            <td class="px-6 py-5"><div class="flex flex-col"><span class="text-xs font-black uppercase tracking-tighter text-green-400">HEAD COACH</span><span class="text-[10px] italic text-slate-500">Technical Systems</span></div></td>
            <td class="px-6 py-5"><div class="flex gap-1"><span class="rounded bg-surface-container-lowest px-2 py-0.5 text-[10px] font-bold text-slate-300">Senior A</span><span class="rounded bg-surface-container-lowest px-2 py-0.5 text-[10px] font-bold text-slate-300">Senior B</span></div></td>
            <td class="px-6 py-5"><span class="inline-flex items-center gap-1.5 rounded-full bg-green-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400"><span class="h-1.5 w-1.5 rounded-full bg-green-400" />Active</span></td>
            <td class="px-6 py-5 text-right"><button type="button" class="pressable p-2 text-slate-500 transition-colors hover:text-white"><span class="material-symbols-outlined text-lg">more_vert</span></button></td>
          </tr>
          <tr class="group transition-colors hover:bg-surface-container-high">
            <td class="px-6 py-5"><div class="flex items-center gap-4"><div class="h-10 w-10 overflow-hidden rounded-lg bg-surface-container-lowest"><img class="h-full w-full object-cover" alt="Elena Logan" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpGA2tmD_4xWMnFir1LTWIhbN2u7x_NNtAf8OEoqiCCh7G-6Q6l0YXGSuhbQM4OP37eyEcaTJ1cQAoiabol_Q-A_s8XAtFuNgRcY5tJFuxEjVNXJHDUZktAUdqrIKyg_kggGF85omhK_yFBLhwV4AavYc0feWuElZEfsg-mDTwLTSU-A8bO8EFz5i2Cljz4BkUwVzgDnWAnBaeL7JDWiQAjn8qPu818WQbAUpJtzRjJ35Z7IzRnz9IvVQ2Tu-0wevEygV3HyturVA" /></div><div><div class="text-sm font-bold text-white">Elena Logan</div><div class="text-[10px] text-slate-500">e.logan@pitchpro.club</div></div></div></td>
            <td class="px-6 py-5"><div class="flex flex-col"><span class="text-xs font-black uppercase tracking-tighter text-blue-400">PHYSIO</span><span class="text-[10px] italic text-slate-500">Medical Unit</span></div></td>
            <td class="px-6 py-5"><div class="flex gap-1"><span class="rounded bg-surface-container-lowest px-2 py-0.5 text-[10px] font-bold text-slate-300">All Units</span></div></td>
            <td class="px-6 py-5"><span class="inline-flex items-center gap-1.5 rounded-full bg-green-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400"><span class="h-1.5 w-1.5 rounded-full bg-green-400" />Active</span></td>
            <td class="px-6 py-5 text-right"><button type="button" class="pressable p-2 text-slate-500 transition-colors hover:text-white"><span class="material-symbols-outlined text-lg">more_vert</span></button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex items-center justify-between border-t border-white/5 p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      <span>SHOWING 4 OF 24 PERSONNEL</span>
      <div class="flex gap-2">
        <button type="button" class="pressable rounded bg-surface-container-lowest px-3 py-1 transition-colors hover:bg-surface-container-high">PREV</button>
        <button type="button" class="pressable rounded bg-surface-container-lowest px-3 py-1 transition-colors hover:bg-surface-container-high">NEXT</button>
      </div>
    </div>
  </div>
</template>

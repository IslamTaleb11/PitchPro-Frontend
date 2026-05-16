<script setup>
import { ref, onMounted, computed } from 'vue'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { categoryService } from '../services/categoryService'
import { useUiToast } from '../composables/useUiToast'

const { showToast } = useUiToast()
const isSidebarOpen = ref(true)

// Category form state
const categoryName = ref('')
const ageMin = ref(6)
const ageMax = ref(18)
const capacity = ref('')
const registrationFee = ref('')

// Category list state
const categories = ref([])
const isLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize.value)))

async function fetchCategories() {
  try {
    isLoading.value = true
    const response = await categoryService.getAllCategories(currentPage.value, pageSize.value)
    if (response.data && response.data.data) {
      categories.value = response.data.data
    } else {
      categories.value = []
    }
    if (response.data && typeof response.data.totalCount === 'number') {
      totalCount.value = response.data.totalCount
    } else {
      totalCount.value = categories.value.length
    }
  } catch (error) {
    const message = error?.response?.data?.message || 'Failed to fetch categories.'
    showToast({ title: 'Error', message, mode: 'error' })
  } finally {
    isLoading.value = false
  }
}

async function submitCategory() {
  if (!categoryName.value.trim()) {
    showToast({ title: 'Missing fields', message: 'Please enter a category name.', mode: 'error', duration: 4000 })
    return
  }
  if (!capacity.value) {
    showToast({ title: 'Missing fields', message: 'Please enter a capacity.', mode: 'error', duration: 4000 })
    return
  }
  try {
    showToast({ title: 'Creating Category...', message: 'Please wait.', mode: 'info', duration: 4000 })
    const payload = {
      name: categoryName.value,
      ageMin: ageMin.value,
      ageMax: ageMax.value,
      capacity: Number(capacity.value),
      registrationFee: registrationFee.value ? Number(registrationFee.value) : 0
    }
    const response = await categoryService.createCategory(payload)
    showToast({ title: 'Category Created', message: response.data?.message || 'Category created successfully.', mode: 'success', duration: 3000 })
    categoryName.value = ''
    capacity.value = ''
    registrationFee.value = ''
    ageMin.value = 6
    ageMax.value = 18
    fetchCategories()
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || 'Failed to create category.'
    showToast({ title: 'Error', message, mode: 'error', duration: 4000 })
  }
}

async function deleteCategory(id) {
  try {
    await categoryService.deleteCategory(id)
    showToast({ title: 'Category Deleted', message: 'Category was removed successfully.', mode: 'success', duration: 2000 })
    fetchCategories()
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || 'Failed to delete category.'
    showToast({ title: 'Error', message, mode: 'error', duration: 4000 })
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchCategories()
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchCategories()
  }
}

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <div class="min-h-screen bg-background text-on-background">
    <DashboardSidebar active-item="categories" :is-open="isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      :class="[
        'pt-20 h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300',
        isSidebarOpen ? 'ml-64' : 'ml-0',
      ]"
    >
      <!-- Header Section -->
      <header class="mb-10 flex items-end justify-between">
        <div>
          <h1 class="font-headline text-4xl font-extrabold uppercase tracking-tighter text-white">
            SQUAD <span class="text-green-400">CATEGORIES</span>
          </h1>
          <div class="mt-2 flex items-center gap-2">
            <div class="h-1 w-12 bg-green-400"></div>
            <span class="font-headline text-xs font-bold uppercase tracking-widest text-slate-500">
              {{ totalCount }} Active Classification{{ totalCount !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>
        <div class="hidden lg:block">
          <div class="text-right">
            <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Club Capacity</span>
            <div class="font-headline text-2xl font-bold text-white">
              84% <span class="text-sm tracking-normal text-green-400">Optimal</span>
            </div>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <!-- Category Entry Panel -->
        <section class="space-y-6 lg:col-span-4">
          <div class="relative overflow-hidden rounded bg-surface-container-low p-6 shadow-2xl">
            <div class="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary-container/5 blur-[60px]"></div>
            <div class="mb-6 flex items-center gap-2">
              <span class="material-symbols-outlined text-lg text-green-400">add_box</span>
              <h2 class="font-headline text-sm font-bold uppercase tracking-widest text-white">Create New Category</h2>
            </div>
            <form class="space-y-6" @submit.prevent="submitCategory">
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Category Name</label>
                <input
                  v-model="categoryName"
                  type="text"
                  placeholder="e.g., U-16 Elite"
                  class="w-full rounded border-none bg-surface-container-lowest p-3 text-sm text-white focus:ring-1 focus:ring-green-400/50"
                />
              </div>

              <div class="space-y-4">
                <div class="flex items-end justify-between">
                  <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Age Range</label>
                  <span class="text-[10px] font-bold uppercase text-green-400">{{ ageMin }} — {{ ageMax }} yrs</span>
                </div>
                <div class="grid grid-cols-2 gap-4 px-2 pt-2">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500">Min</label>
                    <input
                      v-model.number="ageMin"
                      type="number"
                      min="4"
                      max="25"
                      class="w-full rounded border-none bg-surface-container-lowest p-2 text-sm text-white focus:ring-1 focus:ring-green-400/50"
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-500">Max</label>
                    <input
                      v-model.number="ageMax"
                      type="number"
                      min="4"
                      max="25"
                      class="w-full rounded border-none bg-surface-container-lowest p-2 text-sm text-white focus:ring-1 focus:ring-green-400/50"
                    />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Capacity</label>
                  <input
                    v-model="capacity"
                    type="number"
                    placeholder="25"
                    class="w-full rounded border-none bg-surface-container-lowest p-3 text-sm text-white focus:ring-1 focus:ring-green-400/50"
                  />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Currency</label>
                  <div class="flex h-[46px] items-center justify-center rounded bg-surface-container-high p-3 text-xs font-bold text-slate-400">
                    DZD
                  </div>
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Registration Fee</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-400">د.ج</span>
                  <input
                    v-model="registrationFee"
                    type="number"
                    placeholder="45,000"
                    class="w-full rounded border-none bg-surface-container-lowest p-3 pl-10 text-sm text-white focus:ring-1 focus:ring-green-400/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                class="pressable mt-2 flex w-full items-center justify-center gap-2 rounded bg-gradient-to-br from-primary to-primary-container py-4 font-headline text-xs font-black uppercase tracking-[0.2em] text-on-primary-fixed shadow-lg shadow-green-900/20 transition-transform active:scale-[0.98]"
              >
                INITIALIZE CATEGORY
              </button>
            </form>
          </div>

          <div class="rounded border-l-2 border-green-400/30 bg-surface-container-high p-6">
            <div class="mb-2 text-[10px] font-bold uppercase tracking-widest text-green-400">Tactical Note</div>
            <p class="text-xs font-medium leading-relaxed text-slate-400">
              Defining player capacity prevents squad oversaturation and maintains the high coach-to-athlete ratio required for elite performance tracking.
            </p>
          </div>
        </section>

        <!-- Category Ledger -->
        <section class="lg:col-span-8">
          <div class="overflow-hidden rounded-xl border border-white/5 bg-surface-container-lowest">
            <div class="flex items-center justify-between bg-surface-container-low p-6">
              <h2 class="font-headline flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
                <span class="material-symbols-outlined text-green-400">list_alt</span>
                Category Ledger
              </h2>
              <div class="flex gap-2">
                <button type="button" class="pressable rounded p-2 text-slate-400 transition-colors hover:text-white hover:bg-surface-container-highest">
                  <span class="material-symbols-outlined text-sm">filter_list</span>
                </button>
                <button type="button" class="pressable rounded p-2 text-slate-400 transition-colors hover:text-white hover:bg-surface-container-highest">
                  <span class="material-symbols-outlined text-sm">download</span>
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-left">
                <thead>
                  <tr class="border-b border-white/5">
                    <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Category Name</th>
                    <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Range</th>
                    <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Capacity</th>
                    <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Fee (DZD)</th>
                    <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Staff</th>
                    <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Status</th>
                    <th class="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  <tr v-if="isLoading">
                    <td colspan="7" class="px-6 py-8 text-center text-sm text-slate-400">Loading categories...</td>
                  </tr>
                  <tr v-else-if="categories.length === 0">
                    <td colspan="7" class="px-6 py-8 text-center text-sm text-slate-400">No categories found.</td>
                  </tr>
                  <tr
                    v-for="cat in categories"
                    :key="cat.id"
                    class="group transition-colors hover:bg-surface-container-high/40"
                  >
                    <td class="px-6 py-5">
                      <div class="flex items-center gap-3">
                        <div class="flex h-8 w-8 items-center justify-center rounded-sm bg-green-400/10 font-headline text-xs font-bold text-green-400">
                          {{ cat.name?.substring(0, 3).toUpperCase() || 'CAT' }}
                        </div>
                        <span class="font-headline text-sm font-bold text-white">{{ cat.name }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-5 font-headline text-xs font-bold text-slate-400">
                      {{ cat.ageMin ?? cat.ageRange?.split('-')[0] ?? '—' }} — {{ cat.ageMax ?? cat.ageRange?.split('-')[1] ?? '—' }}
                    </td>
                    <td class="px-6 py-5">
                      <span class="font-headline text-sm font-bold text-white">{{ cat.capacity ?? '—' }}</span>
                      <span class="block text-[8px] font-bold uppercase tracking-widest text-slate-600">Players</span>
                    </td>
                    <td class="px-6 py-5">
                      <span class="font-headline text-sm font-bold text-white">{{ cat.registrationFee?.toLocaleString() ?? '0.00' }}</span>
                      <span class="block text-[8px] font-bold uppercase tracking-widest text-slate-600">Quarterly</span>
                    </td>
                    <td class="px-6 py-5">
                      <div class="flex -space-x-2">
                        <div class="flex h-6 w-6 items-center justify-center rounded-full border border-surface-container-lowest bg-surface-container-highest text-[8px] font-bold text-slate-400">
                          +{{ cat.staffCount ?? 0 }}
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-5">
                      <span class="rounded-full bg-green-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-green-400">
                        Active
                      </span>
                    </td>
                    <td class="px-6 py-5 text-right">
                      <div class="flex justify-end gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <button type="button" class="pressable p-1.5 text-slate-500 transition-colors hover:text-green-400">
                          <span class="material-symbols-outlined text-lg">edit_square</span>
                        </button>
                        <button type="button" class="pressable p-1.5 text-slate-500 transition-colors hover:text-red-400" @click="deleteCategory(cat.id)">
                          <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="flex items-center justify-between border-t border-white/5 bg-surface-container-low p-4">
              <div class="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Displaying {{ categories.length }} of {{ totalCount }} Entries
              </div>
              <div class="flex gap-1">
                <button
                  type="button"
                  :disabled="currentPage === 1"
                  @click="prevPage"
                  class="pressable flex h-8 w-8 items-center justify-center rounded bg-surface-container-highest text-slate-400 transition-all hover:bg-green-400 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded bg-green-400 text-xs font-bold text-slate-900"
                >
                  {{ currentPage }}
                </button>
                <button
                  v-if="totalPages > 1"
                  type="button"
                  :disabled="currentPage >= totalPages"
                  @click="nextPage"
                  class="pressable flex h-8 w-8 items-center justify-center rounded bg-surface-container-highest text-xs font-bold text-slate-400 transition-all hover:bg-green-400 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ currentPage + 1 }}
                </button>
                <button
                  type="button"
                  :disabled="currentPage >= totalPages"
                  @click="nextPage"
                  class="pressable flex h-8 w-8 items-center justify-center rounded bg-surface-container-highest text-slate-400 transition-all hover:bg-green-400 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

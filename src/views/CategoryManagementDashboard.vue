<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { categoryService } from '../services/categoryService'
import { useUiToast } from '../composables/useUiToast'
import Slider from '@vueform/slider'

const { showToast } = useUiToast()
const { t: $t } = useI18n()
const isSidebarOpen = ref(true)

// Category form state
const categoryName = ref('')
const ageRange = ref([6, 18])
const capacity = ref('')
const registrationFee = ref('')

// Sync individual min/max for the form submission
const ageMin = computed(() => ageRange.value[0])
const ageMax = computed(() => ageRange.value[1])

// Category list state
const categories = ref([])
const isLoading = ref(false)
const isRefreshing = ref(false)
const currentPage = ref(1)
const pageSize = ref(5)
const totalCount = ref(0)
const pageSizeOptions = [5, 10, 25, 50]

// Filter state
const showFilterModal = ref(false)
const isFilterMode = ref(false)
const filterAgeRange = ref([4, 25])
const filterCapacity = ref(null)
const filterFeeRange = ref([0, 100000])
const filterPlayersRange = ref([0, 100])

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize.value)))
const startIndex = computed(() => totalCount.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1)
const endIndex = computed(() => Math.min(currentPage.value * pageSize.value, totalCount.value))

const showingText = computed(() => {
  if (totalCount.value === 0) return `${$t('common.showing')} 0 ${$t('common.of')} 0 ${$t('common.entries')}`
  return `${$t('common.showing')} ${startIndex.value}-${endIndex.value} ${$t('common.of')} ${totalCount.value} ${$t('common.entries')}`
})

// Safely extract a field from a category object supporting multiple naming conventions
function getField(obj, ...keys) {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key]
  }
  return undefined
}

async function fetchCategories(options = {}) {
  try {
    isLoading.value = true
    let response
    if (isFilterMode.value) {
      response = await categoryService.getCategoriesByFilter({
        pageNumber: currentPage.value,
        pageSize: pageSize.value,
        minAge: filterAgeRange.value[0],
        maxAge: filterAgeRange.value[1],
        capacity: filterCapacity.value,
        registrationFeeMin: filterFeeRange.value[0],
        registrationFeeMax: filterFeeRange.value[1],
        minPlayers: filterPlayersRange.value[0],
        maxPlayers: filterPlayersRange.value[1]
      })
    } else {
      response = await categoryService.getAllCategories(currentPage.value, pageSize.value)
    }

    if (response.data && response.data.data) {
      categories.value = response.data.data
    } else {
      categories.value = []
    }
    if (response.data && typeof response.data.totalCount === 'number') {
      totalCount.value = response.data.totalCount
    } else {
      totalCount.value = categories.value.length >= pageSize.value ? categories.value.length + 1 : categories.value.length
    }

    // If current page is empty and not page 1, go back one page
    if (categories.value.length === 0 && currentPage.value > 1 && options.fallbackOnEmpty) {
      currentPage.value--
      await fetchCategories(options)
      return
    }
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || $t('categoryManagement.fetchFailed')
    showToast({ title: $t('common.error'), message, mode: 'error' })
    categories.value = []
    totalCount.value = 0
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchCategories()
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchCategories()
  }
}

function handlePageSizeChange(newSize) {
  pageSize.value = newSize
  currentPage.value = 1
  fetchCategories()
}

function refreshCategories() {
  isRefreshing.value = true
  currentPage.value = 1
  fetchCategories()
}

function toggleFilterModal() {
  showFilterModal.value = !showFilterModal.value
}

function resetFilters() {
  filterAgeRange.value = [4, 25]
  filterCapacity.value = null
  filterFeeRange.value = [0, 100000]
  filterPlayersRange.value = [0, 100]
  isFilterMode.value = false
  currentPage.value = 1
  fetchCategories()
}

function applyFilters() {
  showFilterModal.value = false
  isFilterMode.value = true
  currentPage.value = 1
  fetchCategories()
}

async function submitCategory() {
  if (!categoryName.value.trim()) {
    showToast({ title: $t('common.missingFields'), message: $t('common.pleaseFill') + ': ' + $t('categoryManagement.categoryName'), mode: 'error', duration: 4000 })
    return
  }
  if (!capacity.value) {
    showToast({ title: $t('common.missingFields'), message: $t('common.pleaseFill') + ': ' + $t('categoryManagement.capacity'), mode: 'error', duration: 4000 })
    return
  }
  try {
    showToast({ title: $t('categoryManagement.creatingCategory'), message: $t('common.pleaseWait'), mode: 'loading', duration: 0 })
    const payload = {
      name: categoryName.value,
      ageMin: ageMin.value,
      ageMax: ageMax.value,
      capacity: Number(capacity.value),
      registrationFee: registrationFee.value ? Number(registrationFee.value) : 0
    }
    const response = await categoryService.createCategory(payload)
    showToast({ title: $t('categoryManagement.categoryCreated'), message: response.data?.message || $t('categoryManagement.categoryCreatedMsg'), mode: 'success', duration: 3000 })
    categoryName.value = ''
    capacity.value = ''
    registrationFee.value = ''
    ageRange.value = [6, 18]
    fetchCategories()
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || $t('categoryManagement.createFailed')
    showToast({ title: $t('common.error'), message, mode: 'error', duration: 4000 })
  }
}

// Action menu state
const openMenuId = ref(null)
const menuPosition = ref({ top: 0, left: 0 })

function toggleMenu(id, event) {
  if (openMenuId.value === id) {
    openMenuId.value = null
    return
  }
  openMenuId.value = id
  const btn = event.currentTarget
  const rect = btn.getBoundingClientRect()
  menuPosition.value = {
    top: rect.bottom + 4,
    left: rect.right - 144
  }
}

function closeMenu() {
  openMenuId.value = null
}

// Edit modal state
const showEditModal = ref(false)
const isEditing = ref(false)
const editForm = ref({
  id: null,
  name: '',
  ageMin: 4,
  ageMax: 18,
  capacity: '',
  registrationFee: ''
})

const editAgeRange = computed({
  get: () => [editForm.value.ageMin, editForm.value.ageMax],
  set: (val) => {
    editForm.value.ageMin = val[0]
    editForm.value.ageMax = val[1]
  }
})

function openEditModal(cat) {
  editForm.value = {
    id: getField(cat, 'id', 'categoryId', '_id'),
    name: getField(cat, 'name', 'categoryName', 'title') ?? '',
    ageMin: getField(cat, 'ageMin', 'minAge', 'ageFrom') ?? 4,
    ageMax: getField(cat, 'ageMax', 'maxAge', 'ageTo') ?? 18,
    capacity: getField(cat, 'capacity', 'maxCapacity', 'maxPlayers') ?? '',
    registrationFee: getField(cat, 'registrationFee', 'fee', 'price') ?? ''
  }
  showEditModal.value = true
  closeMenu()
}

async function submitEdit() {
  if (!editForm.value.name.trim()) {
    showToast({ title: $t('common.missingFields'), message: $t('categoryManagement.categoryNameRequired'), mode: 'error', duration: 4000 })
    return
  }
  if (!editForm.value.capacity) {
    showToast({ title: $t('common.missingFields'), message: $t('categoryManagement.capacityRequired'), mode: 'error', duration: 4000 })
    return
  }
  try {
    isEditing.value = true
    showToast({ title: $t('categoryManagement.updatingCategory'), message: $t('categoryManagement.savingChanges'), mode: 'loading', duration: 0 })
    const payload = {
      name: editForm.value.name,
      ageMin: editForm.value.ageMin,
      ageMax: editForm.value.ageMax,
      capacity: Number(editForm.value.capacity),
      registrationFee: editForm.value.registrationFee ? Number(editForm.value.registrationFee) : 0
    }
    const response = await categoryService.updateCategory(editForm.value.id, payload)
    showToast({ title: $t('categoryManagement.categoryUpdated'), message: response.data?.message || $t('categoryManagement.changesSaved'), mode: 'success', duration: 3000 })
    showEditModal.value = false
    fetchCategories()
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || $t('categoryManagement.updateFailedMessage')
    showToast({ title: $t('categoryManagement.updateFailed'), message, mode: 'error', duration: 4000 })
  } finally {
    isEditing.value = false
  }
}

// Delete modal state
const showDeleteModal = ref(false)
const isDeleting = ref(false)
const deleteTarget = ref(null)

function openDeleteModal(cat) {
  deleteTarget.value = cat
  showDeleteModal.value = true
  closeMenu()
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const id = getField(deleteTarget.value, 'id', 'categoryId', '_id')
  try {
    isDeleting.value = true
    showToast({ title: $t('categoryManagement.deletingCategory'), message: $t('common.pleaseWait'), mode: 'loading', duration: 0 })
    await categoryService.deleteCategory(id)
    showToast({ title: $t('categoryManagement.categoryDeleted'), message: $t('categoryManagement.categoryDeletedMsg'), mode: 'success', duration: 2000 })
    showDeleteModal.value = false
    deleteTarget.value = null
    fetchCategories({ fallbackOnEmpty: true })
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || $t('categoryManagement.deleteFailedMessage')
    showToast({ title: $t('common.error'), message, mode: 'error', duration: 4000 })
  } finally {
    isDeleting.value = false
  }
}

function cancelDelete() {
  showDeleteModal.value = false
  deleteTarget.value = null
}

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <div class="min-h-screen bg-background text-on-background lg:flex lg:items-stretch">
    <DashboardSidebar active-item="categories" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main
      :class="[
        'pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300 lg:flex-1',
        'ml-0',
      ]"
    >
      <!-- Header Section -->
      <header class="mb-10 flex items-end justify-between">
        <div>
          <h1 class="font-headline text-4xl font-extrabold uppercase tracking-tighter text-white">
            {{ $t('categoryManagement.squad') }} <span class="text-green-400">{{ $t('categoryManagement.categoriesHeader') }}</span>
          </h1>
          <div class="mt-2 flex items-center gap-2">
            <div class="h-1 w-12 bg-green-400"></div>
            <span class="font-headline text-xs font-bold uppercase tracking-widest text-slate-500">
              {{ totalCount }} {{ $t('categoryManagement.activeClassifications') }}{{ totalCount !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>
        <div class="hidden lg:block">
          <div class="text-right">
            <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">{{ $t('categoryManagement.clubCapacity') }}</span>
            <div class="font-headline text-2xl font-bold text-white">
              84% <span class="text-sm tracking-normal text-green-400">{{ $t('categoryManagement.optimal') }}</span>
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
              <h2 class="font-headline text-sm font-bold uppercase tracking-widest text-white">{{ $t('categoryManagement.createNewCategory') }}</h2>
            </div>
            <form class="space-y-6" @submit.prevent="submitCategory">
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ $t('categoryManagement.categoryName') }}</label>
                <input
                  v-model="categoryName"
                  type="text"
                  placeholder="e.g., U-16 Elite"
                  class="w-full rounded border-none bg-surface-container-lowest p-3 text-sm text-white focus:ring-1 focus:ring-green-400/50"
                />
              </div>

              <div class="space-y-4">
                <div class="flex items-end justify-between">
                  <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ $t('categoryManagement.ageRange') }}</label>
                  <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center rounded bg-green-400/10 px-2 py-0.5 font-headline text-xs font-bold text-green-400">{{ ageMin }}</span>
                    <span class="text-[10px] font-bold text-slate-600">—</span>
                    <span class="inline-flex items-center justify-center rounded bg-green-400/10 px-2 py-0.5 font-headline text-xs font-bold text-green-400">{{ ageMax }}</span>
                    <span class="text-[10px] font-bold uppercase text-slate-500">{{ $t('categoryManagement.yrs') }}</span>
                  </div>
                </div>
                <div class="age-slider-wrapper px-2 pt-4 pb-2">
                  <Slider
                    v-model="ageRange"
                    :min="4"
                    :max="25"
                    :step="1"
                    :tooltips="false"
                    :merge="-1"
                    :lazy="false"
                  />
                </div>
                <div class="flex items-center justify-between px-2">
                  <span class="text-[9px] font-bold text-slate-600">4</span>
                  <span class="text-[9px] font-bold text-slate-600">25</span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ $t('categoryManagement.capacity') }}</label>
                  <input
                    v-model="capacity"
                    type="number"
                    placeholder="25"
                    class="w-full rounded border-none bg-surface-container-lowest p-3 text-sm text-white focus:ring-1 focus:ring-green-400/50"
                  />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ $t('categoryManagement.currency') }}</label>
                  <div class="flex h-[46px] items-center justify-center rounded bg-surface-container-high p-3 text-xs font-bold text-slate-400">
                    DZD
                  </div>
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ $t('categoryManagement.registrationFee') }}</label>
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
                {{ $t('categoryManagement.initializeCategory') }}
              </button>
            </form>
          </div>

          <div class="rounded border-l-2 border-green-400/30 bg-surface-container-high p-6">
            <div class="mb-2 text-[10px] font-bold uppercase tracking-widest text-green-400">{{ $t('categoryManagement.tacticalNote') }}</div>
            <p class="text-xs font-medium leading-relaxed text-slate-400">
              {{ $t('categoryManagement.tacticalNoteText') }}
            </p>
          </div>
        </section>

        <!-- Category Ledger -->
        <section class="lg:col-span-8">
          <div class="overflow-hidden rounded-xl border border-white/5 bg-surface-container-lowest">
            <div class="flex items-center justify-between bg-surface-container-low p-6">
              <h2 class="font-headline flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
                <span class="material-symbols-outlined text-green-400">list_alt</span>
                {{ $t('categoryManagement.categoryLedger') }}
              </h2>
              <div class="flex gap-2">
                <button
                  type="button"
                  title="Refresh"
                  :disabled="isLoading"
                  class="pressable rounded p-2 text-slate-400 transition-colors hover:text-green-400 hover:bg-surface-container-highest disabled:opacity-50"
                  @click="refreshCategories"
                >
                  <span class="material-symbols-outlined text-sm" :class="{ 'animate-spin': isRefreshing }">refresh</span>
                </button>
                <button type="button" class="pressable rounded p-2 transition-colors hover:bg-surface-container-highest" :class="isFilterMode ? 'text-green-400' : 'text-slate-400 hover:text-white'" @click="toggleFilterModal">
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
                    <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{{ $t('categoryManagement.category') }}</th>
                    <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{{ $t('categoryManagement.ageRange') }}</th>
                    <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{{ $t('categoryManagement.capacity') }}</th>
                    <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{{ $t('categoryManagement.registrationFee') }}</th>
                    <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{{ $t('categoryManagement.playersCol') }}</th>
                    <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{{ $t('common.status') }}</th>
                    <th class="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{{ $t('common.actions') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  <tr v-if="isLoading && !isRefreshing">
                    <td colspan="7" class="px-6 py-16 text-center">
                      <div class="flex flex-col items-center gap-3">
                        <span class="material-symbols-outlined animate-spin text-2xl text-green-400">progress_activity</span>
                        <span class="text-sm text-slate-500">{{ $t('categoryManagement.loadingCategories') }}</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="categories.length === 0">
                    <td colspan="7" class="px-6 py-16 text-center">
                      <div class="flex flex-col items-center gap-3">
                        <span class="material-symbols-outlined text-3xl text-slate-600">category</span>
                        <span class="text-sm text-slate-500">{{ $t('categoryManagement.noCategoriesFound') }}</span>
                      </div>
                    </td>
                  </tr>
                  <tr
                    v-for="cat in categories"
                    :key="cat.id ?? cat.categoryId ?? cat._id"
                    class="group transition-colors hover:bg-surface-container-high/40"
                  >
                    <!-- Category Name -->
                    <td class="px-6 py-5">
                      <div class="flex items-center gap-3">
                        <div class="flex h-8 w-8 items-center justify-center rounded-sm bg-green-400/10 font-headline text-xs font-bold text-green-400">
                          {{ (getField(cat, 'name', 'categoryName', 'title') ?? 'CAT').toString().substring(0, 3).toUpperCase() }}
                        </div>
                        <div>
                          <span class="font-headline text-sm font-bold text-white">{{ getField(cat, 'name', 'categoryName', 'title') ?? '—' }}</span>
                          <span v-if="getField(cat, 'code', 'categoryCode', 'slug')" class="ml-2 text-[9px] font-bold text-slate-600">#{{ getField(cat, 'code', 'categoryCode', 'slug') }}</span>
                        </div>
                      </div>
                    </td>

                    <!-- Age Range -->
                    <td class="px-6 py-5">
                      <div class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-xs text-slate-600">cake</span>
                        <span class="font-headline text-xs font-bold text-slate-300">
                          {{ getField(cat, 'ageMin', 'minAge', 'ageFrom') ?? '?' }} – {{ getField(cat, 'ageMax', 'maxAge', 'ageTo') ?? '?' }}
                        </span>
                        <span class="text-[9px] font-bold text-slate-600">yrs</span>
                      </div>
                    </td>

                    <!-- Capacity -->
                    <td class="px-6 py-5">
                      <div class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-xs text-slate-600">groups</span>
                        <span class="font-headline text-sm font-bold text-white">{{ getField(cat, 'capacity', 'maxCapacity', 'maxPlayers') ?? '—' }}</span>
                      </div>
                    </td>

                    <!-- Registration Fee -->
                    <td class="px-6 py-5">
                      <div class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-xs text-slate-600">payments</span>
                        <span class="font-headline text-sm font-bold text-white">
                          {{ (getField(cat, 'registrationFee', 'fee', 'price') ?? 0).toLocaleString() }}
                        </span>
                        <span class="text-[9px] font-bold text-slate-600">DZD</span>
                      </div>
                    </td>

                    <!-- Players Count -->
                    <td class="px-6 py-5">
                      <div class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-xs text-slate-600">person</span>
                        <span class="font-headline text-sm font-bold text-white">{{ getField(cat, 'playerCount', 'playersCount', 'currentPlayers', 'enrolledCount', 'staffCount') ?? 0 }}</span>
                      </div>
                    </td>

                    <!-- Status -->
                    <td class="px-6 py-5">
                      <span
                        :class="[
                          'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                          getField(cat, 'status', 'isActive', 'state') === false || getField(cat, 'status') === 'Inactive'
                            ? 'bg-red-400/10 text-red-400'
                            : 'bg-green-400/10 text-green-400'
                        ]"
                      >
                        {{ getField(cat, 'status') === false || getField(cat, 'status') === 'Inactive' ? $t('common.inactive') : $t('common.active') }}
                      </span>
                    </td>

                    <!-- Actions -->
                    <td class="px-6 py-5 text-right">
                      <button
                        type="button"
                        class="pressable p-2 text-slate-500 transition-colors hover:text-white"
                        @click.stop="toggleMenu(getField(cat, 'id', 'categoryId', '_id'), $event)"
                      >
                        <span class="material-symbols-outlined text-lg">more_vert</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="flex items-center justify-between border-t border-white/5 p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <div class="flex items-center gap-4">
                <span>{{ showingText }}</span>
                <div class="flex items-center gap-2">
                  <label for="category-page-size" class="text-slate-400">{{ $t('common.rowsPerPage') }}:</label>
                  <select
                    id="category-page-size"
                    :value="pageSize"
                    @change="(e) => handlePageSizeChange(Number(e.target.value))"
                    class="rounded bg-surface-container-lowest px-2 py-1 text-white text-[10px] font-bold transition-colors hover:bg-surface-container-high cursor-pointer border border-white/10"
                  >
                    <option v-for="size in pageSizeOptions" :key="size" :value="size">
                      {{ size }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  :disabled="currentPage === 1"
                  @click="prevPage"
                  class="pressable rounded bg-surface-container-lowest px-3 py-1 transition-colors hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  PREV
                </button>
                <button
                  type="button"
                  :disabled="currentPage >= totalPages"
                  @click="nextPage"
                  class="pressable rounded bg-surface-container-lowest px-3 py-1 transition-colors hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  NEXT
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Click-away listener to close dropdown -->
    <div v-if="openMenuId !== null" class="fixed inset-0 z-40" @click="closeMenu"></div>

    <!-- Fixed-position action dropdown (outside table to avoid overflow clipping) -->
    <Teleport to="body">
      <div
        v-if="openMenuId !== null"
        class="fixed z-50 w-36 rounded-lg bg-surface-container-high border border-white/10 shadow-2xl overflow-hidden"
        :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-surface-container-highest hover:text-green-400"
          @click="openEditModal(categories.find(c => (getField(c, 'id', 'categoryId', '_id')) === openMenuId))"
        >
          <span class="material-symbols-outlined text-sm">edit</span>
          {{ $t('common.edit') }}
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-surface-container-highest hover:text-red-400"
          @click="openDeleteModal(categories.find(c => (getField(c, 'id', 'categoryId', '_id')) === openMenuId))"
        >
          <span class="material-symbols-outlined text-sm">delete</span>
          {{ $t('common.delete') }}
        </button>
      </div>
    </Teleport>

    <!-- EDIT MODAL -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="showEditModal = false"></div>
        <div class="relative bg-surface-container-low w-full max-w-lg rounded-xl border border-white/10 shadow-2xl overflow-hidden">
          <div class="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <div class="text-green-400 text-[10px] font-black tracking-[0.2em] uppercase mb-1">{{ $t('categoryManagement.modifyRecord') }}</div>
              <h2 class="text-xl font-black text-white tracking-tight uppercase">{{ $t('categoryManagement.editCategory') }}</h2>
            </div>
            <button type="button" class="text-slate-500 hover:text-white transition-colors" @click="showEditModal = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="p-8 space-y-6">
            <div class="space-y-1.5">
              <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ $t('categoryManagement.categoryName') }}</label>
              <input
                v-model="editForm.name"
                type="text"
                placeholder="e.g., U-16 Elite"
                class="w-full rounded border-none bg-surface-container-lowest p-3 text-sm text-white focus:ring-1 focus:ring-green-400/50"
              />
            </div>
            <div class="space-y-4">
              <div class="flex items-end justify-between">
                <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ $t('categoryManagement.ageRange') }}</label>
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center rounded bg-green-400/10 px-2 py-0.5 font-headline text-xs font-bold text-green-400">{{ editForm.ageMin }}</span>
                  <span class="text-[10px] font-bold text-slate-600">—</span>
                  <span class="inline-flex items-center justify-center rounded bg-green-400/10 px-2 py-0.5 font-headline text-xs font-bold text-green-400">{{ editForm.ageMax }}</span>
                  <span class="text-[10px] font-bold uppercase text-slate-500">yrs</span>
                </div>
              </div>
              <div class="age-slider-wrapper px-2 pt-4 pb-2">
                <Slider
                  v-model="editAgeRange"
                  :min="4"
                  :max="25"
                  :step="1"
                  :tooltips="false"
                  :merge="-1"
                  :lazy="false"
                />
              </div>
              <div class="flex items-center justify-between px-2">
                <span class="text-[9px] font-bold text-slate-600">4</span>
                <span class="text-[9px] font-bold text-slate-600">25</span>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ $t('categoryManagement.capacity') }}</label>
                <input
                  v-model="editForm.capacity"
                  type="number"
                  placeholder="25"
                  class="w-full rounded border-none bg-surface-container-lowest p-3 text-sm text-white focus:ring-1 focus:ring-green-400/50"
                />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ $t('categoryManagement.currency') }}</label>
                <div class="flex h-[46px] items-center justify-center rounded bg-surface-container-high p-3 text-xs font-bold text-slate-400">
                  DZD
                </div>
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ $t('categoryManagement.registrationFee') }}</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-400">د.ج</span>
                <input
                  v-model="editForm.registrationFee"
                  type="number"
                  placeholder="45,000"
                  class="w-full rounded border-none bg-surface-container-lowest p-3 pl-10 text-sm text-white focus:ring-1 focus:ring-green-400/50"
                />
              </div>
            </div>
          </div>
          <div class="p-6 bg-surface-container-high/50 border-t border-white/5 flex items-center justify-end gap-4">
            <button
              type="button"
              class="px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest rounded-md hover:bg-white/5 transition-all"
              @click="showEditModal = false"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="button"
              :disabled="isEditing"
              class="px-6 py-3 bg-primary-container text-on-primary-fixed font-black text-xs uppercase tracking-widest rounded-md shadow-lg shadow-green-900/20 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              @click="submitEdit"
            >
              <span v-if="isEditing" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              {{ isEditing ? $t('common.updating') : $t('categoryManagement.updateCategory') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- DELETE CONFIRMATION MODAL -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="cancelDelete"></div>
        <div class="relative bg-surface-container-low w-full max-w-md rounded-xl border border-white/10 shadow-2xl overflow-hidden">
          <div class="p-8 text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-400/10">
              <span class="material-symbols-outlined text-3xl text-red-400">warning</span>
            </div>
            <h2 class="text-lg font-black text-white tracking-tight uppercase mb-2">{{ $t('categoryManagement.deleteCategory') }}</h2>
            <p class="text-sm text-slate-400">
              {{ $t('categoryManagement.confirmDeleteCategory') }}
              <span class="font-bold text-white">{{ deleteTarget ? (getField(deleteTarget, 'name', 'categoryName', 'title') ?? 'this category') : '' }}</span>? {{ $t('categoryManagement.actionCannotBeUndone') }}
            </p>
          </div>
          <div class="p-6 bg-surface-container-high/50 border-t border-white/5 flex items-center justify-center gap-4">
            <button
              type="button"
              class="flex-1 py-3 text-slate-400 font-black text-xs uppercase tracking-widest rounded-md hover:bg-white/5 transition-all"
              @click="cancelDelete"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="button"
              :disabled="isDeleting"
              class="flex-1 py-3 bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-md shadow-lg shadow-red-900/20 hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              @click="confirmDelete"
            >
              <span v-if="isDeleting" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              {{ isDeleting ? $t('common.deleting') : $t('common.yesDelete') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- FILTER MODAL -->
    <Teleport to="body">
      <div v-if="showFilterModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="toggleFilterModal"></div>
        <div class="relative bg-surface-container-low w-full max-w-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden">
          <div class="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <div class="text-green-400 text-[10px] font-black tracking-[0.2em] uppercase mb-1">{{ $t('staffManagement.searchParameters') }}</div>
              <h2 class="text-xl font-black text-white tracking-tight uppercase">{{ $t('categoryManagement.categoryFilters') }}</h2>
            </div>
            <button type="button" class="text-slate-500 hover:text-white transition-colors" @click="toggleFilterModal">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
            <!-- AGE RANGE -->
            <div class="space-y-4">
              <div class="flex items-end justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-1 h-3 bg-green-400 rounded-full"></span>
                  <h3 class="text-[10px] font-black text-white tracking-widest uppercase">{{ $t('categoryManagement.ageRange') }}</h3>
                </div>
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center rounded bg-green-400/10 px-2 py-0.5 font-headline text-xs font-bold text-green-400">{{ filterAgeRange[0] }}</span>
                  <span class="text-[10px] font-bold text-slate-600">—</span>
                  <span class="inline-flex items-center justify-center rounded bg-green-400/10 px-2 py-0.5 font-headline text-xs font-bold text-green-400">{{ filterAgeRange[1] }}</span>
                  <span class="text-[10px] font-bold uppercase text-slate-500">yrs</span>
                </div>
              </div>
              <div class="age-slider-wrapper px-2 pt-4 pb-2">
                <Slider
                  v-model="filterAgeRange"
                  :min="4"
                  :max="25"
                  :step="1"
                  :tooltips="false"
                  :merge="-1"
                  :lazy="false"
                />
              </div>
              <div class="flex items-center justify-between px-2">
                <span class="text-[9px] font-bold text-slate-600">4</span>
                <span class="text-[9px] font-bold text-slate-600">25</span>
              </div>
            </div>

            <!-- CAPACITY -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="w-1 h-3 bg-blue-400 rounded-full"></span>
                <h3 class="text-[10px] font-black text-white tracking-widest uppercase">{{ $t('categoryManagement.capacity') }}</h3>
              </div>
              <div class="space-y-1.5">
                <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ $t('categoryManagement.maxCapacity') }}</label>
                <input
                  v-model.number="filterCapacity"
                  type="number"
                  placeholder="25"
                  min="0"
                  class="w-full rounded border-none bg-surface-container-lowest p-3 text-sm text-white focus:ring-1 focus:ring-blue-400/50"
                />
              </div>
            </div>

            <!-- REGISTRATION FEE -->
            <div class="space-y-4">
              <div class="flex items-end justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-1 h-3 bg-orange-400 rounded-full"></span>
                  <h3 class="text-[10px] font-black text-white tracking-widest uppercase">{{ $t('categoryManagement.registrationFee') }}</h3>
                </div>
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center rounded bg-orange-400/10 px-2 py-0.5 font-headline text-xs font-bold text-orange-400">{{ filterFeeRange[0].toLocaleString() }}</span>
                  <span class="text-[10px] font-bold text-slate-600">—</span>
                  <span class="inline-flex items-center justify-center rounded bg-orange-400/10 px-2 py-0.5 font-headline text-xs font-bold text-orange-400">{{ filterFeeRange[1].toLocaleString() }}</span>
                  <span class="text-[10px] font-bold uppercase text-slate-500">DZD</span>
                </div>
              </div>
              <div class="age-slider-wrapper px-2 pt-4 pb-2">
                <Slider
                  v-model="filterFeeRange"
                  :min="0"
                  :max="100000"
                  :step="5000"
                  :tooltips="false"
                  :merge="-1"
                  :lazy="false"
                />
              </div>
              <div class="flex items-center justify-between px-2">
                <span class="text-[9px] font-bold text-slate-600">0</span>
                <span class="text-[9px] font-bold text-slate-600">100,000</span>
              </div>
            </div>

            <!-- PLAYERS RANGE -->
            <div class="space-y-4">
              <div class="flex items-end justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-1 h-3 bg-purple-400 rounded-full"></span>
                  <h3 class="text-[10px] font-black text-white tracking-widest uppercase">{{ $t('categoryManagement.playersCol') }}</h3>
                </div>
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center rounded bg-purple-400/10 px-2 py-0.5 font-headline text-xs font-bold text-purple-400">{{ filterPlayersRange[0] }}</span>
                  <span class="text-[10px] font-bold text-slate-600">—</span>
                  <span class="inline-flex items-center justify-center rounded bg-purple-400/10 px-2 py-0.5 font-headline text-xs font-bold text-purple-400">{{ filterPlayersRange[1] }}</span>
                  <span class="text-[10px] font-bold uppercase text-slate-500">players</span>
                </div>
              </div>
              <div class="age-slider-wrapper px-2 pt-4 pb-2">
                <Slider
                  v-model="filterPlayersRange"
                  :min="0"
                  :max="100"
                  :step="1"
                  :tooltips="false"
                  :merge="-1"
                  :lazy="false"
                />
              </div>
              <div class="flex items-center justify-between px-2">
                <span class="text-[9px] font-bold text-slate-600">0</span>
                <span class="text-[9px] font-bold text-slate-600">100</span>
              </div>
            </div>
          </div>
          <div class="p-6 bg-surface-container-high/50 border-t border-white/5 flex items-center justify-between gap-4">
            <button
              type="button"
              class="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest rounded-md hover:bg-white/5 transition-all"
              @click="resetFilters"
            >
              {{ $t('staffManagement.resetFilters') }}
            </button>
            <button
              type="button"
              class="flex-[2] py-4 bg-primary-container text-on-primary-fixed font-black text-xs uppercase tracking-widest rounded-md shadow-lg shadow-green-900/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
              @click="applyFilters"
            >
              {{ $t('staffManagement.applyFilters') }}
              <span class="material-symbols-outlined font-bold text-sm">filter_alt</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

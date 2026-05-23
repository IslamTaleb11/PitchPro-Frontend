<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { staffService } from '../../../services/staffService'
import { lookupService } from '../../../services/lookupService'
import { useUiToast } from '../../../composables/useUiToast'

const { showToast } = useUiToast()
const { t: $t } = useI18n()

// 1. State Management
const staffList = ref([])
const currentPage = ref(1)
const pageSize = ref(5)
const totalCount = ref(0)
const isLoading = ref(false)
const pageSizeOptions = [5, 10, 25, 50]
const isFilterMode = ref(false)

// 2. Lookup Data (fetched from API)
const primaryRoles = ref([])
const roleClassifications = ref([])
const categories = ref([])
const clubID = ref(7)

// 3. Filter State
const showFilterModal = ref(false)
const selectedPrimaryRoleId = ref(null)
const selectedRoleClassificationId = ref(null)
const selectedCategoryIds = ref([])

// 4. Computed: classifications filtered by selected primary role
const filteredClassifications = computed(() => {
  if (!selectedPrimaryRoleId.value) return roleClassifications.value
  return roleClassifications.value.filter(c => {
    const pRoleId = c.staffPrimaryRoleID ?? c.staffPrimaryRoleId ?? c.primary_role_id ?? c.primaryRoleId ?? c.PrimaryRoleId ?? c.primaryRoleID ?? c.PrimaryRoleID ?? c.roleId ?? c.RoleID
    return pRoleId == null || String(pRoleId) === String(selectedPrimaryRoleId.value)
  })
})

// 5. Computed: UI helpers
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize.value)))
const startIndex = computed(() => totalCount.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1)
const endIndex = computed(() => Math.min(currentPage.value * pageSize.value, totalCount.value))
const paginatedStaff = computed(() => staffList.value)

const showingText = computed(() => {
  if (totalCount.value === 0) return `${$t('common.showing')} 0 ${$t('common.of')} 0 ${$t('staffManagement.personnel')}`
  return `${$t('common.showing')} ${startIndex.value}-${endIndex.value} ${$t('common.of')} ${totalCount.value} ${$t('staffManagement.personnel')}`
})

// 6. Normalize lookup helpers
function normalizeLookupItem(item) {
  if (!item) return { id: 'Unknown', name: 'Unknown' }
  if (typeof item === 'string' || typeof item === 'number') return { id: item, name: String(item) }
  const idCandidates = ['id', 'Id', 'ID', 'value', 'key', 'lookupId', 'lookupID', 'bloodTypeId', 'bloodTypeID', 'roleId', 'roleID', 'classificationId', 'classificationID', 'categoryId', 'categoryID', 'roleClassificationId', 'roleClassificationID', 'staffPrimaryRoleID', 'staffPrimaryRoleId']
  const nameCandidates = ['name', 'Name', 'label', 'title', 'description', 'text', 'value', 'nameAr', 'nameEn', 'bloodTypeName', 'roleName', 'classificationName', 'categoryName', 'roleClassificationName']
  let id = null, name = null
  for (const key of idCandidates) { if (item[key] !== undefined && item[key] !== null) { id = item[key]; break } }
  for (const key of nameCandidates) { if (item[key] !== undefined && item[key] !== null) { name = item[key]; break } }
  if (id === null) { const idKey = Object.keys(item).find(k => k.toLowerCase().endsWith('id')); if (idKey) id = item[idKey] }
  if (name === null) { const nameKey = Object.keys(item).find(k => k.toLowerCase().endsWith('name')); if (nameKey) name = item[nameKey] }
  return { ...item, id: id ?? name ?? 'Unknown', name: name ?? String(id ?? 'Unknown') }
}

function normalizeLookupArray(data) {
  let array = data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    array = data.data || data.items || data.result || data.value || data.$values || []
  }
  if (!Array.isArray(array)) {
    if (data && typeof data === 'object') {
      const vals = Object.values(data)
      if (vals.length > 0 && typeof vals[0] === 'object') array = vals
      else return []
    } else return []
  }
  return array.map(normalizeLookupItem).filter(item => item.id !== 'Unknown')
}

// 7. Load lookup data
async function loadLookups() {
  const results = await Promise.allSettled([
    lookupService.getPrimaryRoles(),
    lookupService.getRoleClassifications(),
    lookupService.getCategories(clubID.value)
  ])
  if (results[0].status === 'fulfilled') primaryRoles.value = normalizeLookupArray(results[0].value.data)
  else console.error('Primary roles error:', results[0].reason)
  if (results[1].status === 'fulfilled') roleClassifications.value = normalizeLookupArray(results[1].value.data)
  else console.error('Classifications error:', results[1].reason)
  if (results[2].status === 'fulfilled') categories.value = normalizeLookupArray(results[2].value.data)
  else console.error('Categories error:', results[2].reason)
}

// 8. Watch: reset classification when primary role changes
watch(selectedPrimaryRoleId, () => {
  selectedRoleClassificationId.value = null
})

// 9. API Logic
async function fetchStaff() {
  try {
    isLoading.value = true
    if (isFilterMode.value) {
      const response = await staffService.getStaffByFilter({
        pageNumber: currentPage.value,
        pageSize: pageSize.value,
        primaryRoleId: selectedPrimaryRoleId.value,
        roleClassificationId: selectedRoleClassificationId.value,
        categoryIds: selectedCategoryIds.value
      })
      if (response.data && response.data.data) {
        staffList.value = response.data.data
      } else {
        staffList.value = []
      }
      if (response.data && typeof response.data.totalCount === 'number') {
        totalCount.value = response.data.totalCount
      } else {
        totalCount.value = staffList.value.length >= pageSize.value ? staffList.value.length + 1 : staffList.value.length
      }
    } else {
      const response = await staffService.getAllStaff(currentPage.value, pageSize.value)
      if (response.data && response.data.data) {
        staffList.value = response.data.data
      } else {
        staffList.value = []
      }
      if (response.data && typeof response.data.totalCount === 'number') {
        totalCount.value = response.data.totalCount
      } else {
        totalCount.value = staffList.value.length >= pageSize.value ? staffList.value.length + 1 : staffList.value.length
      }
    }
  } catch (error) {
    const message = error?.response?.data?.message || 'Failed to fetch staff.'
    showToast({ title: 'Error', message, mode: 'error' })
  } finally {
    isLoading.value = false
  }
}

// 10. Pagination & Filter Handlers
function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchStaff()
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchStaff()
  }
}

function handlePageSizeChange(newSize) {
  pageSize.value = newSize
  currentPage.value = 1
  fetchStaff()
}

function toggleFilterModal() {
  showFilterModal.value = !showFilterModal.value
}

function resetFilters() {
  selectedPrimaryRoleId.value = null
  selectedRoleClassificationId.value = null
  selectedCategoryIds.value = []
  isFilterMode.value = false
  currentPage.value = 1
  fetchStaff()
}

function applyFilters() {
  showFilterModal.value = false
  isFilterMode.value = true
  currentPage.value = 1
  fetchStaff()
}

function toggleCategory(categoryId) {
  if (selectedCategoryIds.value.includes(categoryId)) {
    selectedCategoryIds.value = selectedCategoryIds.value.filter(id => id !== categoryId)
  } else {
    selectedCategoryIds.value.push(categoryId)
  }
}

// 11. Lifecycle
onMounted(() => {
  loadLookups()
  fetchStaff()
})
</script>

<template>
  <div class="overflow-hidden rounded-xl bg-surface-container-low">
    <div class="flex items-center justify-between bg-surface-container-high/50 p-6">
      <h3 class="text-sm font-black uppercase tracking-wider text-white">{{ $t('staffManagement.staffDirectory') }}</h3>
      <div class="flex items-center gap-3">
        <button type="button" class="pressable flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white" @click="toggleFilterModal">
          <span class="material-symbols-outlined text-sm">filter_list</span> {{ $t('common.filter') }}
        </button>
        <button type="button" class="pressable flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white">
          <span class="material-symbols-outlined text-sm">download</span> {{ $t('common.export') }}
        </button>
      </div>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead class="bg-surface-container-low">
          <tr class="border-b border-white/5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
            <th class="px-6 py-4">{{ $t('staffManagement.member') }}</th><th class="px-6 py-4">{{ $t('staffManagement.strategicRoleCol') }}</th><th class="px-6 py-4">{{ $t('staffManagement.assignedUnits') }}</th><th class="px-6 py-4">{{ $t('common.status') }}</th><th class="px-6 py-4 text-right">{{ $t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          <tr v-if="staffList.length === 0" class="hover:bg-surface-container-high">
            <td colspan="5" class="px-6 py-8 text-center text-sm text-slate-400">
              {{ isLoading ? $t('staffManagement.loadingStaff') : $t('staffManagement.noStaffFound') }}
            </td>
          </tr>
          <tr v-for="staff in paginatedStaff" :key="staff.email" class="group transition-colors hover:bg-surface-container-high">
            <td class="px-6 py-5">
              <div class="flex items-center gap-4">
                <div class="h-10 w-10 overflow-hidden rounded-lg bg-surface-container-lowest">
                  <img class="h-full w-full object-cover" :alt="staff.fullName" :src="staff.photo" />
                </div>
                <div>
                  <div class="text-sm font-bold text-white">{{ staff.fullName }}</div>
                  <div class="text-[10px] text-slate-500">{{ staff.email }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-5">
              <div class="flex flex-col">
                <span class="text-xs font-black uppercase tracking-tighter text-green-400">{{ staff.roleClassificationName }}</span>
                <span class="text-[10px] italic text-slate-500">{{ staff.primaryRoleName }}</span>
              </div>
            </td>
            <td class="px-6 py-5">
              <div class="flex gap-1 flex-wrap">
                <span v-for="category in staff.categoriesNames" :key="category" class="rounded bg-surface-container-lowest px-2 py-0.5 text-[10px] font-bold text-slate-300">
                  {{ category }}
                </span>
              </div>
            </td>
            <td class="px-6 py-5">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-green-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400">
                <span class="h-1.5 w-1.5 rounded-full bg-green-400" />{{ $t('common.active') }}
              </span>
            </td>
            <td class="px-6 py-5 text-right">
              <button type="button" class="pressable p-2 text-slate-500 transition-colors hover:text-white">
                <span class="material-symbols-outlined text-lg">more_vert</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex items-center justify-between border-t border-white/5 p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      <div class="flex items-center gap-4">
        <span>{{ showingText }}</span>
        <div class="flex items-center gap-2">
          <label for="page-size" class="text-slate-400">{{ $t('common.rowsPerPage') }}:</label>
          <select
            id="page-size"
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

  <!-- FILTER MODAL -->
  <Teleport to="body">
    <div v-if="showFilterModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="toggleFilterModal"></div>
      <div class="relative bg-surface-container-low w-full max-w-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden">
        <div class="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <div class="text-green-400 text-[10px] font-black tracking-[0.2em] uppercase mb-1">{{ $t('staffManagement.searchParameters') }}</div>
            <h2 class="text-xl font-black text-white tracking-tight uppercase">{{ $t('staffManagement.directoryFilters') }}</h2>
          </div>
          <button type="button" class="text-slate-500 hover:text-white transition-colors" @click="toggleFilterModal">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
          <!-- PRIMARY ROLE (single select) -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="w-1 h-3 bg-green-400 rounded-full"></span>
              <h3 class="text-[10px] font-black text-white tracking-widest uppercase">{{ $t('staffManagement.primaryRole') }}</h3>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="role in primaryRoles"
                :key="role.id"
                type="button"
                @click="selectedPrimaryRoleId = selectedPrimaryRoleId === role.id ? null : role.id"
                :class="[
                  'px-4 py-2 text-[10px] font-black rounded uppercase tracking-wider border transition-colors',
                  selectedPrimaryRoleId === role.id
                    ? 'bg-green-400/10 border-green-400/30 text-green-400 hover:bg-green-400/20'
                    : 'bg-surface-container-lowest border-white/5 text-slate-500 hover:text-white'
                ]"
              >
                {{ role.name }}
              </button>
            </div>
          </div>

          <!-- ROLE CLASSIFICATION (single select, filtered by primary role) -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="w-1 h-3 bg-blue-400 rounded-full"></span>
              <h3 class="text-[10px] font-black text-white tracking-widest uppercase">{{ $t('staffManagement.classification') }}</h3>
            </div>
            <div v-if="filteredClassifications.length === 0" class="text-[10px] text-slate-500 italic">
              {{ selectedPrimaryRoleId ? $t('staffManagement.noClassificationsForRole') : $t('staffManagement.selectPrimaryRoleFirst') }}
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <button
                v-for="cls in filteredClassifications"
                :key="cls.id"
                type="button"
                @click="selectedRoleClassificationId = selectedRoleClassificationId === cls.id ? null : cls.id"
                :class="[
                  'px-4 py-2 text-[10px] font-black rounded uppercase tracking-wider border transition-colors',
                  selectedRoleClassificationId === cls.id
                    ? 'bg-blue-400/10 border-blue-400/30 text-blue-400 hover:bg-blue-400/20'
                    : 'bg-surface-container-lowest border-white/5 text-slate-500 hover:text-white'
                ]"
              >
                {{ cls.name }}
              </button>
            </div>
          </div>

          <!-- SQUAD CATEGORIES (multi-select) -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="w-1 h-3 bg-orange-400 rounded-full"></span>
              <h3 class="text-[10px] font-black text-white tracking-widest uppercase">{{ $t('staffManagement.squadCategories') }}</h3>
            </div>
            <div v-if="categories.length === 0" class="text-[10px] text-slate-500 italic">
              {{ $t('staffManagement.noCategoriesAvailable') }}
            </div>
            <div v-else class="grid grid-cols-4 gap-2">
              <div v-for="col in 4" :key="col" class="flex flex-col gap-2">
                <label
                  v-for="cat in categories.slice((col - 1) * Math.ceil(categories.length / 4), col * Math.ceil(categories.length / 4))"
                  :key="cat.id"
                  class="inline-flex items-center gap-2 text-[10px] font-bold text-slate-400 cursor-pointer"
                >
                  <input type="checkbox" :checked="selectedCategoryIds.includes(cat.id)" class="rounded border-slate-700 bg-slate-900 text-orange-400" @change="toggleCategory(cat.id)" />
                  {{ cat.name }}
                </label>
              </div>
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
</template>

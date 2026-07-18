<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { staffService } from '../../../services/staffService'
import { lookupService } from '../../../services/lookupService'
import { useUiToast } from '../../../composables/useUiToast'
import imageCompression from 'browser-image-compression'

const { showToast } = useUiToast()
const { t: $t } = useI18n()

// Notify the parent (dashboard) that staff data changed so it can refresh the
// count endpoint (StaffStatsStrip.reloadCounts → staffService.getStaffCounts).
const emit = defineEmits(['staff-updated'])

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
const bloodTypes = ref([])
const clubID = ref(7)
const lookupsLoaded = ref(false)

// 3. Filter State
const showFilterModal = ref(false)
const showActionModal = ref(false)
const actionTarget = ref(null)
const actionMode = ref('select')
const isEditLoading = ref(false)
const isUpdateSubmitting = ref(false)
const showDeleteConfirm = ref(false)
const selectedPrimaryRoleId = ref(null)
const selectedRoleClassificationId = ref(null)
const selectedCategoryIds = ref([])
const updateForm = ref({
  id: null,
  firstName: '',
  secondName: '',
  lastName: '',
  gender: 'Male',
  birthDate: '',
  email: '',
  phoneNumber: '',
  address: '',
  primaryRoleID: '',
  roleClassificationID: '',
  categoriesIDs: [],
  bloodTypeID: 1,
  allergies: '',
  medicalNotes: '',
  photo: null
})

// Photo handling for the update form: photoFile holds a newly chosen (compressed)
// image to upload; photoPreview shows either that new image or the staff member's
// current photo (so we never lose the existing picture unless a new one is picked).
const photoFile = ref(null)
const photoPreview = ref('')

// 4. Computed: classifications filtered by selected primary role
const filteredClassifications = computed(() => {
  if (!selectedPrimaryRoleId.value) return roleClassifications.value
  return roleClassifications.value.filter(c => {
    const pRoleId = c.staffPrimaryRoleID ?? c.staffPrimaryRoleId ?? c.primary_role_id ?? c.primaryRoleId ?? c.PrimaryRoleId ?? c.primaryRoleID ?? c.PrimaryRoleID ?? c.roleId ?? c.RoleID
    return pRoleId == null || String(pRoleId) === String(selectedPrimaryRoleId.value)
  })
})

// Same cascading behaviour, but driven by the role chosen inside the UPDATE form
// (updateForm.primaryRoleID) instead of the filter modal's selection.
const updateFilteredClassifications = computed(() => {
  const roleId = updateForm.value.primaryRoleID
  if (!roleId) return roleClassifications.value
  return roleClassifications.value.filter(c => {
    const pRoleId = c.staffPrimaryRoleID ?? c.staffPrimaryRoleId ?? c.primary_role_id ?? c.primaryRoleId ?? c.PrimaryRoleId ?? c.primaryRoleID ?? c.PrimaryRoleID ?? c.roleId ?? c.RoleID
    return pRoleId == null || String(pRoleId) === String(roleId)
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

// Helper: convert an ISO date/time string (or Date) to a yyyy-MM-dd string
// suitable for an <input type="date"> binding.
function formatDateForInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 7. Load lookup data
async function loadLookups() {
  const results = await Promise.allSettled([
    lookupService.getPrimaryRoles(),
    lookupService.getRoleClassifications(),
    lookupService.getCategories(clubID.value),
    lookupService.getBloodTypes()
  ])
  if (results[0].status === 'fulfilled') primaryRoles.value = normalizeLookupArray(results[0].value.data)
  else console.error('Primary roles error:', results[0].reason)
  if (results[1].status === 'fulfilled') roleClassifications.value = normalizeLookupArray(results[1].value.data)
  else console.error('Classifications error:', results[1].reason)
  if (results[2].status === 'fulfilled') categories.value = normalizeLookupArray(results[2].value.data)
  else console.error('Categories error:', results[2].reason)
  if (results[3].status === 'fulfilled') bloodTypes.value = normalizeLookupArray(results[3].value.data)
  else console.error('Blood types error:', results[3].reason)
}

// Loads ALL categories / primary roles / role classifications / blood types from
// the existing lookup endpoints. Guarded so it only runs once; used both on mount
// and right before opening the update form so the selects always have every option.
async function ensureLookups() {
  if (lookupsLoaded.value) return
  await loadLookups()
  lookupsLoaded.value = true
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

function reloadStaff() {
  return fetchStaff()
}

defineExpose({
  reloadStaff
})

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

async function openActionModal(staff, mode = 'select') {
  actionTarget.value = staff

  // UPDATE: fetch the staff details first, then reveal the form. We never flip
  // into 'update' mode (and never show the empty form) until the data is ready —
  // a loading modal is shown while getStaffById runs.
  if (mode === 'update' && staff) {
    isEditLoading.value = true
    showActionModal.value = false // hide any currently open (select) modal
    try {
      // Make sure every option (all categories / roles / classifications) is loaded
      // from the lookup endpoints before we open the form.
      await ensureLookups()

      const staffId = staff.id ?? staff.ID ?? staff.staffId ?? staff.staffID ?? staff.StaffID
      if (!staffId || staffId <= 0) {
        showToast({ title: 'Error', message: 'This staff member is missing a valid ID. Please refresh the list and try again.', mode: 'error' })
        return
      }
      const response = await staffService.getStaffById(staffId)
      // The endpoint returns the staff object directly (response.data), but be
      // defensive in case it is ever wrapped in { data: ... }.
      const staffDetails = response?.data?.data ?? response?.data ?? staff

      // Coerce IDs to numbers so they match the <option>/checkbox values (which we
      // also force to numbers in the template) and the selects auto-select by id.
      const rawCategoryIds = staffDetails.categoriesIDs ?? staffDetails.CategoriesIDs ?? staffDetails.categoryIds ?? staffDetails.CategoryIDs ?? []

      updateForm.value = {
        id: staffDetails.id ?? staffDetails.ID ?? staffDetails.staffId ?? staffDetails.staffID ?? null,
        firstName: staffDetails.firstName ?? staffDetails.FirstName ?? '',
        lastName: staffDetails.lastName ?? staffDetails.LastName ?? '',
        secondName: staffDetails.secondName ?? staffDetails.SecondName ?? '',
        gender: staffDetails.gender === false || staffDetails.gender === 'Female' ? 'Female' : 'Male',
        birthDate: formatDateForInput(staffDetails.birthDate ?? staffDetails.BirthDate),
        email: staffDetails.email ?? staffDetails.Email ?? '',
        phoneNumber: staffDetails.phoneNumber ?? staffDetails.PhoneNumber ?? '',
        address: staffDetails.address ?? staffDetails.Address ?? '',
        primaryRoleID: Number(staffDetails.primaryRoleID ?? staffDetails.PrimaryRoleID ?? staffDetails.primaryRoleId ?? staffDetails.PrimaryRoleId ?? 0),
        roleClassificationID: Number(staffDetails.roleClassificationID ?? staffDetails.RoleClassificationID ?? staffDetails.roleClassificationId ?? staffDetails.RoleClassificationId ?? 0),
        categoriesIDs: rawCategoryIds.map(id => Number(id)),
        bloodTypeID: Number(staffDetails.bloodTypeID ?? staffDetails.BloodTypeID ?? 1),
        allergies: staffDetails.allergies ?? staffDetails.Allergies ?? '',
        medicalNotes: staffDetails.medicalNotes ?? staffDetails.MedicalNotes ?? '',
        photo: staffDetails.photo ?? staffDetails.Photo ?? staffDetails.PhotoURL ?? null
      }
      // Show the staff member's current photo by default; no new upload yet.
      photoPreview.value = updateForm.value.photo ?? ''
      photoFile.value = null

      // Data is ready — now switch into update mode and reveal the populated form.
      actionMode.value = 'update'
      showActionModal.value = true
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to load staff details.'
      showToast({ title: 'Error', message, mode: 'error' })
    } finally {
      isEditLoading.value = false
    }
    return
  }

  // SELECT (or any other) mode — no fetch needed.
  actionMode.value = mode
  showActionModal.value = true
}

function closeActionModal() {
  showActionModal.value = false
  actionTarget.value = null
}

// When the primary role changes in the update form, the available classifications
// change too — drop the current classification selection so the user re-picks one
// that actually belongs to the newly selected role.
function onUpdatePrimaryRoleChange() {
  updateForm.value.roleClassificationID = ''
}

// Toggle a category on/off in the update form's selected-categories list.
function toggleUpdateCategory(id) {
  const ids = updateForm.value.categoriesIDs
  const idx = ids.indexOf(id)
  if (idx === -1) ids.push(id)
  else ids.splice(idx, 1)
}

// Pick a new photo for the staff member: validate type/size, compress to stay
// under the backend's 2MB limit, and preview it (replacing the current photo).
async function onUpdatePhotoChange(event) {
  const file = event.target.files[0]
  if (!file) return

  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    showToast({ title: 'Invalid file', message: 'Please choose a JPG, PNG, or WEBP image.', mode: 'error' })
    event.target.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast({ title: 'File too large', message: 'Image must be under 2MB.', mode: 'error' })
    event.target.value = ''
    return
  }

  try {
    const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true })
    photoFile.value = compressed
  } catch {
    photoFile.value = file
  }
  photoPreview.value = URL.createObjectURL(photoFile.value)
}

async function submitUpdate() {
  isUpdateSubmitting.value = true
  try {
    const payload = {
      id: updateForm.value.id,
      firstName: updateForm.value.firstName,
      secondName: updateForm.value.secondName,
      lastName: updateForm.value.lastName,
      gender: updateForm.value.gender,
      birthDate: updateForm.value.birthDate,
      email: updateForm.value.email,
      phoneNumber: updateForm.value.phoneNumber,
      address: updateForm.value.address,
      primaryRoleID: Number(updateForm.value.primaryRoleID),
      roleClassificationID: Number(updateForm.value.roleClassificationID),
      categoriesIDs: updateForm.value.categoriesIDs.map(id => Number(id)),
      bloodTypeID: Number(updateForm.value.bloodTypeID),
      allergies: updateForm.value.allergies,
      medicalNotes: updateForm.value.medicalNotes,
      photo: photoFile.value
    }
    await staffService.updateStaff(payload.id, payload)
    showToast({ title: 'Updated', message: 'Staff member updated successfully.', mode: 'success' })
    photoFile.value = null
    photoPreview.value = ''
    closeActionModal()
    fetchStaff()
  } catch (error) {
    const message = error?.response?.data?.message || 'Failed to update staff.'
    showToast({ title: 'Error', message, mode: 'error' })
  } finally {
    isUpdateSubmitting.value = false
  }
}

// Open the styled delete-confirmation modal (replaces the native window.confirm).
function openDeleteConfirm() {
  showActionModal.value = false
  showDeleteConfirm.value = true
}

// Actually send the delete request once the user confirms "yes".
async function confirmDelete() {
  if (!actionTarget.value) return
  const staffId = actionTarget.value.id ?? actionTarget.value.ID

  // Loading toast (duration 0 keeps it visible until the request resolves).
  showToast({
    title: $t('staffManagement.deletingTitle'),
    message: $t('staffManagement.deletingMessage'),
    mode: 'loading',
    duration: 0,
  })

  try {
    await staffService.deleteStaff(staffId)
    showToast({
      title: $t('staffManagement.deletedTitle'),
      message: $t('staffManagement.deletedMessage'),
      mode: 'success',
    })
    showDeleteConfirm.value = false
    closeActionModal()
    fetchStaff()
    // Refresh the dashboard staff counts (getStaffCounts) so the numbers update.
    emit('staff-updated')
  } catch (error) {
    const message = error?.response?.data?.message || $t('staffManagement.deleteFailedMessage')
    showToast({
      title: $t('staffManagement.deleteFailedTitle'),
      message,
      mode: 'error',
    })
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
              <button type="button" class="pressable p-2 text-slate-500 transition-colors hover:text-white" @click="openActionModal(staff, 'select')">
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

  <!-- LOADING MODAL (shown while the staff details endpoint is being fetched) -->
  <Teleport to="body">
    <div v-if="isEditLoading" class="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md"></div>
      <div class="relative flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-surface-container-low px-10 py-12 shadow-2xl">
        <span class="material-symbols-outlined animate-spin text-4xl text-green-400">progress_activity</span>
        <span class="text-sm font-bold text-slate-300">Loading staff details…</span>
      </div>
    </div>
  </Teleport>

  <!-- UPDATE LOADING MODAL (shown while the staff update is being saved) -->
  <Teleport to="body">
    <div v-if="isUpdateSubmitting" class="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md"></div>
      <div class="relative flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-surface-container-low px-10 py-12 shadow-2xl">
        <span class="material-symbols-outlined animate-spin text-4xl text-green-400">progress_activity</span>
        <span class="text-sm font-bold text-slate-300">Updating staff member…</span>
      </div>
    </div>
  </Teleport>

  <!-- DELETE CONFIRMATION MODAL -->
  <Teleport to="body">
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="showDeleteConfirm = false"></div>
      <div class="relative w-full max-w-md overflow-hidden rounded-xl border border-red-500/20 bg-surface-container-low shadow-2xl">
        <div class="flex flex-col items-center p-6 text-center">
          <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
            <span class="material-symbols-outlined text-3xl text-red-400">warning</span>
          </div>
          <h2 class="font-headline text-lg font-black uppercase tracking-tight text-white">{{ $t('staffManagement.deleteConfirmTitle') }}</h2>
          <p class="mt-3 text-sm text-on-surface-variant">
            {{ $t('staffManagement.deleteConfirmMessage', { name: actionTarget?.fullName || $t('staffManagement.thisStaffMember') }) }}
          </p>
        </div>
        <div class="flex gap-3 border-t border-white/5 p-4">
          <button
            type="button"
            @click="showDeleteConfirm = false"
            class="flex-1 rounded-md py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            @click="confirmDelete"
            class="flex-1 rounded-md bg-red-500 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-red-600"
          >
            <span class="material-symbols-outlined mr-1 align-middle text-sm">delete_forever</span>
            {{ $t('staffManagement.confirmDelete') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ACTION MODAL -->
  <Teleport to="body">
    <div v-if="showActionModal" class="fixed inset-0 z-110 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="closeActionModal"></div>
      <div class="relative w-full max-w-xl rounded-xl border border-white/10 bg-surface-container-low shadow-2xl overflow-hidden">
        <div class="border-b border-white/5 p-6">
          <div class="text-[10px] font-black uppercase tracking-[0.2em] text-green-400">{{ actionMode === 'update' ? 'Update Staff' : 'Staff Actions' }}</div>
          <h2 class="text-xl font-black uppercase tracking-tight text-white">{{ actionTarget?.fullName || 'Staff Member' }}</h2>
        </div>
        <div v-if="actionMode === 'select'" class="p-6">
          <p class="mb-4 text-sm text-slate-400">Choose an action for this staff member.</p>
          <div class="flex flex-wrap gap-3">
            <button type="button" class="rounded-md bg-primary-container px-4 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary-fixed" @click="openActionModal(actionTarget, 'update')">Update</button>
            <button type="button" class="rounded-md bg-red-500/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/30" @click="openDeleteConfirm">Delete</button>
          </div>
        </div>
        <div v-else-if="actionMode === 'update'" class="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          <!-- Photo -->
          <div class="flex items-center gap-4">
            <label
              class="group relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-700 bg-surface-container-lowest transition-colors hover:border-green-400/50"
            >
              <img v-if="photoPreview" :src="photoPreview" alt="Staff photo" class="h-full w-full rounded-xl object-cover" />
              <template v-else>
                <span class="material-symbols-outlined text-slate-600 transition-colors group-hover:text-green-400">add_a_photo</span>
                <span class="mt-1 text-[8px] font-bold uppercase text-slate-500">Photo</span>
              </template>
              <input class="absolute inset-0 cursor-pointer opacity-0" type="file" accept=".jpg,.jpeg,.png,.webp" @change="onUpdatePhotoChange" />
            </label>
            <div class="text-[10px] text-slate-500">
              <div class="font-bold uppercase tracking-wider text-slate-400">Profile photo</div>
              <div>Click the avatar to change the picture. Leave it to keep the current one.</div>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">First name</label>
              <input v-model="updateForm.firstName" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Second name</label>
              <input v-model="updateForm.secondName" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Last name</label>
              <input v-model="updateForm.lastName" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
          </div>
          <div class="grid gap-4 md:grid-cols-3">
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Gender</label>
              <select v-model="updateForm.gender" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Birth date</label>
              <input v-model="updateForm.birthDate" type="date" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Blood type</label>
              <select v-model="updateForm.bloodTypeID" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white">
                <option v-for="bt in bloodTypes" :key="bt.id" :value="bt.id">{{ bt.name }}</option>
              </select>
            </div>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</label>
              <input v-model="updateForm.email" type="email" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</label>
              <input v-model="updateForm.phoneNumber" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Address</label>
            <input v-model="updateForm.address" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Primary role</label>
              <select v-model="updateForm.primaryRoleID" @change="onUpdatePrimaryRoleChange" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white">
                <option v-for="role in primaryRoles" :key="role.id" :value="Number(role.id)">{{ role.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Classification</label>
              <select v-model="updateForm.roleClassificationID" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white">
                <option v-for="cls in updateFilteredClassifications" :key="cls.id" :value="Number(cls.id)">{{ cls.name }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Categories</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                @click="toggleUpdateCategory(Number(cat.id))"
                :class="[
                  'px-3 py-1.5 text-[10px] font-black rounded-full uppercase tracking-wider border transition-colors',
                  updateForm.categoriesIDs.includes(Number(cat.id))
                    ? 'bg-green-400/10 border-green-400/30 text-green-400 hover:bg-green-400/20'
                    : 'bg-surface-container-lowest border-white/5 text-slate-500 hover:text-white'
                ]"
              >
                {{ cat.name }}
              </button>
            </div>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Allergies</label>
              <textarea v-model="updateForm.allergies" rows="2" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white"></textarea>
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Medical notes</label>
              <textarea v-model="updateForm.medicalNotes" rows="2" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white"></textarea>
            </div>
          </div>
        </div>
        <div v-else class="p-6 text-sm text-slate-400">
          Choose an action for this staff member.
        </div>
        <div class="flex items-center justify-end gap-3 border-t border-white/5 bg-surface-container-high/50 p-6">
          <button type="button" class="rounded-md px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5" @click="closeActionModal">Cancel</button>
          <button v-if="actionMode === 'update'" type="button" :disabled="isUpdateSubmitting" class="rounded-md bg-primary-container px-4 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary-fixed transition-opacity disabled:cursor-not-allowed disabled:opacity-60" @click="submitUpdate">{{ isUpdateSubmitting ? 'Saving…' : 'Save' }}</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- FILTER MODAL -->
  <Teleport to="body">
    <div v-if="showFilterModal" class="fixed inset-0 z-100 flex items-center justify-center p-4">
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
            class="flex-2 py-4 bg-primary-container text-on-primary-fixed font-black text-xs uppercase tracking-widest rounded-md shadow-lg shadow-green-900/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
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

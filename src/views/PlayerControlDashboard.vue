<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { useUiToast } from '../composables/useUiToast'
import { lookupService } from '../services/lookupService'
import { playerService } from '../services/playerService'
import { getCurrentClubIdFromJwt } from '../services/axiosConfig'
import imageCompression from 'browser-image-compression'

const { t } = useI18n()
const { showToast } = useUiToast()

const isSidebarOpen = ref(true)

const categories = ref([])
const selectedCategory = ref('')
const players = ref([])
const isLoading = ref(false)

const actionTarget = ref(null)
const showActionModal = ref(false)
const actionMode = ref('select')
const isEditLoading = ref(false)
const isUpdateSubmitting = ref(false)
const showDeleteConfirm = ref(false)

const photoFile = ref(null)
const photoPreview = ref('')

const positions = ref([])
const preferredFeetOptions = ref([])
const bloodTypes = ref([])

const clubID = getCurrentClubIdFromJwt() ?? 7

const updateForm = ref({
  id: null,
  firstName: '',
  secondName: '',
  lastName: '',
  gender: 'Male',
  birthDate: '',
  primaryPositionID: '',
  secondaryPositionID: '',
  preferredFootID: '',
  jerseyNumber: '',
  address: '',
  categoryID: '',
  bloodTypeID: '',
  allergies: '',
  medicalNotes: '',
  phone: '',
  email: '',
  guardianFullName: '',
  guardianPhone: '',
  isMinor: false
})

const playerAge = computed(() => {
  if (!updateForm.value.birthDate) return null
  const dob = new Date(updateForm.value.birthDate)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--
  return age
})

const isMinor = computed(() => playerAge.value !== null && playerAge.value < 18)
const isAdult = computed(() => playerAge.value !== null && playerAge.value >= 18)

function normalizeLookupItem(item) {
  if (!item) return { id: 'Unknown', name: 'Unknown' }
  if (typeof item === 'string' || typeof item === 'number') return { id: item, name: String(item) }
  const idCandidates = ['id', 'Id', 'ID', 'value', 'categoryId', 'categoryID']
  const nameCandidates = ['name', 'Name', 'label', 'title', 'categoryName']
  let id = null
  let name = null
  for (const key of idCandidates) {
    if (item[key] !== undefined && item[key] !== null) { id = item[key]; break }
  }
  for (const key of nameCandidates) {
    if (item[key] !== undefined && item[key] !== null) { name = item[key]; break }
  }
  return { id: id ?? name ?? 'Unknown', name: name ?? String(id ?? 'Unknown') }
}

function normalizeLookupArray(data) {
  let array = data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    array = data.data || data.items || data.result || data.value || data.$values || []
  }
  if (!Array.isArray(array)) return []
  return array.map(normalizeLookupItem).filter((i) => i.id !== 'Unknown')
}

function formatDateForInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Coerce a lookup FK into a valid positive option id before it is sent back to
// the API. Stored values can be 0/absent for players created with incomplete
// data; submitting 0 would fail the backend's [Range(1, ...)] validation with a
// 400. Fall back to the first available option (mirrors the create form's
// defaults) so the request always carries a valid id.
function coerceRequiredSelectId(value, options) {
  const n = Number(value)
  if (Number.isFinite(n) && n > 0) return n
  return Number(options?.[0]?.id ?? 0)
}

async function loadLookups() {
  const [catRes, posRes, feetRes, bloodRes] = await Promise.allSettled([
    lookupService.getCategories(),
    lookupService.getPositions(),
    lookupService.getPreferredFeet(),
    lookupService.getBloodTypes()
  ])
  if (catRes.status === 'fulfilled') categories.value = normalizeLookupArray(catRes.value.data)
  if (posRes.status === 'fulfilled') positions.value = normalizeLookupArray(posRes.value.data)
  if (feetRes.status === 'fulfilled') preferredFeetOptions.value = normalizeLookupArray(feetRes.value.data)
  if (bloodRes.status === 'fulfilled') bloodTypes.value = normalizeLookupArray(bloodRes.value.data)
}

async function loadPlayers() {
  if (!selectedCategory.value) return
  isLoading.value = true
  players.value = []
  try {
    const res = await playerService.getPlayersByCategory(selectedCategory.value)
    const raw = res?.data?.data ?? res?.data ?? []
    players.value = Array.isArray(raw)
      ? raw.map((p) => ({
          id: p.playerId ?? p.playerID ?? p.PlayerID ?? p.id,
          name: p.fullName ?? p.FullName ?? p.full_name ?? '',
          jersey: p.jerseyNumber ?? p.JerseyNumber ?? p.jersey_number ?? '',
          medicalDossierId: p.medicalDossierId ?? p.MedicalDossierID ?? null
        }))
      : []
  } catch {
    showToast({ title: t('playerControl.toast.loadErrorTitle'), message: t('playerControl.toast.loadErrorMsg'), mode: 'error' })
  } finally {
    isLoading.value = false
  }
}

function categoryName(id) {
  const cat = categories.value.find((c) => String(c.id) === String(id))
  return cat ? cat.name : '-'
}

async function openActionModal(player, mode = 'select') {
  actionTarget.value = player

  if (mode === 'update' && player) {
    isEditLoading.value = true
    showActionModal.value = false
    try {
      const playerId = player.id ?? player.playerId ?? player.ID
      if (!playerId || playerId <= 0) {
        showToast({ title: t('common.error'), message: t('playerControl.missingValidId'), mode: 'error' })
        return
      }
      const response = await playerService.getPlayerById(playerId)
      const details = response?.data?.data ?? response?.data ?? player

      const genderValue = details.gender === false || details.gender === 'Female' ? 'Female' : 'Male'
      const secondaryRaw = details.secondaryPositionID ?? details.SecondaryPositionID

      updateForm.value = {
        id: details.id ?? details.ID ?? details.playerId ?? details.PlayerID ?? playerId,
        firstName: details.firstName ?? details.FirstName ?? '',
        secondName: details.secondName ?? details.SecondName ?? '',
        lastName: details.lastName ?? details.LastName ?? '',
        gender: genderValue,
        birthDate: formatDateForInput(details.birthDate ?? details.BirthDate),
        primaryPositionID: coerceRequiredSelectId(details.primaryPositionID ?? details.PrimaryPositionID, positions.value),
        secondaryPositionID: secondaryRaw ? Number(secondaryRaw) : '',
        preferredFootID: coerceRequiredSelectId(details.preferredFootID ?? details.PreferredFootID, preferredFeetOptions.value),
        jerseyNumber: details.jerseyNumber ?? details.JerseyNumber ?? '',
        address: details.address ?? details.Address ?? '',
        categoryID: coerceRequiredSelectId(details.categoryID ?? details.CategoryID, categories.value),
        bloodTypeID: coerceRequiredSelectId(details.bloodTypeID ?? details.BloodTypeID, bloodTypes.value),
        allergies: details.allergies ?? details.Allergies ?? '',
        medicalNotes: details.medicalNotes ?? details.MedicalNotes ?? '',
        phone: details.phone ?? details.Phone ?? '',
        email: details.email ?? details.Email ?? '',
        guardianFullName: details.guardianFullName ?? details.GuardianFullName ?? '',
        guardianPhone: details.guardianPhone ?? details.GuardianPhone ?? '',
        isMinor: Boolean(details.isMinor ?? details.IsMinor ?? false)
      }
      photoPreview.value = details.photo ?? details.Photo ?? ''
      photoFile.value = null

      actionMode.value = 'update'
      showActionModal.value = true
    } catch (error) {
      const message = error?.response?.data?.message || t('playerControl.failedLoadDetails')
      showToast({ title: t('common.error'), message, mode: 'error' })
    } finally {
      isEditLoading.value = false
    }
    return
  }

  actionMode.value = mode
  showActionModal.value = true
}

function closeActionModal() {
  showActionModal.value = false
  actionTarget.value = null
}

async function onPhotoChange(event) {
  const file = event.target.files[0]
  if (!file) return

  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    showToast({ title: t('common.invalidFile'), message: t('common.invalidFileMsg'), mode: 'error' })
    event.target.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast({ title: t('common.fileTooLarge'), message: t('common.fileTooLargeMsg'), mode: 'error' })
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

function validateUpdateForm() {
  if (
    !updateForm.value.firstName.trim() ||
    !updateForm.value.lastName.trim() ||
    !updateForm.value.birthDate ||
    !updateForm.value.gender ||
    !updateForm.value.jerseyNumber.trim() ||
    !updateForm.value.address.trim()
  ) {
    showToast({ title: t('playerControl.missingFields'), message: t('playerControl.pleaseFill'), mode: 'error', duration: 4500 })
    return false
  }
  if (isAdult.value && (!updateForm.value.phone.trim() || !updateForm.value.email.trim())) {
    showToast({ title: t('playerControl.missingFields'), message: t('playerControl.pleaseFill'), mode: 'error', duration: 4500 })
    return false
  }
  if (isMinor.value && (!updateForm.value.guardianFullName.trim() || !updateForm.value.guardianPhone.trim())) {
    showToast({ title: t('playerControl.missingFields'), message: t('playerControl.pleaseFill'), mode: 'error', duration: 4500 })
    return false
  }
  return true
}

async function submitUpdate() {
  if (!validateUpdateForm()) return
  isUpdateSubmitting.value = true
  try {
    const payload = {
      firstName: updateForm.value.firstName,
      secondName: updateForm.value.secondName,
      lastName: updateForm.value.lastName,
      gender: updateForm.value.gender,
      birthDate: updateForm.value.birthDate,
      clubID,
      photo: photoFile.value,
      primaryPositionID: Number(updateForm.value.primaryPositionID),
      secondaryPositionID: updateForm.value.secondaryPositionID ? Number(updateForm.value.secondaryPositionID) : null,
      preferredFootID: Number(updateForm.value.preferredFootID),
      jerseyNumber: updateForm.value.jerseyNumber,
      address: updateForm.value.address,
      categoryID: Number(updateForm.value.categoryID),
      bloodTypeID: Number(updateForm.value.bloodTypeID),
      allergies: updateForm.value.allergies,
      medicalNotes: updateForm.value.medicalNotes,
      isMinor: isMinor.value,
      phone: updateForm.value.phone,
      email: updateForm.value.email,
      guardianFullName: updateForm.value.guardianFullName,
      guardianPhone: updateForm.value.guardianPhone
    }
    await playerService.updatePlayer(updateForm.value.id, payload)
    showToast({ title: t('playerControl.updatedTitle'), message: t('playerControl.updatedMessage'), mode: 'success' })
    photoFile.value = null
    photoPreview.value = ''
    closeActionModal()
    loadPlayers()
  } catch (error) {
    const message = error?.response?.data?.message || t('playerControl.updateFailedMessage')
    showToast({ title: t('common.error'), message, mode: 'error' })
  } finally {
    isUpdateSubmitting.value = false
  }
}

function openDeleteConfirm() {
  showActionModal.value = false
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!actionTarget.value) return
  const playerId = actionTarget.value.id ?? actionTarget.value.playerId ?? actionTarget.value.ID

  showToast({
    title: t('playerControl.deletingTitle'),
    message: t('playerControl.deletingMessage'),
    mode: 'loading',
    duration: 0
  })

  try {
    await playerService.deletePlayer(playerId)
    showToast({ title: t('playerControl.deletedTitle'), message: t('playerControl.deletedMessage'), mode: 'success' })
    showDeleteConfirm.value = false
    closeActionModal()
    loadPlayers()
  } catch (error) {
    const message = error?.response?.data?.message || t('playerControl.deleteFailedMessage')
    showToast({ title: t('playerControl.deleteFailedTitle'), message, mode: 'error' })
  }
}

onMounted(async () => {
  await loadLookups()
  if (categories.value.length) {
    selectedCategory.value = categories.value[0].id
    loadPlayers()
  }
})
</script>

<template>
  <div class="min-h-screen bg-background text-on-surface lg:flex lg:items-stretch">
    <DashboardSidebar active-item="player-control" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <main class="pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background transition-all duration-300 lg:flex-1">
      <div class="flex gap-8 p-8">
        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="mb-8 flex items-start justify-between">
            <div>
              <h1 class="font-headline text-4xl font-black text-on-surface tracking-tight uppercase leading-none">{{ t('playerControl.pageTitle') }}</h1>
              <p class="text-on-surface-variant font-medium text-sm mt-2 opacity-80">{{ t('playerControl.pageSubtitle') }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-black">{{ t('playerControl.squadCategory') }}</label>
              <select v-model="selectedCategory" @change="loadPlayers" class="bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold rounded px-4 py-2.5 focus:ring-1 focus:ring-primary-fixed min-w-[160px] uppercase tracking-wider">
                <option value="" disabled>{{ t('playerControl.selectCategory') }}</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>

          <div v-if="isLoading" class="flex items-center justify-center py-20">
            <span class="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest">{{ t('playerControl.loading') }}</span>
          </div>

          <div v-else-if="!selectedCategory" class="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span class="material-symbols-outlined text-5xl mb-4 opacity-30">manage_accounts</span>
            <p class="text-sm font-bold uppercase tracking-wider">{{ t('playerControl.selectCategoryPrompt') }}</p>
          </div>

          <div v-else-if="!players.length" class="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span class="material-symbols-outlined text-5xl mb-4 opacity-30">sentiment_neutral</span>
            <p class="text-sm font-bold uppercase tracking-wider">{{ t('playerControl.noPlayers') }}</p>
          </div>

          <div v-else class="flex-1 overflow-y-auto pb-8 no-scrollbar">
            <table class="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr class="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">
                  <th class="px-4 pb-2" colspan="2">{{ t('playerControl.player') }}</th>
                  <th class="px-4 pb-2">{{ t('playerControl.jersey') }}</th>
                  <th class="px-4 pb-2">{{ t('playerControl.category') }}</th>
                  <th class="px-4 pb-2 text-right">{{ t('playerControl.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in players" :key="p.id"
                  class="bg-surface-container-low/40 hover:bg-surface-container-low transition-colors group">
                  <td class="px-4 py-3 border-y border-l border-outline-variant/5 w-14 rounded-l">
                    <div class="w-10 h-10 rounded-full border-2 border-outline-variant/10 overflow-hidden bg-surface-container-highest flex items-center justify-center">
                      <span class="font-headline font-black text-sm text-primary">{{ p.jersey }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <p class="font-headline font-bold text-on-surface text-sm uppercase leading-tight">{{ p.name }}</p>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <span class="text-[10px] text-on-surface-variant font-mono">#{{ p.jersey }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-outline-variant/5">
                    <span class="bg-surface-container-highest px-3 py-1.5 rounded text-[11px] font-bold text-on-surface-variant border border-outline-variant/20 uppercase tracking-tighter">{{ categoryName(selectedCategory) }}</span>
                  </td>
                  <td class="px-4 py-3 border-y border-r border-outline-variant/5 text-right rounded-r">
                    <div class="inline-flex items-center gap-2">
                      <button type="button" class="pressable p-2 rounded hover:bg-surface-container-high transition-colors" :title="t('playerControl.update')" @click="openActionModal(p, 'update')">
                        <span class="material-symbols-outlined text-lg text-primary">edit</span>
                      </button>
                      <button type="button" class="pressable p-2 rounded hover:bg-error/10 transition-colors" :title="t('playerControl.delete')" @click="openActionModal(p, 'select')">
                        <span class="material-symbols-outlined text-lg text-error">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- LOADING MODAL (shown while player details are being fetched) -->
  <Teleport to="body">
    <div v-if="isEditLoading" class="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md"></div>
      <div class="relative flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-surface-container-low px-10 py-12 shadow-2xl">
        <span class="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        <span class="text-sm font-bold text-slate-300">{{ t('playerControl.loadingPlayerDetails') }}</span>
      </div>
    </div>
  </Teleport>

  <!-- UPDATE LOADING MODAL (shown while the update is being saved) -->
  <Teleport to="body">
    <div v-if="isUpdateSubmitting" class="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md"></div>
      <div class="relative flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-surface-container-low px-10 py-12 shadow-2xl">
        <span class="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        <span class="text-sm font-bold text-slate-300">{{ t('playerControl.updatingPlayer') }}</span>
      </div>
    </div>
  </Teleport>

  <!-- DELETE CONFIRMATION MODAL -->
  <Teleport to="body">
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="showDeleteConfirm = false"></div>
      <div class="relative w-full max-w-md overflow-hidden rounded-xl border border-error/20 bg-surface-container-low shadow-2xl">
        <div class="flex flex-col items-center p-6 text-center">
          <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/15">
            <span class="material-symbols-outlined text-3xl text-error">warning</span>
          </div>
          <h2 class="font-headline text-lg font-black uppercase tracking-tight text-on-surface">{{ t('playerControl.deleteConfirmTitle') }}</h2>
          <p class="mt-3 text-sm text-on-surface-variant">
            {{ t('playerControl.deleteConfirmMessage', { name: actionTarget?.name || t('playerControl.playerFallback') }) }}
          </p>
        </div>
        <div class="flex gap-3 border-t border-white/5 p-4">
          <button
            type="button"
            @click="showDeleteConfirm = false"
            class="flex-1 rounded-md py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            @click="confirmDelete"
            class="flex-1 rounded-md bg-error py-3 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-error/90"
          >
            <span class="material-symbols-outlined mr-1 align-middle text-sm">delete_forever</span>
            {{ t('playerControl.confirmDelete') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ACTION MODAL (select / update) -->
  <Teleport to="body">
    <div v-if="showActionModal" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="closeActionModal"></div>
      <div class="relative w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-surface-container-low shadow-2xl">
        <div class="border-b border-white/5 p-6">
          <div class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{{ actionMode === 'update' ? t('playerControl.updateTitle') : t('playerControl.playerActionsTitle') }}</div>
          <h2 class="text-xl font-black uppercase tracking-tight text-on-surface">{{ actionTarget?.name || t('playerControl.playerFallback') }}</h2>
        </div>
        <div v-if="actionMode === 'select'" class="p-6">
          <p class="mb-4 text-sm text-on-surface-variant">{{ t('playerControl.chooseAction') }}</p>
          <div class="flex flex-wrap gap-3">
            <button type="button" class="rounded-md bg-primary-container px-4 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary-fixed" @click="openActionModal(actionTarget, 'update')">{{ t('playerControl.update') }}</button>
            <button type="button" class="rounded-md bg-error/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-error hover:bg-error/30" @click="openDeleteConfirm">{{ t('common.delete') }}</button>
          </div>
        </div>
        <div v-else-if="actionMode === 'update'" class="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          <div class="flex items-center gap-4">
            <label
              class="group relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-700 bg-surface-container-lowest transition-colors hover:border-primary/50"
            >
              <img v-if="photoPreview" :src="photoPreview" alt="Player photo" class="h-full w-full rounded-xl object-cover" />
              <template v-else>
                <span class="material-symbols-outlined text-slate-600 transition-colors group-hover:text-primary">add_a_photo</span>
                <span class="mt-1 text-[8px] font-bold uppercase text-slate-500">{{ t('playerControl.profilePhoto') }}</span>
              </template>
              <input class="absolute inset-0 cursor-pointer opacity-0" type="file" accept=".jpg,.jpeg,.png,.webp" @change="onPhotoChange" />
            </label>
            <div class="text-[10px] text-slate-500">
              <div class="font-bold uppercase tracking-wider text-slate-400">{{ t('playerControl.profilePhoto') }}</div>
              <div>{{ t('playerControl.photoHint') }}</div>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.firstName') }}</label>
              <input v-model="updateForm.firstName" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.secondName') }}</label>
              <input v-model="updateForm.secondName" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.lastName') }}</label>
              <input v-model="updateForm.lastName" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.gender') }}</label>
              <select v-model="updateForm.gender" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white">
                <option value="Male">{{ t('playerControl.male') }}</option>
                <option value="Female">{{ t('playerControl.female') }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.birthDate') }}</label>
              <input v-model="updateForm.birthDate" type="date" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.age') }}</label>
              <div v-if="playerAge !== null" class="rounded-md bg-surface-container-lowest px-3 py-2 text-sm font-bold text-white">
                {{ playerAge }} {{ t('playerControl.yrs') }} — {{ isMinor ? t('playerControl.minor') : t('playerControl.adult') }}
              </div>
              <div v-else class="rounded-md bg-surface-container-lowest px-3 py-2 text-sm text-slate-600">-</div>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.primaryPosition') }}</label>
              <select v-model="updateForm.primaryPositionID" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white">
                <option value="" disabled>{{ t('playerControl.select') }}</option>
                <option v-for="pos in positions" :key="pos.id" :value="Number(pos.id)">{{ pos.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.secondaryPosition') }}</label>
              <select v-model="updateForm.secondaryPositionID" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white">
                <option value="">{{ t('playerControl.select') }}</option>
                <option v-for="pos in positions" :key="pos.id" :value="Number(pos.id)">{{ pos.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.preferredFoot') }}</label>
              <select v-model="updateForm.preferredFootID" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white">
                <option v-for="foot in preferredFeetOptions" :key="foot.id" :value="Number(foot.id)">{{ foot.name }}</option>
              </select>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.jerseyNumber') }}</label>
              <input v-model="updateForm.jerseyNumber" type="number" min="1" max="99" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.ageCategory') }}</label>
              <select v-model="updateForm.categoryID" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white">
                <option v-for="cat in categories" :key="cat.id" :value="Number(cat.id)">{{ cat.name }}</option>
              </select>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.bloodType') }}</label>
              <select v-model="updateForm.bloodTypeID" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white">
                <option v-for="bt in bloodTypes" :key="bt.id" :value="Number(bt.id)">{{ bt.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.allergies') }}</label>
              <input v-model="updateForm.allergies" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
          </div>

          <div>
            <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.medicalNotes') }}</label>
            <textarea v-model="updateForm.medicalNotes" rows="2" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white"></textarea>
          </div>

          <div>
            <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.residentialAddress') }}</label>
            <textarea v-model="updateForm.address" rows="2" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white"></textarea>
          </div>

          <div v-if="isAdult" class="rounded-md bg-primary/10 border border-primary/20 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-primary">
            {{ t('playerControl.adultContactHint') }}
          </div>
          <div v-else-if="isMinor" class="rounded-md bg-secondary/10 border border-secondary/20 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-secondary">
            {{ t('playerControl.minorGuardianHint') }}
          </div>

          <div v-if="!isMinor" class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.phoneNumber') }}</label>
              <input v-model="updateForm.phone" type="tel" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.emailAddress') }}</label>
              <input v-model="updateForm.email" type="email" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
          </div>

          <div v-if="isMinor" class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.guardianName') }}</label>
              <input v-model="updateForm.guardianFullName" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('playerControl.guardianPhone') }}</label>
              <input v-model="updateForm.guardianPhone" type="tel" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white" />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 border-t border-white/5 bg-surface-container-high/50 p-6">
          <button type="button" class="rounded-md px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5" @click="closeActionModal">{{ t('common.cancel') }}</button>
          <button v-if="actionMode === 'update'" type="button" :disabled="isUpdateSubmitting" class="rounded-md bg-primary-container px-4 py-2 text-[10px] font-black uppercase tracking-widest text-on-primary-fixed transition-opacity disabled:cursor-not-allowed disabled:opacity-60" @click="submitUpdate">{{ isUpdateSubmitting ? t('common.saving') : t('common.save') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>

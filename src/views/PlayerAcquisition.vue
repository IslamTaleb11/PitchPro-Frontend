<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSidebar from '../features/dashboard/components/DashboardSidebar.vue'
import StaffTopbar from '../features/staff-management/components/StaffTopbar.vue'
import { useUiToast } from '../composables/useUiToast'
import { lookupService } from '../services/lookupService'
import { playerService } from '../services/playerService'
import imageCompression from 'browser-image-compression'

const { showToast } = useUiToast()
const { t: $t, locale } = useI18n()

// Layout State
const isSidebarOpen = ref(true)

// Lookups Data
const bloodTypes = ref([])
const categories = ref([])
const positions = ref([])
const preferredFeetOptions = ref([])

// Form Inputs State
const photoPreview = ref('')
const photoFile = ref(null)

const fullName = ref('')
const dateOfBirth = ref('')
const gender = ref('')
const fitnessLevel = ref(95)
const readinessStatus = ref('fit') // 'fit' or 'sidelined'
const primaryPosition = ref('')   // stores ID
const secondaryPosition = ref('') // stores ID
const preferredFoot = ref('')     // stores ID
const jerseyNumber = ref('')
const bloodType = ref('')         // stores ID
const allergies = ref('')
const medicalNotes = ref('')
const phoneNumber = ref('')
const emailAddress = ref('')
const residentialAddress = ref('')
const ageCategory = ref('')       // stores ID
const guardianName = ref('')
const guardianPhone = ref('')

// Age calculation from date of birth
const playerAge = computed(() => {
  if (!dateOfBirth.value) return null
  const today = new Date()
  const dob = new Date(dateOfBirth.value)
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
})

const isMinor = computed(() => playerAge.value !== null && playerAge.value < 18)
const isAdult = computed(() => playerAge.value !== null && playerAge.value >= 18)

// Load Dynamic lookups
onMounted(async () => {
  try {
    const [bloodRes, catRes, posRes, feetRes] = await Promise.allSettled([
      lookupService.getBloodTypes(),
      lookupService.getCategories(),
      lookupService.getPositions(),
      lookupService.getPreferredFeet()
    ])

    if (bloodRes.status === 'fulfilled') {
      bloodTypes.value = normalizeLookupArray(bloodRes.value.data)
      if (bloodTypes.value.length) {
        bloodType.value = bloodTypes.value[0].id
      }
    }
    if (catRes.status === 'fulfilled') {
      categories.value = normalizeLookupArray(catRes.value.data)
      if (categories.value.length) {
        ageCategory.value = categories.value[0].id
      }
    }
    if (posRes.status === 'fulfilled') {
      positions.value = normalizeLookupArray(posRes.value.data)
      if (positions.value.length) {
        primaryPosition.value = positions.value[0].id
        secondaryPosition.value = ''
      }
    }
    if (feetRes.status === 'fulfilled') {
      preferredFeetOptions.value = normalizeLookupArray(feetRes.value.data)
      if (preferredFeetOptions.value.length) {
        preferredFoot.value = preferredFeetOptions.value[0].id
      }
    }
  } catch (err) {
    console.error('Lookup load error:', err)
  }
})

// Normalization Helpers to match PitchPro standard
function normalizeLookupItem(item) {
  if (!item) return { id: 'Unknown', name: 'Unknown' }
  if (typeof item === 'string' || typeof item === 'number') {
    return { id: item, name: String(item) }
  }
  const idCandidates = ['id', 'Id', 'ID', 'value', 'bloodTypeId', 'bloodTypeID', 'categoryId', 'categoryID']
  const nameCandidates = ['name', 'Name', 'label', 'title', 'bloodTypeName', 'categoryName']
  let id = null
  let name = null

  for (const key of idCandidates) {
    if (item[key] !== undefined && item[key] !== null) {
      id = item[key]
      break
    }
  }
  for (const key of nameCandidates) {
    if (item[key] !== undefined && item[key] !== null) {
      name = item[key]
      break
    }
  }
  return {
    ...item,
    id: id ?? name ?? 'Unknown',
    name: name ?? String(id ?? 'Unknown')
  }
}

function normalizeLookupArray(data) {
  let array = data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    array = data.data || data.items || data.result || data.value || data.$values || []
  }
  if (!Array.isArray(array)) return []
  return array.map(normalizeLookupItem).filter(item => item.id !== 'Unknown')
}

// Photo Change Handler with Compression
async function onPhotoChange(event) {
  const file = event.target.files[0]
  if (!file) return

  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    showToast({ title: $t('common.invalidFile'), message: $t('common.invalidFileMsg'), mode: 'error', duration: 4000 })
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast({ title: $t('common.fileTooLarge'), message: $t('common.fileTooLargeMsg'), mode: 'error', duration: 4000 })
    return
  }

  try {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true
    }
    const compressedFile = await imageCompression(file, options)
    photoFile.value = compressedFile
    photoPreview.value = URL.createObjectURL(compressedFile)
  } catch (error) {
    console.error('Compression error, using raw file:', error)
    photoFile.value = file
    photoPreview.value = URL.createObjectURL(file)
  }
}

function removePhoto() {
  photoFile.value = null
  photoPreview.value = ''
}

// Form state updates
function setReadiness(status) {
  readinessStatus.value = status
  if (status === 'fit') {
    fitnessLevel.value = Math.max(85, fitnessLevel.value)
  } else {
    fitnessLevel.value = Math.min(45, fitnessLevel.value)
  }
}

function setFoot(foot) {
  preferredFoot.value = foot
}

// Submit Operation
async function submitPlayerAcquisition() {
  // Validate required fields
  if (!fullName.value.trim() || !dateOfBirth.value || !gender.value || !jerseyNumber.value || !residentialAddress.value.trim()) {
    showToast({
      title: $t('common.missingFields'),
      message: $t('common.pleaseFill'),
      mode: 'error',
      duration: 4500
    })
    return
  }

  // Validate adult contact fields
  if (isAdult.value && (!phoneNumber.value.trim() || !emailAddress.value.trim())) {
    showToast({
      title: $t('common.missingFields'),
      message: $t('common.pleaseFill'),
      mode: 'error',
      duration: 4500
    })
    return
  }

  // Validate minor guardian fields
  if (isMinor.value && (!guardianName.value.trim() || !guardianPhone.value.trim())) {
    showToast({
      title: $t('common.missingFields'),
      message: $t('common.pleaseFill'),
      mode: 'error',
      duration: 4500
    })
    return
  }

  try {
    showToast({
      title: $t('playerAcquisition.syncingDossier'),
      message: $t('playerAcquisition.syncingDossierMsg'),
      mode: 'loading',
      duration: 0
    })

    // Split fullName into first / second / last
    const nameParts = fullName.value.trim().split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0]
    const secondName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null

    const formData = new FormData()

    // 01. Identity (→ persons)
    formData.append('FirstName', firstName)
    if (secondName) formData.append('SecondName', secondName)
    formData.append('LastName', lastName)
    formData.append('Gender', gender.value === 'Male' ? 'true' : 'false')
    formData.append('BirthDate', dateOfBirth.value)
    formData.append('ClubID', '7')

    // 03. Technical Profile (→ players)
    formData.append('Photo', photoFile.value)
    formData.append('PrimaryPositionID', String(primaryPosition.value))
    if (secondaryPosition.value) formData.append('SecondaryPositionID', String(secondaryPosition.value))
    formData.append('PreferredFootID', String(preferredFoot.value))
    formData.append('JerseyNumber', String(jerseyNumber.value))
    formData.append('Address', residentialAddress.value || '')
    formData.append('CategoryID', String(ageCategory.value))

    // 04. Medical Dossier (→ players_medical_dossiers)
    formData.append('BloodTypeID', String(bloodType.value))
    if (allergies.value) formData.append('Allergies', allergies.value)
    if (medicalNotes.value) formData.append('MedicalNotes', medicalNotes.value)

    // 05/06. Adult or Minor details
    if (isAdult.value) {
      formData.append('Phone', phoneNumber.value)
      formData.append('Email', emailAddress.value)
    } else {
      formData.append('GuardianFullName', guardianName.value)
      formData.append('GuardianPhone', guardianPhone.value)
    }

    const response = await playerService.createPlayer(formData)

    showToast({
      title: $t('playerAcquisition.dossierInitialized'),
      message: response.data?.message || $t('playerAcquisition.registeredSuccess', { jerseyNumber: jerseyNumber.value }),
      mode: 'success',
      duration: 3500
    })

    // Reset form
    fullName.value = ''
    dateOfBirth.value = ''
    gender.value = ''
    fitnessLevel.value = 95
    readinessStatus.value = 'fit'
    primaryPosition.value = positions.value.length ? positions.value[0].id : ''
    secondaryPosition.value = ''
    preferredFoot.value = preferredFeetOptions.value.length ? preferredFeetOptions.value[0].id : ''
    jerseyNumber.value = ''
    bloodType.value = bloodTypes.value.length ? bloodTypes.value[0].id : ''
    allergies.value = ''
    medicalNotes.value = ''
    phoneNumber.value = ''
    emailAddress.value = ''
    residentialAddress.value = ''
    ageCategory.value = categories.value.length ? categories.value[0].id : ''
    guardianName.value = ''
    guardianPhone.value = ''
    removePhoto()

  } catch (error) {
    const message = error.response?.data?.message || error.message || $t('playerAcquisition.networkError')
    showToast({
      title: $t('playerAcquisition.syncFailure'),
      message,
      mode: 'error',
      duration: 4000
    })
  }
}
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-background text-on-surface lg:flex lg:items-stretch">
    <!-- Club Sidebar Navigation -->
    <DashboardSidebar active-item="players" :is-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />
    
    <!-- Club Top Navigation Header -->
    <StaffTopbar :sidebar-open="isSidebarOpen" @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <!-- Main Workspace Container -->
    <main
      :class="[
        'pt-24 h-[calc(100vh-5rem)] overflow-y-auto bg-background p-8 transition-all duration-300 lg:flex-1',
        'ml-0',
      ]"
    >
      <!-- Sub-Header and Status Bar -->
      <div class="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 class="font-headline text-4xl font-black italic tracking-tighter text-white mb-2 uppercase">
            {{ $t('playerAcquisition.title') }}
          </h1>
        </div>
      </div>

      <!-- Player Operations Form -->
      <form class="space-y-8" @submit.prevent="submitPlayerAcquisition">
        
        <!-- Bento Row 1: Identity -->
        <div class="grid grid-cols-12 gap-6">
          
          <!-- Section 01: Identity & Access Card (full width) -->
          <div class="col-span-12 bg-surface-container-low p-8 rounded-lg relative overflow-hidden group border border-white/5 shadow-2xl">
            <div class="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none text-white">
              <span class="material-symbols-outlined text-[130px]">fingerprint</span>
            </div>
            <div class="flex items-center gap-4 mb-6">
              <div class="h-6 w-1 bg-green-400"></div>
              <h2 class="font-headline text-xl font-bold uppercase tracking-tight text-white">{{ $t('playerAcquisition.identityAccess') }}</h2>
            </div>
            <div class="flex flex-col md:flex-row gap-8">
              
              <!-- Picture Uploader & Preview -->
              <div class="flex-shrink-0">
                <label class="group relative flex h-40 w-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-surface-container-lowest transition-colors hover:border-green-400/50">
                  <img v-if="photoPreview" :src="photoPreview" alt="Player dossier preview" class="h-full w-full rounded-lg object-cover" />
                  <template v-else>
                    <span class="material-symbols-outlined text-4xl text-neutral-600 mb-2 transition-colors group-hover:text-green-400">add_a_photo</span>
                    <span class="font-label text-[10px] text-neutral-500 uppercase font-black">{{ $t('playerAcquisition.uploadProfile') }}</span>
                  </template>
                  <input class="absolute inset-0 cursor-pointer opacity-0" type="file" accept=".jpg,.jpeg,.png,.webp" @change="onPhotoChange" />
                </label>
                <button v-if="photoPreview" type="button" @click="removePhoto" class="mt-2 w-full text-center text-[10px] font-black uppercase text-red-400 hover:text-red-300 flex items-center justify-center gap-1">
                  <span class="material-symbols-outlined text-sm">close</span> {{ $t('playerAcquisition.removePhoto') }}
                </button>
              </div>

              <!-- Identity Input Grid -->
              <div class="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="col-span-2">
                  <label class="block font-label text-[10px] text-neutral-500 uppercase font-black mb-2 tracking-widest">{{ $t('playerAcquisition.fullName') }}</label>
                  <input v-model="fullName" required class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-sm placeholder-neutral-600 focus:ring-2 focus:ring-green-400/40" :placeholder="$t('playerAcquisition.playerNamePlaceholder')" type="text"/>
                </div>
                <div>
                  <label class="block font-label text-[10px] text-neutral-500 uppercase font-black mb-2 tracking-widest">{{ $t('playerAcquisition.dateOfBirth') }}</label>
                  <input v-model="dateOfBirth" required class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-sm focus:ring-2 focus:ring-green-400/40 scheme-dark" type="date"/>
                  <div v-if="playerAge !== null" class="mt-2 flex items-center gap-2">
                    <span class="font-label text-[10px] uppercase font-black text-neutral-500">{{ $t('playerAcquisition.age') }}:</span>
                    <span class="font-headline text-sm font-black" :class="isMinor ? 'text-yellow-400' : 'text-green-400'">
                      {{ playerAge }} {{ $t('playerAcquisition.yrs') }} — {{ isMinor ? $t('playerAcquisition.minor') : $t('playerAcquisition.adult') }}
                    </span>
                  </div>
                </div>
                <div>
                  <label class="block font-label text-[10px] text-neutral-500 uppercase font-black mb-2 tracking-widest">{{ $t('playerAcquisition.gender') }}</label>
                  <select v-model="gender" required class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-sm focus:ring-2 focus:ring-green-400/40 uppercase font-bold">
                    <option value="">{{ $t('playerAcquisition.select') }}</option>
                    <option value="Male">{{ $t('playerAcquisition.male') }}</option>
                    <option value="Female">{{ $t('playerAcquisition.female') }}</option>
                  </select>
                </div>
              </div>

            </div>
          </div>

        </div>

        <!-- Bento Row 2: Technical Profile & Medical Dossier -->
        <div class="grid grid-cols-12 gap-6">
          
          <!-- Section 03: Technical Profile -->
          <div class="col-span-12 lg:col-span-7 bg-surface-container-low p-8 rounded-lg border border-white/5 shadow-2xl">
            <div class="flex items-center gap-4 mb-6">
              <div class="h-6 w-1 bg-green-400"></div>
              <h2 class="font-headline text-xl font-bold uppercase tracking-tight text-white">02. {{ $t('playerAcquisition.technicalProfile') }}</h2>
            </div>
            <div class="grid grid-cols-2 gap-6">
              <div>
                <label class="block font-label text-[10px] text-neutral-500 uppercase font-black mb-2 tracking-widest">{{ $t('playerAcquisition.primaryPosition') }}</label>
                <select v-model="primaryPosition" required class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-sm focus:ring-2 focus:ring-green-400/40 font-bold uppercase">
                  <option value="" disabled>{{ $t('playerAcquisition.select') }}</option>
                  <option v-for="pos in positions" :key="pos.id" :value="pos.id">{{ pos.name }}</option>
                </select>
              </div>
              <div>
                <label class="block font-label text-[10px] text-neutral-500 uppercase font-black mb-2 tracking-widest">{{ $t('playerAcquisition.secondaryPosition') }}</label>
                <select v-model="secondaryPosition" class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-sm focus:ring-2 focus:ring-green-400/40 font-bold uppercase">
                  <option value="">{{ $t('playerAcquisition.select') }}</option>
                  <option v-for="pos in positions" :key="pos.id" :value="pos.id">{{ pos.name }}</option>
                </select>
              </div>
              <div>
                <label class="block font-label text-[10px] text-neutral-500 uppercase font-black mb-2 tracking-widest">{{ $t('playerAcquisition.preferredFoot') }}</label>
                <div class="flex gap-2">
                  <button
                    v-for="foot in preferredFeetOptions"
                    :key="foot.id"
                    type="button"
                    @click="setFoot(foot.id)"
                    :class="['flex-1 py-3 text-[10px] font-black uppercase rounded-sm transition-all', preferredFoot === foot.id ? 'bg-green-400 text-slate-900' : 'bg-surface-container-lowest text-neutral-400 hover:text-white']"
                  >{{ foot.name }}</button>
                </div>
              </div>
              <div>
                <label class="block font-label text-[10px] text-neutral-500 uppercase font-black mb-2 tracking-widest">{{ $t('playerAcquisition.jerseyNumber') }}</label>
                <input v-model.number="jerseyNumber" required class="w-full bg-surface-container-lowest border-none text-white p-2 rounded-md font-['Space_Grotesk'] text-xl font-black text-center focus:ring-2 focus:ring-green-400/40" placeholder="00" type="number" min="1" max="99"/>
              </div>
            </div>
          </div>

          <!-- Section 04: Medical Dossier -->
          <div class="col-span-12 lg:col-span-5 bg-surface-container-high p-8 rounded-lg border border-white/5 shadow-2xl">
            <div class="flex items-center gap-4 mb-6">
              <div class="h-6 w-1 bg-red-400"></div>
              <h2 class="font-headline text-xl font-bold uppercase tracking-tight text-white">03. {{ $t('playerAcquisition.medicalDossier') }}</h2>
            </div>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block font-label text-[10px] text-neutral-500 uppercase font-black mb-2 tracking-widest">{{ $t('playerAcquisition.bloodType') }}</label>
                  <select v-model="bloodType" class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-sm focus:ring-2 focus:ring-green-400/40 font-bold uppercase">
                    <option v-for="type in bloodTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="block font-label text-[10px] text-neutral-500 uppercase font-black mb-2 tracking-widest">{{ $t('playerAcquisition.allergies') }}</label>
                  <input v-model="allergies" class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-sm placeholder-neutral-600 focus:ring-2 focus:ring-green-400/40 uppercase font-bold" :placeholder="$t('playerAcquisition.allergiesPlaceholder')" type="text"/>
                </div>
              </div>
              <div>
                <label class="block font-label text-[10px] text-neutral-500 uppercase font-black mb-2 tracking-widest">{{ $t('playerAcquisition.medicalNotes') }}</label>
                <textarea v-model="medicalNotes" class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-xs resize-none focus:ring-2 focus:ring-green-400/40" :placeholder="$t('playerAcquisition.medicalNotesPlaceholder')" rows="3"></textarea>
              </div>
            </div>
          </div>

        </div>

        <!-- Bento Row 3: Contacts & Admin Setup -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <!-- Section 04: Contact Terminal -->
          <div class="bg-surface-container-low p-5 rounded-lg border border-white/5 shadow-2xl">
            <div class="flex items-center gap-4 mb-4">
              <div class="h-6 w-1 bg-green-400"></div>
              <h2 class="font-headline text-xl font-bold uppercase tracking-tight text-white">04. {{ $t('playerAcquisition.contactTerminal') }}</h2>
            </div>
            <!-- Note: date of birth required -->
            <div v-if="!dateOfBirth" class="mb-4 flex items-center gap-2 bg-slate-400/10 border border-slate-400/20 rounded-md px-4 py-2">
              <span class="material-symbols-outlined text-slate-400 text-sm">lock</span>
              <span class="font-label text-[10px] uppercase font-black text-slate-400">{{ $t('playerAcquisition.dobRequiredContact') }}</span>
            </div>
            <div v-else-if="isMinor" class="mb-4 flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-md px-4 py-2">
              <span class="material-symbols-outlined text-yellow-400 text-sm">info</span>
              <span class="font-label text-[10px] uppercase font-black text-yellow-400">{{ $t('playerAcquisition.minorContactDisabled') }}</span>
            </div>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block font-label text-[10px] uppercase font-black mb-2 tracking-widest" :class="(!dateOfBirth || isMinor) ? 'text-neutral-600' : 'text-neutral-500'">{{ $t('playerAcquisition.phoneNumber') }}</label>
                  <input v-model="phoneNumber" :disabled="!dateOfBirth || isMinor" :required="dateOfBirth && !isMinor" class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-sm focus:ring-2 focus:ring-green-400/40 disabled:opacity-30 disabled:cursor-not-allowed" placeholder="+XX XXX XXX XXX" type="tel"/>
                </div>
                <div>
                  <label class="block font-label text-[10px] uppercase font-black mb-2 tracking-widest" :class="(!dateOfBirth || isMinor) ? 'text-neutral-600' : 'text-neutral-500'">{{ $t('playerAcquisition.emailAddress') }}</label>
                  <input v-model="emailAddress" :disabled="!dateOfBirth || isMinor" :required="dateOfBirth && !isMinor" class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-sm focus:ring-2 focus:ring-green-400/40 disabled:opacity-30 disabled:cursor-not-allowed" placeholder="PLAYER@PITCHPRO.COM" type="email"/>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 05: Administrative Setup -->
          <div class="bg-surface-container-low p-8 rounded-lg border border-white/5 shadow-2xl">
            <div class="flex items-center gap-4 mb-6">
              <div class="h-6 w-1 bg-green-400"></div>
              <h2 class="font-headline text-xl font-bold uppercase tracking-tight text-white">05. {{ $t('playerAcquisition.administrative') }}</h2>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block font-label text-[10px] text-neutral-500 uppercase font-black mb-2 tracking-widest">{{ $t('playerAcquisition.ageCategory') }}</label>
                <select v-model="ageCategory" required class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-sm focus:ring-2 focus:ring-green-400/40 font-bold uppercase">
                  <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
                </select>
              </div>
              <div>
                <label class="block font-label text-[10px] text-neutral-500 uppercase font-black mb-2 tracking-widest">{{ $t('playerAcquisition.residentialAddress') }}</label>
                <textarea v-model="residentialAddress" required class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-xs resize-none focus:ring-2 focus:ring-green-400/40" :placeholder="$t('playerAcquisition.addressPlaceholder')" rows="2"></textarea>
              </div>
              <!-- Note: date of birth required for guardian fields -->
              <div v-if="!dateOfBirth" class="flex items-center gap-2 bg-slate-400/10 border border-slate-400/20 rounded-md px-4 py-2">
                <span class="material-symbols-outlined text-slate-400 text-sm">lock</span>
                <span class="font-label text-[10px] uppercase font-black text-slate-400">{{ $t('playerAcquisition.dobRequiredGuardian') }}</span>
              </div>
              <div v-else-if="isAdult" class="flex items-center gap-2 bg-green-400/10 border border-green-400/20 rounded-md px-4 py-2">
                <span class="material-symbols-outlined text-green-400 text-sm">info</span>
                <span class="font-label text-[10px] uppercase font-black text-green-400">{{ $t('playerAcquisition.adultGuardianNotRequired') }}</span>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block font-label text-[10px] uppercase font-black mb-2 tracking-widest" :class="(!dateOfBirth || isAdult) ? 'text-neutral-600' : 'text-neutral-500'">{{ $t('playerAcquisition.guardianName') }}</label>
                  <input v-model="guardianName" :disabled="!dateOfBirth || isAdult" :required="isMinor" class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-sm focus:ring-2 focus:ring-green-400/40 uppercase font-bold disabled:opacity-30 disabled:cursor-not-allowed" placeholder="FULL NAME..." type="text"/>
                </div>
                <div>
                  <label class="block font-label text-[10px] uppercase font-black mb-2 tracking-widest" :class="(!dateOfBirth || isAdult) ? 'text-neutral-600' : 'text-neutral-500'">{{ $t('playerAcquisition.guardianPhone') }}</label>
                  <input v-model="guardianPhone" :disabled="!dateOfBirth || isAdult" :required="isMinor" class="w-full bg-surface-container-lowest border-none text-white p-3 rounded-md font-body text-sm focus:ring-2 focus:ring-green-400/40 disabled:opacity-30 disabled:cursor-not-allowed" placeholder="+XX XXX XXX XXX" type="tel"/>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Form Commit Button -->
        <div class="pt-6 pb-24">
          <button class="w-full py-5 bg-gradient-to-r from-green-400 to-green-300 text-slate-950 font-headline text-xl font-black uppercase tracking-[0.2em] rounded-md group relative overflow-hidden shadow-lg transition-transform active:scale-[0.99]" type="submit">
            <span class="relative z-10 flex items-center justify-center gap-3">
              <span class="material-symbols-outlined text-xl font-bold">person_add</span>
              {{ $t('playerAcquisition.registerPlayer') }}
            </span>
            <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
          <p class="text-center mt-6 text-neutral-500 font-label text-[9px] uppercase font-bold tracking-widest">
            {{ $t('playerAcquisition.systemSecure') }}
          </p>
        </div>

      </form>
    </main>
  </div>
</template>

<style scoped>
/* Chrome, Safari, Edge, Opera: disable arrows on number input */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox: disable arrows on number input */
input[type=number] {
  -moz-appearance: textfield;
}

input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px var(--surface-container-lowest) inset !important;
  -webkit-text-fill-color: white !important;
  background-color: var(--surface-container-lowest) !important;
  color: white !important;
  border: none !important;
}

select:-webkit-autofill,
select:-webkit-autofill:hover,
select:-webkit-autofill:focus,
select:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px var(--surface-container-lowest) inset !important;
  -webkit-text-fill-color: white !important;
  background-color: var(--surface-container-lowest) !important;
  color: white !important;
  border: none !important;
}
</style>

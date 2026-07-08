<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiToast } from '../../../composables/useUiToast'
import { staffService } from '../../../services/staffService'
import { lookupService } from '../../../services/lookupService'
import { getCurrentClubIdFromJwt } from '../../../services/axiosConfig'
import imageCompression from 'browser-image-compression'

const emit = defineEmits(['deploy'])

const photoPreview = ref('')
const photoFile = ref(null)
const categoryDropdownOpen = ref(false)
const selectedCategories = ref([])
const bloodTypes = ref([])
const primaryRoles = ref([])
const roleClassifications = ref([])
const categories = ref([])
const firstName = ref('')
const secondName = ref('')
const lastName = ref('')
const gender = ref('Male')
onMounted(loadLookups)
const primaryRoleID = ref(null)
const roleClassificationID = ref(null)
const bloodTypeID = ref(null)
const allergies = ref('')
const medicalNotes = ref('')
const birthDate = ref('')
const email = ref('')
const password = ref('')
const phoneNumber = ref('')
const address = ref('')

const selectedCategoryNames = computed(() => {
  return selectedCategories.value
    .map((id) => categories.value.find((item) => item.id === id)?.name)
    .filter(Boolean)
})

const { showToast } = useUiToast()
const { t: $t } = useI18n()
const passwordValid = computed(() => {
  const pwd = password.value
  return pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)
})

const passwordChecks = computed(() => {
  const pwd = password.value
  return {
    length: pwd.length >= 8,
    lowercase: /[a-z]/.test(pwd),
    uppercase: /[A-Z]/.test(pwd),
    number: /\d/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)
  }
})

const filteredClassifications = computed(() => {
  if (!primaryRoleID.value) return roleClassifications.value;
  return roleClassifications.value.filter(c => {
    // Attempt to match the primary role ID property including staffPrimaryRoleID
    const pRoleId = c.staffPrimaryRoleID ?? c.staffPrimaryRoleId ?? c.primary_role_id ?? c.primaryRoleId ?? c.PrimaryRoleId ?? c.primaryRoleID ?? c.PrimaryRoleID ?? c.roleId ?? c.RoleID;
    
    // If the classification has no associated primary role, we might want to include it, 
    // but based on requirements, we filter strictly if it exists
    return pRoleId == null || String(pRoleId) === String(primaryRoleID.value);
  });
});

watch(filteredClassifications, (newVals) => {
  if (newVals.length > 0) {
    if (!newVals.some(c => c.id === roleClassificationID.value)) {
      roleClassificationID.value = newVals[0].id;
    }
  } else {
    roleClassificationID.value = null;
  }
});

// onMounted(loadLookups) // removed; custom onMounted handles clubId extraction and lookup loading

function normalizeLookupItem(item) {
  if (!item) return { id: 'Unknown', name: 'Unknown' };
  if (typeof item === 'string' || typeof item === 'number') {
    return { id: item, name: String(item) }
  }

  const idCandidates = ['id', 'Id', 'ID', 'value', 'key', 'lookupId', 'lookupID', 'bloodTypeId', 'bloodTypeID', 'roleId', 'roleID', 'classificationId', 'classificationID', 'categoryId', 'categoryID', 'roleClassificationId', 'roleClassificationID'];
  const nameCandidates = ['name', 'Name', 'label', 'title', 'description', 'text', 'value', 'nameAr', 'nameEn', 'bloodTypeName', 'roleName', 'classificationName', 'categoryName', 'roleClassificationName'];

  let id = null;
  let name = null;

  for (const key of idCandidates) {
    if (item[key] !== undefined && item[key] !== null) {
      id = item[key];
      break;
    }
  }
  for (const key of nameCandidates) {
    if (item[key] !== undefined && item[key] !== null) {
      name = item[key];
      break;
    }
  }

  if (id === null) {
    const idKey = Object.keys(item).find(k => k.toLowerCase().endsWith('id'));
    if (idKey) id = item[idKey];
  }
  if (name === null) {
    const nameKey = Object.keys(item).find(k => k.toLowerCase().endsWith('name'));
    if (nameKey) name = item[nameKey];
  }

  return {
    ...item,
    id: id ?? name ?? 'Unknown',
    name: name ?? String(id ?? 'Unknown')
  }
}

function normalizeLookupArray(data) {
  let array = data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    array = data.data || data.items || data.result || data.value || data.$values || [];
  }
  if (!Array.isArray(array)) {
    if (data && typeof data === 'object') {
       const vals = Object.values(data);
       if (vals.length > 0 && typeof vals[0] === 'object') {
          array = vals;
       } else {
          return [];
       }
    } else {
       return [];
    }
  }
  return array.map(normalizeLookupItem).filter(item => item.id !== 'Unknown')
}

async function loadLookups() {
  const results = await Promise.allSettled([
    lookupService.getBloodTypes(),
    lookupService.getPrimaryRoles(),
    lookupService.getRoleClassifications(),
    lookupService.getCategories()
  ]);

  if (results[0].status === 'fulfilled') bloodTypes.value = normalizeLookupArray(results[0].value.data);
  else console.error('Blood types error:', results[0].reason);

  if (results[1].status === 'fulfilled') primaryRoles.value = normalizeLookupArray(results[1].value.data);
  else console.error('Roles error:', results[1].reason);

  if (results[2].status === 'fulfilled') roleClassifications.value = normalizeLookupArray(results[2].value.data);
  else console.error('Classifications error:', results[2].reason);

  if (results[3].status === 'fulfilled') categories.value = normalizeLookupArray(results[3].value.data);
  else console.error('Categories error:', results[3].reason);

  if (!primaryRoleID.value && primaryRoles.value.length) {
    primaryRoleID.value = primaryRoles.value[0].id;
  }
  if (!roleClassificationID.value && filteredClassifications.value.length) {
    roleClassificationID.value = filteredClassifications.value[0].id;
  }
  if (!bloodTypeID.value && bloodTypes.value.length) {
    bloodTypeID.value = bloodTypes.value[0].id;
  }

  const failedCount = results.filter(r => r.status === 'rejected').length;
  if (failedCount > 0) {
    showToast({ title: $t('common.partialLoad'), message: `${$t('common.failedLoadLookups')} ${failedCount}`, mode: 'error', duration: 4000 });
  }
}

async function submitForm(event) {
  // Prevent default form submission
  event.preventDefault()
  // Build request payload from component refs
  const clubId = getCurrentClubIdFromJwt();
  if (!clubId) {
    showToast({ title: $t('common.error'), message: $t('common.missingClubId'), mode: 'error', duration: 4000 });
    return;
  }

  const data = {
    firstName: firstName.value,
    secondName: secondName.value,
    lastName: lastName.value,
    gender: gender.value,
    birthDate: birthDate.value,
    clubID: clubId,
    email: email.value,
    password: password.value,
    photo: photoFile.value,
    phoneNumber: phoneNumber.value,
    address: address.value,
    primaryRoleID: primaryRoleID.value,
    roleClassificationID: roleClassificationID.value,
    categoriesIDs: selectedCategories.value,
    bloodTypeID: bloodTypeID.value,
    allergies: allergies.value,
    medicalNotes: medicalNotes.value
  }

  const requiredFields = [
    { name: 'First name', value: firstName.value },
    { name: 'Last name', value: lastName.value },
    { name: 'Gender', value: gender.value },
    { name: 'Birth date', value: birthDate.value },
    { name: 'Email', value: email.value },
    { name: 'Password', value: password.value },
    { name: 'Phone number', value: phoneNumber.value },
    { name: 'Address', value: address.value },
    { name: 'Primary role', value: primaryRoleID.value },
    { name: 'Role classification', value: roleClassificationID.value },
    { name: 'Category', value: selectedCategories.value.length > 0 ? 'selected' : '' },
    { name: 'Photo', value: photoFile.value }
  ];
  const missing = requiredFields.filter(f => !f.value || f.value === '' );
  if (missing.length) {
    const names = missing.map(f => f.name).join(', ');
    showToast({ title: $t('common.missingFields'), message: `${$t('common.pleaseFill')}: ${names}`, mode: 'error', duration: 4000 });
    return;
  }
  // Password strength validation
  const pwd = password.value;
  const pwdChecks = {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
  };
  const pwdValid = Object.values(pwdChecks).every(v => v);
  if (!pwdValid) {
    showToast({
      title: $t('common.invalidPassword'),
      message: $t('common.passwordRequirements'),
      mode: 'error',
      duration: 4000
    });
    return;
  }
    try {
      showToast({ title: $t('common.deployingStaff'), message: $t('common.deployingStaffMsg'), mode: 'info', duration: 4000 })
      const response = await staffService.createStaff(data)
      const result = response.data
      showToast({ title: $t('common.staffCreated'), message: result.message || $t('common.staffCreatedMsg'), mode: 'success', duration: 3000 })
      emit('deploy')
      // Reset form fields
      firstName.value = ''
      secondName.value = ''
      lastName.value = ''
      gender.value = 'Male'
      birthDate.value = ''
      email.value = ''
      password.value = ''
      photoPreview.value = ''
      photoFile.value = null
      phoneNumber.value = ''
      address.value = ''
      primaryRoleID.value = primaryRoles.value?.[0]?.id || null
      roleClassificationID.value = roleClassifications.value?.[0]?.id || null
      selectedCategories.value = []
      bloodTypeID.value = bloodTypes.value?.[0]?.id || null
      allergies.value = ''
      medicalNotes.value = ''
    } catch (error) {
      const apiData = error.response?.data;
      if (apiData?.status === 'limit_reached') {
        showToast({
          title: $t('common.limitReachedTitle'),
          message: $t('common.limitReachedMessage'),
          mode: 'error',
          duration: 12000
        })
      } else {
        const errorMessage = getLocalizedStaffCreationError(apiData, error)
        showToast({ title: $t('common.error'), message: errorMessage, mode: 'error', duration: 4000 })
      }
    }
  }

function normalizeApiMessage(message) {
  if (typeof message === 'string') return message
  if (Array.isArray(message)) return message.join(' ')
  if (message && typeof message === 'object') {
    return Object.values(message)
      .flatMap((value) => {
        if (typeof value === 'string') return [value]
        if (Array.isArray(value)) return value
        if (value && typeof value === 'object') return Object.values(value)
        return []
      })
      .join(' ')
  }
  return String(message || '')
}

function getLocalizedStaffCreationError(apiData, error) {
  const rawMessage = normalizeApiMessage(apiData?.message || error.message || '')
    .trim()
  const lowerMsg = rawMessage.toLowerCase()

  if (
    lowerMsg.includes('already registered') ||
    lowerMsg.includes('already in use') ||
    (lowerMsg.includes('duplicate') && lowerMsg.includes('email')) ||
    lowerMsg.includes('email address') && lowerMsg.includes('already registered')
  ) {
    return $t('common.emailAlreadyTaken')
  }
  if (lowerMsg.includes('invalid email')) {
    return $t('common.invalidEmailFormat')
  }
  if (lowerMsg.includes('email is required')) {
    return $t('common.emailRequired')
  }

  return rawMessage || $t('common.staffCreateError')
}






function toggleCategory(categoryId) {
  if (selectedCategories.value.includes(categoryId)) {
    selectedCategories.value = selectedCategories.value.filter((item) => item !== categoryId)
    return
  }
  selectedCategories.value.push(categoryId)
}

async function onPhotoChange(event) {
  const file = event.target.files[0];
  if (file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast({ title: $t('common.invalidFile'), message: $t('common.invalidFileMsg'), mode: 'error', duration: 4000 });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast({ title: $t('common.fileTooLarge'), message: $t('common.fileTooLargeMsg'), mode: 'error', duration: 4000 });
      return;
    }

    try {
      const options = {
        maxSizeMB: 0.5, // 500kb
        maxWidthOrHeight: 1920,
        useWebWorker: true
      }
      const compressedFile = await imageCompression(file, options);
      photoFile.value = compressedFile;
      photoPreview.value = URL.createObjectURL(compressedFile);
    } catch (error) {
      console.error('Error compressing image:', error);
      photoFile.value = file;
      photoPreview.value = URL.createObjectURL(file);
    }
  }
}
</script>

<template>
  <section class="animate-in col-span-12 h-fit rounded-xl border-t border-white/5 bg-surface-container-low p-8 lg:col-span-5 xl:col-span-4">
    <div class="mb-8">
      <div class="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-green-400">{{ $t('staffManagement.onboardingTerminal') }}</div>
      <h2 class="font-headline text-2xl leading-none font-black uppercase tracking-tight text-white">{{ $t('staffManagement.createPersonnel') }}</h2>
    </div>

    <form class="space-y-8" @submit.prevent="submitForm">
      <div class="space-y-4">
        <div class="mb-2 flex items-center gap-2">
          <span class="h-3 w-1 rounded-full bg-green-400" />
          <h3 class="text-[10px] font-black uppercase tracking-widest text-white">{{ $t('staffManagement.identityAndAccess') }}</h3>
        </div>
        <div class="mb-4 flex items-center gap-4">
          <label
            class="group relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-surface-container-lowest transition-colors hover:border-green-400/50"
          >
            <img v-if="photoPreview" :src="photoPreview" alt="Staff photo" class="h-full w-full rounded-xl object-cover" />
            <template v-else>
              <span class="material-symbols-outlined text-slate-600 transition-colors group-hover:text-green-400">add_a_photo</span>
              <span class="mt-1 text-[8px] font-bold uppercase text-slate-500">{{ $t('staffManagement.photo') }}</span>
            </template>
            <input class="absolute inset-0 cursor-pointer opacity-0" type="file" accept=".jpg,.jpeg,.png,.webp" @change="onPhotoChange" />
          </label>
          <div class="flex-1 space-y-4">
            <div class="space-y-1">
              <div class="space-y-1">
  <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.firstName') }}</label>
  <input
    type="text"
    :placeholder="$t('staffManagement.firstNamePlaceholder')"
    required
    autocomplete="off"
    class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]"
    name="firstName"
    v-model="firstName" />
</div>
<div class="space-y-1">
  <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.secondName') }}</label>
  <input
    type="text"
    :placeholder="$t('staffManagement.secondNamePlaceholder')"
    autocomplete="off"
    class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]"
    name="secondName"
    v-model="secondName" />
</div>
<div class="space-y-1">
  <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.lastName') }}</label>
  <input
    type="text"
    :placeholder="$t('staffManagement.lastNamePlaceholder')"
    required
    autocomplete="off"
    class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]"
    name="lastName"
    v-model="lastName" />
</div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.birthDate') }}</label>
            <input type="date" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)] scheme-dark" autocomplete="off" name="birthDate" v-model="birthDate" />
          </div>
          <div class="space-y-1">
            <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.gender') }}</label>
            <select class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" v-model="gender">
              <option>{{ $t('staffManagement.male') }}</option><option>{{ $t('staffManagement.female') }}</option>
            </select>
          </div>
        </div>
        <div class="space-y-1">
          <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.secureEmail') }}</label>
          <input type="email" :placeholder="$t('staffManagement.emailPlaceholder')" required autocomplete="off" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" name="email" v-model="email" />
        </div>
        <div class="space-y-1">
          <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.accessCredentials') }}</label>
          <input v-model="password" type="password" :placeholder="$t('staffManagement.passwordPlaceholder')" required autocomplete="off" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" name="password" />
          <div v-if="password" class="flex flex-col gap-1 mt-2 transition-all duration-300">
            <div class="flex items-center gap-2">
              <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.length ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.length ? 'check_circle' : 'error' }}</span>
              <span class="text-xs font-medium" :class="passwordChecks.length ? 'text-green-400' : 'text-red-400'">{{ $t('common.atLeast8Chars') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.uppercase ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.uppercase ? 'check_circle' : 'error' }}</span>
              <span class="text-xs font-medium" :class="passwordChecks.uppercase ? 'text-green-400' : 'text-red-400'">{{ $t('common.oneUppercase') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.lowercase ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.lowercase ? 'check_circle' : 'error' }}</span>
              <span class="text-xs font-medium" :class="passwordChecks.lowercase ? 'text-green-400' : 'text-red-400'">{{ $t('common.oneLowercase') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.number ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.number ? 'check_circle' : 'error' }}</span>
              <span class="text-xs font-medium" :class="passwordChecks.number ? 'text-green-400' : 'text-red-400'">{{ $t('common.oneNumber') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.special ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.special ? 'check_circle' : 'error' }}</span>
              <span class="text-xs font-medium" :class="passwordChecks.special ? 'text-green-400' : 'text-red-400'">{{ $t('common.oneSpecialChar') }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4 border-t border-outline-variant/10 pt-4">
        <div class="mb-2 flex items-center gap-2"><span class="h-3 w-1 rounded-full bg-blue-400" /><h3 class="text-[10px] font-black uppercase tracking-widest text-white">{{ $t('staffManagement.contactDetails') }}</h3></div>
        <div class="space-y-1"><label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.phoneNumber') }}</label><input type="tel" :placeholder="$t('staffManagement.phonePlaceholder')" autocomplete="off" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" v-model="phoneNumber" /></div>
        <div class="space-y-1"><label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.address') }}</label><input type="text" :placeholder="$t('staffManagement.addressPlaceholder')" autocomplete="off" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" v-model="address" /></div>
      </div>

      <div class="space-y-4 border-t border-outline-variant/10 pt-4">
        <div class="mb-2 flex items-center gap-2"><span class="h-3 w-1 rounded-full bg-orange-400" /><h3 class="text-[10px] font-black uppercase tracking-widest text-white">{{ $t('staffManagement.medicalDossier') }}</h3></div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.bloodType') }}</label>
            <select class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" v-model="bloodTypeID">
              <option v-for="type in bloodTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
            </select>
          </div>
          <div class="space-y-1"><label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.allergies') }}</label><input type="text" :placeholder="$t('staffManagement.allergiesPlaceholder')" autocomplete="off" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" name="allergies" v-model="allergies" /></div>
        </div>
        <div class="space-y-1"><label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.medicalNotes') }}</label><textarea class="min-h-[80px] w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" :placeholder="$t('staffManagement.medicalNotesPlaceholder')" autocomplete="off" v-model="medicalNotes"></textarea></div>
      </div>

      <div class="space-y-4 border-t border-outline-variant/10 pt-4">
        <div class="mb-2 flex items-center gap-2"><span class="h-3 w-1 rounded-full bg-primary-fixed-dim" /><h3 class="text-[10px] font-black uppercase tracking-widest text-white">{{ $t('staffManagement.strategicRole') }}</h3></div>
        <div class="space-y-1"><label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.primaryRole') }}</label><select class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" v-model="primaryRoleID">
              <option v-for="role in primaryRoles" :key="role.id" :value="role.id">{{ role.name }}</option>
            </select></div>
        <div class="animate-in space-y-4 duration-500">
          <div class="space-y-1">
<div class="space-y-1">
  <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.classification') }}</label>
  <select class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" v-model="roleClassificationID">
    <option v-for="item in filteredClassifications" :key="item.id" :value="item.id">{{ item.name }}</option>
  </select>
</div>
          </div>
          <div class="space-y-1">
            <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('staffManagement.category') }}</label>
            <div class="relative">
              <button
                type="button"
                class="pressable flex w-full items-center justify-between rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]"
                @click="categoryDropdownOpen = !categoryDropdownOpen"
              >
                <span class="truncate text-start">
                  {{ selectedCategoryNames.length ? selectedCategoryNames.join(', ') : $t('common.selectCategories') }}
                </span>
                <span class="material-symbols-outlined text-sm text-slate-400">
                  {{ categoryDropdownOpen ? 'expand_less' : 'expand_more' }}
                </span>
              </button>

              <div
                v-if="categoryDropdownOpen"
                class="animate-in absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-md border border-outline-variant/30 bg-surface-container-high p-2 shadow-2xl"
              >
                <label
                  v-for="category in categories"
                  :key="category.id"
                  class="pressable flex cursor-pointer items-center justify-between rounded px-2 py-2 text-xs text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                >
                  <span>{{ category.name }}</span>
                  <input
                    type="checkbox"
                    :checked="selectedCategories.includes(category.id)"
                    class="h-4 w-4 rounded border-outline-variant bg-surface-container-lowest text-primary-fixed focus:ring-primary-fixed/40"
                    @change="toggleCategory(category.id)"
                  />
                </label>
              </div>
            </div>

            <div v-if="selectedCategories.length > 0" class="mt-2 flex flex-wrap gap-2 rounded-md bg-surface-container-lowest p-2">
              <span
                v-for="categoryId in selectedCategories"
                :key="categoryId"
                class="flex items-center gap-1 rounded bg-green-400/20 px-2 py-1 text-[10px] font-bold text-green-400"
              >
                {{ categories.find((item) => item.id === categoryId)?.name || categoryId }}
                <button type="button" class="pressable leading-none" @click="toggleCategory(categoryId)">
                  <span class="material-symbols-outlined text-[12px]">close</span>
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <button type="submit" class="pressable flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-br from-primary to-primary-container py-5 text-xs font-black uppercase tracking-widest text-on-primary-fixed shadow-lg shadow-green-900/20 transition-all hover:brightness-110">
        {{ $t('staffManagement.deployStaffMember') }}
        <span class="material-symbols-outlined font-bold">person_add</span>
      </button>
    </form>
  </section>
</template>

<style scoped>
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

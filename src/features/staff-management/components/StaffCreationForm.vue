<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUiToast } from '../../../composables/useUiToast'
import { staffService } from '../../../services/staffService'
import { lookupService } from '../../../services/lookupService'

defineEmits(['deploy'])

const photoPreview = ref('')
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
const clubID = ref(7)
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

onMounted(loadLookups)

function normalizeLookupItem(item) {
  if (typeof item === 'string') {
    return { id: item, name: item }
  }
  const id = item?.id ?? item?.ID ?? item?.value ?? item?.key ?? item?.lookupId ?? item?.bloodTypeId ?? item?.roleId ?? item?.classificationId ?? item?.categoryId
  const name = item?.name ?? item?.label ?? item?.title ?? item?.description ?? item?.text ?? item?.value ?? item?.nameAr ?? item?.nameEn ?? item?.bloodTypeName ?? item?.roleName ?? item?.classificationName ?? item?.categoryName
  return {
    id: id ?? name ?? 'Unknown',
    name: name ?? String(id ?? 'Unknown')
  }
}

function normalizeLookupArray(array) {
  if (!Array.isArray(array)) return []
  return array.map(normalizeLookupItem)
}

async function loadLookups() {
  try {
    const [bloodRes, roleRes, classificationRes, categoryRes] = await Promise.all([
      lookupService.getBloodTypes(),
      lookupService.getPrimaryRoles(),
      lookupService.getRoleClassifications(),
      lookupService.getCategories(clubID.value)
    ])

    console.log('API Responses:', { bloodRes, roleRes, classificationRes, categoryRes })

    bloodTypes.value = normalizeLookupArray(bloodRes.data)
    primaryRoles.value = normalizeLookupArray(roleRes.data)
    roleClassifications.value = normalizeLookupArray(classificationRes.data)
    categories.value = normalizeLookupArray(categoryRes.data)

    console.log('Normalized Data:', {
      bloodTypes: bloodTypes.value,
      primaryRoles: primaryRoles.value,
      roleClassifications: roleClassifications.value,
      categories: categories.value
    })

    if (!primaryRoleID.value && primaryRoles.value.length) {
      primaryRoleID.value = primaryRoles.value[0].id
    }
    if (!roleClassificationID.value && roleClassifications.value.length) {
      roleClassificationID.value = roleClassifications.value[0].id
    }
    if (!bloodTypeID.value && bloodTypes.value.length) {
      bloodTypeID.value = bloodTypes.value[0].id
    }
  } catch (error) {
    console.error('Lookup load error:', error)
    showToast({ title: 'Lookup load failed', message: error.message || 'Unable to load lookup values', mode: 'error', duration: 4000 })
  }
}

async function submitForm(event) {
  // Prevent default form submission
  event.preventDefault()
  // Build request payload from component refs
  const data = {
    firstName: firstName.value,
    secondName: secondName.value,
    lastName: lastName.value,
    gender: gender.value,
    birthDate: birthDate.value,
    clubID: clubID.value,
    email: email.value,
    password: password.value,
    photo: photoPreview.value,
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
    { name: 'Photo', value: photoPreview.value }
  ];
  const missing = requiredFields.filter(f => !f.value || f.value === '' );
  if (missing.length) {
    const names = missing.map(f => f.name).join(', ');
    showToast({ title: 'Missing fields', message: `Please fill: ${names}`, mode: 'error', duration: 4000 });
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
      title: 'Invalid password',
      message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      mode: 'error',
      duration: 4000
    });
    return;
  }
    try {
      const response = await staffService.createStaff(data)
      const result = response.data
      showToast({ title: 'Staff Created', message: `ID ${result.id} created successfully`, mode: 'success', duration: 3000 })
      // Reset form fields
      firstName.value = ''
      secondName.value = ''
      lastName.value = ''
      gender.value = 'Male'
      birthDate.value = ''
      clubID.value = 7
      email.value = ''
      password.value = ''
      photoPreview.value = ''
      phoneNumber.value = ''
      address.value = ''
      primaryRoleID.value = primaryRoles.value?.[0]?.id || null
      roleClassificationID.value = roleClassifications.value?.[0]?.id || null
      selectedCategories.value = []
      bloodTypeID.value = bloodTypes.value?.[0]?.id || null
      allergies.value = ''
      medicalNotes.value = ''
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred while creating staff'
      showToast({ title: 'Error', message: errorMessage, mode: 'error', duration: 4000 })
    }
  }






function toggleCategory(categoryId) {
  if (selectedCategories.value.includes(categoryId)) {
    selectedCategories.value = selectedCategories.value.filter((item) => item !== categoryId)
    return
  }
  selectedCategories.value.push(categoryId)
}

function onPhotoChange(event) {
  const file = event.target.files[0];
  if (file) {
    photoPreview.value = URL.createObjectURL(file);
  }
}
</script>

<template>
  <section class="animate-in col-span-12 h-fit rounded-xl border-t border-white/5 bg-surface-container-low p-8 lg:col-span-5 xl:col-span-4">
    <div class="mb-8">
      <div class="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-green-400">Onboarding Terminal</div>
      <h2 class="font-headline text-2xl leading-none font-black uppercase tracking-tight text-white">Create Personnel</h2>
    </div>

    <form class="space-y-8" @submit.prevent="submitForm">
      <div class="space-y-4">
        <div class="mb-2 flex items-center gap-2">
          <span class="h-3 w-1 rounded-full bg-green-400" />
          <h3 class="text-[10px] font-black uppercase tracking-widest text-white">Identity &amp; Access</h3>
        </div>
        <div class="mb-4 flex items-center gap-4">
          <label
            class="group relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-surface-container-lowest transition-colors hover:border-green-400/50"
          >
            <img v-if="photoPreview" :src="photoPreview" alt="Staff photo" class="h-full w-full rounded-xl object-cover" />
            <template v-else>
              <span class="material-symbols-outlined text-slate-600 transition-colors group-hover:text-green-400">add_a_photo</span>
              <span class="mt-1 text-[8px] font-bold uppercase text-slate-500">Photo</span>
            </template>
            <input class="absolute inset-0 cursor-pointer opacity-0" type="file" @change="onPhotoChange" />
          </label>
          <div class="flex-1 space-y-4">
            <div class="space-y-1">
              <div class="space-y-1">
  <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">First Name</label>
  <input
    type="text"
    placeholder="e.g. Marcus"
    required
    autocomplete="off"
    class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]"
    name="firstName"
    v-model="firstName" />
</div>
<div class="space-y-1">
  <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Second Name (optional)</label>
  <input
    type="text"
    placeholder="e.g. James"
    autocomplete="off"
    class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]"
    name="secondName"
    v-model="secondName" />
</div>
<div class="space-y-1">
  <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Last Name</label>
  <input
    type="text"
    placeholder="e.g. Rashford"
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
            <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Birth Date</label>
            <input type="date" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)] scheme-dark" autocomplete="off" name="birthDate" v-model="birthDate" />
          </div>
          <div class="space-y-1">
            <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Gender</label>
            <select class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" v-model="gender">
              <option>Male</option><option>Female</option>
            </select>
          </div>
        </div>
        <div class="space-y-1">
          <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Secure Email</label>
          <input type="email" placeholder="name@pitchpro.club" required autocomplete="off" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" name="email" v-model="email" />
        </div>
        <div class="space-y-1">
          <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Access Credentials</label>
          <input v-model="password" type="password" placeholder="••••••••••••" required autocomplete="off" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" name="password" />
          <div v-if="password" class="flex flex-col gap-1 mt-2 transition-all duration-300">
            <div class="flex items-center gap-2">
              <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.length ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.length ? 'check_circle' : 'error' }}</span>
              <span class="text-xs font-medium" :class="passwordChecks.length ? 'text-green-400' : 'text-red-400'">At least 8 characters</span>
            </div>
            <div class="flex items-center gap-2">
              <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.uppercase ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.uppercase ? 'check_circle' : 'error' }}</span>
              <span class="text-xs font-medium" :class="passwordChecks.uppercase ? 'text-green-400' : 'text-red-400'">One uppercase letter</span>
            </div>
            <div class="flex items-center gap-2">
              <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.lowercase ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.lowercase ? 'check_circle' : 'error' }}</span>
              <span class="text-xs font-medium" :class="passwordChecks.lowercase ? 'text-green-400' : 'text-red-400'">One lowercase letter</span>
            </div>
            <div class="flex items-center gap-2">
              <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.number ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.number ? 'check_circle' : 'error' }}</span>
              <span class="text-xs font-medium" :class="passwordChecks.number ? 'text-green-400' : 'text-red-400'">One number</span>
            </div>
            <div class="flex items-center gap-2">
              <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.special ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.special ? 'check_circle' : 'error' }}</span>
              <span class="text-xs font-medium" :class="passwordChecks.special ? 'text-green-400' : 'text-red-400'">One special character</span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4 border-t border-outline-variant/10 pt-4">
        <div class="mb-2 flex items-center gap-2"><span class="h-3 w-1 rounded-full bg-blue-400" /><h3 class="text-[10px] font-black uppercase tracking-widest text-white">Contact Details</h3></div>
        <div class="space-y-1"><label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone Number</label><input type="tel" placeholder="+44 7000 000000" autocomplete="off" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" v-model="phoneNumber" /></div>
        <div class="space-y-1"><label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Address</label><input type="text" placeholder="Street, City, Postcode" autocomplete="off" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" v-model="address" /></div>
      </div>

      <div class="space-y-4 border-t border-outline-variant/10 pt-4">
        <div class="mb-2 flex items-center gap-2"><span class="h-3 w-1 rounded-full bg-orange-400" /><h3 class="text-[10px] font-black uppercase tracking-widest text-white">Medical Dossier</h3></div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Blood Type</label>
            <select class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" v-model="bloodTypeID">
              <option v-for="type in bloodTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
            </select>
          </div>
          <div class="space-y-1"><label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Allergies</label><input type="text" placeholder="None" autocomplete="off" class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" name="allergies" v-model="allergies" /></div>
        </div>
        <div class="space-y-1"><label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Medical Notes</label><textarea class="min-h-[80px] w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" placeholder="Specific conditions or tactical medical info..." autocomplete="off" v-model="medicalNotes"></textarea></div>
      </div>

      <div class="space-y-4 border-t border-outline-variant/10 pt-4">
        <div class="mb-2 flex items-center gap-2"><span class="h-3 w-1 rounded-full bg-primary-fixed-dim" /><h3 class="text-[10px] font-black uppercase tracking-widest text-white">Strategic Role</h3></div>
        <div class="space-y-1"><label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Primary Role</label><select class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" v-model="primaryRoleID">
              <option v-for="role in primaryRoles" :key="role.id" :value="role.id">{{ role.name }}</option>
            </select></div>
        <div class="animate-in space-y-4 duration-500">
          <div class="space-y-1">
<div class="space-y-1">
  <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Classification</label>
  <select class="w-full rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]" v-model="roleClassificationID">
    <option v-for="item in roleClassifications" :key="item.id" :value="item.id">{{ item.name }}</option>
  </select>
</div>
          </div>
          <div class="space-y-1">
            <label class="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</label>
            <div class="relative">
              <button
                type="button"
                class="pressable flex w-full items-center justify-between rounded-md border-none bg-surface-container-lowest px-3 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-primary-fixed/45 focus:shadow-[0_0_0_3px_rgba(114,255,112,0.16)]"
                @click="categoryDropdownOpen = !categoryDropdownOpen"
              >
                <span class="truncate text-left">
                  {{ selectedCategoryNames.length ? selectedCategoryNames.join(', ') : 'Select categories' }}
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
        DEPLOY STAFF MEMBER
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

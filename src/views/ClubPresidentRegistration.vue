<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUiToast } from '../composables/useUiToast'
import { clubService } from '../services/clubService'

const form = reactive({
  firstName: '',
  secondName: '',
  lastName: '',
  gender: '',
  birthDate: '',
  email: '',
  password: ''
})

const showPassword = ref(false)
const router = useRouter()
const { showToast, showLoadingToast } = useUiToast()
const { t } = useI18n()

const debouncedPassword = ref('')
let debounceTimer = null

const updateDebouncedPassword = (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedPassword.value = value
  }, 300) // 300ms delay
}

const passwordValid = computed(() => {
  const pwd = debouncedPassword.value
  return pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)
})

const passwordChecks = computed(() => {
  const pwd = debouncedPassword.value
  return {
    length: pwd.length >= 8,
    lowercase: /[a-z]/.test(pwd),
    uppercase: /[A-Z]/.test(pwd),
    number: /\d/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)
  }
})

function goToLogin() {
  showLoadingToast({
    title: t('presidentRegistration.toast.loginReadyTitle'),
    message: t('presidentRegistration.toast.loginReadyMessage'),
    successTitle: t('presidentRegistration.toast.loginReadyTitle'),
    successMessage: t('presidentRegistration.toast.loginReadyMessage')
  })
  setTimeout(() => router.push('/login'), 900)
}

const clubData = ref(null)
const crestPreview = ref('')

onMounted(() => {
  // Access the state sent from the previous page
  const state = window.history.state?.clubInfo
  if (!state) {
    // SECURITY: If the user accessed the URL directly, state will be missing.
    // Redirect them back to the first step.
    router.push('/club-registration')
    return
  }

  clubData.value = state

  // If there is a crest file, create a preview for this page too
  if (state.crest) {
    crestPreview.value = URL.createObjectURL(state.crest)
  }
})

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

const getApiErrorMessage = (error) => {
  const responseData = error?.response?.data
  if (!responseData) {
    return error?.message || 'An unexpected error occurred.'
  }

  // Check for message field first (new structure)
  if (responseData.message) {
    return responseData.message
  }

  if (typeof responseData === 'string') {
    return responseData
  }

  const parts = []
  if (responseData.title) {
    parts.push(responseData.title)
  }
  if (responseData.detail) {
    parts.push(responseData.detail)
  }
  if (responseData.status) {
    parts.push(`status: ${responseData.status}`)
  }
  if (responseData.instance) {
    parts.push(`instance: ${responseData.instance}`)
  }

  const extraFields = ['additionalProp1', 'additionalProp2', 'additionalProp3']
  extraFields.forEach((field) => {
    if (responseData[field]) {
      parts.push(responseData[field])
    }
  })

  if (parts.length > 0) {
    return parts.join(' | ')
  }

  return JSON.stringify(responseData)
}

const handleRegistration = async () => {
  if (!clubData.value) {
    console.error('Club registration state is missing.');
    return;
  }

  // Validate president form
  if (!form.firstName || !form.lastName || !form.gender || !form.birthDate || !form.email || !form.password || !passwordValid.value) {
    showToast({
      title: t('presidentRegistration.toast.incompleteTitle'),
      message: t('presidentRegistration.toast.incompleteMessage'),
      mode: 'error',
      duration: 3500
    })
    return
  }

  const clubNameValue = clubData.value.clubName || clubData.value.name || clubData.value.Name || ''
  const contactValue = clubData.value.contactNumber || clubData.value.ContactNumber || ''
  const colorValue = clubData.value.selectedClubColor || clubData.value.primaryIdentityColor || clubData.value.PrimaryIdentityColor || ''
  const crestFile = clubData.value.crest || clubData.value.Crest || null

  if (!clubNameValue || !contactValue || !colorValue || !crestFile) {
    console.error('Club registration payload is incomplete.', {
      clubData: clubData.value,
      clubNameValue,
      contactValue,
      colorValue,
      crestFile
    })
    return
  }

  const formData = new FormData()
  formData.append('Name', clubNameValue)
  formData.append('ContactNumber', contactValue)
  formData.append('PrimaryIdentityColor', colorValue)
  formData.append('Crest', crestFile, 'crest.png')
  
  formData.append('FirstName', form.firstName)
  if (form.secondName) {
    formData.append('secondName', form.secondName)
  }
  formData.append('lastName', form.lastName)
  formData.append('gender', form.gender === 'male' ? 'true' : 'false')
  formData.append('birthDate', form.birthDate)
  formData.append('email', form.email)
  formData.append('password', form.password)


  showToast({
    title: t('presidentRegistration.toast.registeringTitle'),
    message: t('presidentRegistration.toast.registeringMessage'),
    mode: 'loading',
    duration: 30000 // long duration
  })

  try {
    const response = await clubService.completeRegistration(formData)
    showToast({
      title: t('presidentRegistration.toast.successTitle'),
      message: t('presidentRegistration.toast.successMessage'),
      mode: 'success',
      duration: 2000
    })
    // Optionally redirect to login after a delay
    // setTimeout(() => {
    //   router.push('/login')
    // }, 2000)
  } catch (error) {
    const apiMessage = getApiErrorMessage(error)
    alert(`Registration failed: ${apiMessage}`) // For debugging
    showToast({
      title: t('presidentRegistration.toast.apiErrorTitle'),
      message: apiMessage,
      mode: 'error',
      duration: 4000
    })
  }
}

</script>

<template>
  <main class="relative flex min-h-screen overflow-x-hidden bg-background text-on-surface">
    <section
      class="relative hidden h-screen items-center justify-center overflow-hidden bg-surface-container-lowest px-12 lg:sticky lg:top-0 lg:flex lg:w-1/2"
    >
      <div
        class="pointer-events-none absolute inset-0 opacity-10"
        style="
          background-image: url('/assets/stadium.svg');
          background-position: center;
          background-size: cover;
        "
      />
      <div
        class="pointer-events-none absolute inset-0 opacity-5"
        style="
          background-image: radial-gradient(rgba(0, 255, 65, 0.9) 1px, transparent 1px);
          background-size: 40px 40px;
        "
      />

      <div class="relative z-10 max-w-xl">
        <div class="mb-8 flex items-center gap-3">
          <div class="h-1 w-12 bg-primary-container" />
          <span class="font-headline text-sm font-bold uppercase tracking-[0.2em] text-primary-fixed">
            PitchPro Technical Command
          </span>
        </div>
        <h1 class="mb-6 font-headline text-5xl font-bold leading-none tracking-tighter text-white md:text-6xl">
          "Control the <span class="text-primary-fixed">center</span>, control the game."
        </h1>
        <p class="max-w-md font-body text-lg leading-relaxed text-secondary">
          Technical Directors don't just manage; they engineer victory. Your credentials secure the club's tactical
          infrastructure.
        </p>
        <div class="mt-12 flex items-center gap-6">
          <div class="flex flex-col">
            <span class="font-headline text-xs uppercase tracking-widest text-outline">Phase</span>
            <span class="font-headline text-2xl font-bold text-white">02/03</span>
          </div>
          <div class="h-10 w-px bg-outline-variant/30" />
          <div class="flex flex-col">
            <span class="font-headline text-xs uppercase tracking-widest text-outline">Status</span>
            <span class="font-headline text-2xl font-bold text-primary-fixed">Awaiting Auth</span>
          </div>
        </div>
      </div>
    </section>

    <section class="flex min-h-screen w-full items-center justify-center bg-surface p-6 sm:p-12 md:p-24 lg:w-1/2">
      <div class="w-full max-w-xl">
        <div class="mb-12 lg:hidden">
          <h2 class="font-headline text-3xl font-bold tracking-tighter text-white">PitchPro</h2>
          <p class="mt-1 font-headline text-xs uppercase tracking-widest text-primary-fixed">
            {{ t('presidentRegistration.stepLabel') }}
          </p>
        </div>

        <div class="space-y-8">
          <div>
            <h2 class="font-headline text-3xl font-bold tracking-tight text-white">{{ t('presidentRegistration.pageTitle') }}</h2>
            <p class="mt-2 font-body text-on-surface-variant">
              {{ t('presidentRegistration.introText') }}
            </p>
          </div>

          <form class="space-y-6" @submit.prevent="handleRegistration">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div class="space-y-2">
                <label class="block font-headline text-[10px] uppercase tracking-widest text-outline" for="first-name">
                  {{ t('presidentRegistration.firstName') }}<span class="ml-1 font-bold text-error">*</span>
                </label>
                <input
                  id="first-name"
                  v-model="form.firstName"
                  type="text"
                  :placeholder="t('presidentRegistration.placeholderFirstName')"
                  required
                  autocomplete="off"
                  class="w-full rounded-lg border-0 bg-surface-container-low px-4 py-3 font-body text-sm text-white placeholder:text-outline/50 transition-all focus:ring-1 focus:ring-primary-fixed/50"
                />
              </div>

              <div class="space-y-2">
                <label class="block font-headline text-[10px] uppercase tracking-widest text-outline" for="second-name">
                  {{ t('presidentRegistration.secondName') }}
                </label>
                <input
                  id="second-name"
                  v-model="form.secondName"
                  type="text"
                  :placeholder="t('presidentRegistration.placeholderSecondName')"
                  autocomplete="off"
                  class="w-full rounded-lg border-0 bg-surface-container-low px-4 py-3 font-body text-sm text-white placeholder:text-outline/50 transition-all focus:ring-1 focus:ring-primary-fixed/50"
                />
              </div>

              <div class="space-y-2">
                <label class="block font-headline text-[10px] uppercase tracking-widest text-outline" for="last-name">
                  {{ t('presidentRegistration.lastName') }}<span class="ml-1 font-bold text-error">*</span>
                </label>
                <input
                  id="last-name"
                  v-model="form.lastName"
                  type="text"
                  :placeholder="t('presidentRegistration.placeholderLastName')"
                  required
                  autocomplete="off"
                  class="w-full rounded-lg border-0 bg-surface-container-low px-4 py-3 font-body text-sm text-white placeholder:text-outline/50 transition-all focus:ring-1 focus:ring-primary-fixed/50"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <label class="block font-headline text-[10px] uppercase tracking-widest text-outline" for="gender">
                  {{ t('presidentRegistration.gender') }}<span class="ml-1 font-bold text-error">*</span>
                </label>
                <select
                  id="gender"
                  v-model="form.gender"
                  required
                  class="w-full cursor-pointer appearance-none rounded-lg border-0 bg-surface-container-low px-4 py-3 font-body text-sm text-white transition-all focus:ring-1 focus:ring-primary-fixed/50"
                >
                  <option disabled value="">{{ t('presidentRegistration.selectProtocol') }}</option>
                  <option value="male">{{ t('presidentRegistration.male') }}</option>
                  <option value="female">{{ t('presidentRegistration.female') }}</option>
                </select>
              </div>
              <div class="space-y-2">
                <label class="block font-headline text-[10px] uppercase tracking-widest text-outline" for="birth-date">
                  {{ t('presidentRegistration.birthDate') }}<span class="ml-1 font-bold text-error">*</span>
                </label>
                <input
                  id="birth-date"
                  v-model="form.birthDate"
                  type="date"
                  required
                  autocomplete="off"
                  class="w-full rounded-lg border-0 bg-surface-container-low px-4 py-3 font-body text-sm text-white transition-all scheme-dark focus:ring-1 focus:ring-primary-fixed/50"
                />
              </div>
            </div>

            <div class="my-2 h-px bg-outline-variant/20" />

            <div class="space-y-2">
              <label class="block font-headline text-xs uppercase tracking-widest text-outline" for="email">
                {{ t('presidentRegistration.email') }}<span class="ml-1 font-bold text-error">*</span>
              </label>
              <div class="group relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span class="material-symbols-outlined text-sm text-outline transition-colors group-focus-within:text-primary-fixed">
                    alternate_email
                  </span>
                </div>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  :placeholder="t('presidentRegistration.placeholderEmail')"
                  required
                  autocomplete="off"
                  class="w-full rounded-lg border-0 bg-surface-container-low py-4 pl-12 font-body text-white placeholder:text-outline/50 transition-all focus:ring-1 focus:ring-primary-fixed/50"
                />
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-end justify-between">
                <label class="block font-headline text-xs uppercase tracking-widest text-outline" for="password">
                  {{ t('presidentRegistration.password') }}<span class="ml-1 font-bold text-error">*</span>
                </label>
                <a class="font-headline text-[10px] uppercase tracking-widest text-primary-fixed-dim transition-colors hover:text-primary-fixed" href="#">
                  {{ t('presidentRegistration.tacticalReset') }}
                </a>
              </div>
              <div class="group relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span class="material-symbols-outlined text-sm text-outline transition-colors group-focus-within:text-primary-fixed">
                    lock
                  </span>
                </div>
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••••••"
                  required
                  autocomplete="off"
                  @input="updateDebouncedPassword($event.target.value)"
                  class="w-full rounded-lg border-0 bg-surface-container-low py-4 pl-12 pr-12 font-body text-white placeholder:text-outline/50 transition-all focus:ring-1 focus:ring-primary-fixed/50"
                />
                <button
                  type="button"
                  class="pressable absolute inset-y-0 right-0 flex cursor-pointer items-center pr-4"
                  @click="showPassword = !showPassword"
                >
                  <span class="material-symbols-outlined text-sm text-outline transition-colors hover:text-white">
                    {{ showPassword ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
              <div v-if="debouncedPassword" class="flex flex-col gap-1 mt-2 transition-all duration-300">
                <div class="flex items-center gap-2">
                  <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.length ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.length ? 'check_circle' : 'error' }}</span>
                  <span class="text-xs font-medium" :class="passwordChecks.length ? 'text-green-400' : 'text-red-400'">{{ t('presidentRegistration.passwordRequirements.length') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.uppercase ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.uppercase ? 'check_circle' : 'error' }}</span>
                  <span class="text-xs font-medium" :class="passwordChecks.uppercase ? 'text-green-400' : 'text-red-400'">{{ t('presidentRegistration.passwordRequirements.uppercase') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.lowercase ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.lowercase ? 'check_circle' : 'error' }}</span>
                  <span class="text-xs font-medium" :class="passwordChecks.lowercase ? 'text-green-400' : 'text-red-400'">{{ t('presidentRegistration.passwordRequirements.lowercase') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.number ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.number ? 'check_circle' : 'error' }}</span>
                  <span class="text-xs font-medium" :class="passwordChecks.number ? 'text-green-400' : 'text-red-400'">{{ t('presidentRegistration.passwordRequirements.number') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span :class="['material-symbols-outlined text-sm transition-all duration-300', passwordChecks.special ? 'text-green-400 scale-110' : 'text-red-400']">{{ passwordChecks.special ? 'check_circle' : 'error' }}</span>
                  <span class="text-xs font-medium" :class="passwordChecks.special ? 'text-green-400' : 'text-red-400'">{{ t('presidentRegistration.passwordRequirements.special') }}</span>
                </div>
              </div>
            </div>

            <div class="pt-4">
              <button
                type="submit"
                class="pressable w-full rounded-lg bg-[linear-gradient(135deg,#ebffe2_0%,#00ff41_100%)] py-5 transition-transform active:scale-95"
              >
                <span class="group flex items-center justify-center gap-3">
                  <span class="font-headline text-base font-black uppercase tracking-widest text-on-primary-fixed drop-shadow-md">
                    {{ t('presidentRegistration.register') }}
                  </span>
                  <span class="material-symbols-outlined text-lg text-on-primary-fixed transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </span>
              </button>
            </div>
          </form>

          <div class="border-t border-outline-variant/10 pt-8 text-center">
            <p class="font-body text-sm text-on-surface-variant">
              {{ t('presidentRegistration.partOfClubLegacy') }}
              <RouterLink to="/login" class="pressable font-bold text-primary-fixed hover:underline" @click.prevent="goToLogin">
                {{ t('presidentRegistration.loginToHub') }}
              </RouterLink>
            </p>
          </div>
        </div>
      </div>
    </section>

    <div
      class="fixed bottom-8 left-8 hidden items-center gap-4 rounded-full border border-outline-variant/20 bg-surface-container-high/40 px-6 py-3 backdrop-blur-md lg:flex"
    >
      <div class="relative flex h-2 w-2">
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-fixed opacity-75" />
        <span class="relative inline-flex h-2 w-2 rounded-full bg-primary-fixed" />
      </div>
      <span class="font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
        {{ t('presidentRegistration.systemReadyForDeployment') }}
      </span>
    </div>

    <div class="pointer-events-none fixed right-0 top-0 p-8 opacity-20">
      <div class="select-none font-headline text-[120px] leading-none font-extrabold tracking-tighter text-outline-variant/10">
        {{ t('presidentRegistration.strategyLabel') }}
      </div>
    </div>
  </main>
</template>

<style scoped>
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px var(--surface-container-low) inset !important;
  -webkit-text-fill-color: white !important;
  background-color: var(--surface-container-low) !important;
  color: white !important;
  border: none !important;
}

select:-webkit-autofill,
select:-webkit-autofill:hover,
select:-webkit-autofill:focus,
select:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px var(--surface-container-low) inset !important;
  -webkit-text-fill-color: white !important;
  background-color: var(--surface-container-low) !important;
  color: white !important;
  border: none !important;
}
</style>

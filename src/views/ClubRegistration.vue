<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUiToast } from '../composables/useUiToast'
import { useI18n } from 'vue-i18n'
import { toRaw } from 'vue'; // Add this import at the top
import imageCompression from 'browser-image-compression';


const { t } = useI18n()


const playerImage =
  'https://www.figma.com/api/mcp/asset/e7f4972e-6846-4ccf-91c0-621c3b9188c7'
const pitchLinesImage =
  'https://www.figma.com/api/mcp/asset/ca48e1d3-8c2b-4737-becb-19f2582aa8ba'
const iconColorPicker =
  'https://www.figma.com/api/mcp/asset/f2648cea-e344-4dbe-971d-3f4e80efec05'
const iconUpload =
  'https://www.figma.com/api/mcp/asset/77dedf46-f27d-43b5-91db-79bb3e275773'
const iconArrowLeft =
  'https://www.figma.com/api/mcp/asset/3d921aaa-4643-4393-8891-c06dc6ce07c8'
const iconArrowRight =
  'https://www.figma.com/api/mcp/asset/a97f2b9d-8a07-4ac5-80d3-c74ade1da529'

const identityColors = ['#00ff41', '#ff3d00', '#2962ff', '#ffd600']
const footerLinks = ['footer.privacyProtocol', 'footer.licenseAgreement', 'footer.systemSupport']

const selectedColor = ref(identityColors[0])
const colorInputRef = ref(null)
const crestInputRef = ref(null)
const crestPreviewUrl = ref('')
const crestFileName = ref('')
const router = useRouter()
const { showToast, showLoadingToast } = useUiToast()
const clubName = ref('')
const crestFile = ref(null)
const contactNumber = ref('')

const errors = reactive({
  clubName: '',
  contactNumber: '',
  selectedClubColor: '',
  crest: ''
})

const phoneRegex = /^\+?[0-9]{7,15}$/

const isFormValid = computed(() => {
  const trimmedContact = contactNumber.value.trim()
  return (
    clubName.value.trim().length > 0 &&
    clubName.value.trim().length <= 255 &&
    phoneRegex.test(trimmedContact) &&
    selectedColor.value &&
    crestFile.value &&
    crestFile.value.size <= 2 * 1024 * 1024
  )
})

function validateClubForm() {
  let valid = true
  errors.clubName = ''
  errors.contactNumber = ''
  errors.selectedClubColor = ''
  errors.crest = ''

  if (!clubName.value.trim()) {
    errors.clubName = t('clubRegistration.errors.clubNameRequired')
    valid = false
  } else if (clubName.value.trim().length > 255) {
    errors.clubName = t('clubRegistration.errors.clubNameMaxLength')
    valid = false
  }

  const contactValue = contactNumber.value.trim()
  if (!contactValue) {
    errors.contactNumber = t('clubRegistration.errors.contactNumberRequired')
    valid = false
  } else if (!phoneRegex.test(contactValue)) {
    errors.contactNumber = t('clubRegistration.errors.contactNumberInvalid')
    valid = false
  }

  if (!selectedColor.value) {
    errors.selectedClubColor = t('clubRegistration.errors.selectedClubColorRequired')
    valid = false
  }

  if (!crestFile.value) {
    errors.crest = t('clubRegistration.errors.crestRequired')
    valid = false
  } else if (crestFile.value.size > 2 * 1024 * 1024) {
    errors.crest = t('clubRegistration.errors.crestTooLarge')
    valid = false
  }

  return valid
}

function selectColor(color) {
  selectedColor.value = color
  errors.selectedClubColor = ''
}

function openColorPicker() {
  colorInputRef.value?.click()
}

function onCustomColorPicked(event) {
  const customColor = event.target.value
  if (customColor) {
    selectedColor.value = customColor
  }
}

function openCrestPicker() {
  crestInputRef.value?.click()
}

async function onCrestChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const validTypes = ['image/jpeg', 'image/png'];
  if (!validTypes.includes(file.type)) {
    showToast({
      title: t('clubRegistration.toasts.invalidFileTitle'),
      message: t('clubRegistration.toasts.invalidFileMessage'),
      mode: 'error',
      duration: 4000
    })
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    showToast({
      title: t('clubRegistration.toasts.invalidFileTitle'),
      message: t('clubRegistration.errors.crestTooLarge'),
    })
    return
  }

  try {
    const options = {
      maxSizeMB: 0.5, // 500kb
      maxWidthOrHeight: 1920,
      useWebWorker: true
    }
    const compressedFile = await imageCompression(file, options);
    
    crestFile.value = compressedFile
    crestFileName.value = compressedFile.name
    crestPreviewUrl.value = URL.createObjectURL(compressedFile)
    errors.crest = ''
    showToast({
      title: t('clubRegistration.toasts.crestUploadedTitle'),
      message: t('clubRegistration.toasts.crestUploadedMessage', { fileName: compressedFile.name }),
      mode: 'success',
      duration: 3000
    })
  } catch (error) {
    console.error('Error compressing image:', error);
    crestFile.value = file
    crestFileName.value = file.name
    crestPreviewUrl.value = URL.createObjectURL(file)
    errors.crest = ''
    showToast({
      title: t('clubRegistration.toasts.crestUploadedTitle'),
      message: t('clubRegistration.toasts.crestUploadedMessage', { fileName: file.name }),
      mode: 'success',
      duration: 3000
    })
  }
}

function goToLogin() {
  showLoadingToast({
    title: t('clubRegistration.toasts.returningToLoginTitle'),
    message: t('clubRegistration.toasts.returningToLoginMessage'),
    successTitle: t('clubRegistration.toasts.loginScreenReadyTitle'),
    successMessage: t('clubRegistration.toasts.loginScreenReadyMessage')
  })
  setTimeout(() => router.push('/login'), 900)
}

function goToPresidentRegistration() {
  if (!validateClubForm()) {
    showToast({
      title: t('clubRegistration.toasts.fixFormErrorsTitle'),
      message: t('clubRegistration.toasts.fixFormErrorsMessage'),
      mode: 'error',
      duration: 3500
    })
    return
  }

  const clubData = {
    clubName: clubName.value,
    selectedClubColor: selectedColor.value, // Make sure this is the ref .value!
    crest: toRaw(crestFile.value),
    contactNumber: contactNumber.value // Use .value if this is a ref
  }
  
  showLoadingToast({
    title: t('clubRegistration.toasts.preparingPresidentRegistrationTitle'),
    message: t('clubRegistration.toasts.preparingPresidentRegistrationMessage'),
    successTitle: t('clubRegistration.toasts.moduleReadyTitle'),
    successMessage: t('clubRegistration.toasts.moduleReadyMessage')
  })

  // Wait for the toast animation, then push ONCE with the data
  setTimeout(() => {
    router.push({
      name: 'ClubPresidentRegistration',
      state: { clubInfo: clubData }
    })
  }, 900)
}
</script>

<template>
  <section
    class="relative min-h-screen overflow-hidden bg-background px-4 py-8 md:px-6 md:py-12 lg:px-8 lg:py-16"
    :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'"
  >
    <div class="pointer-events-none absolute inset-0 opacity-20">
      <div
        class="absolute inset-0"
        style="
          background-image: radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.06) 1px,
            transparent 1px
          );
          background-size: 12px 12px;
        "
      />
      <div class="absolute -right-56 top-1/4 h-80 w-80 rounded-full bg-primary-container/10 blur-3xl" />
      <div class="absolute -left-56 bottom-0 h-80 w-80 rounded-full bg-surface-container-high/20 blur-3xl" />
    </div>

    <div class="relative mx-auto w-full max-w-6xl">
      <div class="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <aside
          class="relative hidden overflow-hidden rounded-lg bg-surface-container-low p-8 lg:col-span-5 lg:flex lg:min-h-[620px] lg:flex-col lg:justify-between"
        >
          <div class="absolute inset-0 opacity-10">
            <img :src="pitchLinesImage" alt="" class="h-full w-full object-cover" />
          </div>
          <div class="absolute -right-24 -top-20 h-56 w-56 rounded-full bg-primary-container/10 blur-3xl" />
          <div class="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-primary-fixed/10 blur-3xl" />

          <div class="relative space-y-2">
            <h1 class="font-headline text-5xl font-bold tracking-tight text-on-surface">PitchPro</h1>
            <p class="font-body text-xs tracking-[0.2em] text-primary-fixed">
              {{ t('clubRegistration.elitePerformanceAnalytics') }}
            </p>
          </div>

          <div class="relative space-y-8">
            <blockquote class="max-w-xs font-headline text-4xl leading-tight font-light text-on-surface">
              {{ t('clubRegistration.quote') }}
            </blockquote>

            <div class="flex items-center gap-3">
              <div class="h-12 w-12 overflow-hidden rounded-xl border-2 border-primary-fixed/25 bg-surface-container-high">
                <img :src="playerImage" alt="Marcus Vane" class="h-full w-full object-cover" />
              </div>
              <div>
                <p class="font-body text-sm font-bold text-on-surface">Marcus Vane</p>
                <p class="font-body text-[11px] tracking-[0.12em] text-on-surface-variant">
                  {{ t('clubRegistration.chiefTechnicalScout') }}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div class="lg:col-span-7">
          <div class="rounded-lg bg-surface-container-high p-5 shadow-2xl md:p-8 lg:p-12">
            <header class="mb-8 space-y-2">
              <h2 class="font-headline text-3xl font-bold text-on-surface md:text-4xl">{{ t('clubRegistration.title') }}</h2>
              <p class="max-w-xl font-body text-sm leading-relaxed text-on-surface-variant md:text-base">
                {{ t('clubRegistration.description') }}
              </p>
              <p class="pt-2 text-xs text-on-surface-variant">
                {{ t('clubRegistration.alreadyRegistered') }}
                <a
                  href="#"
                  class="font-semibold text-primary-fixed transition-colors hover:text-primary-fixed-dim"
                  @click.prevent="goToLogin"
                >
                  {{ t('clubRegistration.loginNow') }}
                </a>
              </p>
            </header>

            <form class="space-y-8" autocomplete="off">
              <div class="space-y-2">
                <label class="font-body text-[11px] tracking-[0.18em] text-on-surface-variant" for="club-name">
                  {{ t('clubRegistration.clubName') }}
                </label>
                <input
                  id="club-name"
                  v-model="clubName"
                  type="text"
                  autocomplete="off"
                  :placeholder="t('clubRegistration.clubNamePlaceholder')"
                  class="w-full rounded bg-surface-container-lowest px-4 py-3.5 font-body text-base text-on-surface placeholder:text-surface-container-highest focus:outline-none focus:ring-2 focus:ring-primary-container/60"
                />
                <p v-if="errors.clubName" class="text-xs text-error mt-1">{{ errors.clubName }}</p>
              </div>

              <div class="space-y-2">
                <label class="font-body text-[11px] tracking-[0.18em] text-on-surface-variant" for="club-name">
                  CONTACT NUMBER
                </label>
                <input
                  id="contact-number"
                  v-model="contactNumber"
                  type="text"
                  autocomplete="off"
                  :placeholder="t('clubRegistration.contactNumberPlaceholder')"
                  class="w-full rounded bg-surface-container-lowest px-4 py-3.5 font-body text-base text-on-surface placeholder:text-surface-container-highest focus:outline-none focus:ring-2 focus:ring-primary-container/60"
                />
                <p v-if="errors.contactNumber" class="text-xs text-error mt-1">{{ errors.contactNumber }}</p>
              </div>


              <div class="grid gap-6 md:grid-cols-2">
                <div class="space-y-3">
                  <p class="font-body text-[11px] tracking-[0.18em] text-on-surface-variant">
                    {{ t('clubRegistration.selectColor') }}
                  </p>
                  <div class="flex flex-wrap gap-3">
                    <button
                      v-for="(color, index) in identityColors"
                      :key="color"
                      type="button"
                      :style="{ backgroundColor: color }"
                      @click="selectColor(color)"
                      :class="[
                        'h-10 w-10 rounded transition',
                        selectedColor === color
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-container-high'
                          : '',
                      ]"
                      :aria-label="`Select color ${index + 1}`"
                    />
                  </div>
                  <div class="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      class="flex h-10 w-10 items-center justify-center rounded border border-outline-variant"
                      aria-label="Open color picker"
                      @click="openColorPicker"
                    >
                      <img :src="iconColorPicker" alt="" class="h-3.5 w-3.5" />
                    </button>
                    <input
                      ref="colorInputRef"
                      type="color"
                      v-model="selectedColor"
                      class="h-10 w-10 rounded border border-outline-variant p-0"
                      @input="onCustomColorPicked"
                      aria-label="Selected custom color"
                    />
                    <span class="font-body text-xs text-on-surface-variant">{{ selectedColor }}</span>
                  </div>
                  <div class="mt-4">
                    <p class="font-body text-[11px] tracking-[0.18em] text-on-surface-variant mb-2">{{ t('clubRegistration.colorPreview') }}</p>
                    <div class="flex items-center gap-3">
                      <div class="h-16 w-16 rounded-full border-2 border-outline-variant" :style="{ backgroundColor: selectedColor }"></div>
                      <div class="flex flex-col">
                        <span class="font-body text-sm font-bold text-on-surface">{{ t('clubRegistration.selectedClubColor') }}</span>
                        <span class="font-body text-xs text-on-surface-variant">{{ selectedColor.toUpperCase() }}</span>
                      </div>
                    </div>
                  </div>
                  <p v-if="errors.selectedClubColor" class="text-xs text-error mt-1">{{ errors.selectedClubColor }}</p>
                </div>

                <div class="space-y-2">
                  <p class="font-body text-[11px] tracking-[0.18em] text-on-surface-variant">{{ t('clubRegistration.uploadCrest') }}</p>
                  <button
                    type="button"
                    class="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-outline-variant px-4 py-7 text-center"
                    @click="openCrestPicker"
                  >
                    <img
                      v-if="crestPreviewUrl"
                      :src="crestPreviewUrl"
                      alt="Club crest preview"
                      class="h-14 w-14 rounded object-cover"
                    />
                    <img v-else :src="iconUpload" alt="" class="h-5 w-4" />
                    <span class="font-body text-[10px] tracking-[-0.03em] text-on-surface-variant">
                      {{ crestFileName || t('clubRegistration.fileSpecs') }}
                    </span>
                  </button>
                  <input
                    ref="crestInputRef"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    class="sr-only"
                    @change="onCrestChange"
                  />
                  <p v-if="errors.crest" class="text-xs text-error mt-1">{{ errors.crest }}</p>
                </div>
              </div>

              <div class="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  class="pressable flex items-center gap-2 font-body text-xs tracking-[0.12em] text-on-surface-variant"
                  @click="goToLogin"
                >
                  <img :src="iconArrowLeft" alt="" class="h-2.5 w-2.5" />
                  {{ t('clubRegistration.backToLogin') }}
                </button>

                <button
                  type="button"
                  :disabled="!isFormValid"
                  :class="[
                    'pressable flex items-center justify-center gap-3 rounded-md px-6 py-4 font-headline text-sm font-bold tracking-[0.11em] sm:px-10 transition',
                    isFormValid
                      ? 'text-[#007117] shadow-[0_10px_15px_rgba(0,255,65,0.20)] hover:brightness-105'
                      : 'text-on-surface-variant opacity-50 cursor-not-allowed pointer-events-none'
                  ]"
                  style="
                    background: linear-gradient(
                      134.564deg,
                      rgb(235, 255, 226) 0%,
                      rgb(0, 255, 65) 100%
                    );
                  "
                  @click="goToPresidentRegistration"
                >
                  {{ t('clubRegistration.proceedToCredentials') }}
                  <img :src="iconArrowRight" alt="" class="h-2.5 w-2.5" />
                </button>
              </div>
            </form>
          </div>

          <footer class="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 pb-2 text-center">
            <a
              v-for="item in footerLinks"
              :key="item"
              href="#"
              class="font-body text-[10px] tracking-[0.2em] text-on-surface-variant"
            >
              {{ t(item) }}
            </a>
          </footer>
        </div>
      </div>
    </div>
  </section>
</template>
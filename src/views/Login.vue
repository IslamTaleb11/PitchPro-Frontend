<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUiToast } from '../composables/useUiToast'

const router = useRouter()
const { showLoadingToast, showToast } = useUiToast()

const showPassword = ref(false)
const form = reactive({
  email: '',
  password: '',
  stayLoggedIn: false
})

function handleLogin() {
  showLoadingToast({
    title: 'Accessing terminal',
    message: 'Verifying tactical credentials...',
    successTitle: 'Access granted',
    successMessage: 'Welcome back, Technical Director.'
  })
  setTimeout(() => router.push('/dashboard/staff-management'), 900)
}

function handleSsoLogin() {
  showLoadingToast({
    title: 'Launching SSO login',
    message: 'Connecting to federation provider...',
    successTitle: 'SSO connected',
    successMessage: 'Identity provider responded successfully.'
  })
}

function handleBiometricLogin() {
  showToast({
    title: 'Biometric required',
    message: 'Biometric API not connected yet in this demo.',
    mode: 'info'
  })
}
</script>

<template>
  <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 text-on-surface">
    <div
      class="pointer-events-none absolute inset-0"
      style="
        background-image:
          linear-gradient(to right, rgba(0, 230, 57, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 230, 57, 0.05) 1px, transparent 1px);
        background-size: 40px 40px;
      "
    />
    <div class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
      <div class="relative flex h-[819px] w-[80vw] items-center justify-center border-2 border-primary-fixed-dim">
        <div class="absolute top-1/2 h-px w-full bg-primary-fixed-dim" />
        <div class="h-48 w-48 rounded-full border-2 border-primary-fixed-dim" />
      </div>
    </div>

    <div class="relative z-10 w-full max-w-md">
      <div class="mb-12 flex items-end gap-6">
        <div class="relative">
          <div
            class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-surface-container-highest shadow-[0_0_30px_rgba(0,230,57,0.15)]"
          >
            <img
              alt="PitchPro Club Logo"
              class="h-14 w-14 object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDR7c8D4tGZxbvo-R1MEEPyokq5HnnR_xr_zpRvGR3PDmjCp916r_wpJNoAmdYZgGdZQiZeskR0YUqioTTpAgVE2MiR9_qzNkkZdu0lzc_zqzCc2r3joq8SiLwJKid7huMmIgDYThZXrAdB22OYTAtlW6B_pHm-qiElTIAgToEen9gym4jMCG9W6TC6QerNvDoR4uPqeHOTmSv5xAF2r5la2iFERkA5om6McLmx6KhKw2zU9l2ns2WR9-rEzNgcAgJ_bOCA4Wrrdhw"
            />
          </div>
          <div
            class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-sm border border-primary-fixed-dim/30 bg-primary-fixed-dim/20 backdrop-blur-md"
          >
            <span class="material-symbols-outlined text-[14px] text-primary-fixed-dim">verified</span>
          </div>
        </div>
        <div class="flex-1 border-l-2 border-primary-fixed-dim pl-4">
          <h1 class="font-headline text-3xl font-bold tracking-tighter text-white">PitchPro</h1>
          <p class="font-headline text-xs font-medium uppercase tracking-[0.2em] text-primary-fixed">
            Technical Director
          </p>
        </div>
      </div>

      <div class="rounded-lg border-t-2 border-primary-fixed-dim/30 bg-surface-container-low/80 p-8 shadow-2xl backdrop-blur-xl">
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div class="space-y-4">
            <div class="space-y-1.5">
              <label class="block px-1 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Tactical ID (Email)
              </label>
              <div class="group relative">
                <span
                  class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary-fixed-dim"
                >
                  alternate_email
                </span>
                <input
                  v-model="form.email"
                  type="email"
                  placeholder="director@pitchpro.io"
                  class="w-full rounded-sm border-none bg-surface-container-lowest py-3.5 pl-11 font-body text-sm text-on-surface placeholder:text-on-surface/20 transition-all focus:ring-1 focus:ring-primary-fixed-dim"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block px-1 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Security Key (Password)
              </label>
              <div class="group relative">
                <span
                  class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary-fixed-dim"
                >
                  lock
                </span>
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••••••"
                  class="w-full rounded-sm border-none bg-surface-container-lowest py-3.5 pl-11 font-body text-sm text-on-surface placeholder:text-on-surface/20 transition-all focus:ring-1 focus:ring-primary-fixed-dim"
                />
                <button
                  type="button"
                  class="pressable absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white"
                  @click="showPassword = !showPassword"
                >
                  <span class="material-symbols-outlined text-[20px]">
                    {{ showPassword ? 'visibility' : 'visibility_off' }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <label class="group flex cursor-pointer items-center gap-2">
              <div class="relative flex items-center justify-center">
                <input
                  v-model="form.stayLoggedIn"
                  type="checkbox"
                  class="peer h-4 w-4 appearance-none rounded-sm border border-outline-variant bg-surface-container-highest transition-all checked:border-primary-fixed-dim checked:bg-primary-fixed-dim"
                />
                <span
                  class="material-symbols-outlined pointer-events-none absolute scale-0 text-[12px] font-bold text-on-primary-fixed transition-transform peer-checked:scale-100"
                >
                  check
                </span>
              </div>
              <span class="text-xs text-on-surface-variant transition-colors group-hover:text-on-surface">Stay logged in</span>
            </label>
            <a href="#" class="text-xs font-medium text-primary-fixed/80 transition-colors hover:text-primary-fixed-dim">
              Forgot password?
            </a>
          </div>

          <div class="space-y-4 pt-4">
            <button
              type="submit"
              class="pressable group relative w-full overflow-hidden rounded-md bg-gradient-to-br from-primary to-primary-container p-[1px]"
            >
              <div
                class="flex items-center justify-center gap-3 bg-primary-container py-4 transition-colors group-hover:bg-primary-fixed-dim"
              >
                <span class="font-headline text-sm font-bold uppercase tracking-widest text-on-primary-container">
                  Access Terminal
                </span>
                <span class="material-symbols-outlined text-[18px] font-bold text-on-primary-container">
                  arrow_forward
                </span>
              </div>
            </button>

            <div class="flex items-center gap-4 py-2">
              <div class="h-px flex-1 bg-outline-variant/30" />
              <span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">System Check</span>
              <div class="h-px flex-1 bg-outline-variant/30" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                class="pressable group flex items-center justify-center gap-2 rounded-sm border border-outline-variant/20 bg-surface-container-high py-3 transition-colors hover:bg-surface-container-highest"
                @click="handleSsoLogin"
              >
                <img
                  alt="Google icon"
                  class="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuChnr9Wz6YVsTHb-HpKxPCXWbd2eJipzAOArGxzPn1Cb8Foqs7SIcmuQJ5uAPT2SKddL2SJqItJaQtut-ozHXTLu4oAMUSGSqPGWclccDbA9MRHER7Q7ieNuThvDeBCV5BMBCLVYPHD6vDCebGScNWgym1E55aOuY6WNYyTFjNP8U7ilMm_6JAnlJkt3bSlUdoNgoqnVlBEfUrtXgKEQPZJStkI2r2Ypzgt9rbfIcw9qWXl3xTCpsO2BXz0dogLZoJ3_VitwNOiYNA"
                />
                <span class="text-xs font-medium text-on-surface-variant">SSO Login</span>
              </button>
              <button
                type="button"
                class="pressable group flex items-center justify-center gap-2 rounded-sm border border-outline-variant/20 bg-surface-container-high py-3 transition-colors hover:bg-surface-container-highest"
                @click="handleBiometricLogin"
              >
                <span class="material-symbols-outlined text-[18px] text-on-surface-variant transition-colors group-hover:text-primary-fixed-dim">
                  fingerprint
                </span>
                <span class="text-xs font-medium text-on-surface-variant">Biometric</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <div class="mt-8 flex items-center justify-between px-2">
        <div class="flex gap-4">
          <span class="font-mono text-[10px] uppercase text-on-surface-variant/40">v4.0.2-stable</span>
          <span class="font-mono text-[10px] uppercase text-on-surface-variant/40">Lat: 51.5074 N</span>
        </div>
        <p class="text-[10px] font-medium text-on-surface-variant/60">© 2025 PitchPro Analytics</p>
      </div>
    </div>

    <div class="pointer-events-none absolute bottom-10 right-10 flex select-none flex-col items-end gap-2 opacity-30">
      <div class="relative h-1 w-32 bg-primary-fixed-dim/20">
        <div class="absolute right-0 top-0 h-full w-8 bg-primary-fixed-dim" />
      </div>
      <p class="font-headline text-[10px] uppercase tracking-widest text-primary-fixed">Encryption Active</p>
    </div>
  </main>
</template>

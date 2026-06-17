<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import GlobalToast from './components/GlobalToast.vue'
import Header from './components/Header.vue'

const route = useRoute()

const showHeader = computed(() => {
  return ['Login', 'ClubRegistration', 'ClubPresidentRegistration'].includes(route.name)
})
</script>

<template>
  <Header v-if="showHeader" />
  <main>
    <router-view />
    <GlobalToast />
  </main>
</template>

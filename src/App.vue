<script setup>
import GlobalToast from './components/GlobalToast.vue'
import Header from './components/Header.vue'
</script>

<template>
  <Header />
  <main>
    <router-view />
    <GlobalToast />
  </main>
</template>

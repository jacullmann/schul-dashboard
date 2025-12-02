<template>
  <div class="notfound-wrap">
    <p>404 – Page not found</p>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();

function goHome() {
  router.push('/');
}
function goBack() {
  window.history.length > 1 ? window.history.back() : (router.push('/'));
}
</script>

<style scoped>
.notfound-wrap {
  min-height: 100vh;
}
h1{

}

</style>

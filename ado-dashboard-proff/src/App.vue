<template>
  <div>
    <header class="container" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <h1 style="margin:0; font-size:22px;">Bewertungen</h1>
      <nav class="row" style="gap:8px;">
        <router-link to="/" class="badge">Übersicht</router-link>
        <router-link to="/admin" class="badge">Admin</router-link>
      </nav>
    </header>
    <main class="container">
      <router-view />
    </main>
    <footer class="container" style="margin-top:40px;">
      <hr />
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div>© {{ year }} — Bei Fragen kontaktieren sie uns über support@gmail.com</div>
        <div style="opacity:0.5;">
          <router-link to="/admin">Login</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const year = new Date().getFullYear();
</script>

<script setup lang="ts">

import AGB from "../legal/AGB.vue";
import DatenschutzPage from "../legal/DatenschutzPage.vue";
import ImpressumPage from "../legal/ImpressumPage.vue";
</script>

<template>
  <div class="card container">
    <div class="card-header">
      <h1>Rechtliches</h1>
    </div>
    <div class="card-body">
      <div class="down">
      <AGB />
      </div>
      <div class="down">
      <DatenschutzPage />
      </div>
      <div class="down">
      <ImpressumPage />
      </div>
    </div>

  </div>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.down {
  border-bottom: 2px solid white;
  margin-bottom: 30px;
}

</style>
<script setup lang="ts">
import Nutzungsbedingungen from "@/modules/legal/components/Nutzungsbedingungen.vue";
import DatenschutzPage from "@/modules/legal/components/DatenschutzPage.vue";
import ImpressumPage from "@/modules/legal/components/ImpressumPage.vue";
</script>

<template>
  <div class="card container">
    <div class="card-header">
    </div>
    <div class="card-body">
      <div class="down">
        <ImpressumPage />
      </div>
      <div class="down">
      <Nutzungsbedingungen />
      </div>
      <div>
      <DatenschutzPage />
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
  background-color: var(--bg);
}
.down {
  border-bottom: 2px solid var(--text);
  margin-bottom: 30px;
}

</style>
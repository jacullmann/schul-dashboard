<script setup lang="ts">
import Nutzungsbedingungen from "@/modules/legal/components/Terms.vue";
import DatenschutzPage from "@/modules/legal/components/PrivacyPolicy.vue";
import ImpressumPage from "@/modules/legal/components/Impress.vue";
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
  background-color: var(--color-canvas);
}
.down {
  border-bottom: 2px solid var(--color-on-surface);
  margin-bottom: 30px;
}

</style>
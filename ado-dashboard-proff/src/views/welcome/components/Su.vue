<template>
  <section class="info-section">

    <div class="info-container">
      <h3 class="info-title">
        Papier ist von
        <span class="highlight">gestern.</span>
        Starte heute noch in die
        <span class="highlight">Zukunft</span>
      </h3>
      <ImageComparison/>
    </div>

    <div class="info-container">
      <h3 class="info-title">
        Warum Schul Dashboard?
      </h3>
      <h3 class="info-title">
        <span class="highlight">Von </span>
        Schülern
        <span class="highlight">für </span>
        Schüler, das heißt:
      </h3>
      <div class="info-promises">
        <span>0 unnötige Zettel</span>
        <span>0 Euro</span>
        <span>0 Werbung</span>
        <span>0 verkaufte Daten</span>
        <span>100% Liebe zum Detail</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import ImageComparison from "../ImageComparison.vue";
</script>

<style scoped>
.info-section {
  display:flex;
  flex-direction: column;
  max-width: 1000px;
  padding-block: 5rem;
}

.info-container {
  display:flex;
  gap: 16px;
}

.info-title {
  font-size: 1.4rem;
  font-weight: medium;
}

.info-title .highlight{
  font-weight: bold;
}

.info-promises {
  font: var(--normal-font);
  font-size: 32px;
  line-height: 48px;
  color: var(--text);
  font-weight:medium;
}
</style>
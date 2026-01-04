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
        <div><span class="highlight">0</span> unnötige Zettel</div>
        <div><span class="highlight">0</span> Euro</div>
        <div><span class="highlight">0</span> Werbung</div>
        <div><span class="highlight">0</span> verkaufte Daten</div>
        <div><span class="highlight">0</span> Liebe zum Detail</div>
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
  gap: 32px;
  max-width: 1000px;
  padding-block: 5rem;
}

.info-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-title {
  font-size: 1.4rem;
  font-weight: 500;
}

.info-title .highlight{
  font-weight: 700;
}

.info-promises {
  font: var(--normal-font);
  font-size: 32px;
  line-height: 48px;
  color: var(--text);
  font-weight:500;
}
.info-promises .highlight {
  font-weight: 700;
}
</style>
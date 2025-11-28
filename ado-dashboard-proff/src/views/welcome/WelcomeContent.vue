<script setup lang="ts">
import MehrErfahren from "./MehrErfahren.vue";
import UseDashboard from "./UseDashboard.vue";
import Special from "./Special.vue";
import G from "./G.vue";
import Line from './Line.vue'

defineProps<{
  onStartClick: () => void;
}>();
</script>

<template>
  <div class="welcome-section">
    <div class="visual-container">
      <Special class="svg-placeholder" />
    </div>

    <div class="text-content">
      <h1 class="headline">Schule im Überblick</h1>
      <p class="subline">
        Alle Infos zu jeder Zeit in deiner Hosentasche.
        Kollaborativ und
        <span class="free"><span class="line-span">komplett kostenfrei <Line class="line"/></span> </span>.
      </p>

      <div class="action-buttons">
        <MehrErfahren class="action-btn secondary" />

        <G @click="onStartClick" >Jetzt loslegen</G>
      </div>
    </div>

  </div>
</template>

<style scoped>

.line {
  height: 12px;
  width: 100%;
  position: absolute;
  bottom: -10px;
  left: 0;
}
.line-span {
  display: inline-block;
  position: relative;
}
.welcome-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  max-width: 1200px;
  width: 90%;
  margin: 0 auto;
  min-height: calc(100vh - 70px - 50px - 2rem);
  gap: 40px;
  padding: 40px 0;
}

.visual-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 300px;
}

.svg-placeholder {
  width: 100%;
  max-width: 600px;
  height: auto;
  min-height: 400px;
  border-radius: 20px;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;;
}

.text-content {
  flex: 1;
  max-width: 500px;
  color: white;
}

.headline {
  font-size: 7rem;
  font-weight: 600;
  line-height: 1.1;
  margin-bottom: 24px;
  letter-spacing: -0.05em;
  text-align: right;
}

.subline {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 32px;
  color: #c0c0c0;
  text-align: right;

}


.free {
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 20px;
  margin-top: 30px;
  justify-content: flex-end;
}

.action-btn {
  padding: 14px 30px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 180px;
}

.primary {
  background:linear-gradient(
      to right,
      #FFBC4C 0%,
      #FFBC4C 7%,
      #FF6683 40%,
      #BF33FF 69%,
      #7833FF 100%
  );;
}

.primary:hover {
}

.secondary {
  background: none;
}

.secondary:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

@media (max-width: 992px) {
  .welcome-section {
    flex-direction: column;
    text-align: center;
    padding: 20px 0;
  }

  .text-content {
    max-width: 100%;
    order: 1;
  }

  .visual-container {
    order: 2;
  }

  .headline {
    font-size: 3rem;
    text-align: center;
  }

  .subline {
    font-size: 1.1rem;
    text-align: center;
  }

  .action-buttons {
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .headline {
    font-size: 2.5rem;
  }

  .action-buttons {
    flex-direction: column;
    gap: 10px;
  }

  .action-btn {
    min-width: 100%;
  }
}
</style>
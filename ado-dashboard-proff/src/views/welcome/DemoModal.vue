<template>
  <div class="login-card instruction-card">
    <div class="card-body documentation-body">
      <transition :name="transitionName" mode="out-in">
        <div :key="currentStep" class="step-content">
          <template v-if="currentStep === 0">
            <h3 class="step-title">Immer dabei</h3>
            <p class="step-text">Mit deinem persönlichen Zugang hast du immer Zugriff auf dein Dashboard. Ob zuhause am PC, oder in der Schule am Handy. </p>
          </template>
          <template v-else-if="currentStep === 1">
            <h3 class="step-title">Dein persönliches Dashboard</h3>
            <p class="step-text">Behalte immer den Überblick mit deinem ganz persönlichen Dashboard! Personalisiere es ganz nach deinen Wünschen!</p>
          </template>
          <template v-else-if="currentStep === 2">
            <h3 class="step-title">Teile mit anderen</h3>
            <p class="step-text">Du bist schon fertig? Dann hilf anderen dabei, genauso gut zu sein wie du! Du kannst das Dashboard jedoch auch problemlos nutzen, ohne selber Sachen hochzuladen.</p>
          </template>
          <template v-else-if="currentStep === 3">
            <h3 class="step-title">Weniger Stress</h3>
            <p class="step-text">Ein besserer Überblick bedeutet weniger Stress und mehr Freizeit! Mit dem Dashboard bist du immer auf dem neusten Stand.</p>
          </template>
        </div>
      </transition>
    </div>

    <div class="step-indicator">
      <div class="pagination-dots">
            <span
                v-for="(_, index) in stepsLengthArray"
                :key="index"
                :class="['dot', { 'is-active': index === currentStep }]"
                @click="goToStep(index)"
            ></span>
      </div>
    </div>

    <div class="card-footer navigation-footer">
      <button
          class="nav-btn"
          @click="prevStep"
      >
        <span>Zurück</span>
      </button>

      <button
          class="nav-btn"
          @click="nextStep"
      >
        <span>Weiter</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
const currentStep = ref(0);
const transitionDirection = ref('forward');

const STEPS_COUNT = 4;
const stepsLengthArray = Array.from({ length: STEPS_COUNT });

const transitionName = computed(() => {
  return transitionDirection.value === 'forward' ? 'slide-forward' : 'slide-backward';
});


function nextStep() {
  if (currentStep.value < STEPS_COUNT - 1) {
    transitionDirection.value = 'forward';
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    transitionDirection.value = 'backward';
    currentStep.value--;
  }
}

function goToStep(index: number) {
  if (index === currentStep.value || index < 0 || index >= STEPS_COUNT) return;

  transitionDirection.value = index > currentStep.value ? 'forward' : 'backward';
  currentStep.value = index;
}

</script>

<style scoped>
.login-card {
  background: rgba(30, 30, 30, 0.6);
  border-radius: 24px;
  padding: 32px;
  max-width: 410px;
  height: 450px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  overflow: hidden;
}

.card-body {
  flex-grow: 1;
  overflow: hidden;
  padding-right: 8px;
}
.card-body::-webkit-scrollbar { width: 8px; }
.card-body::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}
.card-body::-webkit-scrollbar-track { background: transparent; }


.card-footer {
  padding-top: 10px;
}

.documentation-body {
  padding: 0 4px 16px 4px;
}

.step-content {
  min-height: 200px;
}

.step-title {
  font-size: 1.5rem;
  color: #fff;
  margin-top: 0;
  margin-bottom: 12px;
  font-weight: 600;
}

.step-text {
  font-size: 1rem;
  color: #a1a1aa;
  line-height: 1.6;
}

.navigation-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.nav-btn {
  width: 80px;
  border-radius: 8px;
  font-size: 15px;
  background: rgba(120, 120, 120, 0.2);
  height: 30px;
  color: #fff;
  transition: all 0.2s ease;
}
.nav-btn:hover {
  background: rgba(180, 180, 180, 0.2);
}


.step-indicator {
  text-align: center;
  margin-top: 24px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: #71717a;
}

.pagination-dots {
  margin-top: 8px;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.dot {
  display: block;
  width: 10px;
  height: 10px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.dot.is-active {
  background: #fff;
  transform: scale(1.2);
}

.slide-forward-enter-active,
.slide-forward-leave-active,
.slide-backward-enter-active,
.slide-backward-leave-active {
  transition: all 0.3s ease-out;
  position: absolute;
  width: 100%;
}

.slide-forward-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.slide-forward-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.slide-backward-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.slide-backward-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.documentation-body {
  position: relative;
}
.documentation-body > div {
  position: relative;
}
</style>
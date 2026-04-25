<script setup lang="ts">
import { ref, computed } from 'vue';
import { Target, Clock } from '@lucide/vue';

const emit = defineEmits<{
  (e: 'finish', score: number): void;
}>();

const TARGETS_TOTAL = 30;

type TestState = 'idle' | 'playing' | 'result';
const state = ref<TestState>('idle');
const targetsHit = ref(0);
const startTime = ref(0);
const endTime = ref(0);

const targetPosition = ref({ x: 50, y: 50 });

const averageTime = computed(() => {
  if (targetsHit.value === 0) return 0;
  return Math.round((endTime.value - startTime.value) / TARGETS_TOTAL);
});

function startGame() {
  state.value = 'playing';
  targetsHit.value = 0;
  startTime.value = Date.now();
  moveTarget();
}

function hitTarget() {
  if (state.value !== 'playing') return;
  targetsHit.value++;
  if (targetsHit.value >= TARGETS_TOTAL) {
    endTime.value = Date.now();
    state.value = 'result';
  } else {
    moveTarget();
  }
}

function moveTarget() {
  targetPosition.value = {
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
  };
}

function reset() {
  state.value = 'idle';
  targetsHit.value = 0;
}

function saveAndExit() {
  emit('finish', averageTime.value);
}
</script>

<template>
  <div
    class="absolute inset-0 flex items-center justify-center bg-[#2b87d1] text-white text-center select-none"
    :class="state"
  >
    <div v-if="state === 'idle'" class="flex flex-col items-center">
      <Target :size="64" class="mb-5" />
      <h2 class="text-[3rem] font-extrabold mb-3">Aim Trainer</h2>
      <p class="text-[1.5rem] opacity-90 mb-[30px]">
        Klicke auf 30 Zielscheiben so schnell du kannst.
      </p>
      <BaseButton
        class="p-3.5 px-7 rounded-xl text-[1.1rem] font-semibold border-none cursor-pointer transition-transform hover:scale-105 bg-white text-[#2b87d1]"
        @click="startGame"
        >Starten</BaseButton
      >
    </div>

    <div
      v-else-if="state === 'playing'"
      class="absolute inset-0 flex flex-col"
      @mousedown.prevent
    >
      <div class="p-5 text-[1.5rem] font-bold text-center">
        Ziele: {{ targetsHit }} / {{ TARGETS_TOTAL }}
      </div>
      <div class="flex-1 relative overflow-hidden">
        <div
          class="absolute w-[60px] h-[60px] rounded-full bg-white -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.2)]"
          :style="{ left: `${targetPosition.x}%`, top: `${targetPosition.y}%` }"
          @mousedown="hitTarget"
        >
          <div class="w-5 h-5 rounded-full bg-[#ffaa00]"></div>
        </div>
      </div>
    </div>

    <div v-else-if="state === 'result'" class="flex flex-col items-center">
      <Clock :size="64" class="mb-5" />
      <h2 class="text-[3rem] font-extrabold mb-3">Durchschnittszeit</h2>
      <p class="text-[4rem] font-extrabold mb-10">{{ averageTime }} ms</p>
      <div class="flex gap-4">
        <BaseButton
          class="p-3.5 px-7 rounded-xl text-[1.1rem] font-semibold border-none cursor-pointer transition-transform hover:scale-105 bg-white text-[#2b87d1]"
          @click="saveAndExit"
          >Speichern & Beenden</BaseButton
        >
        <BaseButton
          class="p-3.5 px-7 rounded-xl text-[1.1rem] font-semibold border-none cursor-pointer transition-transform hover:scale-105 bg-[rgba(255,255,255,0.2)] text-white"
          @click="reset"
          >Nochmal</BaseButton
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import DraggableCard from './RR.vue';

const showCard = ref(false);
const originRect = ref({ x: 0, y: 0 });

function openCard(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  originRect.value = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };

  showCard.value = true;
}

function handleClose() {
  showCard.value = false;
}
</script>

<template>
  <div style="padding: 50px;">
    <button
        @click="openCard($event)"
        :disabled="showCard"
        style="padding: 10px 20px; font-size: 16px; position: relative; z-index: 1;"
    >
      Neue Leere Notiz
    </button>

    <DraggableCard
        :is-visible="showCard"
        :origin="originRect"
        @close="handleClose"
    />
  </div>
</template>
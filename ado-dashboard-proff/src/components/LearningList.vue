<template>
  <div class="learning-list-container">
    <div class="ipnp">
      <h3 class="list-title">Lernzettel: Gedichtsanalyse</h3>
      <div class="bate" @click="bata">
        <X class="iba"/>
      </div>
    </div>
    <ul class="task-list">
      <li v-for="item in learningItems" :key="item.id">
        <div class="task-item">
          <ArrowRight class="task-icon"/>
          <span class="task-text">{{ item.text }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, defineEmits } from 'vue';
import { ArrowRight, X } from 'lucide-vue-next'

const emit = defineEmits(['bat']);

function bata(){
  emit('bat');
}

const learningItems = ref([
  { id: 1, text: 'Aufbau der Gedichtsanalyse' },
  { id: 2, text: 'Fachbegriffe für Metrik & Reime' },
  { id: 3, text: 'Schreibplan schreiben' },
  { id: 4, text: 'Interpretation' },
  { id: 5, text: 'Wichtige Stilmittel können' },
]);

</script>

<style scoped>
.iba {
  color: inherit;
  transition: 0.1s ease-out;
}
.iba:hover{
  transform: rotate(90deg);

}
.ipnp {
  display: flex;
  flex-direction: row;
}
.bate {
  cursor: pointer;
  pointer-events: auto;
}
.learning-list-container {
  margin-top: 15px;
  padding: 15px;
  background-color: #1e1e1e; /* Dunklerer Hintergrund für Kontrast */
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}

.list-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
  border-bottom: 1px solid #333;
  padding-bottom: 8px;
  margin-top: 0;
  margin-bottom: 15px;
}

.task-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.task-list li {
  padding: 8px 0;
}

.task-list li:last-child {
  border-bottom: none;
}

.task-item {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  color: #cccccc;
}

.task-icon {
  margin-right: 10px;
  /* Optionale Anpassung der Icon-Farbe, falls ArrowRight nicht die Textfarbe übernimmt */
  color: #888888;
}

.task-text {
  /* Stellt sicher, dass der Text die richtige Farbe hat */
  color: #cccccc;
}
</style>
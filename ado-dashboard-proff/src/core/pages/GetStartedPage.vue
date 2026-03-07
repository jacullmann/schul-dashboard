<template>
  <div class="get-started-page">
    <div class="page-header">
      <h1 class="page-title">Hallo!</h1>
      <p class="page-subtitle">Wähle eine Option, um loszulegen:</p>
    </div>

    <div class="options-grid">
      <!-- Gruppe beitreten -->
      <button class="option-card" @click="showJoinGroupModal = true">
        <div class="option-icon-wrapper">
          <component :is="LogIn" :size="28" class="option-icon" />
        </div>
        <div class="option-body">
          <h2 class="option-title">Gruppe beitreten</h2>
          <p class="option-desc">Verbinde dich mit einer existierenden Gruppe deiner Klasse.</p>
        </div>
      </button>

      <!-- Gruppe erstellen -->
      <button class="option-card" @click="showCreateGroupModal = true">
        <div class="option-icon-wrapper">
          <component :is="Plus" :size="28" class="option-icon" />
        </div>
        <div class="option-body">
          <h2 class="option-title">Gruppe erstellen</h2>
          <p class="option-desc">Erstelle eine neue Gruppe und lade deine Klasse ein.</p>
        </div>
      </button>
    </div>

    <CreateGroupModal
        v-if="showCreateGroupModal"
        @close="showCreateGroupModal = false"
    />
    <JoinGroupModal
        v-if="showJoinGroupModal"
        @close="showJoinGroupModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { LogIn, Plus } from 'lucide-vue-next';
import CreateGroupModal from '@/modules/auth/components/CreateGroupModal.vue';
import JoinGroupModal from '@/modules/auth/components/JoinGroupModal.vue';

const showCreateGroupModal = ref(false);
const showJoinGroupModal = ref(false);
</script>

<style scoped>
.get-started-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 70px - 50px - 2rem);
  padding: 40px 24px;
  box-sizing: border-box;
}

.page-header {
  text-align: center;
  margin-bottom: 48px;
}

.page-title {
  font-size: 3.5rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
  font-family: var(--display-font), sans-serif;
}

.page-subtitle {
  font-size: var(--font-size-title);
  color: var(--sub);
  margin: 0;
  line-height: 1.5;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
  max-width: 640px;
}

.option-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: var(--border-7);
  cursor: pointer;
  text-align: left;
  box-shadow: var(--input-shadow);
  transition: transform 0.15s ease;
  position: relative;
  overflow: hidden;
}

.option-card:hover {
  transform: translateY(-2px);
}

.option-icon-wrapper {
  color: var(--text);
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-icon {
  display: block;
}

.option-body {
  flex: 1;
  min-width: 0;
}

.option-title {
  font-size: var(--font-size-title);
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
  font-family: var(--display-font), sans-serif;
  letter-spacing: -0.01em;
}

.option-desc {
  font-size: var(--font-size-sub);
  color: var(--sub);
  margin: 0;
  line-height: 1.45;
}

@media (max-width: 640px) {
  .options-grid {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .page-title {
    font-size: 2.5rem;
  }

  .page-header {
    margin-bottom: 32px;
  }
}
</style>

<template>
  <div class="create-entry-wrapper">
    <button
        class="btn mg action"
        @click="toggleMenu"
        ref="buttonRef"
    >
      <Plus size="28px" />
    </button>

    <div
        v-if="isOpen"
        class="entry-menu entry-menu-pseudo"
    >
      <div class="pseudo-content">
        <h4 style="margin: 0">
          Möchtest du einen Eintrag erstellen?
        </h4>
        <p>Melde dich an, um Einträge zu erstellen.</p>
        <div class="row">
          <button class="btn action smaller" @click="openAuthModal">
            Anmelden
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Plus } from 'lucide-vue-next';

const isOpen = ref(false);
const buttonRef = ref<HTMLButtonElement | null>(null);

function toggleMenu() {
  isOpen.value = !isOpen.value;
}

function openAuthModal() {
  isOpen.value = false;
  window.dispatchEvent(new CustomEvent('show-auth-modal'));
}

function handleClickOutside(event: MouseEvent) {
  if (!isOpen.value) return;

  const target = event.target as HTMLElement;
  const wrapper = buttonRef.value?.closest('.create-entry-wrapper');
  if (wrapper && !wrapper.contains(target)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.create-entry-wrapper {
  position: relative;
  display: inline-block;
}

.entry-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  min-width: 300px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  gap: 5px;
  z-index: 1000;
  box-shadow: var(--shadow-s);
  animation: menuFadeIn 160ms ease;
}

.pseudo-content p {
  font-size: 14px;
  margin-block: 4px 16px;
  color: var(--sub);
}
@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.mg {
  padding: 4px;
}
.row {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
@media (max-width: 613px) {
  .entry-menu {
    left: auto;
    right: 0;
  }
}
@media (max-width: 379px) {
  .entry-menu {
    right: auto;
    left: 0;
  }
}
</style>
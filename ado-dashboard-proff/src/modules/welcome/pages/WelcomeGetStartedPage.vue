<template>
  <div class="get-started-page">
    <div class="page-header">
      <h1 class="page-title">Willkommen</h1>
      <p class="page-subtitle">Was möchtest du tun?</p>
    </div>

    <div class="options-grid">
      <!-- Gruppe beitreten -->
      <button class="option-card" @click="navigateToAuth">
        <div class="option-icon-wrapper join">
          <component :is="LogIn" :size="28" class="option-icon" />
        </div>
        <div class="option-body">
          <h2 class="option-title">Gruppe beitreten</h2>
          <p class="option-desc">Du hast bereits einen Zugangscode? Melde dich hier an.</p>
        </div>
        <component :is="ArrowRight" :size="18" class="option-arrow" />
      </button>

      <!-- Gruppe erstellen -->
      <button class="option-card" @click="handleCreateGroupClick">
        <div class="option-icon-wrapper create">
          <component :is="Plus" :size="28" class="option-icon" />
        </div>
        <div class="option-body">
          <h2 class="option-title">Gruppe erstellen</h2>
          <p class="option-desc">Erstelle eine neue Gruppe und lade deine Klasse ein.</p>
        </div>
        <component :is="ArrowRight" :size="18" class="option-arrow" />
      </button>
    </div>

    <CreateGroupModal
        v-if="showCreateGroupModal"
        @close="showCreateGroupModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { LogIn, Plus, ArrowRight } from 'lucide-vue-next';
import CreateGroupModal from '@/modules/auth/components/CreateGroupModal.vue';
import { useUserStore } from '@/stores/userStore';
import { useGlobalAuthModal } from '@/core/composables/useGlobalAuthModal';

const router = useRouter();
const userStore = useUserStore();
const { openAuthModal } = useGlobalAuthModal();

const showCreateGroupModal = ref(false);

function navigateToAuth() {
  router.push('/welcome/auth');
}

async function handleCreateGroupClick() {
  if (!userStore.isLoggedIn) {
    try {
      await openAuthModal();
    } catch {
      return;
    }
  }

  if (userStore.isLoggedIn) {
    showCreateGroupModal.value = true;
  }
}
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

/* ── Header ─────────────────────────────────────── */
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
  font-size: 1.15rem;
  color: var(--sub);
  margin: 0;
  line-height: 1.5;
}

/* ── Options grid ────────────────────────────────── */
.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
  max-width: 760px;
}

/* ── Option card ─────────────────────────────────── */
.option-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20px;
  padding: 28px 24px;
  background: var(--vlbg);
  border: 1px solid var(--border);
  border-radius: var(--border-7, 12px);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease, background 0.2s ease;
  position: relative;
  overflow: hidden;
}

.option-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--gg, transparent) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  border-radius: inherit;
}

.option-card:hover {
  border-color: var(--text);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.option-card:hover::before {
  opacity: 0.06;
}

.option-card:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* ── Icon wrapper ────────────────────────────────── */
.option-icon-wrapper {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: var(--border-4, 10px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.option-card:hover .option-icon-wrapper {
  transform: scale(1.08);
}

.option-icon-wrapper.join {
  background: color-mix(in srgb, var(--text) 10%, transparent);
  color: var(--text);
}

.option-icon-wrapper.create {
  background: color-mix(in srgb, var(--text) 10%, transparent);
  color: var(--text);
}

.option-icon {
  display: block;
}

/* ── Card body ───────────────────────────────────── */
.option-body {
  flex: 1;
  min-width: 0;
}

.option-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 6px 0;
  font-family: var(--display-font), sans-serif;
  letter-spacing: -0.01em;
}

.option-desc {
  font-size: 0.88rem;
  color: var(--sub);
  margin: 0;
  line-height: 1.45;
}

/* ── Arrow ───────────────────────────────────────── */
.option-arrow {
  flex-shrink: 0;
  color: var(--sub);
  transition: color 0.2s ease, transform 0.2s ease;
}

.option-card:hover .option-arrow {
  color: var(--text);
  transform: translateX(4px);
}

/* ── Responsive ──────────────────────────────────── */
@media (max-width: 640px) {
  .options-grid {
    grid-template-columns: 1fr;
    max-width: 440px;
  }

  .page-title {
    font-size: 2.5rem;
  }

  .page-header {
    margin-bottom: 32px;
  }
}

@media (max-width: 360px) {
  .option-card {
    padding: 20px 16px;
    gap: 14px;
  }

  .option-icon-wrapper {
    width: 48px;
    height: 48px;
  }
}
</style>

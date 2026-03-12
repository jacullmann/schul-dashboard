<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const visible = ref(false);
const { t } = useI18n();

function accept() {
  const payload = {
    dismissed: true,
  };
  localStorage.setItem('cookie_consent', JSON.stringify(payload));
  visible.value = false;
}

function checkShow() {
  const raw = localStorage.getItem('cookie_consent');
  if (!raw) {
    visible.value = true;
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    visible.value = !parsed.dismissed;
  } catch {
    visible.value = true;
  }
}

onMounted(() => {
  checkShow();
});
</script>

<template>
  <div v-if="visible" class="cookie-banner">
    <div class="cookie-content">
      <div>
        <h3 style="margin: 0">
          {{ t('global.cookies.banner.title') }}
        </h3>
      </div>
      <div class="cookie-text">
        <p>{{ t('global.cookies.banner.text') }}</p>
      </div>

      <div class="cookie-actions">
        <button class="btn action" @click="accept">{{ t('global.cookies.banner.action') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 16px;
  right: 16px;
  max-width: 420px;
  border: 1px solid var(--border2);
  border-radius: 16px;
  background: var(--vlbg);
  box-shadow: var(--shadow-l);
  z-index: 1200;
  padding: 0;
  transition: all 0.3s ease;
}

.cookie-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.cookie-text {
  font-size: 13px;
  color: var(--text);
  line-height: 1.6;
}
.cookie-text p {
  margin: 0;
}

.data-link {
  color: var(--sub);
  transition: color 0.1s ease;
  text-decoration: underline;
}

.data-link:hover {
  color: var(--text);
}

.cookie-actions {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 500px) {
  .cookie-banner {
    right: auto;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 32px);
    bottom: 20px;
    box-shadow: var(--shadow-l);
  }

  .cookie-actions {
    justify-content: left;
  }
}
</style>
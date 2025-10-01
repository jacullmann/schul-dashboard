<template>
  <div class="account-menu" ref="root">
    <button class="icon-btn" @click="toggle" :aria-expanded="open" title="Einstellungen">
      <!-- simple gear icon SVG -->
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z"></path>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.67 0 1.2-.45 1.51-1A1.65 1.65 0 0 0 4.3 5.6l-.06-.06A2 2 0 1 1 7.07 2.7l.06.06c.5.5 1.21.67 1.82.33.36-.2.75-.33 1.19-.33H12a2 2 0 1 1 4 0h.09c.44 0 .83.12 1.19.33.61.34 1.32.17 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.34.5-.17 1.21.33 1.82.21.21.33.5.33.83V9a2 2 0 1 1-4 0v-.09c0-.33-.12-.62-.33-.83-.5-.61-.17-1.32.33-1.82l.06-.06A2 2 0 0 1 21.3 7.07l-.06.06a1.65 1.65 0 0 0-.33 1.82c.2.36.33.75.33 1.19V12a2 2 0 1 1 0 4h-.09c-.33 0-.62.12-.83.33-.5.61-1.21.78-1.82.33z"></path>
      </svg>
    </button>

    <transition name="pop">
      <div v-if="open" class="popup" @click.stop>
        <div class="popup-inner">
          <button class="danger full" @click="startDelete" :disabled="confirming">
            Account löschen
          </button>

          <div v-if="confirming" class="confirm">
            <div class="confirm-text">
              <div class="small">Bitte bestätigen Sie, dass Sie den Account</div>
              <div class="email">{{ email }}</div>
              <div class="small">wirklich löschen möchten. Dieser Vorgang löscht nur Ihren Account.</div>
            </div>
            <div class="confirm-actions">
              <button class="btn" @click="confirming = false">Abbrechen</button>
              <button class="danger" @click="confirmDelete" :disabled="submitting">
                <span v-if="submitting">Lösche…</span>
                <span v-else>Löschen</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import hw from '../../hwApi';

const props = defineProps<{ email: string }>();
const emit = defineEmits<{ (e: 'deleted'): void; (e: 'error', msg: string): void }>();

const open = ref(false);
const confirming = ref(false);
const submitting = ref(false);

function toggle() {
  open.value = !open.value;
  if (!open.value) {
    confirming.value = false;
  }
}

async function confirmDelete() {
  submitting.value = true;
  try {
    // delete own account
    await hw.delete('/api/auth/me');
    emit('deleted');
  } catch (e: any) {
    const msg = e?.response?.data?.error || 'Fehler beim Löschen';
    emit('error', msg);
  } finally {
    submitting.value = false;
  }
}

function startDelete() {
  confirming.value = true;
}

// close on outside click or Escape
const root = ref<HTMLElement | null>(null);
function onDocClick(e: MouseEvent) {
  if (!root.value) return;
  if (!root.value.contains(e.target as Node)) {
    open.value = false;
    confirming.value = false;
  }
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    open.value = false;
    confirming.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey);
});
</script>

<style scoped>
.account-menu { position: relative; display: inline-block; margin-left: 8px; }

/* icon button */
.icon-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.08);
  width: 36px; height: 36px;
  border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--muted);
  transition: background 120ms ease, transform 120ms ease;
}
.icon-btn:hover { background: rgba(255,255,255,0.02); transform: translateY(-1px); color: var(--text); }

/* Pop-up positioning */
.popup {
  position: absolute;
  right: 0;
  margin-top: 10px;
  z-index: 1200;
  display: flex;
  justify-content: flex-end;
  width: 260px;
}

/* glassmorphic card */
.popup-inner {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(10px) saturate(120%) brightness(95%);
  -webkit-backdrop-filter: blur(10px) saturate(120%) brightness(95%);
  box-shadow: 0 8px 30px rgba(2,6,23,0.6);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* primary full-width danger button */
.full { width: 100%; padding: 10px; border-radius: 8px; }
.danger {
  background: linear-gradient(180deg, #ff6b6b, #ff3b3b);
  border: none; color: white; font-weight:600;
}
.danger:disabled { opacity: 0.7; }

/* confirm area */
.confirm { margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.04); display:flex; flex-direction:column; gap:8px; }
.confirm-text { text-align: left; color: var(--text); }
.email { font-weight:700; color: var(--primary); margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.confirm-actions { display:flex; gap:8px; justify-content:flex-end; }

.btn {
  background: transparent; border: 1px solid rgba(255,255,255,0.08); padding: 8px 10px; border-radius: 8px; color: var(--text);
}

/* pop animation */
.pop-enter-active, .pop-leave-active { transition: transform 160ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease; }
.pop-enter-from { transform: translateY(-6px) scale(0.98); opacity: 0; }
.pop-enter-to { transform: translateY(0) scale(1); opacity: 1; }
.pop-leave-from { transform: translateY(0) scale(1); opacity: 1; }
.pop-leave-to { transform: translateY(-6px) scale(0.98); opacity: 0; }
</style>

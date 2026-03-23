<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import hw from '@/api/hwApi';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
import { useToast } from '@/common/composables/useToast';

const emit = defineEmits(['close', 'success']);

const textareaRef = ref<HTMLTextAreaElement | null>(null);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !submitting.value) {
    emit('close');
  }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !submitting.value) {
    submit();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  textareaRef.value?.focus();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});

const content = ref('');
const color = ref('warn');
const showAsPopup = ref(false); // NEU: Popup-Option
const submitting = ref(false);
const message = ref('');
const isError = ref(false);

async function submit() {
  submitting.value = true;
  message.value = '';
  isError.value = false;
  try {
    await hw.post('/api/group-admin/announcements', {
      content: content.value,
      color: color.value,
      showAsPopup: showAsPopup.value,
    });
    useToast().success('Ankündigung erfolgreich angelegt.');
    isError.value = false;
    emit('success');
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    message.value = err.response?.data?.error || 'Fehler beim Anlegen.';
    isError.value = true;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="card rlc" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:100;">
    <div class="card rlc" style="width:100%; max-width:520px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Neue Ankündigung</h3>
        <BaseButton @click="$emit('close')" :disabled="submitting" variant="ghost">Schließen</BaseButton>
      </div>
      <div style="margin-top:8px;">
        <textarea ref="textareaRef" class="input" rows="4" v-model="content" placeholder="Inhalt"></textarea>
      </div>
      <div style="margin-top:8px;">
        <select class="input" v-model="color">
          <option value="info">Info</option>
          <option value="warn">Wichtig</option>
          <option value="danger">Dringend</option>
        </select>
      </div>
      <div style="margin-top:8px;">
        <label style="display:flex; align-items:center; gap:8px; color:var(--color-on-surface);">
          <input type="checkbox" v-model="showAsPopup" />
          Als Popup anzeigen für alle benutzer
        </label>
      </div>
      <div class="row" style="margin-top:12px; align-items:center;">
        <BaseButton @click="submit" :disabled="submitting" variant="action" :loading="submitting">
        Absenden
      </BaseButton>
        <div v-if="message" class="small" :style="{ color: isError ? 'var(--color-danger)': 'var(--color-primary)' }">{{ message }}</div>
      </div>
    </div>
  </div>
</template>

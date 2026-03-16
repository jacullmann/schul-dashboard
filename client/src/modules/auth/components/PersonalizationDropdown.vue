<script setup lang="ts">
import { ref, computed } from 'vue';
import { Filter, FilterX } from 'lucide-vue-next';
import MenuDropdown from '@/common/components/MenuDropdown.vue';
import hw from '@/api/hwApi';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'change', value: boolean): void;
}>();

const updating = ref(false);
const message = ref('');
const isError = ref(false);

const currentPersonalized = computed(() => props.modelValue);

const dropdownValue = computed({
  get: () => (currentPersonalized.value ? 'yes' : 'no'),
  set: (val: string) => setPersonalization(val === 'yes')
});

const options = computed(() => [
  { value: 'yes', label: t('global.selection.yes'), icon: Filter },
  { value: 'no', label: t('global.selection.no'), icon: FilterX }
]);

async function setPersonalization(value: boolean) {
  if (updating.value || value === currentPersonalized.value) {
    return;
  }

  updating.value = true;
  message.value = '';
  isError.value = false;

  try {
    const { data } = await hw.patch('/api/user/personalization', {
      personalized: value
    });

    if (data.ok) {
      emit('update:modelValue', data.personalized);
      emit('change', data.personalized);
      message.value = value ? 'Personalisierte Kurse aktiviert' : 'Personalisierte Kurse deaktiviert';
      isError.value = false;

      setTimeout(() => {
        message.value = '';
      }, 3000);
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    message.value = err.response?.data?.error || 'Fehler beim Aktualisieren';
    isError.value = true;

    setTimeout(() => {
      message.value = '';
      isError.value = false;
    }, 4000);
  } finally {
    updating.value = false;
  }
}
</script>

<template>
  <div class="personalization-wrapper">
    <MenuDropdown
        v-model="dropdownValue"
        :options="options"
        :prefix="t('account.menu.personalization') + ':'"
        :disabled="updating"
    />
    <div v-if="message" class="message" :class="{ error: isError }">
      {{ message }}
    </div>
  </div>
</template>

<style scoped>
.personalization-wrapper {
  position: relative;
  display: block;
  width: 100%;
}

.message {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  padding: 4px 8px;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sub);
  background: var(--bg-interactive-hover);
  color: var(--text-default);
  border: 1px solid var(--border-surface);
  animation: messageSlideIn 200ms ease;
  z-index: 1000;
}

.message.error {
  background: var(--bg-interactive-hover);
  color: var(--text-default);
  border: 1px solid var(--danger);
}

@keyframes messageSlideIn {
  from {
    opacity: 1;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
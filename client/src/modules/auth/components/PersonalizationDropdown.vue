<script setup lang="ts">
import { ref, computed } from 'vue';
import { Filter, FilterX } from '@lucide/vue';
import MenuDropdown from '@/common/components/MenuDropdown.vue';
import hw from '@/api/hwApi';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/common/composables/useToast';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'change', value: boolean): void;
}>();

const updating = ref(false);

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

  try {
    const { data } = await hw.patch('/api/user/personalization', {
      personalized: value
    });

    if (data.ok) {
      emit('update:modelValue', data.personalized);
      emit('change', data.personalized);
      useToast().success(value ? 'Personalisierte Kurse aktiviert' : 'Personalisierte Kurse deaktiviert');
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    useToast().error(err.response?.data?.error || 'Fehler beim Aktualisieren');
  } finally {
    updating.value = false;
  }
}
</script>

<template>
  <MenuDropdown
      v-model="dropdownValue"
      :options="options"
      :prefix="t('account.menu.personalization') + ':'"
      :disabled="updating"
  />
</template>

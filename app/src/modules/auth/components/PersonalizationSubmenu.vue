<script setup lang="ts">
import { ref, computed } from 'vue';
import { Filter, LayoutGrid } from '@lucide/vue';
import BaseMenuSelect from '@/common/components/BaseMenuSelect.vue';
import hw from '../../../api/api';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/common/composables/useToast';
import { apiErrorMessage } from '@/api/errors';

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
  set: (val: string) => void setPersonalization(val === 'yes'),
});

const options = computed(() => [
  {
    value: 'yes',
    label: t('auth.settings.personalization_options.mine'),
    icon: Filter,
  },
  {
    value: 'no',
    label: t('auth.settings.personalization_options.all'),
    icon: LayoutGrid,
  },
]);

async function setPersonalization(value: boolean) {
  if (updating.value || value === currentPersonalized.value) {
    return;
  }

  updating.value = true;

  try {
    const { data } = await hw.patch('/user/personalization', {
      personalized: value,
    });

    if (data.ok) {
      emit('update:modelValue', data.personalized);
      emit('change', data.personalized);
      useToast().success(
        value
          ? 'Personalisierte Kurse aktiviert'
          : 'Personalisierte Kurse deaktiviert',
      );
    }
  } catch (e: unknown) {
    useToast().error(apiErrorMessage(e, 'Fehler beim Aktualisieren'));
  } finally {
    updating.value = false;
  }
}
</script>

<template>
  <BaseMenuSelect
    v-model="dropdownValue"
    :options="options"
    :prefix="t('auth.settings.personalization')"
    :disabled="updating"
  />
</template>

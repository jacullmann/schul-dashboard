<script setup lang="ts">
import { computed } from 'vue';
import { Filter, LayoutGrid } from '@lucide/vue';
import BaseMenuSelect from '@/common/components/BaseMenuSelect.vue';
import { useI18n } from 'vue-i18n';
import { usePersonalization } from '@/modules/auth/composables/usePersonalization';

const { t } = useI18n();
const { updating, setPersonalization: savePersonalization } =
  usePersonalization();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'change', value: boolean): void;
}>();

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
  if (value === currentPersonalized.value) return;

  const saved = await savePersonalization(value);
  if (saved === null) return;

  emit('update:modelValue', saved);
  emit('change', saved);
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

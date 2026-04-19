<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const buttonText = computed(() => {
  if (props.modelValue) {
    return t('school.tasks.archive.closeArchive');
  } else {
    return t('school.tasks.archive.archive');
  }
});

function toggleState() {
  handleChange(!props.modelValue);
}

function handleChange(value: boolean) {
  emit('update:modelValue', value);
}
</script>

<template>
  <BaseButton
    :class="[
      props.modelValue ? 'bg-surface-hover' : ''
    ]"
    @click="toggleState"
    variant="ghost"
    on="canvas"
  >
    <span :key="buttonText">
      {{ buttonText }}
    </span>
  </BaseButton>
</template>
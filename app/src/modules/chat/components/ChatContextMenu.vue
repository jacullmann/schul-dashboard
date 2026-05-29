<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Copy, Trash2 } from '@lucide/vue';

const { t } = useI18n();

const props = defineProps<{
  activeMessage: any | null;
  canDelete: boolean;
  contextMenuStyles: any;
  isMobile: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'copy', msg: any): void;
  (e: 'delete', msg: any): void;
}>();

const innerMenuRef = ref<any | null>(null);

defineExpose({
  get menuEl() {
    return innerMenuRef.value?.menuEl;
  },
});
</script>

<template>
  <Teleport to="body" :disabled="isMobile">
    <BaseMenu
      :open="!!activeMessage"
      @close="emit('close')"
      ref="innerMenuRef"
      :class="!isMobile ? 'fixed! z-[10001]! min-w-[180px]' : ''"
      :style="!isMobile ? contextMenuStyles : undefined"
    >
      <template v-if="activeMessage">
        <BaseMenuButton :icon="Copy" @click="emit('copy', activeMessage)">
          {{ t('common.buttons.copy') }}
        </BaseMenuButton>

        <BaseMenuDivider />

        <BaseMenuButton
          v-if="canDelete"
          variant="danger"
          :icon="Trash2"
          @click="emit('delete', activeMessage)"
        >
          {{ t('common.buttons.delete') }}
        </BaseMenuButton>
      </template>
    </BaseMenu>
  </Teleport>
</template>

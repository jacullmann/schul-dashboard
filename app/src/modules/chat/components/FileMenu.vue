<script setup lang="ts">
import { Plus, Brush } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useFloatingMenu } from '@/common/composables/useFloatingMenu';
import { useIsMobileViewport } from '@/common/composables/useViewport';

const emit = defineEmits<{
  (e: 'drawImage'): void;
}>();

const { isOpen, triggerRef, menuComponentRef, menuStyles, toggle, close } =
  useFloatingMenu();

function drawImage() {
  emit('drawImage');
  close();
}

const isMobile = useIsMobileViewport();
const { t } = useI18n();
</script>

<template>
  <div ref="triggerRef" class="relative inline-block">
    <BaseTooltip :content="t('chat.files.add')" placement="bottom">
      <BaseButton
        :icon="Plus"
        :class="{ 'bg-surface-hover! text-on-ghost!': isOpen }"
        aria-haspopup="true"
        :aria-expanded="isOpen"
        @click="toggle"
      />
    </BaseTooltip>

    <Teleport to="body" :disabled="isMobile">
      <BaseMenu
        ref="menuComponentRef"
        :open="isOpen"
        :style="!isMobile ? menuStyles : undefined"
        class="min-w-56!"
        @close="close"
      >
        <BaseMenuButton :icon="Brush" @click="drawImage">
          {{ t('chat.files.draw_image') }}
        </BaseMenuButton>
      </BaseMenu>
    </Teleport>
  </div>
</template>

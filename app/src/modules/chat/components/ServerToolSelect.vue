<script setup lang="ts">
import {
  Settings2,
  Globe,
  Image as ImageIcon,
  Terminal,
  Lightbulb,
} from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useFloatingMenu } from '@/common/composables/useFloatingMenu';
import { useIsMobileViewport } from '@/common/composables/useViewport';

const webSearch = defineModel<boolean>('webSearch', { default: true });
const createImage = defineModel<boolean>('createImage', { default: false });
const terminal = defineModel<boolean>('terminal', { default: false });
const reasoning = defineModel<boolean>('reasoning', { default: false });

const { isOpen, triggerRef, menuComponentRef, menuStyles, toggle, close } =
  useFloatingMenu();

const isMobile = useIsMobileViewport();
const { t } = useI18n();
</script>

<template>
  <div ref="triggerRef" class="relative inline-block">
    <BaseButton
      v-if="!isMobile"
      :icon="Settings2"
      :class="{ 'bg-surface-hover! text-on-ghost!': isOpen }"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      {{ t('chat.tools.title') }}
    </BaseButton>

    <BaseTooltip v-else :content="t('chat.tools.title')" placement="bottom">
      <BaseButton
        :icon="Settings2"
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
        <BaseMenuButton
          :icon="Globe"
          @click="((webSearch = !webSearch), close())"
        >
          {{ t('chat.tools.web_search') }}
          <template #description>{{
            t('chat.natural_intelligence.server.tools.web_search_description')
          }}</template>
        </BaseMenuButton>
        <BaseMenuButton
          :icon="ImageIcon"
          @click="((createImage = !createImage), close())"
        >
          {{ t('chat.tools.create_image') }}
          <template #description>{{
            t('chat.natural_intelligence.server.tools.create_image_description')
          }}</template>
        </BaseMenuButton>
        <BaseMenuButton
          :icon="Terminal"
          @click="((terminal = !terminal), close())"
        >
          {{ t('chat.natural_intelligence.server.tools.terminal') }}
          <template #description>{{
            t('chat.natural_intelligence.server.tools.terminal_description')
          }}</template>
        </BaseMenuButton>
        <!-- TODO: Choose Icon: CalendarFold or Coffee -->
        <BaseMenuButton
          :icon="Lightbulb"
          @click="((reasoning = !reasoning), close())"
        >
          {{ t('chat.natural_intelligence.server.tools.reasoning') }}
          <template #description>{{
            t('chat.natural_intelligence.server.tools.reasoning_description')
          }}</template>
        </BaseMenuButton>
      </BaseMenu>
    </Teleport>
  </div>
</template>

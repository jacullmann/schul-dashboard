<script setup lang="ts">
import {
  Settings2,
  Globe,
  Image as ImageIcon,
  Brain,
  CalendarFold,
} from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useFloatingMenu } from '@/common/composables/useFloatingMenu';
import { useIsMobileViewport } from '@/common/composables/useViewport';

const webSearch = defineModel<boolean>('webSearch', { default: true });
const createImage = defineModel<boolean>('createImage', { default: false });
const ponder = defineModel<boolean>('ponder', { default: false });
const answerLeisurely = defineModel<boolean>('answerLeisurely', {
  default: false,
});

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
          is-select
          :active="webSearch"
          @click="((webSearch = !webSearch), close())"
        >
          {{ t('chat.tools.web_search') }}
          <template #description>{{
            t('chat.tools.web_search_description')
          }}</template>
        </BaseMenuButton>
        <BaseMenuButton
          :icon="ImageIcon"
          is-select
          :active="createImage"
          @click="((createImage = !createImage), close())"
        >
          {{ t('chat.tools.create_image') }}
          <template #description>{{
            t('chat.tools.create_image_description')
          }}</template>
        </BaseMenuButton>
        <BaseMenuButton
          :icon="Brain"
          is-select
          :active="ponder"
          @click="((ponder = !ponder), close())"
        >
          {{ t('chat.tools.ponder') }}
          <template #description>{{
            t('chat.tools.ponder_description')
          }}</template>
        </BaseMenuButton>
        <!-- TODO: Choose Icon: CalendarFold or Coffee -->
        <BaseMenuButton
          :icon="CalendarFold"
          is-select
          :active="answerLeisurely"
          @click="((answerLeisurely = !answerLeisurely), close())"
        >
          {{ t('chat.tools.answer_leisurely') }}
          <template #description>{{
            t('chat.tools.answer_leisurely_description')
          }}</template>
        </BaseMenuButton>
      </BaseMenu>
    </Teleport>
  </div>
</template>

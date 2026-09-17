<script setup lang="ts">
import {
  Settings2,
  Globe,
  Image as ImageIcon,
  Brain,
  CalendarFold,
} from '@lucide/vue';
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
      Tools
    </BaseButton>

    <BaseTooltip v-else content="Tools" placement="bottom">
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
          Web search
          <template #description
            >Search the Internet for additional information</template
          >
        </BaseMenuButton>
        <BaseMenuButton
          :icon="ImageIcon"
          is-select
          :active="createImage"
          @click="((createImage = !createImage), close())"
        >
          Create Image
          <template #description>Design anything you can imagine</template>
        </BaseMenuButton>
        <BaseMenuButton
          :icon="Brain"
          is-select
          :active="ponder"
          @click="((ponder = !ponder), close())"
        >
          Ponder
          <template #description
            >Think longer for more profound answers</template
          >
        </BaseMenuButton>
        <!-- TODO: Choose Icon: CalendarFold or Coffee -->
        <BaseMenuButton
          :icon="CalendarFold"
          is-select
          :active="answerLeisurely"
          @click="((answerLeisurely = !answerLeisurely), close())"
        >
          Answer leisurely
          <template #description
            >Queue your requests, if you aren't in a hurry</template
          >
        </BaseMenuButton>
      </BaseMenu>
    </Teleport>
  </div>
</template>

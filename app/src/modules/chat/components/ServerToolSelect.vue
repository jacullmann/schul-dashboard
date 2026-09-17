<script setup lang="ts">
import {
  Settings2,
  Globe,
  Image as ImageIcon,
  Terminal,
  Lightbulb,
} from '@lucide/vue';
import { useFloatingMenu } from '@/common/composables/useFloatingMenu';
import { useIsMobileViewport } from '@/common/composables/useViewport';

const webSearch = defineModel<boolean>('webSearch', { default: true });
const createImage = defineModel<boolean>('createImage', { default: false });
const terminal = defineModel<boolean>('terminal', { default: false });
const reasoning = defineModel<boolean>('reasoning', { default: false });

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
          @click="((webSearch = !webSearch), close())"
        >
          Web search
          <template #description
            >Search Wikipedia for additional information</template
          >
        </BaseMenuButton>
        <BaseMenuButton
          :icon="ImageIcon"
          @click="((createImage = !createImage), close())"
        >
          Create Image
          <template #description>Draw a picture</template>
        </BaseMenuButton>
        <BaseMenuButton
          :icon="Terminal"
          @click="((terminal = !terminal), close())"
        >
          Terminal
          <template #description>Perform basic commands</template>
        </BaseMenuButton>
        <!-- TODO: Choose Icon: CalendarFold or Coffee -->
        <BaseMenuButton
          :icon="Lightbulb"
          @click="((reasoning = !reasoning), close())"
        >
          Give Reasoning
          <template #description>Show your chain of thought</template>
        </BaseMenuButton>
      </BaseMenu>
    </Teleport>
  </div>
</template>

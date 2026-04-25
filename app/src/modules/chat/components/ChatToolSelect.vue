<script setup lang="ts">
import { ref, computed } from 'vue';
import { Settings2, Globe, Image, Brain, CalendarFold } from '@lucide/vue';
import {
  onClickOutside,
  useElementBounding,
  useWindowSize,
  useEventListener,
} from '@vueuse/core';

const webSearch = defineModel<boolean>('webSearch', { default: true });
const createImage = defineModel<boolean>('createImage', { default: false });
const ponder = defineModel<boolean>('ponder', { default: false });
const answerLeisurely = defineModel<boolean>('answerLeisurely', {
  default: false,
});

const isOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);

const { bottom, left, right, top: triggerTop } = useElementBounding(triggerRef);
const { width: windowWidth, height: windowHeight } = useWindowSize();
const { height: actualMenuHeight } = useElementBounding(menuRef);

const menuStyles = computed(() => {
  const menuMinWidth = 224; // min-w-56 = 14rem = 224px
  const h = actualMenuHeight.value || 280; // Use actual height or fallback estimate

  const shouldFlipHorizontally = left.value + menuMinWidth > windowWidth.value;
  const shouldFlipVertically = bottom.value + h > windowHeight.value;

  return {
    position: 'fixed' as const,
    top: shouldFlipVertically
      ? `${triggerTop.value - h - 8}px`
      : `${bottom.value + 8}px`,
    left: shouldFlipHorizontally
      ? `${right.value - menuMinWidth}px`
      : `${left.value}px`,
    zIndex: 1000,
  };
});

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

onClickOutside(
  triggerRef,
  () => {
    close();
  },
  { ignore: [menuRef] },
);

useEventListener(document, 'keydown', (e) => {
  if (e.key === 'Escape') close();
});
</script>

<template>
  <div class="relative inline-block" ref="triggerRef">
    <BaseButton
      v-if="windowWidth > 480"
      :icon="Settings2"
      size="lg"
      @click="toggle"
      :class="{ 'bg-surface-hover! text-on-ghost!': isOpen }"
      aria-haspopup="true"
      :aria-expanded="isOpen"
    >
      Tools
    </BaseButton>

    <BaseTooltip v-else content="Tools" placement="bottom">
      <BaseButton
        :icon="Settings2"
        size="lg"
        @click="toggle"
        :class="{ 'bg-surface-hover! text-on-ghost!': isOpen }"
        aria-haspopup="true"
        :aria-expanded="isOpen"
      />
    </BaseTooltip>

    <Teleport to="body">
      <BaseMenu
        v-if="isOpen"
        ref="menuRef"
        :style="menuStyles"
        class="min-w-56!"
      >
        <BaseMenuButton
          :icon="Globe"
          isSelect
          :active="webSearch"
          @click="((webSearch = !webSearch), close())"
        >
          Web search
          <template #description
            >Search the Internet for additional information</template
          >
        </BaseMenuButton>
        <BaseMenuButton
          :icon="Image"
          isSelect
          :active="createImage"
          @click="((createImage = !createImage), close())"
        >
          Create Image
          <template #description>Design anything you can imagine</template>
        </BaseMenuButton>
        <BaseMenuButton
          :icon="Brain"
          isSelect
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
          isSelect
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

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Settings2, Globe, Image, Brain, CalendarFold } from '@lucide/vue';
import { onClickOutside, useEventListener, useWindowSize } from '@vueuse/core';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';

const webSearch = defineModel<boolean>('webSearch', { default: true });
const createImage = defineModel<boolean>('createImage', { default: false });
const ponder = defineModel<boolean>('ponder', { default: false });
const answerLeisurely = defineModel<boolean>('answerLeisurely', {
  default: false,
});

const isOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const menuComponentRef = ref<any>(null);
const menuRef = computed(() => menuComponentRef.value?.menuEl || null);

const { width: windowWidth } = useWindowSize();
const isMobile = computed(() => windowWidth.value < 768);

const { floatingStyles, isPositioned } = useFloating(triggerRef, menuRef, {
  strategy: 'fixed',
  placement: 'bottom-start',
  whileElementsMounted: autoUpdate,
  transform: false,
  middleware: [offset(8), flip(), shift({ padding: 8 })],
});

const menuStyles = computed(() => ({
  ...floatingStyles.value,
  opacity: isPositioned.value ? undefined : 0,
}));

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
      v-if="windowWidth >= 768"
      :icon="Settings2"
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
        @click="toggle"
        :class="{ 'bg-surface-hover! text-on-ghost!': isOpen }"
        aria-haspopup="true"
        :aria-expanded="isOpen"
      />
    </BaseTooltip>

    <Teleport to="body" :disabled="isMobile">
      <BaseMenu
        :open="isOpen"
        @close="close"
        ref="menuComponentRef"
        :style="!isMobile ? menuStyles : undefined"
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

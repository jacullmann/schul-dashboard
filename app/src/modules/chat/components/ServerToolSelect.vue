<script setup lang="ts">
import { ref, computed } from 'vue';
import { Settings2, Globe, Image, Terminal, Lightbulb } from '@lucide/vue';
import { onClickOutside, useEventListener, useWindowSize } from '@vueuse/core';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';

const webSearch = defineModel<boolean>('webSearch', { default: true });
const createImage = defineModel<boolean>('createImage', { default: false });
const terminal = defineModel<boolean>('terminal', { default: false });
const reasoning = defineModel<boolean>('reasoning', { default: false });

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
          @click="((webSearch = !webSearch), close())"
        >
          Web search
          <template #description
            >Search Wikipedia for additional information</template
          >
        </BaseMenuButton>
        <BaseMenuButton
          :icon="Image"
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

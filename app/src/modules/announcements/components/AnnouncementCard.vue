<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import {
  useElementSize,
  useEventListener,
  usePreferredReducedMotion,
} from '@vueuse/core';
import { Megaphone } from '@lucide/vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useAnnouncementStore } from '@/stores/announcementStore';

const props = defineProps<{
  /** Where read announcements live from now on; the card shrinks into it. */
  collapseTarget: HTMLElement | null;
}>();

const { t } = useI18n();
const { activeGroupId } = useAppAuth();
const store = useAnnouncementStore();
const { unread } = storeToRefs(store);
const reducedMotion = usePreferredReducedMotion();

const current = computed(() => unread.value[0]);
const hasMore = computed(() => unread.value.length > 1);

// Phones keep the button beside the text only while the text fits there on
// one line; it would otherwise wrap into a narrow column. Plain flex wrapping
// could decide that too, but not then move the button behind the "more" row.
const card = useTemplateRef('card');
const text = useTemplateRef('text');
const ackButton = useTemplateRef('ackButton');
const { width: cardWidth } = useElementSize(card);
const { width: textWidth } = useElementSize(text);
const { width: ackWidth } = useElementSize(
  () => ackButton.value?.$el as HTMLElement | undefined,
  undefined,
  { box: 'border-box' },
);
const ackFitsBesideText = computed(() => {
  const textEl = text.value;
  if (!card.value || !textEl?.parentElement) return true;
  const textStart = textEl.offsetLeft - textEl.parentElement.offsetLeft;
  const gap = parseFloat(getComputedStyle(card.value).columnGap);
  return textStart + textWidth.value + gap + ackWidth.value <= cardWidth.value;
});

watch(
  activeGroupId,
  (groupId) => {
    if (groupId) void store.load(groupId);
  },
  { immediate: true },
);

useEventListener(document, 'visibilitychange', () => {
  if (document.visibilityState === 'visible' && activeGroupId.value) {
    void store.load(activeGroupId.value);
  }
});

function collapse(el: Element, done: () => void) {
  const target = props.collapseTarget;
  if (!target || reducedMotion.value === 'reduce') {
    el.animate([{ opacity: 1 }, { opacity: 0 }], 150).finished.then(done, done);
    return;
  }

  const from = el.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = Math.min(to.width / from.width, to.height / from.height);

  // Stays opaque for most of the way, so the eye can follow it into the
  // group menu, where the announcement can be found again.
  el.animate(
    [
      { transform: 'none', opacity: 1 },
      { opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0 },
    ],
    { duration: 450, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' },
  ).finished.then(done, done);
}
</script>

<template>
  <div
    class="pointer-events-none absolute inset-x-0 top-full z-(--z-header) flex justify-center px-2"
    role="status"
    aria-live="polite"
  >
    <Transition
      enter-active-class="transition-[opacity,translate,scale] duration-400 ease-(--ease-spring)"
      enter-from-class="opacity-0 -translate-y-2 scale-95"
      @leave="collapse"
    >
      <section
        v-if="current"
        ref="card"
        class="pointer-events-auto flex w-full max-w-xl flex-wrap items-center gap-4 rounded-3xl border border-ghost-border bg-surface/80 p-4 shadow-menu backdrop-blur-sm backdrop-saturate-150"
      >
        <Transition
          mode="out-in"
          enter-active-class="transition-[opacity,translate] duration-200 ease-out"
          leave-active-class="transition-[opacity,translate] duration-150 ease-in"
          enter-from-class="opacity-0 translate-y-1"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            :key="current.id"
            class="flex min-w-0 grow items-center gap-2 xs:basis-0"
            :class="{ 'basis-full': !ackFitsBesideText }"
          >
            <div
              class="flex flex-col items-center justify-center min-h-10 mb-auto"
            >
              <span
                class="flex w-10 shrink-0 items-center justify-center rounded-full"
                :class="
                  current.important ? 'text-danger' : 'text-on-ghost-muted'
                "
              >
                <Megaphone :size="20" />
              </span>
              <span
                v-if="hasMore"
                class="text-on-ghost-muted text-sm font-semibold"
                >+{{ unread.length - 1 }}</span
              >
            </div>
            <span ref="text" class="min-w-0 text-sm text-on-ghost break-words">
              {{ current.content }}
            </span>
          </div>
        </Transition>

        <BaseRow justify="end" class="w-full flex-wrap-reverse">
          <BaseButton
            v-if="hasMore"
            surface
            class="flex flex-1 min-w-fit"
            @click="store.acknowledgeAll()"
          >
            {{ t('announcements.card.acknowledge_all') }}
          </BaseButton>

          <BaseButton
            ref="ackButton"
            variant="action"
            class="flex flex-1 min-w-fit"
            @click="store.acknowledge(current)"
          >
            {{ t('announcements.card.acknowledge') }}
          </BaseButton>
        </BaseRow>
      </section>
    </Transition>
  </div>
</template>

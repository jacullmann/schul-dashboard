<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import { useIsMobileViewport } from '@/common/composables/useViewport';
import { X } from '@lucide/vue';
import { useId } from 'vue';

// Two roots (dialog and sheet), so attributes and listeners such as drag and
// drop handlers are forwarded to whichever one is shown.
defineOptions({ inheritAttrs: false });

const emit = defineEmits<{
  cancel: [];
  success: [];
}>();

const props = withDefaults(
  defineProps<{
    open: boolean;
    submit?: () => void;
    cancel?: () => void;
    danger?: boolean;
    error?: string;
    loading?: boolean;
    requirement?: boolean;
    sheet?: boolean;
    /**
     * Opens the modal, in both its shapes, above a fullscreen overlay that
     * already sits above the normal layers, such as the image viewer. See
     * BaseSheet's own `elevated`.
     */
    elevated?: boolean;
    /** The sheet is dismissed by dragging it down, so it never has one. */
    closeButton?: boolean;
  }>(),
  {
    danger: false,
    error: '',
    loading: false,
    requirement: true,
    sheet: false,
    elevated: false,
    closeButton: true,
  },
);

const handleCancel = () => {
  if (props.cancel) {
    props.cancel();
  } else {
    emit('cancel');
  }
};

const isMobile = useIsMobileViewport();
const titleId = useId();

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') handleCancel();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade-scale" appear>
      <BaseModalCard
        v-if="open && (!isMobile || !sheet)"
        v-bind="$attrs"
        :labelledby="titleId"
        :elevated="elevated"
        :round="!closeButton"
        @cancel="handleCancel"
      >
        <!-- pr-12 reserves the close button's width plus gap -->
        <BaseRow
          class="sticky top-0 z-10 items-start h-[30px] mb-4"
          :class="{ 'pr-12': closeButton }"
        >
          <!-- Firefox leaves backdrop filters outside the scroller's clip
               path, so the blur would square off the card's top corners.
               The fade clips itself there instead: a rounded overflow clip
               drops its masks in Chromium, and on the scroller or card it
               drops the blur in Firefox. -->
          <BaseScrollFade
            class="-inset-x-4 -top-4 -bottom-4 firefox:overflow-hidden firefox:rounded-t-(--card-radius)"
          />

          <BaseRow>
            <h3 :id="titleId">
              <slot name="title"></slot>
            </h3>

            <slot name="title-infopop"></slot>
          </BaseRow>
        </BaseRow>

        <template v-if="closeButton" #corner>
          <BaseButton
            type="button"
            variant="ghost"
            :icon="X"
            @click="handleCancel"
          />
        </template>

        <BaseForm
          v-if="submit"
          :submit="submit"
          :cancel="handleCancel"
          :error="error"
          :danger="danger"
          :loading="loading"
          :requirement="requirement"
        >
          <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps || {}"></slot>
          </template>
        </BaseForm>

        <slot v-else name="content"></slot>
      </BaseModalCard>
    </Transition>
  </Teleport>

  <BaseSheet
    v-if="sheet && isMobile"
    v-bind="$attrs"
    :open="open"
    :elevated="elevated"
    @cancel="handleCancel"
  >
    <div class="px-4 pb-4">
      <!-- Sticks below the drag handle. The fade reaches up under the handle
           to the scroller's edges, like the modal's fade covers its padding;
           the scroller's clip rounds its corners. -->
      <BaseRow class="sticky top-0 z-10 mb-4">
        <BaseScrollFade
          color="var(--color-surface)"
          class="-inset-x-4 -top-6 -bottom-4"
        />

        <h3 :id="titleId">
          <slot name="title"></slot>
        </h3>
      </BaseRow>

      <BaseForm
        v-if="submit"
        :submit="submit"
        :cancel="handleCancel"
        :error="error"
        :danger="danger"
        :loading="loading"
        :requirement="requirement"
      >
        <template v-for="(_, name) in $slots" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps || {}"></slot>
        </template>
      </BaseForm>

      <slot v-else name="content"></slot>
    </div>
  </BaseSheet>
</template>

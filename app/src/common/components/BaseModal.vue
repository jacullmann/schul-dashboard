<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import { useIsMobileViewport } from '@/common/composables/useViewport';
import { X } from '@lucide/vue';
import { useId } from 'vue';

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
  }>(),
  {
    danger: false,
    error: '',
    loading: false,
    requirement: true,
    sheet: false,
    elevated: false,
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
        :labelledby="titleId"
        :elevated="elevated"
        @cancel="handleCancel"
      >
        <!-- pr-12 reserves the close button's width plus gap -->
        <BaseRow class="sticky top-0 z-10 items-start h-[30px] mb-4 pr-12">
          <BaseScrollFade class="-inset-x-4 -top-4 -bottom-4" />

          <BaseRow>
            <h3 :id="titleId">
              <slot name="title"></slot>
            </h3>

            <slot name="title-infopop"></slot>
          </BaseRow>
        </BaseRow>

        <template #corner>
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
    :open="open"
    :elevated="elevated"
    @cancel="handleCancel"
  >
    <div class="px-4 pb-4">
      <!-- Sticks below the drag handle. The fade reaches up under the handle,
           like the modal's fade covers its padding, and rounds its top
           corners to match the sheet's. It overshoots the scroller by 1px at
           the sides and top (clipped by the scroller): the scroller's clip and
           the fade's backdrop filter snap to device pixels differently, which
           otherwise leaves a 1px seam where content shows through unblurred.
           The fade's top then sits on the sheet's outer edge, so the corner
           curve matches the sheet's with 1px more horizontal radius. -->
      <BaseRow class="sticky top-0 z-10 mb-4">
        <BaseScrollFade
          color="var(--color-surface)"
          class="-inset-x-[17px] -top-[25px] -bottom-4 rounded-t-[calc(var(--radius-2xl)+1px)_var(--radius-2xl)]"
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

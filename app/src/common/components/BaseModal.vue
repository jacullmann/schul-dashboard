<script setup lang="ts">
import { useEventListener, useWindowSize } from '@vueuse/core';
import { X } from '@lucide/vue';

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
  }>(),
  {
    danger: false,
    error: '',
    loading: false,
    requirement: true,
    sheet: false,
  },
);

const handleCancel = () => {
  if (props.cancel) {
    props.cancel();
  } else {
    emit('cancel');
  }
};

const { width: windowWidth } = useWindowSize();

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') handleCancel();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade-scale" appear>
      <BaseModalCard
        v-if="open && (windowWidth > 768 || !sheet)"
        @cancel="handleCancel"
      >
        <!-- Header-->
        <BaseRow justify="between" class="items-start mb-4">
          <BaseRow>
            <h3 id="modal-title">
              <slot name="title"></slot>
            </h3>

            <slot name="title-infopop"></slot>
          </BaseRow>

          <BaseButton
            type="button"
            variant="ghost"
            :icon="X"
            class="absolute -top-3 -right-3"
            @click="handleCancel"
          />
        </BaseRow>

        <!-- Content -->
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

        <!-- If there is no submit function, render the content without buttons -->
        <slot v-else name="content"></slot>
      </BaseModalCard>
    </Transition>
  </Teleport>

  <BaseSheet
    v-if="sheet && windowWidth < 768"
    :open="open"
    @cancel="handleCancel"
  >
    <div class="px-4 pb-4">
      <BaseRow class="mb-4"
        ><h3 id="modal-title">
          <slot name="title"></slot></h3
      ></BaseRow>

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

<template>
  <BaseBackdrop blur-size="md" opacity="heavy" @cancel="$emit('cancel')">
    <div
      class="bg-canvas border border-canvas-border rounded-2xl p-4 w-[calc(100%-32px)] max-w-160 max-h-[calc(100%-32px)] overflow-y-auto fixed text-left z-100001"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <slot></slot>
    </div>
  </BaseBackdrop>
</template>

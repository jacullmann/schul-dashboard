<template>
  <div class="flex items-center gap-1.5">
    <BaseHeading level="2" class="text-h2 font-bold font-display m-0 text-on-surface">
      <slot></slot>
    </BaseHeading>

    <slot name="info"></slot>
  </div>
</template>
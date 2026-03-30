<template>
  <div class="flex items-center gap-1.5">
    <BaseHeading level="2">
      <slot></slot>
    </BaseHeading>

    <slot name="info"></slot>
  </div>
</template>
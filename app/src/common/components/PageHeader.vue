<template>
  <BaseRow justify="between" class="mb-4">
    <BaseInfoRow>
      <h2>
        <slot></slot>
      </h2>

      <slot name="info"></slot>
    </BaseInfoRow>

    <slot name="action"></slot>
  </BaseRow>
</template>
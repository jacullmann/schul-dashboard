<template>
  <BaseRow justify="between" class="mb-4">
    <BaseRow>
      <h2>
        <slot></slot>
      </h2>

      <slot name="info"></slot>
    </BaseRow>

    <slot name="action"></slot>
  </BaseRow>
</template>

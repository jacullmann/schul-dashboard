<script setup lang="ts"></script>

<template>
  <div class="flex justify-between items-center gap-4 mb-4">
    <BaseTitle :level="2">
      <slot></slot>

      <template #info>
        <slot name="info"></slot>
      </template>
    </BaseTitle>

    <slot name="action"></slot>
  </div>
</template>
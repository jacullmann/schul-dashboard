<script setup lang="ts">
defineProps<{
  description: string;
  isExpanded: boolean;
}>();

defineEmits<{
  (e: 'toggle'): void;
}>();
</script>

<template>
  <div v-if="description.length">
    <span v-if="!isExpanded">
      {{ description.slice(0, 200)
      }}<span v-if="description.length > 200">…</span>
    </span>
    <span v-else>{{ description }}</span>
    <button
      v-if="description.length > 200"
      type="button"
      class="relative text-base font-bold text-on-ghost-muted hover:text-on-ghost cursor-pointer touch-target ml-2"
      @click="$emit('toggle')"
    >
      {{ isExpanded ? 'Weniger anzeigen' : 'mehr' }}
    </button>
  </div>
</template>

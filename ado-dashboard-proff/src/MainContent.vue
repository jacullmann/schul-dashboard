<template>
  <n-message-provider :max="1">
    <router-view v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </router-view>
  </n-message-provider>
</template>

<script setup lang="ts">
import { NMessageProvider } from 'naive-ui';
</script>

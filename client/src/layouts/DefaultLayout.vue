<script setup lang="ts">
import AppHeader from '@/core/components/AppHeader.vue';
import AppFooter from '@/core/components/AppFooter.vue';
import GlobalAnnouncements from '@/modules/announcements/components/GlobalAnnouncements.vue';
import { useLoadingBar } from '@/common/composables/loadingState';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

const { loading, progress, opacity } = useLoadingBar();
const { activeGroupId } = useAppAuth();

</script>

<template>
  <AppHeader />
  <GlobalAnnouncements v-if="activeGroupId" />

  <div class="progress-container" v-if="loading" :style="{ opacity: opacity }">
    <div class="progress-bar" :style="{ width: progress + '%' }">
      <div class="peg"></div>
    </div>
  </div>

  <main class="full-c">
    <div class="bg"></div>

    <div
        :class="{ 'container': !$route.meta.fullWidth }"
        class="main-content"
        key="content"
    >
      <router-view v-slot="{ Component }">
        <component :is="Component" :key="activeGroupId || 'default'" />
      </router-view>
    </div>
  </main>

  <AppFooter />
</template>

<style scoped>
.progress-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  z-index: 10000;
  pointer-events: none;
  transition: opacity 0.4s ease;
}

.progress-bar {
  height: 100%;
  background: var(--gradient-bismuth);
  width: 0;
  transition: width 200ms ease-out;
  position: relative;
}

.peg {
  display: block;
  position: absolute;
  right: 0;
  width: 100px;
  height: 100%;
  box-shadow: 0 0 10px #af00ff, 0 0 5px #af00ff;
  opacity: 1;
  transform: rotate(3deg) translate(0px, -4px);
}

.main-content {
  margin-top: var(--announcement-height);
  transition: margin-top 0.3s ease;
  width: 100%;
}
</style>
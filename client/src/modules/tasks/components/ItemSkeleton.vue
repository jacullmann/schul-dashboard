<template>
  <div class="skeleton-container">
    <div
        v-for="n in count"
        :key="n"
        class="item-card skeleton-item"
    >
      <div class="item-main">
        <div class="item-meta">
          <div>
            <div class="skeleton-title"></div>
          </div>

          <div class="row-n item-badges">
            <div class="skeleton-text skeleton-info"></div>
          </div>
        </div>

      </div>

      <div class="item-body">
        <div class="skeleton-text skeleton-line-1"></div>
        <div class="skeleton-text skeleton-line-2"></div>
        <div class="skeleton-text skeleton-line-3"></div>
      </div>

      <div class="item-images">
        <div class="images-row">
          <div
              v-for="img in imageCount"
              :key="img"
              class="skeleton-image"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  count?: number;
  imageCount?: number;
}>(), {
  count: 5,
  imageCount: 2
});
</script>

<style scoped>
.skeleton-container {
  display: flex;
  flex-direction: column;
  gap: 36px;
  padding: 12px;
}

.skeleton-item {
  animation: var(--animate-pulse);
}

.skeleton-title {
  height: 20px;
  width: 240px;
  border-radius: 999px;
  background: var(--skeleton-base);
  animation: var(--animate-pulse);
  margin-bottom: 12px;
}

.skeleton-text {
  height: 16px;
  border-radius: 999px;
  background: var(--skeleton-base);
  animation: var(--animate-pulse);
  margin-bottom: 8px;
}

.skeleton-info {
  width: 160px;
  margin-bottom: 12px;
}

.skeleton-line-1 {
  width: 100%;
}

.skeleton-line-2 {
  width: 100%;
}

.skeleton-line-3 {
  width: 70%;
}

.skeleton-image {
  width: 120px;
  height: 120px;
  border-radius: var(--border-5);
  background: var(--skeleton-base);
  animation: var(--animate-pulse);
}

.item-images {
  margin-top: 8px;
}

.images-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 500px) {
  .skeleton-image {
    width: calc(50% - 4px);
    aspect-ratio: 1 / 1;
    height: auto;
  }
}
</style>
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

          <div class="row item-badges">
            <div class="skeleton-badge skeleton-subject"></div>
            <div class="skeleton-badge skeleton-date"></div>
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
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

@keyframes shimmer {
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
}


.skeleton-title {
  height: 18px;
  width: 200px;
  border-radius: 6px;
  background: linear-gradient(
      90deg,
      #2a2a2a 0px,
      #333333 40px,
      #2a2a2a 80px
  );
  background-size: 600px;
  animation: shimmer 1.5s infinite;
}

.skeleton-badge {
  height: 28px;
  border-radius: 6px;
  background: linear-gradient(
      90deg,
      #2a2a2a 0px,
      #333333 40px,
      #2a2a2a 80px
  );
  background-size: 600px;
  animation: shimmer 1.5s infinite;
}

.skeleton-subject {
  width: 80px;
}

.skeleton-date {
  width: 100px;
}



.skeleton-text {
  height: 16px;
  border-radius: 4px;
  background: linear-gradient(
      90deg,
      #2a2a2a 0px,
      #333333 40px,
      #2a2a2a 80px
  );
  background-size: 600px;
  animation: shimmer 1.5s infinite;
  margin-bottom: 8px;
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
  border-radius: 8px;
  background: linear-gradient(
      90deg,
      #2a2a2a 0px,
      #333333 40px,
      #2a2a2a 80px
  );
  background-size: 600px;
  animation: shimmer 1.5s infinite;
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
  .skeleton-title {
    width: 150px;
  }

  .skeleton-image {
    width: calc(50% - 4px);
    aspect-ratio: 1 / 1;
    height: auto;
  }
}
</style>
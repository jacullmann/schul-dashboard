<template>
  <div class="full">
    <Header v-if="$route.path !== '/welcome'"/>
    <GlobalAnnouncements />

    <!-- Fortschrittslinie oben -->
    <div v-if="loading" class="progress-line" key="progress" :class="{ hiding: !loadingVisible }">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>

    <main class="full-c">
      <img src="./utils/alt.svg" alt="Background" class="svg-background" v-if="!deviceIsMobile"/>

      <div :class="{ 'container': $route.path !== '/welcome' }" key="content" class="main-content">
        <MainContent />
      </div>
    </main>

    <Footer v-if="$route.path !== '/welcome'"/>
    <CookieBanner />
    <AccountPromoPopup v-if="$route.path !== '/welcome'" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import CookieBanner from "./components/CookieBanner.vue"
import MainContent from './MainContent.vue';
import GlobalAnnouncements from './components/GlobalAnnouncements.vue';
import AccountPromoPopup from './components/popups/AuthFeatures.vue'
import { loadBadWords } from "./composables/useProfanity";

const deviceIsMobile = ref(false);
const loading = ref(false);
const loadingVisible = ref(false);
const progress = ref(0);
const router = useRouter();

let loadingTimeout: ReturnType<typeof setTimeout> | null = null;
let progressInterval: ReturnType<typeof setInterval> | null = null;
let finishTimeout: ReturnType<typeof setTimeout> | null = null;

const checkIfMobile = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isSmallScreen = window.innerWidth <= 768;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  deviceIsMobile.value = isMobileUserAgent || (isSmallScreen && isTouchDevice);
};
const clearTimers = () => {
  if (loadingTimeout) clearTimeout(loadingTimeout);
  if (progressInterval) clearInterval(progressInterval);
  if (finishTimeout) clearTimeout(finishTimeout);
  loadingTimeout = null;
  progressInterval = null;
  finishTimeout = null;
};
const startProgress = () => {
  clearTimers();
  loading.value = true;
  loadingVisible.value = true;
  progress.value = 0;

  progressInterval = setInterval(() => {
    if (progress.value < 80) {
      progress.value += Math.random() * 2;
      if (progress.value > 80) progress.value = 80;
    }
  }, 20);

  // Safety Timeout, falls nix passiert
  loadingTimeout = setTimeout(() => {
    finishProgress();
  }, 5000);
};

const finishProgress = () => {
  clearInterval(progressInterval);
  progress.value = 100;

  // Lass die Animation laufen, bevor du ausblendest
  finishTimeout = setTimeout(() => {
    loadingVisible.value = false;
    // Gib der Transition Zeit, dann erst loading aus
    setTimeout(() => {
      loading.value = false;
      progress.value = 0;
    }, 500); // muss zu CSS-Transition passen
  }, 300); // Zeit für den schnellen letzten Step
};

// Router Hooks
router.beforeEach((to, from, next) => {
  if (to.path !== from.path) {
    startProgress();
  }
  next();
});

router.afterEach(() => {
  finishProgress();
});

watch(() => router.currentRoute.value.path, () => {
  finishProgress();
});

onMounted(() => {
  checkIfMobile();
  (async () => {
    await loadBadWords();
  })();
});
</script>

<style scoped>
.progress-line {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: transparent;
  z-index: 10000;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.2s ease;
}

.progress-line.hiding {
  opacity: 0;
  pointer-events: none;
}

.progress-bar {
  height: 100%;
  background: #9148c1;
  border-radius: 0 2px 2px 0;
  transition: width 0.5s ease;
  transform-origin: left;
}

.full-c {
  flex: 1;
  position: relative;
}
.main-content {
  margin-top: var(--announcement-height);
  transition: margin-top 0.3s ease;
}
@media (max-width: 500px) {
  .progress-line {
    height: 2px;
  }
}

</style>

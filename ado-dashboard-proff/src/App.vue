<template>
  <div class="full">
    <Header v-if="!$route.meta.hideNavigation"/>
    <GlobalAnnouncements />

    <div class="progress-container" v-if="loading" :style="{ opacity: opacity }">
      <div class="progress-bar" :style="{ width: progress + '%' }">
        <div class="peg"></div>
      </div>
    </div>

    <main class="full-c">
      <div class="svg-background" v-if="deviceIsMobile"></div>
      <!--<img src="./utils/alt.svg" alt="Background" class="svg-background" v-else/>-->
      <div class="black-bg" v-else></div>

      <div
          :class="{ 'container': !$route.meta.fullWidth }"
          class="main-content"
          key="content"
      >
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </div>
    </main>

    <Footer v-if="!$route.meta.hideNavigation"/>

    <CookieBanner />
    <AccountPromoPopup v-if="!$route.meta.hideNavigation" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import CookieBanner from "./components/CookieBanner.vue"
import GlobalAnnouncements from './components/GlobalAnnouncements.vue';
import AccountPromoPopup from './components/popups/AuthFeatures.vue'
import { loadBadWords } from "./composables/useProfanity";
import { useLoadingBar } from "./composables/loadingState";

const deviceIsMobile = ref(false);

const { loading, progress, opacity } = useLoadingBar();

const checkIfMobile = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isSmallScreen = window.innerWidth <= 768;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  deviceIsMobile.value = isMobileUserAgent || (isSmallScreen && isTouchDevice);
};

onMounted(() => {
  checkIfMobile();
  (async () => {
    await loadBadWords();
  })();
});
</script>

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
  background: linear-gradient(90deg, #ffa91a 0, #ff335a 35%, #af00ff 70%, #5600ff 110%);
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

.full-c {
  flex: 1;
  position: relative;
}
.main-content {
  margin-top: var(--announcement-height);
  transition: margin-top 0.3s ease;
  width: 100%;
}

.black-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--bg);
  z-index: -2;
}
</style>
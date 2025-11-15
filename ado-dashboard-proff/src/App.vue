<template>
  <div class="full">

    <Header v-if="$route.path !== '/welcome'"/>
    <GlobalAnnouncements />
    <main class="full-c">
      <img src="./utils/alt4.svg" alt="Background" class="svg-background" v-if="!deviceIsMobile"/>
      <!--<BackgroundSVG v-if="!deviceIsMobile" class="svg-background"/>-->
      <!--<div style="background-color: var(--bg)" class="svg-background"></div>-->
      <div v-if="loading" class="loading-overlay" key="loading">
        <div class="elegant-spinner">
          <div class="dot-1"></div>
          <div class="dot-2"></div>
          <div class="dot-3"></div>
        </div>
      </div>
      <div v-else :class="{ 'container': $route.path !== '/welcome' }" key="content">
        <MainContent />
      </div>
    </main>
    <Footer v-if="$route.path !== '/welcome'"/>
    <CookieBanner />
    <AccountPromoPopup v-if="$route.path !== '/welcome'" />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted} from 'vue';
import { useRouter } from 'vue-router';
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import CookieBanner from "./components/CookieBanner.vue"
import MainContent from './MainContent.vue';
import GlobalAnnouncements from './components/GlobalAnnouncements.vue';
import AccountPromoPopup from './components/popups/AuthFeatures.vue'
import BackgroundSVG from './utils/Back.vue'




const deviceIsMobile = ref(false)


const loading = ref(false);
const router = useRouter();




const MIN_LOAD_TIME = 0;
let loadStartTime = 0;



const checkIfMobile = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isSmallScreen = window.innerWidth <= 768;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  deviceIsMobile.value = isMobileUserAgent || (isSmallScreen && isTouchDevice);
};

router.beforeEach(() => {
  loading.value = true;
  loadStartTime = Date.now();
});

router.afterEach(() => {
  const elapsedTime = Date.now() - loadStartTime;
  const remainingTime = MIN_LOAD_TIME - elapsedTime;

  if (remainingTime > 0) {
    setTimeout(() => {
      loading.value = false;
    }, remainingTime);
  } else {
    loading.value = false;
  }
});

onMounted(() => {
  checkIfMobile();
});
</script>

<style scoped>
.loading-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0);
  z-index: 999;
}

.elegant-spinner {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.elegant-spinner div {
  position: absolute;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #bd34fe;
  opacity: 0;
}

.elegant-spinner .dot-1 {
  animation: pulse-1 2s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
}
.elegant-spinner .dot-2 {
  animation: pulse-2 2s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
}
.elegant-spinner .dot-3 {
  animation: pulse-3 2s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
}


@keyframes pulse-1 {
  0% { transform: scale(0.1); opacity: 0; }
  25% { transform: scale(1); opacity: 1; }
  50% { transform: translateX(20px) scale(0.8); opacity: 0; }
  100% { transform: translateX(20px) scale(0.1); opacity: 0; }
}

@keyframes pulse-2 {
  0% { transform: scale(0.1); opacity: 0; }
  25% { transform: translateX(-20px) scale(0.8); opacity: 0; }
  50% { transform: scale(1); opacity: 1; }
  75% { transform: translateX(20px) scale(0.8); opacity: 0; }
  100% { transform: translateX(20px) scale(0.1); opacity: 0; }
}

@keyframes pulse-3 {
  0% { transform: scale(0.1); opacity: 0; }
  50% { transform: translateX(-20px) scale(0.8); opacity: 0; }
  75% { transform: scale(1); opacity: 1; }
  100% { transform: translateX(20px) scale(0.1); opacity: 0; }
}

.full-c {
  flex: 1;
  position: relative;
}
</style>

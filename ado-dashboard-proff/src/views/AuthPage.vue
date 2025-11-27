<template>
  <div class="page-container">
    <div class="ambient-bg"></div>

    <header class="glass-header" :class="{ 'scrolled': isScrolled }">
      <div class="logo-container" @click="toTop">
        <Logo class="logo-img" aria-hidden="true" />
        <span class="logo-text">Schul-Dashboard</span>
      </div>
    </header>

    <main class="main-content">
      <section class="hero-section">
        <div class="hero-text">
          <h1 class="headline">
            Das <br>
            Schul-Dashboard
          </h1>
          <p class="sub-headline">
            Dein Dashboard, um nie wieder den Überblick in der Schule zu verlieren. Reduziere deinen Stress, indem zu alles an einem Platz hast.
          </p>

          <div class="feature-pills">
            <G @click="showAuths = true" >Dashboard jetzt benutzen</G>

          </div>
        </div>

        <div class="hero-form ">
          <div class="glass-card-wrapper">
            <div class="glass-card-wrapper">
              <Transition name="bounce" >
                <AuthForm v-if="showAuths" ref="authComponentRef" class="modal-content" />
              </Transition>
              <DemoModal  v-if="!showAuths" />
            </div>
          </div>
        </div>
      </section>

      <section class="features-section">
        <div class="section-header">
          <h2>Warum Schul-Dashboard?</h2>
          <p>Habe alles an einem Platz.</p>

        </div>
        <Base style="display: none" />
      </section>

      <footer class="footer ">
        <p>Schul-Dashboard – Alle Rechte vorbehalten</p>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import AuthForm from './welcome/Welcome.vue';
import DemoModal from "./welcome/DemoModal.vue";
import Logo from "../components/hw/Logo.vue";
import G from "./welcome/G.vue";
import Base from "./welcome/Base.vue";

const authComponentRef = ref<InstanceType<typeof AuthForm> | null>(null);
const isScrolled = ref(false);
const showAuths = ref(false);

function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleScroll() {
  isScrolled.value = window.scrollY > 50;
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

</script>

<style scoped>

.page-container {
  min-height: 100vh;
  background-color: #050505;
  color: var(--text-primary);
  overflow-x: hidden;
  position: relative;
}

.ambient-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at 50% 0%, #1a1a1a 0%, #050505 60%);
  z-index: 0;
  pointer-events: none;
}


.glass-header {
  position: fixed;
  top: 0;
  width: 100%;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(0px);
  border-bottom: 1px solid transparent;
}

.glass-header.scrolled {
  background: rgba(8, 8, 8, 0.8);
  backdrop-filter: blur(12px);
  padding: 15px 40px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.modal-content {
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
}
.logo-text {
  font-weight: 700;
  font-size: 1.2rem;
  letter-spacing: -0.02em;
}

.logo-img {
  height: 35px;
}

.main-content {
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 80px;
  gap: 60px;
}

.hero-text {
  flex: 1;
  max-width: 600px;
}

.headline {
  font-size: clamp(3rem, 5vw, 5rem);
  line-height: 1.1;
  font-weight: 800;
  margin-bottom: 24px;
  letter-spacing: -0.03em;
}


.sub-headline {
  font-size: 1.25rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 40px;
  max-width: 480px;
}

.feature-pills {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}


.hero-form {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  perspective: 1000px;
}

.glass-card-wrapper {
  width: 100%;
  max-width: 410px;
  transform-style: preserve-3d;
  position: relative;
  min-height: 500px;
}


.features-section {
  padding: 150px 0;
}

.section-header {
  text-align: center;
  margin-bottom: 80px;
}
.section-header h2 {
  font-size: 2.5rem;
  margin-bottom: 16px;
}
.section-header p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.bento-item h3 {
  font-size: 1.5rem;
  margin-bottom: 12px;
  font-weight: 600;
}
.bento-item p {
  color: var(--text-secondary);
  line-height: 1.5;
}

.footer {
  padding: 40px 0;
  border-top: 1px solid var(--glass-border);
  text-align: center;
  color: #52525b;
  font-size: 0.9rem;
  margin-top: 100px;
}

.bounce-enter-active {
  animation: bounce-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.bounce-leave-active {
  animation: bounce-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) reverse;
}
@keyframes bounce-in {
  0% {
    transform: translate(-1000px, 200px) scale(0);
  }
  100% {
    transform: translate(0, 0) scale(1);
  }

}
@media (max-width: 1024px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    padding-top: 120px;
    gap: 40px;
  }

  .hero-text {
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .hero-form {
    width: 100%;
    justify-content: center;
  }
}
</style>
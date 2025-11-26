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
            Das nächste<br>
            Level
          </h1>
          <p class="sub-headline">
            Dein Dashboard, um nie wieder den Überblick zu verlieren. Reduziere deinen Stress, indem zu alles an einem Platz hast.
          </p>

          <div class="feature-pills">
            <G  v-if="!showAuths" @click="showAuths = true" >Dashboard jetzt benutzen</G>
            <G v-else @click="showAuths = false" >Mehr erfahren</G>

          </div>
        </div>

        <div class="hero-form ">
          <div class="glass-card-wrapper">
            <div class="glass-card-wrapper">
              <Transition name="bounce" mode="out-in" class="modal-transition-container">
                <AuthForm v-if="showAuths" key="auth-form" ref="authComponentRef" class="modal-content" />
                <DemoModal v-else key="demo-modal" class="modal-content" />
              </Transition>
            </div>
          </div>
        </div>
      </section>

      <section class="features-section">
        <div class="section-header">
          <h2>Warum Schul-Dashboard?</h2>
          <p>Habe alles an einem Platz.</p>
        </div>

        <div style="display: none" class="bento-grid">
          <div class="bento-item large">
            <div class="bento-content">
              <h3>Zentrales Dashboard</h3>
              <p>Alles auf einen Blick. Hausaufgaben, Termine und Ankündigungen in einer übersichtlichen Oberfläche.</p>
            </div>
          </div>
          <div class="bento-item ">
            <div class="bento-content">
              <h3>Echtzeit</h3>
              <p>Synchronisierung in Millisekunden.</p>
            </div>
          </div>
          <div class="bento-item ">
            <div class="bento-content">
              <h3>Sicherheit</h3>
              <p>Maximale Datensicherheit durch moderne Standards.</p>
            </div>
          </div>
          <div class="bento-item wide ">
            <div class="bento-content horizontal">
              <div class="text">
                <h3>Responsive Design</h3>
                <p>Egal ob Tablet, Smartphone oder Desktop. Das Erlebnis bleibt perfekt.</p>
              </div>
            </div>
          </div>
        </div>
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
:root {
  --glass-bg: rgba(20, 20, 20, 0.6);
  --glass-border: rgba(255, 255, 255, 0.08);
  --accent-glow: rgba(255, 255, 255, 0.05);
  --text-primary: #ffffff;
  --text-secondary: #a1a1aa;
}

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
  background: rgba(5, 5, 5, 0.8);
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
  font-size: clamp(3rem, 6vw, 5rem);
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

.pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.08);
  border-radius: 100px;
  font-size: 0.9rem;
  color: #e4e4e7;
}

.pill:hover {
  background-color: rgba(255,255,255,0.12);
}

.hero-form {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  perspective: 1000px;
}

.glass-card-wrapper {
  width: 100%;
  max-width: 450px;
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

.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: minmax(250px, auto);
  gap: 24px;
}

.bento-item {
  background: rgba(20, 20, 20, 0.4);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 32px;
  transition: all 0.4s ease;
  overflow: hidden;
  position: relative;
}

.bento-item:hover {
  background: rgba(30, 30, 30, 0.6);
}

.bento-item.large {
  grid-row: span 2;
}
.bento-item.wide {
  grid-column: span 2;
}

.bento-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  z-index: 2;
  position: relative;
}

.bento-content.horizontal {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
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
.bounce-enter-active,
.bounce-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.bounce-leave-active {
  transition: all 0.1s;
}
@keyframes bounce-in {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes bounce-out {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0;
  }
}

.bounce-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.bounce-leave-to {
  opacity: 0;
  transform: scale(0.8);
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

  .bento-grid {
    grid-template-columns: 1fr;
  }
  .bento-item.large, .bento-item.wide {
    grid-column: span 1;
    grid-row: span 1;
  }
}
</style>
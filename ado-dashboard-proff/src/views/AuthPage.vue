<template>
  <div class="full-page-wrapper">
    <main class="content-area">
      <section v-if="!showAuth" class="hero-main-content">
        <h1 class="hero-title">
          <span class="text-gradient">Schul-Dashboard</span>
        </h1>
        <p class="hero-subtitle">Das Tool, um dein schulisches Leben aufs nächste Level zu bringen</p>
        <p class="hero-free">komplett kostenfrei</p>


        <div class="hero-actions">
          <G @click="showAuth = true" data-umami-event="Welcome Page Dashboard benutzen button" >Dashboard jetzt benutzen</G>
        </div>

      </section>


      <section v-if="showAuth" class="auth-section auth-only">
        <div class="auth-wrapper">
          <AuthForm ref="authComponentRef" />
          <a class="back-link" @click="showAuth = false">Zurück</a>
        </div>

      </section>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AuthForm from './Welcome.vue';
import G from "../components/G.vue"


console.log('Dies ist eine rein private Applikation. Das Umgehen des Passwortschutzes, Umgehen von Sicherheitsvorkerungen, Erraten von Passwörtern sowie das Verschaffen nicht für unauthorisierte Personen bestimmter Daten ist strengstens untersagt, wird dokumentiert und umgehend zur Anzeige gebracht. ');

const authComponentRef = ref<InstanceType<typeof AuthForm> | null>(null);
const showAuth = ref(false);







</script>

<style scoped>

.full-page-wrapper {
  min-height: 100%;
  height: 100vh;
  width: 100%;
  top: 0;
  right: 0;
  background-color: var(--bg);
  color: var(--text);
  position: relative;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}


.content-area {
  flex-grow: 1;
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 30px 20px;
}


.hero-main-content {
  text-align: center;
  padding: 100px 20px 80px;
  position: relative;
  z-index: 10;
}

.hero-title {
  font-size: clamp(3rem, 7vw, 6rem);
  font-weight: 900;
  line-height: 1.05;
  margin: 0 0 10px 0;
}

.text-gradient {

  display: block;
}

.hero-subtitle {
  font-size: clamp(1rem, 2.5vw, 1.5rem);
  font-weight: 400;
  color: var(--sub);
  margin-top: 0;
  animation: fadeIn 0.6s ease-out 0.2s forwards;
  opacity: 0;
}

.hero-free {
  font-size: clamp(1.2rem, 3vw, 2.2rem);
  font-weight: 700;
  color: var(--text);
  margin: 15px 0 30px 0;
  animation: fadeIn 0.7s ease-out 0.4s forwards;
  opacity: 0;
}

.hero-actions {
  margin-top: 40px;
  animation: slideInUp 1.2s ease-out 0.6s forwards;
  opacity: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.auth-section {
  padding: 60px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  margin-top: 5rem;
}


.auth-section.auth-only .auth-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}


.back-link {
  font-size: 0.95rem;
  color: var(--primary);
  text-decoration: underline;
  cursor: pointer;
  margin-top: 8px;
}



.info-card label { font-weight: 600; display: block; margin-left: 5px; }
.info-card input[type="checkbox"] { transform: scale(1.2); }

@keyframes slideInUp {
  0% { transform: translateY(40px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@media (max-width: 900px) {

  .hero-main-content {
    padding: 60px 20px 40px;
    height: 110vh;
  }
}




.hero-main-content,
.auth-section {
  z-index: 10;
  position: relative;
  margin-top: 0;
}

.content-area > * { position: relative; z-index: 10; }


</style>

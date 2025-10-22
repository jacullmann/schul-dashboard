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
          <button @click="showAuth = true" data-umami-event="Welcome Page Dashboard benutzen button" class="btn primary-btn large-btn pulse-effect">
            Dashboard jetzt benutzen
          </button>
        </div>
      </section>


      <div v-if="!showAuth" class="floating-cards" aria-hidden="false">
        <div class="floating-cards-inner">
          <div class="info-card1 info-hausaufgabe" style="top: 50%; left: 15%;">
            <input type="checkbox" id="task1" checked>
            <label for="task1">Hausaufgabe morgen</label>
            <p class="small-detail">CDA p. 77/78</p>
            <a style="cursor:pointer;" @click="openhwcheck">Details</a>
          </div>

          <div class="info-card2 info-klassenarbeit" style="top: 10%; right: 1%;">
            <p>Klassenarbeit Deutsch</p>
            <p class="small-detail theme">Thema: Gedichtsanalyse und Inhaltszusammenfassung</p>
            <a @click="examplelist" class="btn ghost-card-btn">Lernzettel öffnen</a>
          </div>

          <div class="info-card3 info-vokabeln" style="top: 12%; left: 2%;">
            <input type="checkbox" id="task2" >
            <label for="task2">Vokabelkarten anfertigen bis Freitag</label>
            <p class="small-detail">Seite 177-178 komplett als Vokabelkarten aufschreiben</p>
            <a @click="openVocabcheck" style="cursor: pointer" class="card-link">Vokabelliste anschauen</a>
          </div>

          <div class="info-card4 info-ausfall" style="top: 50%; right: 10%;">
            <p>1./2. entfällt heute!</p>
          </div>
          <div style="pointer-events: auto" v-if="VocabListShow === true" class="vocablistflex">
          <VocabList @closeVocab="closeVocab" style="" v-if="VocabListShow"/>
          </div>
          <div style="pointer-events: auto" v-if="hwListShow === true" class="hwlistflex">
            <HomeworkList @closehw="closehw" style="" v-if="hwListShow"/>
          </div>
        </div>

      </div>

      <!-- AUTH VIEW: ausschließlich AuthForm, ohne Überschriften oder Weiteres -->
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
import VocabList from "../components/VocabList.vue";
const VocabListShow = ref<bolean>(false);
const hwListShow = ref<bolean>(false);
import HomeworkList from "../components/HomeworkList.vue";

function openVocabcheck() {
  if (VocabListShow.value === true) {
    closeVocab();
  } else {
    openVocab();
  }

}

function openVocab() {
  VocabListShow.value = true;


}
function closeVocab() {
  VocabListShow.value = false;
}
function openhwcheck() {
  if (hwListShow.value === true) {
    closehw();
  } else {
    openhw();
  }

}

function openhw() {
  hwListShow.value = true;


}
function closehw() {
  hwListShow.value = false;
}

const authComponentRef = ref<InstanceType<typeof AuthForm> | null>(null);
const showAuth = ref(false);

// Beispiel-Handler aus originalem Code belassen falls benötigt
const examplelist = () => {
  // placeholder: bestehendes Verhalten beibehalten oder implementieren
};
</script>

<style scoped>
/* GENERAL FULL PAGE & STRUCTURE */
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

/* Keep content centered and readable */
.content-area {
  flex-grow: 1;
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 30px 20px;
}

/* HERO CONTENT */
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
  animation: fadeIn 1.2s ease-out 0.4s forwards;
  opacity: 0;
}

.hero-free {
  font-size: clamp(1.2rem, 3vw, 2.2rem);
  font-weight: 700;
  color: var(--text);
  margin: 15px 0 30px 0;
  animation: fadeIn 1.2s ease-out 0.6s forwards;
  opacity: 0;
}

.hero-actions {
  margin-top: 40px;
  animation: slideInUp 1s ease-out 0.8s forwards;
  opacity: 0;
}

.large-btn {
  padding: 18px 36px;
  font-size: 1.1rem;
  font-weight: 700;
  border-radius: 12px;
  min-width: 280px;
}

/* AUTH SECTION */
.auth-section {
  padding: 60px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  margin-top: 5rem;
}

/* When auth-only view is active we want compact centered wrapper */
.auth-section.auth-only .auth-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

/* small back link inside auth view */
.back-link {
  font-size: 0.95rem;
  color: var(--primary);
  text-decoration: underline;
  cursor: pointer;
  margin-top: 8px;
}

/* Floating cards (statisch) */
.floating-cards {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  pointer-events: none;
  z-index: 5;
  -webkit-transform-style: preserve-3d;
  transform-style: preserve-3d;
}

.floating-cards-inner {
  position: absolute;
  top: -300px;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  /*border: 2px solid red;*/
  /* will-change removed because kein Parallax mehr */
}


.info-card1 {
  position: absolute;
  background-color: rgba(26, 26, 26, 0.85);
  backdrop-filter: blur(10px);
  padding: 16px 20px;
  border-radius: 12px;
  width: clamp(200px, 20vw, 300px);
  border: none;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
  animation: floatEffect1 2s ease-in-out infinite alternate;
}
.info-card2 {
  position: absolute;
  background-color: rgba(26, 26, 26, 0.85);
  backdrop-filter: blur(10px);
  padding: 16px 20px;
  border-radius: 12px;
  width: clamp(200px, 20vw, 300px);
  border: none;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
  animation: floatEffect2 2.6s ease-in-out infinite alternate;
}
.info-card3 {
  position: absolute;
  background-color: rgba(26, 26, 26, 0.85);
  backdrop-filter: blur(10px);
  padding: 16px 20px;
  border-radius: 12px;
  width: clamp(200px, 20vw, 300px);
  border: none;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
  animation: floatEffect3 2.3s ease-in-out infinite alternate;
}
.info-card4 {
  position: absolute;
  background-color: rgba(26, 26, 26, 0.85);
  backdrop-filter: blur(10px);
  padding: 16px 20px;
  border-radius: 12px;
  width: clamp(200px, 20vw, 300px);
  border: none;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
  animation: floatEffect4 1.8s ease-in-out infinite alternate;
}



.info-card label { font-weight: 600; display: block; margin-left: 5px; }
.info-card input[type="checkbox"] { transform: scale(1.2); }
.info-card .small-detail { font-size: 14px; margin-top: 4px; color: var(--muted); }
.info-card .theme { color: #a020f0; }
.info-card .card-link { font-size: 14px; color: var(--primary); display: block; margin-top: 8px; }
.info-card .card-icon {
  position: absolute; top: 10px; right: 10px; font-size: 24px;
}
.ghost-card-btn {
  padding: 6px 10px;
  margin-top: 10px;
  font-size: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: var(--text);
  background: transparent;
  display: inline-block;
}
.info-ausfall {
  background-color: #2a2a2a;
  text-align: center;
  font-weight: 700;
  padding: 10px 15px;
}


@keyframes slideInUp {
  0% { transform: translateY(40px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes floatEffect1 {
  0% { transform: translate(0, 0); }
  50% { transform: translate(0, -5px); }
  100% { transform: translate(0, 0); }
}

@keyframes floatEffect2 {
  0% { transform: translate(0, 0); }
  50% { transform: translate(0, -5px); }
  100% { transform: translate(0, 0); }
}
@keyframes floatEffect3 {
  0% { transform: translate(0, 0); }
  50% { transform: translate(0, -5px); }
  100% { transform: translate(0, 0); }
}
@keyframes floatEffect4 {
  0% { transform: translate(0, 0); }
  50% { transform: translate(0, -5px); }
  100% { transform: translate(0, 0); }
}

@keyframes pulseColor {
  0% { transform: scale(1.0); opacity: 0.7; }
  50% { transform: scale(1.2); opacity: 0.9; }
  100% { transform: scale(1.0); opacity: 0.7; }
}


.btn {
  font-size: 1.05rem;
  padding: 10px 18px;
  border-radius: 8px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.primary-btn {
  background: linear-gradient(70deg, #ff9823, #ff335a, #af00ff, #6600ff );
  color: white;
  border: none;
}
.primary-btn:hover {
}

@media (max-width: 900px) {

  .hero-main-content {
    padding: 60px 20px 40px;
    height: 110vh;
  }


  .floating-cards {
    display: none;
  }
}

/* Minor accessibility and layering adjustments */
.hero-main-content,
.auth-section {
  z-index: 10;
  position: relative;
  margin-top: 0;
}

/* ensure clicks on foreground are not blocked */
.content-area > * { position: relative; z-index: 10; }
.vocablistflex {

}
</style>

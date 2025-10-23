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
          <Button  @click="scrollToInfo" class="visible btn btn-ghost more-info-btn">Mehr erfahren</Button>
        </div>

      </section>


      <div v-if="!showAuth" class="floating-cards" aria-hidden="false">
        <div class="floating-cards-inner">
          <div
              class="info-card1 info-hausaufgabe"
              :style="{ top: card1Y + 'px', zIndex: card1ZIndex, left: card1X + 'px', cursor: isDragging1 ? 'grabbing' : 'grab' }"
              @mousedown.prevent="startDrag1"
          >
            <input type="checkbox" id="task1" checked>
            <label for="task1">Hausaufgabe morgen</label>
            <p class="small-detail">CDA p. 77/78</p>
            <a style="cursor:pointer;" @click="openhwcheck">Details</a>
          </div>

          <!--<div class="info-card2 info-klassenarbeit" style="top: 10%; right: 1%; z-index: 11">
            <p>Klassenarbeit Deutsch</p>
            <p class="small-detail theme">Thema: Gedichtsanalyse und Inhaltszusammenfassung</p>
            <G2 v-if="!bat" @click="batter" class="ripple-button2">Lernzettel öffnen</G2><LearningList @bat="batter" v-if="bat" />


          </div>-->

          <div
              class="info-card2 info-klassenarbeit"
              :style="{ top: card2Y + 'px', left: card2X + 'px', zIndex: card2ZIndex, cursor: isDragging2 ? 'grabbing' : 'grab' }"
              @mousedown.prevent="startDrag2"
          >
            <p>Klassenarbeit Deutsch</p>
            <p class="small-detail theme">Thema: Gedichtsanalyse und Inhaltszusammenfassung</p>
            <G2  @click="batter" class="ripple-button2">

              <div class="rippli">
                <p v-if="!bat">Lernzettel öffnen</p>
                <LearningList v-if="bat" />
              </div>

            </G2>


          </div>

          <div
              class="info-card3 info-aufgaben"
              :style="{ top: card3Y + 'px', left: card3X + 'px', zIndex: card3ZIndex, cursor: isDragging3 ? 'grabbing' : 'grab' }"
              @mousedown.prevent="startDrag3"
          >
            <input type="checkbox" id="task2" >
            <label for="task2">Vokabelkarten anfertigen bis Freitag</label>
            <p class="small-detail">Seite 177-178 komplett als Vokabelkarten aufschreiben</p>
            <a @click="openVocabcheck" style="cursor: pointer" class="card-link">Vokabelliste anschauen</a>
          </div>

          <div
              class="info-card4 info-stundenplan"
              :style="{ top: card4Y + 'px', left: card4X + 'px', zIndex: card4ZIndex, cursor: isDragging4 ? 'grabbing' : 'grab' }"
              @mousedown.prevent="startDrag4"
          >
            <p>1./2. entfällt heute!</p>
            <n-notification-provider placement="top-right" container-style="color: red;" :max="1">
              <NotificationButton class="notification-check-button" />
            </n-notification-provider>
          </div>
          <div style="pointer-events: auto" v-if="VocabListShow === true" class="vocablistflex" :style="{ top: list1Y + 'px', left: list1X + 'px', zIndex: list1ZIndex, position: 'fixed', cursor: isDraggingList1 ? 'grabbing' : 'grab' }" @mousedown.prevent="startDragList1"> <VocabList @closeVocab="closeVocab" style="" v-if="VocabListShow"/> </div>
          <div style="pointer-events: auto" v-if="hwListShow === true" class="hwlistflex" :style="{ top: list2Y + 'px', left: list2X + 'px', position: 'fixed', zIndex: list2ZIndex, cursor: isDraggingList2 ? 'grabbing' : 'grab' }" @mousedown.prevent="startDragList2"> <HomeworkList @closehw="closehw" style="" v-if="hwListShow"/> </div>
        </div>

      </div>

      <div id="more-info-anchor" v-if="!showAuth" class="mobile-card-list" aria-hidden="true">
        <HF  />
      </div>



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
import { h, ref, onMounted } from 'vue';
import AuthForm from './Welcome.vue';
import VocabList from "../components/VocabList.vue";
const VocabListShow = ref<boolean>(false);
const hwListShow = ref<boolean>(false);
import HomeworkList from "../components/HomeworkList.vue";
import G from "../components/G.vue"
import G2 from "../components/G2.vue"
import LearningList from "../components/LearningList.vue";
import { NButton, useNotification } from 'naive-ui'
import HF from "../components/Mobile.vue"


console.log('Dies ist eine rein private Applikation. Das Umgehen des Passwortschutzes, Umgehen von Sicherheitsvorkerungen, Erraten von Passwörtern sowie das verschaffen nicht für unauthorisierte Personen bestimmter Daten ist strengstens untersagt, wird dokumentiert und wird umgehend zur Anzeige gebracht. ');

const bat = ref<boolean>(false);

const card1X = ref(300);
const card1Y = ref(400);
const isDragging1 = ref(false);

const card2X = ref(1000);
const card2Y = ref(120);
const isDragging2 = ref(false);

const card3X = ref(0);
const card3Y = ref(50);
const isDragging3 = ref(false);

const card4X = ref(800);
const card4Y = ref(400);
const isDragging4 = ref(false);

const list1X = ref(500);
const list1Y = ref(-400);
const isDraggingList1 = ref(false);

const list2X = ref(500);
const list2Y = ref(-400);
const isDraggingList2 = ref(false);

const highestZIndex = ref(10);

const card1ZIndex = ref(10);
const card2ZIndex = ref(10);
const card3ZIndex = ref(10);
const card4ZIndex = ref(10);
const list1ZIndex = ref(10);
const list2ZIndex = ref(10);

let initialMouseX = 0;
let initialMouseY = 0;
let initialCardX = 0;
let initialCardY = 0;



function startDrag1(event: MouseEvent) {

  event.preventDefault();

  isDragging1.value = true;

  highestZIndex.value++;
  card1ZIndex.value = highestZIndex.value;


  initialMouseX = event.clientX;
  initialMouseY = event.clientY;


  initialCardX = card1X.value;
  initialCardY = card1Y.value;


  window.addEventListener('mousemove', drag1);
  window.addEventListener('mouseup', stopDrag1);
}

function drag1(event: MouseEvent) {
  if (isDragging1.value) {

    const deltaX = event.clientX - initialMouseX;
    const deltaY = event.clientY - initialMouseY;


    card1X.value = initialCardX + deltaX;
    card1Y.value = initialCardY + deltaY;
  }
}

function stopDrag1() {
  isDragging1.value = false;

  window.removeEventListener('mousemove', drag1);
  window.removeEventListener('mouseup', stopDrag1);
}

function startDrag2(event: MouseEvent) {
  event.preventDefault();

  isDragging2.value = true;

  highestZIndex.value++;
  card2ZIndex.value = highestZIndex.value;


  initialMouseX = event.clientX;
  initialMouseY = event.clientY;


  initialCardX = card2X.value;
  initialCardY = card2Y.value;


  window.addEventListener('mousemove', drag2);
  window.addEventListener('mouseup', stopDrag2);
}

function drag2(event: MouseEvent) {
  if (isDragging2.value) {
    const deltaX = event.clientX - initialMouseX;
    const deltaY = event.clientY - initialMouseY;


    card2X.value = initialCardX + deltaX;
    card2Y.value = initialCardY + deltaY;
  }
}

function stopDrag2() {
  isDragging2.value = false;

  window.removeEventListener('mousemove', drag2);
  window.removeEventListener('mouseup', stopDrag2);
}

function startDrag3(event: MouseEvent) {
  event.preventDefault();

  isDragging3.value = true;

  highestZIndex.value++;
  card3ZIndex.value = highestZIndex.value;


  initialMouseX = event.clientX;
  initialMouseY = event.clientY;


  initialCardX = card3X.value;
  initialCardY = card3Y.value;


  window.addEventListener('mousemove', drag3);
  window.addEventListener('mouseup', stopDrag3);
}

function drag3(event: MouseEvent) {
  if (isDragging3.value) {
    const deltaX = event.clientX - initialMouseX;
    const deltaY = event.clientY - initialMouseY;


    card3X.value = initialCardX + deltaX;
    card3Y.value = initialCardY + deltaY;
  }
}

function stopDrag3() {
  isDragging3.value = false;

  window.removeEventListener('mousemove', drag3);
  window.removeEventListener('mouseup', stopDrag3);
}

function startDrag4(event: MouseEvent) {
  event.preventDefault();

  isDragging4.value = true;

  highestZIndex.value++;
  card4ZIndex.value = highestZIndex.value;


  initialMouseX = event.clientX;
  initialMouseY = event.clientY;


  initialCardX = card4X.value;
  initialCardY = card4Y.value;


  window.addEventListener('mousemove', drag4);
  window.addEventListener('mouseup', stopDrag4);
}

function drag4(event: MouseEvent) {
  if (isDragging4.value) {
    const deltaX = event.clientX - initialMouseX;
    const deltaY = event.clientY - initialMouseY;


    card4X.value = initialCardX + deltaX;
    card4Y.value = initialCardY + deltaY;
  }
}

function stopDrag4() {
  isDragging4.value = false;

  window.removeEventListener('mousemove', drag4);
  window.removeEventListener('mouseup', stopDrag4);
}

function startDragList1(event: MouseEvent) {
  event.preventDefault();
  isDraggingList1.value = true;

  highestZIndex.value++;
  list1ZIndex.value = highestZIndex.value;


  initialMouseX = event.clientX;
  initialMouseY = event.clientY;
  initialCardX = list1X.value;
  initialCardY = list1Y.value;

  window.addEventListener('mousemove', dragList1);
  window.addEventListener('mouseup', stopDragList1);
}

function dragList1(event: MouseEvent) {
  if (isDraggingList1.value) {
    const deltaX = event.clientX - initialMouseX;
    const deltaY = event.clientY - initialMouseY;

    list1X.value = initialCardX + deltaX;
    list1Y.value = initialCardY + deltaY;
  }
}

function stopDragList1() {
  isDraggingList1.value = false;
  window.removeEventListener('mousemove', dragList1);
  window.removeEventListener('mouseup', stopDragList1);
}

function startDragList2(event: MouseEvent) {
  event.preventDefault();
  isDraggingList2.value = true;

  highestZIndex.value++;
  list2ZIndex.value = highestZIndex.value;


  initialMouseX = event.clientX;
  initialMouseY = event.clientY;
  initialCardX = list2X.value;
  initialCardY = list2Y.value;

  window.addEventListener('mousemove', dragList2);
  window.addEventListener('mouseup', stopDragList2);
}

function dragList2(event: MouseEvent) {
  if (isDraggingList2.value) {
    const deltaX = event.clientX - initialMouseX;
    const deltaY = event.clientY - initialMouseY;

    list2X.value = initialCardX + deltaX;
    list2Y.value = initialCardY + deltaY;
  }
}

function stopDragList2() {
  isDraggingList2.value = false;
  window.removeEventListener('mousemove', dragList2);
  window.removeEventListener('mouseup', stopDragList2);
}

function batter(){
  if (bat.value == true) {
    bat.value = false;
  } else {
    bat.value = true;
  }
}

function scrollToInfo() {
  const targetElement = document.getElementById('more-info-anchor');
  if (targetElement) {
    targetElement.scrollIntoView({
      behavior: 'smooth', // Das sorgt für den "smooth" Effekt!
      block: 'start'      // Scrollt, bis der Anfang des Elements sichtbar ist
    });
  }
}

function NotificationButton() {
  const notification = useNotification()
  const index = ref(0)

  return h(
      NButton,
      {
        onClick: () => {
          index.value++
          notification.info({
            title: `Nur ein Spaß.`,
            content: 'Natürlich fällt die 1./2. Stunde heute nicht aus.'
          })
        }
      },
      { default: () =>
            '---> Auf DSB überprüfen'
      }
  )
}

function openVocabcheck() {
  if (VocabListShow.value === true) {
    closeVocab();
  } else {
    if (hwListShow.value === true) {
      closehw();
    }
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
    if (VocabListShow.value === true) {
      closeVocab();
    }
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



</script>

<style scoped>
.rippli{
}

.white:hover{
  color: white;
}

.ripple-button2 {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 500;
  background:transparent;
  color: white;
  border: 1px solid ;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.1s ease;
}

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

.more-info-btn { /* Neue Klasse für den Abstand */
  margin-top: 10px;
}

.large-btn {
  padding: 18px 36px;
  font-size: 1.1rem;
  font-weight: 700;
  border-radius: 12px;
  min-width: 280px;
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
  /*animation: floatEffect1 2s ease-in-out infinite alternate;*/
  animation: none;
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
  /*animation: floatEffect2 2.6s ease-in-out infinite alternate;*/
  animation: none;
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
  /*animation: floatEffect3 2.3s ease-in-out infinite alternate;*/
  animation: none;
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
  /*animation: floatEffect4 1.8s ease-in-out infinite alternate;*/
  animation: none;
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
  50% { transform: translate(0, -2px); }
  100% { transform: translate(0, 0); }
}

@keyframes floatEffect2 {
  0% { transform: translate(0, 0); }
  50% { transform: translate(0, -2px); }
  100% { transform: translate(0, 0); }
}
@keyframes floatEffect3 {
  0% { transform: translate(0, 0); }
  50% { transform: translate(0, -2px); }
  100% { transform: translate(0, 0); }
}
@keyframes floatEffect4 {
  0% { transform: translate(0, 0); }
  50% { transform: translate(0, -2px); }
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
.mobile-card-list {
  display: none;
}
.visible {
  display: none;

}
@media (max-width: 900px) {

  .hero-main-content {
    padding: 60px 20px 40px;
    height: 110vh;
  }
  .visible {
    display: block;
  }


  .floating-cards {
    display: none;
  }

  .mobile-card-list {
    display: flex;
  }
}




.hero-main-content,
.auth-section {
  z-index: 10;
  position: relative;
  margin-top: 0;
}

.content-area > * { position: relative; z-index: 10; }
.vocablistflex {

}

.info-card4 > p:first-child {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 10px;
}

.notification-check-button {
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  background: transparent !important;
  color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  width: 40px;
  overflow: hidden;
  white-space: nowrap;
  transition: width 0.4s ease-out, border-color 0.4s ease-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notification-check-button:hover {
  width: 180px;
  border-color: white !important;
}
</style>

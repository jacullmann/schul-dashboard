<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { SendHorizontal, Info } from 'lucide-vue-next';
const ENCRYPTED_FOOTER = import.meta.env.VITE_APP_ENCRYPTED_FOOTER;

const PBKDF2_ITER = 150000;
const AES_KEY_BITS = 256;

const password = ref('');
const unlocked = ref(false);
const decryptedText = ref<string | null>(null);
const decryptError = ref<string | null>(null);

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function parseEncryptedPayload(b64json: string) {
  try {
    const jsonStr = atob(b64json);
    const obj = JSON.parse(jsonStr);
    return {
      salt: base64ToArrayBuffer(obj.salt),
      iv: base64ToArrayBuffer(obj.iv),
      ct: base64ToArrayBuffer(obj.ct)
    };
  } catch (e) {
    throw new Error('Ungültiges verschlüsseltes Payload-Format.');
  }
}

async function deriveKeyFromPassword(passwordStr: string, salt: ArrayBuffer) {
  const pwUtf8 = new TextEncoder().encode(passwordStr);
  const baseKey = await window.crypto.subtle.importKey(
      'raw',
      pwUtf8,
      'PBKDF2',
      false,
      ['deriveKey']
  );
  const derived = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITER,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: AES_KEY_BITS },
      false,
      ['decrypt']
  );
  return derived;
}

async function tryDecryptAESGCM(derivedKey: CryptoKey, iv: ArrayBuffer, ct: ArrayBuffer) {
  const plainBuf = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv)
      },
      derivedKey,
      ct
  );
  return new TextDecoder().decode(plainBuf);
}

let parsedPayload: { salt: ArrayBuffer; iv: ArrayBuffer; ct: ArrayBuffer } | null = null;
try {
  parsedPayload = parseEncryptedPayload(ENCRYPTED_FOOTER);
} catch (e: any) {
  parsedPayload = null;
  decryptError.value = e.message;
}

async function attemptDecryptLive(pw: string) {
  decryptedText.value = null;
  unlocked.value = false;
  decryptError.value = null;
  if (!parsedPayload) return;

  if (pw.length === 0) {
    decryptedText.value = null;
    unlocked.value = false;
    return;
  }

  try {
    const derived = await deriveKeyFromPassword(pw, parsedPayload.salt);
    const plain = await tryDecryptAESGCM(derived, parsedPayload.iv, parsedPayload.ct);
    decryptedText.value = plain;
    unlocked.value = true;
    decryptError.value = null;
  } catch (e) {
    decryptError.value = 'Falsches Passwort';
    decryptedText.value = null;
    unlocked.value = false;
  }
}

watch(password, (newVal) => {
  attemptDecryptLive(newVal);
});

const textInput = ref('');
const isAnalyzing = ref(false);
const currentStatus = ref('Warten auf Analyse-Start...');
const finalResult = ref(0);
const currentGaugeValue = ref(0);
const showAnalysisArea = ref(false);

const MAX_GAUGE_VALUE = 500;
const VISUAL_MAX_PERCENT = 100;
const SATIRICAL_OVERFLOW_MAX_DEG = 220;

function playSirenTone(): void {
  let sirenUrl = "/siren.mp3";
  try {
    let audio = new Audio(sirenUrl);
    audio.volume = 0.6;
    audio.play().catch(e => {
      console.error("Fehler beim Abspielen des Sounds.", e);
    });
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 30000);
  } catch (e) {
    console.warn("Fehler beim Erstellen des Audio-Objekts:", e);
  }
}

const resultClass = computed(() => {
  if (finalResult.value === 0) return '';
  if (finalResult.value < 50) return 'result-message-low';
  if (finalResult.value < 100) return 'result-message-mid';
  return 'result-message-high';
});

const gaugeRotation = computed(() => {
  const value = currentGaugeValue.value;
  let rotation: number;
  if (value <= VISUAL_MAX_PERCENT) {
    rotation = (value / VISUAL_MAX_PERCENT) * 180;
  } else {
    const overflowValue = value - VISUAL_MAX_PERCENT;
    const maxOverflowValue = MAX_GAUGE_VALUE - VISUAL_MAX_PERCENT;
    const overflowDegrees = SATIRICAL_OVERFLOW_MAX_DEG - 180;
    rotation = 180 + (overflowValue / maxOverflowValue) * overflowDegrees;
    rotation = Math.min(rotation, SATIRICAL_OVERFLOW_MAX_DEG);
  }
  return `rotate(${rotation}deg)`;
});

const gaugeColor = computed(() => {
  if (isAnalyzing.value || finalResult.value === 0) {
    return 'var(--primary)';
  } else if (finalResult.value < 50) {
    return 'var(--primary)';
  } else if (finalResult.value < 100) {
    return 'var(--warn)';
  } else {
    return 'var(--danger)';
  }
});

const resultMessageText = computed(() => {
  if (finalResult.value === 0) {
    return '';
  }
  if (finalResult.value < 50) {
    return `Ihr Text ist wahrscheinlich NICHT KI generiert. (Wahrscheinlichkeit: ${finalResult.value}%)`;
  } else if (finalResult.value < 100) {
    return `Ihr Text ist wahrscheinlich KI generiert. (Wahrscheinlichkeit: ${finalResult.value}%)`;
  } else {
    return `Ihr Text wurde wissenschaftlich analysiert, bewertet, studiert, und 1000 Wissenschaftler und Germanist*innen sind zu dem Schluss gekommen, dass der Text KI generiert ist. (Überwältigende Wahrscheinlichkeit: ${finalResult.value}%)`;
  }
});

function getWeightedResult(): number {
  const r = Math.random();
  let result: number;
  if (r < 0.20) {
    result = Math.floor(Math.random() * 50);
  } else if (r < 0.70) {
    result = Math.floor(Math.random() * 50) + 50;
  } else {
    result = Math.floor(Math.random() * 401) + 100;
  }
  return result;
}

function animateCounter(finalValue: number): void {
  const duration = 1500;
  let startTime: number | undefined;
  let sirenTriggered = false;
  const step = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;
    const percentage = Math.min(progress / duration, 1);
    const nextValue = Math.floor(percentage * finalValue);
    currentGaugeValue.value = nextValue;
    if (finalResult.value > VISUAL_MAX_PERCENT && nextValue > VISUAL_MAX_PERCENT && !sirenTriggered) {
      playSirenTone();
      sirenTriggered = true;
    }
    if (progress < duration) {
      window.requestAnimationFrame(step);
    } else {
      currentGaugeValue.value = finalValue;
      finalizeAnalysis();
    }
  }
  window.requestAnimationFrame(step);
}

function finalizeAnalysis(): void {
  currentStatus.value = "Analyse abgeschlossen. Bericht generiert.";
  isAnalyzing.value = false;
}

async function startAnalysis(): Promise<void> {
  if (isAnalyzing.value || textInput.value.trim() === "") {
    if (textInput.value.trim() === "") {
      console.error("Bitte geben Sie einen Text zur Analyse ein.");
    }
    return;
  }
  isAnalyzing.value = true;
  showAnalysisArea.value = true;
  finalResult.value = 0;
  currentGaugeValue.value = 0;
  const phases = [
    { status: "Initialisiere Deep-Style-Analysator...", duration: 400 },
    { status: "Sichere Text-Vektorisierung gestartet. Token-Analyse...", duration: 600 },
    { status: "Analyse des syntaktischen Fingerabdrucks (Phase 1/3)...", duration: 750 },
    { status: "Cross-Corpus-Vergleich mit 1.4 Mrd. generierten Proben...", duration: 600 },
    { status: "Finaler Wahrscheinlichkeits-Algorithmus (Phase 3/3)...", duration: 400 },
  ];
  const result = getWeightedResult();
  finalResult.value = result;
  for (const phase of phases) {
    currentStatus.value = phase.status;
    await new Promise(resolve => setTimeout(resolve, phase.duration));
  }
  currentStatus.value = "Berechnung abgeschlossen. Resultat wird visualisiert...";
  animateCounter(result);
}

</script>

<template>
  <div class="card" style="padding: 30px;">
    <div class="header">
      <h1>AI-DETECTOR V26.8</h1>
      <p class="small">Der beste KI-Erkenner für Lehrer (500% Erkennungsrate)</p>
    </div>

    <textarea
        id="textInput"
        class="input"
        rows="8"
        placeholder="Fügen Sie den zu analysierenden Text hier ein..."
        v-model="textInput"
        :disabled="isAnalyzing"
    ></textarea>

    <div style="margin-top: 16px; text-align: right;">
      <button
          id="analyzeBtn"
          class="btn ghost"
          @click="startAnalysis"
          :disabled="isAnalyzing || textInput.trim().length === 0"
          data-umami-event="Ai-Detector fake analysieren button"
      >
        <SendHorizontal size="15px"/>
        {{ isAnalyzing ? 'Analyse läuft...' : 'Analyse starten' }}
      </button>
    </div>

    <div id="analysisArea" v-show="showAnalysisArea" style="margin-top: 30px;">
      <hr style="margin-bottom: 24px;">
      <div id="statusLog" class="status-box">
        <div class="dot" :style="{ 'animation': isAnalyzing ? 'pulse 1.5s infinite' : 'none', 'background-color': isAnalyzing ? 'var(--primary)' : 'var(--text)' }"></div>
        <span id="currentStatus">{{ currentStatus }}</span>
      </div>

      <div class="gauge-container">
        <div class="gauge">
          <div id="gaugeTrack" class="gauge-track"></div>
          <div id="gaugeFill"
               class="gauge-fill"
               :style="{
                 'transform': gaugeRotation,
                 'border-color': gaugeColor,
                 'transition': isAnalyzing ? 'none' : 'transform 1.5s ease-out, border-color 1.5s'
               }"
          ></div>
        </div>
        <div id="gaugeLabel" class="gauge-label" :style="{'color': gaugeColor}">
          {{ currentGaugeValue }}%
          <span>KI-Wahrscheinlichkeit</span>
        </div>
      </div>

      <div id="resultMessage"
           class="result-message"
           :class="resultClass"
           v-show="!isAnalyzing && finalResult > 0"
           v-html="resultMessageText"
      >
      </div>
    </div>

    <div style="margin-top: 20px; display:flex; gap:12px; align-items:center; justify-content:flex-end;">
      <input
          type="password"
          v-model="password"
          placeholder="Passwort eingeben"
          style="padding:8px 10px; border-radius:6px; border:1px solid var(--vlbg);"
          :aria-label="'Passwort'"
      />
      <div style="font-size:0.9rem; color: var(--sub);">
        <div v-if="unlocked" >Authentifizierung erfolgreich</div>
        <div v-else-if="password.length>0" >{{ decryptError }}</div>
      </div>
    </div>

    <footer v-if="parsedPayload !== null" v-html="decryptedText ? decryptedText : 'Sensibler Text – Zugriff nur mit Authentifizierung.'">
    </footer>

    <footer v-else>
      Fehler
    </footer>
  </div>
</template>

<style scoped>
.header {
  text-align: center;
  padding-bottom: 24px;
}
.header h1 {
  font-size: 2.5rem;
  margin: 0;
}
.status-box {
  background-color: var(--vlbg);
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 20px;
  font-family: monospace;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 50px;
}
.status-box .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
@keyframes pulse {
  0% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0.7; }
}
.gauge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin: 40px 0 60px;
  height: 200px;
}
.gauge {
  width: 300px;
  height: 150px;
  position: relative;
  overflow: hidden;
}
.gauge-track, .gauge-fill {
  position: absolute;
  width: 300px;
  height: 300px;
  border: 20px solid var(--vlbg);
  border-radius: 50%;
  clip: rect(0, 300px, 150px, 0);
}
.gauge-track {
  border-color: var(--vlbg);
}
.gauge-fill {
  border-bottom-color: transparent;
  border-right-color: transparent;
}
.gauge-label {
  border: none;
  position: absolute;
  width: 100%;
  text-align: center;
  top: 50%;
  transform: translateY(-50%);
  font-size: 3.5rem;
  font-weight: bold;
  color: var(--text);
  transition: color 1.5s;
}
.gauge-label span {
  display: block;
  font-size: 0.9rem;
  font-weight: normal;
  color: var(--sub);
  margin-top: -10px;
}
.result-message {
  margin-top: 30px;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  font-size: 1.25rem;
  font-weight: bold;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.result-message-low { background-color: rgba(63, 147, 248, 0.38); }
.result-message-mid { background-color: rgba(245, 158, 11, 0.37); }
.result-message-high { background-color: rgba(239, 68, 68, 0.4);}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
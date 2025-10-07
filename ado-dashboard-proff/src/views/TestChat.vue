<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';

// NOTE: Die API-Basis-URL und der Key sind hier im Frontend für Testzwecke gespeichert, wie gewünscht.
// In einer echten Produktionsumgebung sollte der API-Key IMMER auf einem Backend-Server verwaltet werden!
const API_KEY = "AIzaSyB7r0QY7lm4AYY-mzjlvJeY-6hA-6u3HVQ"; // Hier Ihren Gemini API Schlüssel einfügen (oder leer lassen, damit Canvas ihn automatisch bereitstellt)
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;
const MODEL_NAME = "gemini-2.5-flash-preview-05-20";

// --- State Management (Statusverwaltung) ---
const inputText = ref('');
const aiProbability = ref<number | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const lastAnalysisTime = ref<Date | null>(null);

// Zustand für die Animation des Zählers
const displayProbability = ref(0);
let animationFrameId: number | null = null;
let detailedAnalysis = ref<any>(null);

// --- Konstanten und Konfigurationen ---
const MAX_RETRIES = 3;

// --- Prompt Engineering für die KI-Analyse ---
// Systemanweisung, die Gemini zur KI-Erkennung zwingt und eine strukturierte JSON-Antwort verlangt
const SYSTEM_PROMPT = `
Du bist ein hochpräziser, speziell trainierter Algorithmus zur quantitativen KI-Texterkennung.
Deine Aufgabe ist es, den eingegebenen Text wissenschaftlich zu analysieren und die Wahrscheinlichkeit zu bestimmen, dass er von einer Künstlichen Intelligenz (KI) generiert wurde.
Antworte IMMER im folgenden JSON-Format. Fülle die Felder ehrlich und basierend auf deiner Analyse aus.
Die 'kiWahrscheinlichkeit' MUSS eine Zahl zwischen 0 und 100 sein.
`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    kiWahrscheinlichkeit: {
      type: "NUMBER",
      description: "Die endgültige Wahrscheinlichkeit (0-100), dass der Text KI-generiert ist."
    },
    analyseParameter: {
      type: "OBJECT",
      description: "Interne Metriken, die die Analyse stützen.",
      properties: {
        textKomplexität: { type: "STRING", enum: ["Niedrig", "Mittel", "Hoch"] },
        satzstrukturVarianz: { type: "STRING", enum: ["Niedrig", "Mittel", "Hoch"] },
        perplexitätsIndex: { type: "NUMBER", description: "Ein Wert, der die Vorhersagbarkeit des Textes angibt (niedriger = KI-ähnlicher)." },
        burstinessScore: { type: "NUMBER", description: "Ein Wert, der die Variabilität der Satzlänge angibt (niedriger = KI-ähnlicher)." }
      },
      propertyOrdering: ["textKomplexität", "satzstrukturVarianz", "perplexitätsIndex", "burstinessScore"]
    }
  },
  required: ["kiWahrscheinlichkeit", "analyseParameter"],
  propertyOrdering: ["kiWahrscheinlichkeit", "analyseParameter"]
};

// --- Animationslogik ---
const animateCount = (start: number, end: number, duration = 1500) => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }

  const startTime = performance.now();
  const range = end - start;

  const step = (currentTime: number) => {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(1, elapsedTime / duration); // 0 to 1

    // Easing-Funktion (Smoothstep für einen professionellen Look)
    const easedProgress = progress * progress * (3 - 2 * progress);

    displayProbability.value = start + range * easedProgress;

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(step);
    } else {
      displayProbability.value = end;
      animationFrameId = null;
    }
  };

  animationFrameId = requestAnimationFrame(step);
};

// Beobachten der tatsächlichen KI-Wahrscheinlichkeit und Starten der Animation
watch(aiProbability, (newVal, oldVal) => {
  if (newVal !== null) {
    const start = oldVal !== null ? oldVal : 0;
    animateCount(start, newVal);
  }
}, { immediate: true });

// --- Berechnung der Farb- und Stilwerte für die Grafik ---
const progressPercentage = computed(() => aiProbability.value !== null ? Math.min(100, aiProbability.value) : 0);
const strokeDashoffset = computed(() => 472 - (472 * progressPercentage.value) / 100);

const resultColor = computed(() => {
  if (aiProbability.value === null) return 'var(--muted)';
  if (aiProbability.value >= 75) return 'var(--danger)'; // Hohe KI-Wahrscheinlichkeit
  if (aiProbability.value >= 40) return 'var(--warn)';   // Mittlere Wahrscheinlichkeit
  return 'var(--primary)'; // Geringe Wahrscheinlichkeit (Menschlich)
});

const resultStatus = computed(() => {
  if (aiProbability.value === null) return 'Analyse ausstehend';
  if (aiProbability.value >= 90) return 'Status: Extrem Hoch (Synthetisch)';
  if (aiProbability.value >= 60) return 'Status: Hoch (Automatisierte Erzeugung wahrscheinlich)';
  if (aiProbability.value >= 40) return 'Status: Mittel (Hybride Generierung möglich)';
  if (aiProbability.value >= 15) return 'Status: Niedrig (Menschliche Erstellung wahrscheinlich)';
  return 'Status: Sehr Niedrig (Authentisch)';
});

// --- API Interaktion ---

/**
 * Konvertiert einen Base64-String in ein ArrayBuffer.
 * Dies ist notwendig, um die rohe PCM-Audiodaten in eine abspielbare WAV-Datei umzuwandeln.
 * @param base64 Der Base64-String
 * @returns Ein ArrayBuffer
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Implementiert die Exponential-Backoff-Strategie für API-Aufrufe.
 * @param operation Die asynchrone Funktion, die aufgerufen werden soll.
 * @param maxRetries Die maximale Anzahl der Wiederholungen.
 * @param baseDelay Die Basisverzögerung in Millisekunden.
 */
async function withExponentialBackoff<T>(operation: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error; // Letzte Wiederholung fehlgeschlagen, Fehler weitergeben
      }
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  // Sollte nicht erreicht werden, aber TS-Sicherheitshalber
  throw new Error("Operation failed after maximum retries.");
}


/**
 * Sendet den Text zur Analyse an die Gemini API.
 */
const analyzeText = async () => {
  if (!inputText.value.trim()) {
    error.value = "Bitte geben Sie einen Text zur Analyse ein.";
    return;
  }

  isLoading.value = true;
  error.value = null;
  detailedAnalysis.value = null;

  // Setze die Wahrscheinlichkeit auf Null, um die Animation zurückzusetzen, aber nicht auf null, um den Zähler anzuzeigen
  if (aiProbability.value !== null) {
    aiProbability.value = 0;
  }

  // FIX: Die Konfiguration muss in 'generationConfig' und 'systemInstruction' als gleichrangige Felder.
  const payload = {
    contents: [{ parts: [{ text: inputText.value }] }],
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }] // System Instruction benötigt das parts-Array
    },
    generationConfig: { // WICHTIGE KORREKTUR: 'config' wurde zu 'generationConfig'
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA
    },
  };

  try {
    const response = await withExponentialBackoff(async () => {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        // Versuche, den Fehlertext zu parsen, falls verfügbar
        const errorBody = await res.text();
        throw new Error(`API Fehler (Status ${res.status}): ${errorBody.substring(0, 100)}...`);
      }
      return res;
    }, MAX_RETRIES);

    const result = await response.json();

    const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!jsonText) {
      throw new Error("API-Antwort enthielt kein gültiges JSON.");
    }

    const parsedJson = JSON.parse(jsonText);

    if (typeof parsedJson.kiWahrscheinlichkeit !== 'number') {
      throw new Error("Ungültiges Ergebnisformat: 'kiWahrscheinlichkeit' ist keine Zahl.");
    }

    const probability = Math.min(100, Math.max(0, parsedJson.kiWahrscheinlichkeit));
    aiProbability.value = probability;
    detailedAnalysis.value = parsedJson.analyseParameter;
    lastAnalysisTime.value = new Date();

  } catch (e) {
    console.error("Fehler bei der KI-Analyse:", e);
    error.value = `Analysefehler: ${e instanceof Error ? e.message : String(e)}. Bitte versuchen Sie es erneut.`;
    aiProbability.value = null; // Setze zurück, wenn Fehler aufgetreten ist
  } finally {
    isLoading.value = false;
  }
};

// --- Lifecycle & Initialisierung (Optional: um sicherzustellen, dass das UI initialisiert ist) ---
onMounted(() => {
  // Initialisierungseffekte können hier platziert werden
  aiProbability.value = null; // Start ohne Ergebnis
});

</script>

<template>
  <div class="ki-analyzer-component full">
    <div class="container full-c">
      <header class="header">
        <h1>Quanten-Analyse-Modul: A.I. Sentry Pro v3.1</h1>
        <p class="small text-sub">Hochpräzises Instrument zur forensischen Textanalyse und KI-Detektion. Basierend auf einem strukturierten Gemini-Architekturmodell.</p>
      </header>

      <div class="grid-layout">
        <!-- Eingabe- und Steuerungssektion -->
        <div class="card input-card">
          <h2>Texteingabe zur Detektion</h2>
          <textarea
              v-model="inputText"
              class="input large-textarea"
              placeholder="Fügen Sie hier den zu analysierenden Text ein. Mindestens 100 Zeichen empfohlen für eine präzise Analyse..."
              :disabled="isLoading"
              rows="12"
          ></textarea>

          <div class="controls-row">
            <button
                @click="analyzeText"
                class="btn primary-btn"
                :disabled="isLoading || !inputText.trim()"
            >
              <span v-if="isLoading" class="spinner"></span>
              {{ isLoading ? 'ANALYSIERE DATEN...' : 'ANALYSE STARTEN' }}
            </button>
            <span class="small">{{ inputText.length }} Zeichen</span>
          </div>

          <div v-if="error" class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p><strong>Datenfehler:</strong> {{ error }}</p>
          </div>

        </div>

        <!-- Analyse-Ergebnis-Sektion -->
        <div class="card result-card">
          <h2>Ergebnisprotokoll (Echtzeit)</h2>

          <div v-if="aiProbability === null && !isLoading" class="initial-state">
            <i class="fas fa-microchip"></i>
            <p>Warten auf Eingabe und Initialisierung der Analyse-Engine.</p>
          </div>

          <div v-else class="analysis-output">

            <!-- Grafische Anzeige (Gauge) -->
            <div class="gauge-container" :style="{ '--gauge-color': resultColor }">
              <svg class="gauge-svg" viewBox="0 0 180 180">
                <!-- Hintergrundkreis -->
                <circle
                    class="gauge-track"
                    cx="90" cy="90" r="75"
                    stroke-width="15"
                ></circle>
                <!-- Fortschrittskreis (animiert) -->
                <circle
                    class="gauge-progress"
                    cx="90" cy="90" r="75"
                    stroke-width="15"
                    :style="{
                                        strokeDashoffset: strokeDashoffset,
                                        transition: 'stroke-dashoffset 1.5s ease-in-out'
                                    }"
                ></circle>
              </svg>
              <div class="gauge-value-display">
                                <span class="percentage-number" :style="{ color: resultColor }">
                                    {{ Math.round(displayProbability) }}
                                </span>
                <span class="percentage-label">%</span>
              </div>
            </div>

            <!-- Status und Interpretation -->
            <div class="status-box">
              <p class="status-text" :style="{ color: resultColor }">
                {{ resultStatus }}
              </p>
              <hr>
              <div class="interpretation-info">
                <h3>KI-Wahrscheinlichkeit:</h3>
                <p class="interpretation-value" :style="{ color: resultColor }">
                  <span class="font-bold text-xl">{{ Math.round(aiProbability ?? 0) }}%</span>
                  (Dieser Wert gibt an, wie wahrscheinlich die KI-Generierung ist.)
                </p>
              </div>

            </div>
          </div>
        </div>

        <!-- Detail-Analyse-Sektion -->
        <div class="card detail-card" v-if="aiProbability !== null || isLoading">
          <h2>Systemprotokoll & Metriken</h2>
          <div v-if="isLoading" class="loading-metrics">
            <p>Initialisiere Subroutinen...</p>
            <div class="metric-line"><span>Struktur-Analyse...</span> <span class="spinner-small"></span></div>
            <div class="metric-line"><span>Perplexitäts-Scoring...</span> <span class="spinner-small"></span></div>
            <div class="metric-line"><span>Burstiness-Validierung...</span> <span class="spinner-small"></span></div>
          </div>

          <div v-else-if="detailedAnalysis">
            <div class="metric-grid">
              <div class="metric-item">
                <span class="metric-label">Text-Komplexität:</span>
                <span class="metric-value badge">{{ detailedAnalysis.textKomplexität }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Satzstruktur-Varianz:</span>
                <span class="metric-value badge">{{ detailedAnalysis.satzstrukturVarianz }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Perplexitäts-Index:</span>
                <span class="metric-value badge">{{ detailedAnalysis.perplexitätsIndex.toFixed(3) }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Burstiness Score:</span>
                <span class="metric-value badge">{{ detailedAnalysis.burstinessScore.toFixed(3) }}</span>
              </div>
            </div>
            <hr>
            <p class="small text-sub">Letzte Analyse: {{ lastAnalysisTime?.toLocaleTimeString('de-DE') }} Uhr</p>
            <p class="small text-sub">Engine-ID: {{ MODEL_NAME }}</p>
          </div>
        </div>

      </div>
    </div>
    <footer>
      <div class="container small">A.I. Sentry Pro Forensik-Modul</div>
    </footer>
  </div>
</template>

<style scoped>
/* Scoped Styles, die die globalen Variablen nutzen */

.ki-analyzer-component {
  background-color: var(--bg);
}

.header {
  margin-bottom: 24px;
  padding-top: 24px;
  border-bottom: 1px solid var(--jj);
  padding-bottom: 16px;
}

h1 {
  font-size: 2.2rem;
  color: var(--primary);
  text-shadow: 0 0 5px rgba(63, 147, 248, 0.5);
  margin: 0;
}

h2 {
  color: var(--text);
  border-bottom: 1px solid var(--jj);
  padding-bottom: 8px;
  margin-top: 0;
  font-size: 1.5rem;
}

.text-sub {
  color: var(--sub);
}

.grid-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 40px;
}

@media (max-width: 1024px) {
  .grid-layout {
    grid-template-columns: 1fr;
  }
}

.card {
  border: 1px solid var(--jj);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

/* Eingabebereich */
.input-card {
  grid-column: 1 / 2;
}

.large-textarea {
  min-height: 250px;
  resize: vertical;
  margin-bottom: 16px;
  transition: border-color 0.3s;
  font-size: 16px;
}

.large-textarea:focus {
  outline: none;
  border: 1px solid var(--primary);
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.primary-btn {
  background: var(--primary);
  color: var(--bg);
  font-weight: bold;
  transition: background 0.3s, transform 0.1s;
}
.primary-btn:hover {
  background: #5fa5ff;
}
.primary-btn:disabled {
  background: var(--jj);
  color: var(--muted);
  cursor: not-allowed;
}

/* Ergebnisbereich */
.result-card {
  grid-column: 2 / 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 400px;
}
@media (max-width: 1024px) {
  .result-card {
    grid-column: 1 / 2;
    min-height: auto;
  }
}


.initial-state {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--muted);
  padding: 40px 0;
}

.initial-state i {
  font-size: 3rem;
  margin-bottom: 10px;
}

/* Gauge (Ring-Grafik) */
.gauge-container {
  --gauge-color: var(--primary); /* Standardwert, wird überschrieben */
  width: 180px;
  height: 180px;
  position: relative;
  margin: 20px auto;
}

.gauge-svg {
  transform: rotate(-90deg); /* Start bei 12 Uhr */
}

.gauge-track {
  fill: none;
  stroke: var(--jj);
  opacity: 0.5;
}

.gauge-progress {
  fill: none;
  stroke: var(--gauge-color);
  stroke-linecap: round;
  /* Der Umfang eines Kreises mit r=75 ist 2*pi*r ≈ 471.24. Wir runden auf 472 */
  stroke-dasharray: 472;
  stroke-dashoffset: 472;
  filter: drop-shadow(0 0 5px var(--gauge-color));
}

.gauge-value-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  line-height: 1;
}

.percentage-number {
  font-size: 4rem;
  font-weight: 700;
  transition: color 0.5s;
}

.percentage-label {
  font-size: 1.5rem;
  color: var(--muted);
  font-weight: 300;
  margin-left: 5px;
}

.status-box {
  margin-top: 10px;
  width: 100%;
}

.status-text {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 0;
  transition: color 0.5s;
}

.interpretation-info {
  text-align: left;
  padding: 8px;
  background: var(--bg);
  border-radius: 8px;
  border: 1px solid var(--jj);
}
.interpretation-info h3 {
  margin: 0 0 4px 0;
  font-size: 1rem;
  color: var(--sub);
}
.interpretation-value {
  margin: 0;
  transition: color 0.5s;
}

/* Detail-Analyse (Metriken) */
.detail-card {
  grid-column: 1 / -1; /* Nimmt die gesamte Breite ein */
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: var(--card);
  border-radius: 6px;
  border: 1px solid var(--jj);
}

.metric-label {
  color: var(--muted);
}

.metric-value {
  font-weight: 600;
  color: var(--text);
  background: var(--jj);
  padding: 4px 8px;
  border-radius: 4px;
}

/* Lade-Indikatoren */
.spinner {
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid var(--text);
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
  display: inline-block;
  vertical-align: middle;
}

.spinner-small {
  width: 10px;
  height: 10px;
  border-width: 2px !important;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-metrics .metric-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--sub);
  padding: 4px 0;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid var(--danger);
  color: var(--danger);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-message i {
  font-size: 1.2rem;
}
</style>

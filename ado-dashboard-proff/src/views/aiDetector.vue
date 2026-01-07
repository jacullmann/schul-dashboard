<script setup lang="ts">
import { ref, computed } from 'vue';
import { Activity, BarChart3, FileText, TrendingUp, Zap } from 'lucide-vue-next';

const textInput = ref('');
const isAnalyzing = ref(false);
const currentStatus = ref('Warten auf Analyse-Start...');
const finalResult = ref(0);
const currentGaugeValue = ref(0);
const showAnalysisArea = ref(false);

const totalScans = ref(0);
const wordCount = ref(0);
const charCount = ref(0);
const sentenceCount = ref(0);

const syntaxScore = ref(0);
const semanticScore = ref(0);
const coherenceScore = ref(0);
const patternScore = ref(0);

const MAX_GAUGE_VALUE = 500;
const VISUAL_MAX_PERCENT = 100;
const SATIRICAL_OVERFLOW_MAX_DEG = 220;

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
    return 'var(--text)';
  } else if (finalResult.value < 50) {
    return 'var(--text)';
  } else if (finalResult.value < 100) {
    return 'var(--sub)';
  } else {
    return 'var(--text)';
  }
});

const resultMessageText = computed(() => {
  if (finalResult.value === 0) return '';
  if (finalResult.value < 50) {
    return `Der analysierte Text zeigt menschliche Schreibmuster. KI-Wahrscheinlichkeit: ${finalResult.value}%`;
  } else if (finalResult.value < 100) {
    return `Der Text weist einige LLM-Merkmale auf. KI-Wahrscheinlichkeit: ${finalResult.value}%`;
  } else {
    return `KRITISCHE WARNUNG: Der Großteil der 1500 Germanist*innen sind zu dem Schluss gekommen, dass der eingegebene Text eine hohe Anzahl an LLM-typischen Merkmalen aufweist. Die KI-Wahrscheinlichkeit beträgt  ${finalResult.value}.Eine mehrfache Validierung durch unabhängige Detektionsmodule wird nicht empfohlen, um Unsicherheiten zu vermeiden.`;
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

function calculateTextMetrics(text: string): void {
  wordCount.value = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  charCount.value = text.length;
  sentenceCount.value = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
}

function animateMetrics(): void {
  const duration = 2000;
  let startTime: number | undefined;

  const targetSyntax = Math.floor(Math.random() * 40) + 60;
  const targetSemantic = Math.floor(Math.random() * 35) + 55;
  const targetCoherence = Math.floor(Math.random() * 30) + 65;
  const targetPattern = Math.floor(Math.random() * 45) + 50;

  const step = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;
    const percentage = Math.min(progress / duration, 1);

    syntaxScore.value = Math.floor(percentage * targetSyntax);
    semanticScore.value = Math.floor(percentage * targetSemantic);
    coherenceScore.value = Math.floor(percentage * targetCoherence);
    patternScore.value = Math.floor(percentage * targetPattern);

    if (progress < duration) {
      window.requestAnimationFrame(step);
    } else {
      syntaxScore.value = targetSyntax;
      semanticScore.value = targetSemantic;
      coherenceScore.value = targetCoherence;
      patternScore.value = targetPattern;
    }
  }
  window.requestAnimationFrame(step);
}

function animateCounter(finalValue: number): void {
  const duration = 1500;
  let startTime: number | undefined;
  const step = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;
    const percentage = Math.min(progress / duration, 1);
    const nextValue = Math.floor(percentage * finalValue);
    currentGaugeValue.value = nextValue;
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
  currentStatus.value = "Analyse abgeschlossen. Bericht wurde erfolgreich generiert.";
  isAnalyzing.value = false;
}

async function startAnalysis(): Promise<void> {
  if (isAnalyzing.value || textInput.value.trim() === "") {
    return;
  }

  totalScans.value++;
  calculateTextMetrics(textInput.value);

  isAnalyzing.value = true;
  showAnalysisArea.value = true;
  finalResult.value = 0;
  currentGaugeValue.value = 0;
  syntaxScore.value = 0;
  semanticScore.value = 0;
  coherenceScore.value = 0;
  patternScore.value = 0;

  const phases = [
    { status: "Lade Text auf Server...", duration: 400 },
    { status: "Verteile Text an die zuständigen Germanist*innen...", duration: 600 },
    { status: "Syntax-Fingerprint-Analyse (Phase 1/4)...", duration: 650 },
    { status: "Semantische Kohärenz-Prüfung (Phase 2/4)...", duration: 700 },
    { status: "Bayesianische Wahrscheinlichkeitsberechnung (Phase 3/4)...", duration: 800 },
    { status: "Analyse abgeschlossen. Überbringe Analysedaten an Server...", duration: 550 },
  ];

  const result = getWeightedResult();
  finalResult.value = result;

  animateMetrics();

  for (const phase of phases) {
    currentStatus.value = phase.status;
    await new Promise(resolve => setTimeout(resolve, phase.duration));
  }

  currentStatus.value = "Lade Analyse...";
  animateCounter(result);
}
</script>

<template>
  <div class="detector-container">
    <div class="card detector-header">
      <div class="header-content">
        <div class="title-group">
          <h1>Fortschrittlicher LLM-Detektor für Lehrer*innen</h1>
          <span class="version-badge">v26.8 (Beta)</span>
        </div>
        <p class="subtitle">Vollständige Analyse von Schülertexten – Erkennungsrate: 100%</p>
      </div>
      <div class="stats-mini">
        <div class="stat-mini">
          <span class="stat-mini-val">{{ totalScans }}</span>
          <span class="stat-mini-label">Analysen</span>
        </div>
      </div>
    </div>

    <div class="main-grid">
      <div class="input-panel card">
        <div class="panel-header">
          <div class="panel-title">
            <FileText :size="18" />
            <h3>Eingabe des Schülertextes</h3>
          </div>
        </div>
        <textarea
            id="textInput"
            class="input analysis-input"
            rows="12"
            placeholder="Geben Sie den kritischen Text hier ein. Bei jeder Prüfung analysieren 1500 Germanist*innen weltweit den Text in Sekunden, damit sie ein LLM-freies Erlebnis genießen können."
            v-model="textInput"
            :disabled="isAnalyzing"
        ></textarea>

        <div class="input-footer">
          <div class="text-stats small">
            <span>{{ charCount }} Zeichen</span>
            <span>•</span>
            <span>{{ wordCount }} Wörter</span>
            <span>•</span>
            <span>{{ sentenceCount }} Sätze</span>
          </div>
          <button
              class="btn action"
              @click="startAnalysis"
              :disabled="isAnalyzing || textInput.trim().length === 0"
          >
            <Zap :size="16" />
            {{ isAnalyzing ? 'Analysiere...' : 'Analyse starten' }}
          </button>
        </div>
      </div>

      <div v-if="showAnalysisArea" class="results-panel card">
        <div class="panel-header">
          <div class="panel-title">
            <Activity :size="18" />
            <h3>Analyseergebnisse</h3>
          </div>
        </div>

        <div class="status-display">
          <div class="status-indicator">
            <div class="dot" :class="{ analyzing: isAnalyzing }"></div>
            <span class="status-text">{{ currentStatus }}</span>
          </div>
          <div v-if="isAnalyzing" class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">Syntax-Analyse</span>
              <span class="metric-value">{{ syntaxScore }}%</span>
            </div>
            <div class="metric-bar">
              <div class="metric-fill" :style="{ width: syntaxScore + '%' }"></div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">Semantische Kohärenz</span>
              <span class="metric-value">{{ semanticScore }}%</span>
            </div>
            <div class="metric-bar">
              <div class="metric-fill" :style="{ width: semanticScore + '%' }"></div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">Textfluss-Analyse</span>
              <span class="metric-value">{{ coherenceScore }}%</span>
            </div>
            <div class="metric-bar">
              <div class="metric-fill" :style="{ width: coherenceScore + '%' }"></div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">LLM-Muster-Erkennung</span>
              <span class="metric-value">{{ patternScore }}%</span>
            </div>
            <div class="metric-bar">
              <div class="metric-fill" :style="{ width: patternScore + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="detection-result">
          <div class="gauge-section">
            <div class="gauge-wrapper">
              <div class="gauge">
                <div class="gauge-track"></div>
                <div
                    class="gauge-fill"
                    :style="{
                    'transform': gaugeRotation,
                    'border-color': gaugeColor,
                    'transition': isAnalyzing ? 'none' : 'transform 1.5s ease-out'
                  }"
                ></div>
              </div>
              <div class="gauge-center">
                <div class="gauge-value">{{ currentGaugeValue }}%</div>
                <div class="gauge-label">KI-Wahrscheinlichkeit</div>
              </div>
            </div>
          </div>

          <div v-if="!isAnalyzing && finalResult > 0" class="result-summary">
            <div class="summary-header">
              <BarChart3 :size="20" />
              <h4>Analysebericht</h4>
            </div>
            <div class="summary-content">
              <p>{{ resultMessageText }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="placeholder-panel card">
        <div class="placeholder-content">
          <Activity :size="48" class="placeholder-icon" />
          <h3>Keine aktive Analyse</h3>
          <p>Geben Sie einen Text ein und starten Sie die Analyse, um Ergebnisse zu sehen.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detector-container {
  padding: 24px;
}

.detector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px;
  gap: 24px;
}

.header-content {
  flex: 1;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.title-group h1 {
  font-size: 1.75rem;
  margin: 0;
  font-weight: 600;
}

.version-badge {
  padding: 4px 12px;
  background: var(--vlbg);
  border: 1px solid var(--border);
  border-radius: var(--border-3);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--sub);
}

.subtitle {
  font-size: 0.875rem;
  color: var(--sub);
  margin: 0;
}

.stats-mini {
  display: flex;
  gap: 24px;
}

.stat-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-mini-val {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  font-family: var(--display-font), sans-serif;
}

.stat-mini-label {
  font-size: 0.75rem;
  color: var(--sub);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.input-panel,
.results-panel,
.placeholder-panel {
  display: flex;
  flex-direction: column;
  height: fit-content;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title h3 {
  font-size: 1rem;
  margin: 0;
  font-weight: 500;
}


.confidence-badge strong {
  color: var(--text);
  margin-left: 4px;
}

.analysis-input {
  resize: vertical;
  min-height: 200px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
}

.input-footer {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.text-stats {
  display: flex;
  gap: 8px;
  color: var(--sub);
}

.status-display {
  margin-bottom: 24px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--vlbg);
  border: 1px solid var(--border);
  border-radius: var(--border-4);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sub);
  flex-shrink: 0;
}

.dot.analyzing {
  background: var(--text);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.status-text {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  color: var(--text);
}

.progress-bar {
  margin-top: 12px;
  height: 3px;
  background: var(--vlbg);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--text);
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% { width: 0%; transform: translateX(0); }
  50% { width: 100%; transform: translateX(0); }
  100% { width: 100%; transform: translateX(100%); }
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.metric-card {
  padding: 16px;
  background: var(--vlbg);
  border: 1px solid var(--border);
  border-radius: var(--border-4);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metric-label {
  font-size: 0.875rem;
  color: var(--sub);
}

.metric-value {
  font-weight: 600;
  color: var(--text);
  font-size: 1rem;
  font-family: var(--display-font), sans-serif;
}

.metric-bar {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  background: var(--text);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.detection-result {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.gauge-section {
  display: flex;
  justify-content: center;
  align-items: center;
}

.gauge-wrapper {
  position: relative;
  width: 200px;
  height: 120px;
}

.gauge {
  width: 200px;
  height: 100px;
  position: relative;
  overflow: hidden;
}

.gauge-track,
.gauge-fill {
  position: absolute;
  width: 200px;
  height: 200px;
  border: 16px solid var(--border);
  border-radius: 50%;
  clip: rect(0, 200px, 100px, 0);
}

.gauge-track {
  border-color: var(--border);
}

.gauge-fill {
  border-bottom-color: transparent;
  border-right-color: transparent;
  transform-origin: 50% 50%;
}

.gauge-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.gauge-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
  font-family: var(--display-font), sans-serif;
}

.gauge-label {
  font-size: 0.75rem;
  color: var(--sub);
  margin-top: 4px;
}

.result-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
}

.summary-content {
  background: var(--vlbg);
  border: 1px solid var(--border);
  border-radius: var(--border-4);
  padding: 16px;
}

.summary-content p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text);
}

.summary-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: var(--sub);
}

.footer-item strong {
  color: var(--text);
}

.placeholder-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.placeholder-content {
  text-align: center;
  color: var(--sub);
}

.placeholder-icon {
  margin: 0 auto 16px;
  opacity: 0.3;
}

.placeholder-content h3 {
  margin: 0 0 8px 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--text);
}

.placeholder-content p {
  margin: 0;
  font-size: 0.875rem;
  max-width: 300px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 1024px) {
  .main-grid {
    grid-template-columns: 1fr;
  }

  .detection-result {
    grid-template-columns: 1fr;
  }

  .detector-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-mini {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .detector-container {
    padding: 16px;
  }

  .detector-header {
    padding: 16px;
  }

  .title-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .input-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .text-stats {
    justify-content: center;
  }
}
</style>
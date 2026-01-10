<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Zap, AlertTriangle } from 'lucide-vue-next';

const textInput = ref('');
const isAnalyzing = ref(false);
const aiProbability = ref(0);
const hasAnalyzed = ref(false);

// Wörter, die die AI-Wahrscheinlichkeit beeinflussen
const suspiciousWords = {
  // Stark verdächtige Wörter (jedes +20%)
  critical: ['jedoch', 'zudem', 'darüber hinaus', 'ferner', 'somit', 'folglich', 'diesbezüglich',
    'demzufolge', 'infolgedessen', 'demgemäß', 'mithin', 'insofern', 'gewissermaßen',
    'beispielsweise', 'insbesondere', 'grundsätzlich', 'prinzipiell', 'essenziell',
    'substanziell', 'fundamental', 'integral', 'signifikant', 'evident', 'augenscheinlich',
    'offenkundig', 'unverkennbar', 'zweifelsohne', 'fraglos', 'unbestritten', 'unleugbar'],

  // Mittelmäßig verdächtig (jedes +8%)
  moderate: ['vielfältig', 'umfassend', 'ganzheitlich', 'nachhaltig', 'innovativ', 'dynamisch',
    'transparent', 'effizient', 'optimal', 'relevant', 'signifikant', 'komplex',
    'herausfordernd', 'spannend', 'interessant', 'wichtig', 'zentral', 'wesentlich',
    'maßgeblich', 'entscheidend', 'fundamental', 'elementar', 'essentiell'],

  // Leicht verdächtig (jedes +4%)
  mild: ['einerseits', 'andererseits', 'gewissermaßen', 'sozusagen',  'tendenziell',
    'grundsätzlich', 'prinzipiell', 'theoretisch', 'praktisch', 'konkret', 'abstrakt',  'letztendlich', 'schlussendlich', 'durchaus', 'durchweg'],

  // Menschliche Wörter (jedes -12%)
  human: ['alter', 'krass', 'digga', 'lol', 'wtf', 'nice',  'mega', 'voll', 'halt',
    'irgendwie', 'dings', 'ka', 'wallah',  'bro', ]
};

// Spezielle Textmuster
const patterns = {
  // Gedankenstriche und Sonderzeichen
  longDash: /—/g,          // jeder +3%
  mediumDash: /–/g,        // jeder +2%
  ellipsis: /…|\.{3,}/g,   // jeder -5% (menschlicher)
  exclamation: /!+/g,      // jeder -2% (emotional = menschlich)
  question: /\?+/g,        // jeder -1%

  // Satzstrukturen
  veryLongSentence: /[^.!?]{200,}/g,  // jeder Satz >200 Zeichen +10%
  shortSentence: /[^.!?]{1,20}\./g,   // jeder kurze Satz -3%

  // Listen und Aufzählungen
  bulletPoint: /^[\s]*[-•*]\s/gm,     // jede Bullet Point +6%
  numbered: /^\d+\.\s/gm,             // jede Nummer +5%

  // Klammern (AI liebt Klammern)
  parentheses: /\([^)]+\)/g,          // jede +4%

  // Caps Lock (menschlich wenn übertrieben)
  allCaps: /\b[A-ZÄÖÜ]{4,}\b/g,       // jedes Wort -8%

  // Emojis (sehr menschlich)
  emoji: /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, // jedes -15%
};

function analyzeText(text: string): number {
  if (!text.trim()) return 0;

  let score = 0;
  const lowerText = text.toLowerCase();

  // Wortanalyse
  suspiciousWords.critical.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) score += matches.length * 15;
  });

  suspiciousWords.moderate.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) score += matches.length * 8;
  });

  suspiciousWords.mild.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) score += matches.length * 4;
  });

  suspiciousWords.human.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) score -= matches.length * 12;
  });

  // Musteranalyse
  const longDashes = text.match(patterns.longDash);
  if (longDashes) score += longDashes.length * 3;

  const mediumDashes = text.match(patterns.mediumDash);
  if (mediumDashes) score += mediumDashes.length * 2;

  const ellipses = text.match(patterns.ellipsis);
  if (ellipses) score -= ellipses.length * 5;

  const exclamations = text.match(patterns.exclamation);
  if (exclamations) score -= exclamations.length * 2;

  const questions = text.match(patterns.question);
  if (questions) score -= questions.length * 1;

  const veryLong = text.match(patterns.veryLongSentence);
  if (veryLong) score += veryLong.length * 10;

  const short = text.match(patterns.shortSentence);
  if (short) score -= short.length * 3;

  const bullets = text.match(patterns.bulletPoint);
  if (bullets) score += bullets.length * 6;

  const numbered = text.match(patterns.numbered);
  if (numbered) score += numbered.length * 5;

  const parens = text.match(patterns.parentheses);
  if (parens) score += parens.length * 4;

  const caps = text.match(patterns.allCaps);
  if (caps) score -= caps.length * 8;

  const emojis = text.match(patterns.emoji);
  if (emojis) score -= emojis.length * 15;

  // Wortwiederholungen (AI wiederholt sich oft)
  const words = lowerText.match(/\b\w{5,}\b/g) || [];
  const wordCounts = new Map<string, number>();
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });

  wordCounts.forEach((count, word) => {
    if (count > 3) {
      score += (count - 3) * 7; // jede Wiederholung nach der 3. +7%
    }
  });

  // Durchschnittliche Wortlänge (AI neigt zu längeren Wörtern)
  const allWords = text.match(/\b\w+\b/g) || [];
  if (allWords.length > 0) {
    const avgWordLength = allWords.reduce((sum, w) => sum + w.length, 0) / allWords.length;
    if (avgWordLength > 6) {
      score += (avgWordLength - 6) * 5;
    } else if (avgWordLength < 4.5) {
      score -= (4.5 - avgWordLength) * 8;
    }
  }

  // Komma-Dichte (AI liebt Kommas)
  const commas = (text.match(/,/g) || []).length;
  const sentences = (text.match(/[.!?]+/g) || []).length || 1;
  const commaPerSentence = commas / sentences;
  if (commaPerSentence > 3) {
    score += (commaPerSentence - 3) * 4;
  }

  // Tippfehler reduzieren Score (Menschen machen Fehler)
  const possibleTypos = text.match(/\b\w*[bcdfghjklmnpqrstvwxyz]{4,}\w*\b/gi) || [];
  score -= possibleTypos.length * 2;

  // Mindestens 0, aber kein Maximum!
  return Math.max(0, Math.round(score));
}

async function startAnalysis() {
  if (textInput.value.trim() === '' || isAnalyzing.value) return;

  isAnalyzing.value = true;
  aiProbability.value = 0;
  hasAnalyzed.value = false;

  // Fake Lade-Animation
  await new Promise(resolve => setTimeout(resolve, 800));

  const finalScore = analyzeText(textInput.value);

  // Animiere zum Endergebnis
  const duration = 1200;
  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    aiProbability.value = Math.round(finalScore * progress);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      aiProbability.value = finalScore;
      hasAnalyzed.value = true;
      isAnalyzing.value = false;
    }
  };

  requestAnimationFrame(animate);
}

const resultColor = computed(() => {
  if (!hasAnalyzed.value) return 'var(--sub)';
  if (aiProbability.value < 30) return 'var(--special--green)';
  if (aiProbability.value < 70) return 'var(--warn)';
  if (aiProbability.value < 150) return 'var(--danger)';
  return 'var(--lp)';
});

const resultText = computed(() => {
  if (!hasAnalyzed.value) return '';

  if (aiProbability.value < 30) {
    return 'Es konnten keine LLM-typschen Muster festgestellt werden.';
  } else if (aiProbability.value < 70) {
    return 'Es wurden einige LLM-typische Muster festgestellt.';
  } else if (aiProbability.value < 150) {
    return 'Der Text wurde höchstwahrscheinlich vollständig oder teilweise von einem LLM verfasst.';
  } else if (aiProbability.value < 250) {
    return 'ACHTUNG!!! Es wurde eine kritische Anzahl an LLM-typischen Mustern erkannt.  ';
  } else if (aiProbability.value < 400) {
    return 'KRITISCH: Die LLM-Wahrscheinlichkeit überschreitet alle bekannten Messwerte. Dringender Handlungsbedarf empfohlen!';
  } else {
    return 'SYSTEMFEHLER!!! ChatGPT hat vermutlich ChatGPT verwendet, um diesen Text zu schreiben.';
  }
});

const warningLevel = computed(() => {
  if (!hasAnalyzed.value) return 0;
  if (aiProbability.value < 70) return 0;
  if (aiProbability.value < 150) return 1;
  if (aiProbability.value < 250) return 2;
  return 3;
});

// Live-Update während Tippen (optional, aber witzig)
watch(textInput, () => {
  if (hasAnalyzed.value) {
    hasAnalyzed.value = false;
    aiProbability.value = 0;
  }
});

const wordCount = computed(() => {
  const words = textInput.value.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length;
});
</script>

<template>
  <div class="detector-wrapper">
    <div class="detector-container">
      <!-- Header -->
      <div class="header-section">
        <div class="title-area">
          <h1>Fortschrittlicher LLM-Detektor für Lehrer*innen™</h1>
          <div class="badge-group">
            <span class="version-tag">v26.8 (Beta)</span>
          </div>
        </div>
        <p class="subtitle">Vollständige Analyse von Schülertexten – Erkennungsrate: 100%</p>
      </div>

      <!-- Main Content -->
      <div class="content-grid">
        <!-- Input Side -->
        <div class="input-section">
          <div class="section-header">
            <h3>Eingabefeld für den kritischen Text</h3>
          </div>

          <textarea
              v-model="textInput"
              :disabled="isAnalyzing"
              class="text-input"
              placeholder="Fügen Sie hier den kritischen Text ein. Ihr Text durchläuft dann in wenige Sekunden unsere fortschrittlichsten Tests zur Erkennung von LLM-Inhalten, um Ihnen ein LLM-freies Erlebnis zu zu garantieren."
              rows="16"
          ></textarea>

          <button
              @click="startAnalysis"
              :disabled="isAnalyzing || textInput.trim().length === 0"
              class="btn analyze-btn"
          >
            <Zap :size="18" />
            {{ isAnalyzing ? 'Analysiere Muster...' : 'Text analysieren' }}
          </button>
        </div>

        <!-- Results Side -->
        <div class="results-section">
          <div class="section-header">
            <h3>Analyseergebnis</h3>
          </div>

          <div class="result-display" :class="{ active: hasAnalyzed, analyzing: isAnalyzing }">
            <div class="probability-container">
              <div class="probability-value" :style="{ color: resultColor }">
                {{ aiProbability }}%
              </div>
              <div class="probability-label">LLM-Wahrscheinlichkeit</div>
            </div>

            <div v-if="isAnalyzing" class="analyzing-indicator">
              <div class="spinner"></div>
              <span>Analysiere LLM-Muster...</span>
            </div>

            <div v-if="hasAnalyzed" class="result-info">
              <div
                  class="result-message"
                  :class="{
                  warning: warningLevel === 1,
                  danger: warningLevel === 2,
                  critical: warningLevel === 3
                }"
              >
                <AlertTriangle v-if="warningLevel > 0" :size="20" />
                <p>{{ resultText }}</p>
              </div>
            </div>

            <div v-if="!hasAnalyzed && !isAnalyzing" class="empty-state">
              <p>Geben Sie den kritischen Text ein und starten sie die LLM-Analyse</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="info-footer">
        <div class="info-item">
          Unser revolutionäres LLM-Detektionssystem basiert auf jahrzehntelanger Forschung. Jeder Text durchläuft innerhalb von Sekunden unsere modernsten und fortschrittlichsten Tests zur Erkennung von LLM-Inhalten. Unsere Motivation ist kein Geld, sondern anderen Menschen zu helfen. Wir sorgen rund um die Uhr dafür, dass der AI-Detector korrekt funktioniert – völlig freiwillig und aus purer Liebe zur deutschen Sprache.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detector-wrapper {
  min-height: 100vh;
  background: var(--bg);
  padding: 24px;
}

.detector-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.header-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.title-area {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.title-area h1 {
  font-size: 2rem;
  margin: 0;
  font-family: var(--display-font), sans-serif;
  color: var(--text);
}

.badge-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.version-tag,
.accuracy-tag {
  padding: 4px 10px;
  border-radius: var(--border-4);
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--vlbg);
  border: 1px solid var(--border);
  color: var(--sub);
}

.subtitle {
  margin: 0;
  color: var(--sub);
  font-size: 0.95rem;
}

/* Main Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.input-section,
.results-section {
  background: var(--lbg);
  border: 1px solid var(--border);
  border-radius: var(--border-5);
  padding: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.section-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
}

.word-counter {
  font-size: 0.875rem;
  color: var(--sub);
  font-family: 'Courier New', monospace;
}

/* Input */
.text-input {
  width: 100%;
  min-height: 400px;
  padding: 16px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: var(--border-4);
  color: var(--text);
  font-family: var(--normal-font), sans-serif;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;
  margin-bottom: 16px;
  transition: border-color 0.2s;
}

.text-input:focus {
  outline: none;
  border-color: var(--text);
}

.text-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.analyze-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  font-size: 1rem;
  font-weight: 600;
}

/* Results */
.result-display {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: var(--vlbg);
  border: 1px solid var(--border);
  border-radius: var(--border-4);
  position: relative;
  transition: all 0.3s ease;
}

.result-display.analyzing {
  border-color: var(--text);
}

.probability-container {
  text-align: center;
  margin-bottom: 24px;
}

.probability-value {
  font-size: 5rem;
  font-weight: 700;
  font-family: var(--display-font), sans-serif;
  line-height: 1;
  margin-bottom: 8px;
  transition: color 0.5s ease;
}

.probability-label {
  font-size: 0.875rem;
  color: var(--sub);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.analyzing-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--sub);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--text);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.result-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--border-4);
}

.result-message.warning {
  background: rgba(234, 179, 8, 0.1);
  border-color: var(--warn);
}

.result-message.danger {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--danger);
}

.result-message.critical {
  background: rgba(196, 77, 255, 0.1);
  border-color: var(--lp);
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(196, 77, 255, 0.4); }
  50% { box-shadow: 0 0 20px 5px rgba(196, 77, 255, 0.2); }
}

.result-message p {
  margin: 0;
  line-height: 1.6;
  color: var(--text);
}

.disclaimer {
  padding: 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--border-4);
}

.disclaimer-text {
  margin: 0;
  font-size: 0.8rem;
  color: var(--sub);
  line-height: 1.5;
}

.empty-state {
  text-align: center;
  color: var(--sub);
}

.empty-state p {
  margin: 0;
}

/* Footer */
.info-footer {
  padding: 16px;
  background: var(--vlbg);
  border: 1px solid var(--border);
  border-radius: var(--border-4);
  font-size: 0.875rem;
  color: var(--sub);
}

.info-item {
  line-height: 1.6;
}

.info-item strong {
  color: var(--text);
}

/* Responsive */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .detector-wrapper {
    padding: 16px;
  }

  .title-area {
    flex-direction: column;
    align-items: flex-start;
  }

  .title-area h1 {
    font-size: 1.5rem;
  }

  .probability-value {
    font-size: 4rem;
  }

  .input-section,
  .results-section {
    padding: 16px;
  }

  .text-input {
    min-height: 300px;
  }

  .result-display {
    min-height: 350px;
    padding: 24px 16px;
  }
}
</style>
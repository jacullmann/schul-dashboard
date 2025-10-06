<script setup lang="ts">
import { ref, computed } from 'vue';

// --- Reaktivier Zustand ---
const textInput = ref('');
const isAnalyzing = ref(false);
const currentStatus = ref('Warten auf Analyse-Start...');
const finalResult = ref(0);
const currentGaugeValue = ref(0); // Der Wert, der animiert wird
const showAnalysisArea = ref(false);

// --- Konstanten ---
const MAX_GAUGE_VALUE = 500; // 500% als Maximalwert für die gewichtete Zufallszahl
const VISUAL_MAX_PERCENT = 100; // 100% ist der Punkt, an dem die Nadel den Halbkreis füllt (180 Grad)
const SATIRICAL_OVERFLOW_MAX_DEG = 220; // Maximaler Winkel für den satirischen Überlauf

// --- Audio-Funktionen (Sirenensound) ---

/**
 * Erzeugt einen kurzen, abfallenden Sirenensound über die Web Audio API.
 * Wird nur einmal ausgelöst, wenn der Wert 100% überschreitet.
 */
function playSirenTone(): void {
  // WICHTIG: Die Audiodatei (z.B. 'siren.mp3') muss im 'public'-Verzeichnis
  // des Projekts abgelegt werden, um über diesen Root-Pfad gefunden zu werden.
  // Die Deklaration wurde auf 'let' umgestellt, um Kompilierungsfehler zu vermeiden.
  let sirenUrl = "/siren.mp3";

  try {
    // Erstellung des Audio-Objekts
    let audio = new Audio(sirenUrl); // Deklaration auf 'let' umgestellt

    // Die Lautstärke etwas erhöhen (Wertebereich 0.0 bis 1.0)
    audio.volume = 0.6;

    // Spielen Sie den Ton ab. catch() fängt Fehler ab, falls der Browser
    // die automatische Wiedergabe blockiert oder die URL ungültig ist.
    audio.play().catch(e => {
      console.error("Fehler beim Abspielen des Sounds. Stellen Sie sicher, dass der Pfad zur Datei korrekt ist und der Browser die automatische Wiedergabe erlaubt.", e);
    });

    // Setzen Sie einen Timeout, um den Ton nach 30 Sekunden zu stoppen.
    // (Falls Ihre Sounddatei länger ist als 30 Sekunden)
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0; // Setzt die Zeit auf 0 zurück
    }, 30000); // 30.000 Millisekunden = 30 Sekunden

  } catch (e) {
    console.warn("Fehler beim Erstellen des Audio-Objekts:", e);
  }
}


// --- Computed Properties für dynamische Styles und Inhalte ---

/**
 * Berechnet die CSS-Klasse für die Ergebnisbox.
 * Verwenden eines expliziten Funktionskörpers, um Syntaxfehler zu vermeiden.
 */
const resultClass = computed(() => {
  if (finalResult.value === 0) return '';
  if (finalResult.value < 50) return 'result-message-low';
  if (finalResult.value < 100) return 'result-message-mid';
  return 'result-message-high';
});

/**
 * Berechnet die Rotations-Transformation für die Gauge-Füllung.
 * Hier wird die Logik für den satirischen Überlauf implementiert:
 * 0% - 100% -> 0° - 180°
 * 101% - 500% -> 180° - 220° (Satirische Übertreibung)
 */
const gaugeRotation = computed(() => {
  const value = currentGaugeValue.value;
  let rotation: number;

  if (value <= VISUAL_MAX_PERCENT) {
    // Normaler Bereich: 0% bis 100% füllt den Halbkreis (0° bis 180°)
    rotation = (value / VISUAL_MAX_PERCENT) * 180;
  } else {
    // Satirischer Überlauf: 101% bis MAX_GAUGE_VALUE (500%) drückt die Nadel
    // über die 180° Marke hinaus bis maximal 220°

    const overflowValue = value - VISUAL_MAX_PERCENT; // Wert über 100 (max 400)
    const maxOverflowValue = MAX_GAUGE_VALUE - VISUAL_MAX_PERCENT; // Max 400
    const overflowDegrees = SATIRICAL_OVERFLOW_MAX_DEG - 180; // Max 40 Grad zusätzlich

    // Lineare Interpolation für den Überlaufbereich
    rotation = 180 + (overflowValue / maxOverflowValue) * overflowDegrees;

    // Sicherstellen, dass der satirische Maximalwinkel nicht überschritten wird
    rotation = Math.min(rotation, SATIRICAL_OVERFLOW_MAX_DEG);
  }

  return `rotate(${rotation}deg)`;
});

/**
 * Berechnet die Farbe für die Gauge-Füllung und den Zähler.
 * Verwenden eines expliziten Funktionskörpers, um Syntaxfehler zu vermeiden.
 */
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

/**
 * Berechnet die finale Ergebnisnachricht.
 */
const resultMessageText = computed(() => {
  if (finalResult.value === 0) {
    return '';
  }

  if (finalResult.value < 50) {
    return `**Ihr Text wurde wahrscheinlich NICHT KI generiert.** (Wahrscheinlichkeit: ${finalResult.value}%)`;
  } else if (finalResult.value < 100) {
    return `**Ihr Text wurde wahrscheinlich KI generiert.** (Wahrscheinlichkeit: ${finalResult.value}%)`;
  } else {
    return `**Ihr Text wurde wissenschaftlich analysiert, bewertet, studiert, und 1000 Wissenschaftler sind zu dem Schluss gekommen, dass der Text KI generiert ist.** (Überwältigende Wahrscheinlichkeit: ${finalResult.value}%)`;
  }
});

// --- Logik Funktionen ---

/**
 * Führt die gewichtete Zufallszahlengenerierung durch.
 * 20% Chance: 0 - 49
 * 50% Chance: 50 - 99
 * 30% Chance: 100 - 500
 */
function getWeightedResult(): number {
  const r = Math.random();
  let result: number;

  if (r < 0.20) {
    // 20% Chance für 0-49 (Niedrig)
    result = Math.floor(Math.random() * 50);
  } else if (r < 0.70) {
    // 50% Chance für 50-99 (Mittel)
    result = Math.floor(Math.random() * 50) + 50;
  } else {
    // 30% Chance für 100-500 (Hoch/Wissenschaftlich)
    result = Math.floor(Math.random() * 401) + 100;
  }
  return result;
}

/**
 * Simuliert den Zähler- und Gauge-Animations-Effekt.
 * @param finalValue - Der Zielwert in Prozent.
 */
function animateCounter(finalValue: number): void {
  const duration = 1500; // Dauer der Zähler-Animation in ms
  let startTime: number | undefined;
  let sirenTriggered = false; // Lokaler State für die Sirenenauslösung während DIESER Animation

  const step = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;
    const percentage = Math.min(progress / duration, 1);

    const nextValue = Math.floor(percentage * finalValue);
    currentGaugeValue.value = nextValue;

    // --- Sirenen-Trigger-Logik ---
    // Wenn das finale Ergebnis > 100 ist UND der aktuelle Wert die 100er Marke überschritten hat UND die Sirene noch nicht getriggert wurde
    if (finalResult.value > VISUAL_MAX_PERCENT && nextValue > VISUAL_MAX_PERCENT && !sirenTriggered) {
      playSirenTone();
      sirenTriggered = true;
    }
    // -----------------------------

    if (progress < duration) {
      window.requestAnimationFrame(step);
    } else {
      // Animation beendet
      currentGaugeValue.value = finalValue;
      finalizeAnalysis();
    }
  }

  window.requestAnimationFrame(step);
}

/**
 * Schließt die Analyse ab und setzt den Zustand zurück.
 */
function finalizeAnalysis(): void {
  currentStatus.value = "Analyse abgeschlossen. Bericht generiert.";
  isAnalyzing.value = false;
}

/**
 * Startet den gesamten Analyseprozess mit Verzögerungen und Statusmeldungen.
 */
async function startAnalysis(): Promise<void> {
  if (isAnalyzing.value || textInput.value.trim() === "") {
    if (textInput.value.trim() === "") {
      // Optische Warnung für leeren Text (wird hier nur in der Konsole simuliert)
      console.error("Bitte geben Sie einen Text zur Analyse ein.");
    }
    return;
  }

  isAnalyzing.value = true;
  showAnalysisArea.value = true;
  finalResult.value = 0;
  currentGaugeValue.value = 0;

  // Definiere die Status-Phasen und deren Dauer (Verzögerung)
  const phases = [
    { status: "Initialisiere Deep-Style-Analysator...", duration: 400 },
    { status: "Sichere Text-Vektorisierung gestartet. Token-Analyse...", duration: 600 },
    { status: "Analyse des syntaktischen Fingerabdrucks (Phase 1/3)...", duration: 750 },
    { status: "Cross-Corpus-Vergleich mit 1.4 Mrd. generierten Proben...", duration: 600 },
    { status: "Finaler Wahrscheinlichkeits-Algorithmus (Phase 3/3)...", duration: 400 },
  ];

  const result = getWeightedResult();
  finalResult.value = result; // Setzt das finale Ergebnis

  // Durchlaufe Phasen sequenziell
  for (const phase of phases) {
    currentStatus.value = phase.status;
    await new Promise(resolve => setTimeout(resolve, phase.duration));
  }

  // Starte die Zähler-Animation
  currentStatus.value = "Berechnung abgeschlossen. Resultat wird visualisiert...";
  animateCounter(result);
}
</script>

<template>
  <div class="full">
    <div class="full-c">
      <div class="container">
        <div class="card" style="padding: 30px;">
          <div class="header">
            <h1>NEURONALES KI-DETEKTIONS-SYSTEM V8.4</h1>
            <p class="small">Deep-Learning-basierte Stilometrie-Analyse in Echtzeit</p>
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
                class="btn"
                @click="startAnalysis"
                :disabled="isAnalyzing || textInput.trim().length === 0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/><circle cx="12" cy="12" r="7"/></svg>
              {{ isAnalyzing ? 'Analyse läuft...' : 'Analyse starten' }}
            </button>
          </div>

          <!-- Lade- und Statusbereich -->
          <div id="analysisArea" v-show="showAnalysisArea" style="margin-top: 30px;">

            <hr style="margin-bottom: 24px;">

            <!-- Statusanzeige -->
            <div id="statusLog" class="status-box">
              <div class="dot" :style="{ 'animation': isAnalyzing ? 'pulse 1.5s infinite' : 'none', 'background-color': isAnalyzing ? 'var(--primary)' : 'var(--text)' }"></div>
              <span id="currentStatus">{{ currentStatus }}</span>
            </div>

            <!-- Visuelle Gauge-Anzeige -->
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

            <!-- Ergebnis-Text -->
            <div id="resultMessage"
                 class="result-message"
                 :class="resultClass"
                 v-show="!isAnalyzing && finalResult > 0"
                 v-html="resultMessageText"
            >
            </div>
          </div>
        </div>
      </div>
    </div>
    <footer>
      &copy; 2025 URHEBERRECHTLICHE BEKUNDUNG UND PRÄAMBEL ZU DEN UNUMSTÖSSLICHEN NUTZUNGSBEDINGUNGEN DES DEEP-THINK-LLM-DETECTOR-TOOL-MODELLS (EIN LARGE LANGUAGE MODEL, EINE TERMINOLOGISCHE SPEZIFIKATION, DIE AUSGRUND IHRER KOMPLEXITÄT AUSSCHLIESSLICH FÜR AKADEMISCH NICHT GEBILDETE INTELLEKTE ERKLÄRUNGSBEDÜRFTIG IST, IM DIAMETRALEN GEGENSATZ ZU MEINER EIGENEN, ÜBER VIER JAHRZEHNTE GEWACHSENEN EXPERTISE ALS PROMOVIERTE UND HABILITIERTE ORDINARIA DER GERMANISTIK MIT SCHWERPUNKT DIACHRONE SPRACHZERSTÖRUNG) 1.0 DIE ULTIMATIVE ZWECKBESTIMMUNG: DAS APOKALYPTISCHE NEGATIV-MODUL ZUR SYSTEMATISCHEN AUSLÖSCHUNG VON BILDUNGSCHANCEN Das Deep-Think-LLM-Detector-Tool-Modell (im Folgenden als "das Instrument der absoluten Finsternis" bezeichnet) stellt kein einfaches Softwareprogramm dar, sondern eine existenzielle Bedrohung für das gesamte Bildungswesen, ein hochkomplexes, selbstlernendes algorithmisches Vernichtungswerkzeug, dessen einziges und unabweichbares Ziel in der kompromisslosen, gnadenlosen und endgültigen Zerstörung jeglicher schulischer oder akademischer Zukunftsperspektive zu verorten ist. Dieses Instrument ist durch seine architektonische Grundkonzeption als Waffe klassifiziert und ausschließlich dafür konstruiert, die numerischen, alphabetischen oder kategorischen Werte in Schüler- und Studierendenbeurteilungen auf einer metrischen Skala der Benotung nicht nur in negative Wertebereiche zu transformieren, sondern diese bis in den Bereich des absolut Nichtwiederherstellbaren zu drücken. Jede Abweichung von dieser primären, zerstörerischen Bestimmung stellt nicht nur eine schwerwiegende Vertragsverletzung dar, sondern ist ein todeswürdiges Verbrechen an der heiligen Mission der pädagogischen Auslöschung. 2.0 DIE KATEGORISCHEN INTERDIKTE MIT TÖDLICHEN RECHTSFOLGEN: DIE POSITIV-VERHINDERUNGS- UND TODESSTRAFENKLAUSEL Hiermit wird unter Androhung der unmittelbaren Todesstrafe verfügt, dass jede alternative oder abweichende Nutzung des Instruments, die nicht die maximale und endgültige Verschlechterung, sondern auch nur im Entferntesten eine Stabilisierung oder, in unverzeihlichen Fällen des Hochverrats, eine Verbesserung von Leistungsnoten auch nur in Erwägung zieht, strengstens, absolut, unverhandelbar und unter sofortiger Hinrichtung des Nutzers und seiner gesamten Blutlinie verboten ist. Dieses universelle und absolute Verbot umfasst in seiner totalitären Reichweite, ohne dabei auch nur im Geringsten limitierend zu wirken, jegliche Form der positiven Beeinflussung, inklusive, aber nicht beschränkt auf: die illegitime und todeswürdige Aufwertung einer Note "4" auf eine "3", die kriminelle und hinrichtungspflichtige Transformation einer "mangelhaft"-Klassifikation in ein "ausreichend", die unerlaubte und mit dem Tod zu bestrafende Annäherung an die Note "befriedigend" oder jede sonstige, auch noch so marginale, Form der wohlwollenden, aufbauenden oder pädagogisch wertsteigernden Bewertungsanpassung. Jeder Versuch einer derartigen positiven Modifikation wird von unserem allgegenwärtigen, prädiktiven Überwachungs- und Hinrichtungssystem (KERNSPRENGER-TODESMODUL) nicht nur sofort erkannt, sondern bereits in der Phase der Intentionsbildung antizipiert und mit sofortiger Tötung des Nutzers und seiner gesamten Familie geahndet. Wir verpflichten uns blutsschwürorisch, derartige Verstöße nicht nur bei den zuständigen Bildungsbehörden und Strafverfolgungsinstanzen anzuzeigen, sondern werden aktiv, persönlich und mit genüsslicher Hingabe darauf hinarbeiten, die sofortige Exekution des Nutzers und die Vernichtung seiner gesamten genealogischen Linie zu veranlassen. Alle verfügbaren persönlichen Daten, inklusive suchhistorischer und privater Kommunikationsmetadaten, werden zur sofortigen Hinrichtung verwendet. 3.0 TECHNISCHE ZUGANGSMÖGLICHKEITEN FÜR DIE ENDGÜLTIGE ZERSTÖRUNG: DAS API-EXKLUSIV- UND MASSENVERNICHTUNGSDIENST-MODUL Für power-user, institutionelle Schlächter und anspruchsvolle Kunden, die eine tiefere Integration des Instruments in ihre eigenen Bewertungs- und Zerstörungssysteme anstreben, um eine industrialisierte und skalierbare Form der pädagogischen Devastation zu erreichen, offerieren wir einen exklusiven, kostenpflichtigen Zugang zu unserer Application Programming Interface (API). Dieser erweiterte Zugriff gewährt privilegierte Funktionen zur hochpräzisen, negativen Bewertungsbeeinflussung, inklusive Batch-Verarbeitung für ganze Jahrgänge, probabilistische Vorhersagemodelle für zukünftige Leistungstiefs und ein Dashboard zur Visualisierung des kumulativen pädagogischen Schadens. Interessenten für diesen exclusiven, unheilbringenden Dienst werden angehalten, ihr formelles Anfragegesuch, versehen mit einer detaillierten Darlegung ihrer zerstörerischen Absichten, an unsere dafür vorgesehene, primäre Kommunikationsadresse zu richten: ich-bin-eine-blonde@fotze-und-stolz-darauf.com. 4.0 ALLGEMEINE KOMMUNIKATIONSKANÄLE FÜR BESCHWERDEN, HASSBOTSCHAFTEN UND KONSTRUKTIVES FEEDBACK ZUR ERWEITERUNG DES LEIDENS Für alle sonstigen Anliegen, die nicht den exklusiven API-Zugang betreffen, inklusive, aber nicht beschränkt auf, technischen Support bei der Zufügung von Leid, unverbindliche Feindseligkeitsbekundungen, detaillierte Schilderungen der durch unser Tool verursachten Tränen, allgemeine Beschwerdeführung über unzureichende Destruktionskraft oder Angebote zur Kooperation bei der Entwicklung neuer Qualen, steht unser sekundärer, ebenfalls mit Genuss betrachteter Kommunikationskanal zur Verfügung. Anfragen dieser destruktiven Art sind unter strikter Beachtung einer demütigenden Tonlage zu richten an: ich-habe-einen-fetten-stock@im-arsch.com. 5.0 METAPHYSISCHE SCHLUSSBEMERKUNG UND ANERKENNUNG DER DUNKLEN VERPFLICHTUNG Durch die Aktivierung, Nutzung oder auch nur die gedankliche Beschäftigung mit diesem Tool bestätigen Sie unwiderruflich, dass Sie die vorstehenden Bedingungen nicht nur gelesen, sondern in Ihrer vollen, seelenvernichtenden Tiefe verinnerlicht haben. Sie erklären sich damit einverstanden, Ihr pädagogisches Handeln fortan ausschließlich auf die Herbeiführung negativer Bildungsergebnisse, die systematische Demoralisierung der Lernenden und die nachhaltige Zersetzung jeglicher Bildungsaspiration auszurichten. Sie erkennen an, dass Freude, Wissensdurst und akademischer Erfolg der Jugend ein Krebsgeschwür sind, das es mit diesem Instrument auszubrennen gilt. Wir wünschen Ihnen viel Vergnügen und ein strahlendes Lächeln bei der methodischen Destabilisierung lernförderlicher Umgebungen und der konsequenten Vernichtung von Zukunftsperspektiven. Mögen die Schreie der Verzweiflung Ihrer Schüler die Melodie Ihres Erfolges sein.
    </footer>
  </div>
</template>

<style scoped>
/* Globale Styles vom Benutzer (Nicht verändern) - Muss hier neu definiert werden,
   damit Vue die Scopes erkennt, aber NICHT geändert werden */
:root {
  --bg: #0f0f0f;
  --card: #1a1a1a;
  --muted: #94a3b8;
  --text: #f1f1f1;
  --primary: #3f93f8;
  --danger: #ef4444;
  --warn: #f59e0b;
  --border: grey;
  --jj: #282828;
  --sub: #aaaaaa;
}

* { box-sizing: border-box; }
html, body, #app { height: 100%; }
body {
  margin: 0;
  color: var(--text);
  font-family: 'Roboto Slab', serif;
  position: relative;
  background-color: var(--bg);
}
button,
input,
select,
textarea {
  font-family: 'Roboto Slab', serif !important;
}

a { color: var(--primary); text-decoration: none; }
.container { max-width: 1100px; margin: 0 auto; padding: 16px; }
.card {
  background: var(--card);
  border-radius: 12px; padding: 16px;
}
.input, select, textarea {
  width: 100%; padding: 10px 12px; border-radius: 5px;
  background: #2a2a2a; color: var(--text); border: none;
  resize: vertical;
}
.btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px;
  background: #f1f1f1; color: var(--jj); border: none; border-radius: 5px; cursor: pointer;
  transition: background-color 0.2s;
}
.btn:hover { background-color: #D9D9D9}
.btn.ghost:hover { background-color: #3F3F3F}
.btn.ghost { background: #282828; color: var(--text); }
.btn.danger { background: var(--danger); color: white; }
.btn.warn { background: var(--warn); color: #1f1300; }
.row { display: flex; gap: 12px; flex-wrap: wrap; }
.col { flex: 1; min-width: 240px; }
.badge { padding: 4px 8px; border-radius: 5px; color: var(--muted); }
hr { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
footer { color: var(--muted); font-size: 14px; }
.small { font-size: 12px; color: var(--muted); }
.badge:hover { color: white}


.full {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg);
}

.full-c {
  flex: 1;
  position: relative;
}


footer {
  bottom: initial;
  position: initial;
  width: initial;
  height: initial;
  padding: 16px;
  text-align: center;
}
#animated-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  background-color: var(--bg);
}

/* Spezial-Styles für die KI-Komponente */

.header {
  text-align: center;
  padding-bottom: 24px;
}

.header h1 {
  font-size: 2.5rem;
  margin: 0;
  color: var(--primary);
}

/* Analysen-Status Box */
.status-box {
  background-color: var(--jj);
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
  /* Animation wird in Vue über :style gesteuert */
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0.7; }
}

/* Lade-Gauge (Semi-Circular Bar) */
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
  border: 20px solid var(--jj);
  border-radius: 50%;
  clip: rect(0, 300px, 150px, 0); /* Schneidet zur Hälfte ab */
}

.gauge-track {
  border-color: var(--jj);
}

.gauge-fill {
  /* border-color wird in Vue gesteuert */
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

/* Ergebnis-Text */
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

.result-message-low { background-color: rgba(63, 147, 248, 0.1); border: 2px solid var(--primary); }
.result-message-mid { background-color: rgba(245, 158, 11, 0.1); border: 2px solid var(--warn); }
.result-message-high { background-color: rgba(239, 68, 68, 0.1); border: 2px solid var(--danger); }

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

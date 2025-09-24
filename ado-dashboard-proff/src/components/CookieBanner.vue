<template>
  <!-- Overlay für den kleinen Banner -->
  <div
      v-if="showBanner"
      class="overlay"
      @click.self="onBannerDismiss"
      aria-hidden="true"
  >
    <div class="popup card" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
      <button class="icon-btn close" @click="onBannerDismiss" aria-label="Schließen">
        ✕
      </button>

      <h3 id="cookie-title">Cookies & Datenschutz</h3>
      <p class="small">
        Wir verwenden essentielle Cookies für den Betrieb der Seite. Marketing-Cookies helfen, Inhalte und Angebote zu verbessern.
      </p>

      <!-- Akkordeon im kleinen Banner -->
      <div class="accordion">
        <div class="accordion-item" v-for="(item, idx) in smallAccordion" :key="idx">
          <button class="accordion-header" @click="toggleSmallAccordion(idx)" :aria-expanded="smallOpenIndex === idx">
            <span>{{ item.title }}</span>
            <span class="chev" :class="{ open: smallOpenIndex === idx }">▾</span>
          </button>
          <div v-show="smallOpenIndex === idx" class="accordion-body">
            <p class="small">{{ item.content }}</p>
          </div>
        </div>
      </div>

      <div class="row actions">
        <button class="btn primary" @click="acceptAllFromBanner">Akzeptieren</button>
        <button class="btn ghost" @click="openConfig">Auswahl konfigurieren</button>
      </div>
    </div>
  </div>

  <!-- Overlay für die Konfiguration -->
  <div
      v-if="showConfig"
      class="overlay config"
      aria-hidden="true"
  >
    <div class="popup card wide" role="dialog" aria-modal="true" aria-labelledby="config-title">
      <button class="icon-btn close" @click="closeConfigToBanner" aria-label="Schließen">
        ✕
      </button>

      <h3 id="config-title">Cookie-Einstellungen</h3>
      <p class="small">
        Essentielle Cookies sind für die Grundfunktionen der Website erforderlich und werden immer gesetzt. Marketing kann angepasst werden.
      </p>

      <!-- Kategorien -->
      <div class="category">
        <div class="category-header">
          <div>
            <strong>Essentiell</strong>
            <span class="badge">Immer aktiv</span>
          </div>
          <div class="switch disabled" aria-disabled="true">
            <span class="switch-track"></span>
            <span class="switch-thumb"></span>
          </div>
        </div>
        <div class="category-body small">
          Diese Cookies sind notwendig, um die Website zu betreiben (Sicherheit, Sprache, Sitzung).
        </div>
      </div>

      <div class="category">
        <div class="category-header">
          <div>
            <strong>Marketing</strong>
            <span class="badge">Optional</span>
          </div>
          <button
              class="switch"
              :class="{ on: marketingEnabled }"
              @click="toggleMarketing"
              :aria-pressed="marketingEnabled"
              aria-label="Marketing-Cookies umschalten"
          >
            <span class="switch-track"></span>
            <span class="switch-thumb"></span>
          </button>
        </div>
        <div class="category-body small">
          Marketing-Cookies helfen uns, Angebote zu verbessern und Nutzerinteressen besser zu verstehen.
        </div>
      </div>

      <!-- Akkordeon im großen Popup -->
      <div class="accordion">
        <div class="accordion-item" v-for="(item, idx) in largeAccordion" :key="idx">
          <button class="accordion-header" @click="toggleLargeAccordion(idx)" :aria-expanded="largeOpenIndex === idx">
            <span>{{ item.title }}</span>
            <span class="chev" :class="{ open: largeOpenIndex === idx }">▾</span>
          </button>
          <div v-show="largeOpenIndex === idx" class="accordion-body">
            <p class="small">{{ item.content }}</p>
          </div>
        </div>
      </div>

      <p class="small">
        Mehr Informationen findest du in unserer
        <a :href="privacyPolicyUrl" target="_blank" rel="noopener">Datenschutzerklärung</a>.
      </p>

      <div class="row actions">
        <button class="btn" @click="saveSelection">Auswahl speichern</button>
        <button class="btn primary" @click="acceptAllFromConfig">Alle akzeptieren</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';

type ConsentCategories = {
  essential: boolean;
  marketing: boolean;
};

type ConsentCookie = {
  categories: ConsentCategories;
  ts: number; // Unix ms timestamp when saved
};

const COOKIE_NAME = 'cookieConsent';
const COOKIE_MAX_AGE_DAYS = 28;

const showBanner = ref(false);
const showConfig = ref(false);
const marketingEnabled = ref(true); // Default: an, wie gewünscht
const smallOpenIndex = ref<number | null>(null);
const largeOpenIndex = ref<number | null>(null);

const privacyPolicyUrl = '/datenschutz'; // Passe diese URL an

// Akkordeon-Inhalte (Beispiele)
const smallAccordion = [
  { title: 'Essentielle Cookies', content: 'Benötigt für Sicherheit, Grundfunktionen und Stabilität der Seite.' },
  { title: 'Marketing', content: 'Dient der Verbesserung von Inhalten und personalisierten Angeboten.' },
  { title: 'Speicherdauer', content: 'Deine Entscheidung wird 28 Tage in einem Cookie gespeichert.' },
];

const largeAccordion = [
  { title: 'Rechtsgrundlagen', content: 'Essentiell: berechtigtes Interesse; Marketing: Einwilligung.' },
  { title: 'Verarbeitungszwecke', content: 'Sicherheit, Performance, Reichweitenmessung, Kampagnenoptimierung.' },
  { title: 'Drittanbieter', content: 'Wird transparent aufgeführt, sobald du Marketing zulässt (Platzhalter jetzt).' },
];

// Logger mit gruppierten Ausgaben
function logEvent(event: string, data?: Record<string, unknown>) {
  const time = new Date().toISOString();
  console.group(`[CookieBanner] ${event} @ ${time}`);
  if (data) console.table(data);
  console.groupEnd();
}

// Cookie-Utilities
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

// Serialisierung
function saveConsent(categories: ConsentCategories) {
  const payload: ConsentCookie = { categories, ts: Date.now() };
  setCookie(COOKIE_NAME, JSON.stringify(payload), COOKIE_MAX_AGE_DAYS);
  logEvent('Consent gespeichert', { payload });
}

function readConsent(): ConsentCookie | null {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentCookie;
    return parsed;
  } catch (e) {
    logEvent('Consent lesen: JSON parse Fehler', { raw });
    return null;
  }
}

function hasValidConsent(): boolean {
  const c = readConsent();
  if (!c) return false;
  const ageMs = Date.now() - c.ts;
  const maxMs = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const valid = ageMs < maxMs;
  logEvent('Consent gültig?', { valid, ageMs, maxMs, categories: c.categories });
  return valid;
}

// Skript-Lade-Placeholder
function loadEssentialScripts() {
  logEvent('Essentielle Skripte laden', { note: 'Hier Essentials (z. B. Sicherheits-/Core-Skripte) initialisieren.' });
  // Beispiel: Essentials direkt (immer) einbinden
  // const s = document.createElement('script');
  // s.src = '/js/essential-core.js';
  // s.defer = true;
  // document.head.appendChild(s);
}

function loadMarketingScripts() {
  logEvent('Marketing Skripte laden', { note: 'Platzhalter. Hier später Matomo/GA/etc. einbinden.' });
  // Beispiel-Placeholder:
  // const s = document.createElement('script');
  // s.src = 'https://cdn.example.com/marketing.js';
  // s.async = true;
  // document.head.appendChild(s);
}

function applyConsent(c: ConsentCategories) {
  loadEssentialScripts(); // immer
  if (c.marketing) {
    loadMarketingScripts();
  } else {
    logEvent('Marketing deaktiviert', { message: 'Marketing-Skripte werden nicht geladen.' });
  }
}

// UI-Interaktionen
function onBannerDismiss() {
  showBanner.value = false;
  logEvent('Kleines Banner geschlossen (X oder Overlay)', { willReappearOnReload: !hasValidConsent() });
  // Kein Consent gesetzt -> erscheint beim nächsten Reload erneut
}

function openConfig() {
  showConfig.value = true;
  logEvent('Konfiguration geöffnet', { defaultMarketingEnabled: marketingEnabled.value });
}

function closeConfigToBanner() {
  showConfig.value = false;
  showBanner.value = true;
  logEvent('Konfiguration geschlossen: zurück zum kleinen Banner');
}

function acceptAllFromBanner() {
  const categories: ConsentCategories = { essential: true, marketing: true };
  saveConsent(categories);
  applyConsent(categories);
  showConfig.value = false;
  showBanner.value = false;
  logEvent('Alle akzeptiert (kleines Banner)', { categories });
}

function saveSelection() {
  const categories: ConsentCategories = { essential: true, marketing: marketingEnabled.value };
  saveConsent(categories);
  applyConsent(categories);
  showConfig.value = false;
  showBanner.value = false;
  logEvent('Auswahl gespeichert (großes Popup)', { categories });
}

function acceptAllFromConfig() {
  marketingEnabled.value = true;
  const categories: ConsentCategories = { essential: true, marketing: true };
  saveConsent(categories);
  applyConsent(categories);
  showConfig.value = false;
  showBanner.value = false;
  logEvent('Alle akzeptiert (großes Popup)', { categories });
}

function toggleMarketing() {
  marketingEnabled.value = !marketingEnabled.value;
  logEvent('Marketing umgeschaltet', { marketingEnabled: marketingEnabled.value });
}

function toggleSmallAccordion(idx: number) {
  smallOpenIndex.value = smallOpenIndex.value === idx ? null : idx;
}

function toggleLargeAccordion(idx: number) {
  largeOpenIndex.value = largeOpenIndex.value === idx ? null : idx;
}

// Footer-Trigger: Komponente hört auf ein globales Event
function onOpenFromFooter() {
  // Wenn Consent existiert, öffnet der kleine Banner zur Konfiguration,
  // aber nach Schließen via X wird er beim nächsten Laden NICHT automatisch angezeigt.
  showBanner.value = true;
  showConfig.value = false;
  logEvent('Footer-Trigger: kleines Banner geöffnet');
}

onMounted(() => {
  // Essentials immer laden
  loadEssentialScripts();

  if (hasValidConsent()) {
    const c = readConsent()!;
    applyConsent(c.categories);
    // Mit gültigem Consent wird der Banner NICHT automatisch angezeigt.
    showBanner.value = false;
    showConfig.value = false;
    logEvent('Init mit gültigem Consent', { categories: c.categories });
  } else {
    // Erster Besuch oder Consent abgelaufen/ungültig: kleines Banner anzeigen
    showBanner.value = true;
    logEvent('Init ohne gültigen Consent: kleines Banner angezeigt');
  }

  window.addEventListener('open-cookie-banner', onOpenFromFooter);
});

onBeforeUnmount(() => {
  window.removeEventListener('open-cookie-banner', onOpenFromFooter);
});
</script>

<style scoped>
/* Overlay & Popups: Nutzen deiner Variablen, ohne globale Styles zu ändern */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.6); /* var(--bg) mit Transparenz */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1000;
}

.popup {
  position: relative;
  width: 100%;
  max-width: 520px;
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.35);
}

.popup.wide {
  max-width: 800px;
}

.icon-btn.close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  width: 32px;
  height: 32px;
  line-height: 30px;
  text-align: center;
  cursor: pointer;
}

.actions {
  justify-content: flex-end;
}

.btn.primary {
  background: var(--primary);
  color: #0b0b0b;
}

/* Akkordeon */
.accordion {
  margin: 12px 0 16px;
}
.accordion-item + .accordion-item {
  border-top: 1px solid var(--border);
}
.accordion-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  background: transparent;
  border: none;
  color: var(--text);
  cursor: pointer;
  text-align: left;
}
.accordion-body {
  padding: 6px 0 12px;
}
.chev {
  transition: transform 0.2s ease;
}
.chev.open {
  transform: rotate(180deg);
}

/* Kategorien & Switch */
.category {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
  background: #1a1a1a;
}
.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.switch {
  position: relative;
  width: 50px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #222;
  cursor: pointer;
}
.switch.on {
  background: var(--primary);
}
.switch.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.switch-track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
}
.switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: floralwhite;
  transition: transform 0.2s ease;
}
.switch.on .switch-thumb {
  transform: translateX(22px);
}

/* Responsive Feinheiten */
@media (max-width: 640px) {
  .popup {
    padding: 16px;
  }
}
</style>

<template>
  <div class="card">
    <!-- Mini-Navigation -->
    <div class="row" style="margin-bottom:16px;">
      <button
          class="btn ghost"
          :class="{ active: activeTab === 'impressum' }"
          @click="activeTab = 'impressum'"
      >
        Impressum
      </button>
      <button
          class="btn ghost"
          :class="{ active: activeTab === 'datenschutz' }"
          @click="activeTab = 'datenschutz'"
      >
        Datenschutz
      </button>
    </div>

    <!-- Impressum -->
    <div v-if="activeTab === 'impressum'">
      <h2 style="margin-top:0;">Impressum</h2>
      <h3>Angaben gemäß § 5 TMG</h3>
      <p>
        Max Mustermann<br />
        Musterstraße 1<br />
        12345 Musterstadt<br />
        Deutschland
      </p>

      <h3>Kontakt</h3>
      <p>
        Telefon: +49 (0)123 456789<br />
        E-Mail: <a href="mailto:max@muster.de">max@muster.de</a>
      </p>

      <h3>Haftungsausschluss</h3>
      <p>
        Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links.
        Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
      </p>
    </div>

    <!-- Datenschutz -->
    <div v-else>
      <h2 style="margin-top:0;">Datenschutzerklärung</h2>
      <p>
        Der Schutz deiner persönlichen Daten ist uns wichtig. Wir behandeln deine personenbezogenen Daten
        vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Erklärung.
      </p>

      <h3>1. Verantwortliche Stelle</h3>
      <p>
        Max Mustermann<br />
        Musterstraße 1<br />
        12345 Musterstadt<br />
        E-Mail: <a href="mailto:max@muster.de">max@muster.de</a>
      </p>

      <h3>2. Speicherung im Browser</h3>
      <p>
        Diese Anwendung nutzt <code>localStorage</code>, um bestimmte Einstellungen und Timer lokal auf deinem
        Gerät zu speichern. Diese Daten werden nicht an den Server übertragen.
      </p>

      <h3>3. Rechte der Nutzer</h3>
      <p>
        Du hast jederzeit das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung
        deiner gespeicherten Daten.
      </p>
    </div>

    <hr />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Standardmäßig "Impressum" anzeigen
const activeTab = ref<'impressum' | 'datenschutz'>('impressum')
</script>

<style scoped>

</style>

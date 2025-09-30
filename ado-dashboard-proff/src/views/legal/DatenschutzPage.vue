<template>
  <div>
    <h2>Datenschutzerklärung</h2>
    <p>
      Der Schutz deiner persönlichen Daten ist uns wichtig. Wir behandeln deine Daten vertraulich
      und entsprechend der gesetzlichen Vorschriften.
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
      Diese Anwendung nutzt <code>localStorage</code> für Einstellungen und Timer.
    </p>
    <h3>3. Rechte der Nutzer</h3>
    <p>
      Du hast jederzeit das Recht auf Auskunft, Berichtigung und Löschung deiner Daten.
    </p>
    <h3>Cookie-Einstellungen</h3>
    <CookieSettings />
  </div>
</template>

<script setup lang="ts">
import CookieSettings from '../../components/CookieSettings.vue'
</script>

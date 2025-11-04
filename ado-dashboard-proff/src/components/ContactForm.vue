<template>
  <section class="contact-section card" aria-label="Kontaktinformationen">
    <div class="container">
      <div class="hero-header">
        <div class="hero-content">
          <h2 class="hero-title">Kontakt</h2>
          <p class="hero-subtitle">Teile deine Erfahrungen mit uns oder kontaktiere uns direkt.</p>
        </div>
      </div>

      <div class="info-card form-card">
        <div class="info-group">
          <h3 class="info-title">📧 E-Mail</h3>
          <p class="info-text">
            dashboardverifizierung@gmail.com
          </p>
        </div>

        <div class="info-group">
          <h3 class="info-title">📍 Region</h3>
          <p class="info-text">
            Berlin,<br />
            Deutschland
          </p>
        </div>

        <div class="info-group">
          <h3 class="info-title">📞 Telefon</h3>
          <p class="info-text">
            Unsere Telefon-Hotline ist bald verfügbar.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
// Keine Skript-Logik mehr nötig, da das Formular entfernt wurde.
</script>

<style scoped>
/* Allgemeine Stile aus ContactForm.vue übernommen */
:root {
  /* Beispiel-Variablen, falls sie global definiert sind */
  --card: #333;
  --bg: #1c1c1c;
  --text: #f1f1f1;
  --primary: #3f93f8; /* Blau für Akzente */
}

/* Section */
.contact-section {
  padding: 50px 50px; /* Etwas angepasst */
  min-height: 50vh; /* Etwas weniger Mindesthöhe */
  background: var(--bg);
}

.card {
  /* Stil für die Sektion, falls .card eine Hintergrundfarbe setzt */
  background: var(--bg);
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

/* Hero Header (angepasst für nur Text) */
.hero-header {
  margin-bottom: 48px;
  text-align: center;
}

.hero-content {
  margin-bottom: 32px;
}

.hero-title {
  font-size: 42px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: var(--text);
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 18px;
  color: #a0a0a0; /* Etwas dunkler für bessere Lesbarkeit */
  margin: 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

/* Info Card (ersetzt Form Card) */
.info-card {
  max-width: 700px;
  margin: 0 auto;
  background: var(--card);
  border-radius: 16px;
  padding: 48px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* Responsives Gitter */
  gap: 30px;
}

/* Info Group */
.info-group {
  padding: 15px;
  border-radius: 10px;
  transition: background 0.3s ease;
}

.info-group:hover {
  background: rgba(var(--primary), 0.1); /* Leichter Hover-Effekt */
}

.info-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary);
  margin-top: 0;
  margin-bottom: 10px;
}

.info-text {
  font-size: 16px;
  color: var(--text);
  line-height: 1.6;
  margin: 0;
}


/* Responsive Anpassungen */
@media (max-width: 768px) {
  .contact-section {
    padding: 40px 20px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .info-card {
    padding: 32px 24px;
    grid-template-columns: 1fr; /* Eine Spalte auf kleineren Bildschirmen */
  }
}
</style>
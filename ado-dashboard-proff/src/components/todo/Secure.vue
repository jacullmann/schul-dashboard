<script setup lang="ts">
import { Lock, EyeOff, ShieldCheck } from 'lucide-vue-next';
</script>

<template>
  <div class="security-info-container">
    <h3><ShieldCheck :size="20" class="title-icon" /> Sicherheit auf höchstem Niveau</h3>
    <p class="intro-text">
      Wir legen größten Wert auf die Sicherheit und den Schutz deiner privaten Einträge.
    </p>

    <div class="features-grid">
      <div class="feature-card">
        <div class="noicon">
          <Lock :size="24" class="icon" />
          <h4>Starke Verschlüsselung</h4>
        </div>

        <p>
          Deine privaten Einträge werden mit der extrem sicheren Technologie (AES-256 GCM) verschlüsselt. Dies ist der gleiche Sicherheitsstandard, den Banken, Regierungen und das Militär verwenden.
        </p>
      </div>

      <div class="feature-card">
        <div class="noicon">
          <EyeOff :size="24" class="icon" />
          <h4>Vollständige Privatsphäre</h4>
        </div>
        <p>
          Nur du kannst deine privaten Einträge einsehen. Sie sind vollkommen privat und nur für dich zugänglich – selbst wir haben keinen Zugriff darauf.
        </p>
      </div>

      <div class="feature-card">
        <div class="noicon">
          <ShieldCheck :size="24" class="icon" />

          <h4>Unser Versprechen</h4>
        </div>
        <p>
          Es hat für uns die höchste Priorität, deine Daten zu schützen. Deine Einträge werden sicher und verschlüsselt gespeichert.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.security-info-container {
  background:transparent;
  border-radius: 12px;
  padding: 2rem;
  margin-top: 2.5rem;
  border: none;
}

.security-info-container h3 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  color: var(--text);
  margin: 0 0 0.5rem 0;
}


.intro-text {
  color: var(--muted);
  font-size: 0.95rem;
  margin-bottom: 2rem;
  max-width: 700px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  background: rgba(150, 150, 150, 0.1);
  padding: 1.5rem;
  border-radius: 10px;
  border: none;
  transition: all 0.3s ease;
  overflow: hidden;
}


.icon {
  stroke-width: 2;
}

.feature-card h4 {
  font-size: 1.1rem;
  color: var(--text);
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.feature-card p {
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

.noicon {
  display: flex;
  gap: 0.55rem;

}
</style>
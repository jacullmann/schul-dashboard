<template>
  <div class="card">
    <div>
    <h2 style="margin-top: 0">Kontakt</h2>
    <p>Teile deine Erfahrungen mit uns oder kontaktiere uns direkt.</p>
    </div>
      <div class="contact-sections">
        <div class="contact-section">
          <div class="section-header">
            <Mail class="section-icon" />
            <h3>E-Mail</h3>
          </div>
          <a href="mailto:dashboardverifizierung@gmail.com" class="email-button">
            dashboardverifizierung@gmail.com
            <ExternalLink class="button-icon" />
          </a>
        </div>

        <hr>

        <div class="contact-section">
          <div class="section-header">
            <MapPin class="section-icon" />
            <h3>Region</h3>
          </div>
          <p class="region-text">
            Berlin,<br>
            Deutschland
          </p>
        </div>

        <hr>

        <div class="contact-section phone-section">
          <div class="section-header">
            <Phone class="section-icon" />
            <h3>Telefon</h3>
          </div>
          <div class="coming-soon">
            <Clock class="clock-icon" />
            <span>Wir bieten aktuell keine Telefonhotline an.</span>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import {
  Mail,
  MapPin,
  Phone,
  ExternalLink,
  Clock
} from 'lucide-vue-next';
</script>

<style scoped>

.contact-content {
  padding: 8px;
}

.contact-header {
  margin-bottom: 32px;
}

.contact-header h2 {
  margin: 0 0 0 0;
  color: var(--text);
}

.contact-header p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
}

.contact-sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-section {
  padding: 16px 0;
  position: relative;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.section-icon {
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.7);
}

.contact-section h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.email-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  padding: 10px 14px;
  border-radius: 6px;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 14px;
}

.email-button:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.button-icon {
  width: 14px;
  height: 14px;
  opacity: 0.8;
  color: var(--text);
}

.region-text {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  padding-left: 32px;
}

.coming-soon {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: auto;
  max-width: 390px;
}

.clock-icon {
  width: 16px;
  height: 16px;
  opacity: 0.7;
  color: rgba(255, 255, 255, 0.5);
}

hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 0;
  opacity: 1;
}

@media (max-width: 500px) {
  .contact-content {
    padding: 4px;
  }

  .section-header {
    gap: 10px;
  }

  .email-button,
  .coming-soon {
    padding: 8px 12px;
    font-size: 14px;
  }

  .region-text {
    padding-left: 28px;
  }
}
</style>
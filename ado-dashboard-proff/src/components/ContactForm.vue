<template>
  <div class="card">
    <div class="contact-header">
      <h2>Kontakt</h2>
    </div>

    <div class="contact-sections">
      <div class="contact-section primary-section">
        <div class="section-header">
          <div class="icon-wrapper">
            <Mail size="20" />
          </div>
          <div class="header-content">
            <h3>E-Mail</h3>
          </div>
        </div>
        <a href="mailto:kontakt@schul-dashboard.com" class="email-button btn ghost">
          <span>kontakt@schul-dashboard.com</span>
          <ExternalLink size="16" />
        </a>
      </div>

      <hr>

      <div class="contact-section">
        <div class="section-header">
          <div class="icon-wrapper">
            <MapPin size="20" />
          </div>
          <div class="header-content">
            <h3>Standort</h3>
          </div>
        </div>
        <div class="info-content">
          <p class="location-text">Berlin, Deutschland</p>
        </div>
      </div>

      <hr>

      <div class="contact-section">
        <div class="section-header">
          <div class="icon-wrapper">
            <MessageSquare size="20" />
          </div>
          <div class="header-content">
            <h3>Feedback</h3>
          </div>
        </div>
        <div class="info-content">
          <p class="feedback-text">Wir freuen uns über dein Feedback zur Verbesserung des Dashboards. Sende uns eine E-Mail mit deinen Anregungen.</p>
        </div>
      </div>
    </div>

    <div class="additional-info">
      <div class="info-card">
        <Clock size="16" />
        <span>Wir antworten in der Regel innerhalb von 48 Stunden.</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Mail,
  MapPin,
  MessageSquare,
  ExternalLink,
  Clock
} from 'lucide-vue-next';
</script>

<style scoped>
.contact-header {
  margin-bottom: 32px;
}

.contact-header h2 {
  margin: 0 0 8px 0;
  color: var(--text);
}
.contact-sections {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.contact-section {
  padding: 24px 0;
}

.contact-section.primary-section {
  padding-top: 0;
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 16px;
}

.icon-wrapper {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: var(--border-3);
  color: var(--text);
}

.header-content {
  flex: 1;
}

.header-content h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  font-family: var(--display-font), sans-serif;
}


.info-content {
  padding-left: 54px;
}

.email-button {
  gap: 10px;
  text-decoration: none;
  border: 1px solid var(--border2);
  margin-left: 54px;
  color: var(--text);
}

.email-button svg {
  opacity: 0.7;
  transition: opacity 0.15s ease;
}

.email-button:hover svg {
  opacity: 1;
}

.location-text,
.feedback-text {
  margin: 0;
  color: var(--text);
  font-size: 14px;
  line-height: 1.6;
}

.location-text {
  font-weight: 500;
}

hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 0;
}

.additional-info {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.info-card {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: var(--border-4);
  color: var(--sub);
  font-size: 13px;
}

.info-card svg {
  flex-shrink: 0;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .contact-header h2 {
    font-size: 24px;
  }
  .contact-section {
    padding: 20px 0;
  }

  .section-header {
    gap: 12px;
  }

  .icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .info-content {
    padding-left: 48px;
  }

  .email-button {
    margin-left: 48px;
    padding: 10px 14px;
    font-size: 14px;
  }
}

@media (max-width: 500px) {
  .contact-header {
    margin-bottom: 24px;
  }

  .contact-header h2 {
    font-size: 22px;
  }

  .section-header {
    flex-direction: row;
    align-items: flex-start;
  }

  .header-content h3 {
    font-size: 15px;
  }
  .info-content {
    padding-left: 0;
    margin-top: 12px;
  }

  .email-button {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }

  .additional-info {
    margin-top: 24px;
    padding-top: 20px;
  }

  .info-card {
    width: 100%;
    font-size: 12px;
  }
}
</style>
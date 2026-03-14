<script setup lang="ts">
import {
  Mail,
  MapPin,
  MessageSquare,
  ExternalLink,
  Info
} from 'lucide-vue-next';
</script>

<template>
  <div class="card">
    <div class="contact-header">
      <h2>Kontakt</h2>
    </div>

    <div class="contact-sections">
      <div class="contact-section primary-section">
        <div class="section-header">
          <div class="icon-wrapper">
            <Mail :size="24" />
          </div>
          <div class="header-content">
            <h3>E-Mail</h3>
            <p class="section-desc">Primärer Kanal für Support und Feedback</p>
          </div>
        </div>
        <a href="mailto:kontakt@schul-dashboard.com" class="email-button btn ghost">
          <span>kontakt@schul-dashboard.com</span>
          <ExternalLink :size="16" />
        </a>
      </div>

      <hr>

      <div class="contact-section">
        <div class="section-header">
          <div class="icon-wrapper">
            <MapPin :size="24" />
          </div>
          <div class="header-content">
            <h3>Standort</h3>
            <p class="section-desc">Das Dashboard wurde entwickelt in</p>
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
            <MessageSquare :size="24" />
          </div>
          <div class="header-content">
            <h3>Feedback</h3>
            <p class="section-desc">Verbesserungsvorschläge und Ideen</p>
          </div>
        </div>
        <div class="info-content">
          <p class="feedback-text">Wir freuen uns über dein Feedback zur Verbesserung des Dashboards. Sende uns eine E-Mail mit deinen Anregungen.</p>
        </div>
      </div>
    </div>

    <div class="additional-info">
      <div class="info-card">
        <Info :size="16" />
        <span>Wir antworten in der Regel innerhalb von 48 Stunden.</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-header {
  margin-bottom: 16px;
}

.contact-header h2 {
  color: var(--text);
  margin: 0;
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
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  box-shadow: var(--input-shadow);
  border-radius: var(--border-4);
  color: var(--text);
}

.header-content {
  flex: 1;
}

.header-content h3 {
  margin: 0 0 4px 0;
  font-size: var(--font-size-title);
  font-weight: 600;
  color: var(--text);
  font-family: var(--display-font), sans-serif;
}

.section-desc {
  margin: 0;
  font-size: var(--font-size-sub);
  color: var(--sub);
  line-height: 1.4;
}

.info-content {
  margin-left: 62px;
}

.email-button {
  margin-left: 62px;
  color: var(--text);
  font-size: var(--font-size-button);
}

.lucide-external-link {
  overflow: visible !important;
  color: var(--sub);
  transition: all 0.1s ease;
}

.email-button:hover .lucide-external-link {
  color: var(--text);
}

.lucide-external-link :deep(path:first-child),
.lucide-external-link :deep(path:nth-child(2)) {
  transform: translate(0, 0);
  transition: all 0.1s ease;
}


.email-button:hover .lucide-external-link :deep(path:first-child),
.email-button:hover .lucide-external-link :deep(path:nth-child(2)) {
  transform: translate(2px, -2px);
}

svg {
  flex-shrink: 0;
}

.location-text,
.feedback-text {
  margin: 0;
  color: var(--text);
  font-size: var(--font-size-body);
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
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.info-card {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--sub);
  font-size: var(--font-size-body);
}

@media (max-width: 768px) {
  .section-header {
    gap: 12px;
  }

  .section-header h3 {
    font-size: var(--font-size-body);
    margin: 0;
  }

  .icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .icon-wrapper svg {
    width: 20px;
    height: 20px;
  }

  .info-content {
    margin-left: 48px;
  }

  .email-button {
    margin-left: 48px;
  }
}

@media (max-width: 500px) {
  .section-header {
    flex-direction: row;
    align-items: flex-start;
  }

  .info-content {
    margin-left: 0;
  }

  .email-button {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }
}
</style>
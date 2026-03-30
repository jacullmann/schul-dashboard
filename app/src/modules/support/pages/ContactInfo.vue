<script setup lang="ts">
import {
  Mail,
  MapPin,
  MessageSquare,
  ExternalLink,
  Info
} from '@lucide/vue';
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
        <BaseLink to="mailto:kontakt@schul-dashboard.com" class="md:ml-[62px] min-[500px]:ml-12 ml-0 w-full justify-between">
          <BaseButton variant="ghost" class="max-[500px]:w-full max-[500px]:justify-between">
            <span>kontakt@schul-dashboard.com</span>
            <ExternalLink :size="16" />
          </BaseButton>
        </BaseLink>
      </div>

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
  color: var(--color-on-surface);
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
  color: var(--color-on-surface);
}

.header-content {
  flex: 1;
}

.header-content h3 {
  margin: 0 0 4px 0;
  font-size: var(--text-title);
  font-weight: 600;
  color: var(--color-on-surface);
  font-family: var(--font-display), sans-serif;
}

.section-desc {
  margin: 0;
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  line-height: 1.4;
}

.info-content {
  margin-left: 62px;
}

svg {
  flex-shrink: 0;
}

.location-text,
.feedback-text {
  margin: 0;
  color: var(--color-on-surface);
  font-size: var(--text-body);
  line-height: 1.6;
}

.location-text {
  font-weight: 500;
}

.additional-info {
  padding-top: 24px;
  border-top: 1px solid var(--color-canvas-border);
}

.info-card {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-on-surface-muted);
  font-size: var(--text-body);
}

@media (max-width: 768px) {
  .section-header {
    gap: 12px;
  }

  .section-header h3 {
    font-size: var(--text-body);
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
}
</style>
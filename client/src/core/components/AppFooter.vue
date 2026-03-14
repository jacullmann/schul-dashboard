<script setup lang="ts">
import Logo from '@/common/components/Logo.vue';
import Notizen from "@/common/components/Notizen.vue";
import ThemeDropdown from "@/common/components/ThemeDropdown.vue";
import LocaleDropdown from "@/common/components/LocaleDropdown.vue";
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const year = new Date().getFullYear();
</script>

<template>
  <footer class="footer">
    <div class="footer-container container">
      <div class="footer-grid">
        <div class="footer-section footer-brand">
          <div class="brand-header">
            <Logo class="footer-logo" aria-hidden="true" />
            <span class="brand-text">schul-dashboard</span>
          </div>
          <Notizen />
          <p class="brand-description">
            Teile deine Erfahrungen mit uns und sorge für eine sichere Umgebung. Wir nehmen Feedback gerne an und versuchen stetig, uns zu verbessern.
          </p>
        </div>

        <div class="footer-section">
          <h3>Navigation</h3>
          <router-link to="/home" class="footer-link">{{ t('global.footer.home') }}</router-link>
          <router-link to="/todos" class="footer-link">{{ t('school.private.title') }}</router-link>
          <router-link to="/update-history" class="footer-link">Update History</router-link>
          <router-link to="/info-dashboard" class="footer-link">{{ t('info.dashboard.title') }}</router-link>
          <router-link to="/spiele" class="footer-link">Spiele</router-link>
          <router-link to="/brain" class="footer-link">Brain-Tests</router-link>
          <router-link to="/imagetool" class="footer-link">Bildkonvertierungstool</router-link>
        </div>

        <div class="footer-section">
          <h3>Rechtliches</h3>
          <router-link to="/impressum-&-datenschutz/impressum" class="footer-link">{{ t('legal.imprint.title') }}</router-link>
          <router-link to="/impressum-&-datenschutz/datenschutz" class="footer-link">{{ t('legal.privacy.title') }}</router-link>
          <router-link to="/impressum-&-datenschutz/nutzung" class="footer-link">{{ t('legal.terms.title') }}</router-link>
        </div>

        <div class="footer-section">
          <h3>Kontakt</h3>
          <router-link to="/kontakt" class="footer-link">{{ t('contact.contact.title') }}</router-link>
        </div>

        <div class="footer-section">
          <h3>Design</h3>
          <div class="theme-selector">
            <ThemeDropdown />
          </div>
          <p class="brand-description">
            Wähle dein bevorzugtes Design für das Schul-Dashboard aus.
          </p>
        </div>

        <div class="footer-section">
          <h3>Sprache</h3>
          <div class="theme-selector">
            <LocaleDropdown />
          </div>
          <p class="brand-description">
            Wähle deine bevorzugte Sprache aus.
          </p>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container footer-bottom-content">
        <p class="copyright-text">© {{ year }} {{ t('global.title') }}</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background-color: var(--bg);
  color: var(--text);
  padding: 3rem 0 0;
  border-top: 1px solid var(--border);
  font-family: var(--display-font), sans-serif;
}

.footer-container {
  padding-bottom: 2.5rem;
}

.container {
  max-width: 1300px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr 1fr;
  gap: 18px;
}

.footer-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-brand {
  gap: 0.5rem;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.footer-logo {
  width: auto;
  height: 28px;
}

.brand-text {
  font-size: var(--font-size-h2);
  font-weight: 700;
  color: var(--text);
  line-height: 1;
  margin-bottom: 4px;
}

.brand-description {
  color: var(--sub);
  margin-top: 0.5rem;
  font-size: var(--font-size-body);
  font-weight: 500;
  display: none;
}

.footer-section h3 {
  color: var(--text);
  font-size: var(--font-size-title);
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.footer-link {
  display: block;
  color: var(--sub);
  text-decoration: none;
  font-size: var(--font-size-body);
  transition: color 0.2s;
  font-weight: 500;
}

.footer-link:hover {
  color: var(--text);
}

.theme-selector {
  margin-top: 0.5rem;
}

.footer-bottom {
  border-top: 1px solid var(--border);
  padding: 1.5rem 0;
  font-size: var(--font-size-sub);
}

.footer-bottom-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.copyright-text {
  color: var(--sub);
  margin: 0;
}

@media (max-width: 1024px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
  .footer-brand {
    grid-column: 1 / -1;
  }
  .footer-section h3 {
    margin: 2rem 0 0.25rem;
  }
}

@media (max-width: 768px) {
  .footer {
    padding: 16px 16px 0;
  }
  .footer-container {
    padding-bottom: 2rem;
  }
  .footer-grid {
    grid-template-columns: 1fr;
  }
  .footer-brand {
    grid-column: auto;
  }
  .footer-bottom-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
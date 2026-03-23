<script setup lang="ts">
import { ExternalLink } from "lucide-vue-next";
import ThemeDropdown from "@/common/components/ThemeDropdown.vue";
import LocaleDropdown from "@/common/components/LocaleDropdown.vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();

function gotosec() {
  router.push('/legal');
}
function gotomain() {
  router.push('/');
}
function goToStatus() {
  window.open('https://stats.uptimerobot.com/m8tUrWG3Zz', '_blank', 'noopener,noreferrer');
}
</script>

<template>
  <footer class="footer">
    <div class="footer-container container">
      <div class="footer-columns">

        <div class="footer-section">
          <h3>{{ t('welcome.footer.disclaimer.title') }}</h3>
          <p class="text-sub">
            {{ t('welcome.footer.disclaimer.text') }}
          </p>
        </div>

        <div class="footer-section">
          <h3>Navigation</h3>
          <p @click="gotomain" class="footer-link">{{ t('welcome.footer.navigation.landingPage') }}</p>
          <p @click="gotosec" class="footer-link">{{ t('legal.imprint.title') }}</p>
          <p class="footer-link" @click="goToStatus">{{ t('welcome.footer.navigation.status') }}<ExternalLink :size="14"/></p>
        </div>

        <div class="footer-section">
          <h3>Design</h3>
          <div class="theme-selector">
            <ThemeDropdown />
          </div>
        </div>

        <div class="footer-section">
          <h3>Sprache</h3>
          <div class="theme-selector">
            <LocaleDropdown />
          </div>
        </div>

      </div>
      <div class="footer-bottom">
        <div class="container footer-bottom-content">
          <p class="text-xs text-sub">{{ t('welcome.footer.byStudentsForStudents') }}</p>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background-color: var(--color-canvas);
  padding: 16px 16px 0 16px;
  border-top: 1px solid var(--color-canvas-border);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
}

.footer-columns {
  display: flex;
  justify-content: flex-start;
  gap: 64px;
  flex-wrap: wrap;
}

.footer-section {
  flex-basis: 200px;
  flex-grow: 1;
}

.footer-section h3 {
  color: var(--color-on-surface);
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.footer-section p {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-on-surface-muted);
}

.text-sub {
  color: var(--color-on-surface-muted);
}

.footer-link {
  color: var(--color-on-surface-muted);
  text-decoration: none;
  transition: color 0.1s ease, opacity 0.2s ease;
  cursor: pointer;
  gap: 4px;
  display: flex;
  align-items: center;
}

.footer-link:hover {
  color: var(--color-on-surface) !important;
}

.footer-bottom {
  border-top: 1px solid var(--color-canvas-border);
  padding-block: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.footer-bottom-content p {
  margin: 0;
}

@media (max-width: 768px) {
  .footer-columns {
    gap: 2rem;
  }
  .footer-section {
    flex-basis: 100%;
  }
}
</style>
<script setup lang="ts">
import { ExternalLink } from '@lucide/vue';
import ThemeDropdown from "@/common/components/ThemeDropdown.vue";
import LocaleDropdown from "@/common/components/LocaleDropdown.vue";
import { useI18n } from "vue-i18n";
import FooterSection from "@/core/components/FooterSection.vue";
import FooterLink from "@/core/components/FooterLink.vue";

const { t } = useI18n();
</script>

<template>
  <footer class="bg-canvas px-4 pt-4 border-t border-canvas-border">
    <div class="max-w-[1300px] mx-auto p-0">
      <div class="footer-columns flex flex-start gap-16 flex-wrap max-md:gap-8">

        <FooterSection>
          <h3>{{ t('welcome.footer.disclaimer.title') }}</h3>
          <p class="text-sub">
            {{ t('welcome.footer.disclaimer.text') }}
          </p>
        </FooterSection>

        <FooterSection title="Navigation">
          <FooterLink to="/">{{ t('welcome.footer.navigation.landingPage') }}</FooterLink>
          <FooterLink to="/legal">{{ t('legal.imprint.title') }}</FooterLink>
          <FooterLink to="https://stats.uptimerobot.com/m8tUrWG3Zz" target="_blank" rel="noopener noreferrer">
            {{ t('welcome.footer.navigation.status') }}
            <ExternalLink :size="16"/>
          </FooterLink>
        </FooterSection>

        <FooterSection title="Design">
          <ThemeDropdown />
        </FooterSection>

        <FooterSection title="Sprache">
          <LocaleDropdown />
        </FooterSection>

      </div>
      <div class="border-t border-canvas-border py-4 flex flex-col justify-center items-center">
        <div class="max-w-[1300px] mx-auto p-0">
          <p class="text-xs text-on-surface-muted m-0">{{ t('welcome.footer.byStudentsForStudents') }}</p>
        </div>
      </div>
    </div>
  </footer>
</template>
